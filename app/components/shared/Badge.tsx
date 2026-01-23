'use client';

import { ReactNode } from 'react';
import { ColorScheme, colorClasses } from '@/app/lib/types/content';

type BadgeVariant = 'solid' | 'subtle' | 'outline';
type BadgeSize = 'xs' | 'sm' | 'md';

interface BadgeProps {
  children: ReactNode;
  variant?: BadgeVariant;
  colorScheme?: ColorScheme;
  size?: BadgeSize;
  className?: string;
}

const sizeClasses: Record<BadgeSize, string> = {
  xs: 'px-1.5 py-0.5 text-[9px] sm:text-[10px]',
  sm: 'px-2 py-0.5 text-[10px] sm:text-xs',
  md: 'px-2.5 py-1 text-xs sm:text-sm',
};

export default function Badge({
  children,
  variant = 'subtle',
  colorScheme = 'zinc',
  size = 'sm',
  className = '',
}: BadgeProps) {
  const colors = colorClasses[colorScheme];

  const variantClasses: Record<BadgeVariant, string> = {
    solid: `${colors.bg} text-white`,
    subtle: `${colors.bgLight} ${colors.textDark}`,
    outline: `border ${colors.border} ${colors.text} bg-transparent`,
  };

  return (
    <span
      className={`inline-flex items-center font-medium rounded-full ${sizeClasses[size]} ${variantClasses[variant]} ${className}`}
    >
      {children}
    </span>
  );
}
