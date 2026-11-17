// Dice engine tests: the two worked attacks from the Full Rules (Part 1), keyword handling, and simulated odds against hand-worked expectations.
const Dice = require("./dice-core.js"), RosterCore = require("./roster-core.js");
const C = new RosterCore(JSON.parse(require("fs").readFileSync("/home/claude/sc_data/starcraft_tmg_data.json", "utf8")));
let fails = 0;
const eq = (name, got, exp) => { const ok = JSON.stringify(got) === JSON.stringify(exp); if (!ok) fails++; console.log((ok ? "PASS " : "FAIL ") + name + (ok ? "" : "\n   got " + JSON.stringify(got) + "\n   exp " + JSON.stringify(exp))); };
const near = (name, got, exp, tol) => { const ok = Math.abs(got - exp) <= tol; if (!ok) fails++; console.log((ok ? "PASS " : "FAIL ") + name + " (" + got.toFixed(3) + " vs " + exp.toFixed(3) + ")"); };
const seq = list => { let i = 0; return () => { if (i >= list.length) throw new Error("ran out of scripted dice"); return (list[i++] - 0.5) / 6; }; };   // scripted dice
const U = id => C.units[id], W = (id, n) => U(id).weapons.concat(U(id).upgrades).find(w => w.name === n);
const tgt = (id, o) => Object.assign({ tags: U(id).combat_tags, armour: U(id).stats.armour, evade: U(id).stats.evade, hp: U(id).stats.hp, shield: U(id).stats.shield, models: 3, visible: 3, prior: 0 }, o || {});

