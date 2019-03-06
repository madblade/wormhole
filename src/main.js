
// scene size
import {
    BoxGeometry,
    // BufferAttribute,
    CircleBufferGeometry,
    // CircleBufferGeometry, // CircleGeometry,
    CylinderBufferGeometry, DoubleSide,
    IcosahedronBufferGeometry, LinearFilter,
    Math as TMath,
    Mesh,
    MeshPhongMaterial, NearestFilter, Object3D, PerspectiveCamera, PlaneBufferGeometry,
    PointLight, RGBFormat, RingBufferGeometry, Scene, ShaderMaterial,
    SphereBufferGeometry, WebGLRenderer, WebGLRenderTarget
} from 'three';
import {OrbitControls} from './orbit';

var wormholeVShader = [
    'varying vec4 pos_frag;\n' +
    'varying vec3 v_position;\n' +
    'attribute vec2 vertex2D;\n' +
    'void main() {\n' +
    '   v_position = (modelMatrix * vec4(position, 1.0)).xyz - modelMatrix[3].xyz;\n' +
    '   pos_frag = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );\n' +
    '   gl_Position = pos_frag;\n' +
    '}'
].join('\n');

var wormholeFShader = [
    'uniform sampler2D texture1;\n' +
    'varying vec4 pos_frag;\n' +
    'varying vec3 v_position;\n' +
    '\n' +
    'void main() {\n' +
    '   float initialDistance = distance(vec3(0.0), v_position);\n' +
    '   bool outer = initialDistance > 30.0;\n' +
    '   float dist = outer ? ((initialDistance - 30.0) / 10.0)' +
    '                      : ((-initialDistance + 30.0) / 10.0);\n' +
    '   vec2 ratio = outer ? (dist * pos_frag.xy / pos_frag.w) ' +
    '                      : (-1.0 * (dist) * pos_frag.xy / pos_frag.w);\n' +
    '   vec2 correctedUv = (ratio + vec2(1.0)) * 0.5;\n' +
    '   gl_FragColor = texture2D(texture1, correctedUv);\n' +
    '}\n'
].join('\n');

var tunnelVShader = [
    'varying vec4 pos_frag;\n' +
    'varying vec3 v_position;\n' +
    'varying vec2 vUv;\n' +
    'void main() {\n' +
    '   vUv = uv;\n' +
    '   v_position = (modelMatrix * vec4(position, 1.0)).xyz - modelMatrix[3].xyz;\n' +
    '   pos_frag = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );\n' +
    '   gl_Position = pos_frag;\n' +
    '}'
].join('\n');
var tunnelFShader = [
    'uniform sampler2D texture1;\n' +
    'varying vec4 pos_frag;\n' +
    'varying vec3 v_position;\n' +
    'varying vec2 vUv;\n' +
    '\n' +
    'void main() {\n' +
    '   float initialDistance = distance(vec3(0.0), v_position);\n' +
    '   float dist = (initialDistance - 20.0) / 20.0;\n' +
    // '   vec2 ratio = pos_frag.xy / pos_frag.w;\n' +
    // '   vec2 ratio = pow(dist, 0.5) * pos_frag.xy / pos_frag.w;\n' +
    '   vec2 ratio = exp(-dist) * pos_frag.xy / pos_frag.w;\n' +
    // '   vec2 correctedUv = vUv;\n' +
    '   vec2 correctedUv = (ratio + vec2(1.0)) * 0.5;\n' +
    '   gl_FragColor = texture2D(texture1, correctedUv);\n' +
    '}\n'
].join('\n');


// var fisheyeUniforms = {
//     tDiffuse:         { type: 't', value: null },
//     strength:         { type: 'f', value: 0 },
//     height:           { type: 'f', value: 1 },
//     aspectRatio:      { type: 'f', value: 1 },
//     cylindricalRatio: { type: 'f', value: 1 }
// };

