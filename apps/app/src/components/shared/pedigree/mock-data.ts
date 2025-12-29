import type { PedigreePet } from "./types";
import type { DefinedSexCode } from "@/components/shared/PetSexMark";

// Helper to create sex object with proper typing
const male = { code: "male" as DefinedSexCode, name: "Male" };
const female = { code: "female" as DefinedSexCode, name: "Female" };

/**
 * Mock pedigree data for visual development
 *
 * This creates a 4-generation pedigree tree
 */
export const MOCK_PEDIGREE_PET: PedigreePet = {
  id: "1",
  name: "Champion Rex vom Königsberg",
  url: "champion-rex-vom-konigsberg",
  sex: male,
  dateOfBirth: "2021-05-15",
  countryOfBirth: { code: "DE", name: "Germany" },
  titles: "CH, V1, CAC, CACIB, BOB",
  avatarUrl: undefined,
  father: {
    id: "2",
    name: "Grand Champion Max von Bayern",
    url: "grand-champion-max-von-bayern",
    sex: male,
    dateOfBirth: "2018-03-20",
    countryOfBirth: { code: "DE", name: "Germany" },
    titles: "GCH, Multi V1",
    father: {
      id: "4",
      name: "World Winner Bruno",
      url: "world-winner-bruno",
      sex: male,
      dateOfBirth: "2015-08-10",
      countryOfBirth: { code: "AT", name: "Austria" },
      titles: "WW, ICH",
      father: {
        id: "8",
        name: "Apollo vom Heidelberg",
        url: "apollo-vom-heidelberg",
        sex: male,
        dateOfBirth: "2012-01-15",
        countryOfBirth: { code: "DE", name: "Germany" },
        titles: "CH",
      },
      mother: {
        id: "9",
        name: "Diana von Wien",
        url: "diana-von-wien",
        sex: female,
        dateOfBirth: "2013-06-20",
        countryOfBirth: { code: "AT", name: "Austria" },
        titles: "V1, CAC",
      },
    },
    mother: {
      id: "5",
      name: "Beautiful Bella aus München",
      url: "beautiful-bella-aus-munchen",
      sex: female,
      dateOfBirth: "2016-11-25",
      countryOfBirth: { code: "DE", name: "Germany" },
      titles: "CH, V1",
      father: {
        id: "10",
        name: "Hero von Hamburg",
        url: "hero-von-hamburg",
        sex: male,
        dateOfBirth: "2013-04-12",
        countryOfBirth: { code: "DE", name: "Germany" },
        titles: "V2",
      },
      mother: {
        id: "11",
        name: "Stella aus Frankfurt",
        url: "stella-aus-frankfurt",
        sex: female,
        dateOfBirth: "2014-09-08",
        countryOfBirth: { code: "DE", name: "Germany" },
        titles: "V1",
      },
    },
  },
  mother: {
    id: "3",
    name: "Elegant Luna von Berlin",
    url: "elegant-luna-von-berlin",
    sex: female,
    dateOfBirth: "2019-07-12",
    countryOfBirth: { code: "DE", name: "Germany" },
    titles: "CH, V1, BOB",
    father: {
      id: "6",
      name: "Strong Thor aus Köln",
      url: "strong-thor-aus-koln",
      sex: male,
      dateOfBirth: "2016-02-28",
      countryOfBirth: { code: "DE", name: "Germany" },
      titles: "CH, CACIB",
      father: {
        id: "12",
        name: "Zeus von Dresden",
        url: "zeus-von-dresden",
        sex: male,
        dateOfBirth: "2013-07-22",
        countryOfBirth: { code: "DE", name: "Germany" },
        titles: "V1",
      },
      mother: {
        id: "13",
        name: "Athena aus Leipzig",
        url: "athena-aus-leipzig",
        sex: female,
        dateOfBirth: "2014-03-15",
        countryOfBirth: { code: "DE", name: "Germany" },
        titles: "V2, R.CAC",
      },
    },
    mother: {
      id: "7",
      name: "Sweet Rosie von Stuttgart",
      url: "sweet-rosie-von-stuttgart",
      sex: female,
      dateOfBirth: "2017-05-18",
      countryOfBirth: { code: "DE", name: "Germany" },
      titles: "V1, CAC",
      father: {
        id: "14",
        name: "King Oscar aus Nürnberg",
        url: "king-oscar-aus-nurnberg",
        sex: male,
        dateOfBirth: "2014-11-30",
        countryOfBirth: { code: "DE", name: "Germany" },
        titles: "CH",
      },
      mother: {
        id: "15",
        name: "Queen Emma aus Bonn",
        url: "queen-emma-aus-bonn",
        sex: female,
        dateOfBirth: "2015-02-14",
        countryOfBirth: { code: "DE", name: "Germany" },
        titles: "V1",
      },
    },
  },
};

/**
 * Unknown pet placeholder
 */
export const UNKNOWN_PET: PedigreePet = {
  id: "unknown",
  name: "Unknown",
};
