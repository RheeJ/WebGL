//3456789_123456789_123456789_123456789_123456789_123456789_123456789_123456789_
// (JT: why the numbers? counts columns, helps me keep 80-char-wide listings)
//
// Chap 5: TexturedQuad.js (c) 2012 matsuda and kanda
//					"WebGL Programming Guide" pg. 163
// became:
//
//	traceWeek01_LineGrid.js 	MODIFIED for EECS 351-1, 
//																	Northwestern Univ. Jack Tumblin
//	--add comments
//	--two side-by-side viewports: 
//			LEFT:	--3D line-drawing preview
//			RIGHT:--texture-map from a Uint8Array object.  
//							(NOTE: Not all versions of WebGL can read the Float32Array
//							(made by our ray-tracer; convert it to 8-bit integer
//							(by rounding: intRGB = floatRGB*255.5
//	--include re-sizing to fit browser-window width
//							(see 351-1 starter code: 7.11.JT_HelloCube_Resize.js, .html)
//-------------------------
//	traceWeek02_Xforms.js
//	--create the 'CImgBuf' prototype that holds floating-point image AND 
//		AND an 8-bit R,G,B Uint8 image suitable for display in WebGL by texture 
//		mapping (many WebGL implementations can't use floating-point textures) 
//	--add mouse and keyboard handlers to main(); 
//		(from EECS 351-1 Week 3 starter code:  5.04.jt.controlMulti.html)
//	--respond to 't' or 'T' key by UPDATING the on-screen texture map with the
//		contents of the CImageBuf object.

//=============================================================================

// Vertex shader program----------------------------------
var VSHADER_SOURCE =
  'uniform mat4 u_MvpMatrix;\n' +
  'attribute vec4 a_Position;\n' +
  'attribute vec2 a_TexCoord;\n' +
  'varying vec2 v_TexCoord;\n' +
  'void main() {\n' +
  '  gl_Position = u_MvpMatrix * a_Position;\n' +
  '  v_TexCoord = a_TexCoord;\n' +
  '}\n';

// Fragment shader program--------------------------------
var FSHADER_SOURCE =
  '#ifdef GL_ES\n' +
  'precision mediump float;\n' +							// set default precision
  '#endif\n' +
  'uniform int u_isTexture; \n' +							// texture/not-texture flag
  'uniform sampler2D u_Sampler;\n' +						// our 2D texture-addr-maker 
															// (see initTextures() fcn below)
  'varying vec2 v_TexCoord;\n' +
  'void main() {\n' +
  '  if(u_isTexture > 0) {  \n' +				// pixel color comes from texture-map,
  '  	 gl_FragColor = texture2D(u_Sampler, v_TexCoord);\n' +
  '  } \n' +
  '  else { \n' +												// OR pixel color is just 'red'
  '	 	 gl_FragColor = vec4(1.0, 0.2, 0.2, 1.0); \n' +
  '  } \n' +
  '}\n';

//Global Vars:----------------------------------------------------------------

//var myCanvas = document.getElementByID('webgl');

// 'Uniform' values (sent to the GPU)
var u_isTexture = 0;					// ==0 false--use fixed colors in frag shader
										// ==1 true --use texture-mapping in frag shader
var u_isTextureID = 0;			  // GPU location of this uniform var

// Global vars for mouse click-and-drag for rotation.
var isDrag=false;		// mouse-drag: true when user holds down mouse button
var xMclik=0.0;			// last mouse button-down position (in CVV coords)
var yMclik=0.0;   
var xMdragTot=0.0;	// total (accumulated) mouse-drag amounts (in CVV coords).
var yMdragTot=0.0;  
var canvas;
var floatsPerVertex = 6;
var xPos = 8;
var yPos = 0;
var zPos = 1;
var xAt = 0;
var yAt = 0;
var zAt = 1;
var xUp = 0;
var yUp = 0;
var zUp = 1;
var mvpMatrix = new Matrix4();
var u_MvpMatrix;
var GPG = 0;
var texStart;
var planetStart;
var theta = Math.PI;
//-----------Ray Tracer Objects:

var myPic = new CImgBuf(256,256);	// create RGB image buffer object, and
var isTracing = 1;						
var gndVerts = new Float32Array(floatsPerVertex * 2 * (200));			// ==1 when tracing; else 0
var texVerts;
var planetVerts = new Float32Array();

