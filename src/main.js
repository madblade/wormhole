
// scene size
import {
    Quaternion,
    Scene, Vector3,
    WebGLRenderer
} from 'three';
import { Room } from './Room';
import {
    addCubeWall, addListeners, addWall,
    // getHalfSphere,
    getSmallSphere, newComposer
} from './factory';
import { InnerCubeMap } from './InnerCubeMap';
import { CameraWrapper } from './CameraWrapper';
import {OuterReversedStretch} from './OuterReversedStretch';

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
let scene1;
let scene2;
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

// let halfSphere;
let smallSphere;
let effectComposerS1;
let effectComposerS2;

let wormholeRadius;
let wormholeEntry;
let wormholeExit;

let eventContainer = [];
let currentWorld = '1';

// TODO 1. separate scenes
// TODO 2. refactor camera wrapper to use quaternions
// TODO 3. camera teleport position
// TODO 4. camera teleport orientation
// TODO 5. curve trajectory between 2r and .75r
// TODO 6. study transition smoothness
// TODO control widget for mobile

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
    scene1 = new Scene();
    scene2 = new Scene();

    // camera
    cameraWrapper = new CameraWrapper(VIEW_ANGLE, ASPECT, NEAR, FAR);
    camera = cameraWrapper.getRecorder();
    cameraWrapper.setCameraPosition(0, 75, 160);
    scene1.add(cameraWrapper.get3DObject());

    // Wormhole
    let antialiasFactor = 1;
    let width = window.innerWidth * antialiasFactor;
    let height = window.innerHeight * antialiasFactor;

    wormholeEntry = new Vector3(0, 40, 0);
    wormholeExit = new Vector3(0, 50, -150);
    wormholeRadius = 20;

    // Outer ring
    oss = new OuterReversedStretch(width, height,
        wormholeRadius, 2 * wormholeRadius,
        wormholeEntry, cameraWrapper
    );
    scene1.add(oss.getMesh());

    // Inner ring
    icm = new InnerCubeMap(width, height,
        wormholeRadius,
        wormholeEntry,
        wormholeExit
    );
    scene1.add(icm.getMesh());
    scene2.add(icm.getWrapper()); // Rotate cube cam

    // Rendering
    effectComposerS1 = newComposer(renderer, scene1, camera, oss.getRenderTarget());
    effectComposerS2 = newComposer(renderer, scene2, camera, oss.getRenderTarget());

    // Objects
    // halfSphere = getHalfSphere();
    // scene.add(halfSphere);
    smallSphere = getSmallSphere();
    scene1.add(smallSphere);

    let room = new Room(0x7f7fff, 0x00ff00, 0xff0000, 0xffffff);
    let roomMesh = room.getMesh();
    // roomMesh.scale.set(2, 2, 2);
    scene1.add(roomMesh);

    // Background
    addWall(scene1, 'tet');
    addCubeWall(scene1);
    addWall(scene2, 'box');

    // Controls
    addListeners(
        cameraWrapper, icm,
        state,
        eventContainer
    );
}

// 1. log camera distance to blackhole object
// 3. adjust ring outer size
// 5. adjust ring inner size
// On top of setting object.renderOrder you have to set
// material.depthTest to false on the relevant objects.

function teleport(newPosition)
{
    let cam = cameraWrapper.get3DObject();
    let ossMesh = oss.getMesh();
    let icmMesh = icm.getMesh();
    let icmCam = icm.getWrapper();
    let sourceScene; let sourcePosition;
    let destinationScene; let destinationPosition;

    if (currentWorld === '1') {
        currentWorld = '2';
        sourceScene = scene1; sourcePosition = wormholeEntry;
        destinationScene = scene2; destinationPosition = wormholeExit;
    } else {
        currentWorld = '1';
        sourceScene = scene2; sourcePosition = wormholeExit;
        destinationScene = scene1; destinationPosition = wormholeEntry;
    }

    sourceScene.remove(cam);
    sourceScene.remove(ossMesh);
    sourceScene.remove(icmMesh);
    destinationScene.remove(icmCam);

    destinationScene.add(cam);
    destinationScene.add(ossMesh);
    destinationScene.add(icmMesh);
    sourceScene.add(icmCam);

    newPosition.set(
        newPosition.x + wormholeExit.x - wormholeEntry.x,
        newPosition.y + wormholeExit.y - wormholeEntry.y,
        newPosition.z + wormholeExit.z - wormholeEntry.z,
    );
}

