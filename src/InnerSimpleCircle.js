import {
    DoubleSide, LinearFilter, Mesh, NearestFilter, RGBFormat,
    RingBufferGeometry, ShaderMaterial, WebGLRenderTarget
} from 'three';

const InnerSimpleCircleVS = `
varying vec4 pos_frag;
varying vec3 v_position;
attribute vec2 vertex2D;
varying vec2 vUv;

varying vec3 vNormal;
varying vec3 vWorldPosition;

void main() {
   vUv = uv;
   vec4 worldPosition = modelMatrix * vec4(position, 1.0);

   vNormal = normalize(normalMatrix * normal);
   vWorldPosition = worldPosition.xyz;

   v_position = worldPosition.xyz - modelMatrix[3].xyz;
   pos_frag = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
   gl_Position = pos_frag;
}`;

const InnerSimpleCircleFS = `
uniform samplerCube env;
varying vec4 pos_frag;
varying vec3 v_position;
varying vec2 vUv;

varying vec3 vNormal;
varying vec3 vWorldPosition;

vec3 inverseTransformDirection( in vec3 dir, in mat4 matrix ) {
    // dir can be either a direction vector or a normal vector
    // upper-left 3x3 of matrix is assumed to be orthogonal
    return normalize((vec4(dir, 0.0) * matrix).xyz);
}

void main() {
    vec3 cameraToFrag = normalize(vWorldPosition - cameraPosition);
    vec3 normal = normalize(vNormal);
    vec3 worldNormal = inverseTransformDirection(normal, viewMatrix);
    float refractionRatio = 1.0;
    vec3 reflectVec = refract(cameraToFrag, worldNormal, refractionRatio);

    float initialDistance = distance(vec3(0.0), v_position.xyz);
    float d2 = 1.0; /* (initialDistance - 20.0) / 20.0; */
    vec2 pxy = pos_frag.xy;
    float pw = pos_frag.w;
    vec2 correctedUv = (vec2(d2 * pxy / pw) + vec2(1.0)) * 0.5;
    gl_FragColor = textureCube(env, reflectVec, 0.0);
}`;

let InnerSimpleCircle = function(
    windowWidth, windowHeight,
    innerRadius, outerRadius)
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
        vertexShader: InnerSimpleCircleVS,
        fragmentShader: InnerSimpleCircleFS,
        depthTest: false,
        // renderOrder: 9999
    });

    this.mesh = new Mesh(this.geometry, this.material);
};

export { InnerSimpleCircleFS, InnerSimpleCircleVS, InnerSimpleCircle };
