var drawShape = function(x, y, radius) {
    //randomized variable to decide what shape
    var r = random(1);
    
    //randomizing all three colour variables
    var red = floor(random(0, 255));
    var blue = floor(random(0, 255));
    var green = floor(random(0, 255));
    //creating random colours
    fill(red-radius, green+radius, blue+radius);
    
    //if random number is less than 0.5, draw ellipses
    if (r < 0.5){
        ellipse(radius, radius, radius, radius);
        ellipse(width-radius, radius, radius, radius);
    }
    //else if the random number is greater than 0.5, draw rectangles
    else if (r >= 0.5){
        rect(radius, radius, radius, radius);
        rect(width-radius, radius, radius, radius);
    }
    
    //new radius variable so that it decreases each time
    var newRadius = radius/2;
    if (newRadius >= 2) {
        drawShape(x-20, y, newRadius);
        drawShape(x+20, y, newRadius);
    }
};

//calling drawShape function
drawShape(width/2, height/2, 400);
