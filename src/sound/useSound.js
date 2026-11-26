import { useEffect, useSyncExternalStore } from 'react';
import { isEnabled, setEnabled, subscribe, unlock } from './engine';
import { startAmbient, stopAmbient } from './ambient';
import { cue } from './cues';

export const useSoundEnabled = () => useSyncExternalStore(subscribe, isEnabled, () => false);

// The header's sound switch. Must run inside the click: that is when the browser lets the context start.
export function toggleSound() {
  if (isEnabled()) {
    cue('powerOff');
    setEnabled(false);
    stopAmbient();
    return;
  }
  unlock('ambient');
  setEnabled(true);
  cue('powerOn');
  startAmbient();
}

// A visitor who left sound on comes back to a silent page (no sound may start before a gesture); the first
// tap or key anywhere brings it back.
function useResumeOnGesture() {
  useEffect(() => {
    if (!isEnabled()) return undefined;
    const go = (e) => {
      if (e.target.closest?.('[data-sound-toggle]')) return; // the switch handles its own click
      if (isEnabled()) {
        unlock('ambient');
        startAmbient();
      }
    };
    window.addEventListener('pointerdown', go, { once: true, capture: true });
    window.addEventListener('keydown', go, { once: true, capture: true });
    return () => {
      window.removeEventListener('pointerdown', go, { capture: true });
      window.removeEventListener('keydown', go, { capture: true });
    };
  }, []);
}

const INTERACTIVE = 'a[href], button, [role="tab"], .proj';

// Hover and click sounds for the whole site, by event delegation, so no component needs to know about them.
// Elements marked data-sound-skip play their own sounds (or none). Hover sounds only follow a mouse; on a touch
// screen pointerover fires on every tap.
export function useUiSounds() {
  useResumeOnGesture();
  useEffect(() => {
    let hovered = null;
    const target = (e) => {
      const el = e.target.closest?.(INTERACTIVE);
      if (!el || el.disabled || el.closest('[data-sound-skip]')) return null;
      return el;
    };
    const over = (e) => {
      if (e.pointerType !== 'mouse') return;
      const el = target(e);
      if (el === hovered) return;
      hovered = el;
      if (el) cue('hover');
    };
    const click = (e) => {
      const el = target(e);
      // links within the site make the page-change sound instead
      if (el && !el.matches('a[href^="#"]')) cue('select');
    };
    document.addEventListener('pointerover', over);
    document.addEventListener('click', click);
    return () => {
      document.removeEventListener('pointerover', over);
      document.removeEventListener('click', click);
    };
  }, []);
}
