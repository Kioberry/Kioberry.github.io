import { useEffect, useState } from 'react';
import './App.css';
import SiteHeader from './components/SiteHeader';
import HomePage from './pages/HomePage';
import AboutPage from './pages/AboutPage';
import ProjectsPage from './pages/ProjectsPage';
import ResumePage from './pages/ResumePage';
import LifePage from './pages/LifePage';
import LabPage from './pages/LabPage';
import PlaygroundPage from './pages/PlaygroundPage';
import { person } from './data/profile';
import { THEME_IDS } from './components/sceneConfig';

// Hash routing keeps GitHub Pages happy (no server rewrites needed).
const routes = {
  '/': HomePage,
  '/about': AboutPage,
  '/projects': ProjectsPage,
  '/resume': ResumePage,
  '/life': LifePage,
  '/lab': LabPage,
  '/playground': PlaygroundPage,
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

export default function App() {
  const path = useHashPath();
  const [theme, nextTheme] = useSiteTheme();
  const Page = routes[path] || HomePage;
  return (
    <>
      <SiteHeader path={path} theme={theme} onTheme={nextTheme} />
      <Page theme={theme} />
      <footer className="pfoot">
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
