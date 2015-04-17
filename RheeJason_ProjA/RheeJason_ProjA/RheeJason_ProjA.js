var VSHADER_SOURCE = 
  'uniform mat4 u_ModelMatrix;\n' +
  'attribute vec4 a_Position;\n' +
  'attribute vec4 a_Color;\n' +
  'varying vec4 v_Color;\n' +
  'void main() {\n' +
  '  gl_Position = u_ModelMatrix * a_Position;\n' +
  '  gl_PointSize = 10.0;\n' +
  '  v_Color = a_Color;\n' +
  '}\n';

var FSHADER_SOURCE = 
  '#ifdef GL_ES\n' +
  'precision mediump float;\n' +
  '#endif GL_ES\n' +
  'varying vec4 v_Color;\n' +
  'void main() {\n' +
  '  gl_FragColor = v_Color;\n' +
  '}\n';

var ANGLE_STEP = 45.0;
var SCALE_STEP = 21;
var MOVE_STEP = 0;
var floatsPerVertex = 7;	
var isDrag = false; 	
var xMclik = 0.0; 		
var yMclik = 0.0;
var xMdragTot = 0.0; 
var yMdragTot = 0.0;  

function main() {

  var canvas = document.getElementById('webgl');

  var gl = getWebGLContext(canvas);
  if (!gl) {
    console.log('Failed to get the rendering context for WebGL');
    return;
  }

  if (!initShaders(gl, VSHADER_SOURCE, FSHADER_SOURCE)) {
    console.log('Failed to intialize shaders.');
    return;
  }

  // 
  var n = initVertexBuffer(gl);
  if (n < 0) {
    console.log('Failed to set the vertex information');
    return;
  }

  gl.clearColor(0.0, 0.0, 0.0, 1.0);

  gl.enable(gl.DEPTH_TEST); 	  
	

  var u_ModelMatrix = gl.getUniformLocation(gl.program, 'u_ModelMatrix');
  if (!u_ModelMatrix) { 
    console.log('Failed to get the storage location of u_ModelMatrix');
    return;
    }

  var modelMatrix = new Matrix4();
  var currentAngle = 0.0;
  var currentScale = 0.0;
  var currentMove = 0;

  window.addEventListener("keydown", myKeyDown, false);
  window.addEventListener("keyup", myKeyUp, false);
  window.addEventListener("keypress", myKeyPress, false);
  canvas.onmousedown = function (ev) { myMouseDown(ev, gl, canvas) };

  canvas.onmousemove = function (ev) { myMouseMove(ev, gl, canvas) };		
  canvas.onmouseup = function (ev) { myMouseUp(ev, gl, canvas) };

  var tick = function () {
      currentAngle = animate(currentAngle);
      if (currentScale < .4) {
          currentScale = animscale(currentScale);
      }
      else { currentScale = .4 }
      currentMove = animmove(currentMove);
      draw(gl, n, currentScale, currentMove, currentAngle, modelMatrix, u_ModelMatrix);
      requestAnimationFrame(tick, canvas);
  };
  tick();				
	
}

