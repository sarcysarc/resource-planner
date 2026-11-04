/**
 * Service worker: answers the manifest's share target on the phone, so shared
 * screenshots never reach a server (ADR 0010). Nothing else is intercepted.
 */
import { CACHE, isShare, stashShared } from './share/stash';

interface ExtendableEvent extends Event {
  waitUntil(promise: Promise<unknown>): void;
}

interface FetchEvent extends ExtendableEvent {
  request: Request;
  respondWith(response: Promise<Response>): void;
}

interface WorkerScope {
  registration: { scope: string };
  clients: { claim(): Promise<void> };
  skipWaiting(): Promise<void>;
  addEventListener(type: 'install' | 'activate', listener: (event: ExtendableEvent) => void): void;
  addEventListener(type: 'fetch', listener: (event: FetchEvent) => void): void;
}

declare const self: WorkerScope;

async function receive(request: Request): Promise<Response> {
  const scope = self.registration.scope;
  const count = await stashShared(await request.formData(), await caches.open(CACHE), scope);
  return Response.redirect(`${scope}?shared=${count}`, 303);
}

self.addEventListener('install', (event) => event.waitUntil(self.skipWaiting()));
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));
self.addEventListener('fetch', (event) => {
  if (isShare(event.request, self.registration.scope)) event.respondWith(receive(event.request));
});
