import { registerComponent } from './space/componentRegistry';

// Import all card components
import { BreedListCard } from './breed/BreedListCard';
import { BreedGridCard } from './breed/BreedGridCard';

// Register all components that can be used in views
export function registerAllComponents() {
  // Breed components
  registerComponent('BreedListCard', BreedListCard);
  registerComponent('BreedGridCard', BreedGridCard);

  // Future components can be added here
  // registerComponent('AnimalListCard', AnimalListCard);
  // registerComponent('AnimalGridCard', AnimalGridCard);
  // registerComponent('UserListCard', UserListCard);
  // etc.
}