function main() {
//==============================================================================
  test_glMatrix();		// make sure that the fast vector/matrix library we use
  						// is available and working properly.
  
  // Retrieve <canvas> element
  canvas = document.getElementById('webgl');

  browserResize();			// Re-size this canvas before we use it. 
	// (ignore the size settings from our HTML file; fill all but a 20-pixel 
	// border with a canvas whose width is twice its height.)
  // Get the rendering context for WebGL
  var gl = getWebGLContext(canvas);
  if (!gl) {
    console.log('Failed to get the rendering context for WebGL');
    return;
  }

  // Initialize shaders
  if (!initShaders(gl, VSHADER_SOURCE, FSHADER_SOURCE)) {
    console.log('Failed to intialize shaders.');
    return;
  }

  // Create,enable vertex buffer objects (VBO) in graphics hardware
  var n = initVertexBuffers(gl);
  if (n < 0) {
    console.log('Failed to set up vertex buffer objects');
    return;
  }

	// Create, set uniform var to select fixed color vs texture map drawing:
	u_isTextureID = gl.getUniformLocation(gl.program, 'u_isTexture');
  if (!u_isTextureID) {
    console.log('Failed to get the GPU storage location of u_isTexture uniform');
    return false;
  }
u_MvpMatrix = gl.getUniformLocation(gl.program, 'u_MvpMatrix');
  if (!u_MvpMatrix) { 
    console.log('Failed to get the storage location of u_MvpMatrix');
    return;
    }
	// Register the Mouse & Keyboard Event-handlers-------------------------------
	// If users move, click or drag the mouse, or they press any keys on the 
	// the operating system will sense them immediately as 'events'.  
	// If you would like your program to respond to any of these events, you must // tell JavaScript exactly how to do it: you must write your own 'event 
	// handler' functions, and then 'register' them; tell JavaScript WHICH 
	// events should cause it to call WHICH of your event-handler functions.
	//
	// First, register all mouse events found within our HTML-5 canvas:
  canvas.onmousedown	=	function(ev){myMouseDown( ev, gl, canvas) }; 
  
  					// when user's mouse button goes down call mouseDown() function
  canvas.onmousemove = 	function(ev){myMouseMove( ev, gl, canvas) };
  
											// call mouseMove() function					
  canvas.onmouseup = 		function(ev){myMouseUp(   ev, gl, canvas)};
  					// NOTE! 'onclick' event is SAME as on 'mouseup' event
  					// in Chrome Brower on MS Windows 7, and possibly other 
  					// operating systems; use 'mouseup' instead.
  					
  // Next, register all keyboard events found within our HTML webpage window:
	window.addEventListener("keydown", myKeyDown, false);
	window.addEventListener("keyup", myKeyUp, false);
	window.addEventListener("keypress", myKeyPress, false);
  // The 'keyDown' and 'keyUp' events respond to ALL keys on the keyboard,
  // 			including shift,alt,ctrl,arrow, pgUp, pgDn,f1,f2...f12 etc. 
  //			I find these most useful for arrow keys; insert/delete; home/end, etc.
  // The 'keyPress' events respond only to alpha-numeric keys, and sense any 
  //  		modifiers such as shift, alt, or ctrl.  I find these most useful for
  //			single-number and single-letter inputs that include SHIFT,CTRL,ALT.

	// END Mouse & Keyboard Event-Handlers-----------------------------------

  // Specify how we will clear the WebGL context in <canvas>
  gl.clearColor(0.0, 0.0, 0.0, 1.0);				
   gl.enable(gl.DEPTH_TEST); // CAREFUL! don't do depth tests for 2D!

  // Create, load, enable texture buffer object (TBO) in graphics hardware
  if (!initTextures(gl, n)) {
    console.log('Failed to intialize the texture object(s).');
    return;
  }
	// Draw the WebGL preview (right) and ray-traced result (left).
  var tick = function () {
    drawAll(gl,n);
    requestAnimationFrame(tick, canvas);
};
tick(); 
}

