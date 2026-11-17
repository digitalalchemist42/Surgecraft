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
  if(a==="cards"){ openCardRef(); return; }
  if(a.indexOf("cr-")===0){ crClick(a, v); return; }
  if(a.indexOf("b-")===0){ if(t.tagName==="INPUT") return; bClick(a, v, eu, t); return; }
  switch(a){
    case "home": S.view="list"; S.cur=null; S.notice=null; S.confirmDel=null; render(); window.scrollTo(0,0); break;
    case "new": newRoster(); break;
    case "new-race": newRoster(v); break;
    case "example": openExample(false, v); break;
    case "mode": P.mode = v; savePrefs(); applyMode(); break;
    case "hdr": P.hdrOff = !P.hdrOff; savePrefs(); applyHdr(); break;
    case "layout": P.layout = v; savePrefs(); render(); break;
    case "tile-open": S.tileOpen = (S.tileOpen===v ? null : v); renderUnits(); var ed=$("ut-editor"); if(ed) ed.scrollIntoView({behavior:"smooth", block:"nearest"}); break;
    case "open": openRoster(t.getAttribute("data-id")); break;
    case "open-export": openRoster(t.getAttribute("data-id")); S.tab="export"; render(); break;
    case "dup": var src = S.rosters.filter(function(x){return x.id===t.getAttribute("data-id");})[0]; if(src){ var d = clone(src); d.id="r_"+RosterCore.uid(); d.name=(src.name||"Roster")+" (copy)"; d.createdAt=Date.now(); delete d.battle; delete d.history; Store.queue(d); render(); } break;
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
    case "exp-print": printFile(fmtById(v)); break;
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
  if(a && a.indexOf("b-")===0 && r && bChange(a, t)) return;
  if(a==="exp-gloss"){ S.exp.gloss = t.checked; S.exp.preview=null; renderExport(); return; }
  if(a==="exp-cardsize"){ S.exp.cardSize = t.checked; S.exp.preview=null; renderExport(); return; }
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
  if(t.id==="cr-q"){ CR.q = t.value; CR.open = {}; renderCrList(); return; }
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
