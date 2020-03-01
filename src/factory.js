import {
    BoxBufferGeometry,
    BoxGeometry,
    CylinderBufferGeometry,
    IcosahedronBufferGeometry,
    Mesh, MeshBasicMaterial,
    MeshNormalMaterial,
    MeshPhongMaterial,
    SphereBufferGeometry,
    TetrahedronBufferGeometry
} from 'three';
import {ShaderPass} from 'three/examples/jsm/postprocessing/ShaderPass';
import {FXAAShader} from 'three/examples/jsm/shaders/FXAAShader';
import {EffectComposer} from 'three/examples/jsm/postprocessing/EffectComposer';
import {RenderPass} from 'three/examples/jsm/postprocessing/RenderPass';

function getHalfSphere()
{
    let geometry = new CylinderBufferGeometry(
        0.1, 15 * Math.cos(Math.PI / 180 * 30),
        0.1, 24, 1
    );
    let material = new MeshPhongMaterial({
        color: 0xffffff, emissive: 0x444444, wireframe: true
    });
    let sphereCap = new Mesh(geometry, material);
    sphereCap.position.y = -15 * Math.sin(Math.PI / 180 * 30) - 0.05;
    sphereCap.rotateX(-Math.PI);

    geometry = new SphereBufferGeometry(
        15, 24, 24);
    let halfSphere = new Mesh(geometry, material);
    halfSphere.add(sphereCap);
    halfSphere.rotateX(-Math.PI / 180 * 135);
    halfSphere.rotateZ(-Math.PI / 180 * 20);
    halfSphere.position.y = 7.5 + 15 * Math.sin(Math.PI / 180 * 30);

    return halfSphere;
}

function getSmallSphere()
{
    let geometry = new IcosahedronBufferGeometry(5, 0);
    let material = new MeshPhongMaterial({ color: 0xffffff, emissive: 0x333333, flatShading: true });
    let smallSphere = new Mesh(geometry, material);
    return smallSphere;
}

function addWall(scene, type)
{
    let tetGeo = type === 'tet' ?
        new TetrahedronBufferGeometry(12.5, 0) :
        new BoxBufferGeometry(12.5, 12.5, 12.5);
    let tet; let pi = Math.PI;
    let r = 200; let phiMax = 20; let theMax = 20;
    for (let phi = 2; phi < phiMax - 1; ++phi) {
        for (let the = 0; the < theMax; ++the) {
            tet = new Mesh(tetGeo, new MeshBasicMaterial(
                { color: 0xffffff * Math.random() }
            ));
            let phiTrue = pi * phi / phiMax;
            let theTrue = 2 * pi * the / theMax;
            tet.position.x = r * Math.sin(phiTrue) * Math.cos(theTrue);
            tet.position.y = r * Math.sin(phiTrue) * Math.sin(theTrue);
            tet.position.z = r * Math.cos(phiTrue);
            scene.add(tet);
        }
    }
}

function addCubeWall(scene)
{
    let cubeGeo = new BoxGeometry(12.5, 12.5, 12.5);
    let cube = new Mesh(cubeGeo, new MeshPhongMaterial({ color: 0xff0000 }));
    cube.position.z = -230;
    cube.position.y = 25;
    scene.add(cube);
    for (let i = -10; i < 10; ++i) {
        for (let j = -10; j < 10; ++j) {
            cubeGeo = new BoxGeometry(12.5, 12.5, 12.5);
            var cube2 = new Mesh(cubeGeo,
                new MeshPhongMaterial({ color: 0xffffff * Math.random() }));
            cube2.position.z = -230;
            cube2.position.y = 25 + 25 * j;
            cube2.position.x = 25 * i;
            scene.add(cube2);
        }
    }
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

function addListeners(
    camera, icm,
    state,
    eventContainer
) {
    const azerty = {
        FORWARD: 90, // z
        BACKWARD: 83, // s
        LEFT: 81, // q
        RIGHT: 68, // d
        DOWN: 16, // shift
        UP: 32 // space
    };
    const qwerty = {
        FORWARD: 87, // w
        BACKWARD: 83, // s
        LEFT: 65, // a
        RIGHT: 68, // d
        DOWN: 16, // shift
        UP: 32 // space
    };
    const arrows = {
        FORWARD: 38, // up
        BACKWARD: 40, // down
        LEFT: 37, // left
        RIGHT: 39, // right
        DOWN: 16, // shift
        UP: 32 // space
    };
    const bepo = {
        FORWARD: 51, // »
        BACKWARD: 80, // p
        LEFT: 186, // é
        RIGHT: 79, // o
        DOWN: 50, // «
        UP: 52  // (
    };

    document.addEventListener('keydown', event => {
        switch (event.keyCode) {
            case azerty.FORWARD: case qwerty.FORWARD:
            case arrows.FORWARD: case bepo.FORWARD:
                state.forwardDown = true; break;
            case azerty.BACKWARD: case qwerty.BACKWARD:
            case arrows.BACKWARD: case bepo.BACKWARD:
                state.backDown = true; break;
            case azerty.LEFT: case qwerty.LEFT:
            case arrows.LEFT: case bepo.LEFT:
                state.leftDown = true; break;
            case azerty.RIGHT: case qwerty.RIGHT:
            case arrows.RIGHT: case bepo.RIGHT:
                state.rightDown = true; break;
            case azerty.DOWN: case qwerty.DOWN:
            case arrows.DOWN: case bepo.DOWN:
                state.downDown = true; break;
            case azerty.UP: case qwerty.UP:
            case arrows.UP: case bepo.UP:
                state.upDown = true; break;
            default: break;
        }
    });

    document.addEventListener('keyup', event => {
        switch (event.keyCode) {
            case azerty.FORWARD: case qwerty.FORWARD:
            case arrows.FORWARD: case bepo.FORWARD:
                state.forwardDown = false; break;
            case azerty.BACKWARD: case qwerty.BACKWARD:
            case arrows.BACKWARD: case bepo.BACKWARD:
                state.backDown = false; break;
            case azerty.LEFT: case qwerty.LEFT:
            case arrows.LEFT: case bepo.LEFT:
                state.leftDown = false; break;
            case azerty.RIGHT: case qwerty.RIGHT:
            case arrows.RIGHT: case bepo.RIGHT:
                state.rightDown = false; break;
            case azerty.DOWN: case qwerty.DOWN:
            case arrows.DOWN: case bepo.DOWN:
                state.downDown = false; break;
            case azerty.UP: case qwerty.UP:
            case arrows.UP: case bepo.UP:
                state.upDown = false; break;
            default: break;
        }
    });

    let resetState = () => {
        // state.mouseDown = false;
        state.forwardDown = false;
        state.leftDown = false;
        state.rightDown = false;
        state.backDown = false;
        state.downDown = false;
        state.upDown = false;
    };

    document.addEventListener('focusout', resetState);
    document.addEventListener('visibilitychange', resetState);
    // document.addEventListener('mouseout', resetState);

    document.addEventListener('mousemove', event => {
        if (!state.mouseDown) return;
        let relX = event.movementX || event.mozMovementX || event.webkitMovementX || 0;
        let relY = event.movementY || event.mozMovementY || event.webkitMovementY || 0;
        // rotate main camera
        eventContainer.push([-relX * 0.002, -relY * 0.002]);
    });

    document.addEventListener('mousedown', () => {
        state.mouseDown = true;
    });

    document.addEventListener('mouseup', () => {
        state.mouseDown = false;
    });
}

export { addListeners, getHalfSphere, getSmallSphere, addWall, addCubeWall, newComposer };
