/*

glkote-dumb: Dumb terminal implementation of GlkOte
===================================================

Copyright (c) 2016 Dannii Willis
MIT licenced
https://github.com/curiousdannii/glkote-term

*/

'use strict'

const readline = require( 'readline' )

const GlkOte = require( './glkote-term.js' )

const stdout = process.stdout

class DumbGlkOte extends GlkOte
{
	init( iface )
	{
		if ( !iface )
		{
			this.error( 'No game interface object has been provided.' )
		}
		if ( !iface.accept )
		{
			this.error( 'The game interface object must have an accept() function.' )
		}

		// Wrap glk_window_open so that only one window can be opened
		const old_glk_window_open = iface.Glk.glk_window_open
		iface.Glk.glk_window_open = function( splitwin, method, size, wintype, rock )
		{
			if ( splitwin )
			{
				return null
			}
			return old_glk_window_open( splitwin, method, size, wintype, rock )
		}
		
		this.window = null
		this.current_input_type = null
		
		this.input = readline.createInterface({
			input: process.stdin,
			output: stdout,
			prompt: '',
		})
		this.input.pause()
		this.input.on( 'line', input =>
		{
			this.send_response( 'line', this.window, input )
		})

		// Note that this will result in VM.init() being called
		super.init( iface )
	}

	cancel_inputs( data )
	{
		if ( data.length === 0 )
		{
			this.current_input_type = null
			this.input.pause()
		}
	}

	disable( disable )
	{
		this.disabled = disable
		if ( disable )
		{
			this.input.pause()
		}
		else if ( this.current_input_type === 'line' )
		{
			this.input.resume()
		}
	}

	exit()
	{
		this.input.close()
		super.exit()
	}

	update_content( data )
	{
		data[0][ this.window.type === 'buffer' ? 'text' : 'lines' ].forEach( line =>
		{
			if ( !line.append )
			{
				stdout.write( '\n' )
			}
			const content = line.content
			if ( content )
			{
				for ( let i = 0; i < content.length; i++ )
				{
					if ( typeof content[i] === 'string' )
					{
						i++
						stdout.write( content[i] )
					}
					else
					{
						stdout.write( content[i].text )
					}
				}
			}
		})
	}

	update_inputs( data )
	{
		if ( data[0].type === 'line' )
		{
			if ( this.current_input_type == null )
			{
				this.current_input_type = 'line'
				this.input.resume()
			}
		}
	}

	update_windows( data )
	{
		this.window = data[0]
	}
}

module.exports = DumbGlkOte
