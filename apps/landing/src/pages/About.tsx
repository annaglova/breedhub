// landing/src/pages/About.tsx
import LandingFigure from "@/assets/backgrounds/landing-figure.svg?react";
import LandingLayout from "../components/LandingLayout";

export default function About() {
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
            <div className="relative space-y-3 text-center text-white">
              <h1>Hello, from the Breedhub team!</h1>
              <h3>So who are we?</h3>
            </div>
            <div className="sm:mt-22 relative mt-14 flex flex-col items-center justify-center space-y-8 rounded-2xl bg-white/50 p-8 text-xl">
              <p className="leading-8">
                We are the team of enthusiastic programmers. Such happened that
                we gathered together around one idea - to make some fabulous
                space for a dog people community. This idea came not from
                nothing - we are the same dog people like you. So we are deeply
                involved in this sphere. And we like to give the best Service
                for breeders and dog fans.
              </p>
              <h2 className="text-primary pb-4 pt-1">
                Our mission is a popularisation of professional breeding
              </h2>
              <p className="leading-8">
                We are deeply interested in our users' satisfaction with Breed
                Pride Services. We'd like you to share your opinion of a Breed
                Pride functional. Every proposal will be listened. The most
                popular and needed features will be implemented. <br />
                We hope you will like Breedhub. We are always open to
                communication to make our product more comfortable and valuable
                for you. We are glad to see you on our platform. You are welcome
              </p>
            </div>
          </div>
        </div>
      </div>
    </LandingLayout>
  );
}
