// JavaScript has no 'class-defining' statements or declarations: instead we
// simply create a new object type by defining its constructor function, and
// add member methods/functions using JavaScript's 'prototype' feature.
//
// The object prototypes below (and their comments) are suitable for any and all
// features described in the Ray-Tracing Project Assignment Sheet.
//
// HOWEVER, they're not required, nor even particularly good:
//				(notably awkward style from their obvious C/C++ origins) 
// They're here to help you get 'started' on better code of your own,
// and to help you avoid common structural 'traps' in writing ray-tracers
//		that might otherwise force ugly/messy refactoring later, such as:
//  --lack of a well-polished vector/matrix library; e.g. open-source glmatrix.js
//  --lack of floating-point RGB values to compute light transport accurately,
//	--no distinct 'camera', 'image', and 'window' objects to separate lengthy 
//		ray-tracing calculations from screen display and refresh.
//	--lack of ray-trace image-buffer; window resize shouldn't discard your work! 
//  --lack of texture-mapped image display; permit ray-traced image of any 
//		resolution to display on any screen at any desired image size
//  --the need to describe geometry/shape independently from surface materials,
//		and to select material(s) for each shape from a list of materials
//  --materials that permit procedural 3D textures, turbulence & Perlin Noise,  //	--need to describe light sources independently, and possibly inherit their
//		location from a geometric shape (e.g. a light-bulb shape).
//  --need to create a sortable LIST of ray/object hit-points, and not just
//		the intersection nearest to the eyepoint, to enable shape-creation by
//		Constructive Solid Geometry (CSG), and to streamline transparency effects
//  --functions organized well to permit easy recursive ray-tracing:  don't 
//		tangle together ray/object intersection-finding tasks with shading, 
//		lighting, and materials-describing tasks.(e.g. traceRay(), findShade() )
//	--the need to match openGL/WebGL functions with ray-tracing results. 
//		Do it by constructing matching ray-tracing functions for cameras, views, 
//		transformations, lighting, and materials (e.g. rayFrustum(), rayLookAt(); //		rayTranlate(), rayRotate(), rayScale()...)
//  --need straightforward method to implement scene graphs & jointed objects. 
//		Do it by transforming world-space rays to model coordinates, rather than 
//		models to world coords, using a 4x4 worl2model matrix stored in each 
//		model (each CGeom primitive).  Set it by OpenGL-like functions 
//		rayTranslate(), rayRotate(), rayScale(), etc.

function CImgBuf(wide, tall) {
//==============================================================================
// Construct an 'image-buffer' object to hold a floating-point ray-traced image.
//  Contains BOTH
//	iBuf -- 2D array of 8-bit RGB pixel values we can display on-screen, AND
//	fBuf -- 2D array of floating-point RGB pixel values we usually CAN'T display,
//          but contains full-precision results of ray-tracing.
//			--Both buffers hold the same numbers of pixel values (xSiz,ySiz,pixSiz)
//			--imgBuf.int2float() copies/converts current iBuf contents to fBuf
//			--imgBuf.float2int() copies/converts current fBuf contents to iBuf
//	WHY?  
//	--Our ray-tracer computes floating-point light amounts(e.g. radiance L) //    but neither our display nor our WebGL texture-map buffers can accept 
//		images with floating-point pixel values.
//	--You will NEED all those floating-point values for applications such as
//    environment maps (re-lighting from sky image) and lighting simulations.
// Stay simple in early versions of your ray-tracer: keep 0.0 <= RGB < 1.0, 
// but later you can modify your ray-tracer 
// to use radiometric units of Radiance (watts/(steradians*meter^2), or convert 
// to use photometric units of luminance (lumens/(steradians*meter^2 aka cd/m^2) // to compute in physically verifiable units of visible light.

	this.xSiz = wide;							// image width in pixels
	this.ySiz =	tall;							// image height in pixels
	this.pixSiz = 3;							// pixel size (3 for RGB, 4 for RGBA, etc)
	this.iBuf = new Uint8Array(  this.xSiz * this.ySiz * this.pixSiz);	
	this.fBuf = new Float32Array(this.xSiz * this.ySiz * this.pixSiz);
}

CImgBuf.prototype.setTestPattern = function(pattNum) {
//==============================================================================
// Replace current 8-bit RGB contents of 'imgBuf' with a colorful pattern
	// 2D color image:  8-bit unsigned integers in a 256*256*3 array
	// to store r,g,b,r,g,b integers (8-bit)
	// In WebGL texture map sizes MUST be a power-of-two (2,4,8,16,32,64,...4096)
	// with origin at lower-left corner
	// (NOTE: this 'power-of-two' limit will probably vanish in a few years of
	// WebGL advances, just as it did for OpenGL)
	
  // use local vars to set the array's contents.
  for(var j=0; j< this.ySiz; j++) {						// for the j-th row of pixels
  	for(var i=0; i< this.xSiz; i++) {					// and the i-th pixel on that row,
	  	var idx = (j*this.xSiz + i)*this.pixSiz;// Array index at pixel (i,j) 
	  	switch(pattNum) {
	  		case 0:	//================(Colorful L-shape)============================
			  	if(i < this.xSiz/4 || j < this.ySiz/4) {
			  		this.iBuf[idx   ] = i;								// 0 <= red <= 255
			  		this.iBuf[idx +1] = j;								// 0 <= grn <= 255
			  	}
			  	else {
			  		this.iBuf[idx   ] = 0;
			  		this.iBuf[idx +1] = 0;
			  		}
			  	this.iBuf[idx +2] = 255 -i -j;								// 0 <= blu <= 255
			  	break;
			  case 1: //================(bright orange)===============================
			  	this.iBuf[idx   ] = 255;	// bright orange
			  	this.iBuf[idx +1] = 128;
			  	this.iBuf[idx +2] =   0;
	  			break;
	  		default:
	  			console.log("imgBuf.setTestPattern() says: WHUT!?");
	  		break;
	  	}
  	}
  }
  this.int2float();		// fill the floating-point buffer with same test pattern.
}

CImgBuf.prototype.int2float = function() {
//==============================================================================
// Convert current integerRGB image in iBuf into floating-point RGB image in fBuf
for(var j=0; j< this.ySiz; j++) {		// for each scanline
  	for(var i=0; i< this.xSiz; i++) {		// for each pixel on that scanline
  		var idx = (j*this.xSiz + i)*this.pixSiz;// Find array index at pixel (i,j)
			// convert integer 0 <= RGB <= 255 to floating point 0.0 <= R,G,B <= 1.0
  		this.fBuf[idx   ] = this.iBuf[idx   ] / 255.0;	// red
  		this.fBuf[idx +1] = this.iBuf[idx +1] / 255.0;	// grn
  		this.fBuf[idx +2] = this.iBuf[idx +2] / 255.0;	// blu
  		
  	}
  }
}

CImgBuf.prototype.float2int = function() {
//==============================================================================
// Convert current floating-point RGB image in fBuf into integerRGB image in iBuf
for(var j=0; j< this.ySiz; j++) {		// for each scanline
  	for(var i=0; i< this.xSiz; i++) {	// for each pixel on that scanline
  		var idx = (j*this.xSiz + i)*this.pixSiz;// Find array index at pixel (i,j)
			// find 'clamped' color values that stay >=0.0 and <=1.0:
  		var rval = Math.min(1.0, Math.max(0.0, this.fBuf[idx   ]));
  		var gval = Math.min(1.0, Math.max(0.0, this.fBuf[idx +1]));
  		var bval = Math.min(1.0, Math.max(0.0, this.fBuf[idx +2]));
			// Divide [0,1] span into 256 equal-sized parts: e.g.  Math.floor(rval*256)
			// In the rare case when rval==1.0 you get unwanted '256' result that won't
			// fit into the 8-bit RGB values.  Fix it with Math.min():
  		this.iBuf[idx   ] = Math.min(255,Math.floor(rval*256.0));	// red
  		this.iBuf[idx +1] = Math.min(255,Math.floor(gval*256.0));	// grn
  		this.iBuf[idx +2] = Math.min(255,Math.floor(bval*256.0));	// blu
  		
  	}
  }
}

