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
  triggerReschedule?: () => void; // Aggiunto questa funzione opzionale al contesto
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
  triggerRescheduleFromApp 
}) => {
  const [lavorazioni, setLavorazioni] = useState<Lavorazione[]>(() => {
    const savedLavorazioni = localStorage.getItem("lavorazioni");
    if (savedLavorazioni) {
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
    const initialEsperienza: EsperienzaOperatoriPerTipo = {};
    getAllOperators().forEach((op) => {
      initialEsperienza[op] = {};
      lavorazioniOrdinate.forEach((tipo) => {
        initialEsperienza[op][tipo] = DEFAULT_ESPERIENZA_BASE;
      });
    });
    return initialEsperienza;
  });

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
      setLavorazioni((prevLavorazioni) => {
        const updatedLavorazioni = prevLavorazioni.map((lav) => {
          if (lav.id === id) {
            let newElapsedMs = lav.elapsedMs;
            const now = new Date();

            switch (azione) {
              case "start":
                if (lav.stato === "pausa") { 
                  return { ...lav, stato: "in_corso", startTime: now, pauseTime: null } as Lavorazione; // CAST
                }
                return { ...lav, stato: "in_corso", startTime: now, pauseTime: null } as Lavorazione; // CAST

              case "pause":
                if (lav.stato === "in_corso" && lav.startTime) {
                  newElapsedMs += now.getTime() - lav.startTime.getTime();
                }
                return {
                  ...lav,
                  stato: "pausa",
                  pauseTime: now,
                  elapsedMs: newElapsedMs,
                } as Lavorazione; // CAST

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

                const finalTaskState = {
                  ...lav,
                  stato: "completata",
                  pauseTime: null,
                  elapsedMs: newElapsedMs,
                  completionTime: now,
                } as Lavorazione; // CAST

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
    [triggerRescheduleFromApp] 
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