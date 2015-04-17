
var VSHADER_SOURCE =
  //-------------ATTRIBUTES: of each vertex, read from our Vertex Buffer Object
  'attribute vec4 a_Position; \n' +   // vertex position (model coord sys)
  'attribute vec4 a_Normal; \n' +  
  'attribute vec4 a_Color;\n'  +  // vertex normal vector (model coord sys)
//  'attribute vec4 a_color;\n' +     // Per-vertex colors? they usually 
                                      // set the Phong diffuse reflectance
  //-------------UNIFORMS: values set from JavaScript before a drawing command.
  'uniform vec3 u_Kd; \n' +           //  Instead, we'll use this 'uniform' 
                          // Phong diffuse reflectance for the entire shape
  'uniform mat4 u_MvpMatrix; \n' +
  'uniform mat4 u_ModelMatrix; \n' +    // Model matrix
  'uniform mat4 u_NormalMatrix; \n' +   // Inverse Transpose of ModelMatrix;
                                        // (doesn't distort normal directions)
  
  //-------------VARYING:Vertex Shader values sent per-pixel to Fragment shader:
  'varying vec3 v_Kd; \n' +             // Phong Lighting: diffuse reflectance
                                        // (I didn't make per-pixel Ke,Ka,Ks )
  'varying vec4 v_Position; \n' +       
  'varying vec3 v_Normal; \n' +  
  'varying vec4 v_Color;\n'  +    // Why Vec3? its not a point, hence w==0
//---------------
  'void main() { \n' +
    // Set the CVV coordinate values from our given vertex. This 'built-in'
    // per-vertex value gets interpolated to set screen position for each pixel.
  '  gl_Position = u_MvpMatrix * a_Position;\n' +
     // Calculate the vertex position & normal in the WORLD coordinate system
     // and then save as 'varying', so that fragment shaders each get per-pixel
     // values (interp'd between vertices for our drawing primitive (TRIANGLE)).
  '  v_Position = u_ModelMatrix * a_Position; \n' +
    // 3D surface normal of our vertex, in world coords.  ('varying'--its value
    // gets interpolated (in world coords) for each pixel's fragment shader.
  '  v_Normal = normalize(vec3(u_NormalMatrix * a_Normal));\n' +
  '  v_Kd = u_Kd; \n' +
  '  v_Color = a_Color; \n' +   // find per-pixel diffuse reflectance from per-vertex
                          // (no per-pixel Ke,Ka, or Ks, but you can do it...)
//  '  v_Kd = vec3(1.0, 1.0, 0.0); \n'  + // TEST; fixed at green
  '}\n';

// Fragment shader program
var FSHADER_SOURCE =
  '#ifdef GL_ES\n' +
  'precision mediump float;\n' +
  '#endif\n' +
  
  // first light source: (YOU write a second one...)
  'uniform vec4 u_Lamp0Pos;\n' +   
  'uniform vec4 u_Lamp1Pos;\n' +   // Phong Illum: position
  'uniform vec3 u_Lamp0Amb;\n' +  
  'uniform vec3 u_Lamp1Amb;\n' +    // Phong Illum: ambient
  'uniform vec3 u_Lamp0Diff;\n' +  
  'uniform vec3 u_Lamp1Diff;\n' +  // Phong Illum: diffuse
  'uniform vec3 u_Lamp0Spec;\n' + 
  'uniform vec3 u_Lamp1Spec;\n' +    // Phong Illum: specular
  
  // first material definition: you write 2nd, 3rd, etc.
  'uniform vec3 u_Ke;\n' +              // Phong Reflectance: emissive
  'uniform vec3 u_Ka;\n' +              // Phong Reflectance: ambient
  // Phong Reflectance: diffuse? -- use v_Kd instead for per-pixel value
  'uniform vec3 u_Ks;\n' +              // Phong Reflectance: specular
  'uniform float u_Kshiny;\n' +           // Phong Reflectance: 1 < shiny < 200
