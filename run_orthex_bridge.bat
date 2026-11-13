@echo off
title Orthex Smart Bridge - Antigravity Arena
cd /d "%~dp0"
echo Dang khoi dong Cau Noi Orthex...
py -3 Tools\pipeline\orthex_bridge.py --watch
pause
