const Core = require("./roster-core.js");
const data = require("/home/claude/sc_data/starcraft_tmg_data.json");
const C = new Core(data);
let fails = 0;
const eq = (label, got, exp) => { const ok = JSON.stringify(got) === JSON.stringify(exp); if (!ok) fails++; console.log((ok ? "PASS " : "FAIL ") + label + (ok ? "" : `  got=${JSON.stringify(got)} exp=${JSON.stringify(exp)}`)); };

// Rulebook 9.1 Army Building Example: Raynor's Raiders, Standard
const r = C.newRoster(); r.race = "Terran"; r.factionId = "raynors-raiders"; r.player = "Example";
["barracks","barracks-proxy","factory","orbital-command","academy","engineering-bay"].forEach(id => r.tactical[id] = 1);
[["marine",9],["marine",9],["marine",6],["marauder",4],["marauder",2],["jim-raynor",1],["medic",3],["medic",3],["goliath",1]]
  .forEach(([id,m]) => { const e = C.newEntry(id); e.models = m; r.units.push(e); });
const t = C.totals(r), s = C.slots(r);
// Rulebook 9.1 example totalled 1670 / 185 at the September 2026 costs; at 10.6 costs (09.10.2026) the same list is 1760 / 195.
eq("example minerals = 1760 (rulebook list at 10.6 costs)", t.minerals, 1760);
eq("example gas = 195 (rulebook list at 10.6 costs)", t.gas, 195);
eq("Core used/avail 8/8", [s.used.Core, s.available.Core], [8, 8]);
eq("Elite used/avail 2/2", [s.used.Elite, s.available.Elite], [2, 2]);
eq("Support used/avail 2/3", [s.used.Support, s.available.Support], [2, 3]);
eq("Hero used/avail 1/1", [s.used.Hero, s.available.Hero], [1, 1]);
eq("Air used/avail 0/1", [s.used.Air, s.available.Air], [0, 1]);
const errs = C.validate(r).filter(v => v.level === "error");
eq("example has no errors (missions not chosen = warnings only)", errs.map(e=>e.msg), []);

// Upgrade cost by composition + Burrow Ambush regression
const z = C.newEntry("zergling"); z.models = 18; z.upgrades = ["Burrow Ambush"];
eq("Zergling 18 + Burrow Ambush = 210+30 (10.6)", C.entryCost(z).total, 240);
z.models = 12; eq("Zergling 12 + Burrow Ambush = 150+20 (10.6)", C.entryCost(z).total, 170);
const ro = C.newEntry("roach"); ro.upgrades = ["Burrow Ambush"]; eq("Roach + Burrow Ambush = 170+20", C.entryCost(ro).total, 190);

// Specialist rules
const zr = C.newRoster(); zr.race="Terran"; zr.factionId="terran-armed-forces";
const m = C.newEntry("marine"); m.models = 6; m.upgrades = ["Rocket Launcher","AGG-12"]; zr.units.push(m);
eq("missing nominations flagged", C.validate(zr).filter(v=>/nominate/.test(v.msg)).length, 2);
m.specialists = {"Rocket Launcher":2,"AGG-12":2};
eq("same model twice flagged", C.validate(zr).some(v=>/carries both/.test(v.msg)), true);
m.specialists = {"Rocket Launcher":2,"AGG-12":7};
eq("model beyond unit size flagged", C.validate(zr).some(v=>/nominated to model 7/.test(v.msg)), true);
m.specialists = {"Rocket Launcher":2,"AGG-12":3};
eq("valid nominations ok", C.validate(zr).filter(v=>v.level==="error").length, 0);
eq("marine 6 + RL + AGG = 170+40+10 (10.6)", C.entryCost(m).total, 220);
console.log("   loadout:", C.loadoutText(m));

// Tag eligibility (rules example: Zerg Swarm cannot take Kerrigan Swarm Raptor)
const zs = C.newRoster(); zs.race="Zerg"; zs.factionId="zerg-swarm";
eq("KS Raptor not eligible for Zerg Swarm", C.eligibleUnits(zs).some(u=>u.id==="kerrigan-swarm-raptor"), false);
eq("Zerg Swarm creep options: Accelerating only (Malignant is Kerrigan's Swarm, Reactive is Zagara's Swarm)", C.eligibleCreep(zs).map(c=>c.id).sort(), ["accelerating-creep"]);
eq("Zerg Swarm requires creep", C.validate(zs).some(v=>/requires exactly one Creep/.test(v.msg)), true);
const ks = C.newRoster(); ks.race="Zerg"; ks.factionId="kerrigans-swarm";
eq("Kerrigan's Swarm creep options", C.eligibleCreep(ks).map(c=>c.id).sort(), ["accelerating-creep","malignant-creep"]);
eq("summoned units never eligible", C.eligibleUnits(ks).some(u=>u.summoned), false);

