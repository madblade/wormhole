
// scene size
import {
    Quaternion,
    Scene, Vector3,
    WebGLRenderer
} from 'three';
import { Room } from './Room';
import {
    addCubeWall, addListeners, getHalfSphere, getSmallSphere, newComposer
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

let wormholeRadius;
let wormholeEntry;
let wormholeExit;

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

    wormholeEntry = new Vector3(0, 40, 0);
    wormholeExit = new Vector3(0, 50, -150);
    wormholeRadius = 20;

    // Outer ring
    oss = new OuterReversedStretch(width, height,
        wormholeRadius, 2 * wormholeRadius,
        wormholeEntry, cameraWrapper
    );

    // Inner ring
    icm = new InnerCubeMap(width, height,
        wormholeRadius,
        wormholeEntry,
        wormholeExit
    );

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
    // roomMesh.scale.set(2, 2, 2);
    scene.add(roomMesh);

    // Cube tunnel
    addCubeWall(scene);

    // Controls
    addListeners(
        cameraWrapper, icm,
        halfSphere, state
    );
}

// 1. log camera distance to blackhole object
// 3. adjust ring outer size
// 5. adjust ring inner size
// On top of setting object.renderOrder you have to set
// material.depthTest to false on the relevant objects.

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

    // Update camera position
    let p = cameraWrapper.getCameraPosition();
    let fw = cameraWrapper.getForwardVector([
        state.forwardDown, state.backDown, state.rightDown, state.leftDown,
        state.upDown, state.downDown
    ], false);
    let oldDistance = p.distanceTo(wormholeEntry);
    let newPosition = new Vector3(p.x + fw[0], p.y + fw[1], p.z + fw[2]);
    let newDistance = newPosition.distanceTo(wormholeEntry);

    let exit = icm.getExit();
    let entry = icm.getEntry();
    let innerCircle = icm.getMesh();
    let outerRing = oss.getMesh();
    let rec = cameraWrapper.getRecorder();

    // Intersect with wormhole horizon
    if (oldDistance > wormholeRadius && newDistance < wormholeRadius) {
        // TODO rotate on teleport
        // Teleport to other wormhole end
        // console.log(`${oldDistance} -> ${newDistance} [${wormholeRadius}]`);
        newPosition.set(
            newPosition.x + wormholeExit.x - wormholeEntry.x,
            newPosition.y + wormholeExit.y - wormholeEntry.y,
            newPosition.z + wormholeExit.z - wormholeEntry.z,
        );
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
    cc.lookAt(to);

    // Remove drawable objects
    scene.remove(outerRing);
    scene.remove(innerCircle);
    innerCircle.visible = false;

    // Render outer ring with fxaa
    effectComposer.render();
    effectComposer.render();
    // Render inner circle with cube map
    icm.getCubeCam().update(renderer, scene);
    // oss.setScale(oss.getScale() + 0.001);
    // icm.setScale(icm.getScale() + 0.001);

    // Add drawable objects
    innerCircle.visible = true;
    scene.add(outerRing);
    scene.add(innerCircle);

    // Render full scene
    renderer.render(scene, camera);
}
