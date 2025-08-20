'use client';

import { useEffect } from 'react';
import { audioManager } from '@/lib/audio/AudioManager';

export function AudioBootstrap() {
    useEffect(() => {
        // Configure reasonable throttling defaults
        audioManager.configureThrottle({
            globalCooldownMs: 60,
            defaultCooldownMs: 150,
            maxPlaysPerSecond: 10,
        });

        // Optional: tune a few categories commonly spammed
        audioManager.setCategoryCooldown('cardDeal', 120);
        audioManager.setCategoryCooldown('cardFlip', 80);
        audioManager.setCategoryCooldown('cardReveal', 120);
    }, []);

    return null;
}


