#!/usr/bin/env node

// Run a ZVM instance

'use strict'

const fs = require( 'fs' )
const readline = require( 'readline' )

const GlkOte = require( '../src/index.js' )
const MuteStream = require( 'mute-stream' )
const ZVM = require( 'ifvms' )

// Readline options
const stdin = process.stdin
const stdout = new MuteStream()
stdout.pipe( process.stdout )
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
const Glk = GlkOte.Glk

const options = {
	vm: vm,
	Dialog: new GlkOte.Dialog( rl_opts ),
	Glk: Glk,
	GlkOte: new GlkOte( rl_opts ),
}

vm.prepare( fs.readFileSync( process.argv[2] ), options )

// This will call vm.init()
Glk.init( options )
