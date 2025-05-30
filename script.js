"use strict";


// canvas 
function resizeCanvas() {
  // Get actual display size
  const displayWidth = window.innerWidth;
  const displayHeight = window.innerHeight;
  
  // Set canvas display size
  canvas.style.width = displayWidth + 'px';
  canvas.style.height = displayHeight + 'px';
  
  // Set canvas internal resolution
  canvas.width = displayWidth;
  canvas.height = displayHeight;
  
  // Update WebGL viewport
  gl.viewport(0, 0, displayWidth, displayHeight);
}


//  globals & UI state  

let canvas, gl, program;
let speedFactor = 1, showRings = true;
let tumbleX = -30, tumbleY = 20, zoomScale = 1.0;
let a0 = 0, a1 = 0, a2 = 0, a3 = 0, a4 = 0, a5 = 0, a6 = 0, a7 = 0;  // planet angles (Mercury through Neptune)
let moonAngle = 0;                    // Earth's moon angle
let mars1Angle = 0, mars2Angle = 0;   // Mars' two moons angles

// geometry 
let points=[], colors=[], texCoords=[];
let offSF,nSF, offSun,nSun, 
    off0,nP0, off1,nP1, off2,nP2, off3,nP3, off4,nP4, off5,nP5, off6,nP6, off7,nP7,
    offR0,nR0, offR1,nR1, offR2,nR2, offR3,nR3, offR4,nR4, offR5,nR5, offR6,nR6, offR7,nR7,
    offSaturnRing,nSaturnRing,
    offMoon,nMoon, offMars1,nMars1, offMars2,nMars2;

// textures  
let mercuryTex, venusTex, earthTex, marsTex, jupiterTex, saturnTex, uranusTex, neptuneTex, sunTex;

// sizes & orbital radii  
const SUN_SZ = 0.4;

// Planet sizes (relative to sun)
const MERCURY_SZ = 0.08, VENUS_SZ = 0.18, EARTH_SZ = 0.20, MARS_SZ = 0.15;
const JUPITER_SZ = 0.35, SATURN_SZ = 0.30, URANUS_SZ = 0.22, NEPTUNE_SZ = 0.21;

// Orbital radii from sun
const R0 = 1.2, R1 = 1.6, R2 = 2.0, R3 = 2.6, R4 = 4.2, R5 = 5.8, R6 = 7.2, R7 = 8.5;

// Orbital speeds (Mercury fastest, Neptune slowest)
const SPD0 = 2.4, SPD1 = 1.8, SPD2 = 1.0, SPD3 = 0.5, SPD4 = 0.25, SPD5 = 0.15, SPD6 = 0.08, SPD7 = 0.05;

// Moon parameters
const MOON_SZ = 0.05;           // Earth's moon size
const MOON_ORBIT = 0.3;         // Moon's orbital radius around Earth
const MOON_SPD = 8.0;           // Moon's orbital speed

const MARS_MOON_SZ = 0.03;      // Mars' moons size
const MARS_MOON1_ORBIT = 0.2;   // Phobos orbital radius
const MARS_MOON2_ORBIT = 0.35;  // Deimos orbital radius  
const MARS_MOON1_SPD = 12.0;    // Phobos speed 
const MARS_MOON2_SPD = 6.0;     // Deimos speed 


