// src/components/GanttDataStore.tsx
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
// constants.ts è in src/, quindi il percorso è ../constants
import {
  lavorazioniOrdinate,
  getAllOperators,
  DEFAULT_ESPERIENZA_BASE,
} from "../constants";

// Definizione del tipo per lo stato di esperienza (Operatore -> Tipo Lavorazione -> Esperienza)
export type EsperienzaOperatoriPerTipo = {
  [operatore: string]: {
    [tipoLavorazione: string]: number;
  };
};

// Interfaccia per i dati della singola lavorazione
export interface Lavorazione {
  id: string;
  autoId: string;
  autoNome: string;
  tipo: string;
  operatore: string;
  startTime: Date | null;
  pauseTime: Date | null;
  elapsedMs: number;
  stato: "attesa" | "in_corso" | "pausa" | "completata";
  estimatedMs: number;
  completionTime?: Date;
  prerequisiteLavorazioneId?: string;
}

interface LavorazioniContextType {
  lavorazioni: Lavorazione[];
  setLavorazioni: React.Dispatch<React.SetStateAction<Lavorazione[]>>;
  aggiornaLavorazione: (
    id: string,
    azione: "start" | "pause" | "end"
  ) => void;
  esperienzaOperatoriPerTipo: EsperienzaOperatoriPerTipo;
  setEsperienzaOperatoriPerTipo: React.Dispatch<
    React.SetStateAction<EsperienzaOperatoriPerTipo>
  >;
  getLavorazioneById: (id: string) => Lavorazione | undefined;
  // triggerReschedule non è più nel contesto se viene passato come prop al Provider
  // triggerReschedule?: () => void;
}

const LavorazioniContext = createContext<LavorazioniContextType | undefined>(
  undefined
);

interface LavorazioniProviderProps {
  children: React.ReactNode;
  triggerRescheduleFromApp: () => void;
}

