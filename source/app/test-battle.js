const Core = require("./roster-core.js"), B = require("./battle-core.js");
const data = require("/home/claude/sc_data/starcraft_tmg_data.json");
const C = new Core(data);
let fails = 0;
const eq = (label, got, exp) => { const ok = JSON.stringify(got) === JSON.stringify(exp); if (!ok) fails++; console.log((ok ? "PASS " : "FAIL ") + label + (ok ? "" : `  got=${JSON.stringify(got)} exp=${JSON.stringify(exp)}`)); };
const mk = (race, faction, tac, units, scale) => { const r = C.newRoster(); r.race = race; r.factionId = faction; r.scale = scale || "standard"; tac.forEach(id => r.tactical[id] = (r.tactical[id]||0)+1);
  units.forEach(([id,m,ups]) => { const e = C.newEntry(id); e.models = m; (ups||[]).forEach(u=>e.upgrades.push(u)); r.units.push(e); }); return r; };

// --- supply profile (Marine card: 1-3 = 0, 4-6 = 1, 7-9 = 2; rulebook 6.1 example) ---
const mar = C.units.marine;
eq("9 Marines supply 2", B.supplyFor(mar, 9), 2); eq("6 Marines supply 1", B.supplyFor(mar, 6), 1); eq("3 Marines supply 0", B.supplyFor(mar, 3), 0); eq("0 models supply 0", B.supplyFor(mar, 0), 0);

const r = mk("Terran","raynors-raiders",["barracks","barracks","academy"],[["marine",9],["marine",6],["marauder",4],["medic",3,["Advanced Medic Facilities"]],["jim-raynor",1]]);
const b = B.create(C, r, { missionId: "frontlines", deploymentId: "gauntlet", color: "red", fpm: "me" });
const U = r.units.map(e => e.uid);
eq("markers standard 1-5", Object.keys(b.markers).map(Number), [1,2,3,4,5]);
eq("round 1 pool = 6 (Frontlines)", B.supply(C,r,b).pool, 6);
eq("all start in Reserves", B.infos(C,r,b).every(i => i.state === "res"), true);
eq("reserve unit only action: deploy", B.actionsFor(C,r,b,U[0]), ["deploy"]);
let res = B.act(C,r,b,U[0],"deploy"); eq("deploy 9 Marines ok", res.warnings, []);
eq("on table 2, available 4", [B.supply(C,r,b).onTable, B.supply(C,r,b).available], [2,4]);
B.act(C,r,b,U[2],"deploy"); B.act(C,r,b,U[1],"deploy");
eq("on table 5", B.supply(C,r,b).onTable, 5);
res = B.act(C,r,b,U[4],"deploy"); eq("Raynor fits exactly (1 of 1)", res.warnings, []);
res = B.act(C,r,b,U[3],"deploy"); eq("Medics with Advanced Medic Facilities count 0 toward pool", [res.warnings, B.supply(C,r,b).onTable], [[],6]);
eq("deployed units lose Stationary", !!b.units[U[0]].stat.stationary, false);
res = B.act(C,r,b,U[0],"move"); eq("second activation warns", res.warnings.length, 1);
// over-supply warning
const r2 = mk("Terran","terran-armed-forces",["barracks"],[["marine",9],["marine",9],["marine",9],["marauder",4]]);
const b2 = B.create(C, r2, { missionId: "hold-position", color: "blue", fpm: "opp" });
r2.units.slice(0,3).forEach(e => B.act(C,r2,b2,e.uid,"deploy"));
res = B.act(C,r2,b2,r2.units[3].uid,"deploy"); eq("deploy over Available Supply warns but is allowed", [res.warnings.length, b2.units[r2.units[3].uid].st], [1,"fld"]);
B.clearAct(C,r2,b2,r2.units[3].uid); eq("undoing a deploy returns the unit to Reserves", b2.units[r2.units[3].uid].st, "res");

