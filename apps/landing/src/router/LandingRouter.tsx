// landing/src/router/LandingRouter.tsx
import ScrollToTop from "@/components/ScrollToTop";
import About from "@/pages/About";
import Application from "@/pages/Application";
import {
  ConfirmationRequired,
  ForgotPassword,
  ResetPassword,
  SignIn,
  SignOut,
  SignUp,
} from "@shared/pages/auth";
import Cookie from "@/pages/Cookie";
import Landing from "@/pages/Landing";
import NotFound from "@/pages/NotFound";
import Payment from "@/pages/Payment";
import Prepayments from "@/pages/Prepayments";
import Pricing from "@/pages/Pricing";
import Privacy from "@/pages/Privacy";
import Product from "@/pages/Product";
import Terms from "@/pages/Terms";
import { BrowserRouter, Route, Routes } from "react-router-dom";

export default function LandingRouter() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <Routes>
        {/* Main pages */}
        <Route path="/" element={<Landing />} />
        <Route path="/about" element={<About />} />
        <Route path="/app" element={<Application />} />

        {/* Product and pricing */}
        <Route path="/product" element={<Product />} />
        <Route path="/pricing" element={<Pricing />} />

        {/* Payment pages */}
        <Route path="/payment" element={<Payment />} />
        <Route path="/prepayments" element={<Prepayments />} />

        {/* Auth pages */}
        <Route path="/sign-in" element={<SignIn />} />
        <Route path="/sign-up" element={<SignUp />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/confirmation-required" element={<ConfirmationRequired />} />
        <Route path="/sign-out" element={<SignOut />} />

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
