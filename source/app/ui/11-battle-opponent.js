/* ------------ opponent's list, kills, battle report, past battles ------------ */
var SWORDS = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M2 2l6.2 6.2M2 2h3M2 2v3M14 2L7.8 8.2M14 2h-3M14 2v3M5.2 9.2l1.6 1.6M10.8 9.2l-1.6 1.6M4.5 11.5l-2 2M11.5 11.5l2 2" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>';
var REPORT_FMT = { id:"report", ext:"html", name:"Battle report" };
function hasOpp(b){ return !!(b && b.opp && b.opp.order && b.opp.order.length); }
/* A pasted list: a SurgeCraft share code / roster file, or a text list in the Tabletop Simulator export layout. */
function readOppText(txt){
  txt = (txt||"").trim(); if(!txt) return { error:"Paste their list first." };
  if(txt.indexOf("SCM1.")===0 || txt.charAt(0)==="{"){
    var obj = null; try{ obj = txt.indexOf("SCM1.")===0 ? JSON.parse(unb64u(txt.slice(5))) : JSON.parse(txt); }catch(e){ obj = null; }
    var res = obj ? C.normalize(obj) : null;
    if(!res || !res.roster) return { error:"That isn't a SurgeCraft share code or roster file. Share codes start with SCM1." };
    return BT.listFromRoster(C, res.roster);
  }
  var l = BT.parseList(C, txt);
  if(!l.units.length && !l.unmatched.length) return { error:"No units found. Paste the whole list, including the lines that start with a model count such as \"6x\"." };
  return l;
}
function oppPasteHTML(go, cancel){
  return '<div class="importbox" style="margin-top:8px"><div class="field"><label for="b-opptext">Their list</label><textarea class="input" id="b-opptext" rows="5" placeholder="Paste their list (Tabletop Simulator export layout) or a SurgeCraft share code"></textarea></div>'+
    (BS.oppErr ? '<div class="check error"><span class="mk"></span><span>'+esc(BS.oppErr)+'</span></div>' : '')+
    '<div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn primary sm" data-a="'+go+'">Read list</button><button class="btn ghost sm" data-a="'+cancel+'">Cancel</button></div></div>';
}
/* What was read from a pasted list, with a picker for each unit line that didn't match a card. */
function oppDraftHTML(l, where){
  var f = l.factionId && C.cards[l.factionId], models = l.units.reduce(function(n,u){ return n+u.models; }, 0);
  var h = '<div class="oppsum"><div><b>'+esc([l.race, f ? f.name : ""].filter(Boolean).join(" — ") || "Opponent")+'</b> <span class="faint">'+l.units.length+' Unit'+(l.units.length===1?'':'s')+' · '+models+' models</span></div>'+
    '<div class="oppchips">'+l.units.map(function(u){ return '<span class="chip">'+u.models+'× '+esc(C.units[u.unitId].name)+'</span>'; }).join("")+'</div>';
  var pool = C.data.units.filter(function(u){ return !u.summoned && (!l.race || u.race===l.race); });
  l.unmatched.forEach(function(x, k){
    if(x.card) h += '<div class="check warn"><span class="mk"></span><span>Not recognised as a '+x.card+' Card, left out: '+esc(x.line)+'</span></div>';
    else h += '<div class="oppfix"><span class="faint">Not recognised: <b>'+esc(x.line)+'</b></span><select class="input" data-a="b-oppfix" data-v="'+k+'" data-w="'+where+'"><option value="">Choose the unit, or leave it out</option>'+pool.map(function(u){ return '<option value="'+esc(u.id)+'">'+esc(u.name)+'</option>'; }).join("")+'</select></div>';
  });
  if(l.ignoredUpgrades && l.ignoredUpgrades.length) h += '<div class="faint" style="font-size:12px">Upgrades not on the cards, left out: '+esc(l.ignoredUpgrades.join("; "))+'</div>';
  return h+'</div>';
}
function bOppSetupHTML(){
  var st = BS.set, l = st.opp;
  var h = '<div class="subhead">Opponent <span class="aside">optional</span></div><div class="field" style="max-width:420px"><label for="b-oppname">Their name</label><input class="input" id="b-oppname" data-a="b-oppname" maxlength="40" value="'+esc(st.oppName||"")+'" placeholder="For the battle report"></div>';
  if(l) h += oppDraftHTML(l, "set")+'<div style="display:flex;gap:8px;margin-top:6px"><button class="btn ghost sm" data-a="b-oppclear">Remove their list</button></div>';
  else if(BS.oppOpen) h += oppPasteHTML("b-oppread", "b-oppcancel");
  else h += '<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-top:8px"><button class="btn sm" data-a="b-oppopen">Add their list</button><span class="faint" style="font-size:12px">Track their losses during the game and fill in Enemy Supply destroyed.</span></div>';
  return h;
}
/* Pop-up from a Unit's swords button: record a model it killed, or a model it lost to an enemy Unit. */
function killSheetHTML(){
  var r = S.cur, b = r && r.battle, k = BS.ks; if(!b || !k) return "";
  var i = BT.info(C, r, b, k.uid); if(!i) return "";
  var dealt = k.mode!=="taken", opp = BT.oppInfos(C, b), alive = opp.filter(function(o){ return o.state!=="dead"; }), gone = opp.length - alive.length, uid = esc(i.uid);
  var h = '<div class="ksheet"><div class="ks-h"><h2>'+esc(i.unit.name)+'</h2><span class="faint">'+i.models+' of '+i.start+' models</span></div>'+
    '<div class="seg ks-mode" role="group" aria-label="What happened"><button data-a="b-ksmode" data-v="dealt" aria-pressed="'+dealt+'">Killed an enemy model</button><button data-a="b-ksmode" data-v="taken" aria-pressed="'+(!dealt)+'">Lost a model to…</button></div>'+
    '<p class="faint ks-help">'+(dealt ? 'Tap the enemy Unit that lost a model. Each tap removes one.' : 'Tap the enemy Unit that killed one of your models. Each tap removes one of yours'+(i.casualtyDue?', starting with the casualty your Damage has reached':'')+'.')+'</p>';
  if(k.last) h += '<div class="ks-last"><span>'+esc(k.last)+'</span><button class="btn ghost sm" data-a="b-ksundo">Undo</button></div>';
  if(!dealt && i.models<=0) h += '<div class="empty">'+esc(i.unit.name)+' has no models left.</div>';
  else {
    h += '<div class="ks-list">'+alive.map(function(o){
      return '<button class="ks-row" data-a="b-kill" data-v="'+esc(o.uid)+'"><span class="ks-n">'+esc(o.name)+(o.summoned?' <span class="chip">Summoned</span>':'')+(o.state==="res"?' <span class="chip">Reserves</span>':'')+'</span><span class="ks-m num">'+o.models+'/'+o.start+'</span><span class="ks-s">Supply '+o.supplyNow+'</span><span class="ks-go">'+(dealt?'−1':'Pick')+'</span></button>';
    }).join("")+(alive.length?'':'<div class="empty">No enemy models left.</div>')+'</div>';
    if(!dealt) h += '<button class="btn ghost sm" data-a="b-ksnone" style="margin-top:6px">Lost a model to something else</button>';
  }
  if(gone) h += '<div class="faint" style="font-size:12px;margin-top:6px">'+gone+' enemy Unit'+(gone>1?'s':'')+' Destroyed.</div>';
  return h+'<div class="ks-f"><span class="faint">Enemy Supply destroyed this Round: <b>'+BT.enemyLost(C, b).total+'</b></span><button class="btn primary" data-a="close-modal">Done</button></div></div>';
}
/* Ready card that pays a cost with the least waste: the smallest single card that covers it, Tactical Cards before the Faction
   and Creep Cards on a tie (list order otherwise), else none picked. */
