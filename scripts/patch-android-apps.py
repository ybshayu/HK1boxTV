#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
把 AppManagerPlugin 注入 Capacitor 生成的安卓工程。

为什么要这一步：网页（WebView）没有任何能力枚举设备上已安装的应用、
读取应用图标、或发起卸载 —— 这些必须由原生 PackageManager 完成，
所以在构建时把自研的 Capacitor 插件注入进安卓工程。

做三件事（幂等，重复执行安全）：
  1. 复制 native/android/AppManagerPlugin.java -> android/app/src/main/java/<pkg>/
  2. MainActivity：注册插件。
     注意 registerPlugin 必须在 super.onCreate() **之前**调用，
     因为 bridge 是在父类 BridgeActivity.onCreate() 的末尾构建的，
     放到 super.onCreate() 之后注册就太晚了，插件不会生效。
  3. AndroidManifest.xml：加 QUERY_ALL_PACKAGES 权限。
     Android 11 (API 30) 起不加这个权限，PackageManager 只能看到极少部分应用。
"""
import os
import re
import shutil
import sys

PKG_DIR = "android/app/src/main/java/com/hk1boxtv/app"
MAIN_ACTIVITY = os.path.join(PKG_DIR, "MainActivity.java")
MANIFEST = "android/app/src/main/AndroidManifest.xml"
PLUGIN_SRC = "native/android/AppManagerPlugin.java"

PERMISSION_LINE = '<uses-permission android:name="android.permission.QUERY_ALL_PACKAGES" />'
REGISTER_CALL = "registerPlugin(AppManagerPlugin.class);"

# MainActivity 完全没有 onCreate 时（正常 Capacitor 模板不会有这种情况）的兜底注入。
# {webview_line} 视 DoubanImageClient 是否已注入而决定，避免单独运行本脚本时引用到不存在的类。
FULL_ONCREATE_TMPL = """
    @Override
    public void onCreate(android.os.Bundle savedInstanceState) {
        // 必须在 super.onCreate 之前注册：bridge 在父类 onCreate 末尾构建
        registerPlugin(AppManagerPlugin.class);
        super.onCreate(savedInstanceState);
%(webview_line)s    }
"""


def log(msg):
    print("[patch-apps] " + msg)


def patch_plugin_file():
    """1) 复制插件源码到安卓工程"""
    if not os.path.exists(PLUGIN_SRC):
        log(f"缺少源文件 {PLUGIN_SRC}，无法注入")
        return False

    dst = os.path.join(PKG_DIR, "AppManagerPlugin.java")
    if os.path.exists(dst):
        log("AppManagerPlugin.java 已存在，覆盖为最新版本")
    shutil.copyfile(PLUGIN_SRC, dst)
    log(f"已写入 {dst}")
    return True


def patch_main_activity():
    """2) 在 MainActivity 里注册插件"""
    with open(MAIN_ACTIVITY, "r", encoding="utf-8") as f:
        content = f.read()

    if REGISTER_CALL in content:
        log("MainActivity 已注册 AppManagerPlugin，跳过")
        return True

    if re.search(r"public\s+void\s+onCreate\s*\(", content):
        # 已有 onCreate（可能是 patch-android-webview.py 注入的）→ 在 super.onCreate 前插入注册
        m = re.search(r"([ \t]*)super\.onCreate\(", content)
        if not m:
            log("找到 onCreate 但未找到 super.onCreate 调用，跳过注册")
            return False
        indent = m.group(1)
        insert = indent + REGISTER_CALL + "\n"
        content = content[: m.start()] + insert + content[m.start():]
        with open(MAIN_ACTIVITY, "w", encoding="utf-8") as f:
            f.write(content)
        log("已在 onCreate 的 super.onCreate 之前插入 registerPlugin(AppManagerPlugin.class)")
        return True

    # 没有 onCreate → 兜底生成一个完整的
    m = re.search(r"public\s+class\s+MainActivity\s+extends\s+BridgeActivity", content)
    if not m:
        log("MainActivity 结构不符合预期（未继承 BridgeActivity），跳过")
        return False

    brace = content.find("{", m.end())
    if brace < 0:
        log("MainActivity 解析失败，跳过")
        return False

    # 只有在 DoubanImageClient 已被注入时才带上 setWebViewClient，
    # 否则单独运行本脚本会引用到不存在的类导致编译失败
    webview_line = ""
    if os.path.exists(os.path.join(PKG_DIR, "DoubanImageClient.java")):
        webview_line = (
            "        // 豆瓣图片有防盗链（不带 Referer 返回 418），在资源请求层统一补 Referer\n"
            "        this.bridge.setWebViewClient(new DoubanImageClient(this.bridge));\n"
        )

    body = FULL_ONCREATE_TMPL % {"webview_line": webview_line}
    content = content[: brace + 1] + body + content[brace + 1:]
    with open(MAIN_ACTIVITY, "w", encoding="utf-8") as f:
        f.write(content)
    log("MainActivity 已注入完整 onCreate（注册插件%s）" % ("，并挂上 WebViewClient" if webview_line else ""))
    return True


def patch_manifest():
    """3) AndroidManifest.xml 加 QUERY_ALL_PACKAGES 权限"""
    if not os.path.exists(MANIFEST):
        log(f"未找到 {MANIFEST}，跳过权限注入")
        return False

    with open(MANIFEST, "r", encoding="utf-8") as f:
        content = f.read()

    if "QUERY_ALL_PACKAGES" in content:
        log("AndroidManifest 已有 QUERY_ALL_PACKAGES，跳过")
        return True

    if "<application" not in content:
        log("AndroidManifest 里找不到 <application>，跳过")
        return False

    content = re.sub(
        r"(\n[ \t]*)(<application)",
        lambda mo: "\n    " + PERMISSION_LINE + mo.group(1) + mo.group(2),
        content,
        count=1,
    )
    with open(MANIFEST, "w", encoding="utf-8") as f:
        f.write(content)
    log("已注入 android.permission.QUERY_ALL_PACKAGES（否则读不到完整应用列表）")
    return True


def main():
    if not os.path.exists(MAIN_ACTIVITY):
        log(f"未找到 {MAIN_ACTIVITY}（安卓工程可能尚未生成），跳过")
        return 0

    ok = patch_plugin_file()
    if not ok:
        return 1

    if not patch_main_activity():
        return 1

    patch_manifest()

    # 结果自检
    with open(MAIN_ACTIVITY, "r", encoding="utf-8") as f:
        ma = f.read()
    log("自检 MainActivity: registerPlugin=%s" % (REGISTER_CALL in ma))
    if os.path.exists(MANIFEST):
        with open(MANIFEST, "r", encoding="utf-8") as f:
            mf = f.read()
        log("自检 Manifest  : QUERY_ALL_PACKAGES=%s" % ("QUERY_ALL_PACKAGES" in mf))
    return 0


if __name__ == "__main__":
    sys.exit(main())
