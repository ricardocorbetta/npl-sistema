import React from "react";
import App from "./App.jsx";
import Proyectos from "./Proyectos.jsx";
import Planificacion from "./Planificacion.jsx";
import Calculistas from "./Calculistas.jsx";
import CRM from "./CRM.jsx";
import Dashboard from "./Dashboard.jsx";
import Obras from "./Obras.jsx";
import Biblioteca from "./Biblioteca.jsx";
import Configuracion from "./Configuracion.jsx";

export function getModulo(current, { deepLinkId, perfil, navTo, logout, session, palette }) {
  switch(current) {
    case 'presupuestos':  return <App deepLinkId={deepLinkId} onNav={navTo} />;
    case 'proyectos':     return <Proyectos deepLinkId={deepLinkId} perfil={perfil} onNav={navTo} />;
    case 'legajos':       return <Proyectos deepLinkId={deepLinkId} perfil={perfil} onNav={navTo} />;
    case 'planificacion': return <Planificacion perfil={perfil} onNav={navTo} />;
    case 'calculistas':   return <Calculistas />;
    case 'profesionales': return <Calculistas />;
    case 'crm':           return <CRM />;
    case 'dashboard':     return <Dashboard onNav={navTo} />;
    case 'obras':         return <Obras perfil={perfil} onLogout={logout} deepLinkId={deepLinkId} />;
    case 'biblioteca':    return <Biblioteca />;
    case 'configuracion': return <Configuracion />;
    default:              return null;
  }
}
