@echo off
chcp 65001 >nul
cd /d "%~dp0"
title Personal Site Local Preview

set "RUNTIME=%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies"
set "NODE_EXE=%RUNTIME%\node\bin\node.exe"
set "VITE_JS=%~dp0node_modules\vite\bin\vite.js"
set "SITE_URL=http://127.0.0.1:5173/"

if not exist "%VITE_JS%" (
  echo [ERROR] Website dependencies are missing.
  echo Please ask Codex to reinstall dependencies.
  pause
  exit /b 1
)

if exist "%NODE_EXE%" (
  set "NODE_CMD=%NODE_EXE%"
) else (
  where node >nul 2>nul
  if errorlevel 1 (
    echo [ERROR] Node.js was not found.
    echo Please install Node.js or ask Codex for help.
    pause
    exit /b 1
  )
  set "NODE_CMD=node"
)

echo 正在启动个人网站...
echo.
echo 网站地址: %SITE_URL%
echo 浏览器通常会自动打开；如果没有打开，请复制上面的地址到浏览器。
echo 请保持这个窗口打开，关闭窗口就会停止网站。
echo.

rem 等待服务器启动后自动打开浏览器；测试时可设置 NO_BROWSER=1 跳过。
if /I not "%NO_BROWSER%"=="1" (
  start "" powershell -NoProfile -WindowStyle Hidden -Command "Start-Sleep -Seconds 2; Start-Process '%SITE_URL%'"
)

"%NODE_CMD%" "%VITE_JS%" --host 127.0.0.1 --port 5173 --strictPort

echo.
echo 网站已停止。
pause