function payDefault(r, b, cost){
  var ready = BT.cardList(C, r, b).filter(function(c){ return !c.exhausted && c.value>0; });
  var fit = ready.filter(function(c){ return c.value>=cost; }).sort(function(x, y){ return x.value-y.value || (x.key.charAt(0)!=="t") - (y.key.charAt(0)!=="t"); })[0];
  return fit ? [fit.key] : [];
}
/* Pop-up from Use on an ability with a cost: pick the Ready card(s) to Exhaust for it (10.5.1). */
function paySheetHTML(){
  var r = S.cur, b = r && r.battle, pk = BS.pay; if(!b || !pk) return "";
  var i = BT.info(C, r, b, pk.uid); if(!i) return "";
  var a = BT.abilitiesFor(C, r, b, pk.uid).filter(function(x){ return x.ability.name===pk.name; })[0]; if(!a) return "";
  var cards = BT.cardList(C, r, b), type = BT.resource(C, r, b).type, sel = cards.filter(function(c){ return pk.keys.indexOf(c.key)!==-1 && !c.exhausted; });
  var got = sel.reduce(function(n, c){ return n+c.value; }, 0);
  var h = '<div class="ksheet"><div class="ks-h"><h2>'+esc(a.ability.name)+'</h2><span class="faint">'+esc(i.unit.name)+' · Cost '+esc(a.ability.cost||(a.cost+" "+type))+'</span></div>'+
    '<p class="faint ks-help">Tap the card'+(a.cost>1?'s':'')+' to Exhaust for it. Extra '+esc(type)+' over the cost is lost (10.5.1).</p><div class="ks-list">';
  h += cards.map(function(c){
    var on = sel.indexOf(c)!==-1, nm = esc(c.card.name)+(c.copy?' '+c.copy:'');
    if(c.exhausted || !c.value) return '<div class="ks-row pay-row off"><span class="ks-n">'+nm+'</span><span class="ks-m num">'+(c.value?c.value+' '+esc(type):'—')+'</span><span class="ks-go">'+(c.exhausted?'Exhausted':'No '+esc(type))+'</span></div>';
    var waste = on && sel.length===1 && c.value>a.cost ? (c.value-a.cost)+' '+esc(type)+' lost' : '';
    return '<button class="ks-row pay-row" data-a="b-paypick" data-v="'+esc(c.key)+'" aria-pressed="'+on+'"><span class="ks-n">'+nm+(waste?' <span class="faint">('+waste+')</span>':'')+'</span><span class="ks-m num">'+c.value+' '+esc(type)+'</span><span class="ks-go">'+(on?'✓':'')+'</span></button>';
  }).join("")+'</div>';
  var short = got<a.cost;
  h += '<div class="pay-sum'+(short&&sel.length?' warn':'')+'">Paying <b>'+got+'</b> of '+a.cost+' '+esc(type)+(short&&sel.length?' · short unless a cost reduction applies':'')+'</div>';
  h += '<button class="btn ghost sm pay-alt" data-a="b-payok" data-v="none">Use without Exhausting a card</button>'+(P.guides?'<span class="faint" style="font-size:12px;margin-top:-6px">For a cost brought to 0 by another ability, such as a card that reduces it.</span>':'');
  return h+'<div class="ks-f"><span class="grow"></span><button class="btn ghost" data-a="close-modal">Cancel</button><button class="btn primary" data-a="b-payok"'+(sel.length?'':' disabled')+'>Exhaust and use</button></div></div>';
}
/* Pop-up for the whole opponent list: models, Battlefield / Reserves / Destroyed, add or remove Units, replace the list. */
function oppModalHTML(){
  var r = S.cur, b = r && r.battle; if(!b) return "";
  var h = '<div class="ksheet"><div class="ks-h"><h2>Opponent</h2></div><div class="field" style="max-width:420px"><label for="b-oppname2">Their name</label><input class="input" id="b-oppname2" data-a="b-oppname" maxlength="40" value="'+esc(b.opp && b.opp.player || "")+'" placeholder="For the battle report"></div>';
  if(BS.oppDraft) return h+oppDraftHTML(BS.oppDraft, "draft")+'<div class="ks-f"><button class="btn ghost" data-a="b-oppdrop">Cancel</button><button class="btn primary" data-a="b-oppuse">Use this list</button></div>'+(hasOpp(b)?'<p class="faint" style="font-size:12px">This replaces their current list; models already removed are not carried over.</p>':'')+'</div>';
  if(BS.oppOpen || !hasOpp(b)) return h+oppPasteHTML("b-oppread", hasOpp(b) ? "b-oppcancel" : "close-modal")+'</div>';
  h += '<div class="opp-list">'+BT.oppInfos(C, b).map(function(o){
    var id = esc(o.uid);
    return '<div class="opp-row'+(o.state==="dead"?' dead':'')+'"><div class="opp-t"><b>'+esc(o.name)+'</b>'+(o.summoned?' <span class="chip">Summoned</span>':'')+'<span class="faint"> Supply '+o.supplyNow+(o.upgrades.length?' · '+esc(o.upgrades.join(", ")):'')+'</span></div>'+
      '<div class="opp-c">'+bStepper("Models", o.models+' <small>/ '+o.start+'</small>', 'data-a="b-oppm" data-v="'+id+':-1"', 'data-a="b-oppm" data-v="'+id+':1"')+
      '<span class="seg opp-st">'+[["fld","Battlefield"],["res","Reserves"],["dead","Destroyed"]].map(function(s){ return '<button data-a="b-oppst" data-v="'+id+':'+s[0]+'" aria-pressed="'+(o.state===s[0])+'">'+s[1]+'</button>'; }).join("")+'</span>'+
      '<button class="btn ghost sm danger" data-a="b-opprm" data-v="'+id+'" aria-label="Remove '+esc(o.name)+' from the list">Remove</button></div></div>';
  }).join("")+'</div>';
  var race = b.opp.race, sum = (b.opp.summonable||[]).filter(function(id){ return C.units[id]; });
  var pool = C.data.units.filter(function(u){ return !race || u.race===race; }).sort(function(a, c){ return (sum.indexOf(c.id)!==-1) - (sum.indexOf(a.id)!==-1) || (a.summoned - c.summoned) || a.name.localeCompare(c.name); });
  h += '<div class="field" style="margin-top:10px;max-width:420px"><label for="b-oppadd">Add a Unit they Summoned or the list missed</label><select class="input" id="b-oppadd" data-a="b-oppadd"><option value="">Choose a unit…</option>'+pool.map(function(u){ return '<option value="'+esc(u.id)+'">'+esc(u.name)+(u.summoned?' (Summoned)':'')+'</option>'; }).join("")+'</select></div>';
  return h+'<div class="ks-f"><button class="btn ghost sm" data-a="b-oppopen">Replace their list</button><button class="btn primary" data-a="close-modal">Done</button></div></div>';
}
/* Re-draw an open pop-up in place, keeping its scroll position. */
function bModal(){
  var html = BS.modal==="kill" ? killSheetHTML() : BS.modal==="opp" ? oppModalHTML() : BS.modal==="pay" ? paySheetHTML() : "";
  if(!html){ closeModal(); return; }
  var sc = document.querySelector("#modal-root .scrim"), m = document.querySelector("#modal-root .modal");
  if(sc && m){ var y = sc.scrollTop; m.innerHTML = '<button class="mclose" data-a="close-modal" aria-label="Close">×</button>'+html; sc.scrollTop = y; }
  else openModal(html);
}
function bOppPanelHTML(b){
  var h = '<div class="panel'+btc("more")+'" id="b-opp"><h3>Opponent</h3><div class="pb">';
  if(!hasOpp(b)) return h+'<p class="faint" style="margin:0 0 8px">'+(b.opp && b.opp.player ? esc(b.opp.player)+'. ' : '')+'Add their list to track their losses and fill in Enemy Supply destroyed.</p><button class="btn sm" data-a="b-oppedit">Add their list</button></div></div>';
  var list = BT.oppInfos(C, b), left = list.filter(function(o){ return o.state!=="dead"; }).length, el = BT.enemyLost(C, b);
  return h+'<div><b>'+esc(b.opp.player || "Opponent")+'</b> <span class="faint">'+esc(b.opp.race||"")+'</span></div><div class="faint" style="font-size:12.5px;margin:4px 0 8px">'+left+' of '+list.length+' Units left · Enemy Supply destroyed this Round: '+el.total+'</div><button class="btn sm" data-a="b-oppedit">Edit their list</button></div></div>';
}
function bReportBtns(which){
  return '<button class="btn sm" data-a="b-rep" data-v="save:'+which+'"'+(S.downloads?'':' disabled')+'>Save battle report</button>'+(STANDALONE?'<button class="btn sm" data-a="b-rep" data-v="print:'+which+'">Print / PDF</button>':'');
}
function bReportPanelHTML(){
  return '<div class="panel'+btc("more")+'"><h3>Battle report</h3><div class="pb"><p class="faint" style="margin:0 0 8px;font-size:12.5px">Times, scores, both armies\' losses and kills, cards used, notes and the battle log. Finished battles are kept under Past battles on the setup screen.</p><div style="display:flex;gap:6px;flex-wrap:wrap">'+bReportBtns("cur")+'</div>'+
    (S.downloads||STANDALONE?'':'<p class="faint" style="font-size:12px;margin:6px 0 0">Saving files isn\'t available in this view.</p>')+'</div></div>';
}
function bHistoryHTML(r){
  var hs = r.history || []; if(!hs.length) return "";
  var h = '<section class="section" style="margin-top:18px"><header><span class="step">REPORTS</span><h2>Past battles</h2><span class="aside">'+hs.length+' kept, newest first</span></header><div class="sbody"><div class="hist">';
  hs.forEach(function(e){
    var b = e.battle, t = BT.totals(b), m = C.missions[b.missionId], who = b.opp && b.opp.player ? b.opp.player : "Opponent";
    var res = b.over ? (b.over.winner==="me" ? ["ok","Victory"] : b.over.winner==="opp" ? ["err","Defeat"] : ["neutral","Draw"]) : ["neutral","Ended in Round "+b.round];
    var d = new Date(b.startedAt || e.endedAt);
    h += '<div class="hrow"><div class="h-t"><b>'+esc(m ? m.name : b.missionId)+'</b> <span class="pill '+res[0]+'">'+res[1]+'</span><div class="faint" style="font-size:12.5px">'+esc(d.toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"}))+' · You '+t.me+' – '+t.opp+' '+esc(who)+'</div></div><div class="h-a">'+
      (BS.hDel===e.id ? '<span class="muted">Delete this battle?</span><button class="btn danger sm" data-a="b-hdel-yes" data-v="'+esc(e.id)+'">Delete</button><button class="btn sm" data-a="b-hdel-no">Keep</button>'
        : bReportBtns(e.id)+'<button class="btn ghost sm danger" data-a="b-hdel" data-v="'+esc(e.id)+'">Delete</button>')+'</div></div>';
  });
  return h+'</div></div></section>';
}
/* Battle report for the current battle ("cur") or a saved one (history id), then Save or Print / PDF like the other exports. */
function bReport(how, which){
  var r = S.cur, src = which==="cur" ? (r.battle ? { r:r, b:r.battle } : null) : (r.history||[]).filter(function(e){ return e.id===which; }).map(function(e){ return { r:e.roster, b:e.battle, endedAt:e.endedAt }; })[0];
  if(!src) return;
  var d = new Date(src.b.startedAt || Date.now());
  S.exp.rep = { r:src.r, b:src.b, endedAt:src.endedAt, date: d.getFullYear()+"-"+("0"+(d.getMonth()+1)).slice(-2)+"-"+("0"+d.getDate()).slice(-2) };
  if(how==="print") printFile(REPORT_FMT); else saveFile(REPORT_FMT);
}
/* Finished (or ended) battles are kept on the roster for their report; the 10 most recent. */
function bArchive(r){
  var b = r.battle; if(!b || !b.log || b.log.length<2) return;
  r.history = [BT.historyEntry(C, r, b)].concat(r.history||[]).slice(0, 10);
}
function bChange(a, t){
  var r = S.cur, b = r && r.battle, v = t.getAttribute("data-v");
  if(a==="b-oppname"){ if(!b){ if(BS.set) BS.set.oppName = t.value.trim(); return true; } bMut(function(){ if(!b.opp) b.opp = BT.oppFrom(C, {}); b.opp.player = t.value.trim(); }); bModal(); return true; }
  if(a==="b-oppfix"){
    var l = t.getAttribute("data-w")==="set" ? BS.set && BS.set.opp : BS.oppDraft, k = Number(v), x = l && l.unmatched[k]; if(!x || !t.value) return true;
    var u = C.units[t.value]; l.units.push({ unitId:u.id, models:x.models, upgrades:(x.upgrades||[]).filter(function(n){ return u.upgrades.some(function(y){ return y.name.toLowerCase()===String(n).toLowerCase(); }); }) });
    l.unmatched.splice(k, 1); if(!l.race) l.race = u.race;
    if(b) bModal(); else renderBattle(); return true;
  }
  if(!b) return false;
  if(a==="b-oppadd"){ if(t.value){ var id = t.value; bMut(function(){ BT.oppAdd(C, b, id); }); bModal(); } return true; }
  if(a==="b-note"){ var n = Number(v), txt = t.value; bMut(function(){ b.notes[n] = txt; }); return true; }
  if(a==="b-summary"){ var s2 = t.value; bMut(function(){ b.summary = s2; }); return true; }
  if(a==="b-mvp"){ var mv = t.value || null; bMut(function(){ b.mvp = mv; }); return true; }
  return false;
}
/* Clicks that work before a battle starts (setup screen, past battles). */
function bSetupClick(a, v){
  var r = S.cur;
  switch(a){
    case "b-oppopen": if(r.battle){ BS.oppOpen = true; BS.oppErr = null; BS.modal = "opp"; bModal(); return true; } BS.oppOpen = true; BS.oppErr = null; renderBattle(); var ta = $("b-opptext"); if(ta) ta.focus(); return true;
    case "b-oppcancel": BS.oppOpen = false; BS.oppErr = null; if(r.battle) bModal(); else renderBattle(); return true;
    case "b-oppread":
      var ta2 = $("b-opptext"), l = readOppText(ta2 ? ta2.value : "");
      if(l.error){ BS.oppErr = l.error; if(r.battle) bModal(); else { renderBattle(); var t3 = $("b-opptext"); if(t3 && ta2) t3.value = ta2.value; } return true; }
      BS.oppErr = null; BS.oppOpen = false;
      if(r.battle){ BS.oppDraft = l; bModal(); } else { if(l.player && !BS.set.oppName) BS.set.oppName = l.player; BS.set.opp = l; renderBattle(); }
      return true;
    case "b-oppclear": if(BS.set) BS.set.opp = null; renderBattle(); return true;
    case "b-rep": var q = v.split(":"); bReport(q[0], q.slice(1).join(":")); return true;
    case "b-hdel": BS.hDel = v; renderBattle(); return true;
    case "b-hdel-no": BS.hDel = null; renderBattle(); return true;
    case "b-hdel-yes": BS.hDel = null; r.history = (r.history||[]).filter(function(e){ return e.id!==v; }); Store.queue(r); renderBattle(); return true;
  }
  return false;
}
/* Clicks during a battle: the kill sheet and the opponent editor. */
function bOppClick(a, v, eu){
  var r = S.cur, b = r.battle, msg;
  switch(a){
    case "b-ks": BS.ks = { uid:eu, mode:"dealt", last:"" }; BS.modal = "kill"; bModal(); return true;
    case "b-ksmode": if(BS.ks){ BS.ks.mode = v; BS.ks.last = ""; } bModal(); return true;
    case "b-kill":
      var k = BS.ks; if(!k) return true;
      var o0 = BT.oppInfo(C, b, v), m0 = BT.info(C, r, b, k.uid);
      bMut(function(){ return BT.kill(C, r, b, k.uid, v, k.mode); });
      var o1 = BT.oppInfo(C, b, v), m1 = BT.info(C, r, b, k.uid);
      k.last = k.mode==="taken" ? m1.unit.name+" lost a model to "+o1.name+": "+m0.models+" → "+m1.models+" left."
        : o1.name+": "+o0.models+" → "+o1.models+(o1.models ? (o1.models===1 ? " model left." : " models left.") : ". Destroyed.");
      bModal(); return true;
    case "b-ksnone":
      var k2 = BS.ks; if(!k2) return true; var n0 = BT.info(C, r, b, k2.uid).models;
      bMut(function(){ return BT.kill(C, r, b, k2.uid, null, "taken"); });
      k2.last = BT.info(C, r, b, k2.uid).unit.name+" lost a model: "+n0+" → "+BT.info(C, r, b, k2.uid).models+" left."; bModal(); return true;
    case "b-ksundo": var prev = BS.undo.pop(); if(prev){ r.battle = JSON.parse(prev); BS.warn = []; bCommit(); } if(BS.ks) BS.ks.last = ""; bModal(); return true;
    case "b-oppedit": BS.modal = "opp"; BS.oppOpen = !hasOpp(b); BS.oppErr = null; bModal(); return true;
    case "b-oppuse": var d = BS.oppDraft; if(!d) return true; var nm = b.opp && b.opp.player; BS.oppDraft = null; bMut(function(){ BT.setOpp(C, b, d); if(nm && !b.opp.player) b.opp.player = nm; }); bModal(); return true;
    case "b-oppdrop": BS.oppDraft = null; bModal(); return true;
    case "b-oppm": var p = v.split(":"); bMut(function(){ BT.oppChange(C, b, p[0], Number(p[1])); }); bModal(); return true;
    case "b-oppst": var p2 = v.split(":"); bMut(function(){ BT.oppSetState(C, b, p2[0], p2[1]); }); bModal(); return true;
    case "b-opprm": bMut(function(){ BT.oppRemove(C, b, v); }); bModal(); return true;
  }
  return false;
}
function renderBattle(){
  var el = $("battle"); if(!el) return;
  var r = S.cur, b = r.battle;
  document.body.classList.remove("has-bdock");
  if(!BT || !b || !C.missions[b.missionId]){ if(b) delete r.battle; renderMeters(); el.innerHTML = bSetupHTML(r) + bHistoryHTML(r); syncWake(); return; }
  BT.sync(C, r, b);
  var strip = $("meters"); if(strip) strip.innerHTML = bStripHTML(b, r);
  var list = BT.infos(C, r, b), p = b.phase, live = p<=3 && !b.over, sup = BT.supply(C, r, b), fld = [], res = [], dead = [];
  list.forEach(function(i){ (i.state==="fld"?fld:i.state==="res"?res:dead).push(i); });
  var did = function(i){ return live && i.st.act[p-1]; };
  var groups = [];
  if(live){
    var todo = fld.filter(function(i){ return !did(i); }), done = fld.filter(did), hidden = '';
    if(p===3){
      var notEng = todo.filter(function(i){ return !i.st.eng; });
      if(!BS.showAll){ todo = todo.filter(function(i){ return i.st.eng; }); if(notEng.length) hidden = '<div class="bnote"><span>'+notEng.length+' Unit'+(notEng.length>1?'s':'')+' not Engaged '+(notEng.length>1?'are':'is')+' hidden.</span><button class="btn ghost sm" data-a="b-all">Show all</button></div>'; }
      else hidden = '<div class="bnote"><span>Showing every Unit.</span><button class="btn ghost sm" data-a="b-all">Engaged only</button></div>';
    }
    if(p===1) groups.push({key:"res", title:"Reserves", items:res.filter(function(i){ return !did(i); }).concat(res.filter(did)), empty:"No Units in Reserves."});
    groups.push({key:"todo", title:p===1?"On the battlefield · to act":"To act", items:todo, hidden:hidden,
      empty: fld.length ? (p===3 && !BS.showAll ? "No Engaged Units left to activate." : "Every Unit has acted this Phase. End the Phase from the bar below.") : "No Units on the battlefield yet."+(p===1?" Deploy from Reserves above.":"")});
    groups.push({key:"done", title:"Done this Phase", items:done, coll:true});
    if(p!==1) groups.push({key:"res", title:"Reserves", items:res, coll:true});
  } else {
    groups.push({key:"fld", title:"On the battlefield", items:fld, empty:"No Units on the battlefield."});
    groups.push({key:"res", title:"Reserves", items:res, coll:true});
  }
  groups.push({key:"dead", title:"Destroyed", items:dead, coll:true});
  var h = '<div class="layout btl"><div class="main'+btc("play")+'">'+bPhaseHTML(b, r)+'<section class="section" id="b-units"><header><span class="step">ARMY</span><h2>Units</h2><span class="aside">'+fld.length+' on the battlefield · '+res.length+' in Reserves</span></header><div class="sbody">';
  h += groups.map(function(g){ return bGroupHTML(g, b, r, sup); }).join("");
  var sm = Render.summonedFor(C, r);
  if(sm.length && !b.over) h += '<div style="margin-top:12px;display:flex;gap:6px;flex-wrap:wrap;align-items:center">'+(BS.sumPick ? '<span class="muted">Summon:</span>'+sm.map(function(u){ return '<button class="btn sm" data-a="b-summon" data-v="'+esc(u.id)+'">'+esc(u.name)+'</button>'; }).join("")+'<button class="btn ghost sm" data-a="b-sumpick">Cancel</button>' : '<button class="btn sm" data-a="b-sumpick">Add a Summoned Unit</button>')+'</div>';
  h += '</div></section></div><aside class="rail" id="b-rail">'+bRailHTML(b, r)+'</aside></div>'+bDockHTML(b, r);
  el.innerHTML = h;
  document.body.classList.add("has-bdock");
  syncWake();
}
/* Keep the screen on while a battle is open (Screen Wake Lock). Browsers release the lock when the page is hidden; it is asked for again when the page comes back. */
var WAKE = { lock:null, pending:false, state:"off" };
function wakeWanted(){ var b = S.cur && S.cur.battle; return !!(P.wake && S.view==="build" && S.tab==="battle" && b && !b.over && document.visibilityState==="visible"); }
function wakeText(){
  if(!P.wake) return "Off. Your phone's normal screen timeout applies.";
  return { on:"On. The screen stays on while this battle is open.",
    denied:"This view didn't allow it. The installed SurgeCraft app may; otherwise set a longer Auto-Lock in your phone's settings.",
    unsupported:"This browser can't keep the screen on. Set a longer Auto-Lock in your phone's settings instead.",
    off:"Turns on while a battle is in progress on this tab." }[WAKE.state] || "";
}
function updWake(){ var el = $("b-wake-st"); if(el) el.textContent = wakeText(); }
function syncWake(){
  if(wakeWanted()){
    if(WAKE.lock || WAKE.pending || WAKE.state==="denied") return; // a refusal stands until the option is switched off and on again
    if(!navigator.wakeLock || typeof navigator.wakeLock.request!=="function"){ WAKE.state = "unsupported"; updWake(); return; }
    WAKE.pending = true;
    try{
      navigator.wakeLock.request("screen").then(function(l){
        WAKE.pending = false;
        if(!wakeWanted()){ l.release().catch(function(){}); return; }
        WAKE.lock = l; WAKE.state = "on"; updWake();
        l.addEventListener("release", function(){ if(WAKE.lock===l){ WAKE.lock = null; WAKE.state = "off"; updWake(); } });
      }, function(){ WAKE.pending = false; WAKE.state = "denied"; updWake(); });
    }catch(e){ WAKE.pending = false; WAKE.state = "denied"; updWake(); }
  } else if(WAKE.lock){
    var l = WAKE.lock; WAKE.lock = null; if(WAKE.state==="on") WAKE.state = "off"; try{ l.release().catch(function(){}); }catch(e){} updWake();
  }
}
document.addEventListener("visibilitychange", syncWake);
function bClick(a, v, eu, t){
  var r = S.cur, b = r && r.battle;
  if(bSetupClick(a, v)) return true;
  switch(a){
    case "b-set": var kv = v.split(":"); BS.set[kv[0]] = kv.slice(1).join(":"); renderBattle(); return true;
    case "b-mcard": var mm = C.missions[v]; if(mm) openModal(Render.missionCardHTML(mm, BT.side(C, r))); return true;
    case "b-start":
      if(BS.set.opp || BS.set.oppName){ var ol = BS.set.opp || { units:[] }; ol.player = BS.set.oppName || ol.player || ""; BS.set.opp = ol; }
      var nb = BT.create(C, r, BS.set); if(!nb) return true; BS.oppOpen = false;
      r.battle = nb; BS.undo = []; BS.warn = []; BS.pass = false; BS.quit = false; BS.adj = {me:0, opp:0}; BS.openAb = {}; BS.openU = {}; BS.grp = {}; BS.tab = "play"; BS.showAll = false;
      bCommit(); window.scrollTo(0,0); return true;
  }
  if(!b) return false;
  if(bOppClick(a, v, eu)) return true;
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
    case "b-use":
      var ua = BT.abilitiesFor(C, r, b, eu).filter(function(x){ return x.ability.name===v; })[0];
      if(ua && ua.cost>0){ BS.pay = { uid:eu, name:v, keys:payDefault(r, b, ua.cost) }; BS.modal = "pay"; bModal(); return true; }
      bMut(function(){ return BT.useAbility(C, r, b, eu, v); }); return true;
    case "b-paypick": var pk = BS.pay; if(!pk) return true; var ix = pk.keys.indexOf(v); if(ix===-1) pk.keys.push(v); else pk.keys.splice(ix,1); bModal(); return true;
    case "b-payok": var pp = BS.pay; if(!pp) return true; var keys = v==="none" ? [] : pp.keys.slice(); closeModal(); bMut(function(){ return BT.useAbility(C, r, b, pp.uid, pp.name, keys); }); return true;
    case "b-unuse": bMut(function(){ BT.unuseAbility(C, r, b, eu, v); }); return true;
    case "b-card": bMut(function(){ BT.toggleCard(C, r, b, v); }); return true;
    case "b-mk": bMut(function(){ BT.cycleMarker(C, b, Number(v)); }); return true;
    case "b-lvl": var lq = v.split(":"); bMut(function(){ BT.setLevel(C, b, Number(lq[0]), Number(lq[1])); }); return true;
    case "b-mkon": bMut(function(){ var due = BT.activationDue(C, b); if(!due) return; var n = v==="random" ? due.pool[Math.floor(Math.random()*due.pool.length)] : Number(v); BT.activateMarker(C, b, n); return v==="random" ? {warnings:["Mission Marker "+n+" was picked at random and is now Activated."]} : null; }); return true;
    case "b-inp": var f = v.split(":"), cap = /quarters/.test(f[0]) ? 4 : 99, lo = f[0]==="enemyLost" ? -BT.enemyLost(C, b).auto : 0; bMut(function(){ b.si[f[0]] = Math.max(lo, Math.min(cap, (b.si[f[0]]||0)+Number(f[1]))); }); return true;
    case "b-adj": var g = v.split(":"); BS.adj[g[0]] += Number(g[1]); renderBattle(); return true;
    case "b-end": BS.pass = true; renderBattle(); return true;
    case "b-open": BS.openU[eu] = !BS.openU[eu]; renderBattle(); return true;
    case "b-grp": BS.grp[v] = !BS.grp[v]; renderBattle(); return true;
    case "b-all": BS.showAll = !BS.showAll; renderBattle(); return true;
    case "b-tab": BS.tab = v; renderBattle(); var bt = $("battle"); if(bt){ var y = bt.getBoundingClientRect().top + window.scrollY - 70; if(window.scrollY > y) window.scrollTo(0, Math.max(0, y)); } return true;
    case "b-goscore": BS.tab = "play"; renderBattle(); var gs = $("b-phase"); if(gs) gs.scrollIntoView({block:"start"}); return true;
    case "b-guides": P.guides = !P.guides; savePrefs(); renderBattle(); return true;
    case "b-wake": P.wake = !P.wake; savePrefs(); WAKE.state = "off"; renderBattle(); return true;
    case "b-pass": BS.pass = false; if(v==="cancel"){ renderBattle(); return true; } bMut(function(){ BT.advance(C, r, b, v); }); var p2 = BS.tab==="play" && $("b-phase"); if(p2) p2.scrollIntoView({block:"start"}); return true;
    case "b-back": bMut(function(){ BT.back(C, r, b); }); return true;
    case "b-fpm": bMut(function(){ BT.setFpm(C, b, v); }); return true;
    case "b-confirm": bMut(function(){ var sg = BT.suggestion(C, r, b); BT.confirmScores(C, r, b, Math.max(0, sg.me.total+BS.adj.me), Math.max(0, sg.opp.total+BS.adj.opp)); BS.adj = {me:0, opp:0}; }); var p3 = $("b-phase"); if(p3) p3.scrollIntoView({block:"start"}); return true;
    case "b-next": bMut(function(){ BT.nextRound(C, r, b); }); window.scrollTo(0,0); return true;
    case "b-undo": var prev = BS.undo.pop(); if(prev){ r.battle = JSON.parse(prev); BS.warn = []; BS.pass = false; bCommit(); } return true;
    case "b-quit": BS.quit = true; renderBattle(); return true;
    case "b-quit-no": BS.quit = false; renderBattle(); return true;
    case "b-quit-yes": bArchive(r); delete r.battle; BS.quit = false; BS.undo = []; BS.set = null; BS.warn = []; bCommit(); window.scrollTo(0,0); return true;
    case "b-sumpick": BS.sumPick = !BS.sumPick; renderBattle(); return true;
    case "b-summon": BS.sumPick = false; bMut(function(){ BT.addSummoned(C, r, b, v); }); return true;
    case "b-unsummon": bMut(function(){ BT.removeSummoned(C, r, b, eu); }); return true;
  }
  return false;
}

