import {BoxGeometry, CylinderBufferGeometry, IcosahedronBufferGeometry, Mesh, MeshPhongMaterial, SphereBufferGeometry} from 'three';

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

}

function addListeners(camera, halfSphere)
{
    document.addEventListener('keydown', event => {
        switch (event.keyCode) {
            // OBJ
            case 51: // fwd
                halfSphere.position.z++;
                break;
            case 80: // bwd
                halfSphere.position.z--;
                break;
            case 186: // left
                halfSphere.position.y--;
                break;
            case 79: // right
                halfSphere.position.y++;
                break;

            // CAM
            case 71: // fwd
                camera.position.z++;
                break;
            case 40: // bwd
                camera.position.z--;
                break;
            case 38: // left
                camera.position.y--;
                break;
            case 90: // right
                camera.position.y++;
                break;
            default: break;
        }
    });
}

export { addListeners, getHalfSphere, getSmallSphere, addCubeWall };
