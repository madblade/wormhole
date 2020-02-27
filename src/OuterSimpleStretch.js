import {
    DoubleSide,
    LinearFilter, Mesh, NearestFilter, RGBFormat,
    RingBufferGeometry, ShaderMaterial, WebGLRenderTarget
} from 'three';

const OuterSimpleStretchVS = `
varying vec4 pos_frag;
varying vec3 v_position;
attribute vec2 vertex2D;
varying vec2 vUv;
void main() {
   vUv = uv;
   v_position = (modelMatrix * vec4(position, 1.0)).xyz - modelMatrix[3].xyz;
   pos_frag = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
   gl_Position = pos_frag;
}`;

const OuterSimpleStretchFS = `
uniform sampler2D texture1;
varying vec4 pos_frag;
varying vec3 v_position;
varying vec2 vUv;

void main() {
   float initialDistance = distance(vec3(0.0), v_position.xyz);
   float d2 = (initialDistance - 20.0) / 20.0;
   vec2 pxy = pos_frag.xy;
   float pw = pos_frag.w;
   vec2 correctedUv = (vec2(d2 * pxy / pw) + vec2(1.0)) * 0.5;
   gl_FragColor = texture2D(texture1, correctedUv);
}`;

let OuterSimpleStretch = function(
    windowWidth, windowHeight,
    innerRadius, outerRadius,
    origin)
{
    this.renderTarget = new WebGLRenderTarget(
        windowWidth, windowHeight,
        {
            minFilter: LinearFilter,
            magFilter: NearestFilter,
            format: RGBFormat
        }
    );

    this.geometry = new RingBufferGeometry(
        innerRadius, outerRadius,
        30, 5);

    this.material = new ShaderMaterial({
        side: DoubleSide,
        uniforms: {
            texture1: { type:'t', value: this.renderTarget.texture }
        },
        vertexShader: OuterSimpleStretchVS,
        fragmentShader: OuterSimpleStretchFS,
        depthTest: false,
        // renderOrder: 9999
        // TODO Think about this when there are multiple wormholes.
    });

    this.origin = origin;
    this.mesh = new Mesh(this.geometry, this.material);
    this.mesh.position.set(origin.x, origin.y, origin.z);
};

OuterSimpleStretch.prototype.getOrigin = function()
{
    return this.origin;
};

OuterSimpleStretch.prototype.getMesh = function()
{
    return this.mesh;
};

OuterSimpleStretch.prototype.getRenderTarget = function()
{
    return this.renderTarget;
};

export { OuterSimpleStretch };
