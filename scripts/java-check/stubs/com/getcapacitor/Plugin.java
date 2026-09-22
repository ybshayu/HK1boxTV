package com.getcapacitor;

import android.app.Activity;
import android.content.Context;

/**
 * 仅用于本地编译预检的 API 桩。
 * 方法签名对齐 @capacitor/android 7.x 的真实源码，用来在本地提前抓出
 * 包名写错 / 方法名拼错 / 类型不匹配这类编译错误（CI 跑一轮要 5-8 分钟）。
 */
public class Plugin {
    protected Bridge bridge;

    public void load() {}

    public Context getContext() {
        return null;
    }

    public Activity getActivity() {
        return null;
    }

    public Bridge getBridge() {
        return null;
    }

    protected void notifyListeners(String eventName, JSObject data, boolean retainUntilConsumed) {}

    protected void notifyListeners(String eventName, JSObject data) {}

    protected void handleOnDestroy() {}
}
