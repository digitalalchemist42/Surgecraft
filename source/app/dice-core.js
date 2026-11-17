/* SurgeCraft dice engine: resolves one attack Batch through the three pools of Part 8.7.4.
 * Pure functions, no DOM. The roller and the odds use the same resolve(), so they cannot disagree.
 *   Attack Pool -> (Hit, PRECISION) -> Armour Pool -> (Surge, CRITICAL HIT, DODGE) -> Armour Rolls (TOUGH)
 *   -> Damage Pool -> (Evade Rolls, ANTI-EVADE) -> Damage (PIERCE) -> casualties (Shield, Visible models, CONCENTRATED FIRE)
 * Rule references are to the Full Rules. Odds are simulated by rolling the attack many times, not solved exactly. */
(function (root) {
  "use strict";

  function tn(s) { var m = /^(\d)\+$/.exec(String(s == null ? "" : s).trim()); return m ? Number(m[1]) : null; }
  /* Part 3.4: a Target Number can never be modified below 2+ or above 6+ (so a 6 always succeeds and a 1 always fails, 3.6). */
  function clampTN(n) { return Math.max(2, Math.min(6, n)); }
  function kwMax(list, re) { var best = 0; (list || []).forEach(function (k) { var m = re.exec(k); if (m) best = Math.max(best, Number(m[1])); }); return best; }

  /* Read the numbers a weapon row prints. Template weapons print RoA "BT+4" and S Dice "BT" (Part 8.7.6). */
  function parseWeapon(w) {
    var kws = w.keywords || [], roa = String(w.roa), tpl = /^(BT|FT)(?:\+(\d+))?$/.exec(roa), burst = null, pierce = [];
    kws.forEach(function (k) {
      var b = /^BURST FIRE (\d+)"? \((\d+)\)$/.exec(k); if (b) burst = { within: Number(b[1]), roa: Number(b[2]) };
      var p = /^PIERCE (\w+) \((\d+)\)$/.exec(k); if (p) pierce.push({ tag: p[1], dmg: Number(p[2]) });
    });
    return {
      name: w.name, impact: !!w.impact, template: tpl ? tpl[1] : null, roa: tpl ? Number(tpl[2] || 0) : Number(roa) || 0,
      hit: tn(w.hit), surgeTypes: w.surge_type && w.surge_type !== "-" ? String(w.surge_type).split(/,\s*/) : [],
      sDice: w.s_dice && w.s_dice !== "-" ? String(w.s_dice) : null, dmg: Number(w.dmg) || 1,
      longRange: kwMax(kws, /^LONG RANGE \((\d+)"?\)$/), burst: burst, lockedIn: kwMax(kws, /^LOCKED IN \((\d+)\)$/),
      crit: kwMax(kws, /^CRITICAL HIT \((\d+)\)$/), antiEvade: kwMax(kws, /^ANTI-EVADE \((\d+)\)$/), precision: kwMax(kws, /^PRECISION \((\d+)\)$/),
      pierce: pierce, concentrated: kwMax(kws, /^CONCENTRATED FIRE \((\d+)\)$/),
      ranged: !w.impact && w.rng !== "E", targets: w.target || "Ground"
    };
  }

  /* IMPACT (X) Y, as printed in an ability's text: X dice per eligible model, hitting on Y+, Damage 1, no Surge (Part 11). */
  function impactFrom(ability) {
    var m = /IMPACT \((\d+)\) (\d)\+/.exec(ability.text || ""); if (!m) return null;
    return { impact: true, name: ability.name + ": IMPACT (" + m[1] + ") " + m[2] + "+", phase: "Assault", rng: "E", target: "Ground", roa: m[1], hit: m[2] + "+", surge_type: "-", s_dice: "-", dmg: "1", keywords: [] };
  }

  /* Turn a weapon, a target and the chosen statuses into the numbers one resolution needs.
     o: { weapon, models, longModels, burst, stationary, templateModels, hitMod, roaMod, precision, crit, antiEvade,
          target: { tags, armour, evade, hp, shield, models, visible, prior, firstGone }, evade (bool), armourMod, evadeMod, tough, dodge, reduce }
     Modifiers follow Part 3.4: +1 makes the roll easier (Target Number down by 1). Keywords do not stack: the highest value is used (2.6.1). */
  function buildSpec(o) {
    var w = parseWeapon(o.weapon), t = o.target, notes = [];
    var models = Math.max(0, o.models | 0), longN = w.longRange ? Math.min(models, Math.max(0, o.longModels | 0)) : 0;
    var perModel = Math.max(0, w.roa + (o.burst && w.burst ? w.burst.roa : 0) + (o.stationary && w.lockedIn ? w.lockedIn : 0) + (o.roaMod | 0));
    var hitTN = clampTN(w.hit - (o.hitMod | 0)), groups = [];
    if (w.template) {
      var aff = Math.max(0, o.templateModels | 0);
      groups.push({ n: aff ? aff + perModel : 0, tn: hitTN, label: aff + " affected + " + perModel });   // 8.7.6: affected models plus RoA modifiers
    } else {
      if (models - longN > 0) groups.push({ n: (models - longN) * perModel, tn: hitTN, label: "in range" });
      if (longN > 0) groups.push({ n: longN * perModel, tn: clampTN(w.hit - (o.hitMod | 0) + 1), label: "LONG RANGE, -1 to Hit" });
    }
    var tags = t.tags || [], surgeOn = !w.impact && w.surgeTypes.some(function (s) { return tags.indexOf(s) !== -1; });
    var dmg = w.dmg; w.pierce.forEach(function (p) { if (tags.indexOf(p.tag) !== -1) dmg = p.dmg; });
    var evTN = tn(t.evade), evade = null;
    if (o.evade && evTN != null) evade = clampTN(evTN - (o.evadeMod | 0) + Math.max(w.antiEvade, o.antiEvade | 0));
    if (o.evade && evTN == null) notes.push("The target has no Evade characteristic, so it cannot make Evade Rolls (5.1).");
    var tModels = Math.max(0, t.models | 0), hp = Math.max(1, Number(t.hp) || 1), shield = Number(t.shield) || 0;
    return {
      groups: groups, precision: Math.max(w.precision, o.precision | 0),
      surge: surgeOn ? (w.template ? { fixed: Math.max(0, o.templateModels | 0) } : (w.sDice ? { die: w.sDice } : null)) : null, surgePrinted: !!w.sDice && !w.impact,
      crit: Math.max(w.crit, o.crit | 0), dodge: Math.max(0, o.dodge | 0),
      armourTN: clampTN(tn(t.armour) - (o.armourMod | 0)), tough: Math.max(0, o.tough | 0), evadeTN: evade,
      dmg: dmg, prior: Math.max(0, t.prior | 0), reduce: Math.max(0, o.reduce | 0),
      hp: hp, firstHp: t.firstGone ? hp : hp + shield, models: tModels, visible: Math.min(tModels, t.visible == null ? tModels : Math.max(0, t.visible | 0)),
      maxKills: w.concentrated || Infinity, notes: notes, weapon: w
    };
  }

  function d6(rnd) { return 1 + Math.floor(rnd() * 6); }
  function surgeRoll(die, rnd) {       // Part 3.1: D3 is a D6 halved, rounding up; "D3+1" is a fixed addition (3.5)
    var r = d6(rnd); if (die === "D6") return { roll: r, value: r };
    var v = Math.ceil(r / 2); return { roll: r, value: die === "D3+1" ? v + 1 : v };
  }

  /* Resolve the Batch once. keep=true also returns every die for display. */
  function resolve(s, rnd, keep) {
    rnd = rnd || Math.random;
    var out = { dice: 0, hits: 0, precision: 0, surge: 0, crit: 0, dodged: 0, bypass: 0, saved: 0, toughed: 0, pool: 0, evaded: 0, wounds: 0, damage: 0, total: 0, kills: 0, leftover: 0, destroyed: false };
    var misses = 0, i, r, g;
    if (keep) out.rolls = { attack: [], armour: [], evade: [], surge: null };
    for (g = 0; g < s.groups.length; g++) {
      var grp = s.groups[g], arr = [];
      for (i = 0; i < grp.n; i++) { r = d6(rnd); out.dice++; if (r >= grp.tn) out.hits++; else misses++; if (keep) arr.push(r); }
      if (keep) out.rolls.attack.push({ label: grp.label, tn: grp.tn, dice: arr });
    }
    out.precision = Math.min(s.precision, misses);                       // PRECISION: failed Attack Dice count as hits, Surge included
    var armourPool = out.hits + out.precision;
    out.armourPool = armourPool;
    var sv = 0;
    if (s.surge) {
      if (s.surge.fixed != null) sv = s.surge.fixed; else { var sr = surgeRoll(s.surge.die, rnd); sv = sr.value; if (keep) out.rolls.surge = { die: s.surge.die, roll: sr.roll, value: sr.value }; }
    }
    out.surge = Math.min(sv, armourPool);                                // Surge can never move more dice than are in the Armour Pool
    out.crit = Math.min(s.crit, armourPool - out.surge);                 // nor can CRITICAL HIT
    var moved = out.surge + out.crit;
    out.dodged = Math.min(s.dodge, moved); out.bypass = moved - out.dodged;   // DODGE: fewer dice moved by Surge or CRITICAL HIT
    var toRoll = armourPool - out.bypass, fails = 0, ar = [];
    for (i = 0; i < toRoll; i++) { r = d6(rnd); if (r >= s.armourTN) out.saved++; else fails++; if (keep) ar.push(r); }
    if (keep) out.rolls.armour = ar;
    out.toughed = Math.min(s.tough, fails); fails -= out.toughed;        // TOUGH: failed Armour results become successes
    out.pool = out.bypass + fails;
    var left = out.pool;
    if (s.evadeTN != null) {
      var ev = [];
      for (i = 0; i < out.pool; i++) { r = d6(rnd); if (r >= s.evadeTN) { out.evaded++; left--; } if (keep) ev.push(r); }
      if (keep) out.rolls.evade = ev;
    }
    out.wounds = left; out.damage = left * s.dmg;
    if (!left) { out.leftover = s.prior; return out; }                   // 8.7.4 step 5: no dice left, nothing to resolve
    var total = Math.max(0, out.damage + s.prior - s.reduce), cap = Math.min(s.visible, s.maxKills), first = true, thr;
    out.total = total;
    while (out.kills < cap) { thr = first ? s.firstHp : s.hp; if (total < thr) break; total -= thr; out.kills++; first = false; }
    /* All Visible models gone, or the CONCENTRATED FIRE limit reached: remaining Total Damage is discarded, not recorded. */
    out.leftover = out.kills >= cap ? 0 : total;
    out.destroyed = s.models > 0 && out.kills >= s.models;
    return out;
  }

  /* Odds by simulation: resolve the same Batch n times and summarise. */
  function simulate(s, n, rnd) {
    n = n || 20000; rnd = rnd || Math.random;
    var sum = { dice: 0, armourPool: 0, bypass: 0, pool: 0, wounds: 0, damage: 0, kills: 0 }, dist = [], destroyed = 0, none = 0, i, o;
    for (i = 0; i < n; i++) {
      o = resolve(s, rnd, false);
      sum.dice += o.dice; sum.armourPool += o.armourPool; sum.bypass += o.bypass; sum.pool += o.pool; sum.wounds += o.wounds; sum.damage += o.damage; sum.kills += o.kills;
      dist[o.kills] = (dist[o.kills] || 0) + 1; if (o.destroyed) destroyed++; if (!o.wounds) none++;
    }
    var atLeast = [], acc = 0, k;
    for (k = dist.length - 1; k >= 0; k--) { acc += dist[k] || 0; atLeast[k] = acc / n; }
    return {
      trials: n, dice: sum.dice / n, hits: sum.armourPool / n, bypass: sum.bypass / n, unsaved: sum.pool / n, wounds: sum.wounds / n,
      damage: sum.damage / n, kills: sum.kills / n, atLeast: atLeast, destroyed: destroyed / n, noDamage: none / n
    };
  }

  /* Small seeded generator, for tests that need repeatable rolls. */
  function seeded(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

  var Dice = { tn: tn, clampTN: clampTN, parseWeapon: parseWeapon, impactFrom: impactFrom, buildSpec: buildSpec, resolve: resolve, simulate: simulate, seeded: seeded };
  if (typeof module !== "undefined" && module.exports) module.exports = Dice; else root.Dice = Dice;
})(typeof window !== "undefined" ? window : this);
