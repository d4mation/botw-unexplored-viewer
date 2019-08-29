/*
	The legend of Zelda: Breath of the wild v20180520
	by Marc Robledo 2017-2018
*/
var currentEditingItem=0;
var locationValues = {};

SavegameEditor={
	Name:'The legend of Zelda: Breath of the wild',
	Filename:'game_data.sav',
	Version:20190625,

	/* Constants */
	Constants:{
		MAX_ITEMS:410,
		STRING_SIZE:0x80,

		//missing versions: 1.1.1, 1.1.2 and 1.4.1
		VERSION:				['v1.0', 'v1.1', 'v1.2', 'v1.3', 'v1.3.1', 'Kiosk', 'v1.3.3','v1.3.4', 'v1.4',  'v1.5',  'v1.6',  'v1.6*', 'v1.6**','v1.6***'],
		FILESIZE:				[896976, 897160, 897112, 907824, 907824,  916576,  1020648, 1020648,   1027208, 1027208, 1027216, 1027216, 1027216, 1027216],
		HEADER:					[0x24e2, 0x24ee, 0x2588, 0x29c0, 0x2a46,  0x2f8e,  0x3ef8,  0x3ef9,    0x471a,  0x471b,  0x471e, 0x0f423d, 0x0f423e,0x0f423f],

		MAP_ICONS: 0x9383490e,
		MAP_POS: 0xea9def3f,
		ICON_TYPES:{SWORD: 27, BOW:28, SHIELD:29, POT:30, STAR:31, CHEST:32,SKULL:33,LEAF:34,TOWER:35}
	},

	/* Offsets */
	Hashes:[
		0x8a94e07a, 'KOROK_SEED_COUNTER',			
	],


	/* private functions */

	_searchHash:function(hash){
		for(var i=0x0c; i<tempFile.fileSize; i+=8)
			if(hash===tempFile.readU32(i))
				return i;
		return false;
	},

	_readFromHash:function(hash){
		var offset=this._searchHash(hash);
		if(typeof offset === 'number')
			return tempFile.readU32(offset+4);
		return false;
	},
	_writeValueAtHash:function(hash,val){
		var offset=this._searchHash(hash);
		if(typeof offset==='number')
			this._writeValue(offset+4,val);
	},

	_getOffsets:function(v){
		this.Offsets={};
		var startSearchOffset=0x0c;
		for(var i=0; i<this.Hashes.length; i+=2){
			for(var j=startSearchOffset; j<tempFile.fileSize; j+=8){
				if(this.Hashes[i]===tempFile.readU32(j)){
					this.Offsets[this.Hashes[i+1]]=j+4;
					startSearchOffset=j+8;
					break;
				}
			}
			/*if(typeof this.Offsets[this.Hashes[i+1]] === 'undefined'){
				console.log(this.Hashes[i+1]+' not found');
			}*/
		}
	},

	/* check if savegame is valid */
	_checkValidSavegameByConsole:function(switchMode){
		var CONSOLE=switchMode?'Switch':'Wii U';
		tempFile.littleEndian=switchMode;
		for(var i=0; i<this.Constants.FILESIZE.length; i++){
			var versionHash=tempFile.readU32(0);

			if(tempFile.fileSize===this.Constants.FILESIZE[i] && versionHash===this.Constants.HEADER[i] && tempFile.readU32(4)===0xffffffff){
				this._getOffsets(i);
				return true;
			}
		}

		return false
	},
	checkValidSavegame:function(){
		return this._checkValidSavegameByConsole(false) || this._checkValidSavegameByConsole(true);
	},


	preload:function(){
	},

	/* load function */
	load:function(){

		tempFile.fileName='game_data.sav';

		/* prepare viewer */
		setValue( 'span-number-koroks', tempFile.readU32( this.Offsets.KOROK_SEED_COUNTER ) );

		locationValues.notFound = {
			'koroks': {},
			'locations': {},
		};

		locationValues.found = {
			'koroks': 0,
			'locations': 0,
		};

		// All Korok/Location Data filtered down to ones not found
		this._notFoundLocations( koroks, 'koroks' );
		this._notFoundLocations( locations, 'locations' );

		window.localStorage.setItem( 'botw-unexplored-viewer', JSON.stringify( locationValues ) );

		setValue( 'span-number-locations', locationValues.found.locations );
		setValue( 'span-number-total-locations', Object.keys( locations ).length );

		this.drawKorokPaths( locationValues.notFound.koroks );

		this.markMap( locationValues.notFound.locations, 'location' );
		this.markMap( warps, 'warp' );
		this.markMap( locationValues.notFound.koroks, 'korok' );

		addWaypointListeners();

	},

	// based on the load() method in https://github.com/marcrobledo/savegame-editors/blob/master/zelda-botw-master/zelda-botw-master.js
	_notFoundLocations:function( hashObjects, key = 'koroks' ) {

		tempFile.fileName='game_data.sav';

		var previousHashValue=0;
		for ( var offset = 0x0c; offset < tempFile.fileSize - 4; offset += 8 ) {

			var hashValue = tempFile.readU32( offset );

			if( hashValue === previousHashValue )
				continue;

			if ( hashObjects[ hashValue ] ) {

				if ( ! tempFile.readU32( offset + 4 ) ) {

					locationValues.notFound[ key ][ hashObjects[ hashValue ]['internal_name'] ] = {
						display_name: hashObjects[ hashValue ]['display_name'],
						x: hashObjects[ hashValue ]['x'],
						y: hashObjects[ hashValue ]['y'],
						offset: offset,
					};

				}
				else {

					locationValues.found[ key ]++;

				}

			}

			previousHashValue = hashValue;

		}

	},

	// Mark the map with not found Koroks or Locations
	markMap( mapObjects, className ) {

		var map = document.getElementById( 'map-container' );

		for ( var internal_name in mapObjects ) {

			var waypoint = document.createElement( 'div' );

			waypoint.classList.add( 'waypoint' );
			waypoint.classList.add( className );
			waypoint.setAttribute( 'style', 'left: ' + ( 3000 + mapObjects[ internal_name ].x / 2 ) + 'px' + '; top: ' + ( 2500 + mapObjects[ internal_name ].y / 2 ) + 'px' );
			waypoint.id = internal_name;
			waypoint.setAttribute( 'data-display_name', mapObjects[ internal_name ].display_name );

			map.appendChild( waypoint );

		}

	},

	/**
	 * Adapted from https://stackoverflow.com/a/55963590
	 */
	lineDraw( id, x1, y1, x2, y2 ) {

		if ( x2 < x1 ) {
			tmp = x2; x2 = x1; x1 = tmp;
			tmp = y2; y2 = y1; y1 = tmp;
		}

		lineLength = Math.sqrt( Math.pow( x2 - x1, 2 ) + Math.pow( y2 - y1, 2 ) );
		m = (y2 - y1) / (x2 - x1)

		degree = Math.atan( m ) * 180 / Math.PI

		let line = document.createElement( 'div' );
		
		line.className = 'line ' + id;
		line.style.cssText = "transform-origin: top left; transform: rotate(" + degree + "deg); width: " + lineLength + "px; height: 3px; background: white; position: absolute; top: " + y1 + "px; left: " + x1 + "px;";

		return line;

	},

	drawKorokPaths( notFoundKoroks ) {

		var map = document.getElementById( 'map-container' );

		for ( var internal_name in notFoundKoroks ) {

			if ( typeof korokPaths[ internal_name ] == 'undefined' ) continue;

			points = korokPaths[ internal_name ].points;

			for ( var index in points ) {

				if ( index == 0 ) continue;

				let x1 = points[ index - 1 ].x,
					y1 = points[ index - 1 ].y,
					x2 = points[ index ].x,
					y2 = points[ index ].y;

				let line = this.lineDraw( internal_name, ( 3000 + x1/2 ), ( 2500 + y1/2 ), ( 3000 + x2/2 ), ( 2500 + y2/2 ) );

				map.appendChild( line );

			}

		}

	},

	/* save function */
	save:function(){
	}
}

