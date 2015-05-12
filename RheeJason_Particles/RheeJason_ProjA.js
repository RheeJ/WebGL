const PART_XPOS     = 0;  //  position    
const PART_YPOS     = 1;
const PART_ZPOS     = 2;
const PART_XVEL     = 3; //  velocity    
const PART_YVEL     = 4;
const PART_ZVEL     = 5;
const PART_X_FTOT   = 6;  // force accumulator:'ApplyForces()' fcn clears
const PART_Y_FTOT   = 7;  // to zero, then adds each force to each particle.
const PART_Z_FTOT   = 8;        
const PART_R        = 9;  // color : red,green,blue
const PART_G        =10;  
const PART_B        =11;
const PART_MASS     =12;  // mass   
const PART_DIAM     =13;  // on-screen diameter (in pixels)
const PART_RENDMODE =14;  // on-screen appearance (square, round, or soft-round)
const PART_AGE      =15;  // # of frame-times since creation/initialization
const PART_CHARGE   =16;  // for electrostatic repulsion/attraction
const PART_MASS_VEL =17;  // time-rate-of-change of mass.
const PART_MASS_FTOT=18;  // force-accumulator for mass-change
const PART_R_VEL    =19;  // time-rate-of-change of color:red
const PART_G_VEL    =20;  // time-rate-of-change of color:grn
const PART_B_VEL    =21;  // time-rate-of-change of color:blu
const PART_R_FTOT   =22;  // force-accumulator for color-change: red
const PART_G_FTOT   =23;  // force-accumulator for color-change: grn
const PART_B_FTOT   =24;  // force-accumulator for color-change: blu
const PART_MAXVAR   =25;

var VSHADER_SOURCE =
  'precision highp float;\n' +
  'attribute vec3 a_Position; \n' +	
  'attribute vec3 a_Color; \n' +			
  'attribute float a_diam; \n' +			
  'varying   vec4 v_Color; \n' +
  'uniform mat4 u_MvpMatrix;\n' +		
  'void main() {\n' +
  '	 gl_Position = u_MvpMatrix * vec4(a_Position.x -0.9, a_Position.y -0.9, a_Position.z, 1.0);  \n' +	
  '  gl_PointSize = a_diam; \n' +
  '  v_Color = vec4(a_Color, 1.0); \n' +
  '} \n';

var FSHADER_SOURCE =
  'precision mediump float;\n' +
  'uniform  int u_runMode; \n' +	
  'varying vec4 v_Color; \n' +
  'void main() {\n' +  
  '  if(u_runMode == 0) { \n' +
	'	   gl_FragColor = v_Color;	\n' +
	'  } \n' +
	'  else if(u_runMode == 1 || u_runMode == 2) {  \n' +
	'    float dist = distance(gl_PointCoord, vec2(0.5,0.5)); \n' +
	'    if(dist < 0.5) { gl_FragColor = v_Color; } else {discard; } \n' +
	'  }  \n' +
	'  else { \n' +
  '    float dist = distance(gl_PointCoord, vec2(0.5, 0.5)); \n' +
  '    if(dist < 0.5) { \n' +	
	'  	    gl_FragColor = vec4((1.0 - 1.5*dist)*v_Color.rgb, 1.0);\n' +
	'    } else { discard; }\n' +
  '  }  \n;' +
  '} \n';

var timeStep = 1/30;
var g_last = Date.now();
var partCountp0 = 30;
var partCount0 = 60;
var partCount1 = 160;
var partCount2 = 260;
var partCount3 = 285;
var gndVerts = 485;
var myRunMode = 0;
var INIT_VEL = 0.20;
var current = 0;
var sp = new Float32Array((partCountp0 + partCount0 + partCount1 + partCount2 + partCount3 + gndVerts) * PART_MAXVAR);
var s0 = new Float32Array((partCountp0 + partCount0 + partCount1 + partCount2 + partCount3 + gndVerts) * PART_MAXVAR);
var s0dot = new Float32Array((partCountp0 + partCount0 + partCount1 + partCount2 + partCount3 + gndVerts) * PART_MAXVAR);
var s1 = new Float32Array((partCountp0 + partCount0 + partCount1 + partCount2 + partCount3 + gndVerts) * PART_MAXVAR);
var sM = new Float32Array((partCountp0 + partCount0 + partCount1 + partCount2 + partCount3 + gndVerts) * PART_MAXVAR);
var FSIZE = s0.BYTES_PER_ELEMENT;
var xforce = 0;
var yforce = 0;
var zforce = 0;
var xdrag = 1;
var ydrag = 1;
var zdrag = 1;
var s = 1;
var mvpMatrix = new Matrix4();
var u_MvpMatrix;
var canvas;
var xPos = 12;
var zPos = 0;
var yPos = 0;
var xAt = 10;
var yAt = 0;
var zAt = 0;
var xUp = 0;
var yUp = 1;
var zUp = 0;
var theta = 3.1415926535;
var phi = 0;
var p = 0;
var q = 0;
var SpringVector = [];
var length = 0;
var NormalLength = 0;
var ForceScalar = 0;
var ForceVector = [];
var ykey = 0;
var xkey = 0;
var zkey = 0;

function main(){
	canvas = document.getElementById('webgl');
	var gl = getWebGLContext(canvas);
  	if (!gl) {
    	console.log('Failed to get the rendering context for WebGL');
    	return;
    }
    if (!initShaders(gl, VSHADER_SOURCE, FSHADER_SOURCE)) {
    console.log('Failed to intialize shaders.');
    return;
  }
	// initialize the particle system:
	PartSys_init(0);			// 0 == full reset, bouncy-balls; 1==add velocity
												// 2 == set up spring-mass system; ...
	
  // create the Vertex Buffer Object in the graphics hardware, fill it with
  // contents of state variable
  var myVerts = initVertexBuffers(gl);
  if (myVerts < 0) {
    console.log('Failed to create the Vertex Buffer Object');
    return;
  }
  gl.clearColor(0, 0, 0, 1);	  // RGBA color for clearing <canvas>
  
  // Get graphics system storage location of all uniform vars our shaders use:
  // (why? see  http://www.opengl.org/wiki/Uniform_(GLSL) )
  u_runModeID = gl.getUniformLocation(gl.program, 'u_runMode');
  if(!u_runModeID) {
  	console.log('Failed to get u_runMode variable location');
  	return;
  }																				// set the value of the uniforms:
	gl.uniform1i(u_runModeID, myRunMode);

  u_MvpMatrix = gl.getUniformLocation(gl.program, 'u_MvpMatrix');
if (!u_MvpMatrix) { 
    console.log('Failed to get the storage location');
    return;
  }

  window.addEventListener("keydown", myKeyDown, false);
window.addEventListener("keyup", myKeyUp, false);
window.addEventListener("keypress", myKeyPress, false);

var tick = function() {
    timeStep = animate(timeStep);  // get time passed since last screen redraw. 
  	draw(gl, myVerts, timeStep);	// compute new particle state at current time
    requestAnimationFrame(tick, canvas);  // Call again 'at next opportunity',
  }; 																			// within the 'canvas' HTML-5 element.
  tick();

}
function animate(timeStep) {
//============================================================================== 
// How much time passed since we last updated the 'canvas' screen elements?
  var now = Date.now();												
  var elapsed = now - g_last;								
  g_last = now;  
  return elapsed;					// Return the amount of time passed.
}

