'use client';

import { ReactNode } from 'react';

interface SectionHeaderProps {
  icon?: ReactNode;
  title: string;
  className?: string;
}

export default function SectionHeader({
  icon,
  title,
  className = '',
}: SectionHeaderProps) {
  return (
    <div className={`flex items-center gap-2 mb-3 ${className}`}>
      {icon && <span className="text-zinc-400">{icon}</span>}
      <h3 className="text-sm font-semibold text-zinc-700">{title}</h3>
    </div>
  );
}
