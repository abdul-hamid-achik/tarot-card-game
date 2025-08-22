'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Eye, Play, Swords, Shield, Undo2 } from 'lucide-react';
import { Card } from '@/lib/store/gameStore';
import { cn } from '@/lib/utils';

type CardZone = 'hand' | 'bench' | 'battlefield';

interface CardActionMenuProps {
  card: Card | null;
  zone: CardZone;
  isOpen: boolean;
  position: { x: number; y: number };
  onAction: (action: 'view' | 'play' | 'attack' | 'block' | 'return') => void;
  onClose: () => void;
  playerMana?: number;
  playerSpellMana?: number;
  isMyTurn?: boolean;
  hasAttackToken?: boolean;
}

export function CardActionMenu({ 
  card, 
  zone,
  isOpen, 
  position, 
  onAction,
  onClose,
  playerMana = 0,
  playerSpellMana = 0,
  isMyTurn = false,
  hasAttackToken = false
}: CardActionMenuProps) {
  if (!card || !isOpen) return null;

  const totalMana = playerMana + (card.type === 'spell' ? playerSpellMana : 0);
  const canAfford = card.cost <= totalMana;
  const manaNeeded = Math.max(0, card.cost - totalMana);

  // Determine available actions based on zone
  const getActions = () => {
    switch (zone) {
      case 'hand':
        return [
          { id: 'view', icon: Eye, label: 'View', enabled: true },
          { 
            id: 'play', 
            icon: Play, 
            label: `Play (${card.cost})`, 
            enabled: canAfford && isMyTurn,
            tooltip: canAfford ? `Play for ${card.cost} fate` : `Need ${manaNeeded} more fate`
          }
        ];
      
      case 'bench': // Reading row
        return [
          { id: 'view', icon: Eye, label: 'View', enabled: true },
          { 
            id: 'attack', 
            icon: Swords, 
            label: 'Attack', 
            enabled: isMyTurn && hasAttackToken,
            tooltip: hasAttackToken ? 'Move to battlefield to attack' : 'No attack token'
          },
          { 
            id: 'block', 
            icon: Shield, 
            label: 'Block', 
            enabled: !isMyTurn,
            tooltip: 'Move to battlefield to block'
          }
        ];
      
      case 'battlefield': // Manifestation row
        return [
          { id: 'view', icon: Eye, label: 'View', enabled: true },
          { 
            id: 'return', 
            icon: Undo2, 
            label: 'Return', 
            enabled: isMyTurn,
            tooltip: 'Return to reading row'
          }
        ];
      
      default:
        return [];
    }
  };

  const actions = getActions();

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop to catch clicks outside */}
          <div 
            className="fixed inset-0 z-40" 
            onClick={onClose}
          />
          
          {/* Action Menu */}
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: -5 }}
            exit={{ opacity: 0, y: 5 }}
            transition={{ duration: 0.1 }}
            className="fixed z-50"
            style={{
              left: `${position.x}px`,
              top: `${position.y - 10}px`,
              transform: 'translate(-50%, -100%)'
            }}
          >
            <div className="bg-black/95 backdrop-blur-sm rounded-lg border border-tarot-gold/40 shadow-xl">
              <div className="flex gap-0.5 p-1">
                {actions.map((action) => {
                  const Icon = action.icon;
                  return (
                    <button
                      key={action.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (action.enabled) {
                          onAction(action.id as any);
                        }
                      }}
                      disabled={!action.enabled}
                      className={cn(
                        "flex items-center gap-1 px-2 py-2 rounded transition-colors",
                        action.enabled ? 
                          "hover:bg-white/10 text-white" : 
                          "cursor-not-allowed text-gray-500"
                      )}
                      title={action.tooltip || action.label}
                    >
                      <Icon className="w-4 h-4" />
                      {action.id === 'play' && (
                        <span className="text-xs font-bold">
                          {card.cost}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}