// var fisheyeVertexShader = [
//     'uniform float strength;',          // s: 0 = perspective, 1 = stereographic
//     'uniform float height;',            // h: tan(verticalFOVInRadians / 2)
//     'uniform float aspectRatio;',       // a: screenWidth / screenHeight
//     'uniform float cylindricalRatio;',  // c: cylindrical distortion ratio. 1 = spherical
//
//     'varying vec3 vUV;',                // output to interpolate over screen
//     'varying vec2 vUVDot;',             // output to interpolate over screen
//
//     'void main() {',
//     'gl_Position = projectionMatrix * (modelViewMatrix * vec4(position, 1.0));',
//
//     'float scaledHeight = strength * height;',
//     'float cylAspectRatio = aspectRatio * cylindricalRatio;',
//     'float aspectDiagSq = aspectRatio * aspectRatio + 1.0;',
//     'float diagSq = scaledHeight * scaledHeight * aspectDiagSq;',
//     'vec2 signedUV = (2.0 * uv + vec2(-1.0, -1.0));',
//
//     'float z = 0.5 * sqrt(diagSq + 1.0) + 0.5;',
//     'float ny = (z - 1.0) / (cylAspectRatio * cylAspectRatio + 1.0);',
//
//     'vUVDot = sqrt(ny) * vec2(cylAspectRatio, 1.0) * signedUV;',
//     'vUV = vec3(0.5, 0.5, 1.0) * z + vec3(-0.5, -0.5, 0.0);',
//     'vUV.xy += uv;',
//     '}'
// ].join('\n');
// var fisheyeFragmentShader = [
//     'uniform sampler2D tDiffuse;',      // sampler of rendered scene?s render target
//     'varying vec3 vUV;',                // interpolated vertex output data
//     'varying vec2 vUVDot;',             // interpolated vertex output data
//
//     'void main() {',
//     'vec3 uv = dot(vUVDot, vUVDot) * vec3(-0.5, -0.5, -1.0) + vUV;',
//     'gl_FragColor = texture2DProj(tDiffuse, uv);',
//     '}'
// ].join('\n');

// scene size
var WIDTH = window.innerWidth;
var HEIGHT = window.innerHeight;

// camera
var VIEW_ANGLE = 45;
var ASPECT = WIDTH / HEIGHT;
var NEAR = 1;
var FAR = 500;

var camera;
var scene;
var renderer;

var cameraControls;

var sphereGroup;
var smallSphere;
var worm;
var wormholeRenderTarget;
var tunnelRenderTarget;

var tunnel;
var tunnelRotation;
var tunnelCamera;
var tunnelCameraControls; // ... unoptimized, just for aligning with the other camera

init();
animate();

