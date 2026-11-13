@echo off
setlocal enabledelayedexpansion
title Cai dat Antigravity Global Tools ^& Pstack Skills

echo ======================================================================
echo   CAI DAT TOAN CAU: ORTHEX BRIDGE ^& PSTACK MULTI-AGENT SKILLS
echo ======================================================================
echo.

set "REPO_ROOT=%~dp0..\.."
pushd "%REPO_ROOT%"

set "LOCAL_BIN=%USERPROFILE%\.local\bin"
if not exist "%LOCAL_BIN%" mkdir "%LOCAL_BIN%"

echo [*] 1. Cai dat orthex-bridge vao %LOCAL_BIN% ...
copy /Y "Tools\pipeline\orthex_bridge.py" "%LOCAL_BIN%\orthex_bridge.py" >nul

(
    echo @echo off
    echo py -3 "%%~dp0orthex_bridge.py" %%*
) > "%LOCAL_BIN%\orthex-bridge.bat"

(
    echo #!/bin/sh
    echo py -3 "$(dirname "$0")/orthex_bridge.py" "$@"
) > "%LOCAL_BIN%\orthex-bridge"

echo     - Da copy orthex_bridge.py, orthex-bridge.bat, orthex-bridge

echo.
echo [*] 2. Kiem tra PATH he thong...
powershell -NoProfile -Command "if ($env:PATH -notlike '*\.local\bin*') { [Environment]::SetEnvironmentVariable('PATH', [Environment]::GetEnvironmentVariable('PATH', 'User') + ';%USERPROFILE%\.local\bin', 'User'); Write-Host '    - Da tu dong them .local\bin vao User PATH.' } else { Write-Host '    - PATH da ton tai .local\bin (San sang).' }"

echo.
echo [*] 3. Cai dat Global Skills vao %USERPROFILE%\.gemini\config\skills ...
set "GLOBAL_SKILLS=%USERPROFILE%\.gemini\config\skills"
if not exist "%GLOBAL_SKILLS%\pstack" mkdir "%GLOBAL_SKILLS%\pstack"
if not exist "%GLOBAL_SKILLS%\pstack-michelin-rigor" mkdir "%GLOBAL_SKILLS%\pstack-michelin-rigor"
if not exist "%GLOBAL_SKILLS%\multi-agent-arena" mkdir "%GLOBAL_SKILLS%\multi-agent-arena"

copy /Y ".agents\skills\pstack\SKILL.md" "%GLOBAL_SKILLS%\pstack\SKILL.md" >nul
copy /Y ".agents\skills\pstack-michelin-rigor\SKILL.md" "%GLOBAL_SKILLS%\pstack-michelin-rigor\SKILL.md" >nul
copy /Y ".agents\skills\multi-agent-arena\SKILL.md" "%GLOBAL_SKILLS%\multi-agent-arena\SKILL.md" >nul

echo     - Da copy pstack (Phan chia kien truc)
echo     - Da copy pstack-michelin-rigor (Tieu chuan nghiem thu)
echo     - Da copy multi-agent-arena (Dau truong phan bien cheo)

popd
echo.
echo ======================================================================
echo   [THANH CONG] Toan bo he thong da duoc cai dat Global!
echo   Bay gio o bat ky thu muc nao, ban deu co the chay:
echo      orthex-bridge --watch
echo ======================================================================
echo.