function test_glMatrix() {
//=============================================================================
// make sure that the fast vector/matrix library we use is available and works 
// properly. My search for 'webGL vector matrix library' found the GitHub 
// project glMatrix is intended for WebGL use, and is very fast, open source 
// and well respected.		 	SEE:       http://glmatrix.net/
// 			NOTE: cuon-matrix.js library (supplied with our textbook: "WebGL 
// Programming Guide") duplicates some of the glMatrix.js functions. For 
// example, the glMatrix.js function 		mat4.lookAt() 		is a work-alike 
//	 for the cuon-matrix.js function 		Matrix4.setLookAt().
	// Try some vector vec4 operations:
	var myV4 = vec4.fromValues(1,8,4,7);				// create a 4-vector 
																							// (without 'var'? global scope!)
	console.log(' myV4 = '+myV4+'\n myV4[0] = '+myV4[0]+'\n myV4[1] = '+myV4[1]+'\n myV4[2] = '+myV4[2]+'\n myV4[3] = '+myV4[3]+'\n\n');
	var yerV4 = vec4.fromValues(1,1,1,1);
	console.log('yerV4[] = ', 
				yerV4[0], ', ', yerV4[1], ', ', yerV4[2], ', ', yerV4[3]);
	console.log('vec4.subtract(yerV4, yerV4, myV4) yields ');
	vec4.subtract(yerV4, yerV4, myV4);
		console.log('yerV4[] = ', 
				yerV4[0], ', ', yerV4[1], ', ', yerV4[2], ', ', yerV4[3]);
	// Try some matrix mat4 operations:
	var myM4 = mat4.create();							// create a 4x4 matrix
	console.log('mat4.str(myM4) = '+mat4.str(myM4)+'\n' );
	// Which is it? print out row[0], row[1], row[2], row[3],
	// or print out column[0], column[1], column[2], column[3]?
	// Create a 'translate' matrix to find out:
	var transV3 = vec3.fromValues(6,7,8);			// apply 3D translation vector
	mat4.translate(myM4, myM4, transV3);	// make into translation matrix
	console.log('mat4.str(myM4) = '+mat4.str(myM4)+'\n');	// print it as string
	// As you can see, the 'mat4' object stores matrix contents in COLUMN-first 
	// order; to display this translation matrix correctly, do this
	// (suggests you might want to add a 'print()' function to mat2,mat3,mat4): 
	console.log('---------Translation Matrix: tx,ty,tz == (6,7,8)-----------\n');
	console.log(
	' myM4 row0=[ '+myM4[ 0]+', '+myM4[ 4]+', '+myM4[ 8]+', '+myM4[12]+' ]\n');
	console.log(
	' myM4 row1=[ '+myM4[ 1]+', '+myM4[ 5]+', '+myM4[ 9]+', '+myM4[13]+' ]\n');
	console.log(
	' myM4 row2=[ '+myM4[ 2]+', '+myM4[ 6]+', '+myM4[10]+', '+myM4[14]+' ]\n');
		console.log(
	' myM4 row3=[ '+myM4[ 3]+', '+myM4[ 7]+', '+myM4[11]+', '+myM4[15]+' ]\n');
}

function initVertexBuffers(gl) {
//==============================================================================
// 4 vertices for a texture-mapped 'quad' (square) to fill almost all of the CVV
makeGroundGrid();
makePlanet();
makeTex();

var mySize = (gndVerts.length + texVerts.length + planetVerts.length);
var n = mySize / floatsPerVertex;

var colorShapes = new Float32Array(mySize);
GPG = 0;              
  for (i = 0, j = 0; j < gndVerts.length; i++, j++) {
      colorShapes[i] = gndVerts[j];
  }
texStart = i;
  for (j = 0; j < texVerts.length; i++, j++) {
      colorShapes[i] = texVerts[j];
  }
  planetStart = i;
  for (j = 0; j < planetVerts.length; i++, j++) {
      colorShapes[i] = planetVerts[j];
  }

  // Create the vertex buffer object in the GPU
  var vertexTexCoordBufferID = gl.createBuffer();
  if (!vertexTexCoordBufferID) {
    console.log('Failed to create the buffer object');
    return -1;
  }

  // Bind the this vertex buffer object to target (ARRAY_BUFFER).  
  // (Why 'ARRAY_BUFFER'? Because our array holds vertex attribute values.
  //	Our only other target choice: 'ELEMENT_ARRAY_BUFFER' for an array that 
  // holds indices into another array that holds vertex attribute values.)
  gl.bindBuffer(gl.ARRAY_BUFFER, vertexTexCoordBufferID);
  gl.bufferData(gl.ARRAY_BUFFER, colorShapes, gl.STATIC_DRAW);

  var FSIZE = colorShapes.BYTES_PER_ELEMENT;	// number of bytes/value
  //---------------------------
  //Get the GPU location of a_Position attribute; assign * enable buffer
  var a_PositionID = gl.getAttribLocation(gl.program, 'a_Position');
  if (a_PositionID < 0) {
    console.log('Failed to get the GPU storage location of a_Position');
    return -1;
  }
  gl.vertexAttribPointer(a_PositionID, 		// select the vertex attrib in the GPU
  												4, 			// # of values per attrib (1,2,3, or 4)
  												gl.FLOAT, 	// data-type of each value in this attrib
  												false, 		// is this attrib already normalized?
  												FSIZE*floatsPerVertex, 	// stride: # of bytes from start of this
  															// attribute to the start of the next one
  												0);			// offset: # of bytes to the start of data
															// in the buffer we use
  gl.enableVertexAttribArray(a_PositionID);  
  															// Enable extraction of this attribute from
  															// the currently-bound buffer object=
  //---------------------------
  // Get the GPU location of a_TexCoord attribute: assign & enable buffer
  var a_TexCoordID = gl.getAttribLocation(gl.program, 'a_TexCoord');
  if (a_TexCoordID < 0) {
    console.log('Failed to get the GPU storage location of a_TexCoord');
    return -1;
  }
  // Assign the buffer object to a_TexCoord variable
  gl.vertexAttribPointer(a_TexCoordID, 	// select the vertex attrib in the GPU 
  												2, 					// # of values per attrib (1,2,3, or 4)
  												gl.FLOAT, 	// data-type of each value in this attrib
  												false, 			// is this attrib already normalized?
  												FSIZE*floatsPerVertex, 		// stride: # of bytes from start of this
  																		// attribute to the start of the next one
  												FSIZE*4);		// offset: # of bytes to the start of data
  gl.enableVertexAttribArray(a_TexCoordID);  
  																// Enable extraction of this attribute from
  																// the currently-bound buffer object
    //---------------------------
  return n;
}

