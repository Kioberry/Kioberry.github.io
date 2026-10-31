// Turns an avatar exported from Avaturn (or any Mixamo-rigged GLB with ARKit blend shapes) into the file the
// home page loads, public/twin/avatar.glb. Matthew Petersen's twin is a Ready Player Me GLB driven by
// TalkingHead; Ready Player Me closed in January 2026, so this checks a GLB against what TalkingHead needs
// and fills in what is missing:
//
//   * the 52 rig bones TalkingHead's poses use, plus LeftEye/RightEye, under a root called "Armature"
//   * the 52 ARKit blend shapes (eyes, brows, jaw, mouth), which drive blinks, moods and gaze
//   * the 15 Oculus visemes TalkingHead lip-syncs with: missing ones are built from the ARKit shapes with
//     the weights in TalkingHead's blender/build-visemes-from-arkit.py
//
// then shrinks it for the web (textures to 1024px WebP, meshopt compression).
//
//   node prepare-avatar.mjs --check source/astrid.glb       report only
//   node prepare-avatar.mjs source/astrid.glb               write ../public/twin/avatar.glb
//   node prepare-avatar.mjs source/astrid.glb out.glb       write somewhere else

import fs from 'node:fs';
import path from 'node:path';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { dedup, meshopt, prune, resample, textureCompress } from '@gltf-transform/functions';
import { MeshoptDecoder, MeshoptEncoder } from 'meshoptimizer';
import sharp from 'sharp';

const BONES = [
  'Hips', 'Spine', 'Spine1', 'Spine2', 'Neck', 'Head', 'LeftEye', 'RightEye',
  ...['Left', 'Right'].flatMap((s) => [
    `${s}Shoulder`, `${s}Arm`, `${s}ForeArm`, `${s}Hand`,
    ...['Thumb', 'Index', 'Middle', 'Ring', 'Pinky'].flatMap((f) => [1, 2, 3].map((i) => `${s}Hand${f}${i}`)),
    `${s}UpLeg`, `${s}Leg`, `${s}Foot`, `${s}ToeBase`,
  ]),
];

const ARKIT = [
  'browDownLeft', 'browDownRight', 'browInnerUp', 'browOuterUpLeft', 'browOuterUpRight',
  'cheekPuff', 'cheekSquintLeft', 'cheekSquintRight',
  'eyeBlinkLeft', 'eyeBlinkRight', 'eyeLookDownLeft', 'eyeLookDownRight', 'eyeLookInLeft', 'eyeLookInRight',
  'eyeLookOutLeft', 'eyeLookOutRight', 'eyeLookUpLeft', 'eyeLookUpRight', 'eyeSquintLeft', 'eyeSquintRight',
  'eyeWideLeft', 'eyeWideRight',
  'jawForward', 'jawLeft', 'jawOpen', 'jawRight',
  'mouthClose', 'mouthDimpleLeft', 'mouthDimpleRight', 'mouthFrownLeft', 'mouthFrownRight', 'mouthFunnel',
  'mouthLeft', 'mouthLowerDownLeft', 'mouthLowerDownRight', 'mouthPressLeft', 'mouthPressRight', 'mouthPucker',
  'mouthRight', 'mouthRollLower', 'mouthRollUpper', 'mouthShrugLower', 'mouthShrugUpper', 'mouthSmileLeft',
  'mouthSmileRight', 'mouthStretchLeft', 'mouthStretchRight', 'mouthUpperUpLeft', 'mouthUpperUpRight',
  'noseSneerLeft', 'noseSneerRight', 'tongueOut',
];