CImgBuf.prototype.makeRayTracedImage2 = function() {
//==============================================================================
// create an image by Ray-tracing.   (called when you press 'T' or 't')

  var eyeRay = new CRay();	// the ray we trace from our camera for each pixel
  var myCam = new CCamera();	// the 3D camera that sets eyeRay values
  var myGrid = new CGeom(JT_GNDPLANE);
  var mySphere = new CGeom(JT_SPHERE);
  var mySphere2 = new CGeom(JT_SPHERE);
  var mySphere3 = new CGeom(JT_SPHERE);
  var myBox = new CGeom(JT_BOX);
  var myBox2 = new CGeom(JT_BOX);
  var lampPos = vec4.fromValues(l1x,l1y,l1z,1);
  var lampPos2 = vec4.fromValues(l2x, l2y, l2z , 1);
  var colr = vec4.create();	// floating-point RGBA color value
  var hit = 0;
  var ubegin = myCam.iLeft;
  var vbegin = myCam.iBot;
  var ustep = (myCam.iRight - myCam.iLeft) / this.xSiz;
  var vstep = (myCam.iTop - myCam.iBot) / this.ySiz;
  var uustep = ustep / 4;
  var vvstep = vstep / 4;
  var sc = 0;
  var rc = 0;
  if (isAA == true){
  for(var j=0; j< this.ySiz; j++) {						// for the j-th row of pixels
  	for(var i=0; i< this.xSiz; i++) {
  		colr = vec4.fromValues(0,0,0,1);
  		var idx = (j*this.xSiz + i)*this.pixSiz;
  		for(var jj=0; jj<4; jj++ ){
  			for(var ii = 0; ii<4; ii++){
  				var xray = ubegin + i*ustep + ii*uustep;
  				var yray = vbegin + j*vstep + jj*vvstep;
  				//console.log(xray);
  				xray += (uustep*Math.random());
  				yray += (vvstep*Math.random()); 
  				//console.log(xray);
  				//console.log(yray);	// Array index at pixel (i,j) 
				myCam.setEyeRay(eyeRay,xray,yray);	
				//eyeRay.printMe(eyeRay);					  // create ray for pixel (i,j)
				hit = myGrid.traceGrid(eyeRay);						// trace ray to the grid
				if(hit==0) {
					vec4.add(colr, colr, myGrid.gapColor);
				}
				else if (hit==1) {
					vec4.add(colr, colr, myGrid.lineColor);
				}
				else{
					colr[0] += 0;
					colr[1] += .5;
					colr[2] += .7;
				}
				hit2 = mySphere.traceSphere(eyeRay, tvec = vec3.create(),1 );
				if(hit2==1) {
					vec4.add(colr, colr, mySphere.sphereColor);
				}
  			}
  		}
  		colr[0] /= 16;
  		colr[1] /= 16;
  		colr[2] /= 16;			// and the i-th pixel on that row,
  		//console.log(colr);
  		this.fBuf[idx   ] = colr[0];	// bright blue
  		this.fBuf[idx +1] = colr[1];
  		this.fBuf[idx +2] = colr[2];

  		}
  	  }
  	}
  	else{
  		for(var j=0; j< this.ySiz; j++) {						// for the j-th row of pixels
  		for(var i=0; i< this.xSiz; i++) {					// and the i-th pixel on that row,
	  	var idx = (j*this.xSiz + i)*this.pixSiz;	// Array index at pixel (i,j) 
			myCam.setEyeRay(eyeRay,i,j);						  // create ray for pixel (i,j)
			hit = myGrid.traceGrid(eyeRay);		
			lamp0 = vec4.fromValues(lampPos[0] - myGrid.xhit, lampPos[1] - myGrid.yhit, lampPos[2] - myGrid.zhit, 0);
			lamp1 = vec4.fromValues(lampPos2[0] - myGrid.xhit, lampPos2[1] - myGrid.yhit, lampPos2[2] - myGrid.zhit, 0);
			vec4.normalize(lamp0, lamp0);
			vec4.normalize(lamp1, lamp1);
			//var sc = myGrid.shadowCheck2(lampPos, lamp0);		
			//var rc = myGrid.shadowCheck2(lampPos2, lamp1);		// trace ray to the grid
			if(hit==0) {
				vec4.copy(colr, myGrid.gapColor);
				
			}
			else if (hit==1) {
				vec4.copy(colr, myGrid.lineColor);
			}
			else{
				colr[0] = 0;
				colr[1] = .5;
				colr[2] = .7;
			}
			tvec = vec3.fromValues(-5,-10, -3);
			svec = vec3.fromValues(5,5,5);
			var hitB = myBox.traceTaperedCylinder(eyeRay, tvec, 1, svec);
			lampDir = vec4.fromValues(lampPos[0] - myBox.xhit, lampPos[1] - myBox.yhit + 8, lampPos[2] - myBox.zhit, 0);
			lampDir2 = vec4.fromValues(lampPos2[0] - myBox.xhit, lampPos2[1] - myBox.yhit + 8, lampPos2[2] - myBox.zhit, 0);
			lamp0 = vec4.fromValues(lampPos[0] - myBox.xhit, lampPos[1] - myBox.yhit, lampPos[2] - myBox.zhit, 0);
			lamp1 = vec4.fromValues(lampPos2[0] - myBox.xhit, lampPos2[1] - myBox.yhit, lampPos2[2] - myBox.zhit, 0);
			vec4.normalize(lampDir, lampDir);
			vec4.normalize(lampDir2, lampDir2);
			vec4.normalize(lamp0, lamp0);
			vec4.normalize(eyeRay.dir, eyeRay.dir);
			Diffuse = vec4.create();
			tempC = vec4.create();
			Rvec = vec4.create();
			Evec = vec4.create();
			Specular = vec4.create();
			//var sc = myBox.shadowCheck2(lampPos, lamp0);
			//var rc = myBox.shadowCheck2(lampPos2, lamp1);
				if(hitB == 1){
				vec4.copy(colr, myBox.sphereColor);
				/*
				kD = vec4.fromValues(0.50754,  0.50754,  0.50754,  1.0);
				var LdotN = vec4.dot(lampDir, myBox.boxNorm);
				vec4.scale(Diffuse, kD, LdotN);
				kD = vec4.fromValues(Diffuse[0], Diffuse[1], Diffuse[2], 0);
				colr = vec4.add(colr, colr, kD);

				kD = vec4.fromValues(0.50754,  0.50754,  0.50754,  1.0);
				var LdotN2 = vec4.dot(lampDir2, myBox.boxNorm);
				vec4.scale(Diffuse, kD, LdotN2);
				kD = vec4.fromValues(Diffuse[0], Diffuse[1], Diffuse[2], 0);
				colr = vec4.add(colr, colr, kD);

				var C = LdotN * 2;
				vec4.scale(tempC, myBox.boxNorm, C);
				vec4.subtract(Rvec, lampDir, tempC);
				vec4.negate(Evec, eyeRay.dir)
				var RdotE = vec4.dot(Rvec, Evec);
				RdotE = Math.pow(RdotE, 51);
				kS = vec4.fromValues(0.508273, 0.508273, 0.508273, 1.0);
				vec4.scale(Specular, kS, RdotE);
				kS = vec4.fromValues(Specular[0], Specular[1], Specular[2], 0);
				colr = vec4.add(colr, colr, kS);

				var C = LdotN2 * 2;
				vec4.scale(tempC, myBox.boxNorm, C);
				vec4.subtract(Rvec, lampDir2, tempC);
				vec4.negate(Evec, eyeRay.dir)
				var RdotE = vec4.dot(Rvec, Evec);
				RdotE = Math.pow(RdotE, 51);
				kS = vec4.fromValues(0.508273, 0.508273, 0.508273, 1.0);
				vec4.scale(Specular, kS, RdotE);
				kS = vec4.fromValues(Specular[0], Specular[1], Specular[2], 0);
				colr = vec4.add(colr, colr, kS);
				if(sc == 1){
					colr[0] = 0;
					colr[1] = 0;
					colr[2] = 0;
				}*/
				}
				tvec = vec3.fromValues(-5, -8, 5);
				svec = vec3.fromValues(5,5,5);
			var hitB2 = myBox2.traceTaperedCylinder(eyeRay, tvec, 0, svec);
			lampDir = vec4.fromValues(lampPos[0] - myBox2.xhit, lampPos[1] - myBox2.yhit + 8, lampPos[2] - myBox2.zhit, 0);
			lampDir2 = vec4.fromValues(lampPos2[0] - myBox2.xhit, lampPos2[1] - myBox2.yhit + 8, lampPos2[2] - myBox2.zhit, 0);
			lamp0 = vec4.fromValues(lampPos[0] - myBox2.xhit, lampPos[1] - myBox2.yhit, lampPos[2] - myBox2.zhit, 0);
			lamp1 = vec4.fromValues(lampPos2[0] - myBox2.xhit, lampPos2[1] - myBox2.yhit, lampPos2[2] - myBox2.zhit, 0);
			vec4.normalize(lampDir, lampDir);
			vec4.normalize(lampDir2, lampDir2);
			vec4.normalize(eyeRay.dir, eyeRay.dir);
			Diffuse = vec4.create();
			tempC = vec4.create();
			Rvec = vec4.create();
			Evec = vec4.create();
			Specular = vec4.create();
			//var sc = myBox2.shadowCheck2(lampPos, lamp0);
			//var rc = myBox2.shadowCheck2(lampPos2, lamp1);
				if(hitB2 == 1){
					colr = vec4.fromValues(1,  1,  0,  1.0);
					/*
				kD = vec4.fromValues(0.50754,  0.50754,  0.50754,  1.0);
				var LdotN = vec4.dot(lampDir, myBox2.cylinderNorm);
				vec4.scale(Diffuse, kD, LdotN);
				kD = vec4.fromValues(Diffuse[0], Diffuse[1], Diffuse[2], 0);
				colr = vec4.add(colr, colr, kD);

				kD = vec4.fromValues(0.50754,  0.50754,  0.50754,  1.0);
				var LdotN2 = vec4.dot(lampDir2, myBox2.cylinderNorm);
				vec4.scale(Diffuse, kD, LdotN);
				kD = vec4.fromValues(Diffuse[0], Diffuse[1], Diffuse[2], 0);
				colr = vec4.add(colr, colr, kD);

				var C = LdotN * 2;
				vec4.scale(tempC, myBox2.cylinderNorm, C);
				vec4.subtract(Rvec, lampDir, tempC);
				vec4.negate(Evec, eyeRay.dir)
				var RdotE = vec4.dot(Rvec, Evec);
				RdotE = Math.pow(RdotE, 51);
				kS = vec4.fromValues(0.508273, 0.508273, 0.508273, 1.0);
				vec4.scale(Specular, kS, RdotE);
				kS = vec4.fromValues(Specular[0], Specular[1], Specular[2], 0);
				colr = vec4.add(colr, colr, kS);

				var C = LdotN2 * 2;
				vec4.scale(tempC, myBox2.cylinderNorm, C);
				vec4.subtract(Rvec, lampDir2, tempC);
				vec4.negate(Evec, eyeRay.dir)
				var RdotE = vec4.dot(Rvec, Evec);
				RdotE = Math.pow(RdotE, 51);
				kS = vec4.fromValues(0.508273, 0.508273, 0.508273, 1.0);
				vec4.scale(Specular, kS, RdotE);
				kS = vec4.fromValues(Specular[0], Specular[1], Specular[2], 0);
				colr = vec4.add(colr, colr, kS);
				if(sc == 1){
					colr[0] = 0;
					colr[1] = 0;
					colr[2] = 0;
				}*/
				}
				tvec = vec3.fromValues(3,-7,5);
				svec = vec3.fromValues(5,5,1);
			hit2 = mySphere.traceSkewSphere(eyeRay, tvec,1, svec);
			lampDir = vec4.fromValues(lampPos[0] - mySphere.xhit, lampPos[1] - mySphere.yhit + 8, lampPos[2] - mySphere.zhit, 0);
			lampDir2 = vec4.fromValues(lampPos2[0] - mySphere.xhit, lampPos2[1] - mySphere.yhit + 8, lampPos2[2] - mySphere.zhit, 0);
			vec4.normalize(lampDir, lampDir);
			vec4.normalize(lampDir2, lampDir2);
			//console.log(lampDir2);
			vec4.normalize(eyeRay.dir, eyeRay.dir);
			Diffuse = vec4.create();
			Diffuse2 = vec4.create();
			tempC = vec4.create();
			Rvec = vec4.create();
			Evec = vec4.create();
			Specular = vec4.create();
			Specular2 = vec4.create();
			//var sc = mySphere.shadowCheck(lampPos, lamp0, 'sph0')
			var sign = 0;
			if(hit2==1){
				vec4.copy(colr, mySphere.sphereColor);
				kD = vec4.fromValues(0.34615,  0.3143,   0.0903,   1.0);
				var LdotN = vec4.dot(lampDir, mySphere.sphereNorm);
				vec4.scale(Diffuse, kD, LdotN);
				kD = vec4.fromValues(Diffuse[0], Diffuse[1], Diffuse[2], 0);
				vec4.scale(kD, kD, l1i);
				colr = vec4.add(colr, colr, kD);

				kD = vec4.fromValues(0.34615,  0.3143,   0.0903,   1.0);
				var LdotN2 = vec4.dot(lampDir2, mySphere.sphereNorm);
				vec4.scale(Diffuse, kD, LdotN2);
				kD = vec4.fromValues(Diffuse[0], Diffuse[1], Diffuse[2], 0);
				vec4.scale(kD, kD, l2i);
				colr = vec4.add(colr, colr, kD);

				var C = LdotN * 2;
				vec4.scale(tempC, mySphere.sphereNorm, C);
				vec4.subtract(Rvec, lampDir, tempC);
				vec4.negate(Evec, eyeRay.dir)
				var RdotE = vec4.dot(Rvec, Evec);
				RdotE = Math.pow(RdotE, 83);
				kS = vec4.fromValues(0.797357, 0.723991, 0.208006, 1.0);
				vec4.scale(Specular, kS, RdotE);
				kS = vec4.fromValues(Specular[0], Specular[1], Specular[2], 0);
				vec4.scale(kS, kS, l1i);
				colr = vec4.add(colr, colr, kS);

				var C = LdotN2 * 2;
				vec4.scale(tempC, mySphere.sphereNorm, C);
				vec4.subtract(Rvec, lampDir2, tempC);
				vec4.negate(Evec, eyeRay.dir)
				var RdotE = vec4.dot(Rvec, Evec);
				RdotE = Math.pow(RdotE, 83);
				kS = vec4.fromValues(0.797357, 0.723991, 0.208006, 1.0);
				vec4.scale(Specular, kS, RdotE);
				kS = vec4.fromValues(Specular[0], Specular[1], Specular[2], 0);
				vec4.scale(kS, kS, l2i);
				colr = vec4.add(colr, colr, kS);

			}

	  	this.fBuf[idx   ] = colr[0];	// bright blue
	  	this.fBuf[idx +1] = colr[1];
	  	this.fBuf[idx +2] = colr[2];
	  		}
  		}
  	}
  this.float2int();		// create integer image from floating-point buffer.
}

