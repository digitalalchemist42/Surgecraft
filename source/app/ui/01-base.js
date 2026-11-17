(function(){
"use strict";
var DATA = JSON.parse(document.getElementById("sc-data").textContent);
var C = new RosterCore(DATA);
var SLOT_TYPES = RosterCore.SLOT_TYPES, SCALES = RosterCore.SCALES, ART = Render.ART, X = Render.exports;
var RACES = ["Terran","Protoss","Zerg"];
var esc = Render.esc, fmt = Render.fmt;

var S = {
  view:"list", tab:"build", rosters:[], cur:null, store:"loading", save:"idle",
  open:{}, picker:false, importOpen:false, confirmDel:null, confirmRace:null, notice:null, downloads:null, tileOpen:null,
  exp:{ base:"", art:true, gloss:false, cardSize:true, preview:null, busy:null, copyText:null }
};
function clone(o){ return JSON.parse(JSON.stringify(o)); }
function $(id){ return document.getElementById(id); }

/* Standalone = opened anywhere other than claude.ai (a saved file, a web host). No account storage there. */
var STANDALONE = !(window.claude && typeof window.claude.use==="function");
var MIME = {html:"text/html;charset=utf-8", txt:"text/plain;charset=utf-8", md:"text/markdown;charset=utf-8", csv:"text/csv;charset=utf-8", json:"application/json", zip:"application/zip"};

/* Installable-app support: only on a hosted standalone copy that ships a manifest (see build_standalone.py). */
var APP = { prompt:null, iosHint:false };
(function(){
  var hosted = STANDALONE && /^https?:$/.test(location.protocol) && document.querySelector('link[rel="manifest"]');
  if(!hosted) return;
  var installed = (window.matchMedia && window.matchMedia("(display-mode: standalone)").matches) || window.navigator.standalone === true;
  if("serviceWorker" in navigator){
    var hadController = !!navigator.serviceWorker.controller;
    navigator.serviceWorker.register("sw.js").catch(function(){});
    navigator.serviceWorker.addEventListener("controllerchange", function(){
      if(!hadController){ hadController = true; return; }
      S.notice = {kind:"info", reload:true, text:"A new version of SurgeCraft is ready."}; render();
    });
  }
  if(navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(function(){});
  window.addEventListener("beforeinstallprompt", function(e){ e.preventDefault(); APP.prompt = e; if(S.view==="list") render(); });
  window.addEventListener("appinstalled", function(){ APP.prompt = null; if(S.view==="list") render(); });
  var ios = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform==="MacIntel" && navigator.maxTouchPoints>1);
  APP.iosHint = ios && !installed;
})();

/* ------------ viewer preferences (this browser only): color mode + layout ------------ */
var PREF_KEY = "surgecraft.prefs.v1";
var P = (function(){ var d = {mode:"auto", layout:"list", guides:true, wake:true, hdrOff:false}; try{ var v = JSON.parse(localStorage.getItem(PREF_KEY)||"{}"); if(["auto","light","dark"].indexOf(v.mode)!==-1) d.mode=v.mode; if(["list","tiles"].indexOf(v.layout)!==-1) d.layout=v.layout; if(typeof v.guides==="boolean") d.guides=v.guides; if(typeof v.wake==="boolean") d.wake=v.wake; if(typeof v.hdrOff==="boolean") d.hdrOff=v.hdrOff; }catch(e){} return d; })();
function savePrefs(){ try{ localStorage.setItem(PREF_KEY, JSON.stringify(P)); }catch(e){} }
var mq = window.matchMedia ? window.matchMedia("(prefers-color-scheme: dark)") : null;
function effectiveMode(){
  if(P.mode!=="auto") return P.mode;
  var t = document.documentElement.getAttribute("data-theme");
  if(t==="dark"||t==="light") return t;
  return mq && mq.matches ? "dark" : "light";
}
function applyMode(){
  document.body.setAttribute("data-mode", effectiveMode());
  var m = $("modes"); if(m) m.querySelectorAll("button").forEach(function(b){ b.setAttribute("aria-pressed", String(b.getAttribute("data-v")===P.mode)); });
}
if(mq){ if(mq.addEventListener) mq.addEventListener("change", applyMode); else if(mq.addListener) mq.addListener(applyMode); }
try{ new MutationObserver(applyMode).observe(document.documentElement, {attributes:true, attributeFilter:["data-theme"]}); }catch(e){}

