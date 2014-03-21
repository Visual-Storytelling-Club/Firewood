/*
	Firewood Visual Novel Engine
		written by Alex Mankin (alex_mankin@eku.edu)
	
	TABLE OF CONTENTS
	
		Helper Functions									(*0)
		Classes
	1. Asset Manager										(*1)
	2. Timer													(*2)
	3. Actor, Img												(*3)
	4. Animation												(*4)
	5. Script Reader										(*5)
	6. Game													(*6)
	7. Music, Sound Effect, and Background		(*7)
	8. Message Box										(*8)
	9. Button													(*9)
	10. Game Menu											(*10)

	
*/	




















/////////////////////////////////////////////////////
//MISC HELPER FUNCTIONS								*0
/////////////////////////////////////////////////////

//Removes the first character of a string.
function removeFirstChar(str){
	return str.substr(1);
}




//Removes the last character of a string.
function removeLastChar(str){
	return str.substr(0, str.length - 1);
}




//Adds a line to the game script from the console
function addLine(str){
	str = str.split(' ');
	game._GSCRIPT.splice(game.sReader.startPosition, 0, str);
	game.sReader.startPosition--;
}




//Removes y characters starting at position x
function removeChar(str, x, y){
	if (x == 0)
		return str.substr(y);
		
	return str.substr(0, x) + str.substr(x + y);
}




//Takes a string of text and formats it to fit within the given size constraints
function msgBlock(msg, width){

	var 	thisLine = '',
			finalLine = new Array(''),
			linePos = 0;
	
	for (i = 0; i < msg.length; i++){
		//Add the next word to test
		var testLine = thisLine + msg[i] + ' ';	
		//Measure the width in pixels
		var metrics = c.measureText(testLine);	
		//And store it in a variable, testWidth		
		var testWidth = metrics.width;
		
		if (testWidth > width){						//If adding the new word will push the message beyond the allotted pixel limit
			//Move to the next line
			linePos++;
			//Create a new line
			thisLine = msg[i] + ' ';	
			//Add it to the finalLine array
			finalLine[linePos] = thisLine;
		}
		else{											//The next word will NOT push the message beyond its limit
			thisLine = testLine;
			finalLine[linePos] = thisLine;				//Update the corresponding line in the final array
		}
	}
	
	return finalLine;
}

















	
/////////////////////////////////////////////////////
//ASSET MANAGER									   *1
/////////////////////////////////////////////////////

/*
	Put together following the guide at:
	http://www.html5rocks.com/en/tutorials/games/assetmanager/	*/


function AssetManager(){
	this.successCount = 0;
	this.errorCount = 0;
	this.cache = {};
	this.downloadQueue = [];
	this.handleQueue = [];
}

AssetManager.prototype.queueDownload = function(path){			//Adds files to the queue but does not download them.
//AssetManager.prototype.queueDownload = function(path, handle){			//Adds files to the queue but does not download them.
	this.downloadQueue.push(path);
	//this.handleQueue.push(handle);
}

AssetManager.prototype.downloadAll = function(downloadCallback){		//Downloads everything in the queue, executes callback function when finished
	if (this.downloadQueue.length === 0){		//If there are no assets in the queue
		downloadCallback();
	}
	
	for (var i = 0; i < this.downloadQueue.length; i++){
		var path = this.downloadQueue[i];
		//var split = this.handleQueue[i].split['_'];
		//var type = split[0];
		//var handle = split[1];
		
		//if (type == 'IMG')									var loadCondition = "load";
		//else if (type == 'SFX' || type == 'BGM')	var loadCondition = "canplaythrough";
		if (path.split('.')[1] == 'png')			var type = 'image', loadCondition = "load";
		else if (path.split('.')[1] == audioType)	var type = 'audio', loadCondition = "canplaythrough";
		else console.log("ERROR: Unrecognized file extention for " + path + ".  Accepted formats for images and audio are png, ogg, and mp3");
		
		var that = this;
		
		//if (type == 'IMG')			var asset = new Image();
		if (type == 'image')			var asset = new Image();	
		else								var asset = new Audio();
		
		asset.addEventListener(loadCondition, function(){
			/*
			//Store asset in the appropriate location
			if (type == 'IMG')
				IMG[handle] = this.cache[path];
			else if (type == 'SFX')
				SFX[handle] = this.cache[path];
			else if (type == 'BGM')
				BGM[handle] = this.cache[path];
			*/
			
			if (DEBUG) console.log(this.src + ' loaded successfully');
			that.successCount += 1;
			if (that.isDone()) {
				downloadCallback();
			}
		}, false);
		
		asset.addEventListener("error", function(){
			if (DEBUG) console.log(this.src + ' failed to load');
			that.errorCount += 1;
			if (that.isDone()) {
				downloadCallback();
			}
		}, false);
	
		asset.src = path;				//This triggers the download
		this.cache[path] = asset;
	}
}

//Signal when downloads are finished

AssetManager.prototype.isDone = function(){
	return (this.downloadQueue.length == this.successCount + this.errorCount);
}

AssetManager.prototype.getAsset = function(path){
	return this.cache[path];
}

AssetManager.prototype.clearQueue = function(){
	this.successCount = 0;
	this.errorCount = 0;
	this.downloadQueue.length = 0;
}



















/////////////////////////////////////////////////////
//TIMER											   *2
/////////////////////////////////////////////////////

function Timer(){
	this.FRAME = 0;
	this.FPS = 0;
}

Timer.prototype.init = function(g, fps){
	this.FPS = fps;
	g._INTERVAL_ID = setInterval(function(){g.update()}, 1000 / this.FPS);
}
	
Timer.prototype.tick = function(){
	this.FRAME++;
}



















/////////////////////////////////////////////////////
//ACTOR, IMG									   *3
/////////////////////////////////////////////////////

function Actor(){
	this.sprites = {};							//Table of sprites and their corresponding information
	this.alpha = 0;							//Level of transparency to display the sprite
	this.alphaStep = 0;					//How much to change alpha per frame
	this.xPos;									//x position of the character.  y position is constant.
	this.xStep = 0;							//How much to move the character per frame
	this.xDest = 0;							//Destination for panning
	this.panTimer = -1;						//Time it takes to complete a pan
	this.spriteWidth = 0;					//Width of sprites
	this.name = '';							//Name to display when character is speaking.
	this.gender = null;						//'m' for male, 'f' for female
	this.current = '';							//Label for the current sprite
		
	//Variables dealing with image-swapping
	this.old = '';							//Previous sprite
	this.isChanging = false;
	
}



Actor.prototype.appear = function(x, t){
	
	this.xPos = Math.floor(WIDTH * (x / 100)) - (this.spriteWidth / 2);
	//If t is 0, appear instantly, don't do any alpha manipulation and just display the character
	if (t == 0){
		this.alphastep = 0;
		this.alpha = 1;
	}
	else
		this.alphaStep = 1 / t;
		
}




Actor.prototype.pan = function(x, t){
	
	//Destination is given in percentages of the screen.
	this.xDest = Math.floor(WIDTH * (x / 100)) - (this.spriteWidth / 2);
	var distance = this.xDest - this.xPos;
	this.xStep = distance / t;
	this.panTimer = t;
}




Actor.prototype.change = function(sprite, t){
	this.old = this.current;
	this.current = sprite;
	
	if (t > 0){
		this.alpha = 0;
		this.alphaStep = 1 / t;
		this.isChanging = true;
	}
	
	if (!this.sprites[this.current])
		this.spriteWidth = 0;
	else
		this.spriteWidth = IMG[this.sprites[this.current].img].width;
}




Actor.prototype.disappear = function(t){
	//If t is 0, disappear instantly
	if (t == 0){
		this.alphaStep = 0;
		this.alpha = 0;
	}
	else
		this.alphaStep = -(1/t);
}




Actor.prototype.update = function(){
	
	//Update changes in opacity and position
	if (this.alphaStep != 0){
		if (this.alpha + this.alphaStep >= 1){			//Finished fading in
			this.alpha = 1;
			this.alphaStep = 0;
			this.isChanging = false;
		}
		else if (this.alpha + this.alphaStep <= 0){		//Finished fading out
			this.alpha = 0;
			this.alphaStep = 0;
		}
		else											//If alpha is not changing, alphaStep will be 0, so no change will occur
			this.alpha += this.alphaStep;
	}
	
	if (this.panTimer >= 0){
		if (this.panTimer == 0){
			this.xPos = this.xDest;
			this.panTimer = -1;
			this.xStep = 0;
			this.xDest = 0;
		}
		else{
			this.xPos += this.xStep;
			this.panTimer--;
		}
	}
}