CImgBuf.prototype.makeRayTracedImage = function() {
//==============================================================================
// create an image by Ray-tracing.   (called when you press 'T' or 't')

  var eyeRay = new CRay();	// the ray we trace from our camera for each pixel
  var myCam = new CCamera();	// the 3D camera that sets eyeRay values
  var myGrid = new CGeom(JT_GNDPLANE);
  var mySphere = new CGeom(JT_SPHERE);
  var mySphere2 = new CGeom(JT_SPHERE);
  var mySphere3 = new CGeom(JT_SPHERE);
  var myBox = new CGeom(JT_BOX);
  var myBox2 = new CGeom(JT_BOX);
  var lampPos = vec4.fromValues(l1x,l1y,l1z,1);
  var lampPos2 = vec4.fromValues(l2x, l2y, l2z , 1);
  var colr = vec4.create();	// floating-point RGBA color value
  var hit = 0;
  var ubegin = myCam.iLeft;
  var vbegin = myCam.iBot;
  var ustep = (myCam.iRight - myCam.iLeft) / this.xSiz;
  var vstep = (myCam.iTop - myCam.iBot) / this.ySiz;
  var uustep = ustep / 4;
  var vvstep = vstep / 4;
  if (isAA == true){
  for(var j=0; j< this.ySiz; j++) {						// for the j-th row of pixels
  	for(var i=0; i< this.xSiz; i++) {
  		colr = vec4.fromValues(0,0,0,1);
  		var idx = (j*this.xSiz + i)*this.pixSiz;
  		for(var jj=0; jj<4; jj++ ){
  			for(var ii = 0; ii<4; ii++){
  				var xray = ubegin + i*ustep + ii*uustep;
  				var yray = vbegin + j*vstep + jj*vvstep;
  				//console.log(xray);
  				xray += (uustep*Math.random());
  				yray += (vvstep*Math.random()); 
  				//console.log(xray);
  				//console.log(yray);	// Array index at pixel (i,j) 
				myCam.setEyeRay(eyeRay,xray,yray);	
				//eyeRay.printMe(eyeRay);					  // create ray for pixel (i,j)
				hit = myGrid.traceGrid(eyeRay);						// trace ray to the grid
				if(hit==0) {
					vec4.add(colr, colr, myGrid.gapColor);
				}
				else if (hit==1) {
					vec4.add(colr, colr, myGrid.lineColor);
				}
				else{
					colr[0] += 0;
					colr[1] += .5;
					colr[2] += .7;
				}
				hit2 = mySphere.traceSphere(eyeRay, tvec = vec3.create(),1 );
				if(hit2==1) {
					vec4.add(colr, colr, mySphere.sphereColor);
				}
  			}
  		}
  		colr[0] /= 16;
  		colr[1] /= 16;
  		colr[2] /= 16;			// and the i-th pixel on that row,
  		//console.log(colr);
  		this.fBuf[idx   ] = colr[0];	// bright blue
  		this.fBuf[idx +1] = colr[1];
  		this.fBuf[idx +2] = colr[2];

  		}
  	  }
  	}
  	else{
  		for(var j=0; j< this.ySiz; j++) {						// for the j-th row of pixels
  		for(var i=0; i< this.xSiz; i++) {					// and the i-th pixel on that row,
	  	var idx = (j*this.xSiz + i)*this.pixSiz;	// Array index at pixel (i,j) 
			myCam.setEyeRay(eyeRay,i,j);						  // create ray for pixel (i,j)
			hit = myGrid.traceGrid(eyeRay);		
			lamp0 = vec4.fromValues(lampPos[0] - myGrid.xhit, lampPos[1] - myGrid.yhit, lampPos[2] - myGrid.zhit, 0);
			lamp1 = vec4.fromValues(lampPos2[0] - myGrid.xhit, lampPos2[1] - myGrid.yhit, lampPos2[2] - myGrid.zhit, 0);
			vec4.normalize(lamp0, lamp0);
			vec4.normalize(lamp1, lamp1);
			if(lamp1On == true){
			var sc = myGrid.shadowCheck(lampPos, lamp0);	
			}
			if(lamp2On == true){
			var rc = myGrid.shadowCheck(lampPos2, lamp1);	
			}	// trace ray to the grid
			if(hit==0) {
				if(sc==1 || rc == 1){
					colr[0] = 0;
					colr[1] = 0;
					colr[2] = 0;
				}
				else{
				vec4.copy(colr, myGrid.gapColor);
			}	
			}
			else if (hit==1) {
				if(sc==1 || rc == 1){
					colr[0] = 0;
					colr[1] = 0;
					colr[2] = 0;
				}
				else{
				vec4.copy(colr, myGrid.lineColor);
			}
			}
			else{
				colr[0] = 0;
				colr[1] = .5;
				colr[2] = .7;
			}
			
			tvec = vec3.fromValues(0,1,0);
			hit2 = mySphere.traceSphere(eyeRay, tvec,1);
			lampDir = vec4.fromValues(lampPos[0] - mySphere.xhit, lampPos[1] - mySphere.yhit + 8, lampPos[2] - mySphere.zhit, 0);
			lampDir2 = vec4.fromValues(lampPos2[0] - mySphere.xhit, lampPos2[1] - mySphere.yhit + 8, lampPos2[2] - mySphere.zhit, 0);
			vec4.normalize(lampDir, lampDir);
			vec4.normalize(lampDir2, lampDir2);
			//console.log(lampDir2);
			vec4.normalize(eyeRay.dir, eyeRay.dir);
			Diffuse = vec4.create();
			Diffuse2 = vec4.create();
			tempC = vec4.create();
			Rvec = vec4.create();
			Evec = vec4.create();
			Specular = vec4.create();
			Specular2 = vec4.create();
			//var sc = mySphere.shadowCheck(lampPos, lamp0, 'sph0')
			var sign = 0;
			if(hit2==1){
				vec4.copy(colr, mySphere.sphereColor);
				kD = vec4.fromValues(0.34615,  0.3143,   0.0903,   1.0);
				var LdotN = vec4.dot(lampDir, mySphere.sphereNorm);
				vec4.scale(Diffuse, kD, LdotN);
				kD = vec4.fromValues(Diffuse[0], Diffuse[1], Diffuse[2], 0);
				vec4.scale(kD, kD, l1i);
				colr = vec4.add(colr, colr, kD);

				kD = vec4.fromValues(0.34615,  0.3143,   0.0903,   1.0);
				var LdotN2 = vec4.dot(lampDir2, mySphere.sphereNorm);
				vec4.scale(Diffuse, kD, LdotN2);
				kD = vec4.fromValues(Diffuse[0], Diffuse[1], Diffuse[2], 0);
				vec4.scale(kD, kD, l2i);
				colr = vec4.add(colr, colr, kD);

				var C = LdotN * 2;
				vec4.scale(tempC, mySphere.sphereNorm, C);
				vec4.subtract(Rvec, lampDir, tempC);
				vec4.negate(Evec, eyeRay.dir)
				var RdotE = vec4.dot(Rvec, Evec);
				RdotE = Math.pow(RdotE, 83);
				kS = vec4.fromValues(0.797357, 0.723991, 0.208006, 1.0);
				vec4.scale(Specular, kS, RdotE);
				kS = vec4.fromValues(Specular[0], Specular[1], Specular[2], 0);
				vec4.scale(kS, kS, l1i);
				colr = vec4.add(colr, colr, kS);

				var C = LdotN2 * 2;
				vec4.scale(tempC, mySphere.sphereNorm, C);
				vec4.subtract(Rvec, lampDir2, tempC);
				vec4.negate(Evec, eyeRay.dir)
				var RdotE = vec4.dot(Rvec, Evec);
				RdotE = Math.pow(RdotE, 83);
				kS = vec4.fromValues(0.797357, 0.723991, 0.208006, 1.0);
				vec4.scale(Specular, kS, RdotE);
				kS = vec4.fromValues(Specular[0], Specular[1], Specular[2], 0);
				vec4.scale(kS, kS, l2i);
				colr = vec4.add(colr, colr, kS);

			}
			
			tvec = vec3.fromValues(2,1,3);
			var hitSph = mySphere2.traceSphere(eyeRay,tvec, .5);
			lampDir = vec4.fromValues(lampPos[0] - mySphere2.xhit, lampPos[1] - mySphere2.yhit + 8, lampPos[2] - mySphere2.zhit, 0);
			lampDir2 = vec4.fromValues(lampPos2[0] - mySphere2.xhit, lampPos2[1] - mySphere2.yhit + 8, lampPos2[2] - mySphere2.zhit, 0);
			lamp0 = vec4.fromValues(lampPos[0] - mySphere2.xhit, lampPos[1] - mySphere2.yhit, lampPos[2] - mySphere2.zhit, 0);
			vec4.normalize(lampDir, lampDir);
			vec4.normalize(lampDir2, lampDir2);
			vec4.normalize(eyeRay.dir, eyeRay.dir);
			Diffuse = vec4.create();
			tempC = vec4.create();
			Rvec = vec4.create();
			Evec = vec4.create();
			Specular = vec4.create();
			//var sc = mySphere2.shadowCheck(lampPos, lamp0, 'sph1');
			var sign = 0;
			if(hitSph==1){
				colr = vec4.fromValues(0.05,    0.05,   0.05,   1.0);
				kD = vec4.fromValues(0.0,     0.2,    0.6,    1.0);
				var LdotN = vec4.dot(lampDir, mySphere2.sphereNorm);
				vec4.scale(Diffuse, kD, LdotN);
				kD = vec4.fromValues(Diffuse[0], Diffuse[1], Diffuse[2], 0);
				vec4.scale(kD, kD, l1i);
				colr = vec4.add(colr, colr, kD);

				kD = vec4.fromValues(0.0,     0.2,    0.6,    1.0);
				var LdotN2 = vec4.dot(lampDir2, mySphere2.sphereNorm);
				vec4.scale(Diffuse, kD, LdotN2);
				kD = vec4.fromValues(Diffuse[0], Diffuse[1], Diffuse[2], 0);
				vec4.scale(kD, kD, l2i);
				colr = vec4.add(colr, colr, kD);

				var C = LdotN * 2;
				vec4.scale(tempC, mySphere2.sphereNorm, C);
				vec4.subtract(Rvec, lampDir, tempC);
				vec4.negate(Evec, eyeRay.dir)
				var RdotE = vec4.dot(Rvec, Evec);
				RdotE = Math.pow(RdotE, 5);
				kS = vec4.fromValues(0.1,     0.2,    0.3,    1.0);
				vec4.scale(Specular, kS, RdotE);
				kS = vec4.fromValues(Specular[0], Specular[1], Specular[2], 0);
				vec4.scale(kS, kS, l1i);
				colr = vec4.add(colr, colr, kS);

				var C = LdotN2 * 2;
				vec4.scale(tempC, mySphere2.sphereNorm, C);
				vec4.subtract(Rvec, lampDir2, tempC);
				vec4.negate(Evec, eyeRay.dir)
				var RdotE = vec4.dot(Rvec, Evec);
				RdotE = Math.pow(RdotE, 5);
				kS = vec4.fromValues(0.1,     0.2,    0.3,    1.0);
				vec4.scale(Specular, kS, RdotE);
				kS = vec4.fromValues(Specular[0], Specular[1], Specular[2], 0);
				vec4.scale(kS, kS, l2i);
				colr = vec4.add(colr, colr, kS);

			}

			tvec = vec3.fromValues(-5,0,1);
			var hitSph2 = mySphere3.traceSphere(eyeRay,tvec, .3);
			lampDir = vec4.fromValues(lampPos[0] - mySphere3.xhit, lampPos[1] - mySphere3.yhit + 8, lampPos[2] - mySphere3.zhit, 0);
			lampDir2 = vec4.fromValues(lampPos2[0] - mySphere3.xhit, lampPos2[1] - mySphere3.yhit + 8, lampPos2[2] - mySphere3.zhit, 0);
			lamp0 = vec4.fromValues(lampPos[0] - mySphere3.xhit, lampPos[1] - mySphere3.yhit, lampPos[2] - mySphere3.zhit, 0);
			vec4.normalize(lampDir, lampDir);
			vec4.normalize(lampDir2, lampDir2);
			vec4.normalize(eyeRay.dir, eyeRay.dir);
			Diffuse = vec4.create();
			tempC = vec4.create();
			Rvec = vec4.create();
			Evec = vec4.create();
			Specular = vec4.create();
			//var sc = mySphere3.shadowCheck(lampPos, lamp0, 'sph2');
			var sign = 0;
			if(hitSph2==1){
				colr = vec4.fromValues(0.19225,  0.19225,  0.19225,  1.0);
				kD = vec4.fromValues(0.50754,  0.50754,  0.50754,  1.0);
				var LdotN = vec4.dot(lampDir, mySphere3.sphereNorm);
				vec4.scale(Diffuse, kD, LdotN);
				kD = vec4.fromValues(Diffuse[0], Diffuse[1], Diffuse[2], 0);
				vec4.scale(kD, kD, l1i);
				colr = vec4.add(colr, colr, kD);

				kD = vec4.fromValues(0.50754,  0.50754,  0.50754,  1.0);
				var LdotN2 = vec4.dot(lampDir2, mySphere3.sphereNorm);
				vec4.scale(Diffuse, kD, LdotN2);
				kD = vec4.fromValues(Diffuse[0], Diffuse[1], Diffuse[2], 0);
				vec4.scale(kD, kD, l2i);
				colr = vec4.add(colr, colr, kD);

				var C = LdotN * 2;
				vec4.scale(tempC, mySphere3.sphereNorm, C);
				vec4.subtract(Rvec, lampDir, tempC);
				vec4.negate(Evec, eyeRay.dir)
				var RdotE = vec4.dot(Rvec, Evec);
				RdotE = Math.pow(RdotE, 51);
				kS = vec4.fromValues(0.508273, 0.508273, 0.508273, 1.0);
				vec4.scale(Specular, kS, RdotE);
				kS = vec4.fromValues(Specular[0], Specular[1], Specular[2], 0);
				vec4.scale(kS, kS, l1i);
				colr = vec4.add(colr, colr, kS);

				var C = LdotN2 * 2;
				vec4.scale(tempC, mySphere3.sphereNorm, C);
				vec4.subtract(Rvec, lampDir2, tempC);
				vec4.negate(Evec, eyeRay.dir)
				var RdotE = vec4.dot(Rvec, Evec);
				RdotE = Math.pow(RdotE, 51);
				kS = vec4.fromValues(0.508273, 0.508273, 0.508273, 1.0);
				vec4.scale(Specular, kS, RdotE);
				kS = vec4.fromValues(Specular[0], Specular[1], Specular[2], 0);
				vec4.scale(kS, kS, l2i);
				colr = vec4.add(colr, colr, kS);
			}

			tvec = vec3.fromValues(0,1, -7);
			var hitB = myBox.traceBox(eyeRay, tvec);
			lampDir = vec4.fromValues(lampPos[0] - myBox.xhit, lampPos[1] - myBox.yhit + 8, lampPos[2] - myBox.zhit, 0);
			lampDir2 = vec4.fromValues(lampPos2[0] - myBox.xhit, lampPos2[1] - myBox.yhit + 8, lampPos2[2] - myBox.zhit, 0);
			lamp0 = vec4.fromValues(lampPos[0] - myBox.xhit, lampPos[1] - myBox.yhit, lampPos[2] - myBox.zhit, 0);
			lamp1 = vec4.fromValues(lampPos2[0] - myBox.xhit, lampPos2[1] - myBox.yhit, lampPos2[2] - myBox.zhit, 0);
			vec4.normalize(lamp0, lamp0);
			vec4.normalize(lamp1, lamp1);
			vec4.normalize(lampDir, lampDir);
			vec4.normalize(lampDir2, lampDir2);
			vec4.normalize(eyeRay.dir, eyeRay.dir);
			Diffuse = vec4.create();
			tempC = vec4.create();
			Rvec = vec4.create();
			Evec = vec4.create();
			Specular = vec4.create();
			if(lamp1On == true){
			var sc = myGrid.shadowCheck(lampPos, lamp0);	
			}
			if(lamp2On == true){
			var rc = myGrid.shadowCheck(lampPos2, lamp1);	
			}	
				if(hitB == 1){
				colr = vec4.fromValues(0.19225,  0.19225,  0.19225,  1.0);
				kD = vec4.fromValues(0.50754,  0.50754,  0.50754,  1.0);
				var LdotN = vec4.dot(lampDir, myBox.boxNorm);
				vec4.scale(Diffuse, kD, LdotN);
				kD = vec4.fromValues(Diffuse[0], Diffuse[1], Diffuse[2], 0);
				vec4.scale(kD, kD, l1i);
				colr = vec4.add(colr, colr, kD);

				kD = vec4.fromValues(0.50754,  0.50754,  0.50754,  1.0);
				var LdotN2 = vec4.dot(lampDir2, myBox.boxNorm);
				vec4.scale(Diffuse, kD, LdotN2);
				kD = vec4.fromValues(Diffuse[0], Diffuse[1], Diffuse[2], 0);
				vec4.scale(kD, kD, l2i);
				colr = vec4.add(colr, colr, kD);

				var C = LdotN * 2;
				vec4.scale(tempC, myBox.boxNorm, C);
				vec4.subtract(Rvec, lampDir, tempC);
				vec4.negate(Evec, eyeRay.dir)
				var RdotE = vec4.dot(Rvec, Evec);
				RdotE = Math.pow(RdotE, 51);
				kS = vec4.fromValues(0.508273, 0.508273, 0.508273, 1.0);
				vec4.scale(Specular, kS, RdotE);
				kS = vec4.fromValues(Specular[0], Specular[1], Specular[2], 0);
				vec4.scale(kS, kS, l1i);
				colr = vec4.add(colr, colr, kS);

				var C = LdotN2 * 2;
				vec4.scale(tempC, myBox.boxNorm, C);
				vec4.subtract(Rvec, lampDir2, tempC);
				vec4.negate(Evec, eyeRay.dir)
				var RdotE = vec4.dot(Rvec, Evec);
				RdotE = Math.pow(RdotE, 51);
				kS = vec4.fromValues(0.508273, 0.508273, 0.508273, 1.0);
				vec4.scale(Specular, kS, RdotE);
				kS = vec4.fromValues(Specular[0], Specular[1], Specular[2], 0);
				vec4.scale(kS, kS, l2i);
				colr = vec4.add(colr, colr, kS);
				if(sc == 1 | rc ==1) {
					colr[0] = 0;
					colr[1] = 0;
					colr[2] = 0;
				}
				}
				tvec = vec3.fromValues(6, -5, -2);
			var hitB2 = myBox2.traceBox(eyeRay, tvec);
			lampDir = vec4.fromValues(lampPos[0] - myBox2.xhit, lampPos[1] - myBox2.yhit + 8, lampPos[2] - myBox2.zhit, 0);
			lampDir2 = vec4.fromValues(lampPos2[0] - myBox2.xhit, lampPos2[1] - myBox2.yhit + 8, lampPos2[2] - myBox2.zhit, 0);
			lamp0 = vec4.fromValues(lampPos[0] - myBox2.xhit, lampPos[1] - myBox2.yhit, lampPos[2] - myBox2.zhit, 0);
			lamp1 = vec4.fromValues(lampPos2[0] - myBox2.xhit, lampPos2[1] - myBox2.yhit, lampPos2[2] - myBox2.zhit, 0);
			vec4.normalize(lamp0, lamp0);
			vec4.normalize(lamp1, lamp1);
			vec4.normalize(lampDir, lampDir);
			vec4.normalize(lampDir2, lampDir2);
			vec4.normalize(eyeRay.dir, eyeRay.dir);
			Diffuse = vec4.create();
			tempC = vec4.create();
			Rvec = vec4.create();
			Evec = vec4.create();
			Specular = vec4.create();
			if(lamp1On == true){
			var sc = myGrid.shadowCheck(lampPos, lamp0);	
			}
			if(lamp2On == true){
			var rc = myGrid.shadowCheck(lampPos2, lamp1);	
			}	
				if(hitB2 == 1){
				colr = vec4.fromValues(0.19225,  0.19225,  0.19225,  1.0);
				kD = vec4.fromValues(0.50754,  0.50754,  0.50754,  1.0);
				var LdotN = vec4.dot(lampDir, myBox2.boxNorm);
				vec4.scale(Diffuse, kD, LdotN);
				kD = vec4.fromValues(Diffuse[0], Diffuse[1], Diffuse[2], 0);
				vec4.scale(kD, kD, l1i);
				colr = vec4.add(colr, colr, kD);

				kD = vec4.fromValues(0.50754,  0.50754,  0.50754,  1.0);
				var LdotN2 = vec4.dot(lampDir2, myBox2.boxNorm);
				vec4.scale(Diffuse, kD, LdotN);
				kD = vec4.fromValues(Diffuse[0], Diffuse[1], Diffuse[2], 0);
				vec4.scale(kD, kD, l2i);
				colr = vec4.add(colr, colr, kD);

				var C = LdotN * 2;
				vec4.scale(tempC, myBox2.boxNorm, C);
				vec4.subtract(Rvec, lampDir, tempC);
				vec4.negate(Evec, eyeRay.dir)
				var RdotE = vec4.dot(Rvec, Evec);
				RdotE = Math.pow(RdotE, 51);
				kS = vec4.fromValues(0.508273, 0.508273, 0.508273, 1.0);
				vec4.scale(Specular, kS, RdotE);
				kS = vec4.fromValues(Specular[0], Specular[1], Specular[2], 0);
				vec4.scale(kS, kS, l1i);
				colr = vec4.add(colr, colr, kS);

				var C = LdotN2 * 2;
				vec4.scale(tempC, myBox2.boxNorm, C);
				vec4.subtract(Rvec, lampDir2, tempC);
				vec4.negate(Evec, eyeRay.dir)
				var RdotE = vec4.dot(Rvec, Evec);
				RdotE = Math.pow(RdotE, 51);
				kS = vec4.fromValues(0.508273, 0.508273, 0.508273, 1.0);
				vec4.scale(Specular, kS, RdotE);
				kS = vec4.fromValues(Specular[0], Specular[1], Specular[2], 0);
				vec4.scale(kS, kS, l2i);
				colr = vec4.add(colr, colr, kS);
				if(sc == 1 || rc == 1){
					colr[0] = 0;
					colr[1] = 0;
					colr[2] = 0;
				}
				}

	  	this.fBuf[idx   ] = colr[0];	// bright blue
	  	this.fBuf[idx +1] = colr[1];
	  	this.fBuf[idx +2] = colr[2];
	  		}
  		}
  	}
  this.float2int();		// create integer image from floating-point buffer.
}

