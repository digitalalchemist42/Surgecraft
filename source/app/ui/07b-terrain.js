/* ------------ terrain setup (header button) ------------
   The pre-made maps printed in the Full Rules (Map Layouts, pp. 115-124) with the Battlefield Setup order of Part 9.3.
   Map images and "Assembly requires" lists come from the rulebook (DATA.terrain); maps are numbered in printed order. */
var TR = {scale:null, map:1, roll:null, steps:null, key:false};
var TR_STEPS = [
  "Confirm the table size shown on the chosen Deployment Card.",
  "Give each player the Entry Edge the Deployment Card shows.",
  "Where an Entry Edge does not run the full length of a table edge, set Zone of Influence Markers at its corners, exactly as the card shows.",
  "Set terrain. Either pick or roll for one of the pre-made maps below (D6 for Standard Engagement, D3 for Skirmish Engagement), or take turns placing one terrain piece at a time, starting with the Red Player.",
  "Place Mission Markers at the Deployment Card's coordinates. They may sit on MID GROUND or HIGH GROUND, but not on impassable terrain: if a Marker would overlap an impassable piece, move that piece as close to the Marker as possible without overlapping it."
];
function trName(m){ return (m.scale==="standard"?"Standard":"Skirmish")+" map "+m.number; }
function trMaps(){ return DATA.terrain.maps.filter(function(m){ return m.scale===TR.scale; }); }
function terrainBody(){
  var maps = trMaps(), m = maps[TR.map-1] || maps[0], die = TR.scale==="standard" ? "D6" : "D3";
  var h = '<div class="kr-head"><h2>Terrain setup</h2><p>The pre-made maps from the Full Rules (Map Layouts, pages 115 to 124) and the Battlefield Setup order from Part 9.3.</p></div>'+
    '<details class="tr-steps"'+(TR.steps?' open':'')+'><summary>Battlefield setup order</summary><ol>'+TR_STEPS.map(function(x){ return '<li>'+Render.richText(x)+'</li>'; }).join("")+'</ol></details>'+
    '<div class="tr-ctl"><div class="seg" role="group" aria-label="Engagement">'+[["standard","Standard 36″ × 54″"],["skirmish","Skirmish 36″ × 36″"]].map(function(x){
      return '<button data-a="tr-scale" data-v="'+x[0]+'" aria-pressed="'+(TR.scale===x[0])+'">'+x[1]+'</button>'; }).join("")+'</div>'+
    '<button class="btn primary" data-a="tr-roll">Roll '+die+' for a map</button>'+
    '<span class="tr-roll" id="tr-roll" aria-live="polite">'+(TR.roll ? esc(TR.roll) : '')+'</span></div>'+
    '<div class="seg" role="group" aria-label="Map">'+maps.map(function(x){
      return '<button data-a="tr-map" data-v="'+x.number+'" aria-pressed="'+(x.number===m.number)+'">Map '+x.number+'</button>'; }).join("")+'</div>'+
    '<figure class="tr-fig'+(TR.scale==="skirmish"?' sq':'')+'"><img id="tr-img" src="'+ART.terrain(m.id)+'" alt="'+esc((TR.scale==="standard"?"Standard":"Skirmish")+" map "+m.number+", terrain layout")+'">'+
    '<figcaption>'+(TR.scale==="standard"?"Standard":"Skirmish")+' map '+m.number+' · '+esc(m.battlefield)+' · Full Rules p. '+m.page+'</figcaption></figure>'+
    '<div><div class="lbl-s" style="margin-bottom:5px">Assembly requires</div><div class="tr-req">'+m.requires.map(function(q){ return '<span class="chip">'+q[0]+' × '+esc(q[1])+'</span>'; }).join("")+'</div></div>'+
    '<details class="tr-key"'+(TR.key?' open':'')+'><summary>Terrain key</summary><img src="'+ART.terrain("key")+'" alt="Terrain key: '+esc(DATA.terrain.key.pieces.join(", "))+'" loading="lazy"></details>';
  return h;
}
function openTerrain(){
  if(!TR.scale) TR.scale = S.cur ? C.limits(S.cur).scale.side : "standard";
  if(TR.steps===null) TR.steps = window.innerWidth > 680;   // on a phone the map comes first; the steps open on tap
  openModal('<div class="kwref tref" id="tref">'+terrainBody()+'</div>');
}
function renderTerrain(){ var el = $("tref"); if(el) el.innerHTML = terrainBody(); }
/* D3 as the rules define it (Part 3.1): roll a D6 and halve it, rounding up. */
function trRoll(){
  var d6 = 1 + Math.floor(Math.random()*6);
  if(TR.scale==="standard"){ TR.map = d6; TR.roll = "Rolled "+d6+": Map "+d6+"."; }
  else { var d3 = Math.ceil(d6/2); TR.map = d3; TR.roll = "Rolled "+d6+" on a D6, a D3 result of "+d3+": Map "+d3+"."; }
}
function trClick(a, v){
  var ds = document.querySelector("#tref .tr-steps"), dk = document.querySelector("#tref .tr-key");
  if(ds) TR.steps = ds.open; if(dk) TR.key = dk.open;   // keep what the viewer opened or closed across the redraw
  if(a==="tr-scale"){ if(TR.scale!==v){ TR.scale = v; TR.map = 1; TR.roll = null; } }
  else if(a==="tr-map"){ TR.map = Number(v); TR.roll = null; }
  else if(a==="tr-roll"){ trRoll(); }
  renderTerrain();
}
