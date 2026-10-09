# Shared constructors for the StarCraft TMG dataset.

def W(phase, name, rng, target, roa, hit, surge, sdice, dmg, keywords, replaces=None):
    """Weapon profile, exactly as printed (strings kept so values like 'BT+4', 'D3+1', 'E', 'FT' survive)."""
    return {"kind": "weapon", "phase": phase, "name": name, "rng": rng, "target": target, "roa": roa,
            "hit": hit, "surge_type": surge, "s_dice": sdice, "dmg": dmg, "keywords": keywords,
            "replaces": replaces, "specialist": "SPECIALIST" in keywords}


def A(phase, name, type_, cost, text, options=None, **extra):
    """Special ability. type_ is Active/Passive/Reaction (or None when the card prints no type)."""
    d = {"kind": "ability", "phase": phase, "name": name, "type": type_, "cost": cost, "text": text}
    if options:
        d["options"] = [{"cost": c, "text": t} for c, t in options]
    d.update(extra)
    return d


def U(id, name, race, tags, slot, role, stats, supply, combat_tags, abilities, weapons, upgrades,
      range_pref=None, base_mm=None, card_version=None, unique=False, summoned=False, corrections=None,
      notes=None, **extra):
    d = {"id": id, "name": name, "race": race, "faction_tags": tags, "army_slot": slot,
         "combat_role": role, "combat_range_indicator": range_pref, "base_mm": base_mm,
         "unique": unique, "summoned": summoned, "card_version": card_version,
         "stats": stats,
         "supply_profile": [{"models": m, "supply": s} for m, s in supply],
         "combat_tags": combat_tags, "abilities": abilities, "weapons": weapons,
         "upgrades": upgrades, "corrections": corrections or [], "notes": notes or []}
    d.update(extra)
    return d
