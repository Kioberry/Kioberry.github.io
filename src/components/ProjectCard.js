import ProjectLinks from './ProjectLinks';

// Thumbnails live in public/projects/; a project's `thumb` in profile.js is just the file name.
// The frame links to the project's first link (the title already does, so it stays out of the tab order).
function Thumb({ project }) {
  const pic = project.thumb ? (
    <img className="thumb" src={`${process.env.PUBLIC_URL}/projects/${project.thumb}`} alt="" loading="lazy" />
  ) : (
    <span className="thumb thumb-empty">{project.glyph}</span>
  );
  const link = project.links[0];
  if (!link) return <div className="thumb-frame" aria-hidden="true">{pic}</div>;
  return (
    <a className="thumb-frame" href={link.url} target="_blank" rel="noreferrer" tabIndex={-1} aria-hidden="true">
      {pic}
      <span className="thumb-cta">{link.label} ↗</span>
    </a>
  );
}

// One project as a card: thumbnail, title and date, subtitle, blurb, tags and links. Used by #/projects and #/about.
export default function ProjectCard({ project: p }) {
  return (
    <article className="proj">
      <Thumb project={p} />
      <div className="pb-hd">
        {p.links.length ? (
          <a className="t" href={p.links[0].url} target="_blank" rel="noreferrer">
            {p.title}
          </a>
        ) : (
          <span className="t">{p.title}</span>
        )}
        <span className="y">{p.date}</span>
      </div>
      <p className="role">{p.subtitle}</p>
      <p className="proj-blurb">{p.blurb}</p>
      <p className="proj-meta">{p.tags.join(' · ')}</p>
      <ProjectLinks links={p.links} />
    </article>
  );
}
