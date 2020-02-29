import {BoxGeometry, CylinderBufferGeometry, IcosahedronBufferGeometry, Mesh, MeshPhongMaterial, SphereBufferGeometry} from 'three';
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
    halfSphere, state
) {
    document.addEventListener('keydown', event => {
        switch (event.keyCode) {
            case 51: // fwd
                state.forwardDown = true; break;
            case 80: // bwd
                state.backDown = true; break;
            case 186: // left
                state.leftDown = true; break;
            case 79: // right
                state.rightDown = true; break;
            case 16:
                state.downDown = true; break;
            case 32:
                state.upDown = true; break;
            // right hand
            // case 71: // fwd
            // case 40: // bwd
            // case 38: // left
            // case 90: // right
            default: break;
        }
    });

    document.addEventListener('keyup', event => {
        switch (event.keyCode) {
            case 51: // fwd
                state.forwardDown = false; break;
            case 80: // bwd
                state.backDown = false; break;
            case 186: // left
                state.leftDown = false; break;
            case 79: // right
                state.rightDown = false; break;
            case 16:
                state.downDown = false; break;
            case 32:
                state.upDown = false; break;
            default: break;
        }
    });

    document.addEventListener('mousemove', event => {
        if (!state.mouseDown) return;
        let relX = event.movementX || event.mozMovementX || event.webkitMovementX || 0;
        let relY = event.movementY || event.mozMovementY || event.webkitMovementY || 0;
        // rotate main camera
        // TODO rotate only in animate
        camera.rotateZ(-relX * 0.002);
        camera.rotateX(-relY * 0.002);
    });

    document.addEventListener('mousedown', () => {
        state.mouseDown = true;
    });

    document.addEventListener('mouseup', () => {
        state.mouseDown = false;
    });
}

export { addListeners, getHalfSphere, getSmallSphere, addCubeWall, newComposer };
