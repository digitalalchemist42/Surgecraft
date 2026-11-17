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
function resetView(){ VS.open={}; BS.set=null; BS.warn=[]; BS.pass=false; BS.undo=[]; BS.quit=false; BS.adj={me:0,opp:0}; BS.sumPick=false; BS.openAb={}; BS.openU={}; BS.grp={}; BS.tab="play"; BS.showAll=false; BS.ks=null; BS.pay=null; BS.modal=null; BS.oppOpen=false; BS.oppDraft=null; BS.oppErr=null; BS.hDel=null; S.view="build"; S.tab="build"; S.picker=false; S.open={}; S.notice=null; S.confirmRace=null; S.tileOpen=null; S.exp.preview=null; S.exp.copyText=null; S.exp.base=""; }
function openRoster(id){ var r = S.rosters.filter(function(x){return x.id===id;})[0]; if(!r) return; S.cur = clone(r); resetView(); render(); window.scrollTo(0,0); }
var TEST_EXAMPLES = false;
function newRoster(race){ var r = C.newRoster(); if(race && RACES.indexOf(race)!==-1) r.race = race; S.cur = r; resetView(); Store.queue(r); render(); window.scrollTo(0,0); }
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
/* PREVIEW chip for a unit or card transcribed from photographs before a cost table lists it.
   panel: on a tile image, where the chip needs the panel background; lead: put a space in front. */
function pvChip(x, panel, lead){
  return x.provisional ? (lead?' ':'')+'<span class="chip uniq"'+(panel?' style="background:var(--panel)"':'')+' title="From photographs of the printed card; no published cost yet">Preview</span>' : '';
}
function slotChips(slots){ return Object.keys(slots).map(function(s){ return '<span class="chip slot">+'+slots[s]+' '+esc(s)+'</span>'; }).join(""); }
function tp(t){ return t ? '<span class="tp '+esc(t)+'">'+esc(t.toUpperCase())+'</span>' : ""; }
function inlineAbilities(race, abilities){ return '<div class="sc-card sc-inline" data-race="'+esc(race)+'">'+abilities.map(function(a){ return Render.abilityBox(a); }).join("")+'</div>'; }
function weaponLine(w){
  return 'RNG '+esc(w.rng)+' · '+esc(w.target)+' · RoA '+esc(w.roa)+' · Hit '+esc(w.hit)+(w.surge_type!=="-"?' · Surge '+esc(w.surge_type)+' '+esc(w.s_dice):'')+' · Dmg '+esc(w.dmg)+(w.keywords.length?' · '+esc(w.keywords.join(", ")):'');
}
function costRange(u){ var a = u.compositions.map(function(c){return c.minerals;}); var lo=Math.min.apply(null,a), hi=Math.max.apply(null,a); return lo===hi ? fmt(lo) : fmt(lo)+"–"+fmt(hi); }
function miniImg(uid){ var u = C.units[uid]; return u && u.summoned ? '<img src="'+ART.unit(uid)+'" alt="" loading="lazy" style="object-fit:cover">' : '<img src="'+ART.mini(uid)+'" alt="" loading="lazy">'; } // Summoned Units have no cut-out miniature; use their card art

