// src/components/EsperienzaOperatoriTable.tsx
import React from "react";
// Importa useLavorazioni dal tuo store (che è nella stessa cartella components)
import { useLavorazioni } from "./GanttDataStore"; 
// Importa getAllOperators e lavorazioniOrdinate da constants (che è in src/)
import { getAllOperators, lavorazioniOrdinate, DEFAULT_ESPERIENZA_BASE } from "../constants";

const EsperienzaOperatoriTable: React.FC = () => {
  // Destruttura esperienzaOperatoriPerTipo e la sua funzione setter corretta
  const { esperienzaOperatoriPerTipo, setEsperienzaOperatoriPerTipo } =
    useLavorazioni();

  const allOperators = getAllOperators(); // Tutti gli operatori noti

  // Funzione per gestire il cambiamento del valore dell'esperienza
  const handleEsperienzaChange = (
    operatore: string,
    tipo: string,
    e: React.ChangeEvent<HTMLInputElement> // Tipo corretto per l'evento di input
  ) => {
    const value = parseFloat(e.target.value);
    // Controllo per NaN nel caso l'input sia vuoto o non numerico
    if (!isNaN(value)) {
      // Aggiorna lo stato usando una funzione di callback e in modo immutabile
      setEsperienzaOperatoriPerTipo((prevEsperienza) => ({
        ...prevEsperienza, // Copia tutto lo stato precedente
        [operatore]: { // Aggiorna l'oggetto dell'operatore specifico
          ...(prevEsperienza[operatore] || {}), // Copia tutte le esperienze precedenti di quell'operatore
          [tipo]: value, // Aggiorna l'esperienza per il tipo specifico
        },
      }));
    }
  };

  return (
    <div style={{ padding: "2rem" }}>
      <h2>📊 Gestione Esperienza Operatori</h2>
      <p>Qui puoi visualizzare e impostare manualmente l'esperienza di ciascun operatore per ogni tipo di lavorazione.</p>
      <table style={{ width: "100%", borderCollapse: "collapse", marginTop: "20px" }}>
        <thead>
          <tr style={{ backgroundColor: "#f2f2f2" }}>
            <th style={{ border: "1px solid #ddd", padding: "8px", textAlign: "left" }}>Operatore</th>
            {lavorazioniOrdinate.map((tipo) => (
              <th key={tipo} style={{ border: "1px solid #ddd", padding: "8px", textAlign: "left" }}>
                {tipo}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {allOperators.map((operatore) => (
            <tr key={operatore}>
              <td style={{ border: "1px solid #ddd", padding: "8px", fontWeight: "bold" }}>{operatore}</td>
              {lavorazioniOrdinate.map((tipo) => (
                <td key={tipo} style={{ border: "1px solid #ddd", padding: "8px" }}>
                  <input
                    type="number"
                    min="0"
                    max="200" // Limiti dell'esperienza (da 0 a 200 come definito in GanttDataStore)
                    value={
                      (esperienzaOperatoriPerTipo[operatore]?.[tipo] ?? DEFAULT_ESPERIENZA_BASE).toFixed(1)
                    }
                    onChange={(e) => handleEsperienzaChange(operatore, tipo, e)}
                    style={{ width: "80px", padding: "5px", borderRadius: "4px", border: "1px solid #ccc" }}
                  />
                  {" / 100"} {/* Visualizza il rapporto sull'esperienza base */}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <p style={{ marginTop: '20px', fontSize: '0.9em', color: '#666' }}>
        L'esperienza viene ricalcolata automaticamente al completamento delle lavorazioni. Valori tra 0 e 200.
      </p>
    </div>
  );
};

export default EsperienzaOperatoriTable;