#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
注入 APK 版本号：把 Capacitor 生成的 android/app/build.gradle 的
versionCode / versionName 设为当前发布版本。

版本来源（优先级）：
  1. CI tag，形如 v1.5.0（环境变量 GITHUB_REF_NAME）
  2. 本地 package.json 的 version 字段（本地手动构建兜底）

- versionName = "1.5.0"
- versionCode = 1*10000 + 5*100 + 0 = 10500（单调递增，便于覆盖升级）

对 Capacitor 7 默认模板做了空格容错，且幂等（重复执行安全）。
"""
import os
import re
import sys
import json

BUILD_GRADLE = "android/app/build.gradle"
PACKAGE_JSON = "package.json"


def get_version() -> str:
    # 1) CI tag（形如 v1.5.0）
    ref = os.environ.get("GITHUB_REF_NAME", "")
    if ref.startswith("v"):
        return ref[1:]
    # 2) 本地 package.json
    try:
        with open(PACKAGE_JSON, "r", encoding="utf-8") as f:
            data = json.load(f)
        ver = str(data.get("version", "")).lstrip("v")
        if ver:
            return ver
    except Exception:
        pass
    return ""


def main() -> int:
    ver = get_version()
    if not re.match(r"^\d+\.\d+\.\d+$", ver):
        print(f"[patch-version] 无法解析版本号（got={ver!r}），跳过")
        return 0

    parts = [int(x) for x in ver.split(".")]
    version_code = parts[0] * 10000 + parts[1] * 100 + parts[2]
    version_name = ver

    if not os.path.exists(BUILD_GRADLE):
        print(f"[patch-version] 未找到 {BUILD_GRADLE}，跳过（可能尚未生成安卓工程）")
        return 0

    with open(BUILD_GRADLE, "r", encoding="utf-8") as f:
        content = f.read()

    new_content, n = re.subn(r"versionCode\s+\d+", f"versionCode {version_code}", content)
    if n == 0:
        # 没找到现成的 versionCode，兜底插入到 defaultConfig 内
        new_content = re.sub(
            r"(defaultConfig\s*\{)",
            lambda m: f"{m.group(1)}\n        versionCode {version_code}",
            content,
            count=1,
        )

    new_content, n2 = re.subn(
        r'versionName\s+"[^"]*"', f'versionName "{version_name}"', new_content
    )
    if n2 == 0:
        new_content = re.sub(
            r"(defaultConfig\s*\{)",
            lambda m: f"{m.group(1)}\n        versionName \"{version_name}\"",
            new_content,
            count=1,
        )

    with open(BUILD_GRADLE, "w", encoding="utf-8") as f:
        f.write(new_content)

    print(f"[patch-version] 已注入 versionName={version_name} versionCode={version_code}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
