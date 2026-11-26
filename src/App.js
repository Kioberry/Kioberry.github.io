import { useEffect, useRef, useState } from 'react';
import './App.css';
import SiteHeader, { OVERLAY } from './components/SiteHeader';
import HomePage from './pages/HomePage';
import AboutPage from './pages/AboutPage';
import ProjectsPage from './pages/ProjectsPage';
import DesignPage from './pages/DesignPage';
import ResumePage from './pages/ResumePage';
import LifePage from './pages/LifePage';
import LabPage from './pages/LabPage';
import PlaygroundPage from './pages/PlaygroundPage';
import VoicesPage from './pages/VoicesPage';
import RadiusPage from './pages/RadiusPage';
import { person } from './data/profile';
import { THEME_IDS } from './components/sceneConfig';
import { useUiSounds } from './sound/useSound';
import { cue } from './sound/cues';
import { setScene } from './sound/engine';
import { setAmbientTheme } from './sound/ambient';

// Hash routing keeps GitHub Pages happy (no server rewrites needed).
const routes = {
  '/': HomePage,
  '/about': AboutPage,
  '/projects': ProjectsPage,
  '/design': DesignPage,
  '/resume': ResumePage,
  '/life': LifePage,
  '/lab': LabPage,
  '/playground': PlaygroundPage,
  '/voices': VoicesPage,
  '/radius': RadiusPage,
};

function useHashPath() {
  const read = () => window.location.hash.replace(/^#/, '') || '/';
  const [path, setPath] = useState(read);
  useEffect(() => {
    const onChange = () => {
      setPath(read());
      window.scrollTo(0, 0);
    };
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);
  return path;
}

function readTheme() {
  try {
    const saved = localStorage.getItem('site-theme');
    if (THEME_IDS.includes(saved)) return saved;
  } catch {}
  return THEME_IDS[0];
}

// The visitor's theme (see THEMES in sceneConfig.js), remembered in this browser. The home scene takes it
// as a prop; the reading pages follow through [data-theme] on <html>.
function useSiteTheme() {
  const [theme, setTheme] = useState(readTheme);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem('site-theme', theme);
    } catch {}
  }, [theme]);
  const next = () => setTheme((t) => THEME_IDS[(THEME_IDS.indexOf(t) + 1) % THEME_IDS.length]);
  return [theme, next];
}

// The site's sounds (src/sound/): hovers and clicks everywhere, a sound when the page or the theme changes, and
// the ambient bed, full under the home scene and faint behind the reading pages. All silent until sound is on.
function useSiteSounds(path, theme) {
  useUiSounds();
  const seen = useRef({ path, theme });
  useEffect(() => {
    setScene(OVERLAY.includes(path));
    if (seen.current.path !== path) cue('nav');
    seen.current.path = path;
  }, [path]);
  useEffect(() => {
    setAmbientTheme(theme);
    if (seen.current.theme !== theme) cue('theme', theme);
    seen.current.theme = theme;
  }, [theme]);
}

export default function App() {
  const path = useHashPath();
  const [theme, nextTheme] = useSiteTheme();
  useSiteSounds(path, theme);
  // #/design/<id> is a case study inside the design page
  const Page = routes[path] || (path.startsWith('/design/') ? DesignPage : HomePage);
  return (
    <>
      <SiteHeader path={path} theme={theme} onTheme={nextTheme} />
      <Page theme={theme} path={path} />      <footer className="pfoot">
        <span>© {new Date().getFullYear()} {person.name}</span>
        <span className="pfoot-links">
          <a href={`mailto:${person.email}`}>Email</a>
          <a href={person.linkedin} target="_blank" rel="noreferrer">LinkedIn</a>
          <a href={person.github} target="_blank" rel="noreferrer">GitHub</a>
        </span>
      </footer>
    </>
  );
}
