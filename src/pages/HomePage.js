import TwinStage from '../components/TwinStage';
import ProjectCard from '../components/ProjectCard';
import Window from '../components/Window';
import { education, experience, person, projects } from '../data/profile';

export default function HomePage() {
  return (
    <div className="home">
      <section className="hero">
        <div className="hero-avatar">
          <TwinStage className="hero-canvas" expression="smile" />
        </div>
        <div className="hero-text">
          <p className="eyebrow">hello world ✦ 你好</p>
          <h1>
            I'm {person.name.split(' ')[0]}
            <span className="hero-zh">{person.nameZh}</span>
          </h1>
          <p className="hero-tag">{person.tagline}</p>
          <p className="hero-meta">
            M.S. CS @ USC · {person.location} · open to Applied AI / LLM / SWE roles
          </p>
          <div className="hero-cta">
            <a className="btn" href="#/">
              talk to my twin ✦
            </a>
            <a className="btn btn-ghost" href="#/resume">
              resume
            </a>
          </div>
        </div>
      </section>

      <div className="home-grid">
        <Window title="education.dat" className="edu">
          <ul className="edu-list">
            {education.map((e) => (
              <li key={e.school}>
                <div className="edu-badge">{e.school.includes('Southern') ? 'USC' : 'LDS'}</div>
                <div>
                  <h3>{e.school}</h3>
                  <p>{e.degree}</p>
                  <p className="muted">
                    {e.detail} · {e.period}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </Window>

        <Window title="experience.log" className="exp">
          <ol className="timeline">
            {experience.map((x) => (
              <li key={x.company}>
                <div className="tl-dot" />
                <div className="tl-head">
                  <h3>{x.role}</h3>
                  <span className="muted">{x.period}</span>
                </div>
                <p className="tl-company">@ {x.company}</p>
                <ul className="tl-bullets">
                  {x.bullets.map((b) => (
                    <li key={b}>{b}</li>
                  ))}
                </ul>
                <div className="tags">
                  {x.tags.map((t) => (
                    <span key={t} className="tag">
                      {t}
                    </span>
                  ))}
                </div>
              </li>
            ))}
          </ol>
        </Window>
      </div>

      <div className="section-head">
        <h2>featured projects</h2>
        <a href="#/projects">see all {projects.length} →</a>
      </div>
      <div className="cards">
        {projects
          .filter((p) => p.featured)
          .map((p) => (
            <ProjectCard key={p.id} project={p} />
          ))}
      </div>
    </div>
  );
}
