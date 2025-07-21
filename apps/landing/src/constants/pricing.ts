export interface Tier {
  callToActionText?: string;
  description: string;
  features: Feature[];
  featuresHeader: string;
  isComingSoon: boolean;
  isPopular: boolean;
  name: string;
  prices: Price[];
}

export interface Feature {
  id?: string;
  name: string;
}

export interface Price {
  buyLink?: string;
  type: string;
  value: number;
}

// Billing period constants
export const THREE_YEARLY_NUMBER = 0;
export const YEARLY_NUMBER = 1;
export const MONTHLY_NUMBER = 2;

export const THREE_YEARLY = '3 yearly';
export const YEARLY = 'yearly';
export const MONTHLY = 'monthly';

export const TIERS: Tier[] = [
  {
    callToActionText: 'Free Forever',
    description: 'Perfect for hobby breeders and getting started',
    features: [
      {
        name: 'Create and manage unlimited pedigree trees',
      },
      {
        name: 'Test matings with COI calculation',
      },
      {
        name: 'Access to breeders marketplace',
      },
    ],
    featuresHeader: '',
    isComingSoon: false,
    isPopular: false,
    name: 'Free forever',
    prices: [
      {
        type: THREE_YEARLY,
        value: 0,
      },
      {
        type: YEARLY,
        value: 0,
      },
      {
        type: MONTHLY,
        value: 0,
      },
    ],
  },
  {
    callToActionText: 'Get Started',
    description: 'Everything you need to manage your breeding program',
    features: [
      {
        name: 'Litter management',
      },
      {
        name: 'Kennel management',
      },
      {
        name: 'Privacy controls for your breeding data',
      },
    ],
    featuresHeader: 'Everything in free forever and',
    isComingSoon: false,
    isPopular: true,
    name: 'Professional',
    prices: [
      {
        buyLink:
          'https://breedpride.sellfy.store/p/premium-kennel-site-gift-dcyzvq/',
        type: THREE_YEARLY,
        value: 6.67,
      },
      {
        buyLink: 'https://breedpride.sellfy.store/p/premium-kennel-site-year/',
        type: YEARLY,
        value: 9.99,
      },
      {
        buyLink:
          'https://breedpride.sellfy.store/p/premium-kennel-site-year-mounth/',
        type: MONTHLY,
        value: 13.32,
      },
    ],
  },
  {
    callToActionText: 'Become a Patron',
    description: 'Support the breed you love with flexible contribution',
    features: [
      {
        name: 'Get recognized as a Top Patron of your breed',
      },
      {
        name: 'Help promote and support your favorite breed community',
      },
    ],
    featuresHeader: 'Everything in professional and',
    isComingSoon: false,
    isPopular: false,
    name: 'Supreme Patron',
    prices: [
      {
        type: THREE_YEARLY,
        value: 0,
      },
      {
        type: YEARLY,
        value: 0,
      },
      {
        type: MONTHLY,
        value: 0,
      },
    ],
  },
  {
    callToActionText: 'Get Started',
    description: 'Complete kennel management with your own website',
    features: [
      {
        name: 'Kennel site',
      },
      {
        name: 'Multiple professional website themes',
      },
      {
        name: 'Detailed visitor analytics and insights',
      },
    ],
    featuresHeader: 'Everything in professional and',
    isComingSoon: true,
    isPopular: false,
    name: 'Prime',
    prices: [
      {
        type: THREE_YEARLY,
        value: 9.99,
      },
      {
        type: YEARLY,
        value: 14.98,
      },
      {
        type: MONTHLY,
        value: 19.97,
      },
    ],
  },
];