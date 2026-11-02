import { useEffect, useState } from 'react';
import CaseTuner from '../components/CaseTuner';
import ProjectLinks from '../components/ProjectLinks';
import { designProjects } from '../data/design';

// #/design lists the HCI and design work; #/design/<id> opens one case study. Images live in public/design/<id>/.
// A case study renders in one of LAYOUTS: a project's `layout` in design.js picks it, and #/design/<id>?layout=<name>
// previews another (the candidates sit side by side in #/lab). Adding ?tune opens the layout and colour sliders.
const img = (p, src) => `${process.env.PUBLIC_URL}/design/${p.id}/${src}`;

export const LAYOUTS = {
  editorial: { name: 'Editorial', note: 'Label column on the left, numbered sections, wide body.' },
  original: { name: 'Original', note: 'The old Wix site: centred group titles, accent subheads, three-up image grids.' },
  immersive: { name: 'Immersive', note: 'Full-screen cover, centred text, edge-to-edge image mosaics with captions on the image.' },
  chapters: { name: 'Chapters', note: 'Each section a chapter with a large number; images scroll sideways in a strip.' },
};

function DesignList() {
  return (
    <main className="proj-page">
      <header className="proj-head">
        <p className="pb-lbl">Design</p>
        <h1 className="pb-h1">Things I've designed.</h1>
        <p className="pb-dek">Installations, apps and games, mostly HCI work from before the agents took over.</p>
      </header>

      <section className="proj-grid proj-grid-2">
        {designProjects.map((p) => (
          <article className="proj" key={p.id}>
            <a className="thumb-frame" href={`#/design/${p.id}`} tabIndex={-1} aria-hidden="true">
              <img className="thumb" src={img(p, p.cover)} alt="" loading="lazy" />
              <span className="thumb-cta">Case study →</span>
            </a>
            <div className="pb-hd">
              <a className="t" href={`#/design/${p.id}`}>
                {p.title}
              </a>
              <span className="y">{p.date}</span>
            </div>
            <p className="role">{p.kind}</p>
            <p className="proj-blurb">{p.blurb}</p>
            <p className="proj-meta">{p.tags.join(' · ')}</p>
          </article>
        ))}
      </section>
    </main>
  );
}

// A full-page case study repaints the whole page (header and footer too) in its project's palette: see
// [data-palette] in App.css. The attribute comes off again when the visitor leaves. Embedded previews carry
// the palette on their own frame instead.
function usePalette(id, embedded) {
  useEffect(() => {
    if (embedded) return undefined;
    const root = document.documentElement;
    root.dataset.palette = id;
    return () => delete root.dataset.palette;
  }, [id, embedded]);
}

function Video({ p }) {
  if (!p.video) return <img className="case-hero" src={img(p, p.cover)} alt="" />;
  return (
    <>
      {/* YouTube refuses to play embeds that arrive without a Referer, so state the policy its own embed code uses */}
      <div className="case-hero case-video">
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${p.video}?rel=0`}
          title={`${p.title} video`}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          referrerPolicy="strict-origin-when-cross-origin"
          allowFullScreen
        />
      </div>
      <a className="case-watch" href={`https://www.youtube.com/watch?v=${p.video}`} target="_blank" rel="noreferrer">
        Watch on YouTube ↗
      </a>
    </>
  );
}

function Facts({ p }) {
  return (
    <dl className="case-facts">
      <div>
        <dt>Type</dt>
        <dd>{p.kind}</dd>
      </div>
      <div>
        <dt>When</dt>
        <dd>{p.date}</dd>
      </div>
      <div>
        <dt>Tools</dt>
        <dd>{p.tags.join(', ')}</dd>
      </div>
    </dl>
  );
}

function Figure({ p, f, style, onLoad }) {
  return (
    <figure className={f.wide ? 'wide' : undefined} style={style}>
      <img src={img(p, f.src)} alt={f.title || f.caption} loading="lazy" onLoad={onLoad} />
      {(f.title || f.caption) && (
        <figcaption>
          {f.title && <strong>{f.title}</strong>}
          {f.caption}
        </figcaption>
      )}
    </figure>
  );
}

// A row of figures that all come out the same height, uncropped: each figure grows in proportion to its image's
// aspect ratio (read when the image loads), so the row fills its width exactly.
function JustifiedRow({ p, figures }) {
  const [ratios, setRatios] = useState({});
  return (
    <div className="case-figs case-figs-row">
      {figures.map((f) => (
        <Figure
          key={f.src}
          p={p}
          f={f}
          style={{ '--ar': ratios[f.src] || 1 }}
          onLoad={(e) => {
            const { naturalWidth: w, naturalHeight: h } = e.currentTarget;
            if (w && h) setRatios((r) => ({ ...r, [f.src]: w / h }));
          }}
        />
      ))}
    </div>
  );
}

// `flow` alternates data and steps: data are the boxes, each step labels the arrow into the next box.
function Flow({ steps }) {
  return (
    <ol className="case-flow">
      {steps.map((label, i) => (
        <li key={label} className={i % 2 ? 'cf-step' : 'cf-node'}>
          <span>{label}</span>
        </li>
      ))}
    </ol>
  );
}

