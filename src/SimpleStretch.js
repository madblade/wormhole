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
