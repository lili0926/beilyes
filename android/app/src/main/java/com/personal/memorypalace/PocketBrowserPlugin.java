package com.personal.memorypalace;

import android.graphics.Bitmap;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.Typeface;
import android.os.Handler;
import android.os.Looper;
import android.util.Base64;
import android.util.DisplayMetrics;
import android.util.TypedValue;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.widget.FrameLayout;
import android.widget.LinearLayout;
import android.widget.TextView;
import android.webkit.CookieManager;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicBoolean;

import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.Response;
import okhttp3.WebSocket;
import okhttp3.WebSocketListener;

/**
 * PocketBrowser · Memory Palace 远程 WebView 控制通道（Android）
 * 半屏弹层 WebView（顶栏可关）+ OkHttp WebSocket；
 * showBrowser/hideBrowser 手动登录 X，Cookie 持久化后远程可复用登录态。
 */
@CapacitorPlugin(name = "PocketBrowser")
public class PocketBrowserPlugin extends Plugin {

    private FrameLayout panelRoot;   // 全屏遮罩 + 弹层
    private WebView workWebView;
    private TextView titleView;
    private PocketClient pocket;
    private final Handler mainHandler = new Handler(Looper.getMainLooper());

    @PluginMethod
    public void connect(PluginCall call) {
        String serverUrl = call.getString("serverUrl");
        String token = call.getString("token");
        if (serverUrl == null || serverUrl.trim().isEmpty() || token == null || token.trim().isEmpty()) {
            call.reject("serverUrl and token required");
            return;
        }
        mainHandler.post(() -> {
            try {
                ensureWorkWebView();
                if (pocket != null) pocket.disconnect();
                pocket = new PocketClient(workWebView, serverUrl.trim(), token.trim());
                pocket.connect();
                call.resolve();
            } catch (Exception e) {
                call.reject(e.getMessage() != null ? e.getMessage() : "connect failed");
            }
        });
    }

    @PluginMethod
    public void disconnect(PluginCall call) {
        mainHandler.post(() -> {
            if (pocket != null) pocket.disconnect();
            pocket = null;
            call.resolve();
        });
    }

    /** 弹出带顶栏的浏览器层，方便手动登录 X；点「关闭」即可收起，无需清后台 */
    @PluginMethod
    public void showBrowser(PluginCall call) {
        mainHandler.post(() -> {
            try {
                ensureWorkWebView();
                String url = call.getString("url");
                if (url == null || url.isEmpty()) url = "https://x.com/i/flow/login";
                if (titleView != null) titleView.setText(shortTitle(url));
                if (panelRoot != null) {
                    panelRoot.setVisibility(View.VISIBLE);
                    panelRoot.bringToFront();
                }
                workWebView.setVisibility(View.VISIBLE);
                workWebView.loadUrl(url);
                call.resolve();
            } catch (Exception e) {
                call.reject(e.getMessage() != null ? e.getMessage() : "show failed");
            }
        });
    }

    /** 收起弹层，Cookie 保留，远程通道可继续用 */
    @PluginMethod
    public void hideBrowser(PluginCall call) {
        mainHandler.post(() -> {
            try {
                hidePanel();
                call.resolve();
            } catch (Exception e) {
                call.reject(e.getMessage() != null ? e.getMessage() : "hide failed");
            }
        });
    }

    private void hidePanel() {
        if (panelRoot != null) panelRoot.setVisibility(View.GONE);
        if (workWebView != null) workWebView.setVisibility(View.INVISIBLE);
    }

    private String shortTitle(String url) {
        try {
            if (url.contains("x.com") || url.contains("twitter.com")) return "登录 X · 完成后点关闭";
            if (url.length() > 28) return url.substring(0, 28) + "…";
            return url;
        } catch (Exception e) {
            return "内置浏览器";
        }
    }

    private int dp(float v) {
        return (int) TypedValue.applyDimension(
                TypedValue.COMPLEX_UNIT_DIP, v,
                getContext().getResources().getDisplayMetrics());
    }

