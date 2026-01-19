// landing/src/pages/About.tsx
import { usePageTitle } from "@/hooks/usePageTitle";
import LandingContentLayout from "@/layouts/LandingContentLayout";

export default function About() {
  usePageTitle("About Us");

  return (
    <LandingContentLayout
      title="Hello, from the Breedhub team!"
      subtitle="We're passionate breeders and developers united by a common mission - making professional breeding accessible and enjoyable for everyone"
    >
      <p className="leading-relaxed tracking-wide">
        We are a team of passionate developers and professional breeders
        who came together with a shared vision - to revolutionize how
        breeding communities connect and manage their programs. As
        breeders ourselves, we understand the challenges you face daily,
        from pedigree management to health tracking, from finding the
        right breeding partners to showcasing your achievements.
      </p>
      <h2 className="pb-4 pt-8 text-center text-3xl font-semibold tracking-tight">
        <span className="text-primary">Our mission:</span>{" "}
        <span className="bg-gradient-to-r from-primary-500 to-accent-500 bg-clip-text text-transparent">
          Elevating professional breeding worldwide
        </span>
      </h2>
      <p className="leading-relaxed tracking-wide">
        We believe that professional breeding deserves professional
        tools. That's why we've built BreedHub - a comprehensive
        platform that brings together everything you need in one place.
        But we're more than just software; we're a community-driven
        platform that evolves with your needs.
      </p>
      <p className="leading-relaxed tracking-wide mt-6">
        Your feedback shapes our future. We actively listen to our users
        and implement the features that matter most to you. Whether
        you're a seasoned breeder with decades of experience or just
        starting your journey, BreedHub is designed to grow with you.
      </p>
      <p className="leading-relaxed tracking-wide mt-6 text-center font-semibold text-primary">
        Welcome to BreedHub - where passion meets professionalism.
      </p>
    </LandingContentLayout>
  );
}
