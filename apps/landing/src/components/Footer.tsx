// landing/src/components/Footer.tsx
import { Link } from "react-router-dom";

export default function Footer() {
  return (
    <div className="min-w-screen from-primary-500 bottom-0 flex flex-col bg-gradient-to-r to-pink-500 px-8 pb-5 pt-14 text-white sm:px-10 md:px-40 xl:px-60">
      <div className="grid w-full grid-cols-2 justify-between gap-10 uppercase md:flex">
        <div className="order-4 flex flex-col space-y-2 md:order-1">
          {/* Logo */}
          <div className="block">
            <img
              className="h-21 opacity-60"
              src="/assets/images/logo/logo-white.svg"
              alt="Breedhub Logo"
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
              <div className="space-x-6 self-end md:self-center">
                <i className="pi pi-facebook" style={{ fontSize: "2rem" }} />
                <i className="pi pi-discord" style={{ fontSize: "2rem" }} />
              </div>
            </div>
          </div>
        </div>

        <div className="order-3 col-span-2 flex items-center justify-center md:hidden">
          <div className="h-[1px] w-[30vw] bg-white/30"></div>
        </div>

        {/* Spaces */}
        <div className="order-1 flex justify-center space-x-6 md:order-2">
          <span className="tracking-wide opacity-70">Spaces</span>
          <div className="grid max-h-[7.25rem] gap-x-10 gap-y-2 font-bold xl:grid-flow-col xl:grid-rows-3">
            <Link to="/pets">
              <div>Pets</div>
            </Link>
            <Link to="/kennels">
              <div>Kennels</div>
            </Link>
            <Link to="/breeds">
              <div>Breeds</div>
            </Link>
            <Link to="/litters">
              <div>Litters</div>
            </Link>
          </div>
        </div>

        {/* For users */}
        <div className="order-2 flex justify-center space-x-6 md:order-3">
          <span className="opacity-70 tracking-wide">for users</span>
          <div className="grid gap-x-10 gap-y-2 font-bold xl:grid-flow-col xl:grid-rows-3">
            <Link to="/app">App</Link>
            <Link to="/product">Product</Link>
            <Link to="/pricing">Pricing</Link>
            <Link to="/about-us">About</Link>
            <Link to="/terms-and-conditions">Terms</Link>
            <Link to="/privacy-policy">Privacy</Link>
          </div>
        </div>

        {/* Contact (Mobile and xl+) */}
        <div className="order-5 md:hidden xl:order-4 xl:flex xl:space-x-6">
          <span className="opacity-70 hidden tracking-wide xl:block">
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

      <div className="my-5 h-[1px] w-full bg-white/30"></div>

      <span className="self-start font-medium">
        Breedhub &copy; 2024 | With ♥ from Ukraine
      </span>
    </div>
  );
}
