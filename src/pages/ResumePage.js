import { education, experience, person, projects, skills } from '../data/profile';

// Put the PDF at public/resume.pdf; the download link points there.
const PDF = `${process.env.PUBLIC_URL}/resume.pdf`;

export default function ResumePage() {
  return (
    <div className="pb-grid">
      <main className="resume">
        <p className="pb-lbl">Resume</p>
        <h1 className="pb-h1">{person.name}</h1>
        <p className="pb-more">
          {person.email} · <a href={person.linkedin}>LinkedIn</a> · <a href={person.github}>GitHub</a> ·{' '}
          <a href={PDF} download>
            Download PDF
          </a>
        </p>

        <section>
          <h2>Education</h2>
          {education.map((e) => (
            <div className="pb-item" key={e.school}>
              <div className="pb-hd">
                <span className="t">{e.school}</span>
                <span className="y">{e.period}</span>
              </div>
              <p>
                {e.degree} · {e.detail}
              </p>
            </div>
          ))}
        </section>

        <section>
          <h2>Experience</h2>
          {experience.map((x) => (
            <div className="pb-item" key={x.company}>
              <div className="pb-hd">
                <span className="t">{x.company}</span>
                <span className="y">{x.period}</span>
              </div>
              <p className="role">{x.role}</p>
              <ul>
                {x.bullets.map((b) => (
                  <li key={b}>{b}</li>
                ))}
              </ul>
            </div>
          ))}
        </section>

        <section>
          <h2>Projects</h2>
          {projects.slice(0, 5).map((p) => (
            <div className="pb-item" key={p.id}>
              <div className="pb-hd">
                <span className="t">{p.title}</span>
                <span className="y">{p.date}</span>
              </div>
              <p>{p.blurb}</p>
            </div>
          ))}
        </section>

        <section>
          <h2>Skills</h2>
          {Object.entries(skills).map(([k, v]) => (
            <div className="pb-item" key={k}>
              <div className="pb-hd">
                <span className="t">{k}</span>
              </div>
              <p>{v}</p>
            </div>
          ))}
        </section>
      </main>
    </div>
  );
}