function initVertexBuffer(gl) {
 
    makestar();
    makeplanet();
    makemoon();
    makespacecraftbody();
    makespacecraftsolarpanel();

	var mySiz = (starVerts.length + planetVerts.length + moonVerts.length + spacecraftVerts.length + solarpanelVerts.length);						

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
  if(a_Color < 0) {
    console.log('Failed to get the storage location of a_Color');
    return -1;
    }

  gl.vertexAttribPointer(
  	a_Color, 				
  	3, 							
  	gl.FLOAT, 			
  	false, 					
  	FSIZE * 7, 		
  	FSIZE * 4);			
  									
  gl.enableVertexAttribArray(a_Color);  
  gl.bindBuffer(gl.ARRAY_BUFFER, null);

  return nn;
}
function makestar(){
	var wide = 10;
	starVerts = new Float32Array((6*wide-2)*floatsPerVertex);
		for(v=1,j=0; v<2*wide; v++, j+=floatsPerVertex){
			if(v%2==0){
				starVerts[j] = 0;
				starVerts[j+1] = 0;
				starVerts[j+2] = 1;
				starVerts[j+3] = 1;
				starVerts[j+4] = 1;
				starVerts[j+5] = 1;
				starVerts[j+6] = 0;
			}
			else{
				starVerts[j] = Math.cos(Math.PI*(v-1)/wide);
				starVerts[j+1] = Math.sin(Math.PI*(v-1)/wide);
				starVerts[j+2] = 1;
				starVerts[j+3] = 1;
				starVerts[j+4] = 1;
				starVerts[j+5] = 1;
				starVerts[j+6] = 0;
            }
		}
		for (v=0; v< 2*wide; v++, j+=floatsPerVertex){
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

		}
		for (v=0; v< 2*wide; v++, j+=floatsPerVertex){
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

		}
}
function makeplanet(){
    var disks = 21;
    var diskVerts = 27;
    var NPColr = new Float32Array([1, 1, 1]);
    var EQColr = new Float32Array([.4, 1, 1]);	
    var SPColr = new Float32Array([1, 1, 1]);	
    var diskAngle = Math.PI/disks;

    planetVerts = new Float32Array(((disks*2*diskVerts)-2) * floatsPerVertex);

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
        }
    }
}
function makemoon() {

    moonVerts = new Float32Array([

     1.0, -1.0, -1.0, 1.0, .7,.7,.7,
     0, -2, 0, 1, .7,.7,.7,
     1.0, -1.0, 1, 1, .7,.7,.7,

     1.0, -1.0, 1, 1, .7,.7,.7,
     0, -2, 0, 1, .7,.7,.7,
     -1, -1, 1, 1, .7,.7,.7,

     -1, -1, 1, 1,.7,.7,.7,
     0, -2, 0, 1, .7,.7,.7,
     -1, -1, -1, 1, .7,.7,.7,

     -1, -1, -1, 1, .7,.7,.7,
     0, -2, 0, 1, .7,.7,.7,
     1, -1, -1, 1, .7,.7,.7, 

    -1.0, 1.0, -1.0, 1.0, .7,.7,.7,
     0, 2, 0, 1, .7,.7,.7,
     1.0, 1.0, -1, 1, .7,.7,.7,

     1.0, 1.0, -1, 1, .7,.7,.7,
     0, 2, 0, 1, .7,.7,.7,
     1, 1, 1, 1, .7,.7,.7,

     1, 1, 1, 1, .7,.7,.7,
     0, 2, 0, 1, .7,.7,.7,
     -1, 1, 1, 1, .7,.7,.7,

     -1, 1, 1, 1, .7,.7,.7,
     0, 2, 0, 1, .7,.7,.7,
     -1, 1, -1, 1, .7,.7,.7, 

    -1.0, 1.0, 1.0, 1.0, .7,.7,.7,
     0, 0, 2, 1, .7,.7,.7,
     -1.0, -1.0, 1, 1, .7,.7,.7,

     -1.0, -1.0, 1, 1, .7,.7,.7,
     0, 0, 2, 1, .7,.7,.7,
     1, -1, 1, 1, .7,.7,.7,

     1, -1, 1, 1, .7,.7,.7,
     0, 0, 2, 1, .7,.7,.7,
     1, 1, 1, 1, .7,.7,.7,

     1, 1, 1, 1, .7,.7,.7,
     0, 0, 2, 1, .7,.7,.7,
     -1, 1, -1, 1, .7,.7,.7, 

    -1.0, -1.0, 1.0, 1.0, 1,1,1, 	
    -1.0, 1.0, 1.0, 1.0, 1,1,1, 
    -1.0, 1.0, -1.0, 1.0, 1,1,1, 

    -1.0, 1.0, -1.0, 1.0, 1,1,1, 
    -1.0, -1.0, -1.0, 1.0,1,1,1,  
    -1.0, -1.0, 1.0, 1.0, 1,1,1, 

    
     1.0, -1.0, -1.0, 1.0,1,1,1,
     1.0, -1.0, 1.0, 1.0, 1,1,1, 
    -1.0, -1.0, 1.0, 1.0, 1,1,1, 

    -1.0, -1.0, 1.0, 1.0, 1,1,1,
    -1.0, -1.0, -1.0, 1.0, 1,1,1, 
     1.0, -1.0, -1.0, 1.0, 1,1,1, 

    
     1.0, 1.0, -1.0, 1.0,.7,.7,.7,
     0, 0, -2, 1, .7,.7,.7,
     1.0, -1.0, -1, 1, .7,.7,.7,

     1.0, -1.0, -1, 1, .7,.7,.7,
     0, 0, -2, 1, .7,.7,.7,
     -1, -1, -1, 1, .7,.7,.7,

     -1, -1, -1, 1, .7,.7,.7,
     0, 0,-2, 1, .7,.7,.7,
     -1, 1, -1, 1, .7,.7,.7,

     -1, 1, -1, 1, .7,.7,.7,
     0, 0, -2, 1, .7,.7,.7,
     1, 1, -1, 1, .7,.7,.7,
    ]);

}
function makespacecraftbody() {
    var yellow = new Float32Array([.7, .7, .7]);
    var orange = new Float32Array([1, 1, 0.4]);
    var brown = new Float32Array([.3,.2,.1]);
    var wide = 16;
    spacecraftVerts = new Float32Array(((wide * 6) - 2) * floatsPerVertex);
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
    }
    for (v = 0; v < 2 * wide; v++, j += floatsPerVertex) {
        if (v % 2 == 0)
        {
            spacecraftVerts[j] = Math.cos(Math.PI * (v) / wide);
            spacecraftVerts[j + 1] = Math.sin(Math.PI * (v) / wide);
            spacecraftVerts[j + 2] = 1.0;
            spacecraftVerts[j + 3] = 1.0;
            spacecraftVerts[j + 4] = orange[0];
            spacecraftVerts[j + 5] = orange[1];
            spacecraftVerts[j + 6] = orange[2];
        }
        else
        {
            spacecraftVerts[j] = Math.cos(Math.PI * (v - 1) / wide);
            spacecraftVerts[j + 1] = Math.sin(Math.PI * (v - 1) / wide);
            spacecraftVerts[j + 2] = -1.0;
            spacecraftVerts[j + 3] = 1.0;
            spacecraftVerts[j + 4] = brown[0];
            spacecraftVerts[j + 5] = brown[1];
            spacecraftVerts[j + 6] = brown[2];
        }
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
    }
}

