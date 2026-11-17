/* ------------ dice calculator (Dice tab) ------------
   One attack Batch between two units: odds first (simulated), then a roll. The numbers come from the printed cards;
   the engine is dice-core.js (Part 8.7.4). The attacker and target come from the active lists: this roster, the
   opponent's list of the battle in progress, another saved roster, or any unit.
   What the app cannot know (range, Line of Sight, statuses, abilities and cards in effect) is set by hand before the roll. */
var DS = { aL:"me", aU:null, aW:0, tL:null, tU:null, o:null, roll:null, all:false };
var D_TRIALS_ALL = 5000;
var D_TRIALS = 20000;
var D_LIM = { models:[0,30], longModels:[0,30], templ:[0,12], hitMod:[-3,3], roaMod:[-4,6], precision:[0,9], crit:[0,9], antiEvade:[0,4],
  tModels:[0,30], visible:[0,30], prior:[0,40], armourMod:[-3,3], evadeMod:[-3,3], tough:[0,9], dodge:[0,9], reduce:[0,12] };

/* Every block of the tab folds. P.dc lists the blocks the viewer has closed (kept on this device). */
var D_SEC = { astat:["hitMod","roaMod","precision","crit","antiEvade","burst","longModels"], tstat:["prior","firstGone","stationary"], evade:["evEng","evHigh","evHid","evAbil"], def:["armourMod","evadeMod","tough","dodge","reduce"] };
function dOpen(k){ return P.dc.indexOf(k)===-1; }
function dBlk(k, title, id, sub){ return '<details class="panel d-blk" data-k="'+k+'"'+(id?' id="'+id+'"':'')+(dOpen(k)?' open':'')+'><summary><h3>'+esc(title)+(sub?'<small>'+esc(sub)+'</small>':'')+'</h3></summary>'; }   // sub: what the block holds, shown while it is folded
function dSec(k, title){
  var n = (D_SEC[k]||[]).filter(function(x){ return !!DS.o[x]; }).length;   // settings changed from their defaults, so a folded group still shows it holds something
  return '<details class="d-sec" data-k="'+k+'"'+(dOpen(k)?' open':'')+'><summary class="lbl-s">'+esc(title)+(n?' <span class="chip slot">'+n+' set</span>':'')+'</summary><div class="d-pb">';
}
document.addEventListener("toggle", function(ev){
  var t = ev.target, k = t && t.getAttribute && t.getAttribute("data-k"); if(!k || !t.closest || !t.closest("#dice")) return;
  var i = P.dc.indexOf(k); if(t.open && i!==-1) P.dc.splice(i, 1); else if(!t.open && i===-1) P.dc.push(k); else return;
  savePrefs();
}, true);
function dMaxModels(u){ if(u.compositions && u.compositions.length) return Math.max.apply(null, u.compositions.map(function(c){ return c.models; }));
  var last = u.supply_profile[u.supply_profile.length-1], m = /(\d+)\s*$/.exec(String(last.models)); return m ? Number(m[1]) : 1; }
function dLabel(list){ var seen = {}, tot = {}; list.forEach(function(c){ tot[c.unitId] = (tot[c.unitId]||0)+1; });
  list.forEach(function(c){ seen[c.unitId] = (seen[c.unitId]||0)+1; c.label = c.u.name+(tot[c.unitId]>1?" #"+seen[c.unitId]:"")+" ×"+c.models; }); return list; }
function dLists(){
  var r = S.cur, b = r.battle, out = [];
  out.push({ id:"me", name:(r.name||"This roster"), units:dLabel(r.units.filter(function(e){ return C.units[e.unitId]; }).map(function(e){
    var st = b && b.units && b.units[e.uid];
    return { key:e.uid, unitId:e.unitId, u:C.units[e.unitId], upgrades:e.upgrades.slice(), models: st ? (st.st==="dead"?0:st.m) : e.models, prior: st ? (st.d||0) : 0, firstGone: st ? !!st.first : false, live:!!st }; })) });
  if(b && b.opp && b.opp.order.length) out.push({ id:"opp", name:"Opponent's list"+(b.opp.player?" ("+b.opp.player+")":""), units:dLabel(b.opp.order.map(function(id){ return b.opp.units[id]; }).filter(function(o){ return o && C.units[o.unitId]; }).map(function(o){
    return { key:o.uid, unitId:o.unitId, u:C.units[o.unitId], upgrades:(o.upgrades||[]).slice(), models:o.st==="dead"?0:o.m, prior:0, firstGone:false, live:true }; })) });
  S.rosters.forEach(function(x){ if(x.id===r.id || !x.units || !x.units.length) return;
    out.push({ id:"r:"+x.id, name:(x.name||"Untitled roster"), units:dLabel(x.units.filter(function(e){ return C.units[e.unitId]; }).map(function(e){
      return { key:e.uid, unitId:e.unitId, u:C.units[e.unitId], upgrades:(e.upgrades||[]).slice(), models:e.models, prior:0, firstGone:false }; })) }); });
  RACES.forEach(function(race){ out.push({ id:"any:"+race, any:true, name:"Any "+race+" unit", units:DATA.units.filter(function(u){ return u.race===race; }).map(function(u){
    return { key:u.id, unitId:u.id, u:u, upgrades:[], models:dMaxModels(u), prior:0, firstGone:false, any:true, label:u.name }; }) }); });
  return out;
}
/* Weapons a unit can attack with: its printed weapons as changed by the upgrades taken, one model for a SPECIALIST weapon,
   and IMPACT from an ability that prints it. From "Any unit" every upgrade weapon is offered, marked as an upgrade. */
