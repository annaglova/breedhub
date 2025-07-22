// landing/src/components/Footer.tsx
import FooterFigure from "@/assets/backgrounds/footer-figure.svg?react";
import LogoWhite from "@shared/icons/logo/logo-white.svg?react";
import { Link } from "react-router-dom";

export default function Footer() {
  return (
    <div className="relative min-w-screen bottom-0 overflow-hidden">
      {/* Gradient Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary-500 via-primary-600 to-accent-500 opacity-95"></div>

      {/* Background Pattern */}
      <div className="absolute inset-0">
        {/* Large decorative circles */}
        <div className="absolute -top-20 -right-20 w-96 h-96 bg-white/5 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-32 -left-32 w-80 h-80 bg-accent-500/10 rounded-full blur-3xl"></div>

        {/* SVG Pattern */}
        <div className="absolute inset-0 opacity-10">
          <FooterFigure className="absolute -right-1/4 bottom-0 w-3/4 h-auto transform rotate-12" />
          <FooterFigure className="absolute -left-1/4 top-0 w-3/4 h-auto transform -rotate-12" />
        </div>

        {/* Dot pattern overlay */}
        <div
          className="absolute inset-0 opacity-5"
          style={{
            backgroundImage: `radial-gradient(circle, white 1px, transparent 1px)`,
            backgroundSize: "30px 30px",
          }}
        ></div>
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col px-8 pb-5 pt-14 text-white sm:px-10 md:px-40 xl:px-60">
        <div className="grid w-full grid-cols-2 justify-between gap-10 uppercase md:flex">
          <div className="order-4 flex flex-col space-y-2 md:order-1">
            {/* Logo with glow effect */}
            <div className="group flex justify-center">
              <LogoWhite
                className="h-21 w-auto drop-shadow-lg group-hover:drop-shadow-2xl transition-all duration-300"
                aria-label="Breedhub Logo"
                role="img"
                focusable="false"
              />
            </div>
            {/* Contact (Desktop, hidden on mobile) */}
            <div className="hidden md:flex xl:hidden">
              <div className="flex flex-col md:space-y-2">
                <a href="mailto:info@breedhub">
                  <span className="text-center font-bold lowercase">
                    info&#64;breedhub
                  </span>
                </a>
                <div className="flex items-center gap-4 self-end md:self-center">
                  <a
                    href="https://facebook.com/breedhub"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group"
                  >
                    <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center transition-all duration-300 group-hover:bg-white/20 group-hover:scale-110">
                      <i
                        className="pi pi-facebook"
                        style={{ fontSize: "1.25rem" }}
                      />
                    </div>
                  </a>
                  <a
                    href="https://discord.gg/breedhub"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group"
                  >
                    <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center transition-all duration-300 group-hover:bg-white/20 group-hover:scale-110">
                      <i
                        className="pi pi-discord"
                        style={{ fontSize: "1.25rem" }}
                      />
                    </div>
                  </a>
                </div>
              </div>
            </div>
          </div>

          <div className="order-3 col-span-2 flex items-center justify-center md:hidden">
            <div className="h-[1px] w-[30vw] bg-white/20"></div>
          </div>

          {/* Spaces */}
          <div className="order-1 flex justify-center space-x-6 md:order-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center">
                <svg
                  className="w-4 h-4"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
                </svg>
              </div>
              <span className="tracking-wide opacity-60 text-sm">Spaces</span>
            </div>
            <div className="grid max-h-[7.25rem] gap-x-10 gap-y-2 font-bold xl:grid-flow-col xl:grid-rows-3">
              <Link
                to="/pets"
                className="hover:text-white/80 transition-colors"
              >
                <div>Pets</div>
              </Link>
              <Link
                to="/kennels"
                className="hover:text-white/80 transition-colors"
              >
                <div>Kennels</div>
              </Link>
              <Link
                to="/breeds"
                className="hover:text-white/80 transition-colors"
              >
                <div>Breeds</div>
              </Link>
              <Link
                to="/litters"
                className="hover:text-white/80 transition-colors"
              >
                <div>Litters</div>
              </Link>
            </div>
          </div>

          {/* For users */}
          <div className="order-2 flex justify-center space-x-6 md:order-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center">
                <svg
                  className="w-4 h-4"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <span className="opacity-60 tracking-wide text-sm">
                for users
              </span>
            </div>
            <div className="grid gap-x-10 gap-y-2 font-bold xl:grid-flow-col xl:grid-rows-3">
              <Link
                to="/product"
                className="hover:text-white/80 transition-colors"
              >
                Product
              </Link>
              <Link
                to="/pricing"
                className="hover:text-white/80 transition-colors"
              >
                Pricing
              </Link>
              <Link to="/app" className="hover:text-white/80 transition-colors">
                App
              </Link>
              <Link
                to="/about"
                className="hover:text-white/80 transition-colors"
              >
                About
              </Link>
              <Link
                to="/terms-and-conditions"
                className="hover:text-white/80 transition-colors"
              >
                Terms
              </Link>
              <Link
                to="/privacy-policy"
                className="hover:text-white/80 transition-colors"
              >
                Privacy
              </Link>
            </div>
          </div>

          {/* Contact (Mobile and xl+) */}
          <div className="order-5 md:hidden xl:order-4 xl:flex xl:space-x-6">
            <div className="hidden xl:flex items-center gap-2">
              <div className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center">
                <svg
                  className="w-4 h-4"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                  <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                </svg>
              </div>
              <span className="opacity-60 tracking-wide text-sm">Contact</span>
            </div>
            <div className="flex min-h-[100%] flex-col items-center justify-between">
              <a href="mailto:info@breedhub" className="group">
                <span className="text-center font-bold lowercase transition-all duration-300 group-hover:text-white/80">
                  info&#64;breedhub
                </span>
              </a>
              <div className="flex items-center gap-4 self-center xl:self-end">
                <a
                  href="https://facebook.com/breedhub"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group"
                >
                  <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center transition-all duration-300 group-hover:bg-white/20 group-hover:scale-110">
                    <i
                      className="pi pi-facebook"
                      style={{ fontSize: "1.25rem" }}
                    />
                  </div>
                </a>
                <a
                  href="https://discord.gg/breedhub"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group"
                >
                  <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center transition-all duration-300 group-hover:bg-white/20 group-hover:scale-110">
                    <i
                      className="pi pi-discord"
                      style={{ fontSize: "1.25rem" }}
                    />
                  </div>
                </a>
              </div>
            </div>
          </div>
        </div>

        <div className="my-5 h-[1px] w-full bg-white/20"></div>

        <div className="flex items-center justify-between">
          <span className="font-medium">
            Breedhub &copy; {new Date().getFullYear()} | With ♥ from Ukraine
          </span>

          {/* Decorative element */}
          <div className="hidden md:flex items-center gap-2 opacity-20">
            <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
            <div
              className="w-3 h-3 bg-white rounded-full animate-pulse"
              style={{ animationDelay: "0.3s" }}
            ></div>
            <div
              className="w-2 h-2 bg-white rounded-full animate-pulse"
              style={{ animationDelay: "0.6s" }}
            ></div>
          </div>
        </div>
      </div>
    </div>
  );
}
