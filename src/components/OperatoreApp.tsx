// OperatoreApp.tsx
import React from "react";
import { useLavorazioni } from "./GanttDataStore";
import { DEFAULT_ESPERIENZA_BASE, lavorazioniOrdinate } from "../constants"; // Importa le costanti

interface OperatoreAppProps {
  operatore: string;
}

const OperatoreApp: React.FC<OperatoreAppProps> = ({
  operatore: nomeOperatore,
}) => {
  // Ora accediamo anche all'esperienza degli operatori
  const { lavorazioni, aggiornaLavorazione, esperienzaOperatoriPerTipo } =
    useLavorazioni();

  const lavorazioniAssegnate = lavorazioni
    .filter((lav) => lav.operatore === nomeOperatore)
    .sort((a, b) => {
      const order = { in_corso: 1, attesa: 2, pausa: 3, completata: 4 };
      return order[a.stato] - order[b.stato];
    });

  const formatElapsed = (ms: number) => {
    const ore = Math.floor(ms / (1000 * 60 * 60));
    const minuti = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    const secondi = Math.floor((ms % (1000 * 60)) / 1000);
    return `${ore}h ${minuti}m ${secondi}s`;
  };

  const handleAction = (id: string, azione: "start" | "pause" | "end") => {
    aggiornaLavorazione(id, azione);
  };

  return (
    <div style={{ padding: "2rem" }}>
      <h2>👨‍🔧 Benvenuto, {nomeOperatore}</h2>
      <h3>📈 La tua Esperienza:</h3>
      <ul style={{ listStyleType: "none", padding: 0 }}>
        {lavorazioniOrdinate.map((tipo) => {
          // Recupera l'esperienza per l'operatore e il tipo di lavorazione, usa il default se non esiste
          const esperienza =
            esperienzaOperatoriPerTipo[nomeOperatore]?.[tipo] ??
            DEFAULT_ESPERIENZA_BASE;
          return (
            <li key={tipo} style={{ marginBottom: "5px" }}>
              <strong>{tipo}:</strong> {esperienza.toFixed(1)} / 100
            </li>
          );
        })}
      </ul>
      <hr style={{ margin: "20px 0" }} /> {/* Separatore */}
      <h3>Task Assegnate:</h3>
      {lavorazioniAssegnate.length === 0 && (
        <p>Nessuna lavorazione assegnata.</p>
      )}
      <ul>
        {lavorazioniAssegnate.map((lav) => (
          <li
            key={lav.id}
            style={{
              marginBottom: "1rem",
              border: "1px solid #eee",
              padding: "1rem",
              borderRadius: "8px",
              backgroundColor:
                lav.stato === "completata" ? "#e6ffe6" : "#ffffff", // Colore di sfondo in base allo stato
              boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
            }}
          >
            <strong>{lav.tipo}</strong> – Auto: {lav.autoNome} (ID: {lav.autoId}
            ) <br />
            Stato:{" "}
            <span
              style={{
                fontWeight: "bold",
                color:
                  lav.stato === "in_corso"
                    ? "#28a745" // Verde per in corso
                    : lav.stato === "pausa"
                    ? "#ffc107" // Giallo per pausa
                    : lav.stato === "completata"
                    ? "#007bff" // Blu per completata
                    : "#6c757d", // Grigio per attesa
              }}
            >
              {lav.stato.replace("_", " ").toUpperCase()}
            </span>{" "}
            <br />
            Tempo lavorato: {formatElapsed(lav.elapsedMs || 0)} <br />
            Tempo stimato: {(lav.estimatedMs / (1000 * 60 * 60)).toFixed(
              1
            )}h <br />
            {/* Pulsanti di azione condizionali allo stato della lavorazione */}
            {lav.stato !== "completata" && (
              <div style={{ marginTop: "10px" }}>
                {lav.stato === "attesa" && (
                  <button
                    onClick={() => handleAction(lav.id, "start")}
                    style={{
                      backgroundColor: "#28a745",
                      color: "white",
                      border: "none",
                      padding: "8px 15px",
                      borderRadius: "5px",
                      cursor: "pointer",
                      marginRight: "10px",
                    }}
                  >
                    🟢 Avvia
                  </button>
                )}
                {lav.stato === "in_corso" && (
                  <button
                    onClick={() => handleAction(lav.id, "pause")}
                    style={{
                      backgroundColor: "#ffc107",
                      color: "black",
                      border: "none",
                      padding: "8px 15px",
                      borderRadius: "5px",
                      cursor: "pointer",
                      marginRight: "10px",
                    }}
                  >
                    🟡 Pausa
                  </button>
                )}
                {lav.stato === "pausa" && (
                  <button
                    onClick={() => handleAction(lav.id, "start")}
                    style={{
                      backgroundColor: "#17a2b8",
                      color: "white",
                      border: "none",
                      padding: "8px 15px",
                      borderRadius: "5px",
                      cursor: "pointer",
                      marginRight: "10px",
                    }}
                  >
                    🟢 Riprendi
                  </button>
                )}
                {/* Pulsante "Fine Lavorazione" */}
                {(lav.stato === "in_corso" || lav.stato === "pausa") && (
                  <button
                    onClick={() => handleAction(lav.id, "end")}
                    style={{
                      backgroundColor: "#dc3545",
                      color: "white",
                      border: "none",
                      padding: "8px 15px",
                      borderRadius: "5px",
                      cursor: "pointer",
                    }}
                  >
                    ✅ Fine Lavorazione
                  </button>
                )}
              </div>
            )}
            {lav.stato === "completata" && (
              <p
                style={{
                  color: "#007bff",
                  fontWeight: "bold",
                  marginTop: "10px",
                }}
              >
                Lavorazione Completata!
              </p>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default OperatoreApp;
