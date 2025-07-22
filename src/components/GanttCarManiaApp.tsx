// GanttCarManiaApp.tsx
import { useLavorazioni, Lavorazione } from "./GanttDataStore";
import React, { useState, useEffect } from "react";
import "gantt-task-react/dist/index.css";
import { Gantt, Task, ViewMode } from "gantt-task-react";
// Importa CustomTask insieme a TooltipContent
import TooltipContent, { CustomTask } from "./TooltipContent";
// Importa il nuovo componente della tabella esperienza
import EsperienzaOperatoriTable from "./EsperienzaOperatoriTable";
// Importa le costanti dal nuovo file (percorso corretto)
import {
  lavorazioniOrdinate,
  durataLavorazioni,
  coloriLavorazioni,
  getAllOperators,
  DEFAULT_ESPERIENZA_BASE,
} from "../constants";

// Funzioni di utilità per il calcolo delle ore lavorative
function isWorkHour(date: Date): boolean {
  const hour = date.getHours();
  const day = date.getDay();
  // Lunedì (1) a Venerdì (5) e orari 8-12, 14-18
  return (
    day !== 0 && // Esclude Domenica
    day !== 6 && // Esclude Sabato
    ((hour >= 8 && hour < 12) || (hour >= 14 && hour < 18))
  );
}

function countWorkHours(start: Date, end: Date): number {
  let hours = 0;
  const current = new Date(start);
  while (current < end) {
    if (isWorkHour(current)) hours++;
    current.setHours(current.getHours() + 1); // Avanza di un'ora
  }
  return hours;
}

