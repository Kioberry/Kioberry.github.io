// Y2K desktop window chrome shared by every page.
export default function Window({ title, children, className = '', bodyClassName = '', actions }) {
  return (
    <section className={`win ${className}`}>
      <div className="win-bar">
        <span className="win-title">{title}</span>
        {actions}
        <span className="win-btns" aria-hidden="true">
          <i>_</i>
          <i>□</i>
          <i>×</i>
        </span>
      </div>
      <div className={`win-body ${bodyClassName}`}>{children}</div>
    </section>
  );
}
