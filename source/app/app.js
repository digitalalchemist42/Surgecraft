(function(){
"use strict";
var DATA = JSON.parse(document.getElementById("sc-data").textContent);
var C = new RosterCore(DATA);
var SLOT_TYPES = RosterCore.SLOT_TYPES, SCALES = RosterCore.SCALES, ART = Render.ART, X = Render.exports;
var RACES = ["Terran","Protoss","Zerg"];
var esc = Render.esc, fmt = Render.fmt;

var S = {
  view:"list", tab:"build", rosters:[], cur:null, store:"loading", save:"idle",
  open:{}, picker:false, importOpen:false, confirmDel:null, confirmRace:null, notice:null, downloads:null, tileOpen:null,
  exp:{ base:"", art:true, gloss:false, preview:null, busy:null, copyText:null }
};
function clone(o){ return JSON.parse(JSON.stringify(o)); }
function $(id){ return document.getElementById(id); }

/* Standalone = opened anywhere other than claude.ai (a saved file, a web host). No account storage there. */
var STANDALONE = !(window.claude && typeof window.claude.use==="function");
var MIME = {html:"text/html;charset=utf-8", txt:"text/plain;charset=utf-8", md:"text/markdown;charset=utf-8", csv:"text/csv;charset=utf-8", json:"application/json", zip:"application/zip"};

/* Installable-app support: only on a hosted standalone copy that ships a manifest (see build_standalone.py). */
var APP = { prompt:null, iosHint:false };
(function(){
  var hosted = STANDALONE && /^https?:$/.test(location.protocol) && document.querySelector('link[rel="manifest"]');
  if(!hosted) return;
  var installed = (window.matchMedia && window.matchMedia("(display-mode: standalone)").matches) || window.navigator.standalone === true;
  if("serviceWorker" in navigator){
    var hadController = !!navigator.serviceWorker.controller;
    navigator.serviceWorker.register("sw.js").catch(function(){});
    navigator.serviceWorker.addEventListener("controllerchange", function(){
      if(!hadController){ hadController = true; return; }
      S.notice = {kind:"info", reload:true, text:"A new version of SurgeCraft is ready."}; render();
    });
  }
  if(navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(function(){});
  window.addEventListener("beforeinstallprompt", function(e){ e.preventDefault(); APP.prompt = e; if(S.view==="list") render(); });
  window.addEventListener("appinstalled", function(){ APP.prompt = null; if(S.view==="list") render(); });
  var ios = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform==="MacIntel" && navigator.maxTouchPoints>1);
  APP.iosHint = ios && !installed;
})();

/* ------------ viewer preferences (this browser only): color mode + layout ------------ */
var PREF_KEY = "surgecraft.prefs.v1";
var P = (function(){ var d = {mode:"auto", layout:"list"}; try{ var v = JSON.parse(localStorage.getItem(PREF_KEY)||"{}"); if(["auto","light","dark"].indexOf(v.mode)!==-1) d.mode=v.mode; if(["list","tiles"].indexOf(v.layout)!==-1) d.layout=v.layout; }catch(e){} return d; })();
function savePrefs(){ try{ localStorage.setItem(PREF_KEY, JSON.stringify(P)); }catch(e){} }
var mq = window.matchMedia ? window.matchMedia("(prefers-color-scheme: dark)") : null;
function effectiveMode(){
  if(P.mode!=="auto") return P.mode;
  var t = document.documentElement.getAttribute("data-theme");
  if(t==="dark"||t==="light") return t;
  return mq && mq.matches ? "dark" : "light";
}
function applyMode(){
  document.body.setAttribute("data-mode", effectiveMode());
  var m = $("modes"); if(m) m.querySelectorAll("button").forEach(function(b){ b.setAttribute("aria-pressed", String(b.getAttribute("data-v")===P.mode)); });
}
if(mq){ if(mq.addEventListener) mq.addEventListener("change", applyMode); else if(mq.addListener) mq.addListener(applyMode); }
try{ new MutationObserver(applyMode).observe(document.documentElement, {attributes:true, attributeFilter:["data-theme"]}); }catch(e){}

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

/* ------------ example armies ------------ */
function openExample(auto, race){
  race = race || "Terran";
  var r = Examples.build(C, race); r.isExample = true;
  S.cur = r; resetView();
  var what = Examples.EX[race].note;
  S.notice = {kind:"info", example:true, text: auto
    ? "This is " + what + ", loaded so you can see the builder at work. It isn't saved. Edit anything to keep it as your own roster, or start a new one."
    : "Loaded " + what + ". It isn't saved until you edit it."};
  render(); window.scrollTo(0,0);
}

/* ------------ mutations ------------ */
function commit(opts){
  var r = S.cur; if(!r) return;
  if(r.isExample){ delete r.isExample; r.id = "r_"+RosterCore.uid(); r.createdAt = Date.now(); if(S.notice && S.notice.example) S.notice=null; }
  S.exp.preview = null;
  Store.queue(r);
  if(!opts || !opts.quiet) render(); else { renderMeters(); renderRail(); renderCrumb(); }
}
function resetView(){ VS.open={}; BS.set=null; BS.warn=[]; BS.pass=false; BS.undo=[]; BS.quit=false; BS.adj={me:0,opp:0}; BS.sumPick=false; BS.openAb={}; S.view="build"; S.tab="build"; S.picker=false; S.open={}; S.notice=null; S.confirmRace=null; S.tileOpen=null; S.exp.preview=null; S.exp.copyText=null; S.exp.base=""; }
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
function miniImg(uid){ var u = C.units[uid]; return u && u.summoned ? '<img src="'+ART.unit(uid)+'" alt="" loading="lazy" style="object-fit:cover">' : '<img src="'+ART.mini(uid)+'" alt="" loading="lazy">'; } // Summoned Units have no cut-out miniature; use their card art

/* ------------ top-level render ------------ */
function render(){
  var race = (S.view==="build" && S.cur && S.cur.race) || "";
  if(race) document.body.setAttribute("data-skin", race); else document.body.removeAttribute("data-skin");
  applyMode();
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
  else { d=STANDALONE?"ok":"busy"; t="Saved in this browser only"; }
  el.innerHTML = '<span class="dot '+d+'"></span><span class="txt">'+esc(t)+'</span>'; el.title = t;
}
function noticeHTML(){
  if(!S.notice) return "";
  return '<div class="notice '+(S.notice.kind==="err"?"err":"")+'" role="status"><div class="grow">'+esc(S.notice.text)+
    (S.notice.dropped && S.notice.dropped.length ? '<div class="faint" style="margin-top:4px">Skipped: '+esc(S.notice.dropped.join(", "))+'</div>' : '')+
    '</div>'+(S.notice.example?'<button class="btn sm" data-a="new">New roster</button>':'')+(S.notice.reload?'<button class="btn primary sm" data-a="reload">Reload</button>':'')+'<button class="btn ghost sm" data-a="dismiss">Dismiss</button></div>';
}

/* ------------ list view ------------ */
function renderList(){
  var list = S.rosters.slice().sort(function(a,b){ return (b.updatedAt||0)-(a.updatedAt||0); });
  var h = '<div class="listhead"><h1>Your rosters</h1><div class="actions">'+(APP.prompt?'<button class="btn" data-a="install">Install app</button>':'')+'<button class="btn" data-a="toggle-import">Import</button><button class="btn primary" data-a="new">New roster</button></div></div>';
  h += '<div class="examples"><span>Example armies:</span>'+RACES.map(function(x){ return '<button class="btn sm" data-a="example" data-v="'+x+'"><img src="'+ART.race(x)+'" alt="">'+x+'</button>'; }).join("")+'</div>';
  if(APP.iosHint) h += '<div class="notice" style="margin:0 0 14px"><div class="grow">To install SurgeCraft on this iPhone or iPad: tap <b>Share</b>, then <b>Add to Home Screen</b>. It then opens full screen and works offline.</div></div>';
  h += noticeHTML();
  if(S.importOpen){
    h += '<div class="importbox"><div class="field"><label for="imp-code">Share code or roster file text</label><textarea class="input" id="imp-code" placeholder="Paste a share code (starts with SCM1.) or the contents of a roster .json file"></textarea></div>'+
      '<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center"><button class="btn primary" data-a="import-code">Import code</button><span class="faint">or</span><label class="btn" for="imp-file">Choose roster file…</label><input type="file" id="imp-file" accept=".json,application/json" hidden><button class="btn ghost" data-a="toggle-import">Cancel</button></div></div>';
  }
  if(S.store==="loading") h += '<div class="empty">Loading your rosters…</div>';
  else if(!list.length) h += '<div class="empty">No saved rosters yet. Start a new roster, import one, or open an example army.</div>';
  else {
    h += '<div class="cards">';
    list.forEach(function(r){
      var f = C.faction(r), t = C.totals(r), lim = C.limits(r), errs = C.validate(r).filter(function(x){return x.level==="error";}).length;
      var seen = {}, minis = r.units.filter(function(e){ if(seen[e.unitId]) return false; seen[e.unitId]=1; return C.units[e.unitId]; }).slice(0,7);
      h += '<article class="rcard"'+(r.race?' data-skin="'+esc(r.race)+'"':'')+'><div class="rc-top">'+(r.race?'<img src="'+ART.race(r.race)+'" alt="">':'')+
        '<div style="flex:1;min-width:0"><div class="rc-name">'+esc(r.name||"Untitled roster")+'</div><div class="rc-fac">'+esc(f?f.name:"No faction yet")+' · '+esc(lim.scale.name)+' '+fmt(lim.minerals)+'</div></div>'+
        (errs?'<span class="pill err">'+errs+' issue'+(errs>1?'s':'')+'</span>':'<span class="pill ok">Legal</span>')+'</div><div class="rc-b">'+
        '<div class="rc-minis">'+(minis.length?minis.map(function(e){return miniImg(e.unitId);}).join(""):'<span class="faint">No units yet</span>')+'</div>'+
        '<div class="rc-stats"><div>Minerals<b>'+fmt(t.minerals)+'<span class="faint">/'+fmt(lim.minerals)+'</span></b></div><div>Gas<b>'+fmt(t.gas)+'<span class="faint">/'+fmt(lim.gas)+'</span></b></div><div>Supply<b>'+t.supply+'</b></div></div><div class="rc-act">';
      if(S.confirmDel===r.id) h += '<span class="muted" style="align-self:center">Delete this roster?</span><button class="btn danger sm" data-a="del-yes" data-id="'+esc(r.id)+'">Delete</button><button class="btn sm" data-a="del-no">Keep</button>';
      else h += '<button class="btn primary sm" data-a="open" data-id="'+esc(r.id)+'">Open</button><button class="btn sm" data-a="open-export" data-id="'+esc(r.id)+'">Export</button><button class="btn sm" data-a="dup" data-id="'+esc(r.id)+'">Duplicate</button><button class="btn ghost sm danger" data-a="del" data-id="'+esc(r.id)+'">Delete</button>';
      h += '</div></div></article>';
    });
    h += '</div>';
  }
  if(S.store==="local") h += '<p class="faint" style="margin-top:16px">'+(STANDALONE ? 'Rosters are saved in this browser on this device. To back one up or move it to another device, use Export: the Roster file (.json) or a share code brings it back in through Import.' : 'Account storage isn\'t available in this view, so rosters are kept in this browser only. Export rosters you want to keep.')+'</p>';
  $("app").innerHTML = h;
}

/* ------------ build view ------------ */
function renderBuild(){
  var h = '<div class="strip" id="strip"><div class="wrap" id="meters"></div></div>';
  h += '<div class="tabbar"><div class="tabs" role="tablist">'+[["build","Build"],["view","View"],["battle","Battle"],["sheet","Roster sheet"],["export","Export"]].map(function(t){
    return '<button class="tab" role="tab" aria-selected="'+(S.tab===t[0])+'" data-a="tab" data-v="'+t[0]+'">'+t[1]+'</button>'; }).join("")+'</div>';
  if(S.tab==="build") h += '<div class="viewsw"><span>Layout</span><div class="seg" role="group" aria-label="Layout">'+
    '<button data-a="layout" data-v="list" aria-pressed="'+(P.layout==="list")+'"><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M2 3h12M2 8h12M2 13h12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>List</button>'+
    '<button data-a="layout" data-v="tiles" aria-pressed="'+(P.layout==="tiles")+'"><svg viewBox="0 0 16 16" aria-hidden="true"><rect x="1.5" y="1.5" width="5.5" height="5.5" rx="1" fill="currentColor"/><rect x="9" y="1.5" width="5.5" height="5.5" rx="1" fill="currentColor"/><rect x="1.5" y="9" width="5.5" height="5.5" rx="1" fill="currentColor"/><rect x="9" y="9" width="5.5" height="5.5" rx="1" fill="currentColor"/></svg>Tiles</button></div></div>';
  h += '</div>';
  h += noticeHTML();
  if(S.tab==="sheet"){ h += '<div class="sheetwrap">'+Render.sheetHTML(C, S.cur, null, {art:true, checks:true})+'</div>'; $("app").innerHTML = h; renderMeters(); return; }
  if(S.tab==="view"){ h += '<div id="view"></div>'; $("app").innerHTML = h; renderMeters(); renderView(); return; }
  if(S.tab==="battle"){ h += '<div id="battle"></div>'; $("app").innerHTML = h; renderBattle(); return; }
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
  var curLim = C.limits(r);
  RosterCore.LIST_SIZES.forEach(function(z){ var s = SCALES[z.scale], g = z.scale==="grand", lim = C.limits({scale:z.scale, minerals:z.minerals, grandMinerals:r.grandMinerals});
    var on = r.scale===z.scale && (g || curLim.minerals===z.minerals);
    h += '<button data-a="scale" data-v="'+z.scale+(g?'':':'+z.minerals)+'" aria-pressed="'+on+'" title="'+esc(s.name+' · '+s.battlefield)+'"><span class="num">'+(g?'2,001+':fmt(z.minerals))+'</span> <span class="faint">'+esc(s.name)+(g?'':' · '+fmt(lim.gas)+' Gas')+'</span></button>'; });
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
  if(P.layout==="tiles"){
    h += '<div class="utiles">';
    C.eligibleTactical(r).forEach(function(c){
      var n = r.tactical[c.id]||0;
      h += '<div class="utile ttile'+(n?' on':'')+'"><button class="ut-img card art-bg" data-a="tcard" data-v="'+esc(c.id)+'" aria-label="View '+esc(c.name)+' card"><img src="'+ART.card(c.id)+'" alt="" loading="lazy">'+
        '<span class="ut-tl">'+(c.unique?'<span class="chip uniq" style="background:var(--panel)">Unique</span>':'')+'</span><span class="ut-tr gascost">'+c.gas_cost+'</span></button>'+
        '<div class="ut-body"><div class="ut-name">'+esc(c.name)+'</div><div class="t-meta" style="display:flex;flex-wrap:wrap;gap:4px">'+slotChips(c.slots)+'</div>'+
        '<div class="ut-meta">'+(c.resource.value!=null?esc(c.resource.value+" "+c.resource.type):"No "+esc(c.resource.type)+" value printed")+(c.faction_tags.length>1?' · '+esc(c.faction_tags.slice(1).join(", ")):'')+'</div></div><div class="ut-act">';
      if(c.unique) h += '<button class="btn sm'+(n?' primary':'')+'" data-a="tac-toggle" data-v="'+esc(c.id)+'" aria-pressed="'+(!!n)+'">'+(n?'Taken':'Take')+'</button>';
      else h += '<span class="stepper"><button data-a="tac-dec" data-v="'+esc(c.id)+'" aria-label="Remove one '+esc(c.name)+'">−</button><span>'+n+'</span><button data-a="tac-inc" data-v="'+esc(c.id)+'" aria-label="Add one '+esc(c.name)+'">+</button></span>';
      h += '<span class="grow"></span><button class="btn ghost sm" data-a="tcard" data-v="'+esc(c.id)+'">Card</button></div></div>';
    });
    el.innerHTML = h + '</div></div>';
    return;
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

function entryBodyHTML(e, u, errs){
  var comp = C.composition(e), h = '<div class="entry-b"><div><div class="lbl-s" style="margin-bottom:5px">Composition</div><div class="comps">';
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
  if(errs) h += errs.map(function(m){return '<div class="check error"><span class="mk"></span><span>'+esc(m)+'</span></div>';}).join("");
  h += '<div style="display:flex;gap:6px;flex-wrap:wrap"><button class="btn sm" data-a="dup-unit" data-e="'+esc(e.uid)+'">Duplicate unit</button><button class="btn ghost sm danger" data-a="rm-unit" data-e="'+esc(e.uid)+'">Remove</button></div></div>';
  return h;
}
function entryHeadHTML(e, u, cost, collapsedLabel){
  return '<div class="entry-h"><button class="thumb mini" data-a="card" data-v="'+esc(u.id)+'" data-e="'+esc(e.uid)+'" aria-label="View '+esc(u.name)+' card">'+miniImg(u.id)+'</button>'+
    '<span class="e-name">'+esc(u.name)+'</span><span class="chip slot">'+esc(u.army_slot)+'</span>'+(u.unique?'<span class="chip uniq">Unique</span>':'')+
    '<span class="faint">×'+e.models+' · Supply '+cost.supply+'</span><span class="e-cost"><span class="mincost" title="'+cost.base+' base + '+cost.upgrades+' upgrades">'+fmt(cost.total)+'</span>'+
    '<button class="btn sm" data-a="card" data-v="'+esc(u.id)+'" data-e="'+esc(e.uid)+'">Card</button>'+collapsedLabel+'</span></div>';
}
function unitTileHTML(e, u, cost, errs){
  var open = S.tileOpen===e.uid;
  return '<div class="utile'+(open?' open':'')+(errs?' has-err':'')+'" id="'+esc(e.uid)+'"><button class="ut-img" data-a="tile-open" data-v="'+esc(e.uid)+'" aria-expanded="'+open+'" aria-label="Edit '+esc(u.name)+'">'+
    '<img src="'+ART.mini(u.id)+'" alt="" loading="lazy"><span class="ut-tl"><span class="chip slot" style="background:var(--panel)">'+esc(u.army_slot)+'</span>'+(u.unique?'<span class="chip uniq" style="background:var(--panel)">Unique</span>':'')+'</span>'+
    '<span class="ut-tr mincost">'+fmt(cost.total)+'</span></button><div class="ut-body"><div class="ut-name">'+esc(u.name)+'</div>'+
    '<div class="ut-meta">×'+e.models+' models · Supply '+cost.supply+(cost.upgrades?' · +'+cost.upgrades+' upgrades':'')+'</div>'+
    (e.upgrades.length?'<div class="ut-ups">'+e.upgrades.map(function(n){ var m = e.specialists && e.specialists[n]; return '<span>'+esc(n)+(m?' · M'+m:'')+'</span>'; }).join("")+'</div>':'')+
    (errs?'<div class="ut-err">'+errs.length+' issue'+(errs.length>1?'s':'')+' — open to fix</div>':'')+'</div>'+
    '<div class="ut-act"><button class="btn sm'+(open?' primary':'')+'" data-a="tile-open" data-v="'+esc(e.uid)+'">'+(open?'Close':'Edit')+'</button><button class="btn ghost sm" data-a="card" data-v="'+esc(u.id)+'" data-e="'+esc(e.uid)+'">Card</button><span class="grow"></span>'+
    '<button class="btn ghost sm danger" data-a="rm-unit" data-e="'+esc(e.uid)+'" aria-label="Remove '+esc(u.name)+'">Remove</button></div></div>';
}
function renderUnits(){
  var r = S.cur, el = $("sec-units"); if(!el) return;
  var t = C.totals(r), lim = C.limits(r), v = C.validate(r);
  var h = secHead(3, "Muster units", '<b>'+fmt(t.minerals)+'</b> / '+fmt(lim.minerals)+' Minerals · Part 9.1.6–9.1.7') + '<div class="sbody">';
  if(!C.faction(r)){ el.innerHTML = h+'<p class="muted" style="margin:0">Choose a Faction Card first.</p></div>'; return; }
  var errBy = {}; v.forEach(function(x){ if(x.level==="error" && x.target && x.target.indexOf("u_")===0) (errBy[x.target]=errBy[x.target]||[]).push(x.msg); });
  var tiles = P.layout==="tiles";
  if(!r.units.length) h += '<div class="empty">No units yet. Add units that fit your Army Slots.</div>';
  if(tiles){
    // tiles flow in rows; the open tile's editor spans the full row directly after the row it sits in
    h += '<div class="utiles" id="utiles">';
    r.units.forEach(function(e){ var u = C.units[e.unitId]; if(!u) return; h += unitTileHTML(e, u, C.entryCost(e), errBy[e.uid]); });
    var oe = S.tileOpen && entryById(S.tileOpen), ou = oe && C.units[oe.unitId];
    if(ou) h += '<div class="ut-editor" id="ut-editor"><article class="entry">'+entryHeadHTML(oe, ou, C.entryCost(oe), '<button class="btn ghost sm" data-a="tile-open" data-v="'+esc(oe.uid)+'">Close</button>')+entryBodyHTML(oe, ou, errBy[oe.uid])+'</article></div>';
    h += '</div>';
  } else {
    h += '<div class="entries">';
    r.units.forEach(function(e){
      var u = C.units[e.unitId]; if(!u) return;
      var cost = C.entryCost(e), collapsed = S.open["c:"+e.uid];
      h += '<article class="entry'+(errBy[e.uid]?' has-err':'')+'" id="'+esc(e.uid)+'">'+entryHeadHTML(e, u, cost, '<button class="btn ghost sm" data-a="collapse" data-v="'+esc(e.uid)+'" aria-expanded="'+(!collapsed)+'">'+(collapsed?'Edit':'Fold')+'</button>');
      if(!collapsed) h += entryBodyHTML(e, u, errBy[e.uid]);
      h += '</article>';
    });
    h += '</div>';
  }
  h += '<div style="margin-top:12px">';
  if(!S.picker) h += '<button class="btn primary" data-a="picker">Add unit</button>';
  else {
    var sl = C.slots(r), elig = C.eligibleUnits(r), taken = {};
    r.units.forEach(function(e){ taken[e.unitId]=true; });
    h += '<div class="picker"><div style="display:flex;align-items:center;gap:8px;margin-bottom:8px"><b>Add a unit</b><span class="faint">'+esc(C.faction(r).name)+' can field these</span><button class="btn ghost sm" style="margin-left:auto" data-a="picker">Close</button></div>';
    SLOT_TYPES.forEach(function(s){
      var us = elig.filter(function(u){return u.army_slot===s;}); if(!us.length) return;
      var free = sl.available[s]-sl.used[s];
      h += '<div class="pgroup"><div class="subhead" style="margin-top:0">'+esc(s)+'<span class="aside" style="'+(free<0?'color:var(--err)':'')+'">'+free+' of '+sl.available[s]+' slots free</span></div>'+(tiles?'<div class="utiles">':'<div class="rows">');
      us.forEach(function(u){
        var blocked = u.unique && taken[u.id], minSup = Math.min.apply(null, u.compositions.map(function(c){return c.supply;}));
        var sizes = u.compositions.map(function(c){return c.models+(c.models>1?" models":" model")+" (Supply "+c.supply+")";}).join(" / ");
        var addBtn = '<button class="btn sm primary" data-a="add-unit" data-v="'+esc(u.id)+'"'+(blocked?' disabled title="Unique: already on this roster"':'')+'>Add</button>';
        if(tiles){
          h += '<div class="utile"><button class="ut-img" data-a="card" data-v="'+esc(u.id)+'" aria-label="View '+esc(u.name)+' card"><img src="'+ART.mini(u.id)+'" alt="" loading="lazy"><span class="ut-tl">'+(u.unique?'<span class="chip uniq" style="background:var(--panel)">Unique</span>':'')+'</span><span class="ut-tr mincost">'+costRange(u)+'</span></button>'+
            '<div class="ut-body"><div class="ut-name">'+esc(u.name)+'</div><div class="ut-meta">'+esc(sizes)+'</div>'+(minSup>free?'<span class="pill warn" style="align-self:flex-start">needs '+minSup+' '+esc(s)+'</span>':'')+'</div>'+
            '<div class="ut-act">'+addBtn+'<span class="grow"></span><button class="btn ghost sm" data-a="card" data-v="'+esc(u.id)+'">Card</button></div></div>';
        } else {
          h += '<div class="row"><button class="thumb mini" data-a="card" data-v="'+esc(u.id)+'" aria-label="View '+esc(u.name)+' card">'+miniImg(u.id)+'</button><div><div class="r-name">'+esc(u.name)+(u.unique?' <span class="chip uniq">Unique</span>':'')+'</div>'+
            '<div class="r-meta"><span class="mincost">'+costRange(u)+'</span><span>· '+esc(sizes)+'</span>'+(minSup>free?'<span class="pill warn">needs '+minSup+' '+esc(s)+'</span>':'')+'</div></div>'+
            '<div class="r-ctl"><button class="btn ghost sm" data-a="card" data-v="'+esc(u.id)+'">Card</button>'+addBtn+'</div></div>';
        }
      });
      h += '</div></div>';
    });
    h += '</div>';
  }
  el.innerHTML = h + summonedHTML(r) + '</div></div>';
  if(tiles) placeEditor();
}
/* Move the open tile's editor to just after the last tile in the same visual row. */
function placeEditor(){
  var grid = $("utiles"), ed = $("ut-editor"); if(!grid || !ed || !S.tileOpen) return;
  var open = $(S.tileOpen); if(!open) return;
  var top = open.offsetTop, tiles = Array.prototype.filter.call(grid.children, function(n){ return n.classList.contains("utile"); });
  var last = open;
  tiles.forEach(function(t){ if(t.offsetTop===top) last = t; });
  if(last.nextSibling !== ed) grid.insertBefore(ed, last.nextSibling);
}
window.addEventListener("resize", function(){ if(P.layout==="tiles") placeEditor(); });

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
    var on = r.deployments.indexOf(d.id)!==-1, full = !on && r.deployments.length>=2, other = side==="skirmish"?"standard":"skirmish";
    h += '<div class="tile dtile" role="checkbox" tabindex="0" data-a="deploy" data-v="'+esc(d.id)+'" aria-checked="'+on+'"'+(full?' aria-disabled="true" style="opacity:.55"':'')+'>'+
      '<span class="d-map"><img src="'+ART.deploy(d.id, side)+'" alt="'+esc(d[side])+' deployment map" loading="lazy"></span>'+
      '<span class="tcol"><span class="t-name">'+esc(d[side])+(on?' <span class="chip slot">Chosen</span>':'')+'</span><span class="t-sub">'+(other==="standard"?"Standard side: ":"Skirmish side: ")+esc(d[other])+'</span>'+
      '<button class="btn sm" style="align-self:flex-start" data-a="dmap" data-v="'+esc(d.id)+'">View map</button></span></div>';
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
  {id:"ref", ext:"html", name:"Reference sheet", suffix:"-reference", gloss:true, desc:"Every unit's stats, fielded weapon profiles, ability names and taken upgrades in compact tables, sized for one or two A4 pages. Identical units are merged (2×). Rules text stays on the cards."},
  {id:"text", ext:"txt", name:"Plain text", desc:"The full roster as plain text: units, loadouts, cards and totals."},
  {id:"compact", ext:"txt", name:"Compact list", suffix:"-list", desc:"A short list for messages and forum posts, one line per unit."},
  {id:"md", ext:"md", name:"Markdown", desc:"Tables for Discord, Reddit, GitHub or notes apps."},
  {id:"csv", ext:"csv", name:"Spreadsheet", desc:"One row per unit and card with the cost breakdown. Opens in Excel, Numbers or Google Sheets."},
  {id:"json", ext:"json", name:"Roster file", desc:"Brings this roster back into SurgeCraft later through Import, on any device."},
  {id:"zip", ext:"zip", name:"Everything", desc:"Every format above in one .zip file."}
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
    case "ref": return Promise.resolve(X.referenceDoc(C, r, {glossary: S.exp.gloss, kw: KW}));
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
    if(f.gloss) h += '<label class="fo"><input type="checkbox" data-a="exp-gloss"'+(S.exp.gloss?' checked':'')+'> Add a keyword glossary at the end</label>';
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
function openDeployModal(id){
  var d = C.deployments[id]; if(!d) return;
  var side = S.cur ? C.limits(S.cur).scale.side : "standard", other = side==="standard"?"skirmish":"standard";
  var chosen = S.cur && S.cur.deployments.indexOf(id)!==-1;
  openModal('<div class="dmodal"><div class="dm-head"><h2>'+esc(d[side])+'</h2><span class="faint">'+(chosen?'On this roster · ':'')+'Deployment Card, '+(side==="standard"?"Standard Engagement side":"Skirmish Level side")+'</span></div>'+
    Render.deploymentCardHTML(d, side)+
    '<details class="dm-other"><summary>Other side of this card: '+esc(d[other])+'</summary>'+Render.deploymentCardHTML(d, other)+'</details></div>');
}
function closeModal(){ $("modal-root").innerHTML = ""; }

/* ------------ keyword reference ------------
   Definitions are the rulebook's own text (Full Rules, Part 11), shipped in keywords.js.
   Keywords printed in card text become tappable wherever card text is shown in the app;
   exported files are left as plain text. */
var KW = window.Keywords || null;
var KW_SCOPE = ".sc-card, .u-desc, .sc-mission, .kw-body";
var KW_SKIP = ".sc-abn, .sc-wn, .sc-for, .sc-uptag, .sc-pill, .sc-title, .sc-phtab, .sc-upband, h1, h2, h3, h4, button, summary, textarea, input, select, script, style";
function kwBodyHTML(k){
  var h = "", list = false;
  k.body.forEach(function(b){
    if(b[0]==="li"){ if(!list){ h += "<ul>"; list = true; } h += "<li>"+Render.richText(b[1])+"</li>"; }
    else { if(list){ h += "</ul>"; list = false; } h += "<p>"+Render.richText(b[1])+"</p>"; }
  });
  if(list) h += "</ul>";
  return '<div class="kw-body" data-kwself="'+esc(k.id)+'">'+h+'</div>';
}
function linkKeywords(root){
  if(!KW || !root || root.nodeType!==1) return;
  var scopes = root.matches(KW_SCOPE) ? [root] : [];
  scopes = scopes.concat([].slice.call(root.querySelectorAll(KW_SCOPE)));
  scopes.forEach(function(sc){
    var w = document.createTreeWalker(sc, NodeFilter.SHOW_TEXT, null), nodes = [], n;
    while((n = w.nextNode())) nodes.push(n);
    nodes.forEach(function(tn){
      var p = tn.parentElement; if(!p || !tn.parentNode || p.closest(KW_SKIP)) return;
      var hits = KW.find(tn.nodeValue); if(!hits.length) return;
      var self = p.closest("[data-kwself]"); self = self ? self.getAttribute("data-kwself") : null;
      hits = hits.filter(function(x){ return x.id!==self; }); if(!hits.length) return;
      var s = tn.nodeValue, pos = 0, frag = document.createDocumentFragment();
      hits.forEach(function(x){
        if(x.start>pos) frag.appendChild(document.createTextNode(s.slice(pos, x.start)));
        var b = document.createElement("button");
        b.type = "button"; b.className = "kw"; b.setAttribute("data-a", "kw"); b.setAttribute("data-v", x.id);
        b.setAttribute("aria-haspopup", "dialog"); b.textContent = s.slice(x.start, x.end);
        frag.appendChild(b); pos = x.end;
      });
      if(pos<s.length) frag.appendChild(document.createTextNode(s.slice(pos)));
      tn.parentNode.replaceChild(frag, tn);
    });
  });
}
var kwQueue = [], kwRaf = 0;
if(KW && window.MutationObserver){
  new MutationObserver(function(muts){
    muts.forEach(function(m){ m.addedNodes.forEach(function(nd){ if(nd.nodeType===1 && !(nd.classList && nd.classList.contains("kw"))) kwQueue.push(nd); }); });
    if(kwQueue.length && !kwRaf) kwRaf = requestAnimationFrame(function(){ var q = kwQueue; kwQueue = []; kwRaf = 0; q.forEach(function(nd){ if(nd.isConnected) linkKeywords(nd); }); });
  }).observe(document.body, {childList:true, subtree:true});
}
var kwAnchor = null;
function closeKwPop(){ var p = $("kw-pop"); if(p) p.remove(); if(kwAnchor && kwAnchor.isConnected) kwAnchor.focus({preventScroll:true}); kwAnchor = null; }
function openKwPop(id, anchor){
  var k = KW && KW.byId[id]; if(!k) return;
  var old = $("kw-pop"); if(old) old.remove();
  var p = document.createElement("div");
  p.id = "kw-pop"; p.className = "kwpop"; p.setAttribute("role", "dialog"); p.setAttribute("aria-label", k.term+" keyword");
  p.innerHTML = '<div class="kp-h"><h3>'+esc(k.head)+'</h3><button class="kp-x" data-a="kw-close" aria-label="Close">×</button></div>'+kwBodyHTML(k)+
    '<div class="kp-f"><span>Full Rules · Part 11</span><button class="btn ghost sm" data-a="kw-all" data-v="'+esc(k.id)+'">All keywords</button></div>';
  document.body.appendChild(p);
  kwAnchor = anchor || null; kwScrollY = window.scrollY;
  if(anchor && window.innerWidth>680){
    var r = anchor.getBoundingClientRect(), vw = window.innerWidth, vh = window.innerHeight, pw = p.offsetWidth, ph = p.offsetHeight;
    var left = Math.min(Math.max(12, r.left), vw - pw - 12), top = r.bottom + 6;
    if(top + ph > vh - 12) top = Math.max(12, r.top - ph - 6);
    p.style.left = left+"px"; p.style.top = top+"px";
  }
  var x = p.querySelector(".kp-x"); if(x) x.focus({preventScroll:true});
}
function openKwRef(focusId){
  if(!KW) return;
  var h = '<div class="kwref"><div class="kr-head"><h2>Keyword reference</h2><p>The '+KW.list.length+' keywords printed on the unit, tactical, faction and creep cards. Definitions are quoted from the Full Rules, Part 11: Keyword Glossary and Definitions.</p></div>'+
    '<div class="kr-tools"><input class="input" id="kw-q" type="search" placeholder="Search keywords or rules text" aria-label="Search keywords" autocomplete="off"><span class="faint" id="kw-count">'+KW.list.length+' keywords</span></div><div class="kr-list" id="kw-list">';
  KW.list.forEach(function(k){ h += '<details class="kr-item" id="kr-'+esc(k.id)+'" data-kwsearch="'+esc((k.head+" "+k.body.map(function(b){return b[1];}).join(" ")).toLowerCase())+'"><summary>'+esc(k.head)+'</summary>'+kwBodyHTML(k)+'</details>'; });
  h += '<div class="kr-empty" id="kw-empty" hidden>No keyword matches that search.</div></div></div>';
  openModal(h);
  if(focusId){ var it = $("kr-"+focusId); if(it){ it.open = true; it.classList.add("flash"); it.scrollIntoView({block:"start"}); } }
}
function filterKw(q){
  q = (q||"").trim().toLowerCase(); var n = 0;
  document.querySelectorAll("#kw-list .kr-item").forEach(function(it){
    var hit = !q || it.getAttribute("data-kwsearch").indexOf(q)!==-1;
    it.hidden = !hit; if(hit) n++;
    var head = it.querySelector("summary").textContent.toLowerCase();
    it.open = !!q && hit && head.indexOf(q)!==-1;
  });
  var c = $("kw-count"); if(c) c.textContent = q ? n+" of "+KW.list.length : KW.list.length+" keywords";
  var e = $("kw-empty"); if(e) e.hidden = n>0;
}
var kwScrollY = 0;
window.addEventListener("scroll", function(){ if($("kw-pop") && window.innerWidth>680 && Math.abs(window.scrollY-kwScrollY)>60) closeKwPop(); }, {passive:true});
window.addEventListener("resize", function(){ if($("kw-pop")) closeKwPop(); });

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

/* Summoned Units this roster can bring (Part 9.1.9): named by an ability on its faction card, tactical cards or units.
   They cost nothing and take no Army Slots, so they are shown for reference only. */
function summonSources(r, u){
  var short = u.name.replace(/\s*\(.*\)$/, ""), out = [];
  function scan(owner, list){ list.forEach(function(a){ if(a.text && a.text.indexOf(short)!==-1) out.push(a.name+" ("+owner+")"); }); }
  var f = C.faction(r); if(f) scan(f.name, f.abilities);
  Object.keys(r.tactical||{}).forEach(function(id){ var c = C.cards[id]; if(c) scan(c.name, c.abilities); });
  var seen = {};
  r.units.forEach(function(e){ var x = C.units[e.unitId]; if(x && !seen[x.id]){ seen[x.id] = true; scan(x.name, x.abilities.concat(x.upgrades)); } });
  return out;
}
function summonedHTML(r){
  var list = Render.summonedFor(C, r); if(!list.length) return "";
  var h = '<div class="subhead">Summoned Units <span class="aside">No Mineral cost, no Army Slots · Part 9.1.9</span></div><div class="rows">';
  list.forEach(function(u){
    h += '<div class="row"><button class="thumb mini" data-a="card" data-v="'+esc(u.id)+'" aria-label="View '+esc(u.name)+' card">'+miniImg(u.id)+'</button><div><div class="r-name">'+esc(u.name)+'</div><div class="r-meta"><span>Brought on by '+esc(summonSources(r, u).join("; ")||"a card ability")+'</span></div></div>'+
      '<div class="r-ctl"><button class="btn ghost sm" data-a="card" data-v="'+esc(u.id)+'">Card</button></div></div>';
  });
  return h+'</div>';
}

/* ------------ roster view (View tab) ------------
   Read-only view of the finished roster. One line per card or unit; tap to unfold the card in place.
   Unit cards are shown as fielded: purchased upgrades merged in, the rest left out. Keywords stay tappable. */
var VS = { open:{} };
function vItem(key, thumb, title, meta, right, body){
  var open = !!VS.open[key];
  return '<div class="vitem'+(open?' open':'')+'" id="v-'+esc(key.replace(/[^a-z0-9_-]/gi,"_"))+'"><button class="vrow" data-a="v-open" data-v="'+esc(key)+'" aria-expanded="'+open+'">'+thumb+
    '<span class="v-t"><span class="v-name">'+title+'</span><span class="v-meta">'+meta+'</span></span><span class="v-r">'+(right||'')+'</span><span class="v-chev" aria-hidden="true"></span></button>'+
    (open ? '<div class="v-body">'+body()+'</div>' : '')+'</div>';
}
function vKeys(r){
  var keys = [], f = C.faction(r), side = C.limits(r).scale.side;
  if(f) keys.push("c:"+f.id);
  if(r.creepId && C.cards[r.creepId]) keys.push("c:"+r.creepId);
  Object.keys(r.tactical||{}).forEach(function(id){ if(C.cards[id]) keys.push("c:"+id); });
  r.units.forEach(function(e){ keys.push("u:"+e.uid); });
  Render.summonedFor(C, r).forEach(function(u){ keys.push("s:"+u.id); });
  r.missions.forEach(function(id){ keys.push("m:"+id); });
  r.deployments.forEach(function(id){ keys.push("d:"+id); });
  return keys;
}
function renderView(){
  var el = $("view"); if(!el) return;
  var r = S.cur, f = C.faction(r), t = C.totals(r), lim = C.limits(r), side = lim.scale.side;
  var errs = C.validate(r).filter(function(x){return x.level==="error";}), keys = vKeys(r), allOpen = keys.length && keys.every(function(k){ return VS.open[k]; });
  var h = '<section class="section"><header><span class="step">ROSTER</span><h2>'+esc(r.name||"Untitled roster")+'</h2><span class="aside">'+(errs.length?'<b style="color:#F2A39B">'+errs.length+' rules issue'+(errs.length>1?'s':'')+'</b>':'<b>Legal</b>')+'</span></header><div class="sbody">';
  h += '<div class="vsum"><div><span class="lbl-s">Faction</span><b>'+(f?esc(f.name):"None chosen")+'</b></div><div><span class="lbl-s">Scale</span><b>'+esc(lim.scale.name)+'</b></div><div><span class="lbl-s">Minerals</span><b class="num">'+fmt(t.minerals)+' / '+fmt(lim.minerals)+'</b></div><div><span class="lbl-s">Vespene Gas</span><b class="num">'+fmt(t.gas)+' / '+fmt(lim.gas)+'</b></div><div><span class="lbl-s">Total Supply</span><b class="num">'+t.supply+'</b></div>'+(r.player?'<div><span class="lbl-s">Player</span><b>'+esc(r.player)+'</b></div>':'')+'</div>';
  h += '<div class="vtools"><span class="faint">Tap a line to open its card. Tap an underlined keyword for its definition.</span><span class="grow"></span><button class="btn sm" data-a="v-all" data-v="'+(allOpen?"close":"open")+'"'+(keys.length?'':' disabled')+'>'+(allOpen?"Close all":"Open all")+'</button></div>';
  if(!f && !r.units.length) return el.innerHTML = h+'<div class="empty">Nothing on this roster yet. Choose a faction and add units on the Build tab.</div></div></section>';
  // cards
  var cards = [];
  if(f) cards.push([f, 1]);
  if(r.creepId && C.cards[r.creepId]) cards.push([C.cards[r.creepId], 1]);
  Object.keys(r.tactical||{}).forEach(function(id){ if(C.cards[id]) cards.push([C.cards[id], r.tactical[id]]); });
  if(cards.length){
    h += '<div class="subhead">Faction and Tactical Cards <span class="aside">'+cards.length+'</span></div><div class="vlist" data-race="'+esc(r.race||"")+'">';
    cards.forEach(function(x){
      var c = x[0], n = x[1];
      h += vItem("c:"+c.id, '<span class="thumb art-bg"><img src="'+ART.card(c.id)+'" alt="" loading="lazy"></span>', esc(c.name)+(n>1?' <span class="faint">×'+n+'</span>':''),
        '<span class="chip">'+esc(c.kind)+'</span>'+slotChips(c.slots)+(c.resource && c.resource.value!=null?'<span class="chip">'+c.resource.value+' '+esc(c.resource.type)+'</span>':'')+'<span class="faint">'+c.abilities.map(function(a){return esc(a.name);}).join(" · ")+'</span>',
        c.kind==="Faction"?'':'<span class="gascost">'+(c.gas_cost||0)*n+'</span>', function(){ return Render.tacCardHTML(C, c, null, n); });
    });
    h += '</div>';
  }
  // units
  h += '<div class="subhead">Units <span class="aside">'+r.units.length+'</span></div>';
  if(!r.units.length) h += '<div class="empty">No units yet.</div>';
  else {
    h += '<div class="vlist">';
    r.units.forEach(function(e){
      var u = C.units[e.unitId]; if(!u) return;
      var cost = C.entryCost(e), lo = C.loadout(e), ups = [];
      e.upgrades.forEach(function(n){ var up = C.upgradeDef(e, n); if(!up) return; ups.push('<span class="chip slot">'+(up.specialist?'Model '+esc(e.specialists[n]||"?")+': ':'')+esc(n)+'</span>'); });
      h += vItem("u:"+e.uid, '<span class="thumb mini">'+miniImg(u.id)+'</span>', esc(u.name)+' <span class="faint">×'+e.models+'</span>',
        '<span class="chip">'+esc(u.army_slot||"")+'</span><span class="chip">Supply '+cost.supply+'</span>'+(ups.length?ups.join(""):'<span class="faint">No upgrades</span>'),
        '<span class="mincost">'+cost.total+'</span>', function(){ return Render.unitCardHTML(C, u, e, null, {fielded:true}); });
    });
    h += '</div>';
  }
  // summoned units (9.1.9)
  var sums = Render.summonedFor(C, r);
  if(sums.length){
    h += '<div class="subhead">Summoned Units <span class="aside">No Mineral cost, no Army Slots · Part 9.1.9</span></div><div class="vlist">';
    sums.forEach(function(u){
      h += vItem("s:"+u.id, '<span class="thumb mini">'+miniImg(u.id)+'</span>', esc(u.name), '<span class="chip">Summoned</span><span class="faint">Brought on by '+esc(summonSources(r, u).join("; ")||"a card ability")+'</span>', '', function(){ return Render.unitCardHTML(C, u, null); });
    });
    h += '</div>';
  }
  // scenario
  if(r.missions.length || r.deployments.length){
    h += '<div class="subhead">Mission and Deployment Cards</div><div class="vlist">';
    r.missions.forEach(function(id){ var m = C.missions[id]; if(!m) return; var s = m[side];
      h += vItem("m:"+id, '<span class="v-tag">M</span>', esc(m.name), '<span class="chip">Mission</span><span class="faint">'+s.deploy_supply+' Supply, +'+s.supply_per_round+' per Round, '+s.game_length+' Rounds</span>', '', function(){ return Render.missionCardHTML(m, side); }); });
    r.deployments.forEach(function(id){ var d = C.deployments[id]; if(!d) return;
      h += vItem("d:"+id, '<span class="v-tag">D</span>', esc(d[side]), '<span class="chip">Deployment</span><span class="faint">'+esc(lim.scale.battlefield)+'</span>', '', function(){ return Render.deploymentCardHTML(d, side); }); });
    h += '</div>';
  }
  if(errs.length) h += '<div class="checks" style="margin-top:14px">'+errs.map(function(x){ return '<div class="check error"><span class="mk"></span><span>'+esc(x.msg)+' <span class="ref">'+esc(x.ref)+'</span></span></div>'; }).join("")+'</div>';
  el.innerHTML = h+'</div></section>';
}
function vClick(a, v){
  if(a==="v-open"){ VS.open[v] = !VS.open[v]; renderView(); if(VS.open[v]){ var n = $("v-"+v.replace(/[^a-z0-9_-]/gi,"_")); if(n) n.scrollIntoView({block:"start"}); } return; }
  if(a==="v-all"){ var keys = vKeys(S.cur); VS.open = {}; if(v==="open") keys.forEach(function(k){ VS.open[k] = true; }); renderView(); }
}

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
  if(b.missionId==="fire-in-the-sky" && p===2) h += '<div class="subhead">Sabotage Levels <span class="aside">Mission Card</span></div><div class="binputs">'+bLevelsHTML(b)+'</div><div class="faint" style="font-size:12px;margin-top:4px">Each Sabotage Action, yours or the opponent\'s, raises or lowers one Controlled Marker by 1 (minimum 1, maximum 3).</div>';
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
  h += '<div class="panel" id="b-score"><h3>Score</h3><div class="pb"><table class="bvp"><thead><tr><th></th>';
  for(var n=1;n<=m.game_length;n++) h += '<th'+(n===b.round?' class="cur"':'')+'>R'+n+'</th>';
  h += '<th>Total</th></tr></thead><tbody>';
  ["me","opp"].forEach(function(w){ h += '<tr><th>'+(w==="me"?"You":"Opp.")+'</th>'; for(var n=1;n<=m.game_length;n++) h += '<td'+(n===b.round?' class="cur"':'')+'>'+(b.vp[w][n-1]==null?'':b.vp[w][n-1])+'</td>'; h += '<td><b>'+t[w]+'</b></td></tr>'; });
  h += '</tbody></table>'+(b.over||b.phase===4?'':'<div style="margin-top:10px">'+bStepper("Enemy Supply destroyed this Round", b.si.enemyLost, 'data-a="b-inp" data-v="enemyLost:-1"', 'data-a="b-inp" data-v="enemyLost:1"')+'</div>')+'</div></div>';
  if(b.phase!==4 || b.scored || b.over) h += '<div class="panel" id="b-markers"><h3>Mission Markers</h3><div class="pb">'+bMarkersHTML(b)+'</div></div>';
  h += '<div class="panel" id="b-cards"><h3>Cards · '+res.ready+' of '+res.total+' '+esc(res.type)+' Ready</h3><div class="pb bcards">';
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
  var jump = '<nav class="bjump" aria-label="Jump to"><span class="faint">Jump to</span><button class="btn sm" data-a="goto" data-v="b-units">Units</button><button class="btn sm" data-a="goto" data-v="b-markers">Markers</button><button class="btn sm" data-a="goto" data-v="b-cards">Cards</button><button class="btn sm" data-a="goto" data-v="b-score">Score</button></nav>';
  var h = '<div class="layout"><div class="main">'+bPhaseHTML(b, r)+jump+'<section class="section" id="b-units"><header><span class="step">ARMY</span><h2>Units</h2><span class="aside">'+groups.fld.length+' on the battlefield · '+groups.res.length+' in Reserves</span></header><div class="sbody">';
  [["fld","On the battlefield"],["res","Reserves"],["dead","Destroyed"]].forEach(function(g){
    if(!groups[g[0]].length && g[0]!=="fld") return;
    h += '<div class="subhead"'+(g[0]==="fld"?' style="margin-top:0"':'')+'>'+g[1]+' <span class="aside">'+groups[g[0]].length+'</span></div>';
    h += groups[g[0]].length ? '<div class="bunits">'+groups[g[0]].map(function(i){ return bUnitHTML(i, b, r); }).join("")+'</div>' : '<div class="empty">No Units on the battlefield yet. Deploy from Reserves in the Movement Phase.</div>';
  });
  var sm = Render.summonedFor(C, r);
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
    case "b-lvl": var lq = v.split(":"); bMut(function(){ BT.setLevel(C, b, Number(lq[0]), Number(lq[1])); }); return true;
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

/* ------------ events ------------ */
document.addEventListener("click", function(ev){
  var pop = $("kw-pop");
  if(pop && !pop.contains(ev.target) && !ev.target.closest(".kw")) closeKwPop();
  var t = ev.target.closest("[data-a]"); if(!t) return;
  var a = t.getAttribute("data-a"), v = t.getAttribute("data-v"), eu = t.getAttribute("data-e"), r = S.cur;
  if(a==="kw"){ ev.preventDefault(); ev.stopPropagation(); if(pop && pop.getAttribute("aria-label")===(KW.byId[v]||{}).term+" keyword" && kwAnchor===t){ closeKwPop(); return; } openKwPop(v, t); return; }
  if(a==="kw-close"){ closeKwPop(); return; }
  if(a==="kw-all"){ var fromPop = !!(pop && pop.contains(t)); if(fromPop){ var pp=$("kw-pop"); if(pp) pp.remove(); kwAnchor=null; } openKwRef(v); return; }
  if(a==="close-modal"){ if(ev.target===t || t.classList.contains("mclose")) closeModal(); return; }
  if(t.hasAttribute("disabled") || t.getAttribute("aria-disabled")==="true") return;
  if(a.indexOf("v-")===0){ vClick(a, v); return; }
  if(a.indexOf("b-")===0){ if(t.tagName==="INPUT") return; bClick(a, v, eu, t); return; }
  switch(a){
    case "home": S.view="list"; S.cur=null; S.notice=null; S.confirmDel=null; render(); window.scrollTo(0,0); break;
    case "new": newRoster(); break;
    case "example": openExample(false, v); break;
    case "mode": P.mode = v; savePrefs(); applyMode(); break;
    case "layout": P.layout = v; savePrefs(); render(); break;
    case "tile-open": S.tileOpen = (S.tileOpen===v ? null : v); renderUnits(); var ed=$("ut-editor"); if(ed) ed.scrollIntoView({behavior:"smooth", block:"nearest"}); break;
    case "open": openRoster(t.getAttribute("data-id")); break;
    case "open-export": openRoster(t.getAttribute("data-id")); S.tab="export"; render(); break;
    case "dup": var src = S.rosters.filter(function(x){return x.id===t.getAttribute("data-id");})[0]; if(src){ var d = clone(src); d.id="r_"+RosterCore.uid(); d.name=(src.name||"Roster")+" (copy)"; d.createdAt=Date.now(); delete d.battle; Store.queue(d); render(); } break;
    case "del": S.confirmDel = t.getAttribute("data-id"); render(); break;
    case "del-no": S.confirmDel = null; render(); break;
    case "del-yes": Store.remove(t.getAttribute("data-id")); S.confirmDel=null; render(); break;
    case "toggle-import": S.importOpen=!S.importOpen; render(); break;
    case "import-code": importText($("imp-code").value); break;
    case "dismiss": S.notice=null; render(); break;
    case "reload": location.reload(); break;
    case "install": if(APP.prompt){ var ev = APP.prompt; APP.prompt = null; ev.prompt(); (ev.userChoice||Promise.resolve()).then(function(){ render(); }); } break;
    case "tab": S.tab=v; S.exp.preview=null; S.exp.copyText=null; render(); window.scrollTo(0,0); break;
    case "scale": var sv = String(v).split(":"); r.scale=sv[0]; if(sv[1]) r.minerals=Number(sv[1]); commit(); break;
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
    case "add-unit": var e = C.newEntry(v); r.units.push(e); if(P.layout==="tiles") S.tileOpen = e.uid; commit(); var node=$(e.uid); if(node) node.scrollIntoView({block:"nearest"}); break;
    case "rm-unit": r.units = r.units.filter(function(x){return x.uid!==eu;}); if(S.tileOpen===eu) S.tileOpen=null; commit(); break;
    case "dup-unit": var e0 = entryById(eu); if(e0){ var e1 = clone(e0); e1.uid="u_"+RosterCore.uid(); r.units.splice(r.units.indexOf(e0)+1,0,e1); commit(); } break;
    case "collapse": S.open["c:"+v]=!S.open["c:"+v]; render(); break;
    case "models": var e2 = entryById(eu); if(e2){ e2.models = Number(v); commit(); } break;
    case "card": openModal(Render.unitCardHTML(C, C.units[v], eu ? entryById(eu) : null)); break;
    case "dmap": openDeployModal(v); break;
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
  if(ev.key==="Escape" && $("kw-pop")){ closeKwPop(); return; }
  if(ev.key==="Escape" && $("modal-root").innerHTML){ closeModal(); return; }
  if((ev.key==="Enter"||ev.key===" ") && ev.target.matches && ev.target.matches('[role="radio"][data-a],[role="checkbox"][data-a]')){ ev.preventDefault(); ev.target.click(); }
});
document.addEventListener("change", function(ev){
  var t = ev.target, a = t.getAttribute && t.getAttribute("data-a"), r = S.cur;
  if(t.id==="imp-file" && t.files && t.files[0]){ var fr = new FileReader(); fr.onload = function(){ importText(String(fr.result)); }; fr.readAsText(t.files[0]); return; }
  if(a==="b-wipe" && r && r.battle){ bMut(function(b){ b.si.oppWiped = t.checked; }); return; }
  if(a==="exp-gloss"){ S.exp.gloss = t.checked; S.exp.preview=null; renderExport(); return; }
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
  var t = ev.target, r = S.cur;
  if(t.id==="kw-q"){ filterKw(t.value); return; }
  if(!r) return;
  if(t.id==="f-name"){ r.name = t.value; commit({quiet:true}); }
  else if(t.id==="f-player"){ r.player = t.value; commit({quiet:true}); }
  else if(t.id==="f-go"){ var n = Number(t.value); if(n>2000){ r.grandMinerals = Math.floor(n); clearTimeout(inputTimer); inputTimer=setTimeout(function(){ commit({quiet:true}); renderSetup(); renderCards(); renderUnits(); },300); } }
  else if(t.id==="exp-base"){ S.exp.base = t.value; clearTimeout(baseTimer); baseTimer = setTimeout(function(){
    document.querySelectorAll(".fmt .fname").forEach(function(n, i){ n.textContent = fileName(FORMATS[i]); }); }, 150); }
});

/* ------------ boot ------------ */
applyMode();
render();
Store.init();
if(STANDALONE){
  // Outside claude.ai: save with the browser's own download.
  S.downloads = { save: function(req){
    return new Promise(function(res, rej){
      try{
        var blob = req.data instanceof Blob ? req.data : new Blob([req.data], {type: MIME[(req.filename.split(".").pop()||"").toLowerCase()] || "application/octet-stream"});
        var url = URL.createObjectURL(blob), a = document.createElement("a");
        a.href = url; a.download = req.filename; a.rel = "noopener"; document.body.appendChild(a); a.click();
        setTimeout(function(){ URL.revokeObjectURL(url); a.remove(); }, 4000);
        res({status:"saved"});
      }catch(e){ rej({code:"unavailable"}); }
    });
  } };
} else if(window.claude && typeof window.claude.use==="function"){
  window.claude.use("downloads").then(function(d){ S.downloads = d || null; if(S.view==="build" && S.tab==="export") renderExport(); }).catch(function(){});
}
window.__muster = {S:S, C:C, build:build, FORMATS:FORMATS};
})();
