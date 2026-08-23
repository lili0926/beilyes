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

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(PocketBrowserPlugin.class);
        super.onCreate(savedInstanceState);
        maybeStartCameraService();
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
    }
}