function draw(gl, n, timeStep) {
//============================================================================== 
  gl.clear(gl.COLOR_BUFFER_BIT);
  gl.drawArrays(gl.LINES, partCount3, gndVerts);

  mvpMatrix.setPerspective(40,        // fovy: y-axis field-of-view in degrees            // (top <-> bottom in view frustum)
                            canvas.width / canvas.height, // aspect ratio: width/height
                            1, 20); // near, far (always >0).
  mvpMatrix.lookAt(xPos, yPos, zPos,          // 'Center' or 'Eye Point',
            xAt, yAt, zAt,          // look-At point,
            xUp, yUp, zUp);
gl.uniformMatrix4fv(u_MvpMatrix, false, mvpMatrix.elements);

  gl.uniform1i(u_runModeID, myRunMode);	//run/step/pause changes particle shape
  if (current == 1) {
    forces(0,s0);
    if (s == 0){
      dotmaker(s0, s0dot);
      e_solver(s0, s0dot, s1);
    }
    else if (s == 1){
      dotmaker(s0, s0dot);
      e_solver(s0, s0dot, s1);
      i_solver(s0dot, s0, s1);
    }
    else if (s == 2){
      dotmaker(s0, s0dot);
      m_solver(s0, s0dot, sM);
      em_solver(s0dot, sM, s1);
    }
    Constraints(s1);
    PartSys_render(gl,s1);
  }
  else{
    forces(0, s1);
    if (s == 0){
      dotmaker(s1, s0dot);
      e_solver(s1, s0dot, s0);
    }
    else if ( s == 1) {
      dotmaker(s1, s0dot);
      e_solver(s1, s0dot, s0);
      i_solver(s0dot, s1, s0);
    }
    else if ( s == 2) {
      dotmaker(s1, s0dot);
      m_solver(s1, s0dot, sM);
      em_solver(s0dot, sM, s0);
    }
    Constraints(s0);
    PartSys_render(gl, s0);
  }

  if (current == 1) {
    forces(1,s1);
    if (s == 0){
      dotmaker(s0, s0dot);
      e_solver(s0, s0dot, s1);
    }
    else if ( s == 1) {
      i_solver(s0dot,s0, s1);
    }
    else if ( s == 2) {
      dotmaker(s0, s0dot);
      m_solver(s0, s0dot, sM);
      em_solver(s0dot, sM, s1);
    }
    Constraints(s1);
    PartSys_render(gl,s1);
  }
  else{
    forces(1, s0);
    if (s == 0){
      dotmaker(s0, s0dot);
      e_solver(s1, s0dot, s0);
    }
    else if (s == 1){
      i_solver(s0dot, s1, s0);
    }
    else if ( s == 2) {
      dotmaker(s1, s0dot);
      m_solver(s1, s0dot, sM);
      em_solver(s0dot, sM, s0);
    }
    Constraints(s0);
    PartSys_render(gl, s0);
  }

  if (current == 1) {
    sp = s0;
    forces(2, s1);
    if (s == 0){
      dotmaker(s0, s0dot);
      e_solver(s0, s0dot, s1);
    }
    else if (s == 1){
      i_solver(s0dot, s0, s1);
    }
    else if ( s == 2) {
      dotmaker(s0, s0dot);
      m_solver(s0, s0dot, sM);
      em_solver(s0dot, sM, s1);
    }
    //Constraints(s1);
    PartSys_render(gl,s1);
  }
  else{
    sp = s1;
    forces(2, s0);
    if (s == 0){
      dotmaker(s0, s0dot);
      e_solver(s1, s0dot, s0);
    }
    else if (s == 1){
      i_solver(s0dot, s1, s0);
    }
    else if ( s == 2) {
      dotmaker(s1, s0dot);
      m_solver(s1, s0dot, sM);
      em_solver(s0dot, sM, s0);
    }
    //Constraints(s0);
    PartSys_render(gl, s0);
  }
  if (current == 1) {
    sp = s0;
    forces(3, s1);
    if (s == 0){
      dotmaker(s0, s0dot);
      e_solver(s0, s0dot, s1);
    }
    else if (s == 1){
      i_solver(s0dot, s0, s1);
    }
    else if ( s == 2) {
      dotmaker(s0, s0dot);
      m_solver(s0, s0dot, sM);
      em_solver(s0dot, sM, s1);
    }
    Constraints(s1);
    PartSys_render(gl,s1);
  }
  else{
    sp = s1;
    forces(3, s0);
    if (s == 0){
      dotmaker(s0, s0dot);
      e_solver(s1, s0dot, s0);
    }
    else if (s == 1){
      i_solver(s0dot, s1, s0);
    }
    else if ( s == 2) {
      dotmaker(s1, s0dot);
      m_solver(s1, s0dot, sM);
      em_solver(s0dot, sM, s0);
    }
    Constraints(s0);
    PartSys_render(gl, s0);
    }
    if (current == 1) {
    sp = s0;
    forces(5, s1);
    if (s == 0){
      dotmaker(s0, s0dot);
      e_solver(s0, s0dot, s1);
    }
    else if (s == 1){
      i_solver(s0dot, s0, s1);
    }
    else if ( s == 2) {
      dotmaker(s0, s0dot);
      m_solver(s0, s0dot, sM);
      em_solver(s0dot, sM, s1);
    }
    Constraints(s1);
    PartSys_render(gl,s1);
  }
  else{
    sp = s1;
    forces(5, s0);
    if (s == 0){
      dotmaker(s0, s0dot);
      e_solver(s1, s0dot, s0);
    }
    else if (s == 1) {
      i_solver(s0dot, s1, s0);
    }
    else if ( s == 2) {
      dotmaker(s1, s0dot);
      m_solver(s1, s0dot, sM);
      em_solver(s0dot, sM, s0);
    }
    Constraints(s0);
    PartSys_render(gl, s0);
    }
}

function PartSys_render(gl, s) {
//==============================================================================
// MODIFY our VBO's contents using the current state of our particle system:
 //  Recall that gl.bufferData() allocates and fills a new hunk of graphics 
 //	memory.  We always use gl.bufferData() in the creation of a new buffer, but
 // to MODIFY the contents of that buffer we use gl.bufferSubData() instead. 
 //
 // Just like gl.bufferData(), g.bufferSubData() copies a contiguous block of 
 // memory from client/JavaScript to graphics hardware.  Unlike C/C++ version:
 //    http://www.khronos.org/opengles/sdk/docs/man/xhtml/glBufferSubData.xml 
 // the WebGL version does not have a'size' parameter (size in bytes, of the 
 // data-store region being replaced):
 // ( void bufferSubData(GLenum target, GLintptr offset, ArrayBufferView data);
 //	(	as shown here: http://www.khronos.org/registry/webgl/specs/latest/1.0/
 // Instead, it copies the ENTIRE CONTENTS of the 'data' array to the buffer:
 //----------------------------------------Update entire buffer:
 if (current == 1){
  	gl.bufferSubData(gl.ARRAY_BUFFER, 0, s1);
    current = 0;
  	}		
  else{
  	gl.bufferSubData(gl.ARRAY_BUFFER, 0, s0);
    current = 1;
  }	// Data source (Javascript array)
  gl.drawArrays(gl.POINTS, 0, 30);	
  // drawing primitive, starting index, number of indices to render
}
function Constraints(s){
  for(i = partCountp0; i < partCount2; i++){
    var pOff = i*PART_MAXVAR;
    if(s[PART_XPOS+ pOff] < -5 && s[PART_XVEL+ pOff] < 0.0) {  
         s[PART_XVEL+ pOff] = -s[PART_XVEL+ pOff];
         // bounce on left wall.
      }
      else if (s[PART_XPOS+ pOff] > 5 && s[PART_XVEL+ pOff] > 0.0) {    
               s[PART_XVEL+ pOff] = -s[PART_XVEL+ pOff];
               // bounce on right wall
      }
      if(s[PART_YPOS+ pOff] < 0.0 && s[PART_YVEL+ pOff] < 0.0) {    
         s[PART_YVEL+ pOff] = -s[PART_YVEL+ pOff];
         // bounce on floor
      }
      else if( s[PART_YPOS+ pOff] > 7 && s[PART_YVEL+ pOff] > 0.0) {    
        s[PART_YVEL+ pOff] = -s[PART_YVEL+ pOff];
        // bounce on ceiling
      }
      if(s[PART_ZPOS + pOff] < -5 && s[PART_ZVEL + pOff] < 0) {
         s[PART_ZVEL + pOff] = -s[PART_ZVEL + pOff];
      }
      else if(s[PART_ZPOS + pOff] > 5 && s[PART_ZVEL + pOff] > 0) {
         s[PART_ZVEL + pOff] = -s[PART_ZVEL + pOff];
      }
      //  -- hard limit on 'floor' keeps y position >= 0;
      if(s[PART_YPOS+ pOff] <  -0.0) s[PART_YPOS+ pOff] = 0.0;
      //  -- add hard limits to the other walls too...
      if(s[PART_XPOS+ pOff] <  -5) s[PART_XPOS+ pOff] = -5;      
      if(s[PART_XPOS+ pOff] >=  5) s[PART_XPOS+ pOff] = 5;
      if(s[PART_YPOS+ pOff] >=  7) s[PART_YPOS+ pOff] = 7;
      if(s[PART_ZPOS + pOff] > 5) s[PART_ZPOS + pOff] = 5;
      if(s[PART_ZPOS + pOff] < -5) s[PART_ZPOS + pOff] = -5;
    }
    for(i = 0; i < partCountp0; i++){
    var pOff = i*PART_MAXVAR;
    if(s[PART_XPOS+ pOff] < -5 && s[PART_XVEL+ pOff] < 0.0) {  
         s[PART_XVEL+ pOff] = -s[PART_XVEL+ pOff];
         // bounce on left wall.
      }
      else if (s[PART_XPOS+ pOff] > 5 && s[PART_XVEL+ pOff] > 0.0) {    
               s[PART_XVEL+ pOff] = -s[PART_XVEL+ pOff];
               // bounce on right wall
      }
      if(s[PART_YPOS+ pOff] < -5 && s[PART_YVEL+ pOff] < 0.0) {    
         s[PART_YVEL+ pOff] = -s[PART_YVEL+ pOff];
         // bounce on floor
      }
      else if( s[PART_YPOS+ pOff] > 0 && s[PART_YVEL+ pOff] > 0.0) {    
        s[PART_YVEL+ pOff] = -s[PART_YVEL+ pOff];
        // bounce on ceiling
      }
      if(s[PART_ZPOS + pOff] < -5 && s[PART_ZVEL + pOff] < 0) {
         s[PART_ZVEL + pOff] = -s[PART_ZVEL + pOff];
      }
      else if(s[PART_ZPOS + pOff] > 5 && s[PART_ZVEL + pOff] > 0) {
         s[PART_ZVEL + pOff] = -s[PART_ZVEL + pOff];
      }
      //  -- hard limit on 'floor' keeps y position >= 0;
      if(s[PART_YPOS+ pOff] <  -5) s[PART_YPOS+ pOff] = -5;
      //  -- add hard limits to the other walls too...
      if(s[PART_XPOS+ pOff] <  -5) s[PART_XPOS+ pOff] = -5;      
      if(s[PART_XPOS+ pOff] >=  5) s[PART_XPOS+ pOff] = 5;
      if(s[PART_YPOS+ pOff] >=  0) s[PART_YPOS+ pOff] = 0;
      if(s[PART_ZPOS + pOff] > 5) s[PART_ZPOS + pOff] = 5;
      if(s[PART_ZPOS + pOff] < -5) s[PART_ZPOS + pOff] = -5;
    }
  }

