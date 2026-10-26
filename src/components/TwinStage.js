import { useEffect, useState } from 'react';
import PixelScene from './PixelScene';

// The twin's portrait. Drop generated art into public/twin/:
//   scene.png        required: 4:3 pixel-art scene (character + background, no UI)
//   scene-blink.png  optional: same image with eyes closed
//   scene-talk.png   optional: same image with mouth slightly open
// Until scene.png exists the procedural PixelScene is shown instead.
const base = `${process.env.PUBLIC_URL}/twin`;
const FRAMES = { idle: `${base}/scene.png`, blink: `${base}/scene-blink.png`, talk: `${base}/scene-talk.png` };

function useLoaded(src) {
  const [ok, setOk] = useState(null);
  useEffect(() => {
    const img = new Image();
    img.onload = () => setOk(true);
    img.onerror = () => setOk(false);
    img.src = src;
  }, [src]);
  return ok;
}

export default function TwinStage({ talking = false, expression, className = '' }) {
  const hasIdle = useLoaded(FRAMES.idle);
  const hasBlink = useLoaded(FRAMES.blink);
  const hasTalk = useLoaded(FRAMES.talk);
  const [frame, setFrame] = useState('idle');

  useEffect(() => {
    if (!hasIdle) return;
    let timer;
    if (talking && hasTalk) {
      timer = setInterval(() => setFrame((f) => (f === 'talk' ? 'idle' : 'talk')), 160);
    } else if (hasBlink) {
      const blink = () => {
        setFrame('blink');
        timer = setTimeout(() => {
          setFrame('idle');
          timer = setTimeout(blink, 2500 + Math.random() * 3000);
        }, 150);
      };
      timer = setTimeout(blink, 2000);
    }
    return () => {
      clearInterval(timer);
      clearTimeout(timer);
      setFrame('idle');
    };
  }, [hasIdle, hasBlink, hasTalk, talking]);

  if (hasIdle === false) {
    return <PixelScene className={`${className} is-fallback`} talking={talking} expression={expression} />;
  }
  if (hasIdle === null) return <div className={className} />;
  return (
    <img
      className={`${className} twin-img ${talking ? 'is-talking' : ''}`}
      src={FRAMES[frame]}
      alt="Pixel-art portrait of Astrid's digital twin"
      draggable={false}
    />
  );
}
