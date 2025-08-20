'use client';

import { ButtonHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';

interface PixelButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'gold' | 'blue' | 'red';
  size?: 'sm' | 'md' | 'lg';
}

const PixelButton = forwardRef<HTMLButtonElement, PixelButtonProps>(
  ({ className, variant = 'default', size = 'md', children, disabled, ...props }, ref) => {
    // Size classes
    const sizeClasses = {
      sm: 'px-4 py-2 text-xs',
      md: 'px-6 py-3 text-sm',
      lg: 'px-8 py-4 text-base',
    };

    // Variant classes with gradient backgrounds
    const variantClasses = {
      default: cn(
        'bg-gradient-to-b from-gray-600 to-gray-800',
        'hover:from-gray-500 hover:to-gray-700',
        'border-2 border-gray-500',
        'shadow-[inset_0_1px_0_0_rgba(255,255,255,0.2)]'
      ),
      gold: cn(
        'bg-gradient-to-b from-yellow-500 to-yellow-700',
        'hover:from-yellow-400 hover:to-yellow-600',
        'border-2 border-yellow-600',
        'shadow-[inset_0_1px_0_0_rgba(255,255,255,0.3)]'
      ),
      blue: cn(
        'bg-gradient-to-b from-blue-500 to-blue-700',
        'hover:from-blue-400 hover:to-blue-600',
        'border-2 border-blue-600',
        'shadow-[inset_0_1px_0_0_rgba(255,255,255,0.3)]'
      ),
      red: cn(
        'bg-gradient-to-b from-red-500 to-red-700',
        'hover:from-red-400 hover:to-red-600',
        'border-2 border-red-600',
        'shadow-[inset_0_1px_0_0_rgba(255,255,255,0.3)]'
      ),
    };

    return (
      <button
        ref={ref}
        disabled={disabled}
        className={cn(
          // Base styles
          "relative inline-flex items-center justify-center",
          "font-bold text-white uppercase tracking-wider",
          "rounded-lg transition-all duration-400 ",
          "transform-gpu",

          // 3D effect
          "shadow-[0_4px_0_0_rgba(0,0,0,0.3)]",
          "active:shadow-[0_2px_0_0_rgba(0,0,0,0.3)]",
          "active:translate-y-[2px]",

          // Size
          sizeClasses[size],

          // Variant
          variantClasses[variant],

          // States
          disabled && "opacity-50 cursor-not-allowed active:translate-y-0 active:shadow-[0_4px_0_0_rgba(0,0,0,0.3)]",
          !disabled && "cursor-pointer hover:brightness-110",

          className
        )}
        {...props}
      >
        {/* Inner text with shadow for depth */}
        <span className="relative z-10 drop-shadow-[0_1px_1px_rgba(0,0,0,0.8)]">
          {children}
        </span>

        {/* Pixel corners effect */}
        <div className="absolute inset-0 rounded-lg pointer-events-none">
          <div className="absolute top-0 left-0 w-1 h-1 bg-white/20" />
          <div className="absolute top-0 right-0 w-1 h-1 bg-white/20" />
          <div className="absolute bottom-0 left-0 w-1 h-1 bg-black/20" />
          <div className="absolute bottom-0 right-0 w-1 h-1 bg-black/20" />
        </div>
      </button>
    );
  }
);

PixelButton.displayName = 'PixelButton';

export { PixelButton };