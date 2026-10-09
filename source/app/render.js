/* SurgeCraft — card rendering and export builders.
 * Pure string builders over RosterCore; no DOM access. Shared by the app page and every export,
 * so a card looks the same in the builder, the Field Manual HTML and the Roster Sheet HTML. */
(function (root) {
  "use strict";

  var PHASES = ["Any", "Movement", "Assault", "Combat"];
  var PHASE_NAME = { Any: "Any Phase", Movement: "Movement Phase", Assault: "Assault Phase", Combat: "Combat Phase" };
  var ICON = {
    Movement: '<svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="6.6" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M4.6 8h5.6M8.2 5.2 11 8l-2.8 2.8" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    Assault: '<svg viewBox="0 0 16 16" aria-hidden="true"><rect x="2.2" y="2.2" width="11.6" height="11.6" rx="1.6" fill="none" stroke="currentColor" stroke-width="1.5"/><circle cx="8" cy="8" r="2.6" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M8 .8v3.4M8 11.8v3.4M.8 8h3.4M11.8 8h3.4" stroke="currentColor" stroke-width="1.5"/></svg>',
    Combat: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 1.6C4.6 1.6 2.4 3.9 2.4 6.8c0 1.8.9 3.1 2.1 3.8v2.2c0 .6.5 1.1 1.1 1.1h4.8c.6 0 1.1-.5 1.1-1.1v-2.2c1.2-.7 2.1-2 2.1-3.8 0-2.9-2.2-5.2-5.6-5.2z" fill="currentColor"/><circle cx="5.9" cy="7" r="1.35" fill="var(--race,#09202E)"/><circle cx="10.1" cy="7" r="1.35" fill="var(--race,#09202E)"/><path d="M7 11.4v1.6M9 11.4v1.6" stroke="var(--race,#09202E)" stroke-width="1"/></svg>',
    Any: ""
  };
  var RES = { Terran: "CP", Protoss: "PE", Zerg: "BM" };

  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function fmt(n) { return Number(n || 0).toLocaleString("en-US"); }

  var ART = {
    unit: function (id) { return "img/units/" + id + ".webp"; },
    mini: function (id) { return "img/minis/" + id + ".webp"; },
    card: function (id) { return "img/cards/" + id + ".webp"; },
    race: function (r) { return "img/race/" + String(r).toLowerCase() + ".webp"; },
    deploy: function (id, side) { return "img/deploy/" + id + "-" + side + ".webp"; }
  };
  var identity = function (p) { return p; };

  /* Wrap keyword-looking UPPERCASE runs and "Friendly/Enemy" in bold, the way the printed cards emphasise terms. */
  function richText(t) {
    var s = esc(t);
    s = s.replace(/\b([A-Z][A-Z\-']{1,}\b(?:\s+(?:[A-Z][A-Z\-']*\b(?![a-z])|\([^)]*\)|\d+\+?"?))*(?:\s+[A-Z][a-z]+(?=\s*\())?(?:\s*\([^)]*\))?)/g, "<b>$1</b>");
    s = s.replace(/<b>([A-Z])-<\/b>(\d)/g, "$1-$2"); // weapon names such as C-14 are not keywords
    s = s.replace(/\b(Friendly|Enemy|Once per Game|Once per Round|Once Per Game)\b/g, "<b>$1</b>");
    return s;
  }

  function typePill(t) { return t ? '<span class="sc-pill sc-' + esc(t.toLowerCase()) + '">' + esc(t.toUpperCase()) + "</span>" : ""; }

  function abilityBox(a, opts) {
    opts = opts || {};
    var cost = a.cost ? '<span class="sc-cost">' + esc(a.cost) + "</span>" : "";
    var extra = opts.extra || "";
    return '<div class="sc-ab' + (opts.upgrade ? " sc-up" : "") + (opts.taken ? " sc-taken" : "") + '">' +
      (opts.upgrade ? '<span class="sc-uptag">UPGRADE' + (opts.costText ? ' · <span class="sc-min">' + esc(opts.costText) + "</span>" : "") + "</span>" : "") +
      '<p><span class="sc-abn">' + esc(a.name.toUpperCase()) + ":</span> " + typePill(a.type) + cost + " " + richText(a.text) + "</p>" + extra + "</div>";
  }

  function weaponTable(ws, opts) {
    opts = opts || {};
    if (!ws.length) return "";
    var h = '<div class="sc-tw"><table class="sc-wt"><thead><tr><th>Name</th><th>RNG</th><th>Target</th><th>RoA</th><th>Hit</th><th>Surge type</th><th>S Dice</th><th>Dmg</th><th>Keyword</th></tr></thead><tbody>';
    ws.forEach(function (w) {
      var cls = [];
      if (opts.replaced && opts.replaced[w.name]) cls.push("sc-struck");
      if (opts.taken && opts.taken[w.name]) cls.push("sc-taken");
      var note = "";
      if (w.replaces) note += '<span class="sc-for">&#9650; FOR ' + esc(w.replaces.toUpperCase()) + "</span>";
      if (opts.replaced && opts.replaced[w.name]) note += '<span class="sc-for">REPLACED BY ' + esc(opts.replaced[w.name].toUpperCase()) + "</span>";
      if (opts.costs && opts.costs[w.name]) note += '<span class="sc-for sc-min">' + esc(opts.costs[w.name]) + "</span>";
      if (opts.specialist && opts.specialist[w.name]) note += '<span class="sc-for">MODEL ' + esc(opts.specialist[w.name]) + "</span>";
      h += '<tr class="' + cls.join(" ") + '"><td class="sc-wn">' + esc(w.name.toUpperCase()) + note + "</td><td>" + esc(w.rng) + "</td><td>" + esc(w.target) + "</td><td>" + esc(w.roa) + "</td><td>" + esc(w.hit) +
        "</td><td>" + esc(w.surge_type) + "</td><td>" + esc(w.s_dice) + "</td><td>" + esc(w.dmg) + "</td><td>" + esc(w.keywords.join(", ") || "-") + "</td></tr>";
    });
    return h + "</tbody></table></div>";
  }

  function phaseHead(p, label) {
    return '<div class="sc-ph"><span class="sc-phtab">' + (ICON[p] ? '<i class="sc-ico">' + ICON[p] + "</i>" : "") + esc(PHASE_NAME[p].toUpperCase()) + "</span>" + (label ? '<span class="sc-phx">' + esc(label) + "</span>" : "") + "</div>";
  }

  /* ---------- UNIT CARD ---------- */
  /* opts.fielded: show the Unit as it is on this roster — base profile with the purchased upgrades merged in
     (replacement weapons swapped, SPECIALIST weapons listed with their model) and unpurchased upgrades left out. */
  function unitCardHTML(C, u, entry, src, opts) {
    src = src || identity; opts = opts || {};
    var fielded = !!(opts.fielded && entry);
    var st = u.stats, lo = entry ? C.loadout(entry) : null, comp = entry ? C.composition(entry) : null;
    var takenNames = {}; if (entry) entry.upgrades.forEach(function (n) { takenNames[n] = true; });
    var artSrc = src(ART.unit(u.id)), emb = src(ART.race(u.race));
    var h = '<article class="sc-card' + (artSrc ? "" : " sc-noart") + '" data-race="' + esc(u.race) + '">';
    if (artSrc) h += '<div class="sc-art' + (u.provisional ? " sc-pvart" : "") + '"><img src="' + esc(artSrc) + '" alt="' + esc(u.name) + ' miniatures" loading="lazy"></div>';
    h += '<div class="sc-body">';
    // title bar
    h += '<header class="sc-title"><div class="sc-tl"><h3>' + esc(u.name.toUpperCase()) + "</h3>" +
      '<div class="sc-meta">' + (u.army_slot ? '<span><em>ARMY SLOT:</em> ' + esc(u.army_slot.toUpperCase()) + "</span>" : '<span><em>SUMMONED UNIT</em></span>') +
      (u.combat_role ? '<span><em>COMBAT ROLE:</em> ' + esc(String(u.combat_role).toUpperCase()) + "</span>" : "") + (u.unique ? '<span class="sc-uq">UNIQUE</span>' : "") + (u.provisional ? '<span class="sc-pv" title="Transcribed from a preview, not the printed card">PREVIEW</span>' : "") + "</div></div>" +
      (emb ? '<img class="sc-emb" src="' + esc(emb) + '" alt="" loading="lazy">' : "") + "</header>";
    // stats + supply
    var stats = [["SPEED", st.speed], ["ARMOUR", st.armour], ["EVADE", st.evade], ["HIT POINTS", st.hp]];
    if (st.shield != null) stats.push(["SHIELD", st.shield]);
    stats.push(["SIZE", st.size]);
    h += '<div class="sc-statrow"><div class="sc-stats">' + stats.map(function (s) { return '<div class="sc-st' + (s[0] === "SHIELD" ? " sc-sh" : "") + '"><span>' + s[0] + "</span><b>" + esc(s[1]) + "</b></div>"; }).join("") + "</div>";
    h += '<table class="sc-sup"><thead><tr><th colspan="' + u.supply_profile.length + '">MODELS / SUPPLY</th></tr></thead><tbody><tr>' +
      u.supply_profile.map(function (b) { return "<td>" + esc(b.models) + "</td>"; }).join("") + "</tr><tr>" +
      u.supply_profile.map(function (b) { return "<td><b>" + b.supply + "</b></td>"; }).join("") + "</tr></tbody></table></div>";
    if (entry && comp) {
      var c = C.entryCost(entry);
      h += '<div class="sc-fielded">FIELDED: <b>' + entry.models + " MODELS</b> · SUPPLY <b>" + c.supply + '</b> · <span class="sc-min">' + c.total + " MINERALS</span>" + (c.upgrades ? " (" + c.base + " + " + c.upgrades + " upgrades)" : "") + "</div>";
    }
    // phases
    var ups = fielded ? entry.upgrades.map(function (n) { return C.upgradeDef(entry, n); }).filter(Boolean) : [];
    PHASES.forEach(function (p) {
      var ws = u.weapons.filter(function (w) { return w.phase === p; });
      var ab = u.abilities.filter(function (a) { return a.phase === p; });
      if (fielded) {
        var upAb = ups.filter(function (x) { return x.kind !== "weapon" && x.phase === p; });
        var swap = {}, taken = {}, spec = {}, extra = [];
        ups.filter(function (x) { return x.kind === "weapon"; }).forEach(function (x) {
          if (x.replaces && !x.specialist) swap[x.replaces] = x;
          else if (x.phase === p) extra.push(x);
          taken[x.name] = true;
          if (x.specialist) spec[x.name] = (entry.specialists && entry.specialists[x.name]) || "?";
        });
        ws = ws.map(function (w) { return swap[w.name] || w; }).filter(function (w) { return w.phase === p; });
        Object.keys(swap).forEach(function (k) { var x = swap[k]; if (x.phase === p && ws.indexOf(x) === -1 && !u.weapons.some(function (w) { return w.name === k && w.phase === p; })) ws.push(x); });
        ws = ws.concat(extra);
        if (!ws.length && !ab.length && !upAb.length) return;
        h += '<section class="sc-sec">' + phaseHead(p);
        h += ab.map(function (a) { return abilityBox(a); }).join("");
        h += upAb.map(function (a) { return abilityBox(a, { upgrade: true, taken: true }); }).join("");
        h += weaponTable(ws, { taken: taken, specialist: spec });
        h += "</section>";
        return;
      }
      if (!ws.length && !ab.length) return;
      h += '<section class="sc-sec">' + phaseHead(p);
      h += ab.map(function (a) { return abilityBox(a); }).join("");
      h += weaponTable(ws, { replaced: lo ? lo.replaced : null });
      h += "</section>";
    });
    // upgrades
    if (u.upgrades.length && !fielded) {
      h += '<div class="sc-upband">&#9650; UPGRADES</div>';
      PHASES.forEach(function (p) {
        var ups = u.upgrades.filter(function (x) { return x.phase === p; });
        if (!ups.length) return;
        h += '<section class="sc-sec">' + phaseHead(p, "UPGRADE");
        ups.forEach(function (x) {
          var costText = (x.cost_by_composition || []).map(function (v, i) { return v + (u.compositions.length > 1 ? " (" + u.compositions[i].models + ")" : ""); }).join(" / ");
          if (comp && x.cost_by_composition) costText = x.cost_by_composition[comp.index] + " MINERALS";
          var sp = entry && entry.specialists && entry.specialists[x.name];
          if (x.kind === "weapon") {
            var costs = {}, taken = {}, spec = {}; costs[x.name] = costText; taken[x.name] = !!takenNames[x.name]; if (sp) spec[x.name] = sp;
            h += '<div class="sc-upw' + (takenNames[x.name] ? " sc-taken" : "") + '"><span class="sc-uptag">UPGRADE' + (x.specialist ? " · SPECIALIST" : "") + (takenNames[x.name] ? " · TAKEN" : "") + "</span>" +
              weaponTable([x], { costs: costs, specialist: spec }) + "</div>";
          } else {
            h += abilityBox(x, { upgrade: true, taken: !!takenNames[x.name], costText: costText + (takenNames[x.name] ? " · TAKEN" : "") });
          }
        });
        h += "</section>";
      });
    }
    // footer
    h += '<footer class="sc-foot"><span><em>COMBAT TAGS:</em> ' + esc(u.combat_tags.join(", ").toUpperCase()) + "</span>" +
      '<span class="sc-ftags">' + u.faction_tags.map(function (t) { return '<i>' + esc(t.toUpperCase()) + "</i>"; }).join("") + "</span></footer>";
    var fine = []; if (u.base_mm) fine.push("Base Ø " + u.base_mm + (typeof u.base_mm === "number" ? "mm" : ""));
    if (u.card_version) fine.push("Card " + u.card_version);
    if (u.compositions && u.compositions.length) fine.push("Cost table: " + u.compositions.map(function (c) { return c.models + " models " + c.minerals + " / Supply " + c.supply; }).join(" · "));
    (u.corrections || []).forEach(function (x) { fine.push("Corrected: " + x); });
    (u.notes || []).forEach(function (x) { fine.push("Note: " + x); });
    h += '<div class="sc-fine">' + fine.map(esc).join("<br>") + "</div>";
    h += "</div></article>";
    return h;
  }

  /* ---------- TACTICAL / FACTION / CREEP CARD ---------- */
  function slotsText(slots) {
    var k = Object.keys(slots);
    return k.length ? k.map(function (s) { return slots[s] + " × " + s.toUpperCase(); }).join(", ") : "-";
  }
  function tacCardHTML(C, c, src, count) {
    src = src || identity;
    var artSrc = src(ART.card(c.id));
    var h = '<article class="sc-card sc-tac' + (artSrc ? "" : " sc-noart") + '" data-race="' + esc(c.race) + '">';
    if (artSrc) h += '<div class="sc-art sc-tacart"><img src="' + esc(artSrc) + '" alt="" loading="lazy"></div>';
    h += '<div class="sc-body"><header class="sc-title"><div class="sc-tl"><h3>' + esc(c.name.toUpperCase()) + (count > 1 ? " ×" + count : "") + "</h3>" +
      '<div class="sc-meta"><span><em>' + esc(c.kind.toUpperCase()) + " CARD</em></span>" + (c.unique ? '<span class="sc-uq">UNIQUE</span>' : "") + (c.provisional ? '<span class="sc-pv" title="Transcribed from a preview, not the printed card">PREVIEW</span>' : "") +
      (c.gas_cost != null && c.kind !== "Faction" ? '<span class="sc-gas">' + c.gas_cost + " VESPENE GAS</span>" : "") + "</div></div>" +
      (c.resource && c.resource.value != null ? '<span class="sc-res">' + esc(c.resource.type) + ": " + esc(c.resource.value) + "</span>" : "") + "</header>";
    PHASES.forEach(function (p) {
      var ab = c.abilities.filter(function (a) { return a.phase === p; });
      if (!ab.length) return;
      h += '<section class="sc-sec">' + phaseHead(p) + ab.map(function (a) { return abilityBox(a); }).join("") + "</section>";
    });
    h += '<footer class="sc-foot"><span><em>SUPPLY:</em> ' + esc(slotsText(c.slots)) + '</span><span class="sc-ftags">' + c.faction_tags.map(function (t) { return "<i>" + esc(t.toUpperCase()) + "</i>"; }).join("") + "</span></footer>";
    var fine = []; if (c.card_version) fine.push("Card " + c.card_version);
    (c.corrections || []).forEach(function (x) { fine.push("Corrected: " + x); });
    (c.notes || []).forEach(function (x) { fine.push("Note: " + x); });
    if (fine.length) h += '<div class="sc-fine">' + fine.map(esc).join("<br>") + "</div>";
    return h + "</div></article>";
  }

  /* ---------- MISSION CARD (text) ---------- */
  function missionCardHTML(m, side) {
    var s = m[side];
    var lines = s.mission_parameters.map(function (x) { return "<p>" + richText(x) + "</p>"; }).join("");
    var sc = s.scoring.map(function (x) { return "<p>" + richText(x) + "</p>"; }).join("");
    var ad = (s.additional || []).map(function (x) { return "<p>" + richText(x) + "</p>"; }).join("");
    if (s.special_win_lead) ad += "<p><b>SPECIAL WINNING CONDITIONS:</b> The game ends immediately if a <b>Player</b> leads <b>by " + s.special_win_lead + "+ VPs</b>.</p>";
    return '<article class="sc-mission"><header><h3>' + esc(m.name.toUpperCase()) + '</h3><span class="sc-mbox"><b>' + s.deploy_supply + '</b>SUPPLY</span><span class="sc-mbox"><b>+' + s.supply_per_round + "</b>PER ROUND</span></header>" +
      '<div class="sc-mlen">GAME LENGTH: <b>' + s.game_length + "</b> · " + (side === "skirmish" ? "SKIRMISH LEVEL" : "STANDARD ENGAGEMENT") + "</div>" +
      '<div class="sc-mblk"><span>MISSION PARAMETERS:</span>' + lines + '</div><div class="sc-mblk"><span>SCORING CONDITIONS:</span>' + sc + "</div>" +
      (ad ? '<div class="sc-mblk"><span>ADDITIONAL CONDITIONS:</span>' + ad + "</div>" : "") + "</article>";
  }

  /* ---------- DEPLOYMENT CARD (image of the printed map, one side) ---------- */
  function deploymentCardHTML(d, side, src) {
    src = src || identity;
    var p = src(ART.deploy(d.id, side)), label = d[side] + (side === "skirmish" ? " · Skirmish Level 36\u2033 × 36\u2033" : " · Standard Engagement 54\u2033 × 36\u2033");
    if (!p) return '<article class="sc-deploy sc-deploy-text"><h3>' + esc(d[side].toUpperCase()) + '</h3><p>' + esc(label) + '</p></article>';
    return '<figure class="sc-deploy"><img src="' + esc(p) + '" alt="Deployment map: ' + esc(label) + '" loading="lazy"><figcaption>' + esc(label) + "</figcaption></figure>";
  }

  /* ---------- ROSTER SHEET (Organized Play fields) ---------- */
  function sheetHTML(C, r, src, opts) {
    src = src || identity; opts = opts || {};
    var f = C.faction(r), t = C.totals(r), lim = C.limits(r), side = lim.scale.side, v = C.validate(r);
    var errs = v.filter(function (x) { return x.level === "error"; });
    var remb = r.race && opts.art !== false ? src(ART.race(r.race)) : "";
    var h = '<div class="rs"><header class="rs-h">' + (remb ? '<img class="rs-emb" src="' + esc(remb) + '" alt="">' : "") +
      '<div><div class="rs-k">ARMY ROSTER</div><h2>' + esc(r.name || "Roster") + "</h2></div>" +
      '<div class="rs-status ' + (errs.length ? "bad" : "ok") + '">' + (errs.length ? errs.length + " RULES ISSUE" + (errs.length > 1 ? "S" : "") : "LEGAL") + "</div></header>";
    h += '<div class="rs-grid"><div><span>PLAYER</span><b>' + esc(r.player || "—") + "</b></div><div><span>FACTION</span><b>" + esc((r.race || "—") + (f ? " · " + f.name : "")) + "</b></div>" +
      "<div><span>ENGAGEMENT</span><b>" + esc(lim.scale.name) + "</b></div><div><span>MINERALS</span><b>" + fmt(t.minerals) + " / " + fmt(lim.minerals) + "</b></div>" +
      "<div><span>VESPENE GAS</span><b>" + fmt(t.gas) + " / " + fmt(lim.gas) + "</b></div><div><span>TOTAL SUPPLY</span><b>" + t.supply + "</b></div></div>";
    h += '<h4 class="rs-sh">UNITS</h4><div class="rs-tw"><table class="rs-t"><thead><tr>' + (opts.art !== false ? "<th></th>" : "") + '<th>Unit</th><th>Loadout &amp; upgrades</th><th class="n">Supply</th><th class="n">Minerals</th></tr></thead><tbody>';
    r.units.forEach(function (e) {
      var u = C.units[e.unitId]; if (!u) return; var c = C.entryCost(e);
      h += "<tr>" + (opts.art !== false ? '<td class="rs-mini"><img src="' + esc(src(ART.mini(u.id))) + '" alt="" loading="lazy"></td>' : "") +
        "<td><b>" + esc(u.name) + '</b><br><span class="rs-f">' + e.models + " model" + (e.models > 1 ? "s" : "") + " · " + esc(u.army_slot) + "</span></td><td>" + esc(C.loadoutText(e)) +
        '</td><td class="n">' + c.supply + '</td><td class="n">' + c.total + (c.upgrades ? '<br><span class="rs-f">' + c.base + " + " + c.upgrades + "</span>" : "") + "</td></tr>";
    });
    h += '</tbody><tfoot><tr><td colspan="' + (opts.art !== false ? 3 : 2) + '">Total</td><td class="n">' + t.supply + '</td><td class="n">' + fmt(t.minerals) + " / " + fmt(lim.minerals) + "</td></tr></tfoot></table></div>";
    h += '<h4 class="rs-sh">TACTICAL CARDS</h4><div class="rs-tw"><table class="rs-t"><thead><tr><th>Card</th><th>Army Slots</th><th class="n">Vespene Gas</th></tr></thead><tbody>';
    if (f) h += "<tr><td><b>" + esc(f.name) + '</b> <span class="rs-f">Faction Card</span></td><td>' + esc(slotsText(f.slots)) + '</td><td class="n">—</td></tr>';
    Object.keys(r.tactical || {}).forEach(function (id) {
      var c = C.cards[id], n = r.tactical[id]; if (!c || !n) return;
      var sl = {}; Object.keys(c.slots).forEach(function (s) { sl[s] = c.slots[s] * n; });
      h += "<tr><td>" + esc(c.name) + (n > 1 ? " ×" + n : "") + "</td><td>" + esc(slotsText(sl)) + '</td><td class="n">' + c.gas_cost * n + "</td></tr>";
    });
    if (r.creepId && C.cards[r.creepId]) h += "<tr><td>" + esc(C.cards[r.creepId].name) + ' <span class="rs-f">Creep Card</span></td><td>—</td><td class="n">' + C.cards[r.creepId].gas_cost + "</td></tr>";
    h += '</tbody><tfoot><tr><td colspan="2">Total</td><td class="n">' + t.gas + " / " + lim.gas + "</td></tr></tfoot></table></div>";
    h += '<h4 class="rs-sh">MISSION &amp; DEPLOYMENT CARDS</h4><div class="rs-tw"><table class="rs-t"><tbody><tr><td class="rs-f" style="width:170px">Mission Cards</td><td>' +
      ((r.missions || []).map(function (id) { return esc(C.missions[id] ? C.missions[id].name : id); }).join(", ") || "—") + '</td></tr><tr><td class="rs-f">Deployment Cards</td><td>' +
      ((r.deployments || []).map(function (id) { return esc(C.deployments[id] ? C.deployments[id][side] : id); }).join(", ") || "—") + "</td></tr></tbody></table></div>";
    if (opts.checks && errs.length) h += '<div class="rs-issues"><b>Rules issues</b><ul>' + errs.map(function (x) { return "<li>" + esc(x.msg) + " <i>" + esc(x.ref) + "</i></li>"; }).join("") + "</ul></div>";
    return h + "</div>";
  }

  /* ---------- CSS shared by app and exports ---------- */
  var CARD_CSS = [
    ".sc-card{--race:#005BA4;--race-2:#00548F;--race-3:#0A3F6B;--ink:#09202E;--paper:#EDEDED;--line:#C9CDD2;--gray:#6F6F6E;--active:#36A9E0;--passive:#CD1619;--reaction:#CD9600;--min:#1685C2;--gas:#2B8F48;",
    "display:grid;grid-template-columns:minmax(0,200px) minmax(0,1fr);background:var(--paper);color:var(--ink);border-radius:14px;overflow:hidden;font-family:'Noto Sans',Arial,sans-serif;font-stretch:75%;font-size:13.5px;line-height:1.38;box-shadow:0 1px 3px rgba(0,0,0,.18);break-inside:avoid;page-break-inside:avoid;text-align:left}",
    ".sc-card[data-race=Protoss]{--race:#BD8A00;--race-2:#E0AE0A;--race-3:#6E5200}",
    ".sc-card[data-race=Zerg]{--race:#823287;--race-2:#722F79;--race-3:#441C49}",
    ".sc-card *{box-sizing:border-box}",
    ".sc-card.sc-noart{grid-template-columns:minmax(0,1fr)}",
    ".sc-art{background:#1a1a1a;position:relative;min-height:100%}",
    ".sc-art img{display:block;width:100%;height:100%;object-fit:cover;object-position:center;max-width:100%}",
    ".sc-tacart{background:radial-gradient(circle at 50% 40%,var(--race-2),var(--race-3));display:flex;align-items:center;justify-content:center;padding:14px}",
    ".sc-tacart img{height:auto;max-height:260px;object-fit:contain;filter:drop-shadow(0 6px 10px rgba(0,0,0,.45))}",
    ".sc-body{display:flex;flex-direction:column;gap:9px;padding:0 0 12px;min-width:0}",
    ".sc-title{display:flex;align-items:center;gap:10px;background:linear-gradient(100deg,var(--race-3),var(--race) 55%,var(--race-2));color:#fff;padding:10px 14px;clip-path:polygon(0 0,100% 0,100% 100%,18px 100%,0 calc(100% - 18px))}",
    ".sc-tl{flex:1;min-width:0}",
    ".sc-title h3{margin:0;font-family:'Saira','Noto Sans',Arial,sans-serif;font-stretch:87.5%;font-weight:600;font-size:25px;line-height:1.05;letter-spacing:.02em;text-shadow:0 1px 2px rgba(0,0,0,.35)}",
    ".sc-meta{display:flex;flex-wrap:wrap;gap:4px 12px;margin-top:4px;font-size:11.5px;font-weight:700;letter-spacing:.03em}",
    ".sc-meta em{font-style:normal;opacity:.78;font-weight:600}",
    ".sc-uq{background:#fff;color:var(--ink);padding:0 6px;border-radius:2px}",
    ".sc-gas{background:var(--gas);color:#fff;padding:0 6px;border-radius:2px}",
    ".sc-pvart{background:var(--race-3)}",
    ".sc-pvart img{object-fit:contain;object-position:center bottom}",
    ".sc-pv{background:#fff;color:var(--race-3);border:1px dashed var(--race-3);padding:0 6px;border-radius:2px;letter-spacing:.06em}",
    ".sc-emb{width:46px;height:46px;object-fit:contain;flex:none;background:rgba(255,255,255,.92);border-radius:50%;padding:5px}",
    ".sc-res{background:#fff;color:var(--race-3);font-weight:800;font-size:14px;padding:3px 9px;border-radius:3px;flex:none}",
    ".sc-statrow,.sc-sec,.sc-fielded,.sc-upband,.sc-upw,.sc-foot,.sc-fine{margin-inline:12px}",
    ".sc-statrow{display:flex;gap:10px;flex-wrap:wrap;align-items:stretch}",
    ".sc-stats{display:flex;gap:4px;flex-wrap:wrap}",
    ".sc-st{display:flex;flex-direction:column;align-items:center;min-width:52px}",
    ".sc-st span{font-size:10px;font-weight:700;letter-spacing:.04em;color:var(--gray)}",
    ".sc-st b{background:var(--race);color:#fff;font-family:'Saira','Noto Sans',sans-serif;font-weight:700;font-size:21px;min-width:52px;text-align:center;padding:1px 6px;clip-path:polygon(7px 0,100% 0,100% calc(100% - 7px),calc(100% - 7px) 100%,0 100%,0 7px)}",
    ".sc-st.sc-sh b{background:#2A8FD0}",
    ".sc-sup{border-collapse:collapse;font-size:12px;margin-left:auto;background:#fff}",
    ".sc-sup th{background:var(--gray);color:#fff;font-size:10px;letter-spacing:.06em;padding:2px 8px;font-weight:700}",
    ".sc-sup td{border:1px solid var(--line);text-align:center;padding:1px 8px;font-variant-numeric:tabular-nums}",
    ".sc-fielded{background:#fff;border:1px solid var(--line);padding:4px 10px;font-size:12px;font-weight:600;letter-spacing:.02em}",
    ".sc-min{color:var(--min);font-weight:800}",
    ".sc-sec{display:flex;flex-direction:column;gap:6px}",
    ".sc-ph{display:flex;align-items:center;gap:8px;border-bottom:2px solid var(--race)}",
    ".sc-phtab{display:inline-flex;align-items:center;gap:6px;background:var(--race);color:#fff;font-weight:800;font-size:12.5px;letter-spacing:.03em;padding:3px 14px 2px 8px;clip-path:polygon(0 0,calc(100% - 10px) 0,100% 100%,0 100%)}",
    ".sc-ico svg{width:15px;height:15px;display:block}",
    ".sc-phx{margin-left:auto;font-size:10.5px;font-weight:800;color:var(--race);letter-spacing:.06em}",
    ".sc-ab{background:#fff;border:1.5px solid var(--race);padding:6px 10px;clip-path:polygon(0 0,100% 0,100% calc(100% - 10px),calc(100% - 10px) 100%,0 100%);position:relative}",
    ".sc-ab p{margin:0}",
    ".sc-abn{font-weight:800}",
    ".sc-pill{display:inline-block;font-weight:800;font-size:10.5px;color:#fff;padding:0 5px;border-radius:2px;letter-spacing:.02em;line-height:1.55;vertical-align:1px}",
    ".sc-active{background:var(--active)}.sc-passive{background:var(--passive)}.sc-reaction{background:var(--reaction)}",
    ".sc-cost{display:inline-block;font-weight:800;font-size:11px;margin-left:3px;color:var(--ink)}",
    ".sc-uptag{display:block;font-size:10px;font-weight:800;letter-spacing:.07em;color:var(--race);margin-bottom:2px}",
    ".sc-taken{box-shadow:inset 4px 0 0 var(--race);background:#FFFBEA}",
    "tr.sc-taken td{background:#FFFBEA}",
    ".sc-tw{overflow-x:auto}",
    ".sc-wt{width:100%;border-collapse:collapse;font-size:12.5px;background:#fff}",
    ".sc-wt th{background:var(--gray);color:#fff;font-weight:600;font-size:10.5px;padding:3px 6px;text-align:center;white-space:nowrap}",
    ".sc-wt th:first-child{text-align:left}",
    ".sc-wt td{border-bottom:1px solid var(--line);padding:4px 6px;text-align:center;font-variant-numeric:tabular-nums}",
    ".sc-wt td.sc-wn{text-align:left;font-weight:800;white-space:nowrap}",
    ".sc-wt td:last-child{text-align:left;font-size:11.5px}",
    ".sc-for{display:block;font-size:10px;font-weight:700;color:var(--race);letter-spacing:.03em}",
    "tr.sc-struck td{color:#9aa0a6;text-decoration:line-through}",
    "tr.sc-struck .sc-for{text-decoration:none}",
    ".sc-upband{background:var(--race-3);color:#fff;font-weight:800;font-size:12px;letter-spacing:.08em;padding:3px 10px;margin-top:4px}",
    ".sc-upw{border:1.5px solid var(--race);background:#fff;padding:5px 6px 2px}",
    ".sc-foot{display:flex;flex-wrap:wrap;gap:6px 12px;align-items:center;background:var(--ink);color:#fff;padding:6px 10px;font-weight:700;font-size:12px;letter-spacing:.02em}",
    ".sc-foot em{font-style:normal;color:#9FB3C4}",
    ".sc-ftags{margin-left:auto;display:flex;gap:4px;flex-wrap:wrap}",
    ".sc-ftags i{font-style:normal;background:var(--race);padding:1px 7px;font-size:11px}",
    ".sc-fine{font-size:11px;color:#5d6670;font-stretch:87.5%}",
    ".sc-mission{background:var(--paper,#EDEDED);color:#09202E;border-radius:12px;overflow:hidden;font-family:'Noto Sans',Arial,sans-serif;font-stretch:75%;font-size:13.5px;line-height:1.4;break-inside:avoid;padding-bottom:10px}",
    ".sc-mission header{display:flex;align-items:center;gap:8px;background:linear-gradient(100deg,#0B2233,#2C5577);color:#fff;padding:10px 14px}",
    ".sc-mission h3{margin:0;flex:1;font-family:'Saira','Noto Sans',sans-serif;font-stretch:87.5%;font-weight:600;font-size:22px}",
    ".sc-mbox{display:flex;flex-direction:column;align-items:center;background:#fff;color:#09202E;font-size:8px;font-weight:700;padding:2px 7px;border-radius:3px;line-height:1.1}",
    ".sc-mbox b{font-family:'Saira',sans-serif;font-size:19px}",
    ".sc-mlen{margin:6px 14px;font-size:11.5px;font-weight:700;letter-spacing:.04em}",
    ".sc-mblk{margin:6px 12px;background:#fff;border:1.5px solid #0B2233;padding:6px 10px}",
    ".sc-mblk>span{display:inline-block;background:#0B2233;color:#fff;font-weight:800;font-size:12px;padding:1px 8px;margin:-6px 0 4px -10px}",
    ".sc-mblk p{margin:2px 0}",
    ".sc-deploy{margin:0;background:#EDEDED;border-radius:12px;overflow:hidden;break-inside:avoid;page-break-inside:avoid;box-shadow:0 1px 3px rgba(0,0,0,.18)}",
    ".sc-deploy img{display:block;width:100%;height:auto}",
    ".sc-deploy figcaption{font-family:'Noto Sans',Arial,sans-serif;font-stretch:87.5%;font-size:12px;font-weight:700;color:#3a4652;padding:6px 12px}",
    ".sc-deploy-text{padding:12px 14px;font-family:'Noto Sans',Arial,sans-serif;color:#09202E}.sc-deploy-text h3{margin:0 0 4px;font-family:'Saira',sans-serif;font-size:20px}.sc-deploy-text p{margin:0}",
    ".rs{font-family:'Noto Sans',Arial,sans-serif;font-stretch:87.5%;color:#09202E}",
    ".rs-h{display:flex;align-items:center;gap:12px;border-bottom:3px solid #09202E;padding-bottom:10px}",
    ".rs-h h2{margin:0;font-family:'Saira','Noto Sans',sans-serif;font-stretch:87.5%;font-weight:600;font-size:26px;line-height:1.1}",
    ".rs-emb{width:48px;height:48px;object-fit:contain}",
    ".rs-k{font-size:11px;font-weight:800;letter-spacing:.12em;color:#5d6670}",
    ".rs-status{margin-left:auto;font-weight:800;font-size:12px;letter-spacing:.08em;padding:4px 10px;border-radius:3px;white-space:nowrap}",
    ".rs-status.ok{background:#DDF0E4;color:#1F6B41}.rs-status.bad{background:#F7DEDC;color:#A2231D}",
    ".rs-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px 16px;margin:12px 0 4px}",
    ".rs-grid span{display:block;font-size:10px;font-weight:800;letter-spacing:.1em;color:#5d6670}",
    ".rs-grid b{font-size:15px;font-variant-numeric:tabular-nums}",
    ".rs-sh{font-family:'Saira','Noto Sans',sans-serif;font-stretch:87.5%;font-size:14px;letter-spacing:.1em;margin:16px 0 6px;font-weight:700}",
    ".rs-tw{overflow-x:auto}",
    ".rs-t{width:100%;border-collapse:collapse;font-size:13.5px}",
    ".rs-t th{text-align:left;font-size:10.5px;letter-spacing:.08em;text-transform:uppercase;color:#fff;background:#6F6F6E;font-weight:700;padding:5px 8px}",
    ".rs-t td{border-bottom:1px solid #D5D9DE;padding:6px 8px;vertical-align:top}",
    ".rs-t .n{text-align:right;white-space:nowrap;font-variant-numeric:tabular-nums}",
    ".rs-t tfoot td{font-weight:800;border-top:2px solid #6F6F6E;border-bottom:0}",
    ".rs-f{color:#5d6670;font-size:12px}",
    ".rs-mini{width:52px}.rs-mini img{width:46px;height:46px;object-fit:contain;display:block}",
    ".rs-issues{margin-top:12px;background:#F7DEDC;color:#7D1B16;padding:8px 12px;border-radius:4px}.rs-issues ul{margin:4px 0 0 18px;padding:0}",
    ".sc-inline{display:block;box-shadow:none;background:transparent;border-radius:0}.sc-inline>.sc-ab+.sc-ab,.sc-inline>.sc-sec+.sc-sec{margin-top:6px}.sc-inline .sc-sec{margin-inline:0}",
    "@media (max-width:640px){.sc-card{grid-template-columns:minmax(0,1fr)}.sc-art{height:170px}.sc-art img{object-position:center 30%}.sc-tacart img{max-height:150px}.sc-title h3{font-size:21px}.rs-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.sc-sup{margin-left:0}}"
  ].join("\n");

  /* ---------- EXPORT BUILDERS ---------- */
  function textFull(C, r) {
    var s = C.rosterText(r), v = C.validate(r).filter(function (x) { return x.level === "error"; });
    if (v.length) s += "\n\nRULES ISSUES\n" + v.map(function (x) { return "- " + x.msg + " (" + x.ref + ")"; }).join("\n");
    return s + "\n";
  }
  function textCompact(C, r) {
    var f = C.faction(r), t = C.totals(r), lim = C.limits(r), side = lim.scale.side;
    var L = [];
    L.push((r.name || "Roster") + " | " + (r.player || "—") + " | " + (r.race || "—") + " – " + (f ? f.name : "—"));
    L.push(lim.scale.name + ": " + t.minerals + "/" + lim.minerals + " Minerals, " + t.gas + "/" + lim.gas + " Gas, Supply " + t.supply);
    var tac = Object.keys(r.tactical || {}).filter(function (id) { return r.tactical[id]; }).map(function (id) { return C.cards[id].name + (r.tactical[id] > 1 ? " x" + r.tactical[id] : ""); });
    if (r.creepId && C.cards[r.creepId]) tac.push(C.cards[r.creepId].name);
    L.push("Cards: " + (tac.join(", ") || "—"));
    r.units.forEach(function (e) {
      var u = C.units[e.unitId]; if (!u) return; var c = C.entryCost(e);
      var ups = e.upgrades.map(function (n) { var m = e.specialists && e.specialists[n]; return n + (m ? " [M" + m + "]" : ""); });
      L.push("• " + u.name + " x" + e.models + " (" + c.total + ")" + (ups.length ? ": " + ups.join(", ") : ""));
    });
    L.push("Missions: " + ((r.missions || []).map(function (id) { return C.missions[id].name; }).join(", ") || "—") +
      " | Deployments: " + ((r.deployments || []).map(function (id) { return C.deployments[id][side]; }).join(", ") || "—"));
    return L.join("\n") + "\n";
  }
  function mdCell(s) { return String(s == null ? "" : s).replace(/\|/g, "\\|").replace(/\n/g, " "); }
  function markdown(C, r) {
    var f = C.faction(r), t = C.totals(r), lim = C.limits(r), side = lim.scale.side, L = [];
    L.push("# " + (r.name || "Roster"), "");
    L.push("**Player:** " + (r.player || "—") + "  ");
    L.push("**Faction:** " + (r.race || "—") + " — " + (f ? f.name : "—") + "  ");
    L.push("**Engagement:** " + lim.scale.name + " · Minerals " + t.minerals + " / " + lim.minerals + " · Vespene Gas " + t.gas + " / " + lim.gas + " · Supply " + t.supply, "");
    L.push("## Units", "", "| Unit | Models | Slot | Supply | Minerals | Loadout |", "|---|---:|---|---:|---:|---|");
    r.units.forEach(function (e) { var u = C.units[e.unitId]; if (!u) return; var c = C.entryCost(e);
      L.push("| " + mdCell(u.name) + " | " + e.models + " | " + u.army_slot + " | " + c.supply + " | " + c.total + (c.upgrades ? " (" + c.base + " + " + c.upgrades + ")" : "") + " | " + mdCell(C.loadoutText(e)) + " |"); });
    L.push("| **Total** | | | **" + t.supply + "** | **" + t.minerals + "** | |", "");
    L.push("## Tactical Cards", "", "| Card | Army Slots | Vespene Gas |", "|---|---|---:|");
    if (f) L.push("| " + mdCell(f.name) + " (Faction Card) | " + slotsText(f.slots) + " | — |");
    Object.keys(r.tactical || {}).forEach(function (id) { var c = C.cards[id], n = r.tactical[id]; if (!c || !n) return;
      var sl = {}; Object.keys(c.slots).forEach(function (s) { sl[s] = c.slots[s] * n; });
      L.push("| " + mdCell(c.name) + (n > 1 ? " ×" + n : "") + " | " + slotsText(sl) + " | " + c.gas_cost * n + " |"); });
    if (r.creepId && C.cards[r.creepId]) L.push("| " + mdCell(C.cards[r.creepId].name) + " (Creep Card) | — | " + C.cards[r.creepId].gas_cost + " |");
    L.push("| **Total** | | **" + t.gas + "** |", "");
    L.push("## Mission & Deployment Cards", "");
    L.push("- **Mission Cards:** " + ((r.missions || []).map(function (id) { return C.missions[id].name; }).join(", ") || "—"));
    L.push("- **Deployment Cards:** " + ((r.deployments || []).map(function (id) { return C.deployments[id][side]; }).join(", ") || "—"));
    var errs = C.validate(r).filter(function (x) { return x.level === "error"; });
    if (errs.length) { L.push("", "## Rules issues", ""); errs.forEach(function (x) { L.push("- " + x.msg + " _(" + x.ref + ")_"); }); }
    return L.join("\n") + "\n";
  }
  function csvCell(s) { s = String(s == null ? "" : s); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; }
  function csv(C, r) {
    var rows = [["Type", "Name", "Models", "Army Slot", "Supply", "Base Minerals", "Upgrade Minerals", "Total Minerals", "Vespene Gas", "Upgrades / Army Slots", "Loadout"]];
    r.units.forEach(function (e) { var u = C.units[e.unitId]; if (!u) return; var c = C.entryCost(e);
      rows.push(["Unit", u.name, e.models, u.army_slot, c.supply, c.base, c.upgrades, c.total, "", e.upgrades.join("; "), C.loadoutText(e)]); });
    var f = C.faction(r); if (f) rows.push(["Faction Card", f.name, "", "", "", "", "", "", 0, slotsText(f.slots), ""]);
    Object.keys(r.tactical || {}).forEach(function (id) { var c = C.cards[id], n = r.tactical[id]; if (!c || !n) return;
      var sl = {}; Object.keys(c.slots).forEach(function (s) { sl[s] = c.slots[s] * n; });
      rows.push(["Tactical Card", c.name + (n > 1 ? " x" + n : ""), "", "", "", "", "", "", c.gas_cost * n, slotsText(sl), ""]); });
    if (r.creepId && C.cards[r.creepId]) rows.push(["Creep Card", C.cards[r.creepId].name, "", "", "", "", "", "", C.cards[r.creepId].gas_cost, "", ""]);
    var t = C.totals(r); rows.push(["Total", "", "", "", t.supply, "", "", t.minerals, t.gas, "", ""]);
    return "﻿" + rows.map(function (row) { return row.map(csvCell).join(","); }).join("\r\n") + "\r\n";
  }
  function jsonFile(C, r) { return JSON.stringify(C.exportable(r), null, 2) + "\n"; }

  var DOC_CSS = "body{margin:0;background:#D9DDE2;color:#09202E;font-family:'Noto Sans',Arial,sans-serif;-webkit-print-color-adjust:exact;print-color-adjust:exact}" +
    ".page{max-width:980px;margin:0 auto;padding:24px 16px 40px;display:flex;flex-direction:column;gap:18px}" +
    ".paper{background:#fff;padding:22px;border-radius:6px;box-shadow:0 1px 4px rgba(0,0,0,.12)}" +
    ".doc-h{font-family:'Saira','Noto Sans',sans-serif;font-stretch:87.5%;font-weight:700;letter-spacing:.1em;font-size:15px;margin:8px 0 -6px;color:#2a3a48}" +
    ".grid2{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}" +
    ".foot{font-size:11px;color:#5d6670;text-align:center}" +
    "@media (max-width:700px){.grid2{grid-template-columns:minmax(0,1fr)}}" +
    "@media print{body{background:#fff}.page{padding:0;max-width:none}.paper{box-shadow:none;padding:0}.sc-card,.sc-mission{box-shadow:none;border:1px solid #bbb}.doc-h{break-after:avoid}.brk{break-before:page}}";
  var FONT_LINK = '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Noto+Sans:wdth,wght@62.5..100,400..900&family=Saira:wdth,wght@75..100,500..700&display=swap">';

  function docShell(title, body) {
    return "<!doctype html>\n<html lang=\"en\"><head><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\"><title>" + esc(title) + "</title>" + FONT_LINK +
      "<style>" + DOC_CSS + "\n" + CARD_CSS + "</style></head><body><main class=\"page\">" + body +
      '<p class="foot">Built with SurgeCraft · Unit data from the unit cards; costs from the Unit Cost Table (September 2026) · Printing: use your browser\'s Print command.</p></main></body></html>\n';
  }
  function rosterSheetDoc(C, r, src, opts) {
    opts = opts || {};
    return docShell((r.name || "Roster") + " — Army Roster", '<div class="paper">' + sheetHTML(C, r, src, { art: opts.art !== false, checks: true }) + "</div>");
  }
  function fieldManualDoc(C, r, src) {
    var lim = C.limits(r), side = lim.scale.side, body = '<div class="paper">' + sheetHTML(C, r, src, { art: !src || !!src(ART.race(r.race || "Terran")), checks: true }) + "</div>";
    if (r.units.length) {
      body += '<h2 class="doc-h brk">UNIT CARDS</h2>';
      r.units.forEach(function (e) { var u = C.units[e.unitId]; if (u) body += unitCardHTML(C, u, e, src); });
      // summoned units the army can bring onto the table (referenced by SUMMON or faction abilities)
      var summoned = summonedFor(C, r);
      summoned.forEach(function (u) { body += unitCardHTML(C, u, null, src); });
    }
    var f = C.faction(r), cardsHTML = "";
    if (f) cardsHTML += tacCardHTML(C, f, src);
    if (r.creepId && C.cards[r.creepId]) cardsHTML += tacCardHTML(C, C.cards[r.creepId], src);
    Object.keys(r.tactical || {}).forEach(function (id) { if (r.tactical[id] && C.cards[id]) cardsHTML += tacCardHTML(C, C.cards[id], src, r.tactical[id]); });
    if (cardsHTML) body += '<h2 class="doc-h brk">FACTION &amp; TACTICAL CARDS</h2>' + cardsHTML;
    var ms = (r.missions || []).filter(function (id) { return C.missions[id]; });
    if (ms.length) body += '<h2 class="doc-h brk">MISSION CARDS</h2><div class="grid2">' + ms.map(function (id) { return missionCardHTML(C.missions[id], side); }).join("") + "</div>";
    var ds = (r.deployments || []).filter(function (id) { return C.deployments[id]; });
    if (ds.length) body += '<h2 class="doc-h brk">DEPLOYMENT CARDS</h2><div class="grid2">' + ds.map(function (id) { return deploymentCardHTML(C.deployments[id], side, src); }).join("") + "</div>";
    return docShell((r.name || "Roster") + " — Field Manual", body);
  }
  function summonedFor(C, r) {
    var out = [], seen = {};
    var texts = [];
    r.units.forEach(function (e) { var u = C.units[e.unitId]; if (u) u.abilities.concat(u.upgrades).forEach(function (a) { if (a.text) texts.push(a.text); }); });
    var f = C.faction(r); if (f) f.abilities.forEach(function (a) { texts.push(a.text); });
    Object.keys(r.tactical || {}).forEach(function (id) { var c = C.cards[id]; if (c) c.abilities.forEach(function (a) { texts.push(a.text); }); });
    var blob = texts.join(" ");
    C.data.units.forEach(function (u) {
      if (!u.summoned || seen[u.id]) return;
      var short = u.name.replace(/\s*\(.*\)$/, "");
      if (blob.indexOf(short) !== -1) { seen[u.id] = true; out.push(u); }
    });
    return out;
  }
  /* image paths an HTML export needs (for embedding as data URIs) */
  function imagesFor(C, r, kind) {
    var set = {};
    if (r.race) set[ART.race(r.race)] = 1;
    r.units.forEach(function (e) { set[ART.mini(e.unitId)] = 1; if (kind === "manual") { set[ART.unit(e.unitId)] = 1; var u = C.units[e.unitId]; if (u) set[ART.race(u.race)] = 1; } });
    if (kind === "manual") {
      summonedFor(C, r).forEach(function (u) { set[ART.unit(u.id)] = 1; });
      if (r.factionId) set[ART.card(r.factionId)] = 1;
      var sd = C.limits(r).scale.side;
      (r.deployments || []).forEach(function (id) { set[ART.deploy(id, sd)] = 1; });
      if (r.creepId) set[ART.card(r.creepId)] = 1;
      Object.keys(r.tactical || {}).forEach(function (id) { if (r.tactical[id]) set[ART.card(id)] = 1; });
    }
    return Object.keys(set);
  }

  var R = {
    ART: ART, PHASES: PHASES, PHASE_NAME: PHASE_NAME, CARD_CSS: CARD_CSS, esc: esc, fmt: fmt, richText: richText,
    typePill: typePill, abilityBox: abilityBox, weaponTable: weaponTable, unitCardHTML: unitCardHTML, tacCardHTML: tacCardHTML,
    missionCardHTML: missionCardHTML, deploymentCardHTML: deploymentCardHTML, sheetHTML: sheetHTML, slotsText: slotsText, summonedFor: summonedFor, imagesFor: imagesFor,
    exports: { textFull: textFull, textCompact: textCompact, markdown: markdown, csv: csv, json: jsonFile, rosterSheetDoc: rosterSheetDoc, fieldManualDoc: fieldManualDoc }
  };
  if (typeof module !== "undefined" && module.exports) module.exports = R; else root.Render = R;
})(typeof window !== "undefined" ? window : this);
