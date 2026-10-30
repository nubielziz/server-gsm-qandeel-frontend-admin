// Vitest setup: DOM matchers, the browser APIs jsdom lacks, and a clean page between tests.
import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';
import '../components/ui/testing/dialogPolyfill';
import { clearToasts } from '../components/ui/toast';

// jsdom has no layout, so scrolling is a no-op (its own version only logs "not implemented").
window.scrollTo = () => {};

// jsdom has no canvas either (getContext only logs "not implemented"). Null is what a browser without 2D canvas
// returns, so the sign-in artwork stays out of the way, as it would there.
HTMLCanvasElement.prototype.getContext = (() => null) as typeof HTMLCanvasElement.prototype.getContext;

// jsdom has no media queries. This stand-in never matches, which means a light system theme; a test that needs
// a dark system theme replaces `window.matchMedia` itself.
if (typeof window.matchMedia !== 'function') {
  window.matchMedia = (query: string): MediaQueryList => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  });
}

// Storage, the toast queue and the theme on <html> live across tests in one file, so each test starts clean.
afterEach(() => {
  cleanup();
  clearToasts();
  localStorage.clear();
  sessionStorage.clear();
  document.documentElement.removeAttribute('data-theme');
  document.documentElement.classList.remove('dense');
});
