#!/usr/bin/env bash
# Memory Palace · 打包 APK
# 环境要求：Node.js + JDK 17+ + Android SDK
#
# Windows 快速开始（PowerShell 管理员）：
#   winget install OpenJDK.21
#   setx JAVA_HOME "%ProgramFiles%\OpenJDK\jdk-21"
#   安装 Android Studio → SDK Manager → Android SDK 34
#   setx ANDROID_HOME "$env:LOCALAPPDATA\Android\Sdk"
#
set -euo pipefail
cd "$(dirname "$0")"

echo "=== 1/5 同步前端 ==="
bash sync-frontend.sh

echo "=== 2/5 npm install ==="
npm install

echo "=== 3/5 添加 Android 平台（首次）==="
if [ ! -d "android" ]; then
  npx cap add android
else
  echo "  已存在，跳过 cap add"
fi

echo "=== 4/5 同步到 Android 项目 ==="
npx cap sync android

echo "=== 5/5 构建 APK ==="
cd android
./gradlew assembleRelease

echo ""
echo "✓ APK 构建完成！"
echo "  位置: android/app/build/outputs/apk/release/app-release.apk"
echo ""
echo "  安装：adb install android/app/build/outputs/apk/release/app-release.apk"
