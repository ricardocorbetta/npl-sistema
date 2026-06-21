import React, { useEffect, useState, useCallback } from "react";
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

const CLIMAS = [
  { v: "bueno",   label: "☀️ Bueno" },
  { v: "nublado", label: "⛅ Nublado" },
  { v: "lluvia",  label: "🌧️ Lluvia" },
  { v: "viento",  label: "💨 Viento" },
  { v: "helada",  label: "🧊 Helada" },
];

const TIPOS_EVENTO = [
  { v: "remito",       label: "📦 Remito" },
  { v: "paralizacion", label: "⏸️ Paralización" },
  { v: "visita",       label: "👁️ Visita" },
  { v: "incidente",    label: "⚠️ Incidente" },
  { v: "otro",         label: "📝 Otro" },
];

const PCT_BTNS = [0, 10, 25, 50, 75, 90, 100];

const ETAPA_COLOR = {
  "Arranque":      "#6366f1",
  "Estructura":    "#f59e0b",
  "Exterior":      "#3b82f6",
  "Cubierta":      "#8b5cf6",
  "Interior":      "#10b981",
  "Terminaciones": "#ec4899",
  "Instalaciones": "#14b8a6",
  "Sin etapa":     "#888",
};
const ETAPAS_ORDEN = ["Arranque","Estructura","Exterior","Cubierta","Interior","Terminaciones","Instalaciones","Sin etapa"];
const ESTADO_COLOR = { activa: "#22c55e", pausada: "#f59e0b", finalizada: "#888" };

/* ─── Estilos compartidos ─── */
const shared = {
  btn:   { padding: "10px 18px", background: "#111", color: "#fff", border: "none", borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: "pointer", WebkitTapHighlightColor: "transparent" },
  btnSm: { padding: "8px 12px", background: "#f0f0f0", color: "#333", border: "none", borderRadius: 8, fontSize: 13, cursor: "pointer", WebkitTapHighlightColor: "transparent" },
  inp:   { width: "100%", padding: "11px 12px", border: "1px solid #e0e0e0", borderRadius: 10, fontSize: 15, boxSizing: "border-box", appearance: "none", WebkitAppearance: "none" },
  card:  { background: "#fff", borderRadius: 14, padding: "16px", boxShadow: "0 1px 6px rgba(0,0,0,.07)" },
  lbl:   { fontSize: 11, color: "#888", fontWeight: 600, textTransform: "uppercase", letterSpacing: .5, marginBottom: 6, display: "block" },
};

