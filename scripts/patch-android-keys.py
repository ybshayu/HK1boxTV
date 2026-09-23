#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
遥控器 DPAD 直通（v1.6.0）：把方向键从 Activity 层直接转发给前端 JS 状态机。

为什么要这一步：真机（K40 / HyperOS WebView）实测，WebView 会把 DPAD 吃掉做
原生焦点移动，JS 层收不到 ArrowDown 等 keydown —— 应用自研的焦点状态机完全
收不到遥控器输入。做法是在 MainActivity.dispatchKeyEvent 里拦截
KEYCODE_DPAD_UP/DOWN/LEFT/RIGHT/CENTER，用 evaluateJavascript 调
window.__hk1RemoteKey(dir)（App.tsx 挂载），并把事件消费掉，
不再让 WebView 做原生焦点移动。

BACK / ENTER / MENU 等其余按键不拦截，走原有链路（Capacitor backButton 已验证可用）。

做法（幂等，重复执行安全）：
  在 MainActivity 类体内插入 dispatchKeyEvent override。
"""
import os
import re
import sys

MAIN_ACTIVITY = "android/app/src/main/java/com/hk1boxtv/app/MainActivity.java"

INJECT_BODY = """
    // v1.6.0: 遥控器 DPAD 直通（见 scripts/patch-android-keys.py 头注释）
    @Override
    public boolean dispatchKeyEvent(android.view.KeyEvent event) {
        int code = event.getKeyCode();
        String dir = null;
        if (code == android.view.KeyEvent.KEYCODE_DPAD_UP) dir = "up";
        else if (code == android.view.KeyEvent.KEYCODE_DPAD_DOWN) dir = "down";
        else if (code == android.view.KeyEvent.KEYCODE_DPAD_LEFT) dir = "left";
        else if (code == android.view.KeyEvent.KEYCODE_DPAD_RIGHT) dir = "right";
        else if (code == android.view.KeyEvent.KEYCODE_DPAD_CENTER) dir = "center";
        if (dir != null && event.getAction() == android.view.KeyEvent.ACTION_DOWN
                && this.bridge != null && this.bridge.getWebView() != null) {
            final String d = dir;
            final android.webkit.WebView wv = this.bridge.getWebView();
            wv.post(new Runnable() {
                @Override
                public void run() {
                    wv.evaluateJavascript(
                        "window.__hk1RemoteKey && window.__hk1RemoteKey('" + d + "');", null);
                }
            });
            return true; // 消费掉，避免 WebView 再做原生焦点移动
        }
        return super.dispatchKeyEvent(event);
    }
"""


def log(msg):
    print("[patch-keys] " + msg)


def main():
    if not os.path.exists(MAIN_ACTIVITY):
        log(f"未找到 {MAIN_ACTIVITY}（安卓工程可能尚未生成），跳过")
        return 0

    with open(MAIN_ACTIVITY, "r", encoding="utf-8") as f:
        content = f.read()

    if "__hk1RemoteKey" in content:
        log("MainActivity 已注入过 DPAD 直通，跳过")
        return 0

    m = re.search(r"public\s+class\s+MainActivity\s+extends\s+BridgeActivity", content)
    if not m:
        log("MainActivity 结构不符合预期（未找到 BridgeActivity 继承），跳过注入")
        return 1

    brace = content.find("{", m.end())
    if brace < 0:
        log("MainActivity 解析失败，跳过注入")
        return 1

    content = content[: brace + 1] + INJECT_BODY + content[brace + 1:]
    with open(MAIN_ACTIVITY, "w", encoding="utf-8") as f:
        f.write(content)
    log("MainActivity 已注入 dispatchKeyEvent DPAD 直通")
    return 0


if __name__ == "__main__":
    sys.exit(main())
