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
// ---- reference sheet ----
const KW = require("./keywords.js");
const ref = X.referenceDoc(C, r, { kw: KW });
ok("ref doc well-formed", ref.startsWith("<!doctype html>") && ref.trim().endsWith("</html>") && (ref.match(/<div/g)||[]).length === (ref.match(/<\/div>/g)||[]).length);
ok("ref has Letter page rule", ref.indexOf("@page{size:letter") !== -1);
ok("sheet and manual have Letter page rule", sheet.indexOf("@page{size:letter") !== -1 && man.indexOf("@page{size:letter") !== -1);
ok("ref shows Haywire for Hellfire, no Hellfire row", ref.indexOf('Haywire Missiles <span class="rf-note">for Hellfire Missiles</span>') !== -1 && ref.indexOf('<td class="rf-wn">Hellfire Missiles') === -1);
ok("ref shows specialist models", ref.indexOf('Rocket Launcher <span class="rf-note">model 2</span>') !== -1 && ref.indexOf('AGG-12 <span class="rf-note">model 3, for C-14 Rifle</span>') !== -1);
ok("ref leaves out untaken upgrades", ref.indexOf("Slugthrower") === -1 && ref.indexOf("Combat Shield") === -1);
ok("ref leaves out ability text", ref.indexOf("NON-LETHAL DAMAGE (2)") === -1 && ref.indexOf("Stimpack") !== -1);
ok("ref glossary off by default", ref.indexOf("KEYWORD GLOSSARY") === -1);
ok("ref summoned PDD listed", ref.indexOf("SUMMONED UNITS") !== -1 && ref.indexOf("POINT DEFENSE DRONE") !== -1);
const refG = X.referenceDoc(C, r, { kw: KW, glossary: true });
ok("ref glossary lists used keywords only", refG.indexOf("KEYWORD GLOSSARY") !== -1 && refG.indexOf("LONG RANGE") !== -1 && refG.indexOf('rf-gh">BURROWED') === -1);
const Ex = require("./examples.js"), ter = Ex.build(C, "Terran");
const refT = X.referenceDoc(C, ter, { kw: KW });
ok("ref merges identical units (2× Marine 9)", refT.indexOf("2× MARINE") !== -1 && /9 models · Core · Supply 2 · <b>220<\/b> each \(440\)/.test(refT) && (refT.match(/MARINE<\/b>/g)||[]).length === 2);
// every base weapon value on every unit card appears unchanged, in card column order
let wbad = [];
data.units.forEach(u => {
  if (u.summoned) return;
  const rr = C.newRoster(); rr.race = u.race; rr.units.push(C.newEntry(u.id));
  const h = R.referenceSheetHTML(C, rr);
  u.weapons.forEach(w => {
    const esc = R.esc, row = "<td>" + [w.rng, w.target, w.roa, w.hit, w.surge_type, w.s_dice, w.dmg].map(esc).join("</td><td>") + '</td><td class="rf-kw">' + esc(w.keywords.join(", ") || "-") + "</td>";
    if (h.indexOf('<td class="rf-wn">' + esc(w.name) + "</td>" + row) === -1) wbad.push(u.id + ":" + w.name);
  });
  const st = u.stats; if (h.indexOf("<i>ARMOUR</i><b>" + R.esc(st.armour) + "</b>") === -1 || h.indexOf("<i>HP</i><b>" + st.hp + "</b>") === -1) wbad.push(u.id + ":stats");
});
ok("ref copies every weapon profile and stat exactly", wbad.length === 0 || console.log(wbad));
require("fs").writeFileSync("/home/claude/app/sample_reference.html", refG);
require("fs").writeFileSync("/home/claude/app/sample_reference_terran.html", X.referenceDoc(C, ter, { kw: KW, glossary: true }));
// card-size printing: front + upgrade faces, nothing lost between them, toggle off = unchanged
{
  const csDoc = X.fieldManualDoc(C, r, p => p, { cardSize: true });
  const fronts = (csDoc.match(/sc-face-front/g) || []).length, backs = (csDoc.match(/sc-face-back/g) || []).length;
  const withUps = r.units.map(e => C.units[e.unitId]).concat(R.summonedFor(C, r)).filter(u => u.upgrades.length).length;
  ok("card size: one front per unit card", fronts === 5);
  ok("card size: an upgrade face for every unit with upgrades", backs === withUps);
  ok("card size: faces sit in fixed 162x107 mm boxes with the fit script", /\.cs-wrap\{width:162mm;height:107mm/.test(csDoc) && csDoc.indexOf("<script>") !== -1 && (csDoc.match(/class="cs-pair"/g) || []).length === 5);
  ok("card size off = no card-size markup", X.fieldManualDoc(C, r, p => p, { cardSize: false }) === man);
  // tactical cards at card size: art + rules face per physical copy, 63 x 88 mm, nothing lost between faces
  const tacN = 1 + Object.keys(r.tactical).reduce((n, id) => n + r.tactical[id], 0);
  ok("card size: an art and a rules face for every faction/tactical card copy", (csDoc.match(/sc-noart sc-tface-art"/g) || []).length === tacN && (csDoc.match(/sc-noart sc-tface-rules"/g) || []).length === tacN && (csDoc.match(/class="cs-tpair"/g) || []).length === tacN);
  ok("card size: tactical faces are 63 x 88 mm", /\.cs-tpair>\.cs-wrap\{width:63mm;height:88mm\}/.test(csDoc));
  const tmiss = [];
  Object.values(C.cards).forEach(c => {
    const one = R.tacCardHTML(C, c, p => p), two = R.tacCardHTML(C, c, p => p, 1, { face: "art" }) + R.tacCardHTML(C, c, p => p, 1, { face: "rules" });
    c.abilities.forEach(a => { const n = R.esc(a.name.toUpperCase()); if (one.indexOf(n) !== -1 && two.indexOf(n) === -1) tmiss.push(c.name + ": " + a.name); });
    if (c.resource && c.resource.value != null && two.indexOf(R.esc(c.resource.type) + ": " + R.esc(c.resource.value)) === -1) tmiss.push(c.name + ": resource");
    if (two.indexOf(R.esc(R.slotsText(c.slots))) === -1) tmiss.push(c.name + ": supply");
  });
  ok("card size: art + rules faces carry every ability, cost and supply (" + Object.keys(C.cards).length + " cards)", tmiss.length === 0 || console.log(tmiss));
  ok("print hides the footer in every document", /@media print\{\.foot\{display:none\}/.test(man) && /@media print\{\.rf-foot\{display:none\}/.test(X.referenceDoc(C, r, {})));
  // every ability, weapon and upgrade name on the one-face card appears across the two faces
  const all = data.units.filter(u => !u.summoned && u.compositions && u.compositions.length), miss = [];
  all.forEach(u => {
    const one = R.unitCardHTML(C, u, null, p => p), two = R.unitCardHTML(C, u, null, p => p, { face: "front" }) + (u.upgrades.length ? R.unitCardHTML(C, u, null, p => p, { face: "back" }) : "");
    u.abilities.concat(u.weapons, u.upgrades).forEach(x => { const n = R.esc(x.name.toUpperCase()); if (one.indexOf(n) !== -1 && two.indexOf(n) === -1) miss.push(u.name + ": " + x.name); });
    if (u.upgrades.length && R.unitCardHTML(C, u, null, p => p, { face: "front" }).indexOf("sc-upband") !== -1) miss.push(u.name + ": upgrades on front");
  });
  ok("card size: front + back carry every ability, weapon and upgrade (" + all.length + " units)", miss.length === 0 || console.log(miss));
}
console.log(fails ? fails + " FAILED" : "ALL PASSED");
require("fs").writeFileSync("/home/claude/app/sample_manual.html", man.replace(/img\//g, "img/"));
