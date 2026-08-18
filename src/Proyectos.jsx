import React, { useEffect, useState, useCallback } from "react";
import { supabase } from "./supabase.js";
import Combobox from "./Combobox.jsx";

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
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) throw new Error(data?.message || data?.error || `Error ${res.status}`);
  return data;
}

const ESTADOS = [
  { v: "onboarding", label: "Onboarding", color: "#f59e0b", bg: "#fffbeb", border: "#fde68a" },
  { v: "activo",     label: "Activo",     color: "#3b82f6", bg: "#eff6ff", border: "#bfdbfe" },
  { v: "revision",   label: "Revisión",   color: "#6366f1", bg: "#ede9fe", border: "#c4b5fd" },
];

const TIPOS_OBRA = ["Steel Frame", "Wood Frame", "Hormigón", "Panel SIP", "Metálica", "Mixta"];
const CHECKLIST_DEFAULTS = ["Anteproyecto", "Memoria de cálculo", "Cómputo", "Para entrega"];

const S = {
  inp: { width: "100%", padding: "8px 12px", border: "1.5px solid #e0e0e0", borderRadius: 8, fontSize: 13, boxSizing: "border-box", background: "#fff", fontFamily: "inherit" },
  lbl: { fontSize: 10, color: "#aaa", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 3, display: "block" },
  btn: { padding: "9px 20px", background: "#0a0a0a", color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer" },
  btnSm: { padding: "5px 12px", background: "#f0f0f0", color: "#333", border: "1.5px solid #e0e0e0", borderRadius: 6, fontSize: 11, cursor: "pointer", fontWeight: 600 },
  btnGreen: { padding: "5px 12px", background: "#f0fdf4", color: "#1a8a5e", border: "1.5px solid #1a8a5e", borderRadius: 6, fontSize: 11, cursor: "pointer", fontWeight: 700 },
};

function diasEntre(a, b) {
  if (!a || !b) return null;
  return Math.round((new Date(b) - new Date(a)) / 86400000);
}

function fmtFecha(d) {
  if (!d) return "—";
  return new Date(d + "T12:00").toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "2-digit" });
}

function EstadoChip({ estado }) {
  const e = ESTADOS.find(x => x.v === estado) || ESTADOS[0];
  return <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20, background: e.bg, color: e.color, border: `1px solid ${e.color}40` }}>{e.label}</span>;
}

function cuotasDesdeModalidad(modalidad, monto) {
  if (!monto || !modalidad) return [];
  const m = parseFloat(monto);
  if (modalidad === "50_50") return [
    { label: "50% Anticipo", monto: Math.round(m * 0.5) },
    { label: "50% Contra entrega", monto: Math.round(m * 0.5) },
  ];
  if (modalidad === "25_50_25") return [
    { label: "25% Anticipo", monto: Math.round(m * 0.25) },
    { label: "50% Anteproyecto", monto: Math.round(m * 0.5) },
    { label: "25% Contra entrega", monto: Math.round(m * 0.25) },
  ];
  return [];
}

