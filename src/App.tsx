// App.tsx
import React from "react";
import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";

import GanttCarManiaApp from "./components/GanttCarManiaApp";
import OperatoreApp from "./components/OperatoreApp";
import { LavorazioniProvider } from "./components/GanttDataStore";

function App() {
  // Puoi rendere questo dinamico in futuro, magari con un sistema di login
  // Per ora, lo manteniamo fisso per i test.
  const operatoreCorrente = "Alessandro";

  return (
    <LavorazioniProvider>
      <Router>
        <nav
          style={{
            padding: 10,
            marginBottom: 20,
            backgroundColor: "#f0f0f0",
            borderBottom: "1px solid #ddd",
          }}
        >
          <Link
            to="/"
            style={{
              marginRight: 15,
              textDecoration: "none",
              color: "#333",
              fontWeight: "bold",
            }}
          >
            Supervisore
          </Link>
          <Link
            to="/operatore"
            style={{
              textDecoration: "none",
              color: "#333",
              fontWeight: "bold",
            }}
          >
            Operatore ({operatoreCorrente})
          </Link>
        </nav>

        <Routes>
          <Route path="/" element={<GanttCarManiaApp />} />
          <Route
            path="/operatore"
            element={<OperatoreApp operatore={operatoreCorrente} />} // Passa la prop 'operatore'
          />
        </Routes>
      </Router>
    </LavorazioniProvider>
  );
}

export default App;
