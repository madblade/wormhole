
// scene size
import {
    BoxGeometry, CubeCamera,
    CylinderBufferGeometry, DoubleSide,
    IcosahedronBufferGeometry, LinearFilter, LinearMipMapLinearFilter,
    Mesh,
    MeshPhongMaterial, NearestFilter, Object3D, PerspectiveCamera,
    RGBFormat, RingBufferGeometry, Scene, ShaderMaterial,
    SphereBufferGeometry, WebGLRenderer, WebGLRenderTarget,
    ShaderLib, UniformsUtils, Color, MeshBasicMaterial, CircleBufferGeometry, SphereGeometry, MeshLambertMaterial, BackSide, CircleGeometry, Vector3, Euler
} from 'three';
import {OrbitControls} from './orbit';
import {Room} from './Room';
import {EffectComposer} from 'three/examples/jsm/postprocessing/EffectComposer';
import {RenderPass} from 'three/examples/jsm/postprocessing/RenderPass';
import {ShaderPass} from 'three/examples/jsm/postprocessing/ShaderPass';
import {FXAAShader} from 'three/examples/jsm/shaders/FXAAShader';
import {OuterSimpleStretch} from './OuterSimpleStretch';
import {InnerSimpleCircleFS, InnerSimpleCircleVS} from './InnerSimpleCircle';

// TODO render 1st pass into depth buffer
// TODO read depht buffer and add perturbation accordingly
// https://threejs.org/examples/webgl_depth_texture.html
// https://stackoverflow.com/questions/50530765/how-do-i-access-depth-data-in-three-js
// https://stackoverflow.com/questions/23362076/opengl-how-to-access-depth-buffer-values-or-gl-fragcoord-z-vs-rendering-d

// Using depth attributes won't work. Instead:
// - attach a vertex shader to all objects between the wormhole and the background texture
// - move vertices according to depth
// - project to plane
// - move orth plane as a fn of depth
// - join moved vertices with the background image at infty. (make the thing go to infty close)

var tunnelVShader = [
    'varying vec4 pos_frag;\n' +
    'varying vec3 v_position;\n' +
    'varying vec2 vUv;\n' +
    'void main() {\n' +
    '   vUv = uv;\n' +
    '   v_position = (modelMatrix * vec4(position, 1.0)).xyz - modelMatrix[3].xyz;\n' +
    '   pos_frag = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );\n' +
    '   gl_Position = pos_frag;\n' +
    '}'
].join('\n');
var tunnelFShader = [
    'uniform sampler2D texture1;\n' +
    'varying vec4 pos_frag;\n' +
    'varying vec3 v_position;\n' +
    'varying vec2 vUv;\n' +
    '\n' +
    'void main() {\n' +
    '   float initialDistance = distance(vec3(0.0), v_position);\n' +
    '   float dist = (initialDistance - 20.0) / 20.0;\n' +
    // '   vec2 ratio = pos_frag.xy / pos_frag.w;\n' +
    // '   vec2 ratio = pow(dist, 0.5) * pos_frag.xy / pos_frag.w;\n' +
    '   vec2 ratio = exp(-dist) * pos_frag.xy / pos_frag.w;\n' +
    // '   vec2 correctedUv = vUv;\n' +
    '   vec2 correctedUv = (ratio + vec2(1.0)) * 0.5;\n' +
    '   gl_FragColor = texture2D(texture1, correctedUv);\n' +
    '}\n'
].join('\n');


var cubemapVertex = [
    'varying vec3 vNormal;\n' +
    'varying vec4 vPosition;\n' +
    'varying vec4 vOPosition;\n' +
    'varying vec3 vONormal;\n' +
    'varying vec3 vU;\n' +
    'varying vec3 vEye;\n' +
    'void main() {\n' +
        'vOPosition = modelViewMatrix * vec4( position, 1.0 );\n' +
        'gl_Position = projectionMatrix * vOPosition;\n' +
        'vU = normalize( vec3( modelViewMatrix * vec4( position, 1.0 ) ) );\n' +
        'vPosition = vec4( position, 1.0 );\n' +
        'vNormal = normalMatrix * normal;\n' +
        'vONormal = normal;\n' +
    '}'
].join('\n');

