@echo off
rem ============================================================================
rem  build_and_run.bat - Bien dich va chay bo test loi game bang cl.exe
rem  (khong can Unreal Engine). Chay tu thu muc bat ky:
rem      Tests\Core\build_and_run.bat
rem ============================================================================
setlocal enabledelayedexpansion

set "VCVARS=C:\Program Files (x86)\Microsoft Visual Studio\2022\BuildTools\VC\Auxiliary\Build\vcvars64.bat"
if not exist "%VCVARS%" set "VCVARS=C:\Program Files\Microsoft Visual Studio\2022\Community\VC\Auxiliary\Build\vcvars64.bat"
if not exist "%VCVARS%" set "VCVARS=C:\Program Files\Microsoft Visual Studio\2022\Professional\VC\Auxiliary\Build\vcvars64.bat"
if not exist "%VCVARS%" set "VCVARS=C:\Program Files\Microsoft Visual Studio\2022\Enterprise\VC\Auxiliary\Build\vcvars64.bat"
if not exist "%VCVARS%" (
	echo [LOI] Khong tim thay vcvars64.bat. Hay cai Visual Studio 2022 voi C++ toolset.
	exit /b 1
)
call "%VCVARS%" >nul

set "ROOT=%~dp0..\.."
set "OUT=%ROOT%\Build\CoreTests"
if not exist "%OUT%" mkdir "%OUT%"

echo === Bien dich M3 Core + test ===
cl /nologo /std:c++20 /EHsc /utf-8 /W3 /MD ^
	/Fe:"%OUT%\M3CoreTests.exe" /Fo"%OUT%\\" ^
	"%ROOT%\Source\Match3Core\Private\*.cpp" ^
	"%ROOT%\Tests\Core\*.cpp" ^
	/I"%ROOT%\Source\Match3Core\Public" /I"%ROOT%\Tests\Core"
if errorlevel 1 (
	echo [LOI] Bien dich that bai.
	exit /b 1
)

echo.
echo === Chay test ===
"%OUT%\M3CoreTests.exe"
exit /b %errorlevel%