// --- pass, phases ---
B.advance(C,r,b,"opp"); eq("phase 2, opponent passed first holds FPM", [b.phase,b.fpm], [2,"opp"]);
eq("assault actions unengaged", B.actionsFor(C,r,b,U[0]), ["ranged","charge","run","hold2"]);
res = B.act(C,r,b,U[3],"ranged"); eq("Medic Ranged Attack warns (no Assault weapon)", res.warnings.length, 1);
B.clearAct(C,r,b,U[3]);
res = B.act(C,r,b,U[2],"charge"); eq("charge engages", b.units[U[2]].eng, true);
B.advance(C,r,b,"me"); eq("phase 3", b.phase, 3);
eq("only engaged units act in combat", [B.actionsFor(C,r,b,U[2]), B.actionsFor(C,r,b,U[0])], [["fight"],[]]);
eq("combat warning for unfought engaged unit", B.phaseWarnings(C,r,b).length, 1);
B.act(C,r,b,U[2],"fight"); eq("no warning after fighting", B.phaseWarnings(C,r,b).length, 0);

// --- damage: Marine HP 2 ---
B.changeDamage(C,r,b,U[0],3); let i = B.info(C,r,b,U[0]); eq("damage 3 vs HP 2: casualty due", i.casualtyDue, true);
B.removeCasualty(C,r,b,U[0]); i = B.info(C,r,b,U[0]); eq("8 models, damage 1", [i.models, i.st.d], [8,1]);
B.changeModels(C,r,b,U[0],-2); i = B.info(C,r,b,U[0]); eq("6 Marines: supply drops to 1", i.supplyNow, 1);
eq("lost this round = 1", B.lostThisRound(C,r,b).lost, 1);
B.setState(C,r,b,U[4],"dead"); eq("Raynor destroyed: lost 2 total", B.lostThisRound(C,r,b).lost, 2);

// --- scoring: Frontlines round 1 scores supply only ---
B.advance(C,r,b); eq("phase 4", b.phase, 4);
B.setMarker(C,b,1,"me"); B.setMarker(C,b,2,"opp"); b.si.enemyLost = 1;
let s = B.suggestion(C,r,b); eq("R1 Frontlines: me 1 (supply), opp 2 (supply), markers from round 2", [s.me.total, s.opp.total], [1,2]);
B.confirmScores(C,r,b,s.me.total,s.opp.total); eq("not over", b.over, null);
b.cards["f"] = true; b.units[U[0]].stat.buff = true;
B.nextRound(C,r,b);
eq("round 2: FPM to player with fewer VP (me)", [b.round,b.phase,b.fpm], [2,1,"me"]);
eq("round 2 pool 8", B.supply(C,r,b).pool, 8);
eq("cards refreshed, buff cleared, activations cleared, Stationary regained", [b.cards.f, b.units[U[0]].stat.buff, b.units[U[0]].act, b.units[U[0]].stat.stationary], [undefined, undefined, [false,false,false], true]);
eq("supply baseline reset: nothing lost yet in round 2", B.lostThisRound(C,r,b).lost, 0);
// Frontlines round 2: I hold 1 and take 2 from the opponent; opp takes nothing
b.phase = 4; B.setMarker(C,b,2,"me");
s = B.suggestion(C,r,b); eq("R2 Frontlines: 2 held + 2 for retaking Marker 2 = 4", s.me.total, 4);
eq("opp holds none", s.opp.total, 0);