Actor.prototype.draw = function(){
	//Don't draw anything if the current sprite is either unspecified or undefined
	if (!this.sprites[this.current])
		return;
	
	if (this.alpha > 0){
		c.globalAlpha = this.alpha;
		c.drawImage(IMG[this.sprites[this.current].img], this.xPos, 0);
		c.globalAlpha = 1;
	}
	
	//Fade out the old sprite
	if (this.isChanging)
	{
		c.globalAlpha = 1 - this.alpha;
		c.drawImage(IMG[this.sprites[this.old].img], this.xPos, 0);
		c.globalAlpha = 1;
	}
}









function Img(g, path){
	this.src = AM.getAsset(path);
	this.g = g;
	
	this.x = 0;
	this.y = 0;
	this.sWidth = this.src.width;
	this.sHeight = this.src.height;
	this.height = 0;
	this.gIndex = -1;					//Index in the game's array, if this image needs to be displayed and is not attached to a character. Negative if it isn't in the array.
	
	this.xStep = 0;
	this.xDest = 0;
	this.yStep = 0;
	this.yDest = 0;
	this.panTimer = -1;
	
	this.alpha = 0;
	this.alphaStep = 0;
	
	this.isFading = false;
}




Img.prototype.update = function(){

	//Handle fadein and fadeout
	if (this.alphaStep != 0){
		if (this.alpha + this.alphaStep >= 1){
			this.alpha = 1;
			this.alphaStep = 0;
		}
		else if (this.alpha + this.alphaStep <= 0){
			this.alpha = 0;
			this.alphaStep = 0;
		}
		else
			this.alpha += this.alphaStep;
	}

	//Handle translation
	if (this.panTimer == 0){
		this.xStep = this.xDest;
		this.yStep = this.yDest;
		this.panTimer = -1;
		this.xStep = 0;
		this.yStep = 0;
	}
	else if (this.panTimer > 0){
		this.x += this.xStep;
		this.y += this.yStep;
		this.panTimer--;
	}
	

	//TODO: Handle resizing
	
	//If image needs to disappear, remove it from the list and reset it
	if (this.alpha <= 0 && this.isFading){
		this.isFading = false;
		if (this.gIndex >= 0){
			this.g.imgList.splice(this.gIndex, 1);
			//Update the rest of the images to reflect their new positions
			for (i = this.gIndex; i < this.g.imgList.length; i++)
				IMG[this.g.imgList[i]].gIndex--;
		}
		this.gIndex = -1;
		
		this.xStep = 0;
		this.xDest = 0;
		this.yStep = 0;
		this.xDest = 0;
		
		this.sWidth = this.src.width;
		this.sHeight = this.src.height;
	}
}




Img.prototype.draw = function(){
	
	c.globalAlpha = this.alpha;
	c.drawImage(this.src, 0, 0, this.src.width, this.src.height, this.x, this.y, this.sWidth, this.sHeight);
	c.globalAlpha = 1;
	
}



Img.prototype.appear = function(x, y, t){
	
	this.x = x;
	this.y = y;
	
	if (t == 0){
		this.alphaStep = 0;
		this.alpha = 1;
	}
	else
		this.alphaStep = 1/t;
		
}




Img.prototype.disappear = function(t){
	this.isFading = true;
	
	if (t == 0){
		this.alphaStep = 0;
		this.alpha = 0;
	}
	else
		this.alphaStep = -(1/t);
		
}




Img.prototype.pan = function(x, y, t){
	this.xDest = x;
	this.yDest = y;
	var dx = this.xDest - this.x;
	var dy = this.yDest - this.y;
	this.xStep = dx / t;
	this.yStep = dy / t;
	this.panTimer = t;
}
















/////////////////////////////////////////////////////
//ANIMATION											*4
/////////////////////////////////////////////////////

function Animation(g, path, dimensions){			//Break dimensions string down into lines and words, then assign values
												//x location of sprite, y location of sprite, width of sprite, height of sprite, duration (in frames) of sprite

	this.dataArray = dimensions.split(', ');
	this.frameArray = new Array();
	
	for (i = 0; i < this.dataArray.length; i++)
	{
			this.dataArray[i] = this.dataArray[i].split(' ');
			this.frameArray.push({	x: parseInt(this.dataArray[i][0]), 
									y: parseInt(this.dataArray[i][1]), 
									width: parseInt(this.dataArray[i][2]), 
									height: parseInt(this.dataArray[i][3]), 
									duration: parseInt(this.dataArray[i][4])
								});
	}
	
	this.src = AM.getAsset(path);
	this.g = g;
	this.frame = 0;								//Decides which member of the stepList (I.E. which frame of animation) to display
	this.frameCountdown -1;
	this.countdown = -1;						//Used to play an animation once.
	this.isPlaying = false;
	this.x = 0;
	this.y = 0;
}




Animation.prototype.draw = function(){
	if (this.isPlaying)
		c.drawImage(this.src, this.frameArray[this.frame].x, this.frameArray[this.frame].y, this.frameArray[this.frame].width, this.frameArray[this.frame].height, this.x, this.y, this.frameArray[this.frame].width, this.frameArray[this.frame].height);
		
	if (this.countdown == 0){
		this.countdown = -1;
		this.isPlaying = false;
		this.frame = 0;
	}
	else if (this.countdown > 0)
		this.countdown--;
	
	if (this.isPlaying){
		if (this.frameCountdown > 0)
			this.frameCountdown--;
		else{									//Frame countdown is 0
			if (this.frame + 1 >= this.frameArray.length)	//If it's the last frame, jump back to the first frame
				this.frame = 0;
			else
				this.frame++;
				
			this.frameCountdown = this.frameArray[this.frame].duration;
		}
	}
}




Animation.prototype.loop = function(x, y){			//Loops animation
	this.x = x;
	this.y = y;
	this.countdown = -1;						//Shuts off countdown
	this.frameCountdown = this.frameArray[0].duration;
	this.isPlaying = true;
	this.frame = 0;
}




Animation.prototype.playOnce = function(x, y){		//Plays animation ONCE
	this.x = x;
	this.y = y;
	var sum = 0;
	
	for (i = 0; i < this.frameArray.length; i++)	//Add up the duration for all frames
		sum += this.frameArray[i].duration;
	
	this.countdown = sum;
	this.frameCountdown = this.frameArray[0].duration;
	this.isPlaying = true;
	this.frame = 0;
}




Animation.prototype.endLoop = function(){
	this.countdown = -1;
	this.isPlaying = false;
	this.frameCountdown = -1;
}



















/////////////////////////////////////////////////////
//SCRIPT READER										*5
/////////////////////////////////////////////////////

function ScriptReader(g){
	this.fullText = new Array();					//Array containing lines of code to be implemented
	this.wait = false;								//Whether or not the script reader is waiting
	this.startPosition = 0;							//After loadScript is run, where in the script to start interpreting commands
	this.newAssets = new Array();			//List of assets, their types, and their labels. Necessary for proper assignment of resources.
	
	this.waitTimer = -1;							//How long to wait if 'wait' command is passed.
	
}




