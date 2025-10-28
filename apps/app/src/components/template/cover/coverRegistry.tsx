import { DefaultCover } from './DefaultCover';
import { BreedCoverV1 } from './BreedCoverV1';

/**
 * Cover Type IDs from Angular implementation
 * These UUIDs match the Cover.Type.Id values in the database
 */
export const CoverTypeIDs = {
  BreedCoverV1: 'bd8d3aea-0de5-4a6b-a3cb-3498fc7d5c1b',
  BreedCoverV2: '597f7165-10bf-4ada-99e6-8a6c61914d45',
  Default: 'afc7a692-6a41-4c9f-b905-69378ff3cc5d',
  Custom: 'cf63fc35-8fd0-440b-9d6c-0ea1db2f0de6',
  Advertise: '5377f419-1b3d-46ae-94b8-d16b8e8ecc32',
  LitterStandard: '3ad6cb84-bf2d-4b77-9424-e4ec1c3c8ac4',
} as const;

/**
 * Cover Registry - Maps cover type UUIDs to React components
 *
 * Used by PublicPageTemplate to dynamically render the correct cover
 * based on entity.Cover.Type.Id
 */
const coverRegistry: Record<string, React.ComponentType<any>> = {
  [CoverTypeIDs.Default]: DefaultCover,
  [CoverTypeIDs.BreedCoverV1]: BreedCoverV1,
  // [CoverTypeIDs.Custom]: CustomCover,          // TODO: implement
  // Add more cover types as they are implemented
};

/**
 * Get cover component by type ID
 * Returns DefaultCover as fallback if type not found
 */
export function getCoverComponent(typeId: string | undefined): React.ComponentType<any> {
  if (!typeId) {
    return DefaultCover;
  }
  return coverRegistry[typeId] || DefaultCover;
}