function dWeapons(c){
  var u = c.u, out = u.weapons.map(function(w){ return { w:w, n:c.models }; }), abil = u.abilities.slice();
  u.upgrades.forEach(function(up){
    var taken = c.upgrades.indexOf(up.name)!==-1;
    if(up.kind!=="weapon"){ if(taken || c.any) abil.push(up); return; }
    if(c.any){ out.push({ w:up, n: up.specialist ? 1 : c.models, tag:"upgrade" }); return; }
    if(!taken) return;
    var base = up.replaces ? out.filter(function(x){ return x.w.name===up.replaces; })[0] : null;
    if(up.specialist){ out.push({ w:up, n:Math.min(1, c.models), tag:"1 model" }); if(base) base.n = Math.max(0, base.n-1); }
    else if(base) base.w = up; else out.push({ w:up, n:c.models });
  });
  abil.forEach(function(a){ var im = Dice.impactFrom(a); if(im) out.push({ w:im, n:c.models, tag:"charge" }); });
  return out.filter(function(x){ return x.n>0 || c.models===0; });
}
function dFind(lists, lid, key){ var l = lists.filter(function(x){ return x.id===lid; })[0]; if(!l) return {list:null, c:null};
  return { list:l, c:l.units.filter(function(x){ return x.key===key; })[0] || null }; }
function dResetAtk(c, wx){ var o = DS.o; o.models = wx ? wx.n : 0; o.longModels = 0; o.burst = false; o.templ = 1; DS.roll = null; }
function dResetTgt(c){ var o = DS.o; o.tModels = c ? c.models : 0; o.visible = o.tModels; o.prior = c ? c.prior : 0; o.firstGone = c ? c.firstGone : false; o.stationary = false; DS.roll = null; }
function dEnsure(){
  var lists = dLists();
  if(!DS.o) DS.o = { hitMod:0, roaMod:0, precision:0, crit:0, antiEvade:0, armourMod:0, evadeMod:0, tough:0, dodge:0, reduce:0, evEng:false, evHid:false, evHigh:false, evAbil:false };
  if(!lists.some(function(l){ return l.id===DS.aL; })) DS.aL = "me";
  if(!DS.tL || !lists.some(function(l){ return l.id===DS.tL; })) DS.tL = (lists.filter(function(l){ return l.id==="opp"; })[0] || lists.filter(function(l){ return l.id.indexOf("r:")===0; })[0] || lists.filter(function(l){ return l.any; })[0]).id;
  var a = dFind(lists, DS.aL, DS.aU), t = dFind(lists, DS.tL, DS.tU), fresh;
  if(!a.c){ a.c = a.list.units[0] || null; DS.aU = a.c ? a.c.key : null; DS.aW = 0; fresh = true; }
  var ws = a.c ? dWeapons(a.c) : [];
  if(DS.aW >= ws.length) { DS.aW = 0; fresh = true; }
  if(fresh || DS.o.models == null) dResetAtk(a.c, ws[DS.aW]);
  if(!t.c){ t.c = t.list.units[0] || null; DS.tU = t.c ? t.c.key : null; dResetTgt(t.c); }
  else if(DS.o.tModels == null) dResetTgt(t.c);
  return { lists:lists, a:a, t:t, ws:ws, wx:ws[DS.aW] || null };
}
/* sel: the weapon chosen in the Weapon box, which takes the weapon-specific statuses (models attacking, LONG RANGE, BURST FIRE,
   template). ts: the target's state, so that a second Batch meets the unit as the first one left it. */
