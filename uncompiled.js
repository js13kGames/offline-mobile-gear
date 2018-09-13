/** Canvas constructor
 *
 *	function Canvas
 *	@constructor
 */
function Canvas(arg) { 
	this._uid = 0;
	this._id = this.UID();
	this._components = []; // components to render
	this._services = []; // services to run
	this._arg = arg;

	// 	create canvas object to body
	if( arg && arg.id ) {
		this._id = arg.id;
		this._canvas = document.getElementById(arg.id);
	}
	else {
		this._canvas = document.createElement('canvas');
		if( !(arg && arg.hidden) ) document.body.appendChild(this._canvas); 	
	}

	// event when the browser is resized
	var self = this;
	this.resize = function() {
		self._layout = { height:window.innerHeight, width:window.innerWidth }; //  opacity:100 
		if( self._layout.height > self._layout.width && self._layout.height >= (self._layout.width*1.5)  ) {
			self._canvas.height = self._layout.width*1.5;
			self._canvas.width = self._layout.width;	
			self._canvas.style['margin-top'] = ( (self._layout.height - self._canvas.height)/2 ) + 'px';	
		}
		else { 
			self._canvas.height = self._layout.height;
			self._canvas.width = self._layout.height/1.5;	
			
		}
		self._canvas.style.left = ((self._layout.width/2)-(self._canvas.width/2))+'px';
		self._layout.height = self._canvas.height;
		self._layout.width = self._canvas.width;	
		self._scale = self._canvas.width/480;
		self._flag.redraw=1;
	}
	window.addEventListener('resize', this.resize, true);	

	// canvas context
	this._ctx = this._canvas.getContext('2d');
	this._flag = { redraw:1, redrawcount:0 };	
	this.resize();
	this.update();

}


/** 
 *   
 *	function saveComponent
 *	@see 
 *	@param {...*} args
 */	
Canvas.prototype.saveComponent = function(args) {

	for(var j=0;j<arguments.length;j++) {
		var component = arguments[j];

		if(component instanceof Array) { for(var i=0;i<component.length;i++) this.saveComponent(component[i]); continue; }

		if( !component.id ) component.id = this.UID(); // assign an auto-generated unique id
		
		component._canvas = this;
		component._ctx = this._ctx;
		component.init();

		component.z = component.z ? component.z : this._components.length; // update z index based on component length

		var ws = this._canvas.width/this._scale, hs = this._canvas.height/this._scale;
		switch(component.alignment) {
			case 2: component.x = ws - component.x; break; // topright
			case 3: component.x = ws/2 + component.x; break; // topmid
			case 4: component.y = hs - component.y; break; // bottomleft
			case 5: component.y = hs - component.y; component.x = ws - component.x; break; // bottomright
			case 6: component.y = hs - component.y; component.x = ws/2 + component.x; break; // bottommid
			case 7: component.y = hs/2 + component.y; component.x = ws/2 + component.x; break; // centermid
		}

		for(var i=0;i<component.traits.length;i++) { 
			component.traits[i].init(); 
		}		

		if( !this.updateComponentById(component) ) { // if it is not an update, push it as a new component
			this._components.push(component);
			component.onCreate();			
		}

	}

	this._flag.redraw=1;
	
	return this._components[this._components.length-1];
}

/** 
 *   
 *	function removeComponent
 *	@see 
 *	@param {string|number} id
 */	
Canvas.prototype.destroyComponent = function(id) {	
	for(var i=0;i<this._components.length;i++) 
		if(this._components[i].id===id) {   
			var component = this._components[i];
			this._components.splice(i,1);
			component.onDestroy();
			this._flag.redraw=1;
			return;
		};
}

/** Get target component based on id
 *   
 *	function getComponentById
 *	@see 
 *	@param {string|number} id
 */	
Canvas.prototype.getComponentById = function(id) {
	for(var i=0;i<this._components.length;i++) if(id===this._components[i].id) return this._components[i];
}

Canvas.prototype.getComponentsByCoordinate = function(x,y) {
	var components = [];
	for(var i=0;i<this._components.length;i++) 
		if( this._components[i].isCollision(x,y) ) 
			components.push(this._components[i]);	
	return components;
}

/** Update target component based on id
 *   
 *	function updateComponentById
 *	@see 
 *	@param {Object=} component
 */	
Canvas.prototype.updateComponentById = function(component) {
	for(var i=0;i<this._components.length;i++) if(component.id===this._components[i].id) { this._components[i] = component; return true; }
}

/** 
 *   
 *	function saveService
 *	@see 
 *	@param {Object=} service
 */	
Canvas.prototype.saveService = function(service) {
	service._ctx = this._ctx;
	service.init();
	for(var i=0;i<service.traits.length;i++) service.traits[i].init();	
	for(var i=0;i<this._services.length;i++) 
		if(this._services[i].id===service.id) { 
			this._services[i]=service; 
			return; 
		};
	this._services.push(service);
}	

/** Get target service based on id
 *   
 *	function getServiceById
 *	@see 
 *	@param {string|number} id
 */	
Canvas.prototype.getServiceById = function(id) {
	for(var i=0;i<this._services.length;i++) if(id===this._services[i].id) return this._services[i];
}	

/** Update the canvas screen with the new content
 *   
 *	function update
 */	
Canvas.prototype.update = function() {		
	var self = this;

	// var t = Commons.timer('Canvas.update'); t.stop();

	if( this._flag.redraw === 1 ) {		
		// clear canvas
		this._ctx.clearRect(0, 0, this._canvas.width, this._canvas.height); 

		if(this.bggrad) this.backgroundColorGradient(this.bggrad.colorstop1,this.bggrad.colorstop2);		

		// sort the z-index
		this._components.sort(function(a,b){
			if (a.z < b.z) return -1;
			if (a.z > b.z) return 1;
			return 0;
		});

		// update all the components
		for(var i=0;i<this._components.length;i++) { 
			this._components[i].onBeforeUpdate();
			for(var j=0;j<this._components[i].traits.length;j++) this._components[i].traits[j].onBeforeUpdate();											
		}

		for(var i=0;i<this._components.length;i++) { 
			if( this._components[i].updatePre() )
				this._components[i].update();
			this._components[i].updatePost();
		}

		for(var i=0;i<this._components.length;i++) {
			for(var j=0;j<this._components[i].traits.length;j++) this._components[i].traits[j].onAfterUpdate();	
			this._components[i].onAfterUpdate();
		}

		this._flag.redraw = 0;
		this._flag.redrawcount++;
		
	}

	for(var i=0;i<this._components.length;i++) { 
		this._components[i].onAfterPassive( this );
		for(var j=0;j<this._components[i].traits.length;j++) this._components[i].traits[j].onAfterPassive( this );
	}


	if( this._flag.drawonce ) {
		return;
	}


	window.requestAnimationFrame(function(){
		try { self.update(); } catch(e) { log(e); self.update();  }
	});
}


/** Increment the unique id
 *   
 *	function UID
 *	@see 
 */	
Canvas.prototype.UID = function() {	
	return this._uid++;
}


/** Remove the canvas
 *   
 *	function remove
 *	@see 
 */	
Canvas.prototype.remove = function() {	
	this._canvas.remove();
}

/** Get the image of the canvas
 *   
 *	function toImage
 *	@see 
 */	
Canvas.prototype.toImage = function() {	
	var image = new Image();
	this._flag.redraw = 1;
	this._flag.drawonce = 1;
	this._scale = 1; // no scaling for toimage
	this.update();	
	image.src = this._canvas.toDataURL(); 	
	return image;
}

Canvas.prototype.saveBackgroundColorGradient = function(s0,s1) {
	this.bggrad = {colorstop1:s0,colorstop2:s1};
	this._flag.redraw = 1;
}

Canvas.prototype.backgroundColorGradient = function(s0,s1) {
	this._ctx.fillStyle = Commons.color.gradientc(this._canvas.width/2,this._canvas.height/1.3,this._canvas.width/2,0,s0,s1,this._ctx);
	this._ctx.fillRect(0,0,this._canvas.width,this._canvas.height);
}

/** Commons constructor
 *
 *	function Commons
 *	@constructor
 */
function Commons() { }


/** Extend the base 
 *	
 *	function static extend
 *	@return 
 */
Commons.extend = function(self, base) {
	for(var name in base) if(self[name]===undefined || (typeof base[name]!=='function')) self[name]=base[name];	
	return self;
}

/** Extend the clone 
 *	
 *	function static clone
 *	@return 
 */
Commons.clone = function(self) {
	var p = {}, c = [];
	try {
		p = JSON.parse(JSON.stringify(self, function(key, value) {
				if ( (typeof value === 'object') && value !== null) {
					if (c.indexOf(value) !== -1) return;
        			c.push(value);
				}
    			return value;
			}));	
	} catch(e){ console.debug( e ); }
	return p;	
}


/** Cache all data values
 *	
 *	object static cache
 */
Commons.cache = function(id, data) {
	if( data ) Commons._cache[id] = data;
	return Commons._cache[id];	
}

/** Cache all png data values
 *	
 *	object static pngcache
 */
Commons.pngcache = function(id, data) {
	return Commons.cache('png-'+id, data);
}

/** Cache container of all data values
 *	
 *	Object static cache
 *	@private {Object}
 */
Commons._cache = {	};

/** Benchmark timer
 *	
 *	function static timer
 *	@return 
 */
Commons.timer = function(name) {
    var start = new Date();
    return {
        stop: function() {
            var end  = new Date();
            var time = end.getTime() - start.getTime();
            console.log('Timer:', name, 'finished in', time, 'ms');
        }
    }
};


/** Generate guid
 *	
 *	function static guid
 *	@return 
 */
Commons.guid = function() {
	return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
		var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
		return v.toString(16);
	});
}

/** Get the distance of 2 points
 *	
 *	function static hypot
 *	@return 
 */
Commons.hypot = function(x1,x2,y1,y2){
	var a = x1 - x2,  b = y1 - y2;
	return Math.sqrt( a*a + b*b );
}


Commons.pointLinear = function(x, y, dx, dy, pct) {
	return [ x + (dx - x) * pct, 
		y + (dy - y) * pct ];
}

/** 
 *	
 *	function static rotate
 *	@param {number} x
 *	@param {number} y
 *	@param {number} cx1
 *	@param {number} cy1
 *	@param {number} cx2
 *	@param {number} cy2
 *	@param {number} dx
 *	@param {number} dy
 *	@param {number} pct
 */
Commons.pointBezierCurve = function(x, y, cx1, cy1, cx2, cy2, dx, dy, pct) {
    return [ Commons.cubicN(pct, x, cx1, cx2, dx),
		Commons.cubicN(pct, y, cy1, cy2, dy) ];
}

Commons.cubicN = function(T, a, b, c, d) {
    var t2 = T * T;
    var t3 = t2 * T;
    return a + (-a * 3 + T * (3 * a - a * T)) * T + (3 * b + T * (-6 * b + b * 3 * T)) * T + (c * 3 - c * 3 * T) * t2 + d * t3;
}

// console.debug( Commons.pointLinear(0,0,15,15,0.5) );
// console.debug( Commons.pointBezierCurve( {x:301,y:90}, {x:240,y:103}, {x:89,y:121}, {x:149,y:279}, 0.1) );
// can be used in frame/time with 100x100 dimension

/** Rotate the given coordinates agains an orgin mid point
 *	
 *	function static rotate
 *	@return 
 */
Commons.rotate = function(x, y, xm, ym, a){
	// rotate the points
	var cos = Math.cos, sin = Math.sin,
	r = a * Math.PI / 180, // Convert to radians 	
	// Subtract midpoints, so that midpoint is translated to origin and add it in the end again				
	xr = (x - xm) * cos(r) - (y - ym) * sin(r)   + xm,
	yr = (x - xm) * sin(r) + (y - ym) * cos(r)   + ym;

	return [xr, yr];	
} 

/**	Convert value with base1 to base2
 *	
 *	static function Commons.convertBase
 *  @return
 */
Commons.convertBase = function(value, base1, base2) {
	if (typeof(value) == "number") {
		return parseInt(String(value),10).toString(base2);
	} else {
		var d = parseInt(value.toString(), base1).toString(base2);
		return base2==10 ? parseInt(d,10) : d;
	};
}

/**	Zero left padding
 *	
 *	static function Commons.pad
 *	@param {number} width
 *	@param {string} string
 */
Commons.pad = function(width, string) {
	return (width <= string.length) ? string : Commons.pad(width, '0'+string )
}

Commons.padr = function(width, string) {
	return (width <= string.length) ? string : Commons.padr(width, string+'0' )
}


/** Contains 122 color palette
 *  
 *  @private {Array}
 */
Commons._color = [];

/** Color extraction 636056 color set. From 0 - 636055. 
 *	Color extraction 122 palette. Linear or Bezier color set.
 *
 *	static function Commons.color
 *	@param {number} p array color index
  *	@param {object|undefined} c context
 *	@return 
 */
Commons.color = function(p,c){			
	if( !Commons._color.length ) {
		var h=[10,30,50,70,90,100,120,160,200,215,240,280,310,360]; // 7x2x8 -- 16*7

		for(var i=-1;i<9;i++) // initial 3 extreme values 0:alpha,1:gray(11),9:whitewash(96),2-8:gradient colorset
			Commons._color.push('hsl(0,0%,'+i*12+'%)');			
		
		for(var i=0;i<2;i++) // initial black and white shades
			for(var j=0;j<7;j++)
				Commons._color.push('hsl(0,0%,'+((j*7)+(i*58))+'%)'); 

		for(var i=0;i<h.length;i++) { // 8 level of defined hue 			
			for(var j=1;j<5;j++) // 4 levels of lightness 
				Commons._color.push('hsl('+h[i]+',85%,'+(j*4+60)+'%)');			
			for(var j=1;j<4;j++) // 3 levels of saturation 
				Commons._color.push('hsl('+h[i]+','+(j*15+30)+'%,50%)');
		}
				
	}	

	return (c && p>1 && p<9) ? Commons.color.gradient(p-2,c) : Commons._color[p];
}




/** Linear gradient of the 7 presets
 *  
 *  static function Commons.color.gradient
 */
Commons.color.gradient = function(p,c) {
	return Commons.color.gradientc(200,400,200,0,Commons._color[10+(14*p)],Commons._color[9+(14*(p+1))],c);
}

Commons.color.gradientc = function(x0,y0,x1,y1,s0,s1,c) {
	var grad = c.createLinearGradient(x0,y0,x1,y1);
	grad.addColorStop(0, s0);
	grad.addColorStop(1, s1	);
	return grad;
}

/*
var canvas = document.getElementById('canvas'); 
var context = canvas.getContext('2d'); 
var grad = context.createLinearGradient(100,200,100,0);

grad.addColorStop(0, 'rgba(0,255,0,1)');
grad.addColorStop(1, 'rgba(0,128,128,1)');

context.fillStyle = grad;
context.fillRect(0, 0, 200,200); 
*/


/** Base from the 123 bytes removing return, newline \ and "
 *  The 123th character (122) is used as control indicator. Allow number parameter is 0-122.
 *
 *  Commons._base123 = "	 !#$%&'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[]^_`abcdefghijklmnopqrstuvwxyz{|}~";
 *
 *	function base123
 *	@return 
 */
Commons.base123 = function(){
	var s = Commons.base123_(arguments[0]);
	for(var i=1;i<arguments.length;i++) s+=Commons.base123_(arguments[i]);
	return s;	
}
Commons.base123_ = function(b){
	// populate the base string
	if( !Commons._base123 ) {
		for(var i=1;i<128;i++) Commons._base123 += (i!=10&&i!=13&&i!=34&&i!=92) ? String.fromCharCode(i) : '';
		Commons._base123 = Commons._base123.slice(30) + Commons._base123.substr(0,30);	
	}

	// return the character or equivalent count
	return Commons.isNumber(b) ? Commons._base123.charAt(b) : Commons._base123.indexOf(b);	
}

