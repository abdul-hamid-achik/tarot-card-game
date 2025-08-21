// Compatibility shim - redirects to new LoR-based system
export * from './tarot-lor-simulator.js';
export { TarotLorSimulator as createInitialState } from './tarot-lor-simulator.js';

// Legacy exports for backward compatibility
export function processIntent() {
  console.warn('processIntent is deprecated. Use LaneGameSimulator.processAction instead');
  return null;
}