function PartSys_init(sel) {
 for (i = 0; i < partCountp0; i++){
    var pOff = i * PART_MAXVAR;
    s0[pOff + PART_XPOS] = Math.random();
    s0[pOff + PART_YPOS] = -2;
    s0[pOff + PART_ZPOS] = Math.random();
    s0[pOff + PART_XVEL] = 0.0;
    s0[pOff + PART_YVEL] = 0.0;
    s0[pOff + PART_ZVEL] = 0.0;
    s0[pOff + PART_X_FTOT] = 0;
    s0[pOff + PART_Y_FTOT] = 0;
    s0[pOff + PART_Z_FTOT] = 0;
    s0[pOff + PART_R] = 0;
    s0[pOff + PART_G] = 0;
    s0[pOff + PART_B] = 1;
    s0[pOff + PART_MASS] = 1;
    s0[pOff + PART_DIAM] = 10;
    s0[PART_CHARGE + pOff] = 1 * Math.random();
    s0[pOff + PART_RENDMODE] = 1;
    s1 = s0;
  }
  for (i = partCountp0; i < partCount0; i++){
    var pOff = i * PART_MAXVAR;
    s0[pOff + PART_XPOS] = 0 + 5* Math.random();
    s0[pOff + PART_YPOS] = 0 + 5 *Math.random();
    s0[pOff + PART_ZPOS] = 0 + 5 *Math.random();
    s0[pOff + PART_XVEL] = 0.0;
    s0[pOff + PART_YVEL] = 0.0;
    s0[pOff + PART_ZVEL] = 0.0;
    s0[pOff + PART_X_FTOT] = 0;
    s0[pOff + PART_Y_FTOT] = 0;
    s0[pOff + PART_Z_FTOT] = 0;
    s0[pOff + PART_R] = 1;
    s0[pOff + PART_G] = 0;
    s0[pOff + PART_B] = 0;
    s0[pOff + PART_MASS] = 10* Math.random();
    s0[pOff + PART_DIAM] = 10;
    s0[PART_CHARGE + pOff] = 1 * Math.random();
    s0[pOff + PART_RENDMODE] = 1;
    s1 = s0;
  }
	for (i = partCount0; i < partCount1; i++){
		var pOff = i*PART_MAXVAR;
		s0[pOff + PART_XPOS] = 1;
		s0[pOff + PART_YPOS] = 0;
		s0[pOff + PART_ZPOS] = 0;
		s0[pOff + PART_XVEL] = 0.0;
		s0[pOff + PART_YVEL] = 0.0;
		s0[pOff + PART_ZVEL] = 0.0;
		s0[pOff + PART_X_FTOT] = 0;
		s0[pOff + PART_Y_FTOT] = 0;
		s0[pOff + PART_Z_FTOT] = 0;
		s0[pOff + PART_R] = .1;
		s0[pOff + PART_G] = .5;
		s0[pOff + PART_B] = .1;
		s0[pOff + PART_MASS] = 100 * Math.random();
		s0[pOff + PART_DIAM] = 10;
    s0[PART_CHARGE + pOff] = 1 * Math.random();
		s0[pOff + PART_RENDMODE] = Math.floor(4.0*Math.random());
    s1 = s0;
	}
  for (i = partCount1; i < partCount2; i++){
    var pOff = i*PART_MAXVAR;
    s0[pOff + PART_XPOS] = 2 + .5*Math.random();
    s0[pOff + PART_YPOS] = 1;
    s0[pOff + PART_ZPOS] = 3 + .5*Math.random();
    s0[pOff + PART_XVEL] = 0.0;
    s0[pOff + PART_YVEL] = 0.0;
    s0[pOff + PART_ZVEL] = 0.0;
    s0[pOff + PART_X_FTOT] = 0;
    s0[pOff + PART_Y_FTOT] = 0;
    s0[pOff + PART_Z_FTOT] = 0;
    s0[pOff + PART_R] = 1;
    s0[pOff + PART_G] = 0;
    s0[pOff + PART_B] = 0;
    s0[pOff + PART_MASS] = 0.9 + .8*Math.random();
    s0[pOff + PART_DIAM] = 10;
    s0[pOff + PART_RENDMODE] = 3;
    s0[pOff + PART_AGE] = 10000*Math.random();
    s1 = s0;
  }
  for (i = partCount2; i < partCount3; i++){
    var pOff = i*PART_MAXVAR;
    if ( p < 5){
      s0[pOff + PART_ZPOS] = p;
      s0[pOff + PART_YPOS] = q;
    }
    else {
      p = 0;
      s0[pOff + PART_ZPOS] = p;
      s0[pOff + PART_YPOS] = q + 1;
      q ++;
    }
    s0[pOff + PART_XPOS] = 0;
    s0[pOff + PART_XVEL] = 0.0;
    s0[pOff + PART_YVEL] = 0.0;
    s0[pOff + PART_ZVEL] = 0.0;
    s0[pOff + PART_X_FTOT] = 0;
    s0[pOff + PART_Y_FTOT] = 0;
    s0[pOff + PART_Z_FTOT] = 0;
    s0[pOff + PART_R] = 1;
    s0[pOff + PART_G] = 1;
    s0[pOff + PART_B] = 1;
    s0[pOff + PART_MASS] = 0.9 + .8*Math.random();
    s0[pOff + PART_DIAM] = 10;
    s0[pOff + PART_RENDMODE] = 3;
    s0[pOff + PART_AGE] = 0;
    s1 = s0;
    console.log(s0[pOff + PART_XPOS]);
    p ++;
  }

  for (i = partCount3; i < (gndVerts + partCount3) / 2; i++){
    var pOff = i*PART_MAXVAR;
    var v = i - partCount3;
      if (v % 2 == 0){
        s0[pOff + PART_XPOS] = -50 + ((v) * (50/99));
        s0[pOff + PART_YPOS] = 0;
        s0[pOff + PART_ZPOS] = -50;
      }
      else {
        s0[pOff + PART_XPOS] = -50 + ((v - 1) * (50/99));
        s0[pOff + PART_YPOS] = 0;
        s0[pOff + PART_ZPOS] = 50;
      }
      s0[pOff + PART_R] = 1;
      s0[pOff + PART_G] = 1;
      s0[pOff + PART_B] = 1;
      s0[pOff + PART_DIAM] = 1;
      s0[pOff + PART_RENDMODE] = 1;
  }
  var j = partCount3;
    for (i = (gndVerts + partCount3) / 2; i < 2 * gndVerts; i++) {
      var pOff = i*PART_MAXVAR;
      var v = j - partCount3;
      if (v % 2 == 0){
        s0[pOff + PART_XPOS] = -50;
        s0[pOff + PART_YPOS] = 0;
        s0[pOff + PART_ZPOS] = -50 + ((v) * (50/99));
      }
      else {
        s0[pOff + PART_XPOS] = 50;
        s0[pOff + PART_YPOS] = 0;
        s0[pOff + PART_ZPOS] = -50 + ((v - 1) * (50/99));
      }
      s0[pOff + PART_R] = 1;
      s0[pOff + PART_G] = 1;
      s0[pOff + PART_B] = 1;
      s0[pOff + PART_DIAM] = 1;
      s0[pOff + PART_RENDMODE] = 1;
      j++;
  }

}
function forces(n, s){
  if (n == 0){
    for (i = partCount0; i < partCount1; i++){
      var pOff = i*PART_MAXVAR;
      s[pOff + PART_X_FTOT] =  -Math.cos(s[PART_CHARGE + pOff]);
      s[pOff + PART_Y_FTOT] = 0.0000001;
      s[pOff + PART_Z_FTOT] =  -Math.sin(s[PART_CHARGE + pOff]);
      ydrag = .985;
      xdrag = .99999;
      zdrag = .99999;
    }
    phi += .1;
  }
  if (n == 1){
    for(i = partCount1; i < partCount2; i++){
      var pOff = i*PART_MAXVAR;
      s[pOff + PART_X_FTOT] = 0;
      s[pOff + PART_Y_FTOT] = 0.001;
      s[pOff + PART_Z_FTOT] = 0;
      s[pOff + PART_G_FTOT] = 0.00007;
    }
  }
  if (n == 2){
    for(i = partCount2; i < partCount3; i++){
      var pOff = i*PART_MAXVAR;
      var x = sp[pOff + PART_MAXVAR + PART_XPOS] - sp[pOff + PART_XPOS];
      var y = sp[pOff + PART_MAXVAR + PART_YPOS] - sp[pOff + PART_YPOS];
      var z = sp[pOff + PART_MAXVAR + PART_ZPOS] - sp[pOff + PART_ZPOS];
      SpringVector[0] = x;
      SpringVector[1] = y;
      SpringVector[2] = z;
      length = Math.sqrt(Math.pow(SpringVector[0] , 2) + Math.pow(SpringVector[1], 2) + Math.pow(SpringVector[2], 2));
      if (length > 8){
        length = 1;
      }
      ForceScalar = (length - 1) / 1;
      SpringVector[0] = SpringVector[0] * (1/length);
      SpringVector[1] = SpringVector[1] * (1/length);
      SpringVector[2] = SpringVector[2] * (1/length);
      ForceVector[0] = SpringVector[0] * ForceScalar;
      ForceVector[1] = SpringVector[1] * ForceScalar;
      ForceVector[2] = SpringVector[2] * ForceScalar;
      ForceVector[0] = ForceVector[0] * .00001;
      ForceVector[1] = ForceVector[1] * .00001;
      ForceVector[2] = ForceVector[1] * .00001;
      s[pOff + PART_X_FTOT] = ForceVector[0]- .000001;
      s[pOff + PART_Y_FTOT] = ForceVector[1] - .000001;
      s[pOff + PART_Z_FTOT] = ForceVector[2];
      //console.log(ForceVector);
      //console.log(SpringVector);
    }
    for(i = partCount2; i < partCount3; i++){
      var pOff = i*PART_MAXVAR;
      var x = sp[pOff + (5 * PART_MAXVAR) + PART_XPOS] - sp[pOff + PART_XPOS];
      var y = sp[pOff + (5 * PART_MAXVAR) + PART_YPOS] - sp[pOff + PART_YPOS];
      var z = sp[pOff + (5 * PART_MAXVAR) + PART_ZPOS] - sp[pOff + PART_ZPOS];
      SpringVector[0] = x;
      SpringVector[1] = y;
      SpringVector[2] = z;
      length = Math.sqrt(Math.pow(SpringVector[0] , 2) + Math.pow(SpringVector[1], 2) + Math.pow(SpringVector[2], 2));
      if (length > 8){
        length = 1;
      }
      ForceScalar = (length - 1) / 1;
      SpringVector[0] = SpringVector[0] * (1/length);
      SpringVector[1] = SpringVector[1] * (1/length);
      SpringVector[2] = SpringVector[2] * (1/length);
      ForceVector[0] = SpringVector[0] * ForceScalar;
      ForceVector[1] = SpringVector[1] * ForceScalar;
      ForceVector[2] = SpringVector[2] * ForceScalar;
      ForceVector[0] = ForceVector[0] * .00001;
      ForceVector[1] = ForceVector[1] * .00001;
      ForceVector[2] = ForceVector[1] * .00001;
      s[pOff + PART_X_FTOT] += ForceVector[0];
      s[pOff + PART_Y_FTOT] += ForceVector[1];
      s[pOff + PART_Z_FTOT] += ForceVector[2];
      //console.log(ForceVector);
      //console.log(SpringVector);
    }
    for(i = partCount2; i < partCount3; i++){
      var pOff = i*PART_MAXVAR;
      if ((pOff - (5* PART_MAXVAR)) > (partCount2 * PART_MAXVAR)){
      var x = sp[pOff - (5 * PART_MAXVAR) + PART_XPOS] - sp[pOff + PART_XPOS];
      var y = sp[pOff - (5 * PART_MAXVAR) + PART_YPOS] - sp[pOff + PART_YPOS];
      var z = sp[pOff - (5 * PART_MAXVAR) + PART_ZPOS] - sp[pOff + PART_ZPOS];
    }
    else{
      var x = 0;
      var y = -1;
      var z = 0;
    }
      SpringVector[0] = x;
      SpringVector[1] = y;
      SpringVector[2] = z;
      length = Math.sqrt(Math.pow(SpringVector[0] , 2) + Math.pow(SpringVector[1], 2) + Math.pow(SpringVector[2], 2));
      if (length > 8){
        length = 1;
      }
      ForceScalar = (length - 1) / 1;
      SpringVector[0] = SpringVector[0] * (1/length);
      SpringVector[1] = SpringVector[1] * (1/length);
      SpringVector[2] = SpringVector[2] * (1/length);
      ForceVector[0] = SpringVector[0] * ForceScalar;
      ForceVector[1] = SpringVector[1] * ForceScalar;
      ForceVector[2] = SpringVector[2] * ForceScalar;
      ForceVector[0] = ForceVector[0] * .00001;
      ForceVector[1] = ForceVector[1] * .00001;
      ForceVector[2] = ForceVector[1] * .00001;
      s[pOff + PART_X_FTOT] += ForceVector[0];
      s[pOff + PART_Y_FTOT] += ForceVector[1];
      s[pOff + PART_Z_FTOT] += ForceVector[2];
      //console.log(ForceVector);
      //console.log(SpringVector);
    }
    for(i = partCount2; i < partCount3; i++){
      var pOff = i*PART_MAXVAR;
      var x = sp[pOff + PART_XPOS - PART_MAXVAR] - sp[pOff + PART_XPOS];
      var y = sp[pOff + PART_YPOS - PART_MAXVAR] - sp[pOff + PART_YPOS];
      var z = sp[pOff + PART_ZPOS - PART_MAXVAR] - sp[pOff + PART_ZPOS];
      SpringVector[0] = x;
      SpringVector[1] = y;
      SpringVector[2] = z;
      length = Math.sqrt(Math.pow(SpringVector[0] , 2) + Math.pow(SpringVector[1], 2) + Math.pow(SpringVector[2], 2));
      if (length > 8){
        length = 1;
      }
      ForceScalar = (length - 1) / 1;
      SpringVector[0] = SpringVector[0] * (1/length);
      SpringVector[1] = SpringVector[1] * (1/length);
      SpringVector[2] = SpringVector[2] * (1/length);
      ForceVector[0] = SpringVector[0] * ForceScalar;
      ForceVector[1] = SpringVector[1] * ForceScalar;
      ForceVector[2] = SpringVector[2] * ForceScalar;
      ForceVector[0] = ForceVector[0] * .00001;
      ForceVector[1] = ForceVector[1] * .00001;
      ForceVector[2] = ForceVector[1] * .00001;
      s[pOff + PART_X_FTOT] += ForceVector[0];
      s[pOff + PART_Y_FTOT] += ForceVector[1];
      s[pOff + PART_Z_FTOT] += ForceVector[2];
      //console.log(ForceVector);
      //console.log(SpringVector);
    }
  }
  if (n == 3){
    for (i = partCountp0; i < partCount0; i++){
      var pOff = i * PART_MAXVAR;
      s[PART_XPOS + (partCountp0 * pOff)] = xkey;
      s[PART_YPOS + (partCountp0 * pOff)] = ykey;
      s[PART_ZPOS  + (partCountp0 * pOff)] = zkey;
      s[pOff + PART_X_FTOT] = (s[PART_XPOS + (partCountp0 * pOff)] - s[pOff + PART_XPOS]) / 100000;
      s[pOff + PART_Y_FTOT] = (s[PART_YPOS  + (partCountp0 * pOff)] - s[pOff + PART_YPOS]) / 100000;
      s[pOff + PART_Z_FTOT] = (s[PART_ZPOS + (partCountp0 * pOff)] - s[pOff + PART_ZPOS]) / 100000;
      }
    }
  if (n == 5) {
    for (i = 0; i < partCountp0; i++){
      var pOff = i * PART_MAXVAR;
    s[PART_Z_FTOT + pOff] =0
    s[PART_Y_FTOT + pOff] = -.000001;
    s[PART_X_FTOT + pOff] = 0
  }
  }
}
function dotmaker(s, sdot){
  for(var i = 0; i < partCountp0; i++){
      var pOff = i * PART_MAXVAR;
      sdot[PART_XPOS + pOff] = s[PART_XVEL + pOff];
      sdot[PART_YPOS + pOff] = s[PART_YVEL + pOff];
      sdot[PART_ZPOS + pOff] = s[PART_ZVEL + pOff];
     sdot[PART_YVEL + pOff] = s[PART_Y_FTOT + pOff] / s[PART_MASS + pOff];
     sdot[PART_ZVEL + pOff] = s[PART_Z_FTOT + pOff]/ s[PART_MASS + pOff];
     sdot[PART_XVEL + pOff] = s[PART_X_FTOT + pOff]/ s[PART_MASS + pOff];
  }
  for(var i = partCountp0; i < partCount0; i++){
      var pOff = i * PART_MAXVAR;
      sdot[PART_XPOS + pOff] = s[PART_XVEL + pOff];
      sdot[PART_YPOS + pOff] = s[PART_YVEL + pOff];
      sdot[PART_ZPOS + pOff] = s[PART_ZVEL + pOff];
     sdot[PART_YVEL + pOff] = s[PART_Y_FTOT + pOff] / s[PART_MASS + pOff];
     sdot[PART_ZVEL + pOff] = s[PART_Z_FTOT + pOff]/ s[PART_MASS + pOff];
     sdot[PART_XVEL + pOff] = s[PART_X_FTOT + pOff]/ s[PART_MASS + pOff];
  }

  for(var i = partCount0; i < partCount1; i++){
      var pOff = i * PART_MAXVAR;
      sdot[PART_XPOS + pOff] = s[PART_XVEL + pOff];
      sdot[PART_YPOS + pOff] = (s[PART_YVEL + pOff]);
      sdot[PART_ZPOS + pOff] = s[PART_ZVEL + pOff];
      sdot[PART_XVEL + pOff] = s[PART_X_FTOT + pOff];
      sdot[PART_YVEL + pOff] = s[PART_Y_FTOT + pOff]/s[PART_MASS + pOff];
      sdot[PART_ZVEL + pOff] = s[PART_Z_FTOT + pOff];
      sdot[PART_CHARGE + pOff] = 1;
  }
  for(var i = partCount1; i < partCount2; i++){
      var pOff = i * PART_MAXVAR;
      sdot[PART_XPOS + pOff] = s[PART_XVEL + pOff];
      sdot[PART_YPOS + pOff] = (s[PART_YVEL + pOff])/20;
      sdot[PART_ZPOS + pOff] = s[PART_ZVEL + pOff];
      sdot[PART_XVEL + pOff] = s[PART_X_FTOT + pOff];
      sdot[PART_YVEL + pOff] = s[PART_Y_FTOT + pOff] / (s[PART_AGE + pOff]);
      sdot[PART_ZVEL + pOff] = s[PART_Z_FTOT + pOff];
      sdot[PART_AGE + pOff] = 1;
      sdot[PART_DIAM + pOff] = s[PART_YPOS + pOff] /70;
      sdot[PART_G + pOff] = s[PART_YPOS + pOff] / 7000;
  }
  for(var i = partCount2; i < partCount3; i++){
      var pOff = i * PART_MAXVAR;
      sdot[PART_XPOS + pOff] = s[PART_XVEL + pOff];
      sdot[PART_YPOS + pOff] = s[PART_YVEL + pOff];
      sdot[PART_ZPOS + pOff] = s[PART_ZVEL + pOff];
      if (i % 5 != 4 && i % 5 != 0){
        sdot[PART_YVEL + pOff] = s[PART_Y_FTOT + pOff];
        sdot[PART_ZVEL + pOff] = s[PART_Z_FTOT + pOff];
        sdot[PART_XVEL + pOff] = s[PART_X_FTOT + pOff];
      }
      else{
        sdot[PART_YVEL + pOff] = 0;
        sdot[PART_ZVEL + pOff] = 0;
        sdot[PART_XVEL + pOff] = 0;
      }
  }
}
function e_solver(sf, sdot, st){
  for (var i = 0; i < partCountp0; i++){
    var pOff = i * PART_MAXVAR;
    st[PART_XPOS + pOff] = sf[PART_XPOS + pOff] + (timeStep * sdot[PART_XPOS + pOff]);
      st[PART_YPOS + pOff] = sf[PART_YPOS + pOff] + (timeStep * sdot[PART_YPOS + pOff]);      
      st[PART_ZPOS + pOff] = sf[PART_ZPOS + pOff] + (timeStep * sdot[PART_ZPOS+ pOff]);
      st[PART_XVEL + pOff] = .995*(sf[PART_XVEL + pOff] + (timeStep * sdot[PART_XVEL+ pOff]));
      st[PART_YVEL + pOff] = .995* (sf[PART_YVEL + pOff] + (timeStep * sdot[PART_YVEL+ pOff]));
      st[PART_ZVEL + pOff] = .995*(sf[PART_ZVEL + pOff] + (timeStep * sdot[PART_ZVEL+ pOff]));
  }
  for (var i = partCountp0; i < partCount0; i++){
    var pOff = i * PART_MAXVAR;
    st[PART_XPOS + pOff] = sf[PART_XPOS + pOff] + (timeStep * sdot[PART_XPOS + pOff]);
      st[PART_YPOS + pOff] = sf[PART_YPOS + pOff] + (timeStep * sdot[PART_YPOS + pOff]);      
      st[PART_ZPOS + pOff] = sf[PART_ZPOS + pOff] + (timeStep * sdot[PART_ZPOS+ pOff]);
      st[PART_XVEL + pOff] = .5 * (sf[PART_XVEL + pOff] + (timeStep * sdot[PART_XVEL+ pOff]));
      st[PART_YVEL + pOff] = .5 * (sf[PART_YVEL + pOff] + (timeStep * sdot[PART_YVEL+ pOff]));
      st[PART_ZVEL + pOff] = .5 * (sf[PART_ZVEL + pOff] + (timeStep * sdot[PART_ZVEL+ pOff]));
  }
  for (var i = partCount0; i < partCount1; i++){
    var pOff = i * PART_MAXVAR;
      st[PART_XPOS + pOff] =   Math.cos(st[PART_CHARGE + pOff]);
      st[PART_YPOS + pOff] = sf[PART_YPOS + pOff] + (timeStep * sdot[PART_YPOS + pOff]);      
      st[PART_ZPOS + pOff] =  Math.sin(st[PART_CHARGE + pOff]);
      st[PART_XVEL + pOff] = (timeStep * sdot[PART_XVEL+ pOff]);
      st[PART_YVEL + pOff] = (sf[PART_YVEL + pOff] + (timeStep * sdot[PART_YVEL+ pOff]));
      st[PART_ZVEL + pOff] = (timeStep * sdot[PART_ZVEL+ pOff]);
      st[PART_CHARGE + pOff] = sf[PART_CHARGE + pOff] + (timeStep * sdot[PART_CHARGE + pOff]);
  }
  for (var i = partCount1; i < partCount2; i++){
    var pOff = i * PART_MAXVAR;
      st[PART_XPOS + pOff] = sf[PART_XPOS + pOff] + (timeStep * sdot[PART_XPOS + pOff]);
      st[PART_YPOS + pOff] = sf[PART_YPOS + pOff] + (timeStep * sdot[PART_YPOS + pOff]);      
      st[PART_ZPOS + pOff] = sf[PART_ZPOS + pOff] + (timeStep * sdot[PART_ZPOS+ pOff]);
      st[PART_XVEL + pOff] = sf[PART_XVEL + pOff] + (timeStep * sdot[PART_XVEL+ pOff]);
      st[PART_YVEL + pOff] = (sf[PART_YVEL + pOff] + (timeStep * sdot[PART_YVEL+ pOff]));
      st[PART_ZVEL + pOff] = sf[PART_ZVEL + pOff] + (timeStep * sdot[PART_ZVEL+ pOff]);
      st[PART_X_FTOT + pOff] = sf[PART_X_FTOT+ pOff];
      st[PART_Z_FTOT + pOff] = sf[PART_Z_FTOT+ pOff];
      st[PART_DIAM + pOff] = sf[PART_DIAM + pOff]-sdot[PART_DIAM + pOff];
      st[PART_G + pOff] = sf[PART_G + pOff] + (timeStep * sdot[PART_G + pOff]);
      if (sf[PART_AGE + pOff] > 10000){
        st[pOff + PART_XPOS] = 2 + .5*Math.random();
       st[pOff + PART_YPOS] = 1;
      st[pOff + PART_ZPOS] = 3 + .5*Math.random();
      st[pOff + PART_XVEL] = 0.0;
      st[pOff + PART_YVEL] = 0.0;
    st[pOff + PART_ZVEL] = 0.0;
    st[pOff + PART_X_FTOT] = 0;
    st[pOff + PART_Y_FTOT] = 0;
    st[pOff + PART_Z_FTOT] = 0;
    st[pOff + PART_R] = 1;
    st[pOff + PART_G] = 0;
   st[pOff + PART_B] = 0;
    st[pOff + PART_MASS] = 0.9 + .8*Math.random();
    st[pOff + PART_DIAM] = 10;
   st[pOff + PART_RENDMODE] = 3;
    st[pOff + PART_AGE] = 100*Math.random();
      }
      st[PART_AGE + pOff] = sf[PART_AGE + pOff] + (timeStep * sdot[PART_AGE + pOff]);
  }
  for (var i = partCount2; i < partCount3; i++){
    var pOff = i * PART_MAXVAR;
      st[PART_XPOS + pOff] = sf[PART_XPOS + pOff] + (timeStep * sdot[PART_XPOS + pOff]);
      st[PART_YPOS + pOff] = sf[PART_YPOS + pOff] + (timeStep * sdot[PART_YPOS + pOff]);      
      st[PART_ZPOS + pOff] = sf[PART_ZPOS + pOff] + (timeStep * sdot[PART_ZPOS+ pOff]);
      st[PART_XVEL + pOff] =  .985*  (sf[PART_XVEL + pOff] + (timeStep * sdot[PART_XVEL+ pOff]));
      st[PART_YVEL + pOff] =  .985 *  (sf[PART_YVEL + pOff] + (timeStep * sdot[PART_YVEL+ pOff]));
      st[PART_ZVEL + pOff] =.985 * (sf[PART_ZVEL + pOff] + (timeStep * sdot[PART_ZVEL+ pOff]));
      st[PART_X_FTOT + pOff] = sf[PART_X_FTOT+ pOff];
      st[PART_Z_FTOT + pOff] = sf[PART_Z_FTOT+ pOff];
  }
}

