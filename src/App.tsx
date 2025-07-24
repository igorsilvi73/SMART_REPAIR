// src/App.tsx
import React, { useState } from "react";
// Componenti che si trovano in src/components/
import GanttCarManiaApp from "./components/GanttCarManiaApp";
import OperatoreApp from "./components/OperatoreApp";
import EsperienzaOperatoriTable from "./components/EsperienzaOperatoriTable";

// Providers che si trovano in src/components/
import { LavorazioniProvider } from "./components/GanttDataStore"; // <-- CORRETTO
import { AutoProvider } from "./components/AutoDataStore";     // <-- CORRETTO

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<"supervisore" | "operatore" | "esperienza">(
    "supervisore"
  );
  const [selectedOperatore, setSelectedOperatore] = useState<string>("Alessandro");

  return (
    <AutoProvider>
      <LavorazioniProvider>
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
              <option value="Alessandro">Operatore (Alessandro)</option>
              <option value="Giulia">Operatore (Giulia)</option>
              <option value="Luca">Operatore (Luca)</option>
              <option value="Francesca">Operatore (Francesca)</option>
            </select>
            <button
              onClick={() => setActiveTab("esperienza")}
              style={{ padding: "10px", cursor: "pointer", backgroundColor: activeTab === "esperienza" ? "#007bff" : "#f0f0f0", color: activeTab === "esperienza" ? "white" : "black", border: "none", borderRadius: "5px" }}
            >
              Esperienza Operatori
            </button>
          </div>

          {activeTab === "supervisore" && <GanttCarManiaApp />}
          {activeTab === "operatore" && (
            <OperatoreApp operatore={selectedOperatore} />
          )}
          {activeTab === "esperienza" && <EsperienzaOperatoriTable />}
        </div>
      </LavorazioniProvider>
    </AutoProvider>
  );
};

export default App;