// WebGL
window.onload = () => {
  
  canvas = document.getElementById("gl-canvas");
  gl     = canvas.getContext("webgl2");
  if (!gl) { alert("WebGL 2 not supported"); return; }
  

  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);
  
  gl.clearColor(0,0,0,1);
  gl.enable(gl.DEPTH_TEST);
  
  // Enable blending for rings with transparency
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  
  // Enable point size control for stars
  gl.enable(gl.PROGRAM_POINT_SIZE || 0x8642);


  document.getElementById("speedSlider").oninput = e=>{
    speedFactor = +e.target.value;
    document.getElementById("speedLabel").textContent = speedFactor.toFixed(1)+"×";
  };
  document.getElementById("ringToggle").onchange = e=> showRings = e.target.checked;

  // shader
  program = initShaders(gl,"vertex-shader","fragment-shader");
  gl.useProgram(program);

  //textures  
  mercuryTex = loadTexture("mercury.jpg");
  venusTex   = loadTexture("venus.jpg");
  earthTex   = loadTexture("earth.jpg");
  marsTex    = loadTexture("mars.jpg");
  jupiterTex = loadTexture("jupiter.jpg");
  saturnTex  = loadTexture("saturn.jpg");
  uranusTex  = loadTexture("uranus.jpg");
  neptuneTex = loadTexture("neptune.jpg");
  sunTex     = loadTexture("sun.jpg");
  gl.uniform1i(gl.getUniformLocation(program,"uTexture"),0);

  // geometry  
  buildScene();

  // interaction  
  initMouseDrag();
  initWheelZoom();

  requestAnimationFrame(render);
};


//  helpers  for texture
function loadTexture(url){
  const tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D,tex);
  gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,1,1,0,gl.RGBA,gl.UNSIGNED_BYTE,
                new Uint8Array([255,255,255,255]));           // placeholder
  const img = new Image();
  img.onload = ()=>{
    gl.bindTexture(gl.TEXTURE_2D,tex);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);
    gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,img);
    gl.generateMipmap(gl.TEXTURE_2D);
  };
  img.src = url;
  return tex;
}

// star field
function starfield(N,dist){
  const v=[], c=[];
  for(let i=0;i<N;i++){
    const x = (Math.random()-0.5) * dist * 2;
    const y = (Math.random()-0.5) * dist * 2;
    const z = (Math.random()-0.5) * dist * 2;
    
    // Single vertex per star
    v.push([x,y,z,1]);
    
    const b = 0.4+Math.random()*0.3,
          tint = Math.random();
    const col = tint<0.7 ? [b,b,b,1] :
                tint<0.85? [b*0.8,b*0.9,b,1] : [b,b*0.8,b*0.6,1];
    c.push(col);
  }
  return {v,c};
}

// Saturn's rings
function saturnRings(innerRadius, outerRadius, seg=100){
  const v=[], c=[];
  const y = 0.0; // Same level as planets
  
  for(let i=0;i<seg;i++){
    const a1=i/seg*2*Math.PI, a2=(i+1)/seg*2*Math.PI;
    const ix1=Math.cos(a1)*innerRadius, iz1=Math.sin(a1)*innerRadius,
          ox1=Math.cos(a1)*outerRadius, oz1=Math.sin(a1)*outerRadius,
          ix2=Math.cos(a2)*innerRadius, iz2=Math.sin(a2)*innerRadius,
          ox2=Math.cos(a2)*outerRadius, oz2=Math.sin(a2)*outerRadius;
    
    // Creates ring face
    v.push([ix1,y,iz1,1],[ox1,y,oz1,1],[ix2,y,iz2,1],
           [ox1,y,oz1,1],[ox2,y,oz2,1],[ix2,y,iz2,1]);
    
    // Saturn ring colors
    for(let j=0;j<6;j++) c.push([0.8,0.7,0.5,0.6]);
  }
  return {v,c};
}

// simple flat ring
function ring(radius,t=0.01,seg=120){
  const v=[], c=[];
  const inner=radius-t, outer=radius+t;
  const y = -0.1; // Same Y level as sun and planets
  
  for(let i=0;i<seg;i++){
    const a1=i/seg*2*Math.PI, a2=(i+1)/seg*2*Math.PI;
    const ix1=Math.cos(a1)*inner, iz1=Math.sin(a1)*inner,
          ox1=Math.cos(a1)*outer, oz1=Math.sin(a1)*outer,
          ix2=Math.cos(a2)*inner, iz2=Math.sin(a2)*inner,
          ox2=Math.cos(a2)*outer, oz2=Math.sin(a2)*outer;
    
    // single flat face only  
    v.push([ix1,y,iz1,1],[ox1,y,oz1,1],[ix2,y,iz2,1],
           [ox1,y,oz1,1],[ox2,y,oz2,1],[ix2,y,iz2,1]);
    
    for(let j=0;j<6;j++) c.push([0.6,0.6,0.8,0.3]);
  }
  return {v,c};
}

