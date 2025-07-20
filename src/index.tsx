import { LavorazioniProvider } from "./components/GanttDataStore";
import "./styles.css";
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
const rootElement = document.getElementById("root")!;
const root = ReactDOM.createRoot(rootElement);

root.render(
  <React.StrictMode>
    <LavorazioniProvider>
      <App />
    </LavorazioniProvider>
  </React.StrictMode>
);
