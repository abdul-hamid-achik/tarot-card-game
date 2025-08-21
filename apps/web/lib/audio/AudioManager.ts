import { gameLogger } from '@tarot/game-logger';

class AudioManager {
  private sounds: Map<string, HTMLAudioElement[]> = new Map();
  private audioPool: HTMLAudioElement[] = []; // Pool of reusable audio elements
  private poolSize: number = 6; // Allow more overlapping sounds
  private volume: number = 0.7;
  private muted: boolean = false;
  private isSafari: boolean = false;
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
      this.isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
      gameLogger.logAction('audio_manager_init', {
        isSafari: this.isSafari,
        basePath: this.basePath,
        poolSize: this.poolSize,
        userAgent: navigator.userAgent
      }, true, 'AudioManager initialized');

      this.initialize();
      this.initializeAudioPool();
      this.setupSafariUserInteractionTracking();
    }
  }

  private get basePath(): string {
    return `/api/sounds/${this.isSafari ? 'effects-mp3' : 'effects'}/`;
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
    if (this.audioEnabled) {
      gameLogger.logAction('audio_already_enabled', {
        audioEnabled: this.audioEnabled
      }, true, 'Audio system is already enabled');
      return true;
    }

    try {
      gameLogger.logAction('audio_enable_start', {
        isSafari: this.isSafari,
        currentAudioEnabled: this.audioEnabled
      }, true, 'Starting audio system enable process');

      // Resume audio context if it's suspended (required by modern browsers)
      if (typeof window !== 'undefined' && window.AudioContext) {
        try {
          const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
          if (audioContext.state === 'suspended') {
            await audioContext.resume();
            gameLogger.logAction('audio_context_resumed', {}, true);
          }
          audioContext.close(); // Clean up
        } catch (contextError) {
          gameLogger.logAction('audio_context_resume_failed', { error: contextError.message }, false, 'Audio context resume failed');
        }
      }

      // Safari-specific handling: Create multiple test audio attempts
      const testAudios: HTMLAudioElement[] = [];

      // Try different approaches for Safari compatibility
      for (let i = 0; i < 3; i++) {
        const testAudio = new Audio();
        testAudio.volume = 0.001; // Extremely quiet for Safari
        testAudio.muted = true;
        testAudio.preload = 'auto';

        // Set up audio element for all browsers
        const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
        if (isSafari) {
          // Safari specific handling
          testAudio.setAttribute('playsinline', 'playsinline');
          testAudio.setAttribute('webkit-playsinline', 'webkit-playsinline');
          testAudio.crossOrigin = 'anonymous';
        }

        // Try loading a very short silent sound for all browsers
        testAudio.src = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IAAAAAEAAQAiAAAAEAAAAAEACABkYXRhAgAAAAEA';

        testAudios.push(testAudio);
      }

      // Try to play silent sounds to unlock autoplay (Safari requires this)
      let unlockSuccessful = false;
      for (const testAudio of testAudios) {
        try {
          const playPromise = testAudio.play();
          if (playPromise !== undefined) {
            await playPromise;
            testAudio.pause();
            testAudio.remove();
            unlockSuccessful = true;
            gameLogger.logAction('audio_autoplay_unlocked', {}, true, 'Autoplay unlocked successfully');
            break;
          }
        } catch (playError) {
          gameLogger.logAction('audio_test_play_failed', {
            error: playError instanceof Error ? playError.message : 'Unknown error'
          }, false, 'Test audio play failed');
          testAudio.remove();
        }
      }

      if (!unlockSuccessful) {
        // Last resort: create a user interaction dependent unlock
        gameLogger.logAction('audio_autoplay_unlock_failed', { isSafari: this.isSafari }, false, 'Standard autoplay unlock failed, will unlock on user interaction');
        gameLogger.logAction('audio_enable_failed', {
          reason: 'autoplay_unlock_failed',
          isSafari: this.isSafari
        }, false, 'Audio system enable failed - autoplay unlock unsuccessful');
        this.audioEnabled = false;
        localStorage.removeItem('audioEnabled');
        return false;
      }

      this.audioEnabled = true;
      localStorage.setItem('audioEnabled', 'true');
      gameLogger.logAction('audio_system_enabled', {
        isSafari: this.isSafari,
        audioEnabled: this.audioEnabled
      }, true, 'Audio system enabled successfully');
      return true;
    } catch (error) {
      gameLogger.logAction('audio_enable_error', {
        error: error instanceof Error ? error.message : 'Unknown error',
        isSafari: this.isSafari
      }, false, 'Audio system enable failed with error');
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

  // Safari fallback method for audio playback
  private async handleSafariFallback(audio: HTMLAudioElement, soundName: string): Promise<void> {
    // Check if we have a recent user interaction
    const lastInteraction = parseInt(localStorage.getItem('lastUserInteraction') || '0');
    const now = Date.now();
    const timeSinceInteraction = now - lastInteraction;

    if (timeSinceInteraction > 5000) { // 5 seconds
      gameLogger.logAction('audio_no_recent_interaction', {
        isSafari: this.isSafari,
        lastInteraction: lastInteraction
      }, false, 'No recent user interaction for Safari audio');
      return;
    }

    // Try alternative audio loading for Safari
    try {
      // Create a new audio element specifically for Safari
      const safariAudio = new Audio();
      safariAudio.setAttribute('playsinline', 'playsinline');
      safariAudio.setAttribute('webkit-playsinline', 'webkit-playsinline');
      safariAudio.crossOrigin = 'anonymous';
      safariAudio.volume = this.volume;
      safariAudio.muted = false;

      // Try loading with fetch first (Safari sometimes needs this)
      const response = await fetch(`${this.basePath}${soundName}.wav`);
      const arrayBuffer = await response.arrayBuffer();
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

      // Create a source and play it
      const source = audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContext.destination);
      source.start(0);

      gameLogger.logAction('audio_safari_fallback_success', { soundName }, true, 'Safari fallback successful');
    } catch (fallbackError) {
      gameLogger.logAction('audio_web_audio_fallback_failed', {
        soundName,
        error: fallbackError instanceof Error ? fallbackError.message : 'Unknown error'
      }, false, 'Safari Web Audio fallback failed');
    }
  }

  // Track user interactions for Safari
  private setupSafariUserInteractionTracking(): void {
    if (typeof window === 'undefined') return;

    const trackInteraction = () => {
      localStorage.setItem('lastUserInteraction', Date.now().toString());
    };

    // Track various user interaction events
    const events = ['click', 'touchstart', 'keydown', 'scroll'];
    events.forEach(event => {
      document.addEventListener(event, trackInteraction, { passive: true });
    });
  }

  // Debug method to help troubleshoot Safari audio issues
  public debugAudioStatus(): void {
    if (typeof window === 'undefined') return;

    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
    const lastInteraction = parseInt(localStorage.getItem('lastUserInteraction') || '0');
    const timeSinceInteraction = Date.now() - lastInteraction;

    gameLogger.logAction('audio_debug_status', {
      isSafari,
      audioEnabled: this.audioEnabled,
      audioEnabledInStorage: localStorage.getItem('audioEnabled'),
      volume: this.volume,
      muted: this.muted,
      fileFormat: this.isSafari ? 'MP3 (Safari optimized)' : 'WAV (standard)',
      lastUserInteraction: new Date(lastInteraction).toLocaleString(),
      timeSinceInteraction: `${Math.round(timeSinceInteraction / 1000)}s ago`,
      userAgent: navigator.userAgent,
      audioContextState: (window.AudioContext || (window as any).webkitAudioContext)
        ? 'Available'
        : 'Not Available'
    });
  }

  // Preload a sound
  private async preloadSound(soundName: string): Promise<void> {
    if (typeof window === 'undefined') return;
    if (this.sounds.has(soundName)) return;

    // Use MP3 for Safari, WAV for others
    const fileExtension = this.isSafari ? 'mp3' : 'wav';
    const audio = new Audio(`${this.basePath}${soundName}.${fileExtension}`);

    if (this.isSafari) {
      audio.setAttribute('playsinline', 'playsinline');
      audio.setAttribute('webkit-playsinline', 'webkit-playsinline');
      audio.crossOrigin = 'anonymous';
    }

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
      gameLogger.logAction('audio_play_skipped', {
        soundName,
        muted: this.muted,
        audioEnabled: this.audioEnabled,
        reason: this.muted ? 'muted' : 'audio_disabled'
      }, false, 'Audio play skipped due to audio being disabled or muted');
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

      // Only log audio play for non-frequent sounds to reduce verbosity
      if (!soundName.includes('hover') && !soundName.includes('tick')) {
        gameLogger.logAction('audio_play_start', {
          soundName,
          isSafari: this.isSafari,
          volume: this.volume
        }, true, 'Starting audio play');
      }

      // Get an available audio element from the pool
      const audio = this.getAvailableAudioElement();

      // Safari-specific audio setup
      if (this.isSafari) {
        // Safari requires these attributes for audio to work properly
        audio.setAttribute('playsinline', 'playsinline');
        audio.setAttribute('webkit-playsinline', 'webkit-playsinline');
        audio.crossOrigin = 'anonymous';
      }

      // Set the source and volume - prefer MP3 for Safari, WAV for others
      const fileExtension = this.isSafari ? 'mp3' : 'wav';
      const audioUrl = `${this.basePath}${soundName}.${fileExtension}`;
      gameLogger.logAction('audio_loading', { audioUrl, soundName, fileExtension, isSafari: this.isSafari, basePath: this.basePath }, true);
      audio.src = audioUrl;
      audio.volume = this.volume;
      audio.currentTime = 0;
      audio.muted = false;

      // Wait for the audio to be loadable with Safari-specific timeout
      const canPlay = await new Promise<boolean>((resolve) => {
        const timeout = setTimeout(() => {
          gameLogger.logAction('audio_load_timeout', { soundName, isSafari: this.isSafari }, false, 'Audio load timeout');
          resolve(false);
        }, this.isSafari ? 2000 : 1000); // Longer timeout for Safari

        const onCanPlay = () => {
          clearTimeout(timeout);
          audio.removeEventListener('canplay', onCanPlay);
          audio.removeEventListener('error', onError);
          resolve(true);
        };
        const onError = (event: Event) => {
          clearTimeout(timeout);
          audio.removeEventListener('canplay', onCanPlay);
          audio.removeEventListener('error', onError);
          gameLogger.logAction('audio_load_error', {
            soundName,
            error: event instanceof Error ? event.message : 'Load error',
            isSafari: this.isSafari
          }, false, 'Audio load error');
          resolve(false);
        };

        audio.addEventListener('canplay', onCanPlay);
        audio.addEventListener('error', onError);

        // Load the audio
        audio.load();
      });

      if (!canPlay) {
        gameLogger.logAction('audio_load_failed', { soundName, isSafari: this.isSafari }, false, 'Failed to load audio');
        return;
      }

      // Play the sound with Safari-specific error handling
      try {
        const playPromise = audio.play();
        if (playPromise !== undefined) {
          await playPromise.catch(error => {
            // Handle autoplay policy issues
            if (error.name === 'NotAllowedError' || error.name === 'NotSupportedError') {
              gameLogger.logAction('audio_play_blocked', {
                name: error.name,
                message: error.message,
                browser: navigator.userAgent,
                audioEnabled: this.audioEnabled,
                isSafari: this.isSafari
              }, false, 'Audio play blocked by browser. User interaction required.');
              this.audioEnabled = false;
              return;
            }
            gameLogger.logAction('audio_play_failed', {
              soundName,
              error: error.name,
              message: error.message,
              isSafari: this.isSafari
            }, false, 'Failed to play sound');
          });
        }
      } catch (playError) {
        gameLogger.logAction('audio_play_method_error', {
          soundName,
          error: playError instanceof Error ? playError.message : 'Unknown error',
          isSafari: this.isSafari
        }, false, 'Play method threw error');
        // For Safari, try a different approach
        if (this.isSafari) {
          gameLogger.logAction('audio_safari_fallback_attempt', { soundName }, true, 'Attempting Safari fallback');
          try {
            // Force a user interaction check
            await this.handleSafariFallback(audio, soundName);
          } catch (fallbackError) {
            gameLogger.logAction('audio_safari_fallback_failed', {
              soundName,
              error: fallbackError instanceof Error ? fallbackError.message : 'Unknown error'
            }, false, 'Safari fallback failed');
          }
        }
      }

      // Mark timestamps for throttling
      this.lastGlobalPlayAt = now;
      this.lastPlayedAt.set(soundName, now);
      if (categoryOfSound) this.lastCategoryPlayAt.set(categoryOfSound, now);
      this.playTimestamps.push(now);

      // Only log successful audio plays for important sounds
      if (!soundName.includes('hover') && !soundName.includes('tick') && !soundName.includes('cardFlip')) {
        gameLogger.logAction('audio_play_success', {
          soundName,
          isSafari: this.isSafari
        }, true, 'Audio played successfully');
      }
    } catch (error) {
      gameLogger.logAction('audio_play_error', {
        soundName,
        error: error instanceof Error ? error.message : 'Unknown error',
        isSafari: this.isSafari,
        volume: this.volume
      }, false, 'Audio play failed with error');
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
    const oldVolume = this.volume;
    this.volume = Math.max(0, Math.min(1, volume));
    localStorage.setItem('gameVolume', this.volume.toString());

    // Update audio pool volume
    this.audioPool.forEach(audio => {
      audio.volume = this.volume;
    });

    gameLogger.logAction('audio_volume_changed', {
      oldVolume,
      newVolume: this.volume,
      audioEnabled: this.audioEnabled
    }, true, 'Audio volume changed');
  }

  // Check if audio is enabled
  isAudioEnabled(): boolean {
    return this.audioEnabled;
  }

  // Mute control
  setMuted(muted: boolean): void {
    if (typeof window === 'undefined') return;
    const oldMuted = this.muted;
    this.muted = muted;
    localStorage.setItem('gameMuted', muted.toString());

    gameLogger.logAction('audio_mute_changed', {
      oldMuted,
      newMuted: this.muted,
      audioEnabled: this.audioEnabled
    }, !muted, 'Audio mute state changed');
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