var camera, scene, light, renderer, geometry, material, mesh1, mesh2, mesh3, gl;

var controls;
var outlineMaterial;

createOutlineMaterial();
init();
animate();

function init() {
  scene = new THREE.Scene();

  camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 1, 10000);
  camera.position.z = 1000;
  camera.position.y = 200;

  scene.add(camera);

  // controls
  controls = new THREE.OrbitControls(camera);

  material = new THREE.MeshNormalMaterial();

  var geometry1 = createBufferGeometry(true);
  mesh1 = new THREE.Mesh(geometry1, material);
  mesh1.scale.set(200, 200, 200);
  scene.add(mesh1);

  var geometry2 = createBufferGeometry(true);
  mesh2 = new THREE.Mesh(geometry2, material);
  mesh2.scale.set(200, 200, 200);
  mesh2.position.set(150, 150, -150);
  scene.add(mesh2);

  var geometry3 = createBufferGeometry(false);
  mesh3 = new THREE.Mesh(geometry3, material);
  mesh3.scale.set(200, 200, 200);
  mesh3.position.set(50, 300, -500);
  scene.add(mesh3);

  renderer = new THREE.WebGLRenderer({
    antialias: true,
    preserveDrawingBuffer: true
  });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.autoClear = false;

  gl = renderer.getContext();

  document.body.appendChild(renderer.domElement);
}

function animate() {
  requestAnimationFrame(animate);
  render();
}

function render() {
  // Clear renderer
  renderer.clear();

  renderStencilOutline();
}

function renderStencilOutline() {
  // Enable tests
  //gl.enable(gl.STENCIL_TEST);
  //gl.enable(gl.DEPTH_TEST);

  // Set stencil buffer value to one for current pixel when test is true
  //gl.stencilOp(gl.KEEP, gl.INCR, gl.REPLACE);

  // Stencil test always true when drawing some pixels
  //gl.stencilFunc(gl.ALWAYS, 1, 0xFF);
  //gl.stencilMask(0xFF);	// Write on stencil buffer    

  // Render the scene
  renderer.render(scene, camera);

  //gl.stencilFunc(gl.LEQUAL, 1, 0xFF);
  //gl.stencilMask(0x00); // Read-only stencil buffer

  //gl.depthFunc(gl.LESS);
  //gl.depthMask(0xFF);

  // Render scene again with an override material for all objects
  scene.overrideMaterial = outlineMaterial;
  renderer.render(scene, camera);
  scene.overrideMaterial = null;

  //renderer.clear(false, true, false);



  // Stencil test always true when drawing some pixels
  //gl.stencilFunc(gl.EQUAL, 1, 0xFF);
  //gl.stencilMask(0x00);	// Read on stencil buffer

  // Render scene again with an override material for all objects
  //scene.overrideMaterial = outlineMaterial;
  //renderer.render(scene, camera);
  //scene.overrideMaterial = null;

  // Reset masks
  //gl.stencilMask(0xFF);

  // Disable tests
  //gl.disable(gl.STENCIL_TEST);
  //gl.disable(gl.DEPTH_TEST);
}

function createBufferGeometry(doHighlight) {
  var geometry = new THREE.BufferGeometry();

  // Creating array buffers
  var positionArray = [];
  var indexArray = [];
  var highlightArray = new Array(8);

  // Init cube position
  positionArray.push(0, 0, 0); // 0
  positionArray.push(0, 0, 1); // 1
  positionArray.push(0, 1, 0); // 2
  positionArray.push(0, 1, 1); // 3
  positionArray.push(1, 0, 0); // 4
  positionArray.push(1, 0, 1); // 5
  positionArray.push(1, 1, 0); // 6
  positionArray.push(1, 1, 1); // 7

  // Center position
  for (var j = 0; j < positionArray.length; j++) {
    positionArray[j] -= 0.5;
  }

  // Init cube face index
  indexArray.push(0, 1, 2);
  indexArray.push(1, 3, 2);
  indexArray.push(4, 6, 5);
  indexArray.push(5, 6, 7);
  indexArray.push(0, 2, 4);
  indexArray.push(4, 2, 6);
  indexArray.push(0, 4, 1);
  indexArray.push(4, 5, 1);
  indexArray.push(1, 5, 3);
  indexArray.push(5, 7, 3);
  indexArray.push(2, 3, 6);
  indexArray.push(6, 3, 7);

  highlightArray.fill(doHighlight ? 1.0 : 0.0);

  // Creating vertex buffer
  var position = new Float32Array(positionArray);
  geometry.addAttribute('position', new THREE.BufferAttribute(position, 3));

  // Creating index buffer
  var index = new Uint32Array(indexArray);
  geometry.setIndex(new THREE.BufferAttribute(index, 1));

  // Creating highlight buffer
  var highlight = new Float32Array(highlightArray);
  geometry.addAttribute('highlight', new THREE.BufferAttribute(highlight, 1));

  geometry.computeVertexNormals();
  geometry.normalizeNormals();

  return geometry;
}

function createOutlineMaterial() {
  var outline_shader = {
    uniforms: {
      'scale': {
        type: 'f',
        value: 5
      }
    },
    attributes: {
      'highlight': {
        type: 'f',
        value: []
      }
    },
    vertex_shader: [
      'uniform float scale;',
      'attribute float highlight;',
      'varying float doHighlight;',
      'void main() {',
      'vec4 mvPosition = modelViewMatrix * vec4( position, 1.0 );',
      'vec4 vNormal = projectionMatrix * vec4( normalize( normalMatrix * normal ), 0.0 );',
      'vec2 xyNormal = vNormal.xy * scale;',
      'doHighlight = highlight;',
      'gl_Position = projectionMatrix * mvPosition + vec4( xyNormal, 0.15, 0.0 );',
      '}'
    ].join('\n'),
    fragment_shader: [
      'varying float doHighlight;',
      'void main() {',
      'if (doHighlight > 0.99) {',
      'gl_FragColor = vec4( 1.0, 0.0, 0.0, 1.0 );',
      '} else {',
      //'gl_FragColor = vec4( 0.0, 1.0, 0.0, 1.0 );',
      'discard;',
      '}',
      '}'
    ].join('\n')
  };

  outlineMaterial = new THREE.ShaderMaterial({
    uniforms: THREE.UniformsUtils.clone(outline_shader.uniforms),
    vertexShader: outline_shader.vertex_shader,
    fragmentShader: outline_shader.fragment_shader
  });
  //outlineMaterial.side = THREE.BackSide;
}
