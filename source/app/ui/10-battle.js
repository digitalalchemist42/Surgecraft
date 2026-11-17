/* ------------ battle tracker (Battle tab) ------------
   Rules logic lives in battle-core.js (window.Battle). State is kept on the roster as r.battle and saved with it.
   The tracker guides and warns; it never blocks a step. */
var BT = window.Battle;
var BS = { set:null, warn:[], pass:false, undo:[], quit:false, adj:{me:0, opp:0}, sumPick:false, openAb:{}, openU:{}, grp:{}, tab:"play", showAll:false, ks:null, pay:null, modal:null, oppOpen:false, oppDraft:null, oppErr:null, hDel:null };
var PHASE_GUIDE = {
  1: ["Players take turns activating one Unit at a time. The holder of the First Player Marker decides who goes first.", "Each Unit performs one action: Deploy (from Reserves), Move, Disengage or Hold.", "The first player to Pass takes the First Player Marker for the Assault Phase."],
  2: ["Players take turns activating one Unit on the battlefield. Units in Reserves cannot act.", "Each Unit performs one action: Ranged Attack, Charge, Run or Hold.", "The first player to Pass takes the First Player Marker for the Combat Phase."],
  3: ["Every Engaged Unit must activate and make a Close Combat Attack. Close Ranks first if you want to (optional, up to 3\").", "Flying Units take no part. A player Passes only when they have no Engaged Units left to activate."],
  4: ["Work down the steps: Mission Marker control, Victory Points, End of Game check, End of the Round effects, Cleanup, then initiative."]
};
function bWho(w){ return w==="me" ? "You" : "Opponent"; }
function bCommit(){
  var r = S.cur; if(!r) return;
  if(r.isExample){ delete r.isExample; r.id = "r_"+RosterCore.uid(); r.createdAt = Date.now(); if(S.notice && S.notice.example) S.notice=null; Store.queue(r); render(); return; }
  Store.queue(r); renderBattle();
}
/* Run a change to the battle state with an undo snapshot taken first. */
function bMut(fn){
  var r = S.cur, b = r && r.battle; if(!b) return;
  BS.undo.push(JSON.stringify(b)); if(BS.undo.length>40) BS.undo.shift();
  BS.warn = [];
  var res = fn(b, r);
  if(res && res.warnings && res.warnings.length) BS.warn = res.warnings;
  bCommit();
}
function bStepper(label, value, dec, inc, extra){
  return '<span class="bstep"><span class="bs-l">'+label+'</span><span class="stepper"><button '+dec+' aria-label="Decrease '+esc(label)+'">−</button><span class="num">'+value+'</span><button '+inc+' aria-label="Increase '+esc(label)+'">+</button></span>'+(extra||'')+'</span>';
}
function bLevelsHTML(b){
  return Object.keys(b.markers).map(Number).filter(function(n){ return b.markers[n].lvl!=null; }).map(function(n){
    return bStepper("Marker "+n+" Sabotage Level", b.markers[n].lvl, 'data-a="b-lvl" data-v="'+n+':-1"', 'data-a="b-lvl" data-v="'+n+':1"');
  }).join("");
}
function bMarkersHTML(b){
  var h = '<div class="mks">';
  Object.keys(b.markers).map(Number).forEach(function(n){
    var mk = b.markers[n], aff = BT.affinity(n), mine = aff && aff===b.color, cls = "mmk "+(aff||"neutral")+(mk.own?" "+mk.own:"")+(mk.gone?" gone":"");
    var sub = mk.gone ? "Removed" : mk.own ? bWho(mk.own) : "No one";
    h += '<button class="'+cls+'" data-a="b-mk" data-v="'+n+'"'+(mk.gone?' disabled':'')+' aria-label="Mission Marker '+n+', '+(aff?aff+(mine?", your colour":", opponent\'s colour"):"neutral")+', controlled by '+sub+'. Tap to change."><span class="mk-n">'+n+'</span><span class="mk-o">'+sub+'</span>'+
      (b.missionId==="supply-drop" && !mk.gone ? '<span class="mk-s">'+(mk.on?"Activated R"+mk.ar:"Deactivated")+'</span>' : '')+
      (mk.lvl!=null ? '<span class="mk-s">Sabotage '+mk.lvl+'</span>' : '')+'</button>';
  });
  return h+'</div>'+(P.guides?'<div class="faint" style="font-size:12px">Tap a Marker to change who Controls it. Ring colour: red Markers 1 and 3, blue 2 and 4, green 5 is Neutral. You are '+(b.color==="red"?"Red":"Blue")+'.</div>':'<div class="faint" style="font-size:12px">You are '+(b.color==="red"?"Red":"Blue")+'.</div>');
}
function bStripHTML(b, r){
  var m = BT.mission(C, b), s = BT.supply(C, r, b), t = BT.totals(b), res = BT.resource(C, r, b);
  var pct = s.unlimited ? 100 : Math.min(100, s.pool ? s.onTable/s.pool*100 : 0), over = !s.unlimited && s.onTable>s.pool;
  return '<div class="meter"><div class="lbl"><span>Round</span><span>'+esc(C.missions[b.missionId].name)+'</span></div><div class="val">'+b.round+' <small>/ '+m.game_length+'</small></div><div class="faint" style="font-size:11px;margin-top:3px">'+(b.over?"Game over":esc(BT.PHASES[b.phase])+" Phase")+'</div></div>'+
    '<div class="meter min'+(over?' over':'')+'"><div class="lbl"><span>Supply on table</span><span>'+(s.unlimited?'no limit':over?'over by '+(s.onTable-s.pool):(s.available)+' available')+'</span></div><div class="val">'+s.onTable+' <small>/ '+(s.unlimited?'∞':s.pool)+'</small></div><div class="bar"><i style="width:'+pct+'%"></i></div></div>'+
    '<div class="meter"><div class="lbl"><span>Victory Points</span><span>'+(m.special_win_lead?'lead of '+m.special_win_lead+' wins':'')+'</span></div><div class="val">'+t.me+' <small>you · '+t.opp+' opponent</small></div><div class="faint" style="font-size:11px;margin-top:3px">First Player Marker: '+bWho(b.fpm)+'</div></div>'+
    '<div class="meter gas"><div class="lbl"><span>'+esc(res.type||"Resource")+' on Ready cards</span><span>'+(res.total-res.ready)+' spent</span></div><div class="val">'+res.ready+' <small>/ '+res.total+'</small></div><div class="bar"><i style="width:'+(res.total?res.ready/res.total*100:0)+'%"></i></div></div>';
}
function bSetupHTML(r){
  var side = BT.side(C, r), st = BS.set || (BS.set = { missionId: r.missions[0] || DATA.missions[0].id, deploymentId: r.deployments[0] || DATA.deployments[0].id, color:"red", fpm:"me" });
  var errs = C.validate(r).filter(function(x){return x.level==="error";});
  var h = '<section class="section"><header><span class="step">BATTLE</span><h2>Start a battle</h2><span class="aside">Part 9.2–9.3</span></header><div class="sbody">';
  var draftBtn = '<div style="margin-bottom:14px;display:flex;gap:8px;align-items:center;flex-wrap:wrap"><button class="btn" data-a="b-draft">Run the draft</button><span class="faint" style="font-size:12.5px">A guide through the Mission and Deployment draft (9.2). Or choose the cards below.</span></div>';
  if(!r.units.length) return h+'<div class="empty">Add units on the Build tab first. The tracker follows the units, cards and upgrades on this roster.</div></div></section>';
  if(errs.length) h += '<div class="notice err" style="margin-top:0"><div class="grow">This roster has '+errs.length+' rules issue'+(errs.length>1?'s':'')+'. You can still track a battle with it.</div><button class="btn sm" data-a="tab" data-v="build">Fix in Build</button></div>';
  h += (errs.length?'<div style="height:14px"></div>':'')+draftBtn;
  h += '<div class="subhead" style="margin-top:0">Mission Card <span class="aside">'+(side==="skirmish"?"Skirmish Level":"Standard Engagement")+' side</span></div><div class="tiles">';
  DATA.missions.forEach(function(m){
    var s = m[side], on = st.missionId===m.id, mine = r.missions.indexOf(m.id)!==-1;
    h += '<button class="tile" data-a="b-set" data-v="missionId:'+esc(m.id)+'" aria-pressed="'+on+'"><span class="tcol"><span class="t-name">'+esc(m.name)+(mine?' <span class="chip slot">On roster</span>':'')+'</span><span class="t-sub">'+s.deploy_supply+' Supply, +'+s.supply_per_round+' per Round, '+s.game_length+' Rounds</span></span></button>';
  });
  h += '</div><div style="margin-top:8px"><button class="btn sm" data-a="b-mcard" data-v="'+esc(st.missionId)+'">View Mission Card</button></div>';
  h += '<div class="subhead">Deployment Card</div><div class="tiles">';
  DATA.deployments.forEach(function(d){
    var on = st.deploymentId===d.id, mine = r.deployments.indexOf(d.id)!==-1;
    h += '<button class="tile" data-a="b-set" data-v="deploymentId:'+esc(d.id)+'" aria-pressed="'+on+'"><span class="tcol"><span class="t-name">'+esc(d[side])+(mine?' <span class="chip slot">On roster</span>':'')+'</span></span></button>';
  });
  h += '</div><div style="margin-top:8px"><button class="btn sm" data-a="dmap" data-v="'+esc(st.deploymentId)+'">View map</button></div>';
  var tmaps = DATA.terrain.maps.filter(function(t){ return t.scale===side; }); if(st.terrain && !tmaps.some(function(t){ return t.id===st.terrain; })) st.terrain = "";
  h += '<div class="subhead">Terrain map <span class="aside">Optional \u00b7 Full Rules pp. 115\u2013124</span></div><div class="tr-ctl"><div class="seg"><button data-a="b-set" data-v="terrain:" aria-pressed="'+(!st.terrain)+'">None</button>'+tmaps.map(function(t){
      return '<button data-a="b-set" data-v="terrain:'+t.id+'" aria-pressed="'+(st.terrain===t.id)+'">Map '+t.number+'</button>'; }).join("")+'</div><button class="btn sm" data-a="b-troll">Roll '+(side==="standard"?"D6":"D3")+'</button>'+(st.terrain?'<button class="btn sm" data-a="b-tmap" data-v="'+esc(st.terrain)+'">View map</button>':'')+'</div>';
  h += '<div class="grid2" style="margin-top:16px"><div class="field"><span class="lbl-s">Your colour</span><div class="seg"><button data-a="b-set" data-v="color:red" aria-pressed="'+(st.color==="red")+'">Red Player</button><button data-a="b-set" data-v="color:blue" aria-pressed="'+(st.color==="blue")+'">Blue Player</button></div><span class="faint" style="font-size:12px">Sets your Entry Edge and which Markers are your colour (1 and 3 Red, 2 and 4 Blue).</span></div>'+
    '<div class="field"><span class="lbl-s">First Player Marker for Round 1</span><div class="seg"><button data-a="b-set" data-v="fpm:me" aria-pressed="'+(st.fpm==="me")+'">You</button><button data-a="b-set" data-v="fpm:opp" aria-pressed="'+(st.fpm==="opp")+'">Opponent</button></div><span class="faint" style="font-size:12px">The Roll-Off winner gives it to either player (8.2.2).</span></div></div>';
  h += '<div class="subhead">Chess clock <span class="aside">optional</span></div><div class="tr-ctl"><div class="seg"><button data-a="b-set" data-v="clock:" aria-pressed="'+(st.clock!=="on")+'">Off</button><button data-a="b-set" data-v="clock:on" aria-pressed="'+(st.clock==="on")+'">On</button></div>'+
    (st.clock==="on" ? '<label class="clk-min"><span>Minutes each</span><input class="input" data-a="b-clockmin" inputmode="numeric" maxlength="3" value="'+esc(st.clockMin||"")+'" placeholder="No limit"></label>' : '')+'</div>'+
    '<span class="faint" style="font-size:12px;display:block;margin-top:4px">One clock per player in the bar at the bottom. Tap a side to run its clock; tap it again to pause.</span>';
  h += bOppSetupHTML();
  h += '<div style="margin-top:16px;display:flex;gap:8px;align-items:center;flex-wrap:wrap"><button class="btn primary" data-a="b-start">Start battle</button><span class="faint">Every Unit starts in Reserves (8.3).</span></div></div></section>';
  return h;
}
/* This Phase's action buttons for a Unit, or what it already did. Shared by the compact row and the open card. */
function bActsHTML(i, b, r){
  var st = i.st, p = b.phase, idx = p-1, uid = esc(i.uid);
  if(p>3 || b.over) return '';
  if(st.act[idx]) return '<span class="pill ok">'+esc(st.an[idx]==="summoned"?"Summoned this Phase":(BT.ACTIONS[st.an[idx]]||{label:"Activated"}).label)+'</span><button class="btn ghost sm" data-a="b-unact" data-e="'+uid+'">Undo</button>';
  var acts = BT.actionsFor(C, r, b, i.uid);
  if(!acts.length) return '<span class="faint">'+(p===3?"Not Engaged: no action in the Combat Phase.":"No action available.")+'</span>';
  return acts.map(function(a){ return '<button class="btn sm primary" data-a="b-act" data-e="'+uid+'" data-v="'+a+'">'+esc(BT.ACTIONS[a].label)+(a==="gather"?" +1 VP":"")+'</button>'; }).join("");
}
/* Damage stepper readout. Units with a Shield show Shield and HP left (Damage drains the Shield first, Part 5.1.6). Struck through once Shielded is lost (Total Damage over the Shield value). */
function bDmgVal(i, full){
  if(!i.shield) return i.st.d+' <small>/ '+(full?'HP ':'')+i.threshold+'</small>';
  return '<span class="bd-sh'+(i.shielded?'':' out')+'">Shield '+i.shieldLeft+'<small>/'+i.shield+'</small></span><span class="bd-dot"> · </span><span class="bd-hp">HP '+i.hpLeft+'<small>/'+i.hp+'</small></span>';
}
function bPaidTxt(a){ return a.paid ? (a.paid.length ? ' · paid with '+esc(a.paid.map(function(x){ return x.card; }).join(" + ")) : ' · no card') : ''; }
function bCasHTML(i){
  var st = i.st;
  return '<div class="check error"><span class="mk"></span><span>Damage '+st.d+' has reached this model\'s '+i.threshold+' Hit Points'+(i.shield && !st.first?' (HP '+i.hp+' + Shield '+i.shield+')':'')+'. Remove a casualty unless this was Non-Lethal Damage. <button class="btn sm" data-a="b-cas" data-e="'+esc(i.uid)+'">Remove casualty</button></span></div>';
}
var DICE_ICO = '<svg viewBox="0 0 16 16" aria-hidden="true"><rect x="2" y="2" width="12" height="12" rx="2.4" fill="none" stroke="currentColor" stroke-width="1.5"/><circle cx="5.4" cy="5.4" r="1.1" fill="currentColor"/><circle cx="8" cy="8" r="1.1" fill="currentColor"/><circle cx="10.6" cy="10.6" r="1.1" fill="currentColor"/></svg>';
function bDiceBtn(i, b){ return i.state==="fld" && !b.over ? '<button class="bu-kill" data-a="b-dice" data-e="'+esc(i.uid)+'" title="Work out an attack on the Dice tab" aria-label="Dice for '+esc(i.unit.name)+'">'+DICE_ICO+'</button>' : ""; }
function bKillBtn(i, b){ return hasOpp(b) && i.state==="fld" && !b.over ? '<button class="bu-kill" data-a="b-ks" data-e="'+esc(i.uid)+'" title="Killed a model / lost a model" aria-label="Kills and losses for '+esc(i.unit.name)+'">'+SWORDS+'</button>' : ""; }
function bEnemyStep(b, label){ var el = BT.enemyLost(C, b); return bStepper(label, el.total, 'data-a="b-inp" data-v="enemyLost:-1"', 'data-a="b-inp" data-v="enemyLost:1"', el.tracked ? '<span class="faint" style="font-size:12px">from their tracked losses'+(el.adj ? (el.adj>0?" +":" ")+el.adj+" adjusted" : "")+'</span>' : ""); }
function bNoteHTML(b){ return '<div class="field" style="margin-top:12px"><label for="b-note">Round '+b.round+' notes <span class="faint" style="text-transform:none;letter-spacing:0;font-weight:500">for the battle report</span></label><textarea class="input" id="b-note" data-a="b-note" data-v="'+b.round+'" rows="2" placeholder="Key moments this Round">'+esc((b.notes||{})[b.round]||"")+'</textarea></div>'; }
function bUnitHTML(i, b, r, sup){ return BS.openU[i.uid] ? bUnitFull(i, b, r, sup) : bUnitCompact(i, b, r, sup); }
/* One-line row: tap the name to open the full card. Damage and this Phase's actions stay on the row. */
function bUnitCompact(i, b, r, sup){
  var st = i.st, u = i.unit, p = b.phase, acted = p<=3 && st.act[p-1], uid = esc(i.uid), sum = [];
  if(i.state==="dead") sum.push("Destroyed");
  else if(i.state==="res"){ sum.push(i.models+" model"+(i.models>1?"s":"")); sum.push("needs "+i.poolSupply+" Supply"); }
  else {
    sum.push(i.models+"/"+i.start+" models"); sum.push("Supply "+i.supplyNow);
    if(st.eng) sum.push("Engaged");
    if(st.dis) sum.push("Disengaged");
    BT.statusKeys(C, r, i).forEach(function(k){ if(st.stat[k]) sum.push(BT.STATUS[k]); });
    if(i.shield) sum.push(i.shielded?"Shielded":"Shield lost");
  }
  var h = '<article class="bunit cpt '+i.state+(acted?' acted':'')+(i.casualtyDue?' has-err':'')+'" id="b-'+uid+'"><div class="bu-c">'+
    '<button class="thumb mini" data-a="card" data-v="'+esc(u.id)+'"'+(i.summoned?'':' data-e="'+uid+'"')+' aria-label="View '+esc(u.name)+' card">'+miniImg(u.id)+'</button>'+
    '<button class="bu-tap" data-a="b-open" data-e="'+uid+'" aria-expanded="false"><span class="bu-tt"><span class="e-name">'+esc(u.name)+(i.summoned?' <span class="chip">Summoned</span>':'')+'</span><span class="bu-sum">'+esc(sum.join(" · "))+'</span></span><span class="v-chev" aria-hidden="true"></span></button>'+bDiceBtn(i, b)+bKillBtn(i, b)+'</div>';
  var row = '';
  if(i.state==="res"){
    var fits = sup.unlimited || i.poolSupply<=sup.available;
    if(!fits) row += '<span class="pill err">Only '+Math.max(0,sup.available)+' Supply available</span>';
    if(p===1 && !b.over) row += '<span class="grow"></span>'+(acted ? bActsHTML(i, b, r) : '<button class="btn sm primary" data-a="b-act" data-e="'+uid+'" data-v="deploy">Deploy</button>');
  } else if(i.state==="fld"){
    row += bStepper("Damage", bDmgVal(i), 'data-a="b-d" data-e="'+uid+'" data-v="-1"', 'data-a="b-d" data-e="'+uid+'" data-v="1"');
    var acts = bActsHTML(i, b, r); if(acts) row += '<span class="grow"></span><span class="bu-q">'+acts+'</span>';
  }
  if(row) h += '<div class="bu-c2">'+row+'</div>';
  if(i.state==="fld" && i.casualtyDue) h += bCasHTML(i);
  return h+'</article>';
}
function bUnitFull(i, b, r, sup){
  var st = i.st, u = i.unit, p = b.phase, idx = p-1, acted = p<=3 && st.act[idx], uid = esc(i.uid);
  var cardBtn = '<button class="btn ghost sm" data-a="card" data-v="'+esc(u.id)+'"'+(i.summoned?'':' data-e="'+uid+'"')+'>Card</button>';
  var h = '<article class="bunit open '+i.state+(acted?' acted':'')+(i.casualtyDue?' has-err':'')+'" id="b-'+uid+'"><div class="bu-h"><button class="thumb mini" data-a="card" data-v="'+esc(u.id)+'"'+(i.summoned?'':' data-e="'+uid+'"')+' aria-label="View '+esc(u.name)+' card">'+miniImg(u.id)+'</button>'+
    '<button class="bu-tap" data-a="b-open" data-e="'+uid+'" aria-expanded="true"><span class="bu-tt"><span class="e-name">'+esc(u.name)+(i.summoned?' <span class="chip">Summoned</span>':'')+'</span><span class="bu-meta">';
  if(i.state==="dead") h += '<span class="pill err">Destroyed</span>';
  else {
    h += '<span class="chip slot">Supply '+i.supplyNow+(i.zeroPool?' · 0 for the pool':'')+'</span>';
    if(i.supplyNow<st.s0) h += '<span class="pill warn">−'+(st.s0-i.supplyNow)+' Supply this Round</span>';
    if(i.shield) h += '<span class="chip'+(i.shielded?' slot':'')+'">'+(i.shielded?'Shielded':'Shield lost')+'</span>';
    if(st.dis) h += '<span class="pill warn">Disengaged</span>';
  }
  h += '</span></span><span class="v-chev" aria-hidden="true"></span></button><span class="bu-r">'+bDiceBtn(i, b)+bKillBtn(i, b)+cardBtn+'</span></div>';
  if(i.state==="dead") return h+'<div class="bu-row"><button class="btn sm" data-a="b-state" data-e="'+uid+'" data-v="fld">Restore</button>'+(i.summoned?'<button class="btn ghost sm danger" data-a="b-unsummon" data-e="'+uid+'">Remove</button>':'')+'</div></article>';
  if(i.state==="res"){
    var fits = sup.unlimited || i.poolSupply<=sup.available;
    h += '<div class="bu-row"><span class="muted">'+i.models+' model'+(i.models>1?'s':'')+' · needs '+i.poolSupply+' Supply'+(fits?'':' <b style="color:var(--err)">(only '+Math.max(0,sup.available)+' available)</b>')+'</span><span class="grow"></span>'+
      (p===1 && !b.over ? (acted ? bActsHTML(i, b, r) : '<button class="btn sm primary" data-a="b-act" data-e="'+uid+'" data-v="deploy">Deploy</button>') : '<button class="btn sm" data-a="b-state" data-e="'+uid+'" data-v="fld">Put on battlefield</button>')+'</div>';
    return h+'</article>';
  }
  h += '<div class="bu-row">'+bStepper("Models", i.models+' <small>/ '+i.start+'</small>', 'data-a="b-m" data-e="'+uid+'" data-v="-1"', 'data-a="b-m" data-e="'+uid+'" data-v="1"')+
    bStepper("Damage", bDmgVal(i, true), 'data-a="b-d" data-e="'+uid+'" data-v="-1"', 'data-a="b-d" data-e="'+uid+'" data-v="1"')+'</div>';
  if(i.casualtyDue) h += bCasHTML(i);
  h += '<div class="bu-row chips"><button class="bchip" data-a="b-eng" data-e="'+uid+'" aria-pressed="'+(!!st.eng)+'">Engaged</button>';
  BT.statusKeys(C, r, i).forEach(function(k){ h += '<button class="bchip" data-a="b-stat" data-e="'+uid+'" data-v="'+k+'" aria-pressed="'+(!!st.stat[k])+'">'+esc(BT.STATUS[k])+'</button>'; });
  h += '</div>';
  var acts = bActsHTML(i, b, r); if(acts) h += '<div class="bu-row acts">'+acts+'</div>';
  var abs = BT.abilitiesFor(C, r, b, i.uid);
  if(abs.length && p<=3){
    var open = !!BS.openAb[i.uid];
    h += '<div class="bu-ab"><button class="btn ghost sm" data-a="b-ab" data-e="'+uid+'" aria-expanded="'+open+'">'+(open?'Hide':'Show')+' abilities for this Phase ('+abs.length+')</button>';
    if(open) abs.forEach(function(a){
      h += '<div class="ab'+(a.used?' used':'')+'"><div class="ab-h"><b>'+esc(a.ability.name)+'</b> '+tp(a.ability.type)+(a.ability.cost?' <span class="faint">'+esc(a.ability.cost)+'</span>':'')+'<span class="grow"></span>'+
        (a.usable ? (a.used && !a.repeatable ? '<span class="pill neutral">Used'+bPaidTxt(a)+'</span><button class="btn ghost sm" data-a="b-unuse" data-e="'+uid+'" data-v="'+esc(a.ability.name)+'">Undo</button>' : (a.repeatable && a.paid ? '<span class="faint ab-paid">Last'+bPaidTxt(a)+'</span>' : '')+'<button class="btn sm" data-a="b-use" data-e="'+uid+'" data-v="'+esc(a.ability.name)+'">Use</button>') : '')+'</div><div class="u-desc">'+Render.richText(a.ability.text)+'</div></div>';
    });
    h += '</div>';
  }
  h += '<div class="bu-row foot"><button class="btn ghost sm" data-a="b-state" data-e="'+uid+'" data-v="res">Return to Reserves</button><button class="btn ghost sm danger" data-a="b-state" data-e="'+uid+'" data-v="dead">Destroyed</button>'+(i.summoned?'<button class="btn ghost sm danger" data-a="b-unsummon" data-e="'+uid+'">Remove</button>':'')+'</div>';
  return h+'</article>';
}
function bScoringHTML(b, r){
  var m = BT.mission(C, b), sg = BT.suggestion(C, r, b), final = b.round>=m.game_length, id = b.missionId, t = BT.totals(b);
  var h = '';
  if(b.scored){
    h += '<div class="notice" style="margin-top:0"><div class="grow"><b>Round '+b.round+' scored:</b> you '+(b.vp.me[b.round-1]||0)+', opponent '+(b.vp.opp[b.round-1]||0)+'. Total '+t.me+' to '+t.opp+'.</div></div>'+
      (P.guides?'<ol class="bsteps"><li>Resolve End of the Round abilities. The First Player Marker holder goes first (8.9.4).</li><li>Cleanup: remove Tokens and Markers except those with STAY IN PLAY, Damage Markers, Mission Markers and Faction Indicators showing Control. Refresh every Exhausted card (8.9.5).</li><li>The First Player Marker goes to the player with fewer Victory Points. Roll-Off if tied (8.9.6).</li></ol>':'')+
      bNoteHTML(b)+'<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px"><button class="btn primary" data-a="b-next">Start Round '+(b.round+1)+'</button></div>';
    return h;
  }
  h += '<div class="subhead" style="margin-top:0">1 · Mission Marker Control <span class="aside">8.9.1</span></div>'+bMarkersHTML(b)+
    (P.guides?'<div class="faint" style="font-size:12px;margin-top:4px">A Unit contests a Marker if it is on the battlefield, In Coherency, and has a model Within 3" with Line of Sight on the same elevation. Higher total Supply Controls it; a tie changes nothing. Flying and Burrowed Units cannot contest.</div>':'');
  h += '<div class="subhead">2 · This Round</div><div class="binputs">'+
    bEnemyStep(b, "Enemy Supply destroyed");
  if(id==="gather-the-resources") h += bStepper("Your Gather Actions", b.si.gatherMe, 'data-a="b-inp" data-v="gatherMe:-1"', 'data-a="b-inp" data-v="gatherMe:1"')+bStepper("Opponent's Gather Actions", b.si.gatherOpp, 'data-a="b-inp" data-v="gatherOpp:-1"', 'data-a="b-inp" data-v="gatherOpp:1"');
  if(id==="fire-in-the-sky") h += bLevelsHTML(b);
  if(id==="divide-and-conquer") h += bStepper("Quarters you win", b.si.quartersMe, 'data-a="b-inp" data-v="quartersMe:-1"', 'data-a="b-inp" data-v="quartersMe:1"')+bStepper("Quarters the opponent wins", b.si.quartersOpp, 'data-a="b-inp" data-v="quartersOpp:-1"', 'data-a="b-inp" data-v="quartersOpp:1"');
  if(id==="artefact-hunt" && final) h += bStepper("Your Units that CLAIM a Marker inside your Zone of Influence", b.si.claimMe, 'data-a="b-inp" data-v="claimMe:-1"', 'data-a="b-inp" data-v="claimMe:1"')+bStepper("Your-colour Markers not CLAIMED by an Enemy", b.si.safeMe, 'data-a="b-inp" data-v="safeMe:-1"', 'data-a="b-inp" data-v="safeMe:1"')+
    bStepper("Opponent's Units that CLAIM a Marker inside their Zone of Influence", b.si.claimOpp, 'data-a="b-inp" data-v="claimOpp:-1"', 'data-a="b-inp" data-v="claimOpp:1"')+bStepper("Opponent-colour Markers not CLAIMED by your Units", b.si.safeOpp, 'data-a="b-inp" data-v="safeOpp:-1"', 'data-a="b-inp" data-v="safeOpp:1"');
  h += '</div><label class="fo" style="display:flex;gap:8px;align-items:center;margin-top:8px"><input type="checkbox" data-a="b-wipe"'+(b.si.oppWiped?' checked':'')+'> The opponent has no models on the battlefield and no Units in Reserves</label>';
  h += '<div class="subhead">3 · Victory Points <span class="aside">8.9.2</span></div><div class="bscore">';
  ["me","opp"].forEach(function(w){
    var tot = Math.max(0, sg[w].total + BS.adj[w]);
    h += '<div class="bs-col"><div class="lbl-s">'+(w==="me"?"You":"Opponent")+'</div>';
    if(!sg[w].lines.length) h += '<div class="faint">Nothing suggested.</div>';
    sg[w].lines.forEach(function(l){ h += '<div class="bs-line'+(l.note?' note':'')+'"><span>'+esc(l.label)+'</span><b class="num">'+(l.note?'':'+'+l.vp)+'</b></div>'; });
    h += '<div class="bs-tot">'+bStepper("This Round", tot, 'data-a="b-adj" data-v="'+w+':-1"', 'data-a="b-adj" data-v="'+w+':1"', BS.adj[w]?'<span class="faint" style="font-size:12px">suggested '+sg[w].total+'</span>':'')+'</div></div>';
  });
  h += '</div><details class="dm-other" style="margin-top:10px"><summary>Scoring Conditions on the Mission Card</summary><div class="sc-mission" style="padding:8px 12px">'+m.scoring.concat(m.additional||[]).map(function(x){return '<p>'+Render.richText(x)+'</p>';}).join("")+
    (m.special_win_lead?'<p>The game ends immediately if a Player leads by '+m.special_win_lead+'+ VPs.</p>':'')+'</div></details>'+bNoteHTML(b);
  h += '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:12px"><button class="btn primary" data-a="b-confirm">Confirm Round '+b.round+' scores</button><button class="btn" data-a="b-back">Back to Combat Phase</button></div>';
  return h;
}
function bPhaseHTML(b, r){
  var m = BT.mission(C, b), p = b.phase, h = '<section class="section" id="b-phase"><header><span class="step">ROUND '+b.round+' OF '+m.game_length+'</span><h2>'+(b.over?"Game over":esc(BT.PHASES[p])+(p===4?" &amp; Cleanup":"")+" Phase")+'</h2><span class="aside">First Player Marker: <b>'+bWho(b.fpm)+'</b></span></header><div class="sbody">';
  h += '<div class="bph-row"><div class="bphases" role="list">'+[1,2,3,4].map(function(n){ return '<span role="listitem" class="bph'+(n===p && !b.over?' on':'')+(n<p||b.over?' done':'')+'"><b>'+n+'</b> '+esc(BT.PHASES[n])+'</span>'; }).join("")+'</div>'+
    '<button class="btn ghost sm" data-a="b-guides" aria-pressed="'+P.guides+'">'+(P.guides?'Hide guides':'Show guides')+'</button></div>';
  if(b.over){
    var t = BT.totals(b);
    h += '<div class="bresult"><div class="br-w">'+(b.over.winner==="me"?"Victory":b.over.winner==="opp"?"Defeat":"Draw")+'</div><div class="br-s num">'+t.me+' <small>you</small> · '+t.opp+' <small>opponent</small></div><div class="muted">'+esc(b.over.reason)+'</div></div>'+
      '<div class="grid2" style="margin-top:14px"><div class="field"><label for="b-summary">Summary <span class="faint" style="text-transform:none;letter-spacing:0;font-weight:500">for the battle report</span></label><textarea class="input" id="b-summary" data-a="b-summary" rows="3" placeholder="How the game went">'+esc(b.summary||"")+'</textarea></div>'+
      '<div class="field"><label for="b-mvp">MVP</label><select class="input" id="b-mvp" data-a="b-mvp"><option value="">None</option>'+BT.infos(C, r, b).map(function(i){ return '<option value="'+esc(i.uid)+'"'+(b.mvp===i.uid?' selected':'')+'>'+esc(i.unit.name+" ("+i.start+")")+'</option>'; }).join("")+'</select></div></div>'+
      '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:12px">'+bReportBtns("cur")+'</div>'+
      '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:12px"><button class="btn primary" data-a="b-quit-yes">Finish: keep it under Past battles</button><button class="btn" data-a="b-undo"'+(BS.undo.length?'':' disabled')+'>Undo last step</button></div>';
    return h+'</div></section>';
  }
  if(b.rollOff) h += '<div class="notice" style="margin:10px 0 0"><div class="grow">Victory Points are tied. Roll-Off (2D6 each): who takes the First Player Marker?</div><button class="btn sm" data-a="b-fpm" data-v="me">You</button><button class="btn sm" data-a="b-fpm" data-v="opp">Opponent</button></div>';
  if(p===1){
    var due = BT.activationDue(C, b);
    if(due) h += '<div class="notice" style="margin:10px 0 0"><div class="grow"><b>Supply Drop:</b> '+(due.auto?'Mission Marker 5 is automatically Activated this Round.':'randomly flip one Deactivated Mission Marker to its Activated side.')+'</div>'+
      (due.auto?'<button class="btn sm primary" data-a="b-mkon" data-v="5">Activate Marker 5</button>':'<button class="btn sm primary" data-a="b-mkon" data-v="random">Pick at random</button>'+due.pool.map(function(n){ return '<button class="btn sm" data-a="b-mkon" data-v="'+n+'">'+n+'</button>'; }).join(""))+'</div>';
    var anyAct = BT.infos(C, r, b).some(function(i){ return i.st.act[0] && i.st.an[0]!=="summoned"; });
    if(!anyAct && P.guides) h += '<div class="subhead">Start of the Round</div><ul class="bsteps">'+BT.startNotes(C, r, b).map(function(n){ return '<li>'+esc(n)+'</li>'; }).join("")+'</ul>';
  }
  if(p===4) return h+'<div style="margin-top:12px">'+bScoringHTML(b, r)+'</div></div></section>';
  if(P.guides) h += '<ul class="bsteps" style="margin-top:10px">'+PHASE_GUIDE[p].map(function(g){ return '<li>'+esc(g)+'</li>'; }).join("")+'</ul>';
  if(b.missionId==="gather-the-resources" && p===2) h += '<div style="margin-top:6px">'+bStepper("Opponent's Gather Actions this Round", b.si.gatherOpp, 'data-a="b-inp" data-v="gatherOpp:-1"', 'data-a="b-inp" data-v="gatherOpp:1"')+'</div>';
  if(b.missionId==="fire-in-the-sky" && p===2) h += '<div class="subhead">Sabotage Levels <span class="aside">Mission Card</span></div><div class="binputs">'+bLevelsHTML(b)+'</div>'+(P.guides?'<div class="faint" style="font-size:12px;margin-top:4px">Each Sabotage Action, yours or the opponent\'s, raises or lowers one Controlled Marker by 1 (minimum 1, maximum 3).</div>':'');
  if(p>1) h += '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px"><button class="btn sm" data-a="b-back">Back to the '+esc(BT.PHASES[p-1])+' Phase</button></div>';
  return h+'</div></section>';
}
/* On phones the battle splits into tabs; panels outside the current tab get .bt-hide (only applied below 1021px). */
function btc(tab){ return BS.tab===tab ? '' : ' bt-hide'; }
function bRailHTML(b, r){
  var m = BT.mission(C, b), t = BT.totals(b), res = BT.resource(C, r, b), h = '';
  h += '<div class="panel'+btc("score")+'" id="b-score"><h3>Score</h3><div class="pb"><table class="bvp"><thead><tr><th></th>';
  for(var n=1;n<=m.game_length;n++) h += '<th'+(n===b.round?' class="cur"':'')+'>R'+n+'</th>';
  h += '<th>Total</th></tr></thead><tbody>';
  ["me","opp"].forEach(function(w){ h += '<tr><th>'+(w==="me"?"You":"Opp.")+'</th>'; for(var n=1;n<=m.game_length;n++) h += '<td'+(n===b.round?' class="cur"':'')+'>'+(b.vp[w][n-1]==null?'':b.vp[w][n-1])+'</td>'; h += '<td><b>'+t[w]+'</b></td></tr>'; });
  h += '</tbody></table>'+(b.over||b.phase===4?'':'<div style="margin-top:10px">'+bEnemyStep(b, "Enemy Supply destroyed this Round")+'</div>')+'</div></div>';
  if(b.phase!==4 || b.scored || b.over) h += '<div class="panel'+btc("markers")+'" id="b-markers"><h3>Mission Markers</h3><div class="pb">'+bMarkersHTML(b)+'</div></div>';
  else h += '<div class="panel bt-phone'+btc("markers")+'"><h3>Mission Markers</h3><div class="pb"><p class="faint" style="margin:0 0 8px">Marker Control is set as step 1 of Scoring.</p><button class="btn sm" data-a="b-goscore">Go to Scoring</button></div></div>';
  h += '<div class="panel'+btc("cards")+'" id="b-cards"><h3>Cards · '+res.ready+' of '+res.total+' '+esc(res.type)+' Ready</h3><div class="pb bcards">';
  BT.cardList(C, r, b).forEach(function(c){
    h += '<div class="bcard'+(c.exhausted?' ex':'')+'"><button class="thumb" data-a="tcard" data-v="'+esc(c.card.id)+'" aria-label="View '+esc(c.card.name)+' card"><img src="'+ART.card(c.card.id)+'" alt="" loading="lazy"></button><div class="bc-t"><b>'+esc(c.card.name)+(c.copy?' '+c.copy:'')+'</b><span class="faint">'+(c.value?c.value+' '+esc(c.card.resource.type):'no resource value')+'</span></div>'+
      '<button class="btn sm'+(c.exhausted?'':' primary')+'" data-a="b-card" data-v="'+esc(c.key)+'" aria-pressed="'+c.exhausted+'">'+(c.exhausted?'Exhausted':'Ready')+'</button></div>';
  });
  h += (P.guides?'<div class="faint" style="font-size:12px">Exhaust a card to use its ability or to pay a cost. Cards refresh in Cleanup (10.5).</div>':'')+'</div></div>';
  h += bOppPanelHTML(b) + bReportPanelHTML();
  h += '<div class="panel'+btc("more")+'"><h3>Play options</h3><div class="pb bopts">'+
    '<div class="bopt"><button class="bchip" data-a="b-guides" aria-pressed="'+P.guides+'">Phase guides</button><span class="faint">Rules steps and help text for each Phase.</span></div>'+
    '<div class="bopt"><button class="bchip" data-a="b-wake" aria-pressed="'+P.wake+'">Keep screen awake</button><span class="faint" id="b-wake-st">'+esc(wakeText())+'</span></div></div></div>';
  h += '<div class="panel'+btc("more")+'"><h3>Reference</h3><div class="pb" style="display:flex;gap:6px;flex-wrap:wrap"><button class="btn sm" data-a="b-mcard" data-v="'+esc(b.missionId)+'">Mission Card</button>'+(b.terrain?'<button class="btn sm" data-a="b-tmap" data-v="'+esc(b.terrain)+'">Terrain map</button>':'')+(b.deploymentId?'<button class="btn sm" data-a="dmap" data-v="'+esc(b.deploymentId)+'">Deployment map</button>':'')+'<button class="btn sm" data-a="kw-all">Keywords</button></div></div>';
  h += '<div class="panel'+btc("more")+'"><h3>Battle</h3><div class="pb" style="display:flex;gap:6px;flex-wrap:wrap;align-items:center"><button class="btn sm" data-a="b-undo"'+(BS.undo.length?'':' disabled')+'>Undo last step</button>'+
    (!b.clock && !b.over ? '<button class="btn sm" data-a="b-clk" data-v="add">Add a chess clock</button>' : '')+
    (BS.quit?'<span class="muted">End this battle and clear its tracking?</span><button class="btn danger sm" data-a="b-quit-yes">End battle</button><button class="btn sm" data-a="b-quit-no">Keep</button>':'<button class="btn ghost sm danger" data-a="b-quit">End battle</button>')+'</div></div>';
  if(b.log.length) h += '<details class="panel blog'+btc("more")+'"><summary><h3>Battle log ('+b.log.length+')</h3></summary><div class="pb">'+b.log.slice(-60).reverse().map(function(l){ return '<div class="bl"><span class="faint num">R'+l.r+' P'+l.p+'</span> '+esc(l.t)+'</div>'; }).join("")+'</div></details>';
  return h;
}
/* Chess clock strip in the bottom bar. The running side is pressed. With a limit the time counts down and goes negative. */
function bClockVal(c, who){ return BT.clockText(c.left ? c.left[who] : c[who]); }
function bClockHTML(b){
  var c = BT.clockRead(b); if(!c) return "";
  var side = function(who){ var over = c.left && c.left[who] < 0;
    return '<button class="clk'+(over?' over':'')+'" data-a="b-clk" data-v="'+who+'" aria-pressed="'+(c.run===who)+'"'+(b.over?' disabled':'')+' aria-label="'+bWho(who)+' clock"><span>'+(who==="me"?"You":"Opp.")+'</span><b class="num" data-clk="'+who+'">'+bClockVal(c, who)+'</b></button>'; };
  return '<div class="bd-clk">'+side("me")+'<span class="clk-st" id="clk-st">'+(b.over?"Stopped":c.run?"Running":"Paused")+'</span>'+side("opp")+'</div>';
}
function bClockTick(){
  var r = S.cur, b = r && r.battle; if(!b || !b.clock || !b.clock.run) return;
  var c = BT.clockRead(b);
  ["me","opp"].forEach(function(who){ var n = document.querySelector('[data-clk="'+who+'"]'); if(!n) return; n.textContent = bClockVal(c, who); n.parentNode.classList.toggle("over", !!(c.left && c.left[who] < 0)); });
}
setInterval(bClockTick, 500);
/* Undo puts the battle back but leaves the clock where it is: time spent is not given back. */
function bUndoTo(r, prev){ var clock = r.battle && r.battle.clock, nb = JSON.parse(prev); if(clock !== undefined && nb.clock !== undefined) nb.clock = clock; r.battle = nb; }
/* Fixed bar at the bottom of the screen: where the battle stands, Undo and the next step, plus the phone tabs. */
function bDockHTML(b, r){
  var m = BT.mission(C, b), t = BT.totals(b), p = b.phase, h = '<div class="bdock" role="region" aria-label="Battle controls"><div class="wrap">';
  var warn = function(list, info){ return '<div class="bd-warn">'+list.map(function(w){ return '<div class="check '+(info && /^(Pay |Mission Marker )/.test(w)?'info':'warn')+'"><span class="mk"></span><span>'+esc(w)+'</span></div>'; }).join("")+'</div>'; };
  if(BS.warn.length) h += warn(BS.warn, true);
  h += bClockHTML(b);
  if(BS.pass && p<=3 && !b.over){
    var pw = BT.phaseWarnings(C, r, b);
    if(pw.length) h += warn(pw, false);
    h += '<div class="bd-row bd-ask">'+(p<=2
      ? '<span class="bd-q">Who Passed first? They take the First Player Marker for the '+esc(BT.PHASES[p+1])+' Phase.</span><span class="bd-btns"><button class="btn primary" data-a="b-pass" data-v="me">You</button><button class="btn primary" data-a="b-pass" data-v="opp">Opponent</button><button class="btn ghost" data-a="b-pass" data-v="cancel">Cancel</button></span>'
      : '<span class="bd-q">End the Combat Phase and go to Scoring?</span><span class="bd-btns"><button class="btn primary" data-a="b-pass" data-v="go">Go to Scoring</button><button class="btn ghost" data-a="b-pass" data-v="cancel">Cancel</button></span>')+'</div>';
  } else {
    var next = b.over ? '' : p<=3 ? '<button class="btn primary" data-a="b-end">End '+esc(BT.PHASES[p])+'</button>'
      : b.scored ? '<button class="btn primary" data-a="b-next">Start Round '+(b.round+1)+'</button>' : '<button class="btn primary" data-a="b-goscore">Scoring</button>';
    h += '<div class="bd-row"><div class="bd-st"><b>'+(b.over?"Game over":"R"+b.round+"/"+m.game_length+" · "+esc(BT.PHASES[p]))+'</b><span class="num">VP '+t.me+'–'+t.opp+' · First: '+bWho(b.fpm)+'</span></div>'+
      '<button class="btn" data-a="b-undo"'+(BS.undo.length?'':' disabled')+'>Undo</button>'+next+'</div>';
  }
  h += '<nav class="bd-tabs" aria-label="Battle sections">'+[["play","Play"],["score","Score"],["markers","Markers"],["cards","Cards"],["more","More"]].map(function(x){
    return '<button data-a="b-tab" data-v="'+x[0]+'" aria-pressed="'+(BS.tab===x[0])+'">'+x[1]+'</button>'; }).join("")+'</nav>';
  return h+'</div></div>';
}
function bGroupHTML(g, b, r, sup){
  if(g.coll && !g.items.length) return '';
  var h = '';
  if(g.coll){
    var open = !!BS.grp[g.key];
    h += '<button class="bgrp" data-a="b-grp" data-v="'+g.key+'" aria-expanded="'+open+'"><span>'+g.title+'</span><span class="aside">'+g.items.length+'</span><span class="v-chev" aria-hidden="true"></span></button>';
    if(!open) return h;
  } else h += '<div class="subhead">'+g.title+' <span class="aside">'+g.items.length+'</span></div>';
  if(g.items.length) h += '<div class="bunits">'+g.items.map(function(i){ return bUnitHTML(i, b, r, sup); }).join("")+'</div>';
  else if(g.empty) h += '<div class="empty">'+g.empty+'</div>';
  if(g.hidden) h += g.hidden;
  return h;
}
