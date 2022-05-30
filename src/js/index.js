import '../css/beanstalk.css'
import '../css/index.css'

import easydropdown from 'easydropdown'
import ace from 'ace-builds'
import 'ace-builds/webpack-resolver'

import constants from './constants'

import wasm from '../wasm/main.js'

let _debounce_asm = false
const debounce_asm = (n=50) => { _debounce_asm = true; setTimeout(() => _debounce_asm = false, n) }
let _debounce_machine = false
const debounce_machine = (n=50) => { _debounce_machine = true; setTimeout(() => _debounce_machine = false, n) }

setTimeout(console.clear.bind(console), 100)

const asm_editor = ace.edit("asm_editor")
const machine_editor = ace.edit("machine_editor")

const ARCH = document.getElementById('ARCH')
const VIEW = document.getElementById('VIEW')
const MSG_BOX = document.getElementById('msg-box')

const set_view = v => localStorage.VIEW = v
const set_arch = a => {
    const cur_arch = localStorage.ARCH
    localStorage[`asm_code_${cur_arch}`] = asm_editor.getValue()
    localStorage[`machine_code_${cur_arch}`] = JSON.stringify(machine_editor.getValue().split('\n').map(a => a.replace(/(0x)|,/g, '').split(/\s+/).filter(a => a !== '').map(b => parseInt(b, 16))))

    ;[localStorage.asm_code, localStorage.machine_code] = get_default_code(a)
    localStorage.ARCH = a
    asm_editor.setValue(localStorage.asm_code, -1)
    refresh_machine_code()
}

function sync_settings_local() {
    ARCH.value = localStorage.ARCH
    VIEW.value = localStorage.VIEW
}

function trimCharRight(s, c) {
    let start = 0, end = s.length
    while (end > start && s[end - 1] === c) --end
    return end < s.length ? s.substring(0, end) : s
}

function refresh_machine_code() {
    const b = JSON.parse(localStorage.machine_code || '[]')
    if (VIEW.value == '1') {
        const s = b.map(a => a.map(b => `0x${b.toString(16).padStart(2, '0')}`).join(', ')).map(b => b ? b + ',' : b).join('\n').trimRight()
        debounce_machine()
        machine_editor.setValue(trimCharRight(s, ',') + '\n', -1)
        machine_editor.selection.moveTo(asm_editor.selection.getCursor().row, 0)
    } else {
        const s = b.map(a => a.map(b => b.toString(16).padStart(2, '0')).join(' ')).join('\n').trimRight()
        debounce_machine()
        machine_editor.setValue(s + '\n', -1)
        machine_editor.selection.moveTo(asm_editor.selection.getCursor().row, 0)
    }
}

let timeout = null

function asm_editor_changed() {
    if (_debounce_asm) return
    let asm_code = asm_editor.getValue()
    localStorage.asm_code = asm_code
    localStorage.last_focus = 0

    if (timeout) clearTimeout(timeout)
    timeout = setTimeout(() => {
        console.time('assemble')
        const res = Module.assemble(asm_code, constants[localStorage.ARCH])
        console.timeEnd('assemble')
        Module.check_leaks?.()
        MSG_BOX.innerText = res.status
        if (res.ok) {
            MSG_BOX.classList.remove('err')
            localStorage.machine_code = JSON.stringify(res.bytes)
            refresh_machine_code()
        } else {
            MSG_BOX.classList.add('err')
        }
    }, 0)
}

function machine_editor_changed() {
    if (_debounce_machine) return
    const b = machine_editor.getValue().split('\n').map(a => a.replace(/(0x)|,/g, '').split(/\s+/).filter(a => a !== '').map(b => parseInt(b, 16)))
    if (b.flat().length === 0) return
    localStorage.machine_code = JSON.stringify(b)
    localStorage.last_focus = 1

    if (timeout) clearTimeout(timeout)
    timeout = setTimeout(() => {
        console.time('disassemble')
        const res = Module.disassemble(b.flat(), constants[localStorage.ARCH])
        console.timeEnd('disassemble')
        Module.check_leaks?.()
        if (!res.status) res.status = 'Code disassembled successfully.'
        MSG_BOX.innerText = res.status
        if (res.ok) {
            MSG_BOX.classList.remove('err')
            let asm = res.asm.map(x => '  ' + x).join('\n')
            localStorage.asm_code = asm
            debounce_asm()
            asm_editor.setValue(asm, -1)
            // localStorage.machine_code = JSON.stringify(res.bytes)
            // refresh_machine_code()
        } else {
            MSG_BOX.classList.add('err')
        }
    }, 0)
}

const init = async () => {
    init_settings()

    ARCH.addEventListener('change', () => set_arch(ARCH.value))
    VIEW.addEventListener('change', () => {
        set_view(VIEW.value)
        refresh_machine_code()
    })

    asm_editor.session.selection.on('changeCursor', () => {
        if (_debounce_asm) return
        debounce_machine()
        machine_editor.selection.moveTo(asm_editor.selection.getCursor().row, 0)
    })

    machine_editor.session.selection.on('changeCursor', () => {
        if (_debounce_machine) return
        debounce_asm()
        asm_editor.selection.moveTo(machine_editor.selection.getCursor().row, 0)
    })

    asm_editor.session.on('change', asm_editor_changed)
    machine_editor.session.on('change', machine_editor_changed)

    easydropdown.all({
        behavior: {
            liveUpdates: true
        }
    })

    document.getElementById('main-content').style.display = 'block'

    const Module = await wasm({
        locateFile: url => 'public/' + url
    })
    window.Module = Module

    MSG_BOX.innerText = "Initialized";
    MSG_BOX.classList.remove('err')

    if (localStorage.loaded_from_url) {
        delete localStorage.loaded_from_url
        asm_editor_changed()
        asm_editor.focus()
    }
}

if (document.readyState === 'complete') {
    await init()
} else {
    document.body.onload = init
}

function get_default_code(arch) {
    return [
        localStorage[`asm_code_${arch}`] || constants.DEFAULT_CODE[arch].asm,
        localStorage[`machine_code_${arch}`] || JSON.stringify(constants.DEFAULT_CODE[arch].machine_code)
    ]
}

function init_settings() {
    if (localStorage.ARCH === undefined) {
        localStorage.ARCH = 'ARCH_X64'
        localStorage.VIEW = 2
        ;[localStorage.asm_code, localStorage.machine_code] = get_default_code('ARCH_X64')
        localStorage.last_focus = 0
    }

    const linked_code = new URLSearchParams(document.location.search).get('code')
    if (linked_code) {
        localStorage.asm_code = atob(linked_code)
        localStorage.loaded_from_url = true

        const linked_arch = new URLSearchParams(document.location.search).get('arch')
        if (linked_arch && constants[linked_arch]) {
            localStorage.ARCH = linked_arch
        }
    }

    for (const editor of [asm_editor, machine_editor]) {
        editor.setTheme("ace/theme/one_dark")
        editor.setShowPrintMargin(false)
        editor.setOptions({
            fontSize: "16px",
            fontFamily: '"JetBrains Mono", monospace',
            tabSize: 8,
            useSoftTabs: true,
        })
        editor.container.style.lineHeight = 1.56
        editor.renderer.updateFontSize()
        editor.setKeyboardHandler('ace/keyboard/vscode')
        // editor.on('')
    }

    asm_editor.session.setMode('ace/mode/assembly_x86')
    asm_editor.setValue(localStorage.asm_code, -1)

    machine_editor.session.setMode("ace/mode/text")
    machine_editor.autoIndent = false
    machine_editor.renderer.setShowGutter(false)

    sync_settings_local()
    refresh_machine_code()
}