var cubemapFragment = [
    'uniform sampler2D textureMap;\n' +
    'uniform sampler2D normalMap;\n' +
    'uniform vec3 color;\n' +
    'uniform float normalScale;\n' +
    'uniform float texScale;\n' +
    'uniform float useSSS;\n' +
    'uniform float useScreen;\n' +
    'varying vec3 vNormal;\n' +
    'varying vec4 vPosition;\n' +
    'varying vec4 vOPosition;\n' +
    'varying vec3 vONormal;\n' +
    'varying vec3 vU;\n' +
    'varying vec3 vEye;\n' +
    'float random(vec3 scale,float seed){return fract(sin(dot(gl_FragCoord.xyz+seed,scale))*43758.5453+seed);}\n' +
    'void main() {\n' +
    '    vec3 n = normalize( vONormal.xyz );\n' +
    '    vec3 blend_weights = abs( n );\n' +
    '    blend_weights = ( blend_weights - 0.2 ) * 7.;\n' +
    '    blend_weights = max( blend_weights, 0. );\n' +
    '    blend_weights /= ( blend_weights.x + blend_weights.y + blend_weights.z );\n' +
    '    vec2 coord1 = vPosition.yz * texScale;\n' +
    '    vec2 coord2 = vPosition.zx * texScale;\n' +
    '    vec2 coord3 = vPosition.xy * texScale;\n' +
    '    vec3 bump1 = texture2D( normalMap, coord1 ).rgb;\n' +
    '    vec3 bump2 = texture2D( normalMap, coord2 ).rgb;\n' +
    '    vec3 bump3 = texture2D( normalMap, coord3 ).rgb;\n' +
    '    vec3 blended_bump = bump1 * blend_weights.xxx +\n' +
    '        bump2 * blend_weights.yyy +\n' +
    '        bump3 * blend_weights.zzz;\n' +
    '    vec3 tanX = vec3( vNormal.x, -vNormal.z, vNormal.y);\n' +
    '    vec3 tanY = vec3( vNormal.z, vNormal.y, -vNormal.x);\n' +
    '    vec3 tanZ = vec3(-vNormal.y, vNormal.x, vNormal.z);\n' +
    '    vec3 blended_tangent = tanX * blend_weights.xxx +\n' +
    '        tanY * blend_weights.yyy +\n' +
    '        tanZ * blend_weights.zzz;\n' +
    '    vec3 normalTex = blended_bump * 2.0 - 1.0;\n' +
    '    normalTex.xy *= normalScale;\n' +
    '    normalTex.y *= -1.;\n' +
    '    normalTex = normalize( normalTex );\n' +
    '    mat3 tsb = mat3( normalize( blended_tangent ), normalize( cross( vNormal, blended_tangent ) ), normalize( vNormal ) );\n' +
    '    vec3 finalNormal = tsb * normalTex;\n' +
    '    vec3 r = reflect( normalize( vU ), normalize( finalNormal ) );\n' +
    '    float m = 2.0 * sqrt( r.x * r.x + r.y * r.y + ( r.z + 1.0 ) * ( r.z + 1.0 ) );\n' +
    '    vec2 calculatedNormal = vec2( r.x / m,  r.y / m );\n' +
    '    vec3 base = texture2D( textureMap, calculatedNormal ).rgb;\n' +
    '    float rim = 1.75 * max( 0., abs( dot( normalize( vNormal ), normalize( -vOPosition.xyz ) ) ) );\n' +
    '    base += useSSS * color * ( 1. - .75 * rim );\n' +
    '    base += ( 1. - useSSS ) * 10. * base * color * clamp( 1. - rim, 0., .15 );\n' +
    '    if( useScreen == 1. ) {\n' +
    '        base = vec3( 1. ) - ( vec3( 1. ) - base ) * ( vec3( 1. ) - base );\n' +
    '    }\n' +
    '    float nn = .05 * random( vec3( 1. ), length( gl_FragCoord ) );\n' +
    '    base += vec3( nn );\n' +
    '    gl_FragColor = vec4( base.rgb, 1. );\n' +
    '}\n'
].join('\n');

// scene size
var WIDTH = window.innerWidth;
var HEIGHT = window.innerHeight;

// camera
var VIEW_ANGLE = 45;
var ASPECT = WIDTH / HEIGHT;
var NEAR = 0.1; // precision
var FAR = 500;

var camera;
var scene;
var renderer;

var cameraControls;
var cubecam;

var sphereGroup;
var smallSphere;
var worm;
// var tunnelRenderTarget;

var tunnel;
// var tunnelRotation;
// var tunnelCamera;
// var tunnelCameraControls; // ... unoptimized, just for aligning with the other camera
var cubeCameraControls;
let effectComposer;

init();
animate();

