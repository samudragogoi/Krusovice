'use strict';

var krusovice = krusovice || {};

krusovice.showobjects = krusovice.showobjects || {};

/**
 * Base class for animated show object.
 *
 * Show object is an visualization of timeline element.
 * It prepares an 2D image used as a texture. Then
 * it asks the renderer object of the show to give a
 * 3D handle for this image.
 * For example, image can be prepared by inserting a
 * frame around and it some text on it.
 *
 * There are different kind of show objects (images,
 * texts, videos, etc.) and they all share this common
 * base class containing the core animation logic.
 *
 *
 * Show object animates movement and rotation values
 * based on the animation start and end and easing method.
 * Then it passes these values to the renderer's 3D object.
 *
 *
 *
 */
krusovice.showobjects.Base = function(cfg) {
    $.extend(this, cfg);
}

krusovice.showobjects.Base.prototype = {

    /**
     * @cfg {krusovice.Show} Rendering backend used to create artsy
     */
    renderer : null,

    /**
     * @cfg {krusovice.TimelineElement} data TimelineElement of play parameters
     */
    data : null,


    /**
     * Reference to 3d rendering backend object
     */
    object : null,

    /**
     * @cfg {Function} Function which is called when async prepare() is ready.
     *
     * prepareCallback(success, msg). If success is false delegate the error message.
     */
    preparedCallback : null,

    /**
     * Internal flag telling whether this object has been already woken up
     */
    active : false,

    init : function() {

        // Initialize animation variables
        this.x = this.y = this.w = this.h = 0;

        // How many degrees this image has been rotated
        this.rotation = 0;

        this.opacity = 1;
    },

    /**
     * Load all related media resources.
     *
     * Note: animate() can be called before prepare in dummy unit tests runs.
     * Please set-up all state variables in init().
     */
    prepare : function() {

    },


    play : function() {
    },

    /**
     * Set the object to the animation state matched by the clock.
     *
     * We cache the state whether we have been drawing in prior frames,
     * as this way we can limit the number of 3D objects on the scene.
     *
     * @return Current animation state name
     */
    animate : function(clock) {

        var state, easing;

        var relativeClock = clock - this.data.wakeUpTime;

        // console.log("Clock:" + clock + " relative clock:" + relativeClock);

        // Determine the state of this animation
        var statedata = krusovice.utils.calculateElementEase(this.data, relativeClock);

        var animation = statedata.animation;

        // Don't animate yet - we are waiting for our turn
        if(animation == "notyet") {

            if(this.alive) {
                this.farewell();
            }

            return statedata;
        }

        if(animation != "notyet" && animation != "gone") {
            // XXX: This is unnecessary... just keep object around all the time
            if(!this.alive || !this.object) {
                this.wakeUp();
            }
        }

        if(animation == "gone") {
            // Time to disappear
            if(this.alive) {
                this.farewell();
            }

            return statedata;
        }


        if(!this.object) {
            // XXX: should not happen - raise exception here
            // when code is more complete
            return statedata;
        }

        // Calculate animation parameters
        var source = statedata.current;
        var target = statedata.next;

        if(!source) {
            throw "Source animation state missing:" + animation;
        }

        if(!target) {
            throw "Target animation state missing:" + animation;
        }

        if(!krusovice.utils.isNumber(statedata.value)) {
            console.error(statedata);
            console.error(animation);
            console.error(source);
            console.error(target);
            throw "Failed to calculate animation step";
        }

        this.animateEffect(target, source, statedata.value);

        var mesh = this.object;
        return statedata;

    },

    /**
     * Calculate animation parameters for current frame and apply them on the 3D object.
     *
     *  @param {krusovice.TimelineAnimation} target
     *
     *  @param {krusovice.TimelineAnimation} source
     *
     *  @param {Number} 0...1 how far the animation has progressed
     */
    animateEffect : function(target, source, value) {
        var effectId = source.effectType;
        var effect = krusovice.effects.Manager.get(effectId);

        if(!effect) {
            console.error("Animation");
            console.error(source);
            throw "Animation had unknown effect:" + effectId;
        }

        effect.animate(this.object, target, source, value);
    },

    wakeUp : function() {
        // Bring object to the 3d scene
        console.log("Waking up:" + this.data.id);
        if(this.object) {
            this.renderer.wakeUp(this.object);
        }
        this.alive = true;
    },

    farewell : function() {
        console.log("Object is gone:" + this.data.id);
        if(this.object) {
            this.renderer.farewell(this.object);
        }
        this.alive = false;

    },

    /**
     * Dummy for now
     */
    render : function() {
    }

};

/**
 *
 * Photo
 *
 * @extends krusovice.showobjects.Base
 */
