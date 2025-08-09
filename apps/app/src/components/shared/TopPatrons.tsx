import React from 'react';

interface Patron {
  name: string;
  contributions?: number;
}

interface TopPatronsProps {
  patrons: Patron[];
  maxDisplay?: number;
  className?: string;
}

export function TopPatrons({ 
  patrons, 
  maxDisplay = 3,
  className = ""
}: TopPatronsProps) {
  if (!patrons || patrons.length === 0) {
    return null;
  }

  return (
    <div className={`flex -space-x-2 ${className}`}>
      {patrons.slice(0, maxDisplay).map((patron, index) => (
        <div
          key={index}
          className="w-6 h-6 rounded-full bg-gray-300 border-2 border-white"
          title={patron.name}
        />
      ))}
    </div>
  );
}