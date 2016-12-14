/*

glkote-term: Base implementation of glkote-term
==============================================

Copyright (c) 2016 Dannii Willis
MIT licenced
https://github.com/curiousdannii/glkote-term

*/

'use strict'

class GlkOte
{
	constructor()
	{
		this.current_metrics = null
		this.disabled = false
		this.generation = 0
		this.interface = null
		this.version = '0.1.0'
	}

	getinterface()
	{
		return this.interface
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
		this.interface = iface

		this.current_metrics = this.measure_window()

		// Note that this will result in VM.init() being called
		this.send_response( 'init', null, this.current_metrics )
	}

	update( data )
	{
		if ( data.type === 'error' )
		{
			this.error( data.message )
		}
		if ( data.type === 'pass' )
		{
			return
		}
		if ( data.type === 'exit' )
		{
			this.exit()
			return
		}
		if ( data.type !== 'update' )
		{
			this.log( `Ignoring unknown message type: ${ data.type }` )
			return
		}
		if ( data.gen === this.generation )
		{
			this.log( `Ignoring repeated generation number: ${ data.gen }` )
			return
		}
		if ( data.gen < this.generation )
		{
			this.log( `Ignoring out-of-order generation number: got ${ data.gen }, currently at ${ this.generation}` )
			return
		}
		this.generation = data.gen

		if ( this.disabled )
		{
			this.disable( false )
		}

		// Handle the update
		if ( data.input != null )
		{
			this.cancel_inputs( data.input )
		}
		if ( data.windows != null )
		{
			this.update_windows( data.windows )
		}
		if ( data.content != null )
		{
			this.update_content( data.content )
		}
		if ( data.input != null )
		{
			this.update_inputs( data.input )
		}

		// Disable everything if requested
		this.disabled = false
		if ( data.disabled || data.specialinput )
		{
			this.disable( true )
		}
	}

	error( message )
	{
		throw message
	}

	log()
	{}

	warning()
	{}

	// And now for private functions

	exit()
	{}

	measure_window()
	{
		const metrics = {
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
		if ( process.stdout.isTTY )
		{
			metrics.height = process.stdout.rows
			metrics.width = process.stdout.columns
		}
		return metrics
	}

	send_response( type, win, val /*, val2*/ )
	{
		const res = {
			type: type,
			gen: this.generation,
		}

		if ( win )
		{
			res.window = win.id
		}

		if ( type === 'init' || type === 'arrange' )
		{
			res.metrics = val
		}

		if ( type === 'init' )
		{
			res.support = this.support()
		}

		if ( type === 'line' )
		{
			res.value = val
		}

		this.interface.accept( res )
	}
	
	support()
	{
		return []
	}
}

module.exports = GlkOte
