
// scene size
import {
    Quaternion,
    Scene, Vector3,
    WebGLRenderer
} from 'three';
import {Room} from './Room';
import {EffectComposer} from 'three/examples/jsm/postprocessing/EffectComposer';
import {RenderPass} from 'three/examples/jsm/postprocessing/RenderPass';
import {ShaderPass} from 'three/examples/jsm/postprocessing/ShaderPass';
import {FXAAShader} from 'three/examples/jsm/shaders/FXAAShader';
import {OuterSimpleStretch} from './OuterSimpleStretch';
import {addCubeWall, addListeners, getHalfSphere, getSmallSphere, newComposer} from './factory';
import {InnerCubeMap} from './InnerCubeMap';
import {CameraWrapper} from './CameraWrapper';

// Depth buffer interesting articles
// https://threejs.org/examples/webgl_depth_texture.html
// https://stackoverflow.com/questions/50530765/how-do-i-access-depth-data-in-three-js
// https://stackoverflow.com/questions/23362076/opengl-how-to-access-depth-buffer-values-or-gl-fragcoord-z-vs-rendering-d

// scene size
let WIDTH = window.innerWidth;
let HEIGHT = window.innerHeight;

// camera
let VIEW_ANGLE = 45;
let ASPECT = WIDTH / HEIGHT;
let NEAR = 0.1; // precision
let FAR = 5000;

let cameraWrapper;
let camera;
let scene;
let renderer;

let state = {
    mouseDown: false,
    forwardDown: false,
    leftDown: false,
    rightDown: false,
    backDown: false,
    downDown: false,
    upDown: false
};
let oss;
let icm;

let halfSphere;
let smallSphere;
let effectComposer;

// TODO controls
// TODO control widget

init();
animate();

function init() {
    let container = document.getElementById('container');

    // renderer
    renderer = new WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(WIDTH, HEIGHT);
    container.appendChild(renderer.domElement);

    // scene
    scene = new Scene();

    // camera
    cameraWrapper = new CameraWrapper(VIEW_ANGLE, ASPECT, NEAR, FAR);
    camera = cameraWrapper.getRecorder();
    cameraWrapper.setUpRotation(-Math.PI / 2, 0, 0);
    cameraWrapper.setXRotation(Math.PI / 2);
    cameraWrapper.setCameraPosition(0, 75, 160);
    scene.add(cameraWrapper.get3DObject());

    // Wormhole
    let antialiasFactor = 1;
    let width = window.innerWidth * antialiasFactor;
    let height = window.innerHeight * antialiasFactor;

    let wormholeEntry = new Vector3(0, 40, 0);
    let wormholeExit = new Vector3(0, 50, -200);

    // Outer ring
    oss = new OuterSimpleStretch(width, height, 20, 40,
        wormholeEntry
    );

    // Inner ring
    icm = new InnerCubeMap(width, height, 20,
        wormholeEntry,
        wormholeExit
    );

    // tunnel camera
    // tunnelCamera = new PerspectiveCamera(120, ASPECT, 1, 1000000);
    // tunnelCamera = new CubeCamera(1, 100000, 2);
    // cubeCam = icm.getCubeCam();

    // Rotate cube camera
    icm.setUpRotation(-Math.PI / 2, Math.PI, 0);
    icm.setXRotation(Math.PI / 2);
    let cubeCamWrapper = icm.getWrapper();
    scene.add(cubeCamWrapper);

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
    addListeners(
        cameraWrapper, icm,
        halfSphere, state
    );
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

    // update objects
    let timer = Date.now() * 0.01;
    smallSphere.position.set(
        Math.cos(timer * 0.1) * 30,
        Math.abs(Math.cos(timer * 0.2)) * 20 + 5,
        Math.sin(timer * 0.1) * 30
    );
    smallSphere.rotation.y =  Math.PI / 2  - timer * 0.1;
    smallSphere.rotation.z = timer * 0.8;

    // update camera
    let p = cameraWrapper.getCameraPosition();
    let fw = cameraWrapper.getForwardVector([
        state.forwardDown, state.backDown, state.rightDown, state.leftDown,
        state.upDown, state.downDown
    ], false);
    cameraWrapper.setCameraPosition(
        p.x + fw[0], p.y + fw[1], p.z + fw[2]
    );
    let innerCircle = icm.getMesh();
    let outerRing = oss.getMesh();

    let rec = cameraWrapper.getRecorder();
    let q = new Quaternion();
    rec.getWorldQuaternion(q);
    let i = new Quaternion();
    i.setFromAxisAngle(new Vector3(0, 1, 0).normalize(), Math.PI);
    // q.multiply(i);

    innerCircle.setRotationFromQuaternion(q); // reset up vector
    outerRing.setRotationFromQuaternion(q); // ditto
    innerCircle.lookAt(cameraWrapper.getCameraPosition());
    outerRing.lookAt(cameraWrapper.getCameraPosition());
    let exit = icm.getExit();
    let entry = icm.getEntry();
    let to = new Vector3(
        exit.x - p.x + entry.x, exit.y - p.y + entry.y, exit.z - p.z + entry.z
    );
    let cc = icm.getCubeCam();
    cc.lookAt(to);

    // let mainRenderTarget = renderer.getRenderTarget();
    scene.remove(outerRing);
    scene.remove(innerCircle);

    effectComposer.render();
    // renderer.setRenderTarget(wormholeRenderTarget);
    // renderer.render(scene, camera);

    // TODO decommit
    innerCircle.visible = false;
    icm.getCubeCam().update(renderer, scene);
    innerCircle.visible = true;

    // TODO non-cubemap inner
    // renderer.setRenderTarget(tunnelRenderTarget);
    // renderer.render(scene, tunnelCamera);

    scene.add(outerRing);
    scene.add(innerCircle); // TODO decommit
    // renderer.setRenderTarget(null);
    renderer.render(scene, camera);
}