function init() {
    var container = document.getElementById('container');

    // renderer
    renderer = new WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(WIDTH, HEIGHT);
    container.appendChild(renderer.domElement);

    // scene
    scene = new Scene();

    // camera
    camera = new PerspectiveCamera(VIEW_ANGLE, ASPECT, NEAR, FAR);
    camera.position.set(0, 75, 160);
    // camera.position.set(0, 75, -110);
    cameraControls = new OrbitControls(camera, renderer.domElement);
    cameraControls.target.set(0, 40, 0);
    cameraControls.maxDistance = 400;
    cameraControls.minDistance = 10;
    cameraControls.update();

    // tunnel camera
    // tunnelCamera = new PerspectiveCamera(120, ASPECT, 1, 1000000);
    // tunnelCamera = new CubeCamera(1, 100000, 2);
    cubecam = new CubeCamera(0.1, 1024, 1024);
    cubecam.renderTarget.texture.minFilter = LinearMipMapLinearFilter; // mipmap filter
    cubecam.renderTarget.texture.generateMipmaps = true; // mipmap filter
    // scene.add(cubecam); // TODO decommit
    // cubecam.position.set(0, 75, -200);
    // cubecam.rotation.y = -Math.PI / 2;
    // cubecam.setRotationFromEuler(new Euler(0, -Math.PI / 2, 0, 'ZXY'));
    let cubecamWrapper = new Object3D();
    cubecamWrapper.position.set(0, 75, -200);
    cubecamWrapper.add(cubecam);
    scene.add(cubecamWrapper);

    cubeCameraControls = new OrbitControls(cubecamWrapper, renderer.domElement);
    cubeCameraControls.target.set(0, 75, -200);
    cubeCameraControls.maxDistance = 400;
    cubeCameraControls.minDistance = 10;
    cubeCameraControls.update();

    // tunnelCamera.position.set(0, 75, -110);
    // tunnelCameraControls = new OrbitControls(tunnelCamera, renderer.domElement);
    // tunnelCameraControls.target.set(0, 75, -111);
    // tunnelCameraControls.maxDistance = 400;
    // tunnelCameraControls.minDistance = 10;
    // tunnelCameraControls.update();

    var geometry;
    var material;

    // !!START WORMHOLE
    var antialiasFactor = 1;
    var width = window.innerWidth * antialiasFactor; // (tempWidth * window.innerWidth) / 2;
    var height = window.innerHeight * antialiasFactor; // (tempHeight * window.innerHeight) / 2;
    // !START OUTER RING

    let oss = new OuterSimpleStretch(width, height, 20, 40);
    worm = oss.getMesh();

    var yOrigin = 40; // 37.5;
    var zOrigin = 0; // 20.0;
    worm.position.y = yOrigin;
    worm.position.z = zOrigin;
    // Update worm with orbit controls. (unoptimized, beware)
    var wormControls = new OrbitControls(worm, renderer.domElement);
    wormControls.target.set(0, 40, 0);
    wormControls.maxDistance = 400;
    wormControls.minDistance = 10;
    wormControls.update();
    // !END OUTER RING


    // !START INNER RING
    // Setup distortion effect
    // var geometryT = new CircleBufferGeometry(20, 30);
    // var geometryT = new SphereBufferGeometry(20, 30, 30, 0,
    //     2 * Math.PI, 0,  0.5 * Math.PI);
    // tunnelRenderTarget = new WebGLRenderTarget(
    //     width, height,
    //     {
    //         minFilter: LinearFilter,
    //         magFilter: NearestFilter,
    //         format: RGBFormat
    //     }
    // );
    // var materialT = new ShaderMaterial({
    //     side: DoubleSide,
    //     uniforms: {
    //         tDiffuse:         { type: 't', value: tunnelRenderTarget.texture },
    //         strength:         { type: 'f', value: 0 },
    //         height:           { type: 'f', value: 1 },
    //         aspectRatio:      { type: 'f', value: 1 },
    //         cylindricalRatio: { type: 'f', value: 1 }
    //         // ,
    //         // texture1: { type:'t', value: tunnelRenderTarget.texture }
    //     },
    //     vertexShader: fisheyeVertexShader,
    //     fragmentShader: fisheyeFragmentShader
    // });
    // var materialT = new ShaderMaterial({
    //     side: DoubleSide,
    //     uniforms: {
    //         texture1: { type:'t', value: tunnelRenderTarget.texture
    //         }
    //     },
    //     vertexShader: tunnelVShader,
    //     fragmentShader: tunnelFShader
    // });
    // var geometryT = new SphereGeometry(
    //     20, 32, 32, Math.PI
    // );
    var geometryT = new IcosahedronBufferGeometry(20, 4);
    geometryT = new CircleGeometry(20, 30);
    // var materialT = new MeshBasicMaterial({
    //     // color: 0xffffff,
    //     envMap: cubecam.renderTarget.texture,
    //
    // });
    // TODO Modify standard shader to remove reflected lights!
    // TODO Customize standard shader for distortion to fade out when camera nears
    // var materialT = new ShaderMaterial({
    //     uniforms:
    //         UniformsUtils.merge([
    //             ShaderLib.standard.uniforms,
    //             {
    //                 envMap: {
    //                     type: 't',
    //                     value: cubecam.renderTarget.texture
    //                 }
    //             }
    //         ]),
    //     vertexShader: ShaderLib.standard.vertexShader,
    //     fragmentShader: ShaderLib.standard.fragmentShader,
    //     depthWrite: false,
    //     side: BackSide,
    //     transparent: true,
    //     opacity: 1,
    //     lights: true,
    // });
    // console.log(ShaderLib.basic.vertexShader);
    // console.log(ShaderLib.basic.fragmentShader);
    var materialT  = new ShaderMaterial({
        uniforms: {
            env: { type:'t', value: cubecam.renderTarget.texture }
        },
        vertexShader: InnerSimpleCircleVS,
        fragmentShader: InnerSimpleCircleFS,
        // envMap: cubecam.renderTarget.texture,
        side: BackSide,
        // wireframe: true
    });
    // materialT = new MeshBasicMaterial({side: BackSide});
    // materialT.extensions.derivatives = true;
    // materialT.envMap = cubecam.renderTarget.texture;

    // materialT.uniforms.metalness.value = 1;
    // materialT.uniforms.roughness.value = 1;
    // materialT.uniforms.diffuse.value = new Color(0xffffff);
    // materialT.uniforms.emissive.value = new Color(0x000000);
    // materialT.uniforms.flipEnvMap.value = 1;
    materialT.needsUpdate = true;

    var g2 = new CircleBufferGeometry(20, 30);
    var mat2 = new MeshBasicMaterial({wireframe: true});
    tunnel = new Mesh(
        // g2,
        geometryT,
        // mat2
        materialT
        //new MeshPhongMaterial({ color: 0xffffff, emissive: 0x444444, side: DoubleSide })
    );
    tunnel.position.y = 40;
    tunnel.position.z = 0;
    // tunnel.rotation.x = Math.PI / 2;
    // tunnel.rotation.z = Math.PI;
    // tunnelRotation = new Object3D();
    // var intermediate = new Object3D();
    // intermediate.add(tunnel);
    // tunnelRotation.add(intermediate);
    var tunnelControls = new OrbitControls(tunnel, renderer.domElement);
    tunnelControls.target.set(0, 40, 0);
    tunnelControls.maxDistance = 400;
    tunnelControls.minDistance = 10;
    tunnelControls.update();

    // var horizontalFOV = 140;
    // var strength = 0.5;
    // var cylindricalRatio = 2;
    // var height2 = Math.tan(TMath.degToRad(horizontalFOV) / 2) / camera.aspect;
    // tunnelCamera.fov = Math.atan(height2) * 2 * 180 / 3.1415926535;
    // tunnelCamera.updateProjectionMatrix();
    // tunnel.material.uniforms.strength.value = strength;
    // tunnel.material.uniforms.height.value = height;
    // tunnel.material.uniforms.aspectRatio.value = camera.aspect;
    // tunnel.material.uniforms.cylindricalRatio.value = cylindricalRatio;
    // !END INNER RING
    // !!END WORMHOLE

    // scene.add(worm);

    sphereGroup = new Object3D();
    // scene.add(sphereGroup);

    geometry = new CylinderBufferGeometry(0.1, 15 * Math.cos(Math.PI / 180 * 30), 0.1, 24, 1);
    material = new MeshPhongMaterial({ color: 0xffffff, emissive: 0x444444, wireframe: true });
    var sphereCap = new Mesh(geometry, material);
    sphereCap.position.y = -15 * Math.sin(Math.PI / 180 * 30) - 0.05;
    sphereCap.rotateX(-Math.PI);

    geometry = new SphereBufferGeometry(15, 24, 24); // , Math.PI / 2, Math.PI * 2, 0, Math.PI / 180 * 120);
    var halfSphere = new Mesh(geometry, material);
    // halfSphere.add(sphereCap);
    halfSphere.rotateX(-Math.PI / 180 * 135);
    halfSphere.rotateZ(-Math.PI / 180 * 20);
    halfSphere.position.y = 7.5 + 15 * Math.sin(Math.PI / 180 * 30);
    // scene.add(halfSphere);

    geometry = new IcosahedronBufferGeometry(5, 0);
    material = new MeshPhongMaterial({ color: 0xffffff, emissive: 0x333333, flatShading: true });
    smallSphere = new Mesh(geometry, material);
    scene.add(smallSphere);

    let room = new Room(0x7f7fff, 0x00ff00, 0xff0000, 0xffffff);
    let roomMesh = room.getMesh();
    scene.add(roomMesh);

    // Cube tunnel
    var cubeGeo = new BoxGeometry(12.5, 12.5, 12.5);
    var cube = new Mesh(cubeGeo, new MeshPhongMaterial({ color: 0xff0000 }));
    cube.position.z = -230;
    cube.position.y = 25;
    scene.add(cube);
    for (let i = -5; i < 6; ++i) {
        for (let j = -5; j < 6; ++j) {
            cubeGeo = new BoxGeometry(12.5, 12.5, 12.5);
            var cube2 = new Mesh(cubeGeo, new MeshPhongMaterial({ color: 0xff0000 }));
            cube2.position.z = -230;
            cube2.position.y = 25 + 25 * j;
            cube2.position.x = 25 * i;
            scene.add(cube2);
        }
    }

    document.addEventListener('keydown', event => {
        switch (event.keyCode) {
            // OBJ
            case 51: // fwd
                halfSphere.position.z++;
                break;
            case 80: // bwd
                halfSphere.position.z--;
                break;
            case 186: // left
                halfSphere.position.y--;
                break;
            case 79: // right
                halfSphere.position.y++;
                break;

            // CAM
            case 71: // fwd
                camera.position.z++;
                break;
            case 40: // bwd
                camera.position.z--;
                break;
            case 38: // left
                camera.position.y--;
                break;
            case 90: // right
                camera.position.y++;
                break;
            default: break;
        }
    });

    effectComposer = newComposer(renderer, scene, camera, oss.getRenderTarget());
    // wormholeRenderTarget = oss.getRenderTarget();
}
// let wormholeRenderTarget;

