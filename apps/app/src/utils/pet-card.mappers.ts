import type { Pet } from "@/components/shared/PetCard";
import type { SexCode } from "@/components/shared/PetSexMark";

interface KennelPetRecord {
  breed_id?: string;
  breed_name?: string;
  breed_slug?: string;
  country_of_birth_name?: string;
  date_of_birth?: string;
  father_id?: string;
  father_name?: string;
  father_slug?: string;
  mother_id?: string;
  mother_name?: string;
  mother_slug?: string;
  pet_avatar_url?: string;
  pet_id: string;
  pet_name: string;
  pet_slug?: string;
  sex_name?: string;
}

export function mapKennelPetRecordToPet(item: KennelPetRecord): Pet {
  return {
    id: item.pet_id,
    name: item.pet_name,
    url: item.pet_slug ? `/${item.pet_slug}` : "",
    avatarUrl: item.pet_avatar_url || "",
    sex: item.sex_name?.toLowerCase() as SexCode,
    dateOfBirth: item.date_of_birth,
    countryOfBirth: item.country_of_birth_name,
    breed: item.breed_name
      ? {
          id: item.breed_id,
          name: item.breed_name,
          url: `/${item.breed_slug}`,
        }
      : undefined,
    father: item.father_name
      ? {
          id: item.father_id,
          name: item.father_name,
          url: item.father_slug ? `/${item.father_slug}` : "",
        }
      : undefined,
    mother: item.mother_name
      ? {
          id: item.mother_id,
          name: item.mother_name,
          url: item.mother_slug ? `/${item.mother_slug}` : "",
        }
      : undefined,
  };
}
