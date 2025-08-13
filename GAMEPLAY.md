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

---

## 9. Detailed Rules & Onboarding

### 9.1 Turn Structure & Timing

* **Phases (active player)**: Draw → Main → Combat → End.
* **Reaction window (limited)**: After any action that changes board state (play, summon, attack declaration), open one reaction window.
  * Non-active player may play up to **1 Fast** card or effect.
  * Active player may then play up to **1 Fast** card or effect.
  * Resolve in this order: non-active → active. Then the window closes. No further chaining in the same window.
* **No priority ping-pong**: There is no continuous stack or unlimited pass-back; each window is at most one response per player.
* **Determinism**: When multiple triggers would fire simultaneously, add triggers to the queue with the non-active player first and resolve in that order.

### 9.2 Mulligan & Tarot Spread Details

* **Opening hand**: Draw 4.
* **Spread reveal**: Reveal 3 cards from your deck for the Mulligan spread. You may **reroll each revealed card once** (free) before locking choices.
* **Assign each card to a slot** (Past, Present, Future). Slot bonuses:
  * **Past**: This card starts in hand. If played on Turn 1 or Turn 2, gain **+1 Fate refund** after resolution.
  * **Present**: This card starts in hand with **cost −1** on Turn 1 only.
  * **Future**: At the start of your next turn, **draw** this card; it has **cost −1** for that turn only.
* If a slot card cannot be drawn (e.g., already in hand due to another effect), draw the next valid card from your deck.

### 9.3 Fate Rules (Gain, Bank, Costs)

* **Start**: 1 Fate.
* **Gain**: +1 Fate at the start of your turn; **bank up to 3**. Unspent Fate persists between turns.
* **Standard costs**:
  * **Flip orientation** (hand or your controlled unit/artifact): 1 Fate per flip.
  * **Peek**: 1 Fate to look at the **top 2** cards of your deck and reorder them.
  * **Force draw**: 2 Fate to immediately draw the top card.
  * **Block opponent flip (once per game)**: 2 Fate during a reaction window; cancels that flip.
* Effects that change costs never reduce a card’s cost below 0.

### 9.4 Interaction Model & Limits

* **Speeds**:
  * **Play**: On your Main phase only.
  * **Fast**: In reaction windows only (see 9.1).
  * **Passive**: Always-on or state-change triggers.
* **Trigger limits**: When a single event would fire many triggers, queue them deterministically (non-active first). A maximum of **3 triggers** resolve from a single event tick; excess triggers queue to the next update tick to keep pacing readable.
* **Conflict resolution**: Tie-breakers favor clear order: non-active before active on equal-timestamp triggers.

### 9.5 PVP Timing & Flow

* **Turn timer**: 40 seconds per turn.
* **Time bank**: +80 seconds shared bank (max 120 seconds). If your per-turn timer expires, time bank is consumed; if all time expires, the server ends your turn.
* **Concede policy**: Concede anytime. Ranked adjusts MMR only; no extra streak penalty.
* **Optional open-decklists** (Ranked): Queue option to reveal decklists pre-match for lower hidden-info load.

### 9.6 New Player Flow

* **FTUE (3 guided matches)**:
  * Match 1: Core loop + Present/Past/Future spread bonuses.
  * Match 2: Upright/Reversed + Fate flips and peek.
  * Match 3: Fast reactions + basic combat math.
* **Starter decks**: One per suit focus (Wands, Cups, Swords, Pentacles) and one hybrid.
* **Discovery queue**: Curated, rotating card pool for fair mirrors without gating.
* **Craft guarantees**: By account level 10, guaranteed shards to craft **10 staples** (non-cosmetic; meta-agnostic utility).

### 9.7 Clarity Aids & Transparency

* **Intent previews**: Before confirming, show predicted outcomes and orientation.
* **Combat math preview**: Show “would die/survive” tags and projected damage.
* **Keyword glossary**: Short tooltips with links to full reference.
* **Seed visibility**: Match seed is visible; peek/force-draw effects show the exact cards and odds impacted.

### 9.8 Arcana Trials (Examples)

* **Trial of the Sun**: Deal **20 cumulative damage** with Wands units. Progress persists across turns; resets each match.
* **Trial of the Moon**: End your turn with **≥5 Fate** for **2 consecutive turns**.
* **Trial of Judgement**: In a single match, play the same card **Upright** and later **Reversed**.
* Trials are visible to both players; progress is public. Trials cannot be completed via conceded turn-order exploits; completion checks run at end of the active player’s turn.

---

## 10. Glossary

* **Fate**: Match resource used to flip orientation, peek, force draws, and certain reactions. Banks up to 3 between turns.
* **Upright / Reversed**: Two orientations of a card with distinct effects.
* **Spread (Past/Present/Future)**: Mulligan presentation that grants slot-specific bonuses to chosen cards.
* **Fast**: Effects playable only during a reaction window.
* **Passive**: Always-on or trigger-based effects that do not require manual play timing.
* **Trial (Arcana Trial)**: An objective card; completing three wins the match.
* **Significator**: Major Arcana chosen for PvE with a passive effect.

---

## 11. System Invariants & Determinism

* **No full stack**: At most one response per player per reaction window (non-active then active), then resolve and close.
* **Deterministic resolution order**: Simultaneous triggers queue with non-active first; tie-breakers use stable IDs.
* **State visibility**: Seed is visible; previews surface predicted outcomes before confirm.
* **Cost floors**: Costs never drop below 0.
* **Trigger pacing**: Max 3 triggers per event tick to preserve readability; overflow queues to next tick.
* **Once-per-game blockers**: Enforced by server; cannot be refreshed by resets.

---

## 12. Example Turn Walkthrough (PVP)

1. **Start of Turn**: Gain +1 Fate (up to 3). Draw 1 card. Apply any start-of-turn passives.
2. **Main Phase**: Play a unit (Upright). Board changes → open a reaction window.
   * Opponent may play up to 1 Fast effect (e.g., small removal). You may respond with up to 1 Fast effect.
   * Resolve non-active → active. Close window.
3. **Combat**: Declare attackers. Board changes → open a reaction window.
   * Opponent assigns a Fast buff; you flip your attacker to Reversed (1 Fate) for a different on-hit.
   * Resolve non-active → active. Close window.
4. **Damage & Triggers**: Apply combat damage; enqueue up to 3 resulting triggers in order (non-active first). Overflow goes to next tick.
5. **End Phase**: End-of-turn passives resolve; turn ends.
