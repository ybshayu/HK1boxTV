#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
为 Capacitor 生成的 android/app/build.gradle 注入 release 签名配置。

- 在 `buildTypes {` 之前插入 `signingConfigs { debug / release }` 块
- 在 `release {` 内的 `minifyEnabled false` 之后，加入条件签名：
  有签名密钥(env KEYSTORE_FILE 存在) → 用 release 签名；否则回退 debug 签名（保证可安装）

对 Capacitor 7 默认模板做了空格容错，且幂等（已注入则跳过）。
"""
import os
import sys

BUILD_GRADLE = "android/app/build.gradle"


def patch():
    if not os.path.exists(BUILD_GRADLE):
        print(f"[patch] 未找到 {BUILD_GRADLE}，跳过（可能尚未生成安卓工程）")
        return 0

    with open(BUILD_GRADLE, "r", encoding="utf-8") as f:
        lines = f.readlines()

    joined = "".join(lines)
    if "KEYSTORE_FILE" in joined:
        print("[patch] 已注入过签名配置，跳过")
        return 0

    out = []
    inserted_signing = False
    in_release = False
    release_signed = False

    for line in lines:
        stripped = line.strip()

        # 1) 在 buildTypes { 之前插入 signingConfigs 块
        if not inserted_signing and stripped == "buildTypes {":
            out.append("    signingConfigs {\n")
            out.append("        debug {\n")
            out.append("            // 使用 SDK 默认 debug 密钥\n")
            out.append("        }\n")
            out.append("        release {\n")
            out.append('            def keystoreFile = System.getenv("KEYSTORE_FILE")\n')
            out.append("            if (keystoreFile != null && new File(keystoreFile).exists()) {\n")
            out.append("                storeFile file(keystoreFile)\n")
            out.append('                storePassword System.getenv("KEYSTORE_PASSWORD")\n')
            out.append('                keyAlias System.getenv("KEY_ALIAS")\n')
            out.append('                keyPassword System.getenv("KEY_PASSWORD")\n')
            out.append("            }\n")
            out.append("        }\n")
            out.append("    }\n")
            inserted_signing = True

        # 2) 跟踪 release 块，在 minifyEnabled false 之后加条件签名
        if stripped == "release {":
            in_release = True
        if in_release and stripped == "minifyEnabled false" and not release_signed:
            out.append(line)
            out.append('            def keystoreFile = System.getenv("KEYSTORE_FILE")\n')
            out.append("            if (keystoreFile != null && new File(keystoreFile).exists()) {\n")
            out.append("                signingConfig signingConfigs.release\n")
            out.append("            } else {\n")
            out.append("                signingConfig signingConfigs.debug\n")
            out.append("            }\n")
            release_signed = True
            in_release = False  # 只处理 release 块
            continue

        out.append(line)

    if not inserted_signing:
        print("[patch] 未在 build.gradle 中找到 buildTypes {，无法注入")
        return 1

    with open(BUILD_GRADLE, "w", encoding="utf-8") as f:
        f.write("".join(out))

    print("[patch] 已成功注入 release 签名配置")
    return 0


if __name__ == "__main__":
    sys.exit(patch())
