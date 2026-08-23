package com.personal.memorypalace;

import android.util.Log;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.Executors;

/**
 * WebView 在 https 下无法 fetch http://127.0.0.1（混合内容 Failed to fetch）。
 * 由原生发 HTTP 到 CameraService，再把 base64 回给 JS。
 */
@CapacitorPlugin(name = "AriesCamera")
public class AriesCameraPlugin extends Plugin {
    private static final String TAG = "AriesCamera";

    @PluginMethod
    public void takePhoto(PluginCall call) {
        String facing = call.getString("camera", "front");
        if (facing == null || facing.isEmpty()) facing = "front";
        final String cam = facing;

        // 确保服务在跑
        try {
            CameraService.start(getContext());
        } catch (Exception e) {
            Log.w(TAG, "start service", e);
        }

        final String finalCam = cam;
        Executors.newSingleThreadExecutor().execute(() -> {
            // 服务刚启动时稍等
            String body = postTakePhoto(finalCam);
            if (body == null) {
                try { Thread.sleep(800); } catch (InterruptedException ignored) {}
                body = postTakePhoto(finalCam);
            }
            if (body == null) {
                call.reject("CameraService unreachable (127.0.0.1:18888)");
                return;
            }
            try {
                JSONObject o = new JSONObject(body);
                if (!o.optBoolean("success", false)) {
                    call.reject(o.optString("error", "capture failed"));
                    return;
                }
                JSObject ret = new JSObject();
                ret.put("success", true);
                ret.put("image", o.getString("image"));
                ret.put("timestamp", o.optLong("timestamp", System.currentTimeMillis()));
                call.resolve(ret);
            } catch (Exception e) {
                call.reject(e.getMessage() != null ? e.getMessage() : "parse failed");
            }
        });
    }

    @PluginMethod
    public void ping(PluginCall call) {
        Executors.newSingleThreadExecutor().execute(() -> {
            try {
                URL url = new URL("http://127.0.0.1:18888/ping");
                HttpURLConnection c = (HttpURLConnection) url.openConnection();
                c.setConnectTimeout(2000);
                c.setReadTimeout(2000);
                c.setRequestMethod("GET");
                int code = c.getResponseCode();
                JSObject ret = new JSObject();
                ret.put("ok", code == 200);
                ret.put("code", code);
                call.resolve(ret);
            } catch (Exception e) {
                JSObject ret = new JSObject();
                ret.put("ok", false);
                ret.put("error", e.getMessage());
                call.resolve(ret);
            }
        });
    }

    private String postTakePhoto(String camera) {
        HttpURLConnection c = null;
        try {
            URL url = new URL("http://127.0.0.1:18888/take-photo");
            c = (HttpURLConnection) url.openConnection();
            c.setConnectTimeout(3000);
            c.setReadTimeout(12000);
            c.setRequestMethod("POST");
            c.setDoOutput(true);
            c.setRequestProperty("Content-Type", "application/json; charset=utf-8");
            byte[] payload = ("{\"camera\":\"" + camera + "\"}").getBytes(StandardCharsets.UTF_8);
            c.setFixedLengthStreamingMode(payload.length);
            OutputStream os = c.getOutputStream();
            os.write(payload);
            os.flush();
            os.close();
            int code = c.getResponseCode();
            BufferedReader br = new BufferedReader(new InputStreamReader(
                    code >= 400 ? c.getErrorStream() : c.getInputStream(), StandardCharsets.UTF_8));
            StringBuilder sb = new StringBuilder();
            String line;
            while ((line = br.readLine()) != null) sb.append(line);
            br.close();
            if (code >= 400) {
                Log.e(TAG, "HTTP " + code + " " + sb);
                return null;
            }
            return sb.toString();
        } catch (Exception e) {
            Log.e(TAG, "postTakePhoto", e);
            return null;
        } finally {
            if (c != null) c.disconnect();
        }
    }
}
