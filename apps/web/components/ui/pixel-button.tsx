'use client';

import { ButtonHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';

interface PixelButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'gold' | 'blue' | 'red';
  size?: 'sm' | 'md' | 'lg';
  state?: 'normal' | 'hover' | 'active' | 'disabled';
}

const PixelButton = forwardRef<HTMLButtonElement, PixelButtonProps>(
  ({ className, variant = 'default', size = 'md', state, children, disabled, ...props }, ref) => {
    // Button states in the spritesheet (4x3 grid)
    // Each button is approximately 32x42 pixels
    const buttonWidth = 32;
    const buttonHeight = 42;
    
    // Map variants to column positions (0-indexed)
    const variantPositions = {
      default: 0,  // Gray buttons (column 1)
      gold: 1,     // Gold/yellow buttons (column 2)
      blue: 2,     // Blue buttons (column 3)
      red: 3,      // Red buttons (column 4)
    };
    
    // Map states to row positions (0-indexed)
    const statePositions = {
      normal: 0,    // Top row
      hover: 1,     // Middle row
      active: 2,    // Bottom row (pressed)
      disabled: 0,  // Use normal state for disabled
    };
    
    // Calculate background position
    const column = variantPositions[variant];
    const row = disabled ? statePositions.disabled : (state ? statePositions[state] : statePositions.normal);
    const bgPosX = -(column * buttonWidth);
    const bgPosY = -(row * buttonHeight);
    
    // Size classes
    const sizeClasses = {
      sm: 'min-w-[64px] h-[32px] text-xs px-2',
      md: 'min-w-[96px] h-[42px] text-sm px-3',
      lg: 'min-w-[128px] h-[48px] text-base px-4',
    };
    
    return (
      <button
        ref={ref}
        disabled={disabled}
        className={cn(
          "relative inline-flex items-center justify-center font-bold",
          "transition-transform duration-75",
          "text-white drop-shadow-[1px_1px_0px_rgba(0,0,0,0.5)]",
          sizeClasses[size],
          disabled && "opacity-50 cursor-not-allowed",
          !disabled && "cursor-pointer active:translate-y-[2px]",
          className
        )}
        style={{
          backgroundImage: 'url(/api/ui/themes/pixel-pack/others/card_ui_buttons.png)',
          backgroundPosition: `${bgPosX}px ${bgPosY}px`,
          backgroundSize: '128px 128px',
          imageRendering: 'pixelated',
          backgroundRepeat: 'no-repeat',
        }}
        onMouseEnter={(e) => {
          if (!disabled && !state) {
            e.currentTarget.style.backgroundPosition = `${bgPosX}px ${-(buttonHeight)}px`;
          }
        }}
        onMouseLeave={(e) => {
          if (!disabled && !state) {
            e.currentTarget.style.backgroundPosition = `${bgPosX}px ${bgPosY}px`;
          }
        }}
        onMouseDown={(e) => {
          if (!disabled && !state) {
            e.currentTarget.style.backgroundPosition = `${bgPosX}px ${-(buttonHeight * 2)}px`;
          }
        }}
        onMouseUp={(e) => {
          if (!disabled && !state) {
            e.currentTarget.style.backgroundPosition = `${bgPosX}px ${-(buttonHeight)}px`;
          }
        }}
        {...props}
      >
        <span className="relative z-10">{children}</span>
      </button>
    );
  }
);

PixelButton.displayName = 'PixelButton';

export { PixelButton };