function CRay() {
//==============================================================================
// Object for a ray in an unspecified coord. system (usually 'world' coords).
	this.orig = vec4.fromValues(0,0,0,1);			// Ray starting point (x,y,z,w)
																						// (default: at origin
	this.dir = 	vec4.fromValues(0,0, -1,0);			// The ray's direction vector 
																						// (default: look down -z axis)
}

CRay.prototype.printMe = function(name) {
//==============================================================================
// print ray's values in the console window:
	if(name == undefined) name = ' ';
	console.log('CRay:', name, '   origin:\t', this.orig[0], ',\t',
												this.orig[1], ',\t', this.orig[2], ',\t', this.orig[3]);
	console.log('     ', name, 'direction:\t',  this.dir[0], ',\t',
										 		 this.dir[1], ',\t',  this.dir[2], ',\t',  this.dir[3]);
}

function CCamera() {
//==============================================================================
// Object for a ray-tracing camera defined the 'world' coordinate system, with
// a) -- 'extrinsic' parameters that set the camera's position and aiming
//	from the camera-defining UVN coordinate system 
// (coord. system origin at the eye-point; coord axes U,V define camera image 
// horizontal and vertical; camera gazes along the -N axis): 
// Default settings: put camera eye-point at world-space origin, and
	this.eyePt = vec4.fromValues(0,8,0,1);
	this.uAxis = vec4.fromValues(1,0,0,0);	// camera U axis == world x axis			
  this.vAxis = vec4.fromValues(0,0,1,0);	// camera V axis == world y axis
  this.nAxis = vec4.fromValues(0,1,0,0);	// camera N axis == world z axis.
		  	// (and thus we're gazing down the -Z axis with default camera). 

// b) --  Camera 'intrinsic' parameters that set the camera's optics and images.
// They define the camera's image frustum: its image plane is at N = -znear  (the
// plane that 'splits the universe', perpendicular to N axis), and no 'zfar' 
// plane at all (not needed: ray-tracer doesn't have or need the CVV).  
// The ray-tracing camera creates an rectangular image plane perpendicular to  
//	the cam-coord. system N axis at -iNear (defined by N vector in world coords),
// 			horizontally	spanning 'iLeft' <= u <= 'iRight' along the U vector, and
//			vertically    spanning  'iBot' <= v <=  'iTop' along the V vector. 
// As the default camera creates an image plane at distance iNear = 1 from the 
// camera's center-of-projection (at the u,v,n origin), these +/-1 
// defaults define a square ray-traced image with a +/-45-degree field-of-view:
	this.iNear = 1;
	this.iLeft = -1;		
	this.iRight = 1;
	this.iBot =  -1;
	this.iTop =   1; 
// And the lower-left-most corner of the image is at (u,v,n) = (iLeft,iBot,-1).
	this.xmax = 256;			// horizontal,
	this.ymax = 256;			// vertical image resolution.
// To ray-trace an image of xmax,ymax pixels, divide this rectangular image plane
// into xmax,ymax rectangular tiles, and shoot eye-rays from the camera's
// center-of-projection through those tiles to find scene color values.  For the 
// simplest, fastest image (without antialiasing) trace each eye-ray through the 
// CENTER of each tile to find pixel colors.  For slower, better-looking, 
// anti-aliased image making, apply jittered super-sampling:
//  For each pixel:		--subdivide the 'tile' into equal-sized 'sub-tiles'  
//										--trace one ray per sub-tile, but randomize (jitter)
//											 the ray's position within the sub-tile,
//										--set pixel color to the average of all sub-tile colors. 
// Divide the image plane into rectangular tiles, one for each pixel:
	this.ufrac = (this.iRight - this.iLeft) / this.xmax;	// pixel tile's width
	this.vfrac = (this.iTop   - this.iBot ) / this.ymax;	// pixel tile's height.
}

