@echo off
chcp 65001 >nul
title UPA PET - Monitor Automatico de Laudos e Cirurgias
cd /d "%~dp0"

:loop
echo ==================================================================
echo    UPA PET - CENTRAL INTELIGENTE DE LAUDOS E CIRURGIAS
echo ==================================================================
echo [AUTO-REINICIO ATIVO] Se houver qualquer falha ou queda, o robo reinicia em 3s.
echo Para fechar definitivamente, feche a janela ou aperte Ctrl+C.
echo ==================================================================
echo.

node monitor_exames.js

echo.
echo ==================================================================
echo [REINICIANDO] O monitor foi interrompido. Reiniciando em 3 segundos...
echo ==================================================================
timeout /t 3 /nobreak >nul
goto loop
