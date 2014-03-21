function fscript(g){
	this.g = g;											//The game object
	this.fullText = new Array();					//Array containing lines of code to be implemented
	this.newAssets = new Array();			//List of assets, their types, and their labels. Necessary for proper assignment of resources.
	
	this.startLine = 0;								//After loadScript is run, where in the script to start interpreting commands
	this.line = 0;										//Line the reader is currently reading
	
	this.wait = false;								//Whether or not the script reader is waiting. Feel free to manipulate publicly.
	this.waitTimer = -1;							//How long to wait if 'wait x' command is passed.
	
	this.func = {};										//Dictionary of functions for interpreting script commands
}

fscript.prototype.update = function(){


	//Run functions until prompted to wait
	while (!this.wait){
		//If the line isn't blank space or a comment...
		if (this.fullText[this.line].length > 0 && this.fullText[this.line][0] != '*'){
			//Call the function corresponding to this line, pass in the line as a parameter
			this[this.fullText[this.line]](this.fullText[this.line]);
		}
		this.line++;
		
		//If the timer has been activated during the function, turn on the wait
		if (this.waitTimer > -1)		this.wait = true;
	}
	
	//Turn off the wait if the timer hits 0, decrement timer if it's above -1
	if (this.waitTimer == 0)		this.wait = false;
	if (this.waitTimer >= 0)		this.waitTimer--;

}


fscript.prototype.load = function(p){
	//Queues an asset to be downloaded by the asset manager
	var dataType = p[1];
	var path = p[2];
	if (p[1] == 'animation')		var handle = p[p.length -1];
	else								var handle = p[3];
	
	//Append audio extension if necessary, queue download
	if (dataType == 'SFX' || dataType == 'BGM')		path += "." + audioType;
	AM.queueDownload("resources/" + dataType + path, dataType + "_" + handle);
}

fscript.prototype.define = function(p){
	//Defines complicated objects for the script reader to reference
}

fscript.prototype.begin = function(p){
	//Signals that we are finished loading and can break out of the loop
	this.waitTimer = 0;
}

