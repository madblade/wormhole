
import 'bootstrap/dist/css/bootstrap.min.css';

// scene size
import {
    Quaternion,
    Scene, Vector3,
    WebGLRenderer
} from 'three';
import {
    addLights, addListeners, addWall,
    newComposer
} from './factory';
import { InnerCubeMap } from './InnerCubeMap';
import { CameraWrapper } from './CameraWrapper';
import { OuterReversedStretch } from './OuterReversedStretch';

// Depth buffer interesting articles
// https://threejs.org/examples/webgl_depth_texture.html
// https://stackoverflow.com/questions/50530765/how-do-i-access-depth-data-in-three-js
// https://stackoverflow.com/questions/23362076/opengl-how-to-access-depth-buffer-values-or-gl-fragcoord-z-vs-rendering-d

// scene size
let WIDTH = window.innerWidth;
let HEIGHT = window.innerHeight;

// camera
let VIEW_ANGLE = 90;
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
    upDown: false,

    touchLeft: false,
    touchRight: false,
    touchUp: false,
    touchDown: false
};
let oss;
let icm;

let effectComposerS1;
let effectComposerS2;

let wormholeRadius;
let wormholeEntry;
let wormholeExit;

let eventContainer = [];
let currentWorld = '1';

init();
animate();

function init()
{
    const isTouch = ('ontouchstart' in window) || (navigator.msMaxTouchPoints > 0);
    if (isTouch) {
        document.getElementById('info').style.display = 'none';
    } else {
        document.getElementById('widget').style.display = 'none';
    }
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
    cameraWrapper = new CameraWrapper(VIEW_ANGLE, ASPECT, NEAR, FAR, 'quaternion', isTouch);
    camera = cameraWrapper.getRecorder();
    cameraWrapper.setCameraPosition(100, 40, 0);
    cameraWrapper.setRotationXZ(0, Math.PI / 2);
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
        wormholeEntry, cameraWrapper, 8
    );
    scene1.add(oss.getMesh());

    // Inner ring
    icm = new InnerCubeMap(width, height,
        wormholeRadius,
        wormholeEntry,
        wormholeExit, 4
    );
    scene1.add(icm.getMesh());
    scene2.add(icm.getWrapper()); // Rotate cube cam

    // Rendering
    effectComposerS1 = newComposer(renderer, scene1, camera, oss.getRenderTarget());
    effectComposerS2 = newComposer(renderer, scene2, camera, oss.getRenderTarget());

    // Lights
    addLights(scene1);
    addLights(scene2);

    // Background
    addWall(scene1, 'tet');
    addWall(scene2, 'box');

    // Controls
    addListeners(
        cameraWrapper, icm,
        state,
        eventContainer, renderer
    );
}

function teleport(newPosition)
{
    let cam = cameraWrapper.get3DObject();
    let ossMesh = oss.getMesh();
    let icmMesh = icm.getMesh();
    let icmCam = icm.getWrapper();
    let sourceScene; let entry;
    let destinationScene; let exit;

    if (currentWorld === '1') {
        currentWorld = '2';
        sourceScene = scene1;
        destinationScene = scene2;
        entry = icm.getEntry();
        exit = icm.getExit();
    } else {
        currentWorld = '1';
        sourceScene = scene2;
        destinationScene = scene1;
        entry = icm.getExit();
        exit = icm.getEntry();
    }

    sourceScene.remove(cam);
    sourceScene.remove(ossMesh);
    sourceScene.remove(icmMesh);
    destinationScene.remove(icmCam);

    destinationScene.add(cam);
    destinationScene.add(ossMesh);
    destinationScene.add(icmMesh);
    sourceScene.add(icmCam);

    icmMesh.position.copy(exit);
    icm.getWrapper().position.copy(entry);
    ossMesh.position.copy(exit);

    // To center
    let dtc = new Vector3();
    dtc.copy(newPosition).negate().add(entry).normalize();
    cameraWrapper.flipQuaternion(dtc);

    // Mirror newPosition from worm center
    // ex + (en - p)
    newPosition.set(
        exit.x - (entry.x - newPosition.x),
        exit.y - (entry.y - newPosition.y),
        exit.z + (entry.z - newPosition.z) // flip on z axis
    );
}

