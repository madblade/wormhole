import {
    BackSide, CircleGeometry, CubeCamera, DoubleSide, FrontSide,
    LinearMipMapLinearFilter, Mesh, NearestFilter, Object3D, RGBFormat,
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
    float fac = 1.2;
    float fr = 1.0 / fac;
    bool small = d < fr;
    float left = 1.0 / fr; float right = 1.0 / (1.0 - fr);

    vec2 f = small ? left * d * dtc : right * (1.0 - d) * dtc;
    float x = f.x; float y = f.y;

    float x2 = small ? x * x : pow(x, 2.0);
    float y2 = small ? y * y : pow(y, 2.0);

    float halfSphere = (small ? 1.0 : -1.0) * sqrt(1.0 - x2 - y2);
    vec3 proj = vec3(f, halfSphere);

    // distance to middle mapped to half-sphere
    reflectVec = normalize(proj);

    vec4 envColor = textureCube(env, vec3(-reflectVec.x, reflectVec.y, reflectVec.z), 0.0);
    gl_FragColor = envColor;
}`;

let InnerCubeMap = function(
    windowWidth, windowHeight,
    innerRadius, entry, exit)
{
    this.cubeCam = new CubeCamera(0.1, 1024, 1024);
    this.cubeCam.renderTarget.texture.minFilter = LinearMipMapLinearFilter;
    this.cubeCam.renderTarget.texture.generateMipmaps = true;

    this.geometry = new CircleGeometry(innerRadius, 128);

    this.material = new ShaderMaterial({
        side: FrontSide,
        uniforms: {
            env: { type:'t', value: this.cubeCam.renderTarget.texture }
        },
        vertexShader: InnerCubeMapVS,
        fragmentShader: InnerCubeMapFS,
        depthTest: false,
        // renderOrder: 9999
    });
    this.material.needsUpdate = true;

    this.entry = entry;
    this.mesh = new Mesh(this.geometry, this.material);
    this.mesh.position.set(this.entry.x, this.entry.y, this.entry.z);

    this.exit = exit;
    this.pitch = new Object3D();
    this.yaw = new Object3D();
    this.wrapper = new Object3D();
    this.wrapper.position.set(this.exit.x, this.exit.y, this.exit.z);
    this.wrapper.rotation.reorder('ZYX');
    this.pitch.add(this.cubeCam);
    this.yaw.add(this.pitch);
    this.wrapper.add(this.yaw);
};

InnerCubeMap.prototype.setXRotation = function(x)
{
    this.pitch.rotation.x = x;
};

InnerCubeMap.prototype.setZRotation = function(z)
{
    this.yaw.rotation.z = z;
};

InnerCubeMap.prototype.setUpRotation = function(x, y, z)
{
    this.wrapper.rotation.set(x, y, z);
};

InnerCubeMap.prototype.updateCamPosition = function(p)
{
    this.wrapper.position.set(
        this.exit.x + p.x - this.entry.x,
        this.exit.y + p.y - this.entry.y,
        this.exit.z + p.z - this.entry.z
    );
};

InnerCubeMap.prototype.getExit = function()
{
    return this.exit;
};

InnerCubeMap.prototype.getEntry = function()
{
    return this.entry;
};

InnerCubeMap.prototype.getWrapper = function()
{
    return this.wrapper;
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
