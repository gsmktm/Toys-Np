// Small offline-first cache. Scope is relative to the app, including GitHub Pages subpaths.
const CACHE='ktm-toys-baghchal-royal-v1';
const ASSETS=['./','./index.html','./styles.css','./royal.css','./src/engine.js','./src/ai.js',
  './src/main.js','./src/online-client.js','./src/bluetooth.js','./src/intl-extra.js','./manifest.webmanifest','./icons/favicon.svg','./icons/royal-crest.svg','./icons/tiger-piece.svg','./icons/goat-piece.svg','./icons/himalaya-royal.svg'];
self.addEventListener('install',event=>{
  event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS)).then(()=>self.skipWaiting()));
});
self.addEventListener('activate',event=>{
  event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim()));
});
self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET'||new URL(event.request.url).origin!==self.location.origin) return;
  event.respondWith(caches.match(event.request).then(cached=>cached||fetch(event.request)));
});
