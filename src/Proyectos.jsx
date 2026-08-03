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

/* ─── Panel de checklists ─── */
function PanelChecklist({ proyectoId, onClose, perfil }) {
  const [checklists, setChecklists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [nuevoNombre, setNuevoNombre] = useState("");
  const [nuevaTarea, setNuevaTarea] = useState({});
  const [saving, setSaving] = useState(false);

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
    setChecklists((Array.isArray(cls) ? cls : []).map(cl => ({ ...cl, tareas: map[cl.id] || [] })));
    setLoading(false);
  }, [proyectoId]);

  useEffect(() => { cargar(); }, [cargar]);

  async function crearChecklist(nombre) {
    const n = nombre || nuevoNombre.trim();
    if (!n) return;
    setSaving(true);
    await api("/proyecto_checklists", { method: "POST", body: JSON.stringify({ proyecto_id: proyectoId, nombre: n, orden: checklists.length }) });
    setNuevoNombre("");
    await cargar();
    setSaving(false);
  }

  async function crearTarea(checklistId) {
    const texto = nuevaTarea[checklistId]?.trim();
    if (!texto) return;
    const cl = checklists.find(c => c.id === checklistId);
    setSaving(true);
    await api("/proyecto_tareas", { method: "POST", body: JSON.stringify({ checklist_id: checklistId, proyecto_id: proyectoId, texto, orden: cl?.tareas?.length || 0 }) });
    setNuevaTarea(p => ({ ...p, [checklistId]: "" }));
    await cargar();
    setSaving(false);
  }

  async function toggleTarea(tarea) {
    const completada = !tarea.completada;
    await api(`/proyecto_tareas?id=eq.${tarea.id}`, {
      method: "PATCH",
      body: JSON.stringify({ completada, completada_at: completada ? new Date().toISOString() : null, completada_por: completada ? (perfil?.nombre || "") : null })
    });
    await cargar();
  }

  async function eliminarChecklist(id) {
    if (!confirm("¿Eliminar esta sección y todas sus tareas?")) return;
    await api(`/proyecto_checklists?id=eq.${id}`, { method: "DELETE" });
    await cargar();
  }

  async function eliminarTarea(id) {
    await api(`/proyecto_tareas?id=eq.${id}`, { method: "DELETE" });
    await cargar();
  }

  const total = checklists.reduce((s, cl) => s + cl.tareas.length, 0);
  const ok = checklists.reduce((s, cl) => s + cl.tareas.filter(t => t.completada).length, 0);
  const pct = total > 0 ? Math.round(ok / total * 100) : 0;

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 1000, display: "flex", alignItems: "flex-start", justifyContent: "flex-end" }}>
      <div style={{ background: "#fff", width: "min(500px, 100vw)", height: "100vh", overflow: "auto", padding: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 16, fontWeight: 800 }}>Tareas del proyecto</h2>
            {total > 0 && <div style={{ fontSize: 11, color: "#888", marginTop: 2 }}>{ok}/{total} · {pct}%</div>}
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "#888" }}>✕</button>
        </div>

        {total > 0 && <div style={{ height: 5, background: "#f0f0f0", borderRadius: 3, overflow: "hidden", marginBottom: 20 }}><div style={{ width: `${pct}%`, height: "100%", background: pct === 100 ? "#1a8a5e" : "#3b82f6", transition: "width 0.3s" }} /></div>}

        {loading ? <p style={{ color: "#aaa" }}>Cargando…</p> : (
          <>
            {checklists.map(cl => (
              <div key={cl.id} style={{ marginBottom: 20, background: "#fafafa", borderRadius: 10, padding: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                  <div style={{ fontSize: 12, fontWeight: 800, color: "#333", textTransform: "uppercase", letterSpacing: 0.5 }}>
                    {cl.nombre}
                    <span style={{ fontSize: 11, color: "#aaa", fontWeight: 400, textTransform: "none", marginLeft: 8 }}>{cl.tareas.filter(t => t.completada).length}/{cl.tareas.length}</span>
                  </div>
                  <button onClick={() => eliminarChecklist(cl.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "#ddd", fontSize: 14 }}>🗑</button>
                </div>

                {cl.tareas.map(t => (
                  <div key={t.id} style={{ display: "flex", alignItems: "flex-start", gap: 8, padding: "6px 0", borderBottom: "1px solid #f0f0f0" }}>
                    <input type="checkbox" checked={t.completada} onChange={() => toggleTarea(t)} style={{ marginTop: 2, accentColor: "#1a8a5e", cursor: "pointer", flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                      <span style={{ fontSize: 13, color: t.completada ? "#bbb" : "#111", textDecoration: t.completada ? "line-through" : "none" }}>{t.texto}</span>
                      {t.completada && t.completada_por && <div style={{ fontSize: 10, color: "#ccc" }}>✓ {t.completada_por}</div>}
                    </div>
                    <button onClick={() => eliminarTarea(t.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "#ddd", fontSize: 12, flexShrink: 0 }}>✕</button>
                  </div>
                ))}

                <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                  <input value={nuevaTarea[cl.id] || ""} onChange={e => setNuevaTarea(p => ({ ...p, [cl.id]: e.target.value }))}
                    onKeyDown={e => e.key === "Enter" && crearTarea(cl.id)}
                    style={{ ...S.inp, fontSize: 12, padding: "6px 10px" }} placeholder="+ Nueva tarea…" />
                  <button onClick={() => crearTarea(cl.id)} style={S.btnSm}>+</button>
                </div>
              </div>
            ))}

            <div style={{ borderTop: "1.5px dashed #e0e0e0", paddingTop: 16 }}>
              <div style={{ fontSize: 10, color: "#aaa", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 }}>Agregar sección</div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
                {CHECKLIST_DEFAULTS.filter(n => !checklists.find(c => c.nombre === n)).map(n => (
                  <button key={n} onClick={() => crearChecklist(n)} style={{ ...S.btnSm, fontSize: 11 }}>{n}</button>
                ))}
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <input value={nuevoNombre} onChange={e => setNuevoNombre(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && crearChecklist("")}
                  style={{ ...S.inp, fontSize: 12, padding: "7px 10px" }} placeholder="Nombre personalizado…" />
                <button onClick={() => crearChecklist("")} disabled={saving || !nuevoNombre.trim()} style={{ ...S.btn, padding: "7px 14px", fontSize: 12 }}>+ Crear</button>
              </div>
            </div>
          </>
        )}
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
                <input type="number" min="0" max="30" value={form.porcentaje || 30} onChange={e => setForm(p => ({ ...p, porcentaje: Math.min(30, parseFloat(e.target.value) || 0) }))} style={S.inp} />
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
  const [form, setForm] = useState({ nombre: "", mail: "", nivel: "Junior", disponible: true });
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
          {["Junior", "Semi-senior", "Senior"].map(n => <option key={n}>{n}</option>)}
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

  useEffect(() => {
    (async () => {
      const tk = await getToken();
      const [clis, calcs, press] = await Promise.all([
        fetch(`${SUPA_URL}/clientes?select=id,empresa&order=empresa.asc`, { headers: hdrs(tk) }).then(r => r.json()),
        fetch(`${SUPA_URL}/calculistas?select=id,nombre,nivel,disponible,estado&order=nombre.asc`, { headers: hdrs(tk) }).then(r => r.json()),
        fetch(`${SUPA_URL}/presupuestos?estado=eq.aprobado&select=id,codigo,descripcion,cliente,comitente_nombre,monto,moneda,forma_pago&order=codigo.desc&limit=300`, { headers: hdrs(tk) }).then(r => r.json()),
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
        setForm(f => ({
          ...f,
          cliente: pres.comitente_nombre || pres.cliente || f.cliente,
          numero_proyecto: f.numero_proyecto || (pres.codigo ? pres.codigo + "-P" : ""),
        }));
      }
    }
  }, [form.presupuesto_id, presupuestos]);

  async function guardar() {
    if (!form.descripcion) return setError("La descripción es requerida");
    setSaving(true); setError("");
    try {
      const hoy = new Date().toISOString().slice(0, 10);
      const estadoAnterior = proyecto?.estado;
      const body = {
        ...form,
        cliente_id: form.cliente_id || null,
        presupuesto_id: form.presupuesto_id || null,
        superficie: form.superficie ? parseFloat(form.superficie) : null,
        fecha_entrega_plan: form.fecha_entrega_plan || null,
        // Fechas automáticas por cambio de estado
        ...(form.estado === "activo" && estadoAnterior !== "activo" ? { fecha_inicio_real: hoy } : {}),
        ...(["para_cobrar", "terminado"].includes(form.estado) && !["para_cobrar", "terminado"].includes(estadoAnterior) ? { fecha_entrega_real: hoy } : {}),
      };
      if (proyecto?.id) {
        await api(`/proyectos?id=eq.${proyecto.id}`, { method: "PATCH", body: JSON.stringify(body) });
      } else {
        const res = await api("/proyectos", { method: "POST", body: JSON.stringify(body) });
        // Crear checklists default para proyecto nuevo
        const nuevoId = Array.isArray(res) ? res[0]?.id : res?.id;
        if (nuevoId) {
          for (let i = 0; i < CHECKLIST_DEFAULTS.length; i++) {
            await api("/proyecto_checklists", { method: "POST", body: JSON.stringify({ proyecto_id: nuevoId, nombre: CHECKLIST_DEFAULTS[i], orden: i }) }).catch(() => {});
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
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>

            <div>
              <span style={S.lbl}>Nro proyecto</span>
              <input value={form.numero_proyecto} onChange={e => setForm(f => ({ ...f, numero_proyecto: e.target.value }))} style={S.inp} placeholder="1188-P" />
            </div>
            <div>
              <span style={S.lbl}>Descripción *</span>
              <input value={form.descripcion} onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))} style={S.inp} />
            </div>

            {/* Presupuesto */}
            <div style={{ gridColumn: "1 / -1" }}>
              <span style={S.lbl}>Presupuesto aprobado vinculado</span>
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
              {/* Info del presupuesto + cuotas */}
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

            {/* Cliente */}
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

            {/* Calculista + botón nuevo */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 3 }}>
                <span style={S.lbl}>Calculista encargado</span>
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

            <div>
              <span style={S.lbl}>Tipo de obra</span>
              <select value={form.tipo_obra} onChange={e => setForm(f => ({ ...f, tipo_obra: e.target.value }))} style={S.inp}>
                <option value="">Seleccionar…</option>
                {TIPOS_OBRA.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <span style={S.lbl}>Superficie m²</span>
              <input type="number" value={form.superficie} onChange={e => setForm(f => ({ ...f, superficie: e.target.value }))} style={S.inp} />
            </div>
            <div>
              <span style={S.lbl}>Fecha entrega estimada</span>
              <input type="date" value={form.fecha_entrega_plan} onChange={e => setForm(f => ({ ...f, fecha_entrega_plan: e.target.value }))} style={S.inp} />
            </div>
            <div>
              <span style={S.lbl}>Link Drive</span>
              <input value={form.drive_url} onChange={e => setForm(f => ({ ...f, drive_url: e.target.value }))} style={S.inp} placeholder="https://drive.google.com/…" />
            </div>
            <div style={{ gridColumn: "1 / -1" }}>
              <span style={S.lbl}>Observaciones</span>
              <textarea value={form.obs} onChange={e => setForm(f => ({ ...f, obs: e.target.value }))} style={{ ...S.inp, resize: "none" }} rows={2} />
            </div>
          </div>

          {/* Checkboxes */}
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginTop: 14, paddingTop: 14, borderTop: "1px solid #f0f0f0" }}>
            {[
              { key: "anticipo", label: "💰 Anticipo cobrado" },
              { key: "check_diagnostico", label: "🔍 Diagnóstico OK" },
              { key: "proyecto_ok", label: "✅ Proyecto OK" },
              { key: "cobrado", label: "✓ Cobrado" },
            ].map(({ key, label }) => (
              <label key={key} style={{ display: "flex", gap: 7, alignItems: "center", fontSize: 12, cursor: "pointer" }}>
                <input type="checkbox" checked={form[key] || false} onChange={e => setForm(f => ({ ...f, [key]: e.target.checked }))} style={{ accentColor: "#111" }} />
                {label}
              </label>
            ))}
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
                          {p.encargado && <span style={{ fontSize: 11, background: "#f0f0f0", borderRadius: 4, padding: "1px 7px" }}>👤 {p.encargado}</span>}
                          {p.tipo_obra && <span style={{ fontSize: 11, background: "#eff6ff", borderRadius: 4, padding: "1px 7px", color: "#3b82f6" }}>{p.tipo_obra}</span>}
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
        <PanelChecklist proyectoId={panelChecklist.id} perfil={perfil} onClose={() => { setPanelChecklist(null); cargar(); }} />
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
