/**
 * (c) madblade 2020
 * https://creativecommons.org/licenses/by/3.0/
 * -- please consider giving credit --
 */

import { Quaternion, Vector3 } from 'three';
import { MobileWidgetControls } from './MobileWidgetControls';

/**
 * THREE.JS mobile camera FPS control.
 * @param element
 *      HTML element used to draw the canvas.
 *      For example a
 *      <div id="widget"> just under the body tag.
 * @param camera
 *      Three.JS PerspectiveCamera.
 * @param controlsType
 *      'quaternion' for unconstrained Quaternion.
 *      'spherical' for XZ-constrained Euler angles
 *          (better for games where the player stays up).
 *      Feel free to adapt to your needs.
 * @param controlsTheme
 *      Supported themes:
 *      'playstation', 'xbox', 'default'
 * @constructor
 */
let MobileWidgetCameraControls = function(
    element, camera,
    controlsType,
    controlsTheme
) {
    this.camera = camera;
    this.controlsType = controlsType;
    this.cameraMovementSpeed = 1 / 2;
    this.cameraRotationSpeed = 1 / 150;

    // Stick states
    this.leftX = 0;
    this.leftY = 0;
    this.rightX = 0;
    this.rightY = 0;

    // For Euler-type controls
    this.rx = 0;
    this.ry = 0;

    // Callbacks
    let onLeftStickMove = (x, y) => {
        this.leftX = x;
        this.leftY = y;
    };

    let onRightStickMove = (x, y) => {
        this.rightX = x;
        this.rightY = y;
    };

    let onButtonChange = (which, isHeld) => {
        console.log(`Button ${which} ${isHeld ? 'pressed' : 'released'}.`);
    };

    this.widgetControls = new MobileWidgetControls(
        element, onLeftStickMove, onRightStickMove, onButtonChange,
        controlsTheme || 'default'
    );

    // Prevent user from selecting text while moving fingers about.
    this.widgetControls.makeDocumentUnselectable();
};

/**
 * animation utility function
 * !!!To be called at every playable/gameplay-refresh frame!!!
 */
MobileWidgetCameraControls.prototype.animate = function()
{
    // 1. Camera rotation.
    let cameraRotationSpeed = this.cameraRotationSpeed;
    let deltaX = this.rightX * cameraRotationSpeed;
    let deltaZ = this.rightY * cameraRotationSpeed;
    if (Math.abs(deltaX) > 0) {
        this.camera.rotateZ(-deltaX);
    }
    if (Math.abs(deltaX) > 0) {
        this.camera.rotateX(-deltaZ);
    }

    // 3. Update gamepad model.
    this.widgetControls.animate();
};

MobileWidgetCameraControls.prototype.getForwardVectorFromStick = function() {
    let cameraMovementSpeed = this.cameraMovementSpeed;
    let dx = this.leftX * cameraMovementSpeed;
    let dy = this.leftY * cameraMovementSpeed;
    let forwardVector = this.getForwardVector(dx, -dy);
    return new Vector3(
        forwardVector.x * cameraMovementSpeed,
        forwardVector.y * cameraMovementSpeed,
        forwardVector.z * cameraMovementSpeed,
    );
};

MobileWidgetCameraControls.prototype.getForwardVector = function(x, y)
{
    let nv = new Vector3(x, 0, -y);
    nv.normalize();
    let camQ = new Quaternion();
    this.camera.cameraObject.getWorldQuaternion(camQ);
    nv.applyQuaternion(camQ);
    return nv;
};

export { MobileWidgetCameraControls };
