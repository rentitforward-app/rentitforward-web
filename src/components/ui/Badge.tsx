import React from 'react';
import { cn } from '@/lib/utils';

interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'secondary' | 'success' | 'destructive' | 'warning' | 'outline';
  size?: 'sm' | 'md' | 'lg';
}

const badgeVariants = {
  default: 'bg-primary text-primary-foreground',
  secondary: 'bg-gray-100 text-gray-800 hover:bg-gray-200',
  success: 'bg-green-100 text-green-800 hover:bg-green-200',
  destructive: 'bg-red-100 text-red-800 hover:bg-red-200',
  warning: 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200',
  outline: 'border border-gray-300 text-gray-700 hover:bg-gray-50',
};

const badgeSizes = {
  sm: 'px-2 py-1 text-xs',
  md: 'px-3 py-1 text-sm',
  lg: 'px-4 py-2 text-base',
};

export const Badge: React.FC<BadgeProps> = ({ 
  className, 
  variant = 'default', 
  size = 'md',
  children,
  ...props 
}) => {
  return (
    <div
      className={cn(
        'inline-flex items-center rounded-full font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
        badgeVariants[variant],
        badgeSizes[size],
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};

export default Badge; 