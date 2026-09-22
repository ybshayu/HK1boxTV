#!/usr/bin/env bash
#
# 本地 Java 编译预检
#
# 目的：在推 CI 之前，用本机 Android SDK 的 android.jar + 一份 Capacitor API 桩，
#       把 native/android/*.java 真正编译一遍，提前抓出：
#         - import 包名写错（例：StorageStats 其实在 android.app.usage 而非 android.os.storage）
#         - 类名冲突（例：import android.os.Process 与 java.lang.Process 撞名）
#         - 方法名 / 参数类型不匹配
#         - 语法错误
#       否则只能等 CI 跑 5-8 分钟才知道挂在哪。
#
# 用法（在项目根目录执行）：
#   bash scripts/java-check/check.sh
#
# 注意：stubs/ 里的类是手写的「签名桩」，不是真实实现，只为编译期类型检查。
#       如果升级 Capacitor 大版本，需核对桩里的签名是否仍与真实源码一致。
set -u

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT" || exit 1

JAVAC="${JAVAC:-D:/RuanJian/SecurityTools/jdk/bin/javac.exe}"
ANDROID_JAR="${ANDROID_JAR:-D:/RuanJian/AndroidSDK/platforms/android-36/android.jar}"
OUT="${OUT:-D:/AIwork/WorkBuddy/缓存/java-check-out}"

if [ ! -x "$JAVAC" ]; then
  echo "[java-check] 找不到 javac: $JAVAC"
  echo "[java-check] 可用 JAVAC=<path> 指定，例如 JAVAC=/path/to/javac"
  exit 2
fi

if [ ! -f "$ANDROID_JAR" ]; then
  echo "[java-check] 找不到 android.jar: $ANDROID_JAR"
  echo "[java-check] 可用 ANDROID_JAR=<path> 指定"
  exit 2
fi

rm -rf "$OUT"
mkdir -p "$OUT"

echo "[java-check] javac      = $JAVAC"
echo "[java-check] android.jar= $ANDROID_JAR"
echo "[java-check] 编译 native/android/*.java ..."

SOURCES=$(ls native/android/*.java 2>/dev/null)
STUBS=$(ls scripts/java-check/stubs/com/getcapacitor/*.java scripts/java-check/stubs/com/getcapacitor/annotation/*.java 2>/dev/null)

if [ -z "$SOURCES" ]; then
  echo "[java-check] native/android 下没有 .java 文件"
  exit 1
fi

# shellcheck disable=SC2086
"$JAVAC" -encoding UTF-8 -nowarn -classpath "$ANDROID_JAR" -d "$OUT" $SOURCES $STUBS
RC=$?

if [ $RC -eq 0 ]; then
  echo "[java-check] ✅ 编译通过（$(echo "$SOURCES" | wc -w) 个原生源文件）"
else
  echo "[java-check] ❌ 编译失败，退出码 $RC —— 请先修上面的错误再推 CI"
fi
exit $RC
