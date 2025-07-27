// src/App.tsx
import React, { useState } from "react";
import GanttCarManiaApp from "./components/GanttCarManiaApp";
import OperatoreApp from "./components/OperatoreApp";
import EsperienzaOperatoriTable from "./components/EsperienzaOperatoriTable";

import { LavorazioniProvider } from "./components/GanttDataStore"; 
import { AutoProvider } from "./components/AutoDataStore"; 

import { getAllOperators } from "./constants"; 

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<"supervisore" | "operatore" | "esperienza">(
    "supervisore"
  );
  const [selectedOperatore, setSelectedOperatore] = useState<string>("Alessandro");

  const allOperators = getAllOperators();

  // Questa funzione verrà definita e passata da GanttCarManiaApp.tsx
  // Per ora è una funzione vuota di placeholder per evitare errori di Typescript.
  // Verrà sovrascritta dalla funzione reale da GanttCarManiaApp.
  const [rescheduleTrigger, setRescheduleTrigger] = useState<() => void>(() => () => {});

  return (
    <AutoProvider>
      <LavorazioniProvider triggerRescheduleFromApp={rescheduleTrigger}> 
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

          {activeTab === "supervisore" && <GanttCarManiaApp setRescheduleTrigger={setRescheduleTrigger} />} 
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
