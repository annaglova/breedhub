// landing/src/router/LandingRouter.tsx
import About from "@/pages/About";
import Application from "@/pages/Application";
import Landing from "@/pages/Landing";
import { BrowserRouter, Route, Routes } from "react-router-dom";

// Якщо буде спільний Layout (Header/Footer), обгорни тут
export default function LandingRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/about" element={<About />} />
        <Route path="/application" element={<Application />} />
        {/*  <Route path="/cookie" element={<Cookie />} />
        <Route path="/payment" element={<Payment />} />
        <Route path="/prepayments" element={<Prepayments />} />
        <Route path="/pricing" element={<Pricing />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/product" element={<Product />} />
        <Route path="/terms" element={<Terms />} /> */}
        {/* TODO: додай свою 404-сторінку */}
        {/* <Route path="*" element={<NotFound />} /> */}
      </Routes>
    </BrowserRouter>
  );
}
