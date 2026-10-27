import { useState } from 'react';
import { layouts } from '../components/HomeLayouts';

// Temporary: home layout and pixel-font candidates side by side. Not linked from the nav; open #/lab.
const fonts = [
  { id: 'silkscreen', label: 'Silkscreen' },
  { id: 'press', label: 'Press Start 2P' },
  { id: 'jersey', label: 'Jersey 10' },
  { id: 'pixelify', label: 'Pixelify Sans' },
];

export default function LabPage() {
  const [font, setFont] = useState('silkscreen');
  return (
    <main className="lab">
      <div className="lab-bar">
        <p className="pb-lbl">Lab · home layouts</p>
        <div className="chips" role="tablist" aria-label="Name font">
          {fonts.map((f) => (
            <button key={f.id} role="tab" aria-selected={font === f.id} className="chip" onClick={() => setFont(f.id)}>
              {f.label}
            </button>
          ))}
        </div>
      </div>
      <div className="lab-grid">
        {layouts.map(({ id, name, note, Component }) => (
          <figure key={id} className="lab-item">
            <div className={`lab-frame home-dark font-${font}`}>
              <Component />
            </div>
            <figcaption>
              <b>{name}</b>
              <span>{note}</span>
            </figcaption>
          </figure>
        ))}
      </div>
    </main>
  );
}