Commons.base123.splitdelimeter = function(s) {	
	return s.split(Commons.base123(122));
}

Commons.base123.putdelimeter = function(s) {	
	return s+Commons.base123(122);
}	

Commons.base123.joinslice = function(ar,start,end) {	
	return ar.slice(start,end).join(Commons.base123(122));
}	


Commons.base123.charAt = function(s,i) {
	return Commons.base123(s.charAt(i));
}

Commons.base123.floor = function() {
	var s = '';
	for(var i=0;i<arguments.length;i++) s+=Commons.base123(Math.floor(arguments[i]));
	return s;
}	

Commons.base123.binary = function(c) { // 6 digit binary value
	var s = "";
	for(var i=0;i<c.length;i++)
		s += Commons.pad(8,Commons.convertBase(Commons.base123(c.charAt(i)),10,2)).substring(2);
	return s
}



/** Contains the base123 character series
 *	
 *	@private {string}
 */
Commons._base123 = '';


/** Check if number
 *	
 *	function isNumber
 *	@return 
 */
Commons.isNumber = function(b){
	return typeof b == 'number';
}


Commons.isString = function(s){
	return typeof s == 'string';
}

/** Choose random inclusive numbers from min and max
 *	
 *	function choose
 *	@return 
 */
Commons.choose = function(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}


/** Base123 and with 6 flag switch. first paramter is a character, max 6 functions
 *	
 *	function sixflagged
 *	@return  
Commons.sixflagged = function() {
    var f = Commons.base123.binary(arguments[0]);
    for(var i=0;i<f.length;i++) // maximum 6 length
    	if(f.charAt(i)=='1' && typeof arguments[i+1] === 'function') 
    		arguments[i+1]();   
}
 */

/** Convert a base123 character to a decimal value
 *	
 *	function sixtodecimal
 *	@return 
 
Commons.sixtodecimal = function(c) {
	return Commons.convertBase(Commons.base123.binary(c),2,10);
}
 */

/** Convert a decimal value to a base123 character
 *	
 *	function decimaltosix
 *	@return 
 
Commons.decimaltosix = function(n) {
	var ar = Commons.convertBase(n,10,2).replace(new RegExp("^0"),"").match(/.{1,6}/g), b = "";
	for(var i=0;i<ar.length;i++)
		b += Commons.base123(Commons.convertBase(ar[i],2,10));
	return b;
}
 */

/** timeout
 *	
 *	function timeout
 *	@return 
 
Commons.timeout = function(f,n)  {
	setTimeout(f,n==undefined?9:n);
}
*/

/** 
 *	
 *	function iftrue
 *	@return 
 */
Commons.ifanytrue = function(){
	var r = arguments[0];
	for(var i=1;i<arguments.length;i++)
		if(r==arguments[i]) return true;
	return false;
}


/** Common logger function for tap engine, it will be disabled during the release build. 
 *  
 *
 *	function log
 */	
function log() { 
//	var args = Array.prototype.slice.call(arguments);
//	console.debug.apply(console, args); 
}
/** Tap
 *  
 *
 *	function Tap
 *	@constructor
 */
function Tap( option ){
	this.state = -1; // state 0:gameover, 1:intro, 2:story, 3:tap enabled, 4:disconnected
	this.map = 1;
	this.challege = true;
	this.nirvana = 0;
	this.cooldownglobal = {disconnected:0,online:5};
	this.layers = option.layers;
	this.skills = [];
	this.player = new TapAvatar();
	this.monster = new TapAvatar();

	Commons.extend(this, option);

	// this.Load(); // load the file in local storage
	this.Keyboard(); // initialize keyboard function
	this.Touch(); // initialize touch function 
	this.Passive(); // initialize passive functions

	this.monsterRegularName = "bluegrass,aeon,warrior,lamp".split(","); //4
	this.monsterMiniBossName = "bluegrass king,aeon general,solid warrior".split(",");//3
	this.monsterBossName = "emperor,doom,stronghold".split(","); //3



	for(var i=1;i<6;i++) this.skills.push({cooldown:0,cddelay:15*i}); // initialize skills

	this.skills[0].cooldown=0; // activate first skill
};


Tap.prototype.Keyboard = function(){
	document.addEventListener('keydown', function(e){
    	switch(e.keycode) {
    		case 1: break;
    		default: break; // any other key handling
    	}
	});
};

Tap.prototype.Touch = function(){
	// start: tap to skip introduction. touches the top most layer and detect only the top most
	var self = this, canvas = this.layers.foreground; 
	canvas._canvas.addEventListener('click', function(e){ 
		var x = (e.pageX - canvas._canvas.offsetLeft)/canvas._scale, y = (e.pageY - canvas._canvas.offsetTop)/canvas._scale; // , c = canvas.getComponentsByCoordinate(x,y)
		
		log('Touch: state=' + self.state + ',x=' + x + ',y='+y);		

		switch( self.state ) {
			case 0: // move the state from gameover to restart
				// self.start();				
				location.reload();
				// hide skills
				break;
			case 1: // move the state from introduction to story narration
				self.state = 2; 
				self.animation(2);
				setTimeout(function(){

					self.animation(3);					

					setTimeout(function(){

						if(self.state == 2) {
							self.state = 3; 		
							self.monsterSpawn();								
							self.animation(4); // show skill available	
						}
					},3500);

				},30000);
				break;
			case 2: // move the state from story narration to game deployment				
				self.animation(3);
				self.state = 2.5; 
				setTimeout(function(){
					self.state = 3; 										
					self.monsterSpawn();
					self.animation(4); // show skill available
				},3500);
				break;
			case 3: // state to allow tap attack				
				var skillindex = self.attackskill(x,y); // check if skill is used
				if( skillindex>-1 && self.skills[skillindex].cooldown==0 ) {
					self.assets.spriteButton.tapSkillButton(skillindex);
					self.skills[skillindex].cooldown=self.skills[skillindex].cddelay;
					
					self.animation(6);

					switch( skillindex ) {					
						case 0:
							log('Hack single damage skill, with increased damage.');
							// show slash animation
							setTimeout(function(){
								var max = 50*self.player.atk;
								self.player.atk+=max;
								self.attackByPlayer(7);
								self.player.atk-=max;
							},400);

							
							break;
						case 1:
							log('Speed increase skill, with incrased critical');
							// show speed animation
							self.animation(8,1);

							// increase speed of auto-attack
							self.player.spd+=15;
							self.player.cri+=50;
							// set timeout of the speed expiration
							setTimeout(function(){
								self.player.spd-=15;
								self.player.cri-=50;
								// call animation end
							},5000);
							break;
						case 2:
							log('Armor increase defense ability.');							
							self.animation(8,2);
							break;
						case 3:
							log('Hit rate increase ability.');
							// set timeout of the hit expiration
							self.animation(8,3);
							break;
						case 4:
							log('Instant killing attack.');
							self.animation(8,4);

							var max = 999*self.player.lvl;
							self.player.atk+=max;
							self.player.hit+=max;
							self.player.cri+=max;
							self.attackByPlayer();
							self.player.atk-=max;
							self.player.hit-=max;
							self.player.cri+=max;
							break;
					}
				}
				else {
					self.attackByPlayer();	 // tap and display damage
				}				
				break; 
			case 4: // state of disconnected, cannot attack
				// show the disconnected word. cannot attack
				// disable skills
				self.assets.spriteButton.showDisconnectedMsg();
				break;
		}
		
	});
};


Tap.prototype.Passive = function(){
	var self = this;
	
	// i. player auto attack 
	var autoattackByPlayer = function(){
		if( Commons.ifanytrue(self.state,3,4) && self.player.hp>0 ) {
			self.attackByPlayer();	
		}		
		setTimeout(autoattackByPlayer, 800/self.player.spd)
	}
	autoattackByPlayer();

	// ii. monster auto attack
	var autoattackByMonster = function(){
		if( Commons.ifanytrue(self.state,3,4) && self.monster.hp>0 ) {
			self.attackByMonster();	
		}
		setTimeout(autoattackByMonster, 1000/self.monster.spd)	
	}
	autoattackByMonster();



	// iii. per second interval listener
	setInterval(function(){
		// cool down computation
		if( self.state == 3 ) {
			for(var i=0;i<self.skills.length;i++) {
				if(self.skills[i].cooldown>0) self.skills[i].cooldown--;
				self.assets.spriteButton.cooldownSkillButton(i,self.skills[i].cooldown);
			}			
		}

		if( self.state == 4 ) {
			for(var i=0;i<self.skills.length;i++) {				
				if(self.skills[i].cooldown>0) self.skills[i].cooldown--;
				self.assets.spriteButton.cooldownSkillButton(i,self.skills[i].cooldown,1);
			}			
		}

		if( Commons.ifanytrue(self.state,3,4) ) {
			

			if( self.cooldownglobal.online>0 ) {
				self.state=3;
				self.cooldownglobal.online--;
				self.assets.spriteButton.showOnline( self.cooldownglobal.online );
				if(self.cooldownglobal.online<=0)  {
					self.assets.spriteButton.showWarningAlert();
					setTimeout(function(){
						self.assets.spriteButton.hideWarningAlert();
						self.cooldownglobal.disconnected = 15	
					},2500);
					
				}
			}
			else if( self.cooldownglobal.disconnected>0 ) {
				self.state=4;
				self.cooldownglobal.disconnected--;
				self.assets.spriteButton.showOffline( self.cooldownglobal.disconnected );
				if(self.cooldownglobal.disconnected<=0) self.cooldownglobal.online=10;
			}
				
				

		}		



	},1000);
}

/*
Tap.prototype.Save = function() {
	if( !window.localStorage ) return;
	console.debug(window.localStorage);
	//window.localStorage["a"]= "json string";
}

Tap.prototype.Load = function() {
	if( !window.localStorage ) return;

	var j = window.localStorage["a"];
	if( j!=undefined && j!='' ) {
		log('Loading saved data.');
	}
	else {
		log('No saved data. Initializing map 1');
		this.player = new TapAvatar({type:0,exp:0});
		//this.monsterSpawn();
	}
}
*/


Tap.prototype.start = function(){

	

	// load state in local storage
	log('loading local saved data.');
	
	// play introduction
	this.animation(1);

	this.player = new TapAvatar({hp:100,mhp:100,type:0,exp:0});

	this.state = 1;

};

Tap.prototype.attackByPlayer = function(animation){

	// log('fn.attack')
	this.animation(animation ? animation : 5); // attack animation,

	if( this.monster.isalive ) {

		// regular flow of the game
		this.monsterDeal();

		// check if monster is dead, increase map
		this.monsterDied();

		// mini boss is every {10} and boss is every {50}. player get stuck at the mini-boss / boss level map if defeated.

	}

	
};


Tap.prototype.attackskill = function(x,y){
	var c = [20,110,200,290,380];
	for(var i=0;i<c.length;i++)
		if( x>c[i] && x<c[i]+75 && y>600 )
			return i;
	return -1;
};

Tap.prototype.attackByMonster = function(){
	log('attack by monster');
	this.playerDeal();
	//this.playerDied();


};

Tap.prototype.narration = function(){
	this.narrate = "godstwilight,tap to skip introduction,the path , ";
};

Tap.prototype.animation = function( animationid, param ){
	log('Animation id=' + animationid);

	switch( animationid ) {
		case 1: 
			// hide all existing
			/*
			this.assets.spriteBackground.hideLandFloor();
			this.assets.spriteButton.hideMapNumber();
			this.assets.spriteButton.hideSkillButtons();	
			this.assets.spriteButton.hidePlayerEnemyHealthBar();
			this.assets.spriteAvatar.hidePlayer();
			this.assets.spriteAvatar.hideMonster(this.monster.component);
			this.assets.spriteAvatar.hideGameOver();
			*/

			// show the title
			this.layers.background.saveBackgroundColorGradient('#222','#000');
			this.assets.spriteFont.showTitle(); 		
			this.assets.spriteButton.showUpfall();

			// this.assets.spriteButton.showWarningAlert();

			break;
		case 2: 
			this.assets.spriteFont.destroyTitle();
			this.assets.spriteFont.showStory(); 

			// this.assets.spriteButton.hideWarningAlert();

			
			break;
		case 3: 
			this.assets.spriteFont.destroyStory();
			this.assets.spriteButton.hideUpfall();
			break;
		case 4: 		
			// this.assets.spriteButton.showWarningAlert();
			this.layers.background.saveBackgroundColorGradient('#5aaa31','#a0c639');			
			this.assets.spriteBackground.showLandFloor();
			this.assets.spriteButton.showMapNumber(this.map);
			this.assets.spriteButton.showSkillButtons();	
			this.assets.spriteButton.showPlayerHealthBar(this.player.mhp,this.player.hp);
			this.assets.spriteButton.showEnemyHealthBar(this.monster.name,1);
			this.assets.spriteAvatar.showPlayer();
			break;
		case 5: // regular attack animation
			this.assets.spriteAvatar.normalSlash();
			break;
		case 6:
			this.assets.spriteAvatar.skillPreShow();
			break;
		case 7: 
			this.assets.spriteAvatar.swordDrop();
			break;
		case 8: 
			this.assets.spriteAvatar.showSkill(param);
			break;
	}

	// player attack 0-9 slash variation
	// player movement 0-3 slash variation
	// player rebirth
	// player skill 1
	// player skill 2
	// player skill 3
	// player skill 4
	// monster death 0-5 smoke variation
	// monster hit 
	// 
	return {
		onFinish:function() {

		}
	}
};


Tap.prototype.monsterSpawn = function(){	
	log('Spawning a new monster for map = ' + this.map);

	if( this.challege && this.map%20 == 0 ) {
		// boss
		this.monsterSpawnBoss();
	}
	else if( this.challege && this.map%10 == 0 ) {
		// mini-boss
		this.monsterSpawnMiniBoss();
	}
	else {
		// regular monster
		this.monsterSpawnRegular();
	}

	this.monster.hp = this.monster.mhp;
	

	this.assets.spriteButton.showEnemyHealthBar(this.monster.name,1);
};

Tap.prototype.monsterDeal = function() {	
	var dmg = Math.max(this.player.atk - this.monster.def,1);
	this.monster.hp-=dmg;
	this.monster.hp = Math.max(0,this.monster.hp);
	// log('Dealing damage to monster. dmg = ' + dmg + ' hp:' + this.monster.hp);
	// if(dmg>this.monster.mhp) dmg='limit';

	this.assets.spriteAvatar.showMonsterHit(this.monster.component);

	this.assets.spriteFont.showMonsterDamage(dmg);
	this.assets.spriteButton.showEnemyHealthBar(this.monster.name,this.monster.hp/this.monster.mhp)
};

Tap.prototype.monsterDied = function() {	
	if( this.monster.hp == 0 ) {

		this.monster.isalive = 0;
		
		if( this.challege ) this.map++; // increase map if player is in an open challenge

		var self = this;

		// this.player.xp+=this.monster.xp; // provided player experience points
		
		setTimeout(function(){
			self.assets.spriteFont.hideMonster(self.monster.component);

			setTimeout(function(){
				self.monsterSpawn();
				self.assets.spriteButton.showMapNumber(self.map);
				self.player.atk+=2;
				self.player.def+=1;
				self.player.spd+=0.001;
				self.player.mhp+=20;
				self.player.hp = Math.min(self.player.mhp, self.player.hp+50);
				self.assets.spriteButton.showPlayerHealthBar(self.player.mhp,self.player.hp);
				// health animation
			},1000)
			
		},50)

		
	}
};

