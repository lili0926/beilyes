package com.personal.memorypalace;

import android.graphics.Bitmap;
import android.graphics.Canvas;
import android.os.Handler;
import android.os.Looper;
import android.util.Base64;
import android.util.DisplayMetrics;
import android.view.View;
import android.view.ViewGroup;
import android.webkit.CookieManager;
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
 * 隐藏 WebView + OkHttp WebSocket 连 server；远程 goto/js/html/screenshot；
 * showBrowser/hideBrowser 手动登录 X，Cookie 持久化后远程可复用登录态。
 */
@CapacitorPlugin(name = "PocketBrowser")
public class PocketBrowserPlugin extends Plugin {

    private WebView workWebView;
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

    /** 把干活 WebView 显示出来，方便手动登录 X */
    @PluginMethod
    public void showBrowser(PluginCall call) {
        mainHandler.post(() -> {
            try {
                ensureWorkWebView();
                String url = call.getString("url");
                if (url == null || url.isEmpty()) url = "https://x.com";
                workWebView.setVisibility(View.VISIBLE);
                workWebView.bringToFront();
                workWebView.loadUrl(url);
                call.resolve();
            } catch (Exception e) {
                call.reject(e.getMessage() != null ? e.getMessage() : "show failed");
            }
        });
    }

    /** 藏回去，继续只接受远程指令 */
    @PluginMethod
    public void hideBrowser(PluginCall call) {
        mainHandler.post(() -> {
            try {
                if (workWebView != null) workWebView.setVisibility(View.INVISIBLE);
                call.resolve();
            } catch (Exception e) {
                call.reject(e.getMessage() != null ? e.getMessage() : "hide failed");
            }
        });
    }

    private void ensureWorkWebView() {
        if (workWebView != null) return;
        WebView wv = new WebView(getContext());
        WebSettings s = wv.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setDatabaseEnabled(true);
        s.setMediaPlaybackRequiresUserGesture(false);
        s.setMixedContentMode(WebSettings.MIXED_CONTENT_COMPATIBILITY_MODE);

        CookieManager.getInstance().setAcceptCookie(true);
        try {
            CookieManager.getInstance().setAcceptThirdPartyCookies(wv, true);
        } catch (Exception ignored) {}

        wv.setWebViewClient(new WebViewClient());
        wv.setVisibility(View.INVISIBLE);

        DisplayMetrics dm = getContext().getResources().getDisplayMetrics();
        ViewGroup.LayoutParams params = new ViewGroup.LayoutParams(dm.widthPixels, dm.heightPixels);
        if (getActivity() != null) getActivity().addContentView(wv, params);
        workWebView = wv;
    }

    // ===================== PocketClient =====================
    class PocketClient {
        private final WebView webView;
        private final String serverUrl;
        private final String token;
        private final Handler h = new Handler(Looper.getMainLooper());
        private final OkHttpClient client = new OkHttpClient.Builder()
                .pingInterval(25, TimeUnit.SECONDS)
                .build();
        private WebSocket webSocket;
        private final AtomicBoolean shouldReconnect = new AtomicBoolean(false);
        private long retryDelayMs = 1000L;

        PocketClient(WebView webView, String serverUrl, String token) {
            this.webView = webView;
            this.serverUrl = serverUrl;
            this.token = token;
        }

        void connect() {
            if (webSocket != null) return;
            shouldReconnect.set(true);
            retryDelayMs = 1000L;
            openSocket();
        }

        void disconnect() {
            shouldReconnect.set(false);
            if (webSocket != null) {
                webSocket.close(1000, "bye");
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
                            if (js.isEmpty()) js = cmd.optString("code");
                            if (js.isEmpty()) {
                                reply(id, false, null, "no js");
                                break;
                            }
                            final String finalJs = js;
                            webView.evaluateJavascript(finalJs, value -> reply(id, true, cleanJsResult(value), null));
                            break;
                        }
                        case "html": {
                            webView.evaluateJavascript("document.documentElement.outerHTML", value -> reply(id, true, cleanJsResult(value), null));
                            break;
                        }
                        case "screenshot": {
                            try {
                                webView.measure(
                                        View.MeasureSpec.makeMeasureSpec(webView.getWidth(), View.MeasureSpec.EXACTLY),
                                        View.MeasureSpec.makeMeasureSpec(webView.getHeight(), View.MeasureSpec.EXACTLY));
                                webView.layout(0, 0, webView.getMeasuredWidth(), webView.getMeasuredHeight());
                                int w = webView.getWidth();
                                int ht = webView.getHeight();
                                if (w <= 0 || ht <= 0) {
                                    reply(id, false, null, "webview not laid out");
                                    break;
                                }
                                Bitmap bitmap = Bitmap.createBitmap(w, ht, Bitmap.Config.ARGB_8888);
                                Canvas canvas = new Canvas(bitmap);
                                webView.draw(canvas);
                                ByteArrayOutputStream stream = new ByteArrayOutputStream();
                                bitmap.compress(Bitmap.CompressFormat.PNG, 90, stream);
                                String b64 = Base64.encodeToString(stream.toByteArray(), Base64.NO_WRAP);
                                bitmap.recycle();
                                reply(id, true, "data:image/png;base64," + b64, null);
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

        private String cleanJsResult(String value) {
            if (value == null) return "";
            if (value.startsWith("\"") && value.endsWith("\"") && value.length() >= 2) {
                return value.substring(1, value.length() - 1)
                        .replace("\\\"", "\"")
                        .replace("\\n", "\n")
                        .replace("\\\\", "\\");
            }
            return value;
        }

        private void reply(String id, boolean ok, String result, String error) {
            try {
                JSONObject obj = new JSONObject();
                obj.put("id", id);
                obj.put("ok", ok);
                if (result != null) obj.put("result", result);
                if (error != null) obj.put("error", error);
                if (webSocket != null) webSocket.send(obj.toString());
            } catch (Exception ignored) {}
        }
    }
}
