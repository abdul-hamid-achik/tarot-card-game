'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Settings, 
  Volume2, 
  VolumeX, 
  X,
  Music,
  Monitor,
  Gamepad2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PixelButton } from '@/components/ui/pixel-button';
import { Card } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { audioManager } from '@/lib/audio/AudioManager';
import { cn } from '@/lib/utils';

export function SettingsMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const [volume, setVolume] = useState(70);
  const [isMuted, setIsMuted] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(false);

  useEffect(() => {
    // Check audio settings
    const enabled = localStorage.getItem('audioEnabled') === 'true';
    setAudioEnabled(enabled);
    setVolume(audioManager.getVolume() * 100);
    setIsMuted(audioManager.isMuted());
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
    } catch (error) {
      console.warn('Could not enable audio:', error);
    }
  };

  const handleVolumeChange = (value: number[]) => {
    const newVolume = value[0];
    setVolume(newVolume);
    audioManager.setVolume(newVolume / 100);
  };

  const handleMuteToggle = () => {
    const newMuted = !isMuted;
    setIsMuted(newMuted);
    audioManager.setMuted(newMuted);
  };

  return (
    <>
      {/* Settings Button */}
      <Button
        onClick={() => setIsOpen(true)}
        size="icon"
        variant="ghost"
        className="fixed top-4 right-4 z-40 bg-black/40 backdrop-blur-sm border border-white/10 hover:bg-white/10"
      >
        <Settings className="w-5 h-5 text-white" />
      </Button>

      {/* Settings Modal */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
              onClick={() => setIsOpen(false)}
            />

            {/* Settings Panel */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed inset-x-4 top-[10%] bottom-[10%] md:inset-x-auto md:left-1/2 md:transform md:-translate-x-1/2 md:w-[600px] z-50"
            >
              <Card className="h-full bg-gradient-to-b from-slate-900 to-purple-900 border-purple-500/30 overflow-hidden">
                <div className="flex items-center justify-between p-6 border-b border-white/10">
                  <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                    <Settings className="w-6 h-6" />
                    Settings
                  </h2>
                  <Button
                    onClick={() => setIsOpen(false)}
                    size="icon"
                    variant="ghost"
                    className="text-white hover:bg-white/10"
                  >
                    <X className="w-5 h-5" />
                  </Button>
                </div>

                <Tabs defaultValue="audio" className="h-[calc(100%-88px)]">
                  <TabsList className="w-full bg-black/20 border-b border-white/10 rounded-none">
                    <TabsTrigger value="audio" className="flex-1">
                      <Volume2 className="w-4 h-4 mr-2" />
                      Audio
                    </TabsTrigger>
                    <TabsTrigger value="graphics" className="flex-1">
                      <Monitor className="w-4 h-4 mr-2" />
                      Graphics
                    </TabsTrigger>
                    <TabsTrigger value="gameplay" className="flex-1">
                      <Gamepad2 className="w-4 h-4 mr-2" />
                      Gameplay
                    </TabsTrigger>
                  </TabsList>

                  <div className="p-6 overflow-y-auto h-[calc(100%-48px)]">
                    {/* Audio Settings */}
                    <TabsContent value="audio" className="space-y-6 mt-0">
                      {!audioEnabled ? (
                        <Card className="bg-black/40 border-yellow-500/50 p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <h3 className="text-white font-bold mb-1">Enable Audio</h3>
                              <p className="text-sm text-gray-400">
                                Click to enable sound effects and music
                              </p>
                            </div>
                            <PixelButton
                              onClick={handleEnableAudio}
                              variant="blue"
                              size="md"
                            >
                              ENABLE
                            </PixelButton>
                          </div>
                        </Card>
                      ) : (
                        <>
                          <div className="space-y-4">
                            <div className="flex items-center justify-between">
                              <Label className="text-white">Master Volume</Label>
                              <span className="text-white text-sm">{volume}%</span>
                            </div>
                            <Slider
                              value={[volume]}
                              onValueChange={handleVolumeChange}
                              max={100}
                              step={1}
                              className="w-full"
                              disabled={isMuted}
                            />
                          </div>

                          <div className="flex items-center justify-between">
                            <Label htmlFor="mute" className="text-white">Mute All Sounds</Label>
                            <Switch
                              id="mute"
                              checked={isMuted}
                              onCheckedChange={handleMuteToggle}
                            />
                          </div>

                          <div className="flex items-center justify-between">
                            <Label htmlFor="music" className="text-white">Background Music</Label>
                            <Switch
                              id="music"
                              checked={true}
                              onCheckedChange={() => {}}
                            />
                          </div>

                          <div className="flex items-center justify-between">
                            <Label htmlFor="sfx" className="text-white">Sound Effects</Label>
                            <Switch
                              id="sfx"
                              checked={true}
                              onCheckedChange={() => {}}
                            />
                          </div>
                        </>
                      )}
                    </TabsContent>

                    {/* Graphics Settings */}
                    <TabsContent value="graphics" className="space-y-6 mt-0">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="animations" className="text-white">Card Animations</Label>
                        <Switch
                          id="animations"
                          checked={true}
                          onCheckedChange={() => {}}
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <Label htmlFor="particles" className="text-white">Particle Effects</Label>
                        <Switch
                          id="particles"
                          checked={true}
                          onCheckedChange={() => {}}
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <Label htmlFor="quality" className="text-white">High Quality Mode</Label>
                        <Switch
                          id="quality"
                          checked={false}
                          onCheckedChange={() => {}}
                        />
                      </div>
                    </TabsContent>

                    {/* Gameplay Settings */}
                    <TabsContent value="gameplay" className="space-y-6 mt-0">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="hints" className="text-white">Show Hints</Label>
                        <Switch
                          id="hints"
                          checked={true}
                          onCheckedChange={() => {}}
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <Label htmlFor="confirm" className="text-white">Confirm Actions</Label>
                        <Switch
                          id="confirm"
                          checked={false}
                          onCheckedChange={() => {}}
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <Label htmlFor="timer" className="text-white">Show Turn Timer</Label>
                        <Switch
                          id="timer"
                          checked={true}
                          onCheckedChange={() => {}}
                        />
                      </div>
                    </TabsContent>
                  </div>
                </Tabs>
              </Card>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}