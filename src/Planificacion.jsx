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
async function api(path, options = {}) {
  const tk = await getToken();
  const res = await fetch(`${SUPA_URL}${path}`, { ...options, headers: { ...hdrs(tk), ...(options.headers || {}) } });
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

function codigoProyecto(p) {
  const nro = p.numero_proyecto || p.codigo || "";
  const pres = p.presupuesto_codigo || "";
  if (nro && pres && nro !== pres) return nro + " · " + pres;
  return nro || pres || "—";
}


const ESTADO_COLOR = {
  onboarding: { color: "#f59e0b", bg: "#fffbeb", label: "Onboarding" },
  activo:     { color: "#3b82f6", bg: "#eff6ff", label: "Activo" },
  revision:   { color: "#6366f1", bg: "#ede9fe", label: "Revisión" },
};

function hoy() { return new Date().toISOString().slice(0, 10); }
function addDias(d, n) {
  const dt = new Date(d + "T12:00");
  dt.setDate(dt.getDate() + n);
  return dt.toISOString().slice(0, 10);
}
function fmtCorto(d) {
  if (!d) return "—";
  return new Date(d + "T12:00").toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit" });
}
function diasRestantes(d) {
  if (!d) return null;
  return Math.ceil((new Date(d + "T12:00") - new Date()) / 86400000);
}
function inicioSemana(d) {
  const dt = new Date(d + "T12:00");
  const dia = dt.getDay();
  const lunes = new Date(dt);
  lunes.setDate(dt.getDate() - (dia === 0 ? 6 : dia - 1));
  return lunes.toISOString().slice(0, 10);
}
function semanas(desde, hasta) {
  const res = [];
  let cur = inicioSemana(desde);
  while (cur <= hasta) {
    res.push(cur);
    cur = addDias(cur, 7);
  }
  return res;
}
function meses(desde, hasta) {
  const res = [];
  let [y, m] = desde.slice(0, 7).split("-").map(Number);
  const [hy, hm] = hasta.slice(0, 7).split("-").map(Number);
  while (y < hy || (y === hy && m <= hm)) {
    res.push(`${y}-${String(m).padStart(2, "0")}`);
    m++; if (m > 12) { m = 1; y++; }
  }
  return res;
}
function fmtSemana(d) {
  const fin = addDias(d, 6);
  return `${fmtCorto(d)} – ${fmtCorto(fin)}`;
}
function fmtMes(ym) {
  const [y, m] = ym.split("-");
  return new Date(parseInt(y), parseInt(m) - 1, 1).toLocaleDateString("es-AR", { month: "long", year: "numeric" });
}

/* ─── Modal para editar fechas de proyecto ─── */
function ModalFechas({ proyecto, onClose, onGuardar }) {
  const [form, setForm] = useState({
    fecha_inicio_real:  proyecto.fecha_inicio_real || "",
    fecha_entrega_plan: proyecto.fecha_entrega_plan || "",
    encargado:          proyecto.encargado || "",
  });
  const [calculistas, setCalculistas] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api("/calculistas?estado=eq.activo&select=id,nombre,nivel&order=nombre.asc").then(r => setCalculistas(Array.isArray(r) ? r : []));
  }, []);

  async function guardar() {
    setSaving(true);
    const body = {
      encargado: form.encargado || null,
      fecha_inicio_real:  form.fecha_inicio_real || null,
      fecha_entrega_plan: form.fecha_entrega_plan || null,
    };
    await api(`/proyectos?id=eq.${proyecto.id}`, { method: "PATCH", body: JSON.stringify(body) });
    onGuardar();
    setSaving(false);
  }

  const dias = form.fecha_inicio_real && form.fecha_entrega_plan
    ? Math.ceil((new Date(form.fecha_entrega_plan + "T12:00") - new Date(form.fecha_inicio_real + "T12:00")) / 86400000)
    : null;

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div style={{ background: "#fff", borderRadius: 14, padding: 24, width: "min(480px, 100%)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 15, fontWeight: 800 }}>Planificar proyecto</h2>
            <p style={{ margin: "3px 0 0", fontSize: 13, color: "#888" }}>{proyecto.descripcion}</p>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "#888" }}>✕</button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div>
            <label style={{ fontSize: 10, fontWeight: 700, color: "#aaa", textTransform: "uppercase", letterSpacing: 0.5, display: "block", marginBottom: 4 }}>Calculista asignado</label>
            <select value={form.encargado} onChange={e => setForm(p => ({ ...p, encargado: e.target.value }))}
              style={{ width: "100%", padding: "9px 12px", border: "1.5px solid #e0e0e0", borderRadius: 8, fontSize: 13, fontFamily: "inherit" }}>
              <option value="">Sin asignar</option>
              {calculistas.map(c => <option key={c.id} value={c.nombre}>{c.nombre}{c.nivel ? ` · ${c.nivel}` : ""}</option>)}
            </select>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={{ fontSize: 10, fontWeight: 700, color: "#aaa", textTransform: "uppercase", letterSpacing: 0.5, display: "block", marginBottom: 4 }}>Fecha de inicio</label>
              <input type="date" value={form.fecha_inicio_real} onChange={e => setForm(p => ({ ...p, fecha_inicio_real: e.target.value }))}
                style={{ width: "100%", padding: "9px 12px", border: "1.5px solid #e0e0e0", borderRadius: 8, fontSize: 13, fontFamily: "inherit", boxSizing: "border-box" }} />
            </div>
            <div>
              <label style={{ fontSize: 10, fontWeight: 700, color: "#aaa", textTransform: "uppercase", letterSpacing: 0.5, display: "block", marginBottom: 4 }}>Fecha de entrega</label>
              <input type="date" value={form.fecha_entrega_plan} onChange={e => setForm(p => ({ ...p, fecha_entrega_plan: e.target.value }))}
                style={{ width: "100%", padding: "9px 12px", border: "1.5px solid #e0e0e0", borderRadius: 8, fontSize: 13, fontFamily: "inherit", boxSizing: "border-box" }} />
            </div>
          </div>

          {dias !== null && (
            <div style={{ background: "#f0fdf4", borderRadius: 8, padding: "8px 14px", fontSize: 13, color: "#1a8a5e", fontWeight: 700 }}>
              ⏱ Duración estimada: {dias} días
            </div>
          )}
        </div>

        <div style={{ display: "flex", gap: 8, marginTop: 20 }}>
          <button onClick={guardar} disabled={saving}
            style={{ padding: "9px 20px", background: "#0a0a0a", color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
            {saving ? "Guardando…" : "Guardar"}
          </button>
          <button onClick={onClose}
            style={{ padding: "9px 14px", background: "#f0f0f0", color: "#333", border: "1.5px solid #e0e0e0", borderRadius: 8, fontSize: 12, cursor: "pointer" }}>
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Tarjeta de proyecto en el tablero ─── */
function TarjetaProyecto({ p, onClick }) {
  const dr = diasRestantes(p.fecha_entrega_plan);
  const estado = ESTADO_COLOR[p.estado] || ESTADO_COLOR.onboarding;
  const colorDias = dr === null ? "#aaa" : dr < 0 ? "#c0392b" : dr <= 5 ? "#c0392b" : dr <= 10 ? "#f59e0b" : "#1a8a5e";
  const sinFecha = !p.fecha_inicio_real && !p.fecha_entrega_plan;

  return (
    <div onClick={onClick} style={{
      background: "#fff", border: `1.5px solid ${dr !== null && dr <= 5 ? "#fecaca" : "#e8e8e8"}`,
      borderLeft: `3px solid ${estado.color}`, borderRadius: 8, padding: "8px 10px", cursor: "pointer",
      marginBottom: 5, transition: "all 0.1s",
      background: dr !== null && dr < 0 ? "#fef2f2" : "#fff",
    }}
    onMouseEnter={e => e.currentTarget.style.borderColor = "#3b82f6"}
    onMouseLeave={e => e.currentTarget.style.borderColor = dr !== null && dr <= 5 ? "#fecaca" : "#e8e8e8"}>
      <div style={{ fontSize: 11, fontWeight: 700, color: "#111", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginBottom: 3 }}>
        <span style={{ fontSize: 9, color: "#aaa", marginRight: 5, fontFamily: "monospace" }}>{codigoProyecto(p)}</span>
        {p.descripcion || "Sin descripción"}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 10, background: estado.bg, color: estado.color, borderRadius: 4, padding: "1px 6px", fontWeight: 700 }}>{estado.label}</span>
        {sinFecha
          ? <span style={{ fontSize: 9, color: "#ddd", fontStyle: "italic" }}>sin fechas</span>
          : dr !== null
          ? <span style={{ fontSize: 10, fontWeight: 800, color: colorDias }}>
              {dr < 0 ? `${Math.abs(dr)}d vencido` : dr === 0 ? "hoy" : `${dr}d`}
            </span>
          : null
        }
      </div>
      {p.fecha_entrega_plan && (
        <div style={{ fontSize: 9, color: "#bbb", marginTop: 2 }}>📅 entrega {fmtCorto(p.fecha_entrega_plan)}</div>
      )}
    </div>
  );
}

