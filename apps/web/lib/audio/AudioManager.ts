class AudioManager {
  private sounds: Map<string, HTMLAudioElement[]> = new Map();
  private volume: number = 0.7;
  private muted: boolean = false;
  private basePath: string = '/api/sounds/effects/';
  private initialized: boolean = false;

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
    }
  }

  private initialize() {
    if (this.initialized) return;
    
    // Load settings from localStorage
    const savedVolume = localStorage.getItem('gameVolume');
    const savedMuted = localStorage.getItem('gameMuted');
    
    if (savedVolume) this.volume = parseFloat(savedVolume);
    if (savedMuted) this.muted = savedMuted === 'true';
    
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

  // Play a sound
  async play(soundName: string): Promise<void> {
    if (typeof window === 'undefined') return;
    if (!this.initialized) this.initialize();
    if (this.muted) return;

    if (!this.sounds.has(soundName)) {
      await this.preloadSound(soundName);
    }

    const audioArray = this.sounds.get(soundName);
    if (!audioArray) return;

    // Find an available audio instance or clone one
    let audio = audioArray.find(a => a.paused);
    
    if (!audio) {
      audio = audioArray[0].cloneNode() as HTMLAudioElement;
      audioArray.push(audio);
    }

    audio.volume = this.volume;
    audio.currentTime = 0;
    
    try {
      // Use play() with a promise and handle autoplay policy
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch(error => {
          // Auto-play was prevented, need user interaction
          if (error.name === 'NotAllowedError' || error.name === 'NotSupportedError') {
            // Silently fail for autoplay policy issues
            return;
          }
          console.warn('Failed to play sound:', soundName, error);
        });
      }
    } catch (error) {
      console.warn('Failed to play sound:', soundName, error);
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

  // Volume control
  setVolume(volume: number): void {
    if (typeof window === 'undefined') return;
    this.volume = Math.max(0, Math.min(1, volume));
    localStorage.setItem('gameVolume', this.volume.toString());
    
    // Update all loaded sounds
    this.sounds.forEach(audioArray => {
      audioArray.forEach(audio => {
        audio.volume = this.volume;
      });
    });
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