import tarotMeanings from '@/data/tarot-meanings.json';
import { Card, CardSuit } from '@/lib/store/gameStore';

export interface TarotMeaning {
  name: string;
  uprightMeaning: string;
  reversedMeaning: string;
  uprightDescription: string;
  reversedDescription: string;
}

/**
 * Get tarot meaning for a card based on its suit and name/number
 */
export function getTarotMeaning(card: Card): TarotMeaning | null {
  if (card.suit === 'major') {
    // For major arcana, use the card name to find the meaning
    const majorKey = card.name.toLowerCase()
      .replace('the ', '')
      .replace(/\s+/g, '_')
      .replace(/[^a-z_]/g, '');
    
    const meaning = tarotMeanings.major[majorKey as keyof typeof tarotMeanings.major];
    return meaning || null;
  }

  // For minor arcana (wands, cups, swords, pentacles)
  const suitMeanings = tarotMeanings[card.suit as keyof typeof tarotMeanings];
  if (!suitMeanings) return null;

  // Convert card name to key format
  let cardKey = '';
  if (card.name.includes('ace')) {
    cardKey = 'ace';
  } else if (card.name.includes('two')) {
    cardKey = 'two';
  } else if (card.name.includes('three')) {
    cardKey = 'three';
  } else if (card.name.includes('four')) {
    cardKey = 'four';
  } else if (card.name.includes('five')) {
    cardKey = 'five';
  } else if (card.name.includes('six')) {
    cardKey = 'six';
  } else if (card.name.includes('seven')) {
    cardKey = 'seven';
  } else if (card.name.includes('eight')) {
    cardKey = 'eight';
  } else if (card.name.includes('nine')) {
    cardKey = 'nine';
  } else if (card.name.includes('ten')) {
    cardKey = 'ten';
  } else if (card.name.includes('page')) {
    cardKey = 'page';
  } else if (card.name.includes('knight')) {
    cardKey = 'knight';
  } else if (card.name.includes('queen')) {
    cardKey = 'queen';
  } else if (card.name.includes('king')) {
    cardKey = 'king';
  }

  const meaning = suitMeanings[cardKey as keyof typeof suitMeanings];
  return meaning || null;
}

/**
 * Get the effective description for a card based on its orientation
 */
export function getCardDescription(card: Card): string {
  // If the card has a custom description, use that first
  if (card.description) {
    return card.orientation === 'reversed' && card.reversedDescription 
      ? card.reversedDescription 
      : card.description;
  }

  // Otherwise, use tarot meanings
  const meaning = getTarotMeaning(card);
  if (!meaning) {
    return `A mystical ${card.suit} card with powerful energy.`;
  }

  return card.orientation === 'reversed' 
    ? meaning.reversedDescription 
    : meaning.uprightDescription;
}

/**
 * Get the effective meaning for a card based on its orientation
 */
export function getCardMeaning(card: Card): string {
  const meaning = getTarotMeaning(card);
  if (!meaning) {
    return `${card.suit} energy`;
  }

  return card.orientation === 'reversed' 
    ? meaning.reversedMeaning 
    : meaning.uprightMeaning;
}