// src/components/GanttCarManiaApp.tsx
// GanttDataStore si trova nella stessa cartella components/
import {
  useLavorazioni,
  Lavorazione,
  EsperienzaOperatoriPerTipo,
} from "./GanttDataStore";
// AutoDataStore si trova nella stessa cartella components/
import { useAuto, Auto } from "./AutoDataStore";
import React, { useState, useEffect, useCallback } from "react";
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
  getAllOperators,
} from "../constants";

// Definisci una CustomTask per estendere l'interfaccia Task della libreria
interface CustomTask extends Task {
  operatoreAssegnato?: string;
  tipoLavorazione?: string;
  lavorazioneStato?: "attesa" | "in_corso" | "pausa" | "completata";
  tempoLavoratoMs?: number;
  tempoStimatoMs?: number;
  esperienzaOperatore?: number;
  targaAuto?: string;
  coloreAuto?: string;
  duration?: number; // Aggiunto per la compatibilità con il Task
}

// Funzioni di utilità per il calcolo delle ore lavorative
function isWorkHour(date: Date): boolean {
  const hour = date.getHours();
  const day = date.getDay();
  // Lunedì (1) a Venerdì (5) e orari 8-12, 14-18
  return (
    day !== 0 && // Non è Domenica
    day !== 6 && // Non è Sabato
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

// Funzione: Calcola la data di fine di un task contando solo le ore lavorative.
function calculateWorkEndDate(startDate: Date, durationMs: number): Date {
  const endDate = new Date(startDate);
  let remainingMs = durationMs;

  while (!isWorkHour(endDate)) {
    endDate.setHours(endDate.getHours() + 1);
    endDate.setMinutes(0, 0, 0);
    if (endDate.getDay() === 0 || endDate.getDay() === 6) {
      endDate.setDate(
        endDate.getDate() +
          (endDate.getDay() === 0 ? 1 : endDate.getDay() === 6 ? 2 : 0)
      );
      endDate.setHours(8, 0, 0, 0);
    }
  }

  while (remainingMs > 0) {
    const currentHour = endDate.getHours();
    const currentDay = endDate.getDay();

    if (
      currentDay === 0 ||
      currentDay === 6 ||
      (currentHour >= 12 && currentHour < 14) ||
      currentHour >= 18 ||
      currentHour < 8
    ) {
      endDate.setHours(endDate.getHours() + 1);
      endDate.setMinutes(0, 0, 0);
    } else {
      remainingMs -= 1000 * 60 * 60;
      endDate.setHours(endDate.getHours() + 1);
    }
  }
  return endDate;
}

// FUNZIONE CENTRALE DI SCHEDULING: Ripianifica tutte le lavorazioni non completate
const recalculateFullSchedule = (
  allLavorazioni: Lavorazione[],
  allAutoList: Auto[],
  esperienzaOperatori: EsperienzaOperatoriPerTipo,
  trovaSlotLiberoFunc: (
    earliestStart: Date,
    taskDurationMs: number,
    operatore: string,
    existingOccupations: { start: Date; end: Date }[]
  ) => Date
): Lavorazione[] => {
  const newScheduledLavorazioni: Lavorazione[] = [];
  const currentOccupations: { [key: string]: { start: Date; end: Date }[] } =
    {};
  const carLastEndTime: { [autoId: string]: Date } = {};

  const completedLavorazioni = allLavorazioni.filter(
    (lav) => lav.stato === "completata"
  );
  const fixedLavorazioni = allLavorazioni.filter(
    (lav) => lav.stato === "in_corso" || lav.stato === "pausa"
  );
  const flexibleLavorazioni = allLavorazioni.filter(
    (lav) => lav.stato === "attesa"
  );

  fixedLavorazioni.forEach((lav) => {
    const estimatedEnd = calculateWorkEndDate(lav.startTime!, lav.estimatedMs);
    if (!currentOccupations[lav.operatore]) {
      currentOccupations[lav.operatore] = [];
    }
    currentOccupations[lav.operatore].push({
      start: lav.startTime!,
      end: estimatedEnd,
    });
  });
  for (const op in currentOccupations) {
    currentOccupations[op].sort(
      (a, b) => a.start.getTime() - b.start.getTime()
    );
  }

  interface TaskWithAutoPriority extends Lavorazione {
    carPriority: string;
    carAcceptanceDate: Date;
  }

  const tasksToReschedule: TaskWithAutoPriority[] = flexibleLavorazioni.map(
    (lav) => {
      const auto = allAutoList.find((a) => a.id === lav.autoId);
      return {
        ...lav,
        carPriority: auto ? auto.priorita : "5",
        carAcceptanceDate: auto ? auto.dataAccettazione : new Date(0),
      };
    }
  );

  tasksToReschedule.sort((a, b) => {
    if (a.carPriority !== b.carPriority) {
      return parseInt(a.carPriority) - parseInt(b.carPriority);
    }
    if (a.carAcceptanceDate.getTime() !== b.carAcceptanceDate.getTime()) {
      return a.carAcceptanceDate.getTime() - b.carAcceptanceDate.getTime();
    }
    const orderA = lavorazioniOrdinate.indexOf(a.tipo);
    const orderB = lavorazioniOrdinate.indexOf(b.tipo);
    if (orderA !== orderB) {
      return orderA - orderB;
    }
    return a.id.localeCompare(b.id);
  });

  tasksToReschedule.forEach((lavToReschedule) => {
    const durataMs = lavToReschedule.estimatedMs;
    const candidati = espertiPerLavorazione[lavToReschedule.tipo];

    interface CandidateInfo {
      name: string;
      experience: number;
      earliestPossibleStart: Date;
    }

    const candidateInfos: CandidateInfo[] = [];

    let taskSearchStartTime: Date;

    const auto = allAutoList.find((a) => a.id === lavToReschedule.autoId);
    let defaultBaseTime = auto?.dataAccettazione || new Date();
    while (!isWorkHour(defaultBaseTime)) {
      defaultBaseTime.setHours(defaultBaseTime.getHours() + 1);
      defaultBaseTime.setMinutes(0, 0, 0);
      if (defaultBaseTime.getDay() === 0 || defaultBaseTime.getDay() === 6) {
        defaultBaseTime.setDate(
          defaultBaseTime.getDate() +
            (defaultBaseTime.getDay() === 0
              ? 1
              : defaultBaseTime.getDay() === 6
              ? 2
              : 0)
        );
        defaultBaseTime.setHours(8, 0, 0, 0);
      }
    }
    taskSearchStartTime = defaultBaseTime;

    if (lavToReschedule.prerequisiteLavorazioneId) {
      const prerequisite = allLavorazioni.find(
        (l) => l.id === lavToReschedule.prerequisiteLavorazioneId
      );
      if (prerequisite) {
        if (
          prerequisite.stato === "completata" &&
          prerequisite.completionTime
        ) {
          taskSearchStartTime = new Date(
            Math.max(
              taskSearchStartTime.getTime(),
              prerequisite.completionTime.getTime()
            )
          );
        } else if (prerequisite.startTime) {
          const prereqEstimatedEnd = calculateWorkEndDate(
            prerequisite.startTime,
            prerequisite.estimatedMs
          );
          taskSearchStartTime = new Date(
            Math.max(
              taskSearchStartTime.getTime(),
              prereqEstimatedEnd.getTime()
            )
          );
        }
      }
    }

    if (
      carLastEndTime[lavToReschedule.autoId] &&
      carLastEndTime[lavToReschedule.autoId].getTime() >
        taskSearchStartTime.getTime()
    ) {
      taskSearchStartTime = carLastEndTime[lavToReschedule.autoId];
    }

    while (!isWorkHour(taskSearchStartTime)) {
      taskSearchStartTime.setHours(taskSearchStartTime.getHours() + 1);
      taskSearchStartTime.setMinutes(0, 0, 0);
      if (
        taskSearchStartTime.getDay() === 0 ||
        taskSearchStartTime.getDay() === 6
      ) {
        taskSearchStartTime.setDate(
          taskSearchStartTime.getDate() +
            (taskSearchStartTime.getDay() === 0
              ? 1
              : taskSearchStartTime.getDay() === 6
              ? 2
              : 0)
        );
        taskSearchStartTime.setHours(8, 0, 0, 0);
      }
    }

    for (const op of candidati) {
      const experience =
        esperienzaOperatori[op]?.[lavToReschedule.tipo] ??
        DEFAULT_ESPERIENZA_BASE;
      const earliestStart = trovaSlotLiberoFunc(
        taskSearchStartTime,
        durataMs,
        op,
        currentOccupations[op] || []
      );
      candidateInfos.push({
        name: op,
        experience: experience,
        earliestPossibleStart: earliestStart,
      });
    }

    candidateInfos.sort((a, b) => {
      if (
        a.earliestPossibleStart.getTime() !== b.earliestPossibleStart.getTime()
      ) {
        return (
          a.earliestPossibleStart.getTime() - b.earliestPossibleStart.getTime()
        );
      }
      if (a.experience !== b.experience) {
        return b.experience - a.experience;
      }
      return a.name.localeCompare(b.name);
    });

    const bestCandidate = candidateInfos[0];
    const operatoreAssegnato = bestCandidate.name;
    const inizioTask = bestCandidate.earliestPossibleStart;
    const endTask = calculateWorkEndDate(inizioTask, durataMs);

    if (!currentOccupations[operatoreAssegnato]) {
      currentOccupations[operatoreAssegnato] = [];
    }
    currentOccupations[operatoreAssegnato].push({
      start: inizioTask,
      end: endTask,
    });
    currentOccupations[operatoreAssegnato].sort(
      (a, b) => a.start.getTime() - b.start.getTime()
    );

    carLastEndTime[lavToReschedule.autoId] = endTask;

    const updatedLav: Lavorazione = {
      ...lavToReschedule,
      operatore: operatoreAssegnato,
      startTime: inizioTask,
    };
    newScheduledLavorazioni.push(updatedLav);
  });

  return [
    ...completedLavorazioni,
    ...fixedLavorazioni,
    ...newScheduledLavorazioni,
  ];
};

interface GanttCarManiaAppProps {
  setRescheduleTrigger: React.Dispatch<React.SetStateAction<() => void>>;
}

const GanttCarManiaApp: React.FC<GanttCarManiaAppProps> = ({
  setRescheduleTrigger,
}) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const { lavorazioni, setLavorazioni, esperienzaOperatoriPerTipo } =
    useLavorazioni();
  const { autoList, addAuto, getAutoById, setAutoList } = useAuto();

  const [modello, setModello] = useState("");
  const [priorita, setPriorita] = useState("1");
  const [targa, setTarga] = useState("");
  const [colore, setColore] = useState("");
  const [lavorazioniSelezionate, setLavorazioniSelezionate] = useState<
    string[]
  >([]);
  const [occupazioneOperatori, setOccupazioneOperatori] = useState<{
    [key: string]: { start: Date; end: Date }[];
  }>({});

  useEffect(() => {
    if (lavorazioni.length === 0 && autoList.length === 0) {
      setTasks([]);
      return;
    }

    const tasksRicostruiti: CustomTask[] = [];

    const currentRealOccupations: {
      [key: string]: { start: Date; end: Date }[];
    } = {};
    lavorazioni.forEach((lav) => {
      if (lav.stato !== "completata" && lav.startTime) {
        const estimatedEnd = calculateWorkEndDate(
          lav.startTime,
          lav.estimatedMs
        );
        if (!currentRealOccupations[lav.operatore]) {
          currentRealOccupations[lav.operatore] = [];
        }
        currentRealOccupations[lav.operatore].push({
          start: lav.startTime,
          end: estimatedEnd,
        });
      }
    });
    for (const op in currentRealOccupations) {
      currentRealOccupations[op].sort(
        (a, b) => a.start.getTime() - b.start.getTime()
      );
    }
    setOccupazioneOperatori(currentRealOccupations);

    autoList.forEach((auto: Auto) => {
      const lavorazioniAuto = lavorazioni.filter(
        (l: Lavorazione) => l.autoId === auto.id
      );
      if (lavorazioniAuto.length === 0) {
        return;
      }

      const autoId = auto.id;
      const autoNome = auto.modello;
      const autoPriorita = auto.priorita;

      // Inizio del blocco per il calcolo del progresso complessivo dell'auto
      let totalEstimatedMsOfAllLavorazioni = 0; // Somma delle stime di TUTTE le lavorazioni dell'auto
      let totalWorkDoneMs = 0; // Somma dei progressi effettivi (stimati per completate, elapsed per in corso/pausa)

      lavorazioniAuto.forEach((l: Lavorazione) => {
        totalEstimatedMsOfAllLavorazioni += l.estimatedMs; // Ogni lavorazione contribuisce al totale stimato

        if (l.stato === "completata") {
          // Se la lavorazione è completata, contribuisce con il 100% del suo tempo STIMATO
          totalWorkDoneMs += l.estimatedMs;
        } else if (l.stato === "in_corso" || l.stato === "pausa") {
          // Se la lavorazione è in corso o in pausa, contribuisce con il tempo EFFETTIVO già lavorato
          totalWorkDoneMs += l.elapsedMs;
        }
        // Le lavorazioni "attesa" contribuiscono a totalEstimatedMsOfAllLavorazioni ma non a totalWorkDoneMs
      });

      let autoProgress = 0;
      if (totalEstimatedMsOfAllLavorazioni > 0) {
        // Calcola la percentuale: lavoro fatto (in base a stime e elapsed) / totale stimato
        autoProgress = parseFloat(
          ((totalWorkDoneMs / totalEstimatedMsOfAllLavorazioni) * 100).toFixed(
            1
          )
        );
      } else if (lavorazioniAuto.length > 0) {
        // Caso in cui non ci sono estimatedMs ma ci sono lavorazioni
        // Se tutte le lavorazioni sono completate ma estimatedMs è 0 (scenario strano),
        // potresti voler forzare il 100%.
        const allCompleted = lavorazioniAuto.every(
          (l) => l.stato === "completata"
        );
        if (allCompleted) {
          autoProgress = 100;
        }
      }

      // Assicurati che il progresso non superi il 100% e non sia negativo
      autoProgress = Math.max(0, Math.min(100, autoProgress));
      // Fine del blocco per il calcolo del progresso complessivo dell'auto

      const startProject = new Date(
        Math.min(
          ...lavorazioniAuto.map((l: Lavorazione) =>
            new Date(l.startTime || auto.dataAccettazione).getTime()
          )
        )
      );
      const endProject = new Date(
        Math.max(
          ...lavorazioniAuto.map((l: Lavorazione) =>
            l.completionTime
              ? l.completionTime.getTime()
              : calculateWorkEndDate(
                  new Date(l.startTime || auto.dataAccettazione),
                  l.estimatedMs
                ).getTime()
          )
        )
      );

      const padre: CustomTask = {
        id: autoId,
        name: `${autoNome} (priorità ${autoPriorita})`,
        type: "project",
        start: startProject,
        end: endProject,
        progress: autoProgress, // <--- ORA USA IL NUOVO CALCOLO
        hideChildren: false,
        styles: {
          progressColor: "#9acc69",
          progressSelectedColor: "#9acc69",
        },
        targaAuto: auto.targa,
        coloreAuto: auto.colore,
      };
      tasksRicostruiti.push(padre);

      lavorazioniAuto.forEach((l: Lavorazione) => {
        const s = l.startTime || new Date();
        const e = l.completionTime
          ? l.completionTime
          : calculateWorkEndDate(s, l.estimatedMs);

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
          esperienzaOperatore:
            esperienzaOperatoriPerTipo[l.operatore]?.[l.tipo] ??
            DEFAULT_ESPERIENZA_BASE,
        };
        tasksRicostruiti.push(task);
      });
    });

    const tuttiTask = [...tasksRicostruiti];
    const padri = tuttiTask.filter((t) => t.type === "project");
    padri.sort((a, b) => {
      const pA = parseInt(
        (a.name as string).match(/priorità (\d+)\)/)?.[1] || "5"
      );
      const pB = parseInt(
        (b.name as string).match(/priorità (\d+)\)/)?.[1] || "5"
      );
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
    earliestStart: Date,
    taskDurationMs: number,
    operatore: string,
    existingOccupations: { start: Date; end: Date }[]
  ): Date => {
    let currentCheckTime = new Date(earliestStart);
    let potentialEnd = calculateWorkEndDate(currentCheckTime, taskDurationMs);

    const sortedOccupations = [...existingOccupations].sort(
      (a, b) => a.start.getTime() - b.start.getTime()
    );

    while (true) {
      let isOverlap = false;
      for (let i = 0; i < sortedOccupations.length; i++) {
        const occupied = sortedOccupations[i];

        if (
          currentCheckTime.getTime() < occupied.end.getTime() &&
          potentialEnd.getTime() > occupied.start.getTime()
        ) {
          isOverlap = true;
          currentCheckTime = new Date(occupied.end.getTime());
          currentCheckTime.setMinutes(0, 0, 0);
          potentialEnd = calculateWorkEndDate(currentCheckTime, taskDurationMs);
          i = -1;
          continue;
        }
      }

      if (!isOverlap) {
        while (!isWorkHour(currentCheckTime)) {
          currentCheckTime.setHours(currentCheckTime.getHours() + 1);
          currentCheckTime.setMinutes(0, 0, 0);
          potentialEnd = calculateWorkEndDate(currentCheckTime, taskDurationMs);
        }
        return currentCheckTime;
      }
    }
  };

  const handleAddAuto = useCallback(() => {
    if (!modello || !targa || !colore || lavorazioniSelezionate.length === 0) {
      alert(
        "Compila tutti i campi auto (Modello, Targa, Colore) e seleziona almeno una lavorazione."
      );
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

    setLavorazioni((prevLavorazioni) => {
      const newTasksForThisAuto: Lavorazione[] = [];
      let lastPrerequisiteId: string | undefined;

      lavorazioniOrdinate.forEach((tipoLav: string) => {
        if (lavorazioniSelezionate.includes(tipoLav)) {
          const durataMs = durataLavorazioni[tipoLav] * 3600 * 1000;
          const newTaskId = `task_${Date.now()}_${newTasksForThisAuto.length}`;

          const newTask: Lavorazione = {
            id: newTaskId,
            autoId: newAutoId,
            autoNome: modello,
            tipo: tipoLav,
            operatore: "",
            startTime: null,
            pauseTime: null,
            elapsedMs: 0,
            stato: "attesa",
            estimatedMs: durataMs,
            prerequisiteLavorazioneId: lastPrerequisiteId,
          };

          newTasksForThisAuto.push(newTask);

          lastPrerequisiteId = newTaskId;
        }
      });

      const updatedScheduledLavorazioni = recalculateFullSchedule(
        [...prevLavorazioni, ...newTasksForThisAuto],
        [...autoList, newAuto],
        esperienzaOperatoriPerTipo,
        trovaSlotLibero
      );

      return updatedScheduledLavorazioni;
    });

    setModello("");
    setTarga("");
    setColore("");
    setLavorazioniSelezionate([]);
    setPriorita("1");
  }, [
    modello,
    targa,
    colore,
    lavorazioniSelezionate,
    priorita,
    addAuto,
    autoList,
    esperienzaOperatoriPerTipo,
    lavorazioni,
    setLavorazioni,
  ]);

  const handleClickAuto = (autoId: string) => {
    setLavorazioni((prev) => prev.filter((l) => l.autoId !== autoId));
    setAutoList((prev) => prev.filter((auto) => auto.id !== autoId));
  };

  const handleBarClick = (task: Task) => {
    if (task.type === "project") {
      const auto = getAutoById(task.id);
      const confirmDelete = window.confirm(
        `Vuoi eliminare l'auto ${auto?.modello || task.name} (Targa: ${
          auto?.targa || "N/A"
        }) e tutte le sue lavorazioni?`
      );
      if (confirmDelete) {
        handleClickAuto(task.id);
      }
    }
  };

  return (
    <div style={{ padding: 30 }}>
      <h2>📅 Car Mania – Gantt Produzione</h2>
      <div
        style={{
          marginBottom: 20,
          border: "1px solid #ddd",
          padding: "15px",
          borderRadius: "8px",
          backgroundColor: "#f9f9f9",
        }}
      >
        <h3>Aggiungi Nuova Auto per Lavorazione</h3>
        <input
          type="text"
          placeholder="Modello auto (es. Fiat Punto)"
          value={modello}
          onChange={(e) => setModello(e.target.value)}
          style={{
            marginRight: 10,
            padding: "8px",
            borderRadius: "4px",
            border: "1px solid #ccc",
          }}
        />
        <input
          type="text"
          placeholder="Targa auto (es. AB123CD)"
          value={targa}
          onChange={(e) => setTarga(e.target.value)}
          style={{
            marginRight: 10,
            padding: "8px",
            borderRadius: "4px",
            border: "1px solid #ccc",
          }}
        />
        <input
          type="text"
          placeholder="Colore auto (es. Rosso)"
          value={colore}
          onChange={(e) => setColore(e.target.value)}
          style={{
            marginRight: 10,
            padding: "8px",
            borderRadius: "4px",
            border: "1px solid #ccc",
          }}
        />
        <select
          value={priorita}
          onChange={(e) => setPriorita(e.target.value)}
          style={{
            marginRight: 10,
            padding: "8px",
            borderRadius: "4px",
            border: "1px solid #ccc",
          }}
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
            <label
              key={lav}
              style={{
                marginRight: 15,
                display: "inline-block",
                marginBottom: "5px",
              }}
            >
              <input
                type="checkbox"
                checked={lavorazioniSelezionate.includes(lav)}
                onChange={() => handleCheckboxChange(lav)}
                style={{ marginRight: "5px" }}
              />
              {" " + lav}
            </label>
          ))}
        </div>
        <button
          onClick={handleAddAuto}
          style={{
            backgroundColor: "#007bff",
            color: "white",
            border: "none",
            padding: "10px 20px",
            borderRadius: "5px",
            cursor: "pointer",
            fontSize: "16px",
          }}
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
