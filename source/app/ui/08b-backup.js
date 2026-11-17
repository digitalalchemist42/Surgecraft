/* ------------ full backup and restore ------------
   One file holding every roster on this device or account, with the battle in progress and Past battles
   (single-roster exports and share codes leave those out). Restore goes through Import. A roster in the
   backup replaces the saved one with the same id only when the backup's copy is newer. */
function backupAll(){
  var list = S.rosters.map(clone), d = new Date(), pad = function(n){ return (n<10?"0":"")+n; };
  var name = "surgecraft-backup-"+d.getFullYear()+"-"+pad(d.getMonth()+1)+"-"+pad(d.getDate())+".json";
  var text = JSON.stringify({ format:"surgecraft-backup", version:1, exportedAt:Date.now(), rosters:list }, null, 1)+"\n";
  var what = list.length+" roster"+(list.length===1?"":"s");
  function fallback(){ openModal('<div class="kwref"><div class="kr-head"><h2>Backup</h2><p>Saving a file is not available in this view. Select all of the text below, copy it and keep it in a file named '+esc(name)+'. Paste it into Import to restore.</p></div><textarea class="input" readonly style="min-height:260px" id="bk-text">'+esc(text)+'</textarea></div>'); var ta = $("bk-text"); if(ta){ ta.focus(); ta.select(); } }
  if(!S.downloads){ fallback(); return; }
  S.downloads.save({ filename:name, data:text }).then(function(res){ flash((res && res.status==="delivered" ? name+" sent" : "Saved "+name)+": "+what+", with battles and Past battles."); },
    function(e){ if(e && e.code==="declined") return; fallback(); });
}
function restoreBackup(obj){
  var list = Array.isArray(obj.rosters) ? obj.rosters : [], added = 0, updated = 0, kept = 0, bad = 0, dropped = [];
  list.forEach(function(raw){
    var res = C.normalize(raw); if(!res.roster){ bad++; return; }
    var r = res.roster, same = Array.isArray(raw.units) && raw.units.length===r.units.length;
    if(typeof raw.id==="string" && /^r_[a-z0-9]+$/i.test(raw.id)) r.id = raw.id;
    if(Number(raw.createdAt) > 0) r.createdAt = Number(raw.createdAt);
    /* The battle refers to units by their ids, so it is restored only when every unit came through. */
    if(same){ r.units.forEach(function(e, i){ var u = raw.units[i].uid; if(typeof u==="string" && /^u_[a-z0-9]+$/i.test(u)) e.uid = u; });
      if(raw.battle && typeof raw.battle==="object" && raw.battle.units) r.battle = clone(raw.battle); }
    if(Array.isArray(raw.history)) r.history = clone(raw.history.slice(0, 10));
    res.dropped.forEach(function(x){ dropped.push((r.name||"Roster")+": "+x); });
    var cur = S.rosters.filter(function(x){ return x.id===r.id; })[0];
    if(cur && (cur.updatedAt||0) >= (Number(raw.updatedAt)||0)){ kept++; return; }
    if(cur) updated++; else added++;
    Store.queue(r);
  });
  S.importOpen = false;
  S.notice = { kind: added+updated ? "info" : "err", dropped: dropped.slice(0, 12),
    text: "Backup read: "+added+" added, "+updated+" replaced with a newer copy, "+kept+" left as they are (your saved copy is the same or newer)"+(bad?", "+bad+" could not be read":"")+"." };
  render();
}