CCamera.prototype.setEyeRay = function(myeRay, xpos, ypos) {
//==============================================================================
// Set values of a CRay object to specify a ray in world coordinates that 
// originates at the camera's eyepoint (its center-of-projection: COP) and aims // in the direction towards the image-plane location (xpos,ypos) given in units // of pixels.  The ray's direction vector is *NOT* normalized.
//
// !CAREFUL! Be SURE you understand these floating-point xpos,ypos arguments!
// For the default CCamera (+/-45 degree FOV, xmax,ymax == 256x256 resolution) 
// the function call makeEyeRay(0,0) creates a ray to the image rectangle's 
// lower-left-most corner at U,V,N = (iLeft,iBot,-1), and the function call
// makeEyeRay(256,256) creates a ray to the image rectangle's upper-left-most  
// corner at U,V,N = (iRight,iTop,-1). 
//	To get the eye ray for pixel (x,y), DON'T call setEyeRay(myRay, x,y);
//                                   instead call setEyeRay(myRay,x+0.5,y+0.5)
// (Later you will trace multiple eye-rays per pixel to implement antialiasing) 
// WHY?  
//	-- because the half-pixel offset (x+0.5, y+0.5) traces the ray through the
//     CENTER of the pixel's tile, and not its lower-left corner.
// As we learned in class (and from optional reading "A Pixel is Not a Little 
// Square" by Alvy Ray Smith), a pixel is NOT a little square -- it is a 
// point-like location, one of many in a grid-like arrangement, where we store a 
// neighborhood summary of an image's color(s).  While we could (and often do) 
// define that pixel's 'neighborhood' as a small tile of the image plane, and 
// summarize its color as the tile's average color, it is not our only choice 
// and certainly not our best choice.  
// (ASIDE: You can dramatically improve the appearance of a digital image by 
//     making pixels  that summarize overlapping tiles by making a weighted 
//     average for the neighborhood colors, with maximum weight at the pixel 
//     location, and with weights that fall smoothly to zero as you reach the 
//     outer limits of the pixel's tile or 'neighborhood'. Google: antialiasing 
//     bilinear filter, Mitchell-Netravali piecewise bicubic prefilter, etc).

// Convert image-plane location (xpos,ypos) in the camera's U,V,N coords:
var posU = this.iLeft + xpos*this.ufrac; 	// U coord,
var posV = this.iBot  + ypos*this.vfrac;	// V coord,
//  and the N coord is always -1, at the image-plane (zNear) position.
// Then convert this point location to world-space X,Y,Z coords using our 
// camera's unit-length coordinate axes uAxis,vAxis,nAxis
 xyzPos = vec4.create();    // make vector 0,0,0,0.	
	vec4.scaleAndAdd(xyzPos,xyzPos, this.uAxis, posU); // xyzPos += Uaxis * posU;
	vec4.scaleAndAdd(xyzPos,xyzPos, this.vAxis, posV); // xyzPos += Vaxis * posU;
  vec4.scaleAndAdd(xyzPos, xyzPos, this.nAxis, -1); // xyzPos += Naxis * (-1)
  // NEXT, WE --COULD-- 
  // finish converting from UVN coordinates to XYZ coordinates: we made a
  // weighted sum of the U,V,N axes; now add UVN origin point, and we
  // would get (xyzPos + eyePt).
  // BUT WE DON'T NEED TO DO THAT.
  // The eyeRay we want consists of just 2 world-space values:
  //  	-- the ray origin == camera origin == eyePt in XYZ coords
  //		-- the ray direction TO image-plane point FROM ray origin;
  //				myeRay.dir = (xyzPos + eyePt) - eyePt = xyzPos; thus
	vec4.copy(myeRay.orig, this.eyePt);	
	vec4.copy(myeRay.dir, xyzPos);
}

