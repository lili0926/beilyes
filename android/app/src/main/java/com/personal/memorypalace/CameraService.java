package com.personal.memorypalace;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.content.Context;
import android.content.Intent;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.os.Build;
import android.util.Base64;
import android.util.Log;

import androidx.camera.core.CameraSelector;
import androidx.camera.core.ImageCapture;
import androidx.camera.core.ImageCaptureException;
import androidx.camera.lifecycle.ProcessCameraProvider;
import androidx.core.app.NotificationCompat;
import androidx.core.content.ContextCompat;
import androidx.lifecycle.LifecycleService;

import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.IOException;
import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Semaphore;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicReference;

import fi.iki.elonen.NanoHTTPD;

/**
 * 本机 HTTP：POST http://127.0.0.1:18888/take-photo
 * body: {"camera":"front"|"back"}
 * 返回: {"success":true,"image":"<base64>","timestamp":...}
 *
 * 前后置：每次按 camera 字段 unbind 后重新 bind 对应 CameraSelector（CameraX 需重建用例）。
 */
public class CameraService extends LifecycleService {
    public static final int PORT = 18888;
    private static final String TAG = "AriesCamera";
    private static final String CHANNEL_ID = "aries_camera_channel";
    private static final int NOTIF_ID = 1001;

    private CameraHttpServer httpServer;
    private final AtomicReference<ImageCapture> imageCaptureRef = new AtomicReference<>();
    /** 当前已绑定的朝向：front / back */
    private final AtomicReference<String> boundFacing = new AtomicReference<>("front");
    private final ExecutorService cameraExecutor = Executors.newSingleThreadExecutor();
    private final Object bindLock = new Object();

    public static void start(Context ctx) {
        Intent i = new Intent(ctx, CameraService.class);
        ContextCompat.startForegroundService(ctx, i);
    }

    public static void stop(Context ctx) {
        ctx.stopService(new Intent(ctx, CameraService.class));
    }

    @Override
    public void onCreate() {
        super.onCreate();
        createNotificationChannel();
        startForeground(NOTIF_ID, buildNotification());
        // 启动时默认前置
        bindCameraBlocking("front", 5);
        startHttp();
    }

    @Override
    public void onDestroy() {
        super.onDestroy();
        if (httpServer != null) httpServer.stop();
        cameraExecutor.shutdownNow();
    }

    /**
     * 按朝向绑定摄像头。CameraX 不支持热切换，必须 unbindAll 后重建 ImageCapture。
     * @return 是否在超时内绑定成功
     */
    private boolean bindCameraBlocking(String facing, int timeoutSec) {
        final String want = "back".equalsIgnoreCase(facing) ? "back" : "front";
        final CameraSelector selector = "back".equals(want)
                ? CameraSelector.DEFAULT_BACK_CAMERA
                : CameraSelector.DEFAULT_FRONT_CAMERA;

        synchronized (bindLock) {
            // 已是目标朝向且 ImageCapture 可用则跳过
            if (want.equals(boundFacing.get()) && imageCaptureRef.get() != null) {
                return true;
            }

            final CountDownLatch latch = new CountDownLatch(1);
            final boolean[] ok = {false};

            ProcessCameraProvider.getInstance(this).addListener(() -> {
                try {
                    ProcessCameraProvider provider = ProcessCameraProvider.getInstance(this).get();
                    ImageCapture capture = new ImageCapture.Builder()
                            .setCaptureMode(ImageCapture.CAPTURE_MODE_MINIMIZE_LATENCY)
                            .build();
                    provider.unbindAll();
                    provider.bindToLifecycle(this, selector, capture);
                    imageCaptureRef.set(capture);
                    boundFacing.set(want);
                    ok[0] = true;
                    Log.i(TAG, "bound camera: " + want);
                } catch (Exception e) {
                    Log.e(TAG, "bindCamera " + want, e);
                    imageCaptureRef.set(null);
                } finally {
                    latch.countDown();
                }
            }, ContextCompat.getMainExecutor(this));

            try {
                if (!latch.await(timeoutSec, TimeUnit.SECONDS)) {
                    Log.e(TAG, "bindCamera timeout: " + want);
                    return false;
                }
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                return false;
            }
            return ok[0];
        }
    }

    private void takePhoto(String facing, PhotoCallback cb) {
        final String want = "back".equalsIgnoreCase(facing) ? "back" : "front";
        cameraExecutor.execute(() -> {
            try {
                if (!bindCameraBlocking(want, 6)) {
                    // 后置失败时回退前置一次（无后置镜头的设备）
                    if ("back".equals(want)) {
                        Log.w(TAG, "back bind failed, fallback front");
                        if (!bindCameraBlocking("front", 5)) {
                            cb.onDone(null);
                            return;
                        }
                    } else {
                        cb.onDone(null);
                        return;
                    }
                }
                // 镜头刚切换时稍等稳定
                try { Thread.sleep(350); } catch (InterruptedException ignored) {}
                doCapture(cb);
            } catch (Exception e) {
                Log.e(TAG, "takePhoto", e);
                cb.onDone(null);
            }
        });
    }

