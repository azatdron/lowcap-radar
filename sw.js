const CACHE='lowcap-radar-v1-1';
const ASSETS=['./','index.html','manifest.json','sw.js','icon-192.png','icon-512.png'];
self.addEventListener('install',e=>{self.skipWaiting();e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)).catch(()=>{}))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))));self.clients.claim()});
self.addEventListener('fetch',e=>{const req=e.request;if(req.method!=='GET')return;e.respondWith(fetch(req).then(res=>{if(new URL(req.url).origin===location.origin){const copy=res.clone();caches.open(CACHE).then(c=>c.put(req,copy));}return res}).catch(()=>caches.match(req).then(r=>r||caches.match('index.html'))))});