function newComposer(rendrr, sc, cam, target)
{
    let resolutionX = 1 / window.innerWidth;
    let resolutionY = 1 / window.innerHeight;
    let fxaa = new ShaderPass(FXAAShader);
    fxaa.uniforms['resolution'].value.set(resolutionX, resolutionY);
    let composer = new EffectComposer(rendrr, target);
    let scenePass = new RenderPass(sc, cam);
    composer.addPass(scenePass);
    composer.addPass(fxaa);
    return composer;
}

// TODO decommit1
// TODO 1. log camera distance to blackhole object
// put a cube in front of the camera
// 2. put ring near camera
// 3. adjust ring outer size
// 4. use my shading skills to integrate displacement
// 5. reflex and adjust ring inner size
// 6. put inner circle near camera
// 7. use envmap in inner circle
// On top of setting object.renderOrder you have to set material.depthTest to false on the relevant objects.

function animate() {
    requestAnimationFrame(animate);

    var timer = Date.now() * 0.01;

    sphereGroup.rotation.y -= 0.002;

    smallSphere.position.set(
        Math.cos(timer * 0.1) * 30,
        Math.abs(Math.cos(timer * 0.2)) * 20 + 5,
        Math.sin(timer * 0.1) * 30
    );
    smallSphere.rotation.y =  Math.PI / 2  - timer * 0.1;
    smallSphere.rotation.z = timer * 0.8;
    // var mainRenderTarget = renderer.getRenderTarget();
    scene.remove(worm);
    scene.remove(tunnel);

    effectComposer.render();
    // renderer.setRenderTarget(wormholeRenderTarget);
    // renderer.render(scene, camera);

    // TODO decommit
    tunnel.visible = false;
    cubecam.update(renderer, scene);
    tunnel.visible = true;

    // TODO cubemap
    // renderer.setRenderTarget(tunnelRenderTarget);
    // renderer.render(scene, tunnelCamera);

    scene.add(worm);
    scene.add(tunnel); // TODO decommit
    // renderer.setRenderTarget(null);
    renderer.render(scene, camera);
}
