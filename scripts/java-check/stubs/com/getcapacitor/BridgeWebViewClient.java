package com.getcapacitor;

import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebView;
import android.webkit.WebViewClient;

public class BridgeWebViewClient extends WebViewClient {
    public BridgeWebViewClient(Bridge bridge) {}

    @Override
    public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
        return null;
    }
}
