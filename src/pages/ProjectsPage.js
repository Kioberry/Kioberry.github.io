import { useState } from 'react';
import ProjectCard from '../components/ProjectCard';
import { projectCategories, projects } from '../data/profile';

export default function ProjectsPage() {
  const [cat, setCat] = useState('all');
  const shown = cat === 'all' ? projects : projects.filter((p) => p.category === cat);
  return (
    <main className="proj-page">
      <header className="proj-head">
        <p className="pb-lbl">Projects</p>
        <h1 className="pb-h1">Things I've built.</h1>
        <p className="pb-dek">Agents, models, systems and the occasional shader.</p>
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
          <ProjectCard project={p} key={p.id} />
        ))}
      </section>
    </main>
  );
}