function initTextures(gl, n) {
//==============================================================================
// set up the GPU to supply a texture image and pixel-by-pixel texture addresses
// for our Fragment Shader.
  var textureID = gl.createTexture();   // Get GPU location for new texture map 
  if (!textureID) {
    console.log('Failed to create the texture object on the GPU');
    return false;
  }

  // Get GPU location of a new uniform u_Sampler
  var u_SamplerID = gl.getUniformLocation(gl.program, 'u_Sampler');
  if (!u_SamplerID) {
    console.log('Failed to get the GPU location of u_Sampler');
    return false;
  }
 
	myPic.setTestPattern(1);				// fill it with an initial test-pattern.
																	// 0 == colorful L-shaped pattern
																	// 1 == uniform orange screen
	
  // Enable texture unit0 for our use
  gl.activeTexture(gl.TEXTURE0);
  // Bind our texture object (made at start of this fcn) to GPU's texture hdwe.
  gl.bindTexture(gl.TEXTURE_2D, textureID);
  // allocate memory and load the texture image into our texture object on GPU:
  gl.texImage2D(gl.TEXTURE_2D, 	//  'target'--the use of this texture
  							0, 							//  MIP-map level (default: 0)
  							gl.RGB, 				// GPU's data format (RGB? RGBA? etc)
								myPic.xSiz,			// image width in pixels,
								myPic.ySiz,			// image height in pixels,
								0,							// byte offset to start of data
  							gl.RGB, 				// source/input data format (RGB? RGBA?)
  							gl.UNSIGNED_BYTE, 	// data type for each color channel				
								myPic.iBuf);	// data source.
								
  // Set the WebGL texture-filtering parameters
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  // Set the texture unit 0 to be driven by the sampler
  gl.uniform1i(u_SamplerID, 0);
	return true;									// done.
}
function makeTex() {
  texVerts = new Float32Array([
    -1, 1, 0, 1, 0, 1,
    -1, -1, 0, 1, 0, 0,
    1, 1, 0, 1, 1, 1,
    1, -1, 0, 1, 1, 0,
    ]);
}
function makePlanet() {
    var disks = 21;
    var diskVerts = 27;
    var NPColr = new Float32Array([1, 1, 1]);
    var EQColr = new Float32Array([.4, 1, 1]);
    var SPColr = new Float32Array([1, 1, 1]);
    var diskAngle = Math.PI / disks;

    planetVerts = new Float32Array(((disks * 2 * diskVerts) - 2) * floatsPerVertex);

    var cosine0 = 0.0;
    var sine0 = 0.0;
    var cosine1 = 0.0;
    var sine1 = 0.0;
    var j = 0;
    var isLast = 0;
    var isFirst = 1;
    for (s = 0; s < disks; s++) {
        if (s == 0) {
            isFirst = 1;
            cosine0 = 1.0;
            sine0 = 0.0;
        }
        else {
            isFirst = 0;
            cosine0 = cosine1;
            sine0 = sine1;
        }
        cosine1 = Math.cos((s + 1) * diskAngle);
        sine1 = Math.sin((s + 1) * diskAngle);
        if (s == disks - 1) isLast = 1;
        for (v = isFirst; v < 2 * diskVerts - isLast; v++, j += floatsPerVertex) {
            if (v % 2 == 0) {
                planetVerts[j] = sine0 * Math.cos(Math.PI * (v) / diskVerts);
                planetVerts[j + 1] = sine0 * Math.sin(Math.PI * (v) / diskVerts);
                planetVerts[j + 2] = cosine0;
                planetVerts[j + 3] = 1.0;
            }
            else {
                planetVerts[j] = sine1 * Math.cos(Math.PI * (v - 1) / diskVerts);
                planetVerts[j + 1] = sine1 * Math.sin(Math.PI * (v - 1) / diskVerts);
                planetVerts[j + 2] = cosine1;
                planetVerts[j + 3] = 1.0;
            }
            if (s <= 3) {
                planetVerts[j + 4] = NPColr[0];
                planetVerts[j + 5] = NPColr[1];
            }
            else if (s >= disks - 4) {
                planetVerts[j + 4] = SPColr[0];
                planetVerts[j + 5] = SPColr[1];
            }
            else {
                planetVerts[j + 4] = EQColr[0];
                planetVerts[j + 5] = EQColr[1];

            }
        }
    }
}
var xcount = 100;     // # of lines to draw in x,y to make the grid.
var ycount = 100;
var xymax = 50.0; 
function makeGroundGrid() {
//==============================================================================
// Create a list of vertices that create a large grid of lines in the x,y plane
            // draw a grid made of xcount+ycount lines; 2 vertices per line.
            
  var xgap = xymax/(xcount-1);    // HALF-spacing between lines in x,y;
  var ygap = xymax/(ycount-1);    // (why half? because v==(0line number/2))
  
  // First, step thru x values as we make vertical lines of constant-x:
  for(v=0, j=0; v<2*xcount; v++, j+= floatsPerVertex) {
    if(v%2==0) {  // put even-numbered vertices at (xnow, -xymax, 0)
      gndVerts[j  ] = -xymax + (v  )*xgap;  // x
      gndVerts[j+1] = -xymax;               // y
      gndVerts[j + 2] = 0.0;
      gndVerts[j + 3] = 1;                  // z
    }
    else {        // put odd-numbered vertices at (xnow, +xymax, 0).
      gndVerts[j  ] = -xymax + (v-1)*xgap;  // x
      gndVerts[j+1] = xymax;                // y
      gndVerts[j + 2] = 0.0;
      gndVerts[j + 3] = 1;                  // z
    }
    gndVerts[j + 4] = 0;
    gndVerts[j + 5] = 0;
  }
  // Second, step thru y values as wqe make horizontal lines of constant-y:
  // (don't re-initialize j--we're adding more vertices to the array)
  for(v=0; v<2*ycount; v++, j+= floatsPerVertex) {
    if(v%2==0) {    // put even-numbered vertices at (-xymax, ynow, 0)
      gndVerts[j  ] = -xymax;               // x
      gndVerts[j+1] = -xymax + (v  )*ygap;  // y
      gndVerts[j + 2] = 0.0;
      gndVerts[j + 3] = 1;                // z
    }
    else {          // put odd-numbered vertices at (+xymax, ynow, 0).
      gndVerts[j  ] = xymax;                // x
      gndVerts[j+1] = -xymax + (v-1)*ygap;  // y
      gndVerts[j + 2] = 0.0;
      gndVerts[j + 3] = 1;                // z
    }
    gndVerts[j + 4] = 0;
    gndVerts[j + 5] = 0;
  }
}