Tap.prototype.playerDeal = function() {	
	var self = this, dmg = Math.max(this.monster.atk - this.player.def,1);
	this.player.hp-=dmg;
	this.player.hp = Math.max(0,this.player.hp);
	// log('Dealing damage to monster. dmg = ' + dmg + ' hp:' + this.monster.hp);
	// if(dmg>this.player.mhp) dmg='limit';

	this.assets.spriteFont.showPlayerDamage(dmg);
	this.assets.spriteButton.showPlayerHealthBar(this.player.mhp,this.player.hp);

	if(this.player.hp<=0) {		
		this.assets.spriteButton.showGameOver();
		this.state=0.5;
		setTimeout(function(){
			self.state=0;
		},2000);
	}
};

Tap.prototype.monsterSpawnRegular = function(){
	log('Spawning a regular monster.');

	//var monstertype = {};

	/*
	switch( Commons.choose(1,2) ) {
		case 1: monstertype = this.monsterSpawnTank(); break;
		case 2: monstertype = this.monsterSpawnDodge(); break;
	}
	*/

	// compute the avatar stats based on the current map	
	
	this.monster = new TapAvatar({
		name:this.monsterRegularName[Commons.choose(0,3)],
		mhp:(this.map*20),
		atk:this.map,
		hit:this.map,
		spd:Math.min(this.map*0.025,1),  
		component:this.assets.spriteAvatar.showMonster(0) 
	}); 	
};

Tap.prototype.monsterSpawnMiniBoss = function(){
	log('Spawning a mini-boss monster.');
	// compute the avatar stats based on the current map
	var c = this.map*2;

	this.monster = new TapAvatar({
		name:this.monsterMiniBossName[Commons.choose(0,2)],
		mhp:(this.map*40),
		atk:Commons.choose(c-5,c+5),
		spd:Math.min(this.map*0.05,2),  
		component:this.assets.spriteAvatar.showMonster(0) 
	}); 	
};

Tap.prototype.monsterSpawnBoss = function(){
	log('Spawning a boss monster.');
	// compute the avatar stats based on the current map

	var m = Math.floor((this.map/20)-1);
	if(m<0||m>2) m = this.monsterBossName.length-1;

	var c = this.map*2;

	this.monster = new TapAvatar({
		name:this.monsterBossName[m],
		mhp:(this.map*80),
		atk:Commons.choose(c-5,c+15),
		spd:Math.min(this.map*0.05,2),  
		component:this.assets.spriteAvatar.showMonster(0) 
	}); 
	
};

Tap.prototype.monsterSpawnTank = function(){
	log('Spawning a Tank monster.')	
	return {mhp:(this.map*1.2)+20,def:this.map*0.9};
};

Tap.prototype.monsterSpawnDodge = function(){	
	log('Spawning a Dodge monster.')	
	return {spd:this.map*1.2,eva:this.map*1.1};
};
/*
Tap.prototype.monsterTypeDef = function(){
};

Tap.prototype.monsterTypeEva = function(){
};

Tap.prototype.monsterTypeHp = function(){
};

Tap.prototype.monsterTypeAtk = function(){
};

Tap.prototype.monsterTypeSpd = function(){
};


Tap.prototype.monsterAttackAnimate = function(){
};

Tap.prototype.monsterDeadAnimate = function(){
	// check if monster is dead, display animation if monster is dead

};

Tap.prototype.buttonChallenge = function(){
};

Tap.prototype.buttonScreen = function(){
	// generic attack
};	

Tap.prototype.buttonSkill1 = function(){
};	

Tap.prototype.buttonSkill2 = function(){
};

Tap.prototype.buttonSkill3 = function(){
};

Tap.prototype.buttonSkill4 = function(){
};

Tap.prototype.buttonRebirth = function(){
};

Tap.prototype.buttonAttributeSet = function(){

};


Tap.prototype.unlockSkill = function(){
	// checks the skill requirements for unlocked
};


Tap.prototype.dps = function(a,d){
	// damage dealing between attacker and defender
};
*/

/** TapAvatar represents a player or monster in the Tap Engine.
 *  
 *
 *	function TapAvatar
 *	@constructor
 */
function TapAvatar( option ){ 
	this.name = "unknown";
	this.lvl = 1;
	this.type = 0; //0:balanced 1:power
	this.mhp = 1;
	this.hp = 1;
	this.atk = 1;
	this.hit = 1;
	this.spd = 1;
	this.def = 0;
	this.cri = 1;
	this.eva = 1; 
	this.exp = 1;
	this.isalive = 1;
	this.component;
	
	Commons.extend(this, option);
	
	for(var name in this) this[name] =  Commons.isString ? this[name] : Math.floor(Math.max(1,this[name]));

	// this.updateStatsByLevel();
} 


/** Compute the avatar statistics based on the provided lvl and type
 *  

TapAvatar.prototype.computeStats = function(){

}

TapAvatar.prototype.dealDamage = function(attackerAvatar){
	// compute for the 
	return {dmg:0,cri:0,exp:0};
}

TapAvatar.prototype.updateStatsByLevel = function(){
	// curve for level vs experience. linear and beizer.

	// compute the stats based on the level and type


}
 */



/** Initialize window event
 *  
 */
window.addEventListener("DOMContentLoaded", function(){		
	// i. load tap engine
	var tap = new Tap({
		layers:{
			background:new Canvas(),
			game:new Canvas(),			
			rearground:new Canvas(),
			hud:new Canvas(),
			foreground:new Canvas()
		}
	});
	
	// default dark background	
	tap.layers.background.bggrad = {colorstop1:'#222',colorstop2:'#000'};	

	// ii. load tap assets
	var assets = new TapAssets( tap );
	
	/* iii. display loading page after the font assets have been loaded
	assets.onFontsLoaded(function(){
		log('onFontsLoaded: Fonts have been loaded.');
	});
	*/

	// iv. call every loading calls
	assets.onLoading(function(counter){		
		assets.spriteFont.showLoading( counter );
	});

	// V. start tap engine after all the assets are loaded
	assets.onComplete(function(){
		log('onComplete: Starting tap engine.');		
		tap.start();
	});

});

/** TapAssets, 
 *	Contains the game assets image, music and sound effects
 *  
 *  function TapAssets
 *	@constructor
 *	@see {@link Canvas}
 */
