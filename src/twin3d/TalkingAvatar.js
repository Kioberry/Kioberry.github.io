import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { silentSpeech, spendVoice, voiceBudgetLeft, voicedSpeech } from './speech';

// The twin as a rigged 3D model drawn in ASCII, the way matthewpetersen.ca does it: TalkingHead loads the GLB
// (made with avatar/prepare-avatar.mjs), animates idle motion, blinks and moods, and lip-syncs each line from
// word and viseme timings; a postprocessing pass turns every frame into glyphs (AsciiEffect).
//
// The chat drives it through the ref: say(line, onWord) speaks one bubble (with the voice from twin-api /tts if
// there is one, else silently) and calls onWord(end) as each word is said, so the text appears in step;
// prepare(line) fetches the next bubble's voice early; stop() cuts it off. If WebGL or the model fails, onFail()
// is called and the page shows the video twin instead.

const isTouch = () => navigator.maxTouchPoints > 0 || window.matchMedia?.('(pointer: coarse)').matches;
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

// Petersen's lighting and camera
const LIGHTING = {
  lightAmbientColor: '#ffffff',
  lightAmbientIntensity: 10,
  lightDirectColor: '#8888aa',
  lightDirectIntensity: 100,
  lightDirectPhi: 1.7,
  lightDirectTheta: 1.6,
  lightSpotColor: '#8888aa',
  lightSpotIntensity: 200,
  lightSpotPhi: 5.2,
  lightSpotTheta: 2.6,
  lightSpotDispersion: 0.18,
};

// His "relaxed" standing pose: arms down, head slightly raised
const RELAXED = {
  'Spine.rotation': { x: -0.05, y: -0.007, z: 0.005 },
  'Spine1.rotation': { x: 0, y: -0.014, z: 0.012 },
  'Spine2.rotation': { x: 0.05, y: -0.013, z: 0.013 },
  'Neck.rotation': { x: -0.15, y: -0.003, z: 0.012 },
  'Head.rotation': { x: 0.12, y: -0.02, z: -0.017 },
  'LeftShoulder.rotation': { x: 1.56, y: -0.1, z: -1.45 },
  'RightShoulder.rotation': { x: 1.56, y: 0.04, z: 1.42 },
  'LeftLeg.rotation': { x: -0.1, y: 0, z: 0 },
  'RightLeg.rotation': { x: -0.1, y: 0, z: 0 },
};

// Calmer moods, as he tunes them: the head moves the same while speaking as at rest, no pose shifts, eyes stay
// near level, and blinks come every 1 to 8 seconds.
function calmMoods(head) {
  if (head.mtBaselineExceptions) head.mtBaselineExceptions.headRotateX = -0.3;
  Object.values(head.animMoods || {}).forEach((mood) => {
    if (!mood.anims) return;
    const h = mood.anims.find((a) => a.name === 'head');
    if (h?.idle && h.speaking) h.speaking.vs = JSON.parse(JSON.stringify(h.idle.vs));
    mood.anims = mood.anims.filter((a) => a.name !== 'pose' && a.name !== 'misc');
    const eyes = mood.anims.find((a) => a.name === 'eyes');
    const level = (x) => {
      if (x?.vs?.eyesRotateX) x.vs.eyesRotateX = [[-0.15, 0.1]];
    };
    if (eyes) {
      eyes.idle?.alt?.forEach(level);
      eyes.speaking?.alt?.forEach(level);
      level(eyes.idle);
      level(eyes.speaking);
    }
    const blink = mood.anims.find((a) => a.name === 'blink');
    if (blink?.alt) {
      blink.alt = [{ p: 1, delay: [1000, 8000, 1, 2], dt: [40, [80, 150], 60], vs: { eyeBlinkLeft: [1, 1, 0], eyeBlinkRight: [1, 1, 0] } }];
    }
  });
}