// TalkingHead's blender/build-visemes-from-arkit.py
const VISEMES = {
  viseme_aa: { jawOpen: 0.6 },
  viseme_E: { mouthPressLeft: 0.8, mouthPressRight: 0.8, mouthDimpleLeft: 1, mouthDimpleRight: 1, jawOpen: 0.3 },
  viseme_I: { mouthPressLeft: 0.6, mouthPressRight: 0.6, mouthDimpleLeft: 0.6, mouthDimpleRight: 0.6, jawOpen: 0.2 },
  viseme_O: { mouthPucker: 1, jawForward: 0.6, jawOpen: 0.2 },
  viseme_U: { mouthFunnel: 1 },
  viseme_PP: { mouthRollLower: 0.8, mouthRollUpper: 0.8, mouthUpperUpLeft: 0.3, mouthUpperUpRight: 0.3 },
  viseme_FF: {
    mouthPucker: 1, mouthShrugUpper: 1, mouthLowerDownLeft: 0.2, mouthLowerDownRight: 0.2,
    mouthDimpleLeft: 1, mouthDimpleRight: 1, mouthRollLower: 1,
  },
  viseme_DD: { mouthPressLeft: 0.8, mouthPressRight: 0.8, mouthFunnel: 0.5, jawOpen: 0.2 },
  viseme_SS: { mouthPressLeft: 0.8, mouthPressRight: 0.8, mouthLowerDownLeft: 0.5, mouthLowerDownRight: 0.5, jawOpen: 0.1 },
  viseme_TH: { mouthRollUpper: 0.6, jawOpen: 0.2, tongueOut: 0.4 },
  viseme_CH: { mouthPucker: 0.5, jawOpen: 0.2 },
  viseme_RR: { mouthPucker: 0.5, jawOpen: 0.2 },
  viseme_kk: {
    mouthLowerDownLeft: 0.4, mouthLowerDownRight: 0.4, mouthDimpleLeft: 0.3, mouthDimpleRight: 0.3,
    mouthFunnel: 0.3, mouthPucker: 0.3, jawOpen: 0.15,
  },
  viseme_nn: {
    mouthLowerDownLeft: 0.4, mouthLowerDownRight: 0.4, mouthDimpleLeft: 0.3, mouthDimpleRight: 0.3,
    mouthFunnel: 0.3, mouthPucker: 0.3, jawOpen: 0.15, tongueOut: 0.2,
  },
  viseme_sil: {},
};

const args = process.argv.slice(2);
const checkOnly = args.includes('--check');
const [input, output = path.resolve(import.meta.dirname, '../public/twin/avatar.glb')] = args.filter((a) => !a.startsWith('--'));
if (!input) {
  console.error('usage: node prepare-avatar.mjs [--check] <avatar.glb> [out.glb]');
  process.exit(1);
}

await MeshoptDecoder.ready;
await MeshoptEncoder.ready;
const io = new NodeIO()
  .registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({ 'meshopt.decoder': MeshoptDecoder, 'meshopt.encoder': MeshoptEncoder });
const doc = await io.read(input);
const root = doc.getRoot();

// ---- check ---------------------------------------------------------------------------------------
const nodeNames = new Set(root.listNodes().map((n) => n.getName()));
const morphMeshes = root.listMeshes().filter((m) => m.listPrimitives().some((p) => p.listTargets().length));
const targetNames = (mesh) => mesh.getExtras()?.targetNames || [];
const shapes = new Set(morphMeshes.flatMap(targetNames));

const missingBones = BONES.filter((b) => !nodeNames.has(b));
const missingArkit = ARKIT.filter((s) => !shapes.has(s));
const missingVisemes = Object.keys(VISEMES).filter((s) => !shapes.has(s));
const buildable = missingVisemes.filter((v) => Object.keys(VISEMES[v]).every((s) => shapes.has(s)));
const tris = root.listMeshes().reduce(
  (n, m) => n + m.listPrimitives().reduce((k, p) => k + (p.getIndices()?.getCount() ?? 0) / 3, 0),
  0
);