function TapAssets( engine ) {	

	// i. allow assets to access engine canvas layers. !note: watch out for cyclic issues.
	this.engine = engine;

	var serialcounter = 0, self = this;

	// strings for display. transfer to SpriteFont.dictionary = []
	/**
	this.text = "loading,offline,mobilesuit,tap to continue,damage,health,defense,evasion,mini,boss,critical,great,combo,miss,dodge,"; // 15
	this.text += "overdrive,fighting,force,locally,independent,network,engine,"; //7 neural
	this.text += "year 28 ed,foriegn beings,called AXIAS,entered earth,for resource,monsters with,the ability,to distrupt,human thoughts,and energy waves,AXIAS brought,great disaster,human piloted,and controlled,weapons,were destroyed,or pacified,project OFFLINE,an advanced,weaponry system,was launched,it is an,autonomous,defense system,configured to,battle the AXIAS,you are a,COORDINATOR a,configurer of an,OFFLINE HUMANOID GEAR,your mission,to destroy,the AXIAS";

	this.text += "";

	this.text = this.text.split(',');
*/
	// i. shape font
	// var serial = ;

	/* TODO: shape font color, to be merge with serial.
	serial = Commons.base123.putdelimeter("") + //[fill,stroke,linewidth]...
		Commons.base123.putdelimeter("") +
		Commons.base123.putdelimeter("") + 
		Commons.base123.putdelimeter(serial);

	// TODO: in game buttons
	//serial += Commons.base123.putdelimeter(); // round button 
	//serial += Commons.base123.putdelimeter(); // sword
	//serial += Commons.base123.putdelimeter("}@$,#)#!%J%#^##^X#$X#$-! !.6.6!G.%%6"); // minus

	// 1. split the serialized data
	serial = Commons.base123.splitdelimeter(serial);

	// console.debug("serial.length:" + serial.length);
	*/
	// 2. initialize the sprite fonts
	/*
"9.,.$,@A,.+$)+!) jcZeUSaa=SaTufgbfaZaaa}ccUe@UVcX[Q]Z9 abcdefghijklmnopqrstuvwxyz0123456789 $'a!!!!&&$&_&a%`$'Y&_&]$34(T18$:'8)8'$^&=&X%$c(a&b&$e0c*d-$g9e2f6$n_kIo_$can`i`#Xa$TWVZTX$LVTVTV$<Y?V>V$:_<[;]$8a:`:a$'a5a*a&PE$L6PBN8$H8K4J4$DFF<DB#CH#JH#PG $.a!!!!&&$&a*a'a$((%_&*$Z'*&W%$a6^(b2$X>a8[=$XAV@V@$dI]CcF$dPeKeK$_^cVa[$.a[`>c&FU$IRHUHT$JIKPKJ$CHIIFH#=I#<N$=U<R<T$FU=VDV&F<$H6H<I9$?1G1D0#<2#<7$=<<:<<$F<><D< $@^!!!!&&$*Y8],Z$+/%V&:$7)-,0*$Z&D&X%$Z3['[2$P4Y3V4$B7G4C5$@M@:>J$OPAPEP$ZQTPYQ$[V[R]R$Z][X[[#Z_#P_$@^K_D_ $2b!!!!&&$&]'a&a$&/%X%7$'(&,'($W&)&N%$`*]']($e0a,d.#g3#gC#gR$_]cWaZ$VbZaYa$2bOc:c&KR$OCNQOM$L6O8N7$>6I4?4$=D<6<8#=R$KRBTJS $-_!!!!&&$'^*_(_$((%]&*$G%)&7%$U,V%V%#U1#J1$?2B2@2$?8?3?6#?<#I<#R=$SETCSD$IFRFPF$?GDF@G$?Q>H>P$IR?RCR$TRNRTR$T^UTV]$N_T^Q_$-_H_5_ $%`!!!!&&$%D%`%R$&(%/%($0&&'(&$S&:%R%$R1T'T0$G2R2P2$:8;2;2$F>:=:=#P>#PB$FHPHPH$<IAH<I$;T;J;K$9_;^;^$%`8`&a $Ob!!!!&&$M`NbNa$?]L]L]$&T0[)Y$%J%R%Q$--%<(2$<'/*4($V%C&P%$['Z%Z%$]0]+^/$Q2[1X2$@6E3B4$<I=9;D$EN=L>N$LJLOLO$LFLHLG$GFKFIF#DE$D>C@D>$V;E<J<$a;^:`:$abb<ca$ObacRc $&a!!!!&&$&D&a&S$&(%,%($:&(&7%#<'#<0#;9$K8?:J:$L/L8L6$W&L%L&#a&#aB$``a[a_$Va_a]a$LaPaLa$KVL`K]$CLKKLL$;V;L;L$:a;[;`$&a:b'c $&X!!!!&&$&/&U%8$'&&(&&$1%(&,&#:%#:0$8Y:@9X$/Z8Z4Z#'Z $&a!!!!&&$%Z%`%_$&T%W%T$-S&T)S$<O6R:Q$<:<N<H$>&<'<&$H%>&C&$R&P%Q%$SGT(T3$RZRQRZ$P]RZP[$&aI`*c $&]!!!!&&#%]#%B$&'%0%'$9&'&7&$:/:':($=8:8;9$E.>8A3#L%$a(T%`'$Y4a(^-$Q@U:R@$XNQBRD$`ZaXaY$R]_[Z]#K]$BQHYEU$:Q;H:H$:Z:V:Z$7]:[8]$&]3](^ $']!!!!&&$%3&[&L$&&%)&'$2%'&*%#<%#<9$>N<I=N$IN>NCN#TN#TT$TZTYTZ$']Q])^ $'a!!!!&&#%a#%S$'*%D&,$B'((@&$F/C(D*$N:I9K<$S0N9Q4$X&V*X&$m&Y&g%$u(s&t&$u=u(u2$wXvHvT$u`w_w_$a`saba$_Ta``Z$]G_H_F$UR[GXL$O_RXO^$K`N_M`$<JF`F_$8I:H9G$7U8J7O$5a6_6a$'a3a*b $*_!!!!&&$&D&^&_$&*%6%+$((&)&($C&,&@%$I1D&E($R>O=P?$T0S=T9$T(T,T($e&V'c&#g'#gA$f]gYg[$L_e]R_$FXJ_J^$@LEVBP$;F=F<F$8R8F8H$7^8[8]$*_6_,_ $0a!!!!&&$'X-a+_#%T#%C#%2#*,$2&.)0'$X&5&T%$c.]&_(#g4#hC#hS#dX$^`a]_`$Ga]aXa$0a<a2a&IT$NFNTNS$N8N@N:#M4#F4$>F=4>3$>T>R>T$IT@VFV $&_!!!!&&$&.%]%7$''&+&'$B%(%.%#V%$c<_-c7$ZHc>aB$ENVLTM$;P@O<P$:W:P:R$9_:]:_$/`8_4`$&_'`&_&G?$I7J>K<$F3H4H4$=2D2>2$<?<4:=$@@<A<A$G?B@E@ $Qb!!!!&&#N_#>_#/_$'T*Z(W#%P#%A#%2#*-$4'0(0($H&6&@&#X%#])$c0_+b.$f:e2e3$fRgDgP$cVfRdT#`Z$bad_d_$Ue`bWe$QbTeRd&CP$BMCPCN$DH@J@J$JHFGJG$LJKILJ$M?MJNH$D3M2M2$>4A3>4$=P<5<N$CP>QCQ $&^!!!!&&$&,%]%2$(&&(&'$N&*&F%$X)T&T&$a>].c:$[Da?_B#VI$aZ]QaZ$Q_`]X_#L_#FW$<O?O>O$:X;O:P$8_:^:^$&^5_&_&D@$I:H?I>$D4H5H4$<4B2>2$:::4:5$;@:=:@$D@<AAA $*a!!!!&&$(V)`(Y#(T#-S$@P6R>P$?JANAL$4H>J9I$(F.H(F#%E#&?$*-&9(2$7(,*,*$R%>&J%$Y,X%X%$P3Z2Y2$@6D4B4$?<?7>;$N?@=E>$ZCY@X@$XV]HZR$:`VYI^$*a.b+b $:^!!!!&&$8E8]8X#82#/2$&1*2'2$('%0'($L%*&4%#b%#b)$X/b.a.$R0U/R0$OJP2P:$N]NUN[$:^L];_ $+Y!!!!&&$'S*X(T#%O#%<$&(%-%($;''&:&$<9;'<.$<L<F<K$HL>MDM#JK#K9#K'$X&N&S&#b%#b:#cO$[X_T]V#X[#C]#.] $4^!!!!&&$'32Z+D$&(%+%)$9&''8&$=49';-$CD@ABD$K0DCF>$O'M,O'$b(Q%`&$^2c(a+$SL[8VD$L]PTL]$@_J^I^$4^7_5_ $0^!!!!&&$)>.[,Q$&*(4&+$''%(&($1'('-'$:(8':'$=2;(<-$@>>8?=$B>@?@?$F2B=D8$J'H-J($S&K&M&$^&X&]&$e8_'_'$j<g>i?$l1j<k6$n&m,m'$'o%~%$u^)w[$h_u^p_$Z_]_Z_$VSY^XX$NTTCRD#J_#=_$0^1_0_ $'`!!!!&&$%_&`%`$2G%],N#4C$'',5&($:&(&8%$?,;&<($K,D6D6#P%#Y%$e'c&e&$W;e(^2$RBT>RB$ZPRCVI$d^`Wd^$O_d_Pa$KZO_M]$DQHTEQ$=ZCQ@U$9`;]:_$'`8a,a $:^!!!!&&$9R:]:Z#9H$&'/;%)$0&&&)&$:&5&:&$?.:&=*$E7B2D6$L0G8H6$Q(N,P)#R%#[&$e&a&e&$Z8f'a.#OH#NR$N]NXN]$:^M^<_ $(a!!!!&&$%V'`%Z$.I%T&S$<46><6$32=2<2$&,'2&2$(&&'&&$R&+%Q&$T,T'T($T2T.T0$EJS5N>$>T@P>S$JT?TDT#UU#UZ$T`U]T_$>aSaOa$(a2a(a $,[!!!!&&$'T*Y(V$%B&P&P#%2#*-$4&0'0'$I&6&@&#Y%#_*$e0a-d0$gRg4hN$]^eU_]$D_Z^R_#/_&LP$NDNNNN$M8N?M9#L5#F5$>6@4?5$=C>6=:$>P=N=O$LP@QJQ $,Z!!!!&&$+F,Z,P#+2$&.%1%1$)'&*'($<%.&8%#@%#@/$>[@>>Z$4]=[9]$,Z,],] $,_!!!!&&$&])_&^$%L&[%P$&F&I&G$>:'F1@$B4B8C7$:3A2A2$.37313$'3*4'4$(*&2'-$*(())($B&,'6&$Q&O%P%$V7T*U/#V>$FHQBKF$<N>L<N$JR>QCR#VR#VV$Q_U]T^$,_L_2_ $'_!!!!&&$&T&]%V$,S&T(S$=P2R:Q$@N>P?N$>G@K@H$6F>G:F#0F$8<0<1<$=::;<;$<4>:>5$12;2:2$&0)2'2$)&&/((#+%#6%$N'B%H&$R,P(P)$T3S.T1#T6#P:#K?$XITCXG$TVXLVS$:`Q]N^$'_+a(a $G]!!!!&&$FWF]FZ$ERFSFR$6QDQ>Q$'P,Q(P$&K'P&M$(B%G%G$9(*<5,#;%#H&$Z)X&Z&$[7Z*[0$]D[>[D$_F]E]F$cLcFcF#cP#[V$Z[[XZ[$G]Y]H^&FC$F<FCF@$E4F6F4$;C@9;B$FC<DDD $+_!!!!&&$(T*_(X$2Q)R)R$@M:P?N$@J@M@L$4F@H?H$&C*E&D$)'%@(($F%+&8%$V&T%U%$V0V(W/$J1V1S1$<6<2<2$=:<8<:$I<>:C<$V?O=T>$VRX@YJ$RWVTUU$=]MYF[$+_2_,` $7`!!!!&&$-^4`0_$%L&[&Z$**%='.$0(**-)$O&6'H%#T&$V0W,W/$Q2V1T2$<6I2=5$;9;6;8#<<#D<$Z@L=V?$^B[@]B$YY_E[T$T^X]X]$7`LaBa&GR$HNGRHP$@JIJHJ$:P9J9J$<S:Q;R$GR>TFS $,^!!!!&&$0J&]&]$:65@:8$<2<4<2$02;262#%2#%-$&'%*&($N&(&C%#R&$LAV0V0$>WGJAS#:_#4_$,^1_-_ $4_!!!!&&$(X*_*^$&J&T%L$*F&J(H$/B-D/B$+>/B-@$&:)<':$-(&6*($T&2&O%$_2Y(_.$X<_5[9$T@V>T?$YBT@VA$aG]D_F$cMcIcJ$Z]bQ]Z$E`W_Q`$4_>`7`&HR$IJJOJK$<JHI>I$:N:J:L$BT:S<T#HT&F:$F2H9H4$=2D0>0$<:<4;9$F:><D< $0`!!!!&&$-V/_-X$6R-T-T$DP<RBP$HMGOGN$GJHLHJ$:IGJ@J$'E(H(H$.(%>**$T'2&I%$X+V'V($^I]3^=$[T]O]R$TYZWZW$0`K]3a&H8#H4#C4#>4$<<<9<<$B<=<@<#H<#H8"
	*/
	

	var a = "9.,.$,@A,.+$)+!) jcZeUSaa=STufgbaZaaa}cce@UVcX[Q]Z9 abcdefghijlmnoprstuvwxy0123456789 $'a!!!!&&$&_&a%`$'Y&_&]$34(T18$:'8)8'$^&=&X%$c(a&b&$e0c*d-$g9e2f6$n_kIo_$can`i`#Xa$TWVZTX$LVTVTV$<Y?V>V$:_<[;]$8a:`:a$'a5a*a&PE$L6PBN8$H8K4J4$DFF<DB#CH#JH#PG $.a!!!!&&$&a*a'a$((%_&*$Z'*&W%$a6^(b2$X>a8[=$XAV@V@$dI]CcF$dPeKeK$_^cVa[$.a[`>c&FU$IRHUHT$JIKPKJ$CHIIFH#=I#<N$=U<R<T$FU=VDV&F<$H6H<I9$?1G1D0#<2#<7$=<<:<<$F<><D< $@^!!!!&&$*Y8],Z$+/%V&:$7)-,0*$Z&D&X%$Z3['[2$P4Y3V4$B7G4C5$@M@:>J$OPAPEP$ZQTPYQ$[V[R]R$Z][X[[#Z_#P_$@^K_D_ $2b!!!!&&$&]'a&a$&/%X%7$'(&,'($W&)&N%$`*]']($e0a,d.#g3#gC#gR$_]cWaZ$VbZaYa$2bOc:c&KR$OCNQOM$L6O8N7$>6I4?4$=D<6<8#=R$KRBTJS $-_!!!!&&$'^*_(_$((%]&*$G%)&7%$U,V%V%#U1#J1$?2B2@2$?8?3?6#?<#I<#R=$SETCSD$IFRFPF$?GDF@G$?Q>H>P$IR?RCR$TRNRTR$T^UTV]$N_T^Q_$-_H_5_ $%`!!!!&&$%D%`%R$&(%/%($0&&'(&$S&:%R%$R1T'T0$G2R2P2$:8;2;2$F>:=:=#P>#PB$FHPHPH$<IAH<I$;T;J;K$9_;^;^$%`8`&a $Ob!!!!&&$M`NbNa$?]L]L]$&T0[)Y$%J%R%Q$--%<(2$<'/*4($V%C&P%$['Z%Z%$]0]+^/$Q2[1X2$@6E3B4$<I=9;D$EN=L>N$LJLOLO$LFLHLG$GFKFIF#DE$D>C@D>$V;E<J<$a;^:`:$abb<ca$ObacRc $&a!!!!&&$&D&a&S$&(%,%($:&(&7%#<'#<0#;9$K8?:J:$L/L8L6$W&L%L&#a&#aB$``a[a_$Va_a]a$LaPaLa$KVL`K]$CLKKLL$;V;L;L$:a;[;`$&a:b'c $&X!!!!&&$&/&U%8$'&&(&&$1%(&,&#:%#:0$8Y:@9X$/Z8Z4Z#'Z $&]!!!!&&#%]#%B$&'%0%'$9&'&7&$:/:':($=8:8;9$E.>8A3#L%$a(T%`'$Y4a(^-$Q@U:R@$XNQBRD$`ZaXaY$R]_[Z]#K]$BQHYEU$:Q;H:H$:Z:V:Z$7]:[8]$&]3](^ $']!!!!&&$%3&[&L$&&%)&'$2%'&*%#<%#<9$>N<I=N$IN>NCN#TN#TT$TZTYTZ$']Q])^ $'a!!!!&&#%a#%S$'*%D&,$B'((@&$F/C(D*$N:I9K<$S0N9Q4$X&V*X&$m&Y&g%$u(s&t&$u=u(u2$wXvHvT$u`w_w_$a`saba$_Ta``Z$]G_H_F$UR[GXL$O_RXO^$K`N_M`$<JF`F_$8I:H9G$7U8J7O$5a6_6a$'a3a*b $*_!!!!&&$&D&^&_$&*%6%+$((&)&($C&,&@%$I1D&E($R>O=P?$T0S=T9$T(T,T($e&V'c&#g'#gA$f]gYg[$L_e]R_$FXJ_J^$@LEVBP$;F=F<F$8R8F8H$7^8[8]$*_6_,_ $0a!!!!&&$'X-a+_#%T#%C#%2#*,$2&.)0'$X&5&T%$c.]&_(#g4#hC#hS#dX$^`a]_`$Ga]aXa$0a<a2a&IT$NFNTNS$N8N@N:#M4#F4$>F=4>3$>T>R>T$IT@VFV $&_!!!!&&$&.%]%7$''&+&'$B%(%.%#V%$c<_-c7$ZHc>aB$ENVLTM$;P@O<P$:W:P:R$9_:]:_$/`8_4`$&_'`&_&G?$I7J>K<$F3H4H4$=2D2>2$<?<4:=$@@<A<A$G?B@E@ $&^!!!!&&$&,%]%2$(&&(&'$N&*&F%$X)T&T&$a>].c:$[Da?_B#VI$aZ]QaZ$Q_`]X_#L_#FW$<O?O>O$:X;O:P$8_:^:^$&^5_&_&D@$I:H?I>$D4H5H4$<4B2>2$:::4:5$;@:=:@$D@<AAA $*a!!!!&&$(V)`(Y#(T#-S$@P6R>P$?JANAL$4H>J9I$(F.H(F#%E#&?$*-&9(2$7(,*,*$R%>&J%$Y,X%X%$P3Z2Y2$@6D4B4$?<?7>;$N?@=E>$ZCY@X@$XV]HZR$:`VYI^$*a.b+b $:^!!!!&&$8E8]8X#82#/2$&1*2'2$('%0'($L%*&4%#b%#b)$X/b.a.$R0U/R0$OJP2P:$N]NUN[$:^L];_ $+Y!!!!&&$'S*X(T#%O#%<$&(%-%($;''&:&$<9;'<.$<L<F<K$HL>MDM#JK#K9#K'$X&N&S&#b%#b:#cO$[X_T]V#X[#C]#.] $4^!!!!&&$'32Z+D$&(%+%)$9&''8&$=49';-$CD@ABD$K0DCF>$O'M,O'$b(Q%`&$^2c(a+$SL[8VD$L]PTL]$@_J^I^$4^7_5_ $0^!!!!&&$)>.[,Q$&*(4&+$''%(&($1'('-'$:(8':'$=2;(<-$@>>8?=$B>@?@?$F2B=D8$J'H-J($S&K&M&$^&X&]&$e8_'_'$j<g>i?$l1j<k6$n&m,m'$'o%~%$u^)w[$h_u^p_$Z_]_Z_$VSY^XX$NTTCRD#J_#=_$0^1_0_ $'`!!!!&&$%_&`%`$2G%],N#4C$'',5&($:&(&8%$?,;&<($K,D6D6#P%#Y%$e'c&e&$W;e(^2$RBT>RB$ZPRCVI$d^`Wd^$O_d_Pa$KZO_M]$DQHTEQ$=ZCQ@U$9`;]:_$'`8a,a $:^!!!!&&$9R:]:Z#9H$&'/;%)$0&&&)&$:&5&:&$?.:&=*$E7B2D6$L0G8H6$Q(N,P)#R%#[&$e&a&e&$Z8f'a.#OH#NR$N]NXN]$:^M^<_ $(a!!!!&&$%V'`%Z$.I%T&S$<46><6$32=2<2$&,'2&2$(&&'&&$R&+%Q&$T,T'T($T2T.T0$EJS5N>$>T@P>S$JT?TDT#UU#UZ$T`U]T_$>aSaOa$(a2a(a $,Z!!!!&&$+F,Z,P#+2$&.%1%1$)'&*'($<%.&8%#@%#@/$>[@>>Z$4]=[9]$,Z,],] $,_!!!!&&$&])_&^$%L&[%P$&F&I&G$>:'F1@$B4B8C7$:3A2A2$.37313$'3*4'4$(*&2'-$*(())($B&,'6&$Q&O%P%$V7T*U/#V>$FHQBKF$<N>L<N$JR>QCR#VR#VV$Q_U]T^$,_L_2_ $'_!!!!&&$&T&]%V$,S&T(S$=P2R:Q$@N>P?N$>G@K@H$6F>G:F#0F$8<0<1<$=::;<;$<4>:>5$12;2:2$&0)2'2$)&&/((#+%#6%$N'B%H&$R,P(P)$T3S.T1#T6#P:#K?$XITCXG$TVXLVS$:`Q]N^$'_+a(a $G]!!!!&&$FWF]FZ$ERFSFR$6QDQ>Q$'P,Q(P$&K'P&M$(B%G%G$9(*<5,#;%#H&$Z)X&Z&$[7Z*[0$]D[>[D$_F]E]F$cLcFcF#cP#[V$Z[[XZ[$G]Y]H^&FC$F<FCF@$E4F6F4$;C@9;B$FC<DDD $+_!!!!&&$(T*_(X$2Q)R)R$@M:P?N$@J@M@L$4F@H?H$&C*E&D$)'%@(($F%+&8%$V&T%U%$V0V(W/$J1V1S1$<6<2<2$=:<8<:$I<>:C<$V?O=T>$VRX@YJ$RWVTUU$=]MYF[$+_2_,` $7`!!!!&&$-^4`0_$%L&[&Z$**%='.$0(**-)$O&6'H%#T&$V0W,W/$Q2V1T2$<6I2=5$;9;6;8#<<#D<$Z@L=V?$^B[@]B$YY_E[T$T^X]X]$7`LaBa&GR$HNGRHP$@JIJHJ$:P9J9J$<S:Q;R$GR>TFS $,^!!!!&&$0J&]&]$:65@:8$<2<4<2$02;262#%2#%-$&'%*&($N&(&C%#R&$LAV0V0$>WGJAS#:_#4_$,^1_-_ $4_!!!!&&$(X*_*^$&J&T%L$*F&J(H$/B-D/B$+>/B-@$&:)<':$-(&6*($T&2&O%$_2Y(_.$X<_5[9$T@V>T?$YBT@VA$aG]D_F$cMcIcJ$Z]bQ]Z$E`W_Q`$4_>`7`&HR$IJJOJK$<JHI>I$:N:J:L$BT:S<T#HT&F:$F2H9H4$=2D0>0$<:<4;9$F:><D< $0`!!!!&&$-V/_-X$6R-T-T$DP<RBP$HMGOGN$GJHLHJ$:IGJ@J$'E(H(H$.(%>**$T'2&I%$X+V'V($^I]3^=$[T]O]R$TYZWZW$0`K]3a&H8#H4#C4#>4$<<<9<<$B<=<@<#H<#H8";
	console.debug(a.split(' ')[18],'abcdefghijklmnopqrstuvwxyz0123456789'.indexOf('z')); //11 17 25
	// kqz


	var baseFont = (new ShapeFont()).import( a ).set({alignment:7, scale:0.3, fontnum:0});


	// 3. initialize the buttons		
	var sg = new ShapeGroup();
	sg.import("}@#####!66*#+ #%%%%!22'.]");
	
	var skillBgButtons = sg.toSpriteSheet("+#*&%'+#*$%'+#**%'+#*)%'i+$k#%",{alignment:6,opacity:0,y:120});//.set({alignment:6,opacity:1,y:120}); 
	
	// 4. initialize the sprites
	/*
	var bodySprite = (new ShapeGroup()).import("FY$<RGU!#'!#@J#NJ#RR#M[#G_#@Z! $2XHi!#'##;X#C`#M`#VX#`X#Og#Ol#_#Px#Mt#Ct#?x#2#Al#Ag! !DYDY!),##' !CgCg!+4##' !DdDd!)*##' #CwCw!+%##' #DkDk!)$##'").toSprite().set({opacity:1,scale:0.5});

	var feetSprite = (new ShapeGroup()).import("FY!C<C<!15!#& !AJAJ!5?##4 !FFFF!+A##$ !ChCh!12##$ $BxBx!#$#%>={!#<#J#Y#V%SxW{!! ").toSprite().set({opacity:1,scale:0.5});
	*/

	var padlockSprite = (new ShapeGroup()).import("FY!'5'5!;5(!1 $'5'5!!3(#).#=.#@5#=5#90#-0#*5! #0808!((%!# !2<2<!$)%!#").toSprite().set({y:108,alignment:6,opacity:0,scale:0.3});

	//self.engine.layers.game.saveComponent(bodySprite,feetSprite);			

	//var swordShapeGroup = (new ShapeGroup()).import("}@$F_&$!#+$#A]#?5#F)#M5#K]#F_ $;^$^!#N&#=[#O[#Q^#H_#Hn#Dn#D_#;^ $E,E$!#U$#@5#BY#DS#E,");
	//var swordSheets = swordShapeGroup.toSpriteSheet(".#$0#&5#$p#$G#&r#$"); //fill,stroke,linewidth (blade,handle,glare) yellow blade, black blade, jade blade

	// self.engine.layers.game.saveComponent(swordSheets);			

	//var swordSprite = swordSheets[2].set({alignment:6,opacity:0});
	var swordSprite =(new ShapeGroup()).import("}@$F_&$!#+$#A]#?5#F)#M5#K]#F_ $;^$^!#N&#=[#O[#Q^#H_#Hn#Dn#D_#;^ $E,E$!#U$#@5#BY#DS#E,").toSprite({alignment:6,opacity:0});


	var runningSprite = (new ShapeGroup()).import("FY$/7/7!###48#7;#=5#@8#9>#4<#3C#8E#9L#4L#3G#0E#/H#(H#'C#,D#.<#*<#)?#&>#(9! #./12!++!# !$@$@!9!%++ !(B(B!(!#++ !+E+E!3!%++ !-?-?!1!#++ !$;$;!)!#++ !$F$F!+!$++ !$=$=!0!$++ !(C(>!-!&++").toSprite().set({alignment:6,opacity:0});

	var armorSprite = (new ShapeGroup()).import("FY$#2#9!#$)##-#;-#;B#5J#)J##A##6#&6! $%2%;!#!##%/#9/#9A#4H#*H#%A#%8#*8! $-9!!!#+&#-5#15#19#59#5<#1<#1C#-C#-<#)<#)9#-9").toSprite().set({alignment:6,opacity:0});

	var eyeSprite = (new ShapeGroup()).import("FY#;O;O!>=)	 #BUBU!001	# #KUKU!''#+ $;Z/9!		#$WZBVNU$;ZXRBE").toSprite().set({alignment:6,opacity:0});

	var breakSprite = (new ShapeGroup()).import("FY$'J!%!d'&##J#&H#$F#'E#%@#'B#%8#';#&3#(7#'0#*5#)/#,5#+/#.2#11#2/#24#60#46#72#39#86#5;#79#6>#8<#5A#9>#6D#:A#6G#9G#7I#<J#6J#(J $)?)?!!+!#+;#,=#+A#(G#'K#+K#+G#-C#-C#0G#0K#4K#3G#0A#/=#0;#2?#4?#3;#/8#,8#(;#(=#'?! $*?*?!!g!#,;#-=#,A#)G#(K#,K#,G#.C#.C#1G#1K#5K#4G#1A#0=#1;#3?#5?#4;#08#-8#);#)=#(?! #+3+3!))#!g $(R!!!!g##1R").toSprite().set({alignment:6,opacity:0});

	var landBg = (new ShapeGroup()).import("FY!!!!!!FY#!f").toSprite().set({alignment:4,y:180,opacity:0});
	var floorBg = (new ShapeGroup()).import("FA!!!!!!FA#!f $!!(,!!K##F!#F(#5,#+'#!(").toSprite().set({alignment:4,y:180,opacity:0});;

	var monster1 = (new ShapeGroup()).import("FY$;H^!#<'$)I,s&c$fH,/g/$Ukces#O|#H#A|! $.B2:!#='$79'80, $Z:b6!#=#$cA_-l3 #1818_&$### #`7_94$'### $;	HV!#%'$/D.t&[$bC72[4$UjZdt#Ox#H#Ax! $)V(_!#='##f#+b $gUg`!#='#nd#g` $:kHP!!&'$6A;X.Z$[A<6U7$Vmc[UV#Nf#Gn#Bf! #@D@D@%(### #ODOD_(%### #@F@F!#$## #NFNF!#$##").toSprite({x:125,y:140,scale:0.8});
	//var monster2 = (new ShapeGroup()).import("FY$;W>^!#8'$[VIOPR$j|kQot$WcW$.9}>$*g*v*g$;W-X-T #KbKb!**'#% #<b<b!**'#% #?f?f!$%'#8 #MfMf!$%'#8 $9u=!#Y'$Sr>pLq$Hy_to|$9u9|.|").toSprite({x:125,y:140,scale:0.8});
	//var monster3 = (new ShapeGroup()).import("FY$=n=n!-%)#+#Cv#Nv#h#Vo#_i#lm#S[#>[#(h#8e#=n $4O4O!#?)#BG#PG#`P#`Y#Vb#Kh#;b#4Z! $>N>N!#!'#ES#?S#>N $QSMQ!#!'#RN#KS! #@P@P!#$'#9 #NPNP!#$'#9 #D^D^!+!)-%").toSprite({x:125,y:140,scale:0.8});
	//self.engine.layers.background.saveComponent(monster1);			
	//var monsters = [];
	//monsters.push(monster1)

	var player = (new ShapeGroup()).import("FY#7676!31(,9 $<X<K!,6(#5Z#0Y#.^#0_#3`#6^#<]#FP! $:p3q!,/.#4e#A[#TY#iq#ns#ow#cw#dt#Tc#Kb#=g#@t#>v#2v#3r#5p! $SWSV!,4.#ID#:F#:R#C[! $AYAU!,4.#@]$UXE_RZ#TW! $BH@J!,4(#DN#JR#KM#IG! $EIEI!,,(#HI#IL#IN#FL! $;L;L!,6(#4]#.`#.a#0c#3c#5`#<Z#AM! $8M8M!,6(#=O#BM$9IBH<C! $>@=A!,$(#8C#9>#4A#99#0;#75#-4#90#2*#A-#>*#D+#F&#I,$V+I,P.#O6#S6#O9$U@M9U@#M>#NH#J@#FK#EB#<J!").toSprite({scale:0.2,x:200,y:472,opacity:0});
	

	var sword = swordSprite.clone({alignment:0,x:147,y:478,scale:0.27,opacity:0});
	sword.saveOrigin({x:147,y:478,angle:-30});


	var slash1 = (new ShapeGroup()).import("FY$r[2!!980$^z04+B#n|$s^AIQG!").toSprite({scale:0.4,x:86,y:360,opacity:1});
	slash1.saveOrigin({angle:-60,x:86+150,y:360+100});
	slash1.saveTrait(new Fade({speed:{fade:0.1}}));

	var warningline =  (new ShapeGroup({tile:{x:20,y:1,xw:45,yw:0}})).import("FY!$.$.!,)0## $).(-!aa(#%5#*5#..!").toSprite();

	var healthbar = new Shape({sizeoffset:4}).import("$-3%2!#,&$-6+3+6#i6$i3k6k3#-3").saveTrait(new ShapeMoveTo());
	
	

	//self.engine.layers.background.saveComponent(warningline);					
	/*
	var meachahead = (new ShapeGroup()).import("FY$=i=i!#+##<n#?q#Cr#Jr#Oq#Rn#Qi#=i $/K8J!#+#$;k1V5c#Gp#Tk$`KYc^V#/K $USUQ!#!##TW#RY#LZ#JX! $8T:T!#!##9W#;Y#BZ#DX! $7T7T##+##9M#SM#VT$7TMZ@Z $*A.D!#+##G[#f@#GN! $DZA`!#+##JZ#S^$KoPgNl#Gq#Co$;]@l=g#DZ $E`Dd!#+##I`#Kd#Ki#Iq#Eq#Ci#Cd#E`").toSprite({opacity:0.3,x:70,y:100,scale:1.2});
	self.engine.layers.game.saveComponent(meachahead);					
	*/

	var upfall = (new ShapeGroup()).import("_&!#!#!!!'&++").toSprite({x:25,y:805,opacity:0.5});
	upfall.saveTrait(new Fade({type:1,y:-999,speed:{fade:0.1,moveto:22}}));

	// 10. ayncronous timeout to allow sprite rendering gaps
	setTimeout(function(){ 
		// i. load the sprite font
		self.spriteFont = self._spriteFont( baseFont );	

		self.spriteButton = self._spriteButton( 
			baseFont.set({fontnum:2}), 
			skillBgButtons, 
			padlockSprite, 
			swordSprite.set({y:115,scale:0.23}), 
			runningSprite.set({y:125,scale:0.45}),
			armorSprite.set({y:116,scale:0.4}),
			eyeSprite.set({y:170,scale:0.4}),
			breakSprite.set({y:125,scale:0.45}),
			warningline,
			healthbar.set({opacity:0}),
			upfall
		);

		self.spriteBackground = self._spriteBackground( landBg, floorBg );

		self.spriteAvatar = self._spriteAvatar(player, monster1, sword, slash1,
			runningSprite, armorSprite, eyeSprite, breakSprite
			);
		
		self.phases();		
	});
}

