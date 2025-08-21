import type { Unit, MatchState, Keyword } from './types.js';

export interface KeywordEffect {
  timing: 'pre-combat' | 'post-combat' | 'on-strike' | 'on-damage' | 'on-summon' | 'turn-start' | 'turn-end';
  description: string;
  apply: (state: MatchState, unit: Unit, target?: Unit) => MatchState;
}

export const KEYWORD_REGISTRY: Record<Keyword, KeywordEffect> = {
  'quick-attack': {
    timing: 'pre-combat',
    description: 'Strike before the enemy unit',
    apply: (state, unit, target) => {
      // Handled in combat resolution
      return state;
    }
  },

  'challenger': {
    timing: 'on-summon',
    description: 'Can drag an enemy unit into combat when attacking',
    apply: (state, unit) => {
      // Allows targeting enemy units when declaring attacks
      return state;
    }
  },

  'elusive': {
    timing: 'pre-combat',
    description: 'Can only be blocked by other Elusive units',
    apply: (state, unit) => {
      // Handled in blocker declaration validation
      return state;
    }
  },

  'overwhelm': {
    timing: 'on-strike',
    description: 'Excess damage dealt to a blocker is dealt to the enemy Nexus',
    apply: (state, unit, target) => {
      // Handled in combat resolution
      return state;
    }
  },

  'lifesteal': {
    timing: 'on-damage',
    description: 'Damage dealt by this unit heals your Nexus',
    apply: (state, unit) => {
      // Handled in combat resolution
      return state;
    }
  },

  'barrier': {
    timing: 'pre-combat',
    description: 'Negate the next damage this unit would take',
    apply: (state, unit) => {
      // One-time damage negation, removed after use
      return state;
    }
  },

  'tough': {
    timing: 'on-damage',
    description: 'Take 1 less damage from all sources',
    apply: (state, unit) => {
      // Passive damage reduction
      return state;
    }
  },

  'fearsome': {
    timing: 'pre-combat',
    description: 'Can only be blocked by units with 3+ Attack',
    apply: (state, unit) => {
      // Validation during blocker declaration
      return state;
    }
  },

  'regeneration': {
    timing: 'turn-end',
    description: 'Heal fully at the end of each turn',
    apply: (state, unit) => {
      unit.currentHealth = unit.maxHealth;
      unit.damage = 0;
      return state;
    }
  },

  'fury': {
    timing: 'post-combat',
    description: 'Gain +1/+1 when it kills a unit',
    apply: (state, unit, target) => {
      if (target && target.currentHealth <= 0) {
        unit.currentAttack += 1;
        unit.currentHealth += 1;
        unit.maxHealth += 1;
      }
      return state;
    }
  },

  'spellshield': {
    timing: 'pre-combat',
    description: 'Negate the next enemy spell or skill that would affect this unit',
    apply: (state, unit) => {
      // One-time spell negation, removed after use
      return state;
    }
  }
};

export class KeywordProcessor {
  /**
   * Apply keyword effects at specific timing
   */
  static processKeywords(state: MatchState, timing: KeywordEffect['timing']): MatchState {
    let newState = { ...state };

    for (const playerId of state.players) {
      const playerState = state.playerStates[playerId];
      
      for (const unit of playerState.board) {
        if (!unit) continue;

        for (const keyword of unit.keywords) {
          const effect = KEYWORD_REGISTRY[keyword];
          if (effect && effect.timing === timing) {
            newState = effect.apply(newState, unit);
          }
        }
      }
    }

    return newState;
  }

  /**
   * Check if a unit has a specific keyword
   */
  static hasKeyword(unit: Unit, keyword: Keyword): boolean {
    return unit.keywords.includes(keyword);
  }

  /**
   * Add a keyword to a unit
   */
  static addKeyword(unit: Unit, keyword: Keyword): void {
    if (!unit.keywords.includes(keyword)) {
      unit.keywords.push(keyword);
    }
  }

  /**
   * Remove a keyword from a unit
   */
  static removeKeyword(unit: Unit, keyword: Keyword): void {
    unit.keywords = unit.keywords.filter(k => k !== keyword);
  }

  /**
   * Grant keywords temporarily (for buffs)
   */
  static grantTemporaryKeyword(unit: Unit, keyword: Keyword, duration: number): void {
    this.addKeyword(unit, keyword);
    unit.buffs.push({
      type: `keyword:${keyword}`,
      value: 1,
      duration
    });
  }

  /**
   * Process end of turn keyword effects
   */
  static processEndOfTurn(state: MatchState): MatchState {
    let newState = this.processKeywords(state, 'turn-end');

    // Remove expired buffs
    for (const playerId of state.players) {
      const playerState = newState.playerStates[playerId];
      
      for (const unit of playerState.board) {
        if (!unit) continue;

        // Decrement buff durations
        unit.buffs = unit.buffs.filter(buff => {
          if (buff.duration !== undefined) {
            buff.duration--;
            if (buff.duration <= 0) {
              // Remove associated keyword if it was temporary
              if (buff.type.startsWith('keyword:')) {
                const keyword = buff.type.split(':')[1] as Keyword;
                this.removeKeyword(unit, keyword);
              }
              return false;
            }
          }
          return true;
        });
      }
    }

    return newState;
  }

  /**
   * Validate blocker based on attacker keywords
   */
  static canBlock(attacker: Unit, blocker: Unit): boolean {
    // Elusive can only be blocked by Elusive
    if (this.hasKeyword(attacker, 'elusive') && !this.hasKeyword(blocker, 'elusive')) {
      return false;
    }

    // Fearsome can only be blocked by 3+ attack units
    if (this.hasKeyword(attacker, 'fearsome') && blocker.currentAttack < 3) {
      return false;
    }

    return true;
  }

  /**
   * Apply on-summon keyword effects
   */
  static processOnSummon(state: MatchState, unit: Unit): MatchState {
    let newState = { ...state };

    for (const keyword of unit.keywords) {
      const effect = KEYWORD_REGISTRY[keyword];
      if (effect && effect.timing === 'on-summon') {
        newState = effect.apply(newState, unit);
      }
    }

    return newState;
  }
}