function refreshTextures(gl) {
//==============================================================================
// Modify/update the contents of the texture map(s) stored in the GPU;
// copy current contents of CImgBuf object 'myPic'  (see initTextures() above)
// into the existing texture-map object stored in the GPU:

  gl.texSubImage2D(gl.TEXTURE_2D, 	//  'target'--the use of this texture
  							0, 							//  MIP-map level (default: 0)
  							0,0,						// xoffset, yoffset (shifts the image)
								myPic.xSiz,			// image width in pixels,
								myPic.ySiz,			// image height in pixels,
  							gl.RGB, 				// source/input data format (RGB? RGBA?)
  							gl.UNSIGNED_BYTE, 	// data type for each color channel				
								myPic.iBuf);	// data source.
}
  

function drawAll(gl,nV) {
//==============================================================================
// Clear <canvas> color AND DEPTH buffer
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  // Use OpenGL/ WebGL 'viewports' to map the CVV to the 'drawing context',
	// (for WebGL, the 'gl' context describes how we draw inside an HTML-5 canvas)
	// Details? see
  //  https://www.khronos.org/registry/webgl/specs/1.0/#2.3
  //------------------------------------------
  // Draw in the LEFT viewport
  //------------------------------------------
	// CHANGE from our default viewport:
	// gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
	// to a smaller one:
	gl.viewport(0,  														// Viewport lower-left corner
							0,															// (x,y) location(in pixels)
  						gl.drawingBufferWidth/2, 				// viewport width, height.
  						gl.drawingBufferHeight);
  // select fixed-color drawing:  
  gl.uniform1i(u_isTextureID, 0);		
  				// DON'T use texture,
  mvpMatrix.setPerspective(40,        // fovy: y-axis field-of-view in degrees            // (top <-> bottom in view frustum)
                            (canvas.width/2) / canvas.height, // aspect ratio: width/height
                            1, 20);
  mvpMatrix.lookAt(xPos, yPos, zPos,          // 'Center' or 'Eye Point',
            xAt, yAt, zAt,          // look-At point,
            xUp, yUp, zUp);
   mvpMatrix.translate(0, 0, 0);
     gl.uniformMatrix4fv(u_MvpMatrix, false, mvpMatrix.elements);
  gl.drawArrays(gl.LINES, GPG / floatsPerVertex, gndVerts.length / floatsPerVertex); 	// Draw a simple red Z shape, or

  mvpMatrix.translate(0, 0, 2);
     gl.uniformMatrix4fv(u_MvpMatrix, false, mvpMatrix.elements);
  gl.drawArrays(gl.LINES, planetStart / floatsPerVertex, planetVerts.length / floatsPerVertex);
  //gl.drawArrays(gl.LINES, 0, nV);			// or just 2 red lines, or
 	//------------------------------------------
  // Draw in the RIGHT viewport:
  //------------------------------------------
	gl.viewport(gl.drawingBufferWidth/2, 				// Viewport lower-left corner
							0, 															// location(in pixels)
  						gl.drawingBufferWidth/2, 				// viewport width, height.
  						gl.drawingBufferHeight);
	gl.uniform1i(u_isTextureID, 1);						// DO use texture,
  mvpMatrix.setTranslate(0,0,0,0);
  gl.uniformMatrix4fv(u_MvpMatrix, false, mvpMatrix.elements);
  gl.drawArrays(gl.TRIANGLE_STRIP, texStart / floatsPerVertex, texVerts.length / floatsPerVertex); 	// Draw the textured rectangle
  //----------------------------------------- 

}

