/* Example armies shown by the Examples buttons. Each must pass RosterCore.validate with no errors. */
(function (root) {
  var EX = {
    Terran: { name: "Raynor's Raiders (rulebook example)", race: "Terran", factionId: "raynors-raiders",
      tactical: ["barracks","barracks-proxy","factory","orbital-command","academy","engineering-bay"],
      units: [["marine",9],["marine",9],["marine",6],["marauder",4],["marauder",2],["jim-raynor",1],["medic",3],["medic",3],["goliath",1]],
      note: "the Raynor's Raiders army from the Full Rules army-building example (Part 9.1)" },
    Protoss: { name: "Daelaam Strike Force (example)", race: "Protoss", factionId: "daelaam",
      tactical: ["gateway","warp-gate","robotics-facility","forge","observer"],
      units: [["zealot",3,["Leg Enhancements"]],["zealot",3,["Leg Enhancements"]],["adept",4],["adept",4],["stalker",2,["Path of Shadows"]],["immortal",1,["Shield Overcharge"]],["sentry",2,["Hallucination"]]],
      note: "an example Daelaam army built for this app" },
    Zerg: { name: "Kerrigan's Brood (example)", race: "Zerg", factionId: "kerrigans-swarm", creepId: "malignant-creep",
      tactical: ["spawning-pool","roach-warren","hydralisk-den","lair","overlord"],
      units: [["kerrigan",1],["zergling",18,["Adrenal Glands"]],["zergling",12],["roach",3,["Glial Reconstitution"]],["roach",3],["vile",3],["hydralisk",4,["Grooved Spines"]],["kerrigan-swarm-raptor",6]],
      note: "an example Kerrigan's Swarm army built for this app" }
  };
  function build(C, race) {
    var x = EX[race], r = C.newRoster();
    r.name = x.name; r.race = x.race; r.factionId = x.factionId; r.scale = "standard"; if (x.creepId) r.creepId = x.creepId;
    x.tactical.forEach(function (id) { r.tactical[id] = 1; });
    x.units.forEach(function (u) { var e = C.newEntry(u[0]); e.models = u[1]; e.upgrades = (u[2] || []).slice(); r.units.push(e); });
    return r;
  }
  var api = { EX: EX, build: build };
  if (typeof module !== "undefined" && module.exports) module.exports = api; else root.Examples = api;
})(typeof window !== "undefined" ? window : this);
