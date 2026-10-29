// Entry point: loads fonts and styles, starts the dev mock layer when asked to, then renders the app.
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource/ibm-plex-sans/400.css';
import '@fontsource/ibm-plex-sans/500.css';
import '@fontsource/ibm-plex-sans/600.css';
import '@fontsource/ibm-plex-mono/400.css';
import '@fontsource/ibm-plex-mono/500.css';
import './styles/index.css';
import { App } from './app/App';

// After a deploy, a tab opened earlier asks for page chunks that no longer exist (their file names changed). Vite
// reports that as `vite:preloadError`; reloading once fetches the new build. A second failure in the same session is
// left to the page's error state, so a real outage cannot cause a reload loop.
window.addEventListener('vite:preloadError', (event) => {
  try {
    if (sessionStorage.getItem('gsm-chunk-reload') === '1') return;
    sessionStorage.setItem('gsm-chunk-reload', '1');
  } catch {
    return; // storage blocked: no way to remember the reload, so do not risk a loop
  }
  event.preventDefault();
  window.location.reload();
});

async function start() {
  // The only place app code loads the mock layer (decision 014). `import.meta.env.DEV` is false in a production
  // build, so the whole branch and the mock modules it imports are removed from the bundle.
  if (import.meta.env.DEV && import.meta.env.VITE_API_MOCKS === 'true') {
    try {
      const { startMockWorker } = await import('./mocks/browser');
      await startMockWorker();
    } catch (error) {
      // Without the worker the app still opens, and every request shows its error state.
      console.error('The mock API could not start.', error);
    }
  }
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}

void start();
