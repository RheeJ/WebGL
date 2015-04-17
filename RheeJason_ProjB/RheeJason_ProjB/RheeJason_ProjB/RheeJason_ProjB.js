
var VSHADER_SOURCE =
  'attribute vec4 a_Position;\n' +
  'attribute vec4 a_Color;\n' +
  'attribute vec4 a_Normal;\n' +
  'uniform mat4 u_MvpMatrix;\n' +
  'uniform mat4 u_NormalMatrix;\n' +
  'uniform vec3 u_LightDirection;\n' +
  'varying vec4 v_Color;\n' +
  'void main() {\n' +
  '  gl_Position = u_MvpMatrix * a_Position;\n' +
  '  vec4 normal = u_NormalMatrix * a_Normal;\n' +
  '  float nDotL = max(dot(u_LightDirection, normalize(normal.xyz)), 0.0);\n' +
  '  v_Color = vec4(a_Color.xyz * nDotL, a_Color.a);\n' + 
  '}\n';

// Fragment shader program
var FSHADER_SOURCE =
  '#ifdef GL_ES\n' +
  'precision mediump float;\n' +
  '#endif\n' +
  'varying vec4 v_Color;\n' +
  'void main() {\n' +
  '  gl_FragColor = v_Color;\n' +
  '}\n';
//Global vars (so we can call draw() without arguments)
var canvas;
var mvpMatrix = new Matrix4();
var n, u_MvpMatrix;
var u_LightColor;
var u_LightDirection;
var u_NormalMatrix;
var floatsPerVertex = 10;
var solarpanelStart,starStart, planetStart, moonStart, spacecraftStart, gndStart, coneStart,DrawingStart, TorusStart, shapeStart;
var solarpanelVerts = new Float32Array;
var starVerts = new Float32Array;
var planetVerts = new Float32Array;
var moonVerts = new Float32Array;
var coneVerts = new Float32Array;
var DrawingVerts = new Float32Array;
var shapeVerts = new Float32Array;
var torVerts = new Float32Array(10*(2*14*23 +2));
var gndVerts = new Float32Array(floatsPerVertex * 2 * (200));
var spacecraftVerts = new Float32Array(((16 * 6) - 2) * floatsPerVertex);
var modelMatrix = new Matrix4();
var normalMatrix = new Matrix4();
var MvpMatrix = new Matrix4();
var u_ModelMatrix;
var currentAngle = 0.0;
var currentScale = 0.0;
var currentMove = 0;
var ANGLE_STEP = 45.0;
var SCALE_STEP = 21;
var MOVE_STEP = 0;
var xmov = 0;
var ymov = 2;
var zmov = 0;
var cmovx = 0;
var cmovy = 0;
var theta = 3.1415926535897;
var ex = 8;
var ey = 10;
var tzmov = 0;
var tymov = 0;
var xPos = 8;
var yPos = 2;
var zPos = 0;
var xAt = 0;
var yAt = 2;
var zAt = 0;
var xUp = 0;
var yUp = 1;
var zUp = 0;
var temp2 = 0;

function main() {
//==============================================================================
  // Retrieve <canvas> element 
  canvas = document.getElementById('webgl');
  
  // re-size that canvas to fit the browser-window size:
  winResize();   // (HTML file also calls it on browser-resize events)

  // Get the rendering context for WebGL; 
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

  // Set the vertex coordinates and color
  n = initVertexBuffers(gl);
  if (n < 0) {
    console.log('Failed to set the vertex information');
    return;
}


  // Set clear color and enable hidden surface removal
  gl.clearColor(0.0, 0.0, 0.0, 1.0);
  gl.enable(gl.DEPTH_TEST);

  // Get the storage location of u_MvpMatrix
  u_MvpMatrix = gl.getUniformLocation(gl.program, 'u_MvpMatrix');
  u_LightDirection = gl.getUniformLocation(gl.program, 'u_LightDirection');
  u_NormalMatrix = gl.getUniformLocation(gl.program, 'u_NormalMatrix');
  if (!u_MvpMatrix || !u_NormalMatrix || !u_LightDirection) { 
    console.log('Failed to get the storage location');
    return;
  }
  gl.uniform3f(u_LightColor, 1.0, 1.0, 1.0);
  var lightDirection = new Vector3([0, 0, 1]);
  lightDirection.normalize();     // Normalize
  gl.uniform3fv(u_LightDirection, lightDirection.elements);

window.addEventListener("keydown", myKeyDown, false);
window.addEventListener("keyup", myKeyUp, false);
window.addEventListener("keypress", myKeyPress, false);
var tick = function () {
    currentAngle = animate(currentAngle);
    if (currentScale < .4) {
        currentScale = animscale(currentScale);
    }
    else { currentScale = .4 }
    draw(gl);
    requestAnimationFrame(tick, canvas);
};
tick();						// draw in all viewports.
	
}

