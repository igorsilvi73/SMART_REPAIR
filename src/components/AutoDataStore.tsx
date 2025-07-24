// src/components/AutoDataStore.tsx
import React, { createContext, useContext, useState, useEffect } from "react";

export interface Auto {
  id: string;
  modello: string;
  priorita: string;
  targa: string;
  colore: string;
  anno?: number;
  descrizioneDanno?: string;
  gravitaDanno?: "lieve" | "medio" | "grave";
  dataAccettazione: Date;
  dataConsegnaPrevista?: Date;
  statoGenerale: "in_officina" | "in_attesa_ricambi" | "pronta_al_ritiro" | "consegnata";
}

interface AutoContextType {
  autoList: Auto[];
  addAuto: (newAuto: Auto) => void;
  updateAuto: (updatedAuto: Auto) => void;
  getAutoById: (id: string) => Auto | undefined;
  setAutoList: React.Dispatch<React.SetStateAction<Auto[]>>; 
}

const AutoContext = createContext<AutoContextType | undefined>(undefined);

export const AutoProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [autoList, setAutoList] = useState<Auto[]>(() => {
    const savedAutoList = localStorage.getItem("autoList");
    if (savedAutoList) {
      const parsed = JSON.parse(savedAutoList) as Auto[];
      return parsed.map((auto) => ({
        ...auto,
        dataAccettazione: new Date(auto.dataAccettazione),
        dataConsegnaPrevista: auto.dataConsegnaPrevista
          ? new Date(auto.dataConsegnaPrevista)
          : undefined,
      }));
    }
    return [];
  });

  useEffect(() => {
    localStorage.setItem("autoList", JSON.stringify(autoList));
  }, [autoList]);

  const addAuto = (newAuto: Auto) => {
    setAutoList((prev) => [...prev, newAuto]);
  };

  const updateAuto = (updatedAuto: Auto) => {
    setAutoList((prev) =>
      prev.map((auto) => (auto.id === updatedAuto.id ? updatedAuto : auto))
    );
  };

  const getAutoById = (id: string) => {
    return autoList.find((auto) => auto.id === id);
  };

  const contextValue = {
    autoList,
    addAuto,
    updateAuto,
    getAutoById,
    setAutoList,
  };

  return (
    <AutoContext.Provider value={contextValue}>
      {children}
    </AutoContext.Provider>
  );
};

export const useAuto = () => {
  const context = useContext(AutoContext);
  if (context === undefined) {
    throw new Error("useAuto must be used within an AutoProvider");
  }
  return context;
};