/* ─── Componente principal ─── */
export default function Planificacion({ perfil, onNav }) {
  const [proyectos, setProyectos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [vista, setVista] = useState("semana"); // "semana" | "mes" | "carga"
  const [modalFechas, setModalFechas] = useState(null);
  const [periodoOffset, setPeriodoOffset] = useState(0); // semanas/meses hacia adelante
  const [msg, setMsg] = useState("");

  const cargar = useCallback(async () => {
    setLoading(true);
    const r = await api("/proyectos?archivado=is.false&estado=in.(onboarding,activo,revision)&order=codigo.asc");
    setProyectos(Array.isArray(r) ? r : []);
    setLoading(false);
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  // Agrupar por calculista
  const porCalculista = {};
  proyectos.forEach(p => {
    const key = p.encargado || "Sin asignar";
    if (!porCalculista[key]) porCalculista[key] = [];
    porCalculista[key].push(p);
  });
  const calculistas = Object.keys(porCalculista).sort((a, b) => a === "Sin asignar" ? 1 : b === "Sin asignar" ? -1 : a.localeCompare(b));

  // Rango de fechas
  const HOY = hoy();
  let periodoDesde, periodoHasta, periodos, fmtPeriodo, esPeriodoActual;

  if (vista === "semana") {
    periodoDesde = addDias(inicioSemana(HOY), periodoOffset * 7);
    periodoHasta = addDias(periodoDesde, 7 * 8); // 8 semanas
    periodos = semanas(periodoDesde, periodoHasta);
    fmtPeriodo = fmtSemana;
    esPeriodoActual = (p) => p === inicioSemana(HOY);
  } else if (vista === "mes") {
    const base = new Date(HOY);
    base.setMonth(base.getMonth() + periodoOffset);
    periodoDesde = `${base.getFullYear()}-${String(base.getMonth() + 1).padStart(2, "0")}`;
    const fin = new Date(base);
    fin.setMonth(fin.getMonth() + 5);
    periodoHasta = `${fin.getFullYear()}-${String(fin.getMonth() + 1).padStart(2, "0")}`;
    periodos = meses(periodoDesde, periodoHasta);
    fmtPeriodo = fmtMes;
    esPeriodoActual = (p) => p === HOY.slice(0, 7);
  }

  // Función para verificar si un proyecto cae en un período
  function proyectoEnPeriodo(p, periodo) {
    if (!p.fecha_inicio_real && !p.fecha_entrega_plan) return false;
    if (vista === "semana") {
      const finSem = addDias(periodo, 6);
      const ini = p.fecha_inicio_real || p.fecha_entrega_plan;
      const fin = p.fecha_entrega_plan || p.fecha_inicio_real;
      return ini <= finSem && fin >= periodo;
    } else {
      const ini = (p.fecha_inicio_real || p.fecha_entrega_plan || "").slice(0, 7);
      const fin = (p.fecha_entrega_plan || p.fecha_inicio_real || "").slice(0, 7);
      return ini <= periodo && fin >= periodo;
    }
  }

  // Métricas de carga
  const totalActivos = proyectos.filter(p => p.estado === "activo").length;
  const sinFechas = proyectos.filter(p => !p.fecha_inicio_real && !p.fecha_entrega_plan).length;
  const vencidos = proyectos.filter(p => p.fecha_entrega_plan && p.fecha_entrega_plan < HOY).length;
  const proximos7d = proyectos.filter(p => {
    const dr = diasRestantes(p.fecha_entrega_plan);
    return dr !== null && dr >= 0 && dr <= 7;
  }).length;

  return (
    <div style={{ fontFamily: "system-ui, -apple-system, sans-serif", padding: "20px", maxWidth: 1400, margin: "0 auto" }}>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
        <div>
          <p style={{ margin: 0, fontSize: 11, color: "#aaa" }}>NPL · Planificación</p>
          <h1 style={{ margin: "2px 0 0", fontSize: 20, fontWeight: 800, color: "#111" }}>📅 Planificación</h1>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {/* Toggle vista */}
          <div style={{ display: "flex", background: "#f0f0f0", borderRadius: 8, padding: 2 }}>
            {[["semana","Semana"],["mes","Mes"],["carga","Carga"]].map(([v, l]) => (
              <button key={v} onClick={() => { setVista(v); setPeriodoOffset(0); }} style={{
                padding: "5px 14px", borderRadius: 6, border: "none", fontSize: 12,
                fontWeight: vista === v ? 700 : 400,
                background: vista === v ? "#0a0a0a" : "transparent",
                color: vista === v ? "#fff" : "#666", cursor: "pointer",
              }}>{l}</button>
            ))}
          </div>
          <button onClick={() => onNav && onNav("proyectos")} style={{ padding: "6px 14px", background: "#f0f0f0", border: "1.5px solid #e0e0e0", borderRadius: 8, fontSize: 12, cursor: "pointer", color: "#555", fontWeight: 600 }}>
            → Ir a proyectos
          </button>
        </div>
      </div>

      {/* KPIs rápidos */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        {[
          { label: "En curso", value: totalActivos, color: "#3b82f6" },
          { label: "⚠️ Vencidos", value: vencidos, color: vencidos > 0 ? "#c0392b" : "#aaa" },
          { label: "🔔 Próximos 7d", value: proximos7d, color: proximos7d > 0 ? "#f59e0b" : "#aaa" },
          { label: "Sin fechas", value: sinFechas, color: sinFechas > 0 ? "#888" : "#aaa" },
          { label: "Calculistas", value: calculistas.filter(c => c !== "Sin asignar").length, color: "#6366f1" },
        ].map(k => (
          <div key={k.label} style={{ background: "#fff", border: "1.5px solid #e8e8e8", borderRadius: 10, padding: "8px 14px", minWidth: 80 }}>
            <div style={{ fontSize: 20, fontWeight: 900, color: k.color, fontFamily: "monospace" }}>{k.value}</div>
            <div style={{ fontSize: 10, color: "#aaa", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.4 }}>{k.label}</div>
          </div>
        ))}
      </div>

      {msg && <div style={{ background: "#f0fdf4", color: "#1a8a5e", borderRadius: 8, padding: "7px 12px", marginBottom: 10, fontSize: 13, fontWeight: 600 }}>{msg}</div>}

      {loading ? <p style={{ color: "#aaa", textAlign: "center", padding: 40 }}>Cargando…</p> : (

        <>
          {/* ── VISTA CARGA ── */}
          {vista === "carga" && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12 }}>
              {calculistas.map(calc => {
                const proyCalc = porCalculista[calc] || [];
                const activos = proyCalc.filter(p => p.estado === "activo").length;
                const venc = proyCalc.filter(p => p.fecha_entrega_plan && p.fecha_entrega_plan < HOY).length;
                const prox = proyCalc.filter(p => { const dr = diasRestantes(p.fecha_entrega_plan); return dr !== null && dr >= 0 && dr <= 7; }).length;

                return (
                  <div key={calc} style={{ background: "#fff", border: "1.5px solid #e8e8e8", borderRadius: 12, overflow: "hidden" }}>
                    {/* Header calculista */}
                    <div style={{ padding: "12px 14px", background: calc === "Sin asignar" ? "#f8f8f8" : "#0a0a0a", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{ width: 30, height: 30, borderRadius: "50%", background: calc === "Sin asignar" ? "#ddd" : "#fff", color: calc === "Sin asignar" ? "#aaa" : "#111", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800 }}>
                          {calc[0].toUpperCase()}
                        </div>
                        <span style={{ fontSize: 13, fontWeight: 700, color: calc === "Sin asignar" ? "#888" : "#fff" }}>{calc}</span>
                      </div>
                      <div style={{ display: "flex", gap: 6 }}>
                        <span style={{ fontSize: 11, background: "rgba(255,255,255,0.15)", color: calc === "Sin asignar" ? "#888" : "#fff", borderRadius: 20, padding: "2px 8px", fontWeight: 700 }}>{proyCalc.length} proyectos</span>
                      </div>
                    </div>

                    {/* Alertas */}
                    {(venc > 0 || prox > 0) && (
                      <div style={{ padding: "6px 14px", background: venc > 0 ? "#fef2f2" : "#fffbeb", display: "flex", gap: 12, fontSize: 11 }}>
                        {venc > 0 && <span style={{ color: "#c0392b", fontWeight: 700 }}>🔴 {venc} vencido{venc > 1 ? "s" : ""}</span>}
                        {prox > 0 && <span style={{ color: "#f59e0b", fontWeight: 700 }}>🟡 {prox} próximo{prox > 1 ? "s" : ""}</span>}
                      </div>
                    )}

                    {/* Lista proyectos */}
                    <div style={{ padding: "8px 10px", maxHeight: 400, overflow: "auto" }}>
                      {proyCalc.map(p => (
                        <TarjetaProyecto key={p.id} p={p} onClick={() => setModalFechas(p)} />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* ── VISTA SEMANA / MES ── */}
          {(vista === "semana" || vista === "mes") && (
            <div>
              {/* Navegación */}
              <div style={{ display: "flex", gap: 8, marginBottom: 12, alignItems: "center" }}>
                <button onClick={() => setPeriodoOffset(p => p - 1)} style={{ padding: "5px 12px", background: "#f0f0f0", border: "none", borderRadius: 7, cursor: "pointer", fontSize: 14 }}>←</button>
                <button onClick={() => setPeriodoOffset(0)} style={{ padding: "5px 12px", background: "#f0f0f0", border: "none", borderRadius: 7, cursor: "pointer", fontSize: 12, fontWeight: 600 }}>Hoy</button>
                <button onClick={() => setPeriodoOffset(p => p + 1)} style={{ padding: "5px 12px", background: "#f0f0f0", border: "none", borderRadius: 7, cursor: "pointer", fontSize: 14 }}>→</button>
                <span style={{ fontSize: 12, color: "#888", marginLeft: 4 }}>
                  {vista === "semana" ? `${periodos.length} semanas` : `${periodos.length} meses`}
                </span>
              </div>

              {/* Tabla Gantt */}
              <div style={{ overflowX: "auto" }}>
                <table style={{ borderCollapse: "collapse", minWidth: "100%", fontSize: 12 }}>
                  <thead>
                    <tr>
                      <th style={{ padding: "8px 12px", textAlign: "left", background: "#f8f8f8", border: "1px solid #e8e8e8", minWidth: 200, position: "sticky", left: 0, zIndex: 2 }}>
                        Calculista / Proyecto
                      </th>
                      {periodos.map(p => (
                        <th key={p} style={{ padding: "6px 8px", textAlign: "center", background: esPeriodoActual(p) ? "#eff6ff" : "#f8f8f8", border: "1px solid #e8e8e8", minWidth: vista === "semana" ? 100 : 120, fontWeight: esPeriodoActual(p) ? 800 : 500, color: esPeriodoActual(p) ? "#3b82f6" : "#888", fontSize: 10, whiteSpace: "nowrap" }}>
                          {vista === "semana" ? fmtSemana(p) : fmtMes(p)}
                          {esPeriodoActual(p) && <div style={{ fontSize: 8, color: "#3b82f6", fontWeight: 700 }}>HOY</div>}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {calculistas.map(calc => {
                      const proyCalc = porCalculista[calc] || [];
                      return (
                        <React.Fragment key={calc}>
                          {/* Fila header calculista */}
                          <tr>
                            <td colSpan={periodos.length + 1} style={{ padding: "6px 12px", background: calc === "Sin asignar" ? "#f5f5f5" : "#0a0a0a", color: calc === "Sin asignar" ? "#888" : "#fff", fontWeight: 700, fontSize: 12, position: "sticky", left: 0 }}>
                              {calc === "Sin asignar" ? "⚠️ Sin asignar" : `👤 ${calc}`}
                              <span style={{ fontWeight: 400, opacity: 0.6, marginLeft: 8 }}>({proyCalc.length} proyectos)</span>
                            </td>
                          </tr>
                          {/* Filas proyectos */}
                          {proyCalc.map(p => {
                            const dr = diasRestantes(p.fecha_entrega_plan);
                            const estado = ESTADO_COLOR[p.estado] || ESTADO_COLOR.onboarding;
                            const sinF = !p.fecha_inicio_real && !p.fecha_entrega_plan;
                            return (
                              <tr key={p.id} onClick={() => setModalFechas(p)} style={{ cursor: "pointer" }}
                                onMouseEnter={e => e.currentTarget.style.background = "#f8f9ff"}
                                onMouseLeave={e => e.currentTarget.style.background = ""}>
                                {/* Columna nombre */}
                                <td style={{ padding: "6px 12px", border: "1px solid #f0f0f0", position: "sticky", left: 0, background: "inherit", zIndex: 1, minWidth: 200 }}>
                                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                    <div style={{ width: 3, height: 20, borderRadius: 2, background: estado.color, flexShrink: 0 }} />
                                    <div style={{ minWidth: 0 }}>
                                      <div style={{ fontSize: 11, fontWeight: 600, color: "#111", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 160 }}>
                                        <span style={{ fontSize: 9, color: "#aaa", marginRight: 4 }}>{codigoProyecto(p)}</span>
                                        {p.descripcion || "—"}
                                      </div>
                                      <div style={{ fontSize: 9, color: dr !== null && dr < 0 ? "#c0392b" : dr !== null && dr <= 7 ? "#f59e0b" : "#bbb", fontWeight: dr !== null && dr <= 7 ? 700 : 400 }}>
                                        {sinF ? "📅 sin fechas — click para planificar" : dr !== null ? (dr < 0 ? `⚠️ ${Math.abs(dr)}d vencido` : `${dr}d para entrega`) : ""}
                                      </div>
                                    </div>
                                  </div>
                                </td>
                                {/* Celdas períodos */}
                                {periodos.map(per => {
                                  const enPeriodo = proyectoEnPeriodo(p, per);
                                  const esInicio = vista === "semana"
                                    ? p.fecha_inicio_real === per || (p.fecha_inicio_real > per && p.fecha_inicio_real <= addDias(per, 6))
                                    : p.fecha_inicio_real?.slice(0, 7) === per;
                                  const esFin = vista === "semana"
                                    ? p.fecha_entrega_plan === per || (p.fecha_entrega_plan > per && p.fecha_entrega_plan <= addDias(per, 6))
                                    : p.fecha_entrega_plan?.slice(0, 7) === per;
                                  return (
                                    <td key={per} style={{ border: "1px solid #f0f0f0", padding: 2, textAlign: "center", background: esPeriodoActual(per) ? "#f8faff" : "transparent" }}>
                                      {enPeriodo && (
                                        <div style={{
                                          height: 20, background: estado.color + (esFin && dr !== null && dr < 0 ? "" : "30"),
                                          background: esFin && dr !== null && dr < 0 ? "#c0392b" : esFin && dr !== null && dr <= 5 ? "#f59e0b" : estado.color + "30",
                                          borderRadius: esInicio && esFin ? 6 : esInicio ? "6px 0 0 6px" : esFin ? "0 6px 6px 0" : 0,
                                          borderLeft: esInicio ? `2px solid ${estado.color}` : "none",
                                          borderRight: esFin ? `2px solid ${dr !== null && dr < 0 ? "#c0392b" : dr !== null && dr <= 5 ? "#f59e0b" : estado.color}` : "none",
                                          display: "flex", alignItems: "center", justifyContent: "center",
                                        }}>
                                          {esFin && <span style={{ fontSize: 9, fontWeight: 700, color: dr !== null && dr < 0 ? "#c0392b" : "#555" }}>{dr !== null && dr < 0 ? "⚠️" : "🏁"}</span>}
                                        </div>
                                      )}
                                    </td>
                                  );
                                })}
                              </tr>
                            );
                          })}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Leyenda */}
              <div style={{ display: "flex", gap: 14, marginTop: 10, fontSize: 11, color: "#888", flexWrap: "wrap" }}>
                <span>Click en cualquier fila para planificar fechas</span>
                <span>🏁 = fecha de entrega</span>
                <span>⚠️ = vencido</span>
                {Object.entries(ESTADO_COLOR).map(([k, v]) => (
                  <span key={k} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <span style={{ width: 12, height: 12, background: v.color + "40", border: `2px solid ${v.color}`, borderRadius: 3, display: "inline-block" }} />
                    {v.label}
                  </span>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Modal fechas */}
      {modalFechas && (
        <ModalFechas
          proyecto={modalFechas}
          onClose={() => setModalFechas(null)}
          onGuardar={() => {
            setModalFechas(null);
            setMsg("✓ Planificación actualizada");
            setTimeout(() => setMsg(""), 2500);
            cargar();
          }}
        />
      )}
    </div>
  );
}
