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
  /* opts.face (card-size printing, like the official two-sided card): "front" = art, stats, abilities, weapons and tags;
     "back" = the upgrade face (every upgrade by phase) plus the fine print. Omitted = the whole card on one face. */
  function unitCardHTML(C, u, entry, src, opts) {
    src = src || identity; opts = opts || {};
    var fielded = !!(opts.fielded && entry), face = opts.face || "", back = face === "back";
    var st = u.stats, lo = entry ? C.loadout(entry) : null, comp = entry ? C.composition(entry) : null;
    var takenNames = {}; if (entry) entry.upgrades.forEach(function (n) { takenNames[n] = true; });
    var artSrc = back ? "" : src(ART.unit(u.id)), emb = src(ART.race(u.race));
    var h = '<article class="sc-card' + (artSrc ? "" : " sc-noart") + (face ? " sc-face-" + face : "") + '" data-race="' + esc(u.race) + '">';
    if (artSrc) h += '<div class="sc-art' + (u.provisional ? " sc-pvart" : "") + '"><img src="' + esc(artSrc) + '" alt="' + esc(u.name) + ' miniatures" loading="lazy"></div>';
    h += '<div class="sc-body">';
    // title bar
    h += '<header class="sc-title"><div class="sc-tl"><h3>' + esc(u.name.toUpperCase()) + "</h3>" +
      '<div class="sc-meta">' + (u.army_slot ? '<span><em>ARMY SLOT:</em> ' + esc(u.army_slot.toUpperCase()) + "</span>" : '<span><em>SUMMONED UNIT</em></span>') +
      (u.combat_role ? '<span><em>COMBAT ROLE:</em> ' + esc(String(u.combat_role).toUpperCase()) + "</span>" : "") + (u.unique ? '<span class="sc-uq">UNIQUE</span>' : "") + (u.provisional ? '<span class="sc-pv" title="Transcribed from a preview, not the printed card">PREVIEW</span>' : "") + (back ? '<span class="sc-backtag">&#9650; UPGRADES</span>' : "") + "</div></div>" +
      (emb ? '<img class="sc-emb" src="' + esc(emb) + '" alt="" loading="lazy">' : "") + "</header>";
    if (!back) {
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
    }
    // upgrades
    if (u.upgrades.length && !fielded && face !== "front") {
      if (!back) h += '<div class="sc-upband">&#9650; UPGRADES</div>';
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
    if (!back) h += '<footer class="sc-foot"><span><em>COMBAT TAGS:</em> ' + esc(u.combat_tags.join(", ").toUpperCase()) + "</span>" +
      '<span class="sc-ftags">' + u.faction_tags.map(function (t) { return '<i>' + esc(t.toUpperCase()) + "</i>"; }).join("") + "</span></footer>";
    var fine = []; if (u.base_mm) fine.push(/\d/.test(String(u.base_mm)) ? "Base Ø " + u.base_mm + (typeof u.base_mm === "number" ? "mm" : "") : "Base: " + u.base_mm);
    if (u.card_version) fine.push("Card " + u.card_version);
    if (u.compositions && u.compositions.length) fine.push("Cost table: " + u.compositions.map(function (c) { return c.models + " models " + c.minerals + " / Supply " + c.supply; }).join(" · "));
    (u.corrections || []).forEach(function (x) { fine.push("Corrected: " + x); });
    (u.notes || []).forEach(function (x) { fine.push("Note: " + x); });
    if (face !== "front" || !u.upgrades.length) h += '<div class="sc-fine">' + fine.map(esc).join("<br>") + "</div>";
    h += "</div></article>";
    return h;
  }

  /* ---------- TACTICAL / FACTION / CREEP CARD ---------- */
  function slotsText(slots) {
    var k = Object.keys(slots);
    return k.length ? k.map(function (s) { return slots[s] + " × " + s.toUpperCase(); }).join(", ") : "-";
  }
  function tacFaceHTML(C, c, src, face) {
    var art = face === "art", artSrc = art ? src(ART.card(c.id)) : "";
    var h = '<article class="sc-card sc-tac sc-noart sc-tface-' + face + '" data-race="' + esc(c.race) + '"><div class="sc-body">' +
      '<header class="sc-title"><div class="sc-tl"><h3>' + esc(c.name.toUpperCase()) + "</h3>";
    if (art) h += '<div class="sc-meta"><span><em>' + esc(c.kind.toUpperCase()) + " CARD</em></span>" + (c.unique ? '<span class="sc-uq">UNIQUE</span>' : "") +
      (c.gas_cost != null && c.kind !== "Faction" ? '<span class="sc-gas">' + c.gas_cost + " VESPENE GAS</span>" : "") + "</div>";
    h += "</div>" + (!art && c.resource && c.resource.value != null ? '<span class="sc-res">' + esc(c.resource.type) + ": " + esc(c.resource.value) + "</span>" : "") + "</header>";
    if (art) {
      h += '<div class="sc-tfart">' + (artSrc ? '<img src="' + esc(artSrc) + '" alt="" loading="lazy">' : "") + "</div>";
      h += '<footer class="sc-foot"><span><em>SUPPLY:</em> ' + esc(slotsText(c.slots)) + '</span><span class="sc-ftags">' + c.faction_tags.map(function (t) { return "<i>" + esc(t.toUpperCase()) + "</i>"; }).join("") + "</span></footer>";
    } else {
      PHASES.forEach(function (p) {
        var ab = c.abilities.filter(function (a) { return a.phase === p; });
        if (ab.length) h += '<section class="sc-sec">' + phaseHead(p) + ab.map(function (a) { return abilityBox(a); }).join("") + "</section>";
      });
      var fine = []; if (c.card_version) fine.push("Card " + c.card_version);
      (c.corrections || []).forEach(function (x) { fine.push("Corrected: " + x); });
      (c.notes || []).forEach(function (x) { fine.push("Note: " + x); });
      if (fine.length) h += '<div class="sc-fine">' + fine.map(esc).join("<br>") + "</div>";
    }
    return h + "</div></article>";
  }

  /* opts.face (card-size printing, like the official folded card): "art" = name, card type, art, army-slot supply and
     faction; "rules" = name, resource cost (CP/BM/PE), abilities and fine print. Omitted = the whole card on one face. */
  function tacCardHTML(C, c, src, count, opts) {
    src = src || identity; opts = opts || {};
    if (opts.face) return tacFaceHTML(C, c, src, opts.face);
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
    "@media print{.foot{display:none}body{background:#fff}.page{padding:0;max-width:none}.paper{box-shadow:none;padding:0}.sc-card,.sc-mission{box-shadow:none;border:1px solid #bbb}.doc-h{break-after:avoid}.brk{break-before:page}}";
  var FONT_LINK = '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Noto+Sans:wdth,wght@62.5..100,400..900&family=Saira:wdth,wght@75..100,500..700&display=swap">';

  /* ---------- CARD-SIZE PRINTING ----------
     One face of a printed unit card: the cut line in the v1.09.26 update PDFs is 459.2 x 606.4 pt,
     folded in half, so each face is 459.2 x 303.2 pt = 162 x 107 mm (landscape). */
  var CARD_MM = { w: 162, h: 107 };
  /* Faction, tactical and creep cards: cut line 249.4 x 356.9 pt in the update PDFs, printed turned 90 degrees and folded
     in half, so each face is 178.5 x 249.4 pt = 63 x 88 mm upright (standard playing-card size). */
  var TAC_MM = { w: 63, h: 88 };
  /* Compact print style. Sizes are in CSS px at real scale (1pt = 1.333px), copied from the official card's type:
     title 14pt, stat values 15pt, phase headers 8pt, ability and weapon text 7pt, keyword pills 6pt, labels 5pt. */
  var K = ".cs-wrap ";
  var CARDSIZE_CSS = ".cs-list{display:flex;flex-direction:column;align-items:center;gap:6mm}" +
    ".cs-pair{display:flex;flex-direction:column;align-items:center;gap:3mm;break-inside:avoid;page-break-inside:avoid}" +
    ".cs-wrap{width:" + CARD_MM.w + "mm;height:" + CARD_MM.h + "mm}" +
    ".cs-wrap{box-sizing:border-box;flex:none;overflow:hidden;border-radius:3mm;position:relative;break-inside:avoid;page-break-inside:avoid;background:#EDEDED;box-shadow:0 1px 3px rgba(0,0,0,.18)}" +
    ".cs-wrap>.sc-card{position:absolute;left:0;top:0;transform-origin:0 0;border-radius:0;box-shadow:none;border:0;grid-template-columns:minmax(0,30%) minmax(0,1fr);font-size:9.33px;line-height:1.25}" +
    ".cs-wrap>.sc-card.sc-noart{grid-template-columns:minmax(0,1fr)}" +
    K + ".sc-art{position:relative;height:auto;min-height:0}" + K + ".sc-art img{position:absolute;inset:0;width:100%;height:100%;object-position:center 30%}" +
    K + ".sc-body{gap:3px;padding:0 0 4px}" +
    K + ".sc-statrow," + K + ".sc-sec," + K + ".sc-fielded," + K + ".sc-upband," + K + ".sc-upw," + K + ".sc-foot," + K + ".sc-fine{margin-inline:6px}" +
    K + ".sc-title{gap:6px;padding:4px 8px 5px;clip-path:polygon(0 0,100% 0,100% 100%,10px 100%,0 calc(100% - 10px))}" +
    K + ".sc-title h3{font-size:18.7px;line-height:1}" + K + ".sc-meta{font-size:6.7px;gap:2px 8px;margin-top:2px}" +
    K + ".sc-uq," + K + ".sc-backtag{padding:0 4px}" + K + ".sc-backtag{background:#fff;color:var(--race-3);border-radius:2px;letter-spacing:.06em}" +
    K + ".sc-emb{width:24px;height:24px;padding:3px}" +
    K + ".sc-statrow{gap:6px}" + K + ".sc-stats{gap:3px}" + K + ".sc-st{min-width:26px}" + K + ".sc-st span{font-size:6.5px;letter-spacing:.02em}" +
    K + ".sc-st b{font-size:20px;min-width:26px;padding:0 4px;line-height:1.1;clip-path:polygon(4px 0,100% 0,100% calc(100% - 4px),calc(100% - 4px) 100%,0 100%,0 4px)}" +
    K + ".sc-sup{font-size:8px;margin-left:auto}" + K + ".sc-sup th{font-size:6.5px;padding:1px 4px}" + K + ".sc-sup td{padding:0 4px}" +
    K + ".sc-fielded{font-size:8px;padding:1px 6px}" +
    K + ".sc-sec{gap:3px}" + K + ".sc-ph{gap:4px;border-bottom-width:1.5px}" +
    K + ".sc-phtab{font-size:10.7px;gap:4px;padding:1px 10px 0 5px}" + K + ".sc-ico svg{width:10px;height:10px}" + K + ".sc-phx{font-size:7px}" +
    K + ".sc-ab{padding:2px 6px;border-width:1px;clip-path:polygon(0 0,100% 0,100% calc(100% - 6px),calc(100% - 6px) 100%,0 100%)}" +
    K + ".sc-pill{font-size:8px;padding:0 3px}" + K + ".sc-cost{font-size:8px}" + K + ".sc-uptag{font-size:6.7px;margin-bottom:1px}" +
    K + ".sc-wt{font-size:9.33px}" + K + ".sc-wt th{font-size:8.8px;padding:1px 3px}" + K + ".sc-wt td{padding:1px 3px}" + K + ".sc-wt td:last-child{font-size:8.5px}" +
    K + ".sc-for{font-size:6.7px}" + K + ".sc-upband{font-size:8px;padding:1px 6px;margin-top:2px}" + K + ".sc-upw{padding:2px 3px 1px;border-width:1px}" + K + ".sc-upw.sc-taken{padding-left:7px}" + K + ".sc-ab.sc-taken{padding-left:9px}" +
    K + ".sc-foot{font-size:8px;padding:2px 6px;gap:3px 8px}" + K + ".sc-ftags i{font-size:7.5px;padding:0 5px}" +
    K + ".sc-fine{font-size:6.7px;line-height:1.3}" +
    ".cs-tacs{display:flex;flex-wrap:wrap;justify-content:center;gap:4mm 2.5mm}" +
    ".cs-tpair{display:flex;flex-direction:column;break-inside:avoid;page-break-inside:avoid}" +
    ".cs-tpair>.cs-wrap{width:" + TAC_MM.w + "mm;height:" + TAC_MM.h + "mm}" +
    ".cs-tpair>.cs-wrap:first-child{border-bottom-left-radius:0;border-bottom-right-radius:0}.cs-tpair>.cs-wrap+.cs-wrap{border-top-left-radius:0;border-top-right-radius:0}" +
    ".cs-wrap>.sc-card.sc-tface-art{display:flex;flex-direction:column}" + K + ".sc-tface-art .sc-body{flex:1 1 auto}" + K + ".sc-res{font-size:9px;padding:2px 5px}" +
    K + ".sc-tfart{position:relative;flex:1 1 auto;min-height:24mm;margin-inline:6px;border-radius:2px;background:radial-gradient(circle at 50% 42%,var(--race-2),var(--race-3))}" +
    K + ".sc-tfart img{position:absolute;inset:6px;width:calc(100% - 12px);height:calc(100% - 12px);object-fit:contain;filter:drop-shadow(0 4px 6px rgba(0,0,0,.45))}" +
    "@media print{.cs-tacs{gap:3mm 2.5mm}.cs-list{gap:5mm}.cs-wrap{box-shadow:none;border:.3mm solid #999}.cs-wrap>.sc-card{border:0}}";
  /* Shrinks a card face's content only if it doesn't fit at the official type sizes (too tall, or a weapon table too wide). The card is laid out wider (W / z) and
     scaled by z, so text wraps at the reduced size instead of being clipped. Runs in the exported page
     (on load and after fonts load, never during print layout, where a card split across pages measures wrong) and in the app's export preview. */
  function fitCards(root) {
    var boxes = (root || document).querySelectorAll(".cs-wrap");
    for (var i = 0; i < boxes.length; i++) {
      var box = boxes[i], card = box.firstElementChild; if (!card) continue;
      var W = box.clientWidth, H = box.clientHeight; if (!W || !H) continue;
      // zoom shrinks the layout box itself, so a printed card never fragments across pages; transform is the fallback
      var useZoom = typeof CSS !== "undefined" && CSS.supports && CSS.supports("zoom", "0.5");
      var tws = card.querySelectorAll(".sc-tw");
      var wide = function () { for (var j = 0; j < tws.length; j++) if (tws[j].scrollWidth > tws[j].clientWidth + 1) return true; return false; };
      var fits = function (z) {
        card.style.width = (W / z) + "px"; card.style.minHeight = "0";
        if (useZoom) { card.style.transform = ""; card.style.zoom = z; return card.getBoundingClientRect().height <= box.getBoundingClientRect().height + 0.5 && !wide(); }
        card.style.transform = "scale(" + z + ")"; return card.offsetHeight * z <= H + 0.5 && !wide();
      };
      var lo = 0.3, hi = 1;
      if (fits(1)) lo = 1; else { for (var k = 0; k < 14; k++) { var mid = (lo + hi) / 2; if (fits(mid)) lo = mid; else hi = mid; } }
      fits(lo); card.style.minHeight = (H / lo) + "px"; box.setAttribute("data-scale", lo.toFixed(3));
    }
  }
  var FIT_SCRIPT = "<script>(function(){var fit=" + fitCards.toString() + ";function run(){if(window.matchMedia&&matchMedia('print').matches)return;fit(document);}" +
    "if(document.readyState!=='loading')run();else document.addEventListener('DOMContentLoaded',run);" +
    "window.addEventListener('load',run);if(document.fonts&&document.fonts.ready)document.fonts.ready.then(run);})();<\/script>";

  function docShell(title, body, extra) {
    extra = extra || {};
    return "<!doctype html>\n<html lang=\"en\"><head><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\"><title>" + esc(title) + "</title>" + FONT_LINK +
      "<style>" + DOC_CSS + "\n" + CARD_CSS + (extra.css ? "\n" + extra.css : "") + "</style></head><body><main class=\"page\">" + body + (extra.script || "") +
      '<p class="foot">Built with SurgeCraft · Unit data from the unit cards; costs from the Unit Cost Table (September 2026) · Printing: use your browser\'s Print command.</p></main></body></html>\n';
  }
  function rosterSheetDoc(C, r, src, opts) {
    opts = opts || {};
    return docShell((r.name || "Roster") + " — Army Roster", '<div class="paper">' + sheetHTML(C, r, src, { art: opts.art !== false, checks: true }) + "</div>");
  }
  function fieldManualDoc(C, r, src, opts) {
    opts = opts || {};
    var cs = !!opts.cardSize; // 162 x 107 mm front and upgrade faces, 2 per page
    var wrapCard = function (html) { return cs ? '<div class="cs-wrap">' + html + "</div>" : html; };
    var lim = C.limits(r), side = lim.scale.side, body = '<div class="paper">' + sheetHTML(C, r, src, { art: !src || !!src(ART.race(r.race || "Terran")), checks: true }) + "</div>";
    if (r.units.length) {
      body += '<h2 class="doc-h brk">UNIT CARDS</h2>';
      var items = [];
      r.units.forEach(function (e) { var u = C.units[e.unitId]; if (u) items.push([u, e]); });
      // summoned units the army can bring onto the table (referenced by SUMMON or faction abilities)
      summonedFor(C, r).forEach(function (u) { items.push([u, null]); });
      if (!cs) items.forEach(function (it) { body += unitCardHTML(C, it[0], it[1], src); });
      else {
        // a front face and, when the unit has upgrades, an upgrade face, kept together on one page
        body += '<div class="cs-list">';
        items.forEach(function (it) { var u = it[0], e = it[1];
          body += '<div class="cs-pair">' + wrapCard(unitCardHTML(C, u, e, src, { face: "front" })) + (u.upgrades.length ? wrapCard(unitCardHTML(C, u, e, src, { face: "back" })) : "") + "</div>"; });
        body += "</div>";
      }
    }
    var f = C.faction(r), cardsHTML = "";
    // card size: each card as its two 63 x 88 mm faces (art over rules), one physical copy per card taken
    var tac = function (c, n) {
      if (!cs) return tacCardHTML(C, c, src, n);
      var one = '<div class="cs-tpair">' + wrapCard(tacCardHTML(C, c, src, 1, { face: "art" })) + wrapCard(tacCardHTML(C, c, src, 1, { face: "rules" })) + "</div>";
      return new Array((n || 1) + 1).join(one);
    };
    if (f) cardsHTML += tac(f);
    if (r.creepId && C.cards[r.creepId]) cardsHTML += tac(C.cards[r.creepId]);
    Object.keys(r.tactical || {}).forEach(function (id) { if (r.tactical[id] && C.cards[id]) cardsHTML += tac(C.cards[id], r.tactical[id]); });
    if (cs && cardsHTML) cardsHTML = '<div class="cs-tacs">' + cardsHTML + "</div>";
    if (cardsHTML) body += '<h2 class="doc-h brk">FACTION &amp; TACTICAL CARDS</h2>' + cardsHTML;
    var ms = (r.missions || []).filter(function (id) { return C.missions[id]; });
    if (ms.length) body += '<h2 class="doc-h brk">MISSION CARDS</h2><div class="grid2">' + ms.map(function (id) { return missionCardHTML(C.missions[id], side); }).join("") + "</div>";
    var ds = (r.deployments || []).filter(function (id) { return C.deployments[id]; });
    if (ds.length) body += '<h2 class="doc-h brk">DEPLOYMENT CARDS</h2><div class="grid2">' + ds.map(function (id) { return deploymentCardHTML(C.deployments[id], side, src); }).join("") + "</div>";
    return docShell((r.name || "Roster") + " — Field Manual", body, cs ? { css: CARDSIZE_CSS, script: FIT_SCRIPT } : null);
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
  /* ---------- REFERENCE SHEET (compact table reference, aimed at 1–2 A4 pages) ----------
     Every value is copied from the unit card data unchanged; only the layout is condensed.
     Ability text is left out (names, phase, type and cost only). Identical entries are merged as "2×". */
  var PHASE_ORDER = { Movement: 0, Assault: 1, Combat: 2, Any: 3 };

  /* The weapons a fielded Unit carries: base weapons with non-SPECIALIST replacements swapped in place,
     extra upgrade weapons appended, SPECIALIST weapons listed with the model that carries them. */
  function fieldedWeapons(C, u, entry) {
    var ups = entry ? entry.upgrades.map(function (n) { return C.upgradeDef(entry, n); }).filter(function (x) { return x && x.kind === "weapon"; }) : [];
    var swap = {}, extra = [], spec = [];
    ups.forEach(function (x) {
      if (x.specialist) spec.push({ w: x, model: (entry.specialists && entry.specialists[x.name]) || null, forName: x.replaces || null });
      else if (x.replaces) swap[x.replaces] = x;
      else extra.push({ w: x, model: null, forName: null });
    });
    var rows = u.weapons.map(function (w) { var s = swap[w.name]; return s ? { w: s, model: null, forName: w.name } : { w: w, model: null, forName: null }; });
    rows = rows.concat(extra, spec);
    return rows.map(function (r, i) { r.i = i; return r; })
      .sort(function (a, b) { return ((PHASE_ORDER[a.w.phase] || 0) - (PHASE_ORDER[b.w.phase] || 0)) || (a.i - b.i); });
  }
  function fieldedAbilities(C, u, entry) {
    var out = u.abilities.map(function (a) { return { a: a, up: false }; });
    if (entry) entry.upgrades.forEach(function (n) { var x = C.upgradeDef(entry, n); if (x && x.kind !== "weapon") out.push({ a: x, up: true }); });
    return out.map(function (r, i) { r.i = i; return r; })
      .sort(function (a, b) { return ((PHASE_ORDER[a.a.phase] || 0) - (PHASE_ORDER[b.a.phase] || 0)) || (a.i - b.i); });
  }
  /* Merge entries that are the same unit, model count, upgrades and SPECIALIST nominations. */
  function groupEntries(C, r) {
    var groups = [], byKey = {};
    r.units.forEach(function (e) {
      if (!C.units[e.unitId]) return;
      var sp = Object.keys(e.specialists || {}).filter(function (n) { return e.upgrades.indexOf(n) !== -1; }).sort().map(function (n) { return n + "=" + e.specialists[n]; });
      var key = [e.unitId, e.models, e.upgrades.slice().sort().join("|"), sp.join("|")].join("#");
      if (byKey[key]) byKey[key].count++; else { byKey[key] = { entry: e, count: 1 }; groups.push(byKey[key]); }
    });
    return groups;
  }
  function refUnitHTML(C, u, entry, count) {
    var st = u.stats, h = '<section class="rf-u" data-race="' + esc(u.race) + '">';
    // header: name, stat line, fielded size and cost
    var stats = [["SPEED", st.speed], ["ARMOUR", st.armour], ["EVADE", st.evade], ["HP", st.hp]];
    if (st.shield != null) stats.push(["SHIELD", st.shield]);
    stats.push(["SIZE", st.size]);
    h += '<div class="rf-uh"><div class="rf-nm"><b>' + (count > 1 ? count + "× " : "") + esc(u.name.toUpperCase()) + "</b>" +
      (u.unique ? ' <span class="rf-tag">UNIQUE</span>' : "") + (u.provisional ? ' <span class="rf-tag">PREVIEW</span>' : "") + "</div>";
    h += '<div class="rf-stats">' + stats.map(function (s) { return '<span class="' + (s[0] === "SHIELD" ? "rf-sh" : "") + '"><i>' + s[0] + "</i><b>" + esc(s[1]) + "</b></span>"; }).join("") + "</div>";
    if (entry) {
      var c = C.entryCost(entry);
      h += '<div class="rf-cost">' + entry.models + " model" + (entry.models > 1 ? "s" : "") + " · " + esc(u.army_slot) + " · Supply " + c.supply + " · <b>" + c.total + "</b>" +
        (count > 1 ? " each (" + fmt(c.total * count) + ")" : "") + "</div>";
    } else h += '<div class="rf-cost">Summoned Unit</div>';
    h += "</div>";
    // weapons
    var ws = fieldedWeapons(C, u, entry);
    if (ws.length) {
      h += '<table class="rf-wt"><thead><tr><th>Phase</th><th>Name</th><th>RNG</th><th>Target</th><th>RoA</th><th>Hit</th><th>Surge type</th><th>S Dice</th><th>Dmg</th><th>Keyword</th></tr></thead><tbody>';
      ws.forEach(function (x) {
        var w = x.w, note = [];
        if (x.model) note.push("model " + x.model); else if (x.w.specialist) note.push("model ?");
        if (x.forName) note.push("for " + x.forName);
        h += "<tr><td class=\"rf-ph\">" + esc(w.phase) + '</td><td class="rf-wn">' + esc(w.name) + (note.length ? ' <span class="rf-note">' + esc(note.join(", ")) + "</span>" : "") + "</td><td>" + esc(w.rng) + "</td><td>" + esc(w.target) + "</td><td>" + esc(w.roa) + "</td><td>" + esc(w.hit) +
          "</td><td>" + esc(w.surge_type) + "</td><td>" + esc(w.s_dice) + "</td><td>" + esc(w.dmg) + '</td><td class="rf-kw">' + esc(w.keywords.join(", ") || "-") + "</td></tr>";
      });
      h += "</tbody></table>";
    }
    // abilities by name only, with phase, type and cost as printed
    var ab = fieldedAbilities(C, u, entry);
    if (ab.length) h += '<p class="rf-line"><i>Abilities</i>' + ab.map(function (x) {
      var a = x.a, meta = [PHASE_NAME[a.phase] || a.phase, a.type, a.cost].filter(Boolean).join(" · ");
      return '<span class="rf-ab' + (x.up ? " rf-up" : "") + '">' + esc(a.name) + (x.up ? "&#9650;" : "") + ' <span class="rf-note">' + esc(meta) + "</span></span>";
    }).join("") + "</p>";
    // upgrades taken, with their cost at this composition
    if (entry && entry.upgrades.length) h += '<p class="rf-line"><i>Upgrades</i>' + entry.upgrades.map(function (n) {
      var x = C.upgradeDef(entry, n), cost = C.upgradeCost(entry, n), m = entry.specialists && entry.specialists[n], bits = [];
      if (x && x.specialist) bits.push("model " + (m || "?"));
      if (x && x.replaces) bits.push("replaces " + x.replaces);
      return '<span class="rf-ab">' + esc(n) + (bits.length ? ' <span class="rf-note">' + esc(bits.join(", ")) + "</span>" : "") + (typeof cost === "number" ? ' <span class="rf-min">' + cost + "</span>" : "") + "</span>";
    }).join("") + "</p>";
    h += '<p class="rf-line rf-tags"><i>Combat tags</i>' + esc(u.combat_tags.join(", ")) +
      (u.combat_role ? '<span class="rf-sep"></span><i>Combat role</i>' + esc(u.combat_role) : "") +
      '<span class="rf-sep"></span><i>Models / Supply</i>' + u.supply_profile.map(function (b) { return esc(b.models) + ": " + b.supply; }).join(" · ") + "</p>";
    return h + "</section>";
  }
  /* Keywords the army uses: weapon keywords on fielded weapons, plus keywords named in the text of the
     army's abilities (units, taken upgrades, summoned units, Faction / Tactical / Creep Cards). */
  function refKeywords(C, r, KW) {
    if (!KW) return [];
    var seen = {}, texts = [];
    function scan(s) { KW.find(String(s || "")).forEach(function (x) { seen[x.id] = true; }); }
    r.units.forEach(function (e) {
      var u = C.units[e.unitId]; if (!u) return;
      fieldedWeapons(C, u, e).forEach(function (x) { x.w.keywords.forEach(scan); });
      fieldedAbilities(C, u, e).forEach(function (x) { texts.push(x.a.text); });
    });
    summonedFor(C, r).forEach(function (u) { u.weapons.forEach(function (w) { w.keywords.forEach(scan); }); u.abilities.forEach(function (a) { texts.push(a.text); }); });
    var cards = [C.faction(r)].concat(Object.keys(r.tactical || {}).filter(function (id) { return r.tactical[id]; }).map(function (id) { return C.cards[id]; }), r.creepId ? [C.cards[r.creepId]] : []);
    cards.forEach(function (c) { if (c) c.abilities.forEach(function (a) { texts.push(a.text); }); });
    texts.forEach(scan);
    return KW.list.filter(function (k) { return seen[k.id]; }).sort(function (a, b) { return a.term < b.term ? -1 : a.term > b.term ? 1 : 0; });
  }
  function refGlossaryHTML(list) {
    if (!list.length) return "";
    return '<section class="rf-gl"><h3>KEYWORD GLOSSARY <span>Full Rules, Part 11 · keywords used by this army</span></h3><div class="rf-glc">' + list.map(function (k) {
      var h = "", ul = false;
      k.body.forEach(function (b) {
        if (b[0] === "li") { if (!ul) { h += "<ul>"; ul = true; } h += "<li>" + richText(b[1]) + "</li>"; }
        else { if (ul) { h += "</ul>"; ul = false; } h += "<p>" + richText(b[1]) + "</p>"; }
      });
      if (ul) h += "</ul>";
      return '<div class="rf-ge"><b class="rf-gh">' + esc(k.head) + "</b>" + h + "</div>";
    }).join("") + "</div></section>";
  }
  function referenceSheetHTML(C, r, opts) {
    opts = opts || {};
    var f = C.faction(r), t = C.totals(r), lim = C.limits(r), side = lim.scale.side;
    var errs = C.validate(r).filter(function (x) { return x.level === "error"; });
    var h = '<div class="rf"><header class="rf-h"><div class="rf-ht"><h2>' + esc(r.name || "Roster") + "</h2>" +
      '<span class="rf-status ' + (errs.length ? "bad" : "ok") + '">' + (errs.length ? errs.length + " RULES ISSUE" + (errs.length > 1 ? "S" : "") : "LEGAL") + "</span></div>" +
      '<div class="rf-hm"><span><i>Player</i>' + esc(r.player || "—") + "</span><span><i>Faction</i>" + esc((r.race || "—") + (f ? " · " + f.name : "")) + "</span>" +
      "<span><i>" + esc(lim.scale.name) + "</i>" + fmt(t.minerals) + " / " + fmt(lim.minerals) + " Minerals</span><span><i>Gas</i>" + fmt(t.gas) + " / " + fmt(lim.gas) + "</span><span><i>Supply</i>" + t.supply + "</span></div>";
    function resTxt(c) { return c && c.resource && c.resource.value != null ? " (" + c.resource.type + ": " + c.resource.value + ")" : ""; }
    var cards = [];
    if (f) cards.push("<b>" + esc(f.name) + "</b>" + esc(resTxt(f)));
    Object.keys(r.tactical || {}).forEach(function (id) { var c = C.cards[id], n = r.tactical[id]; if (c && n) cards.push(esc(c.name + (n > 1 ? " ×" + n : "") + resTxt(c))); });
    if (r.creepId && C.cards[r.creepId]) cards.push(esc(C.cards[r.creepId].name) + ' <span class="rf-note">Creep</span>');
    h += '<p class="rf-line"><i>Cards</i>' + (cards.join(" · ") || "—") + "</p>";
    var ms = (r.missions || []).map(function (id) { return C.missions[id] ? C.missions[id].name : id; }), ds = (r.deployments || []).map(function (id) { return C.deployments[id] ? C.deployments[id][side] : id; });
    h += '<p class="rf-line"><i>Missions</i>' + esc(ms.join(", ") || "—") + '<span class="rf-sep"></span><i>Deployments</i>' + esc(ds.join(", ") || "—") + "</p></header>";
    if (errs.length) h += '<ul class="rf-issues">' + errs.map(function (x) { return "<li>" + esc(x.msg) + " <i>" + esc(x.ref) + "</i></li>"; }).join("") + "</ul>";
    groupEntries(C, r).forEach(function (g) { h += refUnitHTML(C, C.units[g.entry.unitId], g.entry, g.count); });
    var sm = summonedFor(C, r);
    if (sm.length) { h += '<h3 class="rf-sh">SUMMONED UNITS</h3>'; sm.forEach(function (u) { h += refUnitHTML(C, u, null, 1); }); }
    if (opts.glossary) h += refGlossaryHTML(refKeywords(C, r, opts.kw));
    return h + "</div>";
  }
  var REF_CSS = [
    "body{margin:0;background:#D9DDE2;color:#09202E;font-family:'Noto Sans',Arial,sans-serif;font-stretch:87.5%;font-size:8.6pt;line-height:1.3;-webkit-print-color-adjust:exact;print-color-adjust:exact}",
    ".sheet{box-sizing:border-box;width:210mm;max-width:100%;margin:16px auto;background:#fff;padding:9mm;box-shadow:0 1px 4px rgba(0,0,0,.15)}",
    ".rf i{font-style:normal}",
    ".rf-h{border-bottom:2px solid #09202E;padding-bottom:4px;margin-bottom:6px}",
    ".rf-ht{display:flex;align-items:baseline;gap:10px}",
    ".rf-h h2{margin:0;font-family:'Saira','Noto Sans',sans-serif;font-stretch:87.5%;font-weight:600;font-size:15pt;line-height:1.1;flex:1;min-width:0}",
    ".rf-status{font-weight:800;font-size:7.5pt;letter-spacing:.08em;padding:1px 6px;border-radius:2px;white-space:nowrap}.rf-status.ok{background:#DDF0E4;color:#1F6B41}.rf-status.bad{background:#F7DEDC;color:#A2231D}",
    ".rf-hm{display:flex;flex-wrap:wrap;gap:2px 14px;margin:3px 0 2px;font-weight:600}",
    ".rf-hm i,.rf-line>i{font-size:7pt;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:#5d6670;margin-right:4px}",
    ".rf-line{margin:2px 0 0}",
    ".rf-sep{display:inline-block;width:12px}",
    ".rf-note{color:#5d6670;font-size:7.5pt;font-weight:400}",
    ".rf-min{color:#1685C2;font-weight:800;font-size:7.5pt}",
    ".rf-issues{margin:0 0 6px;padding:3px 8px 3px 20px;background:#F7DEDC;color:#7D1B16;font-size:7.5pt}",
    ".rf-u{--race:#005BA4;border-left:3px solid var(--race);padding:3px 0 4px 6px;margin:0 0 5px;break-inside:avoid;page-break-inside:avoid}",
    ".rf-u[data-race=Protoss]{--race:#BD8A00}.rf-u[data-race=Zerg]{--race:#823287}",
    ".rf-uh{display:flex;flex-wrap:wrap;align-items:center;gap:2px 12px;margin-bottom:2px}",
    ".rf-nm b{font-family:'Saira','Noto Sans',sans-serif;font-stretch:87.5%;font-weight:700;font-size:10pt;letter-spacing:.02em}",
    ".rf-tag{font-size:6.5pt;font-weight:800;letter-spacing:.06em;border:1px solid #09202E;padding:0 3px;vertical-align:1px}",
    ".rf-stats{display:flex;gap:3px}",
    ".rf-stats span{display:inline-flex;align-items:baseline;gap:3px;background:#EEF0F2;padding:0 5px;border-radius:2px}",
    ".rf-stats i{font-size:6.5pt;font-weight:800;color:#5d6670;letter-spacing:.04em}",
    ".rf-stats b{font-size:9pt;font-variant-numeric:tabular-nums}",
    ".rf-stats .rf-sh{background:#DCEEFA}",
    ".rf-cost{margin-left:auto;font-weight:600;white-space:nowrap}.rf-cost b{color:#1685C2}",
    ".rf-wt{width:100%;border-collapse:collapse;margin:1px 0 2px;font-variant-numeric:tabular-nums;table-layout:fixed}",
    ".rf-wt th:nth-child(1){width:7%}.rf-wt th:nth-child(2){width:22%}.rf-wt th:nth-child(3),.rf-wt th:nth-child(5),.rf-wt th:nth-child(6),.rf-wt th:nth-child(9){width:5%}.rf-wt th:nth-child(4){width:7%}.rf-wt th:nth-child(7){width:9%}.rf-wt th:nth-child(8){width:6%}.rf-wt th:nth-child(10){width:29%}",
    ".rf-wt th{background:#6F6F6E;color:#fff;font-size:6.5pt;font-weight:700;letter-spacing:.03em;padding:1px 4px;text-align:center;white-space:nowrap}",
    ".rf-wt th:nth-child(1),.rf-wt th:nth-child(2),.rf-wt th:last-child{text-align:left}",
    ".rf-wt td{border-bottom:1px solid #DDE1E5;padding:1px 4px;text-align:center;white-space:nowrap}",
    ".rf-wt td.rf-ph{color:#5d6670;font-size:7.5pt;text-align:left}",
    ".rf-wt td.rf-wn{text-align:left;font-weight:700;white-space:normal}",
    ".rf-wt td.rf-kw{text-align:left;white-space:normal}",
    ".rf-ab{display:inline}.rf-ab+.rf-ab::before{content:' · ';color:#9aa0a6}",
    ".rf-up{font-weight:700}",
    ".rf-sh{font-family:'Saira','Noto Sans',sans-serif;font-stretch:87.5%;font-size:9pt;letter-spacing:.1em;margin:8px 0 4px;font-weight:700}",
    ".rf-gl{margin-top:8px;border-top:2px solid #09202E;padding-top:4px}",
    ".rf-gl h3{margin:0 0 4px;font-family:'Saira','Noto Sans',sans-serif;font-stretch:87.5%;font-size:9pt;letter-spacing:.1em}.rf-gl h3 span{font-family:'Noto Sans',Arial,sans-serif;font-size:7pt;letter-spacing:0;font-weight:400;color:#5d6670;margin-left:6px}",
    ".rf-glc{column-count:2;column-gap:7mm;font-size:7.5pt;line-height:1.28}",
    ".rf-ge{break-inside:avoid;page-break-inside:avoid;margin:0 0 4px}",
    ".rf-gh{font-size:8pt}.rf-ge p{margin:1px 0}.rf-ge ul{margin:1px 0;padding-left:14px}",
    ".rf-foot{font-size:7pt;color:#5d6670;margin-top:8px;text-align:center}",
    "@page{size:A4;margin:9mm}",
    "@media print{.rf-foot{display:none}body{background:#fff}.sheet{width:auto;margin:0;padding:0;box-shadow:none}}",
    "@media (max-width:700px){.sheet{padding:12px;margin:0}.rf-wt{min-width:560px}.rf-u{overflow-x:auto}.rf-glc{column-count:1}}"
  ].join("\n");
  function referenceDoc(C, r, opts) {
    var body = '<div class="sheet">' + referenceSheetHTML(C, r, opts) +
      '<p class="rf-foot">Built with SurgeCraft · Values from the unit cards; costs from the Unit Cost Table · Ability text is on the cards · Print on A4 with your browser\'s Print command.</p></div>';
    return "<!doctype html>\n<html lang=\"en\"><head><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\"><title>" + esc((r.name || "Roster") + " — Reference Sheet") + "</title>" + FONT_LINK +
      "<style>" + REF_CSS + "</style></head><body>" + body + "</body></html>\n";
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
    fieldedWeapons: fieldedWeapons, groupEntries: groupEntries, refKeywords: refKeywords, referenceSheetHTML: referenceSheetHTML, REF_CSS: REF_CSS, CARD_MM: CARD_MM, TAC_MM: TAC_MM, CARDSIZE_CSS: CARDSIZE_CSS, fitCards: fitCards,
    exports: { textFull: textFull, textCompact: textCompact, markdown: markdown, csv: csv, json: jsonFile, rosterSheetDoc: rosterSheetDoc, fieldManualDoc: fieldManualDoc, referenceDoc: referenceDoc }
  };
  if (typeof module !== "undefined" && module.exports) module.exports = R; else root.Render = R;
})(typeof window !== "undefined" ? window : this);
