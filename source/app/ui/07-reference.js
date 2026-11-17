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
function closeModal(){ $("modal-root").innerHTML = ""; if(BS){ BS.modal = null; BS.ks = null; BS.pay = null; BS.oppDraft = null; BS.oppErr = null; if(S.cur && S.cur.battle) BS.oppOpen = false; } }

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
/* ------------ card reference ------------
   Every unit, Faction, Tactical and Creep Card for one faction, opened from the header. Cards render from the
   dataset unchanged through the same renderers as the roster views: a unit is shown as its full printed card
   (every weapon, ability and upgrade, nothing marked as taken). */
var CR = { race:null, type:"all", q:"", open:{} };
var CR_TYPES = [["all","All"],["units","Units"],["Faction","Faction"],["Tactical","Tactical"],["Creep","Creep"]];
function crText(o){ var out = []; (function walk(x, k){ if(k==="id"||k==="corrections"||k==="notes"||k==="card_version") return;
  if(typeof x==="string") out.push(x); else if(x && typeof x==="object") Object.keys(x).forEach(function(kk){ walk(x[kk], kk); }); })(o, ""); return out.join(" ").toLowerCase(); }
var crIndex = null;
function crItems(race){
  if(!crIndex){ crIndex = {}; C.data.units.forEach(function(u){ crIndex["u:"+u.id] = crText(u); }); C.data.cards.forEach(function(c){ crIndex["c:"+c.id] = crText(c); }); }
  var q = CR.q.trim().toLowerCase(), hit = function(k){ return !q || crIndex[k].indexOf(q)!==-1; };
  var units = C.data.units.filter(function(u){ return u.race===race && hit("u:"+u.id); });
  var cards = C.data.cards.filter(function(c){ return c.race===race && hit("c:"+c.id); });
  return { units: units, cards: cards };
}
function crRow(key, thumb, title, meta, right){
  var open = !!CR.open[key];
  return '<div class="vitem'+(open?' open':'')+'" data-crkey="'+esc(key)+'"><button class="vrow" data-a="cr-open" data-v="'+esc(key)+'" aria-expanded="'+open+'">'+thumb+
    '<span class="v-t"><span class="v-name">'+title+'</span><span class="v-meta">'+meta+'</span></span><span class="v-r">'+(right||'')+'</span><span class="v-chev" aria-hidden="true"></span></button>'+
    (open ? '<div class="v-body">'+crCard(key)+'</div>' : '')+'</div>';
}
function crCard(key){
  var id = key.slice(2);
  if(key[0]==="u") return C.units[id] ? Render.unitCardHTML(C, C.units[id], null, null) : "";
  return C.cards[id] ? Render.tacCardHTML(C, C.cards[id], null, 1) : "";
}
function crTags(list, race){ return (list||[]).filter(function(t){ return t!==race; }).map(function(t){ return '<span class="chip">'+esc(t)+'</span>'; }).join(""); }
function crListHTML(){
  var race = CR.race, it = crItems(race), h = "", n = 0, show = function(t){ return CR.type==="all" || CR.type===t; };
  if(show("units")){
    var groups = SLOT_TYPES.map(function(s){ return [s, it.units.filter(function(u){ return !u.summoned && u.army_slot===s; })]; });
    groups.push(["Summoned Units", it.units.filter(function(u){ return u.summoned; })]);
    groups.forEach(function(g){
      if(!g[1].length) return; n += g[1].length;
      h += '<div class="subhead">'+esc(g[0]==="Summoned Units"?g[0]:g[0]+" units")+' <span class="aside">'+g[1].length+'</span></div><div class="vlist">';
      g[1].forEach(function(u){
        var sizes = u.compositions.map(function(c){ return '<span class="chip">'+c.models+(c.models>1?' models':' model')+' · Supply '+c.supply+'</span>'; }).join("");
        var meta = (u.combat_role?'<span class="chip">'+esc(u.combat_role)+'</span>':'')+(u.unique?'<span class="chip uniq">Unique</span>':'')+pvChip(u)+crTags(u.faction_tags, race)+(u.summoned?'<span class="faint">No Mineral cost</span>':sizes);
        var right = u.summoned ? '' : '<span class="mincost">'+u.compositions.map(function(c){ return c.minerals; }).join(" / ")+'</span>';
        h += crRow("u:"+u.id, '<span class="thumb mini">'+miniImg(u.id)+'</span>', esc(u.name), meta, right);
      });
      h += '</div>';
    });
  }
  ["Faction","Tactical","Creep"].forEach(function(kind){
    if(!show(kind)) return;
    var cs = it.cards.filter(function(c){ return c.kind===kind; }); if(!cs.length) return; n += cs.length;
    h += '<div class="subhead">'+esc(kind)+' Cards <span class="aside">'+cs.length+'</span></div><div class="vlist">';
    cs.forEach(function(c){
      var meta = (c.unique?'<span class="chip uniq">Unique</span>':'')+pvChip(c)+slotChips(c.slots)+(c.resource && c.resource.value!=null?'<span class="chip">'+esc(c.resource.value+" "+c.resource.type)+'</span>':'')+crTags(c.faction_tags, race)+
        '<span class="faint">'+c.abilities.map(function(a){ return esc(a.name); }).join(" · ")+'</span>';
      h += crRow("c:"+c.id, '<span class="thumb art-bg"><img src="'+ART.card(c.id)+'" alt="" loading="lazy"></span>', esc(c.name), meta, kind==="Faction"?'':'<span class="gascost">'+(c.gas_cost||0)+'</span>');
    });
    h += '</div>';
  });
  if(!n) h = '<div class="kr-empty">'+(CR.q.trim() ? 'No '+esc(race)+' card matches that search.' : 'No '+esc(race)+' cards of this type.')+'</div>';
  return {html:h, n:n};
}
function renderCrList(){
  var box = $("cr-list"), cnt = $("cr-count"); if(!box) return;
  var res = crListHTML(); box.innerHTML = res.html;
  if(cnt) cnt.textContent = res.n+(res.n===1?" card":" cards");
}
function crControlsHTML(){
  return '<div class="seg race" role="group" aria-label="Faction">'+["Terran","Protoss","Zerg"].map(function(rc){
      return '<button data-a="cr-race" data-v="'+rc+'" aria-pressed="'+(CR.race===rc)+'"><img src="'+ART.race(rc)+'" alt="">'+rc+'</button>'; }).join("")+'</div>'+
    '<div class="seg" role="group" aria-label="Card type">'+CR_TYPES.filter(function(t){ return t[0]!=="Creep" || CR.race==="Zerg"; }).map(function(t){
      return '<button data-a="cr-type" data-v="'+t[0]+'" aria-pressed="'+(CR.type===t[0])+'">'+t[1]+'</button>'; }).join("")+'</div>';
}
function openCardRef(){
  if(!CR.race) CR.race = (S.cur && S.cur.race) || "Terran";
  var h = '<div class="kwref cref" id="cref" data-skin="'+esc(CR.race)+'"><div class="kr-head"><h2>Card reference</h2><p>Every unit and every Faction, Tactical and Creep Card, with the values printed on the official cards. Units show the whole card, upgrades included. Tap a line to open its card. Tap an underlined keyword for its definition.</p></div>'+
    '<div class="cr-ctl" id="cr-ctl">'+crControlsHTML()+'</div>'+
    '<div class="kr-tools"><input class="input" id="cr-q" type="search" placeholder="Search names and card text" aria-label="Search cards" autocomplete="off" value="'+esc(CR.q)+'"><span class="faint" id="cr-count"></span></div>'+
    '<div id="cr-list"></div></div>';
  openModal(h); renderCrList();
}
function crClick(a, v){
  if(a==="cr-race"){ if(CR.race===v) return; CR.race = v; CR.open = {}; if(CR.type==="Creep" && v!=="Zerg") CR.type = "all";
    var box = $("cref"); if(box) box.setAttribute("data-skin", v); var ctl = $("cr-ctl"); if(ctl) ctl.innerHTML = crControlsHTML(); renderCrList(); return; }
  if(a==="cr-type"){ CR.type = v; var ctl2 = $("cr-ctl"); if(ctl2) ctl2.innerHTML = crControlsHTML(); renderCrList(); return; }
  if(a==="cr-open"){
    CR.open[v] = !CR.open[v];
    var item = document.querySelector('#cr-list .vitem[data-crkey="'+v.replace(/"/g,'')+'"]'); if(!item) return;
    var btn = item.querySelector(".vrow"), body = item.querySelector(".v-body");
    item.classList.toggle("open", CR.open[v]); btn.setAttribute("aria-expanded", CR.open[v]);
    if(CR.open[v] && !body){ body = document.createElement("div"); body.className = "v-body"; body.innerHTML = crCard(v); item.appendChild(body); }
    else if(!CR.open[v] && body) body.remove();
  }
}
var kwScrollY = 0;
window.addEventListener("scroll", function(){ if($("kw-pop") && window.innerWidth>680 && Math.abs(window.scrollY-kwScrollY)>60) closeKwPop(); }, {passive:true});
window.addEventListener("resize", function(){ if($("kw-pop")) closeKwPop(); });