// Rulebook 9.1.6 example: Kerrigan's Swarm 2 Elite -> small Hydralisk fits, full-strength needs 3
const h = C.newEntry("hydralisk"); h.models = 2; ks.units.push(h); ks.creepId = "accelerating-creep";
eq("small Hydralisk fits 2 Elite", C.validate(ks).some(v=>/Elite slots/.test(v.msg)), false);
h.models = 4;
eq("full Hydralisk overflows Elite", C.validate(ks).some(v=>/Elite slots: 3 used, 2 available/.test(v.msg)), true);

// Unique cards / units, gas limit, scales
const u2 = C.newRoster(); u2.race="Terran"; u2.factionId="raynors-raiders"; u2.tactical={"academy":2};
eq("unique tactical twice flagged", C.validate(u2).some(v=>/Unique: only one copy/.test(v.msg)), true);
u2.units=[C.newEntry("jim-raynor"), C.newEntry("jim-raynor")];
eq("unique unit twice flagged", C.validate(u2).some(v=>/Jim Raynor is Unique/.test(v.msg)), true);
eq("skirmish limits", C.limits({scale:"skirmish"}), {minerals:1000, gas:100, scale: Core.SCALES.skirmish});
eq("grand offensive limits 3000", [C.limits({scale:"grand",grandMinerals:3000}).minerals, C.limits({scale:"grand",grandMinerals:3000}).gas], [3000,300]);
eq("grand offensive floor 2001", C.limits({scale:"grand",grandMinerals:500}).minerals, 2001);
eq("skirmish 500 limits", [C.limits({scale:"skirmish",minerals:500}).minerals, C.limits({scale:"skirmish",minerals:500}).gas, C.limits({scale:"skirmish",minerals:500}).scale.side], [500,50,"skirmish"]);
eq("standard 1500 limits", [C.limits({scale:"standard",minerals:1500}).minerals, C.limits({scale:"standard",minerals:1500}).gas, C.limits({scale:"standard",minerals:1500}).scale.side], [1500,150,"standard"]);
eq("size not offered at scale falls back to scale max", [C.limits({scale:"standard",minerals:500}).minerals, C.limits({scale:"skirmish",minerals:1500}).minerals], [2000,1000]);
eq("new roster defaults to 2000", C.limits(C.newRoster()).minerals, 2000);
(function(){ var r = C.newRoster(); r.scale="skirmish"; r.minerals=500;
  var back = C.normalize(JSON.parse(JSON.stringify(C.exportable(r)))).roster;
  eq("500 list survives export/import", [back.scale, C.limits(back).minerals], ["skirmish",500]);
  var old = C.normalize({format:"sc-tmg-roster",version:1,scale:"skirmish",units:[]}).roster;
  eq("older export without a size imports at scale max", C.limits(old).minerals, 1000);
  r.units = []; eq("over-500 error message uses 500", C.limits(r).minerals, 500); })();

// Double replacement warning (Goliath Haywire + Scatter)
const g = C.newRoster(); g.race="Terran"; g.factionId="terran-armed-forces"; const ge=C.newEntry("goliath"); ge.upgrades=["Haywire Missiles","Scatter Missiles"]; g.units.push(ge);
eq("double replacement warns", C.validate(g).some(v=>v.level==="warn"&&/both replace Hellfire/.test(v.msg)), true);

// Round trip export/import
const back = C.normalize(JSON.parse(JSON.stringify(C.exportable(r))));
eq("import round-trip totals", C.totals(back.roster), C.totals(r));
eq("import dropped nothing", back.dropped, []);
const bad = C.normalize({factionId:"nope", units:[{unitId:"pylon"},{unitId:"marine",models:7,upgrades:["Laser"]}]});
eq("import drops unknown/summoned/invalid", bad.dropped.length, 3);
eq("invalid model count reset to first composition", bad.roster.units[0].models, 6);
console.log("\n" + C.rosterText(r));

