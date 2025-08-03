import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

export function MobileStickyButton() {
  const [isVisible, setIsVisible] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      // Show after scrolling 500px
      const shouldShow = window.scrollY > 500 && !hasInteracted;
      setIsVisible(shouldShow);
    };

    window.addEventListener('scroll', handleScroll);
    handleScroll();

    return () => window.removeEventListener('scroll', handleScroll);
  }, [hasInteracted]);

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/95 backdrop-blur-sm border-t shadow-lg md:hidden z-40 animate-slide-up">
      <Link to="/pricing" onClick={() => setHasInteracted(true)}>
        <button className="w-full landing-raised-button landing-raised-button-primary py-4 text-lg">
          Start for Free
          <span className="block text-sm font-normal mt-0.5 opacity-90">
            No credit card required
          </span>
        </button>
      </Link>
      <button
        onClick={() => {
          setIsVisible(false);
          setHasInteracted(true);
        }}
        className="absolute top-2 right-2 p-2 text-gray-400 hover:text-gray-600"
        aria-label="Close"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}