import { useState } from 'react';
import { projectCategories, projects } from '../data/profile';

// Thumbnails live in public/projects/; a project's `thumb` in profile.js is just the file name.
function Thumb({ project }) {
  if (project.thumb) {
    return <img className="thumb" src={`${process.env.PUBLIC_URL}/projects/${project.thumb}`} alt="" loading="lazy" />;
  }
  return (
    <span className="thumb thumb-empty" aria-hidden="true">
      {project.glyph}
    </span>
  );
}

export default function ProjectsPage() {
  const [cat, setCat] = useState('all');
  const shown = cat === 'all' ? projects : projects.filter((p) => p.category === cat);
  return (
    <main className="proj-page">
      <header className="proj-head">
        <p className="pb-lbl">Projects</p>
        <h1 className="pb-h1">Things I've built.</h1>
        <p className="pb-dek">Agents, models, systems and the occasional shader. Each one links to its write-up on LinkedIn.</p>
        <div className="chips chips-filter" role="tablist">
          {projectCategories.map((c) => (
            <button key={c.id} role="tab" aria-selected={cat === c.id} className="chip" onClick={() => setCat(c.id)}>
              {c.label}
            </button>
          ))}
        </div>
      </header>

      <section className="proj-grid">
        {shown.map((p) => (
          <article className="proj" key={p.id}>
            <Thumb project={p} />
            <div className="pb-hd">
              <a className="t" href={p.linkedin} target="_blank" rel="noreferrer">
                {p.title}
              </a>
              <span className="y">{p.date}</span>
            </div>
            <p className="role">{p.subtitle}</p>
            <p className="proj-blurb">{p.blurb}</p>
            <p className="proj-meta">
              {p.tags.join(' · ')}
              <br />
              <a href={p.linkedin} target="_blank" rel="noreferrer">
                Read on LinkedIn →
              </a>
            </p>
          </article>
        ))}
      </section>
    </main>
  );
}
