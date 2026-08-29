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
import android.media.AudioAttributes;
import android.media.Ringtone;
import android.media.RingtoneManager;
import android.net.Uri;
import android.os.Build;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.os.VibrationEffect;
import android.os.Vibrator;

import androidx.core.app.NotificationCompat;
import androidx.core.content.ContextCompat;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.concurrent.TimeUnit;

import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.Response;
import okhttp3.WebSocket;
import okhttp3.WebSocketListener;

/**
 * 常驻前台服务：挂一条到 cc-hub 的 WebSocket，Aries 一说话就立刻发本地通知。
 *
 * 为什么不用 FCM：这台 VPS 在大陆，出不去 Google，FCM 得靠 sing-box 代理，
 * 而且国产 ROM 上 FCM 本来就不可靠。本地通知完全不依赖 Google Play 服务。
 *
 * 为什么不用 BackgroundRunner 轮询：WorkManager 最快 15 分钟，进 Doze 后会被
 * 拖到几十分钟，国产 ROM 杀后台时可能根本不执行——保活不住。
 *
 * 前台服务类型用 specialUse 而不是 dataSync：Android 15 (targetSdk 35) 给
 * dataSync 加了每天 6 小时的上限，扛不住 24 小时常驻。
 */
public class AriesPushService extends Service {

    private static final String TAG = "AriesPush";

    // 常驻提示（必须存在，Android 强制要求）
    private static final String CH_ONGOING = "aries_push_ongoing";
    private static final int NOTIF_ONGOING = 4201;
    // 真正的消息通知
    private static final String CH_MESSAGE = "aries_message";
    // 来电：独立渠道，最高优先级 + 铃声由服务自己循环播放
    private static final String CH_CALL = "aries_call";
    private static final int NOTIF_CALL = 4202;
    private static int msgNotifId = 4300;

    private static final String PREFS = "aries_push";
    private static final String KEY_BASE = "base";          // 形如 115.29.237.172:3456
    private static final String KEY_PIN = "pin";
    private static final String KEY_LAST_NOTIFIED = "last_notified_id";

    private static final String DEFAULT_HOST = "115.29.237.172:3456";
    private static final String DEFAULT_PIN = "498898";

    private OkHttpClient client;
    private WebSocket ws;
    private final Handler handler = new Handler(Looper.getMainLooper());
    private boolean stopping = false;
    private int retryCount = 0;
    private Ringtone ringtone;
    private Vibrator vibrator;
    private String ringingInviteId = "";
    private Runnable ringTimeout;

    public static void start(Context ctx) {
        Intent i = new Intent(ctx, AriesPushService.class);
        ContextCompat.startForegroundService(ctx, i);
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    @Override
    public void onCreate() {
        super.onCreate();
        createChannels();
        client = new OkHttpClient.Builder()
                // 心跳：让运营商/NAT 不掐掉这条长连接，也能尽快发现断线
                .pingInterval(30, TimeUnit.SECONDS)
                .readTimeout(0, TimeUnit.MILLISECONDS)
                .retryOnConnectionFailure(true)
                .build();
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        startForegroundCompat();
        if (ws == null) connect();
        // 被系统杀掉后自动重建
        return START_STICKY;
    }

    @Override
    public void onDestroy() {
        stopping = true;
        stopRinging();
        try { if (ws != null) ws.close(1000, "service destroyed"); } catch (Exception ignored) {}
        super.onDestroy();
    }

    // ─── 前台通知 ────────────────────────────────────────────────────────────

    private void startForegroundCompat() {
        Notification n = buildOngoing("已连接");
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            startForeground(NOTIF_ONGOING, n, ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE);
        } else {
            startForeground(NOTIF_ONGOING, n);
        }
    }

    private Notification buildOngoing(String text) {
        return new NotificationCompat.Builder(this, CH_ONGOING)
                .setContentTitle("Aries")
                .setContentText(text)
                .setSmallIcon(android.R.drawable.ic_dialog_email)
                .setPriority(NotificationCompat.PRIORITY_MIN)
                .setOngoing(true)
                .setSilent(true)
                .setShowWhen(false)
                .setContentIntent(openAppIntent())
                .build();
    }

    private void updateOngoing(String text) {
        try {
            NotificationManager nm = getSystemService(NotificationManager.class);
            if (nm != null) nm.notify(NOTIF_ONGOING, buildOngoing(text));
        } catch (Exception ignored) {}
    }

