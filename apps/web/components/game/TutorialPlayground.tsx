'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { GameBoard } from '@/components/game/GameBoard';
import { useGameStore, Card } from '@/lib/store/gameStore';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { EnemyAI, enemyTemplates } from '@/lib/ai/EnemyAI';

function generateDeck(count: number, prefix: string): Card[] {
    const cards: Card[] = [];
    const sampleCards = [
        { id: 'major_00', name: 'The Fool', suit: 'major', cost: 0, attack: 1, health: 4 },
        { id: 'major_01', name: 'The Magician', suit: 'major', cost: 1, attack: 2, health: 3 },
        { id: 'major_02', name: 'The High Priestess', suit: 'major', cost: 2, attack: 1, health: 5 },
        { id: 'major_03', name: 'The Empress', suit: 'major', cost: 3, attack: 2, health: 6 },
        { id: 'major_04', name: 'The Emperor', suit: 'major', cost: 4, attack: 4, health: 5 },
        { id: 'wands_01', name: 'Ace of Wands', suit: 'wands', cost: 1, attack: 3, health: 2 },
        { id: 'cups_02', name: 'Two of Cups', suit: 'cups', cost: 2, attack: 2, health: 4 },
        { id: 'swords_03', name: 'Three of Swords', suit: 'swords', cost: 3, attack: 4, health: 3 },
        { id: 'pentacles_04', name: 'Four of Pentacles', suit: 'pentacles', cost: 4, attack: 3, health: 5 },
        { id: 'wands_knight', name: 'Knight of Wands', suit: 'wands', cost: 3, attack: 4, health: 4 },
        { id: 'cups_queen', name: 'Queen of Cups', suit: 'cups', cost: 4, attack: 3, health: 6 },
        { id: 'swords_king', name: 'King of Swords', suit: 'swords', cost: 5, attack: 5, health: 5 },
        { id: 'pentacles_page', name: 'Page of Pentacles', suit: 'pentacles', cost: 2, attack: 2, health: 3 },
        { id: 'cups_knight', name: 'Knight of Cups', suit: 'cups', cost: 3, attack: 3, health: 4 },
        { id: 'swords_queen', name: 'Queen of Swords', suit: 'swords', cost: 4, attack: 4, health: 4 },
    ];

    for (let i = 0; i < count; i++) {
        const template = sampleCards[i % sampleCards.length] as any;
        cards.push({
            id: `${prefix}-${i}-${template.id}`,
            name: template.name,
            suit: template.suit,
            cost: template.cost,
            attack: template.attack,
            health: template.health,
            orientation: Math.random() > 0.8 ? 'reversed' : 'upright',
            description: `${template.name} - A mystical tarot card`,
            type: 'unit',
            rarity: template.suit === 'major' ? 'mythic' : 'common',
            deck: 'classic',
            imageUrl: `/api/card-image?id=${template.id}&deck=classic`,
            backImageUrl: '/api/ui/themes/pixel-pack/sheets/card_ui_01.png'
        });
    }
    return cards;
}

