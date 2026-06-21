import React, { useEffect, useState } from "react";
import { supabase } from "./supabase.js";

const SUPA_URL = "https://imkmosifqxzbtqgzssst.supabase.co/rest/v1";
const ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlta21vc2lmcXh6YnRxZ3pzc3N0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkxODk4NTUsImV4cCI6MjA5NDc2NTg1NX0.5gtCs8Yv3vDSrKxAmXSr3zjWJ5HjimCKejfO-XrHPss";

async function getToken() {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token || ANON_KEY;
}
function hdrs(tk) {
  return { apikey: ANON_KEY, Authorization: `Bearer ${tk}`, "Content-Type": "application/json", Prefer: "return=representation" };
}

const SISTEMAS = ["Steel Frame", "Wood Frame", "Ambos"];
const ALCANCES = [
  { v: "solo_estructura",        label: "Solo estructura",          emoji: "🏗️" },
  { v: "fundaciones_estructura", label: "Fundaciones + estructura",  emoji: "🧱" },
  { v: "obra_completa",          label: "Obra completa",             emoji: "🏠" },
];
const COLORES = ["#6366f1","#f59e0b","#3b82f6","#8b5cf6","#10b981","#ec4899","#14b8a6","#ef4444","#92400e","#84cc16"];

const SISTEMA_COLOR = { "Steel Frame": "#f59e0b", "Wood Frame": "#92400e", "Ambos": "#6366f1" };
const SISTEMA_EMOJI = { "Steel Frame": "⚙️", "Wood Frame": "🪵", "Ambos": "🔄" };

const shared = {
  btn:  { padding: "9px 18px", background: "#111", color: "#fff", border: "none", borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: "pointer" },
  btnSm:{ padding: "6px 12px", background: "#f0f0f0", color: "#333", border: "none", borderRadius: 8, fontSize: 12, cursor: "pointer" },
  inp:  { width: "100%", padding: "10px 12px", border: "1px solid #e0e0e0", borderRadius: 10, fontSize: 14, boxSizing: "border-box", marginBottom: 10 },
  lbl:  { fontSize: 11, color: "#888", fontWeight: 600, textTransform: "uppercase", letterSpacing: .5, marginBottom: 4, display: "block" },
  card: { background: "#fff", borderRadius: 12, padding: 16, boxShadow: "0 1px 5px rgba(0,0,0,.07)" },
};

