// Available card back designs
export interface CardBack {
  id: string;
  name: string;
  image: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  unlocked?: boolean;
}

export const cardBacks: CardBack[] = [
  {
    id: 'classic',
    name: 'Classic Arcanum',
    image: '/api/ui/themes/pixel-pack/sheets/card_ui_01.png',
    rarity: 'common',
    unlocked: true
  },
  {
    id: 'mystic',
    name: 'Mystic Veil',
    image: '/api/ui/themes/pixel-pack/sheets/card_ui_02.png',
    rarity: 'common',
    unlocked: true
  },
  {
    id: 'celestial',
    name: 'Celestial Pattern',
    image: '/api/ui/themes/pixel-pack/sheets/card_ui_03.png',
    rarity: 'rare',
    unlocked: true
  },
  {
    id: 'shadow',
    name: 'Shadow Weave',
    image: '/api/ui/themes/pixel-pack/sheets/card_ui_04.png',
    rarity: 'rare',
    unlocked: true
  },
  {
    id: 'golden',
    name: 'Golden Threads',
    image: '/api/ui/themes/pixel-pack/sheets/card_ui_05.png',
    rarity: 'epic',
    unlocked: true
  },
  {
    id: 'cosmic',
    name: 'Cosmic Spiral',
    image: '/api/ui/themes/pixel-pack/sheets/card_ui_06.png',
    rarity: 'epic',
    unlocked: true
  },
  {
    id: 'dragon',
    name: 'Dragon Scale',
    image: '/api/ui/themes/pixel-pack/sheets/card_ui_07.png',
    rarity: 'legendary',
    unlocked: false
  },
  {
    id: 'phoenix',
    name: 'Phoenix Feather',
    image: '/api/ui/themes/pixel-pack/sheets/card_ui_08.png',
    rarity: 'legendary',
    unlocked: false
  },
  {
    id: 'void',
    name: 'Void Essence',
    image: '/api/ui/themes/pixel-pack/sheets/card_ui_09.png',
    rarity: 'legendary',
    unlocked: false
  }
];

// Get a random card back for enemies
export function getRandomCardBack(): CardBack {
  const availableBacks = cardBacks.filter(cb => cb.unlocked);
  return availableBacks[Math.floor(Math.random() * availableBacks.length)];
}

// Get player's selected card back
export function getPlayerCardBack(): CardBack {
  if (typeof window === 'undefined') {
    return cardBacks[0]; // Default for SSR
  }
  
  const savedBackId = localStorage.getItem('selectedCardBack');
  const cardBack = cardBacks.find(cb => cb.id === savedBackId && cb.unlocked);
  
  return cardBack || cardBacks[0]; // Default to first if not found
}

// Save player's card back selection
export function savePlayerCardBack(cardBackId: string): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem('selectedCardBack', cardBackId);
  }
}

// Get rarity color
export function getRarityColor(rarity: string): string {
  switch (rarity) {
    case 'common':
      return 'from-gray-500 to-gray-600';
    case 'rare':
      return 'from-blue-500 to-blue-600';
    case 'epic':
      return 'from-purple-500 to-purple-600';
    case 'legendary':
      return 'from-yellow-500 to-orange-500';
    default:
      return 'from-gray-500 to-gray-600';
  }
}

// Get rarity border color
export function getRarityBorderColor(rarity: string): string {
  switch (rarity) {
    case 'common':
      return 'border-gray-400';
    case 'rare':
      return 'border-blue-400';
    case 'epic':
      return 'border-purple-400';
    case 'legendary':
      return 'border-yellow-400';
    default:
      return 'border-gray-400';
  }
}