// allowable values for CGeom.shapeType variable.  Add some of your own!
const JT_GNDPLANE = 0;    // An endless 'ground plane' surface.
const JT_SPHERE   = 1;    // A sphere.
const JT_BOX      = 2;    // An axis-aligned cube.
const JT_CYLINDER = 3;    // A cylinder with user-settable radius at each end
                        // and user-settable length.  radius of 0 at either
                        // end makes a cone; length of 0 with nonzero
                        // radius at each end makes a disk.
const JT_TRIANGLE = 4;    // a triangle with 3 vertices.
const JT_BLOBBIES = 5;    // Implicit surface:Blinn-style Gaussian 'blobbies'.


function CGeom(shapeSelect) {
//==============================================================================
// Generic object for a geometric shape.  Each instance describes just one shape,
// but you can select from several different kinds of shapes by setting
// the 'shapeType' member.
// CGeom can describe ANY shape, including sphere, box, cone, quadric, etc. and
// it holds all/any variables needed for each shapeType.
//
// Advanced Version: try it!
//        Ray tracing lets us position and distort these shapes in a new way;
// instead of transforming the shape itself for 'hit' testing against a traced
// ray, we transform the 3D ray by the matrix 'world2model' before the hit-test.
// This matrix simplifies our shape descriptions, because we don't need
// separate parameters for position, orientation, scale, or skew.  For example,
// JT_SPHERE and JT_BOX need NO parameters--they each describe a unit sphere or
// unit cube centered at the origin.  To get a larger, rotated, offset sphere
// or box, just set the parameters in world2model matrix. Note that you can scale
// the box or sphere differently in different directions, forming ellipsoids for
// the unit sphere and rectangles (or prisms) from the unit box.
	if(shapeSelect == undefined) shapeSelect = JT_GND_PLANE;	// default
	this.shapeType = shapeSelect;
	
	this.world2model = mat4.create();		// the matrix used to transform rays from
	                                    // 'world' coord system to 'model' coords;
	                                    // Use this to set shape size, position,
	                                    // orientation, and squash/stretch amount.
	// Ground-plane 'Line-grid' parameters:
	this.zGrid = -5;	// create line-grid on the unbounded plane at z=zGrid
	this.xgap = 1.0;	// line-to-line spacing
	this.ygap = 1.0;
	this.lineWidth = 0.1;	// fraction of xgap used for grid-line width
	this.lineColor = vec4.fromValues(0.1,0.5,0.1,1.0);	// RGBA green(A== opacity)
	this.gapColor = vec4.fromValues( 0.9,0.9,0.9,1.0);	// near-white
	this.sphereNorm = vec4.fromValues(0,0,0,0);
	this.boxNorm = vec4.fromValues(0,0,0,0);
	this.cylinderNorm = vec4.fromValues(0,0,0,0);
	this.sphereColor = vec4.fromValues(0.24725,  0.2245,   0.0645,   1.0);
	this.translateVec = vec3.create();
	this.xhit = 0;
	this.yhit = 0;
	this.zhit = 0;
	this.t = 0;
}

CGeom.prototype.rayLoadIdentity = function(w2m) {
	mat4.identity(w2m);
}
CGeom.prototype.rayTranslate = function(w2m, w2m, vec) {
	vec[0] = -vec[0];
	vec[1] = -vec[1];
	vec[2] = -vec[2];
	mat4.translate(w2m, w2m, vec);
}
CGeom.prototype.rayRotate = function(w2m, w2m, radians, vec) {
	radians = -radians;
	mat4.rotate(w2m, w2m, radians, vec);
}
CGeom.prototype.rayScale = function(w2m, w2m, vec) {
	vec[0] = 1/vec[0];
	vec[1] = 1/vec[1];
	vec[2] = 1/vec[2];
	mat4.scale(w2m, w2m, vec);
}
CGeom.prototype.rayLookAt = function(xL, yL, zL, eyeRay) {
	var x = xL - xE;
	var y = yL - yE;
	var z = zL - zE;
	eyeRay.dir = vec4.fromValues(x,y,z,0);
	return eyeRay;
}
CGeom.prototype.shadowCheck = function(inPos, inRay){
	torig = vec4.fromValues(inPos[0], inPos[1], inPos[2],1);
	tdir = vec4.fromValues(-inRay[0], inRay[1], -inRay[2], 0);
	tdir = vec4.normalize(tdir, tdir);
	var shadowRay = new CRay();
	vec4.copy(shadowRay.orig, torig);
	vec4.copy(shadowRay.dir, tdir);
	tvec = vec3.fromValues(0,1,0);
	var h = this.traceSphere(shadowRay, tvec,1);
	if (h == 1){
		return 1;
	}
	tvec = vec3.fromValues(2,1,3);
	var t = this.traceSphere(shadowRay, tvec, .5);
	if (t == 1) {
		return 1;
	}
	tvec = vec3.fromValues(-5,0,1);
	var t = this.traceSphere(shadowRay, tvec, .3);
	if (t == 1) {
		return 1;
	}
}
CGeom.prototype.shadowCheck2 = function(inPos, inRay){
	torig = vec4.fromValues(inPos[0], inPos[1], inPos[2],1);
	tdir = vec4.fromValues(-inRay[0], inRay[1], -inRay[2], 0);
	tdir = vec4.normalize(tdir, tdir);
	var shadowRay = new CRay();
	vec4.copy(shadowRay.orig, torig);
	vec4.copy(shadowRay.dir, tdir);
	tvec = vec3.fromValues(0,1,0);
	var h = this.traceSphere(shadowRay, tvec,1);
	if (h == 1){
		return 1;
	}
}

CGeom.prototype.reflection = function(inPos, inRay, recursion){

}
CGeom.prototype.traceGrid = function(inRay) {
//==============================================================================
// Find intersection of CRay object 'inRay' with the grid-plane at z== this.zGrid
// return -1 if ray MISSES the plane
// return  0 if ray hits BETWEEN lines
// return  1 if ray hits ON the lines
// HOW?!?
// 1) we parameterize the ray by 't', so that we can find any point on the
// ray by:
//          Ray(t) = ray.orig + t*ray.dir
// To find where the ray hit the plane, solve for t where R(t) = x,y,zGrid:
//          Ray(t0) = zGrid = ray.orig[2] + t0*ray.dir[2];
//  solve for t0:   t0 = (zGrid - ray.orig[2]) / ray.dir[2]
//  then find x,y value along ray for value t0:
//  hitPoint = ray.orig + t0*ray.dir
//  BUT if t0 <0, we can only hit the plane at points BEHIND our camera;
//  thus the ray going FORWARD through the camera MISSED the plane!.
//
// 2) Our grid-plane exists for all x,y, at the value z=zGrid.
//      location x,y, zGrid is ON the lines on the plane if
//          (x/xgap) has fractional part < linewidth  *OR*
//          (y/ygap) has fractional part < linewidth.
//      otherwise ray hit BETWEEN the lines.

var xhit,yhit;         // the x,y position where ray hits the plane
var t0;                // ray length where inRay hits the plane:
var xfrac,yfrac;       // fractional part of x/xgap, y/ygap;
var torig = vec4.create();
var tdir = vec4.create();
this.rayLoadIdentity(this.world2model);
//translateVec = vec3.fromValues(1,0,0);
//this.rayRotate(this.world2model, this.world2model, -Math.PI/2, translateVec);
torig = vec4.transformMat4(torig, inRay.orig, this.world2model);
tdir = vec4.transformMat4(tdir, inRay.dir, this.world2model);
tdir = vec4.normalize(tdir, tdir);

    t0 = (this.zGrid - torig[2]) / tdir[2];
    if(t0 < 0.0)
    {
            return -1;  	// the ray doesn't hit our plane
    }
    this.xhit = torig[0] + tdir[0] * t0;
    this.yhit = torig[1] + tdir[1] * t0;
    
    //Now; did the ray hit a line, or a gap between lines?
    xfrac = this.xhit - Math.floor(this.xhit/this.xgap); // get just the fractional part.
    yfrac = this.yhit - Math.floor(this.yhit/this.ygap);
    if((xfrac < this.lineWidth) || (yfrac < this.lineWidth)) return 1;
    else return 0;
}