// ---- official v1.09.26 cards (replaced the 10.6 previews) ----
{
  const nc = C.newRoster(); nc.race = "Terran"; nc.factionId = "nova-covert-ops";
  eq("Nova Covert Ops can field both Nova modes, Spec Ops Marauder and Raven", ["nova-assault-mode","nova-stealth-mode","spec-ops-marauder","raven"].every(id => C.eligibleUnits(nc).some(u => u.id === id)), true);
  eq("Nova Covert Ops cannot field Raynor's Raiders units", C.eligibleUnits(nc).some(u => u.id === "raynors-raider"), false);
  const ta = C.newRoster(); ta.race = "Terran"; ta.factionId = "terran-armed-forces";
  eq("Spec Ops Marauder is Nova Covert Ops only (printed tag)", C.eligibleUnits(ta).some(u => u.id === "spec-ops-marauder"), false);
  eq("Nova and Raven carry only the Terran tag", ["nova-assault-mode","raven"].every(id => C.eligibleUnits(ta).some(u => u.id === id)), true);
  ["nova-assault-mode","nova-stealth-mode"].forEach(id => nc.units.push(C.newEntry(id)));
  eq("Battle Preparation: both Nova modes is an error", C.validate(nc).filter(v => v.level === "error" && /cannot include both/.test(v.msg)).length, 1);
  nc.units.pop(); eq("one Nova mode is fine", C.validate(nc).some(v => /cannot include both/.test(v.msg)), false);
  eq("Raven supply 1, 170", [C.entryCost(C.newEntry("raven")).supply, C.entryCost(C.newEntry("raven")).total], [1, 170]);
  eq("Spec Ops Marauder 230 (reissued cost table)", C.entryCost(C.newEntry("spec-ops-marauder")).total, 230);
  const tc = C.newRoster(); tc.race = "Protoss"; tc.factionId = "templar-caste";
  eq("Templar Caste fields Tassadar, Twilight and High Templar", ["tassadar","twilight-templar","high-templar"].every(id => C.eligibleUnits(tc).some(u => u.id === id)), true);
  const kh = C.newRoster(); kh.race = "Protoss"; kh.factionId = "khalai";
  eq("Twilight Templar is Templar Caste only; High Templar is not", [C.eligibleUnits(kh).some(u => u.id === "twilight-templar"), C.eligibleUnits(kh).some(u => u.id === "high-templar")], [false, true]);
  const ht = C.newEntry("high-templar"); eq("High Templar 2 models: 130, Supply 1", [C.entryCost(ht).total, C.entryCost(ht).supply], [130, 1]);
  ht.models = 4; eq("High Templar 4 models: 200, Supply 2", [C.entryCost(ht).total, C.entryCost(ht).supply], [200, 2]);
  const zs = C.newRoster(); zs.race = "Zerg"; zs.factionId = "zagaras-swarm"; eq("Zagara's Swarm requires a Creep Card", C.requiresCreep(zs), true);
  eq("Templar Archives 40 gas, 2 Support, Unique", [C.cards["templar-archives"].gas_cost, C.cards["templar-archives"].slots.Support, C.cards["templar-archives"].unique], [40, 2, true]);
  eq("Vanadium Plating 25 gas", C.cards["vanadium-plating"].gas_cost, 25);
  eq("no provisional entries remain", data.units.concat(data.cards).filter(x => x.provisional).map(x => x.id), []);
  eq("new units carry card version, role and base", [C.units["tassadar"].card_version, C.units["defiler"].combat_role, C.units["zagara"].base_mm], ["v1.09.26", "Lifesaver", 100]);
  eq("Holo Decoy combat tags as printed", C.units["holo-decoy"].combat_tags, ["Psionic", "Ground"]);
  eq("Zagara's Broodmother kept as a built-in ability (no table price)", [C.units["zagara"].abilities.some(a => a.name === "Broodmother"), C.units["zagara"].upgrades.length], [true, 0]);
}
// ---- v1.09.26 Zerg cards ----
{
  const zr = C.newRoster(); zr.race = "Zerg"; zr.factionId = "zagaras-swarm"; zr.creepId = "reactive-creep"; zr.tactical = { "defiler-mound": 1 };
  ["zagara","vileling","defiler","bile-launcher"].forEach(id => zr.units.push(C.newEntry(id)));
  zr.units[2].upgrades = ["Plague", "Cancerous Bite"];
  eq("Zagara 250, Vileling 18 = 180, Defiler 130+20+20, Bile Launcher 150", zr.units.map(e => C.entryCost(e).total), [250, 180, 170, 150]);
  eq("Vileling 18 models = Supply 2", C.entryCost(zr.units[1]).supply, 2);
  eq("Zagara's Swarm roster totals 750 / 45 gas (Reactive Creep 10 + Defiler Mound 35)", [C.totals(zr).minerals, C.totals(zr).gas], [750, 45]);
  eq("Zagara's Swarm roster with Defiler Mound's Support slot is legal", C.validate(zr).filter(v => v.level === "error").map(v => v.msg), []);
  zr.tactical = {}; eq("without Defiler Mound, two Support units overflow the slot", C.validate(zr).some(v => v.level === "error" && /Support/.test(v.msg)), true);
  eq("Reactive Creep offered to Zagara's Swarm", C.eligibleCreep(zr).some(c => c.id === "reactive-creep"), true);
  const ks = C.newRoster(); ks.race = "Zerg"; ks.factionId = "kerrigans-swarm";
  eq("Reactive Creep and Vileling are Zagara's Swarm only (printed tags)", [C.eligibleCreep(ks).some(c => c.id === "reactive-creep"), C.eligibleUnits(ks).some(u => u.id === "vileling")], [false, false]);
  eq("Defiler upgrade Cancerous Bite is a SIDEARM weapon", C.units["defiler"].upgrades.find(x => x.name === "Cancerous Bite").keywords.includes("SIDEARM"), true);
}
// ---- example armies still legal at 10.6 costs ----
{
  const Ex = require("./examples.js");
  ["Terran","Protoss","Zerg"].forEach(race => { const r2 = Ex.build(C, race); const t2 = C.totals(r2), l2 = C.limits(r2);
    eq(race + " example legal at 10.6 costs (" + t2.minerals + " / " + t2.gas + ")", C.validate(r2).filter(v => v.level === "error").map(v => v.msg), []); });
}
console.log(fails ? `\n${fails} FAILED` : "\nALL PASSED");
process.exit(fails ? 1 : 0);
