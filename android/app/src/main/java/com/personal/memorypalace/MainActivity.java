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
    private static final int REQ_LOC = 1903;
    private static final int REQ_LOC_BG = 1904;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(PocketBrowserPlugin.class);
        registerPlugin(AriesCameraPlugin.class);
        registerPlugin(TripLocPlugin.class);
        super.onCreate(savedInstanceState);
        maybeStartCameraService();
        setupAriesPush();
        askLocation();
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

    /**
     * baileysGO 的出行定位权限。**分两步要，不能一起要** ——
     * 安卓 10 起，ACCESS_BACKGROUND_LOCATION 必须在前台定位已经授权之后单独请求；
     * 安卓 11+ 更狠：弹窗根本给不了「始终允许」，只能把她送到设置页
     * （前端那张卡片上的「去设置」按钮走 TripLocPlugin.openSettings）。
     * 这里只负责第一步，而且**不启动服务** —— 服务只在她点「出发」时才开，省电。
     */
    private void askLocation() {
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION)
                != PackageManager.PERMISSION_GRANTED) {
            ActivityCompat.requestPermissions(this, new String[]{
                    Manifest.permission.ACCESS_FINE_LOCATION,
                    Manifest.permission.ACCESS_COARSE_LOCATION }, REQ_LOC);
        }
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
        // 前台定位给了之后，才轮到问后台那条（安卓 10 有弹窗；11+ 只能去设置页）
        if (requestCode == REQ_LOC
                && grantResults.length > 0
                && grantResults[0] == PackageManager.PERMISSION_GRANTED
                && Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q
                && ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_BACKGROUND_LOCATION)
                   != PackageManager.PERMISSION_GRANTED) {
            try {
                ActivityCompat.requestPermissions(this, new String[]{
                        Manifest.permission.ACCESS_BACKGROUND_LOCATION }, REQ_LOC_BG);
            } catch (Exception ignored) {}
        }
    }
}