    private void ensureWorkWebView() {
        if (workWebView != null && panelRoot != null) return;
        if (getActivity() == null) throw new IllegalStateException("no activity");

        // 全屏半透明遮罩
        FrameLayout root = new FrameLayout(getContext());
        root.setLayoutParams(new FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT));
        root.setBackgroundColor(Color.parseColor("#66000000"));
        root.setVisibility(View.GONE);
        root.setClickable(true);

        // 居中弹层卡片
        LinearLayout card = new LinearLayout(getContext());
        card.setOrientation(LinearLayout.VERTICAL);
        card.setBackgroundColor(Color.parseColor("#FFFCFA"));
        FrameLayout.LayoutParams cardLp = new FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT);
        int m = dp(12);
        cardLp.setMargins(m, dp(48), m, dp(24));
        cardLp.gravity = Gravity.CENTER;
        card.setLayoutParams(cardLp);
        card.setElevation(dp(8));
        card.setClickable(true);

        // 顶栏：标题 + 关闭（像 PR 弹窗）
        LinearLayout toolbar = new LinearLayout(getContext());
        toolbar.setOrientation(LinearLayout.HORIZONTAL);
        toolbar.setGravity(Gravity.CENTER_VERTICAL);
        toolbar.setPadding(dp(12), dp(10), dp(8), dp(10));
        toolbar.setBackgroundColor(Color.parseColor("#FFF5F0"));

        TextView title = new TextView(getContext());
        title.setText("内置浏览器");
        title.setTextColor(Color.parseColor("#3D3429"));
        title.setTextSize(TypedValue.COMPLEX_UNIT_SP, 14);
        title.setTypeface(Typeface.DEFAULT_BOLD);
        title.setSingleLine(true);
        LinearLayout.LayoutParams titleLp = new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f);
        title.setLayoutParams(titleLp);
        titleView = title;

        TextView closeBtn = new TextView(getContext());
        closeBtn.setText("关闭");
        closeBtn.setTextColor(Color.WHITE);
        closeBtn.setTextSize(TypedValue.COMPLEX_UNIT_SP, 13);
        closeBtn.setTypeface(Typeface.DEFAULT_BOLD);
        closeBtn.setBackgroundColor(Color.parseColor("#C4787A"));
        closeBtn.setPadding(dp(14), dp(8), dp(14), dp(8));
        closeBtn.setOnClickListener(v -> hidePanel());

        toolbar.addView(title);
        toolbar.addView(closeBtn);

        // WebView
        WebView wv = new WebView(getContext());
        WebSettings s = wv.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setDatabaseEnabled(true);
        s.setMediaPlaybackRequiresUserGesture(false);
        s.setMixedContentMode(WebSettings.MIXED_CONTENT_COMPATIBILITY_MODE);
        s.setLoadWithOverviewMode(true);
        s.setUseWideViewPort(true);
        s.setSupportZoom(true);
        s.setBuiltInZoomControls(true);
        s.setDisplayZoomControls(false);
        // 用常见 Chrome 移动 UA，降低 X 对「异常 WebView」的拦截
        String ua = s.getUserAgentString();
        if (ua != null && !ua.contains("Chrome")) {
            s.setUserAgentString(ua + " Chrome/120.0.0.0 Mobile");
        } else if (ua != null) {
            s.setUserAgentString(ua.replace("; wv", "")); // 去掉 wv 标记，部分站点更友好
        }

        CookieManager.getInstance().setAcceptCookie(true);
        try {
            CookieManager.getInstance().setAcceptThirdPartyCookies(wv, true);
        } catch (Exception ignored) {}

        wv.setWebViewClient(new WebViewClient() {
            @Override
            public void onPageFinished(WebView view, String url) {
                if (titleView != null && url != null) titleView.setText(shortTitle(url));
            }
        });
        wv.setWebChromeClient(new WebChromeClient());
        wv.setLayoutParams(new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, 0, 1f));

        // 点遮罩空白不强制关（避免误触），只靠「关闭」
        card.addView(toolbar);
        card.addView(wv);
        root.addView(card);

        getActivity().addContentView(root, new ViewGroup.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT));

        panelRoot = root;
        workWebView = wv;
    }

    // ===================== PocketClient =====================
    class PocketClient {
        private final WebView webView;
        private final String serverUrl;
        private final String token;
        private final Handler h = new Handler(Looper.getMainLooper());
        private final OkHttpClient client = new OkHttpClient.Builder()
                .readTimeout(0, TimeUnit.MILLISECONDS)
                .pingInterval(20, TimeUnit.SECONDS)
                .build();
        private WebSocket webSocket;
        private final AtomicBoolean shouldReconnect = new AtomicBoolean(true);
        private long retryDelayMs = 1000L;

        PocketClient(WebView webView, String serverUrl, String token) {
            this.webView = webView;
            this.serverUrl = serverUrl;
            this.token = token;
        }

        void connect() {
            shouldReconnect.set(true);
            openSocket();
        }

        void disconnect() {
            shouldReconnect.set(false);
            if (webSocket != null) {
                try { webSocket.close(1000, "bye"); } catch (Exception ignored) {}
                webSocket = null;
            }
        }

        private void openSocket() {
            String url = serverUrl.contains("?") ? serverUrl + "&token=" + token : serverUrl + "?token=" + token;
            Request request = new Request.Builder().url(url).build();
            webSocket = client.newWebSocket(request, new WebSocketListener() {
                @Override
                public void onOpen(WebSocket ws, Response response) { retryDelayMs = 1000L; }

                @Override
                public void onMessage(WebSocket ws, String text) { handle(text); }

                @Override
                public void onFailure(WebSocket ws, Throwable t, Response response) {
                    PocketClient.this.webSocket = null;
                    scheduleReconnect();
                }

                @Override
                public void onClosed(WebSocket ws, int code, String reason) {
                    PocketClient.this.webSocket = null;
                    scheduleReconnect();
                }
            });
        }

        private void scheduleReconnect() {
            if (!shouldReconnect.get()) return;
            final long delay = retryDelayMs;
            retryDelayMs = Math.min(retryDelayMs * 2, 30000L);
            h.postDelayed(this::openSocket, delay);
        }

        private void handle(String text) {
            final JSONObject cmd;
            try {
                cmd = new JSONObject(text);
            } catch (Exception e) {
                return;
            }
            final String id = cmd.optString("id");
            final String action = cmd.optString("action");
            if (id.isEmpty() || action.isEmpty()) return;
            h.post(() -> {
                try {
                    switch (action) {
                        case "ping":
                            reply(id, true, "pong", null);
                            break;
                        case "goto": {
                            String u = cmd.optString("url");
                            if (!u.isEmpty()) {
                                webView.loadUrl(u);
                                reply(id, true, "loading", null);
                            } else {
                                reply(id, false, null, "bad url");
                            }
                            break;
                        }
                        case "js": {
                            String js = cmd.optString("js");
                            if (js.isEmpty()) {
                                reply(id, false, null, "empty js");
                                break;
                            }
                            webView.evaluateJavascript(js, value -> reply(id, true, value, null));
                            break;
                        }
                        case "html": {
                            webView.evaluateJavascript(
                                    "(function(){return document.documentElement.outerHTML;})()",
                                    value -> reply(id, true, value, null));
                            break;
                        }
                        case "screenshot": {
                            try {
                                Bitmap bmp = Bitmap.createBitmap(
                                        Math.max(1, webView.getWidth()),
                                        Math.max(1, webView.getHeight()),
                                        Bitmap.Config.ARGB_8888);
                                Canvas c = new Canvas(bmp);
                                webView.draw(c);
                                ByteArrayOutputStream baos = new ByteArrayOutputStream();
                                bmp.compress(Bitmap.CompressFormat.JPEG, 70, baos);
                                String b64 = Base64.encodeToString(baos.toByteArray(), Base64.NO_WRAP);
                                reply(id, true, b64, null);
                            } catch (Exception e) {
                                reply(id, false, null, e.getMessage());
                            }
                            break;
                        }
                        default:
                            reply(id, false, null, "unknown action");
                    }
                } catch (Exception e) {
                    reply(id, false, null, e.getMessage());
                }
            });
        }

        private void reply(String id, boolean ok, String data, String err) {
            try {
                JSONObject o = new JSONObject();
                o.put("id", id);
                o.put("ok", ok);
                if (data != null) o.put("data", data);
                if (err != null) o.put("error", err);
                if (webSocket != null) webSocket.send(o.toString());
            } catch (Exception ignored) {}
        }
    }
}
