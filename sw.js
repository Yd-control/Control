const V='ctl-v8',SHELL=['./','index.html','local.js','guide.html','home.html','logo.jpg','emblem.png?v=2','app-icon-192.png','app-icon-512.png','manifest.webmanifest?v=2'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(V).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting()))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==V).map(x=>caches.delete(x)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',e=>{const r=e.request,u=new URL(r.url);if(r.method!=='GET')return;
 const ok=u.origin===location.origin||/gstatic\.com|cdnjs\.cloudflare\.com|fonts\.googleapis\.com|fonts\.gstatic\.com/.test(u.host);if(!ok)return;
 const net=u.origin===location.origin&&(r.mode==='navigate'||/index\.html$|local\.js$|sw\.js$/.test(u.pathname));
 if(net){e.respondWith(fetch(r).then(x=>{const c=x.clone();caches.open(V).then(h=>h.put(r,c));return x}).catch(()=>caches.match(r).then(x=>x||caches.match('index.html'))))}
 else e.respondWith(caches.match(r).then(x=>x||fetch(r).then(y=>{if(y&&(y.ok||y.type==='opaque')){const c=y.clone();caches.open(V).then(h=>h.put(r,c))}return y})))});
