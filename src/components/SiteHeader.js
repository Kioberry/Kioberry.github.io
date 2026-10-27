const links = [
  { path: '/', label: 'Home' },
  { path: '/projects', label: 'Projects' },
  { path: '/about', label: 'About' },
  { path: '/resume', label: 'Resume' },
];

// The whole site shares the home page's dark teal palette, so there is no theme toggle.
export default function SiteHeader({ path }) {
  return (
    <header className="site">
      <nav>
        {links.map((l) => (
          <a key={l.path} href={`#${l.path}`} aria-current={path === l.path ? 'page' : undefined}>
            {l.label}
          </a>
        ))}
      </nav>
    </header>
  );
}
