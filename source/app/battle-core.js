/* SurgeCraft — battle tracker rules engine.
 * Pure functions over a roster (RosterCore) and a battle-state object stored on the roster as r.battle.
 * No DOM access. Rule references are to the Full Rules; card numbers come from the dataset. */
(function (root) {
  "use strict";

  var PHASES = [null, "Movement", "Assault", "Combat", "Scoring"];
  var ACTIONS = {
    deploy: { label: "Deploy", phase: 1, moves: true, ref: "8.5.5" },
    move: { label: "Move", phase: 1, moves: true, ref: "8.5.2" },
    disengage: { label: "Disengage", phase: 1, moves: true, ref: "8.5.4" },
    hold1: { label: "Hold", phase: 1, ref: "8.5.1" },
    ranged: { label: "Ranged Attack", phase: 2, ref: "8.7.3" },
    charge: { label: "Charge", phase: 2, ref: "8.7.7" },
    run: { label: "Run", phase: 2, moves: true, ref: "8.7.1" },
    hold2: { label: "Hold", phase: 2, ref: "8.7.2" },
    gather: { label: "Gather", phase: 2, ref: "Mission Card" },
    sabotage: { label: "Sabotage", phase: 2, ref: "Mission Card" },
    fight: { label: "Close Combat Attack", phase: 3, ref: "8.8.1" }
  };
  var STATUS = {
    stationary: "Stationary", hidden: "Hidden", burrowed: "Burrowed", siege: "Siege Mode", buff: "Buff", debuff: "Debuff"
  };

  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function other(who) { return who === "me" ? "opp" : "me"; }
  function sum(a) { return a.reduce(function (x, y) { return x + (Number(y) || 0); }, 0); }

  /* Part 9.2 Step 4: Markers 1 and 3 are Red, 2 and 4 are Blue, 5 is Neutral. */
  function affinity(n) { return n === 5 ? null : (n === 1 || n === 3) ? "red" : "blue"; }
  /* Skirmish Deployment Cards and Skirmish Mission Cards use Markers 1, 2 and 5; Standard uses 1-5. */
  function markerIds(side) { return side === "skirmish" ? [1, 2, 5] : [1, 2, 3, 4, 5]; }

  function supplyFor(unit, models) {
    if (!unit || models <= 0) return 0;
    var prof = unit.supply_profile || [], best = 0, top = 0, topSupply = 0;
    for (var i = 0; i < prof.length; i++) {
      var p = String(prof[i].models).split("-"), lo = Number(p[0]), hi = Number(p[1] == null ? p[0] : p[1]);
      if (models >= lo && models <= hi) return prof[i].supply;
      if (hi > top) { top = hi; topSupply = prof[i].supply; }
      best = prof[i].supply;
    }
    return models > top ? topSupply : best;
  }
  function maxModels(unit) {
    var top = 1; (unit.supply_profile || []).forEach(function (p) { var s = String(p.models).split("-"); top = Math.max(top, Number(s[1] == null ? s[0] : s[1])); });
    return top;
  }

  function side(C, r) { return C.limits(r).scale.side; }
  function mission(C, b) { var m = C.missions[b.missionId]; return m ? m[b.side] : null; }
  function myColor(b) { return b.color; }
  function colorOf(b, who) { return who === "me" ? b.color : (b.color === "red" ? "blue" : "red"); }

  function log(b, text) { b.log.push({ r: b.round, p: b.phase, t: text, at: Date.now() }); if (b.log.length > 400) b.log.splice(0, b.log.length - 400); }
  /* Start time of every Round and Phase, for game length and the battle report. */
  function mark(b) { (b.times = b.times || []).push({ r: b.round, p: b.phase, at: Date.now() }); }

  /* ---------- unit state ---------- */
  function newUnitState(models) {
    return { st: "res", m: models, d: 0, act: [false, false, false], an: [null, null, null], eng: false, dis: false, stat: {}, first: false, shb: false, used: {}, usedGame: {}, s0: 0 };
  }
  function entryList(r, b) {
    var list = r.units.map(function (e) { return { uid: e.uid, entry: e, summoned: false }; });
    (b.summoned || []).forEach(function (s) { list.push({ uid: s.uid, entry: { uid: s.uid, unitId: s.unitId, models: s.start, upgrades: [], specialists: {} }, summoned: true }); });
    return list;
  }
  function upgrade(b) {
    if (!b.kills) b.kills = []; if (!b.times) b.times = [{ r: b.round, p: b.phase, at: b.startedAt || Date.now() }];
    if (!b.rounds) b.rounds = {}; if (!b.notes) b.notes = {}; if (!b.spend) b.spend = []; if (!b.acts) b.acts = []; if (!b.uses) b.uses = [];
    if (b.summary == null) b.summary = ""; if (b.mvp === undefined) b.mvp = null; if (b.opp === undefined) b.opp = null; if (b.fpmStart == null) b.fpmStart = b.fpm;
    return b;
  }
  function sync(C, r, b) {
    upgrade(b);
    var seen = {};
    entryList(r, b).forEach(function (x) {
      seen[x.uid] = true;
      var u = C.units[x.entry.unitId]; if (!u) return;
      if (!b.units[x.uid]) { b.units[x.uid] = newUnitState(x.entry.models); b.units[x.uid].s0 = supplyFor(u, x.entry.models); if (x.summoned) b.units[x.uid].st = "fld"; }
      var st = b.units[x.uid];
      if (st.m > x.entry.models && !x.summoned) st.m = x.entry.models;
    });
    Object.keys(b.units).forEach(function (k) { if (!seen[k]) delete b.units[k]; });
    return b;
  }

  function create(C, r, opts) {
    opts = opts || {};
    var sd = side(C, r), m = C.missions[opts.missionId];
    if (!m) return null;
    var b = {
      v: 1, missionId: opts.missionId, deploymentId: opts.deploymentId || null, side: sd,
      color: opts.color === "blue" ? "blue" : "red", round: 1, phase: 1, fpm: opts.fpm === "opp" ? "opp" : "me",
      units: {}, summoned: [], cards: {}, markers: {}, vp: { me: [], opp: [] },
      si: freshInputs(), over: null, rollOff: false, log: [], startedAt: Date.now(),
      opp: opts.opp ? oppFrom(C, opts.opp) : null, kills: [], times: [], rounds: {}, notes: {}, summary: "", mvp: null, spend: [], acts: [], uses: []
    };
    var allOn = opts.missionId !== "supply-drop";
    markerIds(sd).forEach(function (n) {
      b.markers[n] = { own: null, prev: null, on: allOn, ar: allOn ? 0 : null, gone: false };
      if (opts.missionId === "fire-in-the-sky") b.markers[n].lvl = 1; // Mission Card: starting Sabotage Level of each Marker is 1
    });
    sync(C, r, b);
    startRound(C, r, b);
    mark(b);
    log(b, "Battle started: " + m.name + ", " + (sd === "skirmish" ? "Skirmish Level" : "Standard Engagement") + ". You are the " + (b.color === "red" ? "Red" : "Blue") + " Player." + (b.opp ? " Opponent: " + (b.opp.player || b.opp.name || "list imported") + ", " + b.opp.order.length + " Units." : ""));
    return b;
  }
  function freshInputs() { return { enemyLost: 0, gatherMe: 0, gatherOpp: 0, quartersMe: 0, quartersOpp: 0, claimMe: 0, claimOpp: 0, safeMe: 0, safeOpp: 0, oppWiped: false }; }

  function info(C, r, b, uid) {
    var x = entryList(r, b).filter(function (e) { return e.uid === uid; })[0]; if (!x) return null;
    var u = C.units[x.entry.unitId], st = b.units[uid]; if (!u || !st) return null;
    var shield = Number(u.stats.shield) || 0, hp = Number(u.stats.hp) || 1;
    var models = st.st === "dead" ? 0 : st.m;
    var supplyNow = supplyFor(u, models);
    var zeroPool = x.entry.upgrades.indexOf("Advanced Medic Facilities") !== -1; // card text: Supply counts as 0 when calculating the Supply Pool
    var threshold = hp + (st.first ? 0 : shield);
    return {
      uid: uid, entry: x.entry, unit: u, summoned: x.summoned, st: st, state: st.st, models: models, start: x.entry.models,
      hp: hp, shield: shield, threshold: threshold, casualtyDue: models > 0 && st.d >= threshold,
      shielded: shield > 0 && !st.first && !st.shb, supplyNow: supplyNow, supplyStart: supplyFor(u, x.entry.models),
      poolSupply: zeroPool ? 0 : supplyNow, zeroPool: zeroPool, flying: u.combat_tags.indexOf("Flying") !== -1
    };
  }
  function infos(C, r, b) { return entryList(r, b).map(function (x) { return info(C, r, b, x.uid); }).filter(Boolean); }

  /* ---------- supply (Parts 6.2, 8.3) ---------- */
  function supply(C, r, b) {
    var m = mission(C, b), unlimited = b.round >= m.game_length;
    var pool = m.deploy_supply + m.supply_per_round * (b.round - 1), on = 0;
    infos(C, r, b).forEach(function (i) { if (i.state === "fld") on += i.poolSupply; });
    return { pool: pool, unlimited: unlimited, onTable: on, available: unlimited ? Infinity : pool - on };
  }

  /* Enemy scores VPs equal to my Supply destroyed this Round. Summoned Units are left out (9.1.9: not used for the final score).
     In the final Scoring Phase, Units still in Reserves count as Destroyed (8.10). */
  function lostThisRound(C, r, b) {
    var m = mission(C, b), final = b.round >= m.game_length, lost = 0, reserves = 0;
    infos(C, r, b).forEach(function (i) {
      if (i.summoned) return;
      if (final && i.state === "res") { reserves += i.st.s0; return; }
      lost += Math.max(0, i.st.s0 - (i.state === "dead" ? 0 : i.supplyNow));
    });
    return { lost: lost, reserves: reserves, total: lost + reserves };
  }

  /* ---------- round start ---------- */
  function startRound(C, r, b) {
    infos(C, r, b).forEach(function (i) {
      var st = i.st;
      st.act = [false, false, false]; st.an = [null, null, null]; st.dis = false; st.used = {};
      delete st.stat.buff; delete st.stat.debuff;
      if (st.st !== "dead") st.stat.stationary = true;          // Part 11 STATIONARY
      if (st.stat.burrowed) st.stat.hidden = true;               // Part 11 BURROWED
      st.s0 = st.st === "dead" ? 0 : i.supplyNow;
    });
    oppInfos(C, b).forEach(function (o) { o.st.s0 = o.st.st === "dead" ? 0 : o.supplyNow; });
    b.fpmStart = b.fpm;
    Object.keys(b.cards).forEach(function (k) { delete b.cards[k]; }); // 8.9.5: Exhausted cards refresh
    Object.keys(b.markers).forEach(function (n) { b.markers[n].prev = b.markers[n].own; });
    b.si = freshInputs();
    b.phase = 1; b.scored = false;
  }
  /* Supply Drop: which Markers may be flipped to Activated at the start of this Round. */
  function activationDue(C, b) {
    if (b.missionId !== "supply-drop") return null;
    var m = mission(C, b), ids = Object.keys(b.markers).map(Number);
    if (ids.some(function (n) { return b.markers[n].ar === b.round; })) return null;
    if (b.side === "standard") {
      if (b.round === m.game_length) return b.markers[5] && !b.markers[5].on ? { auto: 5, pool: [5] } : null;
      var pool = [1, 2, 3, 4].filter(function (n) { return b.markers[n] && !b.markers[n].on && !b.markers[n].gone; });
      return pool.length ? { pool: pool } : null;
    }
    if (b.round < 2 || b.round > 4) return null;
    var p2 = [1, 2, 5].filter(function (n) { return b.markers[n] && !b.markers[n].on && !b.markers[n].gone; });
    return p2.length ? { pool: p2 } : null;
  }
  function activateMarker(C, b, n) {
    var mk = b.markers[n]; if (!mk) return;
    mk.on = true; mk.ar = b.round; mk.gone = false;
    log(b, "Mission Marker " + n + " Activated.");
  }
  function startNotes(C, r, b) {
    var notes = ["Resolve Start of the Round abilities. The holder of the First Player Marker resolves theirs first (8.4).", "Every Unit gains the Stationary Status (Part 11)."];
    var s = supply(C, r, b);
    notes.push(s.unlimited ? "Final Round: the Supply Pool is unlimited. Every Unit left in Reserves may deploy (8.3.1)." : "Supply Pool is " + s.pool + " this Round (8.3.1).");
    return notes;
  }

  /* ---------- actions ---------- */
  function hasAssaultWeapon(C, r, i) {
    var names = i.unit.weapons.filter(function (w) { return w.phase === "Assault"; }).length;
    i.entry.upgrades.forEach(function (n) { var up = C.upgradeDef(i.entry, n); if (up && up.kind === "weapon" && up.phase === "Assault") names++; });
    return names > 0;
  }
  function actionsFor(C, r, b, uid) {
    var i = info(C, r, b, uid); if (!i || i.state === "dead" || b.over) return [];
    // Structure: "This Unit cannot be Activated in any Phase and cannot perform actions."
    if (i.unit.abilities.some(function (a) { return a.name === "Structure"; })) return [];
    var p = b.phase, out = [];
    if (p === 1) out = i.state === "res" ? ["deploy"] : (i.st.eng ? ["disengage", "hold1"] : ["move", "hold1"]);
    else if (p === 2) { if (i.state === "fld") { out = i.st.eng ? ["ranged", "hold2"] : ["ranged", "charge", "run", "hold2"]; if (b.missionId === "gather-the-resources" && !i.st.eng) out.push("gather"); if (b.missionId === "fire-in-the-sky" && !i.st.eng) out.push("sabotage"); } }
    else if (p === 3) { if (i.state === "fld" && i.st.eng) out = ["fight"]; }
    return out;
  }
  function act(C, r, b, uid, action) {
    var i = info(C, r, b, uid), a = ACTIONS[action], warn = [];
    if (!i || !a || b.phase !== a.phase) return { warnings: ["That action isn't available in this Phase."], done: false };
    var st = i.st, idx = a.phase - 1, name = i.unit.name;
    if (st.act[idx]) warn.push(name + " has already activated this Phase (8.2).");
    if (action === "deploy") {
      var s = supply(C, r, b);
      if (!s.unlimited && i.poolSupply > s.available) warn.push(name + " needs " + i.poolSupply + " Supply but only " + Math.max(0, s.available) + " is available (8.3.2).");
      st.st = "fld";
    }
    if (action === "ranged") {
      if (!hasAssaultWeapon(C, r, i)) warn.push(name + " has no Assault Phase weapon on its card.");
      if (st.dis) warn.push(name + " Disengaged this Round: it can't make a Ranged Attack unless it had Tactical Mass or another rule lifts the penalty (8.5.4).");
      if (st.stat.burrowed) warn.push("A Burrowed Unit may only Deploy, Move, Disengage, Run, Hold or Close Ranks (Part 11).");
    }
    if (action === "charge") {
      if (i.flying) warn.push("Flying Units cannot Charge (8.7.7).");
      if (st.dis) warn.push(name + " Disengaged this Round: it can't Charge unless it had Tactical Mass or another rule lifts the penalty (8.5.4).");
      if (st.stat.burrowed) warn.push("A Burrowed Unit may only Deploy, Move, Disengage, Run, Hold or Close Ranks (Part 11).");
      if (st.stat.siege) warn.push("A Unit in Siege Mode cannot Charge (Part 11).");
      st.eng = true;
    }
    if ((action === "move" || action === "run" || action === "disengage") && st.stat.siege) warn.push("A Unit in Siege Mode cannot " + a.label + " (Part 11).");
    if (action === "disengage") { st.dis = true; st.eng = false; }
    if (action === "gather") { b.si.gatherMe++; }
    if (action === "sabotage") {
      if (!Object.keys(b.markers).some(function (n) { return b.markers[n].own; })) warn.push("Sabotage needs an Unengaged Unit Within 3\" of a Controlled Mission Marker. No Marker is marked as Controlled yet.");
      warn.push("Mission Marker: raise or lower that Marker's Sabotage Level by 1 below (minimum 1, maximum 3).");
    }
    if (a.moves || action === "charge") {
      delete st.stat.stationary;
      if (st.stat.burrowed) { delete st.stat.burrowed; delete st.stat.hidden; warn.push(name + " is no longer Burrowed: " + a.label + " removes the status (Part 11)."); }
    }
    st.act[idx] = true; st.an[idx] = action;
    (b.acts = b.acts || []).push({ r: b.round, p: b.phase, uid: uid, a: action });
    log(b, name + ": " + a.label + (action === "gather" ? " (+1 VP)" : "") + ".");
    return { warnings: warn, done: true };
  }
  function clearAct(C, r, b, uid) {
    var st = b.units[uid]; if (!st || b.phase > 3) return;
    var idx = b.phase - 1, was = st.an[idx];
    if (was === "gather") b.si.gatherMe = Math.max(0, b.si.gatherMe - 1);
    if (was === "deploy") st.st = "res";
    if (was === "disengage") st.dis = false;
    st.act[idx] = false; st.an[idx] = null;
    for (var k = (b.acts || []).length - 1; k >= 0; k--) if (b.acts[k].uid === uid && b.acts[k].r === b.round && b.acts[k].p === b.phase) { b.acts.splice(k, 1); break; }
  }

  /* ---------- damage and casualties (8.7.4 step 5) ---------- */
  function setState(C, r, b, uid, state) {
    var i = info(C, r, b, uid); if (!i) return;
    var st = i.st;
    if (state === "dead") { st.st = "dead"; st.m = 0; st.d = 0; st.eng = false; st.first = true; st.deadR = b.round; log(b, i.unit.name + " Destroyed."); }
    else if (state === "res") { st.st = "res"; st.eng = false; if (st.stat.siege) delete st.stat.siege; log(b, i.unit.name + " returned to Reserves."); }
    else { st.st = "fld"; if (st.m <= 0) st.m = 1; delete st.deadR; }
  }
  function changeModels(C, r, b, uid, delta) {
    var i = info(C, r, b, uid); if (!i) return;
    var st = i.st, cap = i.summoned ? maxModels(i.unit) : i.start;
    var n = Math.max(0, Math.min(cap, (st.st === "dead" ? 0 : st.m) + delta));
    if (n === 0) { setState(C, r, b, uid, "dead"); return; }
    if (st.st === "dead") st.st = "fld";
    if (delta < 0) { st.first = true; log(b, i.unit.name + ": " + n + " of " + i.start + " models left."); }
    st.m = n;
  }
  function changeDamage(C, r, b, uid, delta) {
    var i = info(C, r, b, uid); if (!i) return;
    i.st.d = Math.max(0, i.st.d + delta);
    if (i.shield && i.st.d > i.shield) i.st.shb = true; // Shielded Status is lost and HEAL cannot restore it
  }
  /* Remove one model and take its Hit Points off the Damage Marker. */
  function removeCasualty(C, r, b, uid) {
    var i = info(C, r, b, uid); if (!i || i.models <= 0) return;
    i.st.d = Math.max(0, i.st.d - i.threshold);
    changeModels(C, r, b, uid, -1);
  }
  function toggleStatus(C, r, b, uid, key) {
    var st = b.units[uid]; if (!st || !STATUS[key]) return;
    if (st.stat[key]) { delete st.stat[key]; if (key === "burrowed") delete st.stat.hidden; }
    else { st.stat[key] = true; if (key === "burrowed") st.stat.hidden = true; }
  }
  function toggleEngaged(C, r, b, uid) { var st = b.units[uid]; if (st) st.eng = !st.eng; }
  function statusKeys(C, r, i) {
    var keys = ["stationary", "hidden"], text = JSON.stringify(i.unit.abilities) + JSON.stringify(i.unit.upgrades) + JSON.stringify(i.unit.weapons);
    if (i.unit.race === "Zerg" && !i.flying) keys.push("burrowed");
    else if (/Burrowed/i.test(text)) keys.push("burrowed");
    if (/SIEGE MODE/.test(text)) keys.push("siege");
    keys.push("buff", "debuff");
    return keys;
  }

  /* ---------- abilities ---------- */
  function abilitiesFor(C, r, b, uid) {
    var i = info(C, r, b, uid); if (!i) return [];
    var ph = PHASES[b.phase], list = i.unit.abilities.slice();
    i.entry.upgrades.forEach(function (n) { var up = C.upgradeDef(i.entry, n); if (up && up.kind === "ability") list.push(up); });
    return list.filter(function (a) { return a.phase === "Any" || a.phase === ph; }).map(function (a) {
      var rep = /^REPEATABLE/.test(a.text || ""), game = /Once per Game/i.test(a.text || "");
      var m = /^(\d+)/.exec(a.cost || "");
      return { ability: a, repeatable: rep, oncePerGame: game, cost: m ? Number(m[1]) : 0, usable: a.type !== "Passive",
        used: !!(game ? i.st.usedGame[a.name] : i.st.used[a.name]) };
    });
  }
  function useAbility(C, r, b, uid, name) {
    var i = info(C, r, b, uid); if (!i) return { warnings: [] };
    var a = abilitiesFor(C, r, b, uid).filter(function (x) { return x.ability.name === name; })[0]; if (!a) return { warnings: [] };
    var warn = [], res = resource(C, r, b);
    if (a.used && !a.repeatable) warn.push(name + " was already used by this Unit this " + (a.oncePerGame ? "game" : "Round") + " (10.2, 10.4).");
    if (a.cost > res.ready) warn.push(name + " costs " + a.cost + " " + res.type + " but your Ready cards only provide " + res.ready + " (10.5.1).");
    else if (a.cost > 0) warn.push("Pay " + a.cost + " " + res.type + ": Exhaust a Ready card below (10.5.1).");
    if (a.oncePerGame) i.st.usedGame[name] = true; else if (!a.repeatable) i.st.used[name] = true;
    (b.uses = b.uses || []).push({ r: b.round, p: b.phase, uid: uid, name: name, cost: a.cost });
    log(b, i.unit.name + " used " + name + (a.ability.cost ? " (" + a.ability.cost + ")" : "") + ".");
    return { warnings: warn, cost: a.cost };
  }
  function unuseAbility(C, r, b, uid, name) {
    var st = b.units[uid]; if (st) { delete st.used[name]; delete st.usedGame[name]; }
    for (var k = (b.uses || []).length - 1; k >= 0; k--) if (b.uses[k].uid === uid && b.uses[k].name === name && b.uses[k].r === b.round) { b.uses.splice(k, 1); break; }
  }

  /* ---------- Faction and Tactical Cards (10.5) ---------- */
  function cardList(C, r, b) {
    var out = [], f = C.faction(r);
    if (f) out.push({ key: "f", card: f });
    Object.keys(r.tactical || {}).forEach(function (id) {
      var c = C.cards[id], n = r.tactical[id] || 0; if (!c) return;
      for (var k = 0; k < n; k++) out.push({ key: "t:" + id + ":" + k, card: c, copy: n > 1 ? k + 1 : 0 });
    });
    if (r.creepId && C.cards[r.creepId]) out.push({ key: "c", card: C.cards[r.creepId] });
    out.forEach(function (x) { x.exhausted = !!b.cards[x.key]; x.value = x.card.resource && typeof x.card.resource.value === "number" ? x.card.resource.value : 0; });
    return out;
  }
  function resource(C, r, b) {
    var list = cardList(C, r, b), type = (list[0] && list[0].card.resource && list[0].card.resource.type) || "";
    var ready = 0, total = 0;
    list.forEach(function (x) { total += x.value; if (!x.exhausted) ready += x.value; });
    return { type: type, ready: ready, total: total };
  }
  function toggleCard(C, r, b, key) {
    var x = cardList(C, r, b).filter(function (c) { return c.key === key; })[0]; if (!x) return;
    if (b.cards[key]) {
      delete b.cards[key];
      for (var k = (b.spend || []).length - 1; k >= 0; k--) if (b.spend[k].key === key && b.spend[k].r === b.round) { b.spend.splice(k, 1); break; }
    } else { b.cards[key] = true; (b.spend = b.spend || []).push({ r: b.round, p: b.phase, key: key, card: x.card.name, value: x.value, at: Date.now() }); log(b, x.card.name + " Exhausted."); }
  }

  /* ---------- markers (8.9.1) ---------- */
  function cycleMarker(C, b, n) {
    var mk = b.markers[n]; if (!mk) return;
    mk.own = mk.own === null ? "me" : mk.own === "me" ? "opp" : null;
  }
  /* Fire in the Sky: Sabotage Level 1-3 per Marker (Sabotage Action, Mission Card). */
  function setLevel(C, b, n, delta) {
    var mk = b.markers[n]; if (!mk || mk.lvl == null) return;
    var v = Math.max(1, Math.min(3, mk.lvl + delta));
    if (v !== mk.lvl) { mk.lvl = v; log(b, "Mission Marker " + n + " Sabotage Level " + v + "."); }
  }
  function setMarker(C, b, n, who) { var mk = b.markers[n]; if (mk) mk.own = who === "me" || who === "opp" ? who : null; }

  /* ---------- scoring (8.9.2 + Mission Card) ---------- */
  function markerLines(C, b, who) {
    var m = mission(C, b), id = b.missionId, lines = [], mine = colorOf(b, who), ids = Object.keys(b.markers).map(Number);
    var held = ids.filter(function (n) { return b.markers[n].own === who; });
    var from2 = b.round >= 2, final = b.round >= m.game_length;
    if (id === "hold-position") {
      if (!from2) lines.push({ label: "Mission Markers score from Round 2", vp: 0, note: true });
      else {
        var a = held.filter(function (n) { return affinity(n) === null || affinity(n) === mine; }), o = held.filter(function (n) { return affinity(n) !== null && affinity(n) !== mine; });
        if (a.length) lines.push({ label: a.length + " Controlled Marker" + (a.length > 1 ? "s" : "") + " Neutral or own colour (" + a.join(", ") + ") × 1", vp: a.length });
        if (o.length) lines.push({ label: o.length + " Controlled Marker" + (o.length > 1 ? "s" : "") + " of the Opponent's colour (" + o.join(", ") + ") × 2", vp: o.length * 2 });
      }
    } else if (id === "frontlines") {
      if (!from2) lines.push({ label: "Mission Markers score from Round 2", vp: 0, note: true });
      else {
        if (held.length) lines.push({ label: held.length + " Controlled Marker" + (held.length > 1 ? "s" : "") + " (" + held.join(", ") + ") × 1", vp: held.length });
        var taken = held.filter(function (n) { return b.markers[n].prev === other(who); });
        if (taken.length) lines.push({ label: "Gained Control from the Opponent this Round (" + taken.join(", ") + ") × 2", vp: taken.length * 2 });
      }
    } else if (id === "gather-the-resources") {
      if (!from2) lines.push({ label: "Mission Markers score from Round 2", vp: 0, note: true });
      else {
        var o2 = held.filter(function (n) { return affinity(n) !== null && affinity(n) !== mine; });
        if (o2.length) lines.push({ label: o2.length + " Controlled Marker" + (o2.length > 1 ? "s" : "") + " of the Opponent's colour (" + o2.join(", ") + ") × 2", vp: o2.length * 2 });
      }
      var g = who === "me" ? b.si.gatherMe : b.si.gatherOpp;
      if (g) lines.push({ label: g + " Gather Action" + (g > 1 ? "s" : "") + " × 1", vp: g });
    } else if (id === "divide-and-conquer") {
      var q = who === "me" ? b.si.quartersMe : b.si.quartersOpp;
      if (q) lines.push({ label: q + " battlefield quarter" + (q > 1 ? "s" : "") + " with higher Supply × 1", vp: q });
      if (b.markers[5] && b.markers[5].own === who) lines.push({ label: "Controlling Mission Marker 5", vp: 2 });
    } else if (id === "supply-drop") {
      var first = b.side === "skirmish" ? 2 : 1;
      if (b.round < first) lines.push({ label: "Mission Markers score from Round " + first, vp: 0, note: true });
      else held.filter(function (n) { return b.markers[n].on && !b.markers[n].gone; }).forEach(function (n) {
        lines.push({ label: "Activated Marker " + n + " (Activated in Round " + b.markers[n].ar + "), then remove it", vp: b.markers[n].ar || 0, remove: n });
      });
    } else if (id === "fire-in-the-sky") {
      if (!from2) lines.push({ label: "Mission Markers score from Round 2", vp: 0, note: true });
      else held.filter(function (n) { return affinity(n) === null || affinity(n) !== mine; }).forEach(function (n) {
        var lv = b.markers[n].lvl || 1;
        lines.push({ label: "Controlled Marker " + n + " (" + (affinity(n) === null ? "Neutral" : "Opponent's colour") + "), Sabotage Level " + lv, vp: lv });
      });
    } else if (id === "artefact-hunt") {
      if (final) {
        var per = b.side === "skirmish" ? 3 : 4, per2 = b.side === "skirmish" ? 1 : 2;
        var c = who === "me" ? b.si.claimMe : b.si.claimOpp, s = who === "me" ? b.si.safeMe : b.si.safeOpp;
        if (c) lines.push({ label: c + " Unit" + (c > 1 ? "s" : "") + " that CLAIM a Marker, Wholly Within own Zone of Influence × " + per, vp: c * per });
        if (s) lines.push({ label: s + " own-colour Marker" + (s > 1 ? "s" : "") + " not CLAIMED by an Enemy Unit × " + per2, vp: s * per2 });
      } else lines.push({ label: "Markers score at the End of Round " + m.game_length, vp: 0, note: true });
    }
    return lines;
  }
  function suggestion(C, r, b) {
    var lost = lostThisRound(C, r, b), out = { me: { lines: [] }, opp: { lines: [] } };
    var el = enemyLost(C, b);
    if (el.total) out.me.lines.push({ label: "Enemy Supply destroyed this Round" + (el.tracked ? " (tracked " + el.auto + (el.reserves ? ", incl. " + el.reserves + " in Reserves" : "") + (el.adj ? (el.adj > 0 ? ", +" : ", ") + el.adj + " adjusted" : "") + ")" : ""), vp: el.total });
    if (lost.lost) out.opp.lines.push({ label: "Your Supply destroyed this Round", vp: lost.lost });
    if (lost.reserves) out.opp.lines.push({ label: "Your Units still in Reserves count as Destroyed (8.10)", vp: lost.reserves });
    out.me.lines = out.me.lines.concat(markerLines(C, b, "me"));
    out.opp.lines = out.opp.lines.concat(markerLines(C, b, "opp"));
    var mineLeft = infos(C, r, b).some(function (i) { return i.state !== "dead" && !i.summoned; });
    if (!mineLeft) out.opp.lines.push({ label: "You have no models on the battlefield and no Units in Reserves (8.9.3)", vp: 10, wipe: "me" });
    if (b.si.oppWiped) out.me.lines.push({ label: "The Opponent has no models on the battlefield and no Units in Reserves (8.9.3)", vp: 10, wipe: "opp" });
    ["me", "opp"].forEach(function (w) { out[w].total = sum(out[w].lines.map(function (l) { return l.vp; })); });
    return out;
  }
  function totals(b) { return { me: sum(b.vp.me), opp: sum(b.vp.opp) }; }

  function confirmScores(C, r, b, me, opp) {
    var m = mission(C, b), sg = suggestion(C, r, b);
    me = Math.max(0, Math.floor(Number(me) || 0)); opp = Math.max(0, Math.floor(Number(opp) || 0));
    b.vp.me[b.round - 1] = me; b.vp.opp[b.round - 1] = opp; b.scored = true;
    var mk = {}; Object.keys(b.markers).forEach(function (n) { mk[n] = b.markers[n].gone ? "gone" : b.markers[n].own; });
    b.rounds[b.round] = { at: Date.now(), vp: [me, opp], markers: mk, enemyLost: enemyLost(C, b).total, myLost: lostThisRound(C, r, b).total, fpm: b.fpmStart,
      spent: sum((b.spend || []).filter(function (x) { return x.r === b.round; }).map(function (x) { return x.value; })) };
    if (b.missionId === "supply-drop") sg.me.lines.concat(sg.opp.lines).forEach(function (l) { if (l.remove && b.markers[l.remove]) { b.markers[l.remove].gone = true; b.markers[l.remove].on = false; b.markers[l.remove].own = null; } });
    var t = totals(b);
    log(b, "Round " + b.round + " scored: you " + me + ", opponent " + opp + ". Total " + t.me + " to " + t.opp + ".");
    var wiped = sg.me.lines.concat(sg.opp.lines).some(function (l) { return l.wipe; });
    var lead = Math.abs(t.me - t.opp), final = b.round >= m.game_length;
    if (m.special_win_lead && lead >= m.special_win_lead) b.over = { reason: "Special Winning Condition: a lead of " + m.special_win_lead + " or more VPs.", winner: t.me > t.opp ? "me" : "opp" };
    else if (wiped) b.over = { reason: "A player has no models on the battlefield and no Units in Reserves (8.9.3).", winner: t.me > t.opp ? "me" : t.opp > t.me ? "opp" : "draw" };
    else if (final) b.over = { reason: "Round " + b.round + " was the final Round (8.10).", winner: t.me > t.opp ? "me" : t.opp > t.me ? "opp" : "draw" };
    if (b.over) { b.over.at = Date.now(); mark(b); }
    if (b.over) log(b, "Game over. " + (b.over.winner === "me" ? "You win" : b.over.winner === "opp" ? "The opponent wins" : "Draw") + " " + t.me + " to " + t.opp + ".");
    return b.over;
  }
  /* 8.9.4-8.9.6: End of the Round effects, Cleanup & Refresh, then initiative to the player with fewer VPs. */
  function nextRound(C, r, b) {
    if (b.over) return;
    var t = totals(b);
    b.rollOff = t.me === t.opp;
    if (!b.rollOff) b.fpm = t.me < t.opp ? "me" : "opp";
    b.round++;
    startRound(C, r, b);
    mark(b);
    log(b, "Round " + b.round + " begins. " + (b.rollOff ? "VPs are tied: Roll-Off for the First Player Marker." : (b.fpm === "me" ? "You hold" : "The opponent holds") + " the First Player Marker (fewer VPs)."));
  }
  /* Units Engaged in the Combat Phase must activate (8.8). */
  function phaseWarnings(C, r, b) {
    var w = [];
    if (b.phase === 3) infos(C, r, b).forEach(function (i) { if (i.state === "fld" && i.st.eng && !i.st.act[2]) w.push(i.unit.name + " is Engaged and has not made its Close Combat Attack."); });
    if (b.phase === 1 && activationDue(C, b)) w.push("Supply Drop: flip a Mission Marker to its Activated side for this Round.");
    return w;
  }
  function advance(C, r, b, passedFirst) {
    if (b.over || b.phase >= 4) return;
    if (b.phase <= 2 && (passedFirst === "me" || passedFirst === "opp")) { b.fpm = passedFirst; log(b, (passedFirst === "me" ? "You" : "The opponent") + " passed first and took the First Player Marker (8.2.1)."); }
    b.phase++;
    b.rollOff = false;
    mark(b);
    log(b, PHASES[b.phase] + " Phase.");
  }
  function back(C, r, b) { if (b.phase > 1 && !b.over) { b.phase--; mark(b); } }
  /* Roll-Off result for the First Player Marker (8.9.6). */
  function setFpm(C, b, who) { b.fpm = who === "opp" ? "opp" : "me"; b.rollOff = false; if (b.phase === 1) b.fpmStart = b.fpm; log(b, (b.fpm === "me" ? "You take" : "The opponent takes") + " the First Player Marker (Roll-Off)."); }

  /* ---------- summoned units (9.1.9) ---------- */
  function summonable(C, r) {
    var f = C.faction(r); if (!f) return [];
    return C.data.units.filter(function (u) { return u.summoned && u.faction_tags.every(function (t) { return f.faction_tags.indexOf(t) !== -1; }); });
  }
  function addSummoned(C, r, b, unitId) {
    var u = C.units[unitId]; if (!u || !u.summoned) return null;
    var uid = "s_" + Math.random().toString(36).slice(2, 9), s = { uid: uid, unitId: unitId, start: maxModels(u) };
    b.summoned.push(s); sync(C, r, b);
    b.units[uid].st = "fld"; if (b.phase <= 3) { b.units[uid].act[b.phase - 1] = true; b.units[uid].an[b.phase - 1] = "summoned"; } // Part 11 SUMMON: cannot be Activated in the Phase it was summoned
    log(b, u.name + " Summoned.");
    return uid;
  }
  function removeSummoned(C, r, b, uid) { b.summoned = b.summoned.filter(function (s) { return s.uid !== uid; }); delete b.units[uid]; }

  /* ---------- the opponent's army (tracked from your side) ----------
     A list (pasted text or a SurgeCraft share code) becomes b.opp: one entry per Unit with its starting and current model count.
     Supply comes from each Unit's printed supply profile, the same way as your own Units. */
  function ouid() { return "o_" + Math.random().toString(36).slice(2, 9); }
  function oppFrom(C, list) {
    var o = { name: list.name || "", player: list.player || "", race: list.race || null, factionId: list.factionId || null,
      tactical: list.tactical || {}, creepId: list.creepId || null, units: {}, order: [], summonable: (list.summonable || []).slice() };
    (list.units || []).forEach(function (x) {
      var u = C.units[x.unitId]; if (!u) return;
      var n = Math.max(1, Math.floor(Number(x.models) || 1)), id = ouid();
      o.units[id] = { uid: id, unitId: x.unitId, start: n, m: n, st: "fld", upgrades: (x.upgrades || []).slice(), s0: supplyFor(u, n), summoned: !!u.summoned };
      o.order.push(id);
    });
    if (!o.race && o.order.length) o.race = C.units[o.units[o.order[0]].unitId].race;
    return o;
  }
  function oppInfo(C, b, uid) {
    var o = b.opp && b.opp.units[uid]; if (!o) return null;
    var u = C.units[o.unitId]; if (!u) return null;
    var models = o.st === "dead" ? 0 : o.m;
    return { uid: uid, unit: u, name: u.name, st: o, state: o.st, models: models, start: o.start, supplyNow: supplyFor(u, models), s0: o.s0, summoned: o.summoned, upgrades: o.upgrades };
  }
  function oppInfos(C, b) { return b.opp ? b.opp.order.map(function (id) { return oppInfo(C, b, id); }).filter(Boolean) : []; }
  function setOpp(C, b, list) { b.opp = list ? oppFrom(C, list) : null; if (b.opp) oppInfos(C, b).forEach(function (o) { o.st.s0 = o.supplyNow; }); log(b, b.opp ? "Opponent's list added: " + b.opp.order.length + " Units." : "Opponent's list removed."); }
  function oppChange(C, b, uid, delta) {
    var i = oppInfo(C, b, uid); if (!i) return;
    var cap = i.summoned ? Math.max(i.start, maxModels(i.unit)) : i.start, o = i.st;
    var n = Math.max(0, Math.min(cap, i.models + delta));
    if (n === 0) { o.st = "dead"; o.m = 0; o.deadR = b.round; log(b, "Opponent's " + i.name + " Destroyed."); return; }
    if (o.st === "dead") { o.st = "fld"; delete o.deadR; }
    o.m = n; if (delta < 0) log(b, "Opponent's " + i.name + ": " + n + " of " + i.start + " models left.");
  }
  function oppSetState(C, b, uid, state) {
    var i = oppInfo(C, b, uid); if (!i) return; var o = i.st;
    if (state === "dead") { o.st = "dead"; o.m = 0; o.deadR = b.round; log(b, "Opponent's " + i.name + " Destroyed."); }
    else if (state === "res") { o.st = "res"; if (o.m <= 0) o.m = o.start; delete o.deadR; }
    else { o.st = "fld"; if (o.m <= 0) o.m = 1; delete o.deadR; }
  }
  /* A Unit the list missed, or one the opponent Summoned during the game. */
  function oppAdd(C, b, unitId, models) {
    var u = C.units[unitId]; if (!u) return null;
    if (!b.opp) b.opp = { name: "", player: "", race: u.race, factionId: null, tactical: {}, creepId: null, units: {}, order: [], summonable: [] };
    var n = Math.max(1, Math.floor(Number(models) || (u.summoned ? maxModels(u) : 1))), id = ouid();
    b.opp.units[id] = { uid: id, unitId: unitId, start: n, m: n, st: "fld", upgrades: [], s0: supplyFor(u, n), summoned: !!u.summoned, added: b.round };
    b.opp.order.push(id);
    log(b, "Opponent's " + u.name + (u.summoned ? " Summoned." : " added to the tracked list."));
    return id;
  }
  function oppRemove(C, b, uid) { if (!b.opp || !b.opp.units[uid]) return; delete b.opp.units[uid]; b.opp.order = b.opp.order.filter(function (x) { return x !== uid; }); }
  /* Enemy Supply destroyed this Round: the opponent's tracked losses by the same rule as yours (lostThisRound),
     plus any manual adjustment in b.si.enemyLost. Without a tracked list, the manual figure is the whole value. */
  function enemyLost(C, b) {
    var m = mission(C, b), final = m && b.round >= m.game_length, list = oppInfos(C, b), auto = 0, reserves = 0;
    list.forEach(function (o) {
      if (o.summoned) return;
      if (final && o.state === "res") { reserves += o.s0; return; }
      auto += Math.max(0, o.s0 - (o.state === "dead" ? 0 : o.supplyNow));
    });
    var tracked = list.length > 0, adj = Number(b.si.enemyLost) || 0, base = tracked ? auto + reserves : 0;
    return { tracked: tracked, auto: auto + reserves, reserves: reserves, adj: adj, total: Math.max(0, base + adj) };
  }
  /* "Killed a model": dir "dealt" = your Unit removed a model from an enemy Unit; dir "taken" = an enemy Unit removed one of yours. */
  function kill(C, r, b, myUid, oppUid, dir) {
    var me = info(C, r, b, myUid), op = oppUid ? oppInfo(C, b, oppUid) : null, at = Date.now();
    if (!me || (dir === "dealt" && !op)) return { warnings: [] };
    if (dir === "dealt") {
      if (op.models <= 0) return { warnings: ["That enemy Unit has no models left."] };
      b.kills.push({ r: b.round, p: b.phase, at: at, by: { s: "me", uid: myUid }, to: { s: "opp", uid: oppUid } });
      log(b, me.unit.name + " killed a model from the opponent's " + op.name + ".");
      oppChange(C, b, oppUid, -1);
    } else {
      if (me.models <= 0) return { warnings: [me.unit.name + " has no models left."] };
      b.kills.push({ r: b.round, p: b.phase, at: at, by: op ? { s: "opp", uid: oppUid } : null, to: { s: "me", uid: myUid } });
      log(b, (op ? "The opponent's " + op.name : "The opponent") + " killed a model from " + me.unit.name + ".");
      if (me.casualtyDue) removeCasualty(C, r, b, myUid); else changeModels(C, r, b, myUid, -1);
    }
    return { warnings: [] };
  }

  /* ---------- reading an opponent's list ----------
     Accepts text lists in the Tabletop Simulator export layout (as SurgeCraft writes it), tolerating extra spaces
     and blank lines. Names are matched to the unit cards (exact, then without "(Base unit)", then singular/plural);
     anything not matched is returned in .unmatched for the player to fix. */
  function norm(s) { return String(s || "").toLowerCase().replace(/[’']/g, "").replace(/[^a-z0-9()]+/g, " ").replace(/\s+/g, " ").trim(); }
  function bare(s) { return norm(String(s || "").replace(/\([^)]*\)/g, " ")); }
  function forms(s) { var a = [s]; if (/ies$/.test(s)) a.push(s.slice(0, -3) + "y"); if (/es$/.test(s)) a.push(s.slice(0, -2)); if (/s$/.test(s)) a.push(s.slice(0, -1)); return a; }
  function matchUnit(C, name, race) {
    var pool = C.data.units.filter(function (u) { return !race || u.race === race; });
    var n = norm(name), nb = bare(name), hit;
    hit = pool.filter(function (u) { return norm(u.name) === n; }); if (hit.length) return hit[0];
    var fs = forms(n).concat(forms(nb)), k;
    for (k = 0; k < fs.length; k++) { hit = pool.filter(function (u) { return norm(u.name) === fs[k]; }); if (hit.length === 1) return hit[0]; }
    for (k = 0; k < fs.length; k++) { hit = pool.filter(function (u) { return bare(u.name) === fs[k]; }); if (hit.length === 1) return hit[0]; }
    return null;
  }
  function matchCard(C, name, kind, race) {
    var n = norm(name);
    return C.data.cards.filter(function (c) { return (!kind || c.kind === kind) && (!race || c.race === race) && norm(c.name) === n; })[0] || null;
  }
  function matchUpgrade(u, name) { var n = norm(name); return (u.upgrades || []).filter(function (x) { return norm(x.name) === n; })[0] || null; }
  function parseList(C, text) {
    var out = { name: "", player: "", race: null, factionId: null, tactical: {}, creepId: null, units: [], unmatched: [], summonable: [], ignoredUpgrades: [] };
    var lines = String(text || "").split(/\r?\n/).map(function (l) { return l.replace(/\s+/g, " ").trim(); }).filter(Boolean);
    var sec = null, last = null;
    lines.forEach(function (line) {
      var h;
      if (/^created with/i.test(line)) return;
      if ((h = /^(Terran|Protoss|Zerg)\s*-\s*(.*?)\s*\(\s*[\d,]+\s*Minerals/i.exec(line))) { out.race = h[1][0].toUpperCase() + h[1].slice(1).toLowerCase(); out.name = h[2]; return; }
      if (/^\d+\s*Supply\b/i.test(line) || /^Deployment Maps?\s*:/i.test(line) || /^Mission Cards?\s*:/i.test(line)) return;
      if ((h = /^#\s*([^:]+?)\s*(?::\s*(.*))?$/.exec(line))) {
        var k = h[1].toLowerCase(); h[2] = h[2] || ""; sec = /faction/.test(k) ? "faction" : /tactic/.test(k) ? "tactical" : /creep/.test(k) ? "creep" : /unit/.test(k) ? "units" : null;
        line = h[2]; if (!line) return;
      }
      var um = /^(\d+)\s*x\s+(.+)$/i.exec(line);
      if (um || sec === "units") {
        var models = um ? Number(um[1]) : 1, rest = um ? um[2] : line, nm = rest, ups = [];
        var cm = /^(.*?)\s*\(\s*[\d,]+\s*,\s*\d+\s*S\s*\)\s*(?::\s*(.*))?$/i.exec(rest);
        if (cm) { nm = cm[1]; ups = cm[2] ? cm[2].split(/\s*,\s*/).filter(Boolean) : []; }
        else if (rest.indexOf(":") !== -1) { nm = rest.slice(0, rest.indexOf(":")); ups = rest.slice(rest.indexOf(":") + 1).split(/\s*,\s*/).filter(Boolean); }
        var u = matchUnit(C, nm, out.race);
        if (u && u.summoned && !um) { if (out.summonable.indexOf(u.id) === -1) out.summonable.push(u.id); return; }
        if (!um && last && !u) { var up0 = matchUpgrade(C.units[last.unitId], line); if (up0) { last.upgrades.push(up0.name); return; } }
        if (!u) { out.unmatched.push({ line: line, name: nm.trim(), models: models, upgrades: ups }); return; }
        if (!out.race) out.race = u.race;
        var e = { unitId: u.id, models: models, upgrades: [], line: line };
        ups.forEach(function (x) { var up = matchUpgrade(u, x); if (up) e.upgrades.push(up.name); else out.ignoredUpgrades.push(u.name + ": " + x); });
        out.units.push(e); last = e; return;
      }
      if (sec === "faction") { var f = matchCard(C, line, "Faction"); if (f) { out.factionId = f.id; if (!out.race) out.race = f.race; } else out.unmatched.push({ line: line, card: "Faction" }); return; }
      if (sec === "tactical" || sec === "creep") {
        var cn = line.replace(/\s*[x×]\s*(\d+)$/i, ""), cnt = Number((/[x×]\s*(\d+)$/i.exec(line) || [0, 1])[1]);
        var c = matchCard(C, cn, sec === "creep" ? "Creep" : null);
        if (c && c.kind === "Creep") out.creepId = c.id; else if (c) out.tactical[c.id] = (out.tactical[c.id] || 0) + cnt; else out.unmatched.push({ line: line, card: sec === "creep" ? "Creep" : "Tactical" });
        return;
      }
    });
    return out;
  }
  /* A roster from a SurgeCraft share code or roster file (already normalised by RosterCore) as an opponent list. */
  function listFromRoster(C, r) {
    var summonable = [];
    return { name: r.name || "", player: r.player || "", race: r.race || null, factionId: r.factionId || null, tactical: r.tactical || {}, creepId: r.creepId || null,
      units: (r.units || []).map(function (e) { return { unitId: e.unitId, models: e.models, upgrades: (e.upgrades || []).slice() }; }), unmatched: [], summonable: summonable, ignoredUpgrades: [] };
  }

  /* ---------- finished battles ----------
     A copy of the battle with the roster as it was, kept on the roster (r.history, newest first) for the battle report. */
  function historyEntry(C, r, b) {
    var roster = clone(r); delete roster.history; delete roster.battle; // keeps unit ids, which the battle state is keyed by
    return { id: "h_" + Math.random().toString(36).slice(2, 9), endedAt: Date.now(), battle: clone(b), roster: roster };
  }

  var Battle = {
    PHASES: PHASES, ACTIONS: ACTIONS, STATUS: STATUS, clone: clone, affinity: affinity, markerIds: markerIds, supplyFor: supplyFor, maxModels: maxModels,
    side: side, mission: mission, colorOf: colorOf, create: create, sync: sync, info: info, infos: infos, supply: supply, lostThisRound: lostThisRound,
    activationDue: activationDue, activateMarker: activateMarker, startNotes: startNotes, actionsFor: actionsFor, act: act, clearAct: clearAct,
    setState: setState, changeModels: changeModels, changeDamage: changeDamage, removeCasualty: removeCasualty, toggleStatus: toggleStatus, toggleEngaged: toggleEngaged,
    statusKeys: statusKeys, abilitiesFor: abilitiesFor, useAbility: useAbility, unuseAbility: unuseAbility, cardList: cardList, resource: resource, toggleCard: toggleCard,
    cycleMarker: cycleMarker, setMarker: setMarker, setLevel: setLevel, suggestion: suggestion, totals: totals, confirmScores: confirmScores, nextRound: nextRound,
    phaseWarnings: phaseWarnings, advance: advance, back: back, summonable: summonable, addSummoned: addSummoned, removeSummoned: removeSummoned, hasAssaultWeapon: hasAssaultWeapon,
    upgrade: upgrade, setFpm: setFpm, oppFrom: oppFrom, oppInfo: oppInfo, oppInfos: oppInfos, setOpp: setOpp, oppChange: oppChange, oppSetState: oppSetState, oppAdd: oppAdd, oppRemove: oppRemove,
    enemyLost: enemyLost, kill: kill, parseList: parseList, listFromRoster: listFromRoster, matchUnit: matchUnit, historyEntry: historyEntry
  };
  if (typeof module !== "undefined" && module.exports) module.exports = Battle; else root.Battle = Battle;
})(this);