TapAssets.prototype._spriteFont = function( base ) {
	var self = this, a1, b1, c1;
	
	// i. initialize fonts and add to the required canvas
	this.fonts = { 
		load:{ 
			text:base.clone().set({text:'loading', scale:0.4, x:-75, y:-30}), 
			counter:base.clone().set({text:'0', x:-10}) 
		}, 		
		story:{
			plot:base.clone().set({alignment:4,x:40,scale:0.35,}),
			plots:[]
		},
		damage:{
			monster:base.clone({fontnum:3}), 
			player:base.clone({fontnum:1}) 
		}		
	};

	
	self.engine.layers.hud.saveComponent(self.fonts.load.text, self.fonts.load.counter);


	//loading,offline,mobilesuit,tap to continue

	this.showLoading = function( number ){
			self.fonts.load.counter.set( { text:number+24+'' } );			
			// self.engine.layers.game._flag.redraw = 1;
		}
	this.destroyLoading = function(){
			self.fonts.load.text.saveTrait(new Fade({y:self.fonts.load.text.y-50}));
			self.fonts.load.counter.saveTrait(new Fade({y:self.fonts.load.counter.y-50}))
		}
	this.showTitle =  function() {
			a1 = base.clone().set({x:-145, y:-280, opacity:0, scale:0.8,text:'offline'}).saveTrait(new Fade({
					type:1,
					y:200,
					speed:{fade:0.02,moveto:2}
			}));
			b1 = base.clone().set({x:-80, y:-130, opacity:0, text:'mobilesuit'})
				.saveTrait(new Fade({
					type:1,
					y:250,
					speed:{fade:0.02,moveto:2}
			}));
			c1 = base.clone().set({x:-80, y:100, opacity:0, scale:0.2, text:'tap to continue'}) 
				.saveTrait(new Fade({
					type:2,
					y:450,
					speed:{fade:0.02,moveto:2}
			}));
			self.engine.layers.hud.saveComponent(a1,b1,c1);
		}
	this.destroyTitle = function(){
			a1.getTraitByClass(Fade).type=0;
			b1.getTraitByClass(Fade).type=0;
			c1.getTraitByClass(Fade).type=0;
		}
	this.showStory = function(){
			var spacing = 700 , story = "year 28 ed,foriegn beings,called AXIAS,entered earth,for resource,monsters with,the ability,to distrupt,human thoughts,and energy waves,AXIAS brought,great disaster,human piloted,and controlled,weapons,were destroyed,or pacified,project OFFLINE,an advanced,weaponry system,was launched,it is an,autonomous,defense system,configured to,battle the AXIAS,you are a,COORDINATOR a,configurer of an,OFFLINE HUMANOID GEAR,your mission,to destroy,the AXIAS".split(",");


			for(var i=0; i<33; i++) {
				var s = self.fonts.story.plot.clone();								
				self.fonts.story.plots.push(s);
				self.engine.layers.game
					.saveComponent(s)
					.set({
						text:story[self.fonts.story.plots.length],
						opacity:0,
						y:spacing
						})
					.saveTrait(new Fade({
						type:1,
						y:-100,
						speed:{fade:0.008,moveto:1}
						}));	
				spacing += (Commons.ifanytrue(i,4,9,11,16,20,25,29) ? 64 : 32);
			}
			

			/*
			Commons.timeout(function(){
				if(self.engine.state==2 && self.fonts.story.plots.length<33)
					self.spriteFont.showStory()
			}, Commons.ifanytrue(self.fonts.story.plots.length,5,10,12,17,21,26,30) ? 2200 : 1000 );
			*/
		}
	this.destroyStory = function(){
			for(var i=0;i<self.fonts.story.plots.length;i++){
				self.fonts.story.plots[i].getTraitByClass(Fade).type=0;
			}
		}
		
	this.showMonsterDamage = function( number ){
			// display the monster damage value
			var m = base.clone({fontnum:3});

			self.engine.layers.game
				.saveComponent(m)	
				.set({
					text:number+'',
					x:Commons.choose(m.x-20,m.x+20),
					scale:0.6
					})
				.saveTrait(new Fade({
					y:m.y-150,
					speed:{fade:0.05,moveto:3}
					}));

		}
	this.showPlayerDamage = function( number ){
			// display the player damage value			
			var m = base.clone({
				text:number+'',					
				x:Commons.choose(-20,20),
				y:150,
				scale:0.4, fontnum:1
				});
			self.engine.layers.game
				.saveComponent(m)
				.saveTrait(new Fade({
					y:m.y-100,
					speed:{fade:0.035,moveto:3}
					}));
		}	





	return this;
}	



