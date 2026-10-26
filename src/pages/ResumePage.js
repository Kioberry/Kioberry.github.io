import Window from '../components/Window';
import { education, experience, person, projects, skills } from '../data/profile';

// Put the PDF at public/resume.pdf; the download button points there.
const PDF = `${process.env.PUBLIC_URL}/resume.pdf`;

export default function ResumePage() {
  return (
    <div className="resume">
      <Window
        title="resume.pdf — Astrid Viewer 2000"
        className="resume-win"
        bodyClassName="resume-body"
        actions={
          <a className="win-action" href={PDF} download>
            ⤓ download
          </a>
        }
      >
        <article className="paper">
          <header className="paper-head">
            <h1>{person.name}</h1>
            <p>
              {person.email} · <a href={person.linkedin}>linkedin.com/in/wanrong-astrid-xie</a> ·{' '}
              <a href={person.github}>github.com/Kioberry</a>
            </p>
          </header>

          <h2>Education</h2>
          {education.map((e) => (
            <div className="paper-row" key={e.school}>
              <div>
                <b>{e.school}</b> · {e.degree} · {e.detail}
              </div>
              <span>{e.period}</span>
            </div>
          ))}

          <h2>Experience</h2>
          {experience.map((x) => (
            <div key={x.company} className="paper-block">
              <div className="paper-row">
                <div>
                  <b>{x.company}</b> · {x.role}
                </div>
                <span>{x.period}</span>
              </div>
              <ul>
                {x.bullets.map((b) => (
                  <li key={b}>{b}</li>
                ))}
              </ul>
            </div>
          ))}

          <h2>Projects</h2>
          {projects.slice(0, 5).map((p) => (
            <div key={p.id} className="paper-block">
              <div className="paper-row">
                <div>
                  <b>{p.title}</b> · {p.tags.join(', ')}
                </div>
                <span>{p.date}</span>
              </div>
              <ul>
                <li>{p.blurb}</li>
              </ul>
            </div>
          ))}

          <h2>Skills</h2>
          {Object.entries(skills).map(([k, v]) => (
            <p key={k} className="paper-skill">
              <b>{k}:</b> {v}
            </p>
          ))}
        </article>
      </Window>
    </div>
  );
}
