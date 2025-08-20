export { GameLogger } from './GameLogger.js';
export * from './types.js';
export * from './utils.js';

// Create a default logger instance
import { GameLogger } from './GameLogger.js';

export const gameLogger = new GameLogger({
  level: typeof process !== 'undefined' && process.env?.NODE_ENV === 'production' ? 'info' : 'debug',
  enabled: true,
  maxBufferSize: 1000,
  transports: {
    console: true,
    file: typeof window === 'undefined', // Only log to file on server
  }
});

// Export for convenience
export default gameLogger;