function browserResize() {
//==============================================================================
// Called when user re-sizes their browser window , because our HTML file
// contains:  <body onload="main()" onresize="browserResize()">

  /* SOLUTION to a pesky problem: 
  The main() function retrieves our WebGL drawing context as the variable 'gl', then shares it as an argument to other functions.  
  That's not enough!
  How can we access the 'gl' canvas within functions that main() will NEVER call, such as the mouse and keyboard-handling functions, or winResize()? Easy! make our own local references to the current canvas and WebGL drawing
  context, like this: */

	var myCanvas = document.getElementById('webgl');	// get current canvas
	var myGL = getWebGLContext(myCanvas);							// and its current context:
	//Report our current browser-window contents:

 console.log('myCanvas width,height=', myCanvas.width, myCanvas.height);		
 console.log('Browser window: innerWidth,innerHeight=', 
																innerWidth, innerHeight);	
										// See: http://www.w3schools.com/jsref/obj_window.asp
	
	//Make a square canvas/CVV fill the SMALLER of the width/2 or height:
	if(innerWidth > 2*innerHeight) {  // fit to brower-window height
		myCanvas.width = 2*innerHeight-20;
		myCanvas.height = innerHeight-20;
	  }
	else {	// fit canvas to browser-window width
		myCanvas.width = innerWidth-20;
		myCanvas.height = 0.5*innerWidth-20;
	  }	 
 console.log('NEW myCanvas width,height=', myCanvas.width, myCanvas.height);		
}


//=================================//
//                                 //
//   Mouse and Keyboard            //
//   event-handling Callbacks      //
//                                 //
//=================================//


function myMouseDown(ev, gl, canvas) {
//==============================================================================
// Called when user PRESSES down any mouse button;
// 									(Which button?    console.log('ev.button='+ev.button);   )
// 		ev.clientX, ev.clientY == mouse pointer location, but measured in webpage 
//		pixels: left-handed coords; UPPER left origin; Y increases DOWNWARDS (!)  

// Create right-handed 'pixel' coords with origin at WebGL canvas LOWER left;
  var rect = ev.target.getBoundingClientRect();	// get canvas corners in pixels
  var xp = ev.clientX - rect.left;									// x==0 at canvas left edge
  var yp = canvas.height - (ev.clientY - rect.top);	// y==0 at canvas bottom edge
//  console.log('myMouseDown(pixel coords): xp,yp=\t',xp,',\t',yp);
  
	// Convert to Canonical View Volume (CVV) coordinates too:
	// MODIFIED for side-by-side display: find position within the LEFT-side CVV 
  var x = (xp - canvas.width/4)  / 		// move origin to center of LEFT viewport,
  						 (canvas.width/4);			// normalize canvas to -1 <= x < +1,
	var y = (yp - canvas.height/2) /		//										 -1 <= y < +1.
							 (canvas.height/2);
//	console.log('myMouseDown(CVV coords  ):  x, y=\t',x,',\t',y);
	
	isDrag = true;											// set our mouse-dragging flag
	xMclik = x;													// record where mouse-dragging began
	yMclik = y;
};


