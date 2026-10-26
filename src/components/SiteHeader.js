import { useEffect, useState } from 'react';
import { person } from '../data/profile';

const links = [
  { path: '/', label: 'Twin' },
  { path: '/home', label: 'About' },
  { path: '/projects', label: 'Projects' },
  { path: '/resume', label: 'Resume' },
];

function readTheme() {
  try {
    return localStorage.getItem('theme');
  } catch {
    return null;
  }
}

// null = follow the system; 'light' / 'dark' = the visitor's choice
function useTheme() {
  const [theme, setTheme] = useState(readTheme);
  useEffect(() => {
    const root = document.documentElement;
    if (theme) root.dataset.theme = theme;
    else delete root.dataset.theme;
    try {
      if (theme) localStorage.setItem('theme', theme);
    } catch {}
  }, [theme]);
  const toggle = () => {
    const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const current = theme || (systemDark ? 'dark' : 'light');
    setTheme(current === 'dark' ? 'light' : 'dark');
  };
  return toggle;
}

export default function SiteHeader({ path }) {
  const toggleTheme = useTheme();
  return (
    <header className="site">
      <a href="#/" className="name">
        {person.name}
      </a>
      <nav>
        {links.map((l) => (
          <a key={l.path} href={`#${l.path}`} aria-current={path === l.path ? 'page' : undefined}>
            {l.label}
          </a>
        ))}
      </nav>
      <button className="themeb" onClick={toggleTheme} aria-label="Toggle light and dark theme">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
        </svg>
      </button>
    </header>
  );
}