/* ─── Indicadores del proyecto ─── */
function IndicadoresProyecto({ p, presupuesto }) {
  const diasAprobacion = presupuesto ? diasEntre(presupuesto.fecha_emision, presupuesto.fecha_aprobacion) : null;
  const diasEjecucion = diasEntre(p.fecha_inicio_real, p.fecha_entrega_real || new Date().toISOString().slice(0,10));
  const diasEstimados = diasEntre(p.fecha_inicio_real, p.fecha_entrega_plan);
  const desvio = diasEstimados && diasEjecucion ? diasEjecucion - diasEstimados : null;

  const cuotas = presupuesto ? cuotasDesdeModalidad(presupuesto.forma_pago, presupuesto.monto) : [];
  const moneda = presupuesto?.moneda === "USD" ? "U$S" : "$";

  if (!presupuesto && !p.fecha_inicio_real) return null;

  return (
    <div style={{ background: "#f8f8f8", borderRadius: 10, padding: "12px 14px", marginTop: 8, fontSize: 12 }}>
      <div style={{ fontWeight: 700, color: "#555", fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 10 }}>Indicadores</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10 }}>

        {diasAprobacion !== null && (
          <div style={{ background: "#fff", borderRadius: 8, padding: "8px 12px" }}>
            <div style={{ fontSize: 18, fontWeight: 900, color: diasAprobacion <= 7 ? "#1a8a5e" : diasAprobacion <= 30 ? "#f59e0b" : "#c0392b" }}>{diasAprobacion}d</div>
            <div style={{ fontSize: 10, color: "#aaa" }}>Ciclo comercial</div>
          </div>
        )}

        {p.fecha_inicio_real && (
          <div style={{ background: "#fff", borderRadius: 8, padding: "8px 12px" }}>
            <div style={{ fontSize: 18, fontWeight: 900, color: desvio !== null && desvio > 0 ? "#c0392b" : "#3b82f6" }}>
              {diasEjecucion !== null ? `${diasEjecucion}d` : "—"}
            </div>
            <div style={{ fontSize: 10, color: "#aaa" }}>Días en ejecución</div>
            {diasEstimados && <div style={{ fontSize: 10, color: "#bbb" }}>Est: {diasEstimados}d {desvio !== null && <span style={{ color: desvio > 0 ? "#c0392b" : "#1a8a5e" }}>({desvio > 0 ? "+" : ""}{desvio}d)</span>}</div>}
          </div>
        )}

        {cuotas.length > 0 && cuotas.map((c, i) => (
          <div key={i} style={{ background: "#fff", borderRadius: 8, padding: "8px 12px" }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: "#111", fontFamily: "monospace" }}>{moneda}{c.monto.toLocaleString("es-AR")}</div>
            <div style={{ fontSize: 10, color: "#aaa" }}>{c.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Card de proyecto ─── */
function CardProyecto({ p, presupuesto, onClick }) {
  const pct = p.checklist_total > 0 ? Math.round((p.checklist_ok / p.checklist_total) * 100) : null;
  const estado = ESTADOS.find(e => e.v === p.estado) || ESTADOS[0];

  return (
    <div style={{ background: "#fff", border: "1.5px solid #e8e8e8", borderRadius: 12, overflow: "hidden" }}>
      <div onClick={onClick} style={{ padding: "12px 16px", cursor: "pointer", display: "grid", gridTemplateColumns: "80px 1fr auto", gap: 12, alignItems: "center" }}>
        <div>
          <div style={{ fontFamily: "monospace", fontSize: 12, fontWeight: 700, color: "#555" }}>{p.codigo || p.numero_proyecto || "—"}</div>
          {p.fecha_entrega_plan && <div style={{ fontSize: 10, color: "#bbb", marginTop: 2 }}>📅 {fmtFecha(p.fecha_entrega_plan)}</div>}
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: "#111", marginBottom: 3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.descripcion || "Sin descripción"}</div>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            {p.cliente && <span style={{ fontSize: 12, color: "#888" }}>{p.cliente}</span>}
            {p.encargado && <span style={{ fontSize: 11, background: "#f0f0f0", borderRadius: 4, padding: "1px 7px" }}>👤 {p.encargado}</span>}
            {p.tipo_obra && <span style={{ fontSize: 11, background: "#eff6ff", borderRadius: 4, padding: "1px 7px", color: "#3b82f6" }}>{p.tipo_obra}</span>}
            {p.superficie && <span style={{ fontSize: 11, color: "#aaa" }}>{p.superficie}m²</span>}
          </div>
          {pct !== null && (
            <div style={{ marginTop: 6, display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ flex: 1, height: 3, background: "#f0f0f0", borderRadius: 2, overflow: "hidden" }}>
                <div style={{ width: `${pct}%`, height: "100%", background: pct === 100 ? "#1a8a5e" : "#3b82f6", borderRadius: 2 }} />
              </div>
              <span style={{ fontSize: 10, color: "#aaa" }}>{pct}%</span>
            </div>
          )}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: "flex-end" }}>
          <EstadoChip estado={p.estado} />
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap", justifyContent: "flex-end" }}>
            {p.anticipo && <span style={{ fontSize: 9, color: "#1a8a5e", fontWeight: 700 }}>💰</span>}
            {p.proyecto_ok && <span style={{ fontSize: 9, color: "#1a8a5e", fontWeight: 700 }}>✅</span>}
            {p.cobrado && <span style={{ fontSize: 9, color: "#888", fontWeight: 700 }}>✓$</span>}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Panel de tablero split-panel ─── */
function PanelChecklist({ proyectoId, proyecto, onClose, perfil }) {
  const esAdmin = perfil?.rol === "admin";
  const [checklists, setChecklists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [itemSel, setItemSel] = useState(null);
  const [mensajes, setMensajes] = useState([]);
  const [nuevoMsg, setNuevoMsg] = useState("");
  const [nuevoNombre, setNuevoNombre] = useState("");
  const [nuevaTarea, setNuevaTarea] = useState({});
  const [saving, setSaving] = useState(false);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const msgEndRef = React.useRef(null);
  const inputMsgRef = React.useRef(null);

  const SECCIONES_DEFAULT = {
    "01 - Diagnóstico": ["Formulario enviado al arquitecto/ingeniero", "Formulario recibido completo"],
    "02 - Anteproyecto": ["Modelo CYPECAD", "Anteproyecto en AutoCAD", "Anteproyecto en SketchUp"],
    "03 - Proyecto": ["Modelo estructural CYPECAD", "Memoria de cálculo", "Planillas de armadura"],
    "04 - Legajo final": [
      "05-A Proyecto en AutoCAD",
      "05-B Proyecto en 3D (SketchUp)",
      "05-C Resumen de materiales",
      "05-D Carpeta completa en PDF",
    ],
  };

  // Fecha entrega del proyecto
  const fechaEntrega = proyecto?.fecha_entrega_plan;
  const diasRestantes = fechaEntrega
    ? Math.ceil((new Date(fechaEntrega + "T12:00") - new Date()) / 86400000)
    : null;

  const cargar = useCallback(async () => {
    setLoading(true);
    const [cls, tareas] = await Promise.all([
      api(`/proyecto_checklists?proyecto_id=eq.${proyectoId}&order=orden.asc`),
      api(`/proyecto_tareas?proyecto_id=eq.${proyectoId}&order=orden.asc`),
    ]);
    const map = {};
    (Array.isArray(tareas) ? tareas : []).forEach(t => {
      if (!map[t.checklist_id]) map[t.checklist_id] = [];
      map[t.checklist_id].push(t);
    });
    const cls2 = (Array.isArray(cls) ? cls : []).map(cl => ({ ...cl, tareas: map[cl.id] || [] }));
    setChecklists(cls2);
    if (itemSel) {
      const updated = cls2.flatMap(c => c.tareas).find(t => t.id === itemSel.id);
      if (updated) setItemSel(updated);
    }
    setLoading(false);
  }, [proyectoId]);

  useEffect(() => { cargar(); }, [cargar]);

  async function cargarMensajes(tareaId) {
    setLoadingMsgs(true);
    const msgs = await api(`/tarea_mensajes?tarea_id=eq.${tareaId}&order=created_at.asc`).catch(() => []);
    setMensajes(Array.isArray(msgs) ? msgs : []);
    setLoadingMsgs(false);
    setTimeout(() => msgEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
  }

  async function seleccionar(tarea) {
    setItemSel(tarea);
    setNuevoMsg("");
    await cargarMensajes(tarea.id);
    setTimeout(() => inputMsgRef.current?.focus(), 150);
  }

  async function crearChecklist(nombre) {
    const n = nombre || nuevoNombre.trim();
    if (!n) return;
    setSaving(true);
    const res = await api("/proyecto_checklists", { method: "POST", body: JSON.stringify({ proyecto_id: proyectoId, nombre: n, orden: checklists.length }) });
    const nuevoId = Array.isArray(res) ? res[0]?.id : res?.id;
    const items = SECCIONES_DEFAULT[n] || [];
    if (nuevoId) {
      for (let i = 0; i < items.length; i++) {
        await api("/proyecto_tareas", { method: "POST", body: JSON.stringify({ checklist_id: nuevoId, proyecto_id: proyectoId, texto: items[i], orden: i }) });
      }
    }
    setNuevoNombre("");
    await cargar();
    setSaving(false);
  }

  async function crearTarea(checklistId) {
    const texto = nuevaTarea[checklistId]?.trim();
    if (!texto) return;
    const cl = checklists.find(c => c.id === checklistId);
    setSaving(true);
    await api("/proyecto_tareas", { method: "POST", body: JSON.stringify({
      checklist_id: checklistId, proyecto_id: proyectoId, texto,
      orden: cl?.tareas?.length || 0,
      pendiente_aprobacion: !esAdmin,
    })});
    setNuevaTarea(p => ({ ...p, [checklistId]: "" }));
    await cargar();
    setSaving(false);
  }

  async function actualizarTarea(tareaId, campos) {
    await api(`/proyecto_tareas?id=eq.${tareaId}`, { method: "PATCH", body: JSON.stringify(campos) });
    await cargar();
  }

  async function toggleCompletada(tarea, e) {
    e?.stopPropagation();
    const completada = !tarea.completada;
    await actualizarTarea(tarea.id, {
      completada, completada_at: completada ? new Date().toISOString() : null,
      completada_por: completada ? (perfil?.nombre || "") : null,
    });
  }

  async function toggleAprobada(tarea, e) {
    e?.stopPropagation();
    if (!esAdmin) return;
    const aprobada = !tarea.aprobada;
    await actualizarTarea(tarea.id, {
      aprobada, aprobada_por: aprobada ? (perfil?.nombre || "Admin") : null,
      aprobada_at: aprobada ? new Date().toISOString() : null, pendiente_aprobacion: false,
    });
  }

  async function enviarMensaje() {
    if (!nuevoMsg.trim() || !itemSel) return;
    const msg = nuevoMsg.trim();
    setNuevoMsg("");
    await api("/tarea_mensajes", { method: "POST", body: JSON.stringify({
      tarea_id: itemSel.id, proyecto_id: proyectoId,
      autor: perfil?.nombre || "Usuario", rol: perfil?.rol || "calculista", mensaje: msg,
    })});
    await cargarMensajes(itemSel.id);
  }

  async function subirArchivo(file) {
    if (!itemSel || !file) return;
    const path = `proyectos/${proyectoId}/tareas/${itemSel.id}/${Date.now()}_${file.name}`;
    const { error } = await supabase.storage.from("npl-obras").upload(path, file, { upsert: true });
    if (error) { alert("Error: " + error.message); return; }
    const { data: { publicUrl } } = supabase.storage.from("npl-obras").getPublicUrl(path);
    await api("/tarea_adjuntos", { method: "POST", body: JSON.stringify({
      tarea_id: itemSel.id, proyecto_id: proyectoId,
      nombre: file.name, url: publicUrl, tipo: file.type, tamanio: file.size,
      subido_por: perfil?.nombre || "",
    })});
    await cargar();
  }

  async function eliminarChecklist(id, e) {
    e.stopPropagation();
    if (!confirm("¿Eliminar esta sección?")) return;
    if (checklists.find(c => c.id === id)?.tareas.find(t => t.id === itemSel?.id)) setItemSel(null);
    await api(`/proyecto_checklists?id=eq.${id}`, { method: "DELETE" });
    await cargar();
  }

  async function eliminarTarea(id, e) {
    e.stopPropagation();
    if (!confirm("¿Eliminar?")) return;
    if (itemSel?.id === id) setItemSel(null);
    await api(`/proyecto_tareas?id=eq.${id}`, { method: "DELETE" });
    await cargar();
  }

  const todasTareas = checklists.flatMap(c => c.tareas);
  const total = todasTareas.filter(t => !t.pendiente_aprobacion).length;
  const completadas = todasTareas.filter(t => t.completada).length;
  const aprobadas = todasTareas.filter(t => t.aprobada).length;
  const pct = total > 0 ? Math.round(aprobadas / total * 100) : 0;

  // Color días restantes
  const colorDias = diasRestantes === null ? "#aaa" : diasRestantes < 0 ? "#c0392b" : diasRestantes <= 7 ? "#c0392b" : diasRestantes <= 14 ? "#f59e0b" : "#1a8a5e";

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 12 }}>
      <div style={{ background: "#fff", width: "min(1080px, 100%)", height: "94vh", borderRadius: 16, overflow: "hidden", display: "flex", flexDirection: "column", boxShadow: "0 32px 80px rgba(0,0,0,0.4)" }}>

        {/* ── Header ── */}
        <div style={{ padding: "12px 20px", borderBottom: "1.5px solid #f0f0f0", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap" }}>
            <div>
              <div style={{ fontSize: 11, color: "#aaa", marginBottom: 1 }}>Tablero del proyecto</div>
              <div style={{ fontSize: 15, fontWeight: 800, color: "#111" }}>{proyecto?.descripcion}</div>
            </div>

            {/* Fecha entrega — muy visual */}
            {fechaEntrega && (
              <div style={{ background: diasRestantes !== null && diasRestantes < 0 ? "#fef2f2" : diasRestantes !== null && diasRestantes <= 7 ? "#fffbeb" : "#f0fdf4", borderRadius: 10, padding: "6px 14px", border: `1.5px solid ${colorDias}30`, textAlign: "center" }}>
                <div style={{ fontSize: 22, fontWeight: 900, color: colorDias, lineHeight: 1, fontFamily: "monospace" }}>
                  {diasRestantes === null ? "—" : diasRestantes < 0 ? `${Math.abs(diasRestantes)}d` : `${diasRestantes}d`}
                </div>
                <div style={{ fontSize: 10, color: colorDias, fontWeight: 700 }}>
                  {diasRestantes === null ? "sin fecha" : diasRestantes < 0 ? "VENCIDO" : diasRestantes === 0 ? "HOY" : "para entrega"}
                </div>
                <div style={{ fontSize: 10, color: "#aaa", marginTop: 1 }}>{fmtFecha(fechaEntrega)}</div>
              </div>
            )}

            {/* Progreso */}
            {total > 0 && (
              <div style={{ minWidth: 140 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 4 }}>
                  <span style={{ color: "#3b82f6" }}>✓ {completadas} completadas</span>
                  <span style={{ color: "#1a8a5e", fontWeight: 700 }}>✅ {pct}%</span>
                </div>
                <div style={{ height: 6, background: "#f0f0f0", borderRadius: 3, overflow: "hidden" }}>
                  <div style={{ width: `${Math.round(completadas/total*100)}%`, height: "100%", background: "#3b82f640", borderRadius: 3 }} />
                </div>
                <div style={{ height: 3, background: "transparent", borderRadius: 3, overflow: "hidden", marginTop: 2 }}>
                  <div style={{ width: `${pct}%`, height: "100%", background: "#1a8a5e", borderRadius: 3, transition: "width 0.4s" }} />
                </div>
              </div>
            )}
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 22, cursor: "pointer", color: "#aaa", padding: 4 }}>✕</button>
        </div>

        {/* ── Body split ── */}
        <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>

          {/* ── Panel izquierdo ── */}
          <div style={{ width: 320, flexShrink: 0, borderRight: "1.5px solid #f0f0f0", overflow: "auto", background: "#fafafa" }}>
            {loading ? <p style={{ color: "#aaa", textAlign: "center", padding: 40 }}>Cargando…</p> : (
              <div style={{ padding: "12px 10px" }}>
                {checklists.map(cl => {
                  const ok = cl.tareas.filter(t => t.aprobada).length;
                  const tot = cl.tareas.filter(t => !t.pendiente_aprobacion).length;
                  const pctSec = tot > 0 ? Math.round(ok / tot * 100) : 0;
                  return (
                    <div key={cl.id} style={{ marginBottom: 16 }}>
                      {/* Sección header */}
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0 6px", marginBottom: 6 }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
                            <span style={{ fontSize: 11, fontWeight: 800, color: "#333", textTransform: "uppercase", letterSpacing: 0.5 }}>{cl.nombre}</span>
                            <span style={{ fontSize: 10, color: ok === tot && tot > 0 ? "#1a8a5e" : "#aaa", fontWeight: 700 }}>{ok}/{tot}</span>
                          </div>
                          {tot > 0 && (
                            <div style={{ height: 3, background: "#e8e8e8", borderRadius: 2, overflow: "hidden" }}>
                              <div style={{ width: `${pctSec}%`, height: "100%", background: pctSec === 100 ? "#1a8a5e" : "#3b82f6", transition: "width 0.3s" }} />
                            </div>
                          )}
                        </div>
                        {esAdmin && <button onClick={e => eliminarChecklist(cl.id, e)} style={{ background: "none", border: "none", cursor: "pointer", color: "#ddd", fontSize: 13, padding: "0 4px", marginLeft: 6 }}>✕</button>}
                      </div>

                      {/* Items */}
                      {cl.tareas.map(t => {
                        const sel = itemSel?.id === t.id;
                        return (
                          <div key={t.id} onClick={() => seleccionar(t)}
                            style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 8px", borderRadius: 8, marginBottom: 1, cursor: "pointer",
                              background: sel ? "#eff6ff" : "#fff", border: `1.5px solid ${sel ? "#3b82f6" : "transparent"}`,
                              transition: "all 0.1s" }}
                            onMouseEnter={e => { if (!sel) e.currentTarget.style.background = "#f4f4f4"; }}
                            onMouseLeave={e => { if (!sel) e.currentTarget.style.background = "#fff"; }}>

                            {/* Check 1: completada */}
                            <div onClick={e => toggleCompletada(t, e)} title="Completado"
                              style={{ width: 16, height: 16, borderRadius: 4, border: `2px solid ${t.completada ? "#3b82f6" : "#d0d0d0"}`,
                                background: t.completada ? "#3b82f6" : "transparent", flexShrink: 0,
                                display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.15s" }}>
                              {t.completada && <span style={{ color: "#fff", fontSize: 10, fontWeight: 800 }}>✓</span>}
                            </div>
                            {/* Check 2: aprobada */}
                            <div onClick={e => toggleAprobada(t, e)} title={esAdmin ? "Aprobar" : "Solo admin"}
                              style={{ width: 16, height: 16, borderRadius: 4, border: `2px solid ${t.aprobada ? "#1a8a5e" : "#d0d0d0"}`,
                                background: t.aprobada ? "#1a8a5e" : "transparent", flexShrink: 0,
                                display: "flex", alignItems: "center", justifyContent: "center",
                                cursor: esAdmin ? "pointer" : "default", transition: "all 0.15s" }}>
                              {t.aprobada && <span style={{ color: "#fff", fontSize: 10, fontWeight: 800 }}>✓</span>}
                            </div>

                            <span style={{ flex: 1, fontSize: 12, color: t.aprobada ? "#1a8a5e" : t.completada ? "#3b82f6" : "#333",
                              fontWeight: t.aprobada ? 600 : 400, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                              textDecoration: t.aprobada ? "none" : "none" }}>
                              {t.texto}
                            </span>

                            {t.pendiente_aprobacion && <span style={{ fontSize: 9, background: "#fef9c3", color: "#c4781a", borderRadius: 3, padding: "1px 4px", fontWeight: 700, flexShrink: 0 }}>⏳</span>}
                            {t.fecha_entrega_parcial && <span style={{ fontSize: 9, color: "#aaa", flexShrink: 0 }}>📅</span>}
                          </div>
                        );
                      })}

                      {/* Nueva tarea */}
                      <div style={{ display: "flex", gap: 4, padding: "4px 6px", marginTop: 2 }}>
                        <input value={nuevaTarea[cl.id] || ""} onChange={e => setNuevaTarea(p => ({ ...p, [cl.id]: e.target.value }))}
                          onKeyDown={e => e.key === "Enter" && crearTarea(cl.id)}
                          style={{ flex: 1, padding: "4px 8px", border: "1.5px solid #e0e0e0", borderRadius: 6, fontSize: 11, fontFamily: "inherit", background: "#f0f0f0" }}
                          placeholder={esAdmin ? "+ Nueva tarea…" : "+ Proponer tarea…"} />
                        <button onClick={() => crearTarea(cl.id)} style={{ width: 26, height: 26, background: "#0a0a0a", color: "#fff", border: "none", borderRadius: 6, fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>+</button>
                      </div>
                    </div>
                  );
                })}

                {/* Agregar sección */}
                <div style={{ background: "#fff", borderRadius: 10, padding: "10px", border: "1.5px dashed #e0e0e0", marginTop: 4 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: "#aaa", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>Agregar sección</div>
                  <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 6 }}>
                    {Object.keys(SECCIONES_DEFAULT).filter(n => !checklists.find(c => c.nombre === n)).map(n => (
                      <button key={n} onClick={() => crearChecklist(n)}
                        style={{ padding: "3px 8px", background: "#f0f0f0", color: "#555", border: "1px solid #e0e0e0", borderRadius: 5, fontSize: 10, cursor: "pointer", fontWeight: 600 }}>
                        {n} <span style={{ color: "#aaa" }}>({SECCIONES_DEFAULT[n].length})</span>
                      </button>
                    ))}
                  </div>
                  <div style={{ display: "flex", gap: 4 }}>
                    <input value={nuevoNombre} onChange={e => setNuevoNombre(e.target.value)}
                      onKeyDown={e => e.key === "Enter" && crearChecklist("")}
                      style={{ flex: 1, padding: "5px 8px", border: "1.5px solid #e0e0e0", borderRadius: 6, fontSize: 11, fontFamily: "inherit" }}
                      placeholder="Nombre personalizado…" />
                    <button onClick={() => crearChecklist("")} disabled={!nuevoNombre.trim() || saving}
                      style={{ padding: "5px 10px", background: "#0a0a0a", color: "#fff", border: "none", borderRadius: 6, fontSize: 11, cursor: "pointer" }}>+</button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ── Panel derecho ── */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", background: "#fff" }}>
            {!itemSel ? (
              <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 8 }}>
                <div style={{ fontSize: 36, opacity: 0.2 }}>📋</div>
                <div style={{ fontSize: 13, color: "#ccc", fontWeight: 600 }}>Seleccioná una tarea</div>
              </div>
            ) : (
              <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>

                {/* Item header */}
                <div style={{ padding: "16px 20px 12px", borderBottom: "1px solid #f0f0f0", flexShrink: 0 }}>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 10 }}>
                    {/* Checks grandes */}
                    <div style={{ display: "flex", gap: 8, marginTop: 2 }}>
                      <div style={{ textAlign: "center" }}>
                        <div onClick={e => toggleCompletada(itemSel, e)}
                          style={{ width: 28, height: 28, borderRadius: 7, border: `2.5px solid ${itemSel.completada ? "#3b82f6" : "#d0d0d0"}`,
                            background: itemSel.completada ? "#3b82f6" : "#fff", cursor: "pointer",
                            display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.15s" }}>
                          {itemSel.completada && <span style={{ color: "#fff", fontSize: 14, fontWeight: 800 }}>✓</span>}
                        </div>
                        <div style={{ fontSize: 9, color: "#aaa", marginTop: 2 }}>Hecho</div>
                      </div>
                      <div style={{ textAlign: "center" }}>
                        <div onClick={e => toggleAprobada(itemSel, e)}
                          style={{ width: 28, height: 28, borderRadius: 7, border: `2.5px solid ${itemSel.aprobada ? "#1a8a5e" : "#d0d0d0"}`,
                            background: itemSel.aprobada ? "#1a8a5e" : "#fff", cursor: esAdmin ? "pointer" : "default",
                            display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.15s",
                            opacity: !esAdmin ? 0.5 : 1 }}>
                          {itemSel.aprobada && <span style={{ color: "#fff", fontSize: 14, fontWeight: 800 }}>✓</span>}
                        </div>
                        <div style={{ fontSize: 9, color: "#aaa", marginTop: 2 }}>Aprobado</div>
                      </div>
                    </div>
                    <div style={{ flex: 1 }}>
                      <h3 style={{ margin: "0 0 4px", fontSize: 16, fontWeight: 700, color: itemSel.aprobada ? "#1a8a5e" : "#111", lineHeight: 1.3 }}>{itemSel.texto}</h3>
                      <div style={{ display: "flex", gap: 10, fontSize: 11, color: "#aaa", flexWrap: "wrap" }}>
                        {itemSel.completada_por && <span style={{ color: "#3b82f6" }}>✓ {itemSel.completada_por}</span>}
                        {itemSel.aprobada_por && <span style={{ color: "#1a8a5e" }}>✅ {itemSel.aprobada_por}</span>}
                        {itemSel.pendiente_aprobacion && esAdmin && (
                          <button onClick={() => actualizarTarea(itemSel.id, { pendiente_aprobacion: false })}
                            style={{ padding: "2px 10px", background: "#1a8a5e", color: "#fff", border: "none", borderRadius: 5, fontSize: 11, cursor: "pointer", fontWeight: 700 }}>
                            ✓ Aprobar creación
                          </button>
                        )}
                      </div>
                    </div>
                    {esAdmin && <button onClick={e => eliminarTarea(itemSel.id, e)} style={{ background: "none", border: "none", cursor: "pointer", color: "#ddd", fontSize: 16 }}>🗑</button>}
                  </div>

                  {/* Fecha + adjuntos */}
                  <div style={{ display: "flex", gap: 10, alignItems: "flex-end", flexWrap: "wrap" }}>
                    <div>
                      <div style={{ fontSize: 10, fontWeight: 700, color: "#aaa", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 3 }}>Fecha parcial</div>
                      <input type="date" key={itemSel.id + "_fecha"} defaultValue={itemSel.fecha_entrega_parcial || ""}
                        onBlur={e => actualizarTarea(itemSel.id, { fecha_entrega_parcial: e.target.value || null })}
                        style={{ padding: "5px 10px", border: "1.5px solid #e0e0e0", borderRadius: 7, fontSize: 12, fontFamily: "inherit" }} />
                    </div>
                    <label style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "5px 12px", background: "#f0f0f0", borderRadius: 7, cursor: "pointer", fontSize: 12, color: "#555", border: "1.5px solid #e0e0e0", marginBottom: 1 }}>
                      📎 Adjuntar
                      <input type="file" style={{ display: "none" }} onChange={e => e.target.files[0] && subirArchivo(e.target.files[0])} />
                    </label>
                    {itemSel.adjuntos?.map(a => (
                      <a key={a.id} href={a.url} target="_blank" rel="noreferrer"
                        style={{ fontSize: 11, padding: "5px 10px", background: "#eff6ff", color: "#3b82f6", borderRadius: 6, textDecoration: "none", border: "1px solid #bfdbfe" }}>
                        📎 {a.nombre}
                      </a>
                    ))}
                  </div>
                </div>

                {/* Descripción */}
                <div style={{ padding: "10px 20px", borderBottom: "1px solid #f0f0f0", flexShrink: 0 }}>
                  <textarea key={itemSel.id + "_desc"} defaultValue={itemSel.descripcion || ""}
                    onBlur={e => actualizarTarea(itemSel.id, { descripcion: e.target.value })}
                    style={{ width: "100%", padding: "8px 12px", border: "1.5px solid #e8e8e8", borderRadius: 8, fontSize: 13, resize: "none", boxSizing: "border-box", fontFamily: "inherit", lineHeight: 1.5, color: "#333" }}
                    rows={2} placeholder="📝 Descripción, notas técnicas, instrucciones…" />
                </div>

                {/* ── Comunicación ── */}
                <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", background: "#f8f9ff" }}>
                  {/* Header comunicación */}
                  <div style={{ padding: "8px 20px", borderBottom: "1px solid #e8e8e8", flexShrink: 0, display: "flex", alignItems: "center", gap: 8, background: "#fff" }}>
                    <span style={{ fontSize: 16 }}>💬</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: "#111" }}>Comunicación</span>
                    <span style={{ fontSize: 11, color: "#aaa" }}>— ida y vuelta entre calculista y NPL</span>
                    {mensajes.length > 0 && <span style={{ marginLeft: "auto", fontSize: 11, color: "#888", background: "#f0f0f0", padding: "2px 8px", borderRadius: 20 }}>{mensajes.length} mensajes</span>}
                  </div>

                  {/* Lista mensajes */}
                  <div style={{ flex: 1, overflow: "auto", padding: "12px 20px" }}>
                    {loadingMsgs ? (
                      <p style={{ color: "#aaa", fontSize: 12, textAlign: "center" }}>Cargando…</p>
                    ) : mensajes.length === 0 ? (
                      <div style={{ textAlign: "center", padding: 24 }}>
                        <div style={{ fontSize: 28, marginBottom: 6, opacity: 0.3 }}>💬</div>
                        <div style={{ fontSize: 12, color: "#ccc" }}>Sin mensajes aún. Escribí el primero.</div>
                      </div>
                    ) : mensajes.map((m, i) => {
                      const esPropio = m.autor === perfil?.nombre;
                      const esAdminMsg = m.rol === "admin";
                      return (
                        <div key={m.id} style={{ display: "flex", gap: 8, marginBottom: 10, flexDirection: esPropio ? "row-reverse" : "row" }}>
                          <div style={{ width: 30, height: 30, borderRadius: "50%", background: esAdminMsg ? "#0a0a0a" : "#6366f1", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800, flexShrink: 0 }}>
                            {(m.autor || "?")[0].toUpperCase()}
                          </div>
                          <div style={{ maxWidth: "72%", display: "flex", flexDirection: "column", alignItems: esPropio ? "flex-end" : "flex-start" }}>
                            <div style={{ display: "flex", gap: 6, alignItems: "baseline", marginBottom: 3 }}>
                              <span style={{ fontSize: 11, fontWeight: 700, color: esAdminMsg ? "#111" : "#6366f1" }}>{m.autor}</span>
                              <span style={{ fontSize: 10, color: "#bbb" }}>{new Date(m.created_at).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}</span>
                            </div>
                            <div style={{ fontSize: 13, color: "#333", lineHeight: 1.5, padding: "8px 12px", borderRadius: esPropio ? "12px 2px 12px 12px" : "2px 12px 12px 12px", background: esPropio ? (esAdminMsg ? "#0a0a0a" : "#6366f1") : "#fff", color: esPropio ? "#fff" : "#333", boxShadow: "0 1px 4px rgba(0,0,0,0.08)" }}>
                              {m.mensaje}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    <div ref={msgEndRef} />
                  </div>

                  {/* Input mensaje — siempre visible */}
                  <div style={{ padding: "10px 16px", borderTop: "1.5px solid #e8e8e8", background: "#fff", flexShrink: 0 }}>
                    <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
                      <div style={{ width: 28, height: 28, borderRadius: "50%", background: perfil?.rol === "admin" ? "#0a0a0a" : "#6366f1", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800, flexShrink: 0, marginBottom: 1 }}>
                        {(perfil?.nombre || "?")[0].toUpperCase()}
                      </div>
                      <div style={{ flex: 1, background: "#f8f8f8", borderRadius: 10, border: "1.5px solid #e0e0e0", display: "flex", alignItems: "center", gap: 6, padding: "6px 12px" }}>
                        <input ref={inputMsgRef} value={nuevoMsg} onChange={e => setNuevoMsg(e.target.value)}
                          onKeyDown={e => e.key === "Enter" && !e.shiftKey && enviarMensaje()}
                          style={{ flex: 1, border: "none", background: "transparent", fontSize: 13, fontFamily: "inherit", outline: "none", color: "#333" }}
                          placeholder="Escribí un mensaje… (Enter para enviar)" />
                        <button onClick={enviarMensaje} disabled={!nuevoMsg.trim()}
                          style={{ width: 28, height: 28, borderRadius: 8, background: nuevoMsg.trim() ? "#0a0a0a" : "#e0e0e0", color: nuevoMsg.trim() ? "#fff" : "#aaa", border: "none", cursor: nuevoMsg.trim() ? "pointer" : "default", fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.15s", flexShrink: 0 }}>→</button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Panel de honorarios ─── */
function PanelHonorarios({ proyecto, presupuesto, onClose, perfil, onActualizar }) {
  const [hon, setHon] = useState(null);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const esAdmin = perfil?.rol === "admin";
  const esCalculista = perfil?.rol === "calculista";

  useEffect(() => { cargar(); }, []);

  async function cargar() {
    const r = await api(`/proyecto_honorarios?proyecto_id=eq.${proyecto.id}`).catch(() => []);
    const h = Array.isArray(r) && r.length > 0 ? r[0] : null;
    setHon(h);
    const montoPres = presupuesto?.monto ? parseFloat(presupuesto.monto) : 0;
    setForm(h || {
      proyecto_id: proyecto.id,
      calculista_nombre: proyecto.encargado || "",
      monto_presupuesto: montoPres,
      porcentaje: 30,
      monto_honorario: montoPres > 0 ? Math.round(montoPres * 0.3) : 0,
      moneda: presupuesto?.moneda || "ARS",
      condicion: "Contra entrega del proyecto",
      estado: "pendiente",
    });
  }

  const montoHon = form.monto_presupuesto && form.porcentaje
    ? Math.round(parseFloat(form.monto_presupuesto) * parseFloat(form.porcentaje) / 100) : 0;

  async function guardar() {
    setSaving(true);
    try {
      const body = { ...form, monto_honorario: montoHon };
      if (hon?.id) {
        await api(`/proyecto_honorarios?id=eq.${hon.id}`, { method: "PATCH", body: JSON.stringify(body) });
      } else {
        await api("/proyecto_honorarios", { method: "POST", body: JSON.stringify(body) });
      }
      setMsg("✓ Guardado");
      setTimeout(() => setMsg(""), 2000);
      await cargar();
      onActualizar && onActualizar();
    } catch(e) { setMsg("❌ " + e.message); }
    setSaving(false);
  }

  async function aceptar() {
    if (!form.cbu) return setMsg("Cargá tu CBU antes de aceptar");
    setSaving(true);
    await api(`/proyecto_honorarios?id=eq.${hon.id}`, { method: "PATCH", body: JSON.stringify({ cbu: form.cbu, alias: form.alias, factura: form.factura, estado: "aceptado", aceptado_at: new Date().toISOString() }) });
    setMsg("✓ Propuesta aceptada");
    await cargar();
    setSaving(false);
  }

  async function marcarPagado() {
    setSaving(true);
    await api(`/proyecto_honorarios?id=eq.${hon.id}`, { method: "PATCH", body: JSON.stringify({ estado: "pagado", pagado_at: new Date().toISOString() }) });
    await cargar();
    setSaving(false);
  }

  const moneda = form.moneda === "USD" ? "U$S" : "$";
  const cuotas = presupuesto ? cuotasDesdeModalidad(presupuesto.forma_pago, presupuesto.monto) : [];

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div style={{ background: "#fff", borderRadius: 16, padding: 24, width: "min(520px, 100%)", maxHeight: "90vh", overflow: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 16, fontWeight: 800 }}>Honorarios</h2>
            <p style={{ margin: "2px 0 0", fontSize: 12, color: "#888" }}>{proyecto.descripcion}</p>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer" }}>✕</button>
        </div>

        {/* Cuotas del presupuesto — info financiera para admin */}
        {esAdmin && cuotas.length > 0 && (
          <div style={{ background: "#f8f8f8", borderRadius: 10, padding: 12, marginBottom: 16 }}>
            <div style={{ fontSize: 10, color: "#aaa", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 }}>Cobros según modalidad negociada</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {cuotas.map((c, i) => (
                <div key={i} style={{ background: "#fff", borderRadius: 8, padding: "8px 12px", flex: 1, minWidth: 100 }}>
                  <div style={{ fontSize: 14, fontWeight: 800, color: "#111", fontFamily: "monospace" }}>{presupuesto.moneda === "USD" ? "U$S" : "$"}{c.monto.toLocaleString("es-AR")}</div>
                  <div style={{ fontSize: 10, color: "#888" }}>{c.label}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {hon?.estado && (
          <div style={{ background: hon.estado === "pagado" ? "#f0fdf4" : hon.estado === "aceptado" ? "#eff6ff" : "#fffbeb", borderRadius: 8, padding: "8px 14px", marginBottom: 14, fontSize: 13, fontWeight: 700, color: hon.estado === "pagado" ? "#1a8a5e" : hon.estado === "aceptado" ? "#3b82f6" : "#c4781a" }}>
            {hon.estado === "pagado" ? "✓ Pagado" : hon.estado === "aceptado" ? "✓ Aceptado por el calculista" : "⏳ Pendiente de aceptación"}
          </div>
        )}

        {esAdmin && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div>
                <span style={S.lbl}>Calculista</span>
                <input value={form.calculista_nombre || ""} onChange={e => setForm(p => ({ ...p, calculista_nombre: e.target.value }))} style={S.inp} />
              </div>
              <div>
                <span style={S.lbl}>Monto presupuesto (ref.)</span>
                <input type="number" value={form.monto_presupuesto || ""} onChange={e => setForm(p => ({ ...p, monto_presupuesto: e.target.value }))} style={S.inp} />
              </div>
              <div>
                <span style={S.lbl}>% Honorario (máx 30%)</span>
                <input type="number" min="0" max="100" value={form.porcentaje || 30} onChange={e => setForm(p => ({ ...p, porcentaje: Math.min(100, parseFloat(e.target.value) || 0) }))} style={S.inp} />
              </div>
              <div>
                <div style={{ background: "#f0fdf4", borderRadius: 8, padding: "8px 12px", height: "100%", display: "flex", flexDirection: "column", justifyContent: "center" }}>
                  <div style={{ fontSize: 18, fontWeight: 900, color: "#1a8a5e", fontFamily: "monospace" }}>{moneda}{montoHon.toLocaleString("es-AR")}</div>
                  <div style={{ fontSize: 10, color: "#888" }}>Honorario calculado</div>
                </div>
              </div>
            </div>
            <div>
              <span style={S.lbl}>Condición</span>
              <input value={form.condicion || ""} onChange={e => setForm(p => ({ ...p, condicion: e.target.value }))} style={S.inp} />
            </div>
            <div>
              <span style={S.lbl}>Nota especial</span>
              <input value={form.condicion_especial || ""} onChange={e => setForm(p => ({ ...p, condicion_especial: e.target.value }))} style={S.inp} placeholder="Ej: 50% al iniciar, 50% al entregar" />
            </div>

            {/* Datos de cobro del calculista (readonly para admin) */}
            {hon?.cbu && (
              <div style={{ background: "#f0fdf4", borderRadius: 8, padding: "10px 14px", fontSize: 12 }}>
                <div style={{ fontWeight: 700, marginBottom: 4, color: "#1a8a5e" }}>Datos de cobro del calculista:</div>
                <div>CBU: <strong>{hon.cbu}</strong></div>
                {hon.alias && <div>Alias: <strong>{hon.alias}</strong></div>}
                {hon.factura && <div>✓ Emite factura</div>}
              </div>
            )}

            {msg && <div style={{ fontSize: 13, color: msg.startsWith("✓") ? "#1a8a5e" : "#c0392b", fontWeight: 600 }}>{msg}</div>}
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={guardar} disabled={saving} style={S.btn}>{saving ? "Guardando…" : "💾 Guardar"}</button>
              {hon?.estado === "aceptado" && <button onClick={marcarPagado} style={{ ...S.btn, background: "#1a8a5e" }}>✓ Pagado</button>}
            </div>
          </div>
        )}

        {esCalculista && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {hon ? (
              <>
                <div style={{ background: "#f8f8f8", borderRadius: 10, padding: 16, textAlign: "center" }}>
                  <div style={{ fontSize: 11, color: "#aaa", marginBottom: 4 }}>Tu honorario por este proyecto</div>
                  <div style={{ fontSize: 28, fontWeight: 900, color: "#111", fontFamily: "monospace" }}>{moneda}{hon.monto_honorario?.toLocaleString("es-AR") || "—"}</div>
                  <div style={{ fontSize: 12, color: "#888", marginTop: 6 }}>📋 {hon.condicion}</div>
                  {hon.condicion_especial && <div style={{ fontSize: 11, color: "#aaa", marginTop: 3 }}>{hon.condicion_especial}</div>}
                </div>
                <div>
                  <span style={S.lbl}>Tu CBU *</span>
                  <input value={form.cbu || ""} onChange={e => setForm(p => ({ ...p, cbu: e.target.value }))} style={S.inp} placeholder="Tu CBU para cobro" />
                </div>
                <div>
                  <span style={S.lbl}>Alias (opcional)</span>
                  <input value={form.alias || ""} onChange={e => setForm(p => ({ ...p, alias: e.target.value }))} style={S.inp} placeholder="alias.cbu" />
                </div>
                <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13, cursor: "pointer" }}>
                  <input type="checkbox" checked={form.factura || false} onChange={e => setForm(p => ({ ...p, factura: e.target.checked }))} style={{ accentColor: "#111" }} />
                  Emito factura
                </label>
                {msg && <div style={{ fontSize: 13, color: msg.startsWith("✓") ? "#1a8a5e" : "#c0392b", fontWeight: 600 }}>{msg}</div>}
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={guardar} style={{ ...S.btn, background: "#555" }}>{saving ? "…" : "💾 Guardar datos"}</button>
                  {hon.estado === "pendiente" && <button onClick={aceptar} disabled={saving} style={S.btn}>✅ Aceptar propuesta</button>}
                </div>
              </>
            ) : <p style={{ color: "#aaa", fontSize: 13 }}>El admin todavía no cargó la propuesta de honorarios.</p>}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Formulario nuevo calculista inline ─── */
function FormNuevoCalculista({ onCreado, onCancelar }) {
  const [form, setForm] = useState({ nombre: "", mail: "", nivel: "Ingeniero Calculista", disponible: true });
  const [saving, setSaving] = useState(false);

  async function crear() {
    if (!form.nombre || !form.mail) return;
    setSaving(true);
    const r = await api("/calculistas", { method: "POST", body: JSON.stringify(form) });
    const nuevo = Array.isArray(r) ? r[0] : r;
    onCreado(nuevo);
    setSaving(false);
  }

  return (
    <div style={{ background: "#f0fdf4", border: "1.5px solid #1a8a5e", borderRadius: 8, padding: 12, marginTop: 6 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: "#1a8a5e", marginBottom: 6 }}>Nuevo calculista</div>
      <div style={{ fontSize: 11, color: "#555", background: "#fff", borderRadius: 6, padding: "6px 10px", marginBottom: 8, border: "1px solid #e0e0e0" }}>
        ⚠️ Después de crear, recordá ir a <strong>Usuarios</strong> para enviarle la invitación de acceso al sistema.
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
        <input value={form.nombre} onChange={e => setForm(p => ({ ...p, nombre: e.target.value }))} style={{ ...S.inp, fontSize: 12 }} placeholder="Nombre *" />
        <input value={form.mail} onChange={e => setForm(p => ({ ...p, mail: e.target.value }))} style={{ ...S.inp, fontSize: 12 }} placeholder="Email *" />
        <select value={form.nivel} onChange={e => setForm(p => ({ ...p, nivel: e.target.value }))} style={{ ...S.inp, fontSize: 12 }}>
          {["Ingeniero Calculista", "Arquitecto", "Project Manager", "Director"].map(n => <option key={n}>{n}</option>)}
        </select>
      </div>
      <div style={{ display: "flex", gap: 6 }}>
        <button onClick={crear} disabled={saving || !form.nombre || !form.mail} style={{ ...S.btn, fontSize: 11, padding: "6px 12px" }}>
          {saving ? "…" : "Crear"}
        </button>
        <button onClick={onCancelar} style={S.btnSm}>Cancelar</button>
      </div>
    </div>
  );
}

/* ─── Modal editar proyecto ─── */
const ROLES_EQUIPO = [
  { value: "director",             label: "🎯 Director" },
  { value: "project_manager",      label: "📋 Project Manager" },
  { value: "ingeniero_calculista", label: "📐 Ingeniero Calculista" },
  { value: "arquitecto",           label: "🏛 Arquitecto" },
];

function ModalProyecto({ proyecto, onClose, onGuardar, perfil }) {
  const esNuevo = !proyecto?.id;
  const esAdmin = perfil?.rol === "admin";
  const [form, setForm] = useState({
    numero_proyecto:    proyecto?.numero_proyecto || "",
    descripcion:        proyecto?.descripcion || "",
    cliente:            proyecto?.cliente || "",
    cliente_id:         proyecto?.cliente_id || "",
    encargado:          proyecto?.encargado || "",
    presupuesto_id:     proyecto?.presupuesto_id || "",
    tipo_obra:          proyecto?.tipo_obra || "",
    superficie:         proyecto?.superficie || "",
    fecha_entrega_plan: proyecto?.fecha_entrega_plan || "",
    fecha_aprobacion:   proyecto?.fecha_aprobacion || "",
    monto_anticipo:     proyecto?.monto_anticipo || "",
    fecha_cobro_saldo:  proyecto?.fecha_cobro_saldo || "",
    monto_saldo:        proyecto?.monto_saldo || "",
    drive_url:          proyecto?.drive_url || "",
    obs:                proyecto?.obs || "",
    anticipo:           proyecto?.anticipo || false,
    check_diagnostico:  proyecto?.check_diagnostico || false,
    proyecto_ok:        proyecto?.proyecto_ok || false,
    cobrado:            proyecto?.cobrado || false,
    estado:             proyecto?.estado || "onboarding",
  });
  const [clientes, setClientes] = useState([]);
  const [calculistas, setCalculistas] = useState([]);
  const [presupuestos, setPresupuestos] = useState([]);
  const [showNuevoCalc, setShowNuevoCalc] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [equipo, setEquipo] = useState([]);
  const [nuevoMiembro, setNuevoMiembro] = useState({ nombre: "", mail: "", rol: "ingeniero_calculista" });
  const [showAddMiembro, setShowAddMiembro] = useState(false);

  useEffect(() => {
    (async () => {
      const tk = await getToken();
      const [clis, calcs, press] = await Promise.all([
        fetch(`${SUPA_URL}/clientes?select=id,empresa&order=empresa.asc`, { headers: hdrs(tk) }).then(r => r.json()),
        fetch(`${SUPA_URL}/calculistas?select=id,nombre,nivel,disponible,estado&order=nombre.asc`, { headers: hdrs(tk) }).then(r => r.json()),
        fetch(`${SUPA_URL}/presupuestos?estado=eq.aprobado&select=id,codigo,descripcion,obra_nombre,cliente,comitente_nombre,monto,moneda,forma_pago,forma_pago_custom,sistema_constructivo,superficie,fecha_aprobacion&order=codigo.desc&limit=300`, { headers: hdrs(tk) }).then(r => r.json()),
      ]);
      setClientes(Array.isArray(clis) ? clis : []);
      setCalculistas(Array.isArray(calcs) ? calcs.filter(c => c.estado === 'activo') : []);
      setPresupuestos(Array.isArray(press) ? press : []);
    })();
  }, []);

  // Auto-completar desde presupuesto
  useEffect(() => {
    if (form.presupuesto_id && presupuestos.length > 0) {
      const pres = presupuestos.find(p => p.id === form.presupuesto_id);
      if (pres) {
        // Calcular montos según modalidad de pago
        const monto = parseFloat(pres.monto) || 0;
        let montoAnticipo = null;
        let montoSaldo = null;
        if (pres.forma_pago === "50_50") {
          montoAnticipo = Math.round(monto * 0.5);
          montoSaldo = Math.round(monto * 0.5);
        } else if (pres.forma_pago === "25_50_25") {
          montoAnticipo = Math.round(monto * 0.25);
          montoSaldo = Math.round(monto * 0.25);
        }

        setForm(f => ({
          ...f,
          cliente: f.cliente || pres.comitente_nombre || pres.cliente || "",
          descripcion: f.descripcion || pres.obra_nombre || pres.descripcion || "",
          numero_proyecto: f.numero_proyecto || (pres.codigo ? pres.codigo + "-P" : ""),
          tipo_obra: f.tipo_obra || pres.sistema_constructivo || "",
          superficie: f.superficie || pres.superficie || "",
          fecha_aprobacion: f.fecha_aprobacion || pres.fecha_aprobacion || "",
          monto_anticipo: f.monto_anticipo || montoAnticipo || "",
          monto_saldo: f.monto_saldo || montoSaldo || "",
        }));
      }
    }
  }, [form.presupuesto_id, presupuestos]);

  async function agregarMiembro() {
    if (!nuevoMiembro.nombre.trim()) return;
    await api("/proyecto_equipo", { method: "POST", body: JSON.stringify({
      proyecto_id: proyecto?.id,
      nombre: nuevoMiembro.nombre.trim(),
      mail: nuevoMiembro.mail.trim() || null,
      rol: nuevoMiembro.rol,
    })});
    setNuevoMiembro({ nombre: "", mail: "", rol: "ingeniero_calculista" });
    setShowAddMiembro(false);
    const r = await api(`/proyecto_equipo?proyecto_id=eq.${proyecto?.id}&order=created_at.asc`);
    setEquipo(Array.isArray(r) ? r : []);
  }

  async function eliminarMiembro(id) {
    await api(`/proyecto_equipo?id=eq.${id}`, { method: "DELETE" });
    setEquipo(prev => prev.filter(m => m.id !== id));
  }

  async function guardar() {
    if (!form.descripcion) return setError("La descripción es requerida");
    setSaving(true); setError("");
    try {
      const hoy = new Date().toISOString().slice(0, 10);
      const estadoAnterior = proyecto?.estado;
      const body = {
        ...form,
        cliente_id:         form.cliente_id || null,
        presupuesto_id:     form.presupuesto_id || null,
        superficie:         form.superficie ? parseFloat(form.superficie) : null,
        fecha_entrega_plan: form.fecha_entrega_plan || null,
        fecha_aprobacion:   form.fecha_aprobacion || null,
        fecha_cobro_saldo:  form.fecha_cobro_saldo || null,
        monto_anticipo:     form.monto_anticipo ? parseFloat(form.monto_anticipo) : null,
        monto_saldo:        form.monto_saldo ? parseFloat(form.monto_saldo) : null,
        ...(form.estado === "activo" && estadoAnterior !== "activo" ? { fecha_inicio_real: hoy } : {}),
      };
      if (proyecto?.id) {
        await api(`/proyectos?id=eq.${proyecto.id}`, { method: "PATCH", body: JSON.stringify(body) });
      } else {
        const res = await api("/proyectos", { method: "POST", body: JSON.stringify(body) });
        // Crear checklists default para proyecto nuevo
        const nuevoId = Array.isArray(res) ? res[0]?.id : res?.id;
        if (nuevoId) {
          const DEFAULTS = {
            "01 - Diagnóstico": ["Formulario enviado al arquitecto/ingeniero", "Formulario recibido completo"],
            "02 - Anteproyecto": ["Modelo CYPECAD", "Anteproyecto en AutoCAD", "Anteproyecto en SketchUp"],
            "03 - Proyecto": ["Modelo estructural CYPECAD", "Memoria de cálculo", "Planillas de armadura"],
            "04 - Legajo final": ["05-A Proyecto en AutoCAD", "05-B Proyecto en 3D (SketchUp)", "05-C Resumen de materiales", "05-D Carpeta completa en PDF"],
          };
          let orden = 0;
          for (const [seccion, items] of Object.entries(DEFAULTS)) {
            const cl = await api("/proyecto_checklists", { method: "POST", body: JSON.stringify({ proyecto_id: nuevoId, nombre: seccion, orden: orden++ }) }).catch(() => null);
            const clId = Array.isArray(cl) ? cl[0]?.id : cl?.id;
            if (clId) {
              for (let i = 0; i < items.length; i++) {
                await api("/proyecto_tareas", { method: "POST", body: JSON.stringify({ checklist_id: clId, proyecto_id: nuevoId, texto: items[i], orden: i }) }).catch(() => {});
              }
            }
          }
        }
      }
      onGuardar();
    } catch(e) { setError(e.message); }
    setSaving(false);
  }

  const presSeleccionado = presupuestos.find(p => p.id === form.presupuesto_id);
  const cuotas = presSeleccionado ? cuotasDesdeModalidad(presSeleccionado.forma_pago, presSeleccionado.monto) : [];
  const monedaPres = presSeleccionado?.moneda === "USD" ? "U$S" : "$";

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", zIndex: 999, display: "flex", alignItems: "center", justifyContent: "center", padding: 12 }}>
      <div style={{ background: "#fff", borderRadius: 14, width: "min(820px, 100%)", maxHeight: "95vh", overflow: "auto", display: "flex", flexDirection: "column" }}>

        {/* Header fijo */}
        <div style={{ padding: "18px 24px 14px", borderBottom: "1px solid #f0f0f0", flexShrink: 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <h2 style={{ margin: 0, fontSize: 16, fontWeight: 800 }}>{esNuevo ? "Nuevo proyecto" : "Editar proyecto"}</h2>
              {proyecto?.codigo && <span style={{ fontSize: 12, fontFamily: "monospace", color: "#888" }}>[{proyecto.codigo}]</span>}
            </div>
            <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "#888" }}>✕</button>
          </div>

          {/* Estados */}
          {!esNuevo && (
            <div style={{ display: "flex", gap: 6, marginTop: 12, flexWrap: "wrap" }}>
              {ESTADOS.map(e => (
                <button key={e.v} onClick={() => esAdmin && setForm(f => ({ ...f, estado: e.v }))}
                  style={{ padding: "5px 14px", borderRadius: 20, border: `2px solid ${form.estado === e.v ? e.color : "#e0e0e0"}`, background: form.estado === e.v ? e.bg : "#fff", color: form.estado === e.v ? e.color : "#aaa", fontWeight: form.estado === e.v ? 700 : 500, fontSize: 12, cursor: esAdmin ? "pointer" : "default" }}>
                  {e.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Contenido scrollable */}
        <div style={{ padding: "16px 24px", overflow: "auto", flex: 1 }}>

          {/* INFO GENERAL */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "#aaa", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 }}>
              <span style={{ background: "#f0f0f0", borderRadius: 4, padding: "2px 8px" }}>Info general</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 10 }}>
              <div>
                <span style={S.lbl}>Nro proyecto</span>
                <input value={form.numero_proyecto} onChange={e => setForm(f => ({ ...f, numero_proyecto: e.target.value }))} style={S.inp} placeholder="1188-P" />
              </div>
              <div>
                <span style={S.lbl}>Descripción *</span>
                <input value={form.descripcion} onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))} style={S.inp} />
              </div>
            </div>
          </div>

          {/* PRESUPUESTO VINCULADO */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "#aaa", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 }}>
              <span style={{ background: "#f0f0f0", borderRadius: 4, padding: "2px 8px" }}>Presupuesto vinculado</span>
            </div>
            <Combobox
              options={[
                ...(form.presupuesto_id && presSeleccionado ? [{ value: presSeleccionado.id, label: `${presSeleccionado.codigo || ""} — ${presSeleccionado.descripcion || presSeleccionado.cliente || ""}` }] : []),
                ...presupuestos.filter(p => p.id !== form.presupuesto_id).map(p => ({ value: p.id, label: `${p.codigo || ""} — ${p.descripcion || p.cliente || ""}` }))
              ]}
              value={form.presupuesto_id}
              onChange={val => setForm(f => ({ ...f, presupuesto_id: val }))}
              placeholder="Buscar presupuesto aprobado…"
              emptyLabel="Sin vincular"
            />
            {presSeleccionado && (
              <div style={{ marginTop: 6, background: "#f0fdf4", borderRadius: 8, padding: "8px 12px", fontSize: 12 }}>
                <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: cuotas.length > 0 ? 8 : 0 }}>
                  <span>👤 {presSeleccionado.comitente_nombre || presSeleccionado.cliente}</span>
                  {presSeleccionado.monto && <span>💰 {monedaPres}{parseFloat(presSeleccionado.monto).toLocaleString("es-AR")}</span>}
                </div>
                {cuotas.length > 0 && (
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {cuotas.map((c, i) => (
                      <div key={i} style={{ background: "#fff", borderRadius: 6, padding: "4px 10px", textAlign: "center" }}>
                        <div style={{ fontWeight: 800, color: "#1a8a5e", fontFamily: "monospace" }}>{monedaPres}{c.monto.toLocaleString("es-AR")}</div>
                        <div style={{ fontSize: 10, color: "#888" }}>{c.label}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* CLIENTE Y OBRA */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "#aaa", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 }}>
              <span style={{ background: "#f0f0f0", borderRadius: 4, padding: "2px 8px" }}>Cliente y obra</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div>
                <span style={S.lbl}>Cliente / Comitente</span>
                <Combobox
                  options={[
                    ...(form.cliente_id && form.cliente ? [{ value: form.cliente_id, label: form.cliente }] : []),
                    ...clientes.filter(c => c.id !== form.cliente_id).map(c => ({ value: c.id, label: c.empresa }))
                  ]}
                  value={form.cliente_id}
                  onChange={(val, label) => setForm(f => ({ ...f, cliente_id: val, cliente: label || f.cliente }))}
                  placeholder="Buscar cliente…"
                  emptyLabel="Sin vincular"
                />
                <input value={form.cliente} onChange={e => setForm(f => ({ ...f, cliente: e.target.value }))} style={{ ...S.inp, marginTop: 5, fontSize: 12 }} placeholder="O escribí el nombre…" />
              </div>
              <div>
                <span style={S.lbl}>Tipo de obra</span>
                <select value={form.tipo_obra} onChange={e => setForm(f => ({ ...f, tipo_obra: e.target.value }))} style={S.inp}>
                  <option value="">Seleccionar…</option>
                  {TIPOS_OBRA.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* FECHAS Y COBROS */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "#1a8a5e", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 }}>
              <span style={{ background: "#f0fdf4", borderRadius: 4, padding: "2px 8px", border: "1px solid #1a8a5e30" }}>Fechas y cobros</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 10 }}>
              <div>
                <span style={S.lbl}>Fecha aprobación</span>
                <input type="date" value={form.fecha_aprobacion} onChange={e => setForm(f => ({ ...f, fecha_aprobacion: e.target.value }))} style={S.inp} />
              </div>
              <div>
                <span style={S.lbl}>Monto anticipo $</span>
                <input type="number" value={form.monto_anticipo} onChange={e => setForm(f => ({ ...f, monto_anticipo: e.target.value }))} style={S.inp} placeholder="0" />
              </div>
              <div>
                <span style={S.lbl}>Fecha cobro saldo</span>
                <input type="date" value={form.fecha_cobro_saldo} onChange={e => setForm(f => ({ ...f, fecha_cobro_saldo: e.target.value }))} style={S.inp} />
              </div>
              <div>
                <span style={S.lbl}>Monto saldo $</span>
                <input type="number" value={form.monto_saldo} onChange={e => setForm(f => ({ ...f, monto_saldo: e.target.value }))} style={S.inp} placeholder="0" />
              </div>
              <div style={{ gridColumn: "1 / 3" }}>
                <span style={S.lbl}>Fecha entrega estimada</span>
                <input type="date" value={form.fecha_entrega_plan} onChange={e => setForm(f => ({ ...f, fecha_entrega_plan: e.target.value }))} style={S.inp} />
              </div>
              <div style={{ gridColumn: "3 / -1" }}>
                <span style={S.lbl}>Superficie m²</span>
                <input type="number" value={form.superficie} onChange={e => setForm(f => ({ ...f, superficie: e.target.value }))} style={S.inp} />
              </div>
            </div>
          </div>

          {/* CALCULISTA ASOCIADO */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "#aaa", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 }}>
              <span style={{ background: "#f0f0f0", borderRadius: 4, padding: "2px 8px" }}>Calculista asociado</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
              <span style={{ fontSize: 11, color: "#aaa" }}>Solo calculistas activos</span>
              <button onClick={() => setShowNuevoCalc(v => !v)} style={{ ...S.btnSm, fontSize: 10, padding: "2px 8px" }}>+ Nuevo</button>
            </div>
            <select value={form.encargado} onChange={e => setForm(f => ({ ...f, encargado: e.target.value }))} style={S.inp}>
              <option value="">Sin asignar</option>
              {calculistas.filter(c => c.disponible).map(c => <option key={c.id} value={c.nombre}>{c.nombre}{c.nivel ? ` · ${c.nivel}` : ""} ✓</option>)}
              {calculistas.filter(c => !c.disponible).length > 0 && <option disabled>── No disponibles ──</option>}
              {calculistas.filter(c => !c.disponible).map(c => <option key={c.id} value={c.nombre}>{c.nombre}{c.nivel ? ` · ${c.nivel}` : ""}</option>)}
            </select>
            {showNuevoCalc && (
              <FormNuevoCalculista
                onCreado={nuevo => {
                  setCalculistas(prev => [...prev, nuevo]);
                  setForm(f => ({ ...f, encargado: nuevo.nombre }));
                  setShowNuevoCalc(false);
                }}
                onCancelar={() => setShowNuevoCalc(false)}
              />
            )}
          </div>

          {/* EQUIPO DEL PROYECTO */}
          {proyecto?.id && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: "#aaa", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 }}>
                <span style={{ background: "#f0f0f0", borderRadius: 4, padding: "2px 8px" }}>Equipo del proyecto</span>
              </div>

              {/* Lista miembros */}
              {equipo.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 5, marginBottom: 8 }}>
                  {equipo.map(m => {
                    const rolInfo = ROLES_EQUIPO.find(r => r.value === m.rol);
                    return (
                      <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 10px", background: "#f8f8f8", borderRadius: 8, border: "1px solid #e8e8e8" }}>
                        <div style={{ width: 26, height: 26, borderRadius: "50%", background: "#0a0a0a", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800, flexShrink: 0 }}>
                          {m.nombre[0].toUpperCase()}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 12, fontWeight: 700, color: "#111" }}>{m.nombre}</div>
                          <div style={{ fontSize: 10, color: "#888" }}>{rolInfo?.label || m.rol}{m.mail ? ` · ${m.mail}` : ""}</div>
                        </div>
                        <button onClick={() => eliminarMiembro(m.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "#ddd", fontSize: 14, padding: 2 }}>✕</button>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Agregar miembro */}
              {showAddMiembro ? (
                <div style={{ background: "#f8f8f8", borderRadius: 8, padding: 10, border: "1.5px solid #e0e0e0" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
                    <div>
                      <span style={S.lbl}>Nombre</span>
                      <input value={nuevoMiembro.nombre} onChange={e => setNuevoMiembro(p => ({ ...p, nombre: e.target.value }))}
                        style={S.inp} placeholder="Nombre completo" />
                    </div>
                    <div>
                      <span style={S.lbl}>Email</span>
                      <input value={nuevoMiembro.mail} onChange={e => setNuevoMiembro(p => ({ ...p, mail: e.target.value }))}
                        style={S.inp} placeholder="opcional" />
                    </div>
                  </div>
                  <div style={{ marginBottom: 8 }}>
                    <span style={S.lbl}>Rol en el proyecto</span>
                    <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                      {ROLES_EQUIPO.map(r => (
                        <button key={r.value} onClick={() => setNuevoMiembro(p => ({ ...p, rol: r.value }))}
                          style={{ padding: "4px 10px", borderRadius: 6, border: `1.5px solid ${nuevoMiembro.rol === r.value ? "#0a0a0a" : "#e0e0e0"}`, background: nuevoMiembro.rol === r.value ? "#0a0a0a" : "#fff", color: nuevoMiembro.rol === r.value ? "#fff" : "#555", fontSize: 11, cursor: "pointer", fontWeight: nuevoMiembro.rol === r.value ? 700 : 400 }}>
                          {r.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button onClick={agregarMiembro} style={{ padding: "6px 14px", background: "#0a0a0a", color: "#fff", border: "none", borderRadius: 6, fontSize: 12, cursor: "pointer", fontWeight: 700 }}>Agregar</button>
                    <button onClick={() => setShowAddMiembro(false)} style={{ padding: "6px 10px", background: "#f0f0f0", border: "none", borderRadius: 6, fontSize: 12, cursor: "pointer" }}>Cancelar</button>
                  </div>
                </div>
              ) : (
                <button onClick={() => setShowAddMiembro(true)}
                  style={{ padding: "6px 14px", background: "#f0f0f0", border: "1.5px dashed #e0e0e0", borderRadius: 8, fontSize: 12, cursor: "pointer", color: "#555", fontWeight: 600, width: "100%" }}>
                  + Agregar miembro al equipo
                </button>
              )}
            </div>
          )}

          {/* Drive y observaciones */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
            <div>
              <span style={S.lbl}>Link Drive</span>
              <input value={form.drive_url} onChange={e => setForm(f => ({ ...f, drive_url: e.target.value }))} style={S.inp} placeholder="https://drive.google.com/…" />
            </div>
            <div>
              <span style={S.lbl}>Observaciones internas</span>
              <input value={form.obs} onChange={e => setForm(f => ({ ...f, obs: e.target.value }))} style={S.inp} placeholder="Notas solo para el admin" />
            </div>
          </div>

          {error && <div style={{ background: "#fef2f2", color: "#c0392b", borderRadius: 8, padding: "8px 12px", marginTop: 10, fontSize: 12, fontWeight: 600 }}>❌ {error}</div>}
        </div>

        {/* Footer fijo */}
        <div style={{ padding: "12px 24px", borderTop: "1px solid #f0f0f0", display: "flex", gap: 8, flexShrink: 0 }}>
          <button onClick={guardar} disabled={saving} style={S.btn}>{saving ? "Guardando…" : "Guardar"}</button>
          <button onClick={onClose} style={S.btnSm}>Cancelar</button>
        </div>
      </div>
    </div>
  );
}



/* ─── Panel de cobros ─── */
function PanelCobros({ proyecto, presupuesto, onClose, onActualizar }) {
  const [cobros, setCobros] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({});
  const hoy = new Date().toISOString().slice(0, 10);

  const cuotas = presupuesto ? cuotasDesdeModalidad(presupuesto.forma_pago, presupuesto.monto) : [];
  const moneda = presupuesto?.moneda === "USD" ? "U$S" : "$";

  const cargar = useCallback(async () => {
    setLoading(true);
    const r = await api(`/proyecto_cobros?proyecto_id=eq.${proyecto.id}&order=fecha_cobro.desc`).catch(() => []);
    setCobros(Array.isArray(r) ? r : []);
    setLoading(false);
  }, [proyecto.id]);

  useEffect(() => { cargar(); }, [cargar]);

  function initForm(concepto = "", monto = "") {
    setForm({ concepto, monto, moneda: presupuesto?.moneda || "ARS", fecha_cobro: hoy, metodo: "transferencia", facturado: false, comprobante: "", nro_factura: "", notas: "" });
    setShowForm(true);
  }

  async function guardar() {
    if (!form.concepto || !form.monto) return;
    setSaving(true);
    await api("/proyecto_cobros", { method: "POST", body: JSON.stringify({ ...form, proyecto_id: proyecto.id, monto: parseFloat(form.monto) }) });
    setShowForm(false);
    await cargar();
    onActualizar && onActualizar();
    setSaving(false);
  }

  async function eliminar(id) {
    if (!confirm("¿Eliminar este cobro?")) return;
    await api(`/proyecto_cobros?id=eq.${id}`, { method: "DELETE" });
    await cargar();
    onActualizar && onActualizar();
  }

  async function toggleFactura(cobro) {
    await api(`/proyecto_cobros?id=eq.${cobro.id}`, { method: "PATCH", body: JSON.stringify({ facturado: !cobro.facturado }) });
    await cargar();
  }

  const totalCobrado = cobros.reduce((s, c) => s + parseFloat(c.monto || 0), 0);
  const totalPresupuesto = presupuesto?.monto ? parseFloat(presupuesto.monto) : 0;
  const pctCobrado = totalPresupuesto > 0 ? Math.round(totalCobrado / totalPresupuesto * 100) : null;
  const saldoPendiente = totalPresupuesto - totalCobrado;

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 1000, display: "flex", alignItems: "flex-start", justifyContent: "flex-end" }}>
      <div style={{ background: "#fff", width: "min(500px, 100vw)", height: "100vh", overflow: "auto", padding: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 16, fontWeight: 800 }}>Cobros</h2>
            <p style={{ margin: "2px 0 0", fontSize: 12, color: "#888" }}>{proyecto.descripcion}</p>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "#888" }}>✕</button>
        </div>

        {/* Resumen financiero */}
        <div style={{ background: "#f8f8f8", borderRadius: 10, padding: 14, marginBottom: 16 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: pctCobrado !== null ? 10 : 0 }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 900, color: "#111", fontFamily: "monospace" }}>{moneda}{totalPresupuesto.toLocaleString("es-AR")}</div>
              <div style={{ fontSize: 10, color: "#aaa" }}>Total presupuesto</div>
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 900, color: "#1a8a5e", fontFamily: "monospace" }}>{moneda}{totalCobrado.toLocaleString("es-AR")}</div>
              <div style={{ fontSize: 10, color: "#aaa" }}>Cobrado</div>
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 900, color: saldoPendiente > 0 ? "#f59e0b" : "#1a8a5e", fontFamily: "monospace" }}>{moneda}{saldoPendiente.toLocaleString("es-AR")}</div>
              <div style={{ fontSize: 10, color: "#aaa" }}>Saldo pendiente</div>
            </div>
          </div>
          {pctCobrado !== null && (
            <div>
              <div style={{ height: 6, background: "#e0e0e0", borderRadius: 3, overflow: "hidden" }}>
                <div style={{ width: `${Math.min(pctCobrado, 100)}%`, height: "100%", background: pctCobrado >= 100 ? "#1a8a5e" : "#3b82f6", transition: "width 0.3s" }} />
              </div>
              <div style={{ fontSize: 10, color: "#aaa", marginTop: 3, textAlign: "right" }}>{pctCobrado}% cobrado</div>
            </div>
          )}
        </div>

        {/* Cuotas sugeridas */}
        {cuotas.length > 0 && !showForm && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 10, color: "#aaa", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 }}>Registrar cuota</div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {cuotas.map((c, i) => {
                const yaCobrada = cobros.some(cb => cb.concepto === c.label);
                return (
                  <button key={i} onClick={() => !yaCobrada && initForm(c.label, c.monto)}
                    disabled={yaCobrada}
                    style={{ ...S.btnSm, opacity: yaCobrada ? 0.4 : 1, cursor: yaCobrada ? "default" : "pointer", fontSize: 11 }}>
                    {yaCobrada ? "✓ " : ""}{c.label} — {moneda}{c.monto.toLocaleString("es-AR")}
                  </button>
                );
              })}
              <button onClick={() => initForm()} style={{ ...S.btnSm, fontSize: 11 }}>+ Otro</button>
            </div>
          </div>
        )}

        {/* Formulario */}
        {showForm && (
          <div style={{ background: "#f8f8f8", borderRadius: 10, padding: 14, marginBottom: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#333", marginBottom: 10 }}>Nuevo cobro</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
              <div style={{ gridColumn: "1 / -1" }}>
                <span style={S.lbl}>Concepto *</span>
                <input value={form.concepto || ""} onChange={e => setForm(p => ({ ...p, concepto: e.target.value }))} style={S.inp} placeholder="Ej: 50% Anticipo" />
              </div>
              <div>
                <span style={S.lbl}>Monto *</span>
                <input type="number" value={form.monto || ""} onChange={e => setForm(p => ({ ...p, monto: e.target.value }))} style={S.inp} />
              </div>
              <div>
                <span style={S.lbl}>Fecha</span>
                <input type="date" value={form.fecha_cobro || hoy} onChange={e => setForm(p => ({ ...p, fecha_cobro: e.target.value }))} style={S.inp} />
              </div>
              <div>
                <span style={S.lbl}>Método</span>
                <select value={form.metodo || "transferencia"} onChange={e => setForm(p => ({ ...p, metodo: e.target.value }))} style={S.inp}>
                  <option value="transferencia">Transferencia</option>
                  <option value="efectivo">Efectivo</option>
                  <option value="cheque">Cheque</option>
                </select>
              </div>
              <div>
                <span style={S.lbl}>N° comprobante</span>
                <input value={form.comprobante || ""} onChange={e => setForm(p => ({ ...p, comprobante: e.target.value }))} style={S.inp} placeholder="Nro de transferencia" />
              </div>
              <div style={{ gridColumn: "1 / -1", display: "flex", gap: 16 }}>
                <label style={{ display: "flex", gap: 6, alignItems: "center", fontSize: 12, cursor: "pointer" }}>
                  <input type="checkbox" checked={form.facturado || false} onChange={e => setForm(p => ({ ...p, facturado: e.target.checked }))} style={{ accentColor: "#111" }} />
                  Facturado
                </label>
                {form.facturado && (
                  <input value={form.nro_factura || ""} onChange={e => setForm(p => ({ ...p, nro_factura: e.target.value }))} style={{ ...S.inp, width: "auto", flex: 1 }} placeholder="N° de factura" />
                )}
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <span style={S.lbl}>Notas</span>
                <input value={form.notas || ""} onChange={e => setForm(p => ({ ...p, notas: e.target.value }))} style={S.inp} placeholder="Observaciones opcionales" />
              </div>
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <button onClick={guardar} disabled={saving || !form.concepto || !form.monto} style={S.btn}>{saving ? "Guardando…" : "💾 Guardar cobro"}</button>
              <button onClick={() => setShowForm(false)} style={S.btnSm}>Cancelar</button>
            </div>
          </div>
        )}

        {!showForm && cuotas.length === 0 && (
          <button onClick={() => initForm()} style={{ ...S.btn, marginBottom: 16, width: "100%" }}>+ Registrar cobro</button>
        )}

        {/* Lista de cobros */}
        {loading ? <p style={{ color: "#aaa" }}>Cargando…</p> : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {cobros.length === 0 && <p style={{ color: "#aaa", fontSize: 13, textAlign: "center", padding: 20 }}>Sin cobros registrados</p>}
            {cobros.map(c => (
              <div key={c.id} style={{ background: "#f8f8f8", borderRadius: 9, padding: "10px 14px", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: "#111" }}>{c.concepto}</span>
                    {c.facturado && <span style={{ fontSize: 10, background: "#f0fdf4", color: "#1a8a5e", borderRadius: 4, padding: "1px 6px", fontWeight: 700 }}>Facturado {c.nro_factura ? `#${c.nro_factura}` : ""}</span>}
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 900, color: "#1a8a5e", fontFamily: "monospace", marginBottom: 3 }}>
                    {c.moneda === "USD" ? "U$S" : "$"}{parseFloat(c.monto).toLocaleString("es-AR")}
                  </div>
                  <div style={{ display: "flex", gap: 10, fontSize: 11, color: "#aaa", flexWrap: "wrap" }}>
                    {c.fecha_cobro && <span>📅 {fmtFecha(c.fecha_cobro)}</span>}
                    <span>💳 {c.metodo}</span>
                    {c.comprobante && <span>#{c.comprobante}</span>}
                    {c.notas && <span>📝 {c.notas}</span>}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 4, flexShrink: 0, marginLeft: 8 }}>
                  <button onClick={() => toggleFactura(c)} style={{ ...S.btnSm, fontSize: 10 }} title={c.facturado ? "Quitar factura" : "Marcar facturado"}>
                    {c.facturado ? "✓F" : "F"}
                  </button>
                  <button onClick={() => eliminar(c.id)} style={{ ...S.btnSm, fontSize: 10, color: "#c0392b", borderColor: "#fecaca" }}>✕</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Panel de flujo de caja (solo admin) ─── */
function FlujoCaja({ proyectos, presupuestosMap }) {
  const [abierto, setAbierto] = useState(false);
  const [anio, setAnio] = useState(new Date().getFullYear());
  const [cobros, setCobros] = useState([]);

  useEffect(() => {
    if (!abierto) return;
    // Cargar todos los cobros del año
    api(`/proyecto_cobros?fecha_cobro=gte.${anio}-01-01&fecha_cobro=lte.${anio}-12-31&order=fecha_cobro.asc`)
      .then(r => setCobros(Array.isArray(r) ? r : []))
      .catch(() => {});
  }, [abierto, anio]);

  const meses = Array.from({ length: 12 }, (_, i) => i + 1);
  const MESES_LABELS = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];

  const flujoPorMes = meses.map(mes => {
    const mesStr = String(mes).padStart(2, "0");
    const prefijo = `${anio}-${mesStr}`;

    // Cobros reales registrados ese mes
    const cobrosDelMes = cobros.filter(c => c.fecha_cobro?.startsWith(prefijo));
    const montoCobrado = cobrosDelMes.reduce((s, c) => s + parseFloat(c.monto || 0), 0);
    const cobradosConFactura = cobrosDelMes.filter(c => c.facturado).length;

    // Proyectos entregados ese mes (saldo pendiente estimado)
    const entregados = proyectos.filter(p => p.fecha_entrega_real?.startsWith(prefijo));
    const montoPorCobrar = entregados.reduce((s, p) => {
      const pres = presupuestosMap[p.presupuesto_id];
      if (!pres?.monto) return s;
      const totalPres = parseFloat(pres.monto);
      const cobradoProy = cobros.filter(c => c.proyecto_id === p.id).reduce((x, c) => x + parseFloat(c.monto || 0), 0);
      return s + Math.max(0, totalPres - cobradoProy);
    }, 0);

    // Anticipos esperados (proyectos iniciados ese mes)
    const iniciados = proyectos.filter(p => p.fecha_inicio_real?.startsWith(prefijo));
    const montoAnticipo = iniciados.reduce((s, p) => {
      const pres = presupuestosMap[p.presupuesto_id];
      if (!pres?.monto) return s;
      const m = parseFloat(pres.monto);
      if (pres.forma_pago === "50_50") return s + Math.round(m * 0.5);
      if (pres.forma_pago === "25_50_25") return s + Math.round(m * 0.25);
      return s;
    }, 0);

    return { mes, label: MESES_LABELS[mes-1], entregados: entregados.length, cobrados: cobrosDelMes.length, cobradosConFactura, porCobrar: entregados.filter(p => !p.cobrado).length, montoCobrado, montoPorCobrar, montoAnticipo, iniciados: iniciados.length };
  });

  const totalCobrado = flujoPorMes.reduce((s, m) => s + m.montoCobrado, 0);
  const totalPorCobrar = flujoPorMes.reduce((s, m) => s + m.montoPorCobrar, 0);
  const maxMonto = Math.max(...flujoPorMes.map(m => m.montoCobrado + m.montoPorCobrar), 1);
  const mesActual = new Date().getMonth() + 1;
  const anioActual = new Date().getFullYear();

  return (
    <div style={{ background: "#fff", border: "1.5px solid #e8e8e8", borderRadius: 12, marginBottom: 16, overflow: "hidden" }}>
      {/* Header toggle */}
      <div onClick={() => setAbierto(a => !a)} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", cursor: "pointer" }}
        onMouseEnter={e => e.currentTarget.style.background = "#fafafa"}
        onMouseLeave={e => e.currentTarget.style.background = "#fff"}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 16 }}>💵</span>
          <div>
            <span style={{ fontSize: 13, fontWeight: 800, color: "#111" }}>Flujo de ingresos</span>
            <span style={{ fontSize: 11, color: "#aaa", marginLeft: 8 }}>{anio}</span>
          </div>
          {!abierto && (
            <div style={{ display: "flex", gap: 12, marginLeft: 16 }}>
              {totalCobrado > 0 && <span style={{ fontSize: 12, color: "#1a8a5e", fontWeight: 700 }}>✓ ${totalCobrado.toLocaleString("es-AR")} cobrado</span>}
              {totalPorCobrar > 0 && <span style={{ fontSize: 12, color: "#f59e0b", fontWeight: 700 }}>⏳ ${totalPorCobrar.toLocaleString("es-AR")} por cobrar</span>}
            </div>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <select value={anio} onChange={e => { e.stopPropagation(); setAnio(parseInt(e.target.value)); }}
            onClick={e => e.stopPropagation()}
            style={{ fontSize: 11, padding: "3px 8px", border: "1.5px solid #e0e0e0", borderRadius: 6, cursor: "pointer" }}>
            {[2023,2024,2025,2026,2027].map(a => <option key={a} value={a}>{a}</option>)}
          </select>
          <span style={{ color: "#aaa", fontSize: 18, transform: abierto ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}>⌄</span>
        </div>
      </div>

      {abierto && (
        <div style={{ borderTop: "1px solid #f0f0f0", padding: 16 }}>
          {/* KPIs anuales */}
          <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
            {[
              { label: "Cobrado en el año", value: `$${totalCobrado.toLocaleString("es-AR")}`, color: "#1a8a5e" },
              { label: "Por cobrar", value: `$${totalPorCobrar.toLocaleString("es-AR")}`, color: "#f59e0b" },
              { label: "Total proyectado", value: `$${(totalCobrado + totalPorCobrar).toLocaleString("es-AR")}`, color: "#3b82f6" },
            ].map(k => (
              <div key={k.label} style={{ background: "#f8f8f8", borderRadius: 8, padding: "8px 14px", flex: 1, minWidth: 120 }}>
                <div style={{ fontSize: 16, fontWeight: 900, color: k.color, fontFamily: "monospace" }}>{k.value}</div>
                <div style={{ fontSize: 10, color: "#aaa", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.4 }}>{k.label}</div>
              </div>
            ))}
          </div>

          {/* Gráfico de barras SVG */}
          <div style={{ marginBottom: 16, overflowX: "auto" }}>
            <svg width="660" height="120" style={{ display: "block" }}>
              {flujoPorMes.map((m, i) => {
                const x = i * 55 + 4;
                const w = 46;
                const hCobrado = maxMonto > 0 ? Math.round((m.montoCobrado / maxMonto) * 80) : 0;
                const hPorCobrar = maxMonto > 0 ? Math.round((m.montoPorCobrar / maxMonto) * 80) : 0;
                const hAnticipo = maxMonto > 0 ? Math.round((m.montoAnticipo / maxMonto) * 80) : 0;
                const esActual = anio === anioActual && m.mes === mesActual;
                return (
                  <g key={m.mes}>
                    {/* Fondo mes actual */}
                    {esActual && <rect x={x} y={0} width={w} height={110} fill="#f0f9ff" rx={4} />}
                    {/* Barra anticipo (azul claro) */}
                    {hAnticipo > 0 && <rect x={x+2} y={90-hAnticipo} width={w-4} height={hAnticipo} fill="#bfdbfe" rx={3} />}
                    {/* Barra por cobrar (amarillo) */}
                    {hPorCobrar > 0 && <rect x={x+2} y={90-hPorCobrar} width={w-4} height={hPorCobrar} fill="#fde68a" rx={3} />}
                    {/* Barra cobrado (verde) */}
                    {hCobrado > 0 && <rect x={x+2} y={90-hCobrado} width={w-4} height={hCobrado} fill="#6ee7b7" rx={3} />}
                    {/* Label mes */}
                    <text x={x + w/2} y={108} textAnchor="middle" fontSize="10" fill={esActual ? "#111" : "#bbb"} fontWeight={esActual ? "700" : "400"}>{m.label}</text>
                    {/* Cantidad */}
                    {(m.entregados > 0 || m.iniciados > 0) && (
                      <text x={x + w/2} y={85-Math.max(hCobrado, hPorCobrar)} textAnchor="middle" fontSize="9" fill="#555" fontWeight="700">
                        {m.entregados > 0 ? m.entregados : ""}
                      </text>
                    )}
                  </g>
                );
              })}
            </svg>
            <div style={{ display: "flex", gap: 12, fontSize: 11, color: "#888", marginTop: 4 }}>
              <span><span style={{ display: "inline-block", width: 10, height: 10, background: "#6ee7b7", borderRadius: 2, marginRight: 4 }} />Cobrado</span>
              <span><span style={{ display: "inline-block", width: 10, height: 10, background: "#fde68a", borderRadius: 2, marginRight: 4 }} />Por cobrar</span>
              <span><span style={{ display: "inline-block", width: 10, height: 10, background: "#bfdbfe", borderRadius: 2, marginRight: 4 }} />Anticipo esperado</span>
            </div>
          </div>

          {/* Tabla mensual */}
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr style={{ borderBottom: "2px solid #f0f0f0" }}>
                {["Mes","Iniciados","Anticipo esp.","Entregados","Cobros registrados","Facturado","Pendiente"].map(h => (
                  <th key={h} style={{ padding: "5px 8px", textAlign: h === "Mes" ? "left" : "right", fontSize: 10, fontWeight: 700, color: "#aaa", textTransform: "uppercase" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {flujoPorMes.filter(m => m.entregados > 0 || m.iniciados > 0 || (anio === anioActual && m.mes === mesActual)).map(m => {
                const esActual = anio === anioActual && m.mes === mesActual;
                return (
                  <tr key={m.mes} style={{ borderBottom: "1px solid #f8f8f8", background: esActual ? "#f0f9ff" : "#fff" }}>
                    <td style={{ padding: "6px 8px", fontWeight: esActual ? 800 : 500, color: esActual ? "#3b82f6" : "#333" }}>
                      {m.label} {esActual && <span style={{ fontSize: 9, background: "#3b82f6", color: "#fff", borderRadius: 3, padding: "1px 4px", marginLeft: 3 }}>HOY</span>}
                    </td>
                    <td style={{ padding: "6px 8px", textAlign: "right", color: "#3b82f6" }}>{m.iniciados || "—"}</td>
                    <td style={{ padding: "6px 8px", textAlign: "right", color: "#6366f1", fontFamily: "monospace", fontSize: 11 }}>
                      {m.montoAnticipo > 0 ? `$${m.montoAnticipo.toLocaleString("es-AR")}` : "—"}
                    </td>
                    <td style={{ padding: "6px 8px", textAlign: "right", color: "#555" }}>{m.entregados || "—"}</td>
                    <td style={{ padding: "6px 8px", textAlign: "right", color: "#1a8a5e", fontFamily: "monospace", fontWeight: 700 }}>
                      {m.montoCobrado > 0 ? `$${m.montoCobrado.toLocaleString("es-AR")} (${m.cobrados})` : "—"}
                    </td>
                    <td style={{ padding: "6px 8px", textAlign: "right", color: "#888", fontSize: 11 }}>
                      {m.cobradosConFactura > 0 ? `${m.cobradosConFactura} fact.` : "—"}
                    </td>
                    <td style={{ padding: "6px 8px", textAlign: "right", color: m.montoPorCobrar > 0 ? "#f59e0b" : "#ccc", fontFamily: "monospace", fontWeight: m.montoPorCobrar > 0 ? 700 : 400, fontSize: 11 }}>
                      {m.montoPorCobrar > 0 ? `$${m.montoPorCobrar.toLocaleString("es-AR")}` : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ─── Componente principal ─── */
export default function Proyectos({ deepLinkId, perfil }) {
  const [proyectos, setProyectos] = useState([]);
  const [presupuestosMap, setPresupuestosMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");
  const [tab, setTab] = useState("todos");
  const [busq, setBusq] = useState("");
  const [modal, setModal] = useState(null);
  const [panelChecklist, setPanelChecklist] = useState(null);
  const [panelHonorarios, setPanelHonorarios] = useState(null);
  const [panelCobros, setPanelCobros] = useState(null);
  const esAdmin = perfil?.rol === "admin";

  useEffect(() => { cargar(); }, []);

  useEffect(() => {
    if (deepLinkId && proyectos.length > 0) {
      const p = proyectos.find(pr => pr.id === deepLinkId);
      if (p) setModal(p);
    }
  }, [deepLinkId, proyectos]);

  async function cargar() {
    setLoading(true); setError("");
    try {
      const esCalculista = perfil?.rol === "calculista";
      // Filtrar por email (campo llave) o nombre como fallback
      const filtro = esCalculista && perfil?.mail
        ? `&encargado_mail=eq.${encodeURIComponent(perfil.mail)}`
        : esCalculista && perfil?.nombre
        ? `&encargado=eq.${encodeURIComponent(perfil.nombre)}`
        : "";
      const rows = await api(`/proyectos?order=created_at.desc${filtro}`).catch(() => []);
      setProyectos(Array.isArray(rows) ? rows : []);

      // Cargar presupuestos vinculados
      const ids = [...new Set(rows.filter(p => p.presupuesto_id).map(p => p.presupuesto_id))];
      if (ids.length > 0) {
        const pres = await api(`/presupuestos?id=in.(${ids.join(",")})&select=id,codigo,monto,moneda,forma_pago,fecha_emision,fecha_aprobacion,comitente_nombre,cliente`).catch(() => []);
        const map = {};
        (Array.isArray(pres) ? pres : []).forEach(p => { map[p.id] = p; });
        setPresupuestosMap(map);
      }
    } catch(e) { setError(e.message); }
    setLoading(false);
  }

  async function cambiarEstado(p, nuevoEstado) {
    const hoy = new Date().toISOString().slice(0, 10);
    const patch = { estado: nuevoEstado };
    if (nuevoEstado === "activo" && p.estado !== "activo") patch.fecha_inicio_real = hoy;
    if (["para_cobrar", "terminado"].includes(nuevoEstado) && !["para_cobrar", "terminado"].includes(p.estado)) patch.fecha_entrega_real = hoy;
    await api(`/proyectos?id=eq.${p.id}`, { method: "PATCH", body: JSON.stringify(patch) });
    setMsg(`✓ Estado actualizado a "${ESTADOS.find(e => e.v === nuevoEstado)?.label}"`);
    setTimeout(() => setMsg(""), 2500);
    cargar();
  }

  const TABS = [
    { id: "onboarding", label: "Onboarding", filter: p => p.estado === "onboarding" && !p.archivado },
    { id: "activos",    label: "Activos",    filter: p => p.estado === "activo" && !p.archivado },
    { id: "revision",   label: "Revisión",   filter: p => p.estado === "revision" && !p.archivado },
    { id: "todos",      label: "Todos",      filter: p => !p.archivado },
  ];

  const tabActual = TABS.find(t => t.id === tab) || TABS[1];
  const filtrados = proyectos.filter(p => {
    const okTab = tabActual.filter(p);
    const q = busq.toLowerCase();
    const okBusq = !q || [p.descripcion, p.cliente, p.encargado, p.numero_proyecto, p.codigo].some(v => v?.toLowerCase().includes(q));
    return okTab && okBusq;
  });

  const kpis = {
    onboarding: proyectos.filter(p => p.estado === "onboarding" && !p.archivado).length,
    activos:    proyectos.filter(p => p.estado === "activo" && !p.archivado).length,
    revision:   proyectos.filter(p => p.estado === "revision" && !p.archivado).length,
    total:      proyectos.filter(p => !p.archivado).length,
  };

  return (
    <div style={{ fontFamily: "system-ui, -apple-system, sans-serif", padding: "20px", maxWidth: 1100, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
        <div>
          <p style={{ margin: 0, fontSize: 11, color: "#aaa" }}>NPL · Proyectos</p>
          <h1 style={{ margin: "2px 0 0", fontSize: 20, fontWeight: 800, color: "#111" }}>📐 Proyectos</h1>
        </div>
        {esAdmin && <button onClick={() => setModal("nuevo")} style={S.btn}>+ Nuevo proyecto</button>}
      </div>

      {/* KPIs */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        {[
          { label: "Onboarding", value: kpis.onboarding, color: "#f59e0b" },
          { label: "Activos",    value: kpis.activos,    color: "#3b82f6" },
          { label: "Revisión",   value: kpis.revision,   color: "#6366f1" },
          { label: "Total",      value: kpis.total,      color: "#888" },
        ].map(k => (
          <div key={k.label} style={{ background: "#fff", border: "1.5px solid #e8e8e8", borderRadius: 10, padding: "8px 14px", minWidth: 80 }}>
            <div style={{ fontSize: 20, fontWeight: 900, color: k.color, fontFamily: "monospace" }}>{k.value}</div>
            <div style={{ fontSize: 10, color: "#aaa", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5 }}>{k.label}</div>
          </div>
        ))}
      </div>

      {/* Flujo de caja — solo admin */}
      {esAdmin && <FlujoCaja proyectos={proyectos} presupuestosMap={presupuestosMap} />}

      {/* Tabs + filtro integrado */}
      <div style={{ display: "flex", gap: 6, marginBottom: 14, flexWrap: "wrap", alignItems: "center", background: "#fff", borderRadius: 10, padding: "8px 12px", border: "1.5px solid #e8e8e8" }}>
        {TABS.map(t => {
          const count = proyectos.filter(t.filter).length;
          return (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              padding: "5px 12px", borderRadius: 7, fontSize: 12, fontWeight: tab === t.id ? 700 : 500,
              background: tab === t.id ? "#111" : "transparent", color: tab === t.id ? "#fff" : "#888",
              border: "none", cursor: "pointer",
            }}>
              {t.label}{count > 0 ? ` (${count})` : ""}
            </button>
          );
        })}
        <div style={{ width: 1, height: 16, background: "#e0e0e0", margin: "0 4px" }} />
        <input value={busq} onChange={e => setBusq(e.target.value)} placeholder="Filtrar lista…"
          style={{ border: "none", outline: "none", fontSize: 12, color: "#555", background: "transparent", width: 160 }} />
        {busq && <button onClick={() => setBusq("")} style={{ background: "none", border: "none", cursor: "pointer", color: "#aaa", fontSize: 14 }}>✕</button>}
      </div>

      {msg && <div style={{ background: "#f0fdf4", color: "#1a8a5e", borderRadius: 8, padding: "7px 12px", marginBottom: 10, fontSize: 13, fontWeight: 600 }}>{msg}</div>}
      {error && <div style={{ background: "#fef2f2", color: "#c0392b", borderRadius: 8, padding: "7px 12px", marginBottom: 10, fontSize: 12 }}>❌ {error}</div>}
      {loading && <p style={{ color: "#aaa", textAlign: "center", padding: 40 }}>Cargando…</p>}

      {!loading && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {filtrados.map(p => {
            const pres = presupuestosMap[p.presupuesto_id];
            return (
              <div key={p.id} style={{ background: "#fff", border: "1.5px solid #e8e8e8", borderRadius: 12, overflow: "hidden" }}>
                {esAdmin ? (
                  /* ── Vista ADMIN ── */
                  <>
                    <div onClick={() => setModal(p)} style={{ padding: "12px 16px", cursor: "pointer", display: "grid", gridTemplateColumns: "80px 1fr auto", gap: 12, alignItems: "center" }}>
                      <div>
                        <div style={{ fontFamily: "monospace", fontSize: 12, fontWeight: 700, color: "#555" }}>{p.codigo || p.numero_proyecto || "—"}</div>
                        {p.fecha_entrega_plan && <div style={{ fontSize: 10, color: "#bbb", marginTop: 2 }}>📅 {fmtFecha(p.fecha_entrega_plan)}</div>}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: 14, color: "#111", marginBottom: 3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.descripcion || "Sin descripción"}</div>
                        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                          {p.cliente && <span style={{ fontSize: 12, color: "#888" }}>{p.cliente}</span>}
                          {p.encargado && <span style={{ fontSize: 11, background: "#f0f0f0", borderRadius: 4, padding: "1px 7px" }}>👤 {p.encargado}</span>}                          {p.tipo_obra && <span style={{ fontSize: 11, background: "#eff6ff", borderRadius: 4, padding: "1px 7px", color: "#3b82f6" }}>{p.tipo_obra}</span>}
                          {p.superficie && <span style={{ fontSize: 11, color: "#aaa" }}>{p.superficie}m²</span>}
                        </div>
                        {p.checklist_total > 0 && (() => {
                          const pct = Math.round((p.checklist_ok / p.checklist_total) * 100);
                          return (
                            <div style={{ marginTop: 6, display: "flex", alignItems: "center", gap: 8 }}>
                              <div style={{ flex: 1, height: 3, background: "#f0f0f0", borderRadius: 2, overflow: "hidden" }}>
                                <div style={{ width: `${pct}%`, height: "100%", background: pct === 100 ? "#1a8a5e" : "#3b82f6" }} />
                              </div>
                              <span style={{ fontSize: 10, color: "#aaa" }}>{pct}%</span>
                            </div>
                          );
                        })()}
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: "flex-end" }}>
                        <EstadoChip estado={p.estado} />
                        <div style={{ display: "flex", gap: 4 }}>
                          {p.anticipo && <span style={{ fontSize: 9, color: "#1a8a5e", fontWeight: 700 }}>💰</span>}
                          {p.proyecto_ok && <span style={{ fontSize: 9, color: "#1a8a5e", fontWeight: 700 }}>✅</span>}
                          {p.cobrado && <span style={{ fontSize: 9, color: "#888", fontWeight: 700 }}>✓$</span>}
                        </div>
                      </div>
                    </div>
                    {(pres || p.fecha_inicio_real) && (
                      <div style={{ borderTop: "1px solid #f5f5f5", padding: "8px 16px", background: "#fafafa" }}>
                        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                          {(() => {
                            const diasAprobacion = pres ? diasEntre(pres.fecha_emision, pres.fecha_aprobacion) : null;
                            const diasEjecucion = diasEntre(p.fecha_inicio_real, p.fecha_entrega_real || new Date().toISOString().slice(0,10));
                            const cuotas = pres ? cuotasDesdeModalidad(pres.forma_pago, pres.monto) : [];
                            const moneda = pres?.moneda === "USD" ? "U$S" : "$";
                            return (<>
                              {diasAprobacion !== null && <div style={{ fontSize: 12 }}><span style={{ fontWeight: 800, color: diasAprobacion <= 7 ? "#1a8a5e" : diasAprobacion <= 30 ? "#f59e0b" : "#c0392b" }}>{diasAprobacion}d</span><span style={{ color: "#aaa", marginLeft: 4 }}>ciclo comercial</span></div>}
                              {p.fecha_inicio_real && diasEjecucion !== null && <div style={{ fontSize: 12 }}><span style={{ fontWeight: 800, color: "#3b82f6" }}>{diasEjecucion}d</span><span style={{ color: "#aaa", marginLeft: 4 }}>en ejecución</span></div>}
                              {cuotas.map((c, i) => <div key={i} style={{ fontSize: 12 }}><span style={{ fontWeight: 800, color: "#1a8a5e", fontFamily: "monospace" }}>{moneda}{c.monto.toLocaleString("es-AR")}</span><span style={{ color: "#aaa", marginLeft: 4 }}>{c.label}</span></div>)}
                            </>);
                          })()}
                        </div>
                      </div>
                    )}
                    <div style={{ borderTop: "1px solid #f5f5f5", padding: "8px 16px", display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                      <button onClick={() => setModal(p)} style={S.btnSm}>✏️ Editar</button>
                      <button onClick={() => setPanelChecklist(p)} style={S.btnSm}>✅ Tareas</button>
                      <button onClick={() => setPanelHonorarios(p)} style={S.btnSm}>💰 Honorarios</button>
                      <button onClick={() => setPanelCobros(p)} style={{ ...S.btnSm, color: "#1a8a5e", borderColor: "#1a8a5e" }}>💵 Cobros</button>
                      {p.drive_url && <a href={p.drive_url} target="_blank" rel="noreferrer" style={{ ...S.btnSm, textDecoration: "none" }}>📁 Drive</a>}
                      {(() => {
                        const idx = ESTADOS.findIndex(e => e.v === p.estado);
                        const siguiente = ESTADOS[idx + 1];
                        if (!siguiente) return null;
                        return <button onClick={() => cambiarEstado(p, siguiente.v)} style={{ ...S.btnGreen, marginLeft: "auto" }}>→ {siguiente.label}</button>;
                      })()}
                    </div>
                  </>
                ) : (
                  /* ── Vista CALCULISTA — sin datos financieros del cliente ── */
                  <>
                    <div style={{ padding: "14px 16px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                        <div>
                          <div style={{ fontWeight: 800, fontSize: 15, color: "#111", marginBottom: 4 }}>{p.descripcion || "Sin descripción"}</div>
                          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                            {p.cliente && <span style={{ fontSize: 12, color: "#888" }}>👤 {p.cliente}</span>}
                            {p.tipo_obra && <span style={{ fontSize: 11, background: "#eff6ff", borderRadius: 4, padding: "1px 7px", color: "#3b82f6" }}>{p.tipo_obra}</span>}
                            {p.superficie && <span style={{ fontSize: 11, color: "#aaa" }}>📐 {p.superficie}m²</span>}
                          </div>
                        </div>
                        <EstadoChip estado={p.estado} />
                      </div>
                      {p.fecha_entrega_plan && (
                        <div style={{ fontSize: 12, color: "#888", marginBottom: 8 }}>
                          📅 Entrega estimada: <strong>{fmtFecha(p.fecha_entrega_plan)}</strong>
                          {p.fecha_inicio_real && (() => {
                            const dias = diasEntre(p.fecha_inicio_real, p.fecha_entrega_plan);
                            const transcurridos = diasEntre(p.fecha_inicio_real, new Date().toISOString().slice(0,10));
                            const restantes = dias ? dias - transcurridos : null;
                            return restantes !== null ? <span style={{ marginLeft: 8, color: restantes < 7 ? "#c0392b" : restantes < 14 ? "#f59e0b" : "#888" }}>({restantes > 0 ? `${restantes}d restantes` : "Vencido"})</span> : null;
                          })()}
                        </div>
                      )}
                      {p.checklist_total > 0 && (() => {
                        const pct = Math.round((p.checklist_ok / p.checklist_total) * 100);
                        return (
                          <div>
                            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#aaa", marginBottom: 4 }}>
                              <span>Avance de tareas</span><span>{p.checklist_ok}/{p.checklist_total} · {pct}%</span>
                            </div>
                            <div style={{ height: 6, background: "#f0f0f0", borderRadius: 3, overflow: "hidden" }}>
                              <div style={{ width: `${pct}%`, height: "100%", background: pct === 100 ? "#1a8a5e" : "#3b82f6", borderRadius: 3 }} />
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                    <div style={{ borderTop: "1px solid #f5f5f5", padding: "8px 16px", display: "flex", gap: 6 }}>
                      <button onClick={() => setPanelChecklist(p)} style={{ ...S.btn, fontSize: 12, padding: "7px 16px" }}>✅ Mis tareas</button>
                      <button onClick={() => setPanelHonorarios(p)} style={{ ...S.btnSm }}>💰 Mis honorarios</button>
                      {p.drive_url && <a href={p.drive_url} target="_blank" rel="noreferrer" style={{ ...S.btnSm, textDecoration: "none" }}>📁 Drive</a>}
                    </div>
                  </>
                )}
              </div>
            );
          })}
          {filtrados.length === 0 && <div style={{ textAlign: "center", padding: 40, color: "#aaa" }}>Sin proyectos en esta categoría</div>}
        </div>
      )}

      {modal && (
        <ModalProyecto
          proyecto={modal === "nuevo" ? null : modal}
          onClose={() => setModal(null)}
          perfil={perfil}
          onGuardar={async () => { setModal(null); setMsg("✓ Proyecto guardado"); setTimeout(() => setMsg(""), 2500); await cargar(); }}
        />
      )}
      {panelChecklist && (
        <PanelChecklist proyectoId={panelChecklist.id} proyecto={panelChecklist} perfil={perfil} onClose={() => { setPanelChecklist(null); cargar(); }} />
      )}
      {panelCobros && (
        <PanelCobros
          proyecto={panelCobros}
          presupuesto={presupuestosMap[panelCobros.presupuesto_id]}
          onClose={() => setPanelCobros(null)}
          onActualizar={cargar}
        />
      )}
      {panelHonorarios && (
        <PanelHonorarios
          proyecto={panelHonorarios}
          presupuesto={presupuestosMap[panelHonorarios.presupuesto_id]}
          perfil={perfil}
          onClose={() => setPanelHonorarios(null)}
          onActualizar={cargar}
        />
      )}
    </div>
  );
}