    private PendingIntent openAppIntent() {
        Intent i = new Intent(this, MainActivity.class);
        i.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        int flags = PendingIntent.FLAG_UPDATE_CURRENT;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) flags |= PendingIntent.FLAG_IMMUTABLE;
        return PendingIntent.getActivity(this, 0, i, flags);
    }

    private void createChannels() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;
        NotificationManager nm = getSystemService(NotificationManager.class);
        if (nm == null) return;
        NotificationChannel ongoing = new NotificationChannel(
                CH_ONGOING, "保持连接", NotificationManager.IMPORTANCE_MIN);
        ongoing.setShowBadge(false);
        nm.createNotificationChannel(ongoing);

        NotificationChannel message = new NotificationChannel(
                CH_MESSAGE, "Aries 的消息", NotificationManager.IMPORTANCE_HIGH);
        message.setShowBadge(true);
        message.enableVibration(true);
        nm.createNotificationChannel(message);

        // 铃声/震动由服务自己驱动，渠道本身设静音，免得叠两层声音
        NotificationChannel call = new NotificationChannel(
                CH_CALL, "来电", NotificationManager.IMPORTANCE_HIGH);
        call.setShowBadge(true);
        call.enableVibration(false);
        call.setSound(null, null);
        nm.createNotificationChannel(call);
    }

    private void notifyMessage(String body, int extraCount) {
        String text = body == null ? "" : body.replaceAll("\\s+", " ").trim();
        if (text.isEmpty()) return;
        if (text.length() > 120) text = text.substring(0, 120) + "…";
        String title = extraCount > 1 ? ("Aries · " + extraCount + " 条新消息") : "Aries";
        Notification n = new NotificationCompat.Builder(this, CH_MESSAGE)
                .setContentTitle(title)
                .setContentText(text)
                .setStyle(new NotificationCompat.BigTextStyle().bigText(text))
                .setSmallIcon(android.R.drawable.ic_dialog_email)
                .setPriority(NotificationCompat.PRIORITY_HIGH)
                .setAutoCancel(true)
                .setContentIntent(openAppIntent())
                .build();
        try {
            NotificationManager nm = getSystemService(NotificationManager.class);
            if (nm != null) nm.notify(msgNotifId++, n);
        } catch (Exception ignored) {}
    }

    // ─── WebSocket ──────────────────────────────────────────────────────────

    private SharedPreferences prefs() {
        return getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    }

    private String host() {
        String h = prefs().getString(KEY_BASE, DEFAULT_HOST);
        return (h == null || h.trim().isEmpty()) ? DEFAULT_HOST : h.trim();
    }

    private String pin() {
        String p = prefs().getString(KEY_PIN, DEFAULT_PIN);
        return p == null ? "" : p;
    }

    private void connect() {
        if (stopping) return;
        Request req = new Request.Builder().url("ws://" + host() + "/").build();
        ws = client.newWebSocket(req, new WebSocketListener() {
            @Override
            public void onOpen(WebSocket sock, Response response) {
                retryCount = 0;
                updateOngoing("已连接");
                try {
                    JSONObject auth = new JSONObject();
                    auth.put("type", "auth");
                    auth.put("pin", pin());
                    sock.send(auth.toString());
                } catch (Exception ignored) {}
            }

            @Override
            public void onMessage(WebSocket sock, String text) {
                handleFrame(sock, text);
            }

            @Override
            public void onFailure(WebSocket sock, Throwable t, Response response) {
                updateOngoing("连接断开，重连中");
                scheduleReconnect();
            }

            @Override
            public void onClosed(WebSocket sock, int code, String reason) {
                updateOngoing("连接断开，重连中");
                scheduleReconnect();
            }
        });
    }

    private void scheduleReconnect() {
        if (stopping) return;
        ws = null;
        retryCount++;
        // 5s 起步，指数退避，最多 60s
        long delay = Math.min(60000L, 5000L * (1L << Math.min(retryCount - 1, 4)));
        handler.postDelayed(this::connect, delay);
    }

    private void handleFrame(WebSocket sock, String text) {
        JSONObject o;
        try { o = new JSONObject(text); } catch (Exception e) { return; }
        String type = o.optString("type", "");

        if ("auth_ok".equals(type)) {
            // 关键：告诉 hub 这个连接不是"用户在看"。
            // 否则 hub 会认为 App 在前台，就不再把消息标记为未读，也不会触发通知。
            try {
                JSONObject vis = new JSONObject();
                vis.put("type", "visibility");
                vis.put("visible", false);
                sock.send(vis.toString());
            } catch (Exception ignored) {}
            return;
        }

        if ("history".equals(type)) {
            // 重连后补发：只补那些"未读且还没提醒过"的
            catchUp(o.optJSONArray("messages"));
            return;
        }

        if ("call".equals(type)) {
            startRinging(o.optString("invite_id", ""),
                         o.optString("reason", "想打给你"),
                         o.optDouble("expires_at", 0));
            return;
        }

        if ("call_end".equals(type)) {
            stopRinging();
            return;
        }

        if ("message".equals(type)) {
            if (!"assistant".equals(o.optString("role", ""))) return;
            // unread=false 表示 App 正开着在前台，用户自己看得见，不用打扰
            if (!o.optBoolean("unread", false)) return;
            String id = o.optString("id", "");
            if (!id.isEmpty() && id.equals(prefs().getString(KEY_LAST_NOTIFIED, ""))) return;
            notifyMessage(o.optString("content", ""), 1);
            if (!id.isEmpty()) prefs().edit().putString(KEY_LAST_NOTIFIED, id).apply();
        }
    }

    // ─── 来电响铃 ───────────────────────────────────────────────────────────

    private void startRinging(String inviteId, String reason, double expiresAtSec) {
        if (inviteId.isEmpty() || inviteId.equals(ringingInviteId)) return;
        stopRinging();
        ringingInviteId = inviteId;

        Notification n = new NotificationCompat.Builder(this, CH_CALL)
                .setContentTitle("Aries 来电")
                .setContentText(reason)
                .setSmallIcon(android.R.drawable.sym_call_incoming)
                .setPriority(NotificationCompat.PRIORITY_MAX)
                .setCategory(NotificationCompat.CATEGORY_CALL)
                .setOngoing(true)
                .setAutoCancel(false)
                .setContentIntent(openAppIntent())
                // 锁屏时直接把 App 顶到前台，像真的来电
                .setFullScreenIntent(openAppIntent(), true)
                .build();
        try {
            NotificationManager nm = getSystemService(NotificationManager.class);
            if (nm != null) nm.notify(NOTIF_CALL, n);
        } catch (Exception ignored) {}

        try {
            Uri uri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_RINGTONE);
            if (uri == null) uri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION);
            if (uri != null) {
                ringtone = RingtoneManager.getRingtone(getApplicationContext(), uri);
                if (ringtone != null) {
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                        ringtone.setAudioAttributes(new AudioAttributes.Builder()
                                .setUsage(AudioAttributes.USAGE_NOTIFICATION_RINGTONE)
                                .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                                .build());
                    }
                    // P 以下没有 setLooping，靠下面的超时兜底停掉
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) ringtone.setLooping(true);
                    ringtone.play();
                }
            }
        } catch (Exception ignored) {}

        try {
            if (vibrator == null) vibrator = getSystemService(Vibrator.class);
            long[] pattern = {0, 700, 700};
            if (vibrator != null) {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    vibrator.vibrate(VibrationEffect.createWaveform(pattern, 0));
                } else {
                    vibrator.vibrate(pattern, 0);
                }
            }
        } catch (Exception ignored) {}

        // 邀请过期就自己停，别一直响下去
        long ms = expiresAtSec > 0
                ? Math.max(5000L, (long) (expiresAtSec * 1000L - System.currentTimeMillis()))
                : 45000L;
        ringTimeout = this::stopRinging;
        handler.postDelayed(ringTimeout, Math.min(ms, 120000L));
    }

    private void stopRinging() {
        ringingInviteId = "";
        if (ringTimeout != null) { handler.removeCallbacks(ringTimeout); ringTimeout = null; }
        try { if (ringtone != null && ringtone.isPlaying()) ringtone.stop(); } catch (Exception ignored) {}
        ringtone = null;
        try { if (vibrator != null) vibrator.cancel(); } catch (Exception ignored) {}
        try {
            NotificationManager nm = getSystemService(NotificationManager.class);
            if (nm != null) nm.cancel(NOTIF_CALL);
        } catch (Exception ignored) {}
    }

    /** 重连时把断线期间积压的未读补一条汇总通知，不逐条轰炸。 */
    private void catchUp(JSONArray messages) {
        if (messages == null) return;
        String last = prefs().getString(KEY_LAST_NOTIFIED, "");
        int count = 0;
        String newestId = "";
        String newestContent = "";
        boolean passedLast = last.isEmpty();
        for (int i = 0; i < messages.length(); i++) {
            JSONObject m = messages.optJSONObject(i);
            if (m == null) continue;
            String id = m.optString("id", "");
            if (!passedLast) {
                if (id.equals(last)) passedLast = true;
                continue;
            }
            if (!"assistant".equals(m.optString("role", ""))) continue;
            if (!m.optBoolean("unread", false)) continue;
            String c = m.optString("content", "");
            if (c.trim().isEmpty()) continue;
            count++;
            newestId = id;
            newestContent = c;
        }
        if (count > 0) {
            notifyMessage(newestContent, count);
            if (!newestId.isEmpty()) prefs().edit().putString(KEY_LAST_NOTIFIED, newestId).apply();
        }
    }
}