function makespacecraftsolarpanel() {
    solarpanelVerts = new Float32Array([
     1.0, -1.0, -1.0, 1.0, 0,0,1,
     1.0, 1.0, -1.0, 1.0, 0,0,1,
     1.0, 1.0, 1.0, 1.0,0,0,1,

     1.0, 1.0, 1.0, 1.0, 1,1,0,
     1.0, -1.0, 1.0, 1.0,1,1,0,
     1.0, -1.0, -1.0, 1.0, 1,1,0,
     ]);
}

function draw(gl, n, currentScale, currentMove, currentAngle, modelMatrix, u_ModelMatrix) {

    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    modelMatrix.setTranslate(-0.4, -0.4, 0.0);
    modelMatrix.setRotate(70, 3, -.7, 0);
    modelMatrix.scale(1, .4, -.7);
    modelMatrix.scale(0.2, 0.2, 0.2);
    modelMatrix.translate(-1, 1, -1);
    modelMatrix.translate(xMdragTot, 4 * yMdragTot, 0);
    modelMatrix.rotate(currentAngle, 0, 0, 1);

    gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
    gl.drawArrays(gl.TRIANGLE_STRIP,
  							starStart / floatsPerVertex,
  							starVerts.length / floatsPerVertex);

    pushMatrix(modelMatrix);


    modelMatrix.translate(1.7, 2, 1);
    modelMatrix.rotate(2 * currentAngle, 0, 0, 1);
    modelMatrix.scale(.2, .2, .2);

    gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
    gl.drawArrays(gl.TRIANGLE_STRIP,
                        planetStart / floatsPerVertex,
                        planetVerts.length / floatsPerVertex);

    modelMatrix.translate(1, -1, 1);
    modelMatrix.scale(.2, .2, .2);
    modelMatrix.rotate(currentAngle, 0, 0, 1);

    gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
    gl.drawArrays(gl.TRIANGLE_STRIP,
                        moonStart / floatsPerVertex,
                        moonVerts.length / floatsPerVertex);

    modelMatrix = popMatrix();
    pushMatrix(modelMatrix);

    modelMatrix.translate(-4, -4, 0);
    modelMatrix.rotate(currentAngle, 0, 0, 1);
    modelMatrix.scale(.7, .7, .7);

    gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
    gl.drawArrays(gl.TRIANGLE_STRIP,
                        planetStart / floatsPerVertex,
                        planetVerts.length / floatsPerVertex);

    pushMatrix(modelMatrix);

    modelMatrix.translate(1, 1, 1);
    modelMatrix.scale(.2, .2, .2);
    modelMatrix.rotate(currentAngle, 0, 0, 1);
    gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
    gl.drawArrays(gl.TRIANGLE_STRIP,
                        moonStart / floatsPerVertex,
                        moonVerts.length / floatsPerVertex);

    modelMatrix = popMatrix();

    modelMatrix.translate(-1, -2, -1);
    modelMatrix.scale(.3, .3, .3);
    modelMatrix.rotate(currentAngle, 0, 0, 1);

    gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
    gl.drawArrays(gl.TRIANGLE_STRIP,
                        moonStart / floatsPerVertex,
                        moonVerts.length / floatsPerVertex);

    modelMatrix = popMatrix();

    modelMatrix.translate(3, -2, 0);
    modelMatrix.rotate(currentAngle, 0, 0, 1);
    modelMatrix.scale(currentScale, currentScale, currentScale);

    gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
    gl.drawArrays(gl.TRIANGLE_STRIP,
                        planetStart / floatsPerVertex,
                        planetVerts.length / floatsPerVertex);

    modelMatrix.setTranslate(-0.4, -0.4, 0);
    modelMatrix.translate(.8 + currentMove, 1, 0);
    modelMatrix.scale(.1, .1, .1);
    modelMatrix.scale(1, 1.2, 4);
    modelMatrix.rotate(currentAngle, 0, -1, 0);
    gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
    gl.drawArrays(gl.TRIANGLE_STRIP,
                        spacecraftStart / floatsPerVertex,
                        spacecraftVerts.length / floatsPerVertex);

    modelMatrix.translate(0, 0, 0);
    modelMatrix.rotate(90, 0, 1, 0);
    modelMatrix.rotate(currentAngle, 1, 0, 0);
    modelMatrix.scale(.1, .1, 2.7);
    modelMatrix.translate(-.1, 0, 0);
    gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
    gl.drawArrays(gl.TRIANGLE_STRIP,
                        spacecraftStart / floatsPerVertex,
                        spacecraftVerts.length / floatsPerVertex);

    pushMatrix(modelMatrix);

    modelMatrix.rotate(currentAngle*4, 0,0 , 1);
    modelMatrix.translate(-4.7, 0, -1);
    modelMatrix.scale(4, 9, .4);
    gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
    gl.drawArrays(gl.TRIANGLE_STRIP,
                        solarpanelStart / floatsPerVertex,
                        solarpanelVerts.length / floatsPerVertex);

    modelMatrix = popMatrix();

    modelMatrix.rotate(currentAngle * 4, 0, 0, -1);
    modelMatrix.translate(4.7, 0, 1);
    modelMatrix.scale(-4, -9, -.4);
    gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
    gl.drawArrays(gl.TRIANGLE_STRIP,
                        solarpanelStart / floatsPerVertex,
                        solarpanelVerts.length / floatsPerVertex);

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
}
function animmove(move) {
    var now = Date.now();
    var elapsed = now - g_last;
    g_last = now;
    var newMove = move + (MOVE_STEP);
    return newMove;
}
function myKeyDown(ev) {

    switch (ev.keyCode) {
        case 37:
            ANGLE_STEP -= 25;
            break;
        case 38:
            MOVE_STEP -= .001;
            break;
        case 39:
            ANGLE_STEP += 25;
            break;
        case 40:
            MOVE_STEP += .001;
            break;
        default:
            break;
    }
}

