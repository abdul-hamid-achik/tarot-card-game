class AudioManager {
  private sounds: Map<string, HTMLAudioElement[]> = new Map();
  private audioPool: HTMLAudioElement[] = []; // Pool of reusable audio elements
  private poolSize: number = 6; // Allow more overlapping sounds
  private volume: number = 0.7;
  private muted: boolean = false;
  private basePath: string = '/api/sounds/effects/';
  private initialized: boolean = false;
  private audioEnabled: boolean = false;

  // Throttling and rate limiting
  private lastGlobalPlayAt: number = 0;
  private globalCooldownMs: number = 50; // Minimum gap between any two sounds
  private defaultCooldownMs: number = 120; // Per-sound default cooldown
  private lastPlayedAt: Map<string, number> = new Map();
  private perSoundCooldownMs: Map<string, number> = new Map();
  private perCategoryCooldownMs: Map<string, number> = new Map();
  private lastCategoryPlayAt: Map<string, number> = new Map();
  private playTimestamps: number[] = [];
  private maxPlaysPerSecond: number = 12; // Hard cap to avoid sound spam

  // Sound categories for easy access
  private soundCategories = {
    cardDraw: ['card_draw_01', 'card_draw_02', 'card_draw_03', 'card_draw_04', 'card_draw_05'],
    cardPlace: ['card_place_01', 'card_place_02', 'card_place_03', 'card_place_04', 'card_place_05'],
    cardFlip: ['card_flip_01', 'card_flip_02', 'card_flip_03', 'card_flip_04', 'card_flip_05'],
    cardReveal: ['card_reveal_01', 'card_reveal_02', 'card_reveal_03', 'card_reveal_04', 'card_reveal_05'],
    cardDiscard: ['card_discard_01', 'card_discard_02', 'card_discard_03', 'card_discard_04', 'card_discard_05'],
    cardShuffle: ['card_shuffle_01', 'card_shuffle_02', 'card_shuffle_03', 'card_shuffle_04'],
    cardDeal: ['card_deal_01', 'card_deal_02', 'card_deal_03', 'card_deal_04', 'card_deal_05'],
    cardSlide: ['card_slide_01', 'card_slide_02', 'card_slide_03', 'card_slide_04', 'card_slide_05'],
    turnChange: ['turn_change_01', 'turn_change_02', 'turn_change_03', 'turn_change_04'],
    turnPass: ['turn_pass_01', 'turn_pass_02', 'turn_pass_03', 'turn_pass_04'],
    coinFlip: ['coin_flip_01', 'coin_flip_02', 'coin_flip_03'],
    coinFall: ['coin_fall_01', 'coin_fall_02', 'coin_fall_03'],
    diceRoll: ['dice_roll_01', 'dice_roll_02', 'dice_roll_03', 'dice_roll_04'],
    // Combat and feedback sounds (we can use various sounds for these)
    enemyEncounter: ['card_reveal_05', 'turn_change_01'],
    victory: ['coin_flip_01', 'coin_flip_02'],
    defeat: ['coin_fall_01', 'coin_fall_02'],
  };

  constructor() {
    // Only access localStorage on client side
    if (typeof window !== 'undefined') {
      this.initialize();
      this.initializeAudioPool();
    }
  }

  // Initialize the audio element pool
  private initializeAudioPool() {
    for (let i = 0; i < this.poolSize; i++) {
      const audio = new Audio();
      audio.volume = this.volume;
      audio.preload = 'none'; // Don't preload to save bandwidth
      this.audioPool.push(audio);
    }
  }

  // Get an available audio element from the pool
  private getAvailableAudioElement(): HTMLAudioElement {
    // Find an ended or paused audio element
    let audio = this.audioPool.find(a => a.ended || a.paused);
    if (!audio) {
      // If none available, use the first one (oldest)
      audio = this.audioPool[0];
      audio.pause();
      audio.currentTime = 0;
    }
    return audio;
  }

  // Enable audio with proper user interaction
  async enableAudio(): Promise<boolean> {
    if (this.audioEnabled) return true;

    try {
      console.log('🎵 Enabling audio system...');

      // Resume audio context if it's suspended (required by modern browsers)
      if (typeof window !== 'undefined' && window.AudioContext) {
        try {
          const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
          if (audioContext.state === 'suspended') {
            await audioContext.resume();
            console.log('🎵 Audio context resumed');
          }
          audioContext.close(); // Clean up
        } catch (contextError) {
          console.warn('Audio context resume failed:', contextError);
        }
      }

      // Create a silent test audio to unlock autoplay
      const testAudio = new Audio();
      testAudio.volume = 0.01; // Very quiet
      testAudio.muted = true;

      // Try to play a silent sound to unlock autoplay
      const playPromise = testAudio.play();
      if (playPromise !== undefined) {
        await playPromise;
        testAudio.pause();
        testAudio.remove();
      }

      this.audioEnabled = true;
      localStorage.setItem('audioEnabled', 'true');
      console.log('🎵 Audio system enabled successfully');
      return true;
    } catch (error) {
      console.error('🎵 Failed to enable audio:', error);
      this.audioEnabled = false;
      localStorage.removeItem('audioEnabled');
      return false;
    }
  }

  // Set audio enabled state without playing test audio (for loading from localStorage)
  setAudioEnabled(enabled: boolean): void {
    this.audioEnabled = enabled;
    if (enabled) {
      localStorage.setItem('audioEnabled', 'true');
    } else {
      localStorage.removeItem('audioEnabled');
    }
  }

  private initialize() {
    if (this.initialized) return;

    // Load settings from localStorage
    const savedVolume = localStorage.getItem('gameVolume');
    const savedMuted = localStorage.getItem('gameMuted');
    const savedAudioEnabled = localStorage.getItem('audioEnabled');

    if (savedVolume) this.volume = parseFloat(savedVolume);
    if (savedMuted) this.muted = savedMuted === 'true';
    if (savedAudioEnabled) this.audioEnabled = savedAudioEnabled === 'true';

    this.initialized = true;
  }

  // Preload a sound
  private async preloadSound(soundName: string): Promise<void> {
    if (typeof window === 'undefined') return;
    if (this.sounds.has(soundName)) return;

    const audio = new Audio(`${this.basePath}${soundName}.wav`);
    audio.volume = this.volume;
    audio.preload = 'auto';

    // Store multiple instances for overlapping sounds
    this.sounds.set(soundName, [audio]);
  }

  // Play a sound using the audio pool
  async play(soundName: string): Promise<void> {
    if (typeof window === 'undefined') return;
    if (!this.initialized) this.initialize();
    if (this.muted || !this.audioEnabled) {
      console.log('🎵 Audio play skipped:', { soundName, muted: this.muted, audioEnabled: this.audioEnabled });
      return;
    }

    try {
      // Throttle globally
      const now = Date.now();
      if (now - this.lastGlobalPlayAt < this.globalCooldownMs) {
        // Too soon after last play
        return;
      }

      // Determine category of the sound if present
      const categoryOfSound = this.getCategoryOfSound(soundName);

      // Throttle by category
      if (categoryOfSound) {
        const categoryCooldown = this.perCategoryCooldownMs.get(categoryOfSound) ?? 0;
        const lastCategoryAt = this.lastCategoryPlayAt.get(categoryOfSound) ?? 0;
        if (categoryCooldown > 0 && now - lastCategoryAt < categoryCooldown) {
          return;
        }
      }

      // Throttle by sound
      const soundCooldown = this.perSoundCooldownMs.get(soundName) ?? this.defaultCooldownMs;
      const lastAt = this.lastPlayedAt.get(soundName) ?? 0;
      if (now - lastAt < soundCooldown) {
        return;
      }

      // Rate limit by plays per second
      this.pruneOldPlays(now);
      if (this.playTimestamps.length >= this.maxPlaysPerSecond) {
        return;
      }

      console.log('🎵 Playing sound:', soundName);

      // Get an available audio element from the pool
      const audio = this.getAvailableAudioElement();

      // Set the source and volume
      audio.src = `${this.basePath}${soundName}.wav`;
      audio.volume = this.volume;
      audio.currentTime = 0;
      audio.muted = false;

      // Wait for the audio to be loadable
      const canPlay = await new Promise<boolean>((resolve) => {
        const onCanPlay = () => {
          audio.removeEventListener('canplay', onCanPlay);
          resolve(true);
        };
        const onError = () => {
          audio.removeEventListener('error', onError);
          resolve(false);
        };

        audio.addEventListener('canplay', onCanPlay);
        audio.addEventListener('error', onError);

        // Load the audio
        audio.load();
      });

      if (!canPlay) {
        console.warn('Failed to load audio:', soundName);
        return;
      }

      // Play the sound
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        await playPromise.catch(error => {
          // Handle autoplay policy issues
          if (error.name === 'NotAllowedError' || error.name === 'NotSupportedError') {
            console.warn('🎵 Audio play blocked by browser. User interaction required.');
            this.audioEnabled = false;
            return;
          }
          console.warn('🎵 Failed to play sound:', soundName, error);
        });
      }

      // Mark timestamps for throttling
      this.lastGlobalPlayAt = now;
      this.lastPlayedAt.set(soundName, now);
      if (categoryOfSound) this.lastCategoryPlayAt.set(categoryOfSound, now);
      this.playTimestamps.push(now);

      console.log('🎵 Successfully played:', soundName);
    } catch (error) {
      console.error('🎵 Error playing sound:', soundName, error);
    }
  }

  // Play a random sound from a category
  async playRandom(category: keyof typeof this.soundCategories): Promise<void> {
    const sounds = this.soundCategories[category];
    if (!sounds || sounds.length === 0) return;

    const randomSound = sounds[Math.floor(Math.random() * sounds.length)];
    await this.play(randomSound);
  }

  // Preload all sounds in a category
  async preloadCategory(category: keyof typeof this.soundCategories): Promise<void> {
    if (typeof window === 'undefined') return;
    const sounds = this.soundCategories[category];
    if (!sounds) return;

    await Promise.all(sounds.map(sound => this.preloadSound(sound)));
  }

  // Preload common game sounds
  async preloadGameSounds(): Promise<void> {
    if (typeof window === 'undefined') return;
    const categories: (keyof typeof this.soundCategories)[] = [
      'cardDraw', 'cardPlace', 'cardFlip', 'turnChange'
    ];

    await Promise.all(categories.map(cat => this.preloadCategory(cat)));
  }

  // Throttling configuration
  configureThrottle(options: {
    globalCooldownMs?: number;
    defaultCooldownMs?: number;
    maxPlaysPerSecond?: number;
  }): void {
    if (typeof window === 'undefined') return;
    if (typeof options.globalCooldownMs === 'number') this.globalCooldownMs = Math.max(0, options.globalCooldownMs);
    if (typeof options.defaultCooldownMs === 'number') this.defaultCooldownMs = Math.max(0, options.defaultCooldownMs);
    if (typeof options.maxPlaysPerSecond === 'number') this.maxPlaysPerSecond = Math.max(1, options.maxPlaysPerSecond);
  }

  setPerSoundCooldown(soundName: string, ms: number): void {
    if (typeof window === 'undefined') return;
    this.perSoundCooldownMs.set(soundName, Math.max(0, ms));
  }

  setCategoryCooldown(category: keyof typeof this.soundCategories, ms: number): void {
    if (typeof window === 'undefined') return;
    this.perCategoryCooldownMs.set(String(category), Math.max(0, ms));
  }

  // Helpers
  private pruneOldPlays(now: number): void {
    const oneSecondAgo = now - 1000;
    if (this.playTimestamps.length === 0) return;
    // Keep only timestamps within the last second
    let startIndex = 0;
    for (let i = 0; i < this.playTimestamps.length; i++) {
      if (this.playTimestamps[i] >= oneSecondAgo) { startIndex = i; break; }
    }
    if (startIndex > 0) this.playTimestamps = this.playTimestamps.slice(startIndex);
  }

  private getCategoryOfSound(soundName: string): string | null {
    for (const key of Object.keys(this.soundCategories)) {
      const list = (this.soundCategories as Record<string, string[]>)[key];
      if (list?.includes(soundName)) return key;
    }
    return null;
  }

  // Volume control
  setVolume(volume: number): void {
    if (typeof window === 'undefined') return;
    this.volume = Math.max(0, Math.min(1, volume));
    localStorage.setItem('gameVolume', this.volume.toString());

    // Update audio pool volume
    this.audioPool.forEach(audio => {
      audio.volume = this.volume;
    });
  }

  // Check if audio is enabled
  isAudioEnabled(): boolean {
    return this.audioEnabled;
  }

  // Mute control
  setMuted(muted: boolean): void {
    if (typeof window === 'undefined') return;
    this.muted = muted;
    localStorage.setItem('gameMuted', muted.toString());
  }

  toggleMute(): void {
    this.setMuted(!this.muted);
  }

  getVolume(): number {
    return this.volume;
  }

  isMuted(): boolean {
    return this.muted;
  }
}

// Export singleton instance
export const audioManager = new AudioManager();