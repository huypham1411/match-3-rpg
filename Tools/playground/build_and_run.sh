#!/usr/bin/env bash
# Biên dịch và chạy "sân chơi học tập".
#
#   Tools/playground/build_and_run.sh          # chế độ gõ lệnh
#   Tools/playground/build_and_run.sh --demo   # chạy kịch bản mẫu rồi thoát
#   MRPG_CXX=/đường/dẫn/g++ Tools/playground/build_and_run.sh
#
# Đây là chương trình chạy trên máy tính thường, KHÔNG cần Unreal Engine.
# Nó dùng đúng những file luật chơi mà game Unreal dùng.

set -u

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
BUILD_DIR="${PROJECT_ROOT}/.orthex/tmp/playground"
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
  echo "Không tìm thấy trình biên dịch C++. Đặt MRPG_CXX=/đường/dẫn/g++ rồi chạy lại." >&2
  exit 127
fi

echo "trình biên dịch: ${CXX}"

# -g để có đủ thông tin gỡ lỗi: bạn đặt được breakpoint và xem từng biến.
"${CXX}" -std=c++17 -O0 -g -DMATCHRPG_STANDALONE_CORE \
  -I"${PROJECT_ROOT}/Source/MatchRPG/Public" \
  -I"${PROJECT_ROOT}/Source/MatchRPG/Private" \
  "${SCRIPT_DIR}/main.cpp" \
  "${PROJECT_ROOT}"/Source/MatchRPG/Private/Core/*.cpp \
  -o "${BUILD_DIR}/playground.exe"

if [ -n "${MRPG_BUILD_ONLY:-}" ]; then
  echo "đã build xong: ${BUILD_DIR}/playground.exe"
  exit 0
fi

echo "chạy chương trình..."
"${BUILD_DIR}/playground.exe" "$@"
