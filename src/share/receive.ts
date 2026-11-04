import { CACHE, takeShared } from './stash';

/** The parts of `window` used, so tests can pass jsdom's. */
interface Page {
  location: Location;
  history: History;
}

/**
 * On the visit the service worker redirects to after a share (`?shared`), takes the
 * stashed screenshots and clears the query, so a reload does not repeat it.
 */
export async function receiveShared(page: Page): Promise<File[]> {
  const { location, history } = page;
  if (!new URLSearchParams(location.search).has('shared')) return [];
  history.replaceState(null, '', location.pathname);
  if (!('caches' in globalThis)) return [];
  return takeShared(await caches.open(CACHE));
}
