/*
	The legend of Zelda: Breath of the wild v20180520
	by Marc Robledo 2017-2018
*/
var currentEditingItem=0;
var locationValues = {};

SavegameEditor={
	Name:'The legend of Zelda: Breath of the wild',
	Filename:'game_data.sav',
	Version:20180520,

	/* Constants */
	Constants:{
		/*						 v1.0    v1.1    v1.2    v1.3    v1.3.3   v1.4     v1.5 */
		FILESIZE:				[896976, 897160, 897112, 907824, 1020648, 1027208, 1027208],
		HEADER:					[0x24e2, 0x24ee, 0x2588, 0x29c0, 0x3ef8,  0x471a,  0x471b],
		VERSION:				['v1.0', 'v1.1', 'v1.2', 'v1.3', 'v1.3.3','v1.4',  'v1.5'],
	},

	/* Offsets */
	OffsetsAll:{
		/*						 hash        v1.0      v1.1      v1.2      v1.3      v1.3.3    v1.4      v1.5 */
		KOROK_SEED_COUNTER:		[0x8a94e07a, 0x076148, 0x0761f8, 0x0761e0, 0x0778f8, 0x083b60, 0x084908, 0x084908],
	},


	/* private functions */

	_searchHash:function(hash){
		for(var i=0x0c; i<tempFile.fileSize; i+=8)
			if(hash===tempFile.readInt(i))
				return i;
		return false;
	},

	_getOffsets(v){
		this.Offsets={};
		if(v<this.OffsetsAll.KOROK_SEED_COUNTER.length){
			for(prop in this.OffsetsAll){
				this.Offsets[prop]=this.OffsetsAll[prop][v+1];
			}
		}else{ /* unknown version */
			var textarea=document.createElement('textarea');
			for(prop in this.OffsetsAll){
				var offset=this._searchHash(this.OffsetsAll[prop][0]);
				if(offset){
					textarea.value+=prop+':0x'+(offset+4).toString(16)+',\n';
					this.Offsets[prop]=offset+4;
				}
			}
			document.body.appendChild(textarea);
		}
	},


	/* check if savegame is valid */
	_checkValidSavegameByConsole:function(switchMode){
		var CONSOLE=switchMode?'Switch':'Wii U';
		tempFile.littleEndian=switchMode;
		for(var i=0; i<this.Constants.FILESIZE.length; i++){
			var versionHash=tempFile.readInt(0);
			if(versionHash===0x2a46) //v1.3.0 switch?
				versionHash=0x29c0;
			if(versionHash===0x3ef9) //v1.3.3 switch?
				versionHash=0x3ef8;

			if(tempFile.fileSize===this.Constants.FILESIZE[i] && versionHash===this.Constants.HEADER[i] && tempFile.readInt(4)===0xffffffff){
				this._getOffsets(i);
				//setValue('version', this.Constants.VERSION[i]+' ('+CONSOLE+')');
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
		setValue( 'span-number-koroks', tempFile.readInt( this.Offsets.KOROK_SEED_COUNTER ) );

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

		this.markMap( locationValues.notFound.koroks, 'korok' );
		this.markMap( locationValues.notFound.locations, 'location' );
		this.markMap( warps, 'warp' );

		addWaypointListeners();

	},

	// based on the load() method in https://github.com/marcrobledo/savegame-editors/blob/master/zelda-botw-master/zelda-botw-master.js
	_notFoundLocations:function( hashObjects, key = 'koroks' ) {

		tempFile.fileName='game_data.sav';

		var previousHashValue=0;
		for ( var offset = 0x0c; offset < tempFile.fileSize - 4; offset += 8 ) {

			var hashValue = tempFile.readInt( offset );

			if( hashValue === previousHashValue )
				continue;

			if ( hashObjects[ hashValue ] ) {

				if ( ! tempFile.readInt( offset + 4 ) ) {

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

		SavegameEditor.markMap( locationValues.notFound.koroks, 'korok' );
		SavegameEditor.markMap( locationValues.notFound.locations, 'location' );

		SavegameEditor.markMap( warps, 'warp' );

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

		SavegameEditor.markMap( locationValues.notFound.koroks, 'korok' );
		SavegameEditor.markMap( locationValues.notFound.locations, 'location' );

		SavegameEditor.markMap( warps, 'warp' );

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

}

// Remove all Waypoints
function removeAllWaypoints() {

	[].forEach.call( document.querySelectorAll( '.waypoint' ), function( element ) {
		element.remove();
	} );

}