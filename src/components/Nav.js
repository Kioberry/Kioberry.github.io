const items = [
  { path: '/', label: 'twin.exe' },
  { path: '/home', label: 'home' },
  { path: '/projects', label: 'projects' },
  { path: '/resume', label: 'resume' },
  { path: '/life', label: 'life', locked: true },
];

export default function Nav({ path }) {
  return (
    <header className="nav">
      <a href="#/" className="nav-logo">
        Astrid<span className="nav-logo-star">✦</span>
      </a>
      <nav className="nav-tabs">
        {items.map((it) => (
          <a
            key={it.path}
            href={`#${it.path}`}
            className={`nav-tab ${path === it.path ? 'is-active' : ''} ${it.locked ? 'is-locked' : ''}`}
          >
            {it.label}
            {it.locked && <span className="nav-soon">soon</span>}
          </a>
        ))}
      </nav>
    </header>
  );
}
