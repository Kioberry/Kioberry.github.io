import ProjectLinks from '../components/ProjectLinks';
import { designProjects } from '../data/design';

// #/design lists the HCI and design work; #/design/<id> opens one case study. Images live in public/design/<id>/.
const img = (p, src) => `${process.env.PUBLIC_URL}/design/${p.id}/${src}`;

function DesignList() {
  return (
    <main className="proj-page">
      <header className="proj-head">
        <p className="pb-lbl">Design</p>
        <h1 className="pb-h1">Things I've designed.</h1>
        <p className="pb-dek">Installations, apps and games, mostly HCI work from before the agents took over.</p>
      </header>

      <section className="proj-grid">
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

function CaseStudy({ project: p }) {
  const next = designProjects[(designProjects.indexOf(p) + 1) % designProjects.length];
  return (
    <main className="case">
      <a className="case-back" href="#/design">
        ← Design
      </a>
      <header className="case-head">
        <p className="pb-lbl">{p.kind}</p>
        <h1 className="pb-h1">{p.title}</h1>
        <p className="pb-dek">{p.blurb}</p>
        <p className="proj-meta">{p.tags.join(' · ')}</p>
        <ProjectLinks links={p.links} />
      </header>
      {p.video ? (
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
      ) : (
        <img className="case-hero" src={img(p, p.cover)} alt="" />
      )}

      {p.sections.map((s) => (
        <section className="case-sec" key={s.heading}>
          <h2>{s.heading}</h2>
          {s.text?.map((t) => (
            <p key={t}>{t}</p>
          ))}
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
          {s.figures && (
            <div className={s.cols === 3 ? 'case-figs case-figs-3' : 'case-figs'}>
              {s.figures.map((f) => (
                <figure key={f.src} className={f.wide ? 'wide' : undefined}>
                  <img src={img(p, f.src)} alt={f.caption} loading="lazy" />
                  <figcaption>{f.caption}</figcaption>
                </figure>
              ))}
            </div>
          )}
        </section>
      ))}

      <a className="case-next" href={`#/design/${next.id}`}>
        <span>Next</span>
        {next.title} →
      </a>
    </main>
  );
}

export default function DesignPage({ path }) {
  const id = path.split('/')[2];
  const project = designProjects.find((p) => p.id === id);
  return project ? <CaseStudy project={project} /> : <DesignList />;
}
