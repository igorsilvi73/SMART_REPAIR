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
  getAllOperators, // <-- CORRETTO: Importa la funzione
  DEFAULT_ESPERIENZA_BASE,
} from "../constants"; 

// Definizione del tipo per lo stato di esperienza (Operatore -> Tipo Lavorazione -> Esperienza)
type EsperienzaOperatoriPerTipo = {
  [operatore: string]: {
    [tipoLavorazione: string]: number;
  };
};

// Interfaccia per i dati della singola lavorazione
export interface Lavorazione {
  id: string;
  autoId: string; // ID unico per l'auto, per raggruppare le lavorazioni
  autoNome: string; // Es. "Fiat Punto"
  tipo: string; // Es. "Verniciatura"
  operatore: string; // Operatore assegnato
  startTime: Date | null; // Quando la lavorazione è stata avviata o ripresa
  pauseTime: Date | null; // Quando la lavorazione è stata messa in pausa
  elapsedMs: number; // Tempo totale lavorato in millisecondi
  stato: "attesa" | "in_corso" | "pausa" | "completata";
  estimatedMs: number; // Tempo stimato in millisecondi per la lavorazione
  completionTime?: Date; // Tempo esatto di completamento della lavorazione
}

// Interfaccia per il contesto delle lavorazioni
interface LavorazioniContextType {
  lavorazioni: Lavorazione[];
  setLavorazioni: React.Dispatch<React.SetStateAction<Lavorazione[]>>;
  aggiornaLavorazione: (
    id: string,
    azione: "start" | "pause" | "end"
  ) => void;
  // Aggiungiamo anche lo stato dell'esperienza e la funzione per aggiornarlo dal contesto
  esperienzaOperatoriPerTipo: EsperienzaOperatoriPerTipo;
  setEsperienzaOperatoriPerTipo: React.Dispatch<
    React.SetStateAction<EsperienzaOperatoriPerTipo>
  >;
}

// Creazione del contesto
const LavorazioniContext = createContext<LavorazioniContextType | undefined>(
  undefined
);

// Provider per le lavorazioni e l'esperienza
export const LavorazioniProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [lavorazioni, setLavorazioni] = useState<Lavorazione[]>(() => {
    // Carica da localStorage all'avvio
    const savedLavorazioni = localStorage.getItem("lavorazioni");
    if (savedLavorazioni) {
      // Ricostruisci gli oggetti Date
      const parsed = JSON.parse(savedLavorazioni) as Lavorazione[];
      return parsed.map((lav) => ({
        ...lav,
        startTime: lav.startTime ? new Date(lav.startTime) : null,
        pauseTime: lav.pauseTime ? new Date(lav.pauseTime) : null,
        completionTime: lav.completionTime ? new Date(lav.completionTime) : undefined,
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
    // Inizializza l'esperienza di base per tutti gli operatori e tipi di lavorazione
    const initialEsperienza: EsperienzaOperatoriPerTipo = {};
    getAllOperators().forEach((op) => { // <-- CORRETTO: Chiama la funzione
      initialEsperienza[op] = {};
      lavorazioniOrdinate.forEach((tipo) => {
        initialEsperienza[op][tipo] = DEFAULT_ESPERIENZA_BASE;
      });
    });
    return initialEsperienza;
  });

  // Salva in localStorage ogni volta che le lavorazioni o l'esperienza cambiano
  useEffect(() => {
    localStorage.setItem("lavorazioni", JSON.stringify(lavorazioni));
  }, [lavorazioni]);

  useEffect(() => {
    localStorage.setItem(
      "esperienzaOperatoriPerTipo",
      JSON.stringify(esperienzaOperatoriPerTipo)
    );
  }, [esperienzaOperatoriPerTipo]);

  const aggiornaLavorazione = useCallback(
    (id: string, azione: "start" | "pause" | "end") => {
      setLavorazioni((prevLavorazioni) =>
        prevLavorazioni.map((lav) => {
          if (lav.id === id) {
            let newElapsedMs = lav.elapsedMs;
            const now = new Date();

            switch (azione) {
              case "start":
                if (lav.stato === "pausa" && lav.pauseTime) {
                  return { ...lav, stato: "in_corso", startTime: now, pauseTime: null };
                }
                return { ...lav, stato: "in_corso", startTime: now, pauseTime: null };

              case "pause":
                if (lav.stato === "in_corso" && lav.startTime) {
                  newElapsedMs += now.getTime() - lav.startTime.getTime();
                }
                return {
                  ...lav,
                  stato: "pausa",
                  pauseTime: now,
                  startTime: null,
                  elapsedMs: newElapsedMs,
                };

              case "end":
                if (lav.stato === "in_corso" && lav.startTime) {
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

                  if (actualExperienceChange > maxChange) actualExperienceChange = maxChange;
                  if (actualExperienceChange < -maxChange) actualExperienceChange = -maxChange;

                  const newEsperienza = Math.max(
                    0,
                    Math.min(
                      200,
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

                return {
                  ...lav,
                  stato: "completata",
                  startTime: null,
                  pauseTime: null,
                  elapsedMs: newElapsedMs,
                  completionTime: now,
                };

              default:
                return lav;
            }
          }
          return lav;
        })
      );
    },
    []
  );

  const contextValue = {
    lavorazioni,
    setLavorazioni,
    aggiornaLavorazione,
    esperienzaOperatoriPerTipo,
    setEsperienzaOperatoriPerTipo,
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