import React from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App.jsx";
import "./styles.css";
import "./access.css";
import "./brand.css";
import "./credit.css";

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
    <a className="design-credit" href="https://www.facebook.com/MohamedElhawy0" target="_blank" rel="noopener noreferrer">تصميم وتطوير: محمد الحاوي</a>
  </React.StrictMode>,
);
