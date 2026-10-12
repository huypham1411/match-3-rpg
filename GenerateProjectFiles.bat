@echo off
setlocal

set "UE_ROOT="

if defined UE5_DIR if exist "%UE5_DIR%\Engine\Binaries\DotNET\UnrealBuildTool\UnrealBuildTool.exe" set "UE_ROOT=%UE5_DIR%"
if not defined UE_ROOT if exist "C:\Program Files\Epic Games\UE_5.6\Engine\Binaries\DotNET\UnrealBuildTool\UnrealBuildTool.exe" set "UE_ROOT=C:\Program Files\Epic Games\UE_5.6"
if not defined UE_ROOT if exist "D:\Program Files\Epic Games\UE_5.6\Engine\Binaries\DotNET\UnrealBuildTool\UnrealBuildTool.exe" set "UE_ROOT=D:\Program Files\Epic Games\UE_5.6"

if not defined UE_ROOT (
    echo [ERROR] Khong tim thay Unreal Engine 5.6 tai duong dan mac dinh:
    echo   C:\Program Files\Epic Games\UE_5.6
    echo Neu ban cai o thu muc khac, hay set bien moi truong UE5_DIR truoc khi chay:
    echo   set UE5_DIR=E:\Epic Games\UE_5.6
    exit /b 1
)

echo [INFO] Dang tao Visual Studio solution cho Match3RPG...
echo [INFO] Su dung engine tai: %UE_ROOT%
"%UE_ROOT%\Engine\Binaries\DotNET\UnrealBuildTool\UnrealBuildTool.exe" -projectfiles -project="%~dp0Match3RPG.uproject" -game -engine

if %ERRORLEVEL% equ 0 (
    echo [SUCCESS] Da tao Match3RPG.sln thanh cong!
    echo Ban co the mo Match3RPG.sln bang Visual Studio 2022 de debug hoac doc code C++.
) else (
    echo [ERROR] Tao project files that bai!
)
