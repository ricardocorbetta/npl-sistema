import React, { useEffect, useState, useCallback } from "react";
import { supabase } from "./supabase.js";

const SUPA_URL = "https://imkmosifqxzbtqgzssst.supabase.co/rest/v1";
const ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlta21vc2lmcXh6YnRxZ3pzc3N0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkxODk4NTUsImV4cCI6MjA5NDc2NTg1NX0.5gtCs8Yv3vDSrKxAmXSr3zjWJ5HjimCKejfO-XrHPss";

async function getToken() {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token || ANON_KEY;
}

function hdrs(token) {
  return {
    apikey: ANON_KEY,
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    Prefer: "return=representation",
  };
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
  const [showEvt,  setShowEvt]  = useState(false);
  const [tab,      setTab]      = useState("tareas"); // tareas | parte | eventos
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
    const p = rows[0];
    setParte(p);
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
      setMsg("✓ Guardado");
      setTimeout(() => setMsg(""), 1500);
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
      setMsg("✓ Evento guardado");
      setTimeout(() => setMsg(""), 1500);
    } catch (e) { console.error(e); }
    setSaving(false);
  }

  if (loading) return <div style={{ padding: 40, textAlign: "center", color: "#888", fontFamily: "system-ui" }}>Cargando obra…</div>;
  if (!obra)   return (
    <div style={{ padding: 40, textAlign: "center", fontFamily: "system-ui" }}>
      <p style={{ color: "#888", marginBottom: 16 }}>No tenés ninguna obra activa asignada.</p>
      <button onClick={onLogout} style={{ padding: "8px 20px", background: "#111", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer" }}>Salir</button>
    </div>
  );

  const avanceGeneral = tareas.length > 0
    ? Math.round(tareas.reduce((sum, t) => sum + (avances[t.id] || 0), 0) / tareas.length)
    : 0;

  const S = {
    page:   { maxWidth: 480, margin: "0 auto", fontFamily: "system-ui, -apple-system, sans-serif", paddingBottom: 80 },
    header: { background: "#111", color: "#fff", padding: "14px 16px", position: "sticky", top: 0, zIndex: 10 },
    card:   { background: "#fff", borderRadius: 12, padding: 16, margin: "10px 12px", boxShadow: "0 1px 4px rgba(0,0,0,.08)" },
    label:  { fontSize: 11, color: "#888", fontWeight: 600, textTransform: "uppercase", letterSpacing: .5, marginBottom: 6, display: "block" },
    input:  { width: "100%", padding: "10px 12px", border: "1px solid #e0e0e0", borderRadius: 8, fontSize: 15, boxSizing: "border-box" },
    btn:    { padding: "10px 18px", background: "#111", color: "#fff", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer" },
    btnSm:  { padding: "7px 12px", background: "#f0f0f0", color: "#333", border: "none", borderRadius: 6, fontSize: 13, cursor: "pointer" },
    tabs:   { display: "flex", background: "#fff", borderBottom: "1px solid #eee", position: "sticky", top: 56, zIndex: 9 },
  };

  return (
    <div style={S.page}>
      {/* Header */}
      <div style={S.header}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div style={{ fontSize: 11, color: "#888" }}>🏗️ OBRA ACTIVA</div>
            <div style={{ fontWeight: 700, fontSize: 16, marginTop: 2 }}>{obra.nombre}</div>
            {obra.direccion && <div style={{ fontSize: 12, color: "#aaa" }}>{obra.direccion}</div>}
          </div>
          <button onClick={onLogout} style={{ background: "none", border: "none", color: "#666", cursor: "pointer", fontSize: 12 }}>Salir</button>
        </div>
        {/* Avance general */}
        <div style={{ marginTop: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#aaa", marginBottom: 4 }}>
            <span>Avance general</span>
            <span style={{ fontWeight: 700, color: "#fff" }}>{avanceGeneral}%</span>
          </div>
          <div style={{ height: 6, background: "#333", borderRadius: 3, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${avanceGeneral}%`, background: "#22c55e", transition: "width .4s" }} />
          </div>
        </div>
        <div style={{ marginTop: 8, fontSize: 12, color: "#aaa" }}>
          {new Date(hoy + "T12:00:00").toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" })}
        </div>
      </div>

      {/* Tabs */}
      <div style={S.tabs}>
        {[["tareas","📋 Tareas"],["parte","📝 Parte del día"],["eventos","📦 Eventos"]].map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)} style={{
            flex: 1, padding: "12px 4px", fontSize: 12, fontWeight: tab === id ? 700 : 400,
            background: "none", border: "none", cursor: "pointer",
            color: tab === id ? "#111" : "#aaa",
            borderBottom: tab === id ? "2px solid #111" : "2px solid transparent"
          }}>{label}</button>
        ))}
      </div>

      {msg && <div style={{ background: "#d4edda", color: "#155724", padding: "8px 16px", textAlign: "center", fontSize: 13 }}>{msg}</div>}
      {saving && <div style={{ background: "#fff3cd", color: "#856404", padding: "5px 16px", textAlign: "center", fontSize: 12 }}>Guardando…</div>}

      {/* TAB TAREAS */}
      {tab === "tareas" && (
        <div>
          {tareas.length === 0 ? (
            <div style={{ padding: 40, textAlign: "center", color: "#aaa" }}>Sin tareas asignadas</div>
          ) : tareas.map(t => (
            <div key={t.id} style={S.card}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{t.nombre}</div>
                <span style={{ fontSize: 13, fontWeight: 700, color: avances[t.id] === 100 ? "#22c55e" : "#111" }}>
                  {avances[t.id] || 0}%
                </span>
              </div>
              {/* Barra */}
              <div style={{ height: 5, background: "#eee", borderRadius: 3, overflow: "hidden", marginBottom: 10 }}>
                <div style={{ height: "100%", width: `${avances[t.id] || 0}%`, background: avances[t.id] === 100 ? "#22c55e" : "#111", transition: "width .3s" }} />
              </div>
              {/* Botones */}
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {PCT_BTNS.map(pct => (
                  <button key={pct} onClick={() => guardarAvance(t.id, pct)} style={{
                    ...S.btnSm,
                    minWidth: 38,
                    fontWeight: 600,
                    background: avances[t.id] === pct ? "#111" : "#f0f0f0",
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
          ))}
        </div>
      )}

      {/* TAB PARTE DEL DÍA */}
      {tab === "parte" && (
        <div>
          {/* Clima */}
          <div style={S.card}>
            <span style={S.label}>Clima del día</span>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {CLIMAS.map(c => (
                <button key={c.v} onClick={() => guardarParte("clima", c.v)} style={{
                  ...S.btnSm,
                  background: parte?.clima === c.v ? "#111" : "#f0f0f0",
                  color: parte?.clima === c.v ? "#fff" : "#333"
                }}>{c.label}</button>
              ))}
            </div>
          </div>

          {/* Personal y horas */}
          <div style={S.card}>
            <span style={S.label}>Personal y horas</span>
            <div style={{ display: "flex", gap: 12 }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 12, color: "#888" }}>Personas en obra</label>
                <input type="number" min="0"
                  defaultValue={parte?.personal_cantidad || ""}
                  onBlur={e => guardarParte("personal_cantidad", parseInt(e.target.value) || null)}
                  style={{ ...S.input, marginTop: 4 }} placeholder="0" />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 12, color: "#888" }}>Horas trabajadas</label>
                <input type="number" min="0" step="0.5"
                  defaultValue={parte?.horas_trabajadas || ""}
                  onBlur={e => guardarParte("horas_trabajadas", parseFloat(e.target.value) || null)}
                  style={{ ...S.input, marginTop: 4 }} placeholder="0" />
              </div>
            </div>
          </div>

          {/* Observaciones */}
          <div style={S.card}>
            <span style={S.label}>Observaciones del día</span>
            <textarea
              defaultValue={parte?.observaciones || ""}
              onBlur={e => guardarParte("observaciones", e.target.value)}
              placeholder="Novedades, comentarios, tareas realizadas…"
              rows={4}
              style={{ ...S.input, resize: "vertical", lineHeight: 1.5 }}
            />
          </div>
        </div>
      )}

      {/* TAB EVENTOS */}
      {tab === "eventos" && (
        <div>
          <div style={{ ...S.card, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontWeight: 600, fontSize: 14 }}>Eventos de hoy</span>
            <button onClick={() => setShowEvt(!showEvt)} style={{ ...S.btn, padding: "7px 14px", fontSize: 13 }}>
              {showEvt ? "Cancelar" : "+ Agregar"}
            </button>
          </div>

          {showEvt && (
            <div style={{ ...S.card, background: "#f8f8f8" }}>
              <span style={S.label}>Tipo de evento</span>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
                {TIPOS_EVENTO.map(t => (
                  <button key={t.v} onClick={() => setNuevoEvt(prev => ({ ...prev, tipo: t.v }))} style={{
                    ...S.btnSm,
                    background: nuevoEvt.tipo === t.v ? "#111" : "#fff",
                    color: nuevoEvt.tipo === t.v ? "#fff" : "#333",
                    border: "1px solid #ddd"
                  }}>{t.label}</button>
                ))}
              </div>

              {nuevoEvt.tipo === "remito" && (
                <>
                  <input placeholder="Proveedor" value={nuevoEvt.proveedor} onChange={e => setNuevoEvt(p => ({ ...p, proveedor: e.target.value }))} style={{ ...S.input, marginBottom: 8 }} />
                  <input placeholder="N° Remito" value={nuevoEvt.numero_remito} onChange={e => setNuevoEvt(p => ({ ...p, numero_remito: e.target.value }))} style={{ ...S.input, marginBottom: 8 }} />
                  <div style={{ display: "flex", gap: 10, marginBottom: 8, alignItems: "center" }}>
                    <span style={{ fontSize: 14 }}>Conforme:</span>
                    <button onClick={() => setNuevoEvt(p => ({ ...p, conforme: true }))}  style={{ ...S.btnSm, background: nuevoEvt.conforme ? "#111" : "#f0f0f0", color: nuevoEvt.conforme ? "#fff" : "#333" }}>✓ Sí</button>
                    <button onClick={() => setNuevoEvt(p => ({ ...p, conforme: false }))} style={{ ...S.btnSm, background: nuevoEvt.conforme === false ? "#e53" : "#f0f0f0", color: nuevoEvt.conforme === false ? "#fff" : "#333" }}>✗ No</button>
                  </div>
                </>
              )}

              {nuevoEvt.tipo === "paralizacion" && (
                <input type="number" step="0.5" placeholder="Días perdidos" value={nuevoEvt.dias_perdidos} onChange={e => setNuevoEvt(p => ({ ...p, dias_perdidos: e.target.value }))} style={{ ...S.input, marginBottom: 8 }} />
              )}

              <textarea placeholder="Descripción / notas" value={nuevoEvt.descripcion} onChange={e => setNuevoEvt(p => ({ ...p, descripcion: e.target.value }))} rows={3} style={{ ...S.input, resize: "vertical", marginBottom: 10 }} />
              <button onClick={agregarEvento} style={S.btn}>Guardar evento</button>
            </div>
          )}

          {eventos.length === 0 && !showEvt && (
            <div style={{ padding: "20px 16px", textAlign: "center", color: "#aaa", fontSize: 13 }}>Sin eventos registrados hoy</div>
          )}

          {eventos.map(ev => (
            <div key={ev.id} style={{ ...S.card, borderLeft: "3px solid #111" }}>
              <div style={{ fontWeight: 600, fontSize: 13 }}>{TIPOS_EVENTO.find(t => t.v === ev.tipo)?.label || ev.tipo}</div>
              {ev.proveedor && <div style={{ fontSize: 12, color: "#666", marginTop: 3 }}>Proveedor: {ev.proveedor} · Remito: {ev.numero_remito} · {ev.conforme ? "✓ Conforme" : "✗ No conforme"}</div>}
              {ev.dias_perdidos && <div style={{ fontSize: 12, color: "#e53", marginTop: 3 }}>⏸ {ev.dias_perdidos} días perdidos</div>}
              {ev.descripcion && <div style={{ fontSize: 13, marginTop: 4 }}>{ev.descripcion}</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════
   VISTA ADMIN
════════════════════════════════════════════ */
function VistaAdmin() {
  const [obras,      setObras]      = useState([]);
  const [selected,   setSelected]   = useState(null);
  const [tareas,     setTareas]     = useState([]);
  const [partes,     setPartes]     = useState([]);
  const [avances,    setAvances]    = useState({});
  const [loading,    setLoading]    = useState(true);
  const [showModal,  setShowModal]  = useState(false);
  const [showTareaM, setShowTareaM] = useState(false);
  const [jefesList,  setJefesList]  = useState([]);
  const [nuevaObra,  setNuevaObra]  = useState({ nombre: "", cliente: "", direccion: "", fecha_inicio_plan: "", fecha_fin_plan: "", jefe_id: "" });
  const [nuevaTarea, setNuevaTarea] = useState({ nombre: "", fecha_inicio_plan: "", fecha_fin_plan: "" });

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

    // Calcular avance de cada obra
    const avMap = {};
    await Promise.all(obrasArr.map(async o => {
      const tk2 = await getToken();
      const tArr = await fetch(`${SUPA_URL}/tareas_obra?obra_id=eq.${o.id}&select=id`, { headers: hdrs(tk2) }).then(r => r.json());
      if (!Array.isArray(tArr) || tArr.length === 0) { avMap[o.id] = 0; return; }
      const ids = tArr.map(t => `tarea_id=eq.${t.id}`).join(",");
      // Obtener último avance por tarea (el más reciente)
      const avArr = await fetch(`${SUPA_URL}/avances_tarea?or=(${ids})&order=created_at.desc`, { headers: hdrs(tk2) }).then(r => r.json());
      if (!Array.isArray(avArr) || avArr.length === 0) { avMap[o.id] = 0; return; }
      // Tomar el avance más reciente por tarea
      const latestByTarea = {};
      avArr.forEach(a => { if (!latestByTarea[a.tarea_id]) latestByTarea[a.tarea_id] = a.porcentaje; });
      const vals = Object.values(latestByTarea);
      avMap[o.id] = Math.round(vals.reduce((s, v) => s + v, 0) / tArr.length);
    }));
    setAvances(avMap);
    setObras(obrasArr);
    setLoading(false);
  }

  async function seleccionar(o) {
    setSelected(o);
    const tk = await getToken();
    const [t, p] = await Promise.all([
      fetch(`${SUPA_URL}/tareas_obra?obra_id=eq.${o.id}&order=orden.asc`, { headers: hdrs(tk) }).then(r => r.json()),
      fetch(`${SUPA_URL}/partes_diarios?obra_id=eq.${o.id}&order=fecha.desc&limit=15`, { headers: hdrs(tk) }).then(r => r.json()),
    ]);
    setTareas(Array.isArray(t) ? t : []);
    setPartes(Array.isArray(p) ? p : []);
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
    setNuevaTarea({ nombre: "", fecha_inicio_plan: "", fecha_fin_plan: "" });
    seleccionar(selected);
  }

  async function cambiarEstado(id, estado) {
    const tk = await getToken();
    await fetch(`${SUPA_URL}/obras_campo?id=eq.${id}`, { method: "PATCH", headers: hdrs(tk), body: JSON.stringify({ estado }) });
    cargarTodo();
    if (selected?.id === id) setSelected(prev => ({ ...prev, estado }));
  }

  const ESTADO_COLOR = { activa: "#22c55e", pausada: "#f59e0b", finalizada: "#888" };

  const S = {
    wrap:   { display: "flex", minHeight: "100vh", fontFamily: "system-ui, -apple-system, sans-serif" },
    list:   { width: 280, borderRight: "1px solid #e8e8e8", background: "#fafafa", overflowY: "auto", flexShrink: 0 },
    detail: { flex: 1, padding: 24, overflowY: "auto" },
    btn:    { padding: "8px 16px", background: "#111", color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" },
    input:  { width: "100%", padding: "8px 10px", border: "1px solid #ddd", borderRadius: 7, fontSize: 14, boxSizing: "border-box", marginBottom: 8 },
    label:  { fontSize: 11, color: "#888", display: "block", marginBottom: 3, fontWeight: 600, textTransform: "uppercase" },
  };

  return (
    <div style={S.wrap}>
      {/* Lista obras */}
      <div style={S.list}>
        <div style={{ padding: "14px 16px", borderBottom: "1px solid #e8e8e8", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontWeight: 700, fontSize: 15 }}>🏗️ Obras</span>
          <button onClick={() => setShowModal(true)} style={{ ...S.btn, padding: "5px 10px", fontSize: 12 }}>+ Nueva</button>
        </div>

        {loading ? <p style={{ padding: 20, color: "#aaa", fontSize: 13 }}>Cargando…</p> : obras.map(o => {
          const pct = avances[o.id] || 0;
          return (
            <div key={o.id} onClick={() => seleccionar(o)} style={{
              padding: "12px 16px", cursor: "pointer", borderBottom: "1px solid #f0f0f0",
              background: selected?.id === o.id ? "#111" : "#fff",
            }}>
              <div style={{ fontWeight: 600, fontSize: 13, color: selected?.id === o.id ? "#fff" : "#111" }}>{o.nombre}</div>
              {o.cliente && <div style={{ fontSize: 11, color: selected?.id === o.id ? "#aaa" : "#888", marginTop: 2 }}>{o.cliente}</div>}
              {/* Mini barra de avance */}
              <div style={{ marginTop: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: selected?.id === o.id ? "#aaa" : "#888", marginBottom: 3 }}>
                  <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <span style={{ width: 7, height: 7, borderRadius: "50%", background: ESTADO_COLOR[o.estado] || "#888", display: "inline-block" }} />
                    {o.estado}
                  </span>
                  <span style={{ fontWeight: 700, color: selected?.id === o.id ? "#fff" : "#111" }}>{pct}%</span>
                </div>
                <div style={{ height: 4, background: selected?.id === o.id ? "#333" : "#eee", borderRadius: 2, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${pct}%`, background: pct === 100 ? "#22c55e" : selected?.id === o.id ? "#fff" : "#111", transition: "width .3s" }} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Detalle */}
      <div style={S.detail}>
        {!selected ? (
          /* Dashboard general */
          <div>
            <h2 style={{ margin: "0 0 20px", fontSize: 20, fontWeight: 700 }}>Dashboard de obras</h2>
            {loading ? <p style={{ color: "#aaa" }}>Cargando…</p> : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 16 }}>
                {obras.map(o => {
                  const pct = avances[o.id] || 0;
                  return (
                    <div key={o.id} onClick={() => seleccionar(o)} style={{
                      background: "#fff", border: "1px solid #e8e8e8", borderRadius: 12, padding: 20, cursor: "pointer",
                      transition: "box-shadow .2s"
                    }}
                      onMouseEnter={e => e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,.08)"}
                      onMouseLeave={e => e.currentTarget.style.boxShadow = "none"}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: 15, color: "#111" }}>{o.nombre}</div>
                          {o.cliente && <div style={{ fontSize: 12, color: "#888", marginTop: 2 }}>{o.cliente}</div>}
                        </div>
                        <span style={{ fontSize: 22, fontWeight: 800, color: pct === 100 ? "#22c55e" : "#111" }}>{pct}%</span>
                      </div>
                      <div style={{ height: 8, background: "#f0f0f0", borderRadius: 4, overflow: "hidden", marginBottom: 10 }}>
                        <div style={{ height: "100%", width: `${pct}%`, background: pct === 100 ? "#22c55e" : "#111", transition: "width .4s" }} />
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#888" }}>
                        <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
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
        ) : (
          /* Detalle de obra seleccionada */
          <>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
              <div>
                <button onClick={() => setSelected(null)} style={{ fontSize: 12, color: "#888", background: "none", border: "none", cursor: "pointer", marginBottom: 6, padding: 0 }}>← Volver</button>
                <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>{selected.nombre}</h2>
                {selected.cliente && <p style={{ margin: "3px 0 0", color: "#888", fontSize: 13 }}>{selected.cliente}</p>}
                {selected.direccion && <p style={{ margin: "2px 0 0", color: "#aaa", fontSize: 12 }}>{selected.direccion}</p>}
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                {selected.estado !== "activa"     && <button onClick={() => cambiarEstado(selected.id, "activa")}     style={{ ...S.btn, background: "#22c55e" }}>Activar</button>}
                {selected.estado !== "pausada"    && <button onClick={() => cambiarEstado(selected.id, "pausada")}    style={{ ...S.btn, background: "#f59e0b" }}>Pausar</button>}
                {selected.estado !== "finalizada" && <button onClick={() => cambiarEstado(selected.id, "finalizada")} style={{ ...S.btn, background: "#888"    }}>Finalizar</button>}
              </div>
            </div>

            {/* Avance general */}
            <div style={{ background: "#fff", border: "1px solid #e8e8e8", borderRadius: 12, padding: 20, marginBottom: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                <span style={{ fontWeight: 600 }}>Avance general</span>
                <span style={{ fontWeight: 800, fontSize: 20 }}>{avances[selected.id] || 0}%</span>
              </div>
              <div style={{ height: 10, background: "#f0f0f0", borderRadius: 5, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${avances[selected.id] || 0}%`, background: "#111", transition: "width .4s" }} />
              </div>
              {(selected.fecha_inicio_plan || selected.fecha_fin_plan) && (
                <div style={{ display: "flex", gap: 20, marginTop: 12, fontSize: 13, color: "#666" }}>
                  {selected.fecha_inicio_plan && <span>Inicio: {new Date(selected.fecha_inicio_plan + "T12:00").toLocaleDateString("es-AR")}</span>}
                  {selected.fecha_fin_plan    && <span>Fin planificado: {new Date(selected.fecha_fin_plan + "T12:00").toLocaleDateString("es-AR")}</span>}
                </div>
              )}
            </div>

            {/* Tareas */}
            <div style={{ marginBottom: 24 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <h3 style={{ margin: 0, fontSize: 16 }}>Tareas</h3>
                <button onClick={() => setShowTareaM(true)} style={{ ...S.btn, padding: "6px 12px", fontSize: 12 }}>+ Tarea</button>
              </div>
              {tareas.length === 0 ? <p style={{ color: "#aaa", fontSize: 14 }}>Sin tareas.</p> : tareas.map(t => (
                <div key={t.id} style={{ background: "#fff", border: "1px solid #e8e8e8", borderRadius: 8, padding: "10px 14px", marginBottom: 6 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 14, fontWeight: 500 }}>{t.nombre}</span>
                    <span style={{ fontSize: 12, color: "#aaa" }}>
                      {t.fecha_inicio_plan && new Date(t.fecha_inicio_plan + "T12:00").toLocaleDateString("es-AR")}
                      {t.fecha_inicio_plan && t.fecha_fin_plan && " → "}
                      {t.fecha_fin_plan && new Date(t.fecha_fin_plan + "T12:00").toLocaleDateString("es-AR")}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Últimos partes */}
            <div>
              <h3 style={{ margin: "0 0 12px", fontSize: 16 }}>Últimos partes diarios</h3>
              {partes.length === 0 ? <p style={{ color: "#aaa", fontSize: 14 }}>Sin partes registrados.</p> : partes.map(p => (
                <div key={p.id} style={{ background: "#fff", border: "1px solid #e8e8e8", borderRadius: 8, padding: "10px 14px", marginBottom: 6 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ fontWeight: 600, fontSize: 14 }}>
                      {new Date(p.fecha + "T12:00").toLocaleDateString("es-AR", { weekday: "short", day: "numeric", month: "short" })}
                    </span>
                    <span style={{ fontSize: 13, color: "#888" }}>{CLIMAS.find(c => c.v === p.clima)?.label || ""}</span>
                  </div>
                  {p.personal_cantidad && <div style={{ fontSize: 12, color: "#888" }}>👷 {p.personal_cantidad} personas · ⏱ {p.horas_trabajadas}hs</div>}
                  {p.observaciones && <p style={{ margin: "6px 0 0", fontSize: 13, color: "#444" }}>{p.observaciones}</p>}
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Modal nueva obra */}
      {showModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }}>
          <div style={{ background: "#fff", borderRadius: 14, padding: 28, width: 440, maxWidth: "95vw" }}>
            <h3 style={{ margin: "0 0 20px" }}>Nueva obra</h3>
            <span style={S.label}>Nombre *</span>
            <input value={nuevaObra.nombre} onChange={e => setNuevaObra(p => ({ ...p, nombre: e.target.value }))} style={S.input} placeholder="Nombre de la obra" />
            <span style={S.label}>Cliente</span>
            <input value={nuevaObra.cliente} onChange={e => setNuevaObra(p => ({ ...p, cliente: e.target.value }))} style={S.input} placeholder="Empresa o persona" />
            <span style={S.label}>Dirección</span>
            <input value={nuevaObra.direccion} onChange={e => setNuevaObra(p => ({ ...p, direccion: e.target.value }))} style={S.input} placeholder="Dirección de la obra" />
            <div style={{ display: "flex", gap: 12 }}>
              <div style={{ flex: 1 }}>
                <span style={S.label}>Inicio planificado</span>
                <input type="date" value={nuevaObra.fecha_inicio_plan} onChange={e => setNuevaObra(p => ({ ...p, fecha_inicio_plan: e.target.value }))} style={S.input} />
              </div>
              <div style={{ flex: 1 }}>
                <span style={S.label}>Fin planificado</span>
                <input type="date" value={nuevaObra.fecha_fin_plan} onChange={e => setNuevaObra(p => ({ ...p, fecha_fin_plan: e.target.value }))} style={S.input} />
              </div>
            </div>
            {jefesList.length > 0 && (
              <>
                <span style={S.label}>Jefe de obra</span>
                <select value={nuevaObra.jefe_id} onChange={e => setNuevaObra(p => ({ ...p, jefe_id: e.target.value }))} style={{ ...S.input }}>
                  <option value="">Sin asignar</option>
                  {jefesList.map(j => <option key={j.id} value={j.id}>{j.nombre}</option>)}
                </select>
              </>
            )}
            <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
              <button onClick={crearObra} disabled={!nuevaObra.nombre} style={S.btn}>Crear obra</button>
              <button onClick={() => setShowModal(false)} style={{ ...S.btn, background: "#f0f0f0", color: "#333" }}>Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal nueva tarea */}
      {showTareaM && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }}>
          <div style={{ background: "#fff", borderRadius: 14, padding: 28, width: 380, maxWidth: "95vw" }}>
            <h3 style={{ margin: "0 0 20px" }}>Nueva tarea</h3>
            <span style={S.label}>Nombre *</span>
            <input value={nuevaTarea.nombre} onChange={e => setNuevaTarea(p => ({ ...p, nombre: e.target.value }))} style={S.input} placeholder="Ej: Fabricar paneles" />
            <div style={{ display: "flex", gap: 12 }}>
              <div style={{ flex: 1 }}>
                <span style={S.label}>Inicio plan</span>
                <input type="date" value={nuevaTarea.fecha_inicio_plan} onChange={e => setNuevaTarea(p => ({ ...p, fecha_inicio_plan: e.target.value }))} style={S.input} />
              </div>
              <div style={{ flex: 1 }}>
                <span style={S.label}>Fin plan</span>
                <input type="date" value={nuevaTarea.fecha_fin_plan} onChange={e => setNuevaTarea(p => ({ ...p, fecha_fin_plan: e.target.value }))} style={S.input} />
              </div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={crearTarea} disabled={!nuevaTarea.nombre} style={S.btn}>Agregar</button>
              <button onClick={() => setShowTareaM(false)} style={{ ...S.btn, background: "#f0f0f0", color: "#333" }}>Cancelar</button>
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
  if (!perfil) return <div style={{ padding: 40, textAlign: "center", color: "#aaa" }}>Cargando…</div>;
  if (perfil.rol === "jefe_obra") return <VistaJefe perfil={perfil} onLogout={onLogout} />;
  return <VistaAdmin />;
}
