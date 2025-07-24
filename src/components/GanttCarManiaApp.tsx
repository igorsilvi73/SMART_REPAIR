// src/components/GanttCarManiaApp.tsx
// GanttDataStore si trova nella stessa cartella components/
import { useLavorazioni, Lavorazione } from "./GanttDataStore"; 
// AutoDataStore si trova nella stessa cartella components/
import { useAuto, Auto } from "./AutoDataStore"; 
import React, { useState, useEffect } from "react";
import "gantt-task-react/dist/index.css";
import { Gantt, Task, ViewMode } from "gantt-task-react";
// TooltipContent si trova nella stessa cartella components/
import TooltipContent from "./TooltipContent"; 
// constants.ts si trova in src/, quindi il percorso è ../constants
import {
  lavorazioniOrdinate,
  durataLavorazioni,
  coloriLavorazioni,
  espertiPerLavorazione,
  DEFAULT_ESPERIENZA_BASE,
} from "../constants"; 

// Definisci una CustomTask per estendere l'interfaccia Task della libreria
interface CustomTask extends Task {
  operatoreAssegnato?: string;
  tipoLavorazione?: string;
  lavorazioneStato?: "attesa" | "in_corso" | "pausa" | "completata";
  tempoLavoratoMs?: number;
  tempoStimatoMs?: number;
  esperienzaOperatore?: number;
  targaAuto?: string; // Nuova prop per la targa dell'auto nel task Gantt
  coloreAuto?: string;
  duration?: number; // Nuova prop per il colore dell'auto nel task Gantt
}

// Funzioni di utilità per il calcolo delle ore lavorative (rimangono invariate)
function isWorkHour(date: Date): boolean {
  const hour = date.getHours();
  const day = date.getDay();
  return (
    day !== 0 &&
    day !== 6 &&
    ((hour >= 8 && hour < 12) || (hour >= 14 && hour < 18))
  );
}

function countWorkHours(start: Date, end: Date): number {
  let hours = 0;
  const current = new Date(start);
  while (current < end) {
    if (isWorkHour(current)) hours++;
    current.setHours(current.getHours() + 1);
  }
  return hours;
}

function getWorkProgress(start: Date, end: Date): number {
  const now = new Date();
  if (now <= start) return 0;
  if (now >= end) return 100;

  const totalHours = countWorkHours(start, end);
  const elapsedHours = countWorkHours(start, now);

  if (totalHours === 0) return 0;
  return parseFloat(((elapsedHours / totalHours) * 100).toFixed(1));
}