function myKeyUp(ev) {
}

function myKeyPress(ev) {
}
function myMouseDown(ev, gl, canvas) {
    var rect = ev.target.getBoundingClientRect();
    var xp = ev.clientX - rect.left;
    var yp = canvas.height - (ev.clientY - rect.top);
    var x = (xp - canvas.width / 2) /
  						 (canvas.width / 2);
    var y = (yp - canvas.height / 2) /
							 (canvas.height / 2);
    isDrag = true;
    xMclik = x;
    yMclik = y;
};


function myMouseMove(ev, gl, canvas) {
    if (isDrag == false) return;
    var rect = ev.target.getBoundingClientRect();
    var xp = ev.clientX - rect.left;
    var yp = canvas.height - (ev.clientY - rect.top);
    var x = (xp - canvas.width / 2) /
  						 (canvas.width / 2);
    var y = (yp - canvas.height / 2) /
							 (canvas.height / 2);

    xMdragTot += (x - xMclik);
    yMdragTot += (y - yMclik);
    xMclik = x;
    yMclik = y;
};

function myMouseUp(ev, gl, canvas) {
    var rect = ev.target.getBoundingClientRect();
    var xp = ev.clientX - rect.left;
    var yp = canvas.height - (ev.clientY - rect.top);
    var x = (xp - canvas.width / 2) /
  						 (canvas.width / 2);
    var y = (yp - canvas.height / 2) /
							 (canvas.height / 2);

    isDrag = false;
    xMdragTot += (x - xMclik);
    yMdragTot += (y - yMclik);
};

function pauseandplay() {
    if (ANGLE_STEP * ANGLE_STEP > 1 && MOVE_STEP * MOVE_STEP > 0) {
	Temp = ANGLE_STEP;
        ANGLE_STEP = 0;
	Temp2 = MOVE_STEP;
	MOVE_STEP = 0;
	}
    else if (ANGLE_STEP * ANGLE_STEP > 1){
        Temp = ANGLE_STEP;
        ANGLE_STEP = 0;
    }
    else if (MOVE_STEP * MOVE_STEP > 0) {
	Temp2 = MOVE_STEP;
	MOVE_STEP = 0;
	}
    else {
        ANGLE_STEP = Temp;
	MOVE_STEP = Temp2;
    }
}
function angleForm() {
    var UsrTxt = document.getElementById('newangle').value;
    ANGLE_STEP = UsrTxt;
}