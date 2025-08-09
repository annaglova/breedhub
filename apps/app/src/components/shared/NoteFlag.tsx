import { Bookmark } from 'lucide-react';
import { cn } from '@ui/lib/utils';

interface NoteFlagProps {
  isVisible?: boolean;
  className?: string;
}

export function NoteFlag({ isVisible, className }: NoteFlagProps) {
  if (!isVisible) return null;
  
  return (
    <Bookmark 
      className={cn(
        "h-3.5 w-3.5 text-primary-600 fill-primary-600",
        className
      )} 
    />
  );
}