package com.personal.memorypalace;

import android.Manifest;
import android.content.pm.PackageManager;
import android.os.Build;
import android.os.Bundle;

import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    private static final int REQ_CAMERA = 1901;
    private static final int REQ_NOTIF = 1902;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(PocketBrowserPlugin.class);
        registerPlugin(AriesCameraPlugin.class);
        super.onCreate(savedInstanceState);
        maybeStartCameraService();
        setupAriesPush();
    }

    /**
     * 常驻推送服务。即使通知权限还没给也照样启动——服务本身能跑，
     * 用户授权后通知就能弹出来了。
     */
    private void setupAriesPush() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU
                && ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS)
                   != PackageManager.PERMISSION_GRANTED) {
            ActivityCompat.requestPermissions(
                    this, new String[]{Manifest.permission.POST_NOTIFICATIONS}, REQ_NOTIF);
        }
        try { AriesPushService.start(this); } catch (Exception ignored) {}
    }

    private void maybeStartCameraService() {
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.CAMERA)
                == PackageManager.PERMISSION_GRANTED) {
            try { CameraService.start(this); } catch (Exception ignored) {}
        } else {
            ActivityCompat.requestPermissions(this, new String[]{Manifest.permission.CAMERA}, REQ_CAMERA);
        }
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (requestCode == REQ_CAMERA
                && grantResults.length > 0
                && grantResults[0] == PackageManager.PERMISSION_GRANTED) {
            try { CameraService.start(this); } catch (Exception ignored) {}
        }
        if (requestCode == REQ_NOTIF) {
            try { AriesPushService.start(this); } catch (Exception ignored) {}
        }
    }
}