function initVertexBuffers(gl) {

    makestar();
    makeplanet();
    makemoon();
    makespacecraftbody();
    makespacecraftsolarpanel();
    makecone();
    makeGroundGrid();
    makeDrawing();
    makeTorus();
    makeShape();

    var mySiz = (starVerts.length + planetVerts.length + moonVerts.length + spacecraftVerts.length + solarpanelVerts.length + gndVerts.length + coneVerts.length + DrawingVerts.length + torVerts.length + shapeVerts.length);

    var nn = mySiz / floatsPerVertex;

    var colorShapes = new Float32Array(mySiz);
    starStart = 0;
    for (i = 0, j = 0; j < starVerts.length; i++, j++) {
        colorShapes[i] = starVerts[j];
    }
    planetStart = i;
    for (j = 0; j < planetVerts.length; i++, j++) {
        colorShapes[i] = planetVerts[j];
    }
    moonStart = i;
    for (j = 0; j < moonVerts.length; i++, j++) {
        colorShapes[i] = moonVerts[j];
    }
    spacecraftStart = i;
    for (j = 0; j < spacecraftVerts.length; i++, j++) {
        colorShapes[i] = spacecraftVerts[j];
    }
    solarpanelStart = i;
    for (j = 0; j < solarpanelVerts.length; i++, j++) {
        colorShapes[i] = solarpanelVerts[j];
    }
    gndStart = i;
    for (j = 0; j < gndVerts.length; i++, j++) {
        colorShapes[i] = gndVerts[j];
    }
    coneStart = i;
    for (j = 0; j < coneVerts.length; i++, j++) {
        colorShapes[i] = coneVerts[j];
    }
    DrawingStart = i;
    for (j = 0; j < DrawingVerts.length; i++, j++) {
        colorShapes[i] = DrawingVerts[j];
    }
    TorusStart = i;
    for (j = 0; j < torVerts.length; i++, j++) {
        colorShapes[i] = torVerts[j];
    }
    shapeStart = i;
    for (j = 0; j < shapeVerts.length; i++, j++) {
        colorShapes[i] = shapeVerts[j];
    }
    var shapeBufferHandle = gl.createBuffer();
    if (!shapeBufferHandle) {
        console.log('Failed to create the shape buffer object');
        return false;
    }

    gl.bindBuffer(gl.ARRAY_BUFFER, shapeBufferHandle);

    gl.bufferData(gl.ARRAY_BUFFER, colorShapes, gl.STATIC_DRAW);

    var a_Position = gl.getAttribLocation(gl.program, 'a_Position');
    if (a_Position < 0) {
        console.log('Failed to get the storage location of a_Position');
        return -1;
    }

    var FSIZE = colorShapes.BYTES_PER_ELEMENT;

    gl.vertexAttribPointer(
  		a_Position,
  		4,
  		gl.FLOAT,
  		false,
  		FSIZE * floatsPerVertex,

  		0);

    gl.enableVertexAttribArray(a_Position);

    var a_Color = gl.getAttribLocation(gl.program, 'a_Color');
    if (a_Color < 0) {
        console.log('Failed to get the storage location of a_Color');
        return -1;
    }

    gl.vertexAttribPointer(
  	a_Color,
  	3,
  	gl.FLOAT,
  	false,
  	FSIZE * floatsPerVertex,
  	FSIZE * 4);

    gl.enableVertexAttribArray(a_Color);

    var a_Normal = gl.getAttribLocation(gl.program, 'a_Normal');
    if (a_Normal < 0) {
        console.log('Failed to get the storage location of a_Normal');
        return -1;
    }

    gl.vertexAttribPointer(
      a_Normal,
      3,
      gl.FLOAT,
      false,
      FSIZE * floatsPerVertex,
      FSIZE * 7)

      gl.enableVertexAttribArray(a_Normal);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);

    return nn;
}
function makestar() {
    var wide = 10;
    starVerts = new Float32Array((6 * wide - 2) * floatsPerVertex);
    for (v = 1, j = 0; v < 2 * wide; v++, j += floatsPerVertex) {
        if (v % 2 == 0) {
            starVerts[j] = 0;
            starVerts[j + 1] = 0;
            starVerts[j + 2] = 1;
            starVerts[j + 3] = 1;
            starVerts[j + 4] = 1;
            starVerts[j + 5] = 1;
            starVerts[j + 6] = 0;
        }
        else {
            starVerts[j] = Math.cos(Math.PI * (v - 1) / wide);
            starVerts[j + 1] = Math.sin(Math.PI * (v - 1) / wide);
            starVerts[j + 2] = 1;
            starVerts[j + 3] = 1;
            starVerts[j + 4] = 1;
            starVerts[j + 5] = 1;
            starVerts[j + 6] = 0;
        }
        starVerts[j + 7] = 0;
        starVerts[j + 8] = 0;
        starVerts[j + 9] = 1;
    }
    for (v = 0; v < 2 * wide; v++, j += floatsPerVertex) {
        if (v % 4 == 0) {
            starVerts[j] = Math.cos(Math.PI * (v) / wide);
            starVerts[j + 1] = Math.sin(Math.PI * (v) / wide);
            starVerts[j + 2] = 1;
            starVerts[j + 3] = 1;
            starVerts[j + 4] = 1;
            starVerts[j + 5] = .5;
            starVerts[j + 6] = 0;
        }
        else if (v % 4 == 1) {
            starVerts[j] = 0;
            starVerts[j + 1] = 0;
            starVerts[j + 2] = 2;
            starVerts[j + 3] = 1;
            starVerts[j + 4] = 1;
            starVerts[j + 5] = 1;
            starVerts[j + 6] = 1;
        }
        else if (v % 4 == 3) {
            starVerts[j] = 0;
            starVerts[j + 1] = 0;
            starVerts[j + 2] = 2;
            starVerts[j + 3] = 1;
            starVerts[j + 4] = 1;
            starVerts[j + 5] = 1;
            starVerts[j + 6] = 1;
        }
        else {
            starVerts[j] = Math.cos(Math.PI * (v) / wide);
            starVerts[j + 1] = Math.sin(Math.PI * (v) / wide);
            starVerts[j + 2] = 1;
            starVerts[j + 3] = 1;
            starVerts[j + 4] = 1;
            starVerts[j + 5] = 1;
            starVerts[j + 6] = 0;
        }
        starVerts[j + 7] = Math.cos(Math.PI * (v) / wide);
        starVerts[j + 8] = Math.sin(Math.PI * (v) / wide);
        starVerts[j + 9] = 2;

    }
    for (v = 0; v < 2 * wide; v++, j += floatsPerVertex) {
        if (v % 4 == 0) {
            starVerts[j] = Math.cos(Math.PI * (v) / wide);
            starVerts[j + 1] = Math.sin(Math.PI * (v) / wide);
            starVerts[j + 2] = 1;
            starVerts[j + 3] = 1;
            starVerts[j + 4] = 1;
            starVerts[j + 5] = .5;
            starVerts[j + 6] = 0;
        }
        else if (v % 4 == 1) {
            starVerts[j] = 0;
            starVerts[j + 1] = 0;
            starVerts[j + 2] = 0;
            starVerts[j + 3] = 1;
            starVerts[j + 4] = 1;
            starVerts[j + 5] = 1;
            starVerts[j + 6] = 1;
        }
        else if (v % 4 == 3) {
            starVerts[j] = 0;
            starVerts[j + 1] = 0;
            starVerts[j + 2] = 0;
            starVerts[j + 3] = 1;
            starVerts[j + 4] = 1;
            starVerts[j + 5] = 1;
            starVerts[j + 6] = 1;
        }
        else {
            starVerts[j] = Math.cos(Math.PI * (v) / wide);
            starVerts[j + 1] = Math.sin(Math.PI * (v) / wide);
            starVerts[j + 2] = 1;
            starVerts[j + 3] = 1;
            starVerts[j + 4] = 1;
            starVerts[j + 5] = 1;
            starVerts[j + 6] = 0;
        }
        starVerts[j + 7] = Math.cos(Math.PI * (v) / wide);
        starVerts[j + 8] = Math.sin(Math.PI * (v) / wide);
        starVerts[j + 9] = 0;

    }
}
function makeplanet() {
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
                planetVerts[j + 6] = NPColr[2];
            }
            else if (s >= disks - 4) {
                planetVerts[j + 4] = SPColr[0];
                planetVerts[j + 5] = SPColr[1];
                planetVerts[j + 6] = SPColr[2];
            }
            else {
                planetVerts[j + 4] = EQColr[0];
                planetVerts[j + 5] = EQColr[1];
                planetVerts[j + 6] = EQColr[2];
            }
            planetVerts[j + 7] = sine0 * Math.cos(Math.PI * (v) / diskVerts);
            planetVerts[j + 8] = sine0 * Math.sin(Math.PI * (v) / diskVerts);
            planetVerts[j + 9] = cosine0;
        }
    }
}
function makemoon() {

    moonVerts = new Float32Array([

     1.0, 1.0, 1.0,1,1,1,1,0.0, 0.0, 1.0,  -1.0, 1.0, 1.0,1,0.7,0.7,0.7,0.0, 0.0, 1.0,  -1.0,-1.0, 1.0,1,1,1,1,0.0, 0.0, 1.0,   1.0,-1.0, 1.0,1,0.7,0.7,0.7,0.0, 0.0, 1.0, // v0-v1-v2-v3 front
     1.0, 1.0, 1.0,1,1,1,1,1.0, 0.0, 0.0,  1.0,-1.0, 1.0,1,0.7,0.7,0.7,1.0, 0.0, 0.0,    1.0,-1.0,-1.0,1,1,1,1,1.0, 0.0, 0.0,   1.0, 1.0,-1.0,1,0.7,0.7,0.7,1.0, 0.0, 0.0, // v0-v3-v4-v5 right
     1.0, 1.0, 1.0,1,1,1,1,0.0, 1.0, 0.0,   1.0, 1.0,-1.0,1,0.7,0.7,0.7,0.0, 1.0, 0.0,   -1.0, 1.0,-1.0,1,1,1,1,0.0, 1.0, 0.0,  -1.0, 1.0, 1.0,1,0.7,0.7,0.7,0.0, 1.0, 0.0, // v0-v5-v6-v1 up
    -1.0, 1.0, 1.0,1,1,1,1,-1.0, 0.0, 0.0,  -1.0, 1.0,-1.0,1,0.7,0.7,0.7,-1.0, 0.0, 0.0,  -1.0,-1.0,-1.0,1, 1,1,1,-1.0, 0.0, 0.0, -1.0,-1.0, 1.0,1,0.7,0.7,0.7,-1.0, 0.0, 0.0, // v1-v6-v7-v2 left
    -1.0,-1.0,-1.0,1,1,1,1,0.0,-1.0, 0.0,   1.0,-1.0,-1.0,1,0.7,0.7,0.7,0.0,-1.0, 0.0,    1.0,-1.0, 1.0,1, 1,1,1,0.0,-1.0, 0.0, -1.0,-1.0, 1.0,1,0.7,0.7,0.7,0.0,-1.0, 0.0, // v7-v4-v3-v2 down
     1.0,-1.0,-1.0,1,1,1,1,0.0, 0.0,-1.0,  -1.0,-1.0,-1.0,1,0.7,0.7,0.7,0.0, 0.0,-1.0,   -1.0, 1.0,-1.0,1, 1,1,1,0.0, 0.0,-1.0,  1.0, 1.0,-1.0,1,0.7,0.7,0.7,0.0, 0.0,-1.0, // v4-v7-v6-v5 back
    ]);

}
function makespacecraftbody() {
    var yellow = new Float32Array([.7, .7, .7]);
    var orange = new Float32Array([1, 1, 0.4]);
    var brown = new Float32Array([.3, .2, .1]);
    var wide = 16;
    for (v = 1, j = 0; v < 2 * wide; v++, j += floatsPerVertex) {
        if (v % 2 == 0) {
            spacecraftVerts[j] = 0.0;
            spacecraftVerts[j + 1] = 0.0;
            spacecraftVerts[j + 2] = 1.0;
            spacecraftVerts[j + 3] = 1.0;
            spacecraftVerts[j + 4] = yellow[0];
            spacecraftVerts[j + 5] = yellow[1];
            spacecraftVerts[j + 6] = yellow[2];
        }
        else {
            spacecraftVerts[j] = Math.cos(Math.PI * (v - 1) / wide);
            spacecraftVerts[j + 1] = Math.sin(Math.PI * (v - 1) / wide);
            spacecraftVerts[j + 2] = 1.0;
            spacecraftVerts[j + 3] = 1.0;
            spacecraftVerts[j + 4] = orange[0];
            spacecraftVerts[j + 5] = orange[1];
            spacecraftVerts[j + 6] = orange[2];
        }
        spacecraftVerts[j + 7] = 0;
        spacecraftVerts[j + 8] = 1;
        spacecraftVerts[j + 9] = 0;
    }

    for (v = 0; v < 2 * wide; v++, j += floatsPerVertex) {
        if (v % 2 == 0) {
            spacecraftVerts[j] = Math.cos(Math.PI * (v) / wide);
            spacecraftVerts[j + 1] = Math.sin(Math.PI * (v) / wide);
            spacecraftVerts[j + 2] = 1.0;
            spacecraftVerts[j + 3] = 1.0;
            spacecraftVerts[j + 4] = orange[0];
            spacecraftVerts[j + 5] = orange[1];
            spacecraftVerts[j + 6] = orange[2];
        }
        else {
            spacecraftVerts[j] = Math.cos(Math.PI * (v - 1) / wide);
            spacecraftVerts[j + 1] = Math.sin(Math.PI * (v - 1) / wide);
            spacecraftVerts[j + 2] = -1.0;
            spacecraftVerts[j + 3] = 1.0;
            spacecraftVerts[j + 4] = brown[0];
            spacecraftVerts[j + 5] = brown[1];
            spacecraftVerts[j + 6] = brown[2];
        }
        spacecraftVerts[j + 7] = 0;
        spacecraftVerts[j + 8] = Math.cos(Math.PI * v / wide);
        spacecraftVerts[j + 9] = Math.sin(Math.PI * v / wide);
    }
    for (v = 0; v < (2 * wide - 1); v++, j += floatsPerVertex) {
        if (v % 2 == 0) {
            spacecraftVerts[j] = Math.cos(Math.PI * (v) / wide);
            spacecraftVerts[j + 1] = Math.sin(Math.PI * (v) / wide);
            spacecraftVerts[j + 2] = -1.0;
            spacecraftVerts[j + 3] = 1.0;
            spacecraftVerts[j + 4] = brown[0];
            spacecraftVerts[j + 5] = brown[1];
            spacecraftVerts[j + 6] = brown[2];
        }
        else {
            spacecraftVerts[j] = 0.0;
            spacecraftVerts[j + 1] = 0.0;
            spacecraftVerts[j + 2] = -1.0;
            spacecraftVerts[j + 3] = 1.0;
            spacecraftVerts[j + 4] = brown[0];
            spacecraftVerts[j + 5] = brown[1];
            spacecraftVerts[j + 6] = brown[2];
        }
        spacecraftVerts[j + 7] = 0;
        spacecraftVerts[j + 8] = -1;
        spacecraftVerts[j + 9] = 0;
    }
}

