import { registerComponent, setFallbackComponent } from './space/componentRegistry';

// Import all card components
import { BreedListCard } from './breed/BreedListCard';
import { ContactListCard } from './contact/ContactListCard';
import { EventListCard } from './event/EventListCard';
import { KennelListCard } from './kennel/KennelListCard';
import { LitterListCard } from './litter/LitterListCard';
import { NoteTabCard } from './note/NoteTabCard';
import { PetListCard } from './pet/PetListCard';
import { PetTabCard } from './pet/PetTabCard';
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

  // Contact components
  registerComponent('ContactListCard', ContactListCard);

  // Event components
  registerComponent('EventListCard', EventListCard);

  // Kennel components
  registerComponent('KennelListCard', KennelListCard);

  // Litter components
  registerComponent('LitterListCard', LitterListCard);

  // Note components
  registerComponent('NoteTabCard', NoteTabCard);

  // Pet components
  registerComponent('PetListCard', PetListCard);
  registerComponent('PetTabCard', PetTabCard);

  // Future components can be added here
  // registerComponent('AnimalListCard', AnimalListCard);
  // registerComponent('AnimalGridCard', AnimalGridCard);
  // registerComponent('UserListCard', UserListCard);
  // etc.
}