export const LavorazioniProvider: React.FC<LavorazioniProviderProps> = ({
  children,
  triggerRescheduleFromApp,
}) => {
  const [lavorazioni, setLavorazioni] = useState<Lavorazione[]>(() => {
    const savedLavorazioni = localStorage.getItem("lavorazioni");
    if (savedLavorazioni) {
      const parsed = JSON.parse(savedLavorazioni) as Lavorazione[];
      return parsed.map((lav) => ({
        ...lav,
        startTime: lav.startTime ? new Date(lav.startTime) : null,
        pauseTime: lav.pauseTime ? new Date(lav.pauseTime) : null,
        completionTime: lav.completionTime
          ? new Date(lav.completionTime)
          : undefined,
      }));
    }
    return [];
  });

  const [esperienzaOperatoriPerTipo, setEsperienzaOperatoriPerTipo] = useState<
    EsperienzaOperatoriPerTipo
  >(() => {
    const savedEsperienza = localStorage.getItem("esperienzaOperatoriPerTipo");
    if (savedEsperienza) {
      return JSON.parse(savedEsperienza);
    }
    const initialEsperienza: EsperienzaOperatoriPerTipo = {};
    getAllOperators().forEach((op) => {
      initialEsperienza[op] = {};
      lavorazioniOrdinate.forEach((tipo) => {
        initialEsperienza[op][tipo] = DEFAULT_ESPERIENZA_BASE;
      });
    });
    return initialEsperienza;
  });

  // Persistenza lavorazioni in localStorage
  useEffect(() => {
    localStorage.setItem("lavorazioni", JSON.stringify(lavorazioni));
  }, [lavorazioni]);

  // Persistenza esperienzaOperatoriPerTipo in localStorage
  useEffect(() => {
    localStorage.setItem(
      "esperienzaOperatoriPerTipo",
      JSON.stringify(esperienzaOperatoriPerTipo)
    );
  }, [esperienzaOperatoriPerTipo]);

  // NUOVO useEffect per l'aggiornamento in tempo reale del progresso (elapsedMs)
  useEffect(() => {
    const interval = setInterval(() => {
      setLavorazioni((prevLavorazioni) => {
        let changed = false;
        const now = new Date();
        const updatedLavorazioni = prevLavorazioni.map((lav) => {
          if (lav.stato === "in_corso" && lav.startTime) {
            // Calcola il tempo trascorso dall'inizio effettivo (ignorando le pause)
            let currentElapsed = now.getTime() - lav.startTime.getTime();
            if (lav.pauseTime) { // Se è andato in pausa e ripartito, devi sottrarre il tempo di pausa
                // Questo è un calcolo più robusto per elapsedMs
                // Considera l'ultimo startTime come punto di ripartenza.
                // Se startTime è cambiato (es. da pausa a in_corso), calcola da lì.
                // Altrimenti, continua ad aggiungere al valore esistente.
                currentElapsed = (now.getTime() - lav.startTime.getTime());
                // Se la lavorazione è stata messa in pausa, `elapsedMs` dovrebbe già contenere il tempo fino alla pausa.
                // Qui stiamo aggiornando il tempo dal `startTime` attuale fino `now`.
                // Dobbiamo assicurarci che `elapsedMs` contenga il tempo totale attivo.
                // La logica di `aggiornaLavorazione` dovrebbe già sommare il tempo.
                // Questo `useEffect` si occupa solo di incrementare mentre è in_corso.
                // Assicurati che `elapsedMs` sia il tempo *effettivamente lavorato*.
                // Se startTime è l'inizio dell'ultima sessione di lavoro (dopo una pausa),
                // allora basta aggiungere la differenza.
                // Se lav.startTime è sempre l'inizio assoluto, allora elapsedMs deve essere il totale.
                // Sembra che `elapsedMs` sia il tempo totale lavorato, e `startTime` è l'inizio dell'ultima sessione.
                // Quindi, il calcolo è `lav.elapsedMs` (tempo accumulato) + (tempo da ultimo startTime a now).
                currentElapsed = lav.elapsedMs + (now.getTime() - lav.startTime.getTime());

                // Se l'operatore ha messo in pausa e poi ripreso, `startTime` si aggiorna.
                // `elapsedMs` accumula. Quindi qui dobbiamo solo aggiungere il tempo trascorso
                // dall'ultimo `startTime` se lo stato è `in_corso`.
                // Questo è il modo più semplice per farlo incrementare se startTime è l'ultimo inizio.
                // Per un timer preciso, potresti voler salvare l'ultimo "start time" effettivo
                // e calcolare da lì. Ma il tuo `aggiornaLavorazione` gestisce già `elapsedMs`
                // accumulando i tempi attivi. Quindi, per `in_corso` basta aggiungere.
            }
            
            // Per evitare errori di TypeScript o calcoli strani se now è prima di startTime (raro)
            const timeToAdd = Math.max(0, now.getTime() - lav.startTime.getTime()); 
            // Aggiorniamo elapsedMs solo se il task è in_corso
            if (lav.stato === "in_corso") {
                // Per un aggiornamento continuo e corretto,
                // il `elapsedMs` dovrebbe essere il tempo totale accumulato.
                // Se `lav.startTime` è l'inizio dell'attuale sessione 'in_corso',
                // allora `elapsedMs` deve includere il tempo precedente + il tempo dell'attuale sessione.
                // Per semplicità e precisione, ricalcolo il totale effettivo lavorato
                // basandomi sull'idea che `startTime` è sempre l'inizio dell'ultima sessione attiva.
                
                // La logica di `aggiornaLavorazione` già gestisce l'accumulo in `elapsedMs`.
                // Qui, se `startTime` è l'inizio dell'attuale sessione `in_corso`,
                // allora `elapsedMs` deve essere `lav.elapsedMs_pre_sessione + (now - lav.startTime)`.
                // Sembra che lav.elapsedMs sia il totale già accumulato e startTime l'inizio dell'ultima sessione.
                // Quindi, il tempo trascorso da inizio sessione deve essere aggiunto al lav.elapsedMs già accumulato.
                const newElapsedForCurrentSession = now.getTime() - lav.startTime.getTime();
                
                // Per evitare un incremento eccessivo ad ogni intervallo, calcoliamo il `totalElapsedMs`
                // dal momento dell'inizio del task fino ad ora, escludendo le pause.
                // Dato che `elapsedMs` si accumula nelle azioni "pause" e "end",
                // qui dobbiamo solo sommare il tempo dell'attuale sessione `in_corso`.
                // Per un aggiornamento "liscio" del progress, il `elapsedMs` nel provider dovrebbe
                // essere il tempo totale accumulato.
                // L'opzione più semplice è: il `progress` si basa su `elapsedMs` e `estimatedMs`.
                // Questo `useEffect` dovrebbe incrementare `elapsedMs` gradualmente.

                // Preveniamo calcoli negativi o incrementi inutili
                const timeFromLastUpdate = now.getTime() - (lav.startTime ? lav.startTime.getTime() : now.getTime());
                const currentTotalElapsedMs = lav.elapsedMs; // elapsedMs già contiene il tempo fino all'ultima pausa/fine.
                const newTotalElapsedMs = currentTotalElapsedMs + timeFromLastUpdate;


                // Per avere un aggiornamento costante e non "saltare" tempo,
                // dobbiamo calcolare il tempo trascorso dall'inizio *dell'attuale sessione*
                // e sommarlo al tempo già accumulato (lav.elapsedMs al momento dell'ultimo aggiornamento di stato).
                // Per semplificare: se startTime è l'inizio dell'ultima sessione,
                // allora l'elapsed totale sarà (tempo accumulato prima) + (ora - inizio sessione corrente).
                // Dato che lav.elapsedMs è il totale accumulato fino all'ultimo stop/pausa,
                // e lav.startTime è l'inizio dell'ultima sessione in corso:
                const latestSessionTime = lav.startTime ? (now.getTime() - lav.startTime.getTime()) : 0;
                const accumulatedElapsedWhenStarting = prevLavorazioni.find(l => l.id === lav.id)?.elapsedMs || 0;
                const newTotalElapsedMsCalculated = accumulatedElapsedWhenStarting + latestSessionTime;

                // Aggiorniamo solo se il tempo è effettivamente aumentato
                // e non ha superato la stima (potremmo voler mostrare un over-budget)
                if (newTotalElapsedMsCalculated > lav.elapsedMs) {
                    changed = true;
                    return {
                        ...lav,
                        elapsedMs: newTotalElapsedMsCalculated
                    };
                }
            }
          }
          return lav;
        });
        return changed ? updatedLavorazioni : prevLavorazioni;
      });
    }, 1000); // Aggiorna ogni secondo

    return () => clearInterval(interval); // Cleanup
  }, []); // Esegui solo una volta all'inizializzazione del componente

  const aggiornaLavorazione = useCallback(
    (id: string, azione: "start" | "pause" | "end") => {
      setLavorazioni((prevLavorazioni) => {
        const updatedLavorazioni = prevLavorazioni.map((lav) => {
          if (lav.id === id) {
            let newElapsedMs = lav.elapsedMs;
            const now = new Date();

            switch (azione) {
              case "start":
                // Se era in pausa, il tempo trascorso viene aggiunto a elapsedMs nella pausa.
                // Il nuovo startTime è `now`.
                return { ...lav, stato: "in_corso", startTime: now, pauseTime: null } as Lavorazione;

              case "pause":
                if (lav.stato === "in_corso" && lav.startTime) {
                  // Aggiunge il tempo trascorso dall'ultimo startTime al total elapsedMs
                  newElapsedMs += now.getTime() - lav.startTime.getTime();
                }
                return {
                  ...lav,
                  stato: "pausa",
                  pauseTime: now,
                  elapsedMs: newElapsedMs,
                } as Lavorazione;

              case "end":
                if (lav.stato === "in_corso" && lav.startTime) {
                  // Aggiunge il tempo trascorso dall'ultimo startTime al total elapsedMs
                  newElapsedMs += now.getTime() - lav.startTime.getTime();
                }

                const operatore = lav.operatore;
                const tipoLavorazione = lav.tipo;
                const estimatedMs = lav.estimatedMs;
                const actualElapsedMs = newElapsedMs;

                let percentageChange = 0;
                if (estimatedMs > 0) {
                  const timeDifference = estimatedMs - actualElapsedMs;
                  percentageChange = (timeDifference / estimatedMs) * 100;
                }

                setEsperienzaOperatoriPerTipo((prevEsperienza) => {
                  const currentEsperienza =
                    prevEsperienza[operatore]?.[tipoLavorazione] ??
                    DEFAULT_ESPERIENZA_BASE;

                  const maxChange = 20;
                  let actualExperienceChange = percentageChange * 0.1;

                  if (actualExperienceChange > maxChange)
                    actualExperienceChange = maxChange;
                  if (actualExperienceChange < -maxChange)
                    actualExperienceChange = -maxChange;

                  const newEsperienza = Math.max(
                    0,
                    Math.min(
                      100, // Usiamo 100 come MAX_ESPERIENZA da constants.ts
                      currentEsperienza + actualExperienceChange
                    )
                  );

                  return {
                    ...prevEsperienza,
                    [operatore]: {
                      ...(prevEsperienza[operatore] || {}),
                      [tipoLavorazione]: newEsperienza,
                    },
                  };
                });

                const finalTaskState = {
                  ...lav,
                  stato: "completata",
                  pauseTime: null,
                  elapsedMs: newElapsedMs,
                  completionTime: now,
                } as Lavorazione;

                // Trigger della ripianificazione dopo un breve timeout
                if (azione === "end" && triggerRescheduleFromApp) {
                  setTimeout(() => triggerRescheduleFromApp(), 0);
                }

                return finalTaskState;

              default:
                return lav;
            }
          }
          return lav;
        });

        return updatedLavorazioni;
      });
    },
    [setEsperienzaOperatoriPerTipo, triggerRescheduleFromApp] // Aggiungi setEsperienzaOperatoriPerTipo come dipendenza
  );

  const getLavorazioneById = useCallback(
    (id: string) => {
      return lavorazioni.find((lav) => lav.id === id);
    },
    [lavorazioni]
  );

  const contextValue = {
    lavorazioni,
    setLavorazioni,
    aggiornaLavorazione,
    esperienzaOperatoriPerTipo,
    setEsperienzaOperatoriPerTipo,
    getLavorazioneById,
  };

  return (
    <LavorazioniContext.Provider value={contextValue}>
      {children}
    </LavorazioniContext.Provider>
  );
};

export const useLavorazioni = () => {
  const context = useContext(LavorazioniContext);
  if (context === undefined) {
    throw new Error("useLavorazioni must be used within a LavorazioniProvider");
  }
  return context;
};