/* StarCraft TMG roster rules engine.
 * Pure functions over the verified card dataset; no DOM. Works in the browser (window.RosterCore)
 * and in Node (module.exports) so the rules can be tested outside the page.
 * Rule references are to the Full Rules (Part 9.1) and the Organized Play Rules (OP). */
(function (root) {
  "use strict";

  var SLOT_TYPES = ["Core", "Elite", "Support", "Air", "Hero"];
  var SCALES = {
    // Part 9.1.1: Skirmish is "up to 1,000" and Standard "up to 2,000" Minerals. `sizes` are the list sizes
    // offered at each scale; the scale (not the size) sets the battlefield and the Mission/Deployment card side.
    skirmish: { id: "skirmish", name: "Skirmish", minerals: 1000, sizes: [500, 1000], battlefield: "36\" × 36\"", side: "skirmish" },
    standard: { id: "standard", name: "Standard", minerals: 2000, sizes: [1500, 2000], battlefield: "54\" × 36\"", side: "standard" },
    grand: { id: "grand", name: "Grand Offensive", minerals: null, battlefield: "72\" × 36\"", side: "standard" }
  };
  var RESOURCE_NAMES = { CP: "Command Points", PE: "Psionic Energy", BM: "Biomass" };

  function Core(data) {
    var self = this;
    this.data = data;
    this.units = {};
    this.cards = {};
    this.missions = {};
    this.deployments = {};
    data.units.forEach(function (u) { self.units[u.id] = u; });
    data.cards.forEach(function (c) { self.cards[c.id] = c; });
    data.missions.forEach(function (m) { self.missions[m.id] = m; });
    data.deployments.forEach(function (d) { self.deployments[d.id] = d; });
  }

  Core.SLOT_TYPES = SLOT_TYPES;
  Core.SCALES = SCALES;
  // The list sizes shown on Army setup, in order. Grand Offensive takes a custom limit above 2,000.
  Core.LIST_SIZES = [
    { scale: "skirmish", minerals: 500 }, { scale: "skirmish", minerals: 1000 },
    { scale: "standard", minerals: 1500 }, { scale: "standard", minerals: 2000 },
    { scale: "grand", minerals: null }
  ];
  Core.RESOURCE_NAMES = RESOURCE_NAMES;

  /* ---------- helpers ---------- */
  function tagsFit(itemTags, factionTags) {
    // Part 9.1.2: every tag on the card must also appear on the Faction Card.
    return itemTags.every(function (t) { return factionTags.indexOf(t) !== -1; });
  }
  function emptySlots() { var o = {}; SLOT_TYPES.forEach(function (s) { o[s] = 0; }); return o; }
  function uid() { return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4); }
  Core.uid = uid;

  Core.prototype.newRoster = function () {
    return {
      id: "r_" + uid(), name: "New roster", player: "", scale: "standard", minerals: 2000, grandMinerals: 3000,
      race: null, factionId: null, tactical: {}, creepId: null, units: [],
      missions: [], deployments: [], notes: "", createdAt: Date.now(), updatedAt: Date.now()
    };
  };

  Core.prototype.limits = function (r) {
    var s = SCALES[r.scale] || SCALES.standard;
    var minerals = s.id === "grand" ? Math.max(2001, Math.floor(Number(r.grandMinerals) || 2001))
      : (s.sizes.indexOf(Number(r.minerals)) !== -1 ? Number(r.minerals) : s.minerals);
    // Part 9.1.1 / 9.1.4: Vespene Gas is 10% of the Mineral limit at every scale.
    return { minerals: minerals, gas: Math.floor(minerals / 10), scale: s };
  };

  Core.prototype.faction = function (r) { return r.factionId ? this.cards[r.factionId] || null : null; };

  Core.prototype.factionCards = function (race) {
    return this.data.cards.filter(function (c) { return c.kind === "Faction" && (!race || c.race === race); });
  };

  Core.prototype.eligibleTactical = function (r) {
    var f = this.faction(r); if (!f) return [];
    return this.data.cards.filter(function (c) { return c.kind === "Tactical" && tagsFit(c.faction_tags, f.faction_tags); });
  };
  Core.prototype.eligibleCreep = function (r) {
    var f = this.faction(r); if (!f) return [];
    return this.data.cards.filter(function (c) { return c.kind === "Creep" && tagsFit(c.faction_tags, f.faction_tags); });
  };
  Core.prototype.eligibleUnits = function (r) {
    var f = this.faction(r); if (!f) return [];
    return this.data.units.filter(function (u) { return !u.summoned && tagsFit(u.faction_tags, f.faction_tags); });
  };
  Core.prototype.requiresCreep = function (r) {
    var f = this.faction(r);
    return !!f && f.abilities.some(function (a) { return a.name === "Zerg Creep"; });
  };

  /* ---------- a unit entry on the roster ---------- */
  Core.prototype.newEntry = function (unitId) {
    var u = this.units[unitId];
    return { uid: "u_" + uid(), unitId: unitId, models: u.compositions[0].models, upgrades: [], specialists: {} };
  };
  Core.prototype.composition = function (entry) {
    var u = this.units[entry.unitId];
    if (!u) return null;
    for (var i = 0; i < u.compositions.length; i++) if (u.compositions[i].models === entry.models) return { index: i, comp: u.compositions[i] };
    return null;
  };
  Core.prototype.upgradeDef = function (entry, name) {
    var u = this.units[entry.unitId];
    return u ? u.upgrades.filter(function (x) { return x.name === name; })[0] || null : null;
  };
  Core.prototype.upgradeCost = function (entry, name) {
    var c = this.composition(entry), up = this.upgradeDef(entry, name);
    if (!c || !up || !up.cost_by_composition) return null;
    return up.cost_by_composition[c.index];
  };
  Core.prototype.entryCost = function (entry) {
    var self = this, c = this.composition(entry);
    if (!c) return { base: 0, upgrades: 0, total: 0, supply: 0 };
    var up = 0;
    entry.upgrades.forEach(function (n) { var v = self.upgradeCost(entry, n); if (typeof v === "number") up += v; });
    return { base: c.comp.minerals, upgrades: up, total: c.comp.minerals + up, supply: c.comp.supply };
  };

  /* ---------- roster totals ---------- */
  Core.prototype.slots = function (r) {
    var self = this, avail = emptySlots(), used = emptySlots(), sources = {};
    SLOT_TYPES.forEach(function (s) { sources[s] = []; });
    var f = this.faction(r);
    if (f) Object.keys(f.slots).forEach(function (s) { avail[s] += f.slots[s]; sources[s].push({ name: f.name, n: f.slots[s] }); });
    Object.keys(r.tactical || {}).forEach(function (id) {
      var c = self.cards[id], n = r.tactical[id] || 0;
      if (!c || !n) return;
      Object.keys(c.slots).forEach(function (s) { avail[s] += c.slots[s] * n; sources[s].push({ name: c.name + (n > 1 ? " ×" + n : ""), n: c.slots[s] * n }); });
    });
    r.units.forEach(function (e) {
      var u = self.units[e.unitId], c = self.composition(e);
      // Part 9.1.6: a Unit occupies Army Slots of its type equal to its starting Supply Value.
      if (u && c && u.army_slot) used[u.army_slot] += c.comp.supply;
    });
    return { available: avail, used: used, sources: sources };
  };

  Core.prototype.totals = function (r) {
    var self = this, minerals = 0, supply = 0, gas = 0;
    r.units.forEach(function (e) { var c = self.entryCost(e); minerals += c.total; supply += c.supply; });
    Object.keys(r.tactical || {}).forEach(function (id) { var c = self.cards[id]; if (c) gas += (c.gas_cost || 0) * (r.tactical[id] || 0); });
    if (r.creepId && this.cards[r.creepId]) gas += this.cards[r.creepId].gas_cost || 0;
    return { minerals: minerals, gas: gas, supply: supply };
  };

  /* ---------- loadout (what each model carries) ---------- */
  Core.prototype.loadout = function (entry) {
    var self = this, u = this.units[entry.unitId];
    if (!u) return null;
    var base = u.weapons.map(function (w) { return w.name; });
    var allWeapons = base.slice(), replacedAll = {}, added = [], specialistLines = [], abilitiesTaken = [];
    entry.upgrades.forEach(function (n) {
      var up = self.upgradeDef(entry, n); if (!up) return;
      if (up.specialist) {
        var m = entry.specialists && entry.specialists[n];
        specialistLines.push({ model: m || null, name: up.name, replaces: up.replaces || null });
      } else if (up.kind === "weapon") {
        if (up.replaces) replacedAll[up.replaces] = up.name; else added.push(up.name);
      } else {
        abilitiesTaken.push(up.name);
      }
    });
    allWeapons = allWeapons.map(function (w) { return replacedAll[w] || w; }).concat(added);
    return { weapons: allWeapons, replaced: replacedAll, specialists: specialistLines, abilities: abilitiesTaken };
  };

  Core.prototype.loadoutText = function (entry) {
    var l = this.loadout(entry); if (!l) return "";
    var parts = [];
    Object.keys(l.replaced).forEach(function (w) { parts.push(l.replaced[w] + " (replaces " + w + ")"); });
    l.abilities.forEach(function (a) { parts.push(a); });
    l.specialists.slice().sort(function (a, b) { return (a.model || 99) - (b.model || 99); }).forEach(function (s) {
      parts.push("Model " + (s.model || "?") + ": " + s.name + (s.replaces ? " (replaces " + s.replaces + ")" : ""));
    });
    var weapons = l.weapons.join(", ");
    return (weapons ? "Weapons: " + weapons : "") + (parts.length ? (weapons ? ". " : "") + "Upgrades: " + parts.join("; ") : "");
  };

  /* ---------- validation ---------- */
  Core.prototype.validate = function (r) {
    var self = this, out = [];
    function add(level, msg, ref, target) { out.push({ level: level, msg: msg, ref: ref || "", target: target || null }); }
    var lim = this.limits(r), t = this.totals(r), f = this.faction(r);

    if (!r.race) add("error", "Choose a race.", "9.1.2", "setup");
    if (!f) add("error", "Choose a Faction Card. Every army includes exactly one.", "9.1.2 / 5.4", "setup");
    if (f && r.race && f.race !== r.race) add("error", f.name + " is not a " + r.race + " Faction Card.", "9.1.2", "setup");

    if (t.minerals > lim.minerals) add("error", "Minerals " + t.minerals + " exceed the " + lim.minerals + " limit by " + (t.minerals - lim.minerals) + ".", "9.1.3", "units");
    if (t.gas > lim.gas) add("error", "Vespene Gas " + t.gas + " exceeds the " + lim.gas + " limit by " + (t.gas - lim.gas) + ".", "9.1.4", "cards");

    // Tactical cards: eligibility and Unique
    Object.keys(r.tactical || {}).forEach(function (id) {
      var c = self.cards[id], n = r.tactical[id] || 0; if (!n) return;
      if (!c || c.kind !== "Tactical") { add("error", "Unknown Tactical Card (" + id + ").", "9.1.5", "cards"); return; }
      if (f && !tagsFit(c.faction_tags, f.faction_tags)) add("error", c.name + " has tags (" + c.faction_tags.join(", ") + ") not on " + f.name + ".", "9.1.2", "cards");
      if (c.unique && n > 1) add("error", c.name + " is Unique: only one copy allowed (" + n + " taken).", "9.1.5", "cards");
    });

    // Creep
    if (this.requiresCreep(r)) {
      if (!r.creepId) add("error", f.name + " requires exactly one Creep Card (Zerg Creep).", f.name + " card", "cards");
      else if (!this.eligibleCreep(r).some(function (c) { return c.id === r.creepId; })) add("error", (self.cards[r.creepId] ? self.cards[r.creepId].name : r.creepId) + " is not allowed with " + f.name + ".", "9.1.2", "cards");
    } else if (r.creepId) add("error", "Creep Cards can only be taken by a Faction Card with Zerg Creep.", "9.1.2", "cards");

    // Slots
    var sl = this.slots(r);
    SLOT_TYPES.forEach(function (s) {
      if (sl.used[s] > sl.available[s]) add("error", s + " slots: " + sl.used[s] + " used, " + sl.available[s] + " available. Add a card that provides " + s + " slots or reduce Supply.", "9.1.5 / 9.1.6", "slots");
    });

    // Units
    var uniqueSeen = {};
    r.units.forEach(function (e, i) {
      var u = self.units[e.unitId], label = (u ? u.name : e.unitId) + " (#" + (i + 1) + ")";
      if (!u) { add("error", "Unknown unit " + e.unitId + ".", "9.1.6", e.uid); return; }
      if (u.summoned) add("error", u.name + " is a Summoned Unit and cannot be recruited.", "9.1.9", e.uid);
      if (f && !tagsFit(u.faction_tags, f.faction_tags)) add("error", label + " has tags (" + u.faction_tags.join(", ") + ") not on " + f.name + ".", "9.1.2", e.uid);
      if (!self.composition(e)) add("error", label + ": " + e.models + " models is not a Composition Option.", "9.1.6", e.uid);
      if (u.unique) { uniqueSeen[u.id] = (uniqueSeen[u.id] || 0) + 1; if (uniqueSeen[u.id] === 2) add("error", u.name + " is Unique: only one allowed.", "Unique", e.uid); }
      // Card-printed army-building exclusions, e.g. Nova's Battle Preparation: "your army cannot include both ..."
      (u.excludes || []).forEach(function (xid) {
        var x = self.units[xid];
        if (x && u.id < xid && r.units.some(function (o) { return o.unitId === xid; })) add("error", "Your army cannot include both " + u.name + " and " + x.name + ".", "Card: Battle Preparation", e.uid);
      });
      var names = {}, spModels = {};
      e.upgrades.forEach(function (n) {
        var up = self.upgradeDef(e, n);
        if (!up) { add("error", label + ": " + n + " is not an upgrade on this card.", "9.1.7", e.uid); return; }
        if (names[n]) add("error", label + ": " + n + " taken twice.", "9.1.7", e.uid);
        names[n] = true;
        if (up.specialist) {
          var m = e.specialists && e.specialists[n];
          if (!m) add("error", label + ": nominate the model that carries " + n + " (SPECIALIST).", "9.1.7", e.uid);
          else if (m < 1 || m > e.models) add("error", label + ": " + n + " is nominated to model " + m + ", but the unit has " + e.models + " models.", "9.1.7", e.uid);
          else if (spModels[m]) add("error", label + ": model " + m + " carries both " + spModels[m] + " and " + n + ". Each SPECIALIST upgrade goes on a different model.", "9.1.7", e.uid);
          else spModels[m] = n;
        }
      });
      // Two non-specialist replacements for the same weapon
      var repl = {};
      e.upgrades.forEach(function (n) {
        var up = self.upgradeDef(e, n);
        if (up && up.replaces && !up.specialist) {
          if (repl[up.replaces]) add("warn", label + ": " + repl[up.replaces] + " and " + n + " both replace " + up.replaces + ". After the first, no model carries it.", "9.1.7", e.uid);
          else repl[up.replaces] = n;
        }
      });
    });

    // Organized Play submission requirements
    var ms = r.missions || [], ds = r.deployments || [];
    if (ms.length !== 2) add("warn", "Tournament rosters list 2 Mission Cards (" + ms.length + " chosen).", "OP: Army Rosters", "scenario");
    if (ds.length !== 2) add("warn", "Tournament rosters list 2 Deployment Cards (" + ds.length + " chosen).", "OP: Army Rosters", "scenario");
    if (new Set(ms).size !== ms.length || new Set(ds).size !== ds.length) add("error", "No duplicate cards within your own Mission or Deployment set.", "9.2", "scenario");
    if (!r.player) add("warn", "Tournament rosters show the player's name.", "OP: Army Rosters", "setup");

    // Informational
    if (f && t.minerals < lim.minerals) add("info", (lim.minerals - t.minerals) + " Minerals unspent. Unspent Minerals are lost.", "9.1.3", "units");
    if (f && t.gas < lim.gas) add("info", (lim.gas - t.gas) + " Vespene Gas unspent. Unspent Gas is lost.", "9.1.4", "cards");
    if (f) SLOT_TYPES.forEach(function (s) {
      var free = sl.available[s] - sl.used[s];
      if (free > 0) add("info", free + " " + s + " slot" + (free > 1 ? "s" : "") + " unused" + (s === "Air" ? " (no current unit uses Air slots)" : "") + ". Unused slots are lost.", "9.1.6", "slots");
    });
    return out;
  };

  Core.prototype.isLegal = function (r) { return !this.validate(r).some(function (v) { return v.level === "error"; }); };

  /* ---------- import / export ---------- */
  Core.prototype.normalize = function (raw) {
    // Accept an imported roster and keep only what the dataset recognizes. Returns {roster, dropped}.
    var self = this, dropped = [], r = this.newRoster();
    if (!raw || typeof raw !== "object") return { roster: null, dropped: ["Not a roster file."] };
    ["name", "player", "notes"].forEach(function (k) { if (typeof raw[k] === "string") r[k] = raw[k].slice(0, 200); });
    if (SCALES[raw.scale]) r.scale = raw.scale;
    r.minerals = this.limits({ scale: r.scale, minerals: raw.minerals }).minerals;
    if (Number(raw.grandMinerals) > 2000) r.grandMinerals = Math.floor(Number(raw.grandMinerals));
    if (["Terran", "Protoss", "Zerg"].indexOf(raw.race) !== -1) r.race = raw.race;
    if (raw.factionId && this.cards[raw.factionId] && this.cards[raw.factionId].kind === "Faction") r.factionId = raw.factionId;
    else if (raw.factionId) dropped.push("Faction " + raw.factionId);
    Object.keys(raw.tactical || {}).forEach(function (id) {
      var n = Math.max(0, Math.min(9, Math.floor(Number(raw.tactical[id]) || 0)));
      if (self.cards[id] && self.cards[id].kind === "Tactical") { if (n) r.tactical[id] = n; } else dropped.push("Tactical Card " + id);
    });
    if (raw.creepId) { if (this.cards[raw.creepId] && this.cards[raw.creepId].kind === "Creep") r.creepId = raw.creepId; else dropped.push("Creep Card " + raw.creepId); }
    (Array.isArray(raw.units) ? raw.units : []).forEach(function (e) {
      var u = e && self.units[e.unitId];
      if (!u || u.summoned) { dropped.push("Unit " + (e && e.unitId)); return; }
      var ent = self.newEntry(u.id);
      if (u.compositions.some(function (c) { return c.models === e.models; })) ent.models = e.models;
      (Array.isArray(e.upgrades) ? e.upgrades : []).forEach(function (n) {
        if (u.upgrades.some(function (x) { return x.name === n; }) && ent.upgrades.indexOf(n) === -1) ent.upgrades.push(n); else dropped.push(u.name + " upgrade " + n);
      });
      Object.keys(e.specialists || {}).forEach(function (n) { if (ent.upgrades.indexOf(n) !== -1) ent.specialists[n] = Math.floor(Number(e.specialists[n])) || null; });
      r.units.push(ent);
    });
    (Array.isArray(raw.missions) ? raw.missions : []).forEach(function (id) { if (self.missions[id]) r.missions.push(id); else dropped.push("Mission " + id); });
    (Array.isArray(raw.deployments) ? raw.deployments : []).forEach(function (id) { if (self.deployments[id]) r.deployments.push(id); else dropped.push("Deployment " + id); });
    if (!r.race && r.factionId) r.race = this.cards[r.factionId].race;
    return { roster: r, dropped: dropped };
  };

  Core.prototype.exportable = function (r) {
    return {
      format: "sc-tmg-roster", version: 1,
      name: r.name, player: r.player, scale: r.scale, minerals: r.minerals, grandMinerals: r.grandMinerals, race: r.race,
      factionId: r.factionId, tactical: r.tactical, creepId: r.creepId,
      units: r.units.map(function (e) { return { unitId: e.unitId, models: e.models, upgrades: e.upgrades, specialists: e.specialists }; }),
      missions: r.missions, deployments: r.deployments, notes: r.notes
    };
  };

  /* ---------- plain-text roster (Organized Play fields) ---------- */
  Core.prototype.rosterText = function (r) {
    var self = this, lim = this.limits(r), t = this.totals(r), f = this.faction(r), L = [];
    L.push(r.name || "Roster");
    L.push("Player: " + (r.player || "—"));
    L.push("Faction: " + (r.race || "—") + " — " + (f ? f.name : "—"));
    L.push("Engagement: " + lim.scale.name + " (" + lim.minerals + " Minerals / " + lim.gas + " Vespene Gas)");
    L.push("");
    L.push("UNITS");
    r.units.forEach(function (e) {
      var u = self.units[e.unitId], c = self.entryCost(e);
      if (!u) return;
      L.push("- " + u.name + " ×" + e.models + " [" + u.army_slot + "] — Supply " + c.supply + " — " + c.total + " Minerals" + (c.upgrades ? " (" + c.base + " + " + c.upgrades + " upgrades)" : ""));
      var lt = self.loadoutText(e); if (lt) L.push("    " + lt);
    });
    L.push("Total Supply: " + t.supply + "   Total Minerals: " + t.minerals + " / " + lim.minerals);
    L.push("");
    L.push("TACTICAL CARDS");
    Object.keys(r.tactical || {}).forEach(function (id) {
      var c = self.cards[id], n = r.tactical[id]; if (!c || !n) return;
      L.push("- " + c.name + (n > 1 ? " ×" + n : "") + " — " + (c.gas_cost * n) + " Vespene Gas");
    });
    if (r.creepId && self.cards[r.creepId]) L.push("- " + self.cards[r.creepId].name + " (Creep Card) — " + self.cards[r.creepId].gas_cost + " Vespene Gas");
    L.push("Total Vespene Gas: " + t.gas + " / " + lim.gas);
    L.push("");
    L.push("MISSION CARDS: " + ((r.missions || []).map(function (id) { return self.missions[id] ? self.missions[id].name : id; }).join(", ") || "—"));
    L.push("DEPLOYMENT CARDS: " + ((r.deployments || []).map(function (id) { var d = self.deployments[id]; return d ? d[lim.scale.side] : id; }).join(", ") || "—"));
    return L.join("\n");
  };

  if (typeof module !== "undefined" && module.exports) module.exports = Core;
  else root.RosterCore = Core;
})(typeof window !== "undefined" ? window : this);
