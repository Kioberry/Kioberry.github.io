import { education, experience, person, projects } from '../data/profile';

export default function AboutPage() {
  return (
    <div className="pb-grid">
      <main>
        <h1 className="pb-h1">Hi, I'm {person.name.split(' ')[0]}.</h1>
        <p className="pb-dek">
          AI engineer finishing my M.S. at USC. I build LLM agents, RAG pipelines and the systems that keep them
          running in production.
        </p>
        <p className="pb-more">
          <a href="#/">Talk to my digital twin</a>
        </p>

        <section id="education">
          <h2>Education</h2>
          {education.map((e) => (
            <div className="pb-item" key={e.school}>
              <div className="pb-hd">
                <span className="t">{e.school}</span>
                <span className="y">{e.period.replace(/[A-Za-z]{3} /g, '').replace(' – ', '–')}</span>
              </div>
              <p>
                {e.degree} · {e.detail}
              </p>
            </div>
          ))}
        </section>

        <section id="work">
          <h2>Work</h2>
          {experience.map((x) => (
            <div className="pb-item" key={x.company}>
              <div className="pb-hd">
                <span className="t">{x.company}</span>
                <span className="y">{x.years}</span>
              </div>
              <p className="role">{x.role}</p>
              <p>{x.bullets[0]}</p>
            </div>
          ))}
        </section>

        <section id="projects">
          <p className="pb-lbl pb-grp">Selected projects</p>
          {projects
            .filter((p) => p.featured)
            .map((p) => (
              <div className="pb-item" key={p.id}>
                <div className="pb-hd">
                  <a className="t" href={p.linkedin} target="_blank" rel="noreferrer">
                    {p.title}
                  </a>
                  <span className="y">{p.date.slice(-4)}</span>
                </div>
                <p>
                  {p.blurb} <a href={p.linkedin} target="_blank" rel="noreferrer">linkedin</a>
                </p>
              </div>
            ))}
          <p className="pb-older">
            <a href="#/projects">All {projects.length} projects</a>
          </p>
        </section>
      </main>
    </div>
  );
}
