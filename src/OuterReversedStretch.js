import {
    DoubleSide, LinearFilter, Mesh, NearestFilter, PerspectiveCamera, RGBFormat,
    RingBufferGeometry, ShaderMaterial, WebGLRenderTarget
} from 'three';

const OuterReversedStretchVS = `
varying vec4 pos_frag;
varying vec4 cent_frag;
varying vec3 v_position;
varying vec3 v_center;
attribute vec2 vertex2D;
varying vec2 vUv;
void main() {
    vUv = uv;
    v_position = (modelMatrix * vec4(position, 1.0)).xyz - modelMatrix[3].xyz;
    v_center = (modelMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz - modelMatrix[3].xyz;
    mat4 pmv = projectionMatrix * modelViewMatrix;
    pos_frag = pmv * vec4(position, 1.0);
    cent_frag = pmv * vec4(vec3(0.0), 1.0);
    gl_Position = pos_frag;
}`;

const OuterReversedStretchFS = `
uniform sampler2D texture1;
varying vec4 pos_frag;
varying vec4 cent_frag;
varying vec3 v_position;
varying vec3 v_center;
varying vec2 vUv;
uniform float innerRadius;
uniform float outerRadius;

void main() {
    float initialDistance = distance(v_center, v_position.xyz);
    float d2 = (initialDistance - innerRadius) / (outerRadius - innerRadius);
    float factor = 1.0 - d2;
    factor = pow(factor, 2.0);
        // TODO expose power factor for influence zone

    vec2 pxy = pos_frag.xy + (cent_frag.xy - pos_frag.xy) * factor * 2.0;
    float pw = pos_frag.w;
    vec2 correctedUv = (vec2(pxy / pw) + vec2(1.0)) * 0.5;
    gl_FragColor = texture2D(texture1, correctedUv);
}`;


let OuterReversedStretch = function(
    windowWidth, windowHeight,
    innerRadius, outerRadius,
    origin, cameraWrapper)
{
    this.innerRadius = innerRadius;
    this.outerRadius = outerRadius;

    let cam = cameraWrapper.getRecorder();
    this.camera = new PerspectiveCamera(cam.fov, cam.aspect, cam.near, cam.far);

    this.renderTarget = new WebGLRenderTarget(
        windowWidth, windowHeight,
        {
            minFilter: LinearFilter,
            magFilter: NearestFilter,
            format: RGBFormat
        }
    );

    this.geometry = new RingBufferGeometry(
        this.innerRadius, this.outerRadius,
        30, 5);

    this.material = new ShaderMaterial({
        side: DoubleSide,
        uniforms: {
            innerRadius: { type: 'f', value: this.innerRadius },
            outerRadius: { type: 'f', value: this.outerRadius },
            texture1: { type:'t', value: this.renderTarget.texture }
        },
        vertexShader: OuterReversedStretchVS,
        fragmentShader: OuterReversedStretchFS,
        depthTest: false,
        // renderOrder: 9999
    });

    this.origin = origin;
    this.mesh = new Mesh(this.geometry, this.material);
    this.mesh.position.set(origin.x, origin.y, origin.z);
};

OuterReversedStretch.prototype.getScale = function()
{
    return this.mesh.scale.x;
};

OuterReversedStretch.prototype.setScale = function(scale)
{
    let newInner = this.innerRadius * scale;
    let newOuter = this.outerRadius * scale;
    this.material.uniforms.innerRadius.value = newInner;
    this.material.uniforms.outerRadius.value = newOuter;
    this.material.uniformsNeedUpdate = true;
    this.mesh.scale.set(scale, scale, 1.0);
};

OuterReversedStretch.prototype.getCamera = function()
{
    return this.camera;
};

OuterReversedStretch.prototype.getOrigin = function()
{
    return this.origin;
};

OuterReversedStretch.prototype.getMesh = function()
{
    return this.mesh;
};

OuterReversedStretch.prototype.getRenderTarget = function()
{
    return this.renderTarget;
};

export { OuterReversedStretch };