ScriptReader.prototype.loadScript = function(script, g){		//This function should execute "load" and "define" commands, then set linePos to the line after "begin" command
	
	for (i = 0; i < script.length; i++){
		//Look through the file and execute 'load' and 'define' commands
		//'load' commands will only add files to the download queue. Once the game enters the LOADING state, the assets will be downloaded.
		
		var command1 = script[i][0];
		
		switch (command1){
			case 'load':
				var dataType = script[i][1];
				var path = script[i][2];
				var label = script[i][3];
				
				switch (dataType){
					case 'bg':
						AM.queueDownload("resources/img/bg/" + path);
						this.newAssets.push({type: 'bg', path: path, label: label});
						break;
					case 'sfx':
						AM.queueDownload("resources/sfx/" + path + "." + audioType);
						this.newAssets.push({type: 'sfx', path: path, label: label});
						break;
					case 'music':
						AM.queueDownload("resources/music/" + path + "." + audioType);
						this.newAssets.push({type: 'music', path: path, label: label});		//Adds path and label to audio array
						break;
					case 'image':
						AM.queueDownload("resources/img/" + path);
						this.newAssets.push({type: 'image', path: path, label: label});
						break;
					case 'animation':
						//load animation <path> x x x x x, x x x x x, . . . x x x x x <label>
						AM.queueDownload("resources/img/" + path);
						
						//Declare a string in which to store all of this data
						var finalData = '';
						
						//Concatenate everything from script[i][3] to the second-to-last member into a single string
						for (j = 3; j < script[i].length - 2; j++)
							finalData += script[i][j] + ' ';
						
						//Remove the extra space
						//finalData = finalData.substr(0, finalData.length - 1);
						
						this.newAssets.push({type: 'animation', path: path, label: script[i][script[i].length - 1], data: finalData});
						break;
						
					default:						//If command is not recognized, skip the line and continue
						console.log('ERROR: Unrecognized asset type on line ' + i);
						break;
				}
				break;
			
			case 'define':							//Creates a new object and provides a label for it.
				switch (script[i][1]){
					case 'char':					//Actor object
						
						//define char <label> <name> <gender>
						var	label = script[i][2];

						if (!script[i][3])
							var name = '';
						else
							var name = script[i][3];
							
						if (!script[i][4])
							var gender = null;
						else
							var gender = script[i][4];
							
						//Add a new Actor to the array
						ACTOR[label] = new Actor();	
						//Add character label to the game's list						
						g.actorList.push(label);		
						
						//Assign name, gender, and sprite
						ACTOR[label].name = name;
						ACTOR[label].gender = gender;
						
						break;
						
					
					
					case 'charSprite':
						//define charSprite <character label> <src> <label>
						var	actor = script[i][2],
							img = script[i][3],
							label = script[i][4];
								
						if (!ACTOR[actor]){
							console.log("ERROR: Actor " + actor + " does not appear to exist!");
							break;
						}
						
						//Add sprite to list and initialize the first member of its animation list
						ACTOR[actor].sprites[label] = {
							img: img, 
							anim: new Array({
								anim: null, 
								x: null, 
								y: null})};
								
						break;
						
						
						
						
					default:
						console.log('ERROR: Uncrecognized parameter on line ' + i);
						break;
				}
				break;
			
			case 'begin':							//Begin signals the end of 'load' and 'define' commands.
				this.startPosition = i + 1;	//Tell the reader where in the script to begin
				i = script.length;				//Exit the for loop
				break;
			
			default:
				break;
		}
		
		//If we've jumped from another script, the wait flag will still be on. Turn it back off!
		this.wait = false;
	}
}




ScriptReader.prototype.readScript = function(script, g){
	var i = this.startPosition;					//startPosition is reset whenever the game finished parsing events
	
	//Check if wait timer is active (> -1).  If it's 0, resume script input.  Otherwise, decrement the timer and continue waiting.
	if (this.waitTimer > 0)
		this.waitTimer--;
	else if (this.waitTimer == 0){
		this.waitTimer = -1;
		this.wait = false;
	}
	
	while (!this.wait){								//If the script isn't in 'wait' status, it will continue loading new lines of game script into the event queue so they can execute "simultaneously"
		switch (script[i][0]){
		//DON'T FORGET:  If an event passes a function to the queue, it must also pass event data, even if it has none!
			case 'music':
				switch (script[i][1]){
					case 'play':
					
						// music play <label> <volume> [time]
						
						//Check whether or not volume was specified
						if (script[i][3])
							var volume = parseFloat(script[i][3]) / 100;
						else
							var volume = g.DEFAULT_VOLUME;
						
						g._EVENTDATA.push({name: script[i][2], volume: volume});
						
						g._EVENT.push(function(g, index){
							BGM[g._EVENTDATA[index]['name']].play(g._EVENTDATA[index]['volume']);
						});
						
						if (DEBUG)
							console.log(i + ": " + script[i].join());
						
						break;
						
					case 'stop':
					
						// music stop [time]
						
						if (script[i][3])
							var t = parseInt(script[i][3]);
						else
							var t = 0;
						
						g._EVENTDATA.push({name: script[i][2], time: t});
						
						g._EVENT.push(function(g, index){
							BGM[g._EVENTDATA[index]['name']].stop(g._EVENTDATA[index]['time']);
						});						
						
						if (DEBUG)
							console.log(i + ": " + script[i].join());
						
						break;
				}
				break;
				
				
				
				
				
				
			case 'sfx':
			
				// sfx <label> [volume]
				
				if (script[i][2])
					var volume = parseFloat(script[i][2]) / 100;
				else
					var volume = g.DEFAULT_VOLUME;
				
				g._EVENTDATA.push({name: script[i][1], volume: volume});

				g._EVENT.push(function(g, index){
					SFX[g._EVENTDATA[index]['name']].play(g._EVENTDATA[index]['volume']);
				});
				
				
					if (DEBUG)
						console.log(i + ": " + script[i].join());
				
							
				break;
				
				
				
				
				
			
			case 'msgClear':
				//msgClear [time]
				g._EVENTDATA.push(null);
				
				g._EVENT.push(function(g, index){
					g.MSG.erase();
				});
				
				break;
				
				
				
				
				
				
				
			case 'flash':
			
				// flash <time> [color]
				//TODO: Incorporate color
				
				//Every command must put an entry in the _EVENTDATA array in order for it to sync up.
				g._EVENTDATA.push(null);
				
				g._EVENT.push(function(g, index){
					g.flash();
					});
					
				if (DEBUG)
					console.log(i + ": " + script[i].join());
				break;
				
			
			
			
			
			case 'img':
			switch (script[i][1]){
				case 'appear':
					//img appear <label>  x y t
					if (!script[i][4])	var y = 0;
					else					var y = parseInt(script[i][4]);
					
					if (!script[i][5])	var t = 0;
					else					var t = parseInt(script[i][5]);
					
					g._EVENTDATA.push({label: script[i][2], x: parseInt(script[i][3]), y: y, time: t});
					
					g._EVENT.push(function(g, index){
						
						//Keep track of where in the game's array this image is
						IMG[g._EVENTDATA[index].label].gIndex = g.imgList.length;
						g.imgList.push(g._EVENTDATA[index].label);
						
						IMG[g._EVENTDATA[index].label].appear(g._EVENTDATA[index].x, g._EVENTDATA[index].y, g._EVENTDATA[index].time);
						
						if (DEBUG)
									console.log(i + ": " + script[i].join());
					});
					
					break;
					
				case 'pan':
					//img pan <label> x y t
					if (!script[i][5])	var t = 0;
					else					var t = parseInt(script[i][5]);
					
					g._EVENTDATA.push({label: script[i][2], x: parseInt(script[i][3]), y: parseInt(script[i][4]), time: t});
					
					g._EVENT.push(function(g, index){
					
						var x = parseInt(g._EVENTDATA[index].x);
						var y = parseInt(g._EVENTDATA[index].y);
						var t = parseInt(g._EVENTDATA[index].time);
						
						IMG[g._EVENTDATA[index].label].pan(x, y, t);
					
					});
					break;
					
				case 'disappear':
					//img disappear <label> t
					
					if (!script[i][3])	var t = 0;
					else					var t = parseInt(script[i][3]);
					
					g._EVENTDATA.push({label: script[i][2], time: t});
					
					g._EVENT.push(function(g, index){
						
						IMG[g._EVENTDATA[index].label].disappear(g._EVENTDATA[index].time);
					});
					
					break;
			}
			break;
				
			case 'wait':
			
				//wait <time>
				
				//Set the wait timer and tell the script reader to wait for it to count down
				this.waitTimer = parseInt(script[i][1]);
				this.wait = true;
				
				if (g.MSG.STATE != 'OFF')
					g.MSG.STATE = 'BLANK';
				
				if (DEBUG)
					console.log(i + ": " + script[i].join());
					
				break;
	



			case 'bg':
				switch (script[i][1]){
					
					case 'change':
					
						//bg change <label> [time]
						
						if (script[i][3])
							var time = script[i][3];
						else
							var time = 0;
							
						g._EVENTDATA.push({bg: script[i][2], time: time});
						g._EVENT.push(function(g, index){
						
							g.oldBG = g.currentBG;
							g.currentBG = BG[g._EVENTDATA[index]['bg']];
							g.currentBG.appear(g._EVENTDATA[index]['time']);
							
							if (g.oldBG != null)
								g.oldBG.disappear(g._EVENTDATA[index]['time']);
						});
						if (DEBUG)
							console.log(i + ": " + script[i].join());
							
						break;
				}
			
				break;


				
				
			case '':
				//Blank lines, just ignore 'em.
				if (DEBUG)
					console.log(i + ": " + script[i].join());
				break;
				
			
			
			
			case 'jump':
				//jump <script name>
				
				//Prepare the next script to be loaded and switch to the LOADING state
				g.newScript = script[i][1];
				g.STATE = 'LOADING';
				g.NEXT_STATE = 'GAME';
				
				//Break out of this loop
				this.wait = true;
				break;		
				
			//Any character-specific commands will be parsed in the default case, since the reader must check through the list of labels to see if it's valid	
			default:									//If it's none of these commands, check character labels
				var isActor = false;				//Marked true if label is found
				
				for (j = 0; j < g.actorList.length; j++)		//Search through character labels to see if this name has been defined
					if (script[i][0] == g.actorList[j])
						isActor = true;
				
				if (isActor){
					if (script[i][1][0] == '"')			//Indicates dialogue
						{
						
							// <character label> "<dialogue>"
							
							//Create a message out of the first word
								
							var msg = script[i][1],
								actor = script[i][0];
							
							//TODO: If there are no more commands available after the quotation mark, fix this up to account for that.
							//Add the rest of the message
							for (j = 2; j < script[i].length; j++)
								msg = msg + ' ' + script[i][j];
							
							g._EVENTDATA.push({msg: msg, actor: actor});
							
							//Turn on the message box button
							g.BUTTONS[0].btn.on();
							
							g._EVENT.push(function(g, index){
								g.MSG.display(g._EVENTDATA[index]['msg'], g._EVENTDATA[index]['actor']);
							});
							
							if (DEBUG)
								console.log(i + ": " + script[i].join());
								
							//Put the script reader in waiting status until the player advances the text box.
							this.wait = true;
							
						}
					else
						switch (script[i][1]){				//Command recognized as a character label and is not dialogue. Proceed with character functions.
						
							case 'pan':
								
								//<character label> pan <percent> [time]
								
								if (script[i][3])
									var time = parseInt(script[i][3]);
								else
									var time = 0;
									
								g._EVENTDATA.push({actor: script[i][0], x: parseInt(script[i][2]), t: time});
								g._EVENT.push(function(g, index){
									ACTOR[g._EVENTDATA[index]['actor']].pan(g._EVENTDATA[index]['x'], g._EVENTDATA[index]['t']);
								});
								
								if (DEBUG)
									console.log(i + ": " + script[i].join());
								break;
								
							case 'appear':
								
								//<character label> appear <percent> [time]
								
								if (script[i][3])
									var time = parseInt(script[i][3]);
								else
									var time = 0;
								
								g._EVENTDATA.push({actor: script[i][0], x: parseInt(script[i][2]), t: time});
								g._EVENT.push(function(g, index){
									ACTOR[g._EVENTDATA[index]['actor']].appear(g._EVENTDATA[index]['x'], g._EVENTDATA[index]['t']);
								});
								
								if (DEBUG)
									console.log(i + ": " + script[i].join());
									
								break;
						
							case 'disappear':
								
								//<character label> disappear [time]
								
								if (script[i][2])
									var time = parseInt(script[i][2]);
								else
									var time = 0;
								
								g._EVENTDATA.push({actor: script[i][0], t: time});
								g._EVENT.push(function(g, index){
									ACTOR[g._EVENTDATA[index]['actor']].disappear(g._EVENTDATA[index]['t']);
								});
								
								if (DEBUG)
									console.log(i + ": " + script[i].join());
									
								break;
								
							case 'change':
							
								//<character label> change <sprite label> [time]
								
								if (script[i][3])
									var time = parseInt(script[i][3]);
								else
									var time = 0;
									
								g._EVENTDATA.push({actor: script[i][0], sprite: script[i][2], t: time});
								g._EVENT.push(function(g, index){
									ACTOR[g._EVENTDATA[index]['actor']].change(g._EVENTDATA[index]['sprite'], g._EVENTDATA[index]['t']);
								});
								
								if (DEBUG)
									console.log(i + ": " + script[i].join());
									
								break;
						}
				}
				
				
				
				//Not recognized as a label, so this is either a comment or an unrecognized command.
				else
					if(script[i][0][0] != '*')			//If this line ISN'T a comment
						console.log("ERROR: Command " + script[i][0] + " was not recognized! (Line " + i + ")");
					
				break;
				
		}
		
		i++;
	}
	
	this.startPosition = i;
	//Return control to the game
	//Game should execute events in queue and will handle unchecking this flag again
	
}




