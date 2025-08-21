export type AnimationType = 
  | 'card-draw'
  | 'card-play'
  | 'unit-attack'
  | 'unit-block'
  | 'damage'
  | 'heal'
  | 'death'
  | 'spell-effect'
  | 'buff'
  | 'keyword-trigger'
  | 'turn-start'
  | 'turn-end';

export interface Animation {
  id: string;
  type: AnimationType;
  duration: number;
  target?: string; // Element ID or selector
  source?: string; // For animations with source and target
  value?: number; // For damage/heal amounts
  data?: any; // Additional animation-specific data
  onStart?: () => void;
  onComplete?: () => void;
}

export class AnimationQueue {
  private queue: Animation[] = [];
  private isProcessing = false;
  private animationSpeed = 1.0;
  private currentAnimation: Animation | null = null;
  private abortController: AbortController | null = null;

  constructor(speed: number = 1.0) {
    this.animationSpeed = speed;
  }

  /**
   * Add animation to queue
   */
  add(animation: Animation): void {
    this.queue.push(animation);
    if (!this.isProcessing) {
      this.process();
    }
  }

  /**
   * Add multiple animations at once
   */
  addBatch(animations: Animation[]): void {
    this.queue.push(...animations);
    if (!this.isProcessing) {
      this.process();
    }
  }

  /**
   * Process the animation queue
   */
  private async process(): Promise<void> {
    this.isProcessing = true;

    while (this.queue.length > 0) {
      const animation = this.queue.shift()!;
      this.currentAnimation = animation;
      this.abortController = new AbortController();

      try {
        await this.playAnimation(animation);
      } catch (error) {
        console.error('Animation error:', error);
      }

      this.currentAnimation = null;
    }

    this.isProcessing = false;
  }

  /**
   * Play a single animation
   */
  private async playAnimation(animation: Animation): Promise<void> {
    const duration = animation.duration / this.animationSpeed;

    // Call onStart callback
    animation.onStart?.();

    // Perform the actual animation
    switch (animation.type) {
      case 'card-draw':
        await this.animateCardDraw(animation, duration);
        break;
      
      case 'card-play':
        await this.animateCardPlay(animation, duration);
        break;
      
      case 'unit-attack':
        await this.animateUnitAttack(animation, duration);
        break;
      
      case 'unit-block':
        await this.animateUnitBlock(animation, duration);
        break;
      
      case 'damage':
        await this.animateDamage(animation, duration);
        break;
      
      case 'heal':
        await this.animateHeal(animation, duration);
        break;
      
      case 'death':
        await this.animateDeath(animation, duration);
        break;
      
      case 'spell-effect':
        await this.animateSpellEffect(animation, duration);
        break;
      
      case 'buff':
        await this.animateBuff(animation, duration);
        break;
      
      case 'keyword-trigger':
        await this.animateKeywordTrigger(animation, duration);
        break;
      
      case 'turn-start':
      case 'turn-end':
        await this.animateTurnTransition(animation, duration);
        break;
      
      default:
        await this.wait(duration);
    }

    // Call onComplete callback
    animation.onComplete?.();
  }

  /**
   * Animate card draw
   */
  private async animateCardDraw(animation: Animation, duration: number): Promise<void> {
    const target = document.querySelector(animation.target || '');
    if (!target) return;

    // Create card element moving from deck to hand
    const card = document.createElement('div');
    card.className = 'fixed w-24 h-32 bg-gradient-to-br from-purple-600 to-blue-600 rounded-lg shadow-xl z-50';
    card.style.transition = `all ${duration}ms cubic-bezier(0.4, 0, 0.2, 1)`;
    
    // Get deck position
    const deckElement = document.querySelector('[data-deck]');
    const handElement = document.querySelector('[data-hand]');
    
    if (deckElement && handElement) {
      const deckRect = deckElement.getBoundingClientRect();
      const handRect = handElement.getBoundingClientRect();
      
      // Start at deck position
      card.style.left = `${deckRect.left}px`;
      card.style.top = `${deckRect.top}px`;
      
      document.body.appendChild(card);
      
      // Animate to hand
      requestAnimationFrame(() => {
        card.style.left = `${handRect.left + handRect.width / 2}px`;
        card.style.top = `${handRect.top}px`;
        card.style.transform = 'scale(1.1)';
      });
      
      await this.wait(duration);
      card.remove();
    }
  }

