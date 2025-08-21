// Bot compatibility shim - redirects to AI controller
export { AIController as chooseBotIntent } from './ai-controller.js';

export async function runHeadlessMatch() {
  console.warn('runHeadlessMatch is deprecated. Use AIController instead');
  return {
    state: null,
    winnerId: null,
    steps: 0
  };
}