/*

glkote-term: Terminal implementation of GlkOte
==============================================

Copyright (c) 2020 Dannii Willis
MIT licenced
https://github.com/curiousdannii/glkote-term

*/

const DumbGlkOte = require('./glkote-dumb.js')
const RemGlkOte = require('./glkote-remglk.js')

module.exports = DumbGlkOte
module.exports.DumbGlkOte = DumbGlkOte
module.exports.RemGlkOte = RemGlkOte
module.exports.Glk = require('./glkapi.js')
module.exports.GlkOte = DumbGlkOte