import { useState } from 'react';
import { layouts } from '../components/HomeLayouts';
import { designProjects } from '../data/design';
import { CaseStudy, LAYOUTS } from './DesignPage';

// Temporary: candidates side by side. Not linked from the nav; open #/lab. The first tab holds the home layouts
// and pixel fonts; the others hold the case-study layouts for the immersive design projects, each in a
// scrollable frame that wears the project's palette.
const fonts = [
  { id: 'silkscreen', label: 'Silkscreen' },
  { id: 'press', label: 'Press Start 2P' },
  { id: 'jersey', label: 'Jersey 10' },
  { id: 'pixelify', label: 'Pixelify Sans' },
];

const TABS = [
  { id: 'home', label: 'Home layouts' },
  { id: 'luminara', label: 'Luminara' },
  { id: 'immune-vanguard', label: 'Immune Vanguard' },
];

function HomeLayouts() {
  const [font, setFont] = useState('silkscreen');
  return (
    <>
      <div className="chips lab-sub" role="tablist" aria-label="Name font">
        {fonts.map((f) => (
          <button key={f.id} role="tab" aria-selected={font === f.id} className="chip" onClick={() => setFont(f.id)}>
            {f.label}
          </button>
        ))}
      </div>
      <div className="lab-grid">
        {layouts.map(({ id, name, note, Component }) => (
          <figure key={id} className="lab-item">
            <div className={`lab-frame home-dark font-${font}`}>
              <Component />
            </div>
            <figcaption>
              <b>{name}</b>
              <span>{note}</span>
            </figcaption>
          </figure>
        ))}
      </div>
    </>
  );
}

function CaseLayouts({ project }) {
  return (
    <div className="lab-grid">
      {Object.entries(LAYOUTS).map(([id, { name, note }]) => (
        <figure key={id} className="lab-item">
          <figcaption className="lab-cap-top">
            <b>{name}</b>
            <span>{note}</span>
            <a href={`#/design/${project.id}?layout=${id}`}>Open full page ↗</a>
          </figcaption>
          <div className="lab-frame lab-case" data-palette={project.id}>
            <CaseStudy project={project} layout={id} embedded />
          </div>
        </figure>
      ))}
    </div>
  );
}

export default function LabPage() {
  const [tab, setTab] = useState('home');
  const project = designProjects.find((p) => p.id === tab);
  return (
    <main className={project ? 'lab lab-wide' : 'lab'}>
      <div className="lab-bar">
        <p className="pb-lbl">Lab</p>
        <div className="chips" role="tablist" aria-label="What to compare">
          {TABS.map((t) => (
            <button key={t.id} role="tab" aria-selected={tab === t.id} className="chip" onClick={() => setTab(t.id)}>
              {t.label}
            </button>
          ))}
        </div>
      </div>
      {project ? <CaseLayouts project={project} key={project.id} /> : <HomeLayouts />}
    </main>
  );
}
