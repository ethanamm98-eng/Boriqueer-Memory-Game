import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { AudioProvider } from "./audio/AudioProvider";
import { AuthProvider } from "./context/AuthContext";
import { LanguageProvider } from "./context/LanguageContext";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <LanguageProvider><AudioProvider>
      <AuthProvider>
        <App />
      </AuthProvider>
    </AudioProvider></LanguageProvider>
  </StrictMode>,
);
