/*

glkote-dumb: Dumb terminal implementation of GlkOte
===================================================

Copyright (c) 2016 Dannii Willis
MIT licenced
https://github.com/curiousdannii/glkote-term

*/

'use strict'

const ansiEscapes = require( 'ansi-escapes' )
const os = require( 'os' )
const readline = require( 'readline' )

const Dialog = require( './electrofs.js' )
const GlkOte = require( './glkote-term.js' )

const key_replacements = {
	'\x7F': 'delete',
	'\t': 'tab',
}

class DumbGlkOte extends GlkOte
{
	constructor( options )
	{
		super()

		this.rl = options.rl
		this.showlog = options.showlog
		this.stdin = options.stdin
		this.stdout = options.stdout
	}

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
		if ( this.stdin.isTTY )
		{
			this.stdin.setRawMode( true )
		}
		readline.emitKeypressEvents( this.stdin )
		this.rl.resume()

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
				( this.interface.Dialog || new DumbDialog() ).open( data.filemode !== 'read', data.filetype, data.gameid, replyfunc )
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
			this.stdout.mute()
			this.stdin.on( 'keypress', this.handle_char_input_callback )
		}
		if ( this.current_input_type === 'line' )
		{
			this.rl.on( 'line', this.handle_line_input_callback )
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
		this.stdin.removeListener( 'keypress', this.handle_char_input_callback )
		this.rl.removeListener( 'line', this.handle_line_input_callback )
		this.stdout.unmute()
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
		this.detach_handlers()
		this.rl.close()
		this.stdout.write( '\n' )
		super.exit()
	}
	
	handle_char_input( str, key )
	{
		if ( this.current_input_type === 'char' )
		{
			this.current_input_type = null
			this.detach_handlers()

			// Make sure this char isn't being remembered for the next line input
			this.rl._line_buffer = null
			this.rl.line = ''

			// Process special keys
			const res = key_replacements[str] || str || key.name.replace( /f(\d+)/, 'func$1' )
			this.send_response( 'char', this.window, res )
		}
	}
	
	handle_line_input( line)
	{
		if ( this.current_input_type === 'line' )
		{
			if ( this.stdout.isTTY )
			{
				this.stdout.write( ansiEscapes.scrollDown + ansiEscapes.cursorRestorePosition + ansiEscapes.eraseEndLine )
			}
			this.current_input_type = null
			this.detach_handlers()
			this.send_response( 'line', this.window, line )
		}
	}

	log( msg )
	{
		if ( this.showlog )
		{
			console.log( `ℹ️ ${ msg }` )
		}
	}
	
	update_content( data )
	{
		data = data.filter(content => content.id === this.window.id)[0]
		data.text.forEach( line =>
		{
			if ( !line.append )
			{
				this.stdout.write( '\n' )
			}
			const content = line.content
			if ( content )
			{
				for ( let i = 0; i < content.length; i++ )
				{
					if ( typeof content[i] === 'string' )
					{
						i++
						this.stdout.write( content[i] )
					}
					else
					{
						this.stdout.write( content[i].text )
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
				if ( this.stdout.isTTY )
				{
					this.stdout.write( ansiEscapes.cursorSavePosition )
				}
				this.current_input_type = 'line'
			}
			this.attach_handlers()
		}
	}

	update_windows( data )
	{
		data.forEach(win =>
		{
			if (win.type === 'buffer')
			{
				this.window = win
			}
		})
	}

	warning( msg )
	{
		if ( this.showlog )
		{
			console.warn( `⚠️ ${ msg }` )
		}
	}
}

class DumbDialog extends Dialog.Dialog
{
	constructor( options )
	{
		super()

		this.rl = options.rl
		this.stdin = options.stdin
		this.stdout = options.stdout
	}

	get_user_path()
	{
		return os.homedir()
	}

	log()
	{}

	open( tosave, usage, gameid, callback )
	{
		this.stdout.write( '\n' )
		this.rl.question( 'Please enter a file name (without an extension): ', ( path ) =>
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
