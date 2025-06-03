# Tarot TCG Gameplay & Mechanics

## 1. Core Gameplay Loop

1. **Match Setup**

   * Player chooses a **deck** (Minor Arcana core + 1–2 Major Arcana).
   * Mulligan phase presented as a **three-card tarot spread** (Past/Present/Future slots).
   * Deck size: 30–40 cards; max 2 copies of each Minor Arcana; Major Arcana are unique.

2. **Turns**

   * Players start with 1 Fate and draw one card per turn.
   * Play Minor Arcana cards (units, spells, artifacts) and use Major Arcana when charged.
   * Spend Fate to manipulate draws, flip cards between **Upright** and **Reversed** forms, or disrupt opponent actions.

3. **Victory Conditions**

   * Reduce opponent’s health to 0.
   * Alternate win: Complete three **Arcana Trials** (special objectives included in deck).

4. **Rewards**

   * Earn shards, cosmetics currency, and experience.
   * PVE rewards: unlock alt-art cards, omens, or cosmetic-only boons.

---

## 2. Tarot Theme Integration

### 2.1 Suits as Roles

* **Wands** – Tempo/Aggression; status: *Ignite* (damage over time)
* **Cups** – Sustain/Control; status: *Soothe* (heal/cleanse)
* **Swords** – Burst/Disruption; status: *Bleed* (extra damage on next hit)
* **Pentacles** – Economy/Tutors; status: *Root* (stall or immobilize)

### 2.2 Major Arcana as Power Cards

* 22 total; 1–2 per deck.
* Example effects:

  * **The Fool (0)**: Draw 2 cards; if your hand is empty, play 1 for 0 Fate.
  * **Death (13)**: Transform a unit into a random one of equal or +1 cost.
  * **The Tower (16)**: Destroy highest-power unit on both sides.
  * **Judgement (20)**: Replay last card from any graveyard.

### 2.3 Upright / Reversed States

* Each card has two effects depending on orientation.
* Upright is default; reversed occurs via Fate spending or triggered effects.
* Example: **Two of Swords**

  * Upright: Silence target enemy for 1 turn.
  * Reversed: Both players discard a random card.

### 2.4 Tarot Spread Mechanics

* Mulligan shows 3 cards as Past, Present, Future.
* Present slot: play immediately for a bonus.
* Future slot: card cost reduced next turn.

### 2.5 Fate Resource

* Gained each turn (1–3 max).
* Spent to:

  * Flip cards
  * Peek top of deck
  * Force specific draws
  * Block opponent flips (once per game)

---

## 3. Game Modes

### 3.1 PVP (Ranked & Casual)

* **Ranked**: Best-of-One, 8–10 minutes per match.
* Ladder resets each season; MMR with soft decay.
* Featured formats: Standard, Wild, Weekly Chaos (rule tweaks).

### 3.2 PVE (Roguelite “Reading” Runs)

* Inspired by *Legends of Runeterra: Path of Champions*, *Slay the Spire*, *Monster Train*.
* Player chooses a **Significator** (Major Arcana) with a passive.
* Progress through node map: Encounters, Shops, Events, Bosses.
* Draft **Omens** and **Boons**; build deck dynamically.
* Persistent progression only cosmetic in PVP.

### 3.3 Events

* Weekly mini-events (e.g., "Reversed First Weekend").
* Seasonal thematic events (e.g., "The Lovers" season introduces partner/ally cards).

---

## 4. Card Types

### 4.1 Minor Arcana

* **Unit**: Persistent presence with stats and abilities.
* **Spell**: One-time effect.
* **Artifact**: Persistent, passive effect.

### 4.2 Major Arcana

* **Ultimate cards**: high-impact, limited-use.
* Can be charged (turns, events, or kills).
* Unique per deck.

### 4.3 Omens (PVE Only)

* Passive bonuses or debuffs affecting the whole run.
* Example: “Moonlight” – At the start of each fight, draw a Reversed card.

### 4.4 Arcana Trials

* Objective cards; completing them counts as a win condition.

---

## 5. Economy & Monetization

* **Cosmetics Only**: Alt-art cards, animated major arcana reveals, board skins.
* **Season Pass**: Free and premium tracks with cosmetics and shard rewards.
* **PVE Tickets**: Optional purchase, earnable in-game.
* **Crafting**: Convert duplicate cards into shards; craft specific cards.

No pay-to-win; expansions purchasable or craftable.

---

## 6. Technical Implementation

* **Client**: Godot (Web + Native builds).
* **Backend**: Next.js API routes for decks, cards, matchmaking, economy.
* **Server-Authoritative**: All actions validated server-side.
* **Deterministic RNG**: Seed per match for replays.
* **Matchmaking**: Redis queue; worker service for pairing.
* **PVE Encounters**: JSON-driven, seed-based reproducibility.

---

## 7. Example Card JSON

```json
{
  "id": "swords_02",
  "name": "Two of Swords",
  "suit": "swords",
  "cost": 2,
  "type": "spell",
  "upright": { "effect": "silence(target,1)" },
  "reversed": { "effect": "both_discard_random(1)" },
  "tags": ["control", "discard"],
  "rarity": "common",
  "set": "base"
}
```

---

## 8. Inspirations & References

* **PVP**: *Hearthstone* for pacing, *Marvel Snap* for clarity.
* **PVE**: *Legends of Runeterra – Path of Champions*, *Slay the Spire*, *Monster Train*, *Legends of Kingdom Rush*.
* **Tarot Theme**: Authentic card meanings blended with mechanical design for strategic depth.
