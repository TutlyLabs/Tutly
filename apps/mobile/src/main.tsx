import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";

import { App } from "./App";
import { hydrateBearerCache } from "./native/storage";
import "./styles.css";

async function bootstrap() {
  // Hydrate the bearer token from Capacitor Preferences before any API call
  // so the first render can attach Authorization headers correctly.
  await hydrateBearerCache();

  ReactDOM.createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </React.StrictMode>,
  );
}

void bootstrap();
