'use client';

import { motion } from 'framer-motion';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { PixelButton } from '@/components/ui/pixel-button';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { UserProfile, UserStatus } from '@/components/auth/UserProfile';
import {
  Swords,
  Trophy,
  Map,
  BookOpen,
  Settings,
  Users,
  Sparkles,
  Zap,
  Shield
} from 'lucide-react';

export function MainMenu() {
  const router = useRouter();
  const [selectedMode, setSelectedMode] = useState<'pvp' | 'pve' | null>(null);

  const menuItems = [
    {
      id: 'pvp',
      title: 'PvP Duel',
      description: 'Challenge other players in ranked matches',
      icon: <Swords className="w-8 h-8" />,
      color: 'from-red-500 to-orange-500',
      action: () => router.push('/play/pvp')
    },
    {
      id: 'pve',
      title: 'Adventure',
      description: 'Embark on a roguelike journey through the Arcanum',
      icon: <Map className="w-8 h-8" />,
      color: 'from-purple-500 to-pink-500',
      action: () => router.push('/play/pve')
    },
    {
      id: 'collection',
      title: 'Collection',
      description: 'View and manage your card collection',
      icon: <BookOpen className="w-8 h-8" />,
      color: 'from-blue-500 to-cyan-500',
      action: () => router.push('/collection')
    },
    {
      id: 'deck',
      title: 'Deck Builder',
      description: 'Create and customize your decks',
      icon: <Shield className="w-8 h-8" />,
      color: 'from-green-500 to-emerald-500',
      action: () => router.push('/deck-builder')
    },
    {
      id: 'leaderboard',
      title: 'Leaderboard',
      description: 'View rankings and statistics',
      icon: <Trophy className="w-8 h-8" />,
      color: 'from-yellow-500 to-amber-500',
      action: () => router.push('/leaderboard')
    },
    {
      id: 'settings',
      title: 'Settings',
      description: 'Configure game options',
      icon: <Settings className="w-8 h-8" />,
      color: 'from-gray-500 to-slate-500',
      action: () => router.push('/settings')
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-purple-900 to-indigo-900 relative overflow-hidden" data-testid="main-menu">
      {/* Background Effects */}
      <div className="absolute inset-0">
        <div className="absolute top-20 left-20 w-96 h-96 bg-purple-500 rounded-full blur-3xl opacity-20 animate-pulse" />
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-blue-500 rounded-full blur-3xl opacity-20 animate-pulse delay-1000" />
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-yellow-500 rounded-full blur-3xl opacity-10" />
      </div>

      {/* Floating Cards Animation */}
      <div className="absolute inset-0 pointer-events-none">
        {[...Array(6)].map((_, i) => {
          // Use deterministic values based on index
          const xPos = i * 300 + 100;
          const rotation = (i * 60) % 360;
          const duration = 20 + (i * 3);

          return (
            <motion.div
              key={i}
              className="absolute w-20 h-28 bg-gradient-to-br from-purple-600/20 to-blue-600/20 rounded-lg backdrop-blur-sm border border-white/10"
              initial={{
                x: xPos,
                y: 800,
                rotate: rotation
              }}
              animate={{
                y: -200,
                rotate: rotation + 360
              }}
              transition={{
                duration: duration,
                repeat: Infinity,
                delay: i * 2,
                ease: "linear"
              }}
            />
          );
        })}
      </div>

      <div className="relative z-10 container mx-auto px-4 py-8">
        {/* User Profile */}
        <div className="absolute top-4 right-4" data-testid="user-profile">
          <UserProfile />
        </div>

        {/* User Status */}
        <div className="absolute top-4 left-4" data-testid="user-status">
          <UserStatus />
        </div>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <div className="flex justify-center mb-4">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
            >
              <Sparkles className="w-16 h-16 text-yellow-400" />
            </motion.div>
          </div>
          <h1 className="text-6xl font-bold bg-gradient-to-r from-yellow-400 via-orange-400 to-red-400 bg-clip-text text-transparent mb-4">
            Arcanum Tarot
          </h1>
          <p className="text-xl text-gray-300">Master the mystical arts of Tarot warfare</p>
        </motion.div>

        {/* Daily Quests Banner */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="mb-8"
        >
          <Card className="bg-gradient-to-r from-purple-900/50 to-blue-900/50 backdrop-blur-sm border-purple-500/30" data-testid="daily-challenges">
            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Zap className="w-8 h-8 text-yellow-400 animate-pulse" />
                <div>
                  <h3 className="text-lg font-bold text-white">Daily Challenges</h3>
                  <p className="text-sm text-gray-300">Complete 3 matches to earn bonus fate crystals</p>
                </div>
              </div>
              <PixelButton variant="gold" size="md" data-testid="btn-view-challenges">
                VIEW CHALLENGES
              </PixelButton>
            </div>
          </Card>
        </motion.div>

        {/* Main Menu Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" data-testid="menu-grid">
          {menuItems.map((item, index) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Card
                className="relative overflow-hidden cursor-pointer bg-black/40 backdrop-blur-sm border-white/10 hover:border-white/30 transition-all duration-300"
                onClick={item.action}
                data-testid={`menu-item-${item.id}`}
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${item.color} opacity-10`} />
                <div className="relative p-6">
                  <div className={`inline-flex p-3 rounded-lg bg-gradient-to-br ${item.color} mb-4`}>
                    {item.icon}
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">{item.title}</h3>
                  <p className="text-gray-400">{item.description}</p>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Player Stats */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="mt-12 flex justify-center"
        >
          <div className="flex gap-8 bg-black/40 backdrop-blur-sm rounded-lg p-6 border border-white/10">
            <div className="text-center">
              <div className="text-3xl font-bold text-yellow-400">1,234</div>
              <div className="text-sm text-gray-400">Rating</div>
            </div>
            <div className="w-px bg-white/20" />
            <div className="text-center">
              <div className="text-3xl font-bold text-green-400">67%</div>
              <div className="text-sm text-gray-400">Win Rate</div>
            </div>
            <div className="w-px bg-white/20" />
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-400">42</div>
              <div className="text-sm text-gray-400">Decks</div>
            </div>
            <div className="w-px bg-white/20" />
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-400">156</div>
              <div className="text-sm text-gray-400">Matches</div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}