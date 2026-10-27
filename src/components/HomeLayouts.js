import AsciiPortrait from './AsciiPortrait';
import TwinPanel, { TwinAnswer } from './TwinPanel';
import useTwinChat from '../agent/useTwinChat';

// Candidate home layouts. LabPage shows them side by side; HomePage renders the chosen one.
const TWIN = `${process.env.PUBLIC_URL}/twin`;
const media = { video: `${TWIN}/idle.mp4`, poster: `${TWIN}/portrait.png` };

function Portrait({ chat, ...crop }) {
  return (
    <div className="tw-portrait">
      <AsciiPortrait {...media} {...crop} talking={chat.talking} label="ASCII portrait of Astrid's digital twin" />
    </div>
  );
}

// 1. Petersen: small first name over a huge last name, portrait, answer, panel.
export function LayoutPetersen() {
  const chat = useTwinChat();
  return (
    <div className="hl hl-petersen">
      <h1 className="tw-name">
        <span className="tw-name-sm">Astrid</span>
        <span className="tw-name-lg">Xie</span>
      </h1>
      <Portrait chat={chat} cols={120} aspect={1.6} zoom={1.25} focusY={0.45} />
      <TwinAnswer chat={chat} />
      <TwinPanel chat={chat} />
    </div>
  );
}

// 2. One line: the full name as a single wide banner.
export function LayoutBanner() {
  const chat = useTwinChat();
  return (
    <div className="hl hl-banner">
      <h1 className="tw-name">
        <span className="tw-name-line">Astrid Xie</span>
      </h1>
      <Portrait chat={chat} cols={120} aspect={1.6} zoom={1.25} focusY={0.45} />
      <TwinAnswer chat={chat} />
      <TwinPanel chat={chat} />
    </div>
  );
}

// 3. Behind: a giant name set behind the portrait, so her head breaks the letters.
export function LayoutBehind() {
  const chat = useTwinChat();
  return (
    <div className="hl hl-behind">
      <div className="hl-stage">
        <h1 className="tw-name">
          <span className="tw-name-line">Astrid</span>
        </h1>
        <Portrait chat={chat} cols={120} aspect={1.6} zoom={1.2} focusY={0.45} />
      </div>
      <TwinAnswer chat={chat} />
      <TwinPanel chat={chat} />
    </div>
  );
}

// 4. Minimal: just the name and the conversation; the portrait drifts faintly behind.
export function LayoutMinimal() {
  const chat = useTwinChat();
  return (
    <div className="hl hl-minimal">
      <div className="hl-ghost" aria-hidden="true">
        <Portrait chat={chat} cols={110} aspect={1.6} zoom={1.2} focusY={0.45} />
      </div>
      <h1 className="tw-name">
        <span className="tw-name-sm">Astrid</span>
        <span className="tw-name-lg">Xie</span>
      </h1>
      <p className="hl-tag">AI engineer · M.S. CS @ USC · building agents that ship</p>
      <TwinAnswer chat={chat} />
      <TwinPanel chat={chat} />
    </div>
  );
}

export const layouts = [
  { id: 'petersen', name: '1 · Petersen', note: 'Small first name over a huge last name, portrait, then the panel.', Component: LayoutPetersen },
  { id: 'banner', name: '2 · Banner', note: 'The full name on one line; calmer, reads as a title.', Component: LayoutBanner },
  { id: 'behind', name: '3 · Behind', note: 'Giant name set behind the portrait; the head breaks the letters.', Component: LayoutBehind },
  { id: 'minimal', name: '4 · Name + dialog', note: 'Just the name and the conversation; the portrait is a faint ghost behind.', Component: LayoutMinimal },
];