const ok = (cond) => (cond ? 'ok  ' : 'MISS');
console.log(`\n${path.basename(input)}  ${(fs.statSync(input).size / 1e6).toFixed(1)} MB, ${Math.round(tris).toLocaleString()} triangles`);
console.log(`${ok(nodeNames.has('Armature'))} root node "Armature"${nodeNames.has('Armature') ? '' : ' (will be added)'}`);
console.log(`${ok(!missingBones.length)} bones ${BONES.length - missingBones.length}/${BONES.length}${missingBones.length ? ': missing ' + missingBones.join(', ') : ''}`);
console.log(`${ok(!missingArkit.length)} ARKit blend shapes ${ARKIT.length - missingArkit.length}/${ARKIT.length}${missingArkit.length ? ': missing ' + missingArkit.join(', ') : ''}`);
console.log(
  `${ok(!missingVisemes.length)} Oculus visemes ${15 - missingVisemes.length}/15` +
    (missingVisemes.length ? `: missing ${missingVisemes.join(', ')}; ${buildable.length} can be built from ARKit` : '')
);
console.log(`     meshes with blend shapes: ${morphMeshes.map((m) => m.getName()).join(', ') || 'none'}`);
for (const t of root.listTextures()) {
  const size = t.getSize();
  if (size && Math.max(...size) > 1024) console.log(`     texture ${t.getName() || t.getURI() || '(unnamed)'} ${size.join('x')} (will be shrunk to 1024)`);
}

const fatal = missingBones.length || !morphMeshes.length || missingVisemes.length > buildable.length;
if (fatal) {
  console.log('\nTalkingHead cannot drive this avatar. See avatar/README.md for what to export.');
  process.exit(2);
}
if (checkOnly) process.exit(0);

// ---- fix -----------------------------------------------------------------------------------------
// TalkingHead looks the rig up by name ("Armature"); wrap the scene's top nodes in one if it isn't there.
if (!nodeNames.has('Armature')) {
  const scene = root.getDefaultScene() || root.listScenes()[0];
  const armature = doc.createNode('Armature');
  for (const child of scene.listChildren()) {
    scene.removeChild(child);
    armature.addChild(child);
  }
  scene.addChild(armature);
}

// Each viseme becomes a new morph target whose deltas are the weighted sum of its ARKit shapes' deltas.
for (const mesh of morphMeshes) {
  const names = [...targetNames(mesh)];
  const index = Object.fromEntries(names.map((n, i) => [n, i]));
  const add = missingVisemes.filter((v) => Object.keys(VISEMES[v]).every((s) => s in index));
  if (!add.length) continue;
  for (const prim of mesh.listPrimitives()) {
    const targets = prim.listTargets();
    for (const v of add) {
      const target = doc.createPrimitiveTarget(v);
      for (const semantic of targets[0].listSemantics()) {
        const ref = targets[0].getAttribute(semantic);
        const out = new Float32Array(ref.getCount() * ref.getElementSize());
        for (const [shape, w] of Object.entries(VISEMES[v])) {
          const src = targets[index[shape]].getAttribute(semantic);
          const el = [];
          for (let i = 0; i < src.getCount(); i++) {
            src.getElement(i, el);
            for (let k = 0; k < el.length; k++) out[i * el.length + k] += w * el[k];
          }
        }
        const acc = doc.createAccessor().setType(ref.getType()).setArray(out).setBuffer(ref.getBuffer());
        target.setAttribute(semantic, acc);
      }
      prim.addTarget(target);
    }
  }
  names.push(...add);
  mesh.setExtras({ ...mesh.getExtras(), targetNames: names });
  mesh.setWeights([...mesh.getWeights(), ...add.map(() => 0)]);
}
if (buildable.length) console.log(`\nbuilt ${buildable.length} visemes from ARKit: ${buildable.join(', ')}`);

await doc.transform(
  dedup(),
  prune({ keepAttributes: true }),
  resample(),
  textureCompress({ encoder: sharp, targetFormat: 'webp', resize: [1024, 1024] }),
  meshopt({ encoder: MeshoptEncoder, level: 'medium' })
);
fs.mkdirSync(path.dirname(output), { recursive: true });
await io.write(output, doc);
console.log(`wrote ${path.relative(process.cwd(), output)}  ${(fs.statSync(output).size / 1e6).toFixed(1)} MB`);