//  
  'uniform vec4 u_eyePosWorld; \n' +    // Camera/eye location in world coords.
  
  'varying vec3 v_Normal;\n' +        // Find 3D surface normal at each pix
  'varying vec4 v_Position;\n' +      // pixel's 3D pos too -- in 'world' coords
  'varying vec3 v_Kd; \n' +   
  'varying vec4 v_Color; \n' +        // Find diffuse reflectance K_d per pix
                            // Ambient? Emissive? Specular? almost
                            // NEVER change per-vertex: I use'uniform'

  'void main() { \n' +
      // Normalize! interpolated normals aren't 1.0 in length any more
  '  vec3 normal = normalize(v_Normal); \n' +
      // Calculate the light direction vector, make it unit-length (1.0).
  '  vec3 lightDirection = normalize(u_Lamp0Pos.xyz - v_Position.xyz);\n' +
  '  vec3 lightDirection1 = normalize(u_Lamp1Pos.xyz - v_Position.xyz);\n' +
      // The dot product of the light direction and the normal
      // (use max() to discard any negatives from lights below the surface)
  '  float nDotL = max(dot(lightDirection, normal), 0.0); \n' +
  '  float nDotL1 = max(dot(lightDirection1, normal), 0.0); \n' +
      // The Blinn-Phong lighting model computes the specular term faster 
      // because it replaces the (V*R)^shiny weighting with (H*N)^shiny,
      // where 'halfway' vector H has a direction half-way between L and V"
      // H = norm(norm(V) + norm(L)) 
      // (see http://en.wikipedia.org/wiki/Blinn-Phong_shading_model)
  '  vec3 eyeDirection = normalize(u_eyePosWorld.xyz - v_Position.xyz); \n' +
  '  vec3 H = normalize(lightDirection); \n' +
  '  vec3 HH = normalize(lightDirection1); \n' +
  '  float nDotH = max(dot(H, normal), 0.0); \n' +
  '  float nDotHH = max(dot(HH, normal), 0.0); \n' +
      // (use max() to discard any negatives from lights below the surface)
      // Apply the 'shininess' exponent K_e:
  '  float e02 = nDotH*nDotH; \n' +
  '  float K_e = pow(nDotH, u_Kshiny); \n' +
  '  float K_e1 = pow(nDotHH, u_Kshiny); \n' +
  '  float e04 = e02*e02; \n' +
  '  float e08 = e04*e04; \n' +
  '  float e16 = e08*e08; \n' +
  '  float e32 = e16*e16; \n' +
  '  float e64 = e32*e32; \n' +
      // Calculate the final color from diffuse reflection and ambient reflection
  '  vec3 emissive = u_Ke;\n' +
  '  vec3 ambient = u_Lamp0Amb * u_Ka;\n' +
  '  vec3 diffuse = u_Lamp0Diff * v_Kd * nDotL;\n' +
  '  vec3 speculr = u_Lamp0Spec * u_Ks * K_e;\n' +

  '  vec3 emissive1 = u_Ke;\n' +
  '  vec3 ambient1 = u_Lamp1Amb * u_Ka;\n' +
  '  vec3 diffuse1 = u_Lamp1Diff * v_Kd * nDotL1;\n' +
  '  vec3 speculr1 = u_Lamp1Spec * u_Ks * K_e1;\n' +
  '  gl_FragColor = vec4( emissive + ambient + diffuse + speculr + emissive1 + ambient1 + diffuse1 + speculr1 , 1.0);\n' +
  '}\n';

var canvas;
var mvpMatrix = new Matrix4();
var modelMatrix = new Matrix4();
var normalMatrix = new Matrix4();
var n, u_MvpMatrix, u_ModelMatrix, u_NormalMatrix, u_Lamp0Pos, u_Lamp0Amb, u_Lamp0Diff, u_Lamp0Spec, u_eyePosWorld;
var u_Lamp1Pos, u_Lamp1Amb, u_Lamp1Diff, u_Lamp1Spec;
var u_modelMatrix, u_Ke, u_Ks, u_Ka, u_Kd, u_Kshiny;
var floatsPerVertex = 10;
var currentAngle = 0;
var ANGLE_STEP = 25;
var MOVE_STEP = .01;
var moonStart;
var moonVerts = new Float32Array;
var gndStart;
var gndVerts = new Float32Array(floatsPerVertex * 2 * (200));
var starStart;
var starVerts = new Float32Array;
var planetStart;
var planetVerts = new Float32Array;
var xPos = 17;
var yPos = 0;
var zPos = 0;
var xAt = 0;
var yAt = 0;
var zAt = 0;
var xUp = 0;
var yUp = 0;
var zUp = 1;
var theta = 3.1415926535897;
var phi = 0;
var currentStep = 0;
var stepCheck = 0;
var lpx = 0;
var lpy = 0;
var lpz = 7;
var avx = 0;
var avy = 0;
var avz = 0;
var dvx = 0;
var dvy = 0;
var dvz = 0;
var svx = 0;
var svy = 0;
var svz = 0;
var ambOn = 0;
var diffOn = 0;
var specOn = 0;

