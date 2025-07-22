// landing/src/components/Footer.tsx
import LogoWhite from "@shared/icons/logo/logo-white.svg?react";
import FooterFigure from "@/assets/backgrounds/footer-figure.svg?react";
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
            backgroundSize: '30px 30px'
          }}
        ></div>
      </div>
      
      {/* Content */}
      <div className="relative z-10 flex flex-col px-8 pb-5 pt-14 text-white sm:px-10 md:px-40 xl:px-60">
      <div className="grid w-full grid-cols-2 justify-between gap-10 uppercase md:flex">
        <div className="order-4 flex flex-col space-y-2 md:order-1">
          {/* Logo */}
          <LogoWhite
            className="h-21 w-auto"
            aria-label="Breedhub Logo"
            role="img"
            focusable="false"
          />
          {/* Contact (Desktop, hidden on mobile) */}
          <div className="hidden md:flex xl:hidden">
            <div className="flex flex-col md:space-y-2">
              <a href="mailto:info@breedhub">
                <span className="text-center font-bold lowercase">
                  info&#64;breedhub
                </span>
              </a>
              <div className="space-x-6 self-end md:self-center">
                <i className="pi pi-facebook" style={{ fontSize: "2rem" }} />
                <i className="pi pi-discord" style={{ fontSize: "2rem" }} />
              </div>
            </div>
          </div>
        </div>

        <div className="order-3 col-span-2 flex items-center justify-center md:hidden">
          <div className="h-[1px] w-[30vw] bg-white/20"></div>
        </div>

        {/* Spaces */}
        <div className="order-1 flex justify-center space-x-6 md:order-2">
          <span className="tracking-wide opacity-60 text-sm">Spaces</span>
          <div className="grid max-h-[7.25rem] gap-x-10 gap-y-2 font-bold xl:grid-flow-col xl:grid-rows-3">
            <Link to="/pets" className="hover:text-white/80 transition-colors">
              <div>Pets</div>
            </Link>
            <Link to="/kennels" className="hover:text-white/80 transition-colors">
              <div>Kennels</div>
            </Link>
            <Link to="/breeds" className="hover:text-white/80 transition-colors">
              <div>Breeds</div>
            </Link>
            <Link to="/litters" className="hover:text-white/80 transition-colors">
              <div>Litters</div>
            </Link>
          </div>
        </div>

        {/* For users */}
        <div className="order-2 flex justify-center space-x-6 md:order-3">
          <span className="opacity-60 tracking-wide text-sm">for users</span>
          <div className="grid gap-x-10 gap-y-2 font-bold xl:grid-flow-col xl:grid-rows-3">
            <Link to="/product" className="hover:text-white/80 transition-colors">Product</Link>
            <Link to="/pricing" className="hover:text-white/80 transition-colors">Pricing</Link>
            <Link to="/app" className="hover:text-white/80 transition-colors">App</Link>
            <Link to="/about" className="hover:text-white/80 transition-colors">About</Link>
            <Link to="/terms-and-conditions" className="hover:text-white/80 transition-colors">Terms</Link>
            <Link to="/privacy-policy" className="hover:text-white/80 transition-colors">Privacy</Link>
          </div>
        </div>

        {/* Contact (Mobile and xl+) */}
        <div className="order-5 md:hidden xl:order-4 xl:flex xl:space-x-6">
          <span className="opacity-60 hidden tracking-wide xl:block text-sm">
            Contact
          </span>
          <div className="flex min-h-[100%] flex-col items-center justify-between">
            <a href="mailto:info@breedhub">
              <span className="text-center font-bold lowercase">
                info&#64;breedhub
              </span>
            </a>
            <div className="space-x-6 self-center xl:self-end">
              <i className="pi pi-facebook" style={{ fontSize: "2rem" }} />
              <i className="pi pi-discord" style={{ fontSize: "2rem" }} />
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
          <div className="w-2 h-2 bg-white rounded-full"></div>
          <div className="w-3 h-3 bg-white rounded-full"></div>
          <div className="w-2 h-2 bg-white rounded-full"></div>
        </div>
      </div>
      </div>
    </div>
  );
}
