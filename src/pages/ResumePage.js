import { education, experience, person, projects, skills } from '../data/profile';

// public/resume.pdf is the one-page resume; resume-preview.jpg is its first page rendered at 1400px wide
// (regenerate it whenever the PDF changes). The text version below the preview comes from profile.js.
const PDF = `${process.env.PUBLIC_URL}/resume.pdf`;
const PREVIEW = `${process.env.PUBLIC_URL}/resume-preview.jpg`;

export default function ResumePage() {
  return (
    <div className="pb-grid">
      <main className="resume">
        <header className="cv-hero">
          <div className="cv-intro">
            <p className="pb-lbl">Resume</p>
            <h1 className="pb-h1">{person.name}</h1>
            <p className="cv-contact">
              {person.email} · <a href={person.linkedin}>LinkedIn</a> · <a href={person.github}>GitHub</a>
            </p>
            <div className="cv-actions">
              <a className="cv-btn" href={PDF} download="Wanrong_Xie_Resume.pdf">
                Download PDF ↓
              </a>
              <a className="cv-btn cv-btn-ghost" href={PDF} target="_blank" rel="noreferrer">
                Open in a new tab ↗
              </a>
            </div>
            <a className="cv-scroll" href="#cv-text" onClick={scrollToText}>
              Or scroll for the text version ↓
            </a>
          </div>
          <a className="cv-paper" href={PDF} target="_blank" rel="noreferrer" aria-label="Open the resume PDF">
            <img src={PREVIEW} alt="Preview of the one-page resume" width="1400" height="1812" />
          </a>
        </header>

        <div id="cv-text">
          <section className="pb-sec">
            <h2>Education</h2>
            <div>
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
            </div>
          </section>

          <section className="pb-sec">
            <h2>Experience</h2>
            <div>
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
            </div>
          </section>

          <section className="pb-sec">
            <h2>Projects</h2>
            <div>
              {projects.slice(0, 5).map((p) => (
                <div className="pb-item" key={p.id}>
                  <div className="pb-hd">
                    <span className="t">{p.title}</span>
                    <span className="y">{p.date}</span>
                  </div>
                  <p>{p.blurb}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="pb-sec">
            <h2>Skills</h2>
            <div>
              {Object.entries(skills).map(([k, v]) => (
                <div className="pb-item" key={k}>
                  <div className="pb-hd">
                    <span className="t">{k}</span>
                  </div>
                  <p>{v}</p>
                </div>
              ))}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

// The site routes on the hash, so a plain #cv-text link would navigate away; scroll instead.
function scrollToText(e) {
  e.preventDefault();
  document.getElementById('cv-text').scrollIntoView({ behavior: 'smooth' });
}