export function TutorialPlayground() {
    const { currentMatch, initializeMatch, playCard, startCombat, endTurn } = useGameStore();
    const [tutorialEnabled, setTutorialEnabled] = useState(true);
    const [ai, setAi] = useState<EnemyAI | null>(null);
    const [isAIThinking, setIsAIThinking] = useState(false);
    const aiActionCountRef = useRef<number>(0); // Track AI actions to allow multiple per turn

    const enemy = useMemo(() => enemyTemplates[0], []);

    function initMatch(playerStarts: boolean) {
        // Reset AI state
        aiActionCountRef.current = 0;
        setIsAIThinking(false);
        
        const playerDeck = generateDeck(30, 'player');
        const aiDeck = generateDeck(30, 'ai');

        const playerHand = playerDeck.slice(0, 5);
        const aiHand = aiDeck.slice(0, 5);

        initializeMatch({
            matchId: `tutorial-${Date.now()}`,
            type: tutorialEnabled ? 'tutorial' : 'pve',
            players: {
                player1: {
                    id: 'player1',
                    name: 'You',
                    health: 30,
                    maxHealth: 30,
                    maxFate: playerStarts ? 1 : 0,
                    fate: playerStarts ? 1 : 0,
                    spellMana: 0,
                    hand: playerHand,
                    deck: playerDeck.slice(5),
                    discard: [],
                    bench: Array(6).fill(null),
                    battlefield: Array(6).fill(null),
                    trials: []
                },
                ai: {
                    id: 'ai',
                    name: enemy.name,
                    health: 30,
                    maxHealth: 30,
                    maxFate: playerStarts ? 0 : 1,
                    fate: playerStarts ? 0 : 1,
                    spellMana: 0,
                    hand: aiHand,
                    deck: aiDeck.slice(5),
                    discard: [],
                    bench: Array(6).fill(null),
                    battlefield: Array(6).fill(null),
                    isAI: true,
                    avatar: enemy.portrait,
                    trials: []
                }
            },
            activePlayer: playerStarts ? 'player1' : 'ai',
            attackTokenOwner: playerStarts ? 'player1' : 'ai',
            turn: 1,
            phase: 'main',
            turnTimer: 60
        });
    }

    useEffect(() => {
        // init AI and match on mount
        setAi(new EnemyAI(enemy));
        initMatch(true);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        // AI acts when it has priority and isn't already thinking
        if (currentMatch?.activePlayer === 'ai' && ai && !isAIThinking) {
            // Add a small delay to make it feel more natural
            const timer = setTimeout(() => {
                handleAITurn();
            }, 500);
            return () => clearTimeout(timer);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentMatch?.activePlayer, currentMatch?.turn, currentMatch?.lastPassBy]);

    async function handleAITurn() {
        if (!ai || !currentMatch) return;
        setIsAIThinking(true);
        const aiPlayer = currentMatch.players['ai'];
        const playerBoard = currentMatch.players['player1'].bench || currentMatch.players['player1'].board;
        await new Promise(r => setTimeout(r, 600));

        let remainingFate = (aiPlayer.fate || 0) + (aiPlayer.spellMana || 0);
        
        // AI should only play ONE card per priority pass (LoR style)
        // Playing a card will pass priority back to the player
        const decision = await ai.decideCardToPlay(
            aiPlayer.hand,
            remainingFate,
            aiPlayer.bench || aiPlayer.board || [],
            playerBoard || [],
            currentMatch.phase
        );
        if (decision && decision.card.cost <= remainingFate) {
            playCard(decision.card, decision.targetSlot, 'ai');
            await new Promise(r => setTimeout(r, 350));
            // Priority will pass to player after playing
            setIsAIThinking(false);
            return; // Exit after playing one card
        }

        // If no card to play, check if AI should attack
        await new Promise(r => setTimeout(r, 300));
        const latest = useGameStore.getState().currentMatch;
        const aiHasUnits = latest?.players['ai'].bench?.some((u: any) => u !== null) || latest?.players['ai'].board?.some((s: any) => s?.card);
        if (latest?.attackTokenOwner === 'ai' && aiHasUnits && latest?.phase === 'main') {
            startCombat();
            await new Promise(r => setTimeout(r, 500));
            setIsAIThinking(false);
            return; // Exit after starting combat
        }
        
        // If nothing to do, pass turn (which passes priority to player)
        endTurn();
        setIsAIThinking(false);
    }

    return (
        <div className="w-full">
            <div className="mx-auto max-w-7xl px-4 pt-6">
                <div className="mb-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Label htmlFor="tutorial-toggle" className="text-white">Tutorial</Label>
                        <Switch id="tutorial-toggle" checked={tutorialEnabled} onCheckedChange={(v: boolean) => setTutorialEnabled(Boolean(v))} />
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="secondary" onClick={() => initMatch(true)}>Player starts</Button>
                        <Button onClick={() => initMatch(false)}>AI starts</Button>
                    </div>
                </div>
            </div>

            <GameBoard disableAI={true} />

            {isAIThinking && (
                <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50">
                    <div className="bg-black/80 backdrop-blur-sm rounded-lg px-6 py-3 border border-purple-500/50 text-white">
                        AI is thinking...
                    </div>
                </div>
            )}
        </div>
    );
}

export default TutorialPlayground;


