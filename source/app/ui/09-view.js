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

