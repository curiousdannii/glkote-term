#!/usr/bin/env node

// Run a ZVM instance

'use strict'

const fs = require('fs')
const readline = require('readline')

const GlkOteLib = require('../src/index.js')
const minimist = require('minimist')
const MuteStream = require('mute-stream')
const ZVM = require('ifvms')

const argv = minimist(process.argv.slice(2))
const storyfile = argv._[0]
const GlkOte = argv.rem ? GlkOteLib.RemGlkOte : GlkOteLib.DumbGlkOte

// Readline options
const stdin = process.stdin
const stdout = new MuteStream()
stdout.pipe(process.stdout)
const rl = readline.createInterface({
    input: stdin,
    output: stdout,
    prompt: '',
})
const rl_opts = {
    rl: rl,
    stdin: stdin,
    stdout: stdout,
}

const vm = new ZVM.ZVM()
const Glk = GlkOteLib.Glk

const options = {
    vm: vm,
    Dialog: new GlkOteLib.DumbGlkOte.Dialog(rl_opts),
    Glk: Glk,
    GlkOte: new GlkOte(rl_opts),
}

vm.prepare(fs.readFileSync(storyfile), options)

// This will call vm.init()
Glk.init(options)