function makespacecraftsolarpanel() {
    solarpanelVerts = ([
     1.0, -1.0, -1.0, 1.0, 0, 0, 1, 0, 0, 1,
     1.0, 1.0, -1.0, 1.0, 0, 0, 1, 0, 0, 1,
     1.0, 1.0, 1.0, 1.0, 0, 0, 1, 0, 0, 1,

     1.0, 1.0, 1.0, 1.0, 1, 1, 0, 0, 0, 1,
     1.0, -1.0, 1.0, 1.0, 1, 1, 0, 0, 0, 1,
     1.0, -1.0, -1.0, 1.0, 1, 1, 0, 0, 0, 1,
     ]);
}
var xcount = 100; 		// # of lines to draw in x,y to make the grid.
var ycount = 100;
var xymax = 50.0; 		// grid size; extends to cover +/-xymax in x and y.
var xColr = new Float32Array([1.0, 1.0, 0.3]); // bright yellow
var yColr = new Float32Array([0.5, 1.0, 0.5]); // bright green.
 	
function makeGroundGrid() {
//==============================================================================
// Create a list of vertices that create a large grid of lines in the x,y plane
						// draw a grid made of xcount+ycount lines; 2 vertices per line.
						
	var xgap = xymax/(xcount-1);		// HALF-spacing between lines in x,y;
	var ygap = xymax/(ycount-1);		// (why half? because v==(0line number/2))
	
	// First, step thru x values as we make vertical lines of constant-x:
	for(v=0, j=0; v<2*xcount; v++, j+= floatsPerVertex) {
		if(v%2==0) {	// put even-numbered vertices at (xnow, -xymax, 0)
			gndVerts[j  ] = -xymax + (v  )*xgap;	// x
			gndVerts[j+1] = -xymax;								// y
			gndVerts[j + 2] = 0.0;
			gndVerts[j + 3] = 1; 									// z
		}
		else {				// put odd-numbered vertices at (xnow, +xymax, 0).
			gndVerts[j  ] = -xymax + (v-1)*xgap;	// x
			gndVerts[j+1] = xymax;								// y
			gndVerts[j + 2] = 0.0;
			gndVerts[j + 3] = 1; 									// z
		}
		gndVerts[j+4] = xColr[0];			// red
		gndVerts[j+5] = xColr[1];			// grn
		gndVerts[j+6] = xColr[2];			// blu
    gndVerts[j+7] = 0;
    gndVerts[j+8] = 0;
    gndVerts[j+9] = 1;
	}
	// Second, step thru y values as wqe make horizontal lines of constant-y:
	// (don't re-initialize j--we're adding more vertices to the array)
	for(v=0; v<2*ycount; v++, j+= floatsPerVertex) {
		if(v%2==0) {		// put even-numbered vertices at (-xymax, ynow, 0)
			gndVerts[j  ] = -xymax;								// x
			gndVerts[j+1] = -xymax + (v  )*ygap;	// y
			gndVerts[j + 2] = 0.0;
			gndVerts[j + 3] = 1; 								// z
		}
		else {					// put odd-numbered vertices at (+xymax, ynow, 0).
			gndVerts[j  ] = xymax;								// x
			gndVerts[j+1] = -xymax + (v-1)*ygap;	// y
			gndVerts[j + 2] = 0.0;
			gndVerts[j + 3] = 1; 								// z
		}
		gndVerts[j+4] = yColr[0];			// red
		gndVerts[j+5] = yColr[1];			// grn
		gndVerts[j+6] = yColr[2];			// blu
    gndVerts[j+7] = 0;
    gndVerts[j+8] = 0;
    gndVerts[j+9] = 1;
	}
}
function makecone() {
    var wide = 100;
    coneVerts = new Float32Array((6 * wide - 2) * floatsPerVertex);
    for (v = 1, j = 0; v < 2 * wide; v++, j += floatsPerVertex) {
        if (v % 2 == 0) {
            coneVerts[j] = 0;
            coneVerts[j + 1] = 0;
            coneVerts[j + 2] = 1;
            coneVerts[j + 3] = 1;
            coneVerts[j + 4] = 1;
            coneVerts[j + 5] = 1;
            coneVerts[j + 6] = 0;
        }
        else {
            coneVerts[j] = Math.cos(Math.PI * (v - 1) / wide);
            coneVerts[j + 1] = Math.sin(Math.PI * (v - 1) / wide);
            coneVerts[j + 2] = 1;
            coneVerts[j + 3] = 1;
            coneVerts[j + 4] = 1;
            coneVerts[j + 5] = 1;
            coneVerts[j + 6] = 0;
        }
        coneVerts[j + 7] = 0;
        coneVerts[j + 8] = -1;
        coneVerts[j + 9] = 0;
    }
    for (v = 0; v < 2 * wide; v++, j += floatsPerVertex) {
        if (v % 4 == 0) {
            coneVerts[j] = Math.cos(Math.PI * (v) / wide);
            coneVerts[j + 1] = Math.sin(Math.PI * (v) / wide);
            coneVerts[j + 2] = 1;
            coneVerts[j + 3] = 1;
            coneVerts[j + 4] = 1;
            coneVerts[j + 5] = .5;
            coneVerts[j + 6] = 0;
        }
        else if (v % 4 == 1) {
            coneVerts[j] = 0;
            coneVerts[j + 1] = 0;
            coneVerts[j + 2] = 2;
            coneVerts[j + 3] = 1;
            coneVerts[j + 4] = 1;
            coneVerts[j + 5] = 1;
            coneVerts[j + 6] = 1;
        }
        else if (v % 4 == 3) {
            coneVerts[j] = 0;
            coneVerts[j + 1] = 0;
            coneVerts[j + 2] = 2;
            coneVerts[j + 3] = 1;
            coneVerts[j + 4] = 1;
            coneVerts[j + 5] = 1;
            coneVerts[j + 6] = 1;
        }
        else {
            coneVerts[j] = Math.cos(Math.PI * (v) / wide);
            coneVerts[j + 1] = Math.sin(Math.PI * (v) / wide);
            coneVerts[j + 2] = 1;
            coneVerts[j + 3] = 1;
            coneVerts[j + 4] = 1;
            coneVerts[j + 5] = 1;
            coneVerts[j + 6] = 0;
        }
        coneVerts[j + 7] = Math.cos(Math.PI * (v) / wide);
        coneVerts[j + 8] = Math.sin(Math.PI * (v) / wide);
        coneVerts[j + 9] = 1;

    }
}
function makeTorus() {
    var disks = 21;
    var diskVerts = 12;
    var NPColr = new Float32Array([1, 1, 1]);
    var EQColr = new Float32Array([.4, 1, 1]);
    var SPColr = new Float32Array([1, 1, 1]);
    var diskAngle = Math.PI / disks;

    torVerts = new Float32Array(((disks * 2 * diskVerts) - 2) * floatsPerVertex);

    var cosine0 = 0.0;
    var sine0 = 0.0;
    var cosine1 = 1;
    var sine1 = 1;
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
                torVerts[j] = sine0 * Math.cos(Math.PI * (v) / diskVerts);
                torVerts[j + 1] = sine0 * Math.sin(Math.PI * (v) / diskVerts);
                torVerts[j + 2] = cosine0;
                torVerts[j + 3] = 1.0;
            }
            else {
                torVerts[j] = sine1 * Math.cos(Math.PI * (v - 1) / diskVerts);
                torVerts[j + 1] = sine1 * Math.sin(Math.PI * (v - 1) / diskVerts);
                torVerts[j + 2] = cosine1;
                torVerts[j + 3] = 1.0;
            }
            if (s <= 3) {
                torVerts[j + 4] = Math.random();
                torVerts[j + 5] = Math.random();
                torVerts[j + 6] = Math.random();
            }
            else if (s >= disks - 4) {
                torVerts[j + 4] = Math.random();
                torVerts[j + 5] = Math.random();
                torVerts[j + 6] = Math.random();
            }
            else {
                torVerts[j + 4] = Math.random();
                torVerts[j + 5] = Math.random();
                torVerts[j + 6] = Math.random();
            }
            torVerts[j + 7] = sine0 * Math.cos(Math.PI * (v) / diskVerts);
            torVerts[j + 8] = sine0 * Math.sin(Math.PI * (v) / diskVerts);
            torVerts[j + 9] = cosine0;
        }
    }
}
function makeDrawing()
{
    DrawingVerts = new Float32Array ([
          0, 0, 0, 1, 1, 0, 0, 0, 0, 1,
          1, 0, 0, 1, 1, 0, 0, 0, 0, 1,
          0, 0, 0, 1, 1, 0, 0, 0, 0, 1,

          0, 0, 0, 1, 0, 1, 0, 0, 0, 1,
          0, 1, 0, 1, 0, 1, 0, 0, 0, 1,
          0, 0, 0, 1, 0, 1, 0, 0, 0, 1,

          0, 0, 0, 1, 0, 1, 0, 0, 0, 1,
          0, 0, 1, 1, 0, 0, 1, 0, 0, 1,
          0, 0, 0, 1, 0, 1, 0, 0, 0, 1,

      ]);}
