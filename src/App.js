import { useEffect, useState } from 'react';
import './App.css';
import Nav from './components/Nav';
import TwinPage from './pages/TwinPage';
import HomePage from './pages/HomePage';
import ProjectsPage from './pages/ProjectsPage';
import ResumePage from './pages/ResumePage';
import LifePage from './pages/LifePage';
import { person } from './data/profile';

// Hash routing keeps GitHub Pages happy (no server rewrites needed).
const routes = {
  '/': TwinPage,
  '/home': HomePage,
  '/projects': ProjectsPage,
  '/resume': ResumePage,
  '/life': LifePage,
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
  const Page = routes[path] || TwinPage;
  return (
    <div className="app">
      <div className="crt" aria-hidden="true" />
      <Nav path={path} />
      <main className="page">
        <Page />
      </main>
      <footer className="footer">
        <span>designed & built by {person.name} ✦ {new Date().getFullYear()}</span>
        <span className="footer-links">
          <a href={`mailto:${person.email}`}>email</a>
          <a href={person.linkedin} target="_blank" rel="noreferrer">linkedin</a>
          <a href={person.github} target="_blank" rel="noreferrer">github</a>
        </span>
      </footer>
    </div>
  );
}