function dSpecFor(ctx, wx, sel, ts){
  var o = DS.o, t = ctx.t.c; if(!wx || !t) return null;
  var w = Dice.parseWeapon(wx.w), ev = (w.ranged && (o.evEng || o.evHigh)) || o.evHid || o.evAbil;
  return Dice.buildSpec({ weapon:wx.w, models: sel ? o.models : wx.n, longModels: sel ? o.longModels : 0, burst: sel && o.burst, stationary:o.stationary, templateModels: sel ? o.templ : 1,
    hitMod:o.hitMod, roaMod:o.roaMod, precision:o.precision, crit:o.crit, antiEvade:o.antiEvade,
    target:{ tags:t.u.combat_tags, armour:t.u.stats.armour, evade:t.u.stats.evade, hp:t.u.stats.hp, shield:t.u.stats.shield, models:ts.models, visible:ts.visible, prior:ts.prior, firstGone:ts.firstGone },
    evade:ev, armourMod:o.armourMod, evadeMod:o.evadeMod, tough:o.tough, dodge:o.dodge, reduce:o.reduce });
}
function dTs(){ var o = DS.o; return { models:o.tModels, visible:o.visible, prior:o.prior, firstGone:o.firstGone }; }
function dSpec(ctx){ return dSpecFor(ctx, ctx.wx, true, dTs()); }
/* The weapons one activation uses in the chosen weapon's Phase (8.7.3): each model fires one weapon, a model with a
   SPECIALIST weapon fires that instead, and every SIDEARM fires as well. Each is its own Batch, here all at one target. */
function dPlan(ctx){
  var wx = ctx.wx; if(!wx || wx.w.impact) return wx ? [wx] : [];
  var same = ctx.ws.filter(function(x){ return !x.w.impact && x.w.phase===wx.w.phase; });
  var side = function(x){ return (x.w.keywords||[]).indexOf("SIDEARM")!==-1; }, spec = function(x){ return x.tag==="1 model"; };
  var main = !side(wx) && !spec(wx) ? wx : same.filter(function(x){ return !side(x) && !spec(x); })[0];
  return same.filter(function(x){ return x===main || x===wx || side(x) || spec(x); });
}
function dRunAll(ctx, plan, rnd, keep){
  var ts = dTs(), start = ts.models, parts = [], kills = 0, damage = 0, i, s, r;
  for(i = 0; i < plan.length && (ts.models > 0 || !start); i++){
    s = dSpecFor(ctx, plan[i], plan[i]===ctx.wx, ts); r = Dice.resolve(s, rnd, keep); parts.push({ wx:plan[i], s:s, r:r });
    kills += r.kills; damage += r.damage; ts.models -= r.kills; ts.visible = Math.max(0, ts.visible - r.kills); ts.prior = r.leftover; if(r.kills) ts.firstGone = true;
  }
  return { all:true, parts:parts, kills:kills, damage:damage, leftover:ts.prior, destroyed: start > 0 && ts.models <= 0 };
}
function dSimAll(ctx, plan, n){
  var sum = { damage:0, kills:0 }, dist = [], destroyed = 0, none = 0, i, o, k, acc = 0, atLeast = [];
  for(i = 0; i < n; i++){ o = dRunAll(ctx, plan, Math.random, false); sum.damage += o.damage; sum.kills += o.kills; dist[o.kills] = (dist[o.kills]||0)+1; if(o.destroyed) destroyed++; if(!o.damage) none++; }
  for(k = dist.length-1; k >= 0; k--){ acc += dist[k]||0; atLeast[k] = acc/n; }
  return { trials:n, damage:sum.damage/n, kills:sum.kills/n, atLeast:atLeast, destroyed:destroyed/n, noDamage:none/n };
}
/* Can this roll be written to the battle in progress? Only when the target is a tracked unit: yours or the opponent's. */
function dCanRecord(){ var b = S.cur && S.cur.battle; return !!(b && !b.over && DS.roll && !DS.roll.recorded && (DS.tL==="me" || DS.tL==="opp")); }
function dRecordHTML(){
  if(DS.roll && DS.roll.recorded) return '<p class="d-note"><b>Recorded on the Battle tab.</b> Undo there takes it back.</p>';
  if(!dCanRecord()) return '<p class="faint d-note">The roll only shows the result'+(S.cur && S.cur.battle && !S.cur.battle.over ? '; this target is not a unit the battle tracks.' : '. With a battle in progress it can be recorded on the Battle tab.')+'</p>';
  return '<div class="d-act" style="margin-bottom:0"><button class="btn" data-a="d-rec">Record on the Battle tab</button><span class="faint d-note">Removes the models and sets the Damage Marker. Undo on the Battle tab takes it back.</span></div>';
}
function dRecord(){
  if(!dCanRecord()) return;
  var r = S.cur, b = r.battle, roll = DS.roll, ctx = dEnsure(), a = ctx.a.c, t = ctx.t.c, i; if(!t) return;
  BS.undo.push(JSON.stringify(b)); if(BS.undo.length>40) BS.undo.shift();
  var wname = roll.all ? roll.parts.map(function(p){ return p.wx.w.name; }).join(", ") : ctx.wx.w.name;
  for(i = 0; i < roll.kills; i++){
    if(DS.tL==="opp"){ if(DS.aL==="me" && b.units[a.key]) BT.kill(C, r, b, a.key, t.key, "dealt"); else BT.oppChange(C, b, t.key, -1); }
    else if(DS.aL==="opp") BT.kill(C, r, b, t.key, a.key, "lost"); else BT.changeModels(C, r, b, t.key, -1);
  }
  if(DS.tL==="me"){ var st = b.units[t.key]; if(st && st.st!=="dead") BT.changeDamage(C, r, b, t.key, roll.leftover - (st.d||0)); }
  b.log.push({ r:b.round, p:b.phase, at:Date.now(), t:"Dice: "+(a?a.u.name:"Attacker")+" ("+wname+") against "+(DS.tL==="opp"?"the opponent's ":"")+t.u.name+": "+roll.kills+" model"+(roll.kills===1?"":"s")+" removed"+(DS.tL==="me" && !roll.destroyed?", Damage Marker "+roll.leftover:"")+"." });
  roll.recorded = true; Store.queue(r);
  var c = dEnsure().t.c, o = DS.o; if(c){ o.tModels = c.models; o.visible = c.models; o.prior = c.prior; o.firstGone = c.firstGone; }
  dRefresh();
}
/* Abilities worth a look before rolling: the engine does not read ability text. */
function dHints(c, re){
  var list = c.u.abilities.slice(); c.u.upgrades.forEach(function(up){ if(up.kind==="ability" && (c.any || c.upgrades.indexOf(up.name)!==-1)) list.push(up); });
  return list.filter(function(a){ return re.test(a.text||""); });
}
function dHintsHTML(title, list, c){
  if(!list.length) return "";
  return '<details class="d-hints"><summary>'+esc(title)+' ('+list.length+')</summary>'+list.map(function(a){
    return '<p><b>'+esc(a.name)+'</b>'+(c.any && c.u.upgrades.indexOf(a)!==-1 ? ' <span class="chip">Upgrade</span>' : '')+' '+Render.richText(a.text)+'</p>'; }).join("")+'</details>';
}
function dSel(a, opts, val, label){ return '<select class="input" data-a="'+a+'" aria-label="'+esc(label)+'">'+opts.map(function(x){
  return '<option value="'+esc(x[0])+'"'+(String(x[0])===String(val)?' selected':'')+'>'+esc(x[1])+'</option>'; }).join("")+'</select>'; }
