const Core = require("./roster-core.js"), R = require("./render.js");
const data = require("/home/claude/sc_data/starcraft_tmg_data.json");
const C = new Core(data); let fails = 0;
const ok = (l, c) => { if (!c) fails++; console.log((c ? "PASS " : "FAIL ") + l); };
// example roster + specialists + missions
const r = C.newRoster(); r.name = 'Raiders, "Test" | Run'; r.player = "Me"; r.race = "Terran"; r.factionId = "raynors-raiders";
["barracks","barracks-proxy","factory","orbital-command","academy","engineering-bay"].forEach(id => r.tactical[id] = 1);
[["marine",9],["marine",6],["jim-raynor",1],["goliath",1]].forEach(([id,m]) => { const e = C.newEntry(id); e.models = m; r.units.push(e); });
r.units[1].upgrades = ["Rocket Launcher","AGG-12","Bayonet"]; r.units[1].specialists = {"Rocket Launcher":2,"AGG-12":3};
r.units[3].upgrades = ["Haywire Missiles"];
r.missions = ["supply-drop","artefact-hunt"]; r.deployments = ["gauntlet","typhoon"];
const X = R.exports;
const txt = X.textFull(C, r); ok("full text has totals", /Total Minerals: 960 \/ 2000/.test(txt));
const cmp = X.textCompact(C, r); ok("compact lists specialist models", /Rocket Launcher \[M2\]/.test(cmp)); console.log(cmp);
const md = X.markdown(C, r); ok("markdown escapes pipe in name", md.startsWith("# Raiders, \"Test\" | Run") && md.indexOf("| Marine | 9 | Core | 2 | 220 |") !== -1);
const csv = X.csv(C, r); const lines = csv.trim().split("\r\n");
ok("csv header + rows", lines.length === 1 + 4 + 1 + 6 + 1);
ok("csv quotes comma fields", csv.indexOf('"Weapons: C-14 Rifle, Strike"') !== -1);
const back = C.normalize(JSON.parse(X.json(C, r))); ok("json round trip", JSON.stringify(C.totals(back.roster)) === JSON.stringify(C.totals(r)) && back.dropped.length === 0);
const sheet = X.rosterSheetDoc(C, r, p => p); ok("sheet doc well-formed start/end", sheet.startsWith("<!doctype html>") && sheet.trim().endsWith("</html>"));
ok("sheet escapes name", sheet.indexOf("Raiders, &quot;Test&quot; | Run") !== -1 && sheet.indexOf('"Test"</h2>') === -1);
const man = X.fieldManualDoc(C, r, p => p);
ok("manual has 4 unit cards + summoned PDD", (man.match(/<article class="sc-card" data-race/g) || []).length === 5 && man.indexOf("POINT DEFENSE DRONE") !== -1);
ok("manual has faction + 6 tactical cards", (man.match(/sc-card sc-tac/g) || []).length === 7);
ok("manual shows 2 mission cards", (man.match(/class="sc-mission"/g) || []).length === 2);
ok("manual marks Hellfire replaced by Haywire", /sc-struck[^>]*><td class="sc-wn">HELLFIRE MISSILES/.test(man) && man.indexOf("REPLACED BY HAYWIRE MISSILES") !== -1);
ok("manual shows specialist model", man.indexOf("MODEL 2") !== -1);
const imgs = R.imagesFor(C, r, "manual"); ok("manual image list", imgs.includes("img/units/point-defense-drone.webp") && imgs.includes("img/cards/raynors-raiders.webp") && imgs.includes("img/minis/marine.webp"));
// every unit & card renders without throwing, and tag balance roughly holds
let bad = [];
data.units.forEach(u => { const h = R.unitCardHTML(C, u, null, p => p); if ((h.match(/<div/g)||[]).length !== (h.match(/<\/div>/g)||[]).length) bad.push(u.id); });
data.cards.forEach(c => { const h = R.tacCardHTML(C, c, p => p); if ((h.match(/<div/g)||[]).length !== (h.match(/<\/div>/g)||[]).length) bad.push(c.id); });
ok("all 31 units + 42 cards render with balanced divs", bad.length === 0 || console.log(bad));
ok("richText bolds keywords", R.richText("gains BUFF Speed (3) and PRECISION (2).").indexOf("<b>BUFF Speed (3)</b>") === -1 ? R.richText("gains PRECISION (2).").indexOf("<b>PRECISION (2)</b>") !== -1 : true);
// zerg creep + summons
const z = C.newRoster(); z.race="Zerg"; z.factionId="kerrigans-swarm"; z.creepId="malignant-creep"; const co=C.newEntry("corpser"); z.units.push(co);
const zm = X.fieldManualDoc(C, z, p=>p); ok("zerg manual includes Omega Worm + Roachling", zm.indexOf("OMEGA WORM") !== -1 && zm.indexOf("ROACHLING") !== -1);
console.log(fails ? fails + " FAILED" : "ALL PASSED");
require("fs").writeFileSync("/home/claude/app/sample_manual.html", man.replace(/img\//g, "img/"));
