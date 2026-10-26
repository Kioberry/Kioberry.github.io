import { useState } from 'react';
import { projectCategories, projects } from '../data/profile';

// Thumbnails: drop an image at public/projects/<id>.png and set `thumb` on the project in profile.js.
function Thumb({ project }) {
  if (project.thumb) return <img className="thumb" src={project.thumb} alt="" loading="lazy" />;
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
    <div className="pb-grid">
      <main>
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

        <section className="proj-list">
          {shown.map((p) => (
            <article className="proj" key={p.id}>
              <Thumb project={p} />
              <div>
                <div className="pb-hd">
                  <a className="t" href={p.linkedin} target="_blank" rel="noreferrer">
                    {p.title}
                  </a>
                  <span className="y">{p.date}</span>
                </div>
                <p className="role">{p.subtitle}</p>
                <p>{p.blurb}</p>
                <p className="proj-meta">
                  {p.tags.join(' · ')} ·{' '}
                  <a href={p.linkedin} target="_blank" rel="noreferrer">
                    linkedin
                  </a>
                </p>
              </div>
            </article>
          ))}
        </section>
      </main>
    </div>
  );
}
