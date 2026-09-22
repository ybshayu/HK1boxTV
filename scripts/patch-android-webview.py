#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
把 DoubanImageClient 注入到 Capacitor 生成的安卓工程，并让 MainActivity 挂上它。

为什么要这一步：豆瓣图片有防盗链（不带 Referer 返回 418），
需要原生 WebViewClient 在资源请求层补 Referer，前端才能直接用豆瓣图 URL。

做法（幂等，重复执行安全）：
  1. 复制 native/android/DoubanImageClient.java -> android/app/src/main/java/<pkg>/
  2. 在 MainActivity 里插入 onCreate，挂上 setWebViewClient(new DoubanImageClient(bridge))
"""
import os
import re
import shutil
import sys

PKG_DIR = "android/app/src/main/java/com/hk1boxtv/app"
MAIN_ACTIVITY = os.path.join(PKG_DIR, "MainActivity.java")
CLIENT_SRC = "native/android/DoubanImageClient.java"

INJECT_BODY = """
    @Override
    public void onCreate(android.os.Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        // 豆瓣图片有防盗链（416/418），这里在资源请求层统一补 Referer，否则海报全部裂图
        this.bridge.setWebViewClient(new DoubanImageClient(this.bridge));
    }
"""


def log(msg):
    print("[patch-webview] " + msg)


def main():
    if not os.path.exists(MAIN_ACTIVITY):
        log(f"未找到 {MAIN_ACTIVITY}（安卓工程可能尚未生成），跳过")
        return 0

    # 1) 复制 DoubanImageClient.java
    dst = os.path.join(PKG_DIR, "DoubanImageClient.java")
    if os.path.exists(dst):
        log("DoubanImageClient.java 已存在，覆盖为最新版本")
    if not os.path.exists(CLIENT_SRC):
        log(f"缺少源文件 {CLIENT_SRC}，跳过")
        return 1
    shutil.copyfile(CLIENT_SRC, dst)
    log(f"已写入 {dst}")

    # 2) patch MainActivity
    with open(MAIN_ACTIVITY, "r", encoding="utf-8") as f:
        content = f.read()

    if "DoubanImageClient" in content:
        log("MainActivity 已注入过，跳过")
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
    log("MainActivity 已注入 setWebViewClient(DoubanImageClient)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
