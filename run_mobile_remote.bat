@echo off
title RE:FRAY Mobile Remote Command Center
cd /d "%~dp0"
echo ======================================================================
echo   DANG KHOI DONG TRANG DIEU KHIEN DI DONG (PORT 5050)...
echo ======================================================================
py -3 Tools\pipeline\mobile_remote.py
pause
