// 奨也の道 service worker — アプリの殻をキャッシュしてオフラインでも開けるようにする
// 更新時は VERSION を上げる
const VERSION = "shoya-road-v8";
const scopePath = new URL(self.registration.scope).pathname; // "/" or "/shoya-no-michi/"
const PRECACHE = [scopePath, `${scopePath}icon-192.png`, `${scopePath}manifest.webmanifest`];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(VERSION).then((c) => c.addAll(PRECACHE).catch(() => undefined)).then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  // ページ遷移はネット優先（新しい版を取りに行く）、だめならキャッシュ
  if (req.mode === "navigate") {
    e.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(VERSION).then((c) => c.put(req, copy));
          return res;
        })
        .catch(() => caches.match(req).then((r) => r || caches.match(scopePath))),
    );
    return;
  }
  // 静的ファイル（_next/static 等）はキャッシュ優先
  e.respondWith(
    caches.match(req).then(
      (hit) =>
        hit ||
        fetch(req).then((res) => {
          if (res.ok && (url.pathname.includes("/_next/") || /\.(png|svg|ico|webmanifest|css|js)$/.test(url.pathname))) {
            const copy = res.clone();
            caches.open(VERSION).then((c) => c.put(req, copy));
          }
          return res;
        }),
    ),
  );
});