  /**
   * Animate card play
   */
  private async animateCardPlay(animation: Animation, duration: number): Promise<void> {
    const source = document.querySelector(animation.source || '');
    const target = document.querySelector(animation.target || '');
    
    if (!source || !target) return;

    const sourceRect = source.getBoundingClientRect();
    const targetRect = target.getBoundingClientRect();

    // Create flying card
    const card = source.cloneNode(true) as HTMLElement;
    card.style.position = 'fixed';
    card.style.left = `${sourceRect.left}px`;
    card.style.top = `${sourceRect.top}px`;
    card.style.width = `${sourceRect.width}px`;
    card.style.height = `${sourceRect.height}px`;
    card.style.transition = `all ${duration}ms cubic-bezier(0.4, 0, 0.2, 1)`;
    card.style.zIndex = '100';
    
    document.body.appendChild(card);

    // Hide original
    (source as HTMLElement).style.opacity = '0';

    // Animate to target
    requestAnimationFrame(() => {
      card.style.left = `${targetRect.left}px`;
      card.style.top = `${targetRect.top}px`;
      card.style.transform = 'scale(0.8) rotateY(180deg)';
    });

    await this.wait(duration);
    card.remove();
    (source as HTMLElement).style.opacity = '1';
  }

  /**
   * Animate unit attack
   */
  private async animateUnitAttack(animation: Animation, duration: number): Promise<void> {
    const attacker = document.querySelector(animation.source || '');
    const target = document.querySelector(animation.target || '');
    
    if (!attacker || !target) return;

    const attackerRect = attacker.getBoundingClientRect();
    const targetRect = target.getBoundingClientRect();

    // Create attack effect
    const effect = document.createElement('div');
    effect.className = 'fixed pointer-events-none z-50';
    effect.innerHTML = `
      <svg width="${Math.abs(targetRect.left - attackerRect.left) + 100}" 
           height="${Math.abs(targetRect.top - attackerRect.top) + 100}">
        <line x1="${attackerRect.left + attackerRect.width/2}" 
              y1="${attackerRect.top + attackerRect.height/2}"
              x2="${targetRect.left + targetRect.width/2}" 
              y2="${targetRect.top + targetRect.height/2}"
              stroke="orange" stroke-width="4" opacity="0"
              stroke-dasharray="10,5">
          <animate attributeName="opacity" from="0" to="1" dur="${duration/2}ms" />
          <animate attributeName="stroke-width" from="4" to="8" dur="${duration/2}ms" />
        </line>
      </svg>
    `;
    
    document.body.appendChild(effect);

    // Shake target on impact
    setTimeout(() => {
      target.classList.add('animate-shake');
    }, duration / 2);

    await this.wait(duration);
    effect.remove();
    target.classList.remove('animate-shake');
  }

  /**
   * Animate damage numbers
   */
  private async animateDamage(animation: Animation, duration: number): Promise<void> {
    const target = document.querySelector(animation.target || '');
    if (!target) return;

    const rect = target.getBoundingClientRect();
    
    // Create damage number
    const damage = document.createElement('div');
    damage.className = 'fixed text-4xl font-bold text-red-500 z-50 pointer-events-none';
    damage.textContent = `-${animation.value}`;
    damage.style.left = `${rect.left + rect.width / 2}px`;
    damage.style.top = `${rect.top}px`;
    damage.style.transform = 'translate(-50%, -50%)';
    damage.style.animation = `float-up ${duration}ms ease-out`;
    
    document.body.appendChild(damage);

    // Add floating animation
    const style = document.createElement('style');
    style.textContent = `
      @keyframes float-up {
        0% { transform: translate(-50%, -50%) scale(0.5); opacity: 0; }
        50% { transform: translate(-50%, -150%) scale(1.5); opacity: 1; }
        100% { transform: translate(-50%, -250%) scale(1); opacity: 0; }
      }
    `;
    document.head.appendChild(style);

    await this.wait(duration);
    damage.remove();
    style.remove();
  }

  /**
   * Animate healing
   */
  private async animateHeal(animation: Animation, duration: number): Promise<void> {
    const target = document.querySelector(animation.target || '');
    if (!target) return;

    const rect = target.getBoundingClientRect();
    
    // Create heal number
    const heal = document.createElement('div');
    heal.className = 'fixed text-4xl font-bold text-green-500 z-50 pointer-events-none';
    heal.textContent = `+${animation.value}`;
    heal.style.left = `${rect.left + rect.width / 2}px`;
    heal.style.top = `${rect.top}px`;
    heal.style.transform = 'translate(-50%, -50%)';
    heal.style.animation = `float-up ${duration}ms ease-out`;
    
    document.body.appendChild(heal);

    // Add glow effect
    (target as HTMLElement).style.boxShadow = '0 0 30px rgba(34, 197, 94, 0.8)';

    await this.wait(duration);
    heal.remove();
    (target as HTMLElement).style.boxShadow = '';
  }

