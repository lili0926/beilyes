package com.personal.memorypalace;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.ServiceInfo;
import android.location.Location;
import android.location.LocationListener;
import android.location.LocationManager;
import android.os.Build;
import android.os.Bundle;
import android.os.IBinder;
import android.os.Looper;
import android.util.Log;

import androidx.core.app.NotificationCompat;
import androidx.core.content.ContextCompat;

import org.json.JSONArray;
import org.json.JSONObject;

/**
 * baileysGO 的出行定位前台服务。
 *
 * **为什么自己写，不装 @capacitor/geolocation 或社区的 background-geolocation**：
 *  - @capacitor/geolocation 只在前台有效，App 一切后台系统就不再派发位置了；
 *  - 社区插件要进 package.json，CI 跑 `npm ci` + `npx cap sync android` 会重新生成
 *    capacitor.settings.gradle / capacitor.build.gradle，插件版本跟 Capacitor 6 一有不合
 *    就是整个 APK 构建失败 —— 她就拿不到包了；
 *  - 而这个仓库**本来就自己写原生服务**（AriesPushService 是个跑着的前台服务），
 *    照那套写，`cap sync` 根本不碰 android/app/src/main/java，风险最低。
 *
 * **位置怎么交给 JS**：服务把定位点**排进 SharedPreferences 的队列**，
 * JS 那边（TripLocPlugin.drain）一次取走。不做实时事件推送，因为：
 *  - App 被杀掉时 WebView 根本不在，事件没人收；
 *  - 而排队 + 回放正好是这个游戏要的 —— 她揣着手机走完一路，回头打开 App，
 *    黑地图一次点亮、藏宝图一次推进、路上的点位一次结算。
 *
 * **采样分档**：站着不动就降到两分钟一次，走起来提到 25 秒一次。
 * 不分档的话一天电就没了。
 */
public class TripLocService extends Service {

    private static final String TAG = "TripLoc";
    private static final String CH = "aries_trip_loc";
    private static final int NOTIF = 4501;

    static final String PREFS = "aries_trip_loc";
    static final String KEY_QUEUE = "queue";
    static final String KEY_RUNNING = "running";

    private static final int QUEUE_MAX = 600;          // 队列上限，满了丢最老的
    private static final long FAST_MS = 25_000L;       // 在动：25 秒一次
    private static final long SLOW_MS = 120_000L;      // 没动：两分钟一次
    private static final float STILL_M = 25f;          // 离上一个点这么近就算没动
    private static final long STILL_AFTER_MS = 5 * 60_000L;  // 连续没动这么久才降频

    private LocationManager lm;
    private long interval = FAST_MS;
    private double lastLat = Double.NaN, lastLon = Double.NaN;
    private long stillSince = 0L;
    private int queued = 0;

    public static void start(Context ctx) {
        Intent i = new Intent(ctx, TripLocService.class);
        ContextCompat.startForegroundService(ctx, i);
    }
    public static void stop(Context ctx) {
        try { ctx.stopService(new Intent(ctx, TripLocService.class)); } catch (Exception ignored) {}
        try {
            ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
               .edit().putBoolean(KEY_RUNNING, false).apply();
        } catch (Exception ignored) {}
    }

    private final LocationListener listener = new LocationListener() {
        @Override public void onLocationChanged(Location loc) { onFix(loc); }
        // API 22 兼容：这几个在 compileSdk 里已是 default，但显式留着更稳
        @Override public void onStatusChanged(String p, int s, Bundle e) {}
        @Override public void onProviderEnabled(String p) {}
        @Override public void onProviderDisabled(String p) {}
    };

    @Override public IBinder onBind(Intent intent) { return null; }

    @Override
    public void onCreate() {
        super.onCreate();
        createChannel();
        lm = (LocationManager) getSystemService(Context.LOCATION_SERVICE);
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        startForegroundCompat();
        getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().putBoolean(KEY_RUNNING, true).apply();
        requestUpdates(interval);
        return START_STICKY;      // 被系统杀掉后自己回来
    }

    @Override
    public void onDestroy() {
        try { if (lm != null) lm.removeUpdates(listener); } catch (Exception ignored) {}
        try {
            getSharedPreferences(PREFS, Context.MODE_PRIVATE)
               .edit().putBoolean(KEY_RUNNING, false).apply();
        } catch (Exception ignored) {}
        super.onDestroy();
    }

    // ─── 定位 ────────────────────────────────────────────────────────────────

