import { Card, CardSuit, Player, Trial } from '@/lib/store/gameStore';

export type TrialType = 
  | 'sun'         // Deal damage with specific suit
  | 'moon'        // End turns with fate
  | 'judgement'   // Play cards in specific ways
  | 'star'        // Heal or gain life
  | 'tower'       // Destroy units
  | 'death'       // Transform cards
  | 'temperance'  // Balance board state
  | 'hermit'      // Play alone (no units)
  | 'lovers'      // Pair units
  | 'strength';   // Buff units

export interface TrialDefinition {
  id: string;
  name: string;
  type: TrialType;
  description: string;
  requirement: string;
  maxProgress: number;
  checkCondition: (action: any, player: Player) => number; // Returns progress made
  reward: TrialReward;
}

export interface TrialReward {
  type: 'blessing' | 'power' | 'victory';
  description: string;
  effect: () => void;
}

// Trial definitions based on Major Arcana
export const trialDefinitions: TrialDefinition[] = [
  {
    id: 'trial_of_sun',
    name: 'Trial of the Sun',
    type: 'sun',
    description: 'Channel the power of Wands',
    requirement: 'Deal 20 damage with Wands cards',
    maxProgress: 20,
    checkCondition: (action, player) => {
      if (action.type === 'damage' && action.source?.suit === 'wands') {
        return action.amount;
      }
      return 0;
    },
    reward: {
      type: 'blessing',
      description: '+1 Attack to all Wands units',
      effect: () => console.log('Sun blessing applied')
    }
  },
  {
    id: 'trial_of_moon',
    name: 'Trial of the Moon',
    type: 'moon',
    description: 'Master the flow of Fate',
    requirement: 'End 3 turns with 3 or more Fate',
    maxProgress: 3,
    checkCondition: (action, player) => {
      if (action.type === 'end_turn' && player.fate >= 3) {
        return 1;
      }
      return 0;
    },
    reward: {
      type: 'blessing',
      description: '+1 Maximum Fate',
      effect: () => console.log('Moon blessing applied')
    }
  },
  {
    id: 'trial_of_judgement',
    name: 'Trial of Judgement',
    type: 'judgement',
    description: 'Balance the scales',
    requirement: 'Play 5 cards both Upright and Reversed',
    maxProgress: 5,
    checkCondition: (action, player) => {
      if (action.type === 'play_card') {
        const card = action.card as Card;
        // Check if we've played this card in both orientations
        if (action.history?.includes(card.id + '_upright') && 
            action.history?.includes(card.id + '_reversed')) {
          return 1;
        }
      }
      return 0;
    },
    reward: {
      type: 'power',
      description: 'Free card flip each turn',
      effect: () => console.log('Judgement power granted')
    }
  },
  {
    id: 'trial_of_star',
    name: 'Trial of the Star',
    type: 'star',
    description: 'Embrace healing waters',
    requirement: 'Heal 15 total health with Cups cards',
    maxProgress: 15,
    checkCondition: (action, player) => {
      if (action.type === 'heal' && action.source?.suit === 'cups') {
        return action.amount;
      }
      return 0;
    },
    reward: {
      type: 'blessing',
      description: '+5 Maximum Health',
      effect: () => console.log('Star blessing applied')
    }
  },
  {
    id: 'trial_of_tower',
    name: 'Trial of the Tower',
    type: 'tower',
    description: 'Bring destruction and rebuild',
    requirement: 'Destroy 10 units (yours or enemy)',
    maxProgress: 10,
    checkCondition: (action, player) => {
      if (action.type === 'destroy_unit') {
        return 1;
      }
      return 0;
    },
    reward: {
      type: 'power',
      description: 'Destroy all units, draw 3 cards',
      effect: () => console.log('Tower power activated')
    }
  },
  {
    id: 'trial_of_death',
    name: 'Trial of Death',
    type: 'death',
    description: 'Transform and transcend',
    requirement: 'Transform 5 cards',
    maxProgress: 5,
    checkCondition: (action, player) => {
      if (action.type === 'transform_card') {
        return 1;
      }
      return 0;
    },
    reward: {
      type: 'power',
      description: 'Transform all units into Major Arcana',
      effect: () => console.log('Death transformation complete')
    }
  }
];

export class TrialSystem {
  private activeTrials: Map<string, Trial> = new Map();
  private completedTrials: Set<string> = new Set();
  
  constructor() {
    // Initialize with 3 random trials
    this.initializeTrials();
  }
  
  private initializeTrials() {
    // Select 3 random trials for the match
    const shuffled = [...trialDefinitions].sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, 3);
    
    selected.forEach(def => {
      const trial: Trial = {
        id: def.id,
        name: def.name,
        description: def.description,
        requirement: def.requirement,
        progress: 0,
        maxProgress: def.maxProgress,
        completed: false
      };
      this.activeTrials.set(def.id, trial);
    });
  }
  
  getActiveTrials(): Trial[] {
    return Array.from(this.activeTrials.values());
  }
  
  checkProgress(action: any, player: Player): Trial[] {
    const updatedTrials: Trial[] = [];
    
    this.activeTrials.forEach((trial, id) => {
      if (trial.completed) return;
      
      const definition = trialDefinitions.find(d => d.id === id);
      if (!definition) return;
      
      const progress = definition.checkCondition(action, player);
      if (progress > 0) {
        trial.progress = Math.min(trial.progress + progress, trial.maxProgress);
        
        if (trial.progress >= trial.maxProgress) {
          trial.completed = true;
          this.completedTrials.add(id);
          
          // Apply reward
          definition.reward.effect();
          
          // Check for victory condition (3 trials completed)
          if (this.completedTrials.size >= 3) {
            console.log('VICTORY! Three trials completed!');
          }
        }
        
        updatedTrials.push(trial);
      }
    });
    
    return updatedTrials;
  }
  
  getCompletedCount(): number {
    return this.completedTrials.size;
  }
  
  isVictoryAchieved(): boolean {
    return this.completedTrials.size >= 3;
  }
}