// A section's paragraphs, pipeline, labelled points and figures; every layout styles these through its own class.
// Photo rows marked `crop` share one cropped shape; any other figures form a justified row, with wide ones below.
function Body({ p, s }) {
  const figs = s.figures || [];
  const narrow = figs.filter((f) => !f.wide);
  const wide = figs.filter((f) => f.wide);
  return (
    <>
      {s.text?.map((t) => (
        <p key={t}>{t}</p>
      ))}
      {s.flow && <Flow steps={s.flow} />}
      {s.items && (
        <dl className="case-items">
          {s.items.map(([k, v]) => (
            <div key={k}>
              <dt>{k}</dt>
              <dd>{v}</dd>
            </div>
          ))}
        </dl>
      )}
      {s.crop ? (
        <div className={s.cols === 3 ? 'case-figs case-figs-3 case-figs-crop' : 'case-figs case-figs-crop'}>
          {figs.map((f) => (
            <Figure key={f.src} p={p} f={f} />
          ))}
        </div>
      ) : (
        <>
          {narrow.length > 0 && <JustifiedRow p={p} figures={narrow} key={narrow.map((f) => f.src).join()} />}
          {wide.length > 0 && (
            <div className="case-figs">
              {wide.map((f) => (
                <Figure key={f.src} p={p} f={f} />
              ))}
            </div>
          )}
        </>
      )}
    </>
  );
}

// Consecutive sections sharing a `group` become one block; a section without one is its own block.
function grouped(sections) {
  const out = [];
  for (const s of sections) {
    const last = out[out.length - 1];
    if (s.group && last?.title === s.group) last.sections.push(s);
    else out.push({ title: s.group || s.heading, sections: [s], named: Boolean(s.group) });
  }
  return out;
}

function Back() {
  return (
    <a className="case-back" href="#/design">
      ← Design
    </a>
  );
}

function Next({ p }) {
  const next = designProjects[(designProjects.indexOf(p) + 1) % designProjects.length];
  return (
    <a className="case-next" href={`#/design/${next.id}`}>
      <span>Next</span>
      {next.title} →
    </a>
  );
}

function Editorial({ p }) {
  return (
    <main className="case case-editorial">
      <Back />
      <header className="case-head">
        <div>
          <h1 className="case-title">{p.title}</h1>
          <p className="case-dek">{p.blurb}</p>
          <ProjectLinks links={p.links} />
        </div>
        <Facts p={p} />
      </header>
      <Video p={p} />
      {p.sections.map((s) => (
        <section className="case-sec" key={s.heading}>
          <h2>{s.heading}</h2>
          <div className="case-body">
            <Body p={p} s={s} />
          </div>
        </section>
      ))}
      <Next p={p} />
    </main>
  );
}

function Original({ p }) {
  return (
    <main className="case case-original">
      <Back />
      <header className="co-head">
        <h1 className="case-title">{p.title}</h1>
        <p className="case-dek">{p.blurb}</p>
        <p className="co-meta">
          {p.kind} · {p.date} · {p.tags.join(', ')}
        </p>
      </header>
      <Video p={p} />
      {grouped(p.sections).map((g) => (
        <section className="co-group" key={g.title}>
          <h2>{g.title}</h2>
          {g.sections.map((s) => (
            <div className="co-sub" key={s.heading}>
              {g.named && <h3>{s.heading}</h3>}
              <Body p={p} s={s} />
            </div>
          ))}
        </section>
      ))}
      <Next p={p} />
    </main>
  );
}

function Immersive({ p }) {
  return (
    <main className="case case-immersive">
      <header className="ci-hero" style={{ backgroundImage: `url(${img(p, p.cover)})` }}>
        <Back />
        <div className="ci-hero-text">
          <p className="ci-kicker">
            {p.kind} · {p.date}
          </p>
          <h1 className="case-title">{p.title}</h1>
          <p className="case-dek">{p.blurb}</p>
        </div>
      </header>
      <div className="ci-video">
        <Video p={p} />
      </div>
      {grouped(p.sections).map((g) => (
        <section className="ci-group" key={g.title}>
          <h2>{g.title}</h2>
          {g.sections.map((s) => (
            <div className="ci-sub" key={s.heading}>
              {g.named && <h3>{s.heading}</h3>}
              <Body p={p} s={s} />
            </div>
          ))}
        </section>
      ))}
      <p className="ci-tools">{p.tags.join(' · ')}</p>
      <Next p={p} />
    </main>
  );
}

function Chapters({ p }) {
  return (
    <main className="case case-chapters">
      <Back />
      <header className="ch-head">
        <p className="ci-kicker">
          {p.kind} · {p.date}
        </p>
        <h1 className="case-title">{p.title}</h1>
        <p className="case-dek">{p.blurb}</p>
      </header>
      <Video p={p} />
      {p.sections.map((s, i) => (
        <section className="ch-sec" key={s.heading}>
          <span className="ch-num" aria-hidden="true">
            {String(i + 1).padStart(2, '0')}
          </span>
          {s.group && <p className="ch-group">{s.group}</p>}
          <h2>{s.heading}</h2>
          <Body p={p} s={s} />
        </section>
      ))}
      <p className="ci-tools">{p.tags.join(' · ')}</p>
      <Next p={p} />
    </main>
  );
}

const VIEWS = { editorial: Editorial, original: Original, immersive: Immersive, chapters: Chapters };

export function CaseStudy({ project, layout, embedded = false, tune = false }) {
  usePalette(project.id, embedded);
  const View = VIEWS[layout] || VIEWS[project.layout] || Editorial;
  return (
    <>
      <View p={project} />
      {tune && <CaseTuner project={project} />}
    </>
  );
}

export default function DesignPage({ path }) {
  const [route, query = ''] = path.split('?');
  const project = designProjects.find((p) => p.id === route.split('/')[2]);
  const params = new URLSearchParams(query);
  return project ? (
    <CaseStudy project={project} layout={params.get('layout')} tune={params.has('tune')} />
  ) : (
    <DesignList />
  );
}