    private void requestUpdates(long minMs) {
        if (lm == null) return;
        try { lm.removeUpdates(listener); } catch (Exception ignored) {}
        interval = minMs;
        // GPS 为主，网络定位兜底（室内、刚开机还没定上星的时候）
        for (String p : new String[]{ LocationManager.GPS_PROVIDER, LocationManager.NETWORK_PROVIDER }) {
            try {
                if (lm.isProviderEnabled(p)) lm.requestLocationUpdates(p, minMs, 0f, listener, Looper.getMainLooper());
            } catch (SecurityException se) {
                Log.w(TAG, "没有定位权限");
                return;
            } catch (Exception e) {
                Log.w(TAG, "requestLocationUpdates " + p, e);
            }
        }
    }

    private void onFix(Location loc) {
        if (loc == null) return;
        final double lat = loc.getLatitude(), lon = loc.getLongitude();
        final long now = System.currentTimeMillis();

        // 采样分档：连续五分钟没挪动就降到两分钟一次；一动起来立刻提回 25 秒
        boolean moved = true;
        if (!Double.isNaN(lastLat)) {
            float[] r = new float[1];
            try { Location.distanceBetween(lastLat, lastLon, lat, lon, r); } catch (Exception ignored) { r[0] = 999f; }
            moved = r[0] > STILL_M;
        }
        if (moved) {
            stillSince = 0L;
            if (interval != FAST_MS) requestUpdates(FAST_MS);
        } else {
            if (stillSince == 0L) stillSince = now;
            if (now - stillSince > STILL_AFTER_MS && interval != SLOW_MS) requestUpdates(SLOW_MS);
        }
        lastLat = lat; lastLon = lon;

        enqueue(lat, lon, loc.hasAccuracy() ? Math.round(loc.getAccuracy()) : 0, now);
    }

    /** 排进队列。**坐标只写本机的 SharedPreferences，不发任何网络请求** */
    private void enqueue(double lat, double lon, int acc, long at) {
        try {
            SharedPreferences sp = getSharedPreferences(PREFS, Context.MODE_PRIVATE);
            JSONArray arr;
            try { arr = new JSONArray(sp.getString(KEY_QUEUE, "[]")); } catch (Exception e) { arr = new JSONArray(); }
            JSONObject o = new JSONObject();
            o.put("lat", lat); o.put("lon", lon); o.put("acc", acc); o.put("at", at);
            arr.put(o);
            // 满了丢最老的
            while (arr.length() > QUEUE_MAX) arr.remove(0);
            sp.edit().putString(KEY_QUEUE, arr.toString()).apply();
            queued = arr.length();
            updateOngoing();
        } catch (Exception e) {
            Log.w(TAG, "enqueue", e);
        }
    }

    // ─── 前台通知 ────────────────────────────────────────────────────────────

    private void startForegroundCompat() {
        Notification n = buildOngoing();
        // Android 14+ 前台服务必须声明类型；location 类型要 FOREGROUND_SERVICE_LOCATION 权限
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            startForeground(NOTIF, n, ServiceInfo.FOREGROUND_SERVICE_TYPE_LOCATION);
        } else {
            startForeground(NOTIF, n);
        }
    }

    private Notification buildOngoing() {
        return new NotificationCompat.Builder(this, CH)
                .setContentTitle("出行中")
                .setContentText(queued > 0 ? "他在路上（" + queued + "）" : "他跟着你")
                .setSmallIcon(android.R.drawable.ic_menu_mylocation)
                .setPriority(NotificationCompat.PRIORITY_MIN)
                .setOngoing(true)
                .setSilent(true)
                .setShowWhen(false)
                .setContentIntent(openAppIntent())
                .build();
    }

    private void updateOngoing() {
        try {
            NotificationManager nm = getSystemService(NotificationManager.class);
            if (nm != null) nm.notify(NOTIF, buildOngoing());
        } catch (Exception ignored) {}
    }

    private PendingIntent openAppIntent() {
        Intent i = new Intent(this, MainActivity.class);
        i.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        int flags = PendingIntent.FLAG_UPDATE_CURRENT;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) flags |= PendingIntent.FLAG_IMMUTABLE;
        return PendingIntent.getActivity(this, 0, i, flags);
    }

    private void createChannel() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;
        NotificationManager nm = getSystemService(NotificationManager.class);
        if (nm == null) return;
        NotificationChannel ch = new NotificationChannel(CH, "出行定位", NotificationManager.IMPORTANCE_MIN);
        ch.setShowBadge(false);
        nm.createNotificationChannel(ch);
    }
}
