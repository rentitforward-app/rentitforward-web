import React from 'react';

interface AvatarProps {
  children: React.ReactNode;
  className?: string;
}

interface AvatarImageProps {
  src?: string;
  alt?: string;
}

interface AvatarFallbackProps {
  children: React.ReactNode;
}

export function Avatar({ children, className = '' }: AvatarProps) {
  return (
    <div className={`relative flex shrink-0 overflow-hidden rounded-full w-10 h-10 ${className}`}>
      {children}
    </div>
  );
}

export function AvatarImage({ src, alt }: AvatarImageProps) {
  if (!src) return null;
  
  return (
    <img
      src={src}
      alt={alt}
      className="aspect-square h-full w-full object-cover"
    />
  );
}

export function AvatarFallback({ children }: AvatarFallbackProps) {
  return (
    <div className="flex h-full w-full items-center justify-center rounded-full bg-gray-100 text-gray-600 text-sm font-medium">
      {children}
    </div>
  );
} 