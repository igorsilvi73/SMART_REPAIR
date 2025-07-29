// src/index.tsx
import { LavorazioniProvider } from "./components/GanttDataStore";
import "./styles.css";
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";

const rootElement = document.getElementById("root")!;
const root = ReactDOM.createRoot(rootElement);

// 1. Definisci la funzione triggerRescheduleFromApp qui.
// Questa funzione sarà responsabile di innescare la riprogrammazione a livello globale dell'app.
const handleTriggerReschedule = () => {
  // TODO: Qui dovrai implementare la logica effettiva per la riprogrammazione globale.
  // Per ora, una semplice console log per vedere che funziona.
  console.log("🔥 Riprogrammazione globale innescata dall'App principale! 🔥");
  // Esempi di cosa potrebbe fare qui:
  // - Chiamare una funzione nel componente App per ricalcolare la visualizzazione Gantt.
  // - Dispatch di un'azione a un altro reducer/store se ne hai uno per lo stato globale della UI.
  // - Potrebbe non fare nulla qui se l'unica cosa che fa è riattivare effetti nel provider stesso.
};

root.render(
  <React.StrictMode>
    {/* 2. Passa la funzione al LavorazioniProvider */}
    <LavorazioniProvider triggerRescheduleFromApp={handleTriggerReschedule}>
      <App />
    </LavorazioniProvider>
  </React.StrictMode>
);
