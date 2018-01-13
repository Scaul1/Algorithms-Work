// This library exposes 3 functions:
//   hanoi.moveDisk(fromPeg, toPeg);  This moves the top disk from the fromPeg to the toPeg
//   hanoi.getSparePeg(fromPeg, toPeg); This returns the remaining peg that isn't the fromPeg or the toPeg
//   hanoi.isSolved(toPeg); This returns true if all disks are on toPeg and no invalid moves have been used
var hanoi = (function() {
var sprites = function() {
"use strict";

    // A minimalist sprite library for KA visualizations.  
    //   Devin Balkcom, June 2014.

    // Uses prototypical object pattern like that described at 
    // http://davidwalsh.name/javascript-objects-deconstruction
    var extend = function(proto, properties) {
        var obj = Object.create(proto);
        for (var p in properties) {
            if ( properties.hasOwnProperty(p) ) {
                obj[p] = properties[p];
            }
        }
        return obj;
    };

    // global constants used to indicate time periods for timelines
    var FOREVER = -1;
    var NONE = -2;

    // optionally pass in a function to draw background, etc in drawInit
    var Scene = {
        init: function(drawInit) {
            this.sprites = [];
            this.drawInit = drawInit;
            this.draggingSprite = NONE;
            this.lastClickedSprite = null;

            this.mousePressed = null;            

        },
        draw: function() {
            if (this.drawInit) { 
                this.drawInit(); 
            }
            for (var i = 0; i < this.sprites.length; i++) {

                var sprite = this.sprites[i];
                sprite.draw();

                // update mouseOver property for sprites and 
                //  selected sprite for the scene
                sprite.mouseOver = false;
                if (sprite.containsPoint(mouseX, mouseY) ) {
                    sprite.mouseOver = true;
                }
            }
            if (this.draggingSprite !== NONE) {
                this.sprites[this.draggingSprite].draw();
            }
        },

        add:  function(sprite) {
            this.sprites.push(sprite);
        },

        removeAll: function(spriteName) {
            for (var i = this.sprites.length - 1; i >= 0 ; i--) {
                if (this.sprites[i].name === spriteName) {
                    this.sprites.splice(i, 1);
                }
            }
        }
    };

    // definition of a grid that can be used to convert between coordinates of
    //  larger cells and pixel coordinates.  Useful for moving sprites between
    //  locations on a on-screen grid. 

    var Grid = {
        // uses object-creation pattern from 
        //  http://davidwalsh.name/javascript-objects-deconstruction

        init: function(leftX, topY, width, height) {
            this.leftX = leftX;
            this.topY = topY;
            this.width = width;
            this.height = height;
        },
        pixelX: function(gridX) {
            return this.leftX + gridX * (this.width);
        },
        pixelY: function(gridY) {
            return this.topY+ gridY * (this.height);
        }
    };

    // Definition of sprite object
    /////////////////////////////

    // name is a string describing the sprite name.  Used to find sprites in the scene
    //  (for example, to remove them).

    // optionally pass in parameters for initial location and height.
    //  However, getX(), getH(), getW(), and getH() are the proper way to get location, width
    //  and height of a sprite.  Typically, these functions are bound to a model
    //  in a model-view design.

    var Sprite = {

        init:  function(name, x, y, w, h) {

            this.name = name;

            this.x = x;
            this.y = y;
            this.w = w;
            this.h = h;

            this.mouseOver = false;
            this.mousePressed = false;

            this.draggable = false;

            this.visible = true;
            this.selected = false;
            this.release = undefined;
        },

        // set up initial functions to return location of the sprite.  For a sprite
        //  that is not bound to a model, these are fine default functions to return location
        getX: function() {
            return this.x;
        },
        getY: function() {
            return this.y;
        },

        getW: function() {
            return this.w;
        },

        getH: function() {
            return this.h;
        },

        show: function() {
            this.visible = true;
        },

        hide: function() {
            this.visible = false;
        },
        select: function() {
            this.selected = true;
        },
        unselect:function() {
            this.selected = false; 
        },

        draw: function() {},

        translate: function(tx, ty) {
            this.x += tx;
            this.y += ty;
        },

        // animate the motion of a sprite from one location to another on a grid.        
        gridMove: function(timeline, workingFrame, grid, fromGridX, fromGridY, toGridX, toGridY) {


            var dx = ( grid.pixelX(toGridX) - grid.pixelX(fromGridX) );
            var dy = ( grid.pixelY(toGridY) - grid.pixelY(fromGridY) );

            // normalize speed
            var length = sqrt(dx * dx + dy * dy);

            var duration = length;

            dx /= length;
            dy /= length;

            timeline.addEvent(workingFrame, duration, this.translate.bind(this, dx, dy) );

            return duration;

        },


        containsPoint: function(x, y) {
            return x >= this.getX() && y >= this.getY()  &&
                x < (this.getX() + this.getW()) && y < (this.getY() + this.getH());
        }
    };

    var TextSprite = Object.create(Sprite);

    TextSprite.init = function(string, x, y, alignment, label) {
        sprites.Sprite.init.call(this, label, x, y, 0, 0);
        this.string = string;
        this.alignment = alignment;
    };

    TextSprite.draw = function() {
        textAlign(this.alignment);
        fill(0, 0, 0);
        text(this.string, this.x, this.y);
        textAlign(LEFT);

    };

    TextSprite.changeText = function(timeline, workingFrame, string) {
        var textSprite = this;
        timeline.addEvent(workingFrame, 1, function() {
            textSprite.string = string;
         } );
    };

    var Timeline = {

        // a simple hashtable with keys that are times (a frame number) 
        //  and values that are functions to run at those times:

        events: [],
        currentFrame: 0, // an int keeping track of current frame to draw
        speed: 1,
        time: 0,  // a float value keeping track of current time on the timeline
        paused: true,

        lastFrame: 0,

        // a list of times that can be advanced to with "step"
        bookmarks: [],
        nextPause: NONE,

        init: function() {
        },

        setSpeed: function(speed) {
            this.speed = speed;
        },

        // add an event function to the list of events.  Optional parameter
        //   fnAtEnd gives a second function to execute after repeats are 
        //   completed 
        addEvent: function(start, repeats, fn, fnAtEnd) {
            var eventObject = {start: start, repeats: repeats, fn: fn};
            this.events.push(eventObject);

            if(fnAtEnd) {
                this.events.push({start: start + repeats - 1, repeats: 1, fn: fnAtEnd});
            }
            this.lastFrame = start + repeats - 1;
        },

        bookmark: function(t) {
            this.bookmarks.push(t);
        },

        update: function() {
            // catch the drawing up to the time by incrementing currentFrame until it
            //  reaches the floor of the time value.
            while(this.currentFrame < floor(this.time) ) {
                for (var i = 0; i < this.events.length; i++) {
                    var event = this.events[i];
                    if(this.currentFrame >= event.start) {
                        if(event.repeats === FOREVER ||
                            this.currentFrame < (event.start + event.repeats)) {
                                event.fn();
                        }
                    }
                }
            
                this.currentFrame++;
            }

            if (this.nextPause !== NONE && this.time >= this.nextPause) {
                this.pause();
            }

            if (!this.paused) {
                this.time += this.speed;
            }

        },

        step: function() {
            // find the least bookmark greater than the current time, and 
            //  enable playing until that time is reached
            for (var i = 0; i < this.bookmarks.length; i++ ) {
                if (this.bookmarks[i] > this.time) {
                    //this.time = this.bookmarks[i];
                    this.nextPause = this.bookmarks[i];
                    this.play();
                    break;
                }
            }
        },

        play: function() {
            this.paused = false;
        },

        pause: function() {
            this.paused = true;
        }
        
    };

    var startAnimation = function(scene, timeline) {

        draw = function() {
            if(typeof timeline !== 'undefined'){
                timeline.update();
            }
            if(typeof scene !== 'undefined'){
                scene.draw();
            }
        };

        mousePressed = function() {

            if(scene.mousePressed) {
                scene.mousePressed();
            }

            for (var i = 0; i < scene.sprites.length; i++) {
                var sprite = scene.sprites[i];
                if(sprite.mouseOver) {
                    sprite.mousePressed = true;
                    scene.lastClickedSprite = sprite;

                    if (sprite.onAction) {
                        sprite.onAction();
                    }

                    if(sprite.draggable) {
                        scene.draggingSprite = i;
                        sprite.lastDragX = mouseX;
                        sprite.lastDragY = mouseY;
                    }
                }
            }

        };

        mouseReleased = function() {
            
            if ((scene.draggingSprite !== NONE) &&
                (scene.sprites[scene.draggingSprite].release !== undefined)) {
                scene.sprites[scene.draggingSprite].release();
            }
            scene.draggingSprite = NONE;

            // clear all mouseDown variables for sprites
            for (var i = 0; i < scene.sprites.length; i++) {
                var sprite = scene.sprites[i];
                sprite.mousePressed = false;
            }
            
        };

        mouseDragged = function() {
            if(scene.draggingSprite !== NONE) {
                var sprite = scene.sprites[scene.draggingSprite];

                if (sprite.draggable) {
                    sprite.translate(mouseX - sprite.lastDragX,
                            mouseY - sprite.lastDragY);
                    sprite.lastDragX = mouseX;
                    sprite.lastDragY = mouseY;
                }
            }
        };

        scene.draw();
    };

    return {extend: extend,
            Scene: Scene,
            Grid: Grid,
            Sprite: Sprite,
            TextSprite: TextSprite,
            Timeline: Timeline,
            startAnimation: startAnimation,
            FOREVER: FOREVER,
            NONE: NONE
        };
}();

var frame = 1;
var WINDOW_SIZE = width || 400;
var objects = (function() {
    var PEG_WIDTH = 20;
    var DISK_HEIGHT = 20;
    var solving = false;
    var draggingEnabled = true;

    // Uses inheritance pattern from 
    //   https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/create
    // ==============================================================================================

    // The disk sprite.
    var Disk = sprites.extend(sprites.Sprite, {
        init: function(diskObject) {
            var w = diskObject.w;
            var h = diskObject.h;
            var number = diskObject.number;
            var peg = diskObject.peg;
            var color = diskObject.color;

            var x = peg.x - w / 2 + peg.w / 2;
            var disksUnder = peg.disks.length;
            var y = peg.y + peg.h- (h+0.1) * (disksUnder + 1);
            
            sprites.Sprite.init.call(this, "Disk " + str(number), x, y, w, h); // calls superclass constructor
            
            this.x=x;
            this.y=y;
            
            this.number = number;
            this.color = color;

            this.draggable = false;
        
            this.release = function() {
                this.dragging = false;
                if (draggingEnabled){
                    //make sure the moved disk came from the top of it's stack
                    if(this.peg.getTopDisk() === this){
                        for (var i = 0; i < pegs.length; i++) {
                            var peg = pegs[i];
                            if (posIsInRect(mouseX, mouseY, peg.x - WINDOW_SIZE / 8, peg.y, WINDOW_SIZE / 4, peg.h)){
                                //check that the destination peg is empty or
                                //that this disk is smaller than the top disk on the destination peg 
                                if ( (peg.countDisks() ===0) ||(this.number < peg.getTopDisk().number ) ) {
                                    this.moveToPeg(peg);
                                }
                                break;
                            }
                        }
                    }
                    //snaps disk back to position when released
                    timeline.addEvent(frame - 3, 1, this.moveToPegPosition.bind(this));
                }
            };

            this.peg = peg;
            this.peg.addDisk(this);
            scene.add(this);
            
        },

        moveToPeg: function(destPeg) {
            // Moves the disk around in the data structures to seemingly move it from one disk to another
            this.peg.removeDisk();
            this.peg = destPeg;
            this.peg.addDisk(this);
            this.dragging = false;
        },
        
        moveToPegPosition: function(){
            //move the position of the disk
            this.x = this.peg.x + this.peg.w / 2 - this.w / 2;
            var disksUnder = this.peg.getNumberOfDisksUnder(this);
            this.y = this.peg.y + this.peg.h - (this.h+0.1) * (disksUnder + 1);
        },

        draw: function() {
            
            textAlign(CENTER, CENTER);
            stroke(lerpColor(0, 0, 0));
 
            fill(this.color[0], this.color[1], this.color[2]);
            rect(this.x, this.y, this.w, this.h, 3);

            // draw disk number
            fill(0, 0, 0);
            text(this.number, this.x + this.w / 2, this.y + this.h / 2);
        },

        onAction: function() {
            this.dragging = draggingEnabled;
            this.draggable = (this === this.peg.getTopDisk());
        }
    });

    var Peg = sprites.extend(sprites.Sprite, {
        init: function(pegObject) {
            var x = pegObject.x;
            var y = pegObject.y;
            var w = pegObject.w;
            var h = pegObject.h;
            var letter = pegObject.letter;
            var number = pegObject.number;

            sprites.Sprite.init.call(this, "Peg " + letter, x, y, w, h);
            this.letter = letter;
            this.number = number;
            this.disks = [];
            scene.add(this);
        },

        removeDisk: function() {
            if(this.disks.length === 0){ return;}
            this.disks.pop();
        },

        addDisk: function(disk) {
            this.disks.push(disk);
        },

        countDisks: function() {
            return this.disks.length;
        },

        getTopDisk: function() {
            return this.disks[this.disks.length-1];
        },

        getNumberOfDisksUnder: function(disk) {
            return this.disks.indexOf(disk);
        },

        draw: function() {
            textAlign(CENTER, CENTER);
            stroke(lerpColor(0, 0, 0));
            fill(149, 149, 149);    // dark gray, peg color from Tom Cormen's images
            rect(this.x, this.y, this.w, this.h, 3);

            // draw peg letter
            fill(0, 0, 0);
            text(this.letter, this.x + this.w / 2, this.y + 15);
        }
    });

    var Table = sprites.extend(sprites.Sprite, {
        init: function(tableObject){
            var x = tableObject.x;
            var y = tableObject.y;
            var w = tableObject.w;
            var h = tableObject.h;

            sprites.Sprite.init.call(this, "Table", x, y, w, h);
            scene.add(this);
        },

        draw: function() {
            textAlign(CENTER, CENTER);
            stroke(lerpColor(0, 0, 0));
            fill(139, 59, 4);
            rect(this.x, this.y, this.w, this.h, 3);
            frame++;
        }
    });

    // End classes
    // ===============================================================================================
    // Start functions

    // From devin's code:
    var posIsInRect = function(x, y, rectX, rectY, width, height) {
        // Returns a boolean for whether the given position is 
        //  within the specified rectangle

        return (x >= rectX && x < rectX + width && y >= rectY && y < rectY + height);
    };

    var workingFrame = 0;

    var updateWorkingFrame = function(value) {
        workingFrame = value;
    };

    var getWorkingFrame = function() {
        return workingFrame;
    };

    // End functions
    //=================================================================================================

    var scene = Object.create(sprites.Scene);
    scene.init(function() {
        background(255, 255, 255);
        textAlign(CENTER, CENTER);
    });
    var timeline = Object.create(sprites.Timeline);

    var pegs = [];
    var disks = [];

    var numberOfDisks = 5;

    var calcDiskHight = DISK_HEIGHT;

    if ((numberOfDisks + 1) * DISK_HEIGHT > (WINDOW_SIZE / 6) * 3 - DISK_HEIGHT  * 1.3) {
        calcDiskHight = ((WINDOW_SIZE / 6) * 3 - DISK_HEIGHT  * 1.3) / numberOfDisks;
    }

    var diskColors = [[252, 51, 61], [252, 106, 7], [255, 255, 11],
            [69, 255, 60], [64, 146, 255]];

    // Create pegs and add them to the list
    var peg = Object.create(Peg);
    peg.init({x: (WINDOW_SIZE / 4) * 1 - PEG_WIDTH / 2,
        y: WINDOW_SIZE / 5,
        w: PEG_WIDTH,
        h: (WINDOW_SIZE / 6) * 3,
        letter: "A",
        number: 1,
        disks: []
    });

    pegs.push(peg);

    peg = Object.create(Peg);
    peg.init({x: (WINDOW_SIZE / 4) * 2 - PEG_WIDTH / 2,
        y: WINDOW_SIZE / 5,
        w: PEG_WIDTH,
        h: (WINDOW_SIZE / 6) * 3,
        letter: "B",
        number: 2,
        disks: []
    });

    pegs.push(peg);

    peg = Object.create(Peg);
    peg.init({x: (WINDOW_SIZE / 4) * 3 - PEG_WIDTH / 2,
        y: WINDOW_SIZE / 5,
        w: PEG_WIDTH,
        h: (WINDOW_SIZE / 6) * 3,
        letter: "C",
        number: 3,
        disks: []
    });

    pegs.push(peg);

    // Create disks and add them to the full list
    // disk1-0
    for (var i = numberOfDisks - 1; i >= 0; i--) {
        var disk = Object.create(Disk);
        var diskNum = i + 1;

        // Optionally allow the peg locations to be configured via settings,
        // like {disk1:0, disk2:1}, where pegs are 0-indexed but disks aren't
        var pegNum = parseInt((Program.settings()["disk" + diskNum] || 0), 10);
        
        disk.init({
            w: (((WINDOW_SIZE * 2 / 4 - WINDOW_SIZE / 4) - PEG_WIDTH * 1.3) / (1.3 * numberOfDisks) * (i + 1) + PEG_WIDTH * 1.3),
            h: calcDiskHight,
            number: diskNum,
            peg: pegs[pegNum],
            color: diskColors[i%(diskColors.length)]
        });
        //disks add themselves automatically to their peg in the init function

        disks.push(disk);
    }

    // Create table
    var table = Object.create(Table);
    table.init({x: 40,
        y: WINDOW_SIZE * 7 / 10,
        w: WINDOW_SIZE - 80,
        h: DISK_HEIGHT
    });
    
    sprites.startAnimation(scene, timeline);
    timeline.play();
    
    return {pegs: pegs, disks: disks, timeline: timeline, scene: scene, workingFrame: workingFrame, updateWorkingFrame: updateWorkingFrame, getWorkingFrame: getWorkingFrame};
})();

var convertLetterToPeg = function(pegLetter) {
    if(pegLetter === "A" || pegLetter === "B" || pegLetter === "C"){
        return objects.pegs[pegLetter.charCodeAt(0)-65];
    }
    return null;   
};

var badmove=false;

var moveDisk = function(fromPeg, toPeg) {
    //no moves allowed after a bad move
    if(badmove){
        return;
    }
    
    var triedFromPeg = fromPeg;
    var triedToPeg = toPeg;
    fromPeg = convertLetterToPeg(fromPeg);
    toPeg = convertLetterToPeg(toPeg);
    
    var validmove=true;
    var badMoveMessage="";
    if(fromPeg === null){
        validmove=false;
        badMoveMessage = "'"+triedFromPeg+"' is not a valid peg";    
        badMoveMessage += "\nvalid peg names are 'A','B' or 'C'";
        badmove=true;
    }
    else if(toPeg === null){
        validmove=false;
        badMoveMessage = "'"+triedToPeg+"' is not a valid peg";
        badMoveMessage += "\nvalid peg names are 'A','B' or 'C'";
        badmove=true;    
    }
    else if(fromPeg.countDisks() === 0){ 
        validmove=false;
        badMoveMessage = "You attempted to move a disk from peg "+ fromPeg.letter;
        badMoveMessage += " but that peg\nwas empty";
        badmove=true;
    }
    else if(toPeg.countDisks() > 0 && fromPeg.getTopDisk().number > toPeg.getTopDisk().number ){
        validmove=false;
        badMoveMessage = "You attempted to move disk "+fromPeg.getTopDisk().number +" from peg ";
        badMoveMessage += fromPeg.letter + " onto disk " + toPeg.getTopDisk().number + " on peg "; 
        badMoveMessage += toPeg.letter +"\nIt is against the rules to move larger disks onto smaller disks";
        badmove=true;
    }
    if(!validmove){
        badMoveMessage += "\nFurther calls to the moveDisk function will be blocked.";
        badMoveMessage += "\nPress 'Restart' to be able to call the function again.";
    }
    
    var nowFrame = objects.getWorkingFrame();
    var duration = WINDOW_SIZE * 3 / (16 * 4);
    
    var workingDisk= null;
    if(fromPeg !== null){ workingDisk = fromPeg.getTopDisk();}
    var numOnToPeg= null;
    if(toPeg !== null){ numOnToPeg = toPeg.disks.length; }

    objects.timeline.addEvent(nowFrame, duration, function() {
        
        //reject invalid moves
        if(!validmove){
            return;
        }
        
        objects.scene.draggingSprite = objects.scene.sprites.indexOf(workingDisk);
        
        var destY = toPeg.y + toPeg.h - (workingDisk.h+0.1) * (numOnToPeg + 1);
        var changeInY = destY - workingDisk.y;
        var yIncrament = changeInY / (duration - (frame - nowFrame - 4));

        var destX = toPeg.x + toPeg.w / 2 - workingDisk.w / 2;
        var changeInX = destX - workingDisk.x;
        var xIncrament = changeInX / (duration - (frame - nowFrame - 4));

        workingDisk.translate(xIncrament, yIncrament);
        
    }, function() {
        
        //reject invalid moves, and announce them
        if(!validmove){
            println(badMoveMessage);
            return;
        }
        
        println(fromPeg.letter + " -> "+toPeg.letter);
        
        //move disk to final position
        workingDisk.x = toPeg.x + toPeg.w / 2 - workingDisk.w / 2;
        var disksUnder = numOnToPeg;
        workingDisk.y = toPeg.y + toPeg.h - (workingDisk.h+0.1) * (disksUnder + 1);
        
    });
    objects.workingFrame = nowFrame + duration + 1;
    objects.updateWorkingFrame(objects.workingFrame);
    
    if(validmove){
        var workingDisk = fromPeg.getTopDisk();
        workingDisk.moveToPeg(toPeg);
    }
    
};

var getSparePeg = function(peg1, peg2) {
    peg1 = convertLetterToPeg(peg1);
    peg2 = convertLetterToPeg(peg2);
    if(peg1 === null || peg2 === null){ return null; }
    var sparePegIndex = 3 - (peg1.number - 1) - (peg2.number - 1);
    return objects.pegs[sparePegIndex].letter;
};

var isSolved=function(toPeg){
    if(badmove){ return false; }
    var pegA= convertLetterToPeg("A");
    var pegB= convertLetterToPeg("B");
    var pegC= convertLetterToPeg("C");
    var goalPeg = convertLetterToPeg(toPeg);
    if(goalPeg === null){ return false; }
    if(goalPeg.disks.length !== 5 ){return false;}
    if(goalPeg === pegA){ return pegB.disks.length ===0 &&  pegC.disks.length ===0;   }
    if(goalPeg === pegB){ return pegA.disks.length ===0 &&  pegC.disks.length ===0;   }
    if(goalPeg === pegC){ return pegA.disks.length ===0 &&  pegB.disks.length ===0;   }
};

return {
    getSparePeg: getSparePeg,
    moveDisk: moveDisk,
    isSolved: isSolved
};
})();

var solveHanoi = function(numDisks, fromPeg, toPeg) {
    // base case:  no disks to move
    if (numDisks === 0){
        return;
    }
    // recursive case:
    var sparePeg = hanoi.getSparePeg(fromPeg, toPeg);
    solveHanoi(numDisks - 1, fromPeg, sparePeg);
    hanoi.moveDisk(fromPeg, toPeg);
    solveHanoi(numDisks -1, sparePeg, toPeg);
};

solveHanoi(5, "A", "B");
Program.assertEqual(hanoi.isSolved("B"),true);
