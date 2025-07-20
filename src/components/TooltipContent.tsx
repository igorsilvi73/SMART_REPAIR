// TooltipContent.tsx
import React from "react";
import { Task } from "gantt-task-react";
// Percorso corretto per constants.ts
import { DEFAULT_ESPERIENZA_BASE } from "../constants";

// Estendi l'interfaccia Task per includere le nostre custom props
// AGGIUNGI 'duration?: number;' qui
export interface CustomTask extends Task {
  // <--- RIGA MODIFICATA
  duration?: number; // <--- AGGIUNTA QUESTA RIGA PER RISOLVERE L'ERRORE
  operatoreAssegnato?: string;
  tipoLavorazione?: string;
  lavorazioneStato?: "attesa" | "in_corso" | "pausa" | "completata";
  tempoLavoratoMs?: number;
  tempoStimatoMs?: number;
  esperienzaOperatore?: number; // Nuova prop per l'esperienza
}

interface Props {
  task: CustomTask; // Usa l'interfaccia estesa
  fontSize: string;
  fontFamily: string;
}

const TooltipContent: React.FC<Props> = ({ task }) => {
  // Funzione per formattare il tempo in ore e minuti
  const formatTimeInHoursAndMinutes = (ms: number | undefined): string => {
    if (ms === undefined || ms === null) return "N/A";
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${hours}h ${minutes}m ${seconds}s`;
  };

  return (
    <div
      style={{
        background: "white",
        color: "black",
        padding: "10px",
        borderRadius: "6px",
        boxShadow: "0px 0px 6px rgba(0, 0, 0, 0.2)",
        zIndex: 9999,
        fontSize: "14px",
        maxWidth: "250px",
        whiteSpace: "pre-line",
      }}
    >
      <strong>{task.tipoLavorazione || task.name}</strong>
      {task.operatoreAssegnato && (
        <div>Operatore: {task.operatoreAssegnato}</div>
      )}
      {/* Mostra l'esperienza dell'operatore per quel tipo di lavorazione */}
      {task.operatoreAssegnato && task.tipoLavorazione && (
        <div>
          Esperienza ({task.operatoreAssegnato} su {task.tipoLavorazione}):{" "}
          {(task.esperienzaOperatore ?? DEFAULT_ESPERIENZA_BASE).toFixed(1)} /
          100
        </div>
      )}
      <br />
      {task.start && (
        <div>Data inizio: {task.start.toLocaleDateString("it-IT")}</div>
      )}
      {task.end && <div>Data fine: {task.end.toLocaleDateString("it-IT")}</div>}
      {task.tempoStimatoMs !== undefined && (
        <div>
          Durata Stimata: {formatTimeInHoursAndMinutes(task.tempoStimatoMs)}
        </div>
      )}
      {task.tempoLavoratoMs !== undefined && (
        <div>
          Tempo Lavorato: {formatTimeInHoursAndMinutes(task.tempoLavoratoMs)}
        </div>
      )}
      {task.lavorazioneStato && (
        <div>
          Stato: {task.lavorazioneStato.replace("_", " ").toUpperCase()}
        </div>
      )}
      <div>Avanzamento: {task.progress}%</div>
    </div>
  );
};

export default TooltipContent;
