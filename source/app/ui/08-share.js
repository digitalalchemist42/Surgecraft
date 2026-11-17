/* ------------ share code / import ------------ */
function b64u(str){ var b = btoa(unescape(encodeURIComponent(str))); return b.replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,""); }
function unb64u(s){ s = s.replace(/-/g,"+").replace(/_/g,"/"); while(s.length%4) s+="="; return decodeURIComponent(escape(atob(s))); }
function shareCode(r){ return "SCM1."+b64u(JSON.stringify(C.exportable(r))); }
/* Short code for links and QR codes: the roster without its notes (see RosterCore pack). */
var SITE_URL = "https://digitalalchemist42.github.io/Surgecraft/";
function shareShort(r){ return "SCM2."+b64u(JSON.stringify(C.pack(r))); }
function siteBase(){ return STANDALONE && /^https?:$/.test(location.protocol) ? location.href.split("#")[0].split("?")[0] : SITE_URL; }
function shareLink(r){ return siteBase()+"#r="+shareShort(r); }
/* QR code as an SVG picture. Empty when the text is too long for one code. */
function qrSvg(text){
  if(typeof qrcode!=="function") return "";
  try{ var q = qrcode(0, "L"); q.addData(text); q.make(); return q.createSvgTag({cellSize:4, margin:4, scalable:true}); }catch(e){ return ""; }
}
function openQr(r){
  var link = shareLink(r), svg = qrSvg(link);
  openModal('<div class="kwref qrm"><div class="kr-head"><h2>'+esc(r.name||"Roster")+'</h2><p>Scan with a phone camera to open this roster in SurgeCraft. Notes are not included.</p></div>'+
    (svg ? '<div class="qr-box">'+svg+'</div>' : '<div class="notice err"><div class="grow">This roster is too long for one QR code. Use the link or the share code.</div></div>')+
    '<div class="qr-act"><button class="btn" data-a="copy-link">Copy link</button><button class="btn" data-a="copy-code">Copy share code</button></div></div>');
}
/* A roster link opened in the browser: #r=SCM2... Imported once, then the address is cleaned. */
function importFromHash(){
  var m = /[#&]r=(SCM[12]\.[A-Za-z0-9_\-]+)/.exec(location.hash||""); if(!m) return;
  try{ history.replaceState(null, "", location.pathname+location.search); }catch(e){}
  importText(m[1]);
}
function importText(txt){
  txt = (txt||"").trim(); if(!txt) return;
  var obj = null, link = /[#&]r=(SCM[12]\.[A-Za-z0-9_\-]+)/.exec(txt); if(link) txt = link[1];
  try{ obj = txt.indexOf("SCM2.")===0 ? C.unpack(JSON.parse(unb64u(txt.slice(5)))) : txt.indexOf("SCM1.")===0 ? JSON.parse(unb64u(txt.slice(5))) : JSON.parse(txt); }catch(e){ obj = null; }
  if(!obj){ flash("That isn't a roster link, share code or roster file. Share codes start with SCM1 or SCM2.", "err"); return; }
  if(obj.format==="surgecraft-backup"){ restoreBackup(obj); return; }
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