ScriptReader.prototype.resume = function(){
	//Just offer an easy way for the game to turn the script reader back on.
	this.wait = false;
}




ScriptReader.prototype.retrieveNewAssets = function(){
	return this.newAssets;
}




ScriptReader.prototype.deleteAssets = function(){
	this.newAssets.length = 0;
}

















/////////////////////////////////////////////////////
//GAME												*6
/////////////////////////////////////////////////////

function Game(c){
	this.TEXT_SPEED = 'SLOW';							//Can be 'SLOW', 'NORMAL', or 'FAST'
	this.TEXT_FONT = "40px arial";
	this.MSG_BUFFER = 40;								//Distance (in pixels) between dialogue and the edges of the screen
	this.STATE = 'DEFAULT';
	this.NEXT_STATE = 'DEFAULT';
	this._EVENT = new Array();							//Array of game events dictated by script.
	this._EVENTDATA = new Array();						//Variables used with events
	this._INTERVAL_ID = 0;								//Used with setInterval() to establish game loop
	this._GSCRIPT = new Array();						//Current script being used			FORMAT:  _GSCRIPT[line][word]
	this.DEFAULT_VOLUME = .5;							//Volume to play music and sfx if none is specified
	this.MSG = new MessageBox(this);					//Message box object
	this.BUTTONS = new Array();
	this.MAX_SFX = 10;									//Number of instances of the same sound that can overlap
	this.MENU = new GMenu(this);						//Create the game menu
	this.GLOBAL_VOLUME = 1;								//Percentage at which to play all sounds and music
	
	this.currentBG = null;
	this.oldBG = null;
	this.sMenu = {image: new Image()};					//Settings menu
	this.sReader = new ScriptReader(this);
	this.newScript = '_INIT';									//If left blank, no new script is loaded. If LOADING state is entered while this has a value, the script associated with that value is loaded
	this.actorList = new Array();							//Lists the labels for actors defined in the game script.
	this.imgList = new Array();								//List the labels for images that currently need to be drawn.
	
	//BUTTONS
	//	0. Message box
	this.BUTTONS.push({btn: new Button(this, 0, 49, WIDTH, HEIGHT - 50), state: false});		//Defines area user can click to advance text, but not activate the menu.
	this.BUTTONS[0].btn.assign('click', this.BTNCLICK_MSG);												//Assigns function to call when user clicks inside button
	//	1. Options menu
	this.BUTTONS.push({btn: new Button(this, 0, 0, 50, 50), state: false});
	this.BUTTONS[1].btn.assign('click', this.BTNCLICK_ENTRY);
	this.BUTTONS[1].btn.on();
	
	
	
	//FLAGS
	this.SKIP_TEXT = true;								//Flag determining whether or not text-skipping is allowed. Should be changeable in settings.
	this.firstLoad = true;								//Flag determining if everything is loading for the first time
	this.assetsDownloading = false;						//Flag to determine whether or not assets are currently being downloaded
	this.assetsDownloaded = false;						//Flag to determine whether or not assets have been downloaded
	this.scriptDownloading = false;
	this.scriptDownloaded = false;
	
	this.loadImg = null;								//The 'loading' animation
	this.flashTimer = -1;								//Used to flash screen
	

}

