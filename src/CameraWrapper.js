import {
    Object3D, PerspectiveCamera, Quaternion, Vector3
} from 'three';

let CameraWrapper = function(fov, aspect, nearPlane, farPlane)
{
    let camera = new PerspectiveCamera(fov, aspect, nearPlane, farPlane);
    let up = new Object3D();
    up.add(camera);

    this.wrapper = new Object3D();
    this.cameraObject = camera;
    this.int = new Object3D(); this.dn = false;
    this.wrapper.add(this.int);
    this.int.add(this.cameraObject);
    this._rx = 0;
    this._ry = 0;

    this.rx = 0;
    this.ry = 0;
    this.rz = 0;
    this.order = 'ZYX';
};

CameraWrapper.prototype.getRecorder = function() {
    return this.cameraObject;
};

CameraWrapper.prototype.get3DObject = function() {
    return this.wrapper;
};

CameraWrapper.prototype.getCameraPosition = function() {
    return this.get3DObject().position;
};

CameraWrapper.prototype.getUpRotation = function() {
    return this.get3DObject().rotation;
};

CameraWrapper.prototype.applyWrapperQuaternion = function(q)
{
    this.wrapper.quaternion.multiply(q);
};

CameraWrapper.prototype.setWrapperRotation = function(rx, ry)
{
    this._rx += rx;
    this._ry += ry;
    let q1 = new Quaternion();
    let q2 = new Quaternion();
    q1.setFromAxisAngle(new Vector3(1, 0, 0), this._rx);
    q2.setFromAxisAngle(new Vector3(0, 1, 0), this._ry);
    q2.multiply(q1);
    this.wrapper.quaternion.copy(q2);
    // this.wrapper.rotation.reorder('ZYX');
    // this.wrapper.rotation.x = rx;
    // this.wrapper.rotation.y = ry;
};

CameraWrapper.prototype.rotateX = function(deltaX) {
    this.rx += deltaX;
    // More convenient rotation without lock
    if (this.rx > 3 * Math.PI / 2) this.rx -= 2 * Math.PI;
    if (this.rx < -3 * Math.PI / 2) this.rx += 2 * Math.PI;
    // this.rx = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, this.rx));

    let q = new Quaternion();
    q.set(deltaX, 0, 0, 1).normalize();
    this.cameraObject.quaternion.multiply(q);
    // this.updateQuaternionFromRotation();
};

CameraWrapper.prototype.rotateZ = function(deltaZ) {
    if (this.rx < -Math.PI / 2 || this.rx > Math.PI / 2)
        this.ry -= deltaZ;
    else
        this.ry += deltaZ;

    let q = new Quaternion();
    q.set(0, deltaZ, 0, 1).normalize();
    this.cameraObject.quaternion.multiply(q);
    // this.updateQuaternionFromRotation();
};

CameraWrapper.prototype.flipQuaternion = function(
    // q1, // forward to center rotation
    // q2,
    dtc) // center to forward rotation
{
    // qq.copy(this.cameraObject.quaternion);
    // qq.multiply(q1); // rotate to center
    // qq.set(-qq.x, -qq.y, qq.z, qq.w).normalize(); // flip
    // qq.multiply(q2); // rotate to forward

    // let lq = new Quaternion();
    // lq.copy(this.cameraObject.quaternion);
    // let lup = new Vector3(0, 1, 0);
    // lup.applyQuaternion(lq);
    // let lr = new Quaternion();
    // lr.setFromAxisAngle(lup, Math.PI);

    // let cq = new Quaternion();
    // cq.copy(icm.getCubeCam().quaternion);
    // let cup = new Vector3(0, 1, 0);
    // cup.applyQuaternion(cq);
    // let cr = new Quaternion();
    // cr.setFromAxisAngle(cup, Math.PI);
    // cq.multiply(cr);

    // qq.set(qq.x, qq.y, qq.z, qq.w).normalize();
    // this.cameraObject.quaternion.copy(cq);

    let v0 = new Vector3(-dtc.x, -dtc.y, dtc.z);
    let v1 = new Vector3(0, 0, Math.sign(v0.z));
    let q = new Quaternion();
    q.setFromUnitVectors(v1, v0);
    q.multiply(q);
    this.cameraObject.quaternion.premultiply(q);
};

CameraWrapper.prototype.setRotationXZ = function(x, z) {
    this.rx = x;
    if (this.rx > 3 * Math.PI / 2) this.rx -= 2 * Math.PI;
    if (this.rx < -3 * Math.PI / 2) this.rx += 2 * Math.PI;
    // this.rx = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, this.rx));
    this.ry = z;
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
    if (up) nv.add(new Vector3(0, 1, 0)); // camera up +y
    if (dn) nv.add(new Vector3(0, -1, 0));
    nv.normalize();
    let camQ = new Quaternion();
    this.cameraObject.getWorldQuaternion(camQ);
    nv.applyQuaternion(camQ);
    // nv.multiplyScalar(2.0);
    return nv;
};

export { CameraWrapper };
