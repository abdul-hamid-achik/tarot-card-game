'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { gameLogger, GameEvent } from '@tarot/game-logger';
import { PixelButton } from '@/components/ui/pixel-button';
import { cn } from '@/lib/utils';

interface GameLogViewerProps {
  className?: string;
  maxEvents?: number;
  isVisible?: boolean;
  onToggle?: () => void;
}

export function GameLogViewer({ 
  className, 
  maxEvents = 50, 
  isVisible = false,
  onToggle 
}: GameLogViewerProps) {
  const [events, setEvents] = useState<GameEvent[]>([]);
  const [filter, setFilter] = useState<string>('all');
  const [isCollapsed, setIsCollapsed] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      const buffer = gameLogger.getEventBuffer();
      setEvents(buffer.slice(-maxEvents));
    }, 1000);

    return () => clearInterval(interval);
  }, [maxEvents]);

  const filteredEvents = events.filter(event => {
    if (filter === 'all') return true;
    return event.type === filter;
  });

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'CARD_PLAY': return '🃏';
      case 'PHASE_TRANSITION': return '⏱️';
      case 'HEALTH_CHANGE': return '❤️';
      case 'COMBAT': return '⚔️';
      case 'ACTION': return '🎯';
      case 'RESOURCE_CHANGE': return '💎';
      case 'GAME_STATE': return '🎮';
      default: return '📝';
    }
  };

  const getEventColor = (type: string) => {
    switch (type) {
      case 'CARD_PLAY': return 'text-blue-400';
      case 'PHASE_TRANSITION': return 'text-purple-400';
      case 'HEALTH_CHANGE': return 'text-red-400';
      case 'COMBAT': return 'text-orange-400';
      case 'ACTION': return 'text-green-400';
      case 'RESOURCE_CHANGE': return 'text-yellow-400';
      case 'GAME_STATE': return 'text-cyan-400';
      default: return 'text-gray-400';
    }
  };

  const formatTimestamp = (timestamp?: number) => {
    if (!timestamp) return '';
    return new Date(timestamp).toLocaleTimeString();
  };

  const exportLogs = () => {
    const logs = gameLogger.exportLogs();
    const blob = new Blob([logs], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `game-logs-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (!isVisible) return null;

  return (
    <motion.div
      initial={{ opacity: 0, x: 300 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 300 }}
      className={cn(
        "fixed right-4 top-4 z-50 bg-black/90 backdrop-blur-md rounded-lg border border-white/20 shadow-2xl",
        "max-w-md w-full max-h-[80vh] flex flex-col",
        className
      )}
    >
      {/* Header */}
      <div className="p-3 border-b border-white/10 flex items-center justify-between">
        <h3 className="text-white font-bold text-sm">Game Debug Log</h3>
        <div className="flex items-center gap-2">
          <PixelButton
            size="sm"
            variant="default"
            onClick={() => setIsCollapsed(!isCollapsed)}
          >
            {isCollapsed ? '▼' : '▲'}
          </PixelButton>
          <PixelButton
            size="sm"
            variant="default"
            onClick={exportLogs}
          >
            💾
          </PixelButton>
          <PixelButton
            size="sm"
            variant="default"
            onClick={() => gameLogger.clearBuffer()}
          >
            🗑️
          </PixelButton>
          <PixelButton
            size="sm"
            variant="red"
            onClick={onToggle}
          >
            ✕
          </PixelButton>
        </div>
      </div>

      <AnimatePresence>
        {!isCollapsed && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: 'auto' }}
            exit={{ height: 0 }}
            className="flex flex-col overflow-hidden"
          >
            {/* Filter Controls */}
            <div className="p-2 border-b border-white/10">
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="w-full bg-black/50 text-white text-xs border border-white/20 rounded px-2 py-1"
              >
                <option value="all">All Events ({events.length})</option>
                <option value="CARD_PLAY">Card Plays</option>
                <option value="PHASE_TRANSITION">Phase Changes</option>
                <option value="HEALTH_CHANGE">Health Changes</option>
                <option value="COMBAT">Combat</option>
                <option value="ACTION">Actions</option>
                <option value="RESOURCE_CHANGE">Resources</option>
                <option value="GAME_STATE">Game State</option>
              </select>
            </div>

            {/* Event List */}
            <div className="flex-1 overflow-y-auto max-h-96 p-2 space-y-1">
              {filteredEvents.length === 0 ? (
                <div className="text-gray-500 text-xs text-center py-4">
                  No events logged yet
                </div>
              ) : (
                filteredEvents.slice().reverse().map((event, index) => (
                  <motion.div
                    key={`${event.timestamp}-${index}`}
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-black/30 rounded p-2 text-xs border border-white/5"
                  >
                    <div className="flex items-start gap-2">
                      <span className="text-sm">{getEventIcon(event.type)}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={cn("font-bold", getEventColor(event.type))}>
                            {event.type}
                          </span>
                          <span className="text-gray-400 text-xs">
                            {formatTimestamp(event.timestamp)}
                          </span>
                        </div>
                        
                        {/* Event-specific content */}
                        {'card' in event && (
                          <div className="text-white">
                            <span className="text-blue-300">{event.card.name}</span>
                            {event.targetSlot !== undefined && (
                              <span className="text-gray-400"> → Slot {event.targetSlot}</span>
                            )}
                          </div>
                        )}
                        
                        {'action' in event && (
                          <div className="text-white">
                            <span className="capitalize">{event.action.replace('_', ' ')}</span>
                            {!event.success && event.reason && (
                              <span className="text-red-400 ml-2">({event.reason})</span>
                            )}
                          </div>
                        )}
                        
                        {'fromPhase' in event && 'toPhase' in event && (
                          <div className="text-white">
                            <span className="text-gray-400">{event.fromPhase}</span>
                            <span className="text-white mx-2">→</span>
                            <span className="text-green-400">{event.toPhase}</span>
                          </div>
                        )}
                        
                        {'targetName' in event && (
                          <div className="text-white">
                            <span className="text-cyan-300">{event.targetName}</span>
                            <span className="text-gray-400 mx-2">
                              {event.healthBefore} → {event.healthAfter}
                            </span>
                            {event.damage && (
                              <span className="text-red-400">(-{event.damage})</span>
                            )}
                            {event.healing && (
                              <span className="text-green-400">(+{event.healing})</span>
                            )}
                          </div>
                        )}
                        
                        {'subType' in event && (
                          <div className="text-white">
                            <span className="text-orange-300 capitalize">{event.subType.toLowerCase()}</span>
                            {event.attacker && (
                              <span className="text-gray-400 ml-2">{event.attacker.name}</span>
                            )}
                          </div>
                        )}
                        
                        {'resource' in event && (
                          <div className="text-white">
                            <span className="text-yellow-300 capitalize">{event.resource}</span>
                            <span className="text-gray-400 mx-2">
                              {event.before} → {event.after}
                            </span>
                            <span className={event.change > 0 ? "text-green-400" : "text-red-400"}>
                              ({event.change > 0 ? '+' : ''}{event.change})
                            </span>
                          </div>
                        )}
                        
                        {/* Context info */}
                        <div className="flex gap-3 mt-1 text-xs text-gray-500">
                          {event.playerId && (
                            <span>Player: {event.playerId}</span>
                          )}
                          {event.turn && (
                            <span>Turn: {event.turn}</span>
                          )}
                          {event.phase && (
                            <span>Phase: {event.phase}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// Debug toggle button component
interface DebugToggleProps {
  onToggle: () => void;
  isVisible: boolean;
}

export function DebugToggle({ onToggle, isVisible }: DebugToggleProps) {
  return (
    <button
      onClick={onToggle}
      className={cn(
        "fixed bottom-0 right-0 z-50",
        "w-8 h-8 rounded-tl-lg",
        "flex items-center justify-center",
        "transition-all duration-200",
        "hover:scale-110",
        isVisible 
          ? "bg-yellow-500/80 hover:bg-yellow-500" 
          : "bg-black/50 hover:bg-black/70",
        "border-l border-t",
        isVisible ? "border-yellow-400/50" : "border-white/20"
      )}
      title={isVisible ? "Hide Debug" : "Show Debug"}
    >
      <span className="text-sm">🐛</span>
    </button>
  );
}