function makeShape() {
    var wide = 4;
    shapeVerts = new Float32Array((6 * wide - 2) * floatsPerVertex);
    for (v = 1, j = 0; v < 2 * wide; v++, j += floatsPerVertex) {
        if (v % 2 == 0) {
            shapeVerts[j] = 0;
            shapeVerts[j + 1] = 0;
            shapeVerts[j + 2] = 1;
            shapeVerts[j + 3] = 1;
            shapeVerts[j + 4] = Math.random();
            shapeVerts[j + 5] = Math.random();
            shapeVerts[j + 6] = Math.random();
        }
        else {
            shapeVerts[j] = Math.cos(Math.PI * (v - 1) / wide);
            shapeVerts[j + 1] = Math.sin(Math.PI * (v - 1) / wide);
            shapeVerts[j + 2] = 1;
            shapeVerts[j + 3] = 1;
            shapeVerts[j + 4] = Math.random();
            shapeVerts[j + 5] = Math.random();
            shapeVerts[j + 6] = Math.random();
        }
        shapeVerts[j + 7] = 0;
        shapeVerts[j + 8] = 0;
        shapeVerts[j + 9] = 1;
    }
    for (v = 0; v < 2 * wide; v++, j += floatsPerVertex) {
        if (v % 4 == 0) {
            shapeVerts[j] = Math.cos(Math.PI * (v) / wide);
            shapeVerts[j + 1] = Math.sin(Math.PI * (v) / wide);
            shapeVerts[j + 2] = 1;
            shapeVerts[j + 3] = 1;
            shapeVerts[j + 4] = Math.random();
            shapeVerts[j + 5] = Math.random();
            shapeVerts[j + 6] = Math.random();
        }
        else if (v % 4 == 1) {
            shapeVerts[j] = 0;
            shapeVerts[j + 1] = 0;
            shapeVerts[j + 2] = 2;
            shapeVerts[j + 3] = 1;
            shapeVerts[j + 4] = Math.random();
            shapeVerts[j + 5] = Math.random();
            shapeVerts[j + 6] = Math.random();
        }
        else if (v % 4 == 3) {
            shapeVerts[j] = 0;
            shapeVerts[j + 1] = 0;
            shapeVerts[j + 2] = 2;
            shapeVerts[j + 3] = 1;
            shapeVerts[j + 4] = Math.random();
            shapeVerts[j + 5] = Math.random();
            shapeVerts[j + 6] = Math.random();
        }
        else {
            shapeVerts[j] = Math.cos(Math.PI * (v) / wide);
            shapeVerts[j + 1] = Math.sin(Math.PI * (v) / wide);
            shapeVerts[j + 2] = 1;
            shapeVerts[j + 3] = 1;
            shapeVerts[j + 4] = Math.random();
            shapeVerts[j + 5] = Math.random();
            shapeVerts[j + 6] = Math.random();
        }
        shapeVerts[j + 7] = Math.cos(Math.PI * (v) / wide);
        shapeVerts[j + 8] = Math.sin(Math.PI * (v) / wide);
        shapeVerts[j + 9] = 2;

    }
    for (v = 0; v < 2 * wide; v++, j += floatsPerVertex) {
        if (v % 4 == 0) {
            shapeVerts[j] = Math.cos(Math.PI * (v) / wide);
            shapeVerts[j + 1] = Math.sin(Math.PI * (v) / wide);
            shapeVerts[j + 2] = 1;
            shapeVerts[j + 3] = 1;
            shapeVerts[j + 4] = Math.random();
            shapeVerts[j + 5] = Math.random();
            shapeVerts[j + 6] = Math.random();
        }
        else if (v % 4 == 1) {
            shapeVerts[j] = 0;
            shapeVerts[j + 1] = 0;
            shapeVerts[j + 2] = 0;
            shapeVerts[j + 3] = 1;
            shapeVerts[j + 4] = Math.random();
            shapeVerts[j + 5] = Math.random();
            shapeVerts[j + 6] = Math.random();
        }
        else if (v % 4 == 3) {
            shapeVerts[j] = 0;
            shapeVerts[j + 1] = 0;
            shapeVerts[j + 2] = 0;
            shapeVerts[j + 3] = 1;
            shapeVerts[j + 4] = Math.random();
            shapeVerts[j + 5] = Math.random();
            shapeVerts[j + 6] = Math.random();
        }
        else {
            shapeVerts[j] = Math.cos(Math.PI * (v) / wide);
            shapeVerts[j + 1] = Math.sin(Math.PI * (v) / wide);
            shapeVerts[j + 2] = 1;
            shapeVerts[j + 3] = 1;
            shapeVerts[j + 4] = Math.random();
            shapeVerts[j + 5] = Math.random();
            shapeVerts[j + 6] = Math.random();
        }
        shapeVerts[j + 7] = Math.cos(Math.PI * (v) / wide);
        shapeVerts[j + 8] = Math.sin(Math.PI * (v) / wide);
        shapeVerts[j + 9] = 0;

    }
}
function draw(gl) {
//==============================================================================
// re-draw contents of all viewports.

  // Clear color and depth buffer for ENTIRE canvas:
  // (careful! clears contents of ALL viewports!)
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  normalMatrix.setInverseOf(modelMatrix);
    normalMatrix.transpose();
    gl.uniformMatrix4fv(u_NormalMatrix, false, normalMatrix.elements);
  
	//----------------------Create, fill UPPER viewport------------------------
	gl.viewport(0,											 				// Viewport lower-left corner
							0, 			// location(in pixels)
  						canvas.width/2, 					// viewport width,
  						canvas.height);	
  // Set the light direction (in the world coordinate)		// viewport height in pixels.
	var vpAspect = (canvas.width/2) /			// On-screen aspect ratio for
								(canvas.height); 	// this camera: width/height.  
  // For this viewport, set camera's eye point and the viewing volume				// View UP vector, all in 'world' coords.
  // Pass the model view projection matrix to graphics hardware thru u_MvpMatrix
  mvpMatrix.setPerspective(40, 				// fovy: y-axis field-of-view in degrees						// (top <-> bottom in view frustum)
  													vpAspect, // aspect ratio: width/height
  													1, 20); // near, far (always >0).
  mvpMatrix.lookAt(xPos, yPos, zPos, 					// 'Center' or 'Eye Point',
  					xAt, yAt, zAt, 					// look-At point,
  					xUp, yUp, zUp);
  mvpMatrix.translate(.4, -.4, .4);
  mvpMatrix.scale(.4, .4, .4);
  mvpMatrix.rotate(-90, 1, 0, 0);
  gl.uniformMatrix4fv(u_MvpMatrix, false, mvpMatrix.elements);
  gl.drawArrays(gl.LINES, gndStart / floatsPerVertex, gndVerts.length / floatsPerVertex);

pushMatrix(mvpMatrix);

  mvpMatrix.translate( 4, -4, 0);
  mvpMatrix.scale(2.7, 2.7, 2.7);
  gl.uniformMatrix4fv(u_MvpMatrix, false, mvpMatrix.elements);
  gl.drawArrays(gl.TRIANGLE_STRIP, coneStart / floatsPerVertex, coneVerts.length / floatsPerVertex);

mvpMatrix = popMatrix();

pushMatrix(mvpMatrix);

  mvpMatrix.translate( -7, -4, -3);
  mvpMatrix.scale(2.7, 2.7, 2.7);
  gl.uniformMatrix4fv(u_MvpMatrix, false, mvpMatrix.elements);
  gl.drawArrays(gl.TRIANGLE_STRIP, TorusStart / floatsPerVertex, torVerts.length / floatsPerVertex);

mvpMatrix = popMatrix();
pushMatrix(mvpMatrix);

  mvpMatrix.translate( -7, 4, -3);
  mvpMatrix.scale(2.7, 2.7, 2.7);
  gl.uniformMatrix4fv(u_MvpMatrix, false, mvpMatrix.elements);
  gl.drawArrays(gl.TRIANGLE_STRIP, shapeStart / floatsPerVertex, shapeVerts.length / floatsPerVertex);

mvpMatrix = popMatrix();
gl.uniformMatrix4fv(u_MvpMatrix, false, mvpMatrix.elements);
gl.drawArrays(gl.LINES, DrawingStart / floatsPerVertex, DrawingVerts.length / floatsPerVertex);

pushMatrix(mvpMatrix);

  mvpMatrix.translate( 4, 7, 4);
  mvpMatrix.scale(1, 1, 1);
  mvpMatrix.rotate(90, 1, 0, 0);
  mvpMatrix.rotate(currentAngle, 0, 1, 0);
  gl.uniformMatrix4fv(u_MvpMatrix, false, mvpMatrix.elements);
  gl.drawArrays(gl.TRIANGLE_STRIP, spacecraftStart / floatsPerVertex, spacecraftVerts.length / floatsPerVertex);

  mvpMatrix.translate(0, 0, 0);
    mvpMatrix.rotate(90, 0, 1, 0);
    mvpMatrix.scale(.1, .1, 2.7);
    mvpMatrix.translate(-.1, 0, 0);
    gl.uniformMatrix4fv(u_MvpMatrix, false, mvpMatrix.elements);
    gl.drawArrays(gl.TRIANGLE_STRIP,
                        spacecraftStart / floatsPerVertex,
                        spacecraftVerts.length / floatsPerVertex);

   pushMatrix(mvpMatrix);

    mvpMatrix.rotate(currentAngle*4, 0,0 , 1);
    mvpMatrix.translate(-4.7, 0, -1);
    mvpMatrix.scale(4, 9, .4);
    gl.uniformMatrix4fv(u_MvpMatrix, false, mvpMatrix.elements);
    gl.drawArrays(gl.TRIANGLE_STRIP,
                        solarpanelStart / floatsPerVertex,
                        solarpanelVerts.length / floatsPerVertex);

    mvpMatrix = popMatrix();

    mvpMatrix.rotate(currentAngle * 4, 0, 0, -1);
    mvpMatrix.translate(4.7, 0, 1);
    mvpMatrix.scale(-4, -9, -.4);
    gl.uniformMatrix4fv(u_MvpMatrix, false, mvpMatrix.elements);
    gl.drawArrays(gl.TRIANGLE_STRIP,
                        solarpanelStart / floatsPerVertex,
                        solarpanelVerts.length / floatsPerVertex);


mvpMatrix = popMatrix();

  mvpMatrix.scale(2.7, 2.7, 2.7);
  mvpMatrix.translate(-1, 0, 2);
  mvpMatrix.rotate(currentAngle, 0, 0, 1);
  gl.uniformMatrix4fv(u_MvpMatrix, false, mvpMatrix.elements);

  gl.drawArrays(gl.TRIANGLE_STRIP,
                    starStart / floatsPerVertex,
  							starVerts.length / floatsPerVertex);

  pushMatrix(mvpMatrix);

mvpMatrix.translate(4, 0, 1);
  mvpMatrix.rotate(currentAngle, 0, 0, 1);
  mvpMatrix.scale(.2, .2, .2);
  gl.uniformMatrix4fv(u_MvpMatrix, false, mvpMatrix.elements);

  gl.drawArrays(gl.TRIANGLE_STRIP,
                    planetStart / floatsPerVertex,
  							planetVerts.length / floatsPerVertex);
  pushMatrix(mvpMatrix);
  mvpMatrix.translate(2, 0, 0);
  mvpMatrix.rotate(currentAngle, 0, 0, 1);
  mvpMatrix.scale(.4, .4, .4);
  gl.uniformMatrix4fv(u_MvpMatrix, false, mvpMatrix.elements);

  gl.drawArrays(gl.TRIANGLE_STRIP,
                    moonStart / floatsPerVertex,
  							moonVerts.length / floatsPerVertex);
  mvpMatrix = popMatrix();

  mvpMatrix.translate(-2, 2, 0);
  mvpMatrix.rotate(currentAngle, 0, 0, 1);
  mvpMatrix.scale(.4, .4, .4);
  gl.uniformMatrix4fv(u_MvpMatrix, false, mvpMatrix.elements);

  gl.drawArrays(gl.TRIANGLE_STRIP,
                    moonStart / floatsPerVertex,
							moonVerts.length / floatsPerVertex);
  pushMatrix(mvpMatrix);
  mvpMatrix.scale (2.5, 2.5, 2.5);
            gl.uniformMatrix4fv(u_MvpMatrix, false, mvpMatrix.elements);
gl.drawArrays(gl.LINES, DrawingStart / floatsPerVertex, DrawingVerts.length / floatsPerVertex);
mvpMatrix = popMatrix();

  mvpMatrix.translate(-2, 2, 0);
  mvpMatrix.rotate(currentAngle, 0, 0, 1);
  mvpMatrix.scale(.4, .4, .4);
  gl.uniformMatrix4fv(u_MvpMatrix, false, mvpMatrix.elements);

  gl.drawArrays(gl.TRIANGLE_STRIP,
                    moonStart / floatsPerVertex,
							moonVerts.length / floatsPerVertex);
mvpMatrix = popMatrix();
  mvpMatrix.translate(-4, 0, 1);
  mvpMatrix.rotate(currentAngle, 0, 0, 1);
  mvpMatrix.scale(.07, .07, .07);
  gl.uniformMatrix4fv(u_MvpMatrix, false, mvpMatrix.elements);

  gl.drawArrays(gl.TRIANGLE_STRIP,
                    planetStart / floatsPerVertex,
  							planetVerts.length / floatsPerVertex);
  mvpMatrix.translate(-2, 2, 0);
  mvpMatrix.rotate(currentAngle, 0, 0, 1);
  mvpMatrix.scale(.4, .4, .4);
  gl.uniformMatrix4fv(u_MvpMatrix, false, mvpMatrix.elements);

  gl.drawArrays(gl.TRIANGLE_STRIP,
                    moonStart / floatsPerVertex,
							moonVerts.length / floatsPerVertex);

	//----------------------Create, fill LOWER viewport------------------------
  gl.viewport(canvas.width / 2, 										 				// Viewport lower-left corner
							0, 															// location(in pixels)
  						canvas.width/2, 					// viewport width,
  						canvas.height);			// viewport height in pixels.

  // Set the light direction (in the world coordinate)
	vpAspect = (canvas.width/2) /					// On-screen aspect ratio for
						(canvas.height);	
                       		// this camera: width/height.
  // For this viewport, set camera's eye point and the viewing volume:		// View UP vector, all in 'world' coords.

  // Pass the model view projection matrix to graphics hardware thru u_MvpMatrix
	mvpMatrix.setOrtho(-19/3, 19/3, -19/3, 19/3, 			// fovy: y-axis field-of-view in degrees // (top <-> bottom in view frustum) // aspect ratio: width/height
  													1, 20); // near, far (always >0).
	mvpMatrix.lookAt(xPos, yPos, zPos, 					// 'Center' or 'Eye Point',
  									xAt, yAt, zAt, 					// look-At point,
  									xUp, yUp, zUp);
	mvpMatrix.translate(.4, -.4, .4);
	mvpMatrix.scale(.4, .4, .4);
	mvpMatrix.rotate(-90, 1, 0, 0);
	gl.uniformMatrix4fv(u_MvpMatrix, false, mvpMatrix.elements);
	gl.drawArrays(gl.LINES, gndStart / floatsPerVertex, gndVerts.length / floatsPerVertex);

pushMatrix(mvpMatrix);

  mvpMatrix.translate( 4, -4, 0);
  mvpMatrix.scale(2.7, 2.7, 2.7);
  gl.uniformMatrix4fv(u_MvpMatrix, false, mvpMatrix.elements);
  gl.drawArrays(gl.TRIANGLE_STRIP, coneStart / floatsPerVertex, coneVerts.length / floatsPerVertex);

mvpMatrix = popMatrix();

pushMatrix(mvpMatrix);

  mvpMatrix.translate( 4, 7, 4);
  mvpMatrix.scale(1, 1, 1);
  mvpMatrix.rotate(90, 1, 0, 0);
  mvpMatrix.rotate(currentAngle, 0, 1, 0);
  gl.uniformMatrix4fv(u_MvpMatrix, false, mvpMatrix.elements);
  gl.drawArrays(gl.TRIANGLE_STRIP, spacecraftStart / floatsPerVertex, spacecraftVerts.length / floatsPerVertex);

  mvpMatrix.translate(0, 0, 0);
    mvpMatrix.rotate(90, 0, 1, 0);
    mvpMatrix.scale(.1, .1, 2.7);
    mvpMatrix.translate(-.1, 0, 0);
    gl.uniformMatrix4fv(u_MvpMatrix, false, mvpMatrix.elements);
    gl.drawArrays(gl.TRIANGLE_STRIP,
                        spacecraftStart / floatsPerVertex,
                        spacecraftVerts.length / floatsPerVertex);

   pushMatrix(mvpMatrix);

    mvpMatrix.rotate(currentAngle*4, 0,0 , 1);
    mvpMatrix.translate(-4.7, 0, -1);
    mvpMatrix.scale(4, 9, .4);
    gl.uniformMatrix4fv(u_MvpMatrix, false, mvpMatrix.elements);
    gl.drawArrays(gl.TRIANGLE_STRIP,
                        solarpanelStart / floatsPerVertex,
                        solarpanelVerts.length / floatsPerVertex);

    mvpMatrix = popMatrix();

    mvpMatrix.rotate(currentAngle * 4, 0, 0, -1);
    mvpMatrix.translate(4.7, 0, 1);
    mvpMatrix.scale(-4, -9, -.4);
    gl.uniformMatrix4fv(u_MvpMatrix, false, mvpMatrix.elements);
    gl.drawArrays(gl.TRIANGLE_STRIP,
                        solarpanelStart / floatsPerVertex,
                        solarpanelVerts.length / floatsPerVertex);


mvpMatrix = popMatrix();

	mvpMatrix.scale(2.7, 2.7, 2.7);
  mvpMatrix.translate(-1, 0, 2);
  mvpMatrix.rotate(currentAngle, 0, 0, 1);
  gl.uniformMatrix4fv(u_MvpMatrix, false, mvpMatrix.elements);

  gl.drawArrays(gl.TRIANGLE_STRIP,
                    starStart / floatsPerVertex,
  							starVerts.length / floatsPerVertex);

  pushMatrix(mvpMatrix);

  mvpMatrix.translate(4, 0, 1);
  mvpMatrix.rotate(currentAngle, 0, 0, 1);
  mvpMatrix.scale(.2, .2, .2);
  gl.uniformMatrix4fv(u_MvpMatrix, false, mvpMatrix.elements);

  gl.drawArrays(gl.TRIANGLE_STRIP,
                    planetStart / floatsPerVertex,
  							planetVerts.length / floatsPerVertex);
  pushMatrix(mvpMatrix);
  mvpMatrix.translate(2, 0, 0);
  mvpMatrix.rotate(currentAngle, 0, 0, 1);
  mvpMatrix.scale(.4, .4, .4);
  gl.uniformMatrix4fv(u_MvpMatrix, false, mvpMatrix.elements);

  gl.drawArrays(gl.TRIANGLE_STRIP,
                    moonStart / floatsPerVertex,
  							moonVerts.length / floatsPerVertex);
  mvpMatrix = popMatrix();

  mvpMatrix.translate(-2, 2, 0);
  mvpMatrix.rotate(currentAngle, 0, 0, 1);
  mvpMatrix.scale(.4, .4, .4);
  gl.uniformMatrix4fv(u_MvpMatrix, false, mvpMatrix.elements);

  gl.drawArrays(gl.TRIANGLE_STRIP,
                    moonStart / floatsPerVertex,
							moonVerts.length / floatsPerVertex);
  
  mvpMatrix.translate(-2, 2, 0);
  mvpMatrix.rotate(currentAngle, 0, 0, 1);
  mvpMatrix.scale(.4, .4, .4);
  gl.uniformMatrix4fv(u_MvpMatrix, false, mvpMatrix.elements);

  gl.drawArrays(gl.TRIANGLE_STRIP,
                    moonStart / floatsPerVertex,
							moonVerts.length / floatsPerVertex);
mvpMatrix = popMatrix();
  mvpMatrix.translate(-4, 0, 1);
  mvpMatrix.rotate(currentAngle, 0, 0, 1);
  mvpMatrix.scale(.07, .07, .07);
  gl.uniformMatrix4fv(u_MvpMatrix, false, mvpMatrix.elements);

  gl.drawArrays(gl.TRIANGLE_STRIP,
                    planetStart / floatsPerVertex,
  							planetVerts.length / floatsPerVertex);
  mvpMatrix.translate(-2, 2, 0);
  mvpMatrix.rotate(currentAngle, 0, 0, 1);
  mvpMatrix.scale(.4, .4, .4);
  gl.uniformMatrix4fv(u_MvpMatrix, false, mvpMatrix.elements);

  gl.drawArrays(gl.TRIANGLE_STRIP,
                    moonStart / floatsPerVertex,
							moonVerts.length / floatsPerVertex);




}
var g_last = Date.now();