krusovice.showobjects.FramedAndLabeledPhoto = function(cfg) {
    $.extend(this, cfg);
};

$.extend(krusovice.showobjects.FramedAndLabeledPhoto.prototype, krusovice.showobjects.Base.prototype);

$.extend(krusovice.showobjects.FramedAndLabeledPhoto.prototype, {

    /**
     * HTML image object of the source image
     */
    image : null,

    /**
     * HTML <canvas> buffer containing resized and framed image with label text
     */
    framed : null,

    /**
     * Load image asynchronously if image source is URL.
     *
     * Draw borders around the image.
     *
     * @param {Number} width Canvas width for which we prepare (downscale)
     *
     * @param {Number} height Canvas width for which we prepare (downscale)
     */
    prepare : function(width, height) {

        if(!width || !height) {
            throw "FramedAndLabeledPhoto.prepare(): cannot prepare without knowing width and height of target canvas";
        }

        var self = this;
        var load;

        if(this.data.image) {
            // We have a prepared image
            this.image = this.data.image;
            load = false;
        } else {
            this.image = new Image();
            load = true;
        }

        //console.log("FramedAndLabeledPhoto.prepare(): load: " + load + " image obj:" + this.data.image + " URL:" + this.data.imageURL);

        function imageLoaded() {
            self.framed = self.createFramedImage(self.image, width, height);
            //self.framed = self.image;
            self.object = self.createRendererObject();
            if(self.prepareCallback) {
                self.prepareCallback(true);
            }
        }

        function error() {

            var msg = "Failed to load image:" + self.data.imageURL;
            console.error(msg);

            if(self.prepareCallback) {
                console.log("Calling error callback");
                self.prepareCallback(false, msg);
            }
        }

        // Load image asynchroniously
        if(load) {
            if(!this.prepareCallback) {
                throw "Cannot do asyncrhonous loading unless callback is set";
            }
            this.image.onload = imageLoaded;
            this.image.onerror = error;
            this.image.src = this.data.imageURL;
        } else {
            console.log("Was already loaded");
            imageLoaded();
        }

    },

    /**
     * Convert raw photo to a framed image with drop shadow
     *
     * @param {Image} img Image object (loaded)
     */
    createFramedImage : function(img, width, height) {

       if(!width || !height) {
           throw "Width and height missing";
       }

       // Drop shadow blur size in pixels
       // Shadow is same length to both X and Y dirs
       var shadowSize = 5;

       // Picture frame color
       var frameColor = "#FFFFFF";

       // Actual pixel data dimensions, not ones presented in DOM tree

       // Create temporary <canvas> to work with, with expanded canvas (sic.) size
       var buffer = document.createElement('canvas');

       // <canvas> source doesn't give naturalWidth
       var naturalWidth = img.naturalWidht || img.width;
       var naturalHeight = img.naturalHeight || img.height;

       if(!naturalWidth) {
            console.error(img);
            throw "Image does not have width/height information available";
       }

       // Texture sampling base
       //var base = Math.max(width, height);
       //var size = krusovice.utils.calculateAspectRatioFit(naturalWidth, naturalHeight, base, base)


       var size = {width:512,height:512};
       buffer.width = size.width;
       buffer.height = size.height;
       buffer.naturalWidth = naturalWidth;
       buffer.naturalHeight = naturalHeight;
       console.log("Buffer:" + size.width + " " + size.height);

       var nw = size.width;
       var nh = size.height;

       if(!nw || !nh) {
           throw "Unknown image source for framing";
       }

       var borderSize = Math.min(nw, nw) * 0.015;

       // horizontal and vertical frame border sizes
       var borderX = borderSize;
       var borderY = borderSize;

       // Remember, remember, YTI Turbo Pascal
       var context = buffer.getContext('2d');

       context.fillStyle = "#eeEEee";
       context.fillRect(0,0,nw,nh);

       var dimensions = {width : nw, height : nh };

       context.drawImage(img,
           borderX,
           borderY,
           dimensions.width - borderX*2,
           dimensions.height - borderY*2);
       //context.drawImage(img, width/2 - w/2 + 10, height/2 - h/2 + 10, w-20, h-40);


       /*
       context.fillStyle = "#ff00ff";
       context.fillRect(0, 0, dimensions.width, dimensions.height);
       context.fillStyle = "#00ff00";
       context.fillRect(borderX, borderY, dimensions.width - borderX*2, dimensions.height - borderY*2);
       */

       // We don't need to convert canvas back to imge as drawImage() accepts canvas as parameter
       // http://kaioa.com/node/103
       return buffer;

    },

    createRendererObject : function() {
        return this.renderer.createQuad(this.framed, this.framed.naturalWidth, this.framed.naturalHeight);
    }

});

