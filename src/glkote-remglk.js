/*

glkote-remglk: RemGlk mode for GlkOte
=====================================

Copyright (c) 2020 Dannii Willis
MIT licenced
https://github.com/curiousdannii/glkote-term

*/

'use strict'

const default_metrics = {
    buffercharheight: 1,
    buffercharwidth: 1,
    buffermarginx: 0,
    buffermarginy: 0,
    graphicsmarginx: 0,
    graphicsmarginy: 0,
    gridcharheight: 1,
    gridcharwidth: 1,
    gridmarginx: 0,
    gridmarginy: 0,
    height: 25,
    inspacingx: 0,
    inspacingy: 0,
    outspacingx: 0,
    outspacingy: 0,
    width: 80,
}

class RemGlkOte
{
    constructor(options)
    {
        this.current_metrics = null
        this.disabled = false
        this.generation = 0
        this.interface = null
        this.version = require('../package.json').version

        this.showlog = options.showlog
        this.stdin = options.stdin
        this.stdout = options.stdout
    }

    getinterface()
    {
        return this.interface
    }

    init(iface)
    {
        if (!iface)
        {
            this.error('No game interface object has been provided.')
        }
        if (!iface.accept)
        {
            this.error('The game interface object must have an accept() function.')
        }
        this.interface = iface

        let buffer = ''

        if (this.stdin.isTTY)
        {
            this.stdin.setRawMode(true)
        }

        this.stdin.on('data', chunk =>
        {
            buffer += chunk.toString().trim()
            if (buffer.endsWith('}'))
            {
                try
                {
                    const obj = JSON.parse(buffer)
                    buffer = ''
                    if (obj.type === 'init')
                    {
                        // Fill out the metrics
                        obj.metrics = Object.assign({}, default_metrics, obj.metrics)
                    }
                    if (obj.type === 'specialresponse' && typeof obj.value === 'string')
                    {
                        obj.value = {filename: obj.value}
                    }
                    this.interface.accept(obj)
                }
                catch (e)
                {
                    // Not a full JSON response yet
                }
            }
        })
    }

    update(data)
    {
        this.stdout.write(`${JSON.stringify(data)}\n\n`)
    }

    error(msg)
    {
        console.error(msg)
    }
}

module.exports = RemGlkOte