// --- Hold Position colours: I am Red; Marker 2 is Blue (opponent's), 1 Red, 5 Neutral ---
const bh = B.create(C, r, { missionId: "hold-position", color: "red" }); bh.round = 2; bh.phase = 4;
B.setMarker(C,bh,1,"me"); B.setMarker(C,bh,2,"me"); B.setMarker(C,bh,5,"me"); B.setMarker(C,bh,3,"opp"); B.setMarker(C,bh,4,"opp");
s = B.suggestion(C,r,bh); eq("Hold Position: 1 + 1 + 2 = 4; opp: Marker 3 (Red, my colour = opponent's colour for them) 2 + Marker 4 (own) 1 = 3", [s.me.total, s.opp.total], [4,3]);
// --- Gather the Resources ---
const bg = B.create(C, r, { missionId: "gather-the-resources", color: "blue" }); bg.round = 3; bg.phase = 2;
r.units.forEach(e => bg.units[e.uid].st = "fld");
eq("gather action offered", B.actionsFor(C,r,bg,U[0]).includes("gather"), true);
B.act(C,r,bg,U[0],"gather"); bg.phase = 4; B.setMarker(C,bg,1,"me"); B.setMarker(C,bg,2,"me");
s = B.suggestion(C,r,bg); eq("Gather: Marker 1 is Red (opponent's) 2 VP + 1 gather = 3", s.me.total, 3);
// --- Fire in the Sky (cards v1.09.26) ---
const bfi = B.create(C, r, { missionId: "fire-in-the-sky", color: "red" });
eq("Fire in the Sky: Standard pool 5, +3 per Round, lead 10", [B.supply(C,r,bfi).pool, B.mission(C,bfi).supply_per_round, B.mission(C,bfi).special_win_lead], [5,3,10]);
eq("every Marker starts at Sabotage Level 1", Object.keys(bfi.markers).map(n => bfi.markers[n].lvl), [1,1,1,1,1]);
bfi.phase = 2; r.units.forEach(e => bfi.units[e.uid].st = "fld"); bfi.units[U[0]].eng = false;
eq("sabotage action offered to an Unengaged Unit", B.actionsFor(C,r,bfi,U[0]).includes("sabotage"), true);
bfi.units[U[1]].eng = true; eq("no sabotage while Engaged", B.actionsFor(C,r,bfi,U[1]).includes("sabotage"), false);
B.setMarker(C,bfi,2,"me"); res = B.act(C,r,bfi,U[0],"sabotage"); eq("sabotage with a Controlled Marker gives only the level hint", res.warnings.length, 1);
B.setLevel(C,bfi,2,1); B.setLevel(C,bfi,2,1); B.setLevel(C,bfi,2,1); eq("Sabotage Level capped at 3", bfi.markers[2].lvl, 3);
B.setLevel(C,bfi,5,-1); eq("Sabotage Level floor 1", bfi.markers[5].lvl, 1);
bfi.phase = 4; s = B.suggestion(C,r,bfi); eq("Round 1: Markers do not score yet", s.me.total, 0);
bfi.round = 2; B.setMarker(C,bfi,1,"me"); B.setMarker(C,bfi,5,"me"); B.setLevel(C,bfi,5,1);
s = B.suggestion(C,r,bfi); eq("Red player: Marker 2 (Blue) lvl 3 + Marker 5 (Neutral) lvl 2; own-colour Marker 1 scores nothing", s.me.total, 5);
B.setMarker(C,bfi,3,"opp"); bfi.markers[3].lvl = 2; s = B.suggestion(C,r,bfi); eq("opponent (Blue) scores Red Marker 3 at its level", s.opp.total, 2);
const rfs = mk("Terran","terran-armed-forces",["barracks"],[["marine",6]],"skirmish"); const bfs = B.create(C, rfs, { missionId: "fire-in-the-sky", color: "blue" });
eq("Fire in the Sky Skirmish: pool 3, +2, lead 8, Markers 1, 2, 5", [B.supply(C,rfs,bfs).pool, B.mission(C,bfs).supply_per_round, B.mission(C,bfs).special_win_lead, Object.keys(bfs.markers).map(Number)], [3,2,8,[1,2,5]]);
// --- Divide and Conquer ---
const bd = B.create(C, r, { missionId: "divide-and-conquer", color: "red" }); bd.phase = 4; bd.si.quartersMe = 2; bd.si.quartersOpp = 1; B.setMarker(C,bd,5,"opp");
s = B.suggestion(C,r,bd); eq("Divide and Conquer round 1: 2 quarters; opp 1 quarter + 2 for Marker 5 (+ reserves not counted before final round)", [s.me.total, s.opp.total], [2,3]);
eq("Divide and Conquer standard: 8 supply, 4 rounds", [B.mission(C,bd).deploy_supply, B.mission(C,bd).game_length], [8,4]);
// --- Supply Drop ---
const bs = B.create(C, r, { missionId: "supply-drop", color: "red" });
eq("Supply Drop: all Deactivated, activation due from 1-4", [Object.values(bs.markers).some(m=>m.on), B.activationDue(C,bs).pool], [false,[1,2,3,4]]);
B.activateMarker(C,bs,3); eq("after activation none due this round", B.activationDue(C,bs), null);
bs.phase = 4; B.setMarker(C,bs,3,"me"); s = B.suggestion(C,r,bs); eq("Marker 3 activated round 1 → 1 VP", s.me.total, 1);
B.confirmScores(C,r,bs,1,0); eq("scored marker removed", [bs.markers[3].gone, bs.markers[3].own], [true,null]);
B.nextRound(C,r,bs); eq("round 2 pool excludes removed/activated", B.activationDue(C,bs).pool, [1,2,4]);
bs.round = 5; eq("round 5: Marker 5 automatic", B.activationDue(C,bs).auto, 5);
// --- skirmish markers, Supply Drop skirmish from round 2 ---
const rs = mk("Zerg","zerg-swarm",["spawning-pool"],[["zergling",12],["roach",3]],"skirmish"); rs.creepId = "accelerating-creep";
const bk = B.create(C, rs, { missionId: "supply-drop", color: "blue" });
eq("skirmish markers 1,2,5", Object.keys(bk.markers).map(Number), [1,2,5]);
eq("skirmish Supply Drop: nothing activates in round 1", B.activationDue(C,bk), null);
eq("skirmish pool 4, +1/round, 4 rounds", [B.supply(C,rs,bk).pool, B.mission(C,bk).supply_per_round, B.mission(C,bk).game_length], [4,1,4]);
eq("Zerg ground unit offers Burrowed", B.statusKeys(C,rs,B.info(C,rs,bk,rs.units[1].uid)).includes("burrowed"), true);
B.toggleStatus(C,rs,bk,rs.units[1].uid,"burrowed"); eq("Burrowed also grants Hidden", bk.units[rs.units[1].uid].stat.hidden, true);
bk.units[rs.units[1].uid].st = "fld"; let rr = B.act(C,rs,bk,rs.units[1].uid,"move"); eq("moving removes Burrowed and Hidden", [bk.units[rs.units[1].uid].stat.burrowed, bk.units[rs.units[1].uid].stat.hidden, rr.warnings.length], [undefined, undefined, 1]);
eq("card list: faction + tactical + creep", B.cardList(C,rs,bk).map(c=>c.key), ["f","t:spawning-pool:0","c"]);
eq("BM ready 2 of 2 (creep card has no printed value)", B.resource(C,rs,bk), {type:"BM",ready:2,total:2});
B.toggleCard(C,rs,bk,"f"); eq("exhaust faction card: 1 ready", B.resource(C,rs,bk).ready, 1);
eq("summonable for Zerg Swarm", B.summonable(C,rs).map(u=>u.id), ["roachling"]);
const sid = B.addSummoned(C,rs,bk,"roachling"); eq("summoned on battlefield, marked activated this phase, 3 models", [bk.units[sid].st, bk.units[sid].act[0], bk.units[sid].m], ["fld", true, 3]);
// --- shields: Zealot HP 4, Shield 3 ---
const rp = mk("Protoss","daelaam",["gateway"],[["zealot",3]]); const bp = B.create(C, rp, { missionId: "artefact-hunt", color: "red" }); const z = rp.units[0].uid; bp.units[z].st = "fld";
let zi = B.info(C,rp,bp,z); eq("Zealot first model needs HP 4 + Shield 3 = 7", [zi.threshold, zi.shielded], [7,true]);
B.changeDamage(C,rp,bp,z,4); zi = B.info(C,rp,bp,z); eq("4 damage > Shield 3: Shielded lost, no casualty yet", [zi.shielded, zi.casualtyDue], [false,false]);
B.changeDamage(C,rp,bp,z,-4); eq("healing does not restore Shielded", B.info(C,rp,bp,z).shielded, false);
B.changeDamage(C,rp,bp,z,7); B.removeCasualty(C,rp,bp,z); zi = B.info(C,rp,bp,z); eq("after first casualty threshold is HP 4", [zi.models, zi.st.d, zi.threshold], [2,0,4]);
// --- abilities ---
bp.phase = 2; let ab = B.abilitiesFor(C,rp,bp,z).map(a=>a.ability.name); eq("Zealot assault abilities include Charge", ab.includes("Charge"), true);
let ua = B.useAbility(C,rp,bp,z,"Charge"); eq("Charge costs 1 PE: reminder to exhaust", ua.cost, 1);
ua = B.useAbility(C,rp,bp,z,"Charge"); eq("second use this round warns", /already used/.test(ua.warnings[0]), true);
// --- Artefact Hunt final round + reserves destroyed + game end ---
bp.round = 5; bp.phase = 4; bp.si.claimMe = 1; bp.si.safeMe = 2;
s = B.suggestion(C,rp,bp); eq("Artefact Hunt end: 1 claim × 4 + 2 safe × 2 = 8", s.me.total, 8);
const over = B.confirmScores(C,rp,bp,8,0); eq("final round ends the game, I win", [!!over, over.winner], [true,"me"]);
// reserves destroyed in final round
const rf = mk("Terran","terran-armed-forces",["barracks"],[["marine",9],["marauder",4]]); const bf = B.create(C, rf, { missionId: "frontlines", color: "red" });
bf.units[rf.units[0].uid].st = "fld"; bf.round = 5; B.sync(C,rf,bf); bf.phase = 4;
s = B.suggestion(C,rf,bf); eq("final round: Marauders (Supply 2) left in Reserves count as Destroyed", s.opp.lines.some(l=>/Reserves/.test(l.label) && l.vp===2), true);
// special win
const bw = B.create(C, rf, { missionId: "frontlines", color: "red" }); bw.phase = 4; const ow = B.confirmScores(C,rf,bw,10,0); eq("lead of 10 ends Frontlines immediately", ow && /Special/.test(ow.reason), true);
// wipe-out
const bx = B.create(C, rf, { missionId: "frontlines", color: "red" }); rf.units.forEach(e => B.setState(C,rf,bx,e.uid,"dead")); bx.phase = 4;
s = B.suggestion(C,rf,bx); eq("all my units destroyed: opponent +10", s.opp.lines.some(l=>l.vp===10), true);
// tie → roll-off
const bt = B.create(C, rf, { missionId: "frontlines", color: "red", fpm: "opp" }); bt.phase = 4; B.confirmScores(C,rf,bt,1,1); B.nextRound(C,rf,bt); eq("tied VPs: roll-off flagged, FPM unchanged", [bt.rollOff, bt.fpm], [true,"opp"]);
// sync after roster edit
const e3 = C.newEntry("goliath"); rf.units.push(e3); B.sync(C,rf,bt); eq("unit added to roster mid-battle appears in Reserves", bt.units[e3.uid].st, "res");
rf.units.pop(); B.sync(C,rf,bt); eq("unit removed from roster disappears", bt.units[e3.uid], undefined);
eq("state survives JSON round trip", JSON.parse(JSON.stringify(bt)).round, 2);
console.log(fails ? fails + " FAILED" : "ALL PASSED");
