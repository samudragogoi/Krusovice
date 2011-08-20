'use strict';

var krusovice = krusovice || {};

krusovice.showobjects = krusovice.showobjects || null;

/**
 * Base class for animated show elements.
 */
krusovice.showobjects.Base = function(cfg) {    
}

krusovice.showobjects.Base.prototype = {    
    
    /**
     * Function which is called when this object is loaded.
     */
    preparedCallback : null,

    init : function() {
        this.show = show;
        
        // Initialize animation variables
        this.x = this.y = this.w = this.h = 0;
        
        // How many degrees this image has been rotated
        this.rotation = 0;
        
        this.opacity = 1;        
    },

    prepare : function() {        

    },
    
    
    play : function() {        
    }    
} 

/**
 *
 * Photo
 *
 * @extends krusovice.showobjects.Base 
 */
krusovice.showobjects.FramedAndLabeledPhoto = function(cfg) {    
} 

$.extend(krusovice.showobjects.Image, krusovice.showobjects.Base);

krusovice.showobjects.FramedAndLabeledPhoto.prototype = {

    prepare : function() {

        this.image = image;
                
        // This should have been prepared beforehand
        this.framedImage = this.image.framedImage;
                
    },
 
    /**
     * Convert raw photo to a framed image with drop shadow
     * 
     * @param {Image} img Image object (loaded)
     */
    createFramedImage : function(img) {
            
       // Drop shadow blur size in pixels
       // Shadow is same length to both X and Y dirs
       var shadowSize = 5;
       
       // Picture frame color
       var frameColor = "#FFFFFF";
               
       // Actual pixel data dimensions, not ones presented in DOM tree
       var nw = img.naturalWidth;
       var nh = img.naturalHeight;
    
       // horizontal and vertical frame border sizes
       var borderX = nw * 0.05;
       var borderY = nh * 0.05;
       
       // calculate the area we need for the final image
       var w = borderX * 2 + shadowSize * 2 + nw;
       var h = borderY * 2 + shadowSize * 2 + nh;
       
       console.log("Got dimensions:" + nw + " " + w + " " + nh + " " + h);
    
       // Create temporary <canvas> to work with, with expanded canvas (sic.) size     
       var buffer = document.createElement('canvas');
       
       buffer.width = w;
       buffer.height = h;
       
       // Remember, remember, YTI Turbo Pascal
       var context = buffer.getContext('2d');
       
       context.shadowOffsetX = 0;
       context.shadowOffsetY = 0;
       context.shadowBlur = shadowSize;
       context.shadowColor = "black";
    
       context.fillStyle = "#FFFFFF";
       context.fillRect(shadowSize, shadowSize, nw+borderX*2, nh+borderY*2);       
                    
       //Turn off the shadow
       context.shadowOffsetX = 0;
       context.shadowOffsetY = 0;
       context.shadowBlur = 0;
       context.shadowColor = "transparent";
       
       // Slap the imge in the frame
       context.drawImage(img, shadowSize+borderX, shadowSize+borderY);
       
       // We don't need to convert canvas back to imge as drawImage() accepts canvas as parameter
       // http://kaioa.com/node/103
       return buffer;
                
    },
    
    render : function() {
                       
        console.log("Rendering " + this.state + " " + this.x + " " + this.y +  " " + this.w + " " + this.h + " " + this.rotation);
        
        if(this.state == "dead") {
            return;
        }
        
        // Image sizes are always relative to the canvas size
        
        // This is actually canvas object contained a frame buffer
        var img = this.image.framed;
        
        // Calculate aspect ration from the source material     
        var sw = img.width;
        var sh = img.height;        
        var aspect = sw/sh;
        
        // Create image dimensions relative to canvas size
        // so that height == 1 equals canvas height
        var nh = height;
        var nw = nh*aspect;
        
        var x = width/2 + width/2*this.x;
        var y = height/2 + height/2*this.y;
        
        var w=  nw*this.w;
        var h = nh*this.h;
        ctx.save();
        
        // Put bottom center at origin
        ctx.translate(x, y);
        // Rotate
        // Beware the next translations/positions are done along the rotated axis
        
        ctx.rotate(this.rotation);
        
        ctx.globalAlpha = this.opacity;
        
        // console.log("w:" + w + " h:" + h);
        
        ctx.drawImage(img, -nw/2, -nh/2, w, h);
        
        ctx.restore();
        
    }    
      
};
