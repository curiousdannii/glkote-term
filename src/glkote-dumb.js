/*

glkote-dumb: Dumb terminal implementation of GlkOte
===================================================

Copyright (c) 2016 Dannii Willis
MIT licenced
https://github.com/curiousdannii/glkote-term

*/

'use strict'

const ansiEscapes = require( 'ansi-escapes' )
const MuteStream = require( 'mute-stream' )
const readline = require( 'readline' )

const GlkOte = require( './glkote-term.js' )

const key_replacements = {
	'\x7F': 'delete',
	'\t': 'tab',
}

const stdin = process.stdin
const stdout = new MuteStream()
stdout.pipe( process.stdout )

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

		// Prepare to receive input events
		if ( stdin.isTTY )
		{
			stdin.setRawMode( true )
		}
		readline.emitKeypressEvents( stdin )
		this.input = readline.createInterface({
			input: stdin,
			output: stdout,
			prompt: '',
		})
		this.input.resume()

		// Event callbacks
		this.handle_char_input_callback = ( str, key ) => this.handle_char_input( str, key )
		this.handle_line_input_callback = ( line ) => this.handle_line_input( line )

		// Note that this must be called last as it will result in VM.init() being called
		super.init( iface )
	}

	attach_handlers()
	{
		if ( this.current_input_type === 'char' )
		{
			stdout.mute()
			stdin.on( 'keypress', this.handle_char_input_callback )
		}
		if ( this.current_input_type === 'line' )
		{
			this.input.on( 'line', this.handle_line_input_callback )
		}
	}

	cancel_inputs( data )
	{
		if ( data.length === 0 )
		{
			this.current_input_type = null
			this.detach_handlers()
		}
	}

	detach_handlers()
	{
		stdin.removeListener( 'keypress', this.handle_char_input_callback )
		this.input.removeListener( 'line', this.handle_line_input_callback )
		stdout.unmute()
	}

	disable( disable )
	{
		this.disabled = disable
		if ( disable )
		{
			this.detach_handlers()
		}
		else
		{
			this.attach_handlers()
		}
	}

	exit()
	{
		this.input.close()
		stdout.write( '\n' )
		super.exit()
	}
	
	handle_char_input( str, key )
	{
		if ( this.current_input_type === 'char' )
		{
			this.current_input_type = null
			this.detach_handlers()

			// Make sure this char isn't being remembered for the next line input
			this.input._line_buffer = null
			this.input.line = ''

			// Process special keys
			const res = key_replacements[str] || str || key.name.replace( /f(\d+)/, 'func$1' )
			this.send_response( 'char', this.window, res )
		}
	}
	
	handle_line_input( line)
	{
		if ( this.current_input_type === 'line' )
		{
			if ( stdout.isTTY )
			{
				stdout.write( ansiEscapes.scrollDown + ansiEscapes.cursorRestorePosition + ansiEscapes.eraseEndLine )
			}
			this.current_input_type = null
			this.detach_handlers()
			this.send_response( 'line', this.window, line )
		}
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
		if ( data[0].type === 'char' )
		{
			this.current_input_type = 'char'
		}

		if ( data[0].type === 'line' )
		{
			if ( stdout.isTTY )
			{
				stdout.write( ansiEscapes.cursorSavePosition )
			}
			this.current_input_type = 'line'
		}
		this.attach_handlers()
	}

	update_windows( data )
	{
		this.window = data[0]
	}
}

module.exports = DumbGlkOte