function main() 
{
  canvas = document.getElementById('webgl');
  
  winResize();
  var gl = getWebGLContext(canvas);
  if (!gl) {
    console.log('Failed to get the rendering context for WebGL');
    return;
  }

  if (!initShaders(gl, VSHADER_SOURCE, FSHADER_SOURCE)) {
    console.log('Failed to intialize shaders.');
    return;
  }
  
  n = initVertexBuffers(gl);
  if (n < 0) {
    console.log('Failed to set the vertex information');
    return;
  }
  gl.clearColor(0, 0, 0, 1.0);
  gl.enable(gl.DEPTH_TEST);

  u_eyePosWorld = gl.getUniformLocation(gl.program, 'u_eyePosWorld');
  u_modelMatrix = gl.getUniformLocation(gl.program, 'u_ModelMatrix');
  u_MvpMatrix = gl.getUniformLocation(gl.program,   'u_MvpMatrix');
  u_NormalMatrix = gl.getUniformLocation(gl.program,'u_NormalMatrix');
  if (!u_modelMatrix || !u_MvpMatrix || !u_NormalMatrix) {
    console.log('Failed to get matrix storage locations');
    return;
    }

  u_Lamp0Pos  = gl.getUniformLocation(gl.program,   'u_Lamp0Pos');
  u_Lamp0Amb  = gl.getUniformLocation(gl.program,   'u_Lamp0Amb');
  u_Lamp0Diff = gl.getUniformLocation(gl.program,   'u_Lamp0Diff');
  u_Lamp0Spec = gl.getUniformLocation(gl.program,   'u_Lamp0Spec');
  if( !u_Lamp0Pos || !u_Lamp0Amb  || !u_Lamp0Diff  || !u_Lamp0Spec  ) {
    console.log('Failed to get the Lamp0 storage locations');
    return;
  }

  u_Lamp1Pos  = gl.getUniformLocation(gl.program,   'u_Lamp1Pos');
  u_Lamp1Amb  = gl.getUniformLocation(gl.program,   'u_Lamp1Amb');
  u_Lamp1Diff = gl.getUniformLocation(gl.program,   'u_Lamp1Diff');
  u_Lamp1Spec = gl.getUniformLocation(gl.program,   'u_Lamp1Spec');
  if( !u_Lamp1Pos || !u_Lamp1Amb  || !u_Lamp1Diff  || !u_Lamp1Spec  ) {
    console.log('Failed to get the Lamp1 storage locations');
    return;
  }

  u_Ke = gl.getUniformLocation(gl.program, 'u_Ke');
  u_Ka = gl.getUniformLocation(gl.program, 'u_Ka');
  u_Kd = gl.getUniformLocation(gl.program, 'u_Kd');
  u_Ks = gl.getUniformLocation(gl.program, 'u_Ks');
  u_Kshiny = gl.getUniformLocation(gl.program, 'u_Kshiny');
  
  if(!u_Ke || !u_Ka || !u_Kd 
     || !u_Ks || !u_Kshiny
     ) {
    console.log('Failed to get the Phong Reflectance storage locations');
    return;
  }
  // Set the light direction (in the world coordinate)

  

  window.addEventListener("keydown", myKeyDown, false);
  window.addEventListener("keyup", myKeyUp, false);
  window.addEventListener("keypress", myKeyPress, false);

  var tick = function () 
  {
    currentAngle = animate(currentAngle);
    currentStep = animateStep(currentStep);
     gl.uniform4f(u_Lamp0Pos, lpx, lpy, lpz, 1.0);
  // Set its light output:  
  gl.uniform3f(u_Lamp0Amb,  avx, avy, avz);   // ambient
  gl.uniform3f(u_Lamp0Diff, dvx, dvy, dvz);   // diffuse
  gl.uniform3f(u_Lamp0Spec, svx, svy, svz); 

  gl.uniform4f(u_Lamp1Pos, xPos, yPos, zPos, 1.0);
  // Set its light output:  
  gl.uniform3f(u_Lamp1Amb,  0.4, 0.4, 0.4);   // ambient
  gl.uniform3f(u_Lamp1Diff, 1.0, 1.0, 1.0);   // diffuse
  gl.uniform3f(u_Lamp1Spec, 1.0, 1.0, 1.0); 
    draw(gl);
    requestAnimationFrame(tick, canvas);
  };
  tick();
}

