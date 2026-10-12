// =============================================================================
//  Match3Core.cpp  -  Đăng ký module Match3Core trong Unreal Engine
//  ---------------------------------------------------------------------------
//  Chỉ được biên dịch khi chạy trong Unreal Engine (có cờ M3_WITH_UE=1).
//  Khi biên dịch độc lập bằng cl.exe hoặc Emscripten, khối này được bỏ qua hoàn toàn.
// =============================================================================
#if defined(M3_WITH_UE) && M3_WITH_UE
#include "Modules/ModuleManager.h"

IMPLEMENT_MODULE(FDefaultModuleImpl, Match3Core);
#endif
