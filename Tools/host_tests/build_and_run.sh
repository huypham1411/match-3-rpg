#!/usr/bin/env bash
# Build and run the MatchRPG core test harness.
#
# The harness compiles the SAME translation units the Unreal module compiles
# (Source/MatchRPG/Private/Core/*.cpp) with -DMATCHRPG_STANDALONE_CORE, so the
# match-3 rules, the combat math and the turn loop can be verified on a machine
# that has no Unreal Engine installed.
#
# Usage:
#   Tools/host_tests/build_and_run.sh                  # auto-detect a compiler
#   MRPG_CXX=/path/to/g++ Tools/host_tests/build_and_run.sh
#
# On Windows, run it from Git Bash / MSYS2. w64devkit or any MinGW-w64 g++ works.

set -u

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
BUILD_DIR="${PROJECT_ROOT}/.orthex/tmp/host_tests"
mkdir -p "${BUILD_DIR}"

CXX="${MRPG_CXX:-}"
if [ -z "${CXX}" ]; then
  for candidate in g++ clang++ c++ x86_64-w64-mingw32-g++; do
    if command -v "${candidate}" >/dev/null 2>&1; then
      CXX="${candidate}"
      break
    fi
  done
fi

# Chưa cài gì trên PATH: thử bộ biên dịch portable đi kèm dự án.
if [ -z "${CXX}" ]; then
  for candidate in \
      "${PROJECT_ROOT}/.orthex/tmp/tc/w64/w64devkit/bin/g++.exe" \
      "C:/w64devkit/bin/g++.exe" \
      "C:/msys64/ucrt64/bin/g++.exe" \
      "C:/mingw64/bin/g++.exe"; do
    if [ -x "${candidate}" ]; then
      CXX="${candidate}"
      break
    fi
  done
fi

if [ -z "${CXX}" ]; then
  echo "No C++ compiler found. Set MRPG_CXX=/path/to/g++ and retry." >&2
  exit 127
fi

echo "compiler : ${CXX}"
echo "project  : ${PROJECT_ROOT}"

# -O0 -g: chậm hơn một chút nhưng đặt được breakpoint và xem được mọi biến.
"${CXX}" -std=c++17 -O0 -g -Wall -DMATCHRPG_STANDALONE_CORE \
  -I"${PROJECT_ROOT}/Source/MatchRPG/Public" \
  -I"${PROJECT_ROOT}/Source/MatchRPG/Private" \
  "${SCRIPT_DIR}/main.cpp" \
  "${PROJECT_ROOT}"/Source/MatchRPG/Private/Core/*.cpp \
  -o "${BUILD_DIR}/matchrpg_tests.exe"

if [ -n "${MRPG_BUILD_ONLY:-}" ]; then
  echo "đã build xong: ${BUILD_DIR}/matchrpg_tests.exe"
  exit 0
fi

echo "running tests..."
"${BUILD_DIR}/matchrpg_tests.exe"