function initVertexBuffers(gl) {


    makeGroundGrid();
    makeSc();
    makeStar();
    makePlanet();
    makeMoon();

    var mySiz = (gndVerts.length + scVerts.length + starVerts.length + planetVerts.length + moonVerts.length);

    var nn = mySiz / floatsPerVertex;

    var colorShapes = new Float32Array(mySiz);

    gndStart = 0;
    for (i = 0, j = 0; j < gndVerts.length; i++, j++) {
        colorShapes[i] = gndVerts[j];
    }
    scStart = 0;
    for (j = 0; j < scVerts.length; i++, j++) {
        colorShapes[i] = scVerts[j];
    }
    starStart = i;
    for (j = 0; j < starVerts.length; i++, j++) {
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
    FSIZE * 4)

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

var xcount = 100;
var ycount = 100;
var xymax = 50.0;
var xColr = new Float32Array([1.0, 1.0, 0.3]);
var yColr = new Float32Array([0.5, 1.0, 0.5]);
function makeGroundGrid() {
            
  var xgap = xymax/(xcount-1);
  var ygap = xymax/(ycount-1);
  for(v=0, j=0; v<2*xcount; v++, j+= floatsPerVertex) {
    if(v%2==0) {
      gndVerts[j  ] = -xymax + (v  )*xgap;  
      gndVerts[j+1] = -xymax;               
      gndVerts[j + 2] = 0.0;
      gndVerts[j + 3] = 1;                  
    }
    else {
      gndVerts[j  ] = -xymax + (v-1)*xgap;  
      gndVerts[j+1] = xymax;                
      gndVerts[j + 2] = 0.0;
      gndVerts[j + 3] = 1;                  
    }
    gndVerts[j+4] = xColr[0];     
    gndVerts[j+5] = xColr[1];     
    gndVerts[j+6] = xColr[2];     
    gndVerts[j+7] = 0;
    gndVerts[j+8] = 0;
    gndVerts[j+9] = 1;
  }
  for(v=0; v<2*ycount; v++, j+= floatsPerVertex) {
    if(v%2==0) {
      gndVerts[j  ] = -xymax;               
      gndVerts[j+1] = -xymax + (v  )*ygap;  
      gndVerts[j + 2] = 0.0;
      gndVerts[j + 3] = 1;                
    }
    else {          
      gndVerts[j  ] = xymax;                
      gndVerts[j+1] = -xymax + (v-1)*ygap;  
      gndVerts[j + 2] = 0.0;
      gndVerts[j + 3] = 1;               
    }
    gndVerts[j+4] = yColr[0];     
    gndVerts[j+5] = yColr[1];     
    gndVerts[j+6] = yColr[2];     
    gndVerts[j+7] = 0;
    gndVerts[j+8] = 0;
    gndVerts[j+9] = 1;
  }
}
function makeSc() {
    var wide = 10;
    scVerts = new Float32Array((6 * wide - 2) * floatsPerVertex);
    for (v = 1, j = 0; v < 2 * wide; v++, j += floatsPerVertex) {
        if (v % 2 == 0) {
            scVerts[j] = 0;
            scVerts[j + 1] = 0;
            scVerts[j + 2] = 1;
            scVerts[j + 3] = 1;
            scVerts[j + 4] = 1;
            scVerts[j + 5] = 1;
            scVerts[j + 6] = 0;
        }
        else {
            scVerts[j] = Math.cos(Math.PI * (v - 1) / wide);
            scVerts[j + 1] = Math.sin(Math.PI * (v - 1) / wide);
            scVerts[j + 2] = 1;
            scVerts[j + 3] = 1;
            scVerts[j + 4] = 1;
            scVerts[j + 5] = 1;
            scVerts[j + 6] = 0;
        }
        scVerts[j + 7] = Math.sin(Math.PI * (v-1) / wide);
        scVerts[j + 8] = Math.cos(Math.PI * (v-1) / wide);
        scVerts[j + 9] = 1;
    }
    for (v = 0; v < 2 * wide; v++, j += floatsPerVertex) {
        if (v % 4 == 0) {
            scVerts[j] = Math.cos(Math.PI * (v) / wide);
            scVerts[j + 1] = Math.sin(Math.PI * (v) / wide);
            scVerts[j + 2] = 1;
            scVerts[j + 3] = 1;
            scVerts[j + 4] = 1;
            scVerts[j + 5] = .5;
            scVerts[j + 6] = 0;
        }
        else if (v % 4 == 1) {
            scVerts[j] = Math.cos(Math.PI * (v) / wide);
            scVerts[j + 1] = Math.sin(Math.PI * (v) / wide);
            scVerts[j + 2] = 2;
            scVerts[j + 3] = 1;
            scVerts[j + 4] = 1;
            scVerts[j + 5] = 1;
            scVerts[j + 6] = 1;
        }
        else if (v % 4 == 3) {
            scVerts[j] = Math.cos(Math.PI * (v) / wide);
            scVerts[j + 1] = Math.sin(Math.PI * (v) / wide);
            scVerts[j + 2] = 2;
            scVerts[j + 3] = 1;
            scVerts[j + 4] = 1;
            scVerts[j + 5] = 1;
            scVerts[j + 6] = 1;
        }
        else {
            scVerts[j] = Math.cos(Math.PI * (v) / wide);
            scVerts[j + 1] = Math.sin(Math.PI * (v) / wide);
            scVerts[j + 2] = 1;
            scVerts[j + 3] = 1;
            scVerts[j + 4] = 1;
            scVerts[j + 5] = 1;
            scVerts[j + 6] = 0;
        }
        scVerts[j + 7] = Math.cos(Math.PI * (v) / wide);
        scVerts[j + 8] = Math.sin(Math.PI * (v) / wide);
        scVerts[j + 9] = 2;

    }
    for (v = 0; v < 2 * wide; v++, j += floatsPerVertex) {
        if (v % 4 == 0) {
            scVerts[j] = Math.cos(Math.PI * (v) / wide);
            scVerts[j + 1] = Math.sin(Math.PI * (v) / wide);
            scVerts[j + 2] = 1;
            scVerts[j + 3] = 1;
            scVerts[j + 4] = 1;
            scVerts[j + 5] = .5;
            scVerts[j + 6] = 0;
        }
        else if (v % 4 == 1) {
            scVerts[j] = Math.cos(Math.PI * (v) / wide);
            scVerts[j + 1] = Math.sin(Math.PI * (v) / wide);
            scVerts[j + 2] = 0;
            scVerts[j + 3] = 1;
            scVerts[j + 4] = 1;
            scVerts[j + 5] = 1;
            scVerts[j + 6] = 1;
        }
        else if (v % 4 == 3) {
            scVerts[j] = Math.cos(Math.PI * (v) / wide);
            scVerts[j + 1] = Math.sin(Math.PI * (v) / wide);
            scVerts[j + 2] = 0;
            scVerts[j + 3] = 1;
            scVerts[j + 4] = 1;
            scVerts[j + 5] = 1;
            scVerts[j + 6] = 1;
        }
        else {
            scVerts[j] = Math.cos(Math.PI * (v) / wide);
            scVerts[j + 1] = Math.sin(Math.PI * (v) / wide);
            scVerts[j + 2] = 1;
            scVerts[j + 3] = 1;
            scVerts[j + 4] = 1;
            scVerts[j + 5] = 1;
            scVerts[j + 6] = 0;
        }
        scVerts[j + 7] = Math.cos(Math.PI * (v) / wide);
        scVerts[j + 8] = Math.sin(Math.PI * (v) / wide);
        scVerts[j + 9] = 0;

    }
}

function makeStar() {
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
        starVerts[j + 7] = Math.sin(Math.PI * (v-1) / wide);
        starVerts[j + 8] = Math.cos(Math.PI * (v-1) / wide);
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
                planetVerts[j + 7] = sine0 * Math.cos(Math.PI * (v) / diskVerts);
                planetVerts[j + 8] = sine0 * Math.sin(Math.PI * (v) / diskVerts);
                planetVerts[j + 9] = cosine0;
            }
            else {
                planetVerts[j] = sine1 * Math.cos(Math.PI * (v - 1) / diskVerts);
                planetVerts[j + 1] = sine1 * Math.sin(Math.PI * (v - 1) / diskVerts);
                planetVerts[j + 2] = cosine1;
                planetVerts[j + 3] = 1.0;
                planetVerts[j + 7] = sine1 * Math.cos(Math.PI * (v-1) / diskVerts);
                planetVerts[j + 8] = sine1 * Math.sin(Math.PI * (v-1) / diskVerts);
                planetVerts[j + 9] = cosine1;
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
function makeMoon() {

    moonVerts = new Float32Array([

     1.0, 1.0, 1.0,1,1,1,1,0.0, 0.0, 1.0,  -1.0, 1.0, 1.0,1,0.7,0.7,0.7,0.0, 0.0, 1.0,  -1.0,-1.0, 1.0,1,1,1,1,0.0, 0.0, 1.0,   1.0,-1.0, 1.0,1,0.7,0.7,0.7,0.0, 0.0, 1.0,  1,1,1,1,1,1,1,0,0,1,// v0-v1-v2-v3 front
    1.0,-1.0, 1.0,1,0.7,0.7,0.7,1.0, 0.0, 0.0,    1.0,-1.0,-1.0,1,1,1,1,1.0, 0.0, 0.0,   1.0, 1.0,-1.0,1,0.7,0.7,0.7,1.0, 0.0, 0.0,  1.0, 1.0, 1.0,1,1,1,1,1.0, 0.0, 0.0,   1,-1,1,1,.7,.7,.7,1,0,0,// v0-v3-v4-v5 right
     1.0, 1.0, 1.0,1,1,1,1,0.0, 1.0, 0.0,   1.0, 1.0,-1.0,1,0.7,0.7,0.7,0.0, 1.0, 0.0,   -1.0, 1.0,-1.0,1,1,1,1,0.0, 1.0, 0.0,  -1.0, 1.0, 1.0,1,0.7,0.7,0.7,0.0, 1.0, 0.0,  1.0, 1.0, 1.0,1,1,1,1,0.0, 1.0, 0.0, // v0-v5-v6-v1 up
    -1.0, 1.0, 1.0,1,1,1,1,-1.0, 0.0, 0.0,  -1.0, 1.0,-1.0,1,0.7,0.7,0.7,-1.0, 0.0, 0.0,  -1.0,-1.0,-1.0,1, 1,1,1,-1.0, 0.0, 0.0, -1.0,-1.0, 1.0,1,0.7,0.7,0.7,-1.0, 0.0, 0.0, -1.0, 1.0, 1.0,1,1,1,1,-1.0, 0.0, 0.0, // v1-v6-v7-v2 left
    -1.0,-1.0, 1.0,1,0.7,0.7,0.7,0.0,-1.0, 0.0, -1.0,-1.0,-1.0,1,1,1,1,0.0,-1.0, 0.0,   1.0,-1.0,-1.0,1,0.7,0.7,0.7,0.0,-1.0, 0.0,    1.0,-1.0, 1.0,1, 1,1,1,0.0,-1.0, 0.0,   //-1.0,-1.0, 1.0,1,0.7,0.7,0.7,0.0,-1.0,// v7-v4-v3-v2 down
     1.0,-1.0,-1.0,1,1,1,1,0.0, 0.0,-1.0,  -1.0,-1.0,-1.0,1,0.7,0.7,0.7,0.0, 0.0,-1.0,   -1.0, 1.0,-1.0,1, 1,1,1,0.0, 0.0,-1.0,     1.0, 1.0,-1.0,1,0.7,0.7,0.7,0.0, 0.0,-1.0,  //1.0,-1.0,-1.0,1,1,1,1,0.0, 0.0,-1.0, // v4-v7-v6-v5 back
    ]);
}
function draw(gl) 
{

  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  gl.viewport(0,
              0,
              canvas.width,
              canvas.height); 
  var vpAspect = (canvas.width) /
                (canvas.height);
  mvpMatrix.setPerspective(40,
                            vpAspect,
                            1, 20);
  mvpMatrix.lookAt(xPos, yPos, zPos,
            xAt, yAt, zAt,
            xUp, yUp, zUp);
  pushMatrix(mvpMatrix);
  pushMatrix(modelMatrix);
  modelMatrix.setTranslate(0, 0, 0);
  gl.uniform4f(u_eyePosWorld, xAt, yAt, zAt, 1);

    gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
    gl.uniformMatrix4fv(u_NormalMatrix, false, normalMatrix.elements);

  mvpMatrix.multiply(modelMatrix);

  gl.uniformMatrix4fv(u_MvpMatrix, false, mvpMatrix.elements);


  gl.uniform3f(u_Ke, 0.0, 0.0, 0.0);        // Ke emissive
  gl.uniform3f(u_Ka, 0.0215, 0.1745, 0.0215);        // Ka ambient
  gl.uniform3f(u_Kd, 0.07568, 0.61424, 0.07568);        // Kd diffuse
  gl.uniform3f(u_Ks, 0.633, 0.727811, 0.633);  
  gl.uniform1f(u_Kshiny, 76.8);


  gl.drawArrays(gl.LINES, gndStart/ floatsPerVertex, gndVerts.length / floatsPerVertex);

  modelMatrix.setRotate(90, 0, 0, 1);
  modelMatrix.rotate(currentAngle, 0, 0, 1);
  gl.uniform4f(u_eyePosWorld, xAt, yAt, zAt, 1);
  normalMatrix.setInverseOf(modelMatrix);
    normalMatrix.transpose();
    gl.uniformMatrix4fv(u_NormalMatrix, false, normalMatrix.elements);
  mvpMatrix.multiply(modelMatrix);
  gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
 gl.uniformMatrix4fv(u_MvpMatrix, false, mvpMatrix.elements);

  gl.uniform3f(u_Ke, 0.0, 0.0, 0.0);        // Ke emissive
  gl.uniform3f(u_Ka, 0.24725, 0.1995, 0.0745);        // Ka ambient
  gl.uniform3f(u_Kd, 0.75164, 0.60648, 0.22648);        // Kd diffuse
  gl.uniform3f(u_Ks, 0.628281, 0.555802, 0.3366065);  
  gl.uniform1f(u_Kshiny, 83.2);

  gl.drawArrays(gl.TRIANGLE_STRIP, starStart/ floatsPerVertex, starVerts.length / floatsPerVertex);

  modelMatrix.rotate(90, 0, 0, 1);
  modelMatrix.translate(2, 0, 1);
  modelMatrix.rotate(currentAngle, 0, 0, 1);
  modelMatrix.scale(.28, .28, .28);
  gl.uniform4f(u_eyePosWorld, xAt, yAt, zAt, 1);

  normalMatrix.setInverseOf(modelMatrix);
    normalMatrix.transpose();
  mvpMatrix.multiply(modelMatrix);
  gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
  gl.uniformMatrix4fv(u_MvpMatrix, false, mvpMatrix.elements);


    gl.uniform3f(u_Ke, 0.0, 0.0, 0.0);        // Ke emissive
  gl.uniform3f(u_Ka, 0.1, 0.18725, 0.1745);        // Ka ambient
  gl.uniform3f(u_Kd, 0.396, 0.74151, 0.69102);        // Kd diffuse
  gl.uniform3f(u_Ks, 0.297254, 0.30829, 0.306678);  
  gl.uniform1f(u_Kshiny, 12.8);
  gl.uniformMatrix4fv(u_NormalMatrix, false, normalMatrix.elements);

  gl.drawArrays(gl.LINES, planetStart/ floatsPerVertex, planetVerts.length / floatsPerVertex);

  modelMatrix.translate(2, 0, .9);
  modelMatrix.rotate(currentAngle, 0, 0, 1);
  modelMatrix.scale(.7, .7, .7);
  gl.uniform4f(u_eyePosWorld, xAt, yAt, zAt, 1);
  normalMatrix.setInverseOf(modelMatrix);
    normalMatrix.transpose();
  mvpMatrix.multiply(modelMatrix);
  gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
  gl.uniformMatrix4fv(u_MvpMatrix, false, mvpMatrix.elements);

  gl.uniform3f(u_Ke, 0.0, 0.0, 0.0);        // Ke emissive
  gl.uniform3f(u_Ka, 0.25, 0.20725, 0.20725);        // Ka ambient
  gl.uniform3f(u_Kd, 1, 0.829, 0.829);        // Kd diffuse
  gl.uniform3f(u_Ks, 0.296648, 0.296648, 0.296648);  
  gl.uniform1f(u_Kshiny, 11.264);

  gl.uniformMatrix4fv(u_NormalMatrix, false, normalMatrix.elements);

  gl.drawArrays(gl.TRIANGLE_STRIPS, planetStart/ floatsPerVertex, planetVerts.length / floatsPerVertex);

  modelMatrix = popMatrix();
  mvpMatrix = popMatrix();

  pushMatrix(modelMatrix);
  pushMatrix(mvpMatrix);

  modelMatrix.setRotate(90, 1, 0, 0);
  modelMatrix.translate( 1, 3, 2);
  modelMatrix.rotate(currentAngle, 0, 0, 1);
  gl.uniform4f(u_eyePosWorld, xAt, yAt, zAt, 1);
  mvpMatrix.multiply(modelMatrix);

  gl.uniformMatrix4fv(u_MvpMatrix, false, mvpMatrix.elements);
  gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
  normalMatrix.setInverseOf(modelMatrix);
    normalMatrix.transpose();
    gl.uniformMatrix4fv(u_NormalMatrix, false, normalMatrix.elements); 

    gl.uniform3f(u_Ke, 0.0, 0.0, 0.0);        // Ke emissive
  gl.uniform3f(u_Ka, 0.25, 0.148, 0.06475);        // Ka ambient
  gl.uniform3f(u_Kd, .4, 0.2368, 0.1036);        // Kd diffuse
  gl.uniform3f(u_Ks, 0.774597, 0.458561, 0.200621);  
  gl.uniform1f(u_Kshiny, 76.8);

  gl.drawArrays(gl.TRIANGLE_STRIP, starStart/ floatsPerVertex, starVerts.length / floatsPerVertex);
  modelMatrix.setTranslate(0, 0, 1);
  modelMatrix.rotate(currentAngle, 0, 1, 0);
  modelMatrix.scale(.1, 2, .1);
  gl.uniform4f(u_eyePosWorld, xAt, yAt, zAt, 1);
  mvpMatrix.multiply(modelMatrix);

  gl.uniformMatrix4fv(u_MvpMatrix, false, mvpMatrix.elements);
  normalMatrix.setInverseOf(modelMatrix);
    normalMatrix.transpose();
    gl.uniformMatrix4fv(u_NormalMatrix, false, normalMatrix.elements); 

  gl.drawArrays(gl.LINES, planetStart/ floatsPerVertex, planetVerts.length / floatsPerVertex);

  pushMatrix(modelMatrix);
  pushMatrix(mvpMatrix);

  modelMatrix.scale(10, .1, 40);
    modelMatrix.translate(-.3,4,-.2);
  mvpMatrix.multiply(modelMatrix);

  gl.uniformMatrix4fv(u_MvpMatrix, false, mvpMatrix.elements);
  gl.uniform4f(u_eyePosWorld, xAt, yAt, zAt, 1);
  normalMatrix.setInverseOf(modelMatrix);
    normalMatrix.transpose();
    gl.uniformMatrix4fv(u_NormalMatrix, false, normalMatrix.elements);

    gl.uniform3f(u_Ke, 0.0, 0.0, 0.0);        // Ke emissive
  gl.uniform3f(u_Ka, 0.05, 0.05, 0.05);        // Ka ambient
  gl.uniform3f(u_Kd, 0.0, 0.2, 0.6);        // Kd diffuse
  gl.uniform3f(u_Ks, 0.1, 0.2, 0.3);  
  gl.uniform1f(u_Kshiny, 5);

    gl.drawArrays(gl.TRIANGLE_STRIP, moonStart/ floatsPerVertex, moonVerts.length / floatsPerVertex);

mvpMatrix = popMatrix();
modelMatrix = popMatrix();

  modelMatrix.scale(10, .1, 40);
  modelMatrix.translate(-.3,-4,-.2);
  gl.uniform4f(u_eyePosWorld, xAt, yAt, zAt, 1);
  mvpMatrix.multiply(modelMatrix);

  gl.uniformMatrix4fv(u_MvpMatrix, false, mvpMatrix.elements);
  normalMatrix.setInverseOf(modelMatrix);
    normalMatrix.transpose();
    gl.uniformMatrix4fv(u_NormalMatrix, false, normalMatrix.elements);

    gl.drawArrays(gl.TRIANGLE_STRIP, moonStart/ floatsPerVertex, moonVerts.length / floatsPerVertex);

mvpMatrix = popMatrix();
modelMatrix = popMatrix();

modelMatrix.setRotate(0, 0, 0, 1);
modelMatrix.translate(2, 3, currentStep);
modelMatrix.scale(.37,.37,.37);
gl.uniform4f(u_eyePosWorld, xAt, yAt, zAt, 1);
mvpMatrix.multiply(modelMatrix);

  gl.uniformMatrix4fv(u_MvpMatrix, false, mvpMatrix.elements);
  normalMatrix.setInverseOf(modelMatrix);
    normalMatrix.transpose();
    gl.uniformMatrix4fv(u_NormalMatrix, false, normalMatrix.elements);

    gl.uniform3f(u_Ke, 0.0, 0.0, 0.0);        // Ke emissive
  gl.uniform3f(u_Ka, 0.05, 0.05, 0.05);        // Ka ambient
  gl.uniform3f(u_Kd, 0.0, 0.6, 0.0);        // Kd diffuse
  gl.uniform3f(u_Ks, 0.2, 0.27, 0.1);  
  gl.uniform1f(u_Kshiny, 78);

    gl.drawArrays(gl.TRIANGLE_STRIP, planetStart/ floatsPerVertex, planetVerts.length / floatsPerVertex);

modelMatrix.rotate(0, 0, 0, -1);
modelMatrix.translate(0, -10, 8 + currentStep);
gl.uniform4f(u_eyePosWorld, xAt, yAt, zAt, 1);
mvpMatrix.multiply(modelMatrix);

  gl.uniformMatrix4fv(u_MvpMatrix, false, mvpMatrix.elements);
  normalMatrix.setInverseOf(modelMatrix);
    normalMatrix.transpose();
    gl.uniformMatrix4fv(u_NormalMatrix, false, normalMatrix.elements);

    gl.drawArrays(gl.TRIANGLE_STRIP, planetStart/ floatsPerVertex, planetVerts.length / floatsPerVertex);

    modelMatrix.rotate(90,0,0,-1);
    modelMatrix.translate(0, 10, 8 + currentStep);
gl.uniform4f(u_eyePosWorld, xAt, yAt, zAt, 1);
mvpMatrix.multiply(modelMatrix);

  gl.uniformMatrix4fv(u_MvpMatrix, false, mvpMatrix.elements);
  normalMatrix.setInverseOf(modelMatrix);
    normalMatrix.transpose();
    gl.uniformMatrix4fv(u_NormalMatrix, false, normalMatrix.elements);

    gl.drawArrays(gl.TRIANGLE_STRIP, planetStart/ floatsPerVertex, planetVerts.length / floatsPerVertex);
}

var g_last = Date.now();

function animate(angle) 
{
    var now = Date.now();
    var elapsed = now - g_last;
    g_last = now;

    var newAngle = angle + (ANGLE_STEP * elapsed) / 1000.0;
    return newAngle %= 360;
}

function animateStep(step)
{
    var now = Date.now();
    var elapsed = now - g_last;
    g_last = now;
    var newStep;
    if(currentStep > -.9)
    {
      stepCheck = 1; 
    }
    else if(currentStep < -2)
    {
      stepCheck = 0;
    }
    else
    {
    }
    if (stepCheck ==1)
    {
      newStep = step - MOVE_STEP;
    }
    else{
      newStep = step + MOVE_STEP;
    }
    return newStep;
}

function myKeyDown(ev) {
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
} 

function myKeyPress(ev) {
}

function toggleAmb() {
  var i = document.getElementById('amb').value;
    avx = i;
    avy = i;
    avz = i;
    console.log(i);
}
function toggleDiff(){
  var i = document.getElementById('diff').value;
    dvx = i;
    dvy = i;
    dvz = i;
    console.log(i);
}
function toggleSpec(){
  var i = document.getElementById('spec').value;
    svx = i;
    svy = i;
    svz = i;
    console.log(i);
}

function togglePos(){
  var i = document.getElementById('lampX').value;
  var j = document.getElementById('lampY').value;
  var k = document.getElementById('lampZ').value;

  lpx = i;
  lpy = j;
  lpz = k;

  console.log(i);
  console.log(j);
  console.log(k);
}
function winResize() 
{

  var nuCanvas = document.getElementById('webgl');
  var nuGL = getWebGLContext(nuCanvas);         

  console.log('nuCanvas width,height=', nuCanvas.width, nuCanvas.height);   
  console.log('Browser window: innerWidth,innerHeight=', 
                                innerWidth, innerHeight);

  nuCanvas.width = innerWidth;
  nuCanvas.height = innerHeight*3/4;
  draw(nuGL); 
     
}