function updatePlayerPosition()
{
    let wormholeCurrentScene;
    let wormholeOtherScene;
    if (currentWorld === '1') {
        wormholeCurrentScene = icm.getEntry();
        wormholeOtherScene = icm.getExit();
    } else {
        wormholeCurrentScene = icm.getExit();
        wormholeOtherScene = icm.getEntry();
    }

    let p = cameraWrapper.getCameraPosition();
    let fw = cameraWrapper.getForwardVector([
        state.forwardDown, state.backDown, state.rightDown, state.leftDown,
        state.upDown, state.downDown
    ], false);
    let oldDistance = p.distanceTo(wormholeCurrentScene);

    // let fwNorm = 1.0;
    // fw.multiplyScalar(fwNorm);
    /// Distort trajectory
    if (fw.distanceTo(new Vector3(0, 0, 0)) > 0 &&
        oldDistance < 4 * wormholeRadius)
    {
        // Gravity field
        let g = wormholeRadius / 2;
        let gravity = new Vector3();
        gravity.copy(p).negate();
        gravity.add(wormholeCurrentScene);
        gravity.multiplyScalar(// fwNorm *
            g / Math.pow(oldDistance, 3));
        // Angle between new and fw
        let newFw = new Vector3();
        newFw.copy(fw).add(gravity);
        let newDirection = new Vector3();
        newDirection.copy(newFw).normalize();
        let angle = new Quaternion();
        // let fwNormalized = new Vector3();
        // fwNormalized.copy(fw).normalize();
        angle.setFromUnitVectors(
            // fwNormalized,
            fw,
            newFw);
        cameraWrapper.get3DObject().quaternion.premultiply(angle);
        fw.copy(newFw);
    }

    let newPosition = new Vector3(p.x + fw.x, p.y + fw.y, p.z + fw.z);
    let newDistance = newPosition.distanceTo(wormholeCurrentScene);

    // Intersect with wormhole horizon
    if (oldDistance >= wormholeRadius * 0.5 && newDistance < wormholeRadius * 0.5) {
        teleport(newPosition);
        // Switch wormhole positions
        let temp = wormholeCurrentScene;
        wormholeCurrentScene = wormholeOtherScene;
        wormholeOtherScene = temp;
    }

    // Update camera (player cam === outer ring cam) position
    cameraWrapper.setCameraPosition(newPosition.x, newPosition.y, newPosition.z);

    // Inner and outer wormhole orientation to face camera
    let innerCircle = icm.getMesh();
    let outerRing = oss.getMesh();
    let rec = cameraWrapper.getRecorder();
    let q = new Quaternion();
    rec.getWorldQuaternion(q);
    innerCircle.setRotationFromQuaternion(q); // reset up vector
    outerRing.setRotationFromQuaternion(q); // reset up vector
    innerCircle.lookAt(newPosition);
    outerRing.lookAt(newPosition);

    // Cubecam orientation flipped (for entry effect)
    let to = new Vector3(
        wormholeOtherScene.x - (wormholeCurrentScene.x - p.x),
        wormholeOtherScene.y - (wormholeCurrentScene.y - p.y),
        wormholeOtherScene.z + (wormholeCurrentScene.z - p.z)
    );
    let cc = icm.getCubeCam();
    cc.setRotationFromQuaternion(q);
    cc.lookAt(to);
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
    effectComposer.render(); // This fixes the render sync bug
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

    // Update controls
    // if (state.touchLeft) eventContainer.push([0.006, 0]);
    // if (state.touchRight) eventContainer.push([-0.006, 0]);
    // if (state.touchUp) eventContainer.push([0, 0.006]);
    // if (state.touchDown) eventContainer.push([0, -0.006]);

    cameraWrapper.animateTouch();

    for (let i = 0; i < eventContainer.length; ++i) {
        let e = eventContainer[i];
        if (e[0]) cameraWrapper.rotateZ(e[0]);
        if (e[1]) cameraWrapper.rotateX(e[1]);
    }
    eventContainer.length = 0;

    // Update camera position
    updatePlayerPosition();

    // Render
    render();
}
