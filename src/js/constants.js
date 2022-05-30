export default {
    ARCH_X86: 0,
    ARCH_X64: 1,
    ARCH_ARM: 2,
    ARCH_ARM64: 3,
    ARCH_MIPS32: 4,
    ARCH_MIPS64: 5,

    DEFAULT_CODE: {
        ARCH_X86: {
            asm: 'square:\n  mov\teax, DWORD PTR [esp+4]\n  imul\teax, eax\n  ret\n',
            machine_code: [[], [0x8B, 0x44, 0x24, 0x04], [0x0F, 0xAF, 0xC0], [0xC3]]
        },
        ARCH_X64: {
            asm: 'square:\n  mov\teax, edi\n  imul\teax, eax\n  ret\n',
            machine_code: [[], [0x89, 0xF8], [0x0F, 0xAF, 0xC0], [0xC3]]
        },
        ARCH_ARM: {
            asm: 'square:\n  mul\tr0, r0, r0\n  bx\tlr\n',
            machine_code: [[], [0x90, 0x00, 0x00, 0xE0], [0x1E, 0xFF, 0x2F, 0xE1]]
        },
        ARCH_ARM64: {
            asm: 'square:\n  mul\tw0, w0, w0\n  ret\n',
            machine_code: [[], [0x00, 0x7C, 0x00, 0x1B], [0xC0, 0x03, 0x5F, 0xD6]]
        },
        ARCH_MIPS32: {
            asm: 'square:\n  mult\t$a0, $a0\n  mflo\t$v0\n  jr\t$ra\n  nop\n',
            machine_code: [[], [0x18, 0x00, 0x84, 0x00], [0x12, 0x10, 0x00, 0x00], [0x08, 0x00, 0xE0, 0x03], [0x00, 0x00, 0x00, 0x00]]
        },
        ARCH_MIPS64: {
            asm: 'square:\n  mult\t$a0, $a0\n  mflo\t$v0\n  jr\t$ra\n  nop\n',
            machine_code: [[], [0x18, 0x00, 0x84, 0x00], [0x12, 0x10, 0x00, 0x00], [0x08, 0x00, 0xE0, 0x03], [0x00, 0x00, 0x00, 0x00]]
        }
    }
}
