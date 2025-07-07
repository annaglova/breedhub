// landing/src/router/LandingRouter.tsx
import About from "@/pages/About";
import Application from "@/pages/Application";
import Landing from "@/pages/Landing";
import Pricing from "@/pages/Pricing";
import Product from "@/pages/Product";
import Terms from "@/pages/Terms";
import Privacy from "@/pages/Privacy";
import Cookie from "@/pages/Cookie";
import Payment from "@/pages/Payment";
import Prepayments from "@/pages/Prepayments";
import NotFound from "@/pages/NotFound";
import ScrollToTop from "@/components/ScrollToTop";
import { BrowserRouter, Route, Routes } from "react-router-dom";

export default function LandingRouter() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <Routes>
        {/* Main pages */}
        <Route path="/" element={<Landing />} />
        <Route path="/about" element={<About />} />
        <Route path="/application" element={<Application />} />
        
        {/* Product and pricing */}
        <Route path="/product" element={<Product />} />
        <Route path="/pricing" element={<Pricing />} />
        
        {/* Payment pages */}
        <Route path="/payment" element={<Payment />} />
        <Route path="/prepayments" element={<Prepayments />} />
        
        {/* Legal pages */}
        <Route path="/terms" element={<Terms />} />
        <Route path="/terms-and-conditions" element={<Terms />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/privacy-policy" element={<Privacy />} />
        <Route path="/cookie" element={<Cookie />} />
        <Route path="/cookie-policy" element={<Cookie />} />
        
        {/* 404 catch-all route */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}