// builds all geometry & GPU buffers
function buildScene(){
  const sf   = starfield(18000,22); 
  const sun  = sphere(6);
  
  // All planets
  const mercury = sphere(6), venus = sphere(6), earth = sphere(6), mars = sphere(6);
  const jupiter = sphere(6), saturn = sphere(6), uranus = sphere(6), neptune = sphere(6);
  
  // Orbital rings for all planets
  const r0 = ring(R0), r1 = ring(R1), r2 = ring(R2), r3 = ring(R3);
  const r4 = ring(R4), r5 = ring(R5), r6 = ring(R6), r7 = ring(R7);
  
  // Saturn's rings
  const saturnRing = saturnRings(SUN_SZ*SATURN_SZ*1.5, SUN_SZ*SATURN_SZ*2.5);
  
  // Creates moons
  const moon = sphere(4);      // Earth's moon
  const mars1 = sphere(3);     // Mars moon 1 (Phobos)
  const mars2 = sphere(3);     // Mars moon 2 (Deimos)

  // Sun setup
  sun.scale (SUN_SZ,SUN_SZ,SUN_SZ).translate(0,-0.1,0);
  sun.TriangleVertexColors = sun.TriangleVertexColors.map(()=>[1,1,1,1]);

  // Planet scaling and coloring
  mercury.scale(SUN_SZ*MERCURY_SZ,SUN_SZ*MERCURY_SZ,SUN_SZ*MERCURY_SZ);
  mercury.TriangleVertexColors = mercury.TriangleVertexColors.map(()=>[0.7,0.7,0.7,1]); // Gray

  venus.scale(SUN_SZ*VENUS_SZ,SUN_SZ*VENUS_SZ,SUN_SZ*VENUS_SZ);
  venus.TriangleVertexColors = venus.TriangleVertexColors.map(()=>[1,0.8,0.4,1]); // Yellowish

  earth.scale(SUN_SZ*EARTH_SZ,SUN_SZ*EARTH_SZ,SUN_SZ*EARTH_SZ);
  earth.TriangleVertexColors = earth.TriangleVertexColors.map(()=>[0,0.4,1,1]); // Blue

  mars.scale(SUN_SZ*MARS_SZ,SUN_SZ*MARS_SZ,SUN_SZ*MARS_SZ);
  mars.TriangleVertexColors = mars.TriangleVertexColors.map(()=>[0.8,0.3,0.2,1]); // Red

  jupiter.scale(SUN_SZ*JUPITER_SZ,SUN_SZ*JUPITER_SZ,SUN_SZ*JUPITER_SZ);
  jupiter.TriangleVertexColors = jupiter.TriangleVertexColors.map(()=>[0.9,0.6,0.3,1]); // Orange

  saturn.scale(SUN_SZ*SATURN_SZ,SUN_SZ*SATURN_SZ,SUN_SZ*SATURN_SZ);
  saturn.TriangleVertexColors = saturn.TriangleVertexColors.map(()=>[0.9,0.8,0.5,1]); // Pale yellow

  uranus.scale(SUN_SZ*URANUS_SZ,SUN_SZ*URANUS_SZ,SUN_SZ*URANUS_SZ);
  uranus.TriangleVertexColors = uranus.TriangleVertexColors.map(()=>[0.3,0.8,0.8,1]); // Cyan

  neptune.scale(SUN_SZ*NEPTUNE_SZ,SUN_SZ*NEPTUNE_SZ,SUN_SZ*NEPTUNE_SZ);
  neptune.TriangleVertexColors = neptune.TriangleVertexColors.map(()=>[0.2,0.3,0.9,1]); // Deep blue

  // Moon scaling and coloring
  moon.scale(SUN_SZ*MOON_SZ,SUN_SZ*MOON_SZ,SUN_SZ*MOON_SZ);
  moon.TriangleVertexColors = moon.TriangleVertexColors.map(()=>[0.7,0.7,0.7,1]); // Gray moon

  mars1.scale(SUN_SZ*MARS_MOON_SZ,SUN_SZ*MARS_MOON_SZ,SUN_SZ*MARS_MOON_SZ);
  mars1.TriangleVertexColors = mars1.TriangleVertexColors.map(()=>[0.6,0.5,0.4,1]); // Brown-ish

  mars2.scale(SUN_SZ*MARS_MOON_SZ,SUN_SZ*MARS_MOON_SZ,SUN_SZ*MARS_MOON_SZ);
  mars2.TriangleVertexColors = mars2.TriangleVertexColors.map(()=>[0.5,0.4,0.3,1]); // Darker brown

  // concat everything in exact draw order  
  points = sf.v
          .concat(sun.TriangleVertices)
          .concat(mercury.TriangleVertices, venus.TriangleVertices, earth.TriangleVertices, mars.TriangleVertices)
          .concat(jupiter.TriangleVertices, saturn.TriangleVertices, uranus.TriangleVertices, neptune.TriangleVertices)
          .concat(r0.v, r1.v, r2.v, r3.v, r4.v, r5.v, r6.v, r7.v)
          .concat(saturnRing.v)
          .concat(moon.TriangleVertices, mars1.TriangleVertices, mars2.TriangleVertices);

  colors = sf.c
          .concat(sun.TriangleVertexColors)
          .concat(mercury.TriangleVertexColors, venus.TriangleVertexColors, earth.TriangleVertexColors, mars.TriangleVertexColors)
          .concat(jupiter.TriangleVertexColors, saturn.TriangleVertexColors, uranus.TriangleVertexColors, neptune.TriangleVertexColors)
          .concat(r0.c, r1.c, r2.c, r3.c, r4.c, r5.c, r6.c, r7.c)
          .concat(saturnRing.c)
          .concat(moon.TriangleVertexColors, mars1.TriangleVertexColors, mars2.TriangleVertexColors);

  // counts and offsets  
  nSF   = sf.v.length;                   offSF   = 0;
  nSun  = sun.TriangleVertices.length;   offSun  = offSF+nSF;
  nP0   = mercury.TriangleVertices.length; off0  = offSun+nSun;
  nP1   = venus.TriangleVertices.length;   off1  = off0+nP0;
  nP2   = earth.TriangleVertices.length;   off2  = off1+nP1;
  nP3   = mars.TriangleVertices.length;    off3  = off2+nP2;
  nP4   = jupiter.TriangleVertices.length; off4  = off3+nP3;
  nP5   = saturn.TriangleVertices.length;  off5  = off4+nP4;
  nP6   = uranus.TriangleVertices.length;  off6  = off5+nP5;
  nP7   = neptune.TriangleVertices.length; off7  = off6+nP6;
  nR0   = r0.v.length;                     offR0 = off7+nP7;
  nR1   = r1.v.length;                     offR1 = offR0+nR0;
  nR2   = r2.v.length;                     offR2 = offR1+nR1;
  nR3   = r3.v.length;                     offR3 = offR2+nR2;
  nR4   = r4.v.length;                     offR4 = offR3+nR3;
  nR5   = r5.v.length;                     offR5 = offR4+nR4;
  nR6   = r6.v.length;                     offR6 = offR5+nR5;
  nR7   = r7.v.length;                     offR7 = offR6+nR6;
  nSaturnRing = saturnRing.v.length;       offSaturnRing = offR7+nR7;
  nMoon = moon.TriangleVertices.length;    offMoon = offSaturnRing+nSaturnRing;
  nMars1 = mars1.TriangleVertices.length;  offMars1 = offMoon+nMoon;
  nMars2 = mars2.TriangleVertices.length;  offMars2 = offMars1+nMars1;

  // texture coordinates
  for(let i=0;i<nSF;i++) texCoords.push([0,0]);
  texCoords = texCoords.concat(
    sun.TextureCoordinates,
    mercury.TextureCoordinates, venus.TextureCoordinates, earth.TextureCoordinates, mars.TextureCoordinates,
    jupiter.TextureCoordinates, saturn.TextureCoordinates, uranus.TextureCoordinates, neptune.TextureCoordinates
  );

  // Rings and moons
  for(let i=0;i<nR0+nR1+nR2+nR3+nR4+nR5+nR6+nR7+nSaturnRing+nMoon+nMars1+nMars2;i++) texCoords.push([0,0]);

  //  gpu buffer
  bufferAttrib(points , "aPosition", 4);
  bufferAttrib(colors , "aColor"   , 4);
  bufferAttrib(texCoords,"aTexCoord",2);
}

