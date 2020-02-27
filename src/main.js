
// scene size
import {
    Object3D, PerspectiveCamera,
    Scene,
    WebGLRenderer
} from 'three';
import {OrbitControls} from './orbit';
import {Room} from './Room';
import {EffectComposer} from 'three/examples/jsm/postprocessing/EffectComposer';
import {RenderPass} from 'three/examples/jsm/postprocessing/RenderPass';
import {ShaderPass} from 'three/examples/jsm/postprocessing/ShaderPass';
import {FXAAShader} from 'three/examples/jsm/shaders/FXAAShader';
import {OuterSimpleStretch} from './OuterSimpleStretch';
import {addCubeWall, addListeners, getHalfSphere, getSmallSphere} from './factory';
import {InnerCubeMap} from './InnerCubeMap';

// Depth buffer interesting articles
// https://threejs.org/examples/webgl_depth_texture.html
// https://stackoverflow.com/questions/50530765/how-do-i-access-depth-data-in-three-js
// https://stackoverflow.com/questions/23362076/opengl-how-to-access-depth-buffer-values-or-gl-fragcoord-z-vs-rendering-d

// scene size
var WIDTH = window.innerWidth;
var HEIGHT = window.innerHeight;

// camera
var VIEW_ANGLE = 45;
var ASPECT = WIDTH / HEIGHT;
var NEAR = 0.1; // precision
var FAR = 5000;

var camera;
var scene;
var renderer;

var cameraControls;
var cubecam;

var halfSphere;
var smallSphere;
var worm;

var tunnel;
var cubeCameraControls;
let effectComposer;

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
    cameraControls = new OrbitControls(camera, renderer.domElement);
    cameraControls.target.set(0, 40, 0);
    cameraControls.maxDistance = 400;
    cameraControls.minDistance = 10;
    cameraControls.update();

    // Wormhole
    var antialiasFactor = 1;
    var width = window.innerWidth * antialiasFactor;
    var height = window.innerHeight * antialiasFactor;

    // Outer ring
    let oss = new OuterSimpleStretch(width, height, 20, 40);
    worm = oss.getMesh();
    var yOrigin = 40;
    var zOrigin = 0;
    worm.position.y = yOrigin;
    worm.position.z = zOrigin;
    var wormControls = new OrbitControls(worm, renderer.domElement);
    wormControls.target.set(0, 40, 0);
    wormControls.maxDistance = 400;
    wormControls.minDistance = 10;
    wormControls.update();

    // Inner ring
    let icm = new InnerCubeMap(width, height, 20);

    // tunnel camera
    // tunnelCamera = new PerspectiveCamera(120, ASPECT, 1, 1000000);
    // tunnelCamera = new CubeCamera(1, 100000, 2);
    cubecam = icm.getCubeCam();
    tunnel = icm.getMesh();
    tunnel.position.y = 40;
    tunnel.position.z = 0;

    // Rotate cube camera
    let cubecamWrapper = new Object3D();
    cubecamWrapper.position.set(0, 75, -200);
    cubecamWrapper.add(cubecam);
    scene.add(cubecamWrapper);
    cubeCameraControls = new OrbitControls(cubecamWrapper, renderer.domElement);
    cubeCameraControls.target.set(0, 75, -200);
    cubeCameraControls.maxDistance = 400;
    cubeCameraControls.minDistance = 10;
    cubeCameraControls.update();

    // Rotate inner wormhole
    var tunnelControls = new OrbitControls(tunnel, renderer.domElement);
    tunnelControls.target.set(0, 40, 0);
    tunnelControls.maxDistance = 400;
    tunnelControls.minDistance = 10;
    tunnelControls.update();

    // Rendering
    effectComposer = newComposer(renderer, scene, camera, oss.getRenderTarget());

    // Objects
    halfSphere = getHalfSphere();
    // scene.add(halfSphere);

    smallSphere = getSmallSphere();
    scene.add(smallSphere);

    let room = new Room(0x7f7fff, 0x00ff00, 0xff0000, 0xffffff);
    let roomMesh = room.getMesh();
    scene.add(roomMesh);

    // Cube tunnel
    addCubeWall(scene);

    // Controls
    addListeners(camera, halfSphere);
}

function newComposer(rendrr, sc, cam, target)
{
    let resolutionX = 1 / window.innerWidth;
    let resolutionY = 1 / window.innerHeight;
    let fxaa = new ShaderPass(FXAAShader);
    fxaa.uniforms['resolution'].value.set(resolutionX, resolutionY);
    let composer = new EffectComposer(rendrr, target);
    let scenePass = new RenderPass(sc, cam);
    composer.addPass(scenePass);
    composer.addPass(fxaa);
    return composer;
}

// TODO 1. log camera distance to blackhole object
// put a cube in front of the camera
// 2. put ring near camera
// 3. adjust ring outer size
// 4. integrate displacement
// 5. adjust ring inner size
// 6. disable inner circle depth testing
// 7. use envmap in inner circle
// On top of setting object.renderOrder you have to set
// material.depthTest to false on the relevant objects.

function animate() {
    requestAnimationFrame(animate);

    var timer = Date.now() * 0.01;

    smallSphere.position.set(
        Math.cos(timer * 0.1) * 30,
        Math.abs(Math.cos(timer * 0.2)) * 20 + 5,
        Math.sin(timer * 0.1) * 30
    );
    smallSphere.rotation.y =  Math.PI / 2  - timer * 0.1;
    smallSphere.rotation.z = timer * 0.8;

    // var mainRenderTarget = renderer.getRenderTarget();
    scene.remove(worm);
    scene.remove(tunnel);

    effectComposer.render();
    // renderer.setRenderTarget(wormholeRenderTarget);
    // renderer.render(scene, camera);

    // TODO decommit
    tunnel.visible = false;
    cubecam.update(renderer, scene);
    tunnel.visible = true;

    // TODO non-cubemap inner
    // renderer.setRenderTarget(tunnelRenderTarget);
    // renderer.render(scene, tunnelCamera);

    scene.add(worm);
    scene.add(tunnel); // TODO decommit
    // renderer.setRenderTarget(null);
    renderer.render(scene, camera);
}