// Questa funzione non è direttamente usata per la progress bar di Gantt-Task-React
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
  // Usa CustomTask[] per tipizzare lo stato tasks
  const [tasks, setTasks] = useState<CustomTask[]>([]);
  const { lavorazioni, setLavorazioni, esperienzaOperatoriPerTipo } =
    useLavorazioni();

  const [modello, setModello] = useState("");
  const [priorita, setPriorita] = useState("1");
  const [lavorazioniSelezionate, setLavorazioniSelezionate] = useState<
    string[]
  >([]);
  const [occupazioneOperatori, setOccupazioneOperatori] = useState<{
    [key: string]: Date[];
  }>({});

  // useEffect per sincronizzare le lavorazioni dal contesto con i task del Gantt
  useEffect(() => {
    if (lavorazioni.length === 0) {
      setTasks([]);
      return;
    }

    const nuoveAuto = new Set(lavorazioni.map((l) => l.autoId));
    // Usa CustomTask[] per tipizzare tasksRicostruiti
    const tasksRicostruiti: CustomTask[] = [];

    nuoveAuto.forEach((autoId) => {
      const lavorazioniAuto = lavorazioni.filter((l) => l.autoId === autoId);
      if (lavorazioniAuto.length === 0) return;

      const startProject = new Date(
        Math.min(
          ...lavorazioniAuto.map((l) =>
            new Date(l.startTime || Date.now()).getTime()
          )
        )
      );
      const endProject = new Date(
        Math.max(
          ...lavorazioniAuto.map(
            (l) => new Date(l.startTime || Date.now()).getTime() + l.estimatedMs
          )
        )
      );

      let sumOfIndividualProgresses = 0;
      let numberOfTasks = 0;

      lavorazioniAuto.forEach((l) => {
        let individualTaskProgress: number;
        if (l.stato === "completata") {
          individualTaskProgress = 100;
        } else {
          individualTaskProgress =
            l.estimatedMs > 0
              ? Math.min(
                  100,
                  parseFloat(((l.elapsedMs / l.estimatedMs) * 100).toFixed(1))
                )
              : 0;
        }
        sumOfIndividualProgresses += individualTaskProgress;
        numberOfTasks++;
      });

      let projectProgress = 0;
      if (numberOfTasks > 0) {
        projectProgress = parseFloat(
          (sumOfIndividualProgresses / numberOfTasks).toFixed(1)
        );
        projectProgress = Math.min(100, projectProgress);
      }

      const padre: CustomTask = {
        id: autoId,
        name: `${lavorazioniAuto[0].autoNome} (priorità ${priorita})`,
        type: "project",
        start: startProject,
        end: endProject,
        progress: projectProgress,
        hideChildren: false,
        styles: {
          progressColor: "#9acc69",
          progressSelectedColor: "#9acc69",
        },
      };
      tasksRicostruiti.push(padre);

      lavorazioniAuto.forEach((l) => {
        const s = l.startTime || new Date();
        const e = new Date(s.getTime() + l.estimatedMs);

        let progressPercentage: number;

        if (l.stato === "completata") {
          progressPercentage = 100;
        } else {
          progressPercentage =
            l.estimatedMs > 0
              ? Math.min(
                  100,
                  parseFloat(((l.elapsedMs / l.estimatedMs) * 100).toFixed(1))
                )
              : 0;
        }

        tasksRicostruiti.push({
          id: l.id,
          name: `${l.tipo} – ${l.operatore}`,
          type: "task",
          project: l.autoId,
          start: s,
          end: e,
          duration: l.estimatedMs / (3600 * 1000), // Converte ms in ore per la prop duration
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
          esperienzaOperatore:
            esperienzaOperatoriPerTipo[l.operatore]?.[l.tipo] ??
            DEFAULT_ESPERIENZA_BASE,
        });
      });
    });

    const tuttiTask = [...tasksRicostruiti];
    const padri = tuttiTask.filter((t) => t.type === "project");
    padri.sort((a, b) => {
      const pA = parseInt(a.name.match(/\(priorità (\d+)\)/)?.[1] || "5");
      const pB = parseInt(b.name.match(/\(priorità (\d+)\)/)?.[1] || "5");
      return pA - pB;
    });

    const ordinati: CustomTask[] = [];
    for (let padre of padri) {
      ordinati.push(padre);
      ordinati.push(...tuttiTask.filter((t) => t.project === padre.id));
    }
    setTasks(ordinati);
  }, [lavorazioni, esperienzaOperatoriPerTipo]);

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
    // Questo controllo di sovrapposizione è molto semplificato e controlla solo gli inizi dei task
    // Per una robusta gestione degli slot, occorrerebbe una logica più avanzata che consideri gli intervalli completi di occupazione
    while (
      (occupazioneOperatori[operatore] || []).some(
        (dataOccupata) =>
          Math.abs(dataOccupata.getTime() - slot.getTime()) <
          durata * 3600 * 1000
      )
    ) {
      slot.setHours(slot.getHours() + 1);
    }
    return slot;
  };

  const handleAddAuto = () => {
    if (!modello || lavorazioniSelezionate.length === 0) {
      alert(
        "Inserisci il modello dell'auto e seleziona almeno una lavorazione."
      );
      return;
    }

    const newAutoId = `auto_${Date.now()}`;
    const oggiAlle8 = new Date();
    oggiAlle8.setHours(8, 0, 0, 0);

    const numeroAutoPresenti = tasks.filter((t) => t.type === "project").length;
    const baseStart = new Date(
      oggiAlle8.getTime() + numeroAutoPresenti * 4 * 3600 * 1000
    );

    let currentTaskStartTime = new Date(baseStart);
    let endUltimoTask = new Date(baseStart);

    const currentOccupazioni: { [key: string]: Date[] } = {};
    lavorazioni.forEach((lav) => {
      if (lav.stato !== "completata" && lav.startTime) {
        if (!currentOccupazioni[lav.operatore]) {
          currentOccupazioni[lav.operatore] = [];
        }
        currentOccupazioni[lav.operatore].push(lav.startTime);
      }
    });
    const nuoveOccupazioni: { [key: string]: Date[] } = {
      ...currentOccupazioni,
    };

    const tasksToAdd: CustomTask[] = [];
    const lavorazioniDaAggiungere: Lavorazione[] = [];

    lavorazioniOrdinate.forEach((lav) => {
      if (lavorazioniSelezionate.includes(lav)) {
        const durataOre = durataLavorazioni[lav];
        const durataMs = durataOre * 3600 * 1000;

        // Tutti gli operatori sono candidati
        let candidati = getAllOperators();

        // LOGICA DI ORDINAMENTO OPERATORI PER ESPERIENZA E NOME
        const tipoLavorazioneCorrente = lav;
        candidati.sort((opA, opB) => {
          const expA =
            esperienzaOperatoriPerTipo[opA]?.[tipoLavorazioneCorrente] ??
            DEFAULT_ESPERIENZA_BASE;
          const expB =
            esperienzaOperatoriPerTipo[opB]?.[tipoLavorazioneCorrente] ??
            DEFAULT_ESPERIENZA_BASE;

          // Ordine decrescente per esperienza
          if (expB !== expA) {
            return expB - expA;
          }
          // A parità di esperienza, ordina per nome alfabetico crescente
          return opA.localeCompare(opB);
        });
        // FINE LOGICA DI ORDINAMENTO

        // Inizializza finalInizioTask, finalEndTask e operatoreAssegnato
        // con valori di default robusti per soddisfare TypeScript.
        // Se candidati è vuoto, usa un fallback 'N/A' per l'operatore.
        let operatoreAssegnato: string =
          candidati.length > 0 ? candidati[0] : "N/A";
        let finalInizioTask: Date = new Date(); // Inizializzato (fix TS2454)
        let finalEndTask: Date = new Date(); // Inizializzato (fix TS2454)

        // Fase 1: Cerca un operatore disponibile nell'orario di partenza corrente (proposedInizioTask)
        // Utilizza le variabili `proposedInizioTask` e `proposedEndTask` per le verifiche temporanee.
        const proposedInizioTask = new Date(currentTaskStartTime);
        const proposedEndTask = new Date(
          proposedInizioTask.getTime() + durataMs
        );

        let foundAvailableAtProposedTime = false; // Flag cruciale per TS2454

        for (let op of candidati) {
          const isAvailableAtProposedTime = !(nuoveOccupazioni[op] || []).some(
            (dataOccupata) => {
              const estimatedDurationOfOccupiedTask =
                durataLavorazioni[lav] || 0;
              const occupiedEnd = new Date(
                dataOccupata.getTime() +
                  estimatedDurationOfOccupiedTask * 3600 * 1000
              );

              // Verifica di sovrapposizione tra [proposedInizioTask, proposedEndTask] e [dataOccupata, occupiedEnd]
              return (
                (proposedInizioTask.getTime() < occupiedEnd.getTime() &&
                  proposedInizioTask.getTime() >= dataOccupata.getTime()) ||
                (proposedEndTask.getTime() > dataOccupata.getTime() &&
                  proposedEndTask.getTime() <= occupiedEnd.getTime()) ||
                (dataOccupata.getTime() >= proposedInizioTask.getTime() &&
                  dataOccupata.getTime() < proposedEndTask.getTime())
              );
            }
          );
          if (isAvailableAtProposedTime) {
            operatoreAssegnato = op;
            finalInizioTask = proposedInizioTask;
            finalEndTask = proposedEndTask;
            foundAvailableAtProposedTime = true;
            break;
          }
        }

        // Fase 2: Se nessun operatore è disponibile nell'orario proposto (il flag è false),
        // assegna al più esperto (già `candidati[0]`) e trova il prossimo slot libero.
        if (!foundAvailableAtProposedTime) {
          finalInizioTask = trovaSlotLibero(
            currentTaskStartTime,
            durataOre,
            operatoreAssegnato
          );
          finalEndTask = new Date(finalInizioTask.getTime() + durataMs);
        }

        // AGGIORNAMENTO dell'occupazione dell'operatore assegnato
        nuoveOccupazioni[operatoreAssegnato] = [
          ...(nuoveOccupazioni[operatoreAssegnato] || []),
          finalInizioTask,
        ];

        const colore = coloriLavorazioni[lav] || "#cccccc";
        const taskId = `task_${Date.now()}_${lavorazioniDaAggiungere.length}`;

        tasksToAdd.push({
          id: taskId,
          name: `${lav} – ${operatoreAssegnato}`,
          type: "task",
          project: newAutoId,
          start: finalInizioTask,
          end: finalEndTask,
          duration: durataOre,
          progress: 0,
          styles: {
            backgroundColor: colore,
            progressColor: colore,
            progressSelectedColor: colore,
          },
          operatoreAssegnato: operatoreAssegnato,
          tipoLavorazione: lav,
          lavorazioneStato: "attesa",
          tempoLavoratoMs: 0,
          tempoStimatoMs: durataMs,
        });

        lavorazioniDaAggiungere.push({
          id: taskId,
          autoId: newAutoId,
          autoNome: modello,
          tipo: lav,
          operatore: operatoreAssegnato,
          startTime: finalInizioTask,
          pauseTime: null,
          elapsedMs: 0,
          stato: "attesa",
          estimatedMs: durataMs,
        });

        currentTaskStartTime.setTime(finalEndTask.getTime());
        endUltimoTask = finalEndTask;
      }
    });

    const autoTask: CustomTask = {
      id: newAutoId,
      name: `${modello} (priorità ${priorita})`,
      type: "project",
      start: baseStart,
      end: endUltimoTask,
      progress: 0,
      hideChildren: false,
      styles: {
        progressColor: "#9acc69",
        progressSelectedColor: "#9acc69",
      },
    };

    setTasks((prev) => {
      const tuttiTask = [...prev, autoTask, ...tasksToAdd];
      const padri = tuttiTask.filter((t) => t.type === "project");
      padri.sort((a, b) => {
        const pA = parseInt(a.name.match(/\(priorità (\d+)\)/)?.[1] || "5");
        const pB = parseInt(b.name.match(/\(priorità (\d+)\)/)?.[1] || "5");
        return pA - pB;
      });
      const ordinati: CustomTask[] = [];
      for (let padre of padri) {
        ordinati.push(padre);
        ordinati.push(...tuttiTask.filter((t) => t.project === padre.id));
      }
      return ordinati;
    });

    setLavorazioni((prev) => [...prev, ...lavorazioniDaAggiungere]);
    setOccupazioneOperatori(nuoveOccupazioni);

    setModello("");
    setLavorazioniSelezionate([]);
    setPriorita("1");
  };

  const handleClickAuto = (autoId: string) => {
    setTasks((prev) =>
      prev.filter((t) => t.id !== autoId && t.project !== autoId)
    );
    setLavorazioni((prev) => prev.filter((l) => l.autoId !== autoId));
  };

  const handleBarClick = (task: Task) => {
    if (task.type === "project") {
      const confirmDelete = window.confirm(`Vuoi eliminare ${task.name}?`);
      if (confirmDelete) {
        handleClickAuto(task.id);
      }
    }
  }; // <--- Chiusura corretta della funzione handleBarClick
  return (
    <div style={{ padding: 30 }}>
      {/* ... TUTTO IL CONTENUTO VISIVO (il form Aggiungi Auto, la tabella esperienza, il Gantt) ... */}
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
          {lavorazioniOrdinate.map((lav) => (
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
      {/* INTEGRAZIONE DEL NUOVO COMPONENTE PER LA GESTIONE ESPERIENZA */}
      <EsperienzaOperatoriTable />
      {/* Questa è la sezione finale del JSX, che include il Gantt o il messaggio */}
      {/* Cerca questo blocco nel tuo file */}
      {tasks.length > 0 ? (
        <Gantt
          tasks={tasks.filter((t) => t.start && t.end)}
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
    </div> // <--- QUESTA RIGA DEVE ESSERE QUI PER CHIUDERE IL DIV INIZIALE
  ); // <--- QUESTA RIGA DEVE ESSERE QUI PER CHIUDERE IL RETURN JSX
}; // <--- QUESTA RIGA DEVE ESSERE QUI PER CHIUDERE LA FUNZIONE GanttCarManiaApp (e non da nessuna altra parte prima!)

export default GanttCarManiaApp; // <--- QUESTA DEVE ESSERE L'ULTIMISSIMA RIGA DEL FILE

// END_OF_GANTT_CAR_MANIA_APP_FILE_VERIFIED_BY_GIORGIA_V2