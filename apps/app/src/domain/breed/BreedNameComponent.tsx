import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getBreeds } from '@/mocks/breeds.mock';

export function BreedNameComponent() {
  const { id } = useParams();
  const [breed, setBreed] = useState<any>(null);
  
  useEffect(() => {
    if (id) {
      const breeds = getBreeds();
      const foundBreed = breeds.find(b => b.id === id);
      setBreed(foundBreed);
    }
  }, [id]);
  
  if (!breed) {
    return <div>Loading...</div>;
  }
  
  return (
    <div className="flex items-center gap-3 px-4">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
        {breed.name}
      </h1>
      {breed.has_notes && (
        <span className="px-2 py-1 bg-yellow-100 dark:bg-yellow-900/30 rounded text-xs text-yellow-700 dark:text-yellow-400">
          Has Notes
        </span>
      )}
    </div>
  );
}