function animate(angle) {
    var now = Date.now();
    var elapsed = now - g_last;
    g_last = now;

    var newAngle = angle + (ANGLE_STEP * elapsed) / 1000.0;
    return newAngle %= 360;
}

function animscale(scalar) {
    var now = Date.now();
    var elapsed = now - g_last;
    g_last = now;
    var newScale = scalar + (SCALE_STEP * elapsed) / 500.0;
    return newScale;
};
function myKeyDown(ev) {
    switch (ev.keyCode) {
        case 37:
            zmov = .1;
            zAt += zmov;
            zPos += zmov;
            break;
        case 38:
            xmov = .1;
            xAt -= xmov;
            xPos -= xmov;
            var temp = (yAt - yPos)/8;
            yPos +=temp;
            if (yAt > yPos){
              yAt += .1;
            }
            else if (yAt <= yPos +.1 && yAt >=yPos -.1) {
              yAt = yAt;
            }
            else {
              yAt -= .1;
            }
            break;
        case 39:
            zmov = .1;
            zAt -= zmov;
            zPos -= zmov;
            break;
        case 40:
            xmov = .1;
            xAt += xmov;
            xPos += xmov;
            break;
        case 88:
            xAt = xPos + Math.cos(theta);
            zAt = zPos + Math.sin(theta);
            theta += .1;
            break;
        case 90:
            xAt = xPos + Math.cos(theta);
            zAt = zPos + Math.sin(theta);
            theta -= .1;
            break;
       case 32:
            yAt += .1;
            break;
        case 16:
            yAt -= .1;
            break;
        default:
          break;
    }
}

function myKeyUp(ev) {
} 

function myKeyPress(ev) {
}
function angleForm() {
    var UsrTxt = document.getElementById('newangle').value;
    ANGLE_STEP = UsrTxt;
}
function winResize() {
//==============================================================================
// Called when user re-sizes their browser window , because our HTML file
// contains:  <body onload="main()" onresize="winResize()">

	var nuCanvas = document.getElementById('webgl');	// get current canvas
	var nuGL = getWebGLContext(nuCanvas);							// and context:

	//Report our current browser-window contents:

	console.log('nuCanvas width,height=', nuCanvas.width, nuCanvas.height);		
 console.log('Browser window: innerWidth,innerHeight=', 
																innerWidth, innerHeight);	// http://www.w3schools.com/jsref/obj_window.asp

	
	//Make canvas fill the top 3/4 of our browser window:
	nuCanvas.width = innerWidth;
	nuCanvas.height = innerHeight*3/4;
	//IMPORTANT!  need to re-draw screen contents
	draw(nuGL);	
		 
}
