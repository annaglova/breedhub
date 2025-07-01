export interface FeatureDetail {
  description: string;
  name: string;
  status: string;
  tier1: boolean | string;
  tier2: boolean | string;
  tier3: boolean | string;
}

export interface FeatureCategory {
  name: string;
  features: FeatureDetail[];
}

export const FEATURE_BLOCKS: FeatureCategory[] = [
  {
    features: [
      {
        description: 'The ability to use Breedhub directly from your mobile',
        name: 'Mobile app (with PWA)',
        status: '',
        tier1: true,
        tier2: true,
        tier3: true,
      },
      {
        description:
          "If you are the owner of a multi-breed kennel you don't need to register a few times on a different breed basis. It is enough to register once in the system to have the ability to work with more than 400 breeds of pets in one place",
        name: 'Single auth and simple data management for a multi-breed kennel',
        status: '',
        tier1: true,
        tier2: true,
        tier3: true,
      },
      {
        description:
          'An instrument that allows you to manage private settings to make your experience in Breedhub most suitable to your needs. Common settings are available for all users. The extra settings are based on the tier of the subscribtion',
        name: 'Multifunctional profile management system',
        status: '',
        tier1: true,
        tier2: true,
        tier3: true,
      },
      {
        description:
          'The possibility to work with the application in a language more comfortable to you',
        name: 'Multi-language system',
        status: 'COMING SOON',
        tier1: true,
        tier2: true,
        tier3: true,
      },
      {
        description:
          "The possibility to manage history changes of a pet's profile. The data can be reversed or merged according to the real info",
        name: "Revert and manage pets' history",
        status: 'COMING SOON',
        tier1: true,
        tier2: true,
        tier3: true,
      },
      {
        description:
          'An instrument that  gives the possibility to correct data by merging two or more records without losing any info',
        name: 'Merge duplicated records in pets, contacts, kennels',
        status: 'COMING SOON',
        tier1: true,
        tier2: true,
        tier3: true,
      },
      {
        description:
          "The possibility of editing information of any pet, person or kennel in the system. Till the user won't confirm the ownership of any of these instances. From the moment of confirmation of ownership only the owner will have the right to change the data",
        name: 'Edit information of any pet, person and kennel',
        status: '',
        tier1: true,
        tier2: true,
        tier3: true,
      },
      {
        description:
          'The possibility to add unique features for the breed with usage in every pet page of this breed. This feature is accessible according to the support level of breed',
        name: 'Additional adaptive features for each breed',
        status: '',
        tier1: true,
        tier2: true,
        tier3: true,
      },
      {
        description:
          'The instrument that allows the creation of data suitable for each breed in extra dictionaries',
        name: 'Verifying and maneging all dictionary data according to the breed',
        status: 'COMING SOON',
        tier1: true,
        tier2: true,
        tier3: true,
      },
      {
        description:
          'Gradation of roles according to achievements. Implementation of bonuses for users',
        name: 'Achievement system with an appropriate icon for a user according to each goal',
        status: 'COMING SOON',
        tier1: true,
        tier2: true,
        tier3: true,
      },
      {
        description:
          'The instrument for the creation private entries (pets, notes) as well as distributing access to information to certain people or groups',
        name: 'Access rights system',
        status: '',
        tier1: false,
        tier2: true,
        tier3: true,
      },
      {
        description:
          'The limit of created records (pedigrees, persons, kennels, events) in the system depends on the tier of subscription',
        name: 'Limit of created records (pedigrees, persons, kennels, events)',
        status: '',
        tier1: '10 000',
        tier2: '100 000',
        tier3: '∞',
      },
      {
        description:
          'The limits for uploaded media files (photo and video) depend on the tier of the subscription',
        name: 'Limits for uploaded media files (photo and video)',
        status: '',
        tier1: '100 MB/\n50 photos',
        tier2: '2 GB/\n10000 photos',
        tier3: '∞',
      },
      {
        description: 'The possibility to hide ads from your working space',
        name: 'Hide ads',
        status: '',
        tier1: false,
        tier2: true,
        tier3: true,
      },
    ],
    name: 'Common',
  },
  {
    features: [
      {
        description:
          'The public page of your kennel stands for replacing your kennel site. We provide the instrument of publishing actual info about your producers, upcoming or present litters and pets for sale',
        name: 'The public page of your kennel, which fully replaces your site',
        status: '',
        tier1: true,
        tier2: true,
        tier3: true,
      },
      {
        description:
          'The possibility of making personalised links for your instances - profile, kenne, pets and events. This instrument is available the user will confirm the ownership of any of this instances ',
        name: 'Short personalised links for your instances (pets, kennels, events)',
        status: '',
        tier1: true,
        tier2: true,
        tier3: true,
      },
      {
        description:
          'Powerful SEO that provides easy search of your kennel worldwide by using search systems',
        name: 'SEO of a kennel page. Data markup. Analytics of visits',
        status: 'COMING SOON',
        tier1: false,
        tier2: true,
        tier3: true,
      },
    ],
    name: 'SEO',
  },
  {
    features: [
      {
        description: 'The instrument for the planning of breeding work',
        name: 'Testmatings',
        status: '',
        tier1: true,
        tier2: true,
        tier3: true,
      },
      {
        description:
          'The instrument for breeding work with litters - fixation of the diynamic of weight growth, comments, vaccinations and deworming terms',
        name: 'Litters management',
        status: '',
        tier1: false,
        tier2: true,
        tier3: true,
      },
      {
        description:
          'The map of breeding producer - heat fixation, progesterone check, matings fixation, litters history with notes',
        name: 'The map of breeding producer',
        status: 'COMING SOON',
        tier1: false,
        tier2: true,
        tier3: true,
      },
      {
        description: 'Vaccinations and deworming terms with notes',
        name: 'Health management',
        status: 'COMING SOON',
        tier1: false,
        tier2: false,
        tier3: true,
      },
    ],
    name: 'Kennel management',
  },
  {
    features: [
      {
        description:
          'Presets of base collections are available in the system. These collections update automatically by using system rules according to the actual information',
        name: 'A large number of preset automatically updated collections',
        status: 'COMING SOON',
        tier1: true,
        tier2: true,
        tier3: true,
      },
      {
        description:
          'Limits of collections count for your personal favourites in pets, events and kennels in the system depends on the tier of subscription',
        name: 'Limits of collections count for your personal favourites in pets, events, kennels',
        status: 'COMING SOON',
        tier1: '3',
        tier2: '10',
        tier3: '100',
      },
      {
        description:
          'The limit of records count in collections depends on the tier of subscription',
        name: 'Limits of records count in collections',
        status: 'COMING SOON',
        tier1: '∞',
        tier2: '∞',
        tier3: '∞',
      },
      {
        description:
          'The possibility of making your collections public to influence a breed. It depends on the tier of the subscription',
        name: 'Possibility to make your collections public',
        status: 'COMING SOON',
        tier1: false,
        tier2: true,
        tier3: true,
      },
    ],
    name: 'Collections',
  },
  {
    features: [
      {
        description:
          'Any instance in the system can be followed - person, kennel, pet or event',
        name: 'Following for your favorites pets, persons, kennels, events',
        status: 'COMING SOON',
        tier1: true,
        tier2: true,
        tier3: true,
      },
      {
        description:
          'Notification system about new info of your favorites or actions',
        name: 'Notifications on your favourites',
        status: 'COMING SOON',
        tier1: true,
        tier2: true,
        tier3: true,
      },
      {
        description: 'Personal timeline for publishing posts',
        name: 'Personal timeline',
        status: 'COMING SOON',
        tier1: true,
        tier2: true,
        tier3: true,
      },
      {
        description:
          'The limit of public posts for the user depends on the subscription tier',
        name: 'Limit of public posts',
        status: 'COMING SOON',
        tier1: '200',
        tier2: '2 000',
        tier3: '∞',
      },
      {
        description:
          "Automatically filled timeline of your pet's life in the chronology with the ability to edit data",
        name: 'Pet timeline',
        status: 'COMING SOON',
        tier1: false,
        tier2: true,
        tier3: true,
      },
      {
        description:
          "The ability to make the highlights of the most special moments from your pet's life or your professional work",
        name: 'Management of highlight posts in your kennel - most special moments',
        status: 'COMING SOON',
        tier1: false,
        tier2: true,
        tier3: true,
      },
    ],
    name: 'Social network',
  },
  {
    features: [
      {
        description:
          "Confirmation system is based on a social network. Some data can be confirmed by user's social links with persons that can make an approval. The fact of confirmation can be based on multiple proofs",
        name: 'Community verification of persons, pets, kennels and show results',
        status: 'COMING SOON',
        tier1: true,
        tier2: true,
        tier3: true,
      },
      {
        description:
          'Confirmation of data can be provided by uploading supporting documents',
        name: 'Verification of person, pet, kennel, show results by uploading approving documents',
        status: 'COMING SOON',
        tier1: true,
        tier2: true,
        tier3: true,
      },
    ],
    name: 'Verification',
  },
  {
    features: [
      {
        description:
          'The ability to regіstrate bugs and track the status of their solving',
        name: 'Fully support bug solving',
        status: '',
        tier1: true,
        tier2: true,
        tier3: true,
      },
      {
        description:
          'The possibility to influence product development by voting for new features',
        name: 'Voting for new features of the product',
        status: '',
        tier1: true,
        tier2: true,
        tier3: true,
      },
      {
        description:
          'The possibility to communicate with developers about new needed features',
        name: 'The ability to influence product development through direct communication with the developer',
        status: '',
        tier1: false,
        tier2: false,
        tier3: true,
      },
    ],
    name: 'Support',
  },
];