export default function Biblioteca() {
  const [rubros,        setRubros]        = useState([]);
  const [tareas,        setTareas]        = useState({});
  const [subtareas,     setSubtareas]     = useState({});
  const [expanded,      setExpanded]      = useState({});
  const [loading,       setLoading]       = useState(true);
  const [filtroSistema, setFiltroSistema] = useState("todos");
  const [filtroAlcance, setFiltroAlcance] = useState("todos");
  const [showRubro,     setShowRubro]     = useState(false);
  const [showTarea,     setShowTarea]     = useState(null);
  const [showSubtarea,  setShowSubtarea]  = useState(null);
  const [msg,           setMsg]           = useState("");
  const [isMobile,      setIsMobile]      = useState(window.innerWidth < 768);

  const [nuevoRubro, setNuevoRubro] = useState({
    nombre: "", descripcion: "", color: "#6366f1",
    sistema_constructivo: "Steel Frame",
    aplica_alcance: ["solo_estructura","fundaciones_estructura","obra_completa"],
  });
  const [nuevaTarea, setNuevaTarea] = useState({
    nombre: "", nombre_tecnico: "", descripcion: "",
    criterio_aceptacion: "", duracion_tipica_dias: "", gremio: "",
  });
  const [nuevaSubt, setNuevaSubt] = useState({ nombre: "", descripcion: "" });

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", check);
    cargar();
    return () => window.removeEventListener("resize", check);
  }, []);

  async function cargar() {
    setLoading(true);
    const tk = await getToken();
    const data = await fetch(`${SUPA_URL}/biblioteca_rubros?order=orden.asc&activo=eq.true`, { headers: hdrs(tk) }).then(r => r.json());
    setRubros(Array.isArray(data) ? data : []);
    setLoading(false);
  }

  async function cargarTareas(rubroId) {
    if (tareas[rubroId]) return;
    const tk = await getToken();
    const data = await fetch(`${SUPA_URL}/biblioteca_tareas?rubro_id=eq.${rubroId}&order=orden.asc&activo=eq.true`, { headers: hdrs(tk) }).then(r => r.json());
    setTareas(prev => ({ ...prev, [rubroId]: Array.isArray(data) ? data : [] }));
  }

  async function cargarSubtareas(tareaId) {
    if (subtareas[tareaId]) return;
    const tk = await getToken();
    const data = await fetch(`${SUPA_URL}/biblioteca_subtareas?tarea_id=eq.${tareaId}&order=orden.asc&activo=eq.true`, { headers: hdrs(tk) }).then(r => r.json());
    setSubtareas(prev => ({ ...prev, [tareaId]: Array.isArray(data) ? data : [] }));
  }

  function toggleRubro(id) {
    setExpanded(prev => ({ ...prev, [id]: !prev[id] }));
    if (!tareas[id]) cargarTareas(id);
  }

  function toggleTarea(id) {
    setExpanded(prev => ({ ...prev, [`t_${id}`]: !prev[`t_${id}`] }));
    if (!subtareas[id]) cargarSubtareas(id);
  }

  async function crearRubro() {
    const tk = await getToken();
    const r = await fetch(`${SUPA_URL}/biblioteca_rubros`, {
      method: "POST", headers: hdrs(tk),
      body: JSON.stringify({ ...nuevoRubro, orden: rubros.length + 1 }),
    });
    const rows = await r.json();
    setRubros(prev => [...prev, rows[0]]);
    setNuevoRubro({ nombre: "", descripcion: "", color: "#6366f1", sistema_constructivo: "Steel Frame", aplica_alcance: ["solo_estructura","fundaciones_estructura","obra_completa"] });
    setShowRubro(false);
    setMsg("✓ Rubro creado"); setTimeout(() => setMsg(""), 2000);
  }

  async function crearTarea(rubroId) {
    const tk = await getToken();
    const body = {
      ...nuevaTarea, rubro_id: rubroId,
      duracion_tipica_dias: nuevaTarea.duracion_tipica_dias ? parseFloat(nuevaTarea.duracion_tipica_dias) : null,
      orden: (tareas[rubroId]?.length || 0) + 1,
    };
    const r = await fetch(`${SUPA_URL}/biblioteca_tareas`, { method: "POST", headers: hdrs(tk), body: JSON.stringify(body) });
    const rows = await r.json();
    setTareas(prev => ({ ...prev, [rubroId]: [...(prev[rubroId] || []), rows[0]] }));
    setNuevaTarea({ nombre: "", nombre_tecnico: "", descripcion: "", criterio_aceptacion: "", duracion_tipica_dias: "", gremio: "" });
    setShowTarea(null);
    setMsg("✓ Tarea creada"); setTimeout(() => setMsg(""), 2000);
  }

  async function crearSubtarea(tareaId) {
    const tk = await getToken();
    const body = { ...nuevaSubt, tarea_id: tareaId, orden: (subtareas[tareaId]?.length || 0) + 1 };
    const r = await fetch(`${SUPA_URL}/biblioteca_subtareas`, { method: "POST", headers: hdrs(tk), body: JSON.stringify(body) });
    const rows = await r.json();
    setSubtareas(prev => ({ ...prev, [tareaId]: [...(prev[tareaId] || []), rows[0]] }));
    setNuevaSubt({ nombre: "", descripcion: "" });
    setShowSubtarea(null);
    setMsg("✓ Paso creado"); setTimeout(() => setMsg(""), 2000);
  }

  function toggleAlcance(val) {
    setNuevoRubro(prev => {
      const arr = prev.aplica_alcance || [];
      return { ...prev, aplica_alcance: arr.includes(val) ? arr.filter(v => v !== val) : [...arr, val] };
    });
  }

  // Filtros
  const rubrosFiltrados = rubros.filter(r => {
    const pasaSistema = filtroSistema === "todos" || r.sistema_constructivo === filtroSistema || r.sistema_constructivo === "Ambos";
    const pasaAlcance = filtroAlcance === "todos" || (Array.isArray(r.aplica_alcance) && r.aplica_alcance.includes(filtroAlcance));
    return pasaSistema && pasaAlcance;
  });

  const totalTareas = Object.values(tareas).flat().length;

  return (
    <div style={{ fontFamily: "system-ui, -apple-system, sans-serif", padding: isMobile ? "16px" : "28px", maxWidth: 900, margin: "0 auto" }}>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <div>
          <p style={{ margin: 0, fontSize: 12, color: "#999", fontWeight: 500 }}>NPL · Admin</p>
          <h1 style={{ margin: "2px 0 0", fontSize: isMobile ? 20 : 24, fontWeight: 700 }}>📚 Biblioteca de obra</h1>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: "#888" }}>
            {rubros.length} rubros · {totalTareas} tareas cargadas
          </p>
        </div>
        <button onClick={() => setShowRubro(!showRubro)} style={shared.btn}>
          {showRubro ? "Cancelar" : "+ Nuevo rubro"}
        </button>
      </div>

      {/* Filtros */}
      <div style={{ background: "#fff", borderRadius: 12, padding: "14px 16px", marginBottom: 16, boxShadow: "0 1px 4px rgba(0,0,0,.06)" }}>
        <div style={{ marginBottom: 10 }}>
          <span style={{ ...shared.lbl, marginBottom: 8 }}>Sistema constructivo</span>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button onClick={() => setFiltroSistema("todos")} style={{ ...shared.btnSm, padding: "7px 14px", background: filtroSistema === "todos" ? "#111" : "#f0f0f0", color: filtroSistema === "todos" ? "#fff" : "#333" }}>
              Todos
            </button>
            {SISTEMAS.map(s => (
              <button key={s} onClick={() => setFiltroSistema(s)} style={{
                ...shared.btnSm, padding: "7px 14px",
                background: filtroSistema === s ? SISTEMA_COLOR[s] : "#f0f0f0",
                color: filtroSistema === s ? "#fff" : "#333",
              }}>
                {SISTEMA_EMOJI[s]} {s}
              </button>
            ))}
          </div>
        </div>
        <div>
          <span style={{ ...shared.lbl, marginBottom: 8 }}>Alcance de obra</span>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button onClick={() => setFiltroAlcance("todos")} style={{ ...shared.btnSm, padding: "7px 14px", background: filtroAlcance === "todos" ? "#111" : "#f0f0f0", color: filtroAlcance === "todos" ? "#fff" : "#333" }}>
              Todos
            </button>
            {ALCANCES.map(a => (
              <button key={a.v} onClick={() => setFiltroAlcance(a.v)} style={{
                ...shared.btnSm, padding: "7px 14px",
                background: filtroAlcance === a.v ? "#111" : "#f0f0f0",
                color: filtroAlcance === a.v ? "#fff" : "#333",
              }}>
                {a.emoji} {a.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Info filtro activo */}
      {(filtroSistema !== "todos" || filtroAlcance !== "todos") && (
        <div style={{ background: "#f0f7ff", border: "1px solid #bfdbfe", borderRadius: 10, padding: "8px 14px", marginBottom: 14, fontSize: 13, color: "#1e40af", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span>Mostrando {rubrosFiltrados.length} de {rubros.length} rubros</span>
          <button onClick={() => { setFiltroSistema("todos"); setFiltroAlcance("todos"); }} style={{ ...shared.btnSm, fontSize: 11, padding: "4px 10px" }}>Limpiar filtros</button>
        </div>
      )}

      {msg && <div style={{ background: "#d4edda", color: "#155724", padding: "10px 16px", borderRadius: 10, marginBottom: 16, fontSize: 13 }}>{msg}</div>}

      {/* Form nuevo rubro */}
      {showRubro && (
        <div style={{ ...shared.card, marginBottom: 20, background: "#f8f8f8" }}>
          <h3 style={{ margin: "0 0 16px", fontSize: 15 }}>Nuevo rubro</h3>
          <span style={shared.lbl}>Nombre *</span>
          <input value={nuevoRubro.nombre} onChange={e => setNuevoRubro(p => ({ ...p, nombre: e.target.value }))} style={shared.inp} placeholder="Ej: Estructura SF" />
          <span style={shared.lbl}>Descripción</span>
          <input value={nuevoRubro.descripcion} onChange={e => setNuevoRubro(p => ({ ...p, descripcion: e.target.value }))} style={shared.inp} placeholder="Descripción breve" />
          <span style={shared.lbl}>Sistema constructivo</span>
          <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
            {SISTEMAS.map(s => (
              <button key={s} onClick={() => setNuevoRubro(p => ({ ...p, sistema_constructivo: s }))} style={{
                ...shared.btnSm, padding: "8px 14px",
                background: nuevoRubro.sistema_constructivo === s ? SISTEMA_COLOR[s] : "#f0f0f0",
                color: nuevoRubro.sistema_constructivo === s ? "#fff" : "#333",
              }}>{SISTEMA_EMOJI[s]} {s}</button>
            ))}
          </div>
          <span style={shared.lbl}>Aplica a</span>
          <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
            {ALCANCES.map(a => (
              <button key={a.v} onClick={() => toggleAlcance(a.v)} style={{
                ...shared.btnSm, padding: "8px 14px",
                background: nuevoRubro.aplica_alcance?.includes(a.v) ? "#111" : "#f0f0f0",
                color: nuevoRubro.aplica_alcance?.includes(a.v) ? "#fff" : "#333",
              }}>{a.emoji} {a.label}</button>
            ))}
          </div>
          <span style={shared.lbl}>Color</span>
          <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
            {COLORES.map(c => (
              <button key={c} onClick={() => setNuevoRubro(p => ({ ...p, color: c }))} style={{ width: 32, height: 32, borderRadius: "50%", background: c, border: nuevoRubro.color === c ? "3px solid #111" : "3px solid transparent", cursor: "pointer" }} />
            ))}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={crearRubro} disabled={!nuevoRubro.nombre} style={{ ...shared.btn, flex: 1 }}>Crear rubro</button>
            <button onClick={() => setShowRubro(false)} style={{ ...shared.btnSm, flex: 1, padding: "9px" }}>Cancelar</button>
          </div>
        </div>
      )}

      {/* Lista rubros */}
      {loading ? <p style={{ color: "#aaa", textAlign: "center", padding: 40 }}>Cargando biblioteca…</p> : (
        rubrosFiltrados.length === 0 ? (
          <div style={{ textAlign: "center", padding: 40, color: "#aaa" }}>
            <p style={{ fontSize: 16, marginBottom: 8 }}>Sin rubros para este filtro</p>
            <button onClick={() => { setFiltroSistema("todos"); setFiltroAlcance("todos"); }} style={shared.btnSm}>Ver todos</button>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {rubrosFiltrados.map(rubro => (
              <div key={rubro.id} style={{ ...shared.card, borderLeft: `4px solid ${rubro.color || "#888"}` }}>

                {/* Header rubro */}
                <div onClick={() => toggleRubro(rubro.id)} style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", cursor: "pointer" }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                      <span style={{ width: 12, height: 12, borderRadius: "50%", background: rubro.color || "#888", display: "inline-block", flexShrink: 0 }} />
                      <span style={{ fontWeight: 700, fontSize: 15 }}>{rubro.nombre}</span>
                    </div>
                    {rubro.descripcion && <p style={{ margin: "0 0 6px 20px", fontSize: 12, color: "#888" }}>{rubro.descripcion}</p>}
                    <div style={{ display: "flex", gap: 6, marginLeft: 20, flexWrap: "wrap" }}>
                      {/* Badge sistema */}
                      <span style={{ fontSize: 11, background: SISTEMA_COLOR[rubro.sistema_constructivo] + "22", color: SISTEMA_COLOR[rubro.sistema_constructivo], borderRadius: 8, padding: "2px 8px", fontWeight: 600 }}>
                        {SISTEMA_EMOJI[rubro.sistema_constructivo]} {rubro.sistema_constructivo}
                      </span>
                      {/* Badges alcance */}
                      {(rubro.aplica_alcance || []).map(a => (
                        <span key={a} style={{ fontSize: 11, background: "#f0f0f0", borderRadius: 8, padding: "2px 8px", color: "#666" }}>
                          {ALCANCES.find(al => al.v === a)?.emoji} {ALCANCES.find(al => al.v === a)?.label}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0, marginLeft: 8 }}>
                    <span style={{ fontSize: 12, color: "#aaa" }}>{tareas[rubro.id]?.length ?? "—"} tareas</span>
                    <span style={{ fontSize: 16, color: "#aaa" }}>{expanded[rubro.id] ? "▲" : "▼"}</span>
                  </div>
                </div>

                {/* Tareas expandidas */}
                {expanded[rubro.id] && (
                  <div style={{ marginTop: 14 }}>
                    {(tareas[rubro.id] || []).map(tarea => (
                      <div key={tarea.id} style={{ background: "#f8f8f8", borderRadius: 10, padding: "12px 14px", marginBottom: 8 }}>
                        <div onClick={() => toggleTarea(tarea.id)} style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", cursor: "pointer" }}>
                          <div style={{ flex: 1 }}>
                            <span style={{ fontWeight: 600, fontSize: 14 }}>{tarea.nombre}</span>
                            {tarea.nombre_tecnico && tarea.nombre_tecnico !== tarea.nombre && (
                              <span style={{ fontSize: 11, color: "#aaa", marginLeft: 8 }}>{tarea.nombre_tecnico}</span>
                            )}
                            <div style={{ display: "flex", gap: 6, marginTop: 5, flexWrap: "wrap" }}>
                              {tarea.gremio && <span style={{ fontSize: 11, background: "#e8e8e8", borderRadius: 10, padding: "2px 8px", color: "#555" }}>👷 {tarea.gremio}</span>}
                              {tarea.duracion_tipica_dias && <span style={{ fontSize: 11, background: "#e8e8e8", borderRadius: 10, padding: "2px 8px", color: "#555" }}>⏱ {tarea.duracion_tipica_dias}d típicos</span>}
                            </div>
                          </div>
                          <span style={{ fontSize: 14, color: "#aaa", marginLeft: 8 }}>{expanded[`t_${tarea.id}`] ? "▲" : "▼"}</span>
                        </div>

                        {/* Detalle tarea */}
                        {expanded[`t_${tarea.id}`] && (
                          <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid #e8e8e8" }}>
                            {tarea.descripcion && (
                              <div style={{ marginBottom: 8 }}>
                                <span style={{ ...shared.lbl, fontSize: 10 }}>Qué hay que hacer</span>
                                <p style={{ margin: "4px 0 0", fontSize: 13, color: "#444", lineHeight: 1.6 }}>{tarea.descripcion}</p>
                              </div>
                            )}
                            {tarea.criterio_aceptacion && (
                              <div style={{ marginBottom: 10, background: "#f0fdf4", borderRadius: 8, padding: "8px 12px" }}>
                                <span style={{ ...shared.lbl, fontSize: 10, color: "#16a34a" }}>Cómo sé que está lista</span>
                                <p style={{ margin: "4px 0 0", fontSize: 13, color: "#16a34a", lineHeight: 1.5 }}>✓ {tarea.criterio_aceptacion}</p>
                              </div>
                            )}

                            {/* Pasos */}
                            {(subtareas[tarea.id] || []).length > 0 && (
                              <div style={{ marginBottom: 10 }}>
                                <span style={{ ...shared.lbl, fontSize: 10 }}>Pasos</span>
                                {subtareas[tarea.id].map((st, i) => (
                                  <div key={st.id} style={{ display: "flex", gap: 8, padding: "7px 0", borderBottom: "1px solid #eee" }}>
                                    <span style={{ fontSize: 12, color: "#aaa", minWidth: 20, fontWeight: 600 }}>{i + 1}.</span>
                                    <div>
                                      <span style={{ fontSize: 13, fontWeight: 500 }}>{st.nombre}</span>
                                      {st.descripcion && <p style={{ margin: "2px 0 0", fontSize: 12, color: "#888" }}>{st.descripcion}</p>}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* Form subtarea */}
                            {showSubtarea === tarea.id ? (
                              <div style={{ background: "#fff", borderRadius: 8, padding: 12, border: "1px solid #e0e0e0", marginTop: 8 }}>
                                <input value={nuevaSubt.nombre} onChange={e => setNuevaSubt(p => ({ ...p, nombre: e.target.value }))} style={{ ...shared.inp, marginBottom: 8 }} placeholder="Nombre del paso *" />
                                <input value={nuevaSubt.descripcion} onChange={e => setNuevaSubt(p => ({ ...p, descripcion: e.target.value }))} style={shared.inp} placeholder="Descripción (opcional)" />
                                <div style={{ display: "flex", gap: 8 }}>
                                  <button onClick={() => crearSubtarea(tarea.id)} disabled={!nuevaSubt.nombre} style={{ ...shared.btn, padding: "7px 14px", fontSize: 12 }}>Agregar paso</button>
                                  <button onClick={() => setShowSubtarea(null)} style={shared.btnSm}>Cancelar</button>
                                </div>
                              </div>
                            ) : (
                              <button onClick={() => setShowSubtarea(tarea.id)} style={{ ...shared.btnSm, marginTop: 4 }}>+ Agregar paso</button>
                            )}
                          </div>
                        )}
                      </div>
                    ))}

                    {/* Form nueva tarea */}
                    {showTarea === rubro.id ? (
                      <div style={{ background: "#fff", borderRadius: 10, padding: 16, marginTop: 8, border: "1px solid #e8e8e8" }}>
                        <h4 style={{ margin: "0 0 14px", fontSize: 14 }}>Nueva tarea en {rubro.nombre}</h4>
                        <span style={shared.lbl}>Nombre coloquial * <span style={{ fontWeight: 400, color: "#aaa" }}>(lo que ve el jefe de obra)</span></span>
                        <input value={nuevaTarea.nombre} onChange={e => setNuevaTarea(p => ({ ...p, nombre: e.target.value }))} style={shared.inp} placeholder="Ej: Armar cerchas" />
                        <span style={shared.lbl}>Nombre técnico</span>
                        <input value={nuevaTarea.nombre_tecnico} onChange={e => setNuevaTarea(p => ({ ...p, nombre_tecnico: e.target.value }))} style={shared.inp} placeholder="Nombre formal o técnico" />
                        <span style={shared.lbl}>¿Qué hay que hacer?</span>
                        <textarea value={nuevaTarea.descripcion} onChange={e => setNuevaTarea(p => ({ ...p, descripcion: e.target.value }))} rows={3} style={{ ...shared.inp, resize: "vertical" }} placeholder="Descripción clara de la tarea..." />
                        <span style={shared.lbl}>¿Cómo sé que está lista?</span>
                        <input value={nuevaTarea.criterio_aceptacion} onChange={e => setNuevaTarea(p => ({ ...p, criterio_aceptacion: e.target.value }))} style={shared.inp} placeholder="Criterio de aceptación concreto" />
                        <div style={{ display: "flex", gap: 12 }}>
                          <div style={{ flex: 1 }}>
                            <span style={shared.lbl}>Gremio</span>
                            <input value={nuevaTarea.gremio} onChange={e => setNuevaTarea(p => ({ ...p, gremio: e.target.value }))} style={shared.inp} placeholder="Steel Frame, Plomero…" />
                          </div>
                          <div style={{ flex: 1 }}>
                            <span style={shared.lbl}>Días típicos</span>
                            <input type="number" step="0.5" min="0" value={nuevaTarea.duracion_tipica_dias} onChange={e => setNuevaTarea(p => ({ ...p, duracion_tipica_dias: e.target.value }))} style={shared.inp} placeholder="0" />
                          </div>
                        </div>
                        <div style={{ display: "flex", gap: 8 }}>
                          <button onClick={() => crearTarea(rubro.id)} disabled={!nuevaTarea.nombre} style={{ ...shared.btn, flex: 1 }}>Crear tarea</button>
                          <button onClick={() => setShowTarea(null)} style={{ ...shared.btnSm, flex: 1, padding: "9px" }}>Cancelar</button>
                        </div>
                      </div>
                    ) : (
                      <button onClick={() => setShowTarea(rubro.id)} style={{ ...shared.btn, width: "100%", marginTop: 8, background: "#f5f5f5", color: "#333" }}>
                        + Tarea en {rubro.nombre}
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
}