function render()
{
    let innerCircle = icm.getMesh();
    let outerRing = oss.getMesh();
    let effectComposer;
    let currentScene;
    let otherScene;
    if (currentWorld === '1') {
        effectComposer = effectComposerS1;
        currentScene = scene1;
        otherScene = scene2;
    } else {
        effectComposer = effectComposerS2;
        currentScene = scene2;
        otherScene = scene1;
    }

    // Remove drawable objects
    outerRing.visible = false;
    innerCircle.visible = false;

    // Render outer ring with FXAA
    effectComposer.render();
    effectComposer.render();
    // Render inner circle with cube map
    icm.getCubeCam().update(renderer, otherScene);

    // Add drawable objects
    outerRing.visible = true;
    innerCircle.visible = true;

    // Render full scene
    renderer.render(currentScene, camera);
}

function animate() {
    requestAnimationFrame(animate);

    // Update objects
    let timer = Date.now() * 0.01;
    smallSphere.position.set(
        Math.cos(timer * 0.1) * 30,
        Math.abs(Math.cos(timer * 0.2)) * 20 + 5,
        Math.sin(timer * 0.1) * 30
    );
    smallSphere.rotation.y =  Math.PI / 2  - timer * 0.1;
    smallSphere.rotation.z = timer * 0.8;

    // Update controls
    for (let i = 0; i < eventContainer.length; ++i) {
        let e = eventContainer[i];
        if (e[0]) cameraWrapper.rotateZ(e[0]);
        if (e[1]) cameraWrapper.rotateX(e[1]);
    }
    eventContainer.length = 0;

    // Update camera position
    let p = cameraWrapper.getCameraPosition();
    let fw = cameraWrapper.getForwardVector([
        state.forwardDown, state.backDown, state.rightDown, state.leftDown,
        state.upDown, state.downDown
    ], false);
    let oldDistance = p.distanceTo(wormholeEntry);
    let newPosition = new Vector3(p.x + fw.x, p.y + fw.y, p.z + fw.z);
    let newDistance = newPosition.distanceTo(wormholeEntry);

    let exit = icm.getExit();
    let entry = icm.getEntry();
    let innerCircle = icm.getMesh();
    let outerRing = oss.getMesh();
    let rec = cameraWrapper.getRecorder();

    // Intersect with wormhole horizon
    if (oldDistance > wormholeRadius * 0.75 && newDistance < wormholeRadius * 0.75) {
        // TODO curve trajectory when crossing
        // Teleport to other wormhole end
        // console.log(`${oldDistance} -> ${newDistance} [${wormholeRadius}]`);
        teleport(newPosition);
    }
    cameraWrapper.setCameraPosition(newPosition.x, newPosition.y, newPosition.z);

    let outerCamera = oss.getCamera();
    outerCamera.position.set(newPosition.x, newPosition.y, newPosition.z);

    // Update drawable orientation
    let q = new Quaternion();
    rec.getWorldQuaternion(q);
    innerCircle.setRotationFromQuaternion(q); // reset up vector
    outerRing.setRotationFromQuaternion(q); // ditto
    innerCircle.lookAt(newPosition);
    outerRing.lookAt(newPosition);
    let to = new Vector3(
        exit.x - (entry.x - p.x),
        exit.y - (entry.y - p.y),
        exit.z + (entry.z - p.z)
    );
    let cc = icm.getCubeCam();
    cc.setRotationFromQuaternion(q);
    cc.lookAt(to);

    // Render
    render();
}