function myMouseMove(ev, gl, canvas) {
//==============================================================================
// Called when user MOVES the mouse with a button already pressed down.
// 									(Which button?   console.log('ev.button='+ev.button);    )
// 		ev.clientX, ev.clientY == mouse pointer location, but measured in webpage 
//		pixels: left-handed coords; UPPER left origin; Y increases DOWNWARDS (!)  

	if(isDrag==false) return;				// IGNORE all mouse-moves except 'dragging'

	// Create right-handed 'pixel' coords with origin at WebGL canvas LOWER left;
  var rect = ev.target.getBoundingClientRect();	// get canvas corners in pixels
  var xp = ev.clientX - rect.left;									// x==0 at canvas left edge
	var yp = canvas.height - (ev.clientY - rect.top);	// y==0 at canvas bottom edge
//  console.log('myMouseMove(pixel coords): xp,yp=\t',xp,',\t',yp);
  
	// Convert to Canonical View Volume (CVV) coordinates too:
	// MODIFIED for side-by-side display: find position within the LEFT-side CVV 
  var x = (xp - canvas.width/4)  / 		// move origin to center of LEFT viewport, 
  						 (canvas.width/4);			// normalize canvas to -1 <= x < +1,
	var y = (yp - canvas.height/2) /		//										 -1 <= y < +1.
							 (canvas.height/2);
//	console.log('myMouseMove(CVV coords  ):  x, y=\t',x,',\t',y);

	// find how far we dragged the mouse:
	xMdragTot += (x - xMclik);					// Accumulate change-in-mouse-position,&
	yMdragTot += (y - yMclik);
	xMclik = x;													// Make next drag-measurement from here.
	yMclik = y;
};

function myMouseUp(ev, gl, canvas) {
//==============================================================================
// Called when user RELEASES mouse button pressed previously.
// 									(Which button?   console.log('ev.button='+ev.button);    )
// 		ev.clientX, ev.clientY == mouse pointer location, but measured in webpage 
//		pixels: left-handed coords; UPPER left origin; Y increases DOWNWARDS (!)  

// Create right-handed 'pixel' coords with origin at WebGL canvas LOWER left;
  var rect = ev.target.getBoundingClientRect();	// get canvas corners in pixels
  var xp = ev.clientX - rect.left;									// x==0 at canvas left edge
	var yp = canvas.height - (ev.clientY - rect.top);	// y==0 at canvas bottom edge
//  console.log('myMouseUp  (pixel coords): xp,yp=\t',xp,',\t',yp);
  
	// Convert to Canonical View Volume (CVV) coordinates too:
	// MODIFIED for side-by-side display: find position within the LEFT-side CVV 
  var x = (xp - canvas.width/4)  / 		// move origin to center of LEFT viewport,
  						 (canvas.width/4);			// normalize canvas to -1 <= x < +1,
	var y = (yp - canvas.height/2) /		//										 -1 <= y < +1.
							 (canvas.height/2);
	console.log('myMouseUp  (CVV coords  ):  x, y=\t',x,',\t',y);
	
	isDrag = false;											// CLEAR our mouse-dragging flag, and
	// accumulate any final bit of mouse-dragging we did:
	xMdragTot += (x - xMclik);
	yMdragTot += (y - yMclik);
	console.log('myMouseUp: xMdragTot,yMdragTot =',xMdragTot,',\t',yMdragTot);
};


