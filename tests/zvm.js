#!/usr/bin/env node

// Run a ZVM instance

'use strict'

const fs = require( 'fs' )
const GlkOte = require( '../src/index.js' )
const ZVM = require( 'ifvms' )

const vm = new ZVM.ZVM()
const Glk = GlkOte.Glk

const options = {
	vm: vm,
	Dialog: new GlkOte.Dialog(),
	Glk: Glk,
	GlkOte: new GlkOte(),
}

vm.prepare( fs.readFileSync( process.argv[2] ), options )

// This will call vm.init()
Glk.init( options )
