// apps/landing/src/pages/Application.tsx

import LandingFigure from "@/assets/backgrounds/landing-figure.svg?react";
import breedImg from "@/assets/images/breed-space.jpeg";
import kennelImg from "@/assets/images/kennel-space.jpeg";
import litterImg from "@/assets/images/litter-space.jpeg";
import petImg from "@/assets/images/pet-space.jpeg";
import LandingLayout from "@/components/LandingLayout";

// Якщо SpaceLinkCard вже є — імпортуємо його.
// Якщо ні — можу дати швидкий шаблон для нього!
import SpaceLinkCard from "../components/SpaceLinkCard";

const spaces = [
  {
    name: "Pets",
    img: petImg,
    description:
      "One of the main spaces for breeder work. This space is provided with flexible and fast searching of pet profiles. Easy and comfortable way to view and edit data of your pets. Ergonomic and stylish pedigree. Additional features and services to make your experience fabulous",
    link: "../pets",
    points: "Over 9 M profiles",
    action: "Register your pets",
    coverText: "Fill your pets profiles",
  },
  {
    name: "Litters",
    img: litterImg,
    description:
      "This is the major space for professional breeders work. This space is designed for complex litter management from mating planning to nursing. The space is provided with private and public settings. All breeder plans and work are private but at will breeder can make them public and share them",
    link: "../litters",
    points: "2,5 M litters",
    action: "Get started your breeder work",
    coverText: "Make your breeding plans",
  },
  {
    name: "Kennels",
    img: kennelImg,
    description:
      "This space stands for promotion of breeder work. This space is provided with major points of kennel such as top producers, top offspring, show results, and also pets for sale",
    link: "../kennels",
    points: "More then 1,5 M kennels",
    action: "Create your kennel",
    coverText: "Get started working with your kennel",
  },
  {
    name: "Breeds",
    img: breedImg,
    description:
      "The space is dedicated for favourite breeds. You can be directly involved in the development and promotion of the breed. You can support your breed and get extra features that are unique to your breed",
    link: "../breeds",
    points: "450 breeds",
    action: "Promote your breed",
    coverText: "Support your favorite breed",
  },
];

export default function Application() {
  return (
    <LandingLayout>
      <div className="pb-26 relative flex min-h-[calc(100vh-197px)] w-full min-w-[100vw] flex-col overflow-hidden bg-white">
        {/* Background */}
        <div className="xxl:top-[-64vw] absolute right-[-7vw] top-[-23vw] w-full md:right-[-10vw] md:top-[-47vw] lg:top-[-59vw]">
          <LandingFigure style={{ width: "100vw" }} />
        </div>

        <div className="flex flex-col items-center justify-center pt-14 sm:pt-32">
          <div className="max-w-screen px-6 sm:px-10 md:max-w-6xl lg:px-0">
            {/* Page header */}
            <div className="relative space-y-3 text-center  text-white">
              <h1>Let's get started</h1>
              <h3>
                with your <span className="font-bold">AWESOME</span> spaces
              </h3>
            </div>
            {/* Grid for cards */}
            <div className="mt-10 grid gap-14 md:grid-cols-2 sm:mt-20">
              {spaces.map((space) => (
                <SpaceLinkCard key={space.name} space={space} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </LandingLayout>
  );
}