Game.prototype.update = function(){
	
	timer.tick();											//Advance one frame
	c.clearRect (0, 0, WIDTH, HEIGHT);		//Clear the screen so that a new one can be drawn
	
	switch (this.STATE){
	
		case 'DEFAULT':									//Game is in the state when page is first launched. Will change NEXT_STATE to 'TITLE', queue title screen assets, then change STATE to 'LOADING'
			this.STATE = 'LOADING';
			this.NEXT_STATE = 'GAME';	//TODO: Change to 'TITLE'
			break;
			
		case 'LOADING':
			this.updateLoading();
			this.drawLoading();
			break;
			
		case 'TITLE':
			this.updateTitle();
			this.drawTitle();
			break;
					
		case 'GAME':
			this.updateGame();
			this.drawGame();
			break;
			
		case 'OPTIONS':
			this.updateOptions();
			this.drawOptions();
			break;
			
	}
}




Game.prototype.updateLoading = function(){					//Update function for 'LOADING' state
	
	var that = this;
	if (!this.scriptDownloading){
		//Load game script into Game._GSCRIPT
		txt.open("GET", "scripts/" + this.newScript + ".txt", true);
		txt.send();
		this.scriptDownloading = true;
	}
	
	if (txt.readyState === 4 && (txt.status === 200 || txt.status === 0)){ 			//If text file is loaded successfully, set everything up to the run the game
			this.scriptDownloaded = true;
	}
	
	if (this.scriptDownloaded && !this.assetsDownloading){	//Script is downloaded, assets have not started downloading yet
		//Erase the old script
		this._GSCRIPT.length = 0;
		
		//Split every line of the script into members of an array
		this._GSCRIPT = txt.responseText.split('\n');
		//Split every word in each line into members of an array		
		for (i = 0; i < this._GSCRIPT.length; i++){
			this._GSCRIPT[i] = this._GSCRIPT[i].split(' ');
			
			//If this isn't the last line, remove the blank space from the end of the string. This is a weird glitch.
			if (i != this._GSCRIPT.length - 1){
				//This is basically just chopping off the last character.
				var lastString = this._GSCRIPT[i][this._GSCRIPT[i].length - 1];
				this._GSCRIPT[i][this._GSCRIPT[i].length -1] = removeLastChar(lastString);
			}
		}
		
		this.sReader.loadScript(this._GSCRIPT, this);		//Scan the script for download queues and definitions
		
		//for (i = 0; i < this._GSCRIPT.length; i++)		//DEBUG: See the game script as it is initially loaded into the program
		//	console.log(this._GSCRIPT[i]);
		
		if (DEBUG) console.log("Script loaded successfully");
		
		this.assetsDownloading = true;

		AM.downloadAll(function(){
			that.assetsDownloaded = true;	//The scope changes to AM when this function is run!
			});		
		}
	
	//If everything has been downloaded		
	if (this.assetsDownloaded){		
		//Cease displaying that infernal 'loading' image
		ANIM['LOAD'].endLoop();		
		//Turn off all these download flags		
		this.assetsDownloading = false;						
		this.assetsDownloaded = false;
		this.scriptDownloading = false;
		this.scriptDownloaded = false;
		
		var newAssets = this.sReader.retrieveNewAssets();
		
		//Assign new assets to their respective arrays
		for (j = 0; j < newAssets.length; j++){
			switch (newAssets[j].type){
				case 'sfx':
					SFX[newAssets[j].label] = new SoundEffect(this, 'resources/sfx/' + newAssets[j].path + '.' + audioType, this.MAX_SFX);
					break;
				
				case 'music':
					BGM[newAssets[j].label] = new Music(this, 'resources/music/' + newAssets[j].path + '.' + audioType);
					break;
					
				case 'bg':
					BG[newAssets[j].label] = new Background('resources/img/bg/' + newAssets[j].path);
					break;
					
				case 'image':
					IMG[newAssets[j].label] = new Img(this, 'resources/img/' + newAssets[j].path);
					break;
					
				case 'animation':
					ANIM[newAssets[j].label] = new Animation(this, 'resources/img/' + newAssets[j].path, newAssets[j].data);
					break;
			}
		}
		
		//Clear the download queue
		AM.clearQueue();
		this.sReader.deleteAssets();
		
		this.STATE = this.NEXT_STATE;
		
	}
}




//Draw function for 'LOADING' state. Basically just animates the loading GIF.
Game.prototype.drawLoading = function(){							
	//If it's not already playing, display the 'loading' animation in the center of the screen
	if (ANIM['LOAD'].isPlaying == false){
		ANIM['LOAD'].loop((WIDTH /2) - (ANIM['LOAD'].frameArray[0].width / 2), (HEIGHT / 2) - (ANIM['LOAD'].frameArray[0].height / 2));	
	}
	
	ANIM['LOAD'].draw();
}




Game.prototype.updateTitle = function(){

}




Game.prototype.drawTitle = function(){

}




//Update function for 'GAME' state
Game.prototype.updateGame = function(){						
	
	//Update script reader.  Either read new commands or wait for control to return.
	this.sReader.readScript(this._GSCRIPT, this);
	
	//Go through every event in the queue and run it
	for (i = 0; i < this._EVENT.length; i++)
		this._EVENT[i](this, i);
		
	/*		gscript implementation
	F.update();
	*/
		
	
	//Clear out the _EVENT and _EVENTDATA arrays
	this._EVENT.length = 0;
	this._EVENTDATA.length = 0;
	

	//Update all characters
	for (i = 0; i < this.actorList.length; i++){
		ACTOR[this.actorList[i]].update();
	}
	
	//Update all on-screen images
	for (i = 0; i < this.imgList.length; i++){
		IMG[this.imgList[i]].update();
	}
	
	//Update background
	if (this.currentBG != null)
		this.currentBG.update();
	
	if (this.oldBG != null)
		this.oldBG.update();
		
	//Update message box
	this.MSG.update();
	
	for (i = 0; i < this.BUTTONS.length; i++){
		this.BUTTONS[i].btn.update();
	}
		
}




Game.prototype.drawGame = function(){

	//Draw background
	if (this.currentBG != null)
		this.currentBG.draw();
		
	if (this.oldBG != null)
		this.oldBG.draw();
		
	//Draw all character sprites
	for(i = 0; i < this.actorList.length; i++)
		ACTOR[this.actorList[i]].draw();
	
	//Draw all images
	for (i = 0; i < this.imgList.length; i++)
		IMG[this.imgList[i]].draw();
	//Flash screen, if prompted
	if (this.flashTimer > 0){
		if (this.flashTimer == 0 || this.flashTimer == 2)		c.globalAlpha = .5;				//Flashes at half opacity on first and third frames
		
		c.fillStyle = '#FFFFFF'; 
		c.fillRect(0, 0, WIDTH, HEIGHT);
		
		if (this.flashTimer == 0 || this.flashTimer == 2)		c.globalAlpha = 1;				//Reset opacity
		
		this.flashTimer--;
	}

	//Execute draw functions of specific components
	this.MSG.draw();
	
	c.globalAlpha = .2;
	c.drawImage(IMG['menuGear'].src, 0, 0);
	c.globalAlpha = 1;
}




Game.prototype.updateOptions = function(){
	this.MENU.update();
}




Game.prototype.drawOptions = function(){
	
	//Draw everything in the current scene
	this.drawGame();
	this.MENU.draw();
}




//Function for handling the user clicking inside the main playfield
Game.prototype.BTNCLICK_MSG = function(g){

	//If the user clicks while a message is being written and text-skipping is enabled, immediately finish the message
	if (g.MSG.STATE == 'WRITING' && g.SKIP_TEXT)
		g.MSG.onScreenLength = g.MSG.msg.length;
	
	if (g.MSG.STATE == 'COMPLETE'){
		//Erase the message, resume loading in script commands
		g.BUTTONS[0].btn.off();
		g.sReader.resume();
	}
}




Game.prototype.BTNCLICK_ENTRY = function(g){

	//TODO: Turn down the music
	if (g.STATE == 'GAME'){
		SFX['menuOpen'].play(.3);
		g.STATE = 'OPTIONS';
	}
	else
		that.g.STATE = 'GAME';

}




Game.prototype.flash = function(){
	this.flashTimer = 2;
}



















/////////////////////////////////////////////////////
//Music, Sound Effects, Background					*7
/////////////////////////////////////////////////////

function Music(g, path){
	this.g = g;
	this.src = AM.getAsset(path);
	this.volume = 0;
}




Music.prototype.play = function(v){
	var that = this;
	this.src.volume = v * this.g.GLOBAL_VOLUME;
	this.src.addEventListener("ended", function(){
		that.src.currentTime = 0;;
		that.src.play();
	}, false);
	
	this.src.play();
}




