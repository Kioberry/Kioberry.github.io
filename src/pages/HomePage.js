import { LayoutDescent } from '../components/HomeLayouts';
import { THEMES } from '../components/sceneConfig';

// Full-bleed landing: the Descent scene fills the viewport and the nav floats over it. Candidates live in #/lab.
export default function HomePage({ theme }) {
  return (
    <main className="home home-dark">
      <LayoutDescent cfg={THEMES[theme]} />
    </main>
  );
}
