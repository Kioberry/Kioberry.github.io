import { useEffect, useState } from 'react';
import './App.css';
import SiteHeader from './components/SiteHeader';
import HomePage from './pages/HomePage';
import AboutPage from './pages/AboutPage';
import ProjectsPage from './pages/ProjectsPage';
import ResumePage from './pages/ResumePage';
import LifePage from './pages/LifePage';
import LabPage from './pages/LabPage';
import { person } from './data/profile';

// Hash routing keeps GitHub Pages happy (no server rewrites needed).
const routes = {
  '/': HomePage,
  '/about': AboutPage,
  '/projects': ProjectsPage,
  '/resume': ResumePage,
  '/life': LifePage,
  '/lab': LabPage,
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

export default function App() {
  const path = useHashPath();
  const Page = routes[path] || HomePage;
  return (
    <>
      <SiteHeader path={path} />
      <Page />
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