TapAssets.prototype._spriteAvatar = function(player, monsters, sword, slash1, runningSprite, armorSprite, eyeSprite, breakSprite) {
	var self = this, swordclone = sword.clone({opacity:1});

	
	this.engine.layers.game.saveComponent(sword,slash1.clone(),player);					

	this.showPlayer = function() {
		player.set({opacity:1});
		sword.set({opacity:1});
	}
/*
	this.hidePlayer = function() {
		player.set({opacity:0});
		sword.set({opacity:0});
	}*/


	this.normalSlash = function(){		
		if( sword.x<999 ) {
			sword.x = 1107;
			sword.mirror = 1;
			sword.saveOrigin({x:1107});
			player.x=300;
			player.mirror = 1;			
			var c = slash1.clone();
			c.saveOrigin({angle:Commons.choose(-60,30)});

			this.engine.layers.game.saveComponent(c);
		}
		else {
			sword.x = 147;
			sword.mirror = 0;
			sword.saveOrigin({x:147});
			player.x=200;
			player.mirror = 0;		

			var c = slash1.clone();
			c.saveOrigin({angle:Commons.choose(-60,30),x:176+150});
			c.x = 176;
			c.mirror=1;

			this.engine.layers.game.saveComponent(c);
		}		
	}

	this.skillPreShow = function(){
		var initial = this.engine.layers.background.bggrad;
		this.spriteButton.showUpfall();
		this.engine.layers.background.bggrad = {colorstop1:'rgba(255,0,0,0.2)',colorstop2:'#a0c639'};
		setTimeout(function() {
			self.spriteButton.hideUpfall();
			self.engine.layers.background.bggrad = initial;
		}, 1200);
	}

	this.swordDrop = function() {		
		var c = swordclone.clone({y:600,scale:1.4});
		c.saveOrigin({angle:180,x:290})
		c.saveTrait(new Fade({y:c.y-400, speed:{fade:0.015,moveto:40}}));
		this.engine.layers.game.saveComponent(c);		
	}		

	this.showSkill = function(skillno){
		var c = swordclone.clone();
		switch(skillno) {
			case 1:  // runningSprite
				c = runningSprite.clone({opacity:1,x:-80,y:300,scale:1})				
				break;
			case 2: // armorSprite
				c = armorSprite.clone({opacity:1,x:-120,y:400,scale:2})				
				break;
			case 3: // eyeSprite
				c = eyeSprite.clone({opacity:1,x:-220,y:600,scale:1.4})				
				break;
			case 4: // breakSprite
				c = breakSprite.clone({opacity:1,x:-90,y:420,scale:2})				
				break;
		}

		c.saveTrait(new Fade({y:c.y-600, speed:{fade:0.015,moveto:2}}));
		this.engine.layers.game.saveComponent(c);		
	}

	this.showMonster = function(id) {
		// var m = monsters[Commons.choose(0,1)].clone();
		return this.engine.layers.background.saveComponent( monsters.clone() );		
	}	

	this.showMonsterHit = function(c) {

		if(c) c.set({x:c.x-10});
		setTimeout(function() {
			if(c) c.set({x:c.x+20});
			setTimeout(function() {
				if(c) c.set({x:c.x-10});
			}, 20);	
		}, 20);	
	}

	this.hideMonster = function(c) {
		if(c) c.destroy();
	}

	

	return this;			
}



TapAssets.prototype._spriteBackground = function( landBg, floorBg ) {
	var self = this;

	var land = [];
	var floor = [];

	// ground area
	for(var i=0;i<4;i++) {		
		var landclone = landBg.clone({x:120*i}), floorclone = floorBg.clone({x:120*i});
		land.push(landclone);
		floor.push(floorclone);
		self.engine.layers.rearground.saveComponent(landclone, floorclone);			
	}

	// landbg is green for backdrop
	

	this.showLandFloor = function() {
		for(var i=0;i<4;i++) {		
			land[i].set({opacity:1});
			floor[i].set({opacity:1});
		}
	}
/*
	this.hideLandFloor = function() {
		for(var i=0;i<4;i++) {		
			land[i].set({opacity:0});
			floor[i].set({opacity:0});
		}
	}
	*/

	return this;	
}


TapAssets.prototype._spriteButton = function( baseFont, skillBgButtons, 
		padlockSprite,	swordSprite, runningSprite, armorSprite, eyeSprite, breakSprite, warningline, healthbar, upfall) {
	var self = this;

	baseFont = baseFont.clone().set({alignment:6,x:-120,opacity:0,scale:0.15,y:30})

	var fonts = [
		baseFont.clone({text:'hack',x:-200}),
		baseFont.clone({text:'speed',x:-113}),
		baseFont.clone({text:'armor',x:-28}),
		baseFont.clone({text:'focus',x:68}),
		baseFont.clone({text:'power',x:155}),
		baseFont.clone({x:-195,y:85}),
		baseFont.clone({x:-101,y:85}),
		baseFont.clone({x:-15,y:85}),
		baseFont.clone({x:73,y:85}),
		baseFont.clone({x:163,y:85}),
		baseFont.clone(), // 10: map number font		
		baseFont.clone({alignment:3,fontnum:5}), // 11: monstername name
		baseFont.clone({alignment:3,fontnum:5}), // 12: player health
		baseFont.clone({alignment:3,y:125,scale:0.3}), // 13: state offline or online
		baseFont.clone({alignment:3,scale:0.8}), // 14: game over
		baseFont.clone({alignment:3,scale:0.4}), // 15: game over details
		baseFont.clone({alignment:3,scale:0.3}), // 16: game over details
		baseFont.clone({alignment:3,scale:0.3}) // 17: game over details		
	];

	var mapButtons = [
		skillBgButtons[5].clone().set({alignment:3,x:-40,y:10}),
	];

	var skillbuttons = [
		skillBgButtons[0].clone().set({x:-225}),
		skillBgButtons[1].clone().set({x:-135}),
		skillBgButtons[2].clone().set({x:-45}),
		skillBgButtons[3].clone().set({x:45}),
		skillBgButtons[4].clone().set({x:135})
	];

	var skilldesigns = [
		swordSprite.clone().set({x:-215}),
		runningSprite.clone().set({x:-120}),
		armorSprite.clone().set({x:-22}),
		eyeSprite.clone().set({x:27}),
		breakSprite.clone().set({x:157})
	];

	var padlocks = [
		padlockSprite.clone({x:-202}),
		padlockSprite.clone({x:-112}),
		padlockSprite.clone({x:-22}),
		padlockSprite.clone({x:68}),
		padlockSprite.clone({x:158})
	]	

	var warninglineset = [];

	var healthbars = [];


	healthbar.getTraitByClass(ShapeMoveTo).target(126,105)
	healthbars.push(healthbar.clone());
	healthbars.push(healthbar.clone());

	healthbar.getTraitByClass(ShapeMoveTo).target(126,550)
	healthbars.push(healthbar.clone());
	healthbars.push(healthbar.clone());

	self.engine.layers.hud.saveComponent(healthbars);

	self.engine.layers.foreground.saveComponent(mapButtons,skillbuttons,skilldesigns,padlocks,fonts);


	this.showDisconnectedMsg = function() {
		var c1 = baseFont.clone({opacity:1,alignment:3,scale:0.2,y:400,text:'offline: no connection'}).saveTrait(new Fade({				
				y:100,
				speed:{fade:0.01,moveto:0.4}
		})); // 18: game over details
		var c2 = baseFont.clone({opacity:1,alignment:3,scale:0.2,y:420,text:'to mobilegear'}).saveTrait(new Fade({
				y:120,
				speed:{fade:0.01,moveto:0.4}
		})); // 18: game over details


		self.engine.layers.foreground.saveComponent(c1,c2);				
	}	

	this.showSkillButtons = function(){
		for(var i=0;i<skillbuttons.length;i++){
			fonts[i].set({opacity:1});
			skillbuttons[i].set({opacity:1});			

		}		
	}
/*
	this.hideSkillButtons = function() {
		for(var i=0;i<skillbuttons.length;i++){
			fonts[i].set({opacity:0});
			skillbuttons[i].set({opacity:0});			
		}
	}
	*/

	this.cooldownSkillButton = function(id,cd,forcelock) {		
		
		if(cd<0) { // show podlock
			cd='';
			skilldesigns[id].set({opacity:0});
			padlocks[id].set({opacity:1});
			
		}		
		else if(cd>0) {
			skilldesigns[id].set({opacity:0});
			fonts[id+5].set({scale:0.25,text:cd+'',opacity:1});
		}
		else if(cd==0) {
			cd='';			
			padlocks[id].set({opacity:0});
			skilldesigns[id].set({opacity:1});
			fonts[id+5].set({opacity:0});
		}

		if(forcelock) {
			skilldesigns[id].set({opacity:0});
			padlocks[id].set({opacity:1});		
		}
		
	}

	this.tapSkillButton = function(id){
		var sb = skillbuttons[id];
		sb.set({opacity:0.5,scale:0.9,x:sb.x+5});			
		skilldesigns[id].set({opacity:0.5});
		setTimeout(function() {
			sb.set({opacity:1,scale:1,x:sb.x-5});			
			skilldesigns[id].set({opacity:1});
		}, 100);
	}
/*
	this.showAttackWindowTimer = function() {
		// gear connected 
		// attack window 		
	}

	this.hideAttackWindowTimer = function() {
		
	}

	this.showDisconnected = function() {
		// disconnected
		// offline mode
		// 30s to reconnect
	}

	this.hideDisconnected = function() {
	}*/

	this.showMapNumber = function( number ){		
		mapButtons[0].set({ opacity:1 });	
		fonts[10].set({ alignment:3, opacity:1,text:number+'', x:(number>9?-15:-5), y:42, scale:(number>99?0.24:0.35) }); // single digit: x:-5, 2digit:x:-17 3digit:scale:0.24
		self.engine.layers.foreground.saveComponent(fonts[10]);
	}
/*
	this.hideMapNumber = function(){
		mapButtons[0].set({ opacity:0 });	
		fonts[10].set({ opacity:0 });
	}

	this.showEnemyName = function( str ){		
	};
*/
	this.showWarningAlert = function(){		
		warninglineset.push(
			warningline.clone({y:120})
				.saveTrait(new Fade({type:4,x:-1000}))
				.addOnAfterUpdate(1,function(s){
					if(s.x<-90) s.x=0;
				})
		);
		warninglineset.push(baseFont.clone({alignment:3, text:'warning',opacity:1,fontnum:1,scale:0.6,x:-130,y:210 }).saveTrait(new Fade({type:2,speed:{fade:0.06}})) ) ;

		var detail = 'disconnected OFFLINE mode';
		warninglineset.push(baseFont.clone({alignment:3, text:detail,opacity:1,fontnum:0,scale:0.25,x:-5*detail.length-50,y:250}));
		warninglineset.push(
			warningline.clone({x:-90,y:240})
				.saveTrait(new Fade({type:4,x:1000})) 
				.addOnAfterUpdate(1,function(s){
					if(s.x>0) s.x=-90;
				})
		);		
		self.engine.layers.foreground.bggrad = {colorstop1:'rgba(2,2,2,0.6)',colorstop2:'#000'};	
		self.engine.layers.foreground.saveComponent(warninglineset);	
	}

	this.hideWarningAlert = function(){
		for(var i=0;i<warninglineset.length;i++) {
			var w = warninglineset[i];
			w.destroy();
		}		
		delete self.engine.layers.foreground.bggrad;
		warninglineset = [];
	}	

	this.showOffline = function(t) {
		fonts[13].set({text:'system offline ' + t,x:114,opacity:1,fontnum:5});
	}

	this.showOnline = function(t) {
		fonts[13].set({text:'system online left '  + t,x:82,opacity:1,fontnum:4});
	}

	this.showGameOver = function() {
		self.engine.layers.foreground.bggrad = {colorstop1:'rgba(2,2,2,0.8)',colorstop2:'#000'};	
		fonts[14].set({text:'gameover',x:28,y:225,opacity:1,fontnum:3});
		fonts[15].set({text:'mission failed',x:88,y:305,opacity:1,fontnum:2});
		fonts[16].set({text:'choose another gear',x:68,y:355,opacity:1,fontnum:2});
		fonts[17].set({text:'click to restart',x:108,y:380,opacity:1,fontnum:2});
	}
/*
	this.hideGameOver = function() {
		delete self.engine.layers.foreground.bggrad;	
		for(var i=14;i<18;i++) fonts[i].set({opacity:0});		
	}
*/	

	this.showEnemyHealthBar = function(monstername,healthpercent){
		if(!monstername) return;

		var h = 116+(241*healthpercent);
		healthbars[0].set({opacity:1});
		healthbars[1].set({fill:32,opacity:1});
		healthbars[1].multi[1].dx=h;
		healthbars[1].multi[2].dx=h;
		healthbars[1].multi[2].cx1=h+12;
		healthbars[1].multi[2].cx2=h+12;
		fonts[11].set({text:monstername,x:240-(monstername.length*4),y:107,opacity:1});		
	}	

	this.showPlayerHealthBar = function(mhp,hp){
		var h = 116+(241*hp/mhp);
		healthbars[2].set({opacity:1});
		healthbars[3].set({fill:121,opacity:1});
		healthbars[3].multi[1].dx=h;
		healthbars[3].multi[2].dx=h;
		healthbars[3].multi[2].cx1=h+12;
		healthbars[3].multi[2].cx2=h+12;
		fonts[12].set({text:'health    '+hp,x:200,y:552,opacity:1});
	}
/*
	this.hidePlayerEnemyHealthBar = function(){
		fonts[11].set({opacity:0});	
		fonts[12].set({opacity:0});	
	}
	*/
	
	var upfallinterval;
	this.showUpfall = function(){
		upfallinterval = setInterval(function(){
			self.engine.layers.background.saveComponent(upfall.clone({x:Commons.choose(0,600)}));							
		},20);
	}

	this.hideUpfall = function(){
		clearInterval(upfallinterval);
	}



	return this;
}
/*
TapAssets.prototype.onFontsLoaded = function(fn) {
	this._onFontsLoaded = fn;
}
*/

TapAssets.prototype.onComplete = function(fn) {
	this._onComplete = fn;
}

TapAssets.prototype.onLoading = function(fn) {
	this._onLoading = fn;
}


TapAssets.prototype.phases = function(d) {	
	var self = this; 
	d = d>0 ? d+1 : 1; 
	switch( d/15 ) {
		//case 1: this._onFontsLoaded(); break;
		case 2: break;
		case 5: 
			this.engine.assets = this; // grant access of assets to engine
			this.spriteFont.destroyLoading();
			this._onComplete(); 
			break;
	}

	// call on loading function
	if(this._onLoading) this._onLoading(d);
	
	// interval for the loading
	if( d < 75) setTimeout(function(){ self.phases(d); },9);
}/** BaseComponent
 *
 *	function BaseComponent 
 *	@constructor
 *	@suppress {checkTypes} 
 */
function BaseComponent() { 	
	this.x = 0;
	this.y = 0;
	this.scale = 1;	
	this.opacity = 1; // int, sprite opacity 0-100
	this.origins = [{id:0,angle:0,x:0,y:0}]; // object: x,y origin point for translation
	this.collisions = [];	
	this.traits = [];
	this.variables = []; // 
	this.alignment = 0; // 0:no alignment, 1:from top-left, 2:from top-right, 3:from top-center, 4:from bottom-left, 5:from bottom-right, 6:from bottom-center
	
	 //this.flag = {canvasscale:true}; TODO: check if still in use flag to identify if scaling will done, 

	this._onBeforeUpdate = []; // callback on before update functions
	this._onAfterUpdate = []; // callback on after update functions
	this._onAfterPassive = []; // callback on after passive functions

};


BaseComponent.prototype.init = function(){  };

BaseComponent.prototype.update = function(){ };

BaseComponent.prototype.set = function(attribute) {
	for (var name in attribute) this[name] = attribute[name];			
	if(this._canvas) this._canvas._flag.redraw = 1;
	return this;
}

BaseComponent.prototype.saveOrigin = function(origin) {
	origin.id = origin.id === undefined ? 0 : origin.id;
	for(var i=0;i<this.origins.length;i++)
		if(this.origins[i].id == origin.id) {
			for(var k in origin)			
				this.origins[i][k] = origin[k];
			return;
		}
	this.origins.push(origin);
}

BaseComponent.prototype.getOrigin = function(id) {
	id = id === undefined ? 0 : id;
	for(var i=0;i<this.origins.length;i++)
		if(this.origins[i].id===id) {			
			return this.origins[i];
		}	
}

BaseComponent.prototype.saveTrait = function(trait) {
	for(var i=0;i<this.traits.length;i++)
		if(this.traits[i].id===trait.id) {			
			this.traits[i] = trait;
			return;
		}
	trait.component = this;
	this.traits.push(trait);
	return this;
}

BaseComponent.prototype.getTrait = function(id) {
	for(var i=0;i<this.traits.length;i++)
		if(this.traits[i].id===id) {			
			return this.traits[i];
		}		
}

BaseComponent.prototype.getTraitByClass = function(cn) {
	for(var i=0;i<this.traits.length;i++)
		if(this.traits[i] instanceof cn) {			
			return this.traits[i];
		}			
}

