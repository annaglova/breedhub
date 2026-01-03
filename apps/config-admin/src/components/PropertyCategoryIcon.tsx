import React from 'react';
import { Settings, Sparkles } from 'lucide-react';

interface PropertyCategoryIconProps {
  category?: 'system' | 'custom' | string;
  className?: string;
}

export default function PropertyCategoryIcon({ 
  category, 
  className = "w-4 h-4 flex-shrink-0" 
}: PropertyCategoryIconProps) {
  if (category === 'system') {
    return (
      <Settings 
        className={`text-blue-600 ${className}`}
        title="System property"
      />
    );
  }
  
  return (
    <Sparkles 
      className={`text-slate-400 ${className}`}
      title="Custom property"
    />
  );
}