function m_solver(sf, sdot, st){
  for (var i = 0; i < partCountp0; i++){
    var pOff = i * PART_MAXVAR;
    st[PART_XPOS + pOff] = sf[PART_XPOS + pOff] + ((timeStep/2) * sdot[PART_XPOS + pOff]);
      st[PART_YPOS + pOff] = sf[PART_YPOS + pOff] + ((timeStep/2) * sdot[PART_YPOS + pOff]);      
      st[PART_ZPOS + pOff] = sf[PART_ZPOS + pOff] + ((timeStep/2) * sdot[PART_ZPOS+ pOff]);
      st[PART_XVEL + pOff] = .995*(sf[PART_XVEL + pOff] + ((timeStep/2) * sdot[PART_XVEL+ pOff]));
      st[PART_YVEL + pOff] = .995* (sf[PART_YVEL + pOff] + ((timeStep/2) * sdot[PART_YVEL+ pOff]));
      st[PART_ZVEL + pOff] = .995*(sf[PART_ZVEL + pOff] + ((timeStep/2) * sdot[PART_ZVEL+ pOff]));
  }
  for (var i = partCountp0; i < partCount0; i++){
    var pOff = i * PART_MAXVAR;
    st[PART_XPOS + pOff] = sf[PART_XPOS + pOff] + ((timeStep/2) * sdot[PART_XPOS + pOff]);
      st[PART_YPOS + pOff] = sf[PART_YPOS + pOff] + ((timeStep/2) * sdot[PART_YPOS + pOff]);      
      st[PART_ZPOS + pOff] = sf[PART_ZPOS + pOff] + ((timeStep/2) * sdot[PART_ZPOS+ pOff]);
      st[PART_XVEL + pOff] = .5 * (sf[PART_XVEL + pOff] + ((timeStep/2) * sdot[PART_XVEL+ pOff]));
      st[PART_YVEL + pOff] = .5 * (sf[PART_YVEL + pOff] + ((timeStep/2) * sdot[PART_YVEL+ pOff]));
      st[PART_ZVEL + pOff] = .5 * (sf[PART_ZVEL + pOff] + ((timeStep/2) * sdot[PART_ZVEL+ pOff]));
  }
  for (var i = partCount0; i < partCount1; i++){
    var pOff = i * PART_MAXVAR;
      st[PART_XPOS + pOff] =   Math.cos(st[PART_CHARGE + pOff]);
      st[PART_YPOS + pOff] = sf[PART_YPOS + pOff] + ((timeStep/2) * sdot[PART_YPOS + pOff]);      
      st[PART_ZPOS + pOff] =  Math.sin(st[PART_CHARGE + pOff]);
      st[PART_XVEL + pOff] = ((timeStep/2) * sdot[PART_XVEL+ pOff]);
      st[PART_YVEL + pOff] = (sf[PART_YVEL + pOff] + ((timeStep/2) * sdot[PART_YVEL+ pOff]));
      st[PART_ZVEL + pOff] = ((timeStep/2) * sdot[PART_ZVEL+ pOff]);
      st[PART_CHARGE + pOff] = sf[PART_CHARGE + pOff] + ((timeStep/2) * sdot[PART_CHARGE + pOff]);
  }
  for (var i = partCount1; i < partCount2; i++){
    var pOff = i * PART_MAXVAR;
      st[PART_XPOS + pOff] = sf[PART_XPOS + pOff] + ((timeStep/2) * sdot[PART_XPOS + pOff]);
      st[PART_YPOS + pOff] = sf[PART_YPOS + pOff] + ((timeStep/2) * sdot[PART_YPOS + pOff]);      
      st[PART_ZPOS + pOff] = sf[PART_ZPOS + pOff] + ((timeStep/2) * sdot[PART_ZPOS+ pOff]);
      st[PART_XVEL + pOff] = sf[PART_XVEL + pOff] + ((timeStep/2) * sdot[PART_XVEL+ pOff]);
      st[PART_YVEL + pOff] = (sf[PART_YVEL + pOff] + ((timeStep/2) * sdot[PART_YVEL+ pOff]));
      st[PART_ZVEL + pOff] = sf[PART_ZVEL + pOff] + ((timeStep/2) * sdot[PART_ZVEL+ pOff]);
      st[PART_X_FTOT + pOff] = sf[PART_X_FTOT+ pOff];
      st[PART_Z_FTOT + pOff] = sf[PART_Z_FTOT+ pOff];
      st[PART_DIAM + pOff] = sf[PART_DIAM + pOff]-sdot[PART_DIAM + pOff];
      st[PART_G + pOff] = sf[PART_G + pOff] + ((timeStep/2) * sdot[PART_G + pOff]);
      if (sf[PART_AGE + pOff] > 10000){
        st[pOff + PART_XPOS] = 2 + .5*Math.random();
       st[pOff + PART_YPOS] = 1;
      st[pOff + PART_ZPOS] = 3 + .5*Math.random();
      st[pOff + PART_XVEL] = 0.0;
      st[pOff + PART_YVEL] = 0.0;
    st[pOff + PART_ZVEL] = 0.0;
    st[pOff + PART_X_FTOT] = 0;
    st[pOff + PART_Y_FTOT] = 0;
    st[pOff + PART_Z_FTOT] = 0;
    st[pOff + PART_R] = 1;
    st[pOff + PART_G] = 0;
   st[pOff + PART_B] = 0;
    st[pOff + PART_MASS] = 0.9 + .8*Math.random();
    st[pOff + PART_DIAM] = 10;
   st[pOff + PART_RENDMODE] = 3;
    st[pOff + PART_AGE] = 100*Math.random();
      }
      st[PART_AGE + pOff] = sf[PART_AGE + pOff] + ((timeStep/2) * sdot[PART_AGE + pOff]);
  }
  for (var i = partCount2; i < partCount3; i++){
    var pOff = i * PART_MAXVAR;
      st[PART_XPOS + pOff] = sf[PART_XPOS + pOff] + ((timeStep/2) * sdot[PART_XPOS + pOff]);
      st[PART_YPOS + pOff] = sf[PART_YPOS + pOff] + ((timeStep/2) * sdot[PART_YPOS + pOff]);      
      st[PART_ZPOS + pOff] = sf[PART_ZPOS + pOff] + ((timeStep/2) * sdot[PART_ZPOS+ pOff]);
      st[PART_XVEL + pOff] =  .985*  (sf[PART_XVEL + pOff] + ((timeStep/2) * sdot[PART_XVEL+ pOff]));
      st[PART_YVEL + pOff] =  .985 *  (sf[PART_YVEL + pOff] + ((timeStep/2) * sdot[PART_YVEL+ pOff]));
      st[PART_ZVEL + pOff] =.985 * (sf[PART_ZVEL + pOff] + ((timeStep/2) * sdot[PART_ZVEL+ pOff]));
      st[PART_X_FTOT + pOff] = sf[PART_X_FTOT+ pOff];
      st[PART_Z_FTOT + pOff] = sf[PART_Z_FTOT+ pOff];
  }
}
function em_solver(sdot, sc, st){
  dotmaker(sc, sdot);
  var sMdot = s0dot;
  e_solver (sc, sMdot, st);
}
function i_solver(sdot, sc, st){
  dotmaker(sc, s0dot);
  sdot1 = s0dot;
  dotmaker(st, s0dot);
  sdot2 = s0dot;
  for (var i = 0; i < partCountp0; i++){
    var pOff = i * PART_MAXVAR;
    st[PART_XPOS + pOff] = st[PART_XPOS + pOff] - (sdot1[PART_XPOS + pOff] * timeStep / 2) +(sdot2[PART_XPOS + pOff] * 3 * timeStep / 2);
    st[PART_YPOS + pOff] = st[PART_YPOS + pOff] - (sdot1[PART_YPOS + pOff] * timeStep / 2) +(sdot2[PART_YPOS + pOff] * 3* timeStep / 2);
    st[PART_ZPOS + pOff] = st[PART_ZPOS + pOff] - (sdot1[PART_ZPOS + pOff] * timeStep / 2) +(sdot2[PART_ZPOS + pOff] * 3* timeStep / 2);
    st[PART_XVEL + pOff] = .985 * (st[PART_XVEL + pOff] - (sdot1[PART_X_FTOT + pOff] * timeStep / 2) +(sdot2[PART_X_FTOT + pOff] * 3* timeStep / 2));
    st[PART_YVEL + pOff] = .985 * (st[PART_YVEL + pOff] - (sdot1[PART_Y_FTOT + pOff] * timeStep / 2) +(sdot2[PART_Y_FTOT + pOff] * 3* timeStep / 2));
    st[PART_ZVEL + pOff] = .985 * (st[PART_ZVEL + pOff] - (sdot1[PART_Z_FTOT + pOff] * timeStep / 2) +(sdot2[PART_Z_FTOT + pOff] * 3* timeStep / 2));
  }
  for (var i = partCountp0; i < partCount0; i++){
    var pOff = i * PART_MAXVAR;
    st[PART_XPOS + pOff] = st[PART_XPOS + pOff] - (sdot1[PART_XPOS + pOff] * timeStep / 2) +(sdot2[PART_XPOS + pOff] * 3 * timeStep / 2);
    st[PART_YPOS + pOff] = st[PART_YPOS + pOff] - (sdot1[PART_YPOS + pOff] * timeStep / 2) +(sdot2[PART_YPOS + pOff] * 3* timeStep / 2);
    st[PART_ZPOS + pOff] = st[PART_ZPOS + pOff] - (sdot1[PART_ZPOS + pOff] * timeStep / 2) +(sdot2[PART_ZPOS + pOff] * 3* timeStep / 2);
    st[PART_XVEL + pOff] = (st[PART_XVEL + pOff] - (sdot1[PART_X_FTOT + pOff] * timeStep / 2) +(sdot2[PART_X_FTOT + pOff] * 3* timeStep / 2));
    st[PART_YVEL + pOff] = (st[PART_YVEL + pOff] - (sdot1[PART_Y_FTOT + pOff] * timeStep / 2) +(sdot2[PART_Y_FTOT + pOff] * 3* timeStep / 2));
    st[PART_ZVEL + pOff] = (st[PART_ZVEL + pOff] - (sdot1[PART_Z_FTOT + pOff] * timeStep / 2) +(sdot2[PART_Z_FTOT + pOff] * 3* timeStep / 2));
  }
  for (var i = partCount0; i < partCount1; i++){
    var pOff = i * PART_MAXVAR;
    st[PART_XPOS + pOff] = Math.cos(st[PART_CHARGE + pOff]);
    st[PART_YPOS + pOff] = st[PART_YPOS + pOff] - (sdot1[PART_YPOS + pOff] * timeStep / 2) +(sdot2[PART_YPOS + pOff] * 3* timeStep / 2);
    st[PART_ZPOS + pOff] = Math.sin(st[PART_CHARGE + pOff]);
    st[PART_XVEL + pOff] =  - (sdot1[PART_X_FTOT + pOff] * timeStep / 2) +(sdot2[PART_X_FTOT + pOff] * 3* timeStep / 2);
    st[PART_YVEL + pOff] = st[PART_YVEL + pOff] - (sdot1[PART_Y_FTOT + pOff] * timeStep / 2) +(sdot2[PART_Y_FTOT + pOff] * 3* timeStep / 2);
    st[PART_ZVEL + pOff] = - (sdot1[PART_Z_FTOT + pOff] * timeStep / 2) +(sdot2[PART_Z_FTOT + pOff] * 3* timeStep / 2);
    st[PART_CHARGE + pOff] = st[PART_CHARGE + pOff] - (sdot1[PART_CHARGE + pOff] * timeStep / 2) +(sdot2[PART_CHARGE + pOff] * 3* timeStep / 2);
  }
  for (var i = partCount1; i < partCount2; i++){
    var pOff = i * PART_MAXVAR;
    st[PART_XPOS + pOff] = st[PART_XPOS + pOff] - (sdot1[PART_XPOS + pOff] * timeStep / 2) +(sdot2[PART_XPOS + pOff] * 3 * timeStep / 2);
    st[PART_YPOS + pOff] = st[PART_YPOS + pOff] - (sdot1[PART_YPOS + pOff] * timeStep / 2) +(sdot2[PART_YPOS + pOff] * 3* timeStep / 2);
    st[PART_ZPOS + pOff] = st[PART_ZPOS + pOff] - (sdot1[PART_ZPOS + pOff] * timeStep / 2) +(sdot2[PART_ZPOS + pOff] * 3* timeStep / 2);
    st[PART_XVEL + pOff] = st[PART_XVEL + pOff] - (sdot1[PART_X_FTOT + pOff] * timeStep / 2) +(sdot2[PART_X_FTOT + pOff] * 3* timeStep / 2);
    st[PART_YVEL + pOff] = st[PART_YVEL + pOff] - (sdot1[PART_Y_FTOT + pOff] * timeStep / 2) +(sdot2[PART_Y_FTOT + pOff] * 3* timeStep / 2);
    st[PART_ZVEL + pOff] = st[PART_ZVEL + pOff] - (sdot1[PART_Z_FTOT + pOff] * timeStep / 2) +(sdot2[PART_Z_FTOT + pOff] * 3* timeStep / 2);
    st[PART_DIAM + pOff] = st[PART_DIAM + pOff] + (sdot1[PART_DIAM + pOff] / 2) - (sdot2[PART_DIAM + pOff] * 3/ 2);
    st[PART_G + pOff] = st[PART_G + pOff] - (sdot1[PART_G + pOff] * timeStep / 2) +(sdot2[PART_G + pOff] * 3* timeStep / 2);
    if (st[PART_AGE + pOff] > 10000){
        st[pOff + PART_XPOS] = 2 + .5*Math.random();
       st[pOff + PART_YPOS] = 1;
      st[pOff + PART_ZPOS] = 3 + .5*Math.random();
      st[pOff + PART_XVEL] = 0.0;
      st[pOff + PART_YVEL] = 0.0;
    st[pOff + PART_ZVEL] = 0.0;
    st[pOff + PART_X_FTOT] = 0;
    st[pOff + PART_Y_FTOT] = 0;
    st[pOff + PART_Z_FTOT] = 0;
    st[pOff + PART_R] = 1;
    st[pOff + PART_G] = 0;
   st[pOff + PART_B] = 0;
    st[pOff + PART_MASS] = 0.9 + .8*Math.random();
    st[pOff + PART_DIAM] = 10;
   st[pOff + PART_RENDMODE] = 3;
    st[pOff + PART_AGE] = 100*Math.random();
      }
      st[PART_AGE + pOff] = st[PART_AGE + pOff] + (timeStep * sdot[PART_AGE + pOff]);
  }
  for (var i = partCount2; i < partCount3; i++){
    var pOff = i * PART_MAXVAR;
    st[PART_XPOS + pOff] = st[PART_XPOS + pOff] - (sdot1[PART_XPOS + pOff] * timeStep / 2) +(sdot2[PART_XPOS + pOff] * 3 * timeStep / 2);
    st[PART_YPOS + pOff] = st[PART_YPOS + pOff] - (sdot1[PART_YPOS + pOff] * timeStep / 2) +(sdot2[PART_YPOS + pOff] * 3* timeStep / 2);
    st[PART_ZPOS + pOff] = st[PART_ZPOS + pOff] - (sdot1[PART_ZPOS + pOff] * timeStep / 2) +(sdot2[PART_ZPOS + pOff] * 3* timeStep / 2);
    st[PART_XVEL + pOff] = .985 * (st[PART_XVEL + pOff] - (sdot1[PART_X_FTOT + pOff] * timeStep / 2) +(sdot2[PART_X_FTOT + pOff] * 3* timeStep / 2));
    st[PART_YVEL + pOff] = .985 * (st[PART_YVEL + pOff] - (sdot1[PART_Y_FTOT + pOff] * timeStep / 2) +(sdot2[PART_Y_FTOT + pOff] * 3* timeStep / 2));
    st[PART_ZVEL + pOff] = .985 * (st[PART_ZVEL + pOff] - (sdot1[PART_Z_FTOT + pOff] * timeStep / 2) +(sdot2[PART_Z_FTOT + pOff] * 3* timeStep / 2));
  }

}
function initVertexBuffers(gl) {
//==============================================================================
// Set up all buffer objects on our graphics hardware.
//
// Create a buffer object in the graphics hardware: get its ID# 
 vertexBufferID = gl.createBuffer();				//(make it global: PartSys_render()
  																					// modifies this buffers' contents)
  if (!vertexBufferID) {
    console.log('Failed to create the gfx buffer object');
    return -1;
  }
  // "Bind the new buffer object (memory in the graphics system) to target"
  // In other words, specify the usage of this selected buffer object.
  // What's a "Target"? it's the poorly-chosen OpenGL/WebGL name for the 
  // intended use of this buffer's memory; so far, we have just two choices:
  //	== "gl.ARRAY_BUFFER" meaning the buffer object holds actual values we need 
  //			for rendering (positions, colors, normals, etc), or 
  //	== "gl.ELEMENT_ARRAY_BUFFER" meaning the buffer object holds indices 
  // 			into a list of values we need; indices such as object #s, face #s, 
  //			edge vertex #s.
  gl.bindBuffer(gl.ARRAY_BUFFER, vertexBufferID);

 // Our particle system will use this buffer in a new way: all previous pgms
 // have created the buffer, then never changed it--we used it to draw over and
 // over again.  From the OpenGL ES specification:
 //		--STATIC_DRAW is for vertex buffers that are rendered many times, 
 //				and whose contents are specified once and never change.
 //		--DYNAMIC_DRAW is for vertex buffers that are rendered many times, and 
 //				whose contents change during the rendering loop.
 //		--STREAM_DRAW is for vertex buffers that are rendered a small number of 
 // 			times and then discarded.
 //  Recall that gl.bufferData() allocates and fills a new hunk of graphics 
 //		memory.  We always use gl.bufferData() in the creation of a new buffer.
 //	 In comparison, gl.bufferSubData() modifies contents of an existing buffer;
 //		we will use that in our 'PartSys_render()' function.
  gl.bufferData(gl.ARRAY_BUFFER, 				// GLenum target,
  													 s0, 				// ArrayBufferView data (or size)
  							gl.DYNAMIC_DRAW);				// Usage hint.
  							
	// ---------------Connect 'a_Position' attribute to bound buffer:-------------
  // Get the ID# for the a_Position variable in the graphics hardware
  // (keep it as global var--we'll need it for PartSys_render())
  a_PositionID = gl.getAttribLocation(gl.program, 'a_Position');
  if(a_PositionID < 0) {
    console.log('Failed to get the gfx storage location of a_Position');
    return -1;
  }
  // Tell GLSL to fill 'a_Position' attribute variable for each shader 
  // with values in the buffer object chosen by 'gl.bindBuffer()' command.
	// Websearch yields OpenGL version: 
	//		http://www.opengl.org/sdk/docs/man/xhtml/glVertexAttribPointer.xml
  gl.vertexAttribPointer(
		a_PositionID,	//index == attribute var. name used in the shader pgm.
		3,						// size == how many dimensions for this attribute: 1,2,3 or 4?
		gl.FLOAT,			// type == what data type did we use for those numbers?
		false,				// isNormalized == are these fixed-point values that we need
									//									normalize before use? true or false
		PART_MAXVAR*FSIZE,// stride == #bytes (of other, interleaved data) between 
										// separating OUR values.
		PART_XPOS*FSIZE);	// Offset -- how many bytes from START of buffer to the
  								// value we will actually use?  We start with position.
  // Enable this assignment of the a_Position variable to the bound buffer:
  gl.enableVertexAttribArray(a_PositionID);

  // ---------------Connect 'a_Color' attribute to bound buffer:--------------
  // Get the ID# for the vec3 a_Color variable in the graphics hardware
  // (keep it as global var--we'll need it for PartSys_render())
  a_ColorID = gl.getAttribLocation(gl.program, 'a_Color');
  if(a_ColorID < 0) {
    console.log('Failed to get the gfx storage location of a_Color');
    return -1;
  }
  // Tell GLSL to fill 'a_Color' attribute variable for each shader 
  // with values in the buffer object chosen by 'gl.bindBuffer()' command.
	// Websearch yields OpenGL version: 
	//		http://www.opengl.org/sdk/docs/man/xhtml/glVertexAttribPointer.xml
  gl.vertexAttribPointer(
		a_ColorID,		//index == attribute var. name used in the shader pgm.
		3,						// size == how many dimensions for this attribute: 1,2,3 or 4?
		gl.FLOAT,			// type == what data type did we use for those numbers?
		false,				// isNormalized == are these fixed-point values that we need
									//									normalize before use? true or false
		PART_MAXVAR * FSIZE,// stride == #bytes (of other, interleaved data) between 
											// separating OUR values?
		PART_R * FSIZE);	// Offset -- how many bytes from START of buffer to the
  										// value we will actually use?  We start with position.
  // Enable this assignment of the a_Position variable to the bound buffer:
  gl.enableVertexAttribArray(a_ColorID);

  // ---------------Connect 'a_diam' attribute to bound buffer:---------------
  // Get the ID# for the scalar a_diam variable in the graphics hardware
  // (keep it as global var--we'll need it for PartSys_render())
  a_diamID = gl.getAttribLocation(gl.program, 'a_diam');
  if(a_diamID < 0) {
    console.log('Failed to get the storage location of scalar a_diam');
    return -1;
  }
  // Tell GLSL to fill 'a_Position' attribute variable for each shader 
  // with values in the buffer object chosen by 'gl.bindBuffer()' command.
	// Websearch yields OpenGL version: 
	//		http://www.opengl.org/sdk/docs/man/xhtml/glVertexAttribPointer.xml
  gl.vertexAttribPointer(
		a_diamID,			//index == attribute var. name used in the shader pgm.
		1,						// size == how many dimensions for this attribute: 1,2,3 or 4?
		gl.FLOAT,			// type == what data type did we use for those numbers?
		false,				// isNormalized == are these fixed-point values that we need
									//									to normalize before use? true or false
		PART_MAXVAR*FSIZE,// stride == #bytes (of other, interleaved data) between 
											// separating OUR values?
		PART_DIAM*FSIZE); // Offset -- how many bytes from START of buffer to the
  										// value we will actually use?  We start with position.
  // Enable this assignment of the a_Position variable to the bound buffer:
  gl.enableVertexAttribArray(a_diamID);

	// --------------DONE with connecting attributes to bound buffer:-----------
  return partCount1 + partCount2 + partCount3;
}