const GanttCarManiaApp: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const { lavorazioni, setLavorazioni, esperienzaOperatoriPerTipo } = useLavorazioni();
  const { autoList, addAuto, getAutoById, setAutoList } = useAuto(); 

  const [modello, setModello] = useState("");
  const [priorita, setPriorita] = useState("1");
  const [targa, setTarga] = useState("");
  const [colore, setColore] = useState("");
  const [lavorazioniSelezionate, setLavorazioniSelezionate] = useState<
    string[]
  >([]);
  const [occupazioneOperatori, setOccupazioneOperatori] = useState<
    { [key: string]: Date[] }
  >({});

  // useEffect per sincronizzare le lavorazioni e le auto dal contesto con i task del Gantt
  useEffect(() => {
    if (lavorazioni.length === 0 && autoList.length === 0) {
      setTasks([]);
      return;
    }

    const tasksRicostruiti: CustomTask[] = [];

    autoList.forEach((auto: Auto) => { // Specifica il tipo per 'auto'
      const lavorazioniAuto = lavorazioni.filter((l: Lavorazione) => l.autoId === auto.id); // Specifica il tipo per 'l'
      if (lavorazioniAuto.length === 0) {
        return;
      }

      const autoId = auto.id;
      const autoNome = auto.modello;
      const autoPriorita = auto.priorita;

      const startProject = new Date(
        Math.min(
          ...lavorazioniAuto.map((l: Lavorazione) => // Specifica il tipo per 'l'
            new Date(l.startTime || auto.dataAccettazione).getTime()
          )
        )
      );
      const endProject = new Date(
        Math.max(
          ...lavorazioniAuto.map(
            (l: Lavorazione) => (l.completionTime ? l.completionTime.getTime() : (new Date(l.startTime || auto.dataAccettazione).getTime() + l.estimatedMs))
          )
        )
      );
      
      const padre: CustomTask = {
        id: autoId,
        name: `${autoNome} (priorità ${autoPriorita})`,
        type: "project",
        start: startProject,
        end: endProject,
        progress: 0,
        hideChildren: false,
        styles: {
          progressColor: "#9acc69",
          progressSelectedColor: "#9acc69",
        },
        targaAuto: auto.targa,
        coloreAuto: auto.colore,
      };
      tasksRicostruiti.push(padre);

      lavorazioniAuto.forEach((l: Lavorazione) => { // Specifica il tipo per 'l'
        const s = l.startTime || new Date(); 
        const e = l.completionTime ? l.completionTime : new Date(s.getTime() + l.estimatedMs);

        let progressPercentage: number;
        if (l.stato === "completata") {
          progressPercentage = 100;
        } else {
          progressPercentage = l.estimatedMs > 0
            ? Math.min(100, parseFloat(((l.elapsedMs / l.estimatedMs) * 100).toFixed(1)))
            : 0;
        }
        
        const task: CustomTask = {
          id: l.id,
          name: `${l.tipo} – ${l.operatore}`,
          type: "task",
          project: l.autoId,
          start: s,
          end: e,
          duration: l.estimatedMs / (1000 * 60 * 60),
          progress: progressPercentage,
          styles: {
            backgroundColor: coloriLavorazioni[l.tipo] || "#cccccc",
            progressColor: coloriLavorazioni[l.tipo] || "#cccccc",
            progressSelectedColor: coloriLavorazioni[l.tipo] || "#cccccc",
          },
          operatoreAssegnato: l.operatore,
          tipoLavorazione: l.tipo,
          lavorazioneStato: l.stato,
          tempoLavoratoMs: l.elapsedMs,
          tempoStimatoMs: l.estimatedMs,
          esperienzaOperatore: esperienzaOperatoriPerTipo[l.operatore]?.[l.tipo] ?? DEFAULT_ESPERIENZA_BASE,
        };
        tasksRicostruiti.push(task);
      });
    });

    const tuttiTask = [...tasksRicostruiti];
    const padri = tuttiTask.filter((t) => t.type === "project");
    padri.sort((a, b) => {
      const pA = parseInt((a.name as string).match(/priorità (\d+)\)/)?.[1] || "5");
      const pB = parseInt((b.name as string).match(/priorità (\d+)\)/)?.[1] || "5");
      return pA - pB;
    });

    const ordinati: Task[] = [];
    for (let padre of padri) {
      ordinati.push(padre);
      const figli = tuttiTask.filter((t) => t.project === padre.id);
      figli.sort((a, b) => a.start.getTime() - b.start.getTime());
      ordinati.push(...figli);
    }
    setTasks(ordinati);
  }, [lavorazioni, autoList, esperienzaOperatoriPerTipo]);


  const handleCheckboxChange = (lav: string) => {
    setLavorazioniSelezionate((prev) =>
      prev.includes(lav) ? prev.filter((l) => l !== lav) : [...prev, lav]
    );
  };


  const trovaSlotLibero = (
    inizio: Date,
    durata: number,
    operatore: string
  ): Date => {
    let slot = new Date(inizio);
    while (
      (occupazioneOperatori[operatore] || []).some(
        (dataOccupata: Date) => 
          Math.abs(dataOccupata.getTime() - slot.getTime()) < durata * 3600 * 1000
      )
    ) {
      slot.setHours(slot.getHours() + 1);
    }
    return slot;
  };

  const handleAddAuto = () => {
    if (!modello || !targa || !colore || lavorazioniSelezionate.length === 0) {
      alert("Compila tutti i campi auto (Modello, Targa, Colore) e seleziona almeno una lavorazione.");
      return;
    }

    const newAutoId = `auto_${Date.now()}`;
    
    const newAuto: Auto = {
      id: newAutoId,
      modello: modello,
      priorita: priorita,
      targa: targa,
      colore: colore,
      dataAccettazione: new Date(),
      statoGenerale: "in_officina",
    };
    addAuto(newAuto);

    const oggiAlle8 = new Date();
    oggiAlle8.setHours(8, 0, 0, 0);

    const numeroAutoPresenti = autoList.length;
    const baseStart = new Date(
      oggiAlle8.getTime() + numeroAutoPresenti * 4 * 3600 * 1000
    );

    let currentTaskStartTime = new Date(baseStart);
    let endUltimoTask = new Date(baseStart);

    const currentOccupazioni: { [key: string]: Date[] } = {};
    lavorazioni.forEach((lav: Lavorazione) => {
      if (lav.stato !== 'completata' && lav.startTime) {
        if (!currentOccupazioni[lav.operatore]) {
          currentOccupazioni[lav.operatore] = [];
        }
        currentOccupazioni[lav.operatore].push(lav.startTime);
      }
    });
    const nuoveOccupazioni: { [key: string]: Date[] } = {
      ...currentOccupazioni,
    };

    const tasksToAdd: Lavorazione[] = [];

    lavorazioniOrdinate.forEach((tipoLav: string) => {
      if (lavorazioniSelezionate.includes(tipoLav)) {
        const durataOre = durataLavorazioni[tipoLav];
        const durataMs = durataOre * 3600 * 1000;
        const candidati = espertiPerLavorazione[tipoLav];

        let operatoreAssegnato = "";
        let inizioTask = new Date(currentTaskStartTime);

        for (let op of candidati) {
          const isAvailable = !(nuoveOccupazioni[op] || []).some(
            (dataOccupata: Date) => {
              const occupiedEnd = new Date(dataOccupata.getTime() + (durataLavorazioni[tipoLav] || 0) * 3600 * 1000); 
              const endCurrentTask = new Date(inizioTask.getTime() + durataMs);
              return (
                (inizioTask.getTime() >= dataOccupata.getTime() && inizioTask.getTime() < occupiedEnd.getTime()) ||
                (endCurrentTask.getTime() > dataOccupata.getTime() && endCurrentTask.getTime() <= occupiedEnd.getTime()) ||
                (dataOccupata.getTime() >= inizioTask.getTime() && dataOccupata.getTime() < endCurrentTask.getTime())
              );
            }
          );
          if (isAvailable) {
            operatoreAssegnato = op;
            break;
          }
        }

        if (!operatoreAssegnato) {
            const primoOp = candidati[0];
            inizioTask = trovaSlotLibero(currentTaskStartTime, durataOre, primoOp);
            operatoreAssegnato = primoOp;
        }

        const endTask = new Date(inizioTask.getTime() + durataMs);

        nuoveOccupazioni[operatoreAssegnato] = [
          ...(nuoveOccupazioni[operatoreAssegnato] || []),
          inizioTask,
        ];
        
        tasksToAdd.push({
          id: `task_${Date.now()}_${tasksToAdd.length}`,
          autoId: newAutoId,
          autoNome: modello,
          tipo: tipoLav,
          operatore: operatoreAssegnato,
          startTime: inizioTask,
          pauseTime: null,
          elapsedMs: 0,
          stato: "attesa",
          estimatedMs: durataMs,
        });

        currentTaskStartTime.setTime(endTask.getTime());
        endUltimoTask = endTask;
      }
    });
    
    setLavorazioni((prev) => [...prev, ...tasksToAdd]);
    setOccupazioneOperatori(nuoveOccupazioni);

    setModello("");
    setTarga("");
    setColore("");
    setLavorazioniSelezionate([]);
    setPriorita("1");
  };

  const handleClickAuto = (autoId: string) => {
    setLavorazioni((prev) => prev.filter((l) => l.autoId !== autoId));
    setAutoList(prev => prev.filter(auto => auto.id !== autoId)); 
  };

  const handleBarClick = (task: Task) => {
    if (task.type === "project") {
      const auto = getAutoById(task.id);
      const confirmDelete = window.confirm(`Vuoi eliminare l'auto ${auto?.modello || task.name} (Targa: ${auto?.targa || 'N/A'}) e tutte le sue lavorazioni?`);
      if (confirmDelete) {
        handleClickAuto(task.id);
      }
    }
  };

  return (
    <div style={{ padding: 30 }}>
      <h2>📅 Car Mania – Gantt Produzione</h2>
      <div style={{ marginBottom: 20, border: '1px solid #ddd', padding: '15px', borderRadius: '8px', backgroundColor: '#f9f9f9' }}>
        <h3>Aggiungi Nuova Auto per Lavorazione</h3>
        <input
          type="text"
          placeholder="Modello auto (es. Fiat Punto)"
          value={modello}
          onChange={(e) => setModello(e.target.value)}
          style={{ marginRight: 10, padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
        />
        <input
          type="text"
          placeholder="Targa auto (es. AB123CD)"
          value={targa}
          onChange={(e) => setTarga(e.target.value)}
          style={{ marginRight: 10, padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
        />
        <input
          type="text"
          placeholder="Colore auto (es. Rosso)"
          value={colore}
          onChange={(e) => setColore(e.target.value)}
          style={{ marginRight: 10, padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
        />
        <select
          value={priorita}
          onChange={(e) => setPriorita(e.target.value)}
          style={{ marginRight: 10, padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
        >
          <option value="1">Priorità 1 (alta)</option>
          <option value="2">Priorità 2</option>
          <option value="3">Priorità 3</option>
          <option value="4">Priorità 4</option>
          <option value="5">Priorità 5 (bassa)</option>
        </select>
        <div style={{ marginBottom: 10, marginTop: 10 }}>
          <h4>Seleziona Lavorazioni:</h4>
          {lavorazioniOrdinate.map((lav: string) => (
            <label key={lav} style={{ marginRight: 15, display: 'inline-block', marginBottom: '5px' }}>
              <input
                type="checkbox"
                checked={lavorazioniSelezionate.includes(lav)}
                onChange={() => handleCheckboxChange(lav)}
                style={{ marginRight: '5px' }}
              />
              {" " + lav}
            </label>
          ))}
        </div>
        <button
          onClick={handleAddAuto}
          style={{ backgroundColor: '#007bff', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '5px', cursor: 'pointer', fontSize: '16px' }}
        >
          ➕ Aggiungi auto
        </button>
      </div>

      {tasks.length > 0 ? (
        <Gantt
          tasks={tasks.filter((t) => t.start && t.end) as CustomTask[]}
          viewMode={ViewMode.Day}
          listCellWidth="220px"
          onClick={handleBarClick}
          TooltipContent={TooltipContent}
          barCornerRadius={3}
          barFill={70}
          fontSize="12px"
          columnWidth={60}
        />
      ) : (
        <p>🔧 Nessuna auto in lavorazione. Aggiungine una per iniziare!</p>
      )}
    </div>
  );
};

export default GanttCarManiaApp;
