/* ------------ battle tracker (Battle tab) ------------
   Rules logic lives in battle-core.js (window.Battle). State is kept on the roster as r.battle and saved with it.
   The tracker guides and warns; it never blocks a step. */
var BT = window.Battle;
var BS = { set:null, warn:[], pass:false, undo:[], quit:false, adj:{me:0, opp:0}, sumPick:false, openAb:{} };
var PHASE_GUIDE = {
  1: ["Players take turns activating one Unit at a time. The holder of the First Player Marker decides who goes first.", "Each Unit performs one action: Deploy (from Reserves), Move, Disengage or Hold.", "The first player to Pass takes the First Player Marker for the Assault Phase."],
  2: ["Players take turns activating one Unit on the battlefield. Units in Reserves cannot act.", "Each Unit performs one action: Ranged Attack, Charge, Run or Hold.", "The first player to Pass takes the First Player Marker for the Combat Phase."],
  3: ["Every Engaged Unit must activate and make a Close Combat Attack. Close Ranks first if you want to (optional, up to 3\").", "Flying Units take no part. A player Passes only when they have no Engaged Units left to activate."],
  4: ["Work down the steps: Mission Marker control, Victory Points, End of Game check, End of the Round effects, Cleanup, then initiative."]
};
function bWho(w){ return w==="me" ? "You" : "Opponent"; }
function bCommit(){
  var r = S.cur; if(!r) return;
  if(r.isExample){ delete r.isExample; r.id = "r_"+RosterCore.uid(); r.createdAt = Date.now(); if(S.notice && S.notice.example) S.notice=null; renderCrumb(); }
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
function bMarkersHTML(b){
  var h = '<div class="mks">';
  Object.keys(b.markers).map(Number).forEach(function(n){
    var mk = b.markers[n], aff = BT.affinity(n), mine = aff && aff===b.color, cls = "mk "+(aff||"neutral")+(mk.own?" "+mk.own:"")+(mk.gone?" gone":"");
    var sub = mk.gone ? "Removed" : mk.own ? bWho(mk.own) : "No one";
    h += '<button class="'+cls+'" data-a="b-mk" data-v="'+n+'"'+(mk.gone?' disabled':'')+' aria-label="Mission Marker '+n+', '+(aff?aff+(mine?", your colour":", opponent\'s colour"):"neutral")+', controlled by '+sub+'. Tap to change."><span class="mk-n">'+n+'</span><span class="mk-o">'+sub+'</span>'+
      (b.missionId==="supply-drop" && !mk.gone ? '<span class="mk-s">'+(mk.on?"Activated R"+mk.ar:"Deactivated")+'</span>' : '')+'</button>';
  });
  return h+'</div><div class="faint" style="font-size:12px">Tap a Marker to change who Controls it. Ring colour: red Markers 1 and 3, blue 2 and 4, green 5 is Neutral. You are '+(b.color==="red"?"Red":"Blue")+'.</div>';
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
  if(!r.units.length) return h+'<div class="empty">Add units on the Build tab first. The tracker follows the units, cards and upgrades on this roster.</div></div></section>';
  if(errs.length) h += '<div class="notice err" style="margin-top:0"><div class="grow">This roster has '+errs.length+' rules issue'+(errs.length>1?'s':'')+'. You can still track a battle with it.</div><button class="btn sm" data-a="tab" data-v="build">Fix in Build</button></div>';
  h += '<div class="subhead" style="margin-top:'+(errs.length?'14px':'0')+'">Mission Card <span class="aside">'+(side==="skirmish"?"Skirmish Level":"Standard Engagement")+' side</span></div><div class="tiles">';
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
  h += '<div class="grid2" style="margin-top:16px"><div class="field"><span class="lbl-s">Your colour</span><div class="seg"><button data-a="b-set" data-v="color:red" aria-pressed="'+(st.color==="red")+'">Red Player</button><button data-a="b-set" data-v="color:blue" aria-pressed="'+(st.color==="blue")+'">Blue Player</button></div><span class="faint" style="font-size:12px">Sets your Entry Edge and which Markers are your colour (1 and 3 Red, 2 and 4 Blue).</span></div>'+
    '<div class="field"><span class="lbl-s">First Player Marker for Round 1</span><div class="seg"><button data-a="b-set" data-v="fpm:me" aria-pressed="'+(st.fpm==="me")+'">You</button><button data-a="b-set" data-v="fpm:opp" aria-pressed="'+(st.fpm==="opp")+'">Opponent</button></div><span class="faint" style="font-size:12px">The Roll-Off winner gives it to either player (8.2.2).</span></div></div>';
  h += '<div style="margin-top:16px;display:flex;gap:8px;align-items:center;flex-wrap:wrap"><button class="btn primary" data-a="b-start">Start battle</button><span class="faint">Every Unit starts in Reserves (8.3).</span></div></div></section>';
  return h;
}
function bUnitHTML(i, b, r){
  var st = i.st, u = i.unit, p = b.phase, idx = p-1, acted = p<=3 && st.act[idx];
  var acts = BT.actionsFor(C, r, b, i.uid), cardBtn = '<button class="btn ghost sm" data-a="card" data-v="'+esc(u.id)+'"'+(i.summoned?'':' data-e="'+esc(i.uid)+'"')+'>Card</button>';
  var h = '<article class="bunit '+i.state+(acted?' acted':'')+(i.casualtyDue?' has-err':'')+'" id="b-'+esc(i.uid)+'"><div class="bu-h"><button class="thumb mini" data-a="card" data-v="'+esc(u.id)+'"'+(i.summoned?'':' data-e="'+esc(i.uid)+'"')+' aria-label="View '+esc(u.name)+' card">'+miniImg(u.id)+'</button>'+
    '<div class="bu-t"><div class="e-name">'+esc(u.name)+(i.summoned?' <span class="chip">Summoned</span>':'')+'</div><div class="bu-meta">';
  if(i.state==="dead") h += '<span class="pill err">Destroyed</span>';
  else {
    h += '<span class="chip slot">Supply '+i.supplyNow+(i.zeroPool?' · 0 for the pool':'')+'</span>';
    if(i.supplyNow<st.s0) h += '<span class="pill warn">−'+(st.s0-i.supplyNow)+' Supply this Round</span>';
    if(i.shield) h += '<span class="chip'+(i.shielded?' slot':'')+'">'+(i.shielded?'Shielded':'Shield lost')+'</span>';
    if(st.dis) h += '<span class="pill warn">Disengaged</span>';
  }
  h += '</div></div><span class="bu-r">'+cardBtn+'</span></div>';
  if(i.state==="dead") return h+'<div class="bu-row"><button class="btn sm" data-a="b-state" data-e="'+esc(i.uid)+'" data-v="fld">Restore</button>'+(i.summoned?'<button class="btn ghost sm danger" data-a="b-unsummon" data-e="'+esc(i.uid)+'">Remove</button>':'')+'</div></article>';
  if(i.state==="res"){
    var s = BT.supply(C, r, b), fits = s.unlimited || i.poolSupply<=s.available;
    h += '<div class="bu-row"><span class="muted">'+i.models+' model'+(i.models>1?'s':'')+' · needs '+i.poolSupply+' Supply'+(fits?'':' <b style="color:var(--err)">(only '+Math.max(0,s.available)+' available)</b>')+'</span><span class="grow"></span>'+
      (p===1 && !b.over ? '<button class="btn sm '+(acted?'':'primary')+'" data-a="b-act" data-e="'+esc(i.uid)+'" data-v="deploy">Deploy</button>' : '<button class="btn sm" data-a="b-state" data-e="'+esc(i.uid)+'" data-v="fld">Put on battlefield</button>')+'</div>';
    return h+'</article>';
  }
  h += '<div class="bu-row">'+bStepper("Models", i.models+' <small>/ '+i.start+'</small>', 'data-a="b-m" data-e="'+esc(i.uid)+'" data-v="-1"', 'data-a="b-m" data-e="'+esc(i.uid)+'" data-v="1"')+
    bStepper("Damage", st.d+' <small>/ HP '+i.threshold+'</small>', 'data-a="b-d" data-e="'+esc(i.uid)+'" data-v="-1"', 'data-a="b-d" data-e="'+esc(i.uid)+'" data-v="1"')+'</div>';
  if(i.casualtyDue) h += '<div class="check error"><span class="mk"></span><span>Damage '+st.d+' has reached this model\'s '+i.threshold+' Hit Points'+(i.shield && !st.first?' (HP '+i.hp+' + Shield '+i.shield+')':'')+'. Remove a casualty unless this was Non-Lethal Damage. <button class="btn sm" data-a="b-cas" data-e="'+esc(i.uid)+'">Remove casualty</button></span></div>';
  h += '<div class="bu-row chips"><button class="bchip" data-a="b-eng" data-e="'+esc(i.uid)+'" aria-pressed="'+(!!st.eng)+'">Engaged</button>';
  BT.statusKeys(C, r, i).forEach(function(k){ h += '<button class="bchip" data-a="b-stat" data-e="'+esc(i.uid)+'" data-v="'+k+'" aria-pressed="'+(!!st.stat[k])+'">'+esc(BT.STATUS[k])+'</button>'; });
  h += '</div>';
  if(p<=3 && !b.over){
    h += '<div class="bu-row acts">';
    if(acted) h += '<span class="pill ok">'+esc(st.an[idx]==="summoned"?"Summoned this Phase":(BT.ACTIONS[st.an[idx]]||{label:"Activated"}).label)+'</span><button class="btn ghost sm" data-a="b-unact" data-e="'+esc(i.uid)+'">Undo</button>';
    else if(acts.length) acts.forEach(function(a){ h += '<button class="btn sm primary" data-a="b-act" data-e="'+esc(i.uid)+'" data-v="'+a+'">'+esc(BT.ACTIONS[a].label)+(a==="gather"?" +1 VP":"")+'</button>'; });
    else h += '<span class="faint">'+(p===3?"Not Engaged: no action in the Combat Phase.":"No action available.")+'</span>';
    h += '</div>';
  }
  var abs = BT.abilitiesFor(C, r, b, i.uid);
  if(abs.length && p<=3){
    var open = !!BS.openAb[i.uid];
    h += '<div class="bu-ab"><button class="btn ghost sm" data-a="b-ab" data-e="'+esc(i.uid)+'" aria-expanded="'+open+'">'+(open?'Hide':'Show')+' abilities for this Phase ('+abs.length+')</button>';
    if(open) abs.forEach(function(a){
      h += '<div class="ab'+(a.used?' used':'')+'"><div class="ab-h"><b>'+esc(a.ability.name)+'</b> '+tp(a.ability.type)+(a.ability.cost?' <span class="faint">'+esc(a.ability.cost)+'</span>':'')+'<span class="grow"></span>'+
        (a.usable ? (a.used && !a.repeatable ? '<span class="pill neutral">Used</span><button class="btn ghost sm" data-a="b-unuse" data-e="'+esc(i.uid)+'" data-v="'+esc(a.ability.name)+'">Undo</button>' : '<button class="btn sm" data-a="b-use" data-e="'+esc(i.uid)+'" data-v="'+esc(a.ability.name)+'">Use</button>') : '')+'</div><div class="u-desc">'+Render.richText(a.ability.text)+'</div></div>';
    });
    h += '</div>';
  }
  h += '<div class="bu-row foot"><button class="btn ghost sm" data-a="b-state" data-e="'+esc(i.uid)+'" data-v="res">Return to Reserves</button><button class="btn ghost sm danger" data-a="b-state" data-e="'+esc(i.uid)+'" data-v="dead">Destroyed</button>'+(i.summoned?'<button class="btn ghost sm danger" data-a="b-unsummon" data-e="'+esc(i.uid)+'">Remove</button>':'')+'</div>';
  return h+'</article>';
}
function bScoringHTML(b, r){
  var m = BT.mission(C, b), sg = BT.suggestion(C, r, b), final = b.round>=m.game_length, id = b.missionId, t = BT.totals(b);
  var h = '';
  if(b.scored){
    h += '<div class="notice" style="margin-top:0"><div class="grow"><b>Round '+b.round+' scored:</b> you '+(b.vp.me[b.round-1]||0)+', opponent '+(b.vp.opp[b.round-1]||0)+'. Total '+t.me+' to '+t.opp+'.</div></div>'+
      '<ol class="bsteps"><li>Resolve End of the Round abilities. The First Player Marker holder goes first (8.9.4).</li><li>Cleanup: remove Tokens and Markers except those with STAY IN PLAY, Damage Markers, Mission Markers and Faction Indicators showing Control. Refresh every Exhausted card (8.9.5).</li><li>The First Player Marker goes to the player with fewer Victory Points. Roll-Off if tied (8.9.6).</li></ol>'+
      '<div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn primary" data-a="b-next">Start Round '+(b.round+1)+'</button></div>';
    return h;
  }
  h += '<div class="subhead" style="margin-top:0">1 · Mission Marker Control <span class="aside">8.9.1</span></div>'+bMarkersHTML(b)+
    '<div class="faint" style="font-size:12px;margin-top:4px">A Unit contests a Marker if it is on the battlefield, In Coherency, and has a model Within 3" with Line of Sight on the same elevation. Higher total Supply Controls it; a tie changes nothing. Flying and Burrowed Units cannot contest.</div>';
  h += '<div class="subhead">2 · This Round</div><div class="binputs">'+
    bStepper("Enemy Supply destroyed", b.si.enemyLost, 'data-a="b-inp" data-v="enemyLost:-1"', 'data-a="b-inp" data-v="enemyLost:1"');
  if(id==="gather-the-resources") h += bStepper("Your Gather Actions", b.si.gatherMe, 'data-a="b-inp" data-v="gatherMe:-1"', 'data-a="b-inp" data-v="gatherMe:1"')+bStepper("Opponent's Gather Actions", b.si.gatherOpp, 'data-a="b-inp" data-v="gatherOpp:-1"', 'data-a="b-inp" data-v="gatherOpp:1"');
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
    (m.special_win_lead?'<p>The game ends immediately if a Player leads by '+m.special_win_lead+'+ VPs.</p>':'')+'</div></details>';
  h += '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:12px"><button class="btn primary" data-a="b-confirm">Confirm Round '+b.round+' scores</button><button class="btn" data-a="b-back">Back to Combat Phase</button></div>';
  return h;
}
function bPhaseHTML(b, r){
  var m = BT.mission(C, b), p = b.phase, h = '<section class="section" id="b-phase"><header><span class="step">ROUND '+b.round+' OF '+m.game_length+'</span><h2>'+(b.over?"Game over":esc(BT.PHASES[p])+(p===4?" &amp; Cleanup":"")+" Phase")+'</h2><span class="aside">First Player Marker: <b>'+bWho(b.fpm)+'</b></span></header><div class="sbody">';
  h += '<div class="bphases" role="list">'+[1,2,3,4].map(function(n){ return '<span role="listitem" class="bph'+(n===p && !b.over?' on':'')+(n<p||b.over?' done':'')+'"><b>'+n+'</b> '+esc(BT.PHASES[n])+'</span>'; }).join("")+'</div>';
  if(BS.warn.length) h += '<div class="checks" style="margin:10px 0">'+BS.warn.map(function(w){ return '<div class="check '+(/^(Pay |Mission Marker )/.test(w)?'info':'warn')+'"><span class="mk"></span><span>'+esc(w)+'</span></div>'; }).join("")+'</div>';
  if(b.over){
    var t = BT.totals(b);
    h += '<div class="bresult"><div class="br-w">'+(b.over.winner==="me"?"Victory":b.over.winner==="opp"?"Defeat":"Draw")+'</div><div class="br-s num">'+t.me+' <small>you</small> · '+t.opp+' <small>opponent</small></div><div class="muted">'+esc(b.over.reason)+'</div></div>'+
      '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:12px"><button class="btn primary" data-a="b-quit-yes">Finish and clear this battle</button><button class="btn" data-a="b-undo"'+(BS.undo.length?'':' disabled')+'>Undo last step</button></div>';
    return h+'</div></section>';
  }
  if(b.rollOff) h += '<div class="notice" style="margin:10px 0 0"><div class="grow">Victory Points are tied. Roll-Off (2D6 each): who takes the First Player Marker?</div><button class="btn sm" data-a="b-fpm" data-v="me">You</button><button class="btn sm" data-a="b-fpm" data-v="opp">Opponent</button></div>';
  if(p===1){
    var due = BT.activationDue(C, b);
    if(due) h += '<div class="notice" style="margin:10px 0 0"><div class="grow"><b>Supply Drop:</b> '+(due.auto?'Mission Marker 5 is automatically Activated this Round.':'randomly flip one Deactivated Mission Marker to its Activated side.')+'</div>'+
      (due.auto?'<button class="btn sm primary" data-a="b-mkon" data-v="5">Activate Marker 5</button>':'<button class="btn sm primary" data-a="b-mkon" data-v="random">Pick at random</button>'+due.pool.map(function(n){ return '<button class="btn sm" data-a="b-mkon" data-v="'+n+'">'+n+'</button>'; }).join(""))+'</div>';
    var anyAct = BT.infos(C, r, b).some(function(i){ return i.st.act[0] && i.st.an[0]!=="summoned"; });
    if(!anyAct) h += '<div class="subhead">Start of the Round</div><ul class="bsteps">'+BT.startNotes(C, r, b).map(function(n){ return '<li>'+esc(n)+'</li>'; }).join("")+'</ul>';
  }
  if(p===4) return h+'<div style="margin-top:12px">'+bScoringHTML(b, r)+'</div></div></section>';
  h += '<ul class="bsteps" style="margin-top:10px">'+PHASE_GUIDE[p].map(function(g){ return '<li>'+esc(g)+'</li>'; }).join("")+'</ul>';
  if(b.missionId==="gather-the-resources" && p===2) h += '<div style="margin-top:6px">'+bStepper("Opponent's Gather Actions this Round", b.si.gatherOpp, 'data-a="b-inp" data-v="gatherOpp:-1"', 'data-a="b-inp" data-v="gatherOpp:1"')+'</div>';
  var pw = BT.phaseWarnings(C, r, b);
  if(BS.pass){
    if(pw.length) h += '<div class="checks" style="margin-top:10px">'+pw.map(function(w){ return '<div class="check warn"><span class="mk"></span><span>'+esc(w)+'</span></div>'; }).join("")+'</div>';
    h += p<=2 ? '<div class="notice" style="margin-top:10px"><div class="grow">Who Passed first this Phase? They take the First Player Marker for the '+esc(BT.PHASES[p+1])+' Phase (8.2.1).</div><button class="btn sm primary" data-a="b-pass" data-v="me">You</button><button class="btn sm primary" data-a="b-pass" data-v="opp">Opponent</button><button class="btn ghost sm" data-a="b-pass" data-v="cancel">Cancel</button></div>'
      : '<div class="notice" style="margin-top:10px"><div class="grow">End the Combat Phase and go to Scoring?</div><button class="btn sm primary" data-a="b-pass" data-v="go">Go to Scoring</button><button class="btn ghost sm" data-a="b-pass" data-v="cancel">Cancel</button></div>';
  } else h += '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:12px"><button class="btn primary" data-a="b-end">End '+esc(BT.PHASES[p])+' Phase</button>'+(p>1?'<button class="btn" data-a="b-back">Back</button>':'')+'</div>';
  return h+'</div></section>';
}
function bRailHTML(b, r){
  var m = BT.mission(C, b), t = BT.totals(b), res = BT.resource(C, r, b), h = '';
  h += '<div class="panel"><h3>Score</h3><div class="pb"><table class="bvp"><thead><tr><th></th>';
  for(var n=1;n<=m.game_length;n++) h += '<th'+(n===b.round?' class="cur"':'')+'>R'+n+'</th>';
  h += '<th>Total</th></tr></thead><tbody>';
  ["me","opp"].forEach(function(w){ h += '<tr><th>'+(w==="me"?"You":"Opp.")+'</th>'; for(var n=1;n<=m.game_length;n++) h += '<td'+(n===b.round?' class="cur"':'')+'>'+(b.vp[w][n-1]==null?'':b.vp[w][n-1])+'</td>'; h += '<td><b>'+t[w]+'</b></td></tr>'; });
  h += '</tbody></table>'+(b.over||b.phase===4?'':'<div style="margin-top:10px">'+bStepper("Enemy Supply destroyed this Round", b.si.enemyLost, 'data-a="b-inp" data-v="enemyLost:-1"', 'data-a="b-inp" data-v="enemyLost:1"')+'</div>')+'</div></div>';
  if(b.phase!==4 || b.scored || b.over) h += '<div class="panel"><h3>Mission Markers</h3><div class="pb">'+bMarkersHTML(b)+'</div></div>';
  h += '<div class="panel"><h3>Cards · '+res.ready+' of '+res.total+' '+esc(res.type)+' Ready</h3><div class="pb bcards">';
  BT.cardList(C, r, b).forEach(function(c){
    h += '<div class="bcard'+(c.exhausted?' ex':'')+'"><button class="thumb" data-a="tcard" data-v="'+esc(c.card.id)+'" aria-label="View '+esc(c.card.name)+' card"><img src="'+ART.card(c.card.id)+'" alt="" loading="lazy"></button><div class="bc-t"><b>'+esc(c.card.name)+(c.copy?' '+c.copy:'')+'</b><span class="faint">'+(c.value?c.value+' '+esc(c.card.resource.type):'no resource value')+'</span></div>'+
      '<button class="btn sm'+(c.exhausted?'':' primary')+'" data-a="b-card" data-v="'+esc(c.key)+'" aria-pressed="'+c.exhausted+'">'+(c.exhausted?'Exhausted':'Ready')+'</button></div>';
  });
  h += '<div class="faint" style="font-size:12px">Exhaust a card to use its ability or to pay a cost. Cards refresh in Cleanup (10.5).</div></div></div>';
  h += '<div class="panel"><h3>Reference</h3><div class="pb" style="display:flex;gap:6px;flex-wrap:wrap"><button class="btn sm" data-a="b-mcard" data-v="'+esc(b.missionId)+'">Mission Card</button>'+(b.deploymentId?'<button class="btn sm" data-a="dmap" data-v="'+esc(b.deploymentId)+'">Deployment map</button>':'')+'<button class="btn sm" data-a="kw-all">Keywords</button></div></div>';
  h += '<div class="panel"><h3>Battle</h3><div class="pb" style="display:flex;gap:6px;flex-wrap:wrap;align-items:center"><button class="btn sm" data-a="b-undo"'+(BS.undo.length?'':' disabled')+'>Undo last step</button>'+
    (BS.quit?'<span class="muted">End this battle and clear its tracking?</span><button class="btn danger sm" data-a="b-quit-yes">End battle</button><button class="btn sm" data-a="b-quit-no">Keep</button>':'<button class="btn ghost sm danger" data-a="b-quit">End battle</button>')+'</div></div>';
  if(b.log.length) h += '<details class="panel blog"><summary><h3>Battle log ('+b.log.length+')</h3></summary><div class="pb">'+b.log.slice(-60).reverse().map(function(l){ return '<div class="bl"><span class="faint num">R'+l.r+' P'+l.p+'</span> '+esc(l.t)+'</div>'; }).join("")+'</div></details>';
  return h;
}
function renderBattle(){
  var el = $("battle"); if(!el) return;
  var r = S.cur, b = r.battle;
  if(!BT || !b || !C.missions[b.missionId]){ if(b) delete r.battle; renderMeters(); el.innerHTML = bSetupHTML(r); return; }
  BT.sync(C, r, b);
  var strip = $("meters"); if(strip) strip.innerHTML = bStripHTML(b, r);
  var list = BT.infos(C, r, b), groups = {fld:[], res:[], dead:[]};
  list.forEach(function(i){ groups[i.state].push(i); });
  var h = '<div class="layout"><div class="main">'+bPhaseHTML(b, r)+'<section class="section" id="b-units"><header><span class="step">ARMY</span><h2>Units</h2><span class="aside">'+groups.fld.length+' on the battlefield · '+groups.res.length+' in Reserves</span></header><div class="sbody">';
  [["fld","On the battlefield"],["res","Reserves"],["dead","Destroyed"]].forEach(function(g){
    if(!groups[g[0]].length && g[0]!=="fld") return;
    h += '<div class="subhead"'+(g[0]==="fld"?' style="margin-top:0"':'')+'>'+g[1]+' <span class="aside">'+groups[g[0]].length+'</span></div>';
    h += groups[g[0]].length ? '<div class="bunits">'+groups[g[0]].map(function(i){ return bUnitHTML(i, b, r); }).join("")+'</div>' : '<div class="empty">No Units on the battlefield yet. Deploy from Reserves in the Movement Phase.</div>';
  });
  var sm = BT.summonable(C, r);
  if(sm.length && !b.over) h += '<div style="margin-top:12px;display:flex;gap:6px;flex-wrap:wrap;align-items:center">'+(BS.sumPick ? '<span class="muted">Summon:</span>'+sm.map(function(u){ return '<button class="btn sm" data-a="b-summon" data-v="'+esc(u.id)+'">'+esc(u.name)+'</button>'; }).join("")+'<button class="btn ghost sm" data-a="b-sumpick">Cancel</button>' : '<button class="btn sm" data-a="b-sumpick">Add a Summoned Unit</button>')+'</div>';
  h += '</div></section></div><aside class="rail" id="b-rail">'+bRailHTML(b, r)+'</aside></div>';
  el.innerHTML = h;
}
function bClick(a, v, eu, t){
  var r = S.cur, b = r && r.battle;
  switch(a){
    case "b-set": var kv = v.split(":"); BS.set[kv[0]] = kv.slice(1).join(":"); renderBattle(); return true;
    case "b-mcard": var mm = C.missions[v]; if(mm) openModal(Render.missionCardHTML(mm, BT.side(C, r))); return true;
    case "b-start":
      var nb = BT.create(C, r, BS.set); if(!nb) return true;
      r.battle = nb; BS.undo = []; BS.warn = []; BS.pass = false; BS.quit = false; BS.adj = {me:0, opp:0}; BS.openAb = {};
      bCommit(); window.scrollTo(0,0); return true;
  }
  if(!b) return false;
  switch(a){
    case "b-act": bMut(function(){ return BT.act(C, r, b, eu, v); }); return true;
    case "b-unact": bMut(function(){ BT.clearAct(C, r, b, eu); }); return true;
    case "b-m": bMut(function(){ BT.changeModels(C, r, b, eu, Number(v)); }); return true;
    case "b-d": bMut(function(){ BT.changeDamage(C, r, b, eu, Number(v)); }); return true;
    case "b-cas": bMut(function(){ BT.removeCasualty(C, r, b, eu); }); return true;
    case "b-eng": bMut(function(){ BT.toggleEngaged(C, r, b, eu); }); return true;
    case "b-stat": bMut(function(){ BT.toggleStatus(C, r, b, eu, v); }); return true;
    case "b-state": bMut(function(){ BT.setState(C, r, b, eu, v); }); return true;
    case "b-ab": BS.openAb[eu] = !BS.openAb[eu]; renderBattle(); return true;
    case "b-use": bMut(function(){ return BT.useAbility(C, r, b, eu, v); }); return true;
    case "b-unuse": bMut(function(){ BT.unuseAbility(C, r, b, eu, v); }); return true;
    case "b-card": bMut(function(){ BT.toggleCard(C, r, b, v); }); return true;
    case "b-mk": bMut(function(){ BT.cycleMarker(C, b, Number(v)); }); return true;
    case "b-mkon": bMut(function(){ var due = BT.activationDue(C, b); if(!due) return; var n = v==="random" ? due.pool[Math.floor(Math.random()*due.pool.length)] : Number(v); BT.activateMarker(C, b, n); return v==="random" ? {warnings:["Mission Marker "+n+" was picked at random and is now Activated."]} : null; }); return true;
    case "b-inp": var f = v.split(":"), cap = /quarters/.test(f[0]) ? 4 : 99; bMut(function(){ b.si[f[0]] = Math.max(0, Math.min(cap, (b.si[f[0]]||0)+Number(f[1]))); }); return true;
    case "b-adj": var g = v.split(":"); BS.adj[g[0]] += Number(g[1]); renderBattle(); return true;
    case "b-end": BS.pass = true; renderBattle(); var ph = $("b-phase"); if(ph) ph.scrollIntoView({block:"nearest"}); return true;
    case "b-pass": BS.pass = false; if(v==="cancel"){ renderBattle(); return true; } bMut(function(){ BT.advance(C, r, b, v); }); var p2 = $("b-phase"); if(p2) p2.scrollIntoView({block:"start"}); return true;
    case "b-back": bMut(function(){ BT.back(C, r, b); }); return true;
    case "b-fpm": bMut(function(){ b.fpm = v; b.rollOff = false; }); return true;
    case "b-confirm": bMut(function(){ var sg = BT.suggestion(C, r, b); BT.confirmScores(C, r, b, Math.max(0, sg.me.total+BS.adj.me), Math.max(0, sg.opp.total+BS.adj.opp)); BS.adj = {me:0, opp:0}; }); var p3 = $("b-phase"); if(p3) p3.scrollIntoView({block:"start"}); return true;
    case "b-next": bMut(function(){ BT.nextRound(C, r, b); }); window.scrollTo(0,0); return true;
    case "b-undo": var prev = BS.undo.pop(); if(prev){ r.battle = JSON.parse(prev); BS.warn = []; BS.pass = false; bCommit(); } return true;
    case "b-quit": BS.quit = true; renderBattle(); return true;
    case "b-quit-no": BS.quit = false; renderBattle(); return true;
    case "b-quit-yes": delete r.battle; BS.quit = false; BS.undo = []; BS.set = null; BS.warn = []; bCommit(); window.scrollTo(0,0); return true;
    case "b-sumpick": BS.sumPick = !BS.sumPick; renderBattle(); return true;
    case "b-summon": BS.sumPick = false; bMut(function(){ BT.addSummoned(C, r, b, v); }); return true;
    case "b-unsummon": bMut(function(){ BT.removeSummoned(C, r, b, eu); }); return true;
  }
  return false;
}

