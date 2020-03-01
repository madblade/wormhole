import {
    Euler,
    Object3D, PerspectiveCamera, Quaternion, Vector3
} from 'three';

let CameraWrapper = function(fov, aspect, nearPlane, farPlane)
{
    // Wrap for primitive manipulation simplicity.
    let camera = new PerspectiveCamera(fov, aspect, nearPlane, farPlane);
    let up = new Object3D();
    up.add(camera);

    // 4D logic
    this.cameraTransform = [
        0, 0, 0,    // Pos transform
        0, 0, 0     // Rot transform
    ];

    // Don't expose these internal variables.
    this.cameraObject = camera;     // Explicit     (constant)

    this.rx = 0;
    this.ry = 0;
    this.rz = 0;
    this.order = 'ZYX';
};

CameraWrapper.prototype.getRecorder = function() {
    return this.cameraObject;
};

CameraWrapper.prototype.get3DObject = function() {
    return this.cameraObject;
};

CameraWrapper.prototype.getCameraPosition = function() {
    return this.get3DObject().position;
};

CameraWrapper.prototype.getUpRotation = function() {
    return this.get3DObject().rotation;
};

CameraWrapper.prototype.rotateX = function(deltaX) {
    this.rx += deltaX;
    this.rx = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, this.rx));
    this.updateQuaternionFromRotation();
};

CameraWrapper.prototype.rotateZ = function(deltaZ) {
    this.ry += deltaZ;
    this.updateQuaternionFromRotation();
};

CameraWrapper.prototype.updateQuaternionFromRotation = function()
{
    let q1 = new Quaternion();
    let q2 = new Quaternion();
    q1.setFromAxisAngle(new Vector3(1, 0, 0), this.rx);
    q2.setFromAxisAngle(new Vector3(0, 1, 0), this.ry);
    q2.multiply(q1);
    this.cameraObject.quaternion.copy(q2);
};

CameraWrapper.prototype.setCameraPosition = function(x, y, z) {
    let up = this.get3DObject();
    up.position.x = x; // + upVector[0];
    up.position.y = y; // + upVector[1];
    up.position.z = z; // + upVector[2];
};

CameraWrapper.prototype.getForwardVector = function(d)
{
    let fw = d[0]; let bw = d[1];
    let rg = d[2]; let lf = d[3];
    let up = d[4]; let dn = d[5];
    let nv = new Vector3(0, 0, 0);
    if (fw) nv.add(new Vector3(0, 0, -1)); // camera looks twd -z
    if (bw) nv.add(new Vector3(0, 0, 1));
    if (rg) nv.add(new Vector3(1, 0, 0));
    if (lf) nv.add(new Vector3(-1, 0, 0));
    if (up) nv.add(new Vector3(0, 1, 0));
    if (dn) nv.add(new Vector3(0, -1, 0));
    nv.normalize();
    let camQ = new Quaternion();
    this.cameraObject.getWorldQuaternion(camQ);
    nv.applyQuaternion(camQ);
    return nv;
};

export { CameraWrapper };
