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
function afterLoad(){ render(); } // example armies open only from the Example buttons, never on their own