Music.prototype.stop = function(t){
	this.src.pause();						//TODO: Have parameter t control fadeout
	this.src.currentTime = 0;
}




function SoundEffect(g, path, max){
	this.g = g;
	
	//Create an array of instances
	this.array = new Array();
	for (i = 0; i < max; i++)
		this.array[i] = new Audio(path);
	this.max = max;
}




SoundEffect.prototype.play = function(v){
	var sfxIndex = -1;
	var that = this;
	
	//Look through the array for a slot that ISN'T playing
	for (i = 0; i < this.max; i++){
		if (this.array[i].paused){
			var sfxIndex = i;
			break;
		}
	}
	
	//If it found an "empty" slot, play
	if (sfxIndex > -1){
		this.array[sfxIndex].volume = v * this.g.GLOBAL_VOLUME;
		this.array[sfxIndex].play();
		
		//Because Internet Explorer can't be bothered to do this automatically like the other browsers do!
		this.array[sfxIndex].addEventListener('ended', function(){
			that.array[sfxIndex].pause();
		}, false);
	}
	
	
}




function Background(path){
	this.img = AM.getAsset(path);
	this.color = "#FFFFFF";
	
	this.alpha = 0;
	this.alphaStep = 0;
}




Background.prototype.appear = function(t){
	
	if (t == 0){
		this.alpha = 1;
		this.alphaStep = 0;
	}
	else
		this.alphaStep = 1 / t;
}




Background.prototype.disappear = function(t){
	if (t == 0){
		this.alpha = 0;
		this.alphaStep = 0;
	}
	else
		this.alphaStep = -(1 / t);
}




Background.prototype.update = function(){

	//Update opacity, if necessary
	if (this.alphaStep != 0){
		if (this.alpha + this.alphaStep >= 1){			//Finished fading in
			this.alpha = 1;
			this.alphaStep = 0;
			this.isChanging = false;
		}
		else if (this.alpha + this.alphaStep <= 0){		//Finished fading out
			this.alpha = 0;
			this.alphaStep = 0;
		}
		else											//If alpha is not changing, alphaStep will be 0, so no change will occur
			this.alpha += this.alphaStep;
	}
}




Background.prototype.draw = function(){
	//Draw the background
	if (this.alpha > 0){
		c.globalAlpha = this.alpha;
		c.drawImage(this.img, 0, 0);
		c.globalAlpha = 1;
	}
}
















/////////////////////////////////////////////////////
//Message Box										*8
/////////////////////////////////////////////////////
//The message box which displays all dialogue in the game.  Unless specified, a message will pause
//the script reader until the user clicks to continue.  
//TODO: Allow the script-writer to control whether to leave a blank message box or to remove it during
//other events which cause the script reader to pause.

function MessageBox(g){
	this.g = g;										//Game object the message box belongs to
	this.msg = new Array();					//Array of strings, one for each line, to display
	this.charName = '';							//Name of character speaking
	this.currentGender = null;				//Male, female, or non-specified (narration, thoughts, etc)
	this.labelColor = '#8855CC';			//Color of character nameplates
	this.highlightColor = '#FFCC00';
	this.thoughtColor = '#55FFFF';
	this.STATE = 'OFF';						/*	Defines behavior of message box
														OFF: Do not display, do not update.
														BLANK: Display empty message box
														WRITING: Currently writing a message
														COMPLETE: Finished message, ready to proceed
														*/
	//Setup variables
	this.onScreenLength = 0;				//Length of message currently displayed on the screen
	this.newLine = new Array(0, 0, 0);	//Location in string to break the message into a new line
	this.newLinePos = 0;						//Keeps track of which line break is next
	this.wordStart = 0;							//First character in the current word
	this.applyTag = '';							//Stores tag information to apply to the next unaltered character
	this.formatTag = '';							//Tags affecting how the message is displayed, such as the new line (*N) tag
	
	//Flags	and timers
	this.tickTimer = 0;							//Ticks once every number of frames specified
	this.tickMax = 3;
	this.puncTimer = -1;						//Pauses message-writing for a certain number of frames depending on punctuation
	this.puncStopMax = 20;					//Determine pause length for stops (. ! ?)
	this.puncCommaMax = 2;				//Determine pause length for commas
	this.namePos = 0;							//Which side of the screen to display the character name. 0 is left, 1 is right.
	this.drawNameTag = false;				//Whether or not to display the nametag
}




MessageBox.prototype.display = function(msg, actor){
	
	//Clear the old message
	this.clear();
	
	var 	g = this.g,
			that = this;
	
	//Draw the nametag if the actor has a name
	if (ACTOR[actor].name != '' && ACTOR[actor].name != null){
		this.drawNameTag = true;
		//Decide whether to draw the nametag on the left or right side
		if (ACTOR[actor].xPos > 50)
			this.namePos = 0;
		else
			this.namePos = 1;
		
		this.charName = ACTOR[actor].name;
		}
		
	this.currentGender = ACTOR[actor].gender;
	
	//If the message is in quotations, remove them.  This check allows us to manually throw the message box some messages for debugging.
	if (msg[0] == '"'){
		msg = removeFirstChar(msg);
		msg = removeLastChar(msg);
	}

	c.font = g.TEXT_FONT;
	
	//Check for tags, remove and store in array if necessary. Otherwise, measure the text.  If the end of the line is reached, set a new line point.  Otherwise, apply the current tag data.
	
	for (i = 0; i < msg.length; i++){
		
		//Check if this character is a tag
		//Characters that alter format should be listed in the first condition
		if (msg[i] == '*'){
			if (msg[i + 1] == 'N')
				this.formatTag += msg[i + 1];
			else
				this.applyTag += msg[i + 1];

			//Remove the tag and its operating character
			msg = removeChar(msg, i, 2);
			i--;
		}
		else if (msg[i] == ' ' || i == msg.length - 1){
			//Measure the text to see if we've reached the edge of the message box
			//Start at the first character in the current line
			var testLine = msg.substr(this.newLine[this.newLinePos], i - this.newLine[this.newLinePos]);
			var pixWidth = c.measureText(testLine).width;
			var pixLimit = WIDTH - (g.MSG_BUFFER * 2);
			
			//If the current line exceeds the allocated length...
			if (pixWidth > pixLimit){
				createNewLine();
			}
			
			//Add data to array.  Tags cannot be applied to spaces or the final character, so this is left blank.
			this.msg.push({c: msg[i], tags: ''});
			//Set the beginning of the next word to the next character in the string
			this.wordStart = i + 1;
		}
		else{
			this.msg.push({c: msg[i], tags: this.applyTag});
			this.applyTag = '';
			
			//Apply any format tags
			for (j = 0; j < this.formatTag.length; j++){
				switch(this.formatTag[j]){
					case 'N':
						createNewLine();
				}
			}
			this.formatTag = '';
		}
	}
	
	this.STATE = 'WRITING';
	
	//Sets the position for a new line to start at the current position
	function createNewLine(){
		that.newLinePos++;
		that.newLine[that.newLinePos] = that.wordStart;
			
		//Check for a leading space
		if (msg[i+ 1] == ' '){
			msg = removeChar(msg, i + 1, 1);
		}
	}
}



