import { THEMES } from './sceneConfig';

const links = [
  { path: '/', label: 'Home' },
  { path: '/projects', label: 'Projects' },
  { path: '/design', label: 'Design' },
  { path: '/about', label: 'About' },
  { path: '/resume', label: 'Resume' },
];

// full-bleed scenes the nav floats over
const OVERLAY = ['/', '/playground'];

// The whole site shares the home scene's palette; the switch cycles the themes in sceneConfig.js.
export default function SiteHeader({ path, theme, onTheme }) {
  const current = THEMES[theme];
  return (
    <header className={OVERLAY.includes(path) ? 'site site-over' : 'site'}>
      <nav>
        {links.map((l) => (
          <a key={l.path} href={`#${l.path}`} aria-current={path === l.path || path.startsWith(`${l.path}/`) ? 'page' : undefined}>
            {l.label}
          </a>
        ))}
      </nav>
      <button type="button" className="themeb" onClick={onTheme} aria-label={`Switch theme (now ${current.label})`}>
        <i style={{ background: current.colors.accent }} aria-hidden="true" />
        <span>{current.label}</span>
      </button>
    </header>
  );
}
