import React from 'react'
import ReactDOM from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import App from './App.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {/* HashRouter : toutes les routes vivent dans le # de l'URL.
        Aucune règle de réécriture Apache n'est nécessaire. */}
    <HashRouter>
      <App />
    </HashRouter>
  </React.StrictMode>
)
