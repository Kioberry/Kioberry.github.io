import { useEffect, useState } from 'react';
import { THEMES } from './sceneConfig';
import { toggleSound, useSoundEnabled } from '../sound/useSound';

const links = [
  { path: '/', label: 'Home' },
  { path: '/projects', label: 'Projects' },
  { path: '/design', label: 'Design' },
  { path: '/about', label: 'About' },
  { path: '/resume', label: 'Resume' },
];

// full-bleed scenes the nav floats over
export const OVERLAY = ['/', '/playground'];

// Sound is off until a visitor turns it on; the choice is remembered in this browser (src/sound/engine.js).
function SoundSwitch() {
  const on = useSoundEnabled();
  return (
    <button
      type="button"
      className={`soundb ${on ? 'is-on' : ''}`}
      onClick={toggleSound}
      aria-pressed={on}
      aria-label="Sound"
      title={on ? 'Sound on' : 'Sound off'}
      data-sound-skip
      data-sound-toggle
    >
      <span className="soundb-bars" aria-hidden="true">
        <i />
        <i />
        <i />
        <i />
      </span>
      <span className="soundb-label">{on ? 'Sound' : 'Muted'}</span>
    </button>
  );
}

// The whole site shares the home scene's palette; the switch cycles the themes in sceneConfig.js.
export default function SiteHeader({ path, theme, onTheme }) {
  const current = THEMES[theme];
  // the header sticks to the top; once the page scrolls it gets a backdrop so text under it stays out of the way
  const [stuck, setStuck] = useState(false);
  useEffect(() => {
    const onScroll = () => setStuck(window.scrollY > 4);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [path]);
  const cls = ['site', OVERLAY.includes(path) && 'site-over', stuck && 'site-stuck'].filter(Boolean).join(' ');
  return (
    <header className={cls}>
      <nav>
        {links.map((l) => (
          <a key={l.path} href={`#${l.path}`} aria-current={path === l.path || path.startsWith(`${l.path}/`) ? 'page' : undefined}>
            {l.label}
          </a>
        ))}
      </nav>
      <div className="site-tools">
        <SoundSwitch />
        <button type="button" className="themeb" onClick={onTheme} aria-label={`Switch theme (now ${current.label})`} data-sound-skip>
          <i style={{ background: current.colors.accent }} aria-hidden="true" />
          <span>{current.label}</span>
        </button>
      </div>
    </header>
  );
}
