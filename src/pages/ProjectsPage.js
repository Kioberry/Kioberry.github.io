import { useState } from 'react';
import ProjectCard from '../components/ProjectCard';
import { projectCategories, projects } from '../data/profile';

export default function ProjectsPage() {
  const [cat, setCat] = useState('all');
  const shown = cat === 'all' ? projects : projects.filter((p) => p.category === cat);
  return (
    <div className="projects">
      <div className="page-head">
        <p className="eyebrow">C:\astrid\projects</p>
        <h1>things I've built</h1>
        <p className="muted">Each one links to the LinkedIn post with the full story.</p>
      </div>
      <div className="chips" role="tablist">
        {projectCategories.map((c) => (
          <button key={c.id} role="tab" aria-selected={cat === c.id} className={`chip ${cat === c.id ? 'is-active' : ''}`} onClick={() => setCat(c.id)}>
            {c.label}
          </button>
        ))}
      </div>
      <div className="cards">
        {shown.map((p) => (
          <ProjectCard key={p.id} project={p} />
        ))}
      </div>
    </div>
  );
}
