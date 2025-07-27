// src/components/TooltipContent.tsx
import React from "react";
import { Task } from "gantt-task-react";
import { DEFAULT_ESPERIENZA_BASE } from "../constants";

// Estendi l'interfaccia Task per includere le nostre custom props
interface CustomTask extends Task {
  operatoreAssegnato?: string;
  tipoLavorazione?: string;
  lavorazioneStato?: "attesa" | "in_corso" | "pausa" | "completata";
  tempoLavoratoMs?: number;
  tempoStimatoMs?: number;
  esperienzaOperatore?: number;
  targaAuto?: string;
  coloreAuto?: string;
  duration?: number;
}

interface Props {
  task: CustomTask;
  fontSize: string;
  fontFamily: string;
}

const TooltipContent: React.FC<Props> = ({ task }) => {
  // Opzioni per la formattazione della data e ora (24h)
  const dateTimeOptions: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false, // Formato 24h
  };

  // Funzione per formattare il tempo in ore e minuti (già presente)
  const formatTimeInHoursAndMinutes = (ms: number | undefined): string => {
    if (ms === undefined || ms === null) return "N/A";
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / (1000 * 60)); // Correzione per i minuti
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
      {task.targaAuto && <div>Targa: {task.targaAuto}</div>}
      {task.coloreAuto && <div>Colore: {task.coloreAuto}</div>}
      {task.operatoreAssegnato && task.tipoLavorazione && (
        <div>
          Esperienza ({task.operatoreAssegnato} su {task.tipoLavorazione}):{" "}
          {(task.esperienzaOperatore ?? DEFAULT_ESPERIENZA_BASE).toFixed(1)} /
          100
        </div>
      )}
      <br />
      {task.start && (
        // Modifica qui: da toLocaleDateString a toLocaleString per includere l'ora
        <div>
          Data inizio: {task.start.toLocaleString("it-IT", dateTimeOptions)}
        </div>
      )}
      {task.end && (
        // Modifica qui: da toLocaleDateString a toLocaleString per includere l'ora
        <div>
          Data fine: {task.end.toLocaleString("it-IT", dateTimeOptions)}
        </div>
      )}
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
