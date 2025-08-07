import React from 'react';
import { Breed } from '@/services/api';

interface BreedDescriptionComponentProps {
  entity: Breed;
}

export function BreedDescriptionComponent({ entity }: BreedDescriptionComponentProps) {
  // Mock detailed description sections
  const sections = [
    {
      title: 'Overview',
      content: `The ${entity.Name} is one of the largest domesticated cat breeds. It is one of the oldest natural breeds in North America, originating from the state of Maine, where it is the official state cat. The breed is known for its intelligence, playful personality, and distinctive physical appearance.`
    },
    {
      title: 'Physical Characteristics',
      content: `${entity.Name}s are large, muscular cats with a rectangular body shape. Males typically weigh between 13-18 pounds (5.9-8.2 kg), while females weigh 8-12 pounds (3.6-5.4 kg). They have a distinctive ruff around their neck, tufted ears, and a long, bushy tail. Their coat is water-resistant and comes in various colors and patterns.`
    },
    {
      title: 'Temperament',
      content: `Known as "gentle giants," ${entity.Name}s are friendly, affectionate, and good-natured. They are intelligent and playful, often retaining their kitten-like behavior well into adulthood. They typically get along well with children, other cats, and even dogs. Despite their size, they are not aggressive and are known for their gentle disposition.`
    },
    {
      title: 'Care Requirements',
      content: `${entity.Name}s require regular grooming due to their long coat, ideally 2-3 times per week to prevent matting. They need a high-quality diet appropriate for their size and activity level. Regular veterinary check-ups are important, as they can be prone to certain genetic conditions like hypertrophic cardiomyopathy and hip dysplasia.`
    },
    {
      title: 'Living Environment',
      content: `These cats adapt well to various living situations but do best with plenty of space due to their size. They enjoy climbing and need sturdy cat trees. ${entity.Name}s are indoor/outdoor cats but many owners keep them indoors for safety. They are social cats that enjoy company and don't do well when left alone for long periods.`
    }
  ];

  return (
    <div className="space-y-8">
      <h2 className="text-2xl font-bold mb-6">About {entity.Name}</h2>
      
      {/* Basic info grid */}
      <div className="bg-white border rounded-lg p-6 mb-8">
        <h3 className="text-lg font-semibold mb-4">Quick Facts</h3>
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <span className="text-sm text-gray-600">Origin:</span>
            <p className="font-medium">{entity.Origin}</p>
          </div>
          <div>
            <span className="text-sm text-gray-600">Size:</span>
            <p className="font-medium">{entity.Size}</p>
          </div>
          <div>
            <span className="text-sm text-gray-600">Coat Length:</span>
            <p className="font-medium">{entity.CoatLength}</p>
          </div>
          <div>
            <span className="text-sm text-gray-600">Life Span:</span>
            <p className="font-medium">{entity.LifeSpan}</p>
          </div>
          <div>
            <span className="text-sm text-gray-600">Weight Range:</span>
            <p className="font-medium">{entity.Weight}</p>
          </div>
          <div>
            <span className="text-sm text-gray-600">Temperament:</span>
            <p className="font-medium">{entity.Temperament?.join(', ')}</p>
          </div>
        </div>
      </div>

      {/* Detailed sections */}
      <div className="space-y-6">
        {sections.map((section, index) => (
          <div key={index} className="bg-white border rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-3">{section.title}</h3>
            <p className="text-gray-700 leading-relaxed">{section.content}</p>
          </div>
        ))}
      </div>
    </div>
  );
}