function bufferAttrib(data,attr,size){
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER,buf);
  gl.bufferData(gl.ARRAY_BUFFER,flatten(data),gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(program,attr);
  gl.vertexAttribPointer(loc,size,gl.FLOAT,false,0,0);
  gl.enableVertexAttribArray(loc);
}


// render loop
function render(){
  gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);

  // updates planet angles  
  a0 = (a0+SPD0*speedFactor)%360;  // Mercury
  a1 = (a1+SPD1*speedFactor)%360;  // Venus
  a2 = (a2+SPD2*speedFactor)%360;  // Earth
  a3 = (a3+SPD3*speedFactor)%360;  // Mars
  a4 = (a4+SPD4*speedFactor)%360;  // Jupiter
  a5 = (a5+SPD5*speedFactor)%360;  // Saturn
  a6 = (a6+SPD6*speedFactor)%360;  // Uranus
  a7 = (a7+SPD7*speedFactor)%360;  // Neptune
  
  // updates moon angles
  moonAngle = (moonAngle + MOON_SPD*speedFactor)%360;
  mars1Angle = (mars1Angle + MARS_MOON1_SPD*speedFactor)%360;
  mars2Angle = (mars2Angle + MARS_MOON2_SPD*speedFactor)%360;

  // base camera matrix
  const base = mult(
      translate(0, 0, -12 / zoomScale),  // Back to 8 planets view
      mult(rotate(tumbleX,[1,0,0]), rotate(tumbleY,[0,1,0]))
  );

  // projection - perspective 
  const aspectRatio = canvas.width / canvas.height;
  gl.uniformMatrix4fv(
    gl.getUniformLocation(program,"projectionMatrix"),
    false, flatten(perspective(45, aspectRatio, 0.1, 100))
  );

  //  draws star field   
  gl.uniform1i(gl.getUniformLocation(program,"uUseTexture"),0);
  gl.uniformMatrix4fv(
    gl.getUniformLocation(program,"modelViewMatrix"),
    false, flatten(base)
  );
  gl.drawArrays(gl.POINTS,offSF,nSF); 

  //  orbital rings
  if (showRings) {
   gl.uniform1i(gl.getUniformLocation(program,"uUseTexture"), 0);
   gl.uniformMatrix4fv(
     gl.getUniformLocation(program,"modelViewMatrix"),
     false, flatten(base)
   );
   gl.drawArrays(gl.TRIANGLES, offR0, nR0);
   gl.drawArrays(gl.TRIANGLES, offR1, nR1);
   gl.drawArrays(gl.TRIANGLES, offR2, nR2);
   gl.drawArrays(gl.TRIANGLES, offR3, nR3);
   gl.drawArrays(gl.TRIANGLES, offR4, nR4);
   gl.drawArrays(gl.TRIANGLES, offR5, nR5);
   gl.drawArrays(gl.TRIANGLES, offR6, nR6);
   gl.drawArrays(gl.TRIANGLES, offR7, nR7);
  }

  //  textured sun   
  gl.uniformMatrix4fv(
    gl.getUniformLocation(program,"modelViewMatrix"),
    false, flatten(base)
  );
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, sunTex);
  gl.uniform1i(gl.getUniformLocation(program,"uUseTexture"), 1);
  gl.drawArrays(gl.TRIANGLES, offSun, nSun);

  //  textured planets   
  drawPlanet(off0,nP0,mercuryTex,R0,a0,base);  // Mercury
  drawPlanet(off1,nP1,venusTex  ,R1,a1,base);  // Venus
  drawPlanet(off2,nP2,earthTex  ,R2,a2,base);  // Earth
  drawPlanet(off3,nP3,marsTex   ,R3,a3,base);  // Mars
  drawPlanet(off4,nP4,jupiterTex,R4,a4,base);  // Jupiter
  drawPlanet(off5,nP5,saturnTex ,R5,a5,base);  // Saturn
  drawPlanet(off6,nP6,uranusTex ,R6,a6,base);  // Uranus
  drawPlanet(off7,nP7,neptuneTex,R7,a7,base);  // Neptune
  
  // Saturn's rings
  drawSaturnRings(a5, base);
  
  //  moons
  drawMoon(offMoon, nMoon, R2, a2, moonAngle, MOON_ORBIT, base);           // Earth's moon
  drawMoon(offMars1, nMars1, R3, a3, mars1Angle, MARS_MOON1_ORBIT, base); // Mars moon 1
  drawMoon(offMars2, nMars2, R3, a3, mars2Angle, MARS_MOON2_ORBIT, base); // Mars moon 2

  requestAnimationFrame(render);
}

// planet drawer
function drawPlanet(offset, count, tex, radius, angle, base) {
  const mv = mult( base,
                   mult( rotate(angle,[0,1,0]),          // orbit path
                         translate(radius,-0.1,0) )     // slide out from Sun
                 );

  gl.uniformMatrix4fv(
      gl.getUniformLocation(program,"modelViewMatrix"),
      false, flatten(mv)
  );
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.uniform1i(gl.getUniformLocation(program,"uUseTexture"), 1);
  gl.drawArrays(gl.TRIANGLES, offset, count);
}

// moon drawer  orbits around its parent planet
function drawMoon(offset, count, planetRadius, planetAngle, moonAngle, moonOrbitRadius, base) {
  const mv = mult( base,
                   mult( rotate(planetAngle,[0,1,0]),              // follow planet's orbit
                         mult( translate(planetRadius,-0.1,0),     // go to planet position
                               mult( rotate(moonAngle,[0,1,0]),     // moon's orbit around planet
                                     translate(moonOrbitRadius,0,0) // moon's distance from planet
                               )
                         )
                   )
                 );

  gl.uniformMatrix4fv(
      gl.getUniformLocation(program,"modelViewMatrix"),
      false, flatten(mv)
  );
  gl.uniform1i(gl.getUniformLocation(program,"uUseTexture"), 0);
  gl.drawArrays(gl.TRIANGLES, offset, count);
}