function dStep(key, label, hint){
  var v = DS.o[key], lim = D_LIM[key], signed = lim[0] < 0;
  return '<div class="d-opt"><span class="d-ol">'+esc(label)+(hint?'<small>'+esc(hint)+'</small>':'')+'</span><span class="stepper"><button data-a="d-step" data-v="'+key+':-1" aria-label="Less: '+esc(label)+'"'+(v<=lim[0]?' disabled':'')+'>−</button><span id="d-v-'+key+'">'+(signed && v>0?'+':'')+v+'</span><button data-a="d-step" data-v="'+key+':1" aria-label="More: '+esc(label)+'"'+(v>=lim[1]?' disabled':'')+'>+</button></span></div>';
}
function dChk(key, label, hint){
  return '<label class="d-opt d-chk"><span class="d-ol">'+esc(label)+(hint?'<small>'+esc(hint)+'</small>':'')+'</span><input type="checkbox" data-a="d-chk" data-v="'+key+'"'+(DS.o[key]?' checked':'')+'></label>';
}
function dDice(arr, tn){ return '<span class="d-dice">'+arr.map(function(v){ return '<i class="die'+(v>=tn?' ok':'')+'">'+v+'</i>'; }).join("")+'</span>'; }
function pct(x){ var p = x*100; return (p>0 && p<0.5 ? "<1" : p>99.5 && p<100 ? ">99" : String(Math.round(p)))+"%"; }
function f1(x){ return (Math.round(x*10)/10).toFixed(1); }

