import { render, screen } from '@testing-library/react';
import { linkify } from './TwinPanel';

const show = (text) => render(<p>{linkify(text)}</p>);

test('a URL becomes a link without its scheme, trailing slash or the sentence dot', () => {
  const { container } = show('The code is on GitHub at https://github.com/masibasi/peeko.');
  const a = screen.getByRole('link');
  expect(a).toHaveAttribute('href', 'https://github.com/masibasi/peeko');
  expect(a).toHaveTextContent(/^github\.com\/masibasi\/peeko$/);
  expect(container).toHaveTextContent('The code is on GitHub at github.com/masibasi/peeko.');
});

test('several links, an email and a bare www', () => {
  show('Try https://peeko-pink.vercel.app/ or www.example.com, or write to wanrongx@usc.edu.');
  const hrefs = screen.getAllByRole('link').map((a) => a.getAttribute('href'));
  expect(hrefs).toEqual(['https://peeko-pink.vercel.app/', 'https://www.example.com', 'mailto:wanrongx@usc.edu']);
});

test('plain text stays text', () => {
  show('It won 1st place at USC Build4SC.');
  expect(screen.queryByRole('link')).toBeNull();
});