// Saturn's rings drawer - follows Saturn around
function drawSaturnRings(saturnAngle, base) {
  const mv = mult( base,
                   mult( rotate(saturnAngle,[0,1,0]),     // follow Saturn's orbit
                         mult( translate(R5,-0.1,0),     // go to Saturn position
                               rotate(15,[1,0,0])        // tilt the rings slightly
                         )
                   )
                 );

  gl.uniformMatrix4fv(
      gl.getUniformLocation(program,"modelViewMatrix"),
      false, flatten(mv)
  );
  gl.uniform1i(gl.getUniformLocation(program,"uUseTexture"), 0);
  gl.drawArrays(gl.TRIANGLES, offSaturnRing, nSaturnRing);
}


// event handlers
function initMouseDrag(){
  let dragging=false,lastX=0,lastY=0;
  canvas.addEventListener("mousedown",e=>{
    if(e.button!==0) return;
    dragging=true; lastX=e.clientX; lastY=e.clientY;
  });
  window.addEventListener("mouseup",()=>dragging=false);
  canvas.addEventListener("mousemove",e=>{
    if(!dragging) return;
    tumbleY += (e.clientX-lastX)*0.8;
    tumbleX -= (e.clientY-lastY)*0.8;
    lastX=e.clientX; lastY=e.clientY;
  });
}
function initWheelZoom(){
  canvas.addEventListener("wheel",e=>{
    e.preventDefault();
    zoomScale *= 1 + (e.deltaY>0?-0.1:0.1);
    zoomScale = Math.max(0.2,Math.min(5,zoomScale)); //  limits for perspective
  });
}