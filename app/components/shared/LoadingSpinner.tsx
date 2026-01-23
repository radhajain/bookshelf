'use client';

import { ColorScheme, colorClasses } from '@/app/lib/types/content';

type SpinnerSize = 'sm' | 'md' | 'lg' | 'xl';

interface LoadingSpinnerProps {
  size?: SpinnerSize;
  colorScheme?: ColorScheme;
  className?: string;
}

const sizeClasses: Record<SpinnerSize, string> = {
  sm: 'w-4 h-4 border-2',
  md: 'w-6 h-6 border-2',
  lg: 'w-10 h-10 border-3',
  xl: 'w-16 h-16 border-4',
};

export default function LoadingSpinner({
  size = 'md',
  colorScheme = 'amber',
  className = '',
}: LoadingSpinnerProps) {
  // Map color scheme to border-t color
  const borderColorMap: Record<ColorScheme, string> = {
    amber: 'border-t-amber-500',
    blue: 'border-t-blue-500',
    purple: 'border-t-purple-500',
    teal: 'border-t-teal-500',
    zinc: 'border-t-zinc-500',
    red: 'border-t-red-500',
    green: 'border-t-green-500',
  };

  return (
    <div
      className={`
        ${sizeClasses[size]}
        border-zinc-200
        ${borderColorMap[colorScheme]}
        rounded-full
        animate-spin
        ${className}
      `}
    />
  );
}
