// Shared content types for books, movies, and podcasts

export type ContentType = 'book' | 'movie' | 'podcast';

// Configuration for each content type's visual appearance
export interface ContentTypeConfig {
  type: ContentType;
  label: string;
  pluralLabel: string;
  primaryColor: 'amber' | 'blue' | 'purple';
  bgGradient: string;
  badgeClass: string;
  creatorLabel: string;
  icon: 'book' | 'film' | 'microphone';
}

export const CONTENT_CONFIGS: Record<ContentType, ContentTypeConfig> = {
  book: {
    type: 'book',
    label: 'Book',
    pluralLabel: 'Books',
    primaryColor: 'amber',
    bgGradient: 'from-amber-100 to-amber-50',
    badgeClass: 'bg-amber-500',
    creatorLabel: 'by',
    icon: 'book',
  },
  movie: {
    type: 'movie',
    label: 'Movie',
    pluralLabel: 'Movies',
    primaryColor: 'blue',
    bgGradient: 'from-blue-100 to-blue-50',
    badgeClass: 'bg-blue-500',
    creatorLabel: 'dir.',
    icon: 'film',
  },
  podcast: {
    type: 'podcast',
    label: 'Podcast',
    pluralLabel: 'Podcasts',
    primaryColor: 'purple',
    bgGradient: 'from-purple-100 to-purple-50',
    badgeClass: 'bg-purple-500',
    creatorLabel: 'by',
    icon: 'microphone',
  },
};

// Color utilities for dynamic styling
export const colorClasses = {
  amber: {
    bg: 'bg-amber-500',
    bgHover: 'hover:bg-amber-600',
    bgLight: 'bg-amber-50',
    bgLightHover: 'hover:bg-amber-100',
    text: 'text-amber-500',
    textDark: 'text-amber-700',
    border: 'border-amber-500',
    ring: 'ring-amber-500',
    gradient: 'from-amber-100 to-amber-50',
  },
  blue: {
    bg: 'bg-blue-500',
    bgHover: 'hover:bg-blue-600',
    bgLight: 'bg-blue-50',
    bgLightHover: 'hover:bg-blue-100',
    text: 'text-blue-500',
    textDark: 'text-blue-700',
    border: 'border-blue-500',
    ring: 'ring-blue-500',
    gradient: 'from-blue-100 to-blue-50',
  },
  purple: {
    bg: 'bg-purple-500',
    bgHover: 'hover:bg-purple-600',
    bgLight: 'bg-purple-50',
    bgLightHover: 'hover:bg-purple-100',
    text: 'text-purple-500',
    textDark: 'text-purple-700',
    border: 'border-purple-500',
    ring: 'ring-purple-500',
    gradient: 'from-purple-100 to-purple-50',
  },
  zinc: {
    bg: 'bg-zinc-500',
    bgHover: 'hover:bg-zinc-600',
    bgLight: 'bg-zinc-50',
    bgLightHover: 'hover:bg-zinc-100',
    text: 'text-zinc-500',
    textDark: 'text-zinc-700',
    border: 'border-zinc-500',
    ring: 'ring-zinc-500',
    gradient: 'from-zinc-100 to-zinc-50',
  },
  red: {
    bg: 'bg-red-500',
    bgHover: 'hover:bg-red-600',
    bgLight: 'bg-red-50',
    bgLightHover: 'hover:bg-red-100',
    text: 'text-red-500',
    textDark: 'text-red-700',
    border: 'border-red-500',
    ring: 'ring-red-500',
    gradient: 'from-red-100 to-red-50',
  },
  green: {
    bg: 'bg-green-500',
    bgHover: 'hover:bg-green-600',
    bgLight: 'bg-green-50',
    bgLightHover: 'hover:bg-green-100',
    text: 'text-green-500',
    textDark: 'text-green-700',
    border: 'border-green-500',
    ring: 'ring-green-500',
    gradient: 'from-green-100 to-green-50',
  },
} as const;

export type ColorScheme = keyof typeof colorClasses;
