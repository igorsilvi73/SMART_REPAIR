// src/components/EsperienzaOperatoriTable.tsx
import React from "react";
import { useLavorazioni } from "./GanttDataStore"; // Percorso corretto
import {
  getAllOperators,
  lavorazioniOrdinate,
  DEFAULT_ESPERIENZA_BASE,
  MIN_ESPERIENZA,
  MAX_ESPERIENZA,
} from "../constants"; // Percorso corretto

const EsperienzaOperatoriTable: React.FC = () => {
  const { esperienzaOperatoriPerTipo, setEsperienzaOperatoreTipoManuale } =
    useLavorazioni();

  const allOperators = getAllOperators(); // Tutti gli operatori noti
  const allLavorazioniTypes = lavorazioniOrdinate; // Tutti i tipi di lavorazione noti

  const handleEsperienzaChange = (
    operatore: string,
    tipo: string,
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = parseFloat(e.target.value);
    // Controllo per NaN nel caso l'input sia vuoto o non numerico
    if (!isNaN(value)) {
      setEsperienzaOperatoreTipoManuale(operatore, tipo, value);
    }
  };

  return (
    <div style={{ marginTop: 40, border: '1px solid #ddd', padding: '15px', borderRadius: '8px', backgroundColor: '#f9f9f9' }}>
      <h3>📊 Gestione Esperienza Operatori</h3>
      <p style={{ fontSize: '0.9em', color: '#666' }}>
        L'esperienza varia da {MIN_ESPERIENZA} (inesperto) a {MAX_ESPERIENZA} (esperto). Base predefinita: {DEFAULT_ESPERIENZA_BASE}.
      </p>
      <div style={{ overflowX: 'auto' }}> {/* Rende la tabella scrollabile orizzontalmente se troppo larga */}
        <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 15 }}>
          <thead>
            <tr style={{ backgroundColor: '#e0e0e0' }}>
              <th style={{ border: '1px solid #ccc', padding: '8px', textAlign: 'left' }}>Operatore</th>
              {allLavorazioniTypes.map((tipo) => (
                <th key={tipo} style={{ border: '1px solid #ccc', padding: '8px', textAlign: 'center' }}>
                  {tipo}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {allOperators.length === 0 ? (
              <tr>
                <td colSpan={allLavorazioniTypes.length + 1} style={{ border: '1px solid #ccc', padding: '8px', textAlign: 'center', color: '#888' }}>
                  Nessun operatore definito.
                </td>
              </tr>
            ) : (
              allOperators.map((operatore) => (
                <tr key={operatore}>
                  <td style={{ border: '1px solid #ccc', padding: '8px', fontWeight: 'bold' }}>{operatore}</td>
                  {allLavorazioniTypes.map((tipo) => {
                    const esperienza = esperienzaOperatoriPerTipo[operatore]?.[tipo] ?? DEFAULT_ESPERIENZA_BASE;
                    return (
                      <td key={tipo} style={{ border: '1px solid #ccc', padding: '4px', textAlign: 'center' }}>
                        <input
                          type="number"
                          value={esperienza.toFixed(1)} // Mostra 1 decimale per coerenza
                          onChange={(e) => handleEsperienzaChange(operatore, tipo, e)}
                          onBlur={(e) => { // Per arrotondare quando si perde il focus se l'utente digita numeri con troppi decimali
                            const val = parseFloat(e.target.value);
                            if (!isNaN(val)) {
                                e.target.value = val.toFixed(1);
                            }
                          }}
                          min={MIN_ESPERIENZA}
                          max={MAX_ESPERIENZA}
                          step="0.1" // Permetti input decimali
                          style={{
                            width: '60px',
                            padding: '5px',
                            borderRadius: '4px',
                            border: '1px solid #ccc',
                            textAlign: 'center',
                            backgroundColor: esperienza < DEFAULT_ESPERIENZA_BASE ? '#ffe6e6' : (esperienza > DEFAULT_ESPERIENZA_BASE ? '#e6ffe6' : '#ffffff') // Colore in base all'esperienza
                          }}
                        />
                      </td>
                    );
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default EsperienzaOperatoriTable;