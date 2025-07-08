import React from 'react';
import { cn } from '@/lib/utils';

interface ProgressProps {
  value?: number;
  max?: number;
  className?: string;
  indicatorClassName?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'success' | 'warning' | 'destructive';
}

const progressSizes = {
  sm: 'h-2',
  md: 'h-3',
  lg: 'h-4',
};

const progressVariants = {
  default: 'bg-blue-600',
  success: 'bg-green-600',
  warning: 'bg-yellow-600',
  destructive: 'bg-red-600',
};

export const Progress: React.FC<ProgressProps> = ({
  value = 0,
  max = 100,
  className,
  indicatorClassName,
  size = 'md',
  variant = 'default',
}) => {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));

  return (
    <div
      className={cn(
        'w-full overflow-hidden rounded-full bg-gray-200',
        progressSizes[size],
        className
      )}
    >
      <div
        className={cn(
          'h-full transition-all duration-300 ease-in-out',
          progressVariants[variant],
          indicatorClassName
        )}
        style={{ width: `${percentage}%` }}
      />
    </div>
  );
};

export default Progress; 