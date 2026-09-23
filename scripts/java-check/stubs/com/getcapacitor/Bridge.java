package com.getcapacitor;

/** 编译预检桩：Capacitor 7 Bridge（仅声明本项目用到的签名，非真实实现） */
public class Bridge {
    public void execute(Runnable runnable) {}

    public void executeOnMainThread(Runnable runnable) {}

    public android.webkit.WebView getWebView() { return null; }

    public void setWebViewClient(BridgeWebViewClient client) {}
}
