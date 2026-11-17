/* ------------ Mission and Deployment draft (Part 9.2) ------------
   A guide through the draft from the Start a battle screen: each player's 2 Mission and 2 Deployment Cards, the
   Roll-Off, the winner's colour and draft control, two removals and one pick per draft. Applying it sets the
   Mission, Deployment and your colour for the battle. The First Player Marker is a separate Roll-Off (8.2.2). */
var DR = null;
function drWho(w){ return w==="me" ? "You" : "Opponent"; }
function drOther(w){ return w==="me" ? "op" : "me"; }
function drPool(k){ return [["me",DR.my[k][0]],["me",DR.my[k][1]],["op",DR.op[k][0]],["op",DR.op[k][1]]]; }
function drName(k, id){ var side = BT.side(C, S.cur); return k==="m" ? (C.missions[id]||{}).name : (C.deployments[id]||{})[side]; }
function draftOpen(){
  var r = S.cur, ms = DATA.missions.map(function(m){ return m.id; }), ds = DATA.deployments.map(function(d){ return d.id; });
  function two(mine, all){ var a = mine.filter(function(id){ return all.indexOf(id)!==-1; }).slice(0, 2); all.forEach(function(id){ if(a.length<2 && a.indexOf(id)===-1) a.push(id); }); return a; }
  DR = { my:{ m:two(r.missions, ms), d:two(r.deployments, ds) }, op:{ m:ms.slice(0, 2), d:ds.slice(0, 2) }, win:null, color:null, ctl:null, out:{ m:[], d:[] }, pick:{ m:null, d:null }, roll:"" };
  draftRender();
}
function draftBody(){
  var h = '<div class="kr-head"><h2>Mission and Deployment draft</h2><p>Part 9.2. Each player brings 2 Mission Cards and 2 Deployment Cards, with no duplicates in their own set.</p></div>';
  function sel(who, k, i){ var all = k==="m" ? DATA.missions : DATA.deployments, cur = DR[who][k][i];
    return '<select class="input" data-a="b-dr-sel" data-v="'+who+':'+k+':'+i+'" aria-label="'+(who==="my"?"Your":"Opponent\'s")+' '+(k==="m"?"Mission":"Deployment")+' Card '+(i+1)+'">'+all.map(function(x){ return '<option value="'+esc(x.id)+'"'+(x.id===cur?' selected':'')+'>'+esc(drName(k, x.id))+'</option>'; }).join("")+'</select>'; }
  function set(who, label){ var dup = DR[who].m[0]===DR[who].m[1] || DR[who].d[0]===DR[who].d[1];
    return '<div class="field"><span class="lbl-s">'+label+'</span>'+sel(who,"m",0)+sel(who,"m",1)+sel(who,"d",0)+sel(who,"d",1)+(dup?'<span class="pill err">A player may not bring the same card twice</span>':'')+'</div>'; }
  h += '<div class="dr-step"><b>1. The cards</b><div class="grid2">'+set("my","Your cards (2 Missions, 2 Deployments)")+set("op","Opponent\'s cards")+'</div></div>';
  h += '<div class="dr-step"><b>2. Roll-Off</b><div class="tr-ctl"><div class="seg"><button data-a="b-dr-win" data-v="me" aria-pressed="'+(DR.win==="me")+'">You won</button><button data-a="b-dr-win" data-v="op" aria-pressed="'+(DR.win==="op")+'">Opponent won</button></div><button class="btn sm" data-a="b-dr-roll">Roll 2D6 each</button><span class="tr-roll">'+esc(DR.roll)+'</span></div></div>';
  if(DR.win){
    var w = drWho(DR.win);
    h += '<div class="dr-step"><b>3. '+w+(DR.win==="me"?" choose":" chooses")+' a colour, then a draft to control</b><div class="tr-ctl"><div class="seg"><button data-a="b-dr-col" data-v="red" aria-pressed="'+(DR.color==="red")+'">Red Player</button><button data-a="b-dr-col" data-v="blue" aria-pressed="'+(DR.color==="blue")+'">Blue Player</button></div>'+
      '<div class="seg"><button data-a="b-dr-ctl" data-v="m" aria-pressed="'+(DR.ctl==="m")+'">Mission Draft</button><button data-a="b-dr-ctl" data-v="d" aria-pressed="'+(DR.ctl==="d")+'">Deployment Draft</button></div></div>'+
      '<span class="faint" style="font-size:12px">The other player controls the other draft.</span></div>';
  }
  if(DR.win && DR.ctl) ["m","d"].forEach(function(k, n){
    var ctl = DR.ctl===k ? DR.win : drOther(DR.win), rem = drOther(ctl), out = DR.out[k], left = 2-out.length;
    h += '<div class="dr-step"><b>'+(4+n)+'. '+(k==="m"?"Mission":"Deployment")+' Draft</b><span class="faint" style="font-size:12.5px">'+
      (left>0 ? drWho(rem)+(rem==="me"?" remove ":" removes ")+left+" more card"+(left>1?"s":"")+"." : DR.pick[k]==null ? drWho(ctl)+(ctl==="me"?" pick":" picks")+" one of the two left." : "Chosen: "+esc(drName(k, drPool(k)[DR.pick[k]][1]))+". The last card is discarded.")+'</span><div class="dr-cards">'+
      drPool(k).map(function(c, i){ var gone = out.indexOf(i)!==-1, on = DR.pick[k]===i;
        return '<button class="dr-card'+(gone?' gone':'')+(on?' on':'')+'" data-a="b-dr-card" data-v="'+k+':'+i+'" aria-pressed="'+on+'"><span>'+esc(drName(k, c[1]))+'</span><small>'+(c[0]==="me"?"Yours":"Opponent\'s")+(gone?" · removed":on?" · chosen":"")+'</small></button>'; }).join("")+'</div></div>';
  });
  var done = DR.win && DR.color && DR.pick.m!=null && DR.pick.d!=null, mine = DR.win==="me" ? DR.color : (DR.color==="red"?"blue":"red");
  h += '<div class="tr-ctl"><button class="btn primary" data-a="b-dr-apply"'+(done?'':' disabled')+'>Use this for the battle</button>'+(done?'<span class="tr-roll">You are the '+(mine==="red"?"Red":"Blue")+' Player.</span>':'<span class="faint">Finish each step to apply the result.</span>')+'</div>';
  return h;
}
function draftRender(){ var el = $("draft"); if(el) el.innerHTML = draftBody(); else openModal('<div class="kwref" id="draft">'+draftBody()+'</div>'); }
function draftClick(a, v){
  if(a==="b-draft"){ draftOpen(); return; }
  if(!DR) return;
  if(a==="b-dr-win"){ DR.win = v; DR.roll = ""; }
  else if(a==="b-dr-roll"){ var d = function(){ return 2+Math.floor(Math.random()*6)+Math.floor(Math.random()*6); }, x, y, n = 0; do { x = d(); y = d(); n++; } while(x===y);   // ties are re-rolled (3.2)
    DR.win = x>y ? "me" : "op"; DR.roll = "You "+x+", opponent "+y+(n>1?" (after "+(n-1)+" tied roll"+(n>2?"s":"")+")":"")+"."; }
  else if(a==="b-dr-col"){ DR.color = v; }
  else if(a==="b-dr-ctl"){ DR.ctl = v; }
  else if(a==="b-dr-card"){ var p = v.split(":"), k = p[0], i = Number(p[1]), out = DR.out[k], at = out.indexOf(i);
    if(at!==-1){ out.splice(at, 1); DR.pick[k] = null; }
    else if(out.length<2){ out.push(i); DR.pick[k] = null; }
    else DR.pick[k] = DR.pick[k]===i ? null : i; }
  else if(a==="b-dr-apply"){ var st = BS.set; st.missionId = drPool("m")[DR.pick.m][1]; st.deploymentId = drPool("d")[DR.pick.d][1]; st.color = DR.win==="me" ? DR.color : (DR.color==="red"?"blue":"red");
    closeModal(); renderBattle(); return; }
  draftRender();
}
function draftChange(a, t){
  if(a!=="b-dr-sel" || !DR) return false;
  var p = t.getAttribute("data-v").split(":"); DR[p[0]][p[1]][Number(p[2])] = t.value; DR.out[p[1]] = []; DR.pick[p[1]] = null; draftRender(); return true;
}