function onScroll(){
	var h=document.getElementById('header-top').getBoundingClientRect().height;
	if(window.scrollY>h){
		document.getElementById('header').style.position='fixed';
		document.getElementById('header').style.top='-'+h+'px';
	}else{
		document.getElementById('header').style.position='fixed';
		document.getElementById('header').style.top='0px';
	}
}

window.addEventListener('load',function(){

	window.addEventListener('scroll',onScroll,false);

	// If there is saved data in the browser, load that instead
	locationValuesTest = window.localStorage.getItem( 'botw-unexplored-viewer' );
	if ( locationValuesTest ) {

		locationValues = JSON.parse( locationValuesTest );

		setValue( 'span-number-koroks', locationValues.found.koroks );
		setValue( 'span-number-locations', locationValues.found.locations );
		setValue( 'span-number-total-locations', Object.keys( locations ).length );

		SavegameEditor.drawKorokPaths( locationValues.notFound.koroks );

		SavegameEditor.markMap( locationValues.notFound.locations, 'location' );
		SavegameEditor.markMap( warps, 'warp' );
		SavegameEditor.markMap( locationValues.notFound.koroks, 'korok' );

		hide('dragzone');
		show('the-editor');
		show('toolbar');

		addWaypointListeners();

	}

	// Empty data for a clear map
	document.getElementById( 'clear' ).addEventListener( 'click', function() {
		
		locationValues.notFound = {
			'koroks': {},
			'locations': {},
		};

		locationValues.found = {
			'koroks': 0,
			'locations': 0,
		};

		for ( var hash in koroks ) {

			locationValues.notFound.koroks[ koroks[ hash ]['internal_name'] ] = {
				display_name: koroks[ hash ]['display_name'],
				x: koroks[ hash ]['x'],
				y: koroks[ hash ]['y'],
				offset: null, // Not loaded from a save
			};

		}

		for ( var hash in locations ) {

			locationValues.notFound.locations[ locations[ hash ]['internal_name'] ] = {
				display_name: locations[ hash ]['display_name'],
				x: locations[ hash ]['x'],
				y: locations[ hash ]['y'],
				offset: null, // Not loaded from a save
			};

		}

		window.localStorage.setItem( 'botw-unexplored-viewer', JSON.stringify( locationValues ) );

		setValue( 'span-number-koroks', locationValues.found.koroks );
		setValue( 'span-number-locations', locationValues.found.locations );
		setValue( 'span-number-total-locations', Object.keys( locations ).length );

		SavegameEditor.drawKorokPaths( locationValues.notFound.koroks );

		SavegameEditor.markMap( locationValues.notFound.locations, 'location' );
		SavegameEditor.markMap( warps, 'warp' );
		SavegameEditor.markMap( locationValues.notFound.koroks, 'korok' );

		hide('dragzone');
		show('the-editor');
		show('toolbar');

		addWaypointListeners();

	} );

}, false);

// Add event Listeners for Waypoints
function addWaypointListeners() {

	[].forEach.call( document.querySelectorAll( '.waypoint:not(.warp)' ), function( element ) {
		element.addEventListener( 'click', function() {
			removeWaypoint( element );
		} );
	} );

}

// Remove an individual Waypoint and save that change in localStorage
function removeWaypoint( element ) {

	var type;

	if ( element.classList.contains( 'korok' ) ) {
		type = 'koroks';
	}
	else {
		type = 'locations';
	}

	delete locationValues.notFound[ type ][ element.id ];

	locationValues.found[ type ]++;

	setValue( 'span-number-' + type, locationValues.found[ type ] );

	window.localStorage.setItem( 'botw-unexplored-viewer', JSON.stringify( locationValues ) );

	element.remove();

	if ( type == 'koroks' ) {

		// Remove lines when necessary
		[].forEach.call( document.querySelectorAll( '.line.' + element.id ), function( line ) {
			line.remove();
		} );

	}

}

// Remove all Waypoints
function removeAllWaypoints() {

	[].forEach.call( document.querySelectorAll( '.waypoint, .line' ), function( element ) {
		element.remove();
	} );

}