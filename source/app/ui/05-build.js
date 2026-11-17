/* ------------ build view ------------ */
function renderBuild(){
  var h = '<div class="strip" id="strip"><div class="wrap" id="meters"></div></div>';
  h += '<div class="tabbar"><div class="tabs" role="tablist">'+[["build","Build"],["view","View"],["battle","Battle"],["dice","Dice"],["sheet","Roster sheet"],["export","Export"]].map(function(t){
    return '<button class="tab" role="tab" aria-selected="'+(S.tab===t[0])+'" data-a="tab" data-v="'+t[0]+'">'+t[1]+'</button>'; }).join("")+'</div>';
  if(S.tab==="build") h += '<div class="viewsw"><span>Layout</span><div class="seg" role="group" aria-label="Layout">'+
    '<button data-a="layout" data-v="list" aria-pressed="'+(P.layout==="list")+'"><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M2 3h12M2 8h12M2 13h12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>List</button>'+
    '<button data-a="layout" data-v="tiles" aria-pressed="'+(P.layout==="tiles")+'"><svg viewBox="0 0 16 16" aria-hidden="true"><rect x="1.5" y="1.5" width="5.5" height="5.5" rx="1" fill="currentColor"/><rect x="9" y="1.5" width="5.5" height="5.5" rx="1" fill="currentColor"/><rect x="1.5" y="9" width="5.5" height="5.5" rx="1" fill="currentColor"/><rect x="9" y="9" width="5.5" height="5.5" rx="1" fill="currentColor"/></svg>Tiles</button></div></div>';
  h += '</div>';
  h += noticeHTML();
  if(S.tab==="sheet"){ h += '<div class="sheetwrap">'+Render.sheetHTML(C, S.cur, null, {art:true, checks:true})+'</div>'; $("app").innerHTML = h; renderMeters(); return; }
  if(S.tab==="view"){ h += '<div id="view"></div>'; $("app").innerHTML = h; renderMeters(); renderView(); return; }
  if(S.tab==="battle"){ h += '<div id="battle"></div>'; $("app").innerHTML = h; renderBattle(); return; }
  if(S.tab==="dice"){ h += '<div id="dice"></div>'; $("app").innerHTML = h; renderDice(); return; }
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
  var rq = C.requiredCard(r);
  if(rq){
    h += '<div class="subhead" style="margin-top:0">'+esc(rq.kind)+' Card<span class="aside faint">Choose exactly one ('+esc(rq.ability)+')</span></div><div class="tiles" role="radiogroup" aria-label="'+esc(rq.kind)+' Card">';
    C.eligibleCreep(r).forEach(function(c){
      h += '<div class="tile" role="radio" tabindex="0" data-a="creep" data-v="'+esc(c.id)+'" aria-checked="'+(r.creepId===c.id)+'"><span class="t-art"><img src="'+ART.card(c.id)+'" alt=""></span><span class="tcol">'+
        '<span class="t-name">'+esc(c.name)+'</span><span class="t-meta"><span class="gascost">'+c.gas_cost+' gas</span>'+(c.unique?'<span class="chip uniq">Unique</span>':'')+pvChip(c)+'</span>'+
        '<span class="t-sub">'+c.abilities.map(function(a){return esc(a.name);}).join(" · ")+'</span></span></div>';
    });
    h += '</div><div class="subhead">Tactical Cards</div>';
  }
  if(P.layout==="tiles"){
    h += '<div class="utiles">';
    C.eligibleTactical(r).forEach(function(c){
      var n = r.tactical[c.id]||0;
      h += '<div class="utile ttile'+(n?' on':'')+'"><button class="ut-img card art-bg" data-a="tcard" data-v="'+esc(c.id)+'" aria-label="View '+esc(c.name)+' card"><img src="'+ART.card(c.id)+'" alt="" loading="lazy">'+
        '<span class="ut-tl">'+(c.unique?'<span class="chip uniq" style="background:var(--panel)">Unique</span>':'')+pvChip(c, true)+'</span><span class="ut-tr gascost">'+c.gas_cost+'</span></button>'+
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
    h += '<div class="row'+(n?' on':'')+'"><button class="thumb" data-a="tcard" data-v="'+esc(c.id)+'" aria-label="View '+esc(c.name)+' card"><img src="'+ART.card(c.id)+'" alt=""></button><div><div class="r-name">'+esc(c.name)+(c.unique?' <span class="chip uniq">Unique</span>':'')+pvChip(c, false, true)+
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
    '<span class="e-name">'+esc(u.name)+'</span><span class="chip slot">'+esc(u.army_slot)+'</span>'+(u.unique?'<span class="chip uniq">Unique</span>':'')+pvChip(u)+
    '<span class="faint">×'+e.models+' · Supply '+cost.supply+'</span><span class="e-cost"><span class="mincost" title="'+cost.base+' base + '+cost.upgrades+' upgrades">'+fmt(cost.total)+'</span>'+
    '<button class="btn sm" data-a="card" data-v="'+esc(u.id)+'" data-e="'+esc(e.uid)+'">Card</button>'+collapsedLabel+'</span></div>';
}
function unitTileHTML(e, u, cost, errs){
  var open = S.tileOpen===e.uid;
  return '<div class="utile'+(open?' open':'')+(errs?' has-err':'')+'" id="'+esc(e.uid)+'"><button class="ut-img" data-a="tile-open" data-v="'+esc(e.uid)+'" aria-expanded="'+open+'" aria-label="Edit '+esc(u.name)+'">'+
    '<img src="'+ART.mini(u.id)+'" alt="" loading="lazy"><span class="ut-tl"><span class="chip slot" style="background:var(--panel)">'+esc(u.army_slot)+'</span>'+(u.unique?'<span class="chip uniq" style="background:var(--panel)">Unique</span>':'')+pvChip(u, true)+'</span>'+
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
          h += '<div class="utile"><button class="ut-img" data-a="card" data-v="'+esc(u.id)+'" aria-label="View '+esc(u.name)+' card"><img src="'+ART.mini(u.id)+'" alt="" loading="lazy"><span class="ut-tl">'+(u.unique?'<span class="chip uniq" style="background:var(--panel)">Unique</span>':'')+pvChip(u, true)+'</span><span class="ut-tr mincost">'+costRange(u)+'</span></button>'+
            '<div class="ut-body"><div class="ut-name">'+esc(u.name)+'</div><div class="ut-meta">'+esc(sizes)+'</div>'+(minSup>free?'<span class="pill warn" style="align-self:flex-start">needs '+minSup+' '+esc(s)+'</span>':'')+'</div>'+
            '<div class="ut-act">'+addBtn+'<span class="grow"></span><button class="btn ghost sm" data-a="card" data-v="'+esc(u.id)+'">Card</button></div></div>';
        } else {
          h += '<div class="row"><button class="thumb mini" data-a="card" data-v="'+esc(u.id)+'" aria-label="View '+esc(u.name)+' card">'+miniImg(u.id)+'</button><div><div class="r-name">'+esc(u.name)+(u.unique?' <span class="chip uniq">Unique</span>':'')+pvChip(u, false, true)+'</div>'+
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

