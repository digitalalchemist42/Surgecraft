/* SurgeCraft offline support.
   - The app page is fetched from the network first, so a re-uploaded site reaches people the next time they open it online;
     when offline the cached copy is used.
   - Artwork, icons and the manifest are stored on first visit (precache) and served from the cache.
   - Google Fonts are cached as they load, so the typefaces also work offline after the first online visit. */
var VERSION = "7cc4a4b2b00b";
var CACHE = "surgecraft-" + VERSION;
var FONTS = "surgecraft-fonts";
var PRECACHE = ["./", "index.html", "manifest.webmanifest", "icon-192.png", "icon-512.png", "apple-touch-icon.png", "favicon-48.png", "img/cards/academy.webp", "img/cards/accelerating-creep.webp", "img/cards/armory.webp", "img/cards/barracks-proxy.webp", "img/cards/barracks-tech-lab.webp", "img/cards/barracks.webp", "img/cards/cocoon.webp", "img/cards/daelaam.webp", "img/cards/defiler-mound.webp", "img/cards/dropship.webp", "img/cards/engineering-bay.webp", "img/cards/evolution-chamber.webp", "img/cards/factory-tech-lab.webp", "img/cards/factory.webp", "img/cards/forge.webp", "img/cards/gate-chronoboosted.webp", "img/cards/gateway.webp", "img/cards/hatchery.webp", "img/cards/hydralisk-den.webp", "img/cards/kerrigans-swarm.webp", "img/cards/khalai.webp", "img/cards/lair.webp", "img/cards/malignant-creep.webp", "img/cards/nerazim.webp", "img/cards/nexus.webp", "img/cards/nova-covert-ops.webp", "img/cards/observer.webp", "img/cards/orbital-command.webp", "img/cards/overcharged-nexus.webp", "img/cards/overlord.webp", "img/cards/overseer.webp", "img/cards/power-field.webp", "img/cards/raynors-raiders.webp", "img/cards/reactive-creep.webp", "img/cards/roach-warren.webp", "img/cards/robotics-facility.webp", "img/cards/spawning-pool-six-pool.webp", "img/cards/spawning-pool.webp", "img/cards/supply-depot.webp", "img/cards/templar-archives.webp", "img/cards/templar-caste.webp", "img/cards/terran-armed-forces.webp", "img/cards/twilight-council.webp", "img/cards/vanadium-plating.webp", "img/cards/void-seeker.webp", "img/cards/warp-gate.webp", "img/cards/warp-prism.webp", "img/cards/zagaras-swarm.webp", "img/cards/zerg-swarm.webp", "img/deploy/acropolis-skirmish.webp", "img/deploy/acropolis-standard.webp", "img/deploy/breach-skirmish.webp", "img/deploy/breach-standard.webp", "img/deploy/gauntlet-skirmish.webp", "img/deploy/gauntlet-standard.webp", "img/deploy/meeting-engagement-skirmish.webp", "img/deploy/meeting-engagement-standard.webp", "img/deploy/proving-grounds-skirmish.webp", "img/deploy/proving-grounds-standard.webp", "img/deploy/typhoon-skirmish.webp", "img/deploy/typhoon-standard.webp", "img/minis/adept.webp", "img/minis/artanis.webp", "img/minis/bile-launcher.webp", "img/minis/corpser.webp", "img/minis/defiler.webp", "img/minis/goliath.webp", "img/minis/high-templar.webp", "img/minis/hydralisk.webp", "img/minis/immortal.webp", "img/minis/jim-raynor.webp", "img/minis/kerrigan-swarm-raptor.webp", "img/minis/kerrigan.webp", "img/minis/marauder.webp", "img/minis/marine.webp", "img/minis/medic.webp", "img/minis/nerazim-watchers.webp", "img/minis/nova-assault-mode.webp", "img/minis/nova-stealth-mode.webp", "img/minis/praetor-guard.webp", "img/minis/queen.webp", "img/minis/raptor.webp", "img/minis/ravager.webp", "img/minis/raven.webp", "img/minis/raynors-raider.webp", "img/minis/roach.webp", "img/minis/sentry.webp", "img/minis/siege-tank.webp", "img/minis/spec-ops-marauder.webp", "img/minis/stalker.webp", "img/minis/swarmling.webp", "img/minis/tassadar.webp", "img/minis/twilight-templar.webp", "img/minis/vile.webp", "img/minis/vileling.webp", "img/minis/zagara.webp", "img/minis/zealot.webp", "img/minis/zeratul.webp", "img/minis/zergling.webp", "img/race/protoss.webp", "img/race/terran.webp", "img/race/zerg.webp", "img/units/adept.webp", "img/units/artanis.webp", "img/units/auto-turret.webp", "img/units/bile-launcher.webp", "img/units/corpser.webp", "img/units/defiler.webp", "img/units/goliath.webp", "img/units/high-templar.webp", "img/units/holo-decoy.webp", "img/units/hydralisk.webp", "img/units/immortal.webp", "img/units/jim-raynor.webp", "img/units/kerrigan-swarm-raptor.webp", "img/units/kerrigan.webp", "img/units/marauder.webp", "img/units/marine.webp", "img/units/medic.webp", "img/units/nerazim-watchers.webp", "img/units/nova-assault-mode.webp", "img/units/nova-stealth-mode.webp", "img/units/omega-worm.webp", "img/units/point-defense-drone.webp", "img/units/praetor-guard.webp", "img/units/pylon.webp", "img/units/queen.webp", "img/units/raptor.webp", "img/units/ravager.webp", "img/units/raven.webp", "img/units/raynors-raider.webp", "img/units/roach.webp", "img/units/roachling.webp", "img/units/sabotage-drone.webp", "img/units/sentry.webp", "img/units/siege-tank.webp", "img/units/spec-ops-marauder.webp", "img/units/stalker.webp", "img/units/swarmling.webp", "img/units/tassadar.webp", "img/units/twilight-templar.webp", "img/units/vile.webp", "img/units/vileling.webp", "img/units/zagara.webp", "img/units/zealot.webp", "img/units/zeratul.webp", "img/units/zergling.webp"];

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
