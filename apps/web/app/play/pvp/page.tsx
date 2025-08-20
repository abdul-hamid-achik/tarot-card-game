'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MatchmakingOverlay } from '@/components/game/MatchmakingOverlay';
import { DeckSelector } from '@/components/game/DeckSelector';
import { audioManager } from '@/lib/audio/AudioManager';
import { 
  Swords, 
  Trophy, 
  Clock, 
  Users,
  ChevronLeft,
  Shield,
  Zap,
  Target
} from 'lucide-react';

// Mock deck data - this would come from API
const mockDecks = [
  {
    id: 'deck-1',
    name: 'Wands Aggression',
    description: 'Fast-paced burn deck focused on early damage',
    winRate: 65,
    games: 45,
    cards: 30,
    majorArcana: 2,
    suit: 'wands',
    color: 'from-orange-500 to-red-500'
  },
  {
    id: 'deck-2',
    name: 'Cups Control',
    description: 'Defensive deck with healing and board control',
    winRate: 58,
    games: 32,
    cards: 35,
    majorArcana: 1,
    suit: 'cups',
    color: 'from-blue-500 to-cyan-500'
  },
  {
    id: 'deck-3',
    name: 'Swords Tempo',
    description: 'Balanced deck with counter-play options',
    winRate: 72,
    games: 28,
    cards: 32,
    majorArcana: 2,
    suit: 'swords',
    color: 'from-gray-500 to-purple-500'
  }
];

const gameModes = [
  {
    id: 'ranked',
    name: 'Ranked',
    description: 'Climb the ladder and prove your mastery',
    icon: <Trophy className="w-8 h-8" />,
    color: 'from-yellow-500 to-orange-500',
    details: 'Best of 1 • 90 second turns • Affects rating'
  },
  {
    id: 'casual',
    name: 'Casual',
    description: 'Practice and experiment with new decks',
    icon: <Users className="w-8 h-8" />,
    color: 'from-green-500 to-emerald-500',
    details: 'Best of 1 • 120 second turns • No rating change'
  },
  {
    id: 'tournament',
    name: 'Tournament',
    description: 'Compete in scheduled events for prizes',
    icon: <Target className="w-8 h-8" />,
    color: 'from-purple-500 to-pink-500',
    details: 'Best of 3 • 60 second turns • Entry fee required'
  }
];

export default function PvPPage() {
  const router = useRouter();
  const [selectedDeck, setSelectedDeck] = useState(mockDecks[0]);
  const [selectedDeckId, setSelectedDeckId] = useState<string>('classic');
  const [selectedMode, setSelectedMode] = useState('ranked');
  const [showMatchmaking, setShowMatchmaking] = useState(false);
  const [showDeckSelection, setShowDeckSelection] = useState(false);

  const startQueue = () => {
    audioManager.playRandom('cardReveal');
    setShowDeckSelection(true);
  };

  const handleDeckSelected = (deckId: string) => {
    setSelectedDeckId(deckId);
    setShowDeckSelection(false);
    setShowMatchmaking(true);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-purple-900 to-indigo-900">
      {/* Background Effects */}
      <div className="fixed inset-0 opacity-20">
        <div className="absolute top-20 right-20 w-96 h-96 bg-red-500 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-20 left-20 w-96 h-96 bg-orange-500 rounded-full blur-3xl animate-pulse delay-1000" />
      </div>

      <div className="relative z-10 container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.push('/')}
              className="text-white/70 hover:text-white"
            >
              <ChevronLeft className="w-6 h-6" />
            </Button>
            <div>
              <h1 className="text-4xl font-bold text-white flex items-center gap-3">
                <Swords className="w-10 h-10 text-red-400" />
                PvP Arena
              </h1>
              <p className="text-gray-300 mt-1">Challenge players from around the world</p>
            </div>
          </div>

          {/* Player Stats */}
          <div className="flex gap-4 bg-black/40 backdrop-blur-sm rounded-lg p-4 border border-white/10">
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-400">1,234</div>
              <div className="text-xs text-gray-400">Rating</div>
            </div>
            <div className="w-px bg-white/20" />
            <div className="text-center">
              <div className="text-2xl font-bold text-green-400">67%</div>
              <div className="text-xs text-gray-400">Win Rate</div>
            </div>
          </div>
        </div>

        {/* Game Mode Selection */}
        <div className="mb-8">
          <h2 className="text-xl font-bold text-white mb-4">Select Game Mode</h2>
          <div className="grid md:grid-cols-3 gap-4">
            {gameModes.map((mode) => (
              <motion.div
                key={mode.id}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Card 
                  className={`cursor-pointer transition-all ${
                    selectedMode === mode.id 
                      ? 'ring-2 ring-yellow-400 bg-black/60' 
                      : 'bg-black/40 hover:bg-black/50'
                  } backdrop-blur-sm border-white/10`}
                  onClick={() => setSelectedMode(mode.id)}
                >
                  <CardHeader>
                    <div className={`inline-flex p-3 rounded-lg bg-gradient-to-br ${mode.color} mb-2`}>
                      {mode.icon}
                    </div>
                    <CardTitle className="text-white">{mode.name}</CardTitle>
                    <CardDescription className="text-gray-400">
                      {mode.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xs text-gray-500">{mode.details}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Deck Selection */}
        <div className="mb-8">
          <h2 className="text-xl font-bold text-white mb-4">Select Your Deck</h2>
          <div className="grid md:grid-cols-3 gap-4">
            {mockDecks.map((deck) => (
              <motion.div
                key={deck.id}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Card 
                  className={`cursor-pointer transition-all ${
                    selectedDeck.id === deck.id 
                      ? 'ring-2 ring-yellow-400 bg-black/60' 
                      : 'bg-black/40 hover:bg-black/50'
                  } backdrop-blur-sm border-white/10`}
                  onClick={() => setSelectedDeck(deck)}
                >
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <Shield className={`w-8 h-8 text-${deck.suit === 'wands' ? 'orange' : deck.suit === 'cups' ? 'blue' : deck.suit === 'swords' ? 'purple' : 'green'}-400`} />
                      <Badge className="bg-gradient-to-r from-green-500 to-emerald-500">
                        {deck.winRate}% WR
                      </Badge>
                    </div>
                    <CardTitle className="text-white">{deck.name}</CardTitle>
                    <CardDescription className="text-gray-400">
                      {deck.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>{deck.cards} cards</span>
                      <span>{deck.majorArcana} Major</span>
                      <span>{deck.games} games</span>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Queue Button */}
        <div className="flex justify-center">
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Button
              size="lg"
              onClick={startQueue}
              className="px-12 py-6 text-xl font-bold bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 shadow-lg"
            >
              <Swords className="w-6 h-6 mr-3" />
              Find Match
            </Button>
          </motion.div>
        </div>

        {/* Active Players */}
        <div className="mt-8 text-center">
          <div className="inline-flex items-center gap-2 text-gray-400">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            <span className="text-sm">2,847 players online</span>
          </div>
        </div>
      </div>

      {/* Matchmaking Overlay */}
      <MatchmakingOverlay
        isOpen={showMatchmaking}
        onCancel={() => setShowMatchmaking(false)}
        deckId={selectedDeckId}
      />

      {/* Deck Selection Modal */}
      {showDeckSelection && (
        <div className="fixed inset-0 z-50">
          <DeckSelector
            onSelectDeck={handleDeckSelected}
            onBack={() => setShowDeckSelection(false)}
          />
        </div>
      )}
    </div>
  );
}