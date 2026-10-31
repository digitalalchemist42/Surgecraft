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
ok("manual swaps Hellfire for Haywire on the Goliath", /<td class="sc-wn">HAYWIRE MISSILES/.test(man) && man.indexOf('<td class="sc-wn">HELLFIRE MISSILES') === -1);
ok("manual leaves out untaken upgrades", ["COMBAT SHIELD","SLUGTHROWER","GRENADES - FRAG","SCATTER MISSILES","ARES-CLASS TARGETING SYSTEM"].every(n => man.indexOf('<span class="sc-abn">' + n + ':') === -1 && man.indexOf('<td class="sc-wn">' + n) === -1));
ok("manual has no upgrade face or untaken TAKEN marks", !/class="sc-card[^"]*sc-face-/.test(man) && man.indexOf('class="sc-upband"') === -1 && man.indexOf("· TAKEN") === -1);
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
// card-size printing: one as-fielded face per unit, toggle off = unchanged
{
  const csDoc = X.fieldManualDoc(C, r, p => p, { cardSize: true });
  ok("card size: one face per unit card (4 units + summoned PDD)", (csDoc.match(/<div class="cs-wrap"><article class="sc-card" data-race/g) || []).length === 5);
  ok("card size: no front/upgrade face split", !/class="sc-card[^"]*sc-face-/.test(csDoc) && csDoc.indexOf('class="cs-pair"') === -1);
  ok("card size: faces sit in fixed 162x107 mm boxes with the fit script", /\.cs-wrap\{width:162mm;height:107mm/.test(csDoc) && csDoc.indexOf("<script>") !== -1);
  ok("card size: fit can drop the art column", /\.cs-wrap>\.sc-card\.sc-noart>\.sc-art\{display:none\}/.test(csDoc) && csDoc.indexOf('setAttribute("data-art", "dropped")') !== -1);
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
  // fielded card, each upgrade taken on its own: every ability is the card's, every weapon is the card's (a non-SPECIALIST
  // replacement swapped in place), the taken upgrade is there and no untaken upgrade appears
  const fmiss = [], abn = n => '<span class="sc-abn">' + R.esc(n.toUpperCase()) + ":</span>", wn = n => '<td class="sc-wn">' + R.esc(n.toUpperCase());
  all.forEach(u => u.upgrades.forEach(x => {
    const e = C.newEntry(u.id); e.upgrades = [x.name]; if (x.specialist) e.specialists[x.name] = 1;
    const h = R.unitCardHTML(C, u, e, p => p, { fielded: true }), has = n => h.indexOf(abn(n)) !== -1 || h.indexOf(wn(n)) !== -1;
    u.abilities.forEach(a => { if (!has(a.name)) fmiss.push(u.name + " + " + x.name + ": lost " + a.name); });
    u.weapons.forEach(w => { const gone = x.kind === "weapon" && !x.specialist && x.replaces === w.name; if (has(w.name) === gone) fmiss.push(u.name + " + " + x.name + ": " + w.name + (gone ? " not replaced" : " lost")); });
    if (!has(x.name)) fmiss.push(u.name + ": taken " + x.name + " missing");
    u.upgrades.forEach(y => { if (y.name !== x.name && has(y.name) && !u.abilities.concat(u.weapons).some(b => b.name === y.name)) fmiss.push(u.name + " + " + x.name + ": untaken " + y.name + " shown"); });
  }));
  ok("fielded cards: card abilities and weapons, taken upgrade only (" + all.reduce((n, u) => n + u.upgrades.length, 0) + " unit/upgrade cases)", fmiss.length === 0 || console.log(fmiss));
}
// ---- Tabletop Simulator export: the layout of a list posted by a user, rebuilt from card data ----
{
  const t = C.newRoster(); t.name = "Rr"; t.race = "Terran"; t.factionId = "nova-covert-ops";
  ["academy","armory","barracks","barracks-tech-lab","orbital-command"].forEach(id => t.tactical[id] = 1);
  for (let k = 0; k < 3; k++) { const e = C.newEntry("marine"); e.models = 6; e.upgrades = ["AGG-12","Rocket Launcher","Slugthrower"]; t.units.push(e); }
  t.units.push(C.newEntry("spec-ops-marauder"));
  t.missions = ["fire-in-the-sky","gather-the-resources"]; t.deployments = ["breach","meeting-engagement"];
  // printed card names ("Marine", "Meeting Engagement") and a SurgeCraft footer, by the user's choice; everything else as posted
  const want = "Terran - Rr (920 Minerals, 165 Gas) \n 4 Supply, 7 CP\nDeployment Maps: Breach, Meeting Engagement \n Mission Card: Fire in the Sky, Gather the Resources\n" +
    "# Faction: \n Nova Covert Ops\n# Tactical: \n Academy \n Armory \n Barracks \n Barracks (Tech Lab) \n Orbital Command\n" +
    "# Units: \n 6x Marine (230, 1S): AGG-12, Rocket Launcher, Slugthrower \n 6x Marine (230, 1S): AGG-12, Rocket Launcher, Slugthrower \n 6x Marine (230, 1S): AGG-12, Rocket Launcher, Slugthrower \n 2x Spec Ops Marauder (Marauder) (230, 1S)\n" +
    "Sabotage Drone\nCreated with SurgeCraft\n";
  const got = X.tts(C, t);
  ok("Tabletop Simulator export matches the posted list (card names, SurgeCraft footer)", got === want || console.log(JSON.stringify(got)));
}
console.log(fails ? fails + " FAILED" : "ALL PASSED");
require("fs").writeFileSync("/home/claude/app/sample_manual.html", man.replace(/img\//g, "img/"));
