@echo off
title Autonomous Multi-Agent Swarm (24/7) - MatchRPG
cd /d "%~dp0"
echo ======================================================================
echo   KHOI DONG HE THONG MULTI-AGENT SWARM DAEMON 24/7
echo   Cac bot se lien tuc thao luan, phan bien va ghi nhat ky
echo ======================================================================
py -3 Tools\pipeline\swarm_daemon.py --daemon --interval 60
pause