    private void doCapture(PhotoCallback cb) {
        ImageCapture capture = imageCaptureRef.get();
        if (capture == null) {
            cb.onDone(null);
            return;
        }
        File out = new File(getFilesDir(), "aries_" + System.currentTimeMillis() + ".jpg");
        ImageCapture.OutputFileOptions opts = new ImageCapture.OutputFileOptions.Builder(out).build();
        capture.takePicture(opts, cameraExecutor, new ImageCapture.OnImageSavedCallback() {
            @Override
            public void onImageSaved(ImageCapture.OutputFileResults outputFileResults) {
                try {
                    String b64 = compressEncode(out);
                    //noinspection ResultOfMethodCallIgnored
                    out.delete();
                    cb.onDone(b64);
                } catch (Exception e) {
                    Log.e(TAG, "encode", e);
                    cb.onDone(null);
                }
            }

            @Override
            public void onError(ImageCaptureException exception) {
                Log.e(TAG, "capture", exception);
                cb.onDone(null);
            }
        });
    }

    private String compressEncode(File file) {
        Bitmap bmp = BitmapFactory.decodeFile(file.getAbsolutePath());
        if (bmp == null) return null;
        int max = 800;
        float scale = max / (float) Math.max(bmp.getWidth(), bmp.getHeight());
        if (scale < 1f) {
            bmp = Bitmap.createScaledBitmap(bmp,
                    Math.round(bmp.getWidth() * scale),
                    Math.round(bmp.getHeight() * scale), true);
        }
        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        bmp.compress(Bitmap.CompressFormat.JPEG, 80, baos);
        return Base64.encodeToString(baos.toByteArray(), Base64.NO_WRAP);
    }

    private void startHttp() {
        httpServer = new CameraHttpServer(PORT, this::takePhoto);
        try {
            httpServer.start();
            Log.i(TAG, "HTTP on " + PORT);
        } catch (IOException e) {
            Log.e(TAG, "HTTP start failed", e);
        }
    }

    private Notification buildNotification() {
        return new NotificationCompat.Builder(this, CHANNEL_ID)
                .setContentTitle("Aries")
                .setContentText("连接中")
                .setSmallIcon(android.R.drawable.ic_menu_camera)
                .setPriority(NotificationCompat.PRIORITY_MIN)
                .setSilent(true)
                .build();
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel ch = new NotificationChannel(
                    CHANNEL_ID, "Aries相机", NotificationManager.IMPORTANCE_MIN);
            ch.setShowBadge(false);
            NotificationManager nm = getSystemService(NotificationManager.class);
            if (nm != null) nm.createNotificationChannel(ch);
        }
    }

    interface PhotoCallback {
        void onDone(String base64OrNull);
    }

    static class CameraHttpServer extends NanoHTTPD {
        private final PhotoHandler handler;

        interface PhotoHandler {
            void take(String facing, PhotoCallback cb);
        }

        CameraHttpServer(int port, PhotoHandler handler) {
            super(port);
            this.handler = handler;
        }

        @Override
        public Response serve(IHTTPSession session) {
            if (Method.GET.equals(session.getMethod()) && "/ping".equals(session.getUri())) {
                return newFixedLengthResponse(Response.Status.OK, "application/json", "{\"status\":\"ok\"}");
            }
            if (Method.POST.equals(session.getMethod()) && "/take-photo".equals(session.getUri())) {
                return handleTake(session);
            }
            return newFixedLengthResponse(Response.Status.NOT_FOUND, MIME_PLAINTEXT, "Not found");
        }

        private Response handleTake(IHTTPSession session) {
            Map<String, String> body = new HashMap<>();
            try {
                session.parseBody(body);
            } catch (Exception e) {
                return jsonError("bad body");
            }
            String facing = "front";
            try {
                JSONObject o = new JSONObject(body.get("postData") != null ? body.get("postData") : "{}");
                facing = o.optString("camera", "front");
            } catch (Exception ignored) {}

            Semaphore sem = new Semaphore(0);
            final String[] out = {null};
            handler.take(facing, b64 -> {
                out[0] = b64;
                sem.release();
            });
            boolean ok;
            try {
                // 切换镜头 + 拍照，放宽到 12s
                ok = sem.tryAcquire(12, TimeUnit.SECONDS);
            } catch (InterruptedException e) {
                ok = false;
            }
            if (ok && out[0] != null) {
                try {
                    JSONObject r = new JSONObject();
                    r.put("success", true);
                    r.put("image", out[0]);
                    r.put("timestamp", System.currentTimeMillis());
                    r.put("camera", "back".equalsIgnoreCase(facing) ? "back" : "front");
                    return newFixedLengthResponse(Response.Status.OK, "application/json", r.toString());
                } catch (Exception e) {
                    return jsonError("json");
                }
            }
            return jsonError("timeout");
        }

        private Response jsonError(String msg) {
            return newFixedLengthResponse(Response.Status.INTERNAL_ERROR, "application/json",
                    "{\"success\":false,\"error\":\"" + msg + "\"}");
        }
    }
}
