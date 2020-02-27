import {
    BackSide, CircleGeometry, CubeCamera,
    LinearMipMapLinearFilter, Mesh, NearestFilter, RGBFormat,
    RingBufferGeometry, ShaderMaterial, WebGLRenderTarget
} from 'three';

const InnerCubeMapVS = `
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

const InnerCubeMapFS = `
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
    worldNormal = vec3(1.0, 0.0, 0.0);
    float refractionRatio = 1.0;
    vec3 reflectVec = reflect(cameraToFrag, worldNormal);

    float initialDistance = distance(vec3(0.0), v_position.xyz);
    float d2 = 1.0; /* (initialDistance - 20.0) / 20.0; */
    vec2 pxy = pos_frag.xy;
    float pw = pos_frag.w;
    vec2 correctedUv = (vec2(d2 * pxy / pw) + vec2(1.0)) * 0.5;

    // difference to center
    vec2 dtc = normalize(vUv - vec2(0.5));

    // distance to center normalized to diameter
    float d = distance(vec3(0.0), v_position.xyz) / 20.0;
    vec2 f = d * dtc; float x = f.x; float y = f.y;
    float p = 2.0;
    float halfSphere = pow(1.0 - pow(x, p) - pow(y, p), 1.0 / p);
    vec3 proj = vec3(f, halfSphere);

    // distance to middle mapped to half-sphere
    reflectVec = normalize(proj);

    vec4 envColor = textureCube(env, vec3(reflectVec.x, reflectVec.y, reflectVec.z), 0.0);
    gl_FragColor = envColor;
}`;

let InnerCubeMap = function(
    windowWidth, windowHeight,
    innerRadius)
{
    this.cubeCam = new CubeCamera(0.1, 1024, 1024);
    this.cubeCam.renderTarget.texture.minFilter = LinearMipMapLinearFilter;
    this.cubeCam.renderTarget.texture.generateMipmaps = true;

    this.geometry = new CircleGeometry(innerRadius, 128);

    this.material = new ShaderMaterial({
        side: BackSide,
        uniforms: {
            env: { type:'t', value: this.cubeCam.renderTarget.texture }
        },
        vertexShader: InnerCubeMapVS,
        fragmentShader: InnerCubeMapFS,
        depthTest: false,
        // renderOrder: 9999
    });
    this.material.needsUpdate = true;

    this.mesh = new Mesh(this.geometry, this.material);
};

InnerCubeMap.prototype.getCubeCam = function()
{
    return this.cubeCam;
};

InnerCubeMap.prototype.getMesh = function()
{
    return this.mesh;
};

export { InnerCubeMap };