MessageBox.prototype.update = function(){
	
	g = this.g;
			
	if (this.STATE == 'WRITING'){
		if (this.puncTimer >= 0)
			this.puncTimer--;
		else{
		
			//Set the number of characters to update per frame
			switch(g.TEXT_SPEED){								
				case 'SLOW':
					var speed = 1;
					break;
				case 'NORMAL':
					var speed = 2;
					break;
				case 'FAST':
					var speed = 3;
					break;
				default:
					//If text speed is not specified somehow
					var speed = 1;
					console.log("ERROR: TEXT_SPEED not specified. Setting speed to SLOW.");
					break;
			}
			
			
			//Add characters to the display message
			for (i = 0; i < speed; i++){
					
				//If adding one more character will COMPLETE the message...
				if (this.onScreenLength >= this.msg.length){
					SFX['textEnd'].play(1);
					ANIM['nextArrow'].loop(WIDTH - 30, HEIGHT - 40);
					this.STATE = 'COMPLETE';
						
					return;
				}									
				
				this.onScreenLength++;
				
				for (j = 0; j < this.msg[this.onScreenLength - 1].tags.length; j++){
					this.handleTag(this.msg[this.onScreenLength - 1].tags[j]);
				}
				
				//Check for punctuation
				var newestChar = this.msg[this.onScreenLength -1].c;
				
				//Check if this is the last character of the word AND that the message isn't complete
				if (this.onScreenLength != this.msg.length){
					if (this.msg[this.onScreenLength].c == ' '){
						if (newestChar == '.' || newestChar == '!' || newestChar == '?'){
							this.puncTimer = this.puncStopMax;
							
							//Break out of the loop
							i = speed;
						}
						else if (newestChar == ','){
							this.puncTimer = this.puncCommaMax;
							
							//Break out of the loop
							i = speed;	
						}
					}
				}
			}
			
			//Play tick sound every few frames
			if (this.tickTimer > 0)
				this.tickTimer--;
			else{
				if (this.currentGender == 'm')			SFX['textMale'].play(.8);
				else if (this.currentGender == 'f')		SFX['textFemale'].play(.8);
				SFX['textTick'].play(1);
				
				this.tickTimer = this.tickMax;
			}
		}	
	}
	if (this.STATE == 'BLANK')
		if (this.drawNameTag == true)
			this.drawNameTag = false;
}	





MessageBox.prototype.draw = function(){
	
	if (this.STATE == 'OFF')
		return;
		
	c.drawImage(IMG['textBG'].src, 0, HEIGHT - 172);
	
	if (this.STATE != 'BLANK'){
		c.font = this.g.TEXT_FONT;
	
		var 	x = this.g.MSG_BUFFER,
				hFlag = false,
				tFlag = false,
				oldLine = 0;
		
		//Draw each character
		for (i = 0; i < this.onScreenLength; i++){
			
			var metrics = c.measureText(this.msg[i].c).width;
			var line = 0;
			
			//Determine which line we're on
			for (j = 1; j < this.newLine.length; j++){
				if (i >= this.newLine[j] && this.newLine[j] > 0)
					line++;
			}
			//Determine if we're jumping lines
			if (line > oldLine){
				oldLine++;
				x = this.g.MSG_BUFFER;
			}
			
			//Draw text shadow
			c.fillStyle = '#000000';
			c.fillText(this.msg[i].c, x + 2, 530 + (45 * line) + 2);
			
			for (j = 0; j < this.msg[i].tags.length; j++){
				if (this.msg[i].tags[j] == 'H')
					hFlag = !hFlag;
					
				if (this.msg[i].tags[j] == 'T')
					tFlag = !tFlag;
			}
			
			if (hFlag)
				c.fillStyle = this.highlightColor;
			else if (tFlag)
				c.fillStyle = this.thoughtColor;
			else
				c.fillStyle = '#FFFFFF';
				
			c.fillText(this.msg[i].c, x, 530 + (45 * line));
			
			x += metrics;
		}
		
		//Draw a character nametag when appropriate
		if(this.drawNameTag){
		
			c.font = "40px Arial";
			var nameWidth = c.measureText(this.charName).width;

			if (this.namePos == 0){
				c.fillStyle = '#000000';
				c.globalAlpha = .5;
				c.fillRect(0 + 3, HEIGHT - 202 - 15 + 3, 10 + nameWidth + 10, 45);
				c.globalAlpha = 1;
				
				c.fillStyle = this.labelColor;
				c.fillRect(0, HEIGHT - 202 - 15, 10 + nameWidth + 10, 45);
				
				c.fillStyle = "#FFFFFF";
				c.fillText(this.charName, 10, HEIGHT - 182);
			}
			else{
				c.fillStyle = '#000000';
				c.globalAlpha = .5;
				c.fillRect(WIDTH - 10 - nameWidth - 10 + 3, HEIGHT - 202 - 15 + 3, 10 + nameWidth + 10, 45);
				c.globalAlpha = 1;
				
				c.fillStyle = this.labelColor;
				c.fillRect(WIDTH - 10 - nameWidth - 10, HEIGHT - 202 - 15, 10 + nameWidth + 10, 45);
				
				c.fillStyle = "#FFFFFF";
				c.fillText(this.charName, WIDTH - nameWidth - 10, HEIGHT - 182);
			}
		}
	}
	
	if (this.STATE == 'COMPLETE')
		ANIM['nextArrow'].draw();
		
}




MessageBox.prototype.clear = function(){
	//Erases text, but does NOT automatically remove dialogue box from the screen
	this.msg.length = 0;
	this.currentGender = null;
	this.charName = null;
	
	this.onScreenLength = 0;
	this.newLine = [0, 0, 0];
	this.newLinePos = 0;
	this.wordStart = 0;
	this.applyTag = '';
}




MessageBox.prototype.erase = function(){
	//Gets rid of the message box
	this.STATE = 'OFF';
}	




MessageBox.prototype.handleTag = function(tag){
	var g = this.g;
	
	//*F		Flash screen
	if (tag == 'F'){
		g._EVENTDATA.push(null);
		
		g._EVENT.push(function(g, index){
			g.flash();
		});
	}
}



















/////////////////////////////////////////////////////
//Button											*9
/////////////////////////////////////////////////////

//Draws a rectangle indicating a clickable area and organizes handling of mouse events in that area
//Objects containing a clickable area will be responsible for running the update function when applicable.
//This class also contains no draw function.  Again, the object containing the button will be expected to
//update its sprite/animation/etc in response to user input.
//Clickable areas can be turned on and off depending on when they're "active"

function Button(o, x, y, width, height){
	this.o = o;														//The object containing the button
	this.x = x;														//x position of rectangle
	this.y = y;														//y position of rectangle
	this.width = width;												//width of rectangle
	this.height = height;											//height of rectangle
	this.debugShade = "#000000";									//Color to highlight button if debug is enabled
	
	this.EVENT = {mouseOver: function(){}, mouseDown: function(){}, click: function(){}};	//List of functions to execute when mouse events occur inside the button

	this.isClicked = false;											//If a click was initiated inside the box, the mouse cursor is still inside the box, and the mouse is still clicked down
	this.isClickedOutside = false;									//If user clicked outside of the box first
	this.isActive = false;											//Whether or not the button is currently clickable
	this.highlight = false;											//Highlight the box when active. Used for debugging.
	this.START = 0;													//Did the user initiate a click outside (0) or inside (1) the button?
	this.CURRENT = 0;												//Is the mouse outside (0) or inside (1) the button?
	
	if (DEBUG_BUTTONS)
		this.highlight = true;
}




Button.prototype.update = function(){

	if (this.isActive){
		
		//Check status of initial position and current position
		
		//We only care about setting the start flag if the mouse is down
		if (INPUT['click'])
			if ((INPUT['xDown'] >= this.x && INPUT['xDown'] <= this.x + this.width) && (INPUT['yDown'] >= this.y && INPUT['yDown'] <= this.y + this.height))
				this.START = 1;
				
		//Current flag is checked on every frame the while the button is active
		if ((INPUT['x'] >= this.x && INPUT['x'] <= this.x + this.width) && (INPUT['y'] >= this.y && INPUT['y'] <= this.y + this.height))
			this.CURRENT = 1;
		else
			this.CURRENT = 0;
		
		//Events based on logic table using INPUT['click'], this.START, and this.CURRENT
		if (!this.START && this.CURRENT){
			this.EVENT['mouseOver'](this.o);
			this.debugShade = "#440000";
		}
		else if (!INPUT['click'] && this.START && this.CURRENT){
			this.EVENT['click'](this.o);
			this.debugShade = "#BB0000";
			this.START = 0;
		}
		else if (!INPUT['click'] && this.START && !this.CURRENT){
			this.debugShade = "#220000";
			this.START = 0;
		}
		else if (INPUT['click'] && this.START && this.CURRENT){
			this.EVENT['mouseDown'](this.o);
			this.debugShade = "#990000";
		}
		else
			this.debugShade = "#220000";
	}
}




Button.prototype.on = function(){
	this.isActive = true;
}




Button.prototype.off = function(){
	this.isActive = false;
}




Button.prototype.draw = function(){

	if (this.highlight){
			c.fillStyle = this.debugShade;
			c.globalAlpha = .2;
			c.fillRect(this.x, this.y, this.width, this.height);
			c.globalAlpha = 1;
		}
		
}