const TalkingAvatar = forwardRef(function TalkingAvatar(
  { url, colors, view = 'head', cell = 13, voice = true, className = '', label, onReady, onFail },
  ref
) {
  const boxRef = useRef(null);
  const headRef = useRef(null);
  const effectRef = useRef(null);
  const [ready, setReady] = useState(false);
  const sayId = useRef(0);
  const timers = useRef([]);
  const finish = useRef(null); // resolves the line being said
  const prepared = useRef(new Map()); // line -> Promise of its voiced speech
  const cb = useRef({ onReady, onFail });
  cb.current = { onReady, onFail };
  const voiceRef = useRef(voice);
  voiceRef.current = voice;

  useEffect(() => {
    if (effectRef.current && colors) effectRef.current.setColors(colors);
  }, [colors]);

  useEffect(() => {
    let alive = true;
    let raf;
    const cleanups = [];
    const box = boxRef.current;
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;

    (async () => {
      try {
        // three.js and friends load only on the home page, after first paint
        const [{ TalkingHead }, { LipsyncEn }, { EffectComposer, EffectPass, RenderPass }, { default: AsciiEffect }] =
          await Promise.all([
            import('@met4citizen/talkinghead'),
            import('@met4citizen/talkinghead/modules/lipsync-en.mjs'),
            import('postprocessing'),
            import('./AsciiEffect'),
          ]);
        if (!alive) return;

        // TalkingHead loads lip-sync modules by a computed path, which a bundler can't follow: hand it English.
        // (Like Petersen, also ignore the odd morph-target miss during the first frames.)
        TalkingHead.prototype.lipsyncGetProcessor = function lipsyncGetProcessor(lang) {
          if (!this.lipsync[lang]) this.lipsync[lang] = new LipsyncEn();
        };
        const update = TalkingHead.prototype.updateMorphTargets;
        TalkingHead.prototype.updateMorphTargets = function updateMorphTargets(...args) {
          try {
            update.apply(this, args);
          } catch (e) {
            if (!String(e?.message).includes('Cannot read properties of undefined')) throw e;
          }
        };

        const head = new TalkingHead(box, {
          ttsEndpoint: '/no-tts', // speech comes in as audio + timings, never from TalkingHead's own TTS
          jwtGet: () => Promise.resolve(''),
          lipsyncModules: ['en'],
          lipsyncLang: 'en',
          avatarIdleHeadMove: 1,
          avatarSpeakingHeadMove: 1,
          avatarIdleEyeContact: 0.2,
          avatarSpeakingEyeContact: 0.5,
          cameraView: view,
          cameraX: 0,
          cameraY: -0.05,
          cameraDistance: 0,
          cameraRotateX: 0,
          cameraRotateY: 0,
          cameraRotateEnable: true,
          cameraPanEnable: false,
          cameraZoomEnable: false,
          avatarMood: 'happy',
          modelFPS: 30,
          ...LIGHTING,
          mixerGainSpeech: 1,
          avatarIgnoreCamera: true,
        });
        headRef.current = head;
        cleanups.push(() => head.stop?.());
        calmMoods(head);
        await head.showAvatar({ url, body: 'F', avatarMood: 'happy', lipsyncLang: 'en' });
        if (!alive) return;
        head.setLighting(LIGHTING);
        head.poseTemplates.relaxed = { standing: true, props: { ...head.poseTemplates.straight.props, ...RELAXED } };
        head.setPoseFromTemplate(head.poseTemplates.relaxed, 0);
        head.lookAhead = () => {};
        head.lookAtCamera = () => {};

        // ASCII pass: every render TalkingHead asks for goes through the composer instead
        const { renderer, scene, camera } = head;
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        renderer.setPixelRatio(dpr);
        const px = (css) => Math.round((css * dpr) / 2);
        const effect = new AsciiEffect({ cellSize: px(50), colors });
        effect.set('uReveal', 0);
        effectRef.current = effect;
        const composer = new EffectComposer(renderer);
        composer.addPass(new RenderPass(scene, camera));
        composer.addPass(new EffectPass(camera, effect));
        const render = renderer.render.bind(renderer);
        let inside = false;
        renderer.render = (s, c) => {
          if (inside) return render(s, c);
          inside = true;
          composer.render();
          inside = false;
          return undefined;
        };
        const resize = () => {
          renderer.setPixelRatio(dpr);
          composer.setSize(box.clientWidth, box.clientHeight);
        };
        resize();
        window.addEventListener('resize', resize);
        cleanups.push(() => {
          window.removeEventListener('resize', resize);
          composer.dispose();
        });
        const canvas = renderer.domElement;
        canvas.setAttribute('aria-hidden', 'true');
        canvas.style.touchAction = isTouch() ? 'pan-y' : 'none';

        // pointer: velocity and a trail of where it has been, both fading every frame
        let velocity = 0;
        let trail = [];
        let lastMove = null;
        const onMove = (e) => {
          const r = canvas.getBoundingClientRect();
          const x = (e.clientX - r.left) / r.width;
          const y = (e.clientY - r.top) / r.height;
          effect.setMouse(x, y);
          if (lastMove) velocity = Math.min(1, velocity + Math.hypot(x - lastMove.x, y - lastMove.y) * 2);
          lastMove = { x, y };
          if (x > -0.2 && x < 1.2 && y > -0.2 && y < 1.2) trail.push({ x, y, k: Math.min(1, velocity * 3) });
          if (trail.length > 200) trail = trail.slice(-200);
        };
        // a click anywhere on her sends a burst of scrambled glyphs out from that point
        const onDown = (e) => {
          const r = canvas.getBoundingClientRect();
          const x = clamp((e.clientX - r.left) / r.width, 0, 1);
          const y = clamp((e.clientY - r.top) / r.height, 0, 1);
          if (x <= 0 || x >= 1 || y <= 0 || y >= 1) return;
          effect.setMouse(x, y);
          velocity = Math.max(velocity, 0.88);
          for (let i = 0; i < 24; i++) {
            const a = (i / 24) * Math.PI * 2 + Math.random() * 0.35;
            const d = 0.075 * (0.35 + 0.65 * Math.random());
            trail.push({ x: clamp(x + Math.cos(a) * d, 0, 1), y: clamp(y + Math.sin(a) * d, 0, 1), k: 0.5 + 0.35 * Math.random() });
          }
        };
        window.addEventListener('pointermove', onMove);
        window.addEventListener('pointerdown', onDown);
        cleanups.push(() => {
          window.removeEventListener('pointermove', onMove);
          window.removeEventListener('pointerdown', onDown);
        });

        // the first tap or key press unlocks audio for the whole visit (browsers need a gesture)
        const unlock = () => {
          const ctx = head.audioCtx;
          if (!ctx) return;
          if (ctx.state !== 'running') ctx.resume().catch(() => {});
          const b = ctx.createBufferSource();
          b.buffer = ctx.createBuffer(1, 1, ctx.sampleRate);
          b.connect(ctx.destination);
          b.start(0);
        };
        window.addEventListener('pointerdown', unlock, { once: true });
        window.addEventListener('keydown', unlock, { once: true });
        cleanups.push(() => {
          window.removeEventListener('pointerdown', unlock);
          window.removeEventListener('keydown', unlock);
        });

        // intro: the figure sweeps in from the top while the cells shrink from coarse blocks to glyphs
        const t0 = performance.now();
        const big = px(50);
        const small = px(cell);
        let announced = false;
        const frame = () => {
          raf = requestAnimationFrame(frame);
          const t = reduceMotion ? 1e9 : performance.now() - t0;
          const a = Math.min(t / 1500, 1);
          effect.set('uReveal', a < 0.5 ? 2 * a * a : 1 - (-2 * a + 2) ** 2 / 2);
          const b = Math.min(t / 2000, 1);
          effect.set('uCellSize', big + (small - big) * b ** 3);
          effect.set('uTime', performance.now() / 1000);
          velocity *= 0.92 * 0.95;
          if (velocity < 0.001) velocity = 0;
          effect.set('uVelocity', velocity);
          trail = trail.filter((p) => (p.k *= 0.95) > 0.01);
          const recent = trail.slice(-100);
          const flat = new Float32Array(300);
          recent.forEach((p, i) => flat.set([p.x, p.y, p.k], i * 3));
          effect.setTrail(flat, recent.length);
          if (a >= 1 && !announced) {
            announced = true;
            setReady(true);
            cb.current.onReady?.();
          }
        };
        raf = requestAnimationFrame(frame);
      } catch (err) {
        console.warn('[twin] 3D avatar unavailable, using the video twin:', err);
        if (alive) cb.current.onFail?.(err);
      }
    })();

    return () => {
      alive = false;
      cancelAnimationFrame(raf);
      timers.current.forEach(clearTimeout);
      cleanups.reverse().forEach((f) => f());
      box.replaceChildren();
      headRef.current = null;
      effectRef.current = null;
    };
    // the model and its framing are fixed for the page's life; colours update through their own effect
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, view, cell]);

  useImperativeHandle(ref, () => {
    const voiced = (line) => {
      const head = headRef.current;
      if (!voiceRef.current || !head?.audioCtx || voiceBudgetLeft() <= 0) return Promise.reject(new Error('no voice'));
      if (!prepared.current.has(line)) {
        const p = voicedSpeech(line, head.audioCtx);
        p.catch(() => {});
        prepared.current.set(line, p);
      }
      return prepared.current.get(line);
    };
    const stop = () => {
      sayId.current += 1;
      timers.current.forEach(clearTimeout);
      timers.current = [];
      finish.current?.();
      finish.current = null;
      headRef.current?.stopSpeaking?.();
    };
    return {
      get ready() {
        return ready && Boolean(headRef.current);
      },
      prepare: (line) => {
        voiced(line).catch(() => {});
      },
      // Speaks one line; resolves when it has been said (or was cut off by stop()).
      async say(line, onWord) {
        const head = headRef.current;
        if (!head) return;
        stop();
        const id = sayId.current;
        let speech;
        try {
          speech = await voiced(line);
          spendVoice(speech.ms);
        } catch {
          speech = silentSpeech(line);
          const ctx = head.audioCtx;
          speech.audio = ctx.createBuffer(1, Math.max(1, Math.ceil((speech.ms / 1000) * ctx.sampleRate)), ctx.sampleRate);
        }
        prepared.current.delete(line);
        if (id !== sayId.current) return;
        const { audio, words, wtimes, wdurations, visemes, vtimes, vdurations, ends, ms } = speech;
        head.speakAudio({ audio, words, wtimes, wdurations, ...(visemes ? { visemes, vtimes, vdurations } : {}) }, { lipsyncLang: 'en' });
        await new Promise((resolve) => {
          finish.current = resolve;
          words.forEach((_, i) => timers.current.push(setTimeout(() => id === sayId.current && onWord?.(ends[i]), wtimes[i])));
          timers.current.push(setTimeout(resolve, ms + 150));
        });
      },
      stop,
    };
  });

  return (
    <div className={`avatar3d ${ready ? 'is-ready' : ''} ${className}`} role="img" aria-label={label}>
      <div ref={boxRef} className="avatar3d-canvas" />
    </div>
  );
});

export default TalkingAvatar;