CGeom.prototype.traceSphere = function(inRay, tvec, radius) {
	var t0, t1;
	var sC;
	var L2;
	var LM2;
	var DL2;
	var tcaS;
	var tca2;
	var L2hc;
	R2s = vec4.create();
	torig = vec4.create();
	tdir = vec4.create();
	sC = vec4.fromValues(0,0,0,1);
	this.rayLoadIdentity(this.world2model);
	this.translateVec = vec3.copy(this.translateVec, tvec);
	this.rayTranslate(this.world2model, this.world2model, this.translateVec);
	//translateVec = vec3.fromValues(1,0,0);
	//this.rayRotate(this.world2model, this.world2model, -Math.PI/2, translateVec);
	//console.log(this.world2model);
	torig = vec4.transformMat4(inRay.orig, inRay.orig, this.world2model);
	tdir = vec4.transformMat4(tdir, inRay.dir, this.world2model);
	tdir = vec4.normalize(tdir, tdir);
	vec4.subtract(R2s, sC, torig);
	L2 = vec4.dot(R2s, R2s);
	tcaS = vec4.dot(tdir, R2s);
	if (L2 > radius){
		if(tcaS < 0) {
			return -1;
		}
	}
	DL2 = vec4.dot(tdir, tdir);
	tca2 = (tcaS * tcaS) / DL2;
	LM2 = L2 - tca2;
	if (LM2 > radius){
		return -1;
	}
	L2hc = radius - LM2;
		if (L2 > radius){
		t0 = (tcaS/DL2) + Math.sqrt(L2hc/DL2);
		t1 = (tcaS/DL2) - Math.sqrt(L2hc/DL2);
	}
	else{
		t0 = (tcaS/DL2) + Math.sqrt(L2hc/DL2);
	}
	this.xhit = torig[0] + tdir[0] * t0;
    this.yhit = torig[1] + tdir[1] * t0;
    this.zhit = torig[2] + tdir[2] * t0;

    this.sphereNorm = vec4.fromValues(this.xhit, this.yhit, this.zhit, 0);
    //mat4.invert(this.world2model, this.world2model);
    //console.log(this.world2model);
   // mat4.transpose(this.world2model, this.world2model);
   // console.log(this.world2model);
    this.sphereNorm = vec4.transformMat4(this.sphereNorm, this.sphereNorm, this.world2model);
    this.sphereNorm = vec4.normalize(this.sphereNorm, this.sphereNorm);
    //console.log(this.sphereNorm);
    return 1;
}
CGeom.prototype.traceSkewSphere = function(inRay, tvec, radius, svec) {
	var t0, t1;
	var sC;
	var L2;
	var LM2;
	var DL2;
	var tcaS;
	var tca2;
	var L2hc;
	R2s = vec4.create();
	torig = vec4.create();
	tdir = vec4.create();
	sC = vec4.fromValues(0,0,0,1);
	this.rayLoadIdentity(this.world2model);
	this.translateVec = vec3.copy(this.translateVec, tvec);
	this.rayTranslate(this.world2model, this.world2model, this.translateVec);
	this.rayScale(this.world2model, this.world2model, svec);
	//translateVec = vec3.fromValues(1,0,0);
	//this.rayRotate(this.world2model, this.world2model, -Math.PI/2, translateVec);
	//console.log(this.world2model);
	torig = vec4.transformMat4(inRay.orig, inRay.orig, this.world2model);
	tdir = vec4.transformMat4(tdir, inRay.dir, this.world2model);
	tdir = vec4.normalize(tdir, tdir);
	vec4.subtract(R2s, sC, torig);
	L2 = vec4.dot(R2s, R2s);
	tcaS = vec4.dot(tdir, R2s);
	if (L2 > radius){
		if(tcaS < 0) {
			return -1;
		}
	}
	DL2 = vec4.dot(tdir, tdir);
	tca2 = (tcaS * tcaS) / DL2;
	LM2 = L2 - tca2;
	if (LM2 > radius){
		return -1;
	}
	L2hc = radius - LM2;
		if (L2 > radius){
		t0 = (tcaS/DL2) + Math.sqrt(L2hc/DL2);
		t1 = (tcaS/DL2) - Math.sqrt(L2hc/DL2);
	}
	else{
		t0 = (tcaS/DL2) + Math.sqrt(L2hc/DL2);
	}
	this.xhit = torig[0] + tdir[0] * t0;
    this.yhit = torig[1] + tdir[1] * t0;
    this.zhit = torig[2] + tdir[2] * t0;

    this.sphereNorm = vec4.fromValues(this.xhit, this.yhit, this.zhit, 0);
    mat4.invert(this.world2model, this.world2model);
    //console.log(this.world2model);
    //mat4.transpose(this.world2model, this.world2model);
   // console.log(this.world2model);
    this.sphereNorm = vec4.transformMat4(this.sphereNorm, this.sphereNorm, this.world2model);
    this.sphereNorm = vec4.normalize(this.sphereNorm, this.sphereNorm);
    //console.log(this.sphereNorm);
    return 1;
}
CGeom.prototype.traceTaperedCylinder = function(inRay, tvec, s, svec){
	torig = vec4.create();
	tdir = vec4.create();
	this.rayLoadIdentity(this.world2model);
	t = vec3.fromValues(1,1,0);
	this.rayScale(this.world2model, this.world2model, svec);
	this.rayRotate(this.world2model, this.world2model, Math.PI/2, t);
	this.rayTranslate(this.world2model, this.world2model, tvec);
	torig = vec4.transformMat4(inRay.orig, inRay.orig, this.world2model);
	tdir = vec4.transformMat4(tdir, inRay.dir, this.world2model);
	tdir = vec4.normalize(tdir, tdir);
	var A, B, C, discrim, disc_root, t1, t2, tb, tc;
	var sm = s-1;
	var fDir = sm * tdir[2];
	var fStart =sm * torig[2] + 1;
	A = (tdir[0] * tdir[0]) + (tdir[1] * tdir[1]) - (fDir * fDir);
	B = (torig[0] * tdir[0]) + (torig[1] * tdir[1]) - (fDir * fStart);
	C = (torig[0] * torig[0]) + (torig[1] * torig[1]) - (fStart * fStart);
	discrim = B*B - A*C;
	var num = 0;
	if(discrim > 0){
		disc_root = Math.sqrt(discrim);
		t1 = (-B - disc_root) / A;
		var zHit = torig[2] + tdir[2] * t1;
		if(t1 > 0.00001 && zHit <= 1 && zHit >=0){
			num = 1;
		}
		t2 = (-B + disc_root) / A;
		zHit = torig[2] + tdir[2] * t2;
		if(t2 > 0.00001 && zHit <= 1 && zHit >= 0){
			num = 3;
		}
	}
	tb = -torig[2] / tdir[2];
	if (tb > 0.00001 && Math.pow(torig[0] + tdir[0]*tb, 2) + Math.pow(torig[1] + tdir[1]*tb, 2) <1){
		num = 5;
	}
	tc = (1 - torig[2]) / tdir[2];
	if (tb > 0.00001 && Math.pow(torig[0] + tdir[0]*tb, 2) + Math.pow(torig[1] + tdir[1]*tb, 2) < s){
		num = 7;
	}
	if (num == 0){
		return 0;
	}
	else if(num == 1){
		this.xhit = torig[0] + tdir[0] * t1;
		this.yhit = torig[1] + tdir[1] * t1;
		this.zhit = torig[2] + tdir[2] * t1;
		this.cylinderNorm = (this.xhit, -this.yhit, this.zhit, 0);
		vec4.normalize(this.cylinderNorm, this.cylinderNorm);
		var tot = Math.floor(this.xhit) + Math.floor(this.yhit) + Math.floor(this.zhit);
		if (tot < 0){
			var ans = -(tot%2);
		}
		else{
			var ans = tot%2;
		}
		if(ans){
			this.sphereColor = vec4.fromValues(0,1,0,1);
		}
		else {
			this.sphereColor = vec4.fromValues(1,0,0,1);
		}
		return 1;
	}
	else if(num == 3){
		this.xhit = torig[0] + tdir[0] * t2;
		this.yhit = torig[1] + tdir[1] * t2;
		this.zhit = torig[2] + tdir[2] * t2;
		this.cylinderNorm = (this.xhit, -this.yhit, this.zhit, 0);
		vec4.normalize(this.cylinderNorm, this.cylinderNorm);
		var tot = Math.floor(this.xhit) + Math.floor(this.yhit) + Math.floor(this.zhit);
		if (tot < 0){
			var ans = -(tot%2);
		}
		else{
			var ans = tot%2;
		}
		if(ans){
			this.sphereColor = vec4.fromValues(0,1,0,1);
		}
		else {
			this.sphereColor = vec4.fromValues(1,0,0,1);
		}
		return 1;
	}
	else if(num == 5){
		this.xhit = torig[0] + tdir[0] * tb;
		this.yhit = torig[1] + tdir[1] * tb;
		this.zhit = torig[2] + tdir[2] * tb;
		this.cylinderNorm = (0, 0, -1, 0);
		var tot = Math.floor(this.xhit) + Math.floor(this.yhit) + Math.floor(this.zhit);
		if (tot < 0){
			var ans = -(tot%2);
		}
		else{
			var ans = tot%2;
		}
		if(ans){
			this.sphereColor = vec4.fromValues(0,1,0,1);
		}
		else {
			this.sphereColor = vec4.fromValues(1,0,0,1);
		}
		vec4.normalize(this.cylinderNorm, this.cylinderNorm);
		return 1;
	}
	else if(num == 7){
		this.xhit = torig[0] + tdir[0] * tc;
		this.yhit = torig[1] + tdir[1] * tc;
		this.zhit = torig[2] + tdir[2] * tc;
		this.cylinderNorm = (0, 0, 1, 0);
		var tot = Math.floor(this.xhit) + Math.floor(this.yhit) + Math.floor(this.zhit);
		if (tot < 0){
			var ans = -(tot%2);
		}
		else{
			var ans = tot%2;
		}
		if(ans){
			this.sphereColor = vec4.fromValues(0,1,0,1);
		}
		else {
			this.sphereColor = vec4.fromValues(1,0,0,1);
		}
		vec4.normalize(this.cylinderNorm, this.cylinderNorm);
		return 1;
	}
}

