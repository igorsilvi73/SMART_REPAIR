// GanttDataStore.tsx
import React, { createContext, useContext, useEffect, useState } from "react";
// Importa le costanti dal nuovo file
// PERCORSO CORRETTO: "../constants" per salire di una cartella da components/
import {
  lavorazioniOrdinate,
  getAllOperators,
  DEFAULT_ESPERIENZA_BASE,
  MIN_ESPERIENZA,
  MAX_ESPERIENZA,
} from "../constants"; 

export interface Lavorazione {
  id: string;
  autoId: string;
  autoNome: string;
  tipo: string;
  operatore: string;
  stato: "attesa" | "in_corso" | "pausa" | "completata";
  startTime: Date | null;
  pauseTime: Date | null; // Tempo in cui è stata messa in pausa
  elapsedMs: number; // Tempo totale effettivo lavorato in millisecondi
  estimatedMs: number; // Tempo stimato per la lavorazione in millisecondi
}

// Nuova interfaccia per la struttura dell'esperienza
export type EsperienzaOperatoriPerTipo = {
  [operatore: string]: {
    [tipoLavorazione: string]: number; // Il valore di esperienza (0-100)
  };
};

interface LavorazioniContextType {
  lavorazioni: Lavorazione[];
  setLavorazioni: React.Dispatch<React.SetStateAction<Lavorazione[]>>;
  aggiornaLavorazione: (id: string, azione: "start" | "pause" | "end") => void;
  // Nuovo stato e funzione per l'esperienza degli operatori
  esperienzaOperatoriPerTipo: EsperienzaOperatoriPerTipo;
  // Funzione per il supervisore per impostare manualmente l'esperienza
  setEsperienzaOperatoreTipoManuale: (
    operatore: string,
    tipo: string,
    valore: number
  ) => void;
}

const LavorazioniContext = createContext<LavorazioniContextType | undefined>(
  undefined
);

