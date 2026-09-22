package com.personal.memorypalace;

import android.Manifest;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;

import androidx.core.content.ContextCompat;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import org.json.JSONArray;

/**
 * baileysGO 出行定位的 JS 桥。五个方法：
 *   start()         开前台服务（她点「出发」的时候）
 *   stop()          关掉（她点「结束」的时候）—— 不出行一次都不定位，省电
 *   drain()         把排着的定位点一次取走并清空，JS 拿去逐个喂 tripOnFix
 *   status()        服务在不在跑、排了多少、两个权限给没给
 *   openSettings()  跳系统设置页 —— 安卓 11+ 的「始终允许定位」只能在那儿开
 *
 * 队列在 SharedPreferences 里，**坐标不经过任何网络**。
 *
 * 所有往 JSObject 里塞值的地方都走 put() 这个小包装：JSObject 继承 JSONObject，
 * 而 JSONObject.put(String, Object) 是**会抛 JSONException** 的。哪些重载抛、哪些
 * 不抛取决于 Capacitor 的版本，本地又没 Android SDK 编不了，所以一律包住 ——
 * 编译期零风险，运行时最坏也只是少一个字段。
 */
@CapacitorPlugin(name = "TripLoc")
public class TripLocPlugin extends Plugin {

    private static void put(JSObject o, String k, Object v) {
        try { o.put(k, v); } catch (Exception ignored) {}
    }

    private boolean has(String perm) {
        return ContextCompat.checkSelfPermission(getContext(), perm) == PackageManager.PERMISSION_GRANTED;
    }
    private boolean hasFine() { return has(Manifest.permission.ACCESS_FINE_LOCATION); }
    private boolean hasBg() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q) return true;   // 安卓 10 以前没这个概念
        return has(Manifest.permission.ACCESS_BACKGROUND_LOCATION);
    }
    private SharedPreferences prefs() {
        return getContext().getSharedPreferences(TripLocService.PREFS, Context.MODE_PRIVATE);
    }

    @PluginMethod
    public void start(PluginCall call) {
        if (!hasFine()) { call.reject("no-permission"); return; }
        try {
            TripLocService.start(getContext());
        } catch (Exception e) {
            call.reject(e.getMessage() != null ? e.getMessage() : "start failed");
            return;
        }
        JSObject r = new JSObject();
        put(r, "ok", Boolean.TRUE);
        put(r, "background", hasBg());   // false = 只有 App 开着才走，得她去设置里放行
        call.resolve(r);
    }

    @PluginMethod
    public void stop(PluginCall call) {
        try { TripLocService.stop(getContext()); } catch (Exception ignored) {}
        JSObject r = new JSObject();
        put(r, "ok", Boolean.TRUE);
        call.resolve(r);
    }

    /** 取走并清空。取走之后队列就空了 —— JS 那边必须把拿到的点都喂进去，别丢 */
    @PluginMethod
    public void drain(PluginCall call) {
        JSONArray out = new JSONArray();
        try {
            SharedPreferences sp = prefs();
            String raw = sp.getString(TripLocService.KEY_QUEUE, "[]");
            sp.edit().putString(TripLocService.KEY_QUEUE, "[]").apply();
            out = new JSONArray(raw);
        } catch (Exception ignored) {}
        JSObject r = new JSObject();
        put(r, "fixes", out);
        call.resolve(r);
    }

    @PluginMethod
    public void status(PluginCall call) {
        boolean running = false;
        int queued = 0;
        try {
            SharedPreferences sp = prefs();
            running = sp.getBoolean(TripLocService.KEY_RUNNING, false);
            queued = new JSONArray(sp.getString(TripLocService.KEY_QUEUE, "[]")).length();
        } catch (Exception ignored) {}
        JSObject r = new JSObject();
        put(r, "running", running);
        put(r, "queued", queued);
        put(r, "fine", hasFine());
        put(r, "background", hasBg());
        call.resolve(r);
    }

    /** 安卓 11+ 的「始终允许」不能靠弹窗要，只能把她送到设置页 */
    @PluginMethod
    public void openSettings(PluginCall call) {
        try {
            Intent i = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS,
                    Uri.fromParts("package", getContext().getPackageName(), null));
            i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(i);
        } catch (Exception e) {
            call.reject(e.getMessage() != null ? e.getMessage() : "open failed");
            return;
        }
        JSObject r = new JSObject();
        put(r, "ok", Boolean.TRUE);
        call.resolve(r);
    }
}
