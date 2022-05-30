#include <stddef.h>
#include <string>
#include <fstream>
#include <sstream>
#include <capstone/capstone.h>
#include <keystone/keystone.h>
#include <emscripten/emscripten.h>
#include <emscripten/bind.h>

#if __has_feature(leak_sanitizer)
#include <sanitizer/lsan_interface.h>
#endif

using namespace emscripten;

static const struct { ks_arch val; ks_mode mode; } TARGETS[] = {
    { .val  = KS_ARCH_X86,   .mode = KS_MODE_32 },
    { .val  = KS_ARCH_X86,   .mode = KS_MODE_64 },
    { .val  = KS_ARCH_ARM,   .mode = KS_MODE_ARM },
    { .val  = KS_ARCH_ARM64, .mode = (ks_mode)0 },
    { .val  = KS_ARCH_MIPS,  .mode = KS_MODE_MIPS32 },
    { .val  = KS_ARCH_MIPS,  .mode = KS_MODE_MIPS64 }
};

val assemble(std::string code, int target) {
    ks_engine *ks;
    size_t count;
    ks_instruction* insts;

    val res = val::object();

    if (ks_open(TARGETS[target].val, TARGETS[target].mode, &ks) != KS_ERR_OK) {
        res.set("ok", val(false));
        res.set("status", val("failed to initialize assembler"));
        return res;
    }

    if (ks_asm_new(ks, code.c_str(), 0, &count, (ks_instruction (**)[0])&insts) != KS_ERR_OK) {
        res.set("ok", val(false));
        res.set("status", val(ks_strerror(ks_errno(ks))));
    } else {
        res.set("ok", val(true));
        val arr = val::array();
        for (size_t i = 0; i < count; i++) {
            ks_instruction inst = insts[i];
            val arr2 = val::array();
            for (int j = 0; j < inst.size; j++) {
                arr2.call<void>("push", val(inst.instruction[j]));
            } 
            ks_free(inst.instruction);
            arr.call<void>("push", arr2);
        }
        res.set("bytes", arr);

        res.set("status", val("Code assembled successfully."));
        ks_free((unsigned char*)insts);
    }

    ks_close(ks);

    return res;
}

val disassemble(const val js_bytes, int target) {
    const std::vector<uint8_t> bytes = convertJSArrayToNumberVector<uint8_t>(js_bytes);

    val res = val::object();

	csh cs;
	cs_insn *insts;
	size_t count;

	if (cs_open((cs_arch)(TARGETS[target].val-1), (cs_mode)TARGETS[target].mode, &cs) != CS_ERR_OK) {
        res.set("ok", val(false));
        res.set("status", val("failed to initialize disassembler"));
        return res;
    }    

	count = cs_disasm(cs, bytes.data(), bytes.size(), 0, 0, &insts);
	if (count < 0) {
        res.set("ok", val(false));
        res.set("status", val(cs_strerror(cs_errno(cs))));
    } else {
        res.set("ok", val(true));
        val arr = val::array();
        for (size_t i = 0; i < count; i++) {
            std::string s = std::string(insts[i].mnemonic);
            if (insts[i].op_str[0]) {
                s += "\t" + std::string(insts[i].op_str);
            }
            arr.call<void>("push", val(s));
        }
        res.set("asm", arr);

		cs_free(insts, count);
    }
	cs_close(&cs);

    return res;
}

EMSCRIPTEN_BINDINGS(my_module) {
    function("assemble", &assemble);
    function("disassemble", &disassemble);
#if __has_feature(leak_sanitizer)
    function("check_leaks", &__lsan_do_recoverable_leak_check);
#endif
}
