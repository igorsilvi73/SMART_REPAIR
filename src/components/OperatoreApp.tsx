// src/components/OperatoreApp.tsx
import React from "react";
// Importa useLavorazioni dal tuo store (che è nella stessa cartella components)
import { useLavorazioni, Lavorazione } from "./GanttDataStore";
// Importa getAllOperators e lavorazioniOrdinate da constants (che è in src/)
import {
  getAllOperators,
  lavorazioniOrdinate,
  DEFAULT_ESPERIENZA_BASE,
} from "../constants";

interface OperatoreAppProps {
  operatore: string;
}

const OperatoreApp: React.FC<OperatoreAppProps> = ({
  operatore: nomeOperatore,
}) => {
  // Accedi a lavorazioni e alla funzione getLavorazioneById per controllare le dipendenze
  const {
    lavorazioni,
    aggiornaLavorazione,
    esperienzaOperatoriPerTipo,
    getLavorazioneById,
  } = useLavorazioni();

  const lavorazioniAssegnate = lavorazioni
    .filter((lav) => lav.operatore === nomeOperatore)
    .sort((a, b) => {
      // Ordina per stato (in_corso, attesa, pausa, completata) e poi per start time
      const order = { in_corso: 1, attesa: 2, pausa: 3, completata: 4 };
      if (order[a.stato] !== order[b.stato]) {
        return order[a.stato] - order[b.stato];
      }
      // Ordina per data di inizio, mettendo i task senza startTime in fondo o in ordine alfabetico
      const aStart = a.startTime ? a.startTime.getTime() : Infinity;
      const bStart = b.startTime ? b.startTime.getTime() : Infinity;
      return aStart - bStart;
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

  // Funzione per verificare se il task ha un prerequisito non completato
  const isPrerequisiteNotCompleted = (currentLav: Lavorazione): boolean => {
    if (!currentLav.prerequisiteLavorazioneId) {
      return false; // Non ha prerequisiti
    }
    const prerequisite = getLavorazioneById(
      currentLav.prerequisiteLavorazioneId
    );
    if (!prerequisite) {
      // Prerequisito non trovato (errore o task eliminato), assumiamo sbloccato per non bloccare tutto
      console.warn(
        `Prerequisito ID ${currentLav.prerequisiteLavorazioneId} non trovato per task ${currentLav.id}`
      );
      return false;
    }
    return prerequisite.stato !== "completata"; // Restituisce true se il prerequisito NON è completato
  };

  return (
    <div style={{ padding: "2rem" }}>
      <h2>👨‍🔧 Benvenuto, {nomeOperatore}</h2>

      <h3>📈 La tua Esperienza:</h3>
      {/* CORRETTO: rimosso backslash di troppo */}
      <ul style={{ listStyleType: "none", padding: 0 }}>
        {getAllOperators().map((op) =>
          lavorazioniOrdinate.map((tipo) => {
            if (op === nomeOperatore) {
              const esperienza =
                esperienzaOperatoriPerTipo[nomeOperatore]?.[tipo] ??
                DEFAULT_ESPERIENZA_BASE;
              return (
                <li key={op + tipo} style={{ marginBottom: "5px" }}>
                  <strong>{tipo}:</strong> {esperienza.toFixed(1)} / 100
                </li>
              );
            }
            return null;
          })
        )}
      </ul>
      <hr style={{ margin: "20px 0" }} />

      <h3>Task Assegnate:</h3>
      {lavorazioniAssegnate.length === 0 && (
        <p>Nessuna lavorazione assegnata.</p>
      )}

      <ul>
        {lavorazioniAssegnate.map((lav) => {
          const isBlockedByPrerequisite = isPrerequisiteNotCompleted(lav);
          const showStartButton =
            lav.stato === "attesa" || lav.stato === "pausa";
          const showPauseOrEndButton = lav.stato === "in_corso";

          return (
            <li
              key={lav.id}
              style={{
                marginBottom: "1rem",
                border: "1px solid #eee",
                padding: "1rem",
                borderRadius: "8px",
                backgroundColor:
                  lav.stato === "completata"
                    ? "#e6ffe6"
                    : lav.stato === "in_corso"
                    ? "#fffacd"
                    : "#ffffff",
                boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
              }}
            >
              <strong>{lav.tipo}</strong> – Auto: {lav.autoNome} (ID:{" "}
              {lav.autoId}) <br />
              {lav.prerequisiteLavorazioneId && isBlockedByPrerequisite && (
                <p
                  style={{
                    color: "red",
                    fontWeight: "bold",
                    fontSize: "0.9em",
                    marginBottom: "5px",
                  }}
                >
                  ⚠️ Attende completamento prerequisito:{" "}
                  {getLavorazioneById(lav.prerequisiteLavorazioneId)?.tipo ||
                    "Task precedente"}
                </p>
              )}
              Stato:{" "}
              <span
                style={{
                  fontWeight: "bold",
                  color:
                    lav.stato === "in_corso"
                      ? "#28a745"
                      : lav.stato === "pausa"
                      ? "#ffc107"
                      : lav.stato === "completata"
                      ? "#007bff"
                      : "#6c757d",
                }}
              >
                {lav.stato.replace("_", " ").toUpperCase()}
              </span>{" "}
              <br />
              Tempo lavorato: {formatElapsed(lav.elapsedMs || 0)} <br />
              Tempo stimato: {(lav.estimatedMs / (1000 * 60 * 60)).toFixed(
                1
              )}h <br />
              {/* Pulsanti di azione condizionali */}
              {lav.stato !== "completata" && (
                <div style={{ marginTop: "10px" }}>
                  {showStartButton && (
                    <button
                      onClick={() => handleAction(lav.id, "start")}
                      disabled={isBlockedByPrerequisite}
                      style={{
                        backgroundColor: isBlockedByPrerequisite
                          ? "#cccccc"
                          : "#28a745",
                        color: isBlockedByPrerequisite ? "#666666" : "white",
                        border: "none",
                        padding: "8px 15px",
                        borderRadius: "5px",
                        cursor: isBlockedByPrerequisite
                          ? "not-allowed"
                          : "pointer",
                        marginRight: "10px",
                      }}
                    >
                      🟢 {lav.stato === "pausa" ? "Riprendi" : "Avvia"}
                    </button>
                  )}
                  {showPauseOrEndButton && lav.stato === "in_corso" && (
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
          );
        })}
      </ul>
    </div>
  );
};

export default OperatoreApp;