export const LavorazioniProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [lavorazioni, setLavorazioni] = useState<Lavorazione[]>(() => {
    // Carica le lavorazioni da localStorage all'avvio
    const salvate = localStorage.getItem("lavorazioni");
    if (salvate) {
      const parsed = JSON.parse(salvate);
      return parsed.map((lav: any) => ({
        ...lav,
        // Converte le stringhe di data in oggetti Date
        startTime: lav.startTime ? new Date(lav.startTime) : null,
        pauseTime: lav.pauseTime ? new Date(lav.pauseTime) : null,
      }));
    }
    return []; // Se non ci sono dati salvati, restituisce un array vuoto
  });

  const [
    esperienzaOperatoriPerTipo,
    setEsperienzaOperatoriPerTipo,
  ] = useState<EsperienzaOperatoriPerTipo>(() => {
    // Carica l'esperienza da localStorage all'avvio
    const salvataEsperienza = localStorage.getItem("esperienzaOperatoriPerTipo");
    if (salvataEsperienza) {
      return JSON.parse(salvataEsperienza);
    }
    // Se non ci sono dati di esperienza salvati, inizializza con il valore di base (50)
    const initialEsperienza: EsperienzaOperatoriPerTipo = {};
    const allOperators = getAllOperators(); // Ottieni tutti gli operatori definiti
    
    // Inizializza ogni combinazione Operatore-TipoLavorazione con DEFAULT_ESPERIENZA_BASE
    lavorazioniOrdinate.forEach((tipo) => {
      allOperators.forEach((operatore) => {
        if (!initialEsperienza[operatore]) {
          initialEsperienza[operatore] = {};
        }
        initialEsperienza[operatore][tipo] = DEFAULT_ESPERIENZA_BASE;
      });
    });
    return initialEsperienza;
  });

  // Salva entrambi gli stati (lavorazioni ed esperienza) in localStorage ogni volta che cambiano
  useEffect(() => {
    localStorage.setItem("lavorazioni", JSON.stringify(lavorazioni));
    localStorage.setItem(
      "esperienzaOperatoriPerTipo",
      JSON.stringify(esperienzaOperatoriPerTipo)
    );
  }, [lavorazioni, esperienzaOperatoriPerTipo]);

  // Funzione helper per ottenere l'esperienza attuale di un operatore per un tipo di lavorazione
  // Ritorna il valore salvato o il DEFAULT_ESPERIENZA_BASE (50) se non esiste ancora
  const getEsperienza = (operatore: string, tipo: string): number => {
    return (
      esperienzaOperatoriPerTipo[operatore]?.[tipo] ?? DEFAULT_ESPERIENZA_BASE
    );
  };

  // Funzione interna per aggiornare l'esperienza
  const updateEsperienza = (
    operatore: string,
    tipo: string,
    delta: number // delta è l'incremento/decremento da applicare
  ) => {
    setEsperienzaOperatoriPerTipo((prevEsperienza) => {
      const currentEsperienza = getEsperienza(operatore, tipo); // Usa getEsperienza per sicurezza
      let newEsperienza = currentEsperienza + delta;

      // Clampa l'esperienza tra MIN_ESPERIENZA (0) e MAX_ESPERIENZA (100)
      newEsperienza = Math.max(MIN_ESPERIENZA, Math.min(MAX_ESPERIENZA, newEsperienza));

      return {
        ...prevEsperienza,
        [operatore]: {
          ...(prevEsperienza[operatore] || {}), // Mantiene le altre esperienze dell'operatore
          [tipo]: newEsperienza,
        },
      };
    });
  };

  // Funzione esposta attraverso il Context per il supervisore per impostare manualmente l'esperienza
  const setEsperienzaOperatoreTipoManuale = (
    operatore: string,
    tipo: string,
    valore: number
  ) => {
    // Clampa anche il valore impostato manualmente
    const clampedValore = Math.max(MIN_ESPERIENZA, Math.min(MAX_ESPERIENZA, valore));
    setEsperienzaOperatoriPerTipo((prevEsperienza) => ({
      ...prevEsperienza,
      [operatore]: {
        ...(prevEsperienza[operatore] || {}),
        [tipo]: clampedValore,
      },
    }));
  };

  const aggiornaLavorazione = (
    id: string,
    azione: "start" | "pause" | "end"
  ) => {
    setLavorazioni((prev) =>
      prev.map((lav) => {
        if (lav.id !== id) return lav; // Se non è la lavorazione giusta, la restituisce invariata

        let nuovoStato: Lavorazione["stato"] = lav.stato;
        let startTime = lav.startTime;
        let pauseTime = lav.pauseTime;
        let elapsedMs = lav.elapsedMs;

        const now = new Date(); // Cattura l'ora attuale per tutti i calcoli

        if (azione === "start") {
          nuovoStato = "in_corso";
          if (lav.stato === "pausa" || lav.stato === "attesa") {
            startTime = now;
            pauseTime = null; // Resetta il tempo di pausa quando la lavorazione riprende
          }
        } else if (azione === "pause") {
          nuovoStato = "pausa";
          if (lav.stato === "in_corso" && lav.startTime) {
            elapsedMs += now.getTime() - lav.startTime.getTime();
            pauseTime = now; // Registra il momento della pausa
            startTime = null; // Resetta startTime quando in pausa
          }
        } else if (azione === "end") {
          nuovoStato = "completata";
          if (lav.stato === "in_corso" && lav.startTime) {
            elapsedMs += now.getTime() - lav.startTime.getTime();
          }
          startTime = null;
          pauseTime = null;

          // *** LOGICA DI AGGIORNAMENTO ESPERIENZA ALLA FINE LAVORAZIONE ***
          const operatore = lav.operatore;
          const tipoLavorazione = lav.tipo;
          const tempoStimato = lav.estimatedMs;
          const tempoImpiegato = elapsedMs;

          if (tempoStimato > 0) { // Evita divisione per zero
            const scostamentoPercentuale =
              ((tempoImpiegato - tempoStimato) / tempoStimato) * 100; // Percentuale di scostamento

            // Il delta esperienza è l'opposto dello scostamento:
            // Se scostamento è positivo (tempo impiegato > stimato), delta è negativo (esperienza diminuisce)
            // Se scostamento è negativo (tempo impiegato < stimato), delta è positivo (esperienza aumenta)
            const deltaEsperienza = -scostamentoPercentuale;

            updateEsperienza(operatore, tipoLavorazione, deltaEsperienza);
          }
        }

        return {
          ...lav,
          stato: nuovoStato,
          startTime,
          pauseTime,
          elapsedMs,
        };
      })
    );
  };

  return (
    <LavorazioniContext.Provider
      value={{
        lavorazioni,
        setLavorazioni,
        aggiornaLavorazione,
        esperienzaOperatoriPerTipo, // Espone il nuovo stato dell'esperienza
        setEsperienzaOperatoreTipoManuale, // Espone la funzione per il supervisore
      }}
    >
      {children}
    </LavorazioniContext.Provider>
  );
};

export const useLavorazioni = () => {
  const context = useContext(LavorazioniContext);
  if (!context) {
    // Errore se il hook viene usato al di fuori del Provider
    throw new Error(
      "useLavorazioni deve essere usato all'interno di LavorazioniProvider"
    );
  }
  return context;
};