// ---- Full Rules p.12: Marauders (2 models, Quad K12) shoot the Roaches they are Engaged with.
// 5 hits, Surge 2, 3 Armour Rolls with 2 saved, 3 in the Damage Pool, 1 evaded, PIERCE Armoured (2): 4 Damage, one Roach (HP 4) removed.
{
  const s = Dice.buildSpec({ weapon: W("marauder", "Quad K12"), models: 2, target: tgt("roach"), evade: true });
  eq("p.12 spec: 6 dice at 3+, Armour 3+, Evade 5+, Damage 2 (PIERCE Armoured), Surge D3", [s.groups.map(g => [g.n, g.tn]), s.armourTN, s.evadeTN, s.dmg, s.surge], [[[6, 3]], 3, 5, 2, { die: "D3" }]);
  const r = Dice.resolve(s, seq([3, 4, 5, 6, 3, 1,  3,  3, 5, 1,  5, 2, 3]), true);
  eq("p.12 result: 5 hits, 2 by Surge, 2 saved, 3 in the pool, 1 evaded, 4 Damage, 1 Roach removed", [r.hits, r.surge, r.saved, r.pool, r.evaded, r.damage, r.kills, r.leftover], [5, 2, 2, 3, 1, 4, 1, 0]);
}
// ---- Full Rules p.20: 4 Marines in Range (C-14 Rifle, Stimpack PRECISION (3)) shoot Zerglings, 4 Visible.
// 8 shots, 5 hits, Surge 1, 3 misses become hits, 7 Armour Rolls at 6+ with 2 saved: 6 Damage, but only the 4 Visible Zerglings die.
{
  const s = Dice.buildSpec({ weapon: W("marine", "C-14 Rifle"), models: 4, precision: 3, target: tgt("zergling", { models: 11, visible: 4 }) });
  const r = Dice.resolve(s, seq([3, 4, 5, 6, 3, 1, 2, 2,  1,  6, 6, 1, 2, 3, 4, 5]), true);
  eq("p.20 result: 5 hits + 3 PRECISION, 1 by Surge, 2 saved, 6 Damage, 4 removed, rest discarded", [r.hits, r.precision, r.armourPool, r.surge, r.saved, r.damage, r.kills, r.leftover], [5, 3, 8, 1, 2, 6, 4, 0]);
}
// ---- keywords read from the printed weapon rows
{
  const g = Dice.parseWeapon(W("goliath", "Scatter Missiles"));
  eq("Scatter Missiles: LONG RANGE (24\"), LOCKED IN (6)", [g.longRange, g.lockedIn, g.roa], [24, 6, 6]);
  const s = Dice.buildSpec({ weapon: W("goliath", "Scatter Missiles"), models: 1, longModels: 1, stationary: true, target: tgt("marine") });
  eq("LONG RANGE is -1 to Hit (5+ becomes 6+); LOCKED IN adds 6 RoA against a Stationary target", s.groups.map(x => [x.n, x.tn]), [[12, 6]]);
  const n = Dice.buildSpec({ weapon: W("nova-assault-mode", "Hellfire Shotgun"), models: 1, burst: true, target: tgt("zealot"), evade: true });
  eq("Hellfire Shotgun: BURST FIRE (3) gives 6 dice; ANTI-EVADE (1) makes Evade 5+ a 6+; Surge Light applies to a Zealot", [n.groups[0].n, n.evadeTN, !!n.surge], [6, 6, true]);
  const t = Dice.buildSpec({ weapon: W("siege-tank", "Shock Cannon"), templateModels: 3, target: tgt("marine") });
  eq("Shock Cannon (BT+4): 3 affected models give 7 dice and a Surge result of 3", [t.groups[0].n, t.surge], [7, { fixed: 3 }]);
  const im = Dice.impactFrom(U("goliath").abilities.find(a => a.name === "Devastating Charge"));
  eq("Goliath Devastating Charge reads as IMPACT (4) 3+, Damage 1, no Surge", [im.roa, im.hit, im.dmg, im.s_dice], ["4", "3+", "1", "-"]);
  eq("no Evade characteristic: no Evade Roll even when one is granted", Dice.buildSpec({ weapon: W("marine", "C-14 Rifle"), models: 1, target: tgt("goliath"), evade: true }).evadeTN, null);
  eq("Target Numbers stay between 2+ and 6+", [Dice.clampTN(1), Dice.clampTN(7)], [2, 6]);
}
// ---- pools: CRITICAL HIT, DODGE, TOUGH, Shield, CONCENTRATED FIRE
{
  const base = { groups: [{ n: 4, tn: 3 }], precision: 0, surge: null, crit: 2, dodge: 1, armourTN: 4, tough: 1, evadeTN: null, dmg: 1, prior: 0, reduce: 0, hp: 4, firstHp: 7, models: 3, visible: 3, maxKills: Infinity };
  const r = Dice.resolve(base, seq([6, 6, 6, 6,  1, 1, 5]), true);   // 4 hits; CRIT moves 2, DODGE stops 1 -> 1 skips Armour; 3 Armour Rolls: 2 fail, TOUGH saves 1
  eq("CRITICAL HIT (2) less DODGE (1) moves 1 die; TOUGH (1) turns one failed Armour Roll", [r.crit, r.dodged, r.bypass, r.saved, r.toughed, r.pool], [2, 1, 1, 1, 1, 2]);
  const sh = (dmg) => Dice.resolve(Object.assign({}, base, { groups: [{ n: dmg, tn: 2 }], crit: 99, dodge: 0, tough: 0 }), seq(Array(dmg).fill(6)), false);
  eq("Shield: the first Zealot (HP 4 + Shield 3) needs 7 Damage; 6 leaves a Damage Marker of 6", [sh(6).kills, sh(6).leftover, sh(7).kills, sh(11).kills, sh(11).leftover], [0, 6, 1, 2, 0]);
  const cf = Dice.resolve(Object.assign({}, base, { groups: [{ n: 12, tn: 2 }], crit: 12, dodge: 0, hp: 2, firstHp: 2, models: 6, visible: 6, maxKills: 1 }), seq(Array(12).fill(6)), false);
  eq("CONCENTRATED FIRE (1): one model removed, the rest of the Damage discarded", [cf.kills, cf.leftover], [1, 0]);
  const pr = Dice.resolve(Object.assign({}, base, { groups: [{ n: 1, tn: 2 }], crit: 1, dodge: 0, prior: 3, hp: 4, firstHp: 4 }), seq([6]), false);
  eq("Damage already on the unit counts towards the next casualty", [pr.total, pr.kills], [4, 1]);
}
// ---- simulated odds against exact expectations
{
  const rnd = Dice.seeded(42), N = 200000;
  const plain = Dice.simulate({ groups: [{ n: 8, tn: 3 }], precision: 0, surge: null, crit: 0, dodge: 0, armourTN: 5, tough: 0, evadeTN: null, dmg: 1, prior: 0, reduce: 0, hp: 2, firstHp: 2, models: 6, visible: 6, maxKills: Infinity }, N, rnd);
  near("8 dice at 3+: 5.333 hits on average", plain.hits, 8 * 2 / 3, 0.02);
  near("then Armour 5+: 3.556 unsaved on average", plain.unsaved, 8 * (2 / 3) * (2 / 3), 0.02);
  const ev = Dice.simulate({ groups: [{ n: 6, tn: 4 }], precision: 0, surge: null, crit: 0, dodge: 0, armourTN: 6, tough: 0, evadeTN: 4, dmg: 2, prior: 0, reduce: 0, hp: 10, firstHp: 10, models: 1, visible: 1, maxKills: Infinity }, N, rnd);
  near("6 dice 4+, Armour 6+, Evade 4+, Damage 2: 2.5 Damage on average", ev.damage, 6 * 0.5 * (5 / 6) * 0.5 * 2, 0.02);
  const one = Dice.simulate({ groups: [{ n: 1, tn: 4 }], precision: 0, surge: null, crit: 0, dodge: 0, armourTN: 4, tough: 0, evadeTN: null, dmg: 1, prior: 0, reduce: 0, hp: 1, firstHp: 1, models: 1, visible: 1, maxKills: Infinity }, N, rnd);
  near("1 die at 4+ against Armour 4+ and 1 HP: destroyed 25% of the time", one.destroyed, 0.25, 0.005);
  near("chance of no damage is the complement", one.noDamage, 0.75, 0.005);
}
console.log(fails ? `\n${fails} FAILED` : "\nALL PASSED");
process.exit(fails ? 1 : 0);
