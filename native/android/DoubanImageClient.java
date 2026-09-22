package com.hk1boxtv.app;

import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebView;

import com.getcapacitor.Bridge;
import com.getcapacitor.BridgeWebViewClient;

import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.HashMap;
import java.util.Map;

/**
 * 给豆瓣图片补 Referer 的 WebViewClient。
 *
 * 背景：豆瓣图片（img1/2/3/9.doubanio.com）有防盗链，不带 Referer 访问会返回 418，
 * 因此 WebView 里直接 <img src="豆瓣图"> 会全部裂图。
 * 这里在资源请求层统一代拉并补上 Referer，前端就能像普通图片一样使用原始 URL，
 * 同时还能复用 WebView 自带的图片缓存。
 *
 * 实现上继承 Capacitor 的 BridgeWebViewClient，非豆瓣请求原样交回给 super，
 * 不影响 Capacitor 的本地资源服务与桥接。
 */
public class DoubanImageClient extends BridgeWebViewClient {

    private static final String REFERER = "https://movie.douban.com/";
    private static final String UA =
        "Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36";

    public DoubanImageClient(Bridge bridge) {
        super(bridge);
    }

    @Override
    public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
        String url = request.getUrl() != null ? request.getUrl().toString() : "";
        if (url.contains("doubanio.com")) {
            try {
                HttpURLConnection conn = (HttpURLConnection) new URL(url).openConnection();
                conn.setInstanceFollowRedirects(true);
                conn.setConnectTimeout(8000);
                conn.setReadTimeout(15000);
                // 这两个头都不在 JVM 的受限头列表里，可以正常设置
                conn.setRequestProperty("Referer", REFERER);
                conn.setRequestProperty("User-Agent", UA);

                int code = conn.getResponseCode();
                if (code == HttpURLConnection.HTTP_OK) {
                    InputStream is = conn.getInputStream();
                    String contentType = conn.getContentType();
                    String mime = contentType != null ? contentType.split(";")[0] : "image/jpeg";

                    Map<String, String> headers = new HashMap<>();
                    headers.put("Cache-Control", "max-age=604800");

                    return new WebResourceResponse(
                        mime,
                        null,
                        code,
                        conn.getResponseMessage() != null ? conn.getResponseMessage() : "OK",
                        headers,
                        is
                    );
                }
            } catch (Exception ignored) {
                // 代拉失败时回退给 Capacitor 默认处理（至少不会崩）
            }
        }
        return super.shouldInterceptRequest(view, request);
    }
}
