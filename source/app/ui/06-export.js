/* ------------ export ------------ */
var FORMATS = [
  {id:"manual", ext:"html", name:"Field manual", hero:true, art:true, cardSize:true, desc:"Roster sheet plus the card for every unit as fielded (only the upgrades you took), every summoned unit, Faction, Tactical and Creep Card, and your Mission Cards. Made for the table."},
  {id:"sheet", ext:"html", name:"Roster sheet", art:true, desc:"The tournament roster with every Organized Play field, laid out for printing."},
  {id:"ref", ext:"html", name:"Reference sheet", suffix:"-reference", gloss:true, desc:"Every unit's stats, fielded weapon profiles, ability names and taken upgrades in compact tables, sized for one or two US Letter pages. Identical units are merged (2×). Rules text stays on the cards."},
  {id:"text", ext:"txt", name:"Plain text", desc:"The full roster as plain text: units, loadouts, cards and totals."},
  {id:"compact", ext:"txt", name:"Compact list", suffix:"-list", desc:"A short list for messages and forum posts, one line per unit."},
  {id:"tts", ext:"txt", name:"Tabletop Simulator export", suffix:"-tts", desc:"A plain-text army list for importing into Tabletop Simulator. Names and costs are the printed card data."},
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
function fileName(f){ if(f.id==="report") return baseName() + "-battle-report" + (S.exp.rep && S.exp.rep.date ? "-" + S.exp.rep.date : "") + ".html"; return baseName() + (f.id==="manual"?"-field-manual":f.id==="sheet"?"-roster-sheet":(f.suffix||"")) + "." + f.ext; }
var BLANK = function(){ return ""; };
function build(f, forPreview){
  var r = S.cur, art = S.exp.art;
  switch(f.id){
    case "text": return Promise.resolve(X.textFull(C, r));
    case "compact": return Promise.resolve(X.textCompact(C, r));
    case "tts": return Promise.resolve(X.tts(C, r));
    case "md": return Promise.resolve(X.markdown(C, r));
    case "csv": return Promise.resolve(X.csv(C, r));
    case "json": return Promise.resolve(X.json(C, r));
    case "sheet": return (forPreview ? Promise.resolve(null) : art ? embedResolver(r, "sheet") : Promise.resolve(BLANK)).then(function(res){ return X.rosterSheetDoc(C, r, res, {art: art, qr: qrSvg(shareLink(r))}); });
    case "ref": return Promise.resolve(X.referenceDoc(C, r, {glossary: S.exp.gloss, kw: KW}));
    case "report": var rp = S.exp.rep; return rp ? Promise.resolve(X.battleReport(C, BT, rp.r, rp.b, { endedAt: rp.endedAt })) : Promise.reject({code:"none"});
    case "manual": return (forPreview ? Promise.resolve(art ? null : BLANK) : art ? embedResolver(r, "manual") : Promise.resolve(BLANK)).then(function(res){ return X.fieldManualDoc(C, r, res, {cardSize: S.exp.cardSize, qr: qrSvg(shareLink(r))}); });
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
    '<div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn" data-a="copy-code">Copy share code</button><button class="btn" data-a="qr">QR code</button></div></div>';
  if(errs.length) h += '<div class="notice err"><div class="grow">This roster has '+errs.length+' rules issue'+(errs.length>1?'s':'')+'. Exports still work, and the HTML versions list the issues.</div><button class="btn sm" data-a="tab" data-v="build">Fix in Build</button></div>';
  if(!S.downloads) h += '<div class="notice"><div class="grow">Saving files isn\'t available in this view. Use Copy and paste into a file, or open the preview.</div></div>';
  h += '<div class="formats">';
  FORMATS.forEach(function(f){
    var busy = S.exp.busy===f.id, pbusy = S.exp.busy==="print-"+f.id;
    h += '<div class="fmt'+(f.hero?' hero':'')+'"><div class="fh"><span class="ext">.'+f.ext.toUpperCase()+'</span><span class="fn">'+esc(f.name)+'</span></div><div class="fd">'+esc(f.desc)+'<div class="faint fname" style="margin-top:4px;font-size:12px">'+esc(fileName(f))+'</div></div>';
    if(f.gloss) h += '<label class="fo"><input type="checkbox" data-a="exp-gloss"'+(S.exp.gloss?' checked':'')+'> Add a keyword glossary at the end</label>';
    if(f.cardSize) h += '<label class="fo"><input type="checkbox" data-a="exp-cardsize"'+(S.exp.cardSize?' checked':'')+'> Print cards at card size (unit cards '+Render.CARD_MM.w+' × '+Render.CARD_MM.h+' mm, tactical cards '+Render.TAC_MM.w+' × '+Render.TAC_MM.h+' mm)</label>';
    if(f.art) h += '<label class="fo"><input type="checkbox" data-a="exp-art"'+(S.exp.art?' checked':'')+'> Include card art and miniatures</label>';
    h += '<div class="fa"><button class="btn primary sm" data-a="exp-save" data-v="'+f.id+'"'+(!S.downloads||busy?' disabled':'')+'>'+(busy?'Preparing…':'Save to disk')+'</button>'+
      (f.ext==="html"&&STANDALONE?'<button class="btn sm" data-a="exp-print" data-v="'+f.id+'"'+(pbusy?' disabled':'')+'>'+(pbusy?'Preparing…':'Print / PDF')+'</button>':'')+
      (f.id!=="zip"?'<button class="btn sm" data-a="exp-copy" data-v="'+f.id+'">Copy'+(f.ext==="html"?' HTML':'')+'</button><button class="btn ghost sm" data-a="exp-prev" data-v="'+f.id+'">'+(S.exp.preview&&S.exp.preview.id===f.id?'Hide preview':'Preview')+'</button>':'')+'</div></div>';
  });
  h += '</div><p class="faint" style="font-size:12px;margin-top:10px">'+(STANDALONE
    ? 'Print / PDF opens your browser\'s print dialog; choose Save as PDF there for a PDF file. Pages are set to US Letter. Saved HTML files open in any browser and print the same way.'
    : 'To get a PDF or paper copy, save the file, open it in your browser, and use Print (choose Save as PDF for a PDF file). Pages are set to US Letter. The SurgeCraft site and installed app also have a Print / PDF button.')+'</p>';
  if(S.exp.copyText!=null) h += '<div class="preview" id="copy-box"><div class="ph"><b>Select and copy</b><span style="color:#B9C6D2">Copying isn\'t allowed here, so the text is selected below.</span></div><textarea class="input" id="copy-fallback" readonly style="min-height:220px;border:0;border-radius:0">'+esc(S.exp.copyText)+'</textarea></div>';
  if(S.exp.preview){
    var p = S.exp.preview, f = fmtById(p.id);
    h += '<div class="preview" id="exp-preview"><div class="ph"><b>Preview · '+esc(f.name)+'</b><span style="margin-left:auto"></span><button class="btn sm" data-a="exp-prev" data-v="'+f.id+'">Close</button></div>'+
      (f.ext==="html" ? '<div class="htmlbox" id="exp-shadow"></div>' : '<pre>'+esc(p.content)+'</pre>')+'</div>';
  }
  el.innerHTML = h;
  var host = $("exp-shadow");
  if(S.exp.preview && host){
    var root = mountDoc(host, S.exp.preview.content);
    if(root.querySelector(".cs-wrap")){ Render.fitCards(root); var refit=function(){ if(host.isConnected) Render.fitCards(root); }; root.querySelectorAll("img").forEach(function(im){ if(!im.complete) im.addEventListener("load", refit); }); if(document.fonts&&document.fonts.ready) document.fonts.ready.then(refit); }
  }
}
/* Puts an exported HTML document into a shadow root on this page: its styles stay scoped to it, its body rules move to .docbody,
   and its scripts are dropped (card fitting is run from here instead). */
function mountDoc(host, doc){
  var root = host.shadowRoot || (host.attachShadow ? host.attachShadow({mode:"open"}) : host);
  var css = (doc.match(/<style>([\s\S]*?)<\/style>/)||[])[1]||"", body = (doc.match(/<body>([\s\S]*?)<\/body>/)||[])[1]||"";
  root.innerHTML = '<style>:host{display:block}table{font-size:inherit;line-height:inherit}'+css.replace(/(^|\})body\{/g,"$1.docbody{")+'</style><div class="docbody">'+body.replace(/<script>[\s\S]*?<\/script>/g,"")+'</div>';
  return root;
}
/* Print / PDF: the export is mounted in a print-only layer on this page, the page's own content is hidden for printing,
   and the browser's print dialog opens (Save as PDF is one of its destinations). The export's @page rule (US Letter) is
   copied to this page, because @page has no effect inside a shadow root. The layer is cleared after printing so the
   browser's Print command prints the app again. */
function clearPrintLayer(){
  var l = $("print-layer"), st = $("print-layer-css");
  if(l) l.remove(); if(st) st.remove();
  window.removeEventListener("afterprint", clearPrintLayer);
}
function printFile(f){
  if(S.exp.busy) return;
  S.exp.busy = "print-"+f.id; renderExport();
  build(f).then(function(doc){
    clearPrintLayer();
    var page = (doc.match(/@page\{[^}]*\}/)||["@page{size:letter;margin:0.4in}"])[0];
    var st = document.createElement("style"); st.id = "print-layer-css";
    st.textContent = page+
      "@media screen{#print-layer{position:absolute;left:-200vw;top:0;width:7.7in;visibility:hidden;pointer-events:none}}"+
      "@media print{html,body{background:#fff!important;margin:0!important;padding:0!important;min-height:0!important;height:auto!important;overflow:visible!important}"+
      "body>*:not(#print-layer){display:none!important}#print-layer{display:block;position:static;width:auto;visibility:visible}}";
    document.head.appendChild(st);
    var layer = document.createElement("div"); layer.id = "print-layer"; layer.setAttribute("aria-hidden","true");
    document.body.appendChild(layer);
    var root = mountDoc(layer, doc);
    // lazy images in an off-screen layer never load, so they are switched to eager; the wait is capped so printing can't stall
    var imgs = Array.prototype.slice.call(root.querySelectorAll("img"));
    imgs.forEach(function(im){ im.loading = "eager"; });
    var loaded = Promise.race([Promise.all(imgs.map(function(im){ return im.complete ? null : new Promise(function(ok){ im.addEventListener("load", ok); im.addEventListener("error", ok); }); })),
      new Promise(function(ok){ setTimeout(ok, 5000); })]);
    var fonts = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
    return Promise.all([loaded, fonts]).then(function(){
      if(root.querySelector(".cs-wrap")) Render.fitCards(root);
      return new Promise(function(ok){ requestAnimationFrame(function(){ requestAnimationFrame(ok); }); });
    }).then(function(){
      S.exp.busy = null; renderExport();
      window.addEventListener("afterprint", clearPrintLayer);
      try{ window.print(); }catch(e){ clearPrintLayer(); flash("Printing isn't available in this view. Use Save to disk, then print the saved file.", "err"); }
    });
  }).catch(function(){ S.exp.busy = null; clearPrintLayer(); renderExport(); flash("That export could not be built for printing. Try again, or use Save to disk.", "err"); });
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

