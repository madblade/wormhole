import {
    Object3D, PerspectiveCamera
} from 'three';

let CameraWrapper = function(fov, aspect, nearPlane, farPlane)
{
    // Wrap for primitive manipulation simplicity.
    let camera = new PerspectiveCamera(fov, aspect, nearPlane, farPlane);
    camera.position.set(0, 0, 0);
    camera.rotation.set(0, 0, 0);
    let pitch = new Object3D();
    let yaw = new Object3D();
    let up = new Object3D();
    pitch.add(camera);
    yaw.add(pitch);
    up.add(yaw);
    up.rotation.reorder('ZYX');

    // 4D logic
    this.cameraTransform = [
        0, 0, 0,    // Pos transform
        0, 0, 0     // Rot transform
    ];

    // Don't expose these internal variables.
    this.up = up;                   // 3D 'gravity' constraint (full rotation)
    this.yaw = yaw;                 // Top-level    (rotation.z, position)
    this.pitch = pitch;             // Intermediate (rotation.x)
    this.cameraObject = camera;     // Explicit     (constant)
};

CameraWrapper.prototype.getRecorder = function() {
    return this.cameraObject;
};

CameraWrapper.prototype.get3DObject = function() {
    return this.up;
};

CameraWrapper.prototype.getCameraPosition = function() {
    return this.up.position;
};

CameraWrapper.prototype.getUpRotation = function() {
    return this.up.rotation;
};

CameraWrapper.prototype.rotateX = function(deltaX) {
    let pitch = this.pitch;
    pitch.rotation.x += deltaX;
    pitch.rotation.x = Math.max(0, Math.min(Math.PI, pitch.rotation.x));
};

CameraWrapper.prototype.rotateZ = function(deltaZ) {
    let yaw = this.yaw;
    yaw.rotation.z += deltaZ;
};

CameraWrapper.prototype.setUpRotation = function(x, y, z) {
    let up = this.up;
    up.rotation.x = x;
    up.rotation.y = y;
    up.rotation.z = z;
};

CameraWrapper.prototype.getXRotation = function() {
    return this.pitch.rotation.x;
};

CameraWrapper.prototype.setXRotation = function(rotationX) {
    this.pitch.rotation.x = rotationX;
};

CameraWrapper.prototype.getZRotation = function() {
    return this.yaw.rotation.z;
};

CameraWrapper.prototype.setZRotation = function(rotationZ) {
    this.yaw.rotation.z = rotationZ;
};

CameraWrapper.prototype.copyCameraPosition = function(otherCamera)
{
    if (otherCamera) {
        let up = this.up.position;
        let oup = otherCamera.getCameraPosition();
        up.x = oup.x;
        up.y = oup.y;
        up.z = oup.z;
    }
};

CameraWrapper.prototype.copyCameraUpRotation = function(otherCamera) {
    if (otherCamera) {
        let ur = this.up.rotation;
        let our = otherCamera.getUpRotation();
        ur.x = our.x;
        ur.y = our.y;
        ur.z = our.z;
    }
};

CameraWrapper.prototype.setCameraPosition = function(x, y, z) {
    let up = this.up;

    let sin = Math.sin;
    let cos = Math.cos;
    let PI = Math.PI;
    let rup = this.get3DObject().rotation;
    let theta0 = rup.z + PI;
    let theta1 = rup.x;
    let f = 0.7999;
    // Formula works for 4 out of 6 faces...
    let upVector = [
        -f * sin(theta1) * sin(theta0),
        f * sin(theta1) * cos(theta0),
        f * cos(theta1)
    ];

    up.position.x = x; // + upVector[0];
    up.position.y = y; // + upVector[1];
    up.position.z = z; // + upVector[2];
};

