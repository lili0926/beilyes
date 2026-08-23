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
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Semaphore;
import java.util.concurrent.TimeUnit;

import fi.iki.elonen.NanoHTTPD;

/**
 * 本机 HTTP：POST http://127.0.0.1:18888/take-photo
 * body: {"camera":"front"|"back"}
 * 返回: {"success":true,"image":"<base64>","timestamp":...}
 */
public class CameraService extends LifecycleService {
    public static final int PORT = 18888;
    private static final String TAG = "AriesCamera";
    private static final String CHANNEL_ID = "aries_camera_channel";
    private static final int NOTIF_ID = 1001;

    private CameraHttpServer httpServer;
    private ImageCapture imageCapture;
    private final ExecutorService cameraExecutor = Executors.newSingleThreadExecutor();

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
        bindCamera(CameraSelector.DEFAULT_FRONT_CAMERA);
        startHttp();
    }

    @Override
    public void onDestroy() {
        super.onDestroy();
        if (httpServer != null) httpServer.stop();
        cameraExecutor.shutdownNow();
    }

    private void bindCamera(CameraSelector selector) {
        ProcessCameraProvider.getInstance(this).addListener(() -> {
            try {
                ProcessCameraProvider provider = ProcessCameraProvider.getInstance(this).get();
                imageCapture = new ImageCapture.Builder()
                        .setCaptureMode(ImageCapture.CAPTURE_MODE_MINIMIZE_LATENCY)
                        .build();
                provider.unbindAll();
                provider.bindToLifecycle(this, selector, imageCapture);
            } catch (Exception e) {
                Log.e(TAG, "bindCamera", e);
            }
        }, ContextCompat.getMainExecutor(this));
    }

    private void takePhoto(String facing, PhotoCallback cb) {
        if ("back".equalsIgnoreCase(facing)) {
            bindCamera(CameraSelector.DEFAULT_BACK_CAMERA);
            cameraExecutor.execute(() -> {
                try { Thread.sleep(600); } catch (InterruptedException ignored) {}
                doCapture(cb);
            });
        } else {
            doCapture(cb);
        }
    }

    private void doCapture(PhotoCallback cb) {
        ImageCapture capture = imageCapture;
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
                ok = sem.tryAcquire(8, TimeUnit.SECONDS);
            } catch (InterruptedException e) {
                ok = false;
            }
            if (ok && out[0] != null) {
                try {
                    JSONObject r = new JSONObject();
                    r.put("success", true);
                    r.put("image", out[0]);
                    r.put("timestamp", System.currentTimeMillis());
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
