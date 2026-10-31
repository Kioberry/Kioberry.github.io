import { CanvasTexture, Color, NearestFilter, RepeatWrapping, Texture, Uniform, Vector2 } from 'three';
import { Effect } from 'postprocessing';

// The ASCII pass over the 3D avatar, ported from matthewpetersen.ca: the rendered frame is cut into cells, each
// cell's brightness picks a glyph from a 16x16 atlas, a reveal sweeps it in from the top, and the pointer
// scrambles glyphs around it, leaving a fading trail. Two changes for this site: glyphs are coloured along the
// theme's shadow -> mid -> high ramp instead of one colour, and the space between glyphs stays transparent so
// the scene behind shows through.

const fragment = /* glsl */ `
uniform sampler2D uCharacters;
uniform float uCharactersCount;
uniform float uCellSize;
uniform float uInvertAmount;
uniform vec3 uShadow;
uniform vec3 uMid;
uniform vec3 uHigh;
uniform float uReveal;
uniform vec2 uMouse;
uniform float uHoverRadius;
uniform float uTime;
uniform float uVelocity;
uniform float uTrail[300]; // 100 points of (x, y, intensity)
uniform int uTrailCount;

const vec2 SIZE = vec2(16.);

float grey(vec3 c) { return dot(c, vec3(0.299, 0.587, 0.114)); }
float random(vec2 st) { return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123); }

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  vec2 cell = resolution / uCellSize;
  vec2 grid = 1.0 / cell;
  vec2 pixelizedUV = grid * (0.5 + floor(uv / grid));
  vec4 pixelized = texture2D(inputBuffer, pixelizedUV);

  if (pixelized.a <= 0.1 || 1.0 - uv.y > uReveal) {
    outputColor = vec4(0.0);
    return;
  }

  float brightness = grey(pixelized.rgb);

  // pointer: scramble in proportion to how fast it moves
  float scramble = 0.0;
  float aspect = resolution.x / resolution.y;
  vec2 p = vec2(uv.x * aspect, uv.y);
  vec2 m = vec2(uMouse.x * aspect, 1.0 - uMouse.y);
  float r = uHoverRadius * 1.2;
  float d = distance(p, m);
  if (d < r) {
    float intensity = clamp(uVelocity * 5.0, 0.0, 1.0);
    if (random(pixelizedUV + uTime * 10.0) < intensity * smoothstep(r, 0.0, d)) {
      scramble = (random(pixelizedUV * 2.0 + uTime) - 0.5) * 2.0;
    }
  }

  // trail: where the pointer has been
  for (int i = 0; i < 100; i++) {
    if (i >= uTrailCount) break;
    float k = uTrail[i * 3 + 2];
    if (k < 0.01) continue;
    vec2 t = vec2(uTrail[i * 3] * aspect, 1.0 - uTrail[i * 3 + 1]);
    float tr = uHoverRadius * 0.8;
    float td = distance(p, t);
    if (td < tr && random(pixelizedUV + uTime * 20.0 + float(i)) < k * smoothstep(tr, 0.0, td) * 0.8) {
      float s = (random(pixelizedUV * 3.0 + uTime + float(i)) - 0.5) * 2.0;
      if (abs(s) > abs(scramble)) scramble = s;
    }
  }

  brightness = clamp(brightness + scramble, 0.0, 1.0);
  float level = mix(brightness, 1.0 - brightness, uInvertAmount);

  float index = floor((uCharactersCount - 1.0) * level);
  vec2 pos = vec2(mod(index, SIZE.x), floor(index / SIZE.y));
  vec2 offset = vec2(pos.x, -pos.y) / SIZE;
  vec2 charUV = mod(uv * (cell / SIZE), 1.0 / SIZE) - vec2(0., 1.0 / SIZE) + offset;
  float ink = texture2D(uCharacters, charUV).r;

  vec3 color = level < 0.5 ? mix(uShadow, uMid, level * 2.0) : mix(uMid, uHigh, (level - 0.5) * 2.0);
  outputColor = vec4(color * ink, ink); // premultiplied
}
`;

export const CHARACTERS = " .:,'-^=*+?!|0#X%WM@";

export default class AsciiEffect extends Effect {
  constructor({ characters = CHARACTERS, fontSize = 54, cellSize = 16, colors, font = 'arial' } = {}) {
    super('ASCIIEffect', fragment, {
      uniforms: new Map([
        ['uCharacters', new Uniform(new Texture())],
        ['uCellSize', new Uniform(cellSize)],
        ['uCharactersCount', new Uniform(characters.length)],
        ['uShadow', new Uniform(new Color('#333333'))],
        ['uMid', new Uniform(new Color('#999999'))],
        ['uHigh', new Uniform(new Color('#ffffff'))],
        ['uInvertAmount', new Uniform(0)],
        ['uReveal', new Uniform(1)],
        ['uMouse', new Uniform(new Vector2(-9999, -9999))],
        ['uHoverRadius', new Uniform(0.15)],
        ['uTime', new Uniform(0)],
        ['uVelocity', new Uniform(0)],
        ['uTrailCount', new Uniform(0)],
        ['uTrail', new Uniform(new Float32Array(300))],
      ]),
    });
    this.uniforms.get('uCharacters').value = atlas(characters, fontSize, font);
    if (colors) this.setColors(colors);
  }

  set(name, value) {
    this.uniforms.get(name).value = value;
  }

  setColors({ shadow, mid, high }) {
    this.uniforms.get('uShadow').value.set(shadow);
    this.uniforms.get('uMid').value.set(mid);
    this.uniforms.get('uHigh').value.set(high);
  }

  setMouse(x, y) {
    this.uniforms.get('uMouse').value.set(x, y);
  }

  setTrail(points, count) {
    this.uniforms.get('uTrail').value.set(points);
    this.uniforms.get('uTrailCount').value = count;
  }
}

// 16 x 16 glyphs, white on transparent, 64 px apart
function atlas(characters, fontSize, font) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 1024;
  const ctx = canvas.getContext('2d');
  ctx.font = `${fontSize}px ${font}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#fff';
  [...characters].forEach((c, i) => ctx.fillText(c, 64 * (i % 16) + 32, 64 * Math.floor(i / 16) + 32));
  const texture = new CanvasTexture(canvas, undefined, RepeatWrapping, RepeatWrapping, NearestFilter, NearestFilter);
  texture.needsUpdate = true;
  return texture;
}
