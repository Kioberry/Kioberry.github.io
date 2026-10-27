import { render, screen } from '@testing-library/react';
import App from './App';

beforeAll(() => {
  // jsdom has no canvas; the pixel scene only needs a no-op context in tests
  HTMLCanvasElement.prototype.getContext = () => ({
    fillRect() {},
    clearRect() {},
    drawImage() {},
    save() {},
    restore() {},
    translate() {},
    getImageData: () => ({ data: new Uint8ClampedArray(192 * 144 * 4) }),
    putImageData() {},
  });
});

test('renders the home page with suggested questions', () => {
  render(<App />);
  expect(screen.getByText(/favorite project/i)).toBeInTheDocument();
  expect(screen.getByLabelText(/ask astrid's digital twin/i)).toBeInTheDocument();
});