/* ════════════════════════════════════════════
   VISTA JEFE — mobile first
════════════════════════════════════════════ */
function VistaJefe({ perfil, onLogout }) {
  const [obra,     setObra]     = useState(null);
  const [tareas,   setTareas]   = useState([]);
  const [parte,    setParte]    = useState(null);
  const [eventos,  setEventos]  = useState([]);
  const [avances,  setAvances]  = useState({});
  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);
  const [msg,      setMsg]      = useState("");
  const [tab,      setTab]      = useState("tareas");
  const [showEvt,  setShowEvt]  = useState(false);
  const [nuevoEvt, setNuevoEvt] = useState({ tipo: "remito", descripcion: "", proveedor: "", numero_remito: "", conforme: true, dias_perdidos: "" });

  const hoy = new Date().toISOString().slice(0, 10);

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const tk = await getToken();
      const obras = await fetch(`${SUPA_URL}/obras_campo?jefe_id=eq.${perfil.id}&estado=eq.activa&select=*`, { headers: hdrs(tk) }).then(r => r.json());
      const o = obras[0];
      if (!o) { setLoading(false); return; }
      setObra(o);
      const [tArr, pArr] = await Promise.all([
        fetch(`${SUPA_URL}/tareas_obra?obra_id=eq.${o.id}&order=orden.asc`, { headers: hdrs(tk) }).then(r => r.json()),
        fetch(`${SUPA_URL}/partes_diarios?obra_id=eq.${o.id}&fecha=eq.${hoy}&select=*`, { headers: hdrs(tk) }).then(r => r.json()),
      ]);
      setTareas(Array.isArray(tArr) ? tArr : []);
      const p = pArr[0] || null;
      if (p) {
        setParte(p);
        const [evArr, avArr] = await Promise.all([
          fetch(`${SUPA_URL}/eventos_parte?parte_id=eq.${p.id}&order=created_at.asc`, { headers: hdrs(tk) }).then(r => r.json()),
          fetch(`${SUPA_URL}/avances_tarea?parte_id=eq.${p.id}`, { headers: hdrs(tk) }).then(r => r.json()),
        ]);
        setEventos(Array.isArray(evArr) ? evArr : []);
        const avMap = {};
        (Array.isArray(avArr) ? avArr : []).forEach(a => { avMap[a.tarea_id] = a.porcentaje; });
        setAvances(avMap);
      }
    } catch (e) { console.error(e); }
    setLoading(false);
  }, [perfil, hoy]);

  useEffect(() => { cargar(); }, [cargar]);

  async function asegurarParte() {
    const tk = await getToken();
    if (parte) return { parte, tk };
    const r = await fetch(`${SUPA_URL}/partes_diarios`, { method: "POST", headers: hdrs(tk), body: JSON.stringify({ obra_id: obra.id, fecha: hoy, jefe_id: perfil.id }) });
    const rows = await r.json();
    const p = rows[0]; setParte(p);
    return { parte: p, tk };
  }

  async function guardarParte(campo, valor) {
    setSaving(true);
    try {
      const { parte: p, tk } = await asegurarParte();
      await fetch(`${SUPA_URL}/partes_diarios?id=eq.${p.id}`, { method: "PATCH", headers: hdrs(tk), body: JSON.stringify({ [campo]: valor }) });
      setParte(prev => ({ ...prev, [campo]: valor }));
    } catch (e) { console.error(e); }
    setSaving(false);
  }

  async function guardarAvance(tareaId, pct) {
    setSaving(true);
    try {
      const { parte: p, tk } = await asegurarParte();
      const existing = await fetch(`${SUPA_URL}/avances_tarea?parte_id=eq.${p.id}&tarea_id=eq.${tareaId}`, { headers: hdrs(tk) }).then(r => r.json());
      if (existing.length > 0) {
        await fetch(`${SUPA_URL}/avances_tarea?id=eq.${existing[0].id}`, { method: "PATCH", headers: hdrs(tk), body: JSON.stringify({ porcentaje: pct }) });
      } else {
        await fetch(`${SUPA_URL}/avances_tarea`, { method: "POST", headers: hdrs(tk), body: JSON.stringify({ parte_id: p.id, tarea_id: tareaId, porcentaje: pct }) });
      }
      setAvances(prev => ({ ...prev, [tareaId]: pct }));
      setMsg("✓ Guardado"); setTimeout(() => setMsg(""), 1500);
    } catch (e) { console.error(e); }
    setSaving(false);
  }

  async function agregarEvento() {
    setSaving(true);
    try {
      const { parte: p, tk } = await asegurarParte();
      const body = { parte_id: p.id, ...nuevoEvt, dias_perdidos: nuevoEvt.dias_perdidos ? parseFloat(nuevoEvt.dias_perdidos) : null };
      const r = await fetch(`${SUPA_URL}/eventos_parte`, { method: "POST", headers: hdrs(tk), body: JSON.stringify(body) });
      const rows = await r.json();
      setEventos(prev => [...prev, rows[0]]);
      setNuevoEvt({ tipo: "remito", descripcion: "", proveedor: "", numero_remito: "", conforme: true, dias_perdidos: "" });
      setShowEvt(false);
      setMsg("✓ Evento guardado"); setTimeout(() => setMsg(""), 1500);
    } catch (e) { console.error(e); }
    setSaving(false);
  }

  if (loading) return <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", color: "#888", fontFamily: "system-ui" }}>Cargando obra…</div>;
  if (!obra) return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100vh", fontFamily: "system-ui", gap: 16 }}>
      <p style={{ color: "#888" }}>No tenés ninguna obra activa asignada.</p>
      <button onClick={onLogout} style={shared.btn}>Salir</button>
    </div>
  );

  const avanceGeneral = tareas.length > 0
    ? Math.round(tareas.reduce((s, t) => s + (avances[t.id] || 0), 0) / tareas.length) : 0;

  const porEtapa = {};
  tareas.forEach(t => {
    const e = t.etapa || "Sin etapa";
    if (!porEtapa[e]) porEtapa[e] = [];
    porEtapa[e].push(t);
  });

  return (
    <div style={{ fontFamily: "system-ui, -apple-system, sans-serif", minHeight: "100vh", background: "#f5f5f7", paddingBottom: 32 }}>
      {/* Header */}
      <div style={{ background: "#111", color: "#fff", padding: "16px 20px", position: "sticky", top: 0, zIndex: 10 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div style={{ fontSize: 11, color: "#888", letterSpacing: 1 }}>🏗️ OBRA ACTIVA</div>
            <div style={{ fontWeight: 700, fontSize: 17, marginTop: 2 }}>{obra.nombre}</div>
            {obra.direccion && <div style={{ fontSize: 12, color: "#aaa" }}>{obra.direccion}</div>}
          </div>
          <button onClick={onLogout} style={{ background: "none", border: "none", color: "#666", cursor: "pointer", fontSize: 12, padding: "4px 8px" }}>Salir</button>
        </div>
        {/* Avance general */}
        <div style={{ marginTop: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#aaa", marginBottom: 5 }}>
            <span>Avance general</span>
            <span style={{ fontWeight: 700, color: "#fff", fontSize: 14 }}>{avanceGeneral}%</span>
          </div>
          <div style={{ height: 6, background: "#333", borderRadius: 3, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${avanceGeneral}%`, background: "#22c55e", transition: "width .5s" }} />
          </div>
        </div>
        <div style={{ marginTop: 8, fontSize: 12, color: "#666" }}>
          {new Date(hoy + "T12:00:00").toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" })}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", background: "#fff", borderBottom: "1px solid #eee", position: "sticky", top: 97, zIndex: 9 }}>
        {[["tareas","📋 Tareas"],["parte","📝 Parte del día"],["eventos","📦 Eventos"]].map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)} style={{
            flex: 1, padding: "13px 4px", fontSize: 13, fontWeight: tab === id ? 700 : 400,
            background: "none", border: "none", cursor: "pointer",
            color: tab === id ? "#111" : "#aaa",
            borderBottom: tab === id ? "2px solid #111" : "2px solid transparent",
            WebkitTapHighlightColor: "transparent",
          }}>{label}</button>
        ))}
      </div>

      {msg && <div style={{ background: "#d4edda", color: "#155724", padding: "10px 20px", textAlign: "center", fontSize: 13 }}>{msg}</div>}
      {saving && <div style={{ background: "#fff3cd", color: "#856404", padding: "6px 20px", textAlign: "center", fontSize: 12 }}>Guardando…</div>}

      {/* TAB TAREAS */}
      {tab === "tareas" && (
        <div style={{ padding: "12px 16px" }}>
          {ETAPAS_ORDEN.filter(e => porEtapa[e]).map(etapa => {
            const color = ETAPA_COLOR[etapa] || "#888";
            const tArr = porEtapa[etapa];
            const pctE = Math.round(tArr.reduce((s, t) => s + (avances[t.id] || 0), 0) / tArr.length);
            return (
              <div key={etapa} style={{ marginBottom: 20 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                  <div style={{ width: 10, height: 10, borderRadius: "50%", background: color }} />
                  <span style={{ fontWeight: 700, fontSize: 13, flex: 1, color: "#333" }}>{etapa}</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color }}>{pctE}%</span>
                </div>
                {tArr.map(t => {
                  const pctT = avances[t.id] || 0;
                  return (
                    <div key={t.id} style={{ ...shared.card, marginBottom: 10, borderLeft: `4px solid ${color}` }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                        <span style={{ fontWeight: 600, fontSize: 15 }}>{t.nombre}</span>
                        <span style={{ fontWeight: 800, fontSize: 16, color: pctT === 100 ? "#22c55e" : "#111" }}>{pctT}%</span>
                      </div>
                      <div style={{ height: 5, background: "#eee", borderRadius: 3, overflow: "hidden", marginBottom: 12 }}>
                        <div style={{ height: "100%", width: `${pctT}%`, background: pctT === 100 ? "#22c55e" : color, transition: "width .3s" }} />
                      </div>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        {PCT_BTNS.map(pct => (
                          <button key={pct} onClick={() => guardarAvance(t.id, pct)} style={{
                            ...shared.btnSm,
                            minWidth: 44, minHeight: 40, fontWeight: 600, fontSize: 13,
                            background: avances[t.id] === pct ? color : "#f0f0f0",
                            color: avances[t.id] === pct ? "#fff" : "#333",
                          }}>{pct}%</button>
                        ))}
                      </div>
                      {t.fecha_fin_plan && (
                        <div style={{ marginTop: 8, fontSize: 11, color: "#aaa" }}>
                          Plazo: {new Date(t.fecha_fin_plan + "T12:00").toLocaleDateString("es-AR")}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      )}

      {/* TAB PARTE */}
      {tab === "parte" && (
        <div style={{ padding: "12px 16px" }}>
          <div style={{ ...shared.card, marginBottom: 12 }}>
            <span style={shared.lbl}>Clima del día</span>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {CLIMAS.map(c => (
                <button key={c.v} onClick={() => guardarParte("clima", c.v)} style={{
                  ...shared.btnSm, minHeight: 40,
                  background: parte?.clima === c.v ? "#111" : "#f0f0f0",
                  color: parte?.clima === c.v ? "#fff" : "#333",
                }}>{c.label}</button>
              ))}
            </div>
          </div>
          <div style={{ ...shared.card, marginBottom: 12 }}>
            <span style={shared.lbl}>Personal y horas</span>
            <div style={{ display: "flex", gap: 12 }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 12, color: "#888", display: "block", marginBottom: 4 }}>Personas en obra</label>
                <input type="number" inputMode="numeric" min="0" defaultValue={parte?.personal_cantidad || ""} onBlur={e => guardarParte("personal_cantidad", parseInt(e.target.value) || null)} style={shared.inp} placeholder="0" />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 12, color: "#888", display: "block", marginBottom: 4 }}>Horas trabajadas</label>
                <input type="number" inputMode="decimal" min="0" step="0.5" defaultValue={parte?.horas_trabajadas || ""} onBlur={e => guardarParte("horas_trabajadas", parseFloat(e.target.value) || null)} style={shared.inp} placeholder="0" />
              </div>
            </div>
          </div>
          <div style={{ ...shared.card }}>
            <span style={shared.lbl}>Observaciones del día</span>
            <textarea defaultValue={parte?.observaciones || ""} onBlur={e => guardarParte("observaciones", e.target.value)} placeholder="Novedades, comentarios, tareas realizadas…" rows={5} style={{ ...shared.inp, resize: "vertical", lineHeight: 1.6 }} />
          </div>
        </div>
      )}

      {/* TAB EVENTOS */}
      {tab === "eventos" && (
        <div style={{ padding: "12px 16px" }}>
          <button onClick={() => setShowEvt(!showEvt)} style={{ ...shared.btn, width: "100%", marginBottom: 12 }}>
            {showEvt ? "Cancelar" : "+ Agregar evento"}
          </button>

          {showEvt && (
            <div style={{ ...shared.card, marginBottom: 12, background: "#f8f8f8" }}>
              <span style={shared.lbl}>Tipo de evento</span>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
                {TIPOS_EVENTO.map(t => (
                  <button key={t.v} onClick={() => setNuevoEvt(prev => ({ ...prev, tipo: t.v }))} style={{
                    ...shared.btnSm, minHeight: 40,
                    background: nuevoEvt.tipo === t.v ? "#111" : "#fff",
                    color: nuevoEvt.tipo === t.v ? "#fff" : "#333",
                    border: "1px solid #ddd",
                  }}>{t.label}</button>
                ))}
              </div>
              {nuevoEvt.tipo === "remito" && (
                <>
                  <input placeholder="Proveedor" value={nuevoEvt.proveedor} onChange={e => setNuevoEvt(p => ({ ...p, proveedor: e.target.value }))} style={{ ...shared.inp, marginBottom: 10 }} />
                  <input placeholder="N° Remito" value={nuevoEvt.numero_remito} onChange={e => setNuevoEvt(p => ({ ...p, numero_remito: e.target.value }))} style={{ ...shared.inp, marginBottom: 10 }} />
                  <div style={{ display: "flex", gap: 10, marginBottom: 10, alignItems: "center" }}>
                    <span style={{ fontSize: 14 }}>Conforme:</span>
                    <button onClick={() => setNuevoEvt(p => ({ ...p, conforme: true }))} style={{ ...shared.btnSm, minHeight: 40, background: nuevoEvt.conforme ? "#111" : "#f0f0f0", color: nuevoEvt.conforme ? "#fff" : "#333" }}>✓ Sí</button>
                    <button onClick={() => setNuevoEvt(p => ({ ...p, conforme: false }))} style={{ ...shared.btnSm, minHeight: 40, background: nuevoEvt.conforme === false ? "#e53" : "#f0f0f0", color: nuevoEvt.conforme === false ? "#fff" : "#333" }}>✗ No</button>
                  </div>
                </>
              )}
              {nuevoEvt.tipo === "paralizacion" && (
                <input type="number" inputMode="decimal" step="0.5" placeholder="Días perdidos" value={nuevoEvt.dias_perdidos} onChange={e => setNuevoEvt(p => ({ ...p, dias_perdidos: e.target.value }))} style={{ ...shared.inp, marginBottom: 10 }} />
              )}
              <textarea placeholder="Descripción / notas" value={nuevoEvt.descripcion} onChange={e => setNuevoEvt(p => ({ ...p, descripcion: e.target.value }))} rows={3} style={{ ...shared.inp, resize: "vertical", marginBottom: 12 }} />
              <button onClick={agregarEvento} style={{ ...shared.btn, width: "100%" }}>Guardar evento</button>
            </div>
          )}

          {eventos.length === 0 && !showEvt && (
            <div style={{ textAlign: "center", color: "#aaa", fontSize: 14, padding: "32px 0" }}>Sin eventos registrados hoy</div>
          )}
          {eventos.map(ev => (
            <div key={ev.id} style={{ ...shared.card, marginBottom: 10, borderLeft: "4px solid #111" }}>
              <div style={{ fontWeight: 600, fontSize: 14 }}>{TIPOS_EVENTO.find(t => t.v === ev.tipo)?.label || ev.tipo}</div>
              {ev.proveedor && <div style={{ fontSize: 13, color: "#666", marginTop: 4 }}>Proveedor: {ev.proveedor} · Remito: {ev.numero_remito} · {ev.conforme ? "✓ Conforme" : "✗ No conforme"}</div>}
              {ev.dias_perdidos && <div style={{ fontSize: 13, color: "#e53", marginTop: 4 }}>⏸ {ev.dias_perdidos} días perdidos</div>}
              {ev.descripcion && <div style={{ fontSize: 14, marginTop: 6, color: "#333" }}>{ev.descripcion}</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════
   VISTA ADMIN — responsive desktop + mobile
════════════════════════════════════════════ */
function VistaAdmin() {
  const [obras,         setObras]         = useState([]);
  const [selected,      setSelected]      = useState(null);
  const [tareas,        setTareas]        = useState([]);
  const [avancesTareas, setAvancesTareas] = useState({});
  const [partes,        setPartes]        = useState([]);
  const [avancesObra,   setAvancesObra]   = useState({});
  const [loading,       setLoading]       = useState(true);
  const [savingTarea,   setSavingTarea]   = useState(null);
  const [showModal,     setShowModal]     = useState(false);
  const [showTareaM,    setShowTareaM]    = useState(false);
  const [jefesList,     setJefesList]     = useState([]);
  const [nuevaObra,     setNuevaObra]     = useState({ nombre: "", cliente: "", direccion: "", fecha_inicio_plan: "", fecha_fin_plan: "", jefe_id: "" });
  const [nuevaTarea,    setNuevaTarea]    = useState({ nombre: "", etapa: "", fecha_inicio_plan: "", fecha_fin_plan: "" });
  const [msg,           setMsg]           = useState("");
  const [isMobile,      setIsMobile]      = useState(window.innerWidth < 768);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  useEffect(() => { cargarTodo(); }, []);

  async function cargarTodo() {
    setLoading(true);
    const tk = await getToken();
    const [obrasData, jefesData] = await Promise.all([
      fetch(`${SUPA_URL}/obras_campo?order=created_at.desc&select=*`, { headers: hdrs(tk) }).then(r => r.json()),
      fetch(`${SUPA_URL}/perfiles?rol=eq.jefe_obra&select=id,nombre`, { headers: hdrs(tk) }).then(r => r.json()),
    ]);
    const obrasArr = Array.isArray(obrasData) ? obrasData : [];
    setJefesList(Array.isArray(jefesData) ? jefesData : []);
    const avMap = {};
    await Promise.all(obrasArr.map(async o => {
      const tk2 = await getToken();
      const tArr = await fetch(`${SUPA_URL}/tareas_obra?obra_id=eq.${o.id}&select=id`, { headers: hdrs(tk2) }).then(r => r.json());
      if (!Array.isArray(tArr) || tArr.length === 0) { avMap[o.id] = 0; return; }
      const ids = tArr.map(t => `tarea_id=eq.${t.id}`).join(",");
      const avArr = await fetch(`${SUPA_URL}/avances_tarea?or=(${ids})&order=created_at.desc`, { headers: hdrs(tk2) }).then(r => r.json());
      if (!Array.isArray(avArr) || avArr.length === 0) { avMap[o.id] = 0; return; }
      const latest = {};
      avArr.forEach(a => { if (!latest[a.tarea_id]) latest[a.tarea_id] = a.porcentaje; });
      const vals = Object.values(latest);
      avMap[o.id] = Math.round(vals.reduce((s, v) => s + v, 0) / tArr.length);
    }));
    setAvancesObra(avMap);
    setObras(obrasArr);
    setLoading(false);
  }

  async function seleccionar(o) {
    setSelected(o); setTareas([]); setAvancesTareas({}); setPartes([]);
    const tk = await getToken();
    const [tArr, pArr] = await Promise.all([
      fetch(`${SUPA_URL}/tareas_obra?obra_id=eq.${o.id}&order=orden.asc`, { headers: hdrs(tk) }).then(r => r.json()),
      fetch(`${SUPA_URL}/partes_diarios?obra_id=eq.${o.id}&order=fecha.desc&limit=15`, { headers: hdrs(tk) }).then(r => r.json()),
    ]);
    const tFinal = Array.isArray(tArr) ? tArr : [];
    setTareas(tFinal);
    setPartes(Array.isArray(pArr) ? pArr : []);
    if (tFinal.length > 0) {
      const ids = tFinal.map(t => `tarea_id=eq.${t.id}`).join(",");
      const avArr = await fetch(`${SUPA_URL}/avances_tarea?or=(${ids})&order=created_at.desc`, { headers: hdrs(tk) }).then(r => r.json());
      const avMap = {};
      (Array.isArray(avArr) ? avArr : []).forEach(a => { if (!avMap[a.tarea_id]) avMap[a.tarea_id] = a.porcentaje; });
      setAvancesTareas(avMap);
    }
  }

  async function guardarAvanceTarea(tareaId, pct) {
    setSavingTarea(tareaId);
    try {
      const tk = await getToken();
      const hoy = new Date().toISOString().slice(0, 10);
      let parteHoy = partes.find(p => p.fecha === hoy);
      if (!parteHoy) {
        const r = await fetch(`${SUPA_URL}/partes_diarios`, { method: "POST", headers: hdrs(tk), body: JSON.stringify({ obra_id: selected.id, fecha: hoy, jefe_id: selected.jefe_id }) });
        const rows = await r.json();
        parteHoy = rows[0];
        setPartes(prev => [parteHoy, ...prev]);
      }
      const existing = await fetch(`${SUPA_URL}/avances_tarea?parte_id=eq.${parteHoy.id}&tarea_id=eq.${tareaId}`, { headers: hdrs(tk) }).then(r => r.json());
      if (existing.length > 0) {
        await fetch(`${SUPA_URL}/avances_tarea?id=eq.${existing[0].id}`, { method: "PATCH", headers: hdrs(tk), body: JSON.stringify({ porcentaje: pct }) });
      } else {
        await fetch(`${SUPA_URL}/avances_tarea`, { method: "POST", headers: hdrs(tk), body: JSON.stringify({ parte_id: parteHoy.id, tarea_id: tareaId, porcentaje: pct }) });
      }
      const newAv = { ...avancesTareas, [tareaId]: pct };
      setAvancesTareas(newAv);
      const vals = tareas.map(t => newAv[t.id] || 0);
      setAvancesObra(prev => ({ ...prev, [selected.id]: Math.round(vals.reduce((s, v) => s + v, 0) / tareas.length) }));
      setMsg("✓ Avance guardado"); setTimeout(() => setMsg(""), 2000);
    } catch (e) { console.error(e); }
    setSavingTarea(null);
  }

  async function crearObra() {
    const tk = await getToken();
    await fetch(`${SUPA_URL}/obras_campo`, { method: "POST", headers: hdrs(tk), body: JSON.stringify(nuevaObra) });
    setShowModal(false);
    setNuevaObra({ nombre: "", cliente: "", direccion: "", fecha_inicio_plan: "", fecha_fin_plan: "", jefe_id: "" });
    cargarTodo();
  }

  async function crearTarea() {
    if (!selected) return;
    const tk = await getToken();
    await fetch(`${SUPA_URL}/tareas_obra`, { method: "POST", headers: hdrs(tk), body: JSON.stringify({ ...nuevaTarea, obra_id: selected.id, orden: tareas.length + 1 }) });
    setShowTareaM(false);
    setNuevaTarea({ nombre: "", etapa: "", fecha_inicio_plan: "", fecha_fin_plan: "" });
    seleccionar(selected);
  }

  async function cambiarEstado(id, estado) {
    const tk = await getToken();
    await fetch(`${SUPA_URL}/obras_campo?id=eq.${id}`, { method: "PATCH", headers: hdrs(tk), body: JSON.stringify({ estado }) });
    cargarTodo();
    if (selected?.id === id) setSelected(prev => ({ ...prev, estado }));
  }

  const porEtapa = {};
  tareas.forEach(t => {
    const e = t.etapa || "Sin etapa";
    if (!porEtapa[e]) porEtapa[e] = [];
    porEtapa[e].push(t);
  });

  const S = {
    wrap:   { display: "flex", minHeight: "100vh", fontFamily: "system-ui, -apple-system, sans-serif", flexDirection: isMobile ? "column" : "row" },
    list:   isMobile ? { background: "#fff", borderBottom: "1px solid #eee" } : { width: 280, borderRight: "1px solid #e8e8e8", background: "#fafafa", overflowY: "auto", flexShrink: 0 },
    detail: { flex: 1, padding: isMobile ? "16px" : "28px", overflowY: "auto" },
    btn:    { ...shared.btn },
    btnSm:  { ...shared.btnSm, minHeight: 36 },
    inp:    { ...shared.inp },
    lbl:    { ...shared.lbl },
  };

  const Dashboard = () => (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h2 style={{ margin: 0, fontSize: isMobile ? 18 : 22, fontWeight: 700 }}>Dashboard de obras</h2>
        <button onClick={() => setShowModal(true)} style={{ ...S.btn, padding: "8px 14px", fontSize: 13 }}>+ Nueva obra</button>
      </div>
      {loading ? <p style={{ color: "#aaa" }}>Cargando…</p> : (
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fill, minmax(260px, 1fr))", gap: 14 }}>
          {obras.map(o => {
            const pct = avancesObra[o.id] || 0;
            return (
              <div key={o.id} onClick={() => seleccionar(o)} style={{ ...shared.card, cursor: "pointer", transition: "box-shadow .2s" }}
                onMouseEnter={e => !isMobile && (e.currentTarget.style.boxShadow = "0 6px 20px rgba(0,0,0,.1)")}
                onMouseLeave={e => !isMobile && (e.currentTarget.style.boxShadow = shared.card.boxShadow)}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                  <div style={{ flex: 1, marginRight: 12 }}>
                    <div style={{ fontWeight: 700, fontSize: 15, color: "#111" }}>{o.nombre}</div>
                    {o.cliente && <div style={{ fontSize: 12, color: "#888", marginTop: 2 }}>{o.cliente}</div>}
                  </div>
                  <span style={{ fontSize: 24, fontWeight: 800, color: pct === 100 ? "#22c55e" : "#111", flexShrink: 0 }}>{pct}%</span>
                </div>
                <div style={{ height: 8, background: "#f0f0f0", borderRadius: 4, overflow: "hidden", marginBottom: 10 }}>
                  <div style={{ height: "100%", width: `${pct}%`, background: pct === 100 ? "#22c55e" : "#111", transition: "width .5s" }} />
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#888" }}>
                  <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                    <span style={{ width: 8, height: 8, borderRadius: "50%", background: ESTADO_COLOR[o.estado] || "#888", display: "inline-block" }} />
                    {o.estado}
                  </span>
                  {o.fecha_fin_plan && <span>Plazo: {new Date(o.fecha_fin_plan + "T12:00").toLocaleDateString("es-AR")}</span>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  const DetalleObra = () => (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20, flexWrap: "wrap", gap: 10 }}>
        <div>
          <button onClick={() => setSelected(null)} style={{ fontSize: 13, color: "#888", background: "none", border: "none", cursor: "pointer", padding: "0 0 6px", display: "block" }}>← Volver</button>
          <h2 style={{ margin: 0, fontSize: isMobile ? 18 : 22, fontWeight: 700 }}>{selected.nombre}</h2>
          {selected.cliente && <p style={{ margin: "3px 0 0", color: "#888", fontSize: 13 }}>{selected.cliente}</p>}
          {selected.direccion && <p style={{ margin: "2px 0 0", color: "#aaa", fontSize: 12 }}>{selected.direccion}</p>}
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {selected.estado !== "activa"     && <button onClick={() => cambiarEstado(selected.id, "activa")}     style={{ ...S.btn, background: "#22c55e", padding: "7px 12px", fontSize: 12 }}>Activar</button>}
          {selected.estado !== "pausada"    && <button onClick={() => cambiarEstado(selected.id, "pausada")}    style={{ ...S.btn, background: "#f59e0b", padding: "7px 12px", fontSize: 12 }}>Pausar</button>}
          {selected.estado !== "finalizada" && <button onClick={() => cambiarEstado(selected.id, "finalizada")} style={{ ...S.btn, background: "#888",    padding: "7px 12px", fontSize: 12 }}>Finalizar</button>}
        </div>
      </div>

      {msg && <div style={{ background: "#d4edda", color: "#155724", padding: "10px 16px", borderRadius: 10, marginBottom: 16, fontSize: 13 }}>{msg}</div>}

      {/* Avance general */}
      <div style={{ ...shared.card, marginBottom: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
          <span style={{ fontWeight: 600, fontSize: 15 }}>Avance general</span>
          <span style={{ fontWeight: 800, fontSize: 24 }}>{avancesObra[selected.id] || 0}%</span>
        </div>
        <div style={{ height: 10, background: "#f0f0f0", borderRadius: 5, overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${avancesObra[selected.id] || 0}%`, background: "#111", transition: "width .5s" }} />
        </div>
        {/* Pills por etapa */}
        {Object.keys(porEtapa).length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 14 }}>
            {ETAPAS_ORDEN.filter(e => porEtapa[e]).map(etapa => {
              const tArr = porEtapa[etapa];
              const pctE = Math.round(tArr.reduce((s, t) => s + (avancesTareas[t.id] || 0), 0) / tArr.length);
              const color = ETAPA_COLOR[etapa] || "#888";
              return (
                <div key={etapa} style={{ display: "flex", alignItems: "center", gap: 5, background: "#f5f5f5", borderRadius: 20, padding: "5px 12px" }}>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: color, display: "inline-block" }} />
                  <span style={{ fontSize: 12, color: "#555" }}>{etapa}</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color }}>{pctE}%</span>
                </div>
              );
            })}
          </div>
        )}
        {(selected.fecha_inicio_plan || selected.fecha_fin_plan) && (
          <div style={{ display: "flex", gap: 20, marginTop: 12, fontSize: 13, color: "#666", flexWrap: "wrap" }}>
            {selected.fecha_inicio_plan && <span>Inicio: {new Date(selected.fecha_inicio_plan + "T12:00").toLocaleDateString("es-AR")}</span>}
            {selected.fecha_fin_plan    && <span>Fin plan: {new Date(selected.fecha_fin_plan + "T12:00").toLocaleDateString("es-AR")}</span>}
          </div>
        )}
      </div>

      {/* Tareas por etapa */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h3 style={{ margin: 0, fontSize: 17 }}>Tareas</h3>
          <button onClick={() => setShowTareaM(true)} style={{ ...S.btn, padding: "7px 14px", fontSize: 13 }}>+ Tarea</button>
        </div>
        {tareas.length === 0 ? <p style={{ color: "#aaa" }}>Sin tareas.</p> : (
          ETAPAS_ORDEN.filter(e => porEtapa[e]).map(etapa => {
            const color = ETAPA_COLOR[etapa] || "#888";
            const tArr = porEtapa[etapa];
            const pctE = Math.round(tArr.reduce((s, t) => s + (avancesTareas[t.id] || 0), 0) / tArr.length);
            return (
              <div key={etapa} style={{ marginBottom: 20 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10, paddingBottom: 6, borderBottom: `2px solid ${color}` }}>
                  <span style={{ width: 10, height: 10, borderRadius: "50%", background: color, display: "inline-block" }} />
                  <span style={{ fontWeight: 700, fontSize: 14, flex: 1 }}>{etapa}</span>
                  <span style={{ fontSize: 14, fontWeight: 700, color }}>{pctE}%</span>
                </div>
                {tArr.map(t => {
                  const pctT = avancesTareas[t.id] || 0;
                  const isSaving = savingTarea === t.id;
                  return (
                    <div key={t.id} style={{ ...shared.card, marginBottom: 10, borderLeft: `4px solid ${color}` }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                        <span style={{ fontSize: 14, fontWeight: 600 }}>{t.nombre}</span>
                        <span style={{ fontSize: 18, fontWeight: 800, color: pctT === 100 ? "#22c55e" : "#111" }}>{pctT}%</span>
                      </div>
                      <div style={{ height: 6, background: "#f0f0f0", borderRadius: 3, overflow: "hidden", marginBottom: 10 }}>
                        <div style={{ height: "100%", width: `${pctT}%`, background: pctT === 100 ? "#22c55e" : color, transition: "width .3s" }} />
                      </div>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        {PCT_BTNS.map(pct => (
                          <button key={pct} onClick={() => guardarAvanceTarea(t.id, pct)} disabled={isSaving} style={{
                            ...S.btnSm, minWidth: isMobile ? 44 : 40, fontWeight: 600,
                            background: avancesTareas[t.id] === pct ? color : "#f0f0f0",
                            color: avancesTareas[t.id] === pct ? "#fff" : "#333",
                            opacity: isSaving ? .5 : 1,
                          }}>{pct}%</button>
                        ))}
                      </div>
                      {(t.fecha_inicio_plan || t.fecha_fin_plan) && (
                        <div style={{ marginTop: 8, fontSize: 11, color: "#aaa", display: "flex", gap: 12 }}>
                          {t.fecha_inicio_plan && <span>Inicio: {new Date(t.fecha_inicio_plan + "T12:00").toLocaleDateString("es-AR")}</span>}
                          {t.fecha_fin_plan    && <span>Fin: {new Date(t.fecha_fin_plan + "T12:00").toLocaleDateString("es-AR")}</span>}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })
        )}
      </div>

      {/* Últimos partes */}
      <div>
        <h3 style={{ margin: "0 0 14px", fontSize: 17 }}>Últimos partes diarios</h3>
        {partes.length === 0 ? <p style={{ color: "#aaa" }}>Sin partes registrados.</p> : partes.map(p => (
          <div key={p.id} style={{ ...shared.card, marginBottom: 8 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
              <span style={{ fontWeight: 600, fontSize: 14 }}>{new Date(p.fecha + "T12:00").toLocaleDateString("es-AR", { weekday: "short", day: "numeric", month: "short" })}</span>
              <span style={{ fontSize: 13, color: "#888" }}>{CLIMAS.find(c => c.v === p.clima)?.label || ""}</span>
            </div>
            {p.personal_cantidad && <div style={{ fontSize: 13, color: "#888" }}>👷 {p.personal_cantidad} personas · ⏱ {p.horas_trabajadas}hs</div>}
            {p.observaciones && <p style={{ margin: "6px 0 0", fontSize: 13, color: "#444" }}>{p.observaciones}</p>}
          </div>
        ))}
      </div>
    </>
  );

  return (
    <div style={S.wrap}>
      {/* En mobile: si hay obra seleccionada, ocultar lista */}
      {(!isMobile || !selected) && (
        <div style={S.list}>
          {/* Header lista */}
          <div style={{ padding: "14px 16px", borderBottom: "1px solid #e8e8e8", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontWeight: 700, fontSize: 15 }}>🏗️ Obras</span>
            {!isMobile && <button onClick={() => setShowModal(true)} style={{ ...S.btn, padding: "5px 10px", fontSize: 12 }}>+ Nueva</button>}
          </div>
          {loading ? <p style={{ padding: 20, color: "#aaa", fontSize: 13 }}>Cargando…</p> : obras.map(o => {
            const pct = avancesObra[o.id] || 0;
            return (
              <div key={o.id} onClick={() => seleccionar(o)} style={{
                padding: isMobile ? "14px 16px" : "12px 16px",
                cursor: "pointer", borderBottom: "1px solid #f0f0f0",
                background: !isMobile && selected?.id === o.id ? "#111" : "#fff",
              }}>
                <div style={{ fontWeight: 600, fontSize: 14, color: !isMobile && selected?.id === o.id ? "#fff" : "#111" }}>{o.nombre}</div>
                {o.cliente && <div style={{ fontSize: 12, color: !isMobile && selected?.id === o.id ? "#aaa" : "#888", marginTop: 2 }}>{o.cliente}</div>}
                <div style={{ marginTop: 8 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 3 }}>
                    <span style={{ display: "flex", alignItems: "center", gap: 4, color: !isMobile && selected?.id === o.id ? "#aaa" : "#888" }}>
                      <span style={{ width: 7, height: 7, borderRadius: "50%", background: ESTADO_COLOR[o.estado] || "#888", display: "inline-block" }} />
                      {o.estado}
                    </span>
                    <span style={{ fontWeight: 700, color: !isMobile && selected?.id === o.id ? "#fff" : "#111" }}>{pct}%</span>
                  </div>
                  <div style={{ height: 4, background: !isMobile && selected?.id === o.id ? "#333" : "#eee", borderRadius: 2, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${pct}%`, background: pct === 100 ? "#22c55e" : !isMobile && selected?.id === o.id ? "#fff" : "#111", transition: "width .3s" }} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Detalle */}
      {(!isMobile || selected) && (
        <div style={S.detail}>
          {!selected ? <Dashboard /> : <DetalleObra />}
        </div>
      )}

      {/* Modal nueva obra */}
      {showModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 16 }}>
          <div style={{ background: "#fff", borderRadius: 16, padding: 28, width: "100%", maxWidth: 440 }}>
            <h3 style={{ margin: "0 0 20px" }}>Nueva obra</h3>
            <span style={S.lbl}>Nombre *</span>
            <input value={nuevaObra.nombre} onChange={e => setNuevaObra(p => ({ ...p, nombre: e.target.value }))} style={{ ...S.inp, marginBottom: 10 }} placeholder="Nombre de la obra" />
            <span style={S.lbl}>Cliente</span>
            <input value={nuevaObra.cliente} onChange={e => setNuevaObra(p => ({ ...p, cliente: e.target.value }))} style={{ ...S.inp, marginBottom: 10 }} placeholder="Empresa o persona" />
            <span style={S.lbl}>Dirección</span>
            <input value={nuevaObra.direccion} onChange={e => setNuevaObra(p => ({ ...p, direccion: e.target.value }))} style={{ ...S.inp, marginBottom: 10 }} placeholder="Dirección de la obra" />
            <div style={{ display: "flex", gap: 12 }}>
              <div style={{ flex: 1 }}><span style={S.lbl}>Inicio plan</span><input type="date" value={nuevaObra.fecha_inicio_plan} onChange={e => setNuevaObra(p => ({ ...p, fecha_inicio_plan: e.target.value }))} style={{ ...S.inp, marginBottom: 10 }} /></div>
              <div style={{ flex: 1 }}><span style={S.lbl}>Fin plan</span><input type="date" value={nuevaObra.fecha_fin_plan} onChange={e => setNuevaObra(p => ({ ...p, fecha_fin_plan: e.target.value }))} style={{ ...S.inp, marginBottom: 10 }} /></div>
            </div>
            {jefesList.length > 0 && (
              <><span style={S.lbl}>Jefe de obra</span>
              <select value={nuevaObra.jefe_id} onChange={e => setNuevaObra(p => ({ ...p, jefe_id: e.target.value }))} style={{ ...S.inp, marginBottom: 10 }}>
                <option value="">Sin asignar</option>
                {jefesList.map(j => <option key={j.id} value={j.id}>{j.nombre}</option>)}
              </select></>
            )}
            <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
              <button onClick={crearObra} disabled={!nuevaObra.nombre} style={{ ...S.btn, flex: 1 }}>Crear obra</button>
              <button onClick={() => setShowModal(false)} style={{ ...S.btn, background: "#f0f0f0", color: "#333", flex: 1 }}>Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal nueva tarea */}
      {showTareaM && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 16 }}>
          <div style={{ background: "#fff", borderRadius: 16, padding: 28, width: "100%", maxWidth: 400 }}>
            <h3 style={{ margin: "0 0 20px" }}>Nueva tarea</h3>
            <span style={S.lbl}>Etapa</span>
            <select value={nuevaTarea.etapa} onChange={e => setNuevaTarea(p => ({ ...p, etapa: e.target.value }))} style={{ ...S.inp, marginBottom: 10 }}>
              <option value="">Sin etapa</option>
              {["Arranque","Estructura","Exterior","Cubierta","Interior","Terminaciones","Instalaciones"].map(e => <option key={e} value={e}>{e}</option>)}
            </select>
            <span style={S.lbl}>Nombre *</span>
            <input value={nuevaTarea.nombre} onChange={e => setNuevaTarea(p => ({ ...p, nombre: e.target.value }))} style={{ ...S.inp, marginBottom: 10 }} placeholder="Ej: Fabricar paneles" />
            <div style={{ display: "flex", gap: 12 }}>
              <div style={{ flex: 1 }}><span style={S.lbl}>Inicio plan</span><input type="date" value={nuevaTarea.fecha_inicio_plan} onChange={e => setNuevaTarea(p => ({ ...p, fecha_inicio_plan: e.target.value }))} style={{ ...S.inp, marginBottom: 10 }} /></div>
              <div style={{ flex: 1 }}><span style={S.lbl}>Fin plan</span><input type="date" value={nuevaTarea.fecha_fin_plan} onChange={e => setNuevaTarea(p => ({ ...p, fecha_fin_plan: e.target.value }))} style={{ ...S.inp, marginBottom: 10 }} /></div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={crearTarea} disabled={!nuevaTarea.nombre} style={{ ...S.btn, flex: 1 }}>Agregar</button>
              <button onClick={() => setShowTareaM(false)} style={{ ...S.btn, background: "#f0f0f0", color: "#333", flex: 1 }}>Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════
   EXPORT
════════════════════════════════════════════ */
export default function Obras({ perfil, onLogout }) {
  if (!perfil) return <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", color: "#aaa", fontFamily: "system-ui" }}>Cargando…</div>;
  if (perfil.rol === "jefe_obra") return <VistaJefe perfil={perfil} onLogout={onLogout} />;
  return <VistaAdmin />;
}