CameraWrapper.prototype.getForwardVector = function(d, project2D)
{
    let PI  = Math.PI;
    let cos = Math.cos;
    let sin = Math.sin;
    let acos = Math.acos;
    let sgn = Math.sign;
    let sqrt = Math.sqrt;
    let square = x => x * x;
    let PI2 = PI / 2;
    let PI4 = PI / 4;
    let PI34 = 3 * PI4;

    let relTheta0 = this.yaw.rotation.z; let relTheta1 = this.pitch.rotation.x;
    let absTheta0 = 0; let absTheta1 = -Math.PI / 2;

    let fw = d[0] && !d[1]; let bw = !d[0] && d[1];
    let rg = d[2] && !d[3]; let lf = !d[2] && d[3];
    let up = d[4] && !d[5]; let dn = !d[4] && d[5];

    if (project2D) {
        relTheta1 = PI2;
    }

    let nb0 = (fw || bw) + (rg || lf) + (up || dn);
    if (nb0 === 0) return [0, 0, 0];

    let getPsy1 = function(theta0, theta1, phi0, phi1) {
        let st0 = sin(theta0); let st1 = sin(theta1); let ct0 = cos(theta0);
        let ct1 = cos(theta1);
        let sp0 = sin(phi0); let sp1 = sin(phi1); let cp0 = cos(phi0);
        let cp1 = cos(phi1);
        return acos((ct1 + cp1) /
            sqrt(square(st1 * st0 + sp1 * sp0) + square(st1 * ct0 + sp1 * cp0) + square(ct1 + cp1))
        );
    };

    let getPsy0 = function(theta0, theta1, phi0, phi1) {
        let st0 = sin(theta0); let st1 = sin(theta1);
        let ct0 = cos(theta0); // ct1 = cos(theta1),
        let sp0 = sin(phi0); let sp1 = sin(phi1);
        let cp0 = cos(phi0); // , cp1 = cos(phi1);

        let s = sgn(st1 * st0 + sp1 * sp0);
        return s *
            acos((st1 * ct0 + sp1 * cp0) /
                sqrt(square(st1 * st0 + sp1 * sp0) + square(st1 * ct0 + sp1 * cp0))
            );
    };

    if (nb0 === 1)
    {
        if (fw); // {}
        else if (bw)  relTheta1 += PI;
        else if (up)  relTheta1 += PI2;
        else if (dn)  relTheta1 -= PI2;
        else if (rg) {relTheta0 -= PI2; relTheta1 = PI2;}
        else if (lf) {relTheta0 += PI2; relTheta1 = PI2;}
        else {
            console.log('[RigidBodies] Undefined direction (1).');
            return [0, 0, 0];
        }
    }
    else if (nb0 === 2)
    {
        let t0 = relTheta0;
        let t1 = relTheta1;

        switch (true)
        {
            case fw && up: relTheta1 += PI4; break;
            case fw && dn: relTheta1 -= PI4; break;
            case bw && up: relTheta1 += PI34; break;
            case bw && dn: relTheta1 -= PI34; break;

            case fw && rg:
                relTheta0 = getPsy0(t0, t1, t0 - PI2, PI2) || 0;
                relTheta1 = getPsy1(t0, t1, t0 - PI2, PI2) || 0;
                break;
            case fw && lf:
                relTheta0 = getPsy0(t0, t1, t0 + PI2, PI2) || 0;
                relTheta1 = getPsy1(t0, t1, t0 + PI2, PI2) || 0;
                break;

            case bw && rg:
                relTheta0 = getPsy0(t0, t1 + PI, t0 - PI2, PI2) || 0;
                relTheta1 = getPsy1(t0, t1 + PI, t0 - PI2, PI2) || 0;
                break;

            case bw && lf:
                relTheta0 = getPsy0(t0, t1 + PI, t0 + PI2, PI2) || 0;
                relTheta1 = getPsy1(t0, t1 + PI, t0 + PI2, PI2) || 0;
                break;

            case rg && up:
                relTheta0 = getPsy0(t0, t1 + PI2, t0 - PI2, PI2) || 0;
                relTheta1 = getPsy1(t0, t1 + PI2, t0 - PI2, PI2) || 0;
                break;

            case rg && dn:
                relTheta0 = getPsy0(t0, t1 - PI2, t0 - PI2, PI2) || 0;
                relTheta1 = getPsy1(t0, t1 - PI2, t0 - PI2, PI2) || 0;
                break;

            case lf && up:
                relTheta0 = getPsy0(t0, t1 + PI2, t0 + PI2, PI2) || 0;
                relTheta1 = getPsy1(t0, t1 + PI2, t0 + PI2, PI2) || 0;
                break;

            case lf && dn:
                relTheta0 = getPsy0(t0, t1 - PI2, t0 + PI2, PI2) || 0;
                relTheta1 = getPsy1(t0, t1 - PI2, t0 + PI2, PI2) || 0;
                break;

            default:
                console.log('[RigidBodies] Undefined direction (2).');
                return [0, 0, 0];
        }
    }

    let cosAbs0 = cos(absTheta0); let cosRel0 = cos(relTheta0);
    let cosAbs1 = cos(absTheta1); let cosRel1 = cos(relTheta1);
    let sinAbs0 = sin(absTheta0); let sinRel0 = sin(relTheta0);
    let sinAbs1 = sin(absTheta1); let sinRel1 = sin(relTheta1);

    // let absUpVector = [sinAbs1 * cosAbs0, sinAbs1 * sinAbs0, cosAbs1];
    // let absFrontVector = [cosAbs1 * cosAbs0, cosAbs1 * sinAbs0, -sinAbs1];
    // let relUpVector =       [sinRel1 * cosRel0, sinRel1 * sinRel0, cosRel1];
    // let relFrontVector =    [- sinRel1 * sinRel0, sinRel1 * cosRel0, -cosRel1];

    let relFrontVector;

    // Rz(theta0) times Rx(theta1) times Forward [-sinRel1*sinRel0, sinRel1*cosRel0, -cosRel1]
    // N.B. Plane normal is Rz(theta0).Rx(theta1).(0,0,-1).
    // Rz(0)             Rx(1)
    // ( c  -s   0 )     ( 1   0   0 )     ( c0   -s0c1   s0s1 )
    // ( s   c   0 )  X  ( 0   c  -s )  =  ( s0    c0c1  -c0s1 )
    // ( 0   0   1 )     ( 0   s   c )     ( 0     s1     c1   )
    // =>
    // ( c0(-S1S0) - s0c1(S1C0) - s0s1C1 )
    // ( s0(-S1S0) + c0c1(S1C0) - c0s1C1 )
    // ( s1(S1C0) - c1C1 )
    relFrontVector =    [
        -sinRel1 * sinRel0 * cosAbs0   -   sinRel1 * cosRel0 * sinAbs0 * cosAbs1   -   cosRel1 * sinAbs0 * sinAbs1,
        -sinRel1 * sinRel0 * sinAbs0   +   sinRel1 * cosRel0 * cosAbs0 * cosAbs1   +   cosRel1 * cosAbs0 * sinAbs1,
        /**/                               sinRel1 * cosRel0 * sinAbs1             -   cosRel1 * cosAbs1
    ];

    return relFrontVector;
};

export { CameraWrapper };