function renderDice(){
  var el = $("dice"); if(!el) return;
  var ctx = dEnsure(), o = DS.o, a = ctx.a.c, t = ctx.t.c, wx = ctx.wx, h = "";
  var listOpts = ctx.lists.map(function(l){ return [l.id, l.name]; });
  h += '<div class="d-grid">'+dBlk("atk", "Attacker", null, a ? a.label+(wx?" \u00b7 "+wx.w.name:"") : "")+'<div class="pb d-pb">'+
    '<div class="field"><label>List</label>'+dSel("d-al", listOpts, DS.aL, "Attacker's list")+'</div>';
  if(!a) h += '<p class="muted">This list has no units yet.</p>';
  else {
    h += '<div class="field"><label>Unit</label>'+dSel("d-au", ctx.a.list.units.map(function(c){ return [c.key, c.label]; }), DS.aU, "Attacking unit")+'</div>'+
      '<div class="field"><label>Weapon</label>'+dSel("d-aw", ctx.ws.map(function(x, i){ return [i, x.w.name+(x.w.impact?"":" · "+(x.w.rng==="E"?"Close Combat":"Ranged"))+(x.tag?" ("+x.tag+")":"")]; }), DS.aW, "Weapon")+'</div>';
    if(wx){
      var w = Dice.parseWeapon(wx.w);
      h += '<div class="d-prof">'+(wx.w.impact ? 'IMPACT: '+esc(wx.w.roa)+' dice per model · Hit '+esc(wx.w.hit)+' · Dmg 1 · no Surge' : weaponLine(wx.w))+'</div>';
      var plan0 = dPlan(ctx);
      if(plan0.length > 1) h += '<label class="d-opt d-chk"><span class="d-ol">Roll the whole activation<small>'+esc(plan0.map(function(x){ return x.w.name; }).join(", "))+', each as its own Batch at this target</small></span><input type="checkbox" data-a="d-all"'+(DS.all?' checked':'')+'></label>';
      h += dSec("astat", "Attacker status");
      if(w.template) h += dStep("templ", "Models under the template", "Dice = affected models + "+w.roa);
      else h += dStep("models", w.impact ? "Models in the Fighting or Supporting Rank" : "Models attacking", w.ranged ? "In Range of a Visible model" : "");
      if(w.longRange && !w.template) h += dStep("longModels", "Of those, beyond "+esc(wx.w.rng)+"″", "LONG RANGE ("+w.longRange+"″): −1 to Hit");
      if(w.burst) h += dChk("burst", "Target Within "+w.burst.within+"″", "BURST FIRE: +"+w.burst.roa+" RoA");
      h += dStep("hitMod", "Hit modifier", "+1 is easier (BUFF Hit), −1 harder")+dStep("roaMod", "RoA modifier", "Per model (BUFF / DEBUFF RoA)")+
        dStep("precision", "PRECISION", w.precision?"Weapon prints "+w.precision:"From an ability or card")+
        dStep("crit", "CRITICAL HIT", w.crit?"Weapon prints "+w.crit+"; highest applies":"From an ability or card");
      if(!wx.w.impact) h += dStep("antiEvade", "ANTI-EVADE", w.antiEvade?"Weapon prints "+w.antiEvade+"; highest applies":"From an ability or card");
      h += '</div></details>';
      var nk = (wx.w.keywords||[]).filter(function(k){ return /^(SIDEARM|PINPOINT|INDIRECT FIRE|INSTANT|BULKY|SPECIALIST|SIEGE MODE)/.test(k); });
      if(nk.length) h += '<p class="faint d-note">Not part of the dice: '+esc(nk.join(", "))+'.</p>';
      h += dHintsHTML("This unit's abilities that may change the attack", dHints(a, new RegExp("weapon|Ranged Attack|Close Combat Attack|IMPACT|RoA|Hit Roll|"+wx.w.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i")), a);
    }
  }
  h += '</div></details>'+dBlk("tgt", "Target", null, t ? t.label : "")+'<div class="pb d-pb">'+
    '<div class="field"><label>List</label>'+dSel("d-tl", listOpts, DS.tL, "Target's list")+'</div>';
  if(!t) h += '<p class="muted">This list has no units yet.</p>';
  else {
    var ts = t.u.stats, wp = wx ? Dice.parseWeapon(wx.w) : null;
    h += '<div class="field"><label>Unit</label>'+dSel("d-tu", ctx.t.list.units.map(function(c){ return [c.key, c.label]; }), DS.tU, "Target unit")+'</div>'+
      '<div class="d-prof">Armour '+esc(ts.armour)+' · Evade '+esc(ts.evade)+' · HP '+esc(ts.hp)+(ts.shield!=null?' · Shield '+esc(ts.shield):'')+' · '+esc(t.u.combat_tags.join(", "))+'</div>'+
      dSec("tstat", "Target status")+
      dStep("tModels", "Models in the unit", t.live?"From the battle in progress":"")+dStep("visible", "Visible models", "Casualties cannot exceed this")+
      dStep("prior", "Damage already on the unit", "Its Damage Marker");
    if(ts.shield!=null) h += dChk("firstGone", "First model already removed", "No Shield left (5.1)");
    if(wp && wp.lockedIn) h += dChk("stationary", "Target is Stationary", "LOCKED IN: +"+wp.lockedIn+" RoA");
    h += '</div></details>'+dSec("evade", "Evade Roll");
    if(ts.evade==="-") h += '<p class="faint d-note">No Evade characteristic: this unit never makes Evade Rolls.</p>';
    else {
      if(wp && wp.ranged) h += dChk("evEng", "Target is Engaged", "Ranged Attack against an Engaged unit")+dChk("evHigh", "On HIGH GROUND, attacker lower", "HIGH GROUND Cover (7.1.3)");
      h += dChk("evHid", "HIDDEN or BURROWED", "Evade against every attack")+dChk("evAbil", "An ability or card grants it", "");
    }
    h += '</div></details>'+dSec("def", "Defence")+dStep("armourMod", "Armour modifier", "+1 is easier (BUFF Armour)");
    if(ts.evade!=="-") h += dStep("evadeMod", "Evade modifier", "+1 is easier");
    h += dStep("tough", "TOUGH", "Failed Armour Rolls turned to successes")+dStep("dodge", "DODGE", "Fewer dice moved by Surge / CRITICAL HIT")+
      dStep("reduce", "Total Damage reduced by", "e.g. Transfusion, Life Support");
    h += '</div></details>';
    h += dHintsHTML("This unit's abilities that may change the defence", dHints(t, /Evade|Armour|TOUGH|DODGE|Total Damage|Hit Points|attack/i), t);
  }
  h += '</div></details></div>';
  h += '<div class="d-act"><button class="btn primary" data-a="d-roll">Roll the attack</button><button class="btn" data-a="d-swap">Swap attacker and target</button><button class="btn ghost" data-a="d-clear">Reset statuses</button></div>';
  h += '<div id="d-out">'+dOutHTML(ctx)+'</div>';
  el.innerHTML = h;
}
function dWarns(ctx, s){
  var out = s.notes.slice(), wx = ctx.wx, t = ctx.t.c, tags = t.u.combat_tags, tg = wx.w.target;
  if(tg==="Ground" && tags.indexOf("Flying")!==-1) out.push(wx.w.name+" targets Ground units only; "+t.u.name+" is Flying.");
  if(tg==="Flying" && tags.indexOf("Flying")===-1) out.push(wx.w.name+" targets Flying units only.");
  if(s.surgePrinted && !s.surge) out.push("Surge does not apply: the target has none of the weapon's Surge Type tags ("+wx.w.surge_type+").");
  if(!s.groups.length || !s.groups.some(function(g){ return g.n>0; })) out.push("No Attack Dice: check the number of models attacking.");
  return out;
}
function dOutHTML(ctx){
  var s = dSpec(ctx); if(!s) return '<div class="empty">Choose an attacker with a weapon and a target.</div>';
  var plan = DS.all ? dPlan(ctx) : [];
  if(plan.length > 1) return dOutAllHTML(ctx, plan);
  var wx = ctx.wx, t = ctx.t.c, od = Dice.simulate(s, D_TRIALS), warns = dWarns(ctx, s), cap = Math.min(s.visible, s.maxKills), k, h = "";
  var dice = s.groups.reduce(function(n, g){ return n+g.n; }, 0);
  h += dBlk("odds", "Odds", "d-odds", f1(od.damage)+" Damage, "+f1(od.kills)+" removed on average")+'<div class="pb">'+
    '<p class="d-line"><b>'+dice+'</b> Attack Dice, Hit '+s.groups.map(function(g){ return g.tn+"+"+(s.groups.length>1?" ("+g.n+" "+g.label+")":""); }).join(" and ")+
    ' · Armour '+s.armourTN+'+'+(s.evadeTN!=null?' · Evade '+s.evadeTN+'+':' · no Evade Roll')+' · Damage '+s.dmg+' per die'+
    (s.surge?' · Surge '+(s.surge.fixed!=null?s.surge.fixed:s.surge.die):'')+(s.crit?' · CRITICAL HIT ('+s.crit+')':'')+(s.precision?' · PRECISION ('+s.precision+')':'')+'</p>'+
    warns.map(function(x){ return '<div class="check warn"><span class="mk"></span><span>'+esc(x)+'</span></div>'; }).join("")+
    '<div class="d-stats"><div><span>Hits</span><b>'+f1(od.hits)+'</b></div><div><span>Past Armour</span><b>'+f1(od.unsaved)+'</b></div>'+(s.evadeTN!=null?'<div><span>After Evade</span><b>'+f1(od.wounds)+'</b></div>':'')+
    '<div><span>Damage</span><b>'+f1(od.damage)+'</b></div><div><span>Models removed</span><b>'+f1(od.kills)+'</b></div></div>';
  if(cap > 0){
    h += '<div class="d-chances">';
    for(k = 1; k <= Math.min(cap, 6); k++) h += '<div><span>'+(k===cap && k===s.models ? 'Destroy the unit' : 'Remove '+k+'+')+'</span><i style="--p:'+Math.round((od.atLeast[k]||0)*100)+'%"></i><b>'+pct(od.atLeast[k]||0)+'</b></div>';
    h += '<div><span>No damage</span><i style="--p:'+Math.round(od.noDamage*100)+'%"></i><b>'+pct(od.noDamage)+'</b></div></div>';
  }
  h += '<p class="faint d-note">Averages and chances from '+fmt(od.trials)+' simulated rolls of this attack, so they shift slightly each time. Hits include PRECISION.</p></div></details>';
  h += dBlk("roll", "Roll", "d-roll", DS.roll ? DS.roll.kills+" removed" : "")+'<div class="pb"><button class="btn primary d-go" data-a="d-roll">'+(DS.roll?'Roll again':'Roll the attack')+'</button>';
  if(DS.roll){
    var r = DS.roll, R = r.rolls;
    h += '<ol class="d-steps"><li><b>Hit.</b> '+R.attack.map(function(g){ return (R.attack.length>1?'<span class="faint">'+esc(g.label)+', '+g.tn+'+:</span> ':'<span class="faint">'+g.tn+'+:</span> ')+dDice(g.dice, g.tn); }).join(" ")+
      ' <span class="d-res">'+r.hits+' hit'+(r.hits===1?'':'s')+(r.precision?' + '+r.precision+' from PRECISION':'')+' = '+r.armourPool+' in the Armour Pool</span></li>';
    if(s.surge || s.crit) h += '<li><b>Surge.</b> '+(R.surge?'<span class="faint">'+esc(R.surge.die)+':</span> <i class="die ok">'+R.surge.roll+'</i> = '+R.surge.value+'. ':(s.surge && s.surge.fixed!=null?'Template: '+s.surge.fixed+'. ':''))+
      '<span class="d-res">'+(s.surge?r.surge+' moved by Surge':'')+(s.crit?(s.surge?', ':'')+r.crit+' by CRITICAL HIT':'')+(r.dodged?', '+r.dodged+' stopped by DODGE':'')+': '+r.bypass+' skip Armour</span></li>';
    h += '<li><b>Armour.</b> <span class="faint">'+s.armourTN+'+:</span> '+(R.armour.length?dDice(R.armour, s.armourTN):'no dice')+' <span class="d-res">'+r.saved+' saved'+(r.toughed?' + '+r.toughed+' by TOUGH':'')+'; '+r.pool+' in the Damage Pool</span></li>';
    if(s.evadeTN!=null) h += '<li><b>Evade.</b> <span class="faint">'+s.evadeTN+'+:</span> '+(R.evade.length?dDice(R.evade, s.evadeTN):'no dice')+' <span class="d-res">'+r.evaded+' evaded; '+r.wounds+' left</span></li>';
    h += '<li><b>Damage.</b> <span class="d-res">'+r.wounds+' × '+s.dmg+' = '+r.damage+(r.wounds && (s.prior||s.reduce)?(s.prior?' + '+s.prior+' already on the unit':'')+(s.reduce?' − '+s.reduce+' reduced':'')+' = '+r.total:'')+'</span></li></ol>'+
      '<div class="d-final'+(r.kills?' hit':'')+'"><b>'+(r.destroyed?esc(t.u.name)+' destroyed':r.kills+' model'+(r.kills===1?'':'s')+' removed')+'</b>'+
      '<span>'+(r.destroyed?r.kills+' model'+(r.kills===1?'':'s')+' removed.':(r.kills>=cap && r.wounds && cap<s.models?'Limit reached ('+(s.maxKills<=s.visible?'CONCENTRATED FIRE':'Visible models')+'): remaining Damage is discarded.':'Damage Marker on the unit: '+r.leftover+'.'))+'</span></div>'+
      dRecordHTML();
  }
  h += '</div></details>';
  return h;
}
function dOutAllHTML(ctx, plan){
  var t = ctx.t.c, o = DS.o, od = dSimAll(ctx, plan, D_TRIALS_ALL), cap = o.visible, k, h = "", ts = dTs();
  h += dBlk("odds", "Odds", "d-odds", f1(od.damage)+" Damage, "+f1(od.kills)+" removed on average")+'<div class="pb"><p class="d-line">Whole activation, resolved in this order, each Batch meeting the unit as the one before left it:</p><ol class="d-steps" style="margin-top:0">'+
    plan.map(function(x){ var s = dSpecFor(ctx, x, x===ctx.wx, ts), n = s.groups.reduce(function(a, g){ return a+g.n; }, 0);
      return '<li><b>'+esc(x.w.name)+'.</b> <span class="d-res">'+n+' Attack Dice, Hit '+s.groups.map(function(g){ return g.tn+"+"; }).join(" / ")+', Damage '+s.dmg+(s.surge?', Surge '+(s.surge.fixed!=null?s.surge.fixed:s.surge.die):'')+(x===ctx.wx?'':' \u00b7 '+x.n+' model'+(x.n===1?'':'s')+', no range or BURST FIRE switches')+'</span></li>'; }).join("")+'</ol>'+
    '<div class="d-stats"><div><span>Damage</span><b>'+f1(od.damage)+'</b></div><div><span>Models removed</span><b>'+f1(od.kills)+'</b></div></div>';
  if(cap > 0){ h += '<div class="d-chances">';
    for(k = 1; k <= Math.min(cap, 6); k++) h += '<div><span>'+(k===cap && k===o.tModels ? 'Destroy the unit' : 'Remove '+k+'+')+'</span><i style="--p:'+Math.round((od.atLeast[k]||0)*100)+'%"></i><b>'+pct(od.atLeast[k]||0)+'</b></div>';
    h += '<div><span>No damage</span><i style="--p:'+Math.round(od.noDamage*100)+'%"></i><b>'+pct(od.noDamage)+'</b></div></div>'; }
  h += '<p class="faint d-note">From '+fmt(od.trials)+' simulated activations. The modifiers, PRECISION, CRITICAL HIT and the target\u2019s statuses apply to every Batch; set a weapon on its own to give it different ones.</p></div></details>';
  var R = DS.roll && DS.roll.all ? DS.roll : null;
  h += dBlk("roll", "Roll", "d-roll", R ? R.kills+" removed" : "")+'<div class="pb"><button class="btn primary d-go" data-a="d-roll">'+(R?'Roll again':'Roll the activation')+'</button>';
  if(R){
    h += '<ol class="d-steps">'+R.parts.map(function(p){ var r = p.r, s = p.s;
      return '<li><b>'+esc(p.wx.w.name)+'.</b> '+r.rolls.attack.map(function(g){ return dDice(g.dice, g.tn); }).join(" ")+'<span class="d-res">'+r.armourPool+' hit'+(r.armourPool===1?'':'s')+(r.precision?' (PRECISION '+r.precision+')':'')+(r.bypass?', '+r.bypass+' skip Armour':'')+', '+r.pool+' past Armour'+(s.evadeTN!=null?', '+r.wounds+' after Evade':'')+': '+r.damage+' Damage, '+r.kills+' removed</span></li>'; }).join("")+'</ol>'+
      '<div class="d-final'+(R.kills?' hit':'')+'"><b>'+(R.destroyed?esc(t.u.name)+' destroyed':R.kills+' model'+(R.kills===1?'':'s')+' removed')+'</b><span>'+(R.destroyed?R.kills+' model'+(R.kills===1?'':'s')+' removed.':'Damage Marker on the unit: '+R.leftover+'.')+'</span></div>'+dRecordHTML();
  }
  return h+'</div></details>';
}
function dRefresh(){ var el = $("d-out"); if(!el){ renderDice(); return; } var y = window.scrollY; renderDice(); window.scrollTo(0, y); }
function dClick(a, v){
  var o = DS.o, ctx;
  if(a==="d-step"){ var p = v.split(":"), k = p[0], lim = D_LIM[k]; o[k] = Math.max(lim[0], Math.min(lim[1], (o[k]||0)+Number(p[1])));
    if(k==="models") o.longModels = Math.min(o.longModels, o.models);
    if(k==="longModels") o.longModels = Math.min(o.longModels, o.models);
    if(k==="tModels") o.visible = Math.min(o.visible, o.tModels);
    if(k==="visible") o.visible = Math.min(o.visible, o.tModels);
    DS.roll = null; dRefresh(); return; }
  if(a==="d-roll"){ ctx = dEnsure(); var s = dSpec(ctx); if(s){ var ri = P.dc.indexOf("roll"); if(ri!==-1){ P.dc.splice(ri, 1); savePrefs(); }   // a roll always shows its result
      var pl = DS.all ? dPlan(ctx) : [];
      DS.roll = pl.length > 1 ? dRunAll(ctx, pl, Math.random, true) : Dice.resolve(s, Math.random, true); dRefresh(); var el = $("d-roll"); if(el && el.scrollIntoView) el.scrollIntoView({block:"nearest"}); } return; }
  if(a==="d-swap"){ var l = DS.aL, u = DS.aU; DS.aL = DS.tL; DS.aU = DS.tU; DS.tL = l; DS.tU = u; DS.aW = 0; o.models = null; o.tModels = null; DS.roll = null; dRefresh(); return; }
  if(a==="d-rec"){ dRecord(); return; }
  if(a==="d-clear"){ DS.o = null; DS.roll = null; dRefresh(); return; }
}
function dChange(a, t){
  var o = DS.o;
  if(a==="d-chk"){ o[t.getAttribute("data-v")] = t.checked; DS.roll = null; dRefresh(); return true; }
  if(a==="d-all"){ DS.all = t.checked; DS.roll = null; dRefresh(); return true; }
  if(a==="d-al"){ DS.aL = t.value; DS.aU = null; DS.aW = 0; o.models = null; }
  else if(a==="d-au"){ DS.aU = t.value; DS.aW = 0; o.models = null; }
  else if(a==="d-aw"){ DS.aW = Number(t.value); o.models = null; }
  else if(a==="d-tl"){ DS.tL = t.value; DS.tU = null; o.tModels = null; }
  else if(a==="d-tu"){ DS.tU = t.value; o.tModels = null; }
  else return false;
  DS.roll = null; dRefresh(); return true;
}
