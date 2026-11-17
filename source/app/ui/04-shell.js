/* ------------ top-level render ------------ */
function render(){
  var race = (S.view==="build" && S.cur && S.cur.race) || "";
  if(race) document.body.setAttribute("data-skin", race); else document.body.removeAttribute("data-skin");
  applyMode();
  $("brand-emb").src = ART.race(race || "Terran");
  renderCrumb(); renderSaveState();
  applyHdr();
  document.body.classList.remove("has-bdock");
  if(S.view==="list") renderList(); else renderBuild();
  syncWake();
}
function applyHdr(){ var inRoster = S.view==="build", off = inRoster && !!P.hdrOff, b = $("hdr-tgl"); document.body.classList.toggle("in-roster", inRoster); document.body.classList.toggle("hdr-off", off);
  if(b){ b.setAttribute("aria-label", off ? "Show header" : "Hide header"); b.title = off ? "Show the header" : "Hide the header"; b.setAttribute("aria-expanded", String(!off)); } }
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
  var h = '<div class="listhead"><h1>Your rosters</h1><div class="actions">'+(APP.prompt?'<button class="btn" data-a="install">Install app</button>':'')+'<button class="btn" data-a="toggle-import">Import</button>'+(S.rosters.length?'<button class="btn" data-a="backup" title="One file with every roster, battle and past battle">Back up all</button>':'')+'<button class="btn primary" data-a="new">New roster</button></div></div>';
  h += '<div class="examples"><span>Start a blank roster</span><div class="ex-btns">'+RACES.map(function(x){ return '<button class="btn sm" data-a="new-race" data-v="'+x+'"><img src="'+ART.race(x)+'" alt="">'+x+'</button>'; }).join("")+'</div></div>';
  // The example armies are no longer offered in the app (owner decision, 15 Nov 2026); the test page keeps buttons for them.
  if(TEST_EXAMPLES) h += '<div class="examples"><div class="ex-btns">'+RACES.map(function(x){ return '<button class="btn sm" data-a="example" data-v="'+x+'">Example '+x+'</button>'; }).join("")+'</div></div>';
  if(APP.iosHint) h += '<div class="notice" style="margin:0 0 14px"><div class="grow">To install SurgeCraft on this iPhone or iPad: tap <b>Share</b>, then <b>Add to Home Screen</b>. It then opens full screen and works offline.</div></div>';
  h += noticeHTML();
  if(S.importOpen){
    h += '<div class="importbox"><div class="field"><label for="imp-code">Share code, roster file or backup file</label><textarea class="input" id="imp-code" placeholder="Paste a share code (starts with SCM1.), or the contents of a roster file or a SurgeCraft backup file"></textarea></div>'+
      '<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center"><button class="btn primary" data-a="import-code">Import code</button><span class="faint">or</span><label class="btn" for="imp-file">Choose roster or backup file…</label><input type="file" id="imp-file" accept=".json,application/json" hidden><button class="btn ghost" data-a="toggle-import">Cancel</button></div></div>';
  }
  if(S.store==="loading") h += '<div class="empty">Loading your rosters…</div>';
  else if(!list.length) h += '<div class="empty">No saved rosters yet. Start a new roster or import one.</div>';
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

