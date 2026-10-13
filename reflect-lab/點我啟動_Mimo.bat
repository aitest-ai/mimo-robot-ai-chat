@echo off
setlocal
chcp 65001 >nul
cd /d "%~dp0"
title Mimo 本機試玩 - Gemini 2.5 Flash
echo.
echo ==========================================
echo    Mimo 心晴之鏡 - 本機試玩
echo ==========================================
echo.
where node >nul 2>&1
if errorlevel 1 (
 echo [需要安裝 Node.js 20 或更新版本]
 echo 只要安裝一次，以後就能直接雙擊啟動。
 echo 正在開啟 Node.js 下載網站...
 start "" "https://nodejs.org/en/download"
 pause
 exit /b 1
)
if not exist "gemini-key.txt" (
 type nul > "gemini-key.txt"
 echo.
 echo 第一次使用：請在記事本內貼上自己的 Gemini API Key，然後存檔關閉。
 echo 如果只是先看介面，也可以保持空白，使用固定引導。
 echo 不要把這個檔案上傳 GitHub 或傳給別人。
 start "" /wait notepad.exe "gemini-key.txt"
)
echo.
echo 正在啟動 Mimo，網址：http://127.0.0.1:8787
echo 請保持此視窗開啟。按 Ctrl+C 可以停止 Mimo。
echo.
start "" powershell -NoProfile -WindowStyle Hidden -Command "Start-Sleep -Seconds 3; Start-Process 'http://127.0.0.1:8787/'"
node "local-server.mjs"
echo.
echo Mimo 本機服務已停止。
pause
