/* SurgeCraft offline support.
   - The app page is fetched from the network first, so a re-uploaded site reaches people the next time they open it online;
     when offline the cached copy is used.
   - Artwork, icons and the manifest are stored on first visit (precache) and served from the cache.
   - Google Fonts are cached as they load, so the typefaces also work offline after the first online visit. */
var VERSION = "__VERSION__";
var CACHE = "surgecraft-" + VERSION;
var FONTS = "surgecraft-fonts";
var PRECACHE = __PRECACHE__;

self.addEventListener("install", function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(PRECACHE); }).then(function () { return self.skipWaiting(); }));
});

self.addEventListener("activate", function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k !== CACHE && k !== FONTS && k.indexOf("surgecraft-") === 0; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

function networkFirstPage(req) {
  return fetch(req).then(function (res) {
    if (res && res.ok) { var copy = res.clone(); caches.open(CACHE).then(function (c) { c.put("./index.html", copy); }); }
    return res;
  }).catch(function () {
    return caches.match("./index.html", { ignoreSearch: true }).then(function (hit) { return hit || caches.match("./"); });
  });
}

self.addEventListener("fetch", function (e) {
  var req = e.request;
  if (req.method !== "GET") return;
  var url = new URL(req.url);
  if (req.mode === "navigate" && url.origin === self.location.origin) { e.respondWith(networkFirstPage(req)); return; }
  if (url.origin === self.location.origin) {
    e.respondWith(caches.match(req, { ignoreSearch: true }).then(function (hit) {
      return hit || fetch(req).then(function (res) {
        if (res && res.ok) { var copy = res.clone(); caches.open(CACHE).then(function (c) { c.put(req, copy); }); }
        return res;
      });
    }));
    return;
  }
  if (url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com") {
    e.respondWith(caches.open(FONTS).then(function (c) {
      return c.match(req).then(function (hit) {
        var net = fetch(req).then(function (res) { if (res && (res.ok || res.type === "opaque")) c.put(req, res.clone()); return res; }).catch(function () { return hit; });
        return hit || net;
      });
    }));
  }
});
