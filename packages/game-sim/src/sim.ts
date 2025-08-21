// Compatibility shim - redirects to new tarot system
export * from './tarot-simulator.js';
export { TarotSimulator as createInitialState } from './tarot-simulator.js';

// Legacy exports for backward compatibility
export function processIntent() {
  console.warn('processIntent is deprecated. Use TarotSimulator.processAction instead');
  return null;
}