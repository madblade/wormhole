import {Group, Mesh, MeshPhongMaterial, PlaneBufferGeometry, PointLight} from 'three';

let Room = function(
    colorWall1, colorWall2, colorWall3, colorFloor)
{
    this.colorWall1 = colorWall1;
    this.colorWall2 = colorWall2;
    this.colorWall3 = colorWall3;
    this.colorFloor = colorFloor;
};

Room.prototype.getMesh = function()
{
    let mesh = new Group();

    let planeGeo = new PlaneBufferGeometry(100.1, 100.1);

    let planeTop = new Mesh(planeGeo,
        new MeshPhongMaterial({ color: this.colorFloor }));
    planeTop.position.y = 100;
    planeTop.rotateX(Math.PI / 2);

    let planeBottom = new Mesh(planeGeo,
        new MeshPhongMaterial({ color: this.colorFloor }));
    planeBottom.rotateX(-Math.PI / 2);
    mesh.add(planeBottom);

    let planeOpposite = new Mesh(planeGeo,
        new MeshPhongMaterial({ color: this.colorWall1 }));
    planeOpposite.position.y = 50;
    planeOpposite.position.z = -50;
    mesh.add(planeOpposite);

    let planeFront = new Mesh(planeGeo,
        new MeshPhongMaterial({ color: this.colorWall1 }));
    planeFront.position.z = 50;
    planeFront.position.y = 50;
    planeFront.rotateY(Math.PI);
    mesh.add(planeFront);

    let planeRight = new Mesh(planeGeo,
        new MeshPhongMaterial({ color: this.colorWall2 }));
    planeRight.position.x = 50;
    planeRight.position.y = 50;
    planeRight.rotateY(-Math.PI / 2);
    mesh.add(planeRight);

    let planeLeft = new Mesh(planeGeo,
        new MeshPhongMaterial({ color: this.colorWall3 }));
    planeLeft.position.x = -50;
    planeLeft.position.y = 50;
    planeLeft.rotateY(Math.PI / 2);
    mesh.add(planeLeft);

    // lights
    let mainLight = new PointLight(this.colorFloor, 1.5, 250);
    mainLight.position.y = 60;
    mesh.add(mainLight);

    let greenLight = new PointLight(this.colorWall2, 0.25, 1000);
    greenLight.position.set(550, 50, 0);
    mesh.add(greenLight);

    let redLight = new PointLight(this.colorWall3, 0.25, 1000);
    redLight.position.set(-550, 50, 0);
    mesh.add(redLight);

    let blueLight = new PointLight(this.colorWall1, 0.25, 1000);
    blueLight.position.set(0, 50, 550);
    mesh.add(blueLight);

    let whiteLight = new PointLight(this.colorFloor, 1.5, 300);
    whiteLight.position.set(0, 50, -200);
    mesh.add(whiteLight);

    return mesh;
};

export { Room };
