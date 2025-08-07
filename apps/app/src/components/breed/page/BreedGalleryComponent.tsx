import React, { useState } from 'react';
import { Breed } from '@/services/api';
import { X } from 'lucide-react';

interface BreedGalleryComponentProps {
  entity: Breed;
}

export function BreedGalleryComponent({ entity }: BreedGalleryComponentProps) {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  
  // Mock gallery images
  const galleryImages = [
    { id: '1', url: '/mock/maine-coon-1.jpg', caption: 'Classic Maine Coon appearance' },
    { id: '2', url: '/mock/maine-coon-2.jpg', caption: 'Maine Coon kitten' },
    { id: '3', url: '/mock/maine-coon-3.jpg', caption: 'Silver tabby Maine Coon' },
    { id: '4', url: '/mock/maine-coon-4.jpg', caption: 'Maine Coon in profile' },
    { id: '5', url: '/mock/maine-coon-5.jpg', caption: 'Red Maine Coon' },
    { id: '6', url: '/mock/maine-coon-6.jpg', caption: 'Maine Coon family' },
    { id: '7', url: '/mock/maine-coon-7.jpg', caption: 'Show champion' },
    { id: '8', url: '/mock/maine-coon-8.jpg', caption: 'Maine Coon playing' },
    { id: '9', url: '/mock/maine-coon-9.jpg', caption: 'Tortoiseshell Maine Coon' }
  ];

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">{entity.Name} Gallery</h2>
      
      {/* Image grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {galleryImages.map((image) => (
          <div 
            key={image.id}
            className="relative aspect-square bg-gray-100 rounded-lg overflow-hidden cursor-pointer hover:opacity-90 transition-opacity"
            onClick={() => setSelectedImage(image.url)}
          >
            <img 
              src={image.url} 
              alt={image.caption}
              className="w-full h-full object-cover"
            />
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/50 to-transparent p-4">
              <p className="text-white text-sm">{image.caption}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Lightbox */}
      {selectedImage && (
        <div 
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedImage(null)}
        >
          <button
            className="absolute top-4 right-4 text-white hover:text-gray-300"
            onClick={() => setSelectedImage(null)}
          >
            <X className="h-8 w-8" />
          </button>
          <img 
            src={selectedImage} 
            alt="Full size"
            className="max-w-full max-h-full object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}