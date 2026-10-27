// "Live ↗ · Demo ↗ · GitHub ↗" for a project; renders nothing when a project has no public links.
export default function ProjectLinks({ links, className = '' }) {
  if (!links.length) return null;
  return (
    <span className={`proj-links ${className}`}>
      {links.map((l) => (
        <a key={l.url} href={l.url} target="_blank" rel="noreferrer">
          {l.label} ↗
        </a>
      ))}
    </span>
  );
}
