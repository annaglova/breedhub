import { registerComponent, setFallbackComponent } from './space/componentRegistry';

// Import all card components
import { BreedListCard } from './breed/BreedListCard';
import { PetListCard } from './pet/PetListCard';
import { GenericListCard } from './space/GenericListCard';

// Register all components that can be used in views
export function registerAllComponents() {
  // Generic/Default components
  registerComponent('GenericListCard', GenericListCard);
  registerComponent('DefaultListCard', GenericListCard); // Alias for fallback
  registerComponent('FallbackListCard', GenericListCard); // Another alias

  // Set GenericListCard as the default fallback for missing components
  setFallbackComponent(GenericListCard);

  // Breed components
  registerComponent('BreedListCard', BreedListCard);

  // Pet components
  registerComponent('PetListCard', PetListCard);

  // Future components can be added here
  // registerComponent('AnimalListCard', AnimalListCard);
  // registerComponent('AnimalGridCard', AnimalGridCard);
  // registerComponent('UserListCard', UserListCard);
  // etc.
}