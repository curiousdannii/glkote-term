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
const os = require( 'os' )
const readline = require( 'readline' )

const Dialog = require( './electrofs.js' )
const GlkOte = require( './glkote-term.js' )

const key_replacements = {
	'\x7F': 'delete',
	'\t': 'tab',
}

const stdin = process.stdin
const stdout = new MuteStream()
stdout.pipe( process.stdout )

// Create this now so that both DumbGlkOte and DumbDialog can access it, even though it may not be used
const rl = readline.createInterface({
	input: stdin,
	output: stdout,
	prompt: '',
})

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
		rl.resume()

		// Event callbacks
		this.handle_char_input_callback = ( str, key ) => this.handle_char_input( str, key )
		this.handle_line_input_callback = ( line ) => this.handle_line_input( line )

		// Note that this must be called last as it will result in VM.init() being called
		super.init( iface )
	}

	accept_specialinput( data )
	{
		if ( data.type === 'fileref_prompt' )
		{
			const replyfunc = ( ref ) => this.send_response( 'specialresponse', null, 'fileref_prompt', ref )
			try
			{
				( new DumbDialog() ).open( data.filemode !== 'read', data.filetype, data.gameid, replyfunc )
			}
			catch (ex)
			{
				this.log( 'Unable to open file dialog: ' + ex )
				/* Return a failure. But we don't want to call send_response before
				glkote_update has finished, so we defer the reply slightly. */
				setImmediate( () => replyfunc( null ) )
			}
		}
		else
		{
			this.error( 'Request for unknown special input type: ' + data.type )
		}
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
			rl.on( 'line', this.handle_line_input_callback )
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
		rl.removeListener( 'line', this.handle_line_input_callback )
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
		rl.close()
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
			rl._line_buffer = null
			rl.line = ''

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
		if ( data.length )
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
	}

	update_windows( data )
	{
		this.window = data[0]
	}
}

class DumbDialog extends Dialog.Dialog
{
	get_user_path()
	{
		return os.homedir()
	}

	log()
	{}

	open( tosave, usage, gameid, callback )
	{
		rl.question( 'Please enter a file name (without an extension): ', ( path ) =>
		{
			if ( !path )
			{
				callback( null )
			}
			else
			{
				callback({
					filename: path + '.' +  this.filters_for_usage( usage )[0].extensions[0],
					usage: usage,
				})
			}
		})
	}
}

module.exports = DumbGlkOte
module.exports.Dialog = DumbDialog
