import { Enemy, enemyTemplates, AIPersonality, AIDifficulty } from './EnemyAI';
import { NodeType } from '@/components/game/PvEMap';
import { Card, CardSuit } from '@/lib/store/gameStore';

export interface GeneratedEnemy extends Enemy {
  powerLevel: number;
  rewards: {
    gold: number;
    cards: string[];
    relics?: string[];
  };
  deck: Card[];
}

export class EnemyGenerator {
  private seed: string;
  private region: number;
  private seedValue: number;
  
  constructor(seed: string, region: number) {
    this.seed = seed;
    this.region = region;
    
    // Initialize seed value
    this.seedValue = 0;
    for (let i = 0; i < seed.length; i++) {
      this.seedValue += seed.charCodeAt(i) * (i + 1);
    }
    this.seedValue = (this.seedValue + region * 1000) % 10000;
  }
  
  // Deterministic pseudo-random function
  private random(min: number = 0, max: number = 1): number {
    this.seedValue = (this.seedValue * 9301 + 49297) % 233280;
    const rand = this.seedValue / 233280;
    return min + rand * (max - min);
  }
  
  // Generate enemy based on node type and region
  generateEnemy(nodeType: NodeType, nodeIndex: number): GeneratedEnemy | null {
    if (nodeType === 'shop' || nodeType === 'rest' || nodeType === 'event') {
      return null; // These nodes don't have enemies
    }
    
    let baseEnemy: Enemy;
    let powerLevel: number;
    let goldReward: number;
    let cardRewards: number;
    
    // Determine enemy based on node type and region
    switch (nodeType) {
      case 'battle':
        // Regular enemies
        powerLevel = this.region * 10 + nodeIndex;
        baseEnemy = this.getEnemyByDifficulty('novice', 'apprentice');
        goldReward = 20 + this.region * 10 + Math.floor(this.random(0, 20));
        cardRewards = 1;
        break;
        
      case 'elite':
        // Stronger enemies with better rewards
        powerLevel = this.region * 15 + nodeIndex * 2;
        baseEnemy = this.getEnemyByDifficulty('apprentice', 'adept');
        goldReward = 50 + this.region * 20 + Math.floor(this.random(0, 30));
        cardRewards = 2;
        break;
        
      case 'boss':
        // Boss enemies
        powerLevel = this.region * 30 + 50;
        baseEnemy = this.getBossForRegion();
        goldReward = 100 + this.region * 50 + Math.floor(this.random(0, 50));
        cardRewards = 3;
        break;
        
      case 'treasure':
      case 'mystery':
        // Sometimes has guardian
        if (this.random() > 0.5) {
          powerLevel = this.region * 12 + nodeIndex;
          baseEnemy = this.getEnemyByDifficulty('novice', 'apprentice');
          goldReward = 30 + this.region * 15;
          cardRewards = 1;
        } else {
          return null;
        }
        break;
        
      default:
        return null;
    }
    
    // Modify enemy based on region
    const modifiedEnemy = this.applyRegionModifiers(baseEnemy);
    
    // Generate enemy deck
    const deck = this.generateEnemyDeck(modifiedEnemy, powerLevel);
    
    // Generate rewards
    const rewards = {
      gold: goldReward,
      cards: this.generateCardRewards(cardRewards),
      relics: nodeType === 'elite' && this.random() > 0.7 ? ['random_relic'] : 
              nodeType === 'boss' ? ['guaranteed_relic'] : undefined
    };
    
    return {
      ...modifiedEnemy,
      powerLevel,
      rewards,
      deck
    };
  }
  
  private getEnemyByDifficulty(minDifficulty: AIDifficulty, maxDifficulty: AIDifficulty): Enemy {
    const difficulties: AIDifficulty[] = ['novice', 'apprentice', 'adept', 'master', 'legendary'];
    const minIndex = difficulties.indexOf(minDifficulty);
    const maxIndex = difficulties.indexOf(maxDifficulty);
    
    const eligibleEnemies = enemyTemplates.filter(enemy => {
      const enemyIndex = difficulties.indexOf(enemy.difficulty);
      return enemyIndex >= minIndex && enemyIndex <= maxIndex;
    });
    
    if (eligibleEnemies.length === 0) {
      return enemyTemplates[0]; // Fallback
    }
    
    const index = Math.floor(this.random(0, eligibleEnemies.length));
    return { ...eligibleEnemies[index] };
  }
  
