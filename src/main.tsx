import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Block copying and context menu globally
document.addEventListener('copy', (e) => e.preventDefault());
document.addEventListener('contextmenu', (e) => e.preventDefault());

createRoot(document.getElementById("root")!).render(<App />);
