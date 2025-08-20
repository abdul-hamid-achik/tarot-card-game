'use client';

import { useState, useEffect } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { Button } from './button';
import { audioManager } from '@/lib/audio/AudioManager';

export function AudioEnabler() {
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    // Check if audio was previously enabled
    const enabled = localStorage.getItem('audioEnabled') === 'true';
    if (enabled) {
      setAudioEnabled(true);
      setIsVisible(false);
    }
  }, []);

  const handleEnableAudio = async () => {
    // Create a user gesture context for audio
    const testAudio = new Audio();
    testAudio.volume = 0.1;
    
    try {
      await testAudio.play();
      testAudio.pause();
      
      // Audio is now enabled
      setAudioEnabled(true);
      localStorage.setItem('audioEnabled', 'true');
      audioManager.setMuted(false);
      
      // Play a sound to confirm
      await audioManager.playRandom('coinFlip');
      
      // Hide the button after a moment
      setTimeout(() => setIsVisible(false), 500);
    } catch (error) {
      console.warn('Could not enable audio:', error);
    }
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <Button
        onClick={handleEnableAudio}
        className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white shadow-lg animate-pulse"
        size="lg"
      >
        <Volume2 className="w-5 h-5 mr-2" />
        Enable Sound
      </Button>
    </div>
  );
}