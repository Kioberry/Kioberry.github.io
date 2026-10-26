import Window from '../components/Window';

export default function LifePage() {
  return (
    <div className="life">
      <Window title="life/ — access denied" bodyClassName="life-body">
        <div className="life-lock">🔒</div>
        <h1>loading life.exe …</h1>
        <div className="life-bar">
          <i />
        </div>
        <p className="muted">photos, travel, and the off-screen stuff are coming soon ✦</p>
        <a className="btn" href="#/">
          ask my twin instead →
        </a>
      </Window>
    </div>
  );
}
