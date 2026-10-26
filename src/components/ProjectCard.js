// Thumbnail is a generated pixel tile until real screenshots exist:
// drop an image at public/projects/<id>.png and set `thumb` on the project to use it.
export default function ProjectCard({ project }) {
  const [a, b] = project.palette;
  return (
    <article className="card">
      <div className="card-thumb" style={{ '--a': a, '--b': b }}>
        {project.thumb ? (
          <img src={project.thumb} alt="" />
        ) : (
          <span className="card-glyph" aria-hidden="true">
            {project.glyph}
          </span>
        )}
        <span className="card-date">{project.date}</span>
      </div>
      <div className="card-body">
        <h3>{project.title}</h3>
        <p className="card-sub">{project.subtitle}</p>
        <p className="card-blurb">{project.blurb}</p>
        <div className="tags">
          {project.tags.map((t) => (
            <span key={t} className="tag">
              {t}
            </span>
          ))}
        </div>
        <a className="card-link" href={project.linkedin} target="_blank" rel="noreferrer">
          <span className="in">in</span> read the post →
        </a>
      </div>
    </article>
  );
}
