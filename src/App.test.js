import { render, screen } from '@testing-library/react';
import App from './App';

beforeAll(() => {
  // jsdom has no canvas or layout observers; the home scene only needs no-op stand-ins in tests
  const gradient = { addColorStop() {} };
  HTMLCanvasElement.prototype.getContext = () => ({
    fillRect() {},
    fillText() {},
    clearRect() {},
    drawImage() {},
    save() {},
    restore() {},
    translate() {},
    setTransform() {},
    beginPath() {},
    moveTo() {},
    lineTo() {},
    stroke() {},
    measureText: () => ({ width: 60 }),
    createLinearGradient: () => gradient,
    createRadialGradient: () => gradient,
    getImageData: () => ({ data: new Uint8ClampedArray(192 * 144 * 4) }),
    putImageData() {},
  });
  class NoopObserver {
    observe() {}
    disconnect() {}
  }
  window.ResizeObserver = NoopObserver;
  window.IntersectionObserver = NoopObserver;
});

test('renders the home page with suggested questions', () => {
  render(<App />);
  expect(screen.getByText(/favorite project/i)).toBeInTheDocument();
  expect(screen.getByLabelText(/ask astrid anything/i)).toBeInTheDocument();
});