BaseComponent.prototype.cloneTrait = function(f) {
	for(var i=0;i<this.traits.length;i++){
		var t = this.traits[i].clone();
		t.component = f;
		f.saveTrait(t);		
	}	
}

BaseComponent.prototype.saveVariable = function(variable) {
	for(var i=0;i<this.variables.length;i++)
		if(this.variables[i].id===this.id) {
			this.variables[i] = variable;
			return;
		}
	this.variables.push(variable);
}

BaseComponent.prototype.getVariable = function(id) {
	for(var i=0;i<this.variables.length;i++) 
		if(this.variables[i].id===id) 
			return this.variables[i];		
}

BaseComponent.prototype.destroyVariable = function(id) {
	for(var i=0;i<this.variables.length;i++)
		if(this.variables[i].id===id) {
			this.variables.splice(i,1);	
			return;
		}
}

BaseComponent.prototype.destroy = function() {
	this._canvas.destroyComponent(this.id);
}

BaseComponent.prototype.isCollision  = function(x,y) {
	var vs = [], inside = false;
	for(var i = 0; i<this.collisions.length; i++) {		
		// rotate collisions based on the assigned origins
		var v = Commons.rotate(this.collisions[i][0],this.collisions[i][1],this.origins[0].x,this.origins[0].y,this.origins[0].angle);
		for(var j=1; j<this.origins.length; j++) v = Commons.rotate(v[0],v[1],this.origins[j].x,this.origins[j].y,this.origins[j].angle);		
		vs.push(v);
	}
	
	// ray-casting algorithm based on http://www.ecse.rpi.edu/Homepages/wrf/Research/Short_Notes/pnpoly.html
	for (var i = 0, j = vs.length - 1; i < vs.length; j = i++) {
		var xi = vs[i][0], yi = vs[i][1];
		var xj = vs[j][0], yj = vs[j][1];
		var intersect = ((yi > y) != (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
		if (intersect) inside = !inside;
	}
	return inside;
}

BaseComponent.prototype.updatePre = function(){
	if( this.opacity ) {
		this._ctx.save();
		this._ctx.scale(this._canvas._scale,this._canvas._scale);	
		this._ctx.globalAlpha = this.opacity;
		return 1;
	}
};

BaseComponent.prototype.updatePost = function(){
	this._ctx.restore();
};


BaseComponent.prototype.onCreate = function() {}

BaseComponent.prototype.addOnBeforeUpdate = function(id,f) {	
	for(var i=0;i<this._onBeforeUpdate.length;i++) {
		if(this._onBeforeUpdate[i].id == id) { this._onBeforeUpdate[i].f = f; return; }
	}
	this._onBeforeUpdate.push({id:id,f:f});
}

BaseComponent.prototype.onBeforeUpdate = function() {	
	for(var i=0;i<this._onBeforeUpdate.length;i++) {
		this._onBeforeUpdate[i].f(this);
	}
}

BaseComponent.prototype.addOnAfterUpdate = function(id,f) {	
	for(var i=0;i<this._onAfterUpdate.length;i++) {
		if(this._onAfterUpdate[i].id == id) { this._onAfterUpdate[i].f = f; return; }
	}
	this._onAfterUpdate.push({id:id,f:f});
	return this;
}

BaseComponent.prototype.onAfterUpdate = function() {	
	for(var i=0;i<this._onAfterUpdate.length;i++) {
		this._onAfterUpdate[i].f(this);
	}
}

BaseComponent.prototype.addOnAfterPassive = function(id,f) {	
	for(var i=0;i<this._onAfterPassive.length;i++) {
		if(this._onAfterPassive[i].id == id) { this._onAfterPassive[i].f = f; return; }
	}
	this._onAfterPassive.push({id:id,f:f});
}

BaseComponent.prototype.onAfterPassive = function(canvas) {	
	for(var i=0;i<this._onAfterPassive.length;i++) {
		this._onAfterPassive[i].f(this, canvas);
	}
}

BaseComponent.prototype.onDestroy = function() {}/** BaseShape, 
 *  
 *  function BaseShape
 *	@constructor
 *	@extends {Sprite} 
 *	@param {Object} attribute  
 *	@see {@link Canvas}
 */
function BaseShape( attribute ) {
	Commons.extend(this, new BaseComponent(attribute));		// this.set(attribute);
}

/** Convert the Shape to an Image Object
 *   
 *	function toImage
 */	
BaseShape.prototype.toImage = function(){
	var canvas = new Canvas({hidden:1});
	canvas._canvas.width = this.width;
	canvas._canvas.height = this.height;	
	canvas.saveComponent( this.clone() );		
	return canvas.toImage();
}

/** Convert the Shape to a Sprite Object
 *   
 *	function toSprite
 */	
BaseShape.prototype.toSprite = function(attribute){
	var sprite = new Sprite(attribute);	
	sprite.width = this.width;
	sprite.height = this.height; // sprite.flag.canvasscale = false; // !important to disable canvas scaling since it will just inherit the parent canvas screen
	sprite.addAnimation({frames:[{image:this.toImage(),delay:0}] });	
	return sprite;
}	

/** ShapeGroup, 
 *  
 *  function ShapeGroup
 *	@constructor
 *	@extends {BaseShape} 
 *	@param {Object} attribute  
 *	@see {@link Canvas}
 */
function ShapeGroup( attribute ) { // replace with import serial
	Commons.extend(this, new BaseShape());		
	this.shapedetails = [];		
	this.sizeoffset = 4; // the value of 2 is calibrated from the shape.sizeoffset value
	this.tile={x:1,y:1,xw:0,yw:0}; // used for tiled arrangement
	this.set(attribute);
}


/** Serial string that imports the group of serialized shapes
 *   
 *	serial: @string value of all the shapes and delimited
 *	format: width, height, shape serial import ...
 *
 *	function import
 */	 
ShapeGroup.prototype.import = function( serial ) {
	this.width = Commons.base123.charAt(serial,0) * this.sizeoffset;
	this.height = Commons.base123.charAt(serial,1) * this.sizeoffset;

	var ar = Commons.base123.splitdelimeter(serial.substring(2));
	for(var i=0;i<ar.length;i++){
		this.create(ar[i]);
	}

	// the last array defines the possible 
	return this;
}

/** Create a shape detail based on the imported file
 *   
 *	function create
 *	@param String base serial data for shape import
 */	
ShapeGroup.prototype.create = function( base ) {
	var shape = new Shape();		
	shape.sizeoffset = this.sizeoffset;
	shape.import(base)	
	this.shapedetails.push({shape:shape});	// define fixed traits: {shape:shape,pin:false,transform:false}
}


/** Update shape 
 *   
 *	function update
 *	@param String base serial data for shape import - fill,stroke,linewidth
 */	
ShapeGroup.prototype.toSpriteSheet = function( base, attribute ) {
	var d = 0, spritesheet = []; 
	spritesheet.push(this.toSprite(attribute));	
	for(var i=0;i<base.length;) {		
		this.shapedetails[d].shape.set({
			fill:Commons.base123.charAt(base,i),
			stroke:Commons.base123.charAt(base,i+1),
			lineWidth:Commons.base123.charAt(base,i+2)			
		});		
		i+=3; d++;		
	
		if(d==this.shapedetails.length) {
			d=0;			
			spritesheet.push(this.toSprite(attribute));	
		}
	}
	
	return spritesheet;
}	


/** Convert the shape group to a single sprite
 *   
 *	function toSprite
 *	@see 
 *	@param {...*} attribute
 */	
ShapeGroup.prototype.toSprite = function( attribute ) {
	var ar = this.shapedetails, w = this.width * this.sizeoffset, h = this.height * this.sizeoffset;

	var canvas = new Canvas({hidden:1});		
	canvas._canvas.width = w;
	canvas._canvas.height = h; 	

	for(var i=0;i<ar.length;i++)
		for(var j=0;j<this.tile.x;j++)
			for(var k=0;k<this.tile.y;k++) {
				var shape = ar[i].shape.clone();
				var moveto = new ShapeMoveTo();				
				shape.saveTrait(moveto);
				canvas.saveComponent(shape); 
				moveto.target(shape.x+(j*this.tile.xw), shape.y+(k*this.tile.yw));
			}
	

	var sprite = new Sprite();
	sprite.width = w;
	sprite.height = h;
	sprite.addAnimation({frames:[{image:canvas.toImage(),delay:0}] });	
	sprite.set(attribute);

	return sprite;

}
/** Shape, 
 *  
 *  function Shape
 *	@constructor
 *	@extends {Sprite} 
 *	@param {Object} attribute  
 *	@see {@link Canvas}
 */
function Shape( attribute ) {
	Commons.extend(this, new BaseShape(attribute));		
	this.type = 0; // 0:rect, 1:oval, 2:line-bezier-arc
	this.sizeoffset = 1;
	this.stroke = 0;
	this.lineWidth = 1;
	this.fill = 0;
	this.multi = [];
	// this.spritesheet = []; // {name:,images:[],speed:0,loop:0}

	this.set(attribute);
}

// Shape.prototype.onStartUpdate = function(){	}

// Shape.prototype.onEndUpdate = function(){ }

Shape.prototype.update = function() {
	this.path();
	
	this.calculateCollisions();
}	

/**/
Shape.prototype.path = function() {
	// i. identify a rotation point, in reference to origin. higher origin index have priority.
	for(var i=this.origins.length-1;i>=0;i--){
		this._ctx.translate(this.origins[i].x,this.origins[i].y); 
 		this._ctx.rotate( this.origins[i].angle*Math.PI/180 ); 
		this._ctx.translate(-this.origins[i].x,-this.origins[i].y);		
	}
	
	this._ctx.beginPath();

	switch( this.type ) {
		case 0:										
			this._ctx.rect(this.x,this.y,this.width,this.height);	
			break;
		case 1:
			var kappa = .5522848,
			ox = (this.rx / 2) * kappa, // control point offset horizontal
			oy = (this.ry / 2) * kappa, // control point offset vertical
			xe = this.x + this.rx, // x-end
			ye = this.y + this.ry, // y-end
			xm = this.x + this.rx / 2, // x-middle
			ym = this.y + this.ry / 2; // y-middle
			this._ctx.moveTo(this.x, ym);
			this._ctx.bezierCurveTo(this.x, ym - oy, xm - ox, this.y, xm, this.y);
			this._ctx.bezierCurveTo(xm + ox, this.y, xe, ym - oy, xe, ym);
			this._ctx.bezierCurveTo(xe, ym + oy, xm + ox, ye, xm, ye);
			this._ctx.bezierCurveTo(xm - ox, ye, this.x, ym + oy, this.x, ym);
			break;
		case 2: 
			this._ctx.moveTo(this.x,this.y);
			for(var i=0;i<this.multi.length;i++){
				var m = this.multi[i];
				switch(m.type){
					case 0:
						this._ctx.closePath();
						break;
					case 1:
						this._ctx.lineTo(m.dx,m.dy);
						break;
					case 2:
						this._ctx.bezierCurveTo(m.cx1, m.cy1, m.cx2, m.cy2, m.dx, m.dy);
						break;
					case 3:
						this._ctx.arcTo(m.x,m.y,m.dx,m.dy,m.r);
						this._ctx.lineTo(m.dx,m.dy);
						break;
					case 4:
						this._ctx.moveTo(m.dx,m.dy);
						break;
				}
			}
			break;
	}

	this._ctx.lineWidth = this.lineWidth;

	if( this.stroke ) {
		this._ctx.strokeStyle = Commons.color(this.stroke);
		this._ctx.stroke();		
	}

	if( this.fill ) {
		this._ctx.fillStyle = Commons.color(this.fill,this._ctx);
		this._ctx.fill();
	}

}


Shape.prototype.calculateCollisions = function() {
	switch( this.type ) {
		case 0:	this.collisions = [[this.x,this.y], [this.x+this.width,this.y], [this.x+this.width,this.y+this.height], [this.x,this.y+this.height]]; break;
		case 1: this.collisions = [[this.x,this.y], [this.x+this.rx,this.y], [this.x+this.rx,this.y+this.ry], [this.x,this.y+this.ry]]; break;
		case 2:	this.collisions = [[this.x,this.y]];
			for(var i=0;i<this.multi.length;i++){
				var m = this.multi[i];
				switch(m.type) {
					case 0:	this.collisions.push([this.x,this.y]); break;
					case 1: this.collisions.push([m.dx,m.dy]); break;
					case 2: this.collisions.push([m.cx1,m.cy1]); this.collisions.push([m.cx2,m.cy2]); this.collisions.push([m.dx,m.dy]); break;
					case 3:	this.collisions.push([m.x,m.y]); this.collisions.push([m.dx,m.dy]); break;
					case 4: this.collisions.push([m.dx,m.dy]); break;
				}
			}
			break;
	}
}

/** Set the default origin to the center point of the polygon
 *	
 *	function alignCenterOrigin
 */
Shape.prototype.alignCenterOrigin = function() {
	switch(this.type) {
		case 0: 
			this.saveOrigin({angle:0,x:this.x+this.width/2,y:this.y+this.height/2});
			break;
		case 1: 
			this.saveOrigin({angle:0,x:this.x+this.rx/2,y:this.y+this.ry/2});
			break;
		case 2:			
			for(var i=this.multi.length-1;i>-1;i--) {				
				// ignore close type
				if(this.multi[i].type==0) continue;				
				// get the last dx,dy coordinate and get the average mid point
				this.saveOrigin({angle:0, x:(this.x+this.multi[i].dx)/2, y:(this.y+this.multi[i].dy)/2 }); 
			}
			break;
	}
}

/** Clone this object
 *	
 *	function clone
 */
Shape.prototype.clone = function() {
	var f = new Shape(Commons.clone(this));
	this.cloneTrait(f);
	return f;
}




/** Import the
 *
 *  !note: this.id and this.z will be set after import, bare minimum attributes for import
 *  !note: only initial origin is imported, multiple origins not implemented\
 *
 *	function import
 *
 */
Shape.prototype.import = function(base) {
	// type and initial axis
	this.type = Commons.base123.charAt(base,0);
	this.x = Commons.base123.charAt(base,1) * this.sizeoffset;
	this.y = Commons.base123.charAt(base,2) * this.sizeoffset;

	// origin axis
	this.origins[0].x = Commons.base123.charAt(base,3) * this.sizeoffset;
	this.origins[0].y = Commons.base123.charAt(base,4) * this.sizeoffset;
	this.origins[0].angle = Commons.base123.charAt(base,5);

	// design line, stroke and fill
	this.lineWidth = Commons.base123.charAt(base,8); 
	this.stroke = Commons.base123.charAt(base,9);
	this.fill = Commons.base123.charAt(base,10);

	
	switch(this.type) {
		case 0: 
			this.width = Commons.base123.charAt(base,6) * this.sizeoffset;
			this.height = Commons.base123.charAt(base,7) * this.sizeoffset;
			break;
		case 1: 
			this.rx = Commons.base123.charAt(base,6) * this.sizeoffset;
			this.ry = Commons.base123.charAt(base,7) * this.sizeoffset;
			break;
		case 2: 
			this.stroke = Commons.base123.charAt(base,6);
			this.fill = Commons.base123.charAt(base,7);
			this.multi = [];
			for(var i=9;i<base.length;){
				var item = { type:Commons.base123.charAt(base,i) }; i++;
				if(item.type>0)  {
					item.dx=Commons.base123.charAt(base,i) * this.sizeoffset; i++;
					item.dy=Commons.base123.charAt(base,i) * this.sizeoffset; i++;
				}
				if(item.type==2) {
					item.cx1=Commons.base123.charAt(base,i) * this.sizeoffset; i++;
					item.cy1=Commons.base123.charAt(base,i) * this.sizeoffset; i++;
					item.cx2=Commons.base123.charAt(base,i) * this.sizeoffset; i++;
					item.cy2=Commons.base123.charAt(base,i) * this.sizeoffset; i++;
				}
				if(item.type==3) {
					item.x=Commons.base123.charAt(base,i) * this.sizeoffset; i++;
					item.y=Commons.base123.charAt(base,i) * this.sizeoffset; i++;
					item.r=Commons.base123.charAt(base,i) * this.sizeoffset; i++;
				}
				this.multi.push(item);
			}	
			break;
	}
	
	return this;
}


/** Export the shape to a serial base123 format
 * 
	type,x,y,origin-x,y,angle,width,height,lineWidth,stroke,fill
	type,x,y,origin-x,y,angle,   rx,    ry,lineWidth,stroke,fill
    type,x,y,origin-x,y,angle,stroke, fill,lineWidth,multi

	multi: it will used code from 247,248,249,250
	{"type": 1,"dx": 393,"dy": 178},
	{"type": 1,"dx": 301,"dy": 90},
	{"type": 2,"cx1": 240,"cy1": 103,"cx2": 89,"cy2": 121,"dx": 149,"dy": 279},
	{"type": 3,"x": 132,"y": 375,"dx": 298,"dy": 375,"r": 40},
	{"type": 0,}

 * plan the equivalent base123 converted string for a a shape in bytes	
 * !note: remove since this is unused
 * !future: add size offset and axis offset this will allow negative values
 */
Shape.prototype.export = function() {
	var base = '';

	base+=Commons.base123(this.type);
	base+=Commons.base123.floor((this.x/this.sizeoffset)); 
	base+=Commons.base123.floor(this.y/this.sizeoffset);
	base+=Commons.base123.floor(this.origins[0].x/this.sizeoffset);
	base+=Commons.base123.floor(this.origins[0].y/this.sizeoffset);
	base+=Commons.base123(this.origins[0].angle);

	this.lineWidth = this.lineWidth ? parseInt(this.lineWidth) : 0;	
	this.stroke = this.stroke ? parseInt(this.stroke) : 0;
	this.fill = this.fill ? parseInt(this.fill) : 0;

	switch(this.type) {
		case 0: 
			base+=Commons.base123.floor((this.width/this.sizeoffset));
			base+=Commons.base123.floor((this.height/this.sizeoffset));
			base+=Commons.base123(this.lineWidth,this.stroke,this.fill);
			break;
		case 1: 
			base+=Commons.base123.floor((this.rx/this.sizeoffset));
			base+=Commons.base123.floor((this.ry/this.sizeoffset));
			base+=Commons.base123(this.lineWidth,this.stroke,this.fill);
			break;
		case 2:
			base+=Commons.base123(this.stroke);
			base+=Commons.base123(this.fill);
			base+=Commons.base123(this.lineWidth);
			for(var i=0;i<this.multi.length;i++){
				var multi = this.multi[i];
				base+=Commons.base123(multi.type);
				if(multi.type==0) continue;
				base+=Commons.base123.floor((multi.dx/this.sizeoffset));
				base+=Commons.base123.floor((multi.dy/this.sizeoffset));
				switch(multi.type) {
					case 2: 
						base+=Commons.base123.floor((multi.cx1/this.sizeoffset));
						base+=Commons.base123.floor((multi.cy1/this.sizeoffset));
						base+=Commons.base123.floor((multi.cx2/this.sizeoffset));
						base+=Commons.base123.floor((multi.cy2/this.sizeoffset));
						break;
					case 3: 
						base+=Commons.base123.floor((multi.x/this.sizeoffset));
						base+=Commons.base123.floor((multi.y/this.sizeoffset));
						base+=Commons.base123.floor((multi.r/this.sizeoffset));
						break;
				}				
			}	
			break;
	}
	return base;
}

/** ShapeFont, 
 *  
 *  function ShapeFont
 *	@constructor
 *	@extends {BaseShape} 
 *	@param {Object} attribute  
 *	@see {@link Canvas}
 */
function ShapeFont( attribute ) {
	Commons.extend(this, new BaseShape(attribute));	

	this.fontnum = 0; // the default positon of font sheet
	this.fontsheet = []; // contains the loaded font sheets	
	// this.fontspacing = ''; // TODO: remove

	this.set(attribute);
}

/** static text dictionary for all shapefont instances
 *	first index 0 should be unused
 *	
 *  function static dictionary
 */
ShapeFont.dictionary = []; 

/** Initialization, compute the actual width
 *	!notice: unused, temporarily commented out	
 *
 *	function ìnit
 *
ShapeFont.prototype.init = function(){
	// i. compute the actual width
	if(this.text && this.fontsheet.length>0) {
		var spacing = 0;
		for(var i=0;i<this.text.length;i++){
			var position = this.letterset.indexOf(this.text[i]);			 			
			spacing += Commons.base123(this.letterspacing.charAt(position));
		}
		this.width = spacing;
	}

}
 */

/** Import serial data and convert it to a shapefont object
 *	
 *  0: width, height, [fill,stroke,linewidth]...
 *  1: letter spacing
 *  2: letter set
 *  3-nth: shape objects
 *  
 *  function import
 *	@param String serial
 */
ShapeFont.prototype.import = function( serial ) {
	var a = Commons.base123.splitdelimeter( serial ), b = a[0], c = a.slice(3);	
	for(var i=2; i<b.length;){
		var fill = Commons.base123.charAt(b,i);
		var stroke = Commons.base123.charAt(b,i+1);
		var lineWidth = Commons.base123.charAt(b,i+2);		
		this.create(Commons.base123.charAt(b,0), Commons.base123.charAt(b,1),  a[1], a[2], c, fill, stroke, lineWidth);
		i+=3;
	}
	return this;
}

/** Convert the serial data to a shapefont
 *	
 *	function create
 */
ShapeFont.prototype.create = function(width, height, letterspacing, letterset, ar, fill, stroke, lineWidth) {
	var self = this; // self object, fixed left padding

	this.cellwidth = width;
	this.height = height;
	this.width = (ar.length*width);
	this.letterset = letterset+' ';	
	this.letterspacing = letterspacing;	

	// i. create a temporary canvas for rendering
	var canvas = new Canvas({hidden:1});		
	canvas._canvas.height = height;
	canvas._canvas.width = (ar.length*width);

	// ii. add the shapes to the canvas
	for(var i=0;i<ar.length;i++) 
		canvas.saveComponent((new Shape())
			.import(ar[i])
			.set({width:width,height:height,stroke:stroke,lineWidth:lineWidth,fill:fill})
			.toSprite()
			.set({x:i*width})
		);

	// iii. convert the canvas to a sprite sheet image. !note: this improves performance
	setTimeout(function(){
		self.fontsheet.push( canvas.toImage() );	
	},9);

}

/** Render spritesheet image
 *	
 *	function update
 */
ShapeFont.prototype.update = function() {	
	if(this.textdictionary) this.text = ShapeFont.dictionary[this.textdictionary];

	// update only if there is text and fontsheet is defined
	if(this.text && this.fontsheet.length>0) {
		var spacing = 0;

		for(var i=0;i<this.text.length;i++){
			var t = this.text[i], position = this.letterset.indexOf(t.toLowerCase()), fontnum = this.fontnum;
			
			if(isNaN(t) && t == t.toUpperCase()) fontnum+=1; //!note: handle uppercase with +1 font number reference			

			if(t!=' ')
				this._ctx.drawImage(this.fontsheet[fontnum],			
					this.cellwidth*position,0,
					this.cellwidth-1, this.height, // !note: the -1 is a quick fix to prevent displaying of a weird extra right line border
					spacing+this.x,this.y, // this.cellwidth*i
					this.cellwidth*this.scale,this.height*this.scale);	

			spacing += (Commons.base123(this.letterspacing.charAt(position))+2)*this.scale;
		}
		this.width = spacing;
	}	
}	

/** Clone this object
 *	
 *	function clone
 */
ShapeFont.prototype.clone = function(attribute) {
	var f = new ShapeFont(Commons.clone(this));
	f.fontsheet = this.fontsheet;
	this.cloneTrait(f);
	return f.set(attribute);
}

/** Sprite
 *  
 *  function Sprite
 *	@constructor
 *	@extends {BaseComponent} 
 *	@param {Object} attribute  
 *	@see {@link Canvas}
 */
function Sprite( attribute ) {
	Commons.extend(this, new BaseComponent(attribute));		

	this.animation = []; // contains array of frames, [{frames:[]},...]
	this.frames = []; // contains array of frame, frame={image:image object,delay:0};
	this.sheet = []; // contains a frame that is sliced to an array, ideal if the frame is a spritesheet. usual has 1 value if not a spritesheet
	this.frameindex = 0; // index counter of the frame
	this.framedelay = 0; // delay counter of the frame
	this.animationindex = 0;

	this.set(attribute);
}

/** Add a new animation frames
 *	
 *	function addAnimation
 */
Sprite.prototype.addAnimation = function(animation){			
	this.animation.push(animation);
	this.frames = animation.frames; 
	return this;
}

/** Get the frame of a specific animation
 *	
 *	function runAnimation
 */
Sprite.prototype.runAnimation = function(id){
	this.animationindex = id;
	this.frameindex = 0;
	this.frames = this.animation[id].frames;
}

/** Get the frame of a specific animation
 *	
 *	function getFrame
 */
Sprite.prototype.getFrame = function(){
	if( this.framedelay>0 ) {	
		if( this.frameindex<this.frames.length ) this.frameindex++;			
		this.framedelay = this.frames[ this.frameindex ].delay;
	}
	
	this.framedelay--;			
	if( this.frames[ this.frameindex ] ) return this.frames[ this.frameindex ].image;			
}

/** Render sprite image
 *	
 *	function update
 */
Sprite.prototype.update = function(){		
	var f = this.getFrame();
	
	if(f) {
		if(this.mirror) {			
			this._ctx.translate(this.width, 0);
			this._ctx.scale(-1,1);							
		}

		for(var i=this.origins.length-1;i>=0;i--){
			this._ctx.translate(this.origins[i].x,this.origins[i].y); 
	 		this._ctx.rotate( this.origins[i].angle*Math.PI/180 ); 
			this._ctx.translate(-this.origins[i].x,-this.origins[i].y);		
		}
		this._ctx.drawImage(f,this.x,this.y,this.width*this.scale,this.height*this.scale);			
	}
	
}

/** Clone this object
 *	
 *	function clone
 */
Sprite.prototype.clone = function(attribute) {
	var f = new Sprite(Commons.clone(this));	
	for(var i=0;i<this.animation.length;i++) f.addAnimation(this.animation[i]);		
	this.cloneTrait(f);		
	return f.set(attribute);
}

/**
 * 	function BaseTrait
 *	@constructor
 *	@suppress {checkTypes}
 */
function BaseTrait() { 
	/*
	this.component;
	this.id;
	this.enabled;
	*/
};



BaseTrait.prototype.init = function(){ };

BaseTrait.prototype.onBeforeUpdate = function(){ };

BaseTrait.prototype.onAfterUpdate = function(){ };

BaseTrait.prototype.onAfterPassive = function(canvas){ };

BaseTrait.prototype.set = function(attribute) {
	for (var name in attribute) 
		this[name] = attribute[name]; 		
}

/** Fade, 
 *  
 *  function Fade
 *	@constructor
 *	@extends {BaseTrait} 
 *	@require {BaseTrait} 
 *	@param {Object} attribute  
 *	@see {@link Canvas}
 */
function Fade( attribute ) {
	Commons.extend(this, new BaseTrait());				
	this.type = 0; // 0:fadeout 1:fadein 2:flash 3:fadein and fadeout 4:movetoonly
	this.speed = {fade:0.1,moveto:1,flash:0};
	this.set(attribute);
}


Fade.prototype.moveto = function( canvas ) {

	var self = this;

	if(this.x!=undefined && Math.floor(this.x)!=this.component.x) {
		this.component.x = Math.floor( this.component.x>this.x ? this.component.x-this.speed.moveto : this.component.x+this.speed.moveto );
		canvas._flag.redraw = 1;
	}
	if(this.y!=undefined && Math.floor(this.y)!=this.component.y) {		
		this.component.y = Math.floor( this.component.y>this.y ? this.component.y-this.speed.moveto : this.component.y+this.speed.moveto );
		canvas._flag.redraw = 1;
	}

	// destroy if far bordered
	if(this.component.x<-300||this.component.x>999||this.component.y<-300||this.component.y>9999) 
		setTimeout(function(){ 
			log('Fade.moveto.destroy.component:'+self.component.id+', text:'+self.component.text); 
				self.component.destroy(); 
		},9); 
}

/** Callback on the Canvas
 *	
 *	function onFadeFinish
 */
Fade.prototype.onAfterPassive = function( canvas ){ 
	if(!this.component) return;

	var self = this;

	if( this.type == 0 || (this.type == 3 && this.speed.flash == 0) ) { // fade out
		this.component.opacity-=this.speed.fade; 
		if(this.component.opacity<0) setTimeout(function(){ self.component.destroy(); self.onFadeFinish(); },9); // !note timeout is required to avoid component loop error				
		canvas._flag.redraw = 1;			
	}
	else if( (this.type == 1 || (this.type == 3 && this.speed.flash == 1) ) && this.component.opacity<1) { // fade in
		this.component.opacity+=this.speed.fade; 
		if(this.component.opacity>=1) setTimeout(function(){ self.onFadeFinish(); self.speed.flash=0 },9); // !note timeout is required to avoid component loop error				
		canvas._flag.redraw = 1;
	}
	else if(this.type == 2) { // flash
		var v = this.component.opacity + (this.speed.flash==0?-this.speed.fade:this.speed.fade); 
		if(this.component.opacity<=0) this.speed.flash=1;		
		if(this.component.opacity>=1) this.speed.flash=0;
		this.component.opacity = v<0?0:v>1?1:v;				
		canvas._flag.redraw = 1;
	}
	this.moveto( canvas );
	
};

/** Callback if fade is completed
 *	
 *	function onFadeFinish
 */
Fade.prototype.onFadeFinish = function(){}


Fade.prototype.clone = function(){ 
	return new Fade(Commons.clone(this));
};/** ShapeMoveTo, 
 *  
 *  function ShapeMoveTo
 *	@constructor
 *	@extends {BaseTrait} 
 *	@param {Object} attribute  
 *	@see {@link Canvas}
 */
function ShapeMoveTo( attribute ) {
	Commons.extend(this, new BaseTrait());			
	this.set(attribute);
};

ShapeMoveTo.prototype.target = function(x,y) {
	this.prev = {x:this.component.x-x,y:this.component.y-y};
	this.component.x = x;
	this.component.y = y;
	
	this.component.saveOrigin({x:this.component.getOrigin().x-this.prev.x, y:this.component.getOrigin().y-this.prev.y});	

	if( this.component.multi && this.component.multi.length>0 ) {
		for(var i=0;i<this.component.multi.length;i++) {
			var m = this.component.multi[i];
			if(m.dx!==undefined) m.dx-=this.prev.x; 
			if(m.dy!==undefined) m.dy-=this.prev.y;
			switch( m.type ) {
				case 2: 
					m.cx1-=this.prev.x; m.cy1-=this.prev.y; 
					m.cx2-=this.prev.x; m.cy2-=this.prev.y; 
					break;
				case 3:
					m.x-=this.prev.x; 
					m.y-=this.prev.y; 
					break;
			}
		}
	}	
};

ShapeMoveTo.prototype.clone = function(){ 
	return new ShapeMoveTo(Commons.clone(this));
};
