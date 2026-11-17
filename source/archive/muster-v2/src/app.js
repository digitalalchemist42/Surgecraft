(function(){
"use strict";
var DATA = JSON.parse(document.getElementById("sc-data").textContent);
var C = new RosterCore(DATA);
var SLOT_TYPES = RosterCore.SLOT_TYPES, SCALES = RosterCore.SCALES, ART = Render.ART, X = Render.exports;
var RACES = ["Terran","Protoss","Zerg"];
var esc = Render.esc, fmt = Render.fmt;

var S = {
  view:"list", tab:"build", rosters:[], cur:null, store:"loading", save:"idle",
  open:{}, picker:false, importOpen:false, confirmDel:null, confirmRace:null, notice:null, downloads:null,
  exp:{ base:"", art:true, preview:null, busy:null, copyText:null }
};
function clone(o){ return JSON.parse(JSON.stringify(o)); }
function $(id){ return document.getElementById(id); }

/* ------------ storage: private db subtree, browser fallback ------------ */
var Store = {
  mode:"loading", col:null, pending:{}, inflight:{}, timers:{}, unsub:null, LS_KEY:"scmuster.rosters.v1",
  lsRead:function(){ try{ var v = JSON.parse(localStorage.getItem(this.LS_KEY)||"[]"); return Array.isArray(v)?v:[]; }catch(e){ return []; } },
  lsWrite:function(list){ try{ localStorage.setItem(this.LS_KEY, JSON.stringify(list)); return true; }catch(e){ return false; } },
  init:function(){
    var self = this, settled = false;
    function useLocal(){ if(settled) return; settled = true; if(self.unsub){ try{ self.unsub(); }catch(e){} self.unsub=null; } self.mode="local"; S.store="local"; S.rosters = self.lsRead(); afterLoad(); }
    var cl = window.claude;
    if(!cl || typeof cl.use !== "function"){ useLocal(); return; }
    Promise.all([cl.use("db"), cl.use("user")]).then(function(res){
      var db = res[0], user = res[1];
      if(!db || !user){ useLocal(); return; }
      return user.id().then(function(id){
        if(!id){ useLocal(); return; }
        try{ self.col = db.doc("data/users/"+id+"/profile").collection("rosters"); }catch(e){ useLocal(); return; }
        if(settled) return;
        var first = true;
        self.unsub = self.col.onSnapshot(function(snap){
          if(first && settled) return;
          if(first){ self.mode="db"; S.store="db"; }
          var list = snap.docs.map(function(d){ return clone(d.data()); });
          S.rosters = list;
          if(S.cur && !S.cur.isExample && !self.busy(S.cur.id)){
            var remote = list.filter(function(r){return r.id===S.cur.id;})[0];
            if(remote && remote.updatedAt > S.cur.updatedAt){ S.cur = remote; if(S.view==="build") render(); }
          }
          if(first){ first=false; settled=true; afterLoad(); } else if(S.view==="list") render();
        }, function(err){ self.fail(err); if(!settled) useLocal(); });
      });
    }).catch(function(){ useLocal(); });
    setTimeout(useLocal, 12000);
  },
  busy:function(id){ return !!(this.pending[id]||this.inflight[id]||this.timers[id]); },
  queue:function(r){
    var self = this; r.updatedAt = Date.now(); this.pending[r.id] = clone(r);
    clearTimeout(this.timers[r.id]); setSave("saving");
    this.timers[r.id] = setTimeout(function(){ delete self.timers[r.id]; self.flush(r.id); }, 600);
    upsertList(r);
  },
  flush:function(id){
    var self = this;
    if(this.inflight[id]){ return this.inflight[id].then(function(){ return self.flush(id); }); }
    var body = this.pending[id]; if(!body) return Promise.resolve();
    delete this.pending[id];
    var p = this.write(body).catch(function(e){
      if(e && e.code==="unavailable") return new Promise(function(r){setTimeout(r,700+Math.random()*600);}).then(function(){ return self.write(body); });
      throw e;
    }).then(function(){ delete self.inflight[id]; if(!self.anyBusy()) setSave(self.mode==="db"?"saved":"local"); },
            function(e){ delete self.inflight[id]; self.fail(e); });
    this.inflight[id] = p; return p;
  },
  anyBusy:function(){ return Object.keys(this.pending).length+Object.keys(this.inflight).length+Object.keys(this.timers).length>0; },
  write:function(r){
    if(this.mode==="db") return this.col.doc(r.id).set(r);
    var list = this.lsRead().filter(function(x){return x.id!==r.id;}); list.push(r);
    return this.lsWrite(list) ? Promise.resolve() : Promise.reject({code:"local_full"});
  },
  remove:function(id){
    clearTimeout(this.timers[id]); delete this.timers[id]; delete this.pending[id];
    S.rosters = S.rosters.filter(function(r){return r.id!==id;});
    if(this.mode==="db") return this.col.doc(id).delete().catch(this.fail.bind(this));
    this.lsWrite(this.lsRead().filter(function(x){return x.id!==id;})); return Promise.resolve();
  },
  fail:function(e){
    setSave("error");
    var msg = e && e.code==="quota_exceeded" ? "Storage is full. Delete rosters you no longer need, then try again."
      : e && (e.code==="revoked"||e.code==="not_granted") ? "Saving is not available in this view. Export your roster to keep it."
      : e && e.code==="local_full" ? "This browser refused to store the roster. Export it to keep a copy."
      : "A save did not go through. Your changes are still on screen; make another edit to retry, or export the roster.";
    S.notice = {kind:"err", text:msg}; render();
  }
};
function upsertList(r){ var i = S.rosters.findIndex(function(x){return x.id===r.id;}); var c = clone(r); if(i===-1) S.rosters.push(c); else S.rosters[i]=c; }
function setSave(s){ S.save = s; renderSaveState(); }
function afterLoad(){ if(S.view==="list" && !S.rosters.length && !S.cur){ openExample(true); return; } render(); }

/* ------------ example (Full Rules 9.1) ------------ */
function exampleRoster(){
  var r = C.newRoster();
  r.name = "Raynor's Raiders (rulebook example)"; r.race="Terran"; r.factionId="raynors-raiders"; r.scale="standard";
  ["barracks","barracks-proxy","factory","orbital-command","academy","engineering-bay"].forEach(function(id){ r.tactical[id]=1; });
  [["marine",9],["marine",9],["marine",6],["marauder",4],["marauder",2],["jim-raynor",1],["medic",3],["medic",3],["goliath",1]].forEach(function(p){ var e = C.newEntry(p[0]); e.models = p[1]; r.units.push(e); });
  r.isExample = true; return r;
}
function openExample(auto){
  S.cur = exampleRoster(); resetView();
  S.notice = {kind:"info", example:true, text: auto
    ? "This is the Raynor's Raiders army from the Full Rules army-building example (Part 9.1), loaded so you can see the builder at work. It isn't saved. Edit anything to keep it as your own roster, or start a new one."
    : "Rulebook example loaded. Edit anything to save it as your own roster."};
  render();
}

/* ------------ mutations ------------ */
function commit(opts){
  var r = S.cur; if(!r) return;
  if(r.isExample){ delete r.isExample; r.id = "r_"+RosterCore.uid(); r.createdAt = Date.now(); if(S.notice && S.notice.example) S.notice=null; }
  S.exp.preview = null;
  Store.queue(r);
  if(!opts || !opts.quiet) render(); else { renderMeters(); renderRail(); renderCrumb(); }
}
function resetView(){ S.view="build"; S.tab="build"; S.picker=false; S.open={}; S.notice=null; S.confirmRace=null; S.exp.preview=null; S.exp.copyText=null; S.exp.base=""; }
function openRoster(id){ var r = S.rosters.filter(function(x){return x.id===id;})[0]; if(!r) return; S.cur = clone(r); resetView(); render(); window.scrollTo(0,0); }
function newRoster(){ var r = C.newRoster(); S.cur = r; resetView(); Store.queue(r); render(); window.scrollTo(0,0); }
function setRace(race){
  var r = S.cur; if(r.race===race) return;
  var loses = r.units.length + Object.keys(r.tactical).length + (r.creepId?1:0);
  if(r.race && loses && S.confirmRace!==race){ S.confirmRace = race; render(); return; }
  S.confirmRace=null; r.race = race; r.factionId = null; r.tactical = {}; r.creepId = null; r.units = []; commit();
}
function setFaction(id){
  var r = S.cur; if(r.factionId===id) return;
  r.factionId = id; var removed = [];
  var okT = C.eligibleTactical(r).map(function(c){return c.id;});
  Object.keys(r.tactical).forEach(function(k){ if(okT.indexOf(k)===-1){ removed.push(C.cards[k].name); delete r.tactical[k]; } });
  var okC = C.eligibleCreep(r).map(function(c){return c.id;});
  if(r.creepId && okC.indexOf(r.creepId)===-1){ removed.push(C.cards[r.creepId].name); r.creepId=null; }
  if(!C.requiresCreep(r)) r.creepId = null;
  var okU = C.eligibleUnits(r).map(function(u){return u.id;});
  r.units = r.units.filter(function(e){ if(okU.indexOf(e.unitId)===-1){ removed.push(C.units[e.unitId].name); return false; } return true; });
  S.notice = removed.length ? {kind:"info", text:"Removed because "+C.cards[id].name+" cannot field them: "+removed.join(", ")+"."} : null;
  commit();
}
function entryById(uid){ return S.cur.units.filter(function(e){return e.uid===uid;})[0]; }

/* ------------ small renderers ------------ */
function slotChips(slots){ return Object.keys(slots).map(function(s){ return '<span class="chip slot">+'+slots[s]+' '+esc(s)+'</span>'; }).join(""); }
function tp(t){ return t ? '<span class="tp '+esc(t)+'">'+esc(t.toUpperCase())+'</span>' : ""; }
function inlineAbilities(race, abilities){ return '<div class="sc-card sc-inline" data-race="'+esc(race)+'">'+abilities.map(function(a){ return Render.abilityBox(a); }).join("")+'</div>'; }
function weaponLine(w){
  return 'RNG '+esc(w.rng)+' · '+esc(w.target)+' · RoA '+esc(w.roa)+' · Hit '+esc(w.hit)+(w.surge_type!=="-"?' · Surge '+esc(w.surge_type)+' '+esc(w.s_dice):'')+' · Dmg '+esc(w.dmg)+(w.keywords.length?' · '+esc(w.keywords.join(", ")):'');
}
function costRange(u){ var a = u.compositions.map(function(c){return c.minerals;}); var lo=Math.min.apply(null,a), hi=Math.max.apply(null,a); return lo===hi ? fmt(lo) : fmt(lo)+"–"+fmt(hi); }
function miniImg(uid){ return '<img src="'+ART.mini(uid)+'" alt="" loading="lazy">'; }

/* ------------ top-level render ------------ */
function render(){
  var race = (S.view==="build" && S.cur && S.cur.race) || "";
  document.body.setAttribute("data-race", race);
  $("brand-emb").src = ART.race(race || "Terran");
  renderCrumb(); renderSaveState();
  if(S.view==="list") renderList(); else renderBuild();
}
function renderCrumb(){
  var el = $("crumb");
  if(S.view==="list"){ el.innerHTML = '<span>/</span><span class="title">Rosters</span>'; return; }
  el.innerHTML = '<span>/</span><button class="btn ghost sm" data-a="home">Rosters</button><span>/</span><span class="title">'+esc(S.cur ? S.cur.name || "Untitled roster" : "")+'</span>';
}
function renderSaveState(){
  var el = $("savestate"), s = S.save, cur = S.cur, d, t;
  if(S.store==="loading"){ d="busy"; t="Connecting storage…"; }
  else if(cur && cur.isExample && S.view==="build"){ d=""; t="Example, not saved"; }
  else if(s==="saving"){ d="busy"; t="Saving…"; }
  else if(s==="error"){ d="bad"; t="Not saved"; }
  else if(S.store==="db"){ d="ok"; t="Saved to your account"; }
  else { d="busy"; t="Saved in this browser only"; }
  el.innerHTML = '<span class="dot '+d+'"></span><span class="txt">'+esc(t)+'</span>'; el.title = t;
}
function noticeHTML(){
  if(!S.notice) return "";
  return '<div class="notice '+(S.notice.kind==="err"?"err":"")+'" role="status"><div class="grow">'+esc(S.notice.text)+
    (S.notice.dropped && S.notice.dropped.length ? '<div class="faint" style="margin-top:4px">Skipped: '+esc(S.notice.dropped.join(", "))+'</div>' : '')+
    '</div>'+(S.notice.example?'<button class="btn sm" data-a="new">New roster</button>':'')+'<button class="btn ghost sm" data-a="dismiss">Dismiss</button></div>';
}

/* ------------ list view ------------ */
function renderList(){
  var list = S.rosters.slice().sort(function(a,b){ return (b.updatedAt||0)-(a.updatedAt||0); });
  var h = '<div class="listhead"><h1>Your rosters</h1><div class="actions"><button class="btn" data-a="toggle-import">Import</button><button class="btn" data-a="example">Rulebook example</button><button class="btn primary" data-a="new">New roster</button></div></div>';
  h += noticeHTML();
  if(S.importOpen){
    h += '<div class="importbox"><div class="field"><label for="imp-code">Share code or roster file text</label><textarea class="input" id="imp-code" placeholder="Paste a share code (starts with SCM1.) or the contents of a roster .json file"></textarea></div>'+
      '<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center"><button class="btn primary" data-a="import-code">Import code</button><span class="faint">or</span><label class="btn" for="imp-file">Choose roster file…</label><input type="file" id="imp-file" accept=".json,application/json" hidden><button class="btn ghost" data-a="toggle-import">Cancel</button></div></div>';
  }
  if(S.store==="loading") h += '<div class="empty">Loading your rosters…</div>';
  else if(!list.length) h += '<div class="empty">No saved rosters yet. Start a new roster, import one, or open the rulebook example.</div>';
  else {
    h += '<div class="cards">';
    list.forEach(function(r){
      var f = C.faction(r), t = C.totals(r), lim = C.limits(r), errs = C.validate(r).filter(function(x){return x.level==="error";}).length;
      var seen = {}, minis = r.units.filter(function(e){ if(seen[e.unitId]) return false; seen[e.unitId]=1; return C.units[e.unitId]; }).slice(0,7);
      h += '<article class="rcard"><div class="rc-top">'+(r.race?'<img src="'+ART.race(r.race)+'" alt="">':'')+
        '<div style="flex:1;min-width:0"><div class="rc-name">'+esc(r.name||"Untitled roster")+'</div><div class="rc-fac">'+esc(f?f.name:"No faction yet")+' · '+esc(lim.scale.name)+'</div></div>'+
        (errs?'<span class="pill err">'+errs+' issue'+(errs>1?'s':'')+'</span>':'<span class="pill ok">Legal</span>')+'</div><div class="rc-b">'+
        '<div class="rc-minis">'+(minis.length?minis.map(function(e){return miniImg(e.unitId);}).join(""):'<span class="faint">No units yet</span>')+'</div>'+
        '<div class="rc-stats"><div>Minerals<b>'+fmt(t.minerals)+'<span class="faint">/'+fmt(lim.minerals)+'</span></b></div><div>Gas<b>'+fmt(t.gas)+'<span class="faint">/'+fmt(lim.gas)+'</span></b></div><div>Supply<b>'+t.supply+'</b></div></div><div class="rc-act">';
      if(S.confirmDel===r.id) h += '<span class="muted" style="align-self:center">Delete this roster?</span><button class="btn danger sm" data-a="del-yes" data-id="'+esc(r.id)+'">Delete</button><button class="btn sm" data-a="del-no">Keep</button>';
      else h += '<button class="btn primary sm" data-a="open" data-id="'+esc(r.id)+'">Open</button><button class="btn sm" data-a="open-export" data-id="'+esc(r.id)+'">Export</button><button class="btn sm" data-a="dup" data-id="'+esc(r.id)+'">Duplicate</button><button class="btn ghost sm danger" data-a="del" data-id="'+esc(r.id)+'">Delete</button>';
      h += '</div></div></article>';
    });
    h += '</div>';
  }
  if(S.store==="local") h += '<p class="faint" style="margin-top:16px">Account storage isn\'t available in this view, so rosters are kept in this browser only. Export rosters you want to keep.</p>';
  $("app").innerHTML = h;
}

/* ------------ build view ------------ */
function renderBuild(){
  var h = '<div class="strip" id="strip"><div class="wrap" id="meters"></div></div>';
  h += '<div class="tabs" role="tablist">'+[["build","Build"],["sheet","Roster sheet"],["export","Export"]].map(function(t){
    return '<button class="tab" role="tab" aria-selected="'+(S.tab===t[0])+'" data-a="tab" data-v="'+t[0]+'">'+t[1]+'</button>'; }).join("")+'</div>';
  h += noticeHTML();
  if(S.tab==="sheet"){ h += '<div class="sheetwrap">'+Render.sheetHTML(C, S.cur, null, {art:true, checks:true})+'</div>'; $("app").innerHTML = h; renderMeters(); return; }
  if(S.tab==="export"){ h += '<div id="export"></div>'; $("app").innerHTML = h; renderMeters(); renderExport(); return; }
  h += '<div class="layout"><div class="main"><section class="section" id="sec-setup"></section><section class="section" id="sec-cards"></section><section class="section" id="sec-units"></section><section class="section" id="sec-scenario"></section></div><aside class="rail" id="rail"></aside></div>';
  $("app").innerHTML = h;
  renderMeters(); renderSetup(); renderCards(); renderUnits(); renderScenario(); renderRail();
}
function secHead(step, title, aside){ return '<header><span class="step">STEP '+step+'</span><h2>'+title+'</h2><span class="aside">'+(aside||"")+'</span></header>'; }

function renderMeters(){
  var el = $("meters"); if(!el) return;
  var r = S.cur, t = C.totals(r), lim = C.limits(r), v = C.validate(r);
  var errs = v.filter(function(x){return x.level==="error";}).length, warns = v.filter(function(x){return x.level==="warn";}).length;
  function meter(cls, label, used, max, gem){
    var pct = Math.min(100, max ? used/max*100 : 0), over = used>max;
    return '<div class="meter '+cls+(over?' over':'')+'"><div class="lbl"><span><i class="gem '+gem+'"></i>'+label+'</span><span>'+(over?'over by '+fmt(used-max):fmt(max-used)+' left')+'</span></div><div class="val">'+fmt(used)+' <small>/ '+fmt(max)+'</small></div><div class="bar"><i style="width:'+pct+'%"></i></div></div>';
  }
  el.innerHTML = meter("min","Minerals",t.minerals,lim.minerals,"min") + meter("gas","Vespene Gas",t.gas,lim.gas,"gas") +
    '<div class="meter"><div class="lbl"><span>Total Supply</span><span>'+r.units.length+' unit'+(r.units.length===1?'':'s')+'</span></div><div class="val">'+t.supply+'</div><div class="faint" style="font-size:11px;margin-top:3px">'+esc(lim.scale.name)+' · '+esc(lim.scale.battlefield)+'</div></div>'+
    '<button class="meter status" data-a="goto-checks"><div class="lbl"><span>Roster check</span></div>'+
    (errs ? '<div class="val" style="color:var(--err)">'+errs+' issue'+(errs>1?'s':'')+'</div><div class="faint" style="font-size:11px">'+(warns?warns+' tournament note'+(warns>1?'s':''):'Not legal yet')+'</div>'
          : '<div class="val" style="color:var(--ok)">Legal</div><div class="faint" style="font-size:11px">'+(warns?warns+' tournament note'+(warns>1?'s':''):'Ready for play')+'</div>')+'</button>';
}

function renderSetup(){
  var r = S.cur, el = $("sec-setup"); if(!el) return;
  var h = secHead(1, "Army setup", "Part 9.1.1–9.1.2") + '<div class="sbody">';
  h += '<div class="grid2"><div class="field"><label for="f-name">Roster name</label><input class="input" id="f-name" value="'+esc(r.name)+'" maxlength="120"></div><div class="field"><label for="f-player">Player name</label><input class="input" id="f-player" value="'+esc(r.player)+'" maxlength="80" placeholder="Shown on the tournament roster"></div></div>';
  h += '<div class="subhead">Engagement scale</div><div class="seg" role="group" aria-label="Engagement scale">';
  ["skirmish","standard","grand"].forEach(function(k){ var s = SCALES[k], lim = C.limits({scale:k, grandMinerals:r.grandMinerals});
    h += '<button data-a="scale" data-v="'+k+'" aria-pressed="'+(r.scale===k)+'">'+esc(s.name)+' <span class="faint num">'+(k==="grand"?"2,001+":fmt(lim.minerals))+' / '+(k==="grand"?"10%":fmt(lim.gas))+'</span></button>'; });
  h += '</div>';
  if(r.scale==="grand") h += '<div class="field" style="max-width:260px;margin-top:10px"><label for="f-go">Mineral limit (Grand Offensive)</label><input class="input num" id="f-go" type="number" min="2001" step="50" value="'+esc(r.grandMinerals)+'"></div>';
  h += '<div class="subhead">Race</div><div class="seg race" role="group" aria-label="Race">';
  RACES.forEach(function(x){ h += '<button data-a="race" data-v="'+x+'" aria-pressed="'+(r.race===x)+'"><img src="'+ART.race(x)+'" alt="">'+x+'</button>'; });
  h += '</div>';
  if(S.confirmRace) h += '<div class="notice err"><div class="grow">Switching to '+esc(S.confirmRace)+' removes every unit and card on this roster.</div><button class="btn danger sm" data-a="race-yes">Switch race</button><button class="btn sm" data-a="race-no">Cancel</button></div>';
  if(r.race){
    h += '<div class="subhead">Faction Card<span class="aside faint">Exactly one per army</span></div><div class="tiles">';
    C.factionCards(r.race).forEach(function(f){
      h += '<button class="tile" data-a="faction" data-v="'+esc(f.id)+'" aria-pressed="'+(r.factionId===f.id)+'"><span class="t-art"><img src="'+ART.card(f.id)+'" alt=""></span><span class="tcol">'+
        '<span class="t-name">'+esc(f.name)+'</span><span class="t-meta">'+slotChips(f.slots)+'</span><span class="t-sub">Tags: '+esc(f.faction_tags.join(", "))+'</span></span></button>';
    });
    h += '</div>';
    var f = C.faction(r);
    if(f) h += '<div style="margin-top:10px"><button class="btn sm" data-a="tcard" data-v="'+esc(f.id)+'">View '+esc(f.name)+' card</button></div>';
  }
  el.innerHTML = h + '</div>';
}

function renderCards(){
  var r = S.cur, el = $("sec-cards"); if(!el) return;
  var t = C.totals(r), lim = C.limits(r);
  var h = secHead(2, "Tactical Cards", '<b>'+fmt(t.gas)+'</b> / '+fmt(lim.gas)+' Vespene Gas · Part 9.1.4–9.1.5') + '<div class="sbody">';
  if(!C.faction(r)){ el.innerHTML = h+'<p class="muted" style="margin:0">Choose a Faction Card first. It decides which Tactical Cards you can buy.</p></div>'; return; }
  if(C.requiresCreep(r)){
    h += '<div class="subhead" style="margin-top:0">Creep Card<span class="aside faint">Choose exactly one (Zerg Creep)</span></div><div class="tiles" role="radiogroup" aria-label="Creep Card">';
    C.eligibleCreep(r).forEach(function(c){
      h += '<div class="tile" role="radio" tabindex="0" data-a="creep" data-v="'+esc(c.id)+'" aria-checked="'+(r.creepId===c.id)+'"><span class="t-art"><img src="'+ART.card(c.id)+'" alt=""></span><span class="tcol">'+
        '<span class="t-name">'+esc(c.name)+'</span><span class="t-meta"><span class="gascost">'+c.gas_cost+' gas</span>'+(c.unique?'<span class="chip uniq">Unique</span>':'')+'</span>'+
        '<span class="t-sub">'+c.abilities.map(function(a){return esc(a.name);}).join(" · ")+'</span></span></div>';
    });
    h += '</div><div class="subhead">Tactical Cards</div>';
  }
  h += '<div class="rows">';
  C.eligibleTactical(r).forEach(function(c){
    var n = r.tactical[c.id]||0, k = "card:"+c.id;
    h += '<div class="row'+(n?' on':'')+'"><button class="thumb" data-a="tcard" data-v="'+esc(c.id)+'" aria-label="View '+esc(c.name)+' card"><img src="'+ART.card(c.id)+'" alt=""></button><div><div class="r-name">'+esc(c.name)+(c.unique?' <span class="chip uniq">Unique</span>':'')+
      (c.faction_tags.length>1?' <span class="chip">'+esc(c.faction_tags.slice(1).join(", "))+'</span>':'')+'</div>'+
      '<div class="r-meta">'+slotChips(c.slots)+'<span>· '+(c.resource.value!=null?esc(c.resource.value+" "+c.resource.type):"no "+esc(c.resource.type)+" value printed")+'</span><button class="btn ghost sm" data-a="toggle" data-v="'+k+'">'+(S.open[k]?'Hide abilities':'Abilities')+'</button></div></div>'+
      '<div class="r-ctl"><span class="gascost">'+c.gas_cost+'</span>';
    if(c.unique) h += '<button class="btn sm'+(n?' primary':'')+'" data-a="tac-toggle" data-v="'+esc(c.id)+'" aria-pressed="'+(!!n)+'">'+(n?'Taken':'Take')+'</button>';
    else h += '<span class="stepper"><button data-a="tac-dec" data-v="'+esc(c.id)+'" aria-label="Remove one '+esc(c.name)+'">−</button><span>'+n+'</span><button data-a="tac-inc" data-v="'+esc(c.id)+'" aria-label="Add one '+esc(c.name)+'">+</button></span>';
    h += '</div>'+(S.open[k]?'<div class="expand">'+inlineAbilities(c.race, c.abilities)+'</div>':'')+'</div>';
  });
  el.innerHTML = h + '</div></div>';
}

function renderUnits(){
  var r = S.cur, el = $("sec-units"); if(!el) return;
  var t = C.totals(r), lim = C.limits(r), v = C.validate(r);
  var h = secHead(3, "Muster units", '<b>'+fmt(t.minerals)+'</b> / '+fmt(lim.minerals)+' Minerals · Part 9.1.6–9.1.7') + '<div class="sbody">';
  if(!C.faction(r)){ el.innerHTML = h+'<p class="muted" style="margin:0">Choose a Faction Card first.</p></div>'; return; }
  var errBy = {}; v.forEach(function(x){ if(x.level==="error" && x.target && x.target.indexOf("u_")===0) (errBy[x.target]=errBy[x.target]||[]).push(x.msg); });
  h += '<div class="entries">';
  if(!r.units.length) h += '<div class="empty">No units yet. Add units that fit your Army Slots.</div>';
  r.units.forEach(function(e){
    var u = C.units[e.unitId]; if(!u) return;
    var cost = C.entryCost(e), comp = C.composition(e), collapsed = S.open["c:"+e.uid];
    h += '<article class="entry'+(errBy[e.uid]?' has-err':'')+'" id="'+esc(e.uid)+'"><div class="entry-h"><button class="thumb mini" data-a="card" data-v="'+esc(u.id)+'" data-e="'+esc(e.uid)+'" aria-label="View '+esc(u.name)+' card">'+miniImg(u.id)+'</button>'+
      '<span class="e-name">'+esc(u.name)+'</span><span class="chip slot">'+esc(u.army_slot)+'</span>'+(u.unique?'<span class="chip uniq">Unique</span>':'')+
      '<span class="faint">×'+e.models+' · Supply '+cost.supply+'</span><span class="e-cost"><span class="mincost" title="'+cost.base+' base + '+cost.upgrades+' upgrades">'+fmt(cost.total)+'</span>'+
      '<button class="btn sm" data-a="card" data-v="'+esc(u.id)+'" data-e="'+esc(e.uid)+'">Card</button><button class="btn ghost sm" data-a="collapse" data-v="'+esc(e.uid)+'" aria-expanded="'+(!collapsed)+'">'+(collapsed?'Edit':'Fold')+'</button></span></div>';
    if(!collapsed){
      h += '<div class="entry-b"><div><div class="lbl-s" style="margin-bottom:5px">Composition</div><div class="comps">';
      u.compositions.forEach(function(c){ h += '<button data-a="models" data-e="'+esc(e.uid)+'" data-v="'+c.models+'" aria-pressed="'+(e.models===c.models)+'"><b>'+c.models+'</b> model'+(c.models>1?'s':'')+' <span class="mincost">'+c.minerals+'</span> <span class="faint">Supply '+c.supply+'</span></button>'; });
      h += '</div></div>';
      if(u.upgrades.length){
        h += '<div><div class="lbl-s" style="margin-bottom:3px">Upgrades</div><div class="upg">';
        u.upgrades.forEach(function(up){
          var on = e.upgrades.indexOf(up.name)!==-1, cst = comp ? up.cost_by_composition[comp.index] : null, id = "up-"+e.uid+"-"+up.name.replace(/[^a-z0-9]/gi,"");
          h += '<label class="u'+(on?' on':'')+'" for="'+id+'"><input type="checkbox" id="'+id+'" data-a="upg" data-e="'+esc(e.uid)+'" data-v="'+esc(up.name)+'"'+(on?' checked':'')+'>'+
            '<div><div class="u-name">'+esc(up.name)+(up.specialist?'<span class="pill neutral">SPECIALIST</span>':'')+(up.replaces?'<span class="faint" style="font-weight:600;text-transform:none">&#9650; for '+esc(up.replaces)+'</span>':'')+
            (up.kind==="ability"?tp(up.type)+(up.cost?' <span class="faint">'+esc(up.cost)+'</span>':''):'')+'</div>'+
            '<div class="u-desc">'+(up.kind==="weapon"?'<b>'+esc(Render.PHASE_NAME[up.phase])+'</b> · '+weaponLine(up):Render.richText(up.text))+'</div>';
          if(on && up.specialist){
            var sel = e.specialists[up.name]||"";
            h += '<div class="spec"><span>Carried by model</span><select data-a="spec" data-e="'+esc(e.uid)+'" data-v="'+esc(up.name)+'" aria-label="Model carrying '+esc(up.name)+'"><option value="">Choose…</option>';
            for(var m=1;m<=e.models;m++) h += '<option value="'+m+'"'+(String(sel)===String(m)?' selected':'')+'>'+m+'</option>';
            h += '</select></div>';
          }
          h += '</div><span class="mincost">'+(cst==null?'—':cst)+'</span></label>';
        });
        h += '</div></div>';
      } else h += '<div class="faint">No upgrades on this card.</div>';
      var lt = C.loadoutText(e); if(lt) h += '<div class="loadout">'+esc(lt)+'</div>';
      if(errBy[e.uid]) h += errBy[e.uid].map(function(m){return '<div class="check error"><span class="mk"></span><span>'+esc(m)+'</span></div>';}).join("");
      h += '<div style="display:flex;gap:6px;flex-wrap:wrap"><button class="btn sm" data-a="dup-unit" data-e="'+esc(e.uid)+'">Duplicate unit</button><button class="btn ghost sm danger" data-a="rm-unit" data-e="'+esc(e.uid)+'">Remove</button></div></div>';
    }
    h += '</article>';
  });
  h += '</div><div style="margin-top:12px">';
  if(!S.picker) h += '<button class="btn primary" data-a="picker">Add unit</button>';
  else {
    var sl = C.slots(r), elig = C.eligibleUnits(r), taken = {};
    r.units.forEach(function(e){ taken[e.unitId]=true; });
    h += '<div class="picker"><div style="display:flex;align-items:center;gap:8px;margin-bottom:8px"><b>Add a unit</b><span class="faint">'+esc(C.faction(r).name)+' can field these</span><button class="btn ghost sm" style="margin-left:auto" data-a="picker">Close</button></div>';
    SLOT_TYPES.forEach(function(s){
      var us = elig.filter(function(u){return u.army_slot===s;}); if(!us.length) return;
      var free = sl.available[s]-sl.used[s];
      h += '<div class="pgroup"><div class="subhead" style="margin-top:0">'+esc(s)+'<span class="aside" style="'+(free<0?'color:var(--err)':'')+'">'+free+' of '+sl.available[s]+' slots free</span></div><div class="rows">';
      us.forEach(function(u){
        var blocked = u.unique && taken[u.id], minSup = Math.min.apply(null, u.compositions.map(function(c){return c.supply;}));
        h += '<div class="row"><button class="thumb mini" data-a="card" data-v="'+esc(u.id)+'" aria-label="View '+esc(u.name)+' card">'+miniImg(u.id)+'</button><div><div class="r-name">'+esc(u.name)+(u.unique?' <span class="chip uniq">Unique</span>':'')+'</div>'+
          '<div class="r-meta"><span class="mincost">'+costRange(u)+'</span><span>· '+u.compositions.map(function(c){return c.models+(c.models>1?" models":" model")+" (Supply "+c.supply+")";}).join(" / ")+'</span>'+
          (minSup>free?'<span class="pill warn">needs '+minSup+' '+esc(s)+'</span>':'')+'</div></div>'+
          '<div class="r-ctl"><button class="btn ghost sm" data-a="card" data-v="'+esc(u.id)+'">Card</button><button class="btn sm primary" data-a="add-unit" data-v="'+esc(u.id)+'"'+(blocked?' disabled title="Unique: already on this roster"':'')+'>Add</button></div></div>';
      });
      h += '</div></div>';
    });
    h += '</div>';
  }
  el.innerHTML = h + '</div></div>';
}

function renderScenario(){
  var r = S.cur, el = $("sec-scenario"); if(!el) return;
  var lim = C.limits(r), side = lim.scale.side;
  var h = secHead(4, "Mission &amp; Deployment", "Organized Play: 2 of each · Part 9.2") + '<div class="sbody">';
  h += '<div class="subhead" style="margin-top:0">Mission Cards<span class="aside faint">'+r.missions.length+' of 2 · '+(side==="skirmish"?"Skirmish Level side":"Standard Engagement side")+'</span></div><div class="tiles">';
  DATA.missions.forEach(function(m){
    var on = r.missions.indexOf(m.id)!==-1, sd = m[side], full = !on && r.missions.length>=2, k="m:"+m.id;
    h += '<div class="tile" role="checkbox" tabindex="0" data-a="mission" data-v="'+esc(m.id)+'" aria-checked="'+on+'"'+(full?' aria-disabled="true" style="opacity:.55"':'')+'><span class="tcol">'+
      '<span class="t-name">'+esc(m.name)+'</span><span class="t-meta"><span class="chip">Supply '+sd.deploy_supply+'</span><span class="chip">+'+sd.supply_per_round+' / round</span><span class="chip">'+sd.game_length+' rounds</span>'+(sd.special_win_lead?'<span class="chip">Win at +'+sd.special_win_lead+' VP</span>':'')+'</span>'+
      '<span class="t-sub">'+esc(sd.mission_parameters[0])+'</span><button class="btn ghost sm" style="align-self:flex-start" data-a="toggle" data-v="'+k+'">'+(S.open[k]?'Hide card':'Show card')+'</button></span></div>';
    if(S.open[k]) h += '<div style="grid-column:1/-1">'+Render.missionCardHTML(m, side)+'</div>';
  });
  h += '</div><div class="subhead">Deployment Cards<span class="aside faint">'+r.deployments.length+' of 2 · '+esc(lim.scale.battlefield)+' side</span></div><div class="tiles">';
  DATA.deployments.forEach(function(d){
    var on = r.deployments.indexOf(d.id)!==-1, full = !on && r.deployments.length>=2;
    h += '<div class="tile" role="checkbox" tabindex="0" data-a="deploy" data-v="'+esc(d.id)+'" aria-checked="'+on+'"'+(full?' aria-disabled="true" style="opacity:.55"':'')+'><span class="tcol"><span class="t-name">'+esc(d[side])+'</span><span class="t-sub">'+(side==="skirmish"?"Standard side: ":"Skirmish side: ")+esc(d[side==="skirmish"?"standard":"skirmish"])+'</span></span></div>';
  });
  el.innerHTML = h + '</div></div>';
}

function renderRail(){
  var r = S.cur, el = $("rail"); if(!el) return;
  var sl = C.slots(r), v = C.validate(r);
  var errs = v.filter(function(x){return x.level==="error";}), warns = v.filter(function(x){return x.level==="warn";}), infos = v.filter(function(x){return x.level==="info";});
  var h = '<div class="panel" id="rail-slots"><h3>Army Slots</h3><div class="pb"><div class="slots">';
  SLOT_TYPES.forEach(function(s){
    var a = sl.available[s], u = sl.used[s], n = Math.max(a,u), pips = "";
    for(var i=0;i<n;i++) pips += '<span class="pip'+(i<u?(i>=a?' over':' used'):'')+'"></span>';
    h += '<div class="slotrow'+(u>a?' bad':'')+'"><span class="sn">'+s+'</span><span class="pips" aria-hidden="true">'+(n?pips:'<span class="faint" style="font-size:11px">none</span>')+'</span><span class="sc">'+u+'/'+a+'</span>'+
      (sl.sources[s].length?'<span class="src">'+sl.sources[s].map(function(x){return esc(x.name)+" +"+x.n;}).join(" · ")+'</span>':'')+'</div>';
  });
  h += '</div></div></div><div class="panel" id="rail-checks"><h3>Roster check</h3><div class="pb">';
  h += errs.length ? '<div class="legal" style="color:var(--err)">'+errs.length+' issue'+(errs.length>1?'s':'')+' to fix</div>' : '<div class="legal" style="color:var(--ok)">Legal army</div>';
  h += '<div class="checks">';
  errs.concat(warns, infos).forEach(function(x){ h += '<button class="check '+x.level+'" data-a="goto" data-v="'+esc(x.target||"")+'"><span class="mk"></span><span>'+esc(x.msg)+' <span class="ref">'+esc(x.ref)+'</span></span></button>'; });
  el.innerHTML = h + '</div></div></div>';
}

/* ------------ export ------------ */
var FORMATS = [
  {id:"manual", ext:"html", name:"Field manual", hero:true, art:true, desc:"Roster sheet plus the full card for every unit, summoned unit, Faction, Tactical and Creep Card, and your Mission Cards. Made for the table."},
  {id:"sheet", ext:"html", name:"Roster sheet", art:true, desc:"The tournament roster with every Organized Play field, laid out for printing."},
  {id:"text", ext:"txt", name:"Plain text", desc:"The full roster as plain text: units, loadouts, cards and totals."},
  {id:"compact", ext:"txt", name:"Compact list", suffix:"-list", desc:"A short list for messages and forum posts, one line per unit."},
  {id:"md", ext:"md", name:"Markdown", desc:"Tables for Discord, Reddit, GitHub or notes apps."},
  {id:"csv", ext:"csv", name:"Spreadsheet", desc:"One row per unit and card with the cost breakdown. Opens in Excel, Numbers or Google Sheets."},
  {id:"json", ext:"json", name:"Roster file", desc:"Brings this roster back into Muster later through Import, on any device."},
  {id:"zip", ext:"zip", name:"Everything", desc:"All seven formats above in one .zip file."}
];
function fmtById(id){ return FORMATS.filter(function(f){return f.id===id;})[0]; }
var imgCache = {};
function dataURL(path){
  if(imgCache[path]) return Promise.resolve(imgCache[path]);
  return fetch(path).then(function(r){ if(!r.ok) throw new Error("missing "+path); return r.blob(); }).then(function(b){
    return new Promise(function(res, rej){ var fr = new FileReader(); fr.onload = function(){ imgCache[path] = fr.result; res(fr.result); }; fr.onerror = rej; fr.readAsDataURL(b); });
  });
}
function embedResolver(r, kind){
  var paths = Render.imagesFor(C, r, kind);
  return Promise.all(paths.map(function(p){ return dataURL(p).catch(function(){ return null; }); })).then(function(){
    return function(p){ return imgCache[p] || ""; };
  });
}
function baseName(){ var b = (S.exp.base || (S.cur && S.cur.name) || "roster").replace(/[^\w\- ]+/g,"").trim().replace(/\s+/g,"-").slice(0,60); return b || "roster"; }
function fileName(f){ return baseName() + (f.id==="manual"?"-field-manual":f.id==="sheet"?"-roster-sheet":(f.suffix||"")) + "." + f.ext; }
var BLANK = function(){ return ""; };
function build(f, forPreview){
  var r = S.cur, art = S.exp.art;
  switch(f.id){
    case "text": return Promise.resolve(X.textFull(C, r));
    case "compact": return Promise.resolve(X.textCompact(C, r));
    case "md": return Promise.resolve(X.markdown(C, r));
    case "csv": return Promise.resolve(X.csv(C, r));
    case "json": return Promise.resolve(X.json(C, r));
    case "sheet": return (forPreview ? Promise.resolve(null) : art ? embedResolver(r, "sheet") : Promise.resolve(BLANK)).then(function(res){ return X.rosterSheetDoc(C, r, res, {art: art}); });
    case "manual": return (forPreview ? Promise.resolve(art ? null : BLANK) : art ? embedResolver(r, "manual") : Promise.resolve(BLANK)).then(function(res){ return X.fieldManualDoc(C, r, res); });
    case "zip": return buildZip();
  }
  return Promise.reject({code:"unknown"});
}
function buildZip(){
  if(!window.JSZip) return Promise.reject({code:"nozip"});
  var z = new JSZip(), list = FORMATS.filter(function(f){ return f.id!=="zip"; });
  return list.reduce(function(p, f){ return p.then(function(){ return build(f).then(function(c){ z.file(fileName(f), c); }); }); }, Promise.resolve())
    .then(function(){ return z.generateAsync({type:"blob", compression:"DEFLATE"}); });
}
function renderExport(){
  var el = $("export"); if(!el) return;
  var r = S.cur, errs = C.validate(r).filter(function(x){return x.level==="error";});
  var h = '<div class="exhead"><div class="field"><label for="exp-base">File name</label><input class="input" id="exp-base" value="'+esc(S.exp.base || baseName())+'" maxlength="60"></div>'+
    '<div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn" data-a="copy-code">Copy share code</button></div></div>';
  if(errs.length) h += '<div class="notice err"><div class="grow">This roster has '+errs.length+' rules issue'+(errs.length>1?'s':'')+'. Exports still work, and the HTML versions list the issues.</div><button class="btn sm" data-a="tab" data-v="build">Fix in Build</button></div>';
  if(!S.downloads) h += '<div class="notice"><div class="grow">Saving files isn\'t available in this view. Use Copy and paste into a file, or open the preview.</div></div>';
  h += '<div class="formats">';
  FORMATS.forEach(function(f){
    var busy = S.exp.busy===f.id;
    h += '<div class="fmt'+(f.hero?' hero':'')+'"><div class="fh"><span class="ext">.'+f.ext.toUpperCase()+'</span><span class="fn">'+esc(f.name)+'</span></div><div class="fd">'+esc(f.desc)+'<div class="faint fname" style="margin-top:4px;font-size:12px">'+esc(fileName(f))+'</div></div>';
    if(f.art) h += '<label class="fo"><input type="checkbox" data-a="exp-art"'+(S.exp.art?' checked':'')+'> Include card art and miniatures</label>';
    h += '<div class="fa"><button class="btn primary sm" data-a="exp-save" data-v="'+f.id+'"'+(!S.downloads||busy?' disabled':'')+'>'+(busy?'Preparing…':'Save to disk')+'</button>'+
      (f.id!=="zip"?'<button class="btn sm" data-a="exp-copy" data-v="'+f.id+'">Copy'+(f.ext==="html"?' HTML':'')+'</button><button class="btn ghost sm" data-a="exp-prev" data-v="'+f.id+'">'+(S.exp.preview&&S.exp.preview.id===f.id?'Hide preview':'Preview')+'</button>':'')+'</div></div>';
  });
  h += '</div><p class="faint" style="font-size:12px;margin-top:10px">HTML files open in any browser. To get a PDF or paper copy, open the saved file and use your browser\'s Print command.</p>';
  if(S.exp.copyText!=null) h += '<div class="preview" id="copy-box"><div class="ph"><b>Select and copy</b><span style="color:#B9C6D2">Copying isn\'t allowed here, so the text is selected below.</span></div><textarea class="input" id="copy-fallback" readonly style="min-height:220px;border:0;border-radius:0">'+esc(S.exp.copyText)+'</textarea></div>';
  if(S.exp.preview){
    var p = S.exp.preview, f = fmtById(p.id);
    h += '<div class="preview" id="exp-preview"><div class="ph"><b>Preview · '+esc(f.name)+'</b><span style="margin-left:auto"></span><button class="btn sm" data-a="exp-prev" data-v="'+f.id+'">Close</button></div>'+
      (f.ext==="html" ? '<div class="htmlbox" id="exp-shadow"></div>' : '<pre>'+esc(p.content)+'</pre>')+'</div>';
  }
  el.innerHTML = h;
  var host = $("exp-shadow");
  if(S.exp.preview && host){
    var root = host.attachShadow ? host.attachShadow({mode:"open"}) : host;
    var doc = S.exp.preview.content, css = (doc.match(/<style>([\s\S]*?)<\/style>/)||[])[1]||"", body = (doc.match(/<body>([\s\S]*?)<\/body>/)||[])[1]||"";
    root.innerHTML = '<style>:host{display:block}'+css.replace(/(^|\})body\{/g,"$1.docbody{")+'</style><div class="docbody">'+body+'</div>';
  }
}
function flash(text, kind){ S.notice = {kind:kind||"info", text:text}; render(); window.scrollTo({top:0, behavior:"smooth"}); }
function saveFile(f){
  if(!S.downloads || S.exp.busy) return;
  S.exp.busy = f.id; renderExport();
  build(f).then(function(content){
    S.exp.busy = null; renderExport();
    return S.downloads.save({filename:fileName(f), data:content}).then(function(res){
      flash(res && res.status==="delivered" ? fileName(f)+" sent." : "Saved "+fileName(f)+".");
    }, function(e){
      if(e && e.code==="declined") return;
      flash(e && e.code==="rate_limited" ? "A save prompt is already open. Finish it, then try again." : "The file could not be saved here. Use Copy instead.", "err");
    });
  }, function(e){ S.exp.busy = null; renderExport(); flash(e && e.code==="nozip" ? "The zip tool didn't load. Save the formats one at a time instead." : "That export could not be built. Try again, or use another format.", "err"); });
}
function copyText(text, label){
  function fallback(){ S.exp.copyText = text; if(S.tab!=="export"){ S.tab="export"; render(); } else renderExport(); var ta=$("copy-fallback"); if(ta){ ta.focus(); ta.select(); ta.scrollIntoView({block:"nearest"}); } }
  try{ navigator.clipboard.writeText(text).then(function(){ S.exp.copyText=null; flash(label+" copied."); }, fallback); }catch(e){ fallback(); }
}

/* ------------ card modal ------------ */
function openModal(html){
  $("modal-root").innerHTML = '<div class="scrim" data-a="close-modal"><div class="modal" role="dialog" aria-modal="true"><button class="mclose" data-a="close-modal" aria-label="Close">×</button>'+html+'</div></div>';
  var b = document.querySelector(".mclose"); if(b) b.focus();
}
function closeModal(){ $("modal-root").innerHTML = ""; }

/* ------------ share code / import ------------ */
function b64u(str){ var b = btoa(unescape(encodeURIComponent(str))); return b.replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,""); }
function unb64u(s){ s = s.replace(/-/g,"+").replace(/_/g,"/"); while(s.length%4) s+="="; return decodeURIComponent(escape(atob(s))); }
function shareCode(r){ return "SCM1."+b64u(JSON.stringify(C.exportable(r))); }
function importText(txt){
  txt = (txt||"").trim(); if(!txt) return;
  var obj = null;
  try{ obj = txt.indexOf("SCM1.")===0 ? JSON.parse(unb64u(txt.slice(5))) : JSON.parse(txt); }catch(e){ obj = null; }
  if(!obj){ flash("That isn't a roster share code or roster file. Share codes start with SCM1.", "err"); return; }
  var res = C.normalize(obj);
  if(!res.roster){ flash("That file doesn't contain a roster.", "err"); return; }
  var r = res.roster; r.name = r.name || "Imported roster";
  S.importOpen=false; S.cur = r; resetView(); S.notice = {kind:"info", text:"Imported "+r.name+".", dropped: res.dropped};
  Store.queue(r); render();
}

/* ------------ events ------------ */
document.addEventListener("click", function(ev){
  var t = ev.target.closest("[data-a]"); if(!t) return;
  var a = t.getAttribute("data-a"), v = t.getAttribute("data-v"), eu = t.getAttribute("data-e"), r = S.cur;
  if(a==="close-modal"){ if(ev.target===t || t.classList.contains("mclose")) closeModal(); return; }
  if(t.hasAttribute("disabled") || t.getAttribute("aria-disabled")==="true") return;
  switch(a){
    case "home": S.view="list"; S.cur=null; S.notice=null; S.confirmDel=null; render(); window.scrollTo(0,0); break;
    case "new": newRoster(); break;
    case "example": openExample(false); break;
    case "open": openRoster(t.getAttribute("data-id")); break;
    case "open-export": openRoster(t.getAttribute("data-id")); S.tab="export"; render(); break;
    case "dup": var src = S.rosters.filter(function(x){return x.id===t.getAttribute("data-id");})[0]; if(src){ var d = clone(src); d.id="r_"+RosterCore.uid(); d.name=(src.name||"Roster")+" (copy)"; d.createdAt=Date.now(); Store.queue(d); render(); } break;
    case "del": S.confirmDel = t.getAttribute("data-id"); render(); break;
    case "del-no": S.confirmDel = null; render(); break;
    case "del-yes": Store.remove(t.getAttribute("data-id")); S.confirmDel=null; render(); break;
    case "toggle-import": S.importOpen=!S.importOpen; render(); break;
    case "import-code": importText($("imp-code").value); break;
    case "dismiss": S.notice=null; render(); break;
    case "tab": S.tab=v; S.exp.preview=null; S.exp.copyText=null; render(); window.scrollTo(0,0); break;
    case "scale": r.scale=v; commit(); break;
    case "race": setRace(v); break;
    case "race-yes": var rc=S.confirmRace; r.race=null; setRace(rc); break;
    case "race-no": S.confirmRace=null; render(); break;
    case "faction": setFaction(v); break;
    case "toggle": S.open[v]=!S.open[v]; render(); break;
    case "creep": r.creepId = (r.creepId===v? null : v); commit(); break;
    case "tac-toggle": if(r.tactical[v]) delete r.tactical[v]; else r.tactical[v]=1; commit(); break;
    case "tac-inc": r.tactical[v]=(r.tactical[v]||0)+1; commit(); break;
    case "tac-dec": if(r.tactical[v]>1) r.tactical[v]--; else delete r.tactical[v]; commit(); break;
    case "picker": S.picker=!S.picker; render(); break;
    case "add-unit": var e = C.newEntry(v); r.units.push(e); commit(); var node=$(e.uid); if(node) node.scrollIntoView({block:"nearest"}); break;
    case "rm-unit": r.units = r.units.filter(function(x){return x.uid!==eu;}); commit(); break;
    case "dup-unit": var e0 = entryById(eu); if(e0){ var e1 = clone(e0); e1.uid="u_"+RosterCore.uid(); r.units.splice(r.units.indexOf(e0)+1,0,e1); commit(); } break;
    case "collapse": S.open["c:"+v]=!S.open["c:"+v]; render(); break;
    case "models": var e2 = entryById(eu); if(e2){ e2.models = Number(v); commit(); } break;
    case "card": openModal(Render.unitCardHTML(C, C.units[v], eu ? entryById(eu) : null)); break;
    case "tcard": openModal(Render.tacCardHTML(C, C.cards[v], null, r && r.tactical[v])); break;
    case "mission": case "deploy":
      var arr = a==="mission" ? r.missions : r.deployments, i = arr.indexOf(v);
      if(i!==-1) arr.splice(i,1); else if(arr.length<2) arr.push(v);
      commit(); break;
    case "goto-checks": var ch=$("rail-checks"); if(ch) ch.scrollIntoView({behavior:"smooth", block:"start"}); else { S.tab="build"; render(); var c2=$("rail-checks"); if(c2) c2.scrollIntoView({block:"start"}); } break;
    case "goto": var map = {setup:"sec-setup", cards:"sec-cards", units:"sec-units", scenario:"sec-scenario", slots:"rail-slots"}; var tg = $(map[v] || v); if(tg) tg.scrollIntoView({behavior:"smooth", block:"start"}); break;
    case "copy-code": copyText(shareCode(r), "Share code"); break;
    case "exp-save": saveFile(fmtById(v)); break;
    case "exp-copy": var fc = fmtById(v); build(fc).then(function(c){ copyText(c, fc.name); }); break;
    case "exp-prev":
      if(S.exp.preview && S.exp.preview.id===v){ S.exp.preview=null; renderExport(); break; }
      build(fmtById(v), true).then(function(c){ S.exp.preview = {id:v, content:c}; S.exp.copyText=null; renderExport(); var pv=$("exp-preview"); if(pv) pv.scrollIntoView({behavior:"smooth", block:"start"}); });
      break;
  }
});
document.addEventListener("keydown", function(ev){
  if(ev.key==="Escape" && $("modal-root").innerHTML){ closeModal(); return; }
  if((ev.key==="Enter"||ev.key===" ") && ev.target.matches && ev.target.matches('[role="radio"][data-a],[role="checkbox"][data-a]')){ ev.preventDefault(); ev.target.click(); }
});
document.addEventListener("change", function(ev){
  var t = ev.target, a = t.getAttribute && t.getAttribute("data-a"), r = S.cur;
  if(t.id==="imp-file" && t.files && t.files[0]){ var fr = new FileReader(); fr.onload = function(){ importText(String(fr.result)); }; fr.readAsText(t.files[0]); return; }
  if(a==="exp-art"){ S.exp.art = t.checked; S.exp.preview=null; renderExport(); return; }
  if(!a || !r) return;
  var e = entryById(t.getAttribute("data-e")), name = t.getAttribute("data-v");
  if(a==="upg" && e){
    var i = e.upgrades.indexOf(name);
    if(t.checked && i===-1) e.upgrades.push(name);
    if(!t.checked && i!==-1){ e.upgrades.splice(i,1); delete e.specialists[name]; }
    commit();
  } else if(a==="spec" && e){ if(t.value) e.specialists[name] = Number(t.value); else delete e.specialists[name]; commit(); }
});
var inputTimer = null, baseTimer = null;
document.addEventListener("input", function(ev){
  var t = ev.target, r = S.cur; if(!r) return;
  if(t.id==="f-name"){ r.name = t.value; commit({quiet:true}); }
  else if(t.id==="f-player"){ r.player = t.value; commit({quiet:true}); }
  else if(t.id==="f-go"){ var n = Number(t.value); if(n>2000){ r.grandMinerals = Math.floor(n); clearTimeout(inputTimer); inputTimer=setTimeout(function(){ commit({quiet:true}); renderSetup(); renderCards(); renderUnits(); },300); } }
  else if(t.id==="exp-base"){ S.exp.base = t.value; clearTimeout(baseTimer); baseTimer = setTimeout(function(){
    document.querySelectorAll(".fmt .fname").forEach(function(n, i){ n.textContent = fileName(FORMATS[i]); }); }, 150); }
});

/* ------------ boot ------------ */
render();
Store.init();
if(window.claude && typeof window.claude.use==="function"){
  window.claude.use("downloads").then(function(d){ S.downloads = d || null; if(S.view==="build" && S.tab==="export") renderExport(); }).catch(function(){});
}
window.__muster = {S:S, C:C, build:build, FORMATS:FORMATS};
})();