function myKeyDown(ev) {
//===============================================================================
// Called when user presses down ANY key on the keyboard, and captures the 
// keyboard's scancode or keycode(varies for different countries and alphabets).
//  CAUTION: You may wish to avoid 'keydown' and 'keyup' events: if you DON'T 
// need to sense non-ASCII keys (arrow keys, function keys, pgUp, pgDn, Ins, 
// Del, etc), then just use the 'keypress' event instead.
//	 The 'keypress' event captures the combined effects of alphanumeric keys and // the SHIFT, ALT, and CTRL modifiers.  It translates pressed keys into ordinary
// UniCode or ASCII codes; you'll get the ASCII code for uppercase 'S' if you 
// hold shift and press the 's' key.
// For a light, easy explanation of keyboard events in JavaScript,
// see:    http://www.kirupa.com/html5/keyboard_events_in_javascript.htm
// For a thorough explanation of the messy way JavaScript handles keyboard events
// see:    http://javascript.info/tutorial/keyboard-events
        switch (ev.keyCode) {
        case 37:
            xAt -= (Math.sin(theta)/10);
            xPos -= (Math.sin(theta)/10);
            yPos += (Math.cos(theta) / 10);
            yAt += (Math.cos(theta) / 10);
            break;
        case 38:
            xmov = .1;
            xAt += (Math.cos(theta)/10);
            xPos += (Math.cos(theta)/10);
            yPos += (Math.sin(theta) / 10);
            yAt += (Math.sin(theta) / 10);
            var temp = (zAt - zPos)/8;
            zPos +=temp;
            if (zAt > zPos){
              zAt += .08;
            }
            else if (zAt <= zPos +.1 && zAt >=zPos -.1) {
              zAt = zAt;
            }
            else {
              zAt -= .08;
            }
            break;
        case 39:
            xAt += (Math.sin(theta)/10);
            xPos += (Math.sin(theta)/10);
            yPos -= (Math.cos(theta) / 10);
            yAt -= (Math.cos(theta) / 10);
            break;
        case 40:
        zAt = zAt;
            xAt -= (Math.cos(theta)/10);
            xPos -= (Math.cos(theta)/10);
            yPos -= (Math.sin(theta) / 10);
            yAt -= (Math.sin(theta) / 10);
            break;
        case 68:
        zAt = zAt;
            xAt = xPos + Math.cos(theta);
            yAt = yPos + Math.sin(theta);
            theta -= .1;
            break;
        case 65:
            xAt = xPos + Math.cos(theta);
            yAt = yPos + Math.sin(theta);
            theta += .1;
            break;
       case 87:
            zAt += .1;
            break;
        case 83:
            zAt -= .1;
            break;
        default:
          break;
    }
}

function myKeyUp(ev) {
//===============================================================================
// Called when user releases ANY key on the keyboard; senses ALL key changes.
//  Rarely needed.

//	console.log('myKeyUp()--keyCode='+ev.keyCode+' released.');
	
}

function myKeyPress(ev) {
//===============================================================================
// Best for capturing alphanumeric keys and key-combinations such as 
// CTRL-C, alt-F, SHIFT-4, etc.
	var myChar = String.fromCharCode(ev.charCode);	// as a 1-char string;
	console.log('myKeyPress(): string value=', myChar, ', keyCode=', ev.keyCode, 
							', charCode=', ev.charCode, 
							', \n shift=', ev.shiftKey, ', ctrl=', ev.ctrlKey, ', altKey=', ev.altKey, ', metaKey(Command key or Windows key)=', ev.metaKey);
	// Did user press the 't' or the 'T' key?
	if(myChar == 't') {
		if(isTracing==0) isTracing = 1;			// Toggle 'isTracing'
		else isTracing = 0;		console.log('==========TestPattern ' + isTracing + '====================');
		myPic.setTestPattern(isTracing);		// create a different text pattern
		}
  if(myChar == 'p') {
    if (isAA == true){
    isAA = false;
  }
  else{
    isAA = true;
  }

  }
	if(myChar == 'T') myPic.makeRayTracedImage();
	var myCanvas = document.getElementById('webgl');	// get current canvas
	var myGL = getWebGLContext(myCanvas);				// and its current context:
	refreshTextures(myGL);
	drawAll(myGL,4);

  if(myChar == 'E') myPic.makeRayTracedImage2();
  var myCanvas = document.getElementById('webgl');  // get current canvas
  var myGL = getWebGLContext(myCanvas);       // and its current context:
  refreshTextures(myGL);
  drawAll(myGL,4);
}

function toggleLamp1(){
  if(lamp1On == true){
    l1i = 0;
    lamp1On = false;
  }
  else{
    l1i = 1;
    lamp1On = true;
  }
}

function togglePos1(){
    var x = document.getElementById('lamp1x').value;
    var y = document.getElementById('lamp1y').value;
    var z = document.getElementById('lamp1z').value;
    l1x = x;
    l1y = z;
    l1z = y;
    console.log(l1x);
}

function toggleLamp2(){
  if(lamp2On == true){
    l2i = 0;
    lamp2On = false;
  }
  else{
    l2i = 1;
    lamp2On = true;
  }
}

function togglePos2(){
    var x = document.getElementById('lamp2x').value;
    var y = document.getElementById('lamp2y').value;
    var z = document.getElementById('lamp2z').value;
    l2x = x;
    l2y = z;
    l2z = y;
}