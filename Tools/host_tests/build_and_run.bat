@echo off
rem ============================================================================
rem  Bien dich va chay bo test loi choi MatchRPG (KHONG can Unreal Engine).
rem
rem    Tools\host_tests\build_and_run.bat
rem    set MRPG_CXX=C:\duong\dan\g++.exe && Tools\host_tests\build_and_run.bat
rem    set MRPG_BUILD_ONLY=1 && Tools\host_tests\build_and_run.bat   (chi build)
rem
rem  Dung ban .sh neu ban quen Git Bash hon.
rem ============================================================================
setlocal enableextensions
set "PROJECT_ROOT=%~dp0..\.."
pushd "%PROJECT_ROOT%" || exit /b 1

set "OUT_DIR=%CD%\.orthex\tmp\host_tests"
if not exist "%OUT_DIR%" mkdir "%OUT_DIR%"

rem --- tim trinh bien dich -----------------------------------------------------
set "CXX=%MRPG_CXX%"
if not "%CXX%"=="" goto :have_compiler
where g++ >nul 2>nul && set "CXX=g++"
if not "%CXX%"=="" goto :have_compiler
where clang++ >nul 2>nul && set "CXX=clang++"
if not "%CXX%"=="" goto :have_compiler

rem Chua cai gi tren PATH: thu bo bien dich portable di kem du an.
if exist "%CD%\.orthex\tmp\tc\w64\w64devkit\bin\g++.exe" (
  set "CXX=%CD%\.orthex\tmp\tc\w64\w64devkit\bin\g++.exe"
  goto :have_compiler
)
if exist "C:\w64devkit\bin\g++.exe" (
  set "CXX=C:\w64devkit\bin\g++.exe"
  goto :have_compiler
)
if exist "C:\msys64\ucrt64\bin\g++.exe" (
  set "CXX=C:\msys64\ucrt64\bin\g++.exe"
  goto :have_compiler
)
if exist "C:\mingw64\bin\g++.exe" (
  set "CXX=C:\mingw64\bin\g++.exe"
  goto :have_compiler
)

rem Thu tim MSVC thong qua vswhere
set "VSWHERE=%ProgramFiles(x86)%\Microsoft Visual Studio\Installer\vswhere.exe"
if exist "%VSWHERE%" (
  for /f "usebackq tokens=*" %%i in (`"%VSWHERE%" -latest -products * -requires Microsoft.VisualStudio.Component.VC.Tools.x86.x64 -property installationPath`) do (
    if exist "%%i\VC\Auxiliary\Build\vcvars64.bat" (
      call "%%i\VC\Auxiliary\Build\vcvars64.bat" >nul 2>nul
      goto :compile_msvc
    )
  )
)

echo.
echo Khong tim thay trinh bien dich C++ (g++, clang++, hoac MSVC).
echo Cai MinGW-w64 / w64devkit / Visual Studio C++, hoac dat bien MRPG_CXX tro toi g++.exe.
echo.
popd
exit /b 127

:compile_msvc
echo Trinh bien dich: MSVC cl.exe
cl /nologo /std:c++17 /O2 /EHsc /W3 /DMATCHRPG_STANDALONE_CORE ^
  /I"Source\MatchRPG\Public" /I"Source\MatchRPG\Private" ^
  "Tools\host_tests\main.cpp" ^
  "Source\MatchRPG\Private\Core\MatchTypes.cpp" ^
  "Source\MatchRPG\Private\Core\MatchBoardCore.cpp" ^
  "Source\MatchRPG\Private\Core\MatchFinderCore.cpp" ^
  "Source\MatchRPG\Private\Core\CombatMathCore.cpp" ^
  "Source\MatchRPG\Private\Core\ContentCore.cpp" ^
  "Source\MatchRPG\Private\Core\BattleSimCore.cpp" ^
  /Fe:"%OUT_DIR%\matchrpg_tests.exe" /Fo:"%OUT_DIR%\\"
if errorlevel 1 (
  echo.
  echo Bien dich THAT BAI - xem loi o tren.
  popd
  exit /b 1
)
goto :run_tests

:have_compiler
echo Trinh bien dich: %CXX%

rem -O0 -g: chay cham hon mot chut nhung dat duoc breakpoint va xem duoc moi bien.
rem Danh sach file liet ke tuong minh vi cmd.exe khong tu mo rong dau *.
"%CXX%" -std=c++17 -O0 -g -Wall -DMATCHRPG_STANDALONE_CORE ^
  -I"Source\MatchRPG\Public" -I"Source\MatchRPG\Private" ^
  "Tools\host_tests\main.cpp" ^
  "Source\MatchRPG\Private\Core\MatchTypes.cpp" ^
  "Source\MatchRPG\Private\Core\MatchBoardCore.cpp" ^
  "Source\MatchRPG\Private\Core\MatchFinderCore.cpp" ^
  "Source\MatchRPG\Private\Core\CombatMathCore.cpp" ^
  "Source\MatchRPG\Private\Core\ContentCore.cpp" ^
  "Source\MatchRPG\Private\Core\BattleSimCore.cpp" ^
  -o "%OUT_DIR%\matchrpg_tests.exe"
if errorlevel 1 (
  echo.
  echo Bien dich THAT BAI - xem loi o tren.
  popd
  exit /b 1
)

:run_tests
if not "%MRPG_BUILD_ONLY%"=="" (
  echo Da build xong: %OUT_DIR%\matchrpg_tests.exe
  popd
  exit /b 0
)

echo Dang chay test...
"%OUT_DIR%\matchrpg_tests.exe"
set "RESULT=%ERRORLEVEL%"
echo.
if "%RESULT%"=="0" (echo TAT CA TEST DEU DAT) else (echo CO TEST THAT BAI)
popd
exit /b %RESULT%