//Tells the object which function to call when a specific event is detected
Button.prototype.assign = function(evt, func){
	this.EVENT[evt] = func;
}

















//		*10
//Menu that can be manipulated while the game is playing.
//Quit || Save || Load || Volume Slider || Exit Menu
function GMenu(g){
	this.g = g;
	this.MAIN_BUTTONS = new Array();			//Array of buttons used in the interface
	this.menuWidth = 300;						//Width of menu panel
	this.menuX = -this.menuWidth;				//Position of the menu
	this.btnIndex = 0;							//Position in main array to add a new button
	
	//Formatting for menu buttons
	this.menuColor = '#BB99FF';
	this.btnBorderX = 20;
	this.btnBorderY = 20;
	this.btnGap = 50;
	this.btnColor = "#FFFFFF";
	this.btnHighlight = "#CCCCCC";
	this.btnDown = "444444";
	
	
	//Flags and timers
	this.OPEN = true;
	this.CLOSE = false;
	this.transitionTime = 10;
	
	//Add buttons to the array and assign their functions.
	this.addButton("RETURN TO GAME", this.BTNCLICK_return);
	this.addButton("SETTINGS", this.BTNCLICK_settings);
	//this.addButton("SAVE GAME", this.BTNCLICK_save);
	//this.addButton("LOAD GAME", this.BTNCLICK_load);
	this.addButton("EXIT TO TITLE", this.BTNCLICK_title);
}




GMenu.prototype.update = function(){
	if (this.OPEN){
	
		this.menuX += this.menuWidth / this.transitionTime;
		
		if (this.menuX >= 0){
			this.menuX = 0;
			//Turn on all the buttons in the main menu
			for (i = 0; i < this.MAIN_BUTTONS.length; i++){
				this.MAIN_BUTTONS[i].btn.on();
			}
			this.OPEN = false;
		}
	}
	else if (this.CLOSE){
	
		//Turn off all the buttons in the main menu
		for (i = 0; i < this.MAIN_BUTTONS.length; i++){
			this.MAIN_BUTTONS[i].btn.off();
		}
	
		this.menuX -= this.menuWidth / this.transitionTime;
		
		if (this.menuX <= -this.menuWidth){
			this.menuX = -this.menuWidth;
			this.CLOSE = false;
			this.OPEN = true;
			
			//Turn up the volume
			this.g.GLOBAL_VOLUME = 1;
			
			this.g.STATE = 'GAME';
		}
	}
	else{
		for (i = 0; i < this.MAIN_BUTTONS.length; i++){
			this.MAIN_BUTTONS[i].color = this.btnColor;
			this.MAIN_BUTTONS[i].btn.update();
			}
	}
}




GMenu.prototype.draw = function(){
	
	c.font = "25px Arial";
	
	//Draw transparent black rectangle over screen
	c.globalAlpha = .9;
	c.fillStyle = '#000000';
	c.fillRect(0, 0, WIDTH, HEIGHT);
	c.globalAlpha = 1;
	
	//Draw background for main menu options
	c.globalAlpha = .5;
	c.fillStyle = this.menuColor;
	c.fillRect(this.menuX, 0, this.menuWidth, HEIGHT);
	c.globalAlpha = 1;
	
	//Write the text for each menu option
	for (i = 0; i < this.MAIN_BUTTONS.length; i++){
		//Draw shadow
		c.fillStyle = "#000000";
		c.fillText(this.MAIN_BUTTONS[i].txt, this.menuX + this.btnBorderX + 3, this.btnBorderY + (i * this.btnGap) + 3 + 20);
		
		//Draw text
		c.fillStyle = this.MAIN_BUTTONS[i].color;
		c.fillText(this.MAIN_BUTTONS[i].txt, this.menuX + this.btnBorderX, this.btnBorderY + (i * this.btnGap) + 20);
		
	}
}




GMenu.prototype.addButton = function(txt, func){
	//Create a menu option and assign it the proper function
	c.font = "25px Arial";
	var metrics = c.measureText(txt);
	var index = this.btnIndex;
	
	this.MAIN_BUTTONS.push({btn: new Button(this, this.btnBorderX, this.btnBorderY + (index * this.btnGap), metrics.width, 30), txt: txt, color: this.btnColor});	
	
	function mouseOver(that){
		that.MAIN_BUTTONS[index].color = that.btnHighlight;
	}
	
	function mouseDown(that){
		that.MAIN_BUTTONS[index].color = that.btnDown;
	}
	
	this.MAIN_BUTTONS[this.btnIndex].btn.assign('click', func);
	this.MAIN_BUTTONS[this.btnIndex].btn.assign('mouseOver', mouseOver);
	this.MAIN_BUTTONS[this.btnIndex].btn.assign('mouseDown', mouseDown);
	
	this.btnIndex++;
}




GMenu.prototype.BTNCLICK_return = function(that){
	//TODO: Turn up the music
	SFX['menuClose'].play(.3);
	that.CLOSE = true;
}




GMenu.prototype.BTNCLICK_settings = function(){
	SFX['menuClick'].play(.3);

}




GMenu.prototype.BTNCLICK_save = function(){
	SFX['menuClick'].play(.3);
}




GMenu.prototype.BTNCLICK_load = function(){
	SFX['menuClick'].play(.3);
}




GMenu.prototype.BTNCLICK_title = function(){
	SFX['menuClick'].play(.3);
}



















//BEGIN EXECUTION
//Build canvas, initialize asset managers, set up global junk
var 	canvas = document.getElementById('canvas'),
		c = canvas.getContext('2d'),
		WIDTH = canvas.width, 								//screen resolution
		HEIGHT = canvas.height,
		DEBUG = false,
		DEBUG_BUTTONS = false,								//Highlights buttons when set to true
		FPS = 60,
		AM = new AssetManager(),
		game = new Game(c),
		timer = new Timer(),
		txt = new XMLHttpRequest(),
		SFX = {},											//Table of sound effects
		BGM = {},											//Table of background music
		BG = {},											//Table of scene backgrounds
		IMG = {},											//Table of image files
		ANIM = {},											//Table of animations
		INPUT = {	click: false, 						//Table of boolean values describing the state of input events
						x: 0, 
						y: 0, 
						xDown: 0, 
						yDown: 0
				},											
		ACTOR = {};										//Table of game characters loaded into the scene
		F = new fscript(game);

//Decide which type of sound file to download based on browser
if ( navigator.userAgent.search("MSIE")>= 0 || navigator.userAgent.search("Opera") >= 0)		
	var audioType = 'mp3';
else
	var audioType = 'ogg';

//Add event listeners for user input
canvas.addEventListener("mousemove", function(evt){
	var bound = canvas.getBoundingClientRect();
	INPUT['x'] = Math.ceil(evt.clientX - bound.left);
	INPUT['y'] = Math.ceil(evt.clientY - bound.top);
}, false);

canvas.addEventListener('mousedown', function(evt){
	INPUT['click'] = true;
	INPUT['xDown'] = INPUT['x'];			//Remember the location when the mouse was initially clicked
	INPUT['yDown'] = INPUT['y'];
}, false);

canvas.addEventListener("mouseup", function(evt){
	INPUT['click'] = false;
}, false);

//Add event listeners for touch devices
canvas.addEventListener("touchmove", function(evt){
	var bound = canvas.getBoundingClientRect();
	INPUT['x'] = Math.ceil(evt.clientX - bound.left);
	INPUT['y'] = Math.ceil(evt.clientY - bound.top);
	
	//Prevent scrolling on touch devices
	evt.preventDefault();
}, false);

canvas.addEventListener("touchstart", function(evt){
	INPUT['click'] = true;
	INPUT['xDown'] = INPUT['x'];			//Remember the location when the mouse was initially clicked
	INPUT['yDown'] = INPUT['y'];
}, false);

canvas.addEventListener("touchend", function(evt){
	INPUT['click'] = false; 	
}, false);

//Downloads the loading GIF then run timer.init() to start running the game
AM.queueDownload('resources/img/interface/LOADING.png');

AM.downloadAll(function(){
	//Set up interface files
	ANIM['LOAD'] = new Animation(game, 'resources/img/interface/LOADING.png', "4 5 328 328 12, 4 339 328 328 12, 4 673 328 328 12, 4 1007 328 328 12");
	
	AM.clearQueue();
	
	//Initiates the game loop
	timer.init(game, FPS);
});