  private getBossForRegion(): Enemy {
    const bosses = enemyTemplates.filter(e => 
      e.difficulty === 'master' || e.difficulty === 'legendary'
    );
    
    // Different boss for each region
    const bossIndex = (this.region - 1) % bosses.length;
    return { ...bosses[bossIndex] };
  }
  
  private applyRegionModifiers(enemy: Enemy): Enemy {
    const modified = { ...enemy };
    
    // Region 1: Standard
    // Region 2: +20% stats, faster reactions
    // Region 3: +40% stats, smarter AI
    
    if (this.region >= 2) {
      modified.config.reactionSpeed *= 0.8;
      modified.config.mistakeChance *= 0.7;
      modified.config.cardPlayRate = Math.min(1, modified.config.cardPlayRate * 1.2);
    }
    
    if (this.region >= 3) {
      modified.config.reactionSpeed *= 0.7;
      modified.config.mistakeChance *= 0.5;
      modified.config.fateUsage = Math.min(1, modified.config.fateUsage * 1.3);
      modified.config.trialFocus = true;
    }
    
    // Add region-specific personality traits
    switch (this.region) {
      case 1:
        modified.name = modified.name + ' the Novice';
        break;
      case 2:
        modified.name = modified.name + ' the Awakened';
        modified.config.aggressionLevel *= 1.2;
        break;
      case 3:
        modified.name = modified.name + ' the Ascended';
        modified.config.aggressionLevel *= 1.4;
        modified.config.defenseLevel *= 1.3;
        break;
    }
    
    return modified;
  }
  
  private generateEnemyDeck(enemy: Enemy, powerLevel: number): Card[] {
    const deck: Card[] = [];
    const deckSize = 20 + Math.floor(powerLevel / 10);
    
    // Determine suit distribution based on enemy theme
    const suitWeights = this.getSuitWeights(enemy.deckTheme);
    
    for (let i = 0; i < deckSize; i++) {
      const suit = this.selectWeightedSuit(suitWeights);
      const card = this.generateCard(suit, powerLevel, i);
      deck.push(card);
    }
    
    // Add major arcana for stronger enemies
    if (powerLevel > 30) {
      const majorCount = Math.floor(powerLevel / 30);
      for (let i = 0; i < majorCount; i++) {
        deck.push(this.generateMajorArcana(i));
      }
    }
    
    return deck;
  }
  
  private getSuitWeights(deckTheme: string): Record<CardSuit, number> {
    switch (deckTheme) {
      case 'wands':
        return { wands: 0.6, cups: 0.1, swords: 0.1, pentacles: 0.1, major: 0.1 };
      case 'cups':
        return { wands: 0.1, cups: 0.6, swords: 0.1, pentacles: 0.1, major: 0.1 };
      case 'swords':
        return { wands: 0.1, cups: 0.1, swords: 0.6, pentacles: 0.1, major: 0.1 };
      case 'pentacles':
        return { wands: 0.1, cups: 0.1, swords: 0.1, pentacles: 0.6, major: 0.1 };
      case 'major':
        return { wands: 0.15, cups: 0.15, swords: 0.15, pentacles: 0.15, major: 0.4 };
      case 'balanced':
        return { wands: 0.2, cups: 0.2, swords: 0.2, pentacles: 0.2, major: 0.2 };
      case 'chaotic':
        return { wands: 0.25, cups: 0.2, swords: 0.25, pentacles: 0.15, major: 0.15 };
      default:
        return { wands: 0.2, cups: 0.2, swords: 0.2, pentacles: 0.2, major: 0.2 };
    }
  }
  
  private selectWeightedSuit(weights: Record<CardSuit, number>): CardSuit {
    const rand = this.random();
    let cumulative = 0;
    
    for (const [suit, weight] of Object.entries(weights)) {
      cumulative += weight;
      if (rand <= cumulative) {
        return suit as CardSuit;
      }
    }
    
    return 'wands'; // Fallback
  }
  
