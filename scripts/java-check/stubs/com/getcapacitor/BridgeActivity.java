package com.getcapacitor;

import android.os.Bundle;

/** 编译预检桩：Capacitor 7 BridgeActivity（仅声明本项目用到的签名，非真实实现） */
public class BridgeActivity extends android.app.Activity {
    protected Bridge bridge;

    public void registerPlugin(Class<? extends Plugin> plugin) {}

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
    }
}
