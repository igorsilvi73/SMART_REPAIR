// src/constants.ts

export const lavorazioniOrdinate = [
  "Smontaggio e rimontaggio parti",
  "Raddrizzatura lamierati",
  "Preparazione e stuccatura",
  "Verniciatura",
  "Lucidatura e rifiniture",
];

export const durataLavorazioni: { [key: string]: number } = {
  "Smontaggio e rimontaggio parti": 4, // ore
  "Raddrizzatura lamierati": 6, // ore
  "Preparazione e stuccatura": 5, // ore
  Verniciatura: 8, // ore
  "Lucidatura e rifiniture": 3, // ore
};

export const coloriLavorazioni: { [key: string]: string } = {
  "Smontaggio e rimontaggio parti": "#4e79a7",
  "Raddrizzatura lamierati": "#59a14f",
  "Preparazione e stuccatura": "#9acc69",
  Verniciatura: "#f28e2b",
  "Lucidatura e rifiniture": "#e15759",
};

export const espertiPerLavorazione: { [key: string]: string[] } = {
  "Smontaggio e rimontaggio parti": ["Giulia", "Matteo", "Luca"],
  "Raddrizzatura lamierati": ["Matteo", "Alessandro", "Giulia"],
  "Preparazione e stuccatura": ["Francesca", "Giulia", "Luca"],
  Verniciatura: ["Alessandro", "Luca", "Francesca"],
  "Lucidatura e rifiniture": ["Luca", "Francesca", "Matteo"],
};

// Funzione per ottenere tutti gli operatori unici da espertiPerLavorazione
export function getAllOperators(): string[] {
  const operators = new Set<string>();
  for (const type in espertiPerLavorazione) {
    espertiPerLavorazione[type].forEach((op) => operators.add(op));
  }
  return Array.from(operators);
}

// Valore di esperienza base per operatori e tipi di lavorazione
export const DEFAULT_ESPERIENZA_BASE = 50;
export const MAX_ESPERIENZA = 100;
export const MIN_ESPERIENZA = 0;
