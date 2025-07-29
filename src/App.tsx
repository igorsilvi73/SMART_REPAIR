// src/App.tsx
import React, { useState } from "react";
import GanttCarManiaApp from "./components/GanttCarManiaApp";
import OperatoreApp from "./components/OperatoreApp";
import EsperienzaOperatoriTable from "./components/EsperienzaOperatoriTable";

// IMPORTANTE: Abbiamo rimosso l'import di LavorazioniProvider da qui
// import { LavorazioniProvider } from "./components/GanttDataStore"; 
import { AutoProvider } from "./components/AutoDataStore"; 

import { getAllOperators } from "./constants"; 

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<"supervisore" | "operatore" | "esperienza">(
    "supervisore"
  );
  const [selectedOperatore, setSelectedOperatore] = useState<string>("Alessandro");

  const allOperators = getAllOperators();

  // Questa funzione rescheduleTrigger è ancora qui temporaneamente.
  // La sua necessità verrà valutata quando esamineremo GanttCarManiaApp.tsx.
  // Per ora, lasciala come una funzione vuota per evitare errori.
  const [rescheduleTrigger, setRescheduleTrigger] = useState<() => void>(() => () => {});

  return (
    <AutoProvider>
      {/* IMPORTANTE: LavorazioniProvider è stato rimosso da qui. Ora è solo in src/index.tsx */}
      <div style={{ padding: "10px" }}>
        <div style={{ marginBottom: "20px" }}>
          <button
            onClick={() => setActiveTab("supervisore")}
            style={{ marginRight: "10px", padding: "10px", cursor: "pointer", backgroundColor: activeTab === "supervisore" ? "#007bff" : "#f0f0f0", color: activeTab === "supervisore" ? "white" : "black", border: "none", borderRadius: "5px" }}
          >
            Supervisore
          </button>
          <select
            value={selectedOperatore}
            onChange={(e) => {
              setActiveTab("operatore");
              setSelectedOperatore(e.target.value);
            }}
            style={{ marginRight: "10px", padding: "10px", cursor: "pointer", backgroundColor: activeTab === "operatore" ? "#007bff" : "#f0f0f0", color: activeTab === "operatore" ? "white" : "black", border: "none", borderRadius: "5px" }}
          >
            {allOperators.map(operator => (
              <option key={operator} value={operator}>
                Operatore ({operator})
              </option>
            ))}
          </select>
          <button
            onClick={() => setActiveTab("esperienza")}
            style={{ padding: "10px", cursor: "pointer", backgroundColor: activeTab === "esperienza" ? "#007bff" : "#f0f0f0", color: activeTab === "esperienza" ? "white" : "black", border: "none", borderRadius: "5px" }}
          >
            Esperienza Operatori
          </button>
        </div>

        {/* Qui passiamo setRescheduleTrigger a GanttCarManiaApp. 
            Valuteremo la sua utilità dopo questa correzione. */}
        {activeTab === "supervisore" && <GanttCarManiaApp setRescheduleTrigger={setRescheduleTrigger} />} 
        {activeTab === "operatore" && (
          <OperatoreApp operatore={selectedOperatore} />
        )}
        {activeTab === "esperienza" && <EsperienzaOperatoriTable />}
      </div>
    </AutoProvider>
  );
};

export default App;