CGeom.prototype.traceBox = function(inRay, tvec){
	var tHit, numer, denom;
	var tIn = -100000;
	var tOut = 100000;
	var inSurf, outSurf;
	torig = vec4.create();
	tdir = vec4.create();
	this.rayLoadIdentity(this.world2model);
	this.rayTranslate(this.world2model, this.world2model, tvec);
	torig = vec4.transformMat4(inRay.orig, inRay.orig, this.world2model);
	tdir = vec4.transformMat4(tdir, inRay.dir, this.world2model);
	tdir = vec4.normalize(tdir, tdir);
	for (var i = 0; i < 6; i++){
		switch(i){
			case 0:
				numer = 1 - torig[1];
				denom = tdir[1];
				break;
			case 1:
				numer = 1 + torig[1];
				denom = -tdir[1];
				break;
			case 2:
				numer = 1 - torig[0];
				denom = tdir[0];
				break;
			case 3:
				numer = 1 + torig[0];
				denom = -tdir[0];
				break;
			case 4:
				numer = 1 - torig[2];
				denom = tdir[2];
				break;
			case 5:
				numer = 1 + torig[2];
				denom = -tdir[2];
				break;
			default:
				break;
		}
		if (Math.abs(denom) < .00001){
			if(numer < 0) {
				return -1;
			}
		}
		else{
			tHit = numer / denom;
			if(denom > 0){
				if(tHit < tOut) {
					tOut = tHit;
					outSurf = i;
				}
			}
			else{
				if(tHit > tIn) {
					tIn = tHit;
					inSurf = i;
				}
			}
		}
		if(tIn >= tOut) return -1;
	}
	switch(inSurf){
		case 0:
				this.boxNorm = vec4.fromValues(0,0,-1,0);
				break;
			case 1:
				this.boxNorm = vec4.fromValues(0,0,1,0);
				break;
			case 2:
				this.boxNorm = vec4.fromValues(1,0,0,0);
				break;
			case 3:
				this.boxNorm = vec4.fromValues(-1,0,0,0);
				break;
			case 4:
				this.boxNorm = vec4.fromValues(0,1,0,0);
				break;
			case 5:
				this.boxNorm = vec4.fromValues(0,-1,0,0);
				break;
			default:
				break;

	}
	var num = 0;
	if(tIn > .00001){
		this.xhit = torig[0] + tdir[0] *tIn;
		this.yhit = torig[1] + tdir[1] *tIn;
		this.zhit = torig[2] + tdir[2] *tIn;
		return 1;
	}
	if(tOut > .00001){
		return 1;
	}

}
/*
function CScene() {
//==============================================================================
// A complete ray tracer object prototype (formerly a C/C++ 'class').
//      My code uses just one CScene instance (myScene) to describe the entire 
//			ray tracer.  Note that I could add more CScene variables to make multiple
//			ray tracers (perhaps on different threads or processors) and combine
//			their results into a video sequence, a giant image, or use one result
//			to help create another.
//
//The CScene class includes:
// One CImgBuf object that holds a floating-point RGB image, and uses that
//		  image to create a corresponding 8,8,8 bit RGB image suitable for WebGL
//			display as a texture-map in an HTML-5 canvas object within a webpage.
// One CCamera object that describes an antialiased ray-tracing camera;
//      in my code, it is the 'rayCam' variable within the CScene prototype.
//      The CCamera class defines the SOURCE of rays we trace from our eyepoint
//      into the scene, and uses those rays to set output image pixel values.
// One CRay object 'eyeRay' that describes the ray we're currently tracing from
//      eyepoint into the scene.
// One CHitList object 'eyeHits' that describes each 3D point where the 'eyeRay'
//      pierces a shape (a CGeom object) in our CScene.  Each CHitList object
//      in our ray-tracer holds a COLLECTION of hit-points (CHit objects) for a
//      ray, and keeps track of which hit-point is closest to the camera. That
//			collection is held in the eyeHits member of the CScene class.
// a COLLECTION of CGeom objects that each describe an individual visible thing,
//      single item or thing we may see in the scene.  That collection is the 
//			held in the 'item[]' array within the CScene class.
//      		Each CGeom element in the 'item[]' array holds one shape on-screen.
//      To see three spheres and a ground-plane we'll have 4 CGeom objects, one 
//			for each of the spheres, and one for the ground-plane.
//      Each CGeom object includes a 'matlIndex' index number that selects which
//      material to use in rendering the CGeom shape. I assume all lights in the
//      scene may affect all CGeom shapes, but you may wish to add an light-src
//      index to permit each CGeom object to choose which lights(s) affect it.
// a COLLECTION of CMatl objects; each describes one light-modifying material.
//      That collection is held in the 'matter[]' array within the CScene class.
//      Each CMatl element in the 'matter[]' array describes one particular
//      individual material we will use for one or more CGeom shapes. We may
//      have one CMatl object that describes clear glass, another for a
//      Phong-shaded brass-metal material, another for a texture-map, another
//      for a bump mapped material for the surface of an orange (fruit),
//      another for a marble-like material defined by Perlin noise, etc.
// a COLLECTION of CLight objects that each describe one light source.  
//			That collection is held in the 'lamp[]' array within the CScene class.
//      Note that I apply all lights to all CGeom objects.  You may wish to
//      add an index to the CGeom class to select which lights affect each item.
//
// The default CScene constructor creates a simple scene that will create a
// picture if traced:
// --rayCam with +/- 45 degree Horiz field of view, aimed at the origin from 
// 			world-space location (0,0,5)
// --item[0] is a unit sphere at the origin that uses matter[0] material;
// --matter[0] material is a shiny red Phong-lit material, lit by lamp[0];
// --lamp[0] is a point-light source at location (5,5,5).

	this.rayCam = new CCamera();				// The ray-tracing camera object.
	this.eyeRay = new CRay();						// Current 'eye' ray we're tracing
																			// (ray from camera used to make a pixel)
	this.eyeHits = new CHitList;				// Intersections between eyeRay and each
																			// CGeom object in this.item[] array.
																			
	this.item = new Array() ...;				// List of CGeom objects; one object for 
																			// each shape-primitive in the scene.
																			
	this.matter = new Array()... ;			// List of CMatl objects; one object for
																			// each material in the scene.
																			
	this.lamp = new Array() ... ;				// List of CLight objects; one object for
																			// each light source in the scene.
																			
	this.bkgndColr = 0.0, 0.5, 0.7;			// Default RGB background color; used for
																			// rays that don't hit any scene items.
																			
	this.errorColr = 1.0, 0.0, 0.0;			// initial RGB value for recursive rays.
	
	this.depthMax = 1;									// max. allowed recursion depth for rays.
	this.isAA = false;									// is AntiAliased? If TRUE, use jittered
																			// super-sampling in a rectagular 'tile'
																			// for every pixel, then average colors.
	this.xSuperAA = 4;									// # of Anti-Alias supersamples per pixel.
	this.ySuperAA = 4;
}

function CHit() {
//==============================================================================
// Describes one ray/object intersection point that was found by 'tracing' one
// ray through one shape (through a single CGeom object, held in the
// CScene.item[] array).
// CAREFUL! We don't use isolated CHit objects, but instead gather all the CHit
// objects for one ray in one list held inside a CHitList object.
// (CHit, CHitList classes are consistent with the 'HitInfo' and 'Intersection'
// classes described in FS Hill, pg 746).

    this.hitItem = -1;          // Index# of the CGeom object we pierced;
                                //  (use this in the CScene item[] array).
                                // Set to -1 if 'empty' or 'invalid'. 
                                // NOTE: CGeom objects describe their materials
                                // and coloring (e.g. CMatl) by an index into
                                // the CScene.matter[] array.
    this.t;                   	// 'hit time' parameter for the ray; defines one
                                // 'hit-point' along ray:  orig + t*dir = hitPt.
    this.hitPt;                 // World-space location where the ray pierced
                                // the surface of a CGeom item.
    this.surfNorm;             	// World-space surface-normal vector at the hit
                                // point: perpendicular to surface.
    this.viewN;                 // Unit-length vector from hitPt back towards
                                // the origin of the ray we traced.
    this.isEntering;            // true iff ray origin was OUTSIDE the hitItem.
                                //a(example; transparency rays begin INSIDE).
    this.modelHitPt;            // the 'hit point' expressed in model coords.
    // *WHY* have modelHitPt? to evaluate procedural textures & materials.
    //      Remember, we define each CGeom objects as simply as possible in its
    // own 'model' coordinate system (e.g. fixed, unit size, axis-aligned, and
    // centered at origin) and each one uses its own worldRay2Model matrix
    // to customize them in world space.  We use that matrix to translate,
    // rotate, scale or otherwise transform the object in world space.
    // This means we must TRANSFORM rays from the camera's 'world' coord. sys.
    // to 'model' coord sys. before we trace the ray.  We find the ray's
    // collision length 't' in model space, but we can use it on the world-
    // space rays to find world-space hit-point as well.
    //      However, some materials and shading methods work best in model
    // coordinates too; for example, if we evaluate procedural textures
    // (grid-planes, checkerboards, 3D woodgrain textures) in the 'model'
    // instead of the 'world' coord system, they'll stay 'glued' to the CGeom
    // object as we move it around in world-space (by changing worldRay2Model
    //  matrix), and will not change if we 'squeeze' a model by scaling it.
    this.colr;                  // The final RGB color computed for this point,
                                // (note-- not used for shadow rays).
                                // (uses RGBA. A==opacity, default A=1=opaque.
//   this.depth;                  // recursion depth.
}

function CHitList() {
//==============================================================================
// Holds all the ray/object intersection results from tracing a single ray(CRay)
// through all objects (CGeom) in our scene (CScene).  ALWAYS holds at least
// one valid CHit 'hit-point', as we initialize pierce[0] to the CScene's
// background color.  Otherwise, each CHit element in the 'pierce[]' array
// describes one point on the ray where it enters or leaves a CGeom object.
// (each point is in front of the ray, not behind it; t>0).
//  -- 'iEnd' index selects the next available CHit object at the end of
//      our current list in the pierce[] array. if iEnd=0, the list is empty.
//      CAREFUL! *YOU* must prevent buffer overflow! Keep iEnd<= JT_HITLIST_MAX!
//  -- 'iNearest' index selects the CHit object nearest the ray's origin point.

    this.pierce = new Array()...;			// array of ray/object intersection pts.
    //this.seq = new Array()...;     	// sorted array of indices for pierce[]
    //                                // for nearest-to-farthest ordering.

    this.iNearest;           	// index of the CHit object in pierce[] array that
                            		// describes the ray's closest hit-point.
    this.isShadowRay;           // true? the ray whose hits we record was used 
    														// ONLY to test for occlusion; no need to gather
                                // color info.
/*
    void initList(Vec4 bkColr); // initialize the list; set up just one
                                // CHit object for ray to hit background.

    void findNearestHit(void);  // Traverse pierce[] array; store index of the
                                // nearest hit-point in iNearest.
    //void sortHits(void);        // fill the 'seq[]' array with indices for the
                                // 'pierce[]' array that put them in nearest-
                                // to-farthest order (e.g. seq[0]==iNearest).

}
*/
