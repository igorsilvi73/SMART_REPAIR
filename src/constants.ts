// src/constants.ts

export const lavorazioniOrdinate = [
  "Smontaggio e rimontaggio parti",
  "Raddrizzatura lamierati",
  "Preparazione e stuccatura",
  "Verniciatura",
  "Lucidatura e rifiniture",
  "Diagnostica",
  "Collaudo e finitura"
];

export const durataLavorazioni: { [key: string]: number } = {
  "Smontaggio e rimontaggio parti": 4,
  "Raddrizzatura lamierati": 8,
  "Preparazione e stuccatura": 6,
  "Verniciatura": 5,
  "Lucidatura e rifiniture": 3,
  "Diagnostica": 2,
  "Collaudo e finitura": 2,
};

export const coloriLavorazioni: { [key: string]: string } = {
  "Smontaggio e rimontaggio parti": "#4CAF50",
  "Raddrizzatura lamierati": "#2196F3",
  "Preparazione e stuccatura": "#FFC107",
  "Verniciatura": "#FF5722",
  "Lucidatura e rifiniture": "#9C27B0",
  "Diagnostica": "#00BCD4",
  "Collaudo e finitura": "#8BC34A",
};

export const ALL_OPERATORS = [
  "Luca",
  "Matteo",
  "Alessandro",
  "Francesca",
  "Giulia"
];

export const espertiPerLavorazione: { [key: string]: string[] } = {};
lavorazioniOrdinate.forEach(lavType => {
  espertiPerLavorazione[lavType] = ALL_OPERATORS;
});


export const getAllOperators = (): string[] => {
  return ALL_OPERATORS.sort();
};

export const DEFAULT_ESPERIENZA_BASE = 50; 
export const MIN_ESPERIENZA = 0;
export const MAX_ESPERIENZA = 100; // <-- MODIFICATO: Massima esperienza a 100