  /**
   * Animate unit death
   */
  private async animateDeath(animation: Animation, duration: number): Promise<void> {
    const target = document.querySelector(animation.target || '');
    if (!target) return;

    (target as HTMLElement).style.transition = `all ${duration}ms ease-in`;
    (target as HTMLElement).style.transform = 'scale(0) rotate(360deg)';
    (target as HTMLElement).style.opacity = '0';

    await this.wait(duration);
  }

  /**
   * Animate spell effect
   */
  private async animateSpellEffect(animation: Animation, duration: number): Promise<void> {
    const target = document.querySelector(animation.target || '');
    if (!target) return;

    const rect = target.getBoundingClientRect();

    // Create spell effect overlay
    const effect = document.createElement('div');
    effect.className = 'fixed pointer-events-none z-50';
    effect.style.left = `${rect.left}px`;
    effect.style.top = `${rect.top}px`;
    effect.style.width = `${rect.width}px`;
    effect.style.height = `${rect.height}px`;
    effect.style.background = 'radial-gradient(circle, rgba(147,51,234,0.8) 0%, transparent 70%)';
    effect.style.animation = `pulse ${duration}ms ease-in-out`;
    
    document.body.appendChild(effect);

    await this.wait(duration);
    effect.remove();
  }

  /**
   * Animate buff application
   */
  private async animateBuff(animation: Animation, duration: number): Promise<void> {
    const target = document.querySelector(animation.target || '');
    if (!target) return;

    // Add buff indicator
    const buff = document.createElement('div');
    buff.className = 'absolute -top-2 -right-2 w-6 h-6 bg-yellow-500 rounded-full animate-pulse z-10';
    (target as HTMLElement).appendChild(buff);

    await this.wait(duration);
  }

  /**
   * Animate keyword trigger
   */
  private async animateKeywordTrigger(animation: Animation, duration: number): Promise<void> {
    const target = document.querySelector(animation.target || '');
    if (!target) return;

    // Show keyword name
    const keyword = document.createElement('div');
    keyword.className = 'fixed text-2xl font-bold text-yellow-400 z-50 pointer-events-none';
    keyword.textContent = animation.data?.keyword || 'TRIGGERED';
    
    const rect = target.getBoundingClientRect();
    keyword.style.left = `${rect.left + rect.width / 2}px`;
    keyword.style.top = `${rect.top - 20}px`;
    keyword.style.transform = 'translate(-50%, -50%) scale(0)';
    keyword.style.transition = `all ${duration}ms cubic-bezier(0.68, -0.55, 0.265, 1.55)`;
    
    document.body.appendChild(keyword);

    requestAnimationFrame(() => {
      keyword.style.transform = 'translate(-50%, -50%) scale(1.2)';
    });

    await this.wait(duration * 0.7);
    keyword.style.opacity = '0';
    
    await this.wait(duration * 0.3);
    keyword.remove();
  }

  /**
   * Animate turn transition
   */
  private async animateTurnTransition(animation: Animation, duration: number): Promise<void> {
    const banner = document.createElement('div');
    banner.className = 'fixed inset-0 flex items-center justify-center z-50 pointer-events-none';
    banner.innerHTML = `
      <div class="text-6xl font-bold text-white bg-gradient-to-r from-blue-600 to-purple-600 px-8 py-4 rounded-lg shadow-2xl"
           style="animation: slide-in ${duration}ms ease-in-out">
        ${animation.type === 'turn-start' ? 'YOUR TURN' : 'TURN END'}
      </div>
    `;
    
    document.body.appendChild(banner);

    await this.wait(duration);
    banner.remove();
  }

  /**
   * Wait for duration
   */
  private wait(ms: number): Promise<void> {
    return new Promise(resolve => {
      const timeout = setTimeout(resolve, ms);
      
      // Allow cancellation
      if (this.abortController) {
        this.abortController.signal.addEventListener('abort', () => {
          clearTimeout(timeout);
          resolve();
        });
      }
    });
  }

  /**
   * Clear the queue
   */
  clear(): void {
    this.queue = [];
    this.abortController?.abort();
  }

  /**
   * Set animation speed
   */
  setSpeed(speed: number): void {
    this.animationSpeed = Math.max(0.1, Math.min(10, speed));
  }

  /**
   * Get queue length
   */
  getQueueLength(): number {
    return this.queue.length;
  }

  /**
   * Check if animating
   */
  isAnimating(): boolean {
    return this.isProcessing;
  }
}