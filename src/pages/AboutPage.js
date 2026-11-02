import ProjectCard from '../components/ProjectCard';
import { currently, education, experience, person, projects } from '../data/profile';

export default function AboutPage() {
  return (
    <div className="pb-grid">
      <main>
        <h1 className="pb-h1">Hi, I'm {person.name.split(' ')[0]}.</h1>
        <p className="pb-dek">{person.intro.replace(/^I'm Astrid, /, "I'm ")}</p>
        <ul className="pb-now">
          {currently.map((c) => (
            <li key={c}>{c}</li>
          ))}
        </ul>
        <p className="pb-more">
          <a href="#/">Ask me anything</a>
        </p>

        <section id="education" className="pb-sec">
          <h2>Education</h2>
          <div>
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
          </div>
        </section>

        <section id="work" className="pb-sec">
          <h2>Work</h2>
          <div>
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
          </div>
        </section>

        <section id="projects" className="pb-sec pb-sec-wide">
          <h2>Selected projects</h2>
          <div>
            <div className="proj-grid pb-cards">
              {projects
                .filter((p) => p.featured)
                .map((p) => (
                  <ProjectCard project={p} key={p.id} />
                ))}
            </div>
            <p className="pb-older">
              <a href="#/projects">All {projects.length} projects</a>
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}