function e_sol(){
  s = 0;
}
function i_sol(){
  s = 1;
}
function em_sol(){
  s = 2;
}

function myKeyDown(ev) {
    switch (ev.keyCode) {
        case 39:
            xAt -= (Math.sin(theta)/10);
            xPos -= (Math.sin(theta)/10);
            zPos += (Math.cos(theta) / 10);
            zAt += (Math.cos(theta) / 10);
            break;
        case 38:
            xmov = .1;
            xAt += (Math.cos(theta)/10);
            xPos += (Math.cos(theta)/10);
            zPos += (Math.sin(theta) / 10);
            zAt += (Math.sin(theta) / 10);
            var temp = (yAt - yPos)/8;
            yPos +=temp;
            if (yAt > yPos){
              yAt += .08;
            }
            else if (yAt <= yPos +.1 && yAt >=yPos -.1) {
              yAt = yAt;
            }
            else {
              yAt -= .08;
            }
            break;
        case 37:
            xAt += (Math.sin(theta)/10);
            xPos += (Math.sin(theta)/10);
            zPos -= (Math.cos(theta) / 10);
            zAt -= (Math.cos(theta) / 10);
            break;
        case 40:
        yAt = yAt;
            xAt -= (Math.cos(theta)/10);
            xPos -= (Math.cos(theta)/10);
            zPos -= (Math.sin(theta) / 10);
            zAt -= (Math.sin(theta) / 10);
            break;
        case 65:
        yAt = yAt;
            xAt = xPos + Math.cos(theta);
            zAt = zPos + Math.sin(theta);
            theta -= .1;
            break;
        case 68:
            xAt = xPos + Math.cos(theta);
            zAt = zPos + Math.sin(theta);
            theta += .1;
            break;
       case 87:
            yAt += .1;
            break;
        case 83:
            yAt -= .1;
            break;
        case 73:
            ykey += .1;
            break;
        case 74:
            zkey += .1;
            break;
        case 75:
            ykey -= .1;
            break;
        case 76:
            zkey -= .1;
            break;
        default:
          break;
    }
}

function myKeyUp(ev) {
} 

function myKeyPress(ev) {
}
