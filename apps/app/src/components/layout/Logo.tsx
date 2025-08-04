import React from 'react';
import { Link } from 'react-router-dom';
import { cn } from '@ui/lib/utils';

interface LogoProps {
  className?: string;
}

export function Logo({ className }: LogoProps) {
  return (
    <Link 
      to="/" 
      className={cn("block p-4", className)}
    >
      <img 
        src="/logo.svg" 
        alt="BreedHub" 
        className="h-10"
      />
    </Link>
  );
}