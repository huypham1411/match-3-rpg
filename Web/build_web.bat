@echo off
rem ============================================================================
rem  build_web.bat - Bien dich LOI LUAT CHOI (Source/Match3Core) sang WebAssembly
rem  ----------------------------------------------------------------------------
rem  Yeu cau: Emscripten SDK. Lan dau cai dat:
rem      git clone https://github.com/emscripten-core/emsdk.git C:\Users\%USERNAME%\emsdk
rem      cd C:\Users\%USERNAME%\emsdk
rem      emsdk.bat install latest
rem      emsdk.bat activate latest
rem  Sau do chay file nay, roi mo Web\index.html qua mot static server.
rem ============================================================================
setlocal

set "EMSDK_DIR=%USERPROFILE%\emsdk"
if not exist "%EMSDK_DIR%\upstream\emscripten\em++.py" (
	echo [LOI] Khong tim thay Emscripten SDK tai %EMSDK_DIR%.
	echo       Xem huong dan cai dat o dau file nay.
	exit /b 1
)

set "ROOT=%~dp0.."
if not exist "%ROOT%\Web\dist" mkdir "%ROOT%\Web\dist"

echo === Bien dich loi luat choi sang WebAssembly ===
rem Dung em++ (khong phai emcc) de linker keo theo runtime C++ (new/delete, std::string...)
py -3 "%EMSDK_DIR%\upstream\emscripten\em++.py" -O2 -std=c++20 ^
	-I"%ROOT%\Source\Match3Core\Public" ^
	"%ROOT%\Source\Match3Core\Private\M3Board.cpp" ^
	"%ROOT%\Source\Match3Core\Private\M3Matcher.cpp" ^
	"%ROOT%\Source\Match3Core\Private\M3Resolver.cpp" ^
	"%ROOT%\Source\Match3Core\Private\M3Team.cpp" ^
	"%ROOT%\Source\Match3Core\Private\M3Skills.cpp" ^
	"%ROOT%\Source\Match3Core\Private\M3Battle.cpp" ^
	"%ROOT%\Source\Match3Core\Private\M3Content.cpp" ^
	"%ROOT%\Web\m3_web_api.cpp" ^
	-o "%ROOT%\Web\dist\m3core.mjs" ^
	-sMODULARIZE=1 -sEXPORT_ES6=1 -sENVIRONMENT=web,node ^
	-sALLOW_MEMORY_GROWTH=1 -sSTACK_SIZE=2MB ^
	-sEXPORTED_RUNTIME_METHODS=UTF8ToString,allocateUTF8,stringToUTF8,lengthBytesUTF8 ^
	-sEXPORTED_FUNCTIONS=_malloc,_free ^
	-sSINGLE_FILE=1
if errorlevel 1 (
	echo [LOI] Bien dich WebAssembly that bai.
	exit /b 1
)

rem SINGLE_FILE=1: nhung luon wasm vao m3core.mjs (base64) -> chi con MOT file.
rem Ly do: file .wasm rieng truoc day bi gan cache immutable 1 nam tren Vercel, nen
rem may da truy cap cu dung lai logic cu mai. Xoa file .wasm cu (neu con) de khong
rem con duong dan nao phuc vu ban cu nua.
if exist "%ROOT%\Web\dist\m3core.wasm" del /q "%ROOT%\Web\dist\m3core.wasm"

echo.
echo === Xong. File trong Web\dist ===
dir /b "%ROOT%\Web\dist"
echo.
echo Mo file Web\index.html qua static server, vi du:
echo    py -3 -m http.server 8765 --directory "%ROOT%\Web"
exit /b 0
