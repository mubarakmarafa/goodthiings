// Simple service worker for PWA
const CACHE_NAME = 'goodthiings-v1';

self.addEventListener('install', (event) => {
  console.log('Service Worker installing');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('Service Worker activating');
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  // Let network handle all requests for now
  event.respondWith(fetch(event.request));
}); 