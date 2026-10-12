@echo off
setlocal

set "UE_ROOT="

if defined UE5_DIR if exist "%UE5_DIR%\Engine\Build\BatchFiles\Build.bat" set "UE_ROOT=%UE5_DIR%"
if not defined UE_ROOT if exist "C:\Program Files\Epic Games\UE_5.6\Engine\Build\BatchFiles\Build.bat" set "UE_ROOT=C:\Program Files\Epic Games\UE_5.6"
if not defined UE_ROOT if exist "D:\Program Files\Epic Games\UE_5.6\Engine\Build\BatchFiles\Build.bat" set "UE_ROOT=D:\Program Files\Epic Games\UE_5.6"

if not defined UE_ROOT (
    echo [ERROR] Khong tim thay Unreal Engine 5.6 tai duong dan mac dinh:
    echo   C:\Program Files\Epic Games\UE_5.6
    echo Neu ban cai o thu muc khac, hay set bien moi truong UE5_DIR truoc khi chay:
    echo   set UE5_DIR=E:\Epic Games\UE_5.6
    exit /b 1
)

echo [INFO] Dang bien dich Match3RPGEditor (Win64 Development)...
call "%UE_ROOT%\Engine\Build\BatchFiles\Build.bat" Match3RPGEditor Win64 Development -Project="%~dp0Match3RPG.uproject" -WaitMutex

if %ERRORLEVEL% equ 0 (
    echo [SUCCESS] Build editor thanh cong! Ban co the mo Match3RPG.uproject hoac chay game.
) else (
    echo [ERROR] Build editor that bai!
)
