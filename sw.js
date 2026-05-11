const CACHE='lowcap-radar-v3-2';
self.addEventListener('install',e=>self.skipWaiting());
self.addEventListener('activate',e=>clients.claim());
self.addEventListener('fetch',e=>{});
