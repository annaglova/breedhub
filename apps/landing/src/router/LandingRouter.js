import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// landing/src/router/LandingRouter.tsx
import { BrowserRouter, Route, Routes } from "react-router-dom";
import About from "../pages/About";
import Landing from "../pages/Landing";
// Якщо буде спільний Layout (Header/Footer), обгорни тут
export default function LandingRouter() {
    return (_jsx(BrowserRouter, { children: _jsxs(Routes, { children: [_jsx(Route, { path: "/", element: _jsx(Landing, {}) }), _jsx(Route, { path: "/about", element: _jsx(About, {}) })] }) }));
}