function init() {
    var container = document.getElementById('container');

    // renderer
    renderer = new WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(WIDTH, HEIGHT);
    container.appendChild(renderer.domElement);

    // scene
    scene = new Scene();

    // camera
    camera = new PerspectiveCamera(VIEW_ANGLE, ASPECT, NEAR, FAR);
    camera.position.set(0, 75, 160);
    // camera.position.set(0, 75, -110);
    cameraControls = new OrbitControls(camera, renderer.domElement);
    cameraControls.target.set(0, 40, 0);
    cameraControls.maxDistance = 400;
    cameraControls.minDistance = 10;
    cameraControls.update();

    // tunnel camera
    tunnelCamera = new PerspectiveCamera(120, ASPECT, 1, 1000000);
    tunnelCamera.position.set(0, 75, -110);
    tunnelCameraControls = new OrbitControls(tunnelCamera, renderer.domElement);
    tunnelCameraControls.target.set(0, 75, -111);
    tunnelCameraControls.maxDistance = 400;
    tunnelCameraControls.minDistance = 10;
    tunnelCameraControls.update();

    var planeGeo = new PlaneBufferGeometry(100.1, 100.1);

    var geometry;
    var material;

    // !!START WORMHOLE
    var antialiasFactor = 1;
    var width = window.innerWidth * antialiasFactor; // (tempWidth * window.innerWidth) / 2;
    var height = window.innerHeight * antialiasFactor; // (tempHeight * window.innerHeight) / 2;
    // !START OUTER RING
    geometry = new RingBufferGeometry(20, 40, 30, 5);
    wormholeRenderTarget = new WebGLRenderTarget(
        width, height,
        {
            minFilter: LinearFilter,
            magFilter: NearestFilter,
            format: RGBFormat
        }
    );
    material = new ShaderMaterial({
        side: DoubleSide,
        uniforms: {
            texture1: { type:'t', value: wormholeRenderTarget.texture }
        },
        vertexShader: wormholeVShader,
        fragmentShader: wormholeFShader
    });
    worm = new Mesh(geometry, material);
    var yOrigin = 37.5;
    var zOrigin = 20.0;
    worm.position.y = yOrigin;
    worm.position.z = zOrigin;
    // Update worm with orbit controls. (unoptimized, beware)
    var wormControls = new OrbitControls(worm, renderer.domElement);
    wormControls.target.set(0, 40, 0);
    wormControls.maxDistance = 400;
    wormControls.minDistance = 10;
    wormControls.update();
    // !END OUTER RING


    // !START INNER RING

    // Setup distortion effect
    var geometryT = new CircleBufferGeometry(20, 30);
    // var geometryT = new SphereBufferGeometry(20, 30, 30, 0,
    //     2 * Math.PI, 0,  0.5 * Math.PI);
    tunnelRenderTarget = new WebGLRenderTarget(
        width, height,
        {
            minFilter: LinearFilter,
            magFilter: NearestFilter,
            format: RGBFormat
        }
    );
    // var materialT = new ShaderMaterial({
    //     side: DoubleSide,
    //     uniforms: {
    //         tDiffuse:         { type: 't', value: tunnelRenderTarget.texture },
    //         strength:         { type: 'f', value: 0 },
    //         height:           { type: 'f', value: 1 },
    //         aspectRatio:      { type: 'f', value: 1 },
    //         cylindricalRatio: { type: 'f', value: 1 }
    //         // ,
    //         // texture1: { type:'t', value: tunnelRenderTarget.texture }
    //     },
    //     vertexShader: fisheyeVertexShader,
    //     fragmentShader: fisheyeFragmentShader
    // });
    var materialT = new ShaderMaterial({
        side: DoubleSide,
        uniforms: {
            texture1: { type:'t', value: tunnelRenderTarget.texture
            }
        },
        vertexShader: tunnelVShader,
        fragmentShader: tunnelFShader
    });
    tunnel = new Mesh(geometryT,
        materialT
        //new MeshPhongMaterial({ color: 0xffffff, emissive: 0x444444, side: DoubleSide })
    );
    tunnel.position.y = yOrigin;
    tunnel.position.z = zOrigin;
    // tunnel.rotation.x = Math.PI / 2;
    // tunnel.rotation.z = Math.PI;
    // tunnelRotation = new Object3D();
    // var intermediate = new Object3D();
    // intermediate.add(tunnel);
    // tunnelRotation.add(intermediate);
    var tunnelControls = new OrbitControls(tunnel, renderer.domElement);
    tunnelControls.target.set(0, 40, 0);
    tunnelControls.maxDistance = 400;
    tunnelControls.minDistance = 10;
    tunnelControls.update();

    // var horizontalFOV = 140;
    // var strength = 0.5;
    // var cylindricalRatio = 2;
    // var height2 = Math.tan(TMath.degToRad(horizontalFOV) / 2) / camera.aspect;
    // tunnelCamera.fov = Math.atan(height2) * 2 * 180 / 3.1415926535;
    // tunnelCamera.updateProjectionMatrix();
    // tunnel.material.uniforms.strength.value = strength;
    // tunnel.material.uniforms.height.value = height;
    // tunnel.material.uniforms.aspectRatio.value = camera.aspect;
    // tunnel.material.uniforms.cylindricalRatio.value = cylindricalRatio;
    // !END INNER RING
    // !!END WORMHOLE

    // scene.add(worm);

    sphereGroup = new Object3D();
    scene.add(sphereGroup);

    geometry = new CylinderBufferGeometry(0.1, 15 * Math.cos(Math.PI / 180 * 30), 0.1, 24, 1);
    material = new MeshPhongMaterial({ color: 0xffffff, emissive: 0x444444 });
    var sphereCap = new Mesh(geometry, material);
    sphereCap.position.y = -15 * Math.sin(Math.PI / 180 * 30) - 0.05;
    sphereCap.rotateX(-Math.PI);

    geometry = new SphereBufferGeometry(15, 24, 24, Math.PI / 2, Math.PI * 2, 0, Math.PI / 180 * 120);
    var halfSphere = new Mesh(geometry, material);
    halfSphere.add(sphereCap);
    halfSphere.rotateX(-Math.PI / 180 * 135);
    halfSphere.rotateZ(-Math.PI / 180 * 20);
    halfSphere.position.y = 7.5 + 15 * Math.sin(Math.PI / 180 * 30);

    sphereGroup.add(halfSphere);

    geometry = new IcosahedronBufferGeometry(5, 0);
    material = new MeshPhongMaterial({ color: 0xffffff, emissive: 0x333333, flatShading: true });
    smallSphere = new Mesh(geometry, material);
    scene.add(smallSphere);

    // walls
    var planeTop = new Mesh(planeGeo, new MeshPhongMaterial({ color: 0xffffff }));
    planeTop.position.y = 100;
    planeTop.rotateX(Math.PI / 2);
    scene.add(planeTop);

    var planeBottom = new Mesh(planeGeo, new MeshPhongMaterial({ color: 0xffffff }));
    planeBottom.rotateX(-Math.PI / 2);
    scene.add(planeBottom);

    var planeOpposite = new Mesh(planeGeo, new MeshPhongMaterial({ color: 0x7f7fff }));
    planeOpposite.position.y = 50;
    planeOpposite.position.z = -50;
    scene.add(planeOpposite);

    var planeFront = new Mesh(planeGeo, new MeshPhongMaterial({ color: 0x7f7fff }));
    planeFront.position.z = 50;
    planeFront.position.y = 50;
    planeFront.rotateY(Math.PI);
    scene.add(planeFront);

    var planeRight = new Mesh(planeGeo, new MeshPhongMaterial({ color: 0x00ff00 }));
    planeRight.position.x = 50;
    planeRight.position.y = 50;
    planeRight.rotateY(-Math.PI / 2);
    scene.add(planeRight);

    var planeLeft = new Mesh(planeGeo, new MeshPhongMaterial({ color: 0xff0000 }));
    planeLeft.position.x = -50;
    planeLeft.position.y = 50;
    planeLeft.rotateY(Math.PI / 2);
    scene.add(planeLeft);

    // lights
    var mainLight = new PointLight(0xcccccc, 1.5, 250);
    mainLight.position.y = 60;
    scene.add(mainLight);

    var greenLight = new PointLight(0x00ff00, 0.25, 1000);
    greenLight.position.set(550, 50, 0);
    scene.add(greenLight);

    var redLight = new PointLight(0xff0000, 0.25, 1000);
    redLight.position.set(-550, 50, 0);
    scene.add(redLight);

    var blueLight = new PointLight(0x7f7fff, 0.25, 1000);
    blueLight.position.set(0, 50, 550);
    scene.add(blueLight);

    var whiteLight = new PointLight(0xffffff, 1.5, 300);
    whiteLight.position.set(0, 50, -200);
    scene.add(whiteLight);

    // Cube tunnel
    var cubeGeo = new BoxGeometry(12.5, 12.5, 12.5);
    var cube = new Mesh(cubeGeo, new MeshPhongMaterial({ color: 0xff0000 }));
    cube.position.z = -230;
    cube.position.y = 25;
    scene.add(cube);
    for (let i = -5; i < 6; ++i) {
        for (let j = -5; j < 6; ++j) {
            cubeGeo = new BoxGeometry(12.5, 12.5, 12.5);
            var cube2 = new Mesh(cubeGeo, new MeshPhongMaterial({ color: 0xff0000 }));
            cube2.position.z = -230;
            cube2.position.y = 25 + 25 * j;
            cube2.position.x = 25 * i;
            scene.add(cube2);
        }
    }

    document.addEventListener('keydown', event => {
        switch (event.keyCode) {
            case 32:
                cube.position.y += 1.2;
                halfSphere.position.y++;
                break;
            case 16:
                cube.position.y -= 1.2;
                halfSphere.position.y--;
                break;
            default: break;
        }
    });
}

function animate() {
    requestAnimationFrame(animate);

    var timer = Date.now() * 0.01;

    sphereGroup.rotation.y -= 0.002;

    smallSphere.position.set(
        Math.cos(timer * 0.1) * 30,
        Math.abs(Math.cos(timer * 0.2)) * 20 + 5,
        Math.sin(timer * 0.1) * 30
    );
    smallSphere.rotation.y =  Math.PI / 2  - timer * 0.1;
    smallSphere.rotation.z = timer * 0.8;

    var mainRenderTarget = renderer.getRenderTarget();
    scene.remove(worm);
    scene.remove(tunnel);
    renderer.setRenderTarget(wormholeRenderTarget);
    renderer.render(scene, camera);
    renderer.setRenderTarget(tunnelRenderTarget);
    renderer.render(scene, tunnelCamera);

    scene.add(worm);
    scene.add(tunnel);
    renderer.setRenderTarget(mainRenderTarget);
    renderer.render(scene, camera);
}