  private generateCard(suit: CardSuit, powerLevel: number, index: number): Card {
    const numbers = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10'];
    const courts = ['page', 'knight', 'queen', 'king'];
    
    const isCourtCard = this.random() > 0.7;
    const cardId = isCourtCard 
      ? `${suit}_${courts[Math.floor(this.random(0, courts.length))]}`
      : `${suit}_${numbers[Math.floor(this.random(0, numbers.length))]}`;
    
    const baseCost = Math.floor(this.random(1, 6));
    const baseAttack = Math.floor(this.random(1, 5) + powerLevel / 20);
    const baseHealth = Math.floor(this.random(2, 6) + powerLevel / 15);
    
    return {
      id: `${cardId}_${index}`,
      name: this.getCardName(suit, cardId),
      suit,
      cost: baseCost,
      attack: baseAttack,
      health: baseHealth,
      orientation: 'upright',
      description: this.generateDescription(suit, 'upright'),
      reversedDescription: this.generateDescription(suit, 'reversed'),
      deck: 'enemy',
      type: this.random() > 0.3 ? 'unit' : 'spell',
      rarity: powerLevel > 40 ? 'rare' : powerLevel > 20 ? 'uncommon' : 'common'
    };
  }
  
  private generateMajorArcana(index: number): Card {
    const majorCards = [
      { id: 'major_00', name: 'The Fool' },
      { id: 'major_01', name: 'The Magician' },
      { id: 'major_02', name: 'The High Priestess' },
      { id: 'major_03', name: 'The Empress' },
      { id: 'major_04', name: 'The Emperor' },
      { id: 'major_05', name: 'The Hierophant' },
      { id: 'major_06', name: 'The Lovers' },
      { id: 'major_07', name: 'The Chariot' },
      { id: 'major_08', name: 'Strength' },
      { id: 'major_09', name: 'The Hermit' },
      { id: 'major_10', name: 'Wheel of Fortune' },
    ];
    
    const card = majorCards[index % majorCards.length];
    
    return {
      id: card.id,
      name: card.name,
      suit: 'major',
      cost: Math.floor(this.random(3, 8)),
      orientation: 'upright',
      description: 'Powerful major arcana effect',
      reversedDescription: 'Reversed major arcana effect',
      deck: 'enemy',
      type: 'major',
      rarity: 'mythic'
    };
  }
  
  private getCardName(suit: CardSuit, cardId: string): string {
    const parts = cardId.split('_');
    const number = parts[1];
    
    if (suit === 'major') {
      return 'Major Arcana';
    }
    
    const suitName = suit.charAt(0).toUpperCase() + suit.slice(1);
    
    if (['page', 'knight', 'queen', 'king'].includes(number)) {
      return `${number.charAt(0).toUpperCase() + number.slice(1)} of ${suitName}`;
    }
    
    const numberMap: Record<string, string> = {
      '01': 'Ace',
      '02': 'Two',
      '03': 'Three',
      '04': 'Four',
      '05': 'Five',
      '06': 'Six',
      '07': 'Seven',
      '08': 'Eight',
      '09': 'Nine',
      '10': 'Ten'
    };
    
    return `${numberMap[number] || number} of ${suitName}`;
  }
  
  private generateDescription(suit: CardSuit, orientation: 'upright' | 'reversed'): string {
    const descriptions: Record<CardSuit, { upright: string[]; reversed: string[] }> = {
      wands: {
        upright: ['Deal damage to target', 'Grant charge to unit', 'Burn for 2 turns'],
        reversed: ['Damage all enemies', 'Sacrifice unit for power', 'Discard and draw']
      },
      cups: {
        upright: ['Heal target', 'Draw cards', 'Gain protection'],
        reversed: ['Drain life', 'Mill opponent', 'Reflect damage']
      },
      swords: {
        upright: ['Quick strike', 'Silence target', 'Pierce defenses'],
        reversed: ['Counter attack', 'Steal power', 'Destroy weakest']
      },
      pentacles: {
        upright: ['Gain armor', 'Summon defender', 'Fortify position'],
        reversed: ['Sacrifice for gold', 'Corrupt target', 'Slow enemies']
      },
      major: {
        upright: ['Transform the battlefield', 'Alter fate itself', 'Invoke ancient power'],
        reversed: ['Chaos reigns', 'Reverse fortunes', 'Unmake reality']
      }
    };
    
    const options = descriptions[suit][orientation];
    return options[Math.floor(this.random(0, options.length))];
  }
  
  private generateCardRewards(count: number): string[] {
    const rewards: string[] = [];
    const cardPool = ['wands_01', 'cups_02', 'swords_03', 'pentacles_04', 'major_00'];
    
    for (let i = 0; i < count; i++) {
      rewards.push(cardPool[Math.floor(this.random(0, cardPool.length))]);
    }
    
    return rewards;
  }
}