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
  { v: "onboarding", label: "Onboarding",    color: "#f59e0b", bg: "#fffbeb" },
  { v: "activo",     label: "Activo",         color: "#3b82f6", bg: "#eff6ff" },
  { v: "revision",   label: "Revisión",       color: "#6366f1", bg: "#ede9fe" },
  { v: "para_cobrar",label: "Para cobrar",    color: "#1a8a5e", bg: "#f0fdf4" },
  { v: "terminado",  label: "Terminado",      color: "#888",    bg: "#f8f8f8" },
];

const CHECKLIST_DEFAULTS = [
  "Anteproyecto",
  "Memoria de cálculo",
  "Cómputo",
  "Para entrega",
];

const TIPOS_OBRA = ["Steel Frame", "Wood Frame", "Hormigón", "Panel SIP", "Metálica", "Mixta"];

const shared = {
  inp: { width: "100%", padding: "9px 12px", border: "1.5px solid #e0e0e0", borderRadius: 9, fontSize: 13, boxSizing: "border-box", background: "#fff", fontFamily: "inherit" },
  lbl: { fontSize: 10, color: "#aaa", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4, display: "block" },
  btn: { padding: "10px 20px", background: "#0a0a0a", color: "#fff", border: "none", borderRadius: 9, fontSize: 13, fontWeight: 700, cursor: "pointer" },
  btnSm: { padding: "6px 14px", background: "#f0f0f0", color: "#333", border: "1.5px solid #e0e0e0", borderRadius: 7, fontSize: 12, cursor: "pointer", fontWeight: 600 },
  card: { background: "#fff", border: "1.5px solid #e8e8e8", borderRadius: 12, padding: "14px 16px" },
};

/* ─── Chip de estado ─── */
function EstadoChip({ estado }) {
  const e = ESTADOS.find(x => x.v === estado) || ESTADOS[0];
  return <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20, background: e.bg, color: e.color, border: `1px solid ${e.color}30` }}>{e.label}</span>;
}

/* ─── Card de proyecto en la lista ─── */
function CardProyecto({ p, onClick, onCambiarEstado }) {
  const pct = p.checklist_total > 0 ? Math.round((p.checklist_ok / p.checklist_total) * 100) : null;
  return (
    <div onClick={onClick} style={{ ...shared.card, cursor: "pointer", borderLeft: `4px solid ${ESTADOS.find(e => e.v === p.estado)?.color || "#e0e0e0"}`, display: "grid", gridTemplateColumns: "80px 1fr auto", gap: 12, alignItems: "center" }}
      onMouseEnter={e => e.currentTarget.style.borderColor = "#111"}
      onMouseLeave={e => e.currentTarget.style.borderColor = "#e8e8e8"}>
      <div>
        <div style={{ fontFamily: "monospace", fontSize: 12, fontWeight: 700, color: "#555" }}>{p.codigo || p.numero_proyecto || "—"}</div>
        {p.fecha_entrega_plan && <div style={{ fontSize: 10, color: "#bbb", marginTop: 2 }}>{new Date(p.fecha_entrega_plan + "T12:00").toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit" })}</div>}
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: 14, color: "#111", marginBottom: 3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.descripcion || "Sin descripción"}</div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          {p.cliente && <span style={{ fontSize: 12, color: "#888" }}>{p.cliente}</span>}
          {p.encargado && <span style={{ fontSize: 11, background: "#f0f0f0", borderRadius: 4, padding: "1px 7px", color: "#555" }}>👤 {p.encargado}</span>}
          {p.tipo_obra && <span style={{ fontSize: 11, background: "#eff6ff", borderRadius: 4, padding: "1px 7px", color: "#3b82f6" }}>{p.tipo_obra}</span>}
          {p.superficie && <span style={{ fontSize: 11, color: "#aaa" }}>{p.superficie} m²</span>}
        </div>
        {pct !== null && (
          <div style={{ marginTop: 6, display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ flex: 1, height: 4, background: "#f0f0f0", borderRadius: 2, overflow: "hidden" }}>
              <div style={{ width: `${pct}%`, height: "100%", background: pct === 100 ? "#1a8a5e" : "#3b82f6", borderRadius: 2 }} />
            </div>
            <span style={{ fontSize: 10, color: "#aaa", flexShrink: 0 }}>{pct}%</span>
          </div>
        )}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-end" }}>
        <EstadoChip estado={p.estado} />
        {[
          p.anticipo && { label: "💰 Anticipo", color: "#1a8a5e" },
          p.check_diagnostico && { label: "🔍 Diagnóstico", color: "#6366f1" },
          p.proyecto_ok && { label: "✅ Proyecto", color: "#1a8a5e" },
          p.cobrado && { label: "✓ Cobrado", color: "#888" },
        ].filter(Boolean).map(b => (
          <span key={b.label} style={{ fontSize: 10, color: b.color, fontWeight: 600 }}>{b.label}</span>
        ))}
      </div>
    </div>
  );
}

/* ─── Panel de checklist por proyecto ─── */
function PanelChecklist({ proyectoId, onClose, perfil }) {
  const [checklists, setChecklists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [nuevoNombre, setNuevoNombre] = useState("");
  const [nuevaTarea, setNuevaTarea] = useState({});
  const [saving, setSaving] = useState(false);

  const cargar = useCallback(async () => {
    setLoading(true);
    const cls = await api(`/proyecto_checklists?proyecto_id=eq.${proyectoId}&order=orden.asc`);
    const tareas = await api(`/proyecto_tareas?proyecto_id=eq.${proyectoId}&order=orden.asc`);
    const map = {};
    (Array.isArray(tareas) ? tareas : []).forEach(t => {
      if (!map[t.checklist_id]) map[t.checklist_id] = [];
      map[t.checklist_id].push(t);
    });
    setChecklists((Array.isArray(cls) ? cls : []).map(cl => ({ ...cl, tareas: map[cl.id] || [] })));
    setLoading(false);
  }, [proyectoId]);

  useEffect(() => { cargar(); }, [cargar]);

  async function crearChecklist() {
    if (!nuevoNombre.trim()) return;
    setSaving(true);
    await api("/proyecto_checklists", { method: "POST", body: JSON.stringify({ proyecto_id: proyectoId, nombre: nuevoNombre.trim(), orden: checklists.length }) });
    setNuevoNombre("");
    await cargar();
    setSaving(false);
  }

  async function crearTarea(checklistId) {
    const texto = nuevaTarea[checklistId]?.trim();
    if (!texto) return;
    const cl = checklists.find(c => c.id === checklistId);
    setSaving(true);
    await api("/proyecto_tareas", { method: "POST", body: JSON.stringify({ checklist_id: checklistId, proyecto_id: proyectoId, texto, orden: (cl?.tareas?.length || 0) }) });
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
    if (!confirm("¿Eliminar este checklist y todas sus tareas?")) return;
    await api(`/proyecto_checklists?id=eq.${id}`, { method: "DELETE" });
    await cargar();
  }

  const totalTareas = checklists.reduce((s, cl) => s + cl.tareas.length, 0);
  const completadas = checklists.reduce((s, cl) => s + cl.tareas.filter(t => t.completada).length, 0);
  const pct = totalTareas > 0 ? Math.round(completadas / totalTareas * 100) : 0;

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 1000, display: "flex", alignItems: "flex-start", justifyContent: "flex-end" }}>
      <div style={{ background: "#fff", width: "min(520px, 100vw)", height: "100vh", overflow: "auto", padding: 24, boxShadow: "-4px 0 24px rgba(0,0,0,0.15)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 17, fontWeight: 800 }}>Tareas del proyecto</h2>
            {totalTareas > 0 && <div style={{ fontSize: 12, color: "#888", marginTop: 4 }}>{completadas}/{totalTareas} completadas · {pct}%</div>}
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "#888" }}>✕</button>
        </div>

        {/* Barra de progreso general */}
        {totalTareas > 0 && (
          <div style={{ height: 6, background: "#f0f0f0", borderRadius: 3, overflow: "hidden", marginBottom: 20 }}>
            <div style={{ width: `${pct}%`, height: "100%", background: pct === 100 ? "#1a8a5e" : "#3b82f6", transition: "width 0.3s" }} />
          </div>
        )}

        {loading ? <p style={{ color: "#aaa" }}>Cargando…</p> : (
          <>
            {checklists.map(cl => (
              <div key={cl.id} style={{ marginBottom: 20 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <h3 style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "#333", textTransform: "uppercase", letterSpacing: 0.5 }}>
                    {cl.nombre}
                    <span style={{ fontSize: 11, color: "#aaa", fontWeight: 400, textTransform: "none", marginLeft: 8 }}>
                      {cl.tareas.filter(t => t.completada).length}/{cl.tareas.length}
                    </span>
                  </h3>
                  <button onClick={() => eliminarChecklist(cl.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "#ccc", fontSize: 14 }}>🗑</button>
                </div>

                {cl.tareas.map(t => (
                  <div key={t.id} style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "7px 0", borderBottom: "1px solid #f5f5f5" }}>
                    <input type="checkbox" checked={t.completada} onChange={() => toggleTarea(t)}
                      style={{ marginTop: 2, accentColor: "#1a8a5e", cursor: "pointer", flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                      <span style={{ fontSize: 13, color: t.completada ? "#aaa" : "#111", textDecoration: t.completada ? "line-through" : "none" }}>{t.texto}</span>
                      {t.completada && t.completada_por && (
                        <div style={{ fontSize: 10, color: "#bbb", marginTop: 2 }}>✓ {t.completada_por}</div>
                      )}
                    </div>
                  </div>
                ))}

                {/* Nueva tarea */}
                <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                  <input value={nuevaTarea[cl.id] || ""} onChange={e => setNuevaTarea(p => ({ ...p, [cl.id]: e.target.value }))}
                    onKeyDown={e => e.key === "Enter" && crearTarea(cl.id)}
                    style={{ ...shared.inp, fontSize: 12, padding: "6px 10px" }} placeholder="+ Nueva tarea…" />
                  <button onClick={() => crearTarea(cl.id)} disabled={saving} style={{ ...shared.btnSm, whiteSpace: "nowrap" }}>Agregar</button>
                </div>
              </div>
            ))}

            {/* Nuevo checklist */}
            <div style={{ borderTop: "1.5px dashed #e0e0e0", paddingTop: 16, marginTop: 8 }}>
              <span style={shared.lbl}>Agregar sección</span>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
                {CHECKLIST_DEFAULTS.filter(n => !checklists.find(c => c.nombre === n)).map(n => (
                  <button key={n} onClick={() => { setNuevoNombre(n); }} style={{ ...shared.btnSm, fontSize: 11 }}>{n}</button>
                ))}
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <input value={nuevoNombre} onChange={e => setNuevoNombre(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && crearChecklist()}
                  style={{ ...shared.inp, fontSize: 12, padding: "7px 10px" }} placeholder="Nombre de la sección…" />
                <button onClick={crearChecklist} disabled={saving || !nuevoNombre.trim()} style={{ ...shared.btn, padding: "7px 14px", fontSize: 12 }}>
                  + Crear
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ─── Panel de honorarios ─── */
function PanelHonorarios({ proyecto, onClose, perfil, onActualizar }) {
  const [hon, setHon] = useState(null);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const esAdmin = perfil?.rol === "admin";
  const esCalculista = perfil?.rol === "calculista";

  useEffect(() => { cargar(); }, []);

  async function cargar() {
    const r = await api(`/proyecto_honorarios?proyecto_id=eq.${proyecto.id}`);
    const h = Array.isArray(r) && r.length > 0 ? r[0] : null;
    setHon(h);
    setForm(h || {
      proyecto_id: proyecto.id,
      porcentaje: 30,
      moneda: "ARS",
      condicion: "Contra entrega del proyecto",
      estado: "pendiente",
    });
  }

  async function guardar() {
    setSaving(true);
    try {
      const monto_pres = parseFloat(form.monto_presupuesto) || 0;
      const pct = parseFloat(form.porcentaje) || 30;
      const body = { ...form, monto_honorario: monto_pres > 0 ? Math.round(monto_pres * pct / 100) : null };
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
    setSaving(true);
    await api(`/proyecto_honorarios?id=eq.${hon.id}`, {
      method: "PATCH",
      body: JSON.stringify({ estado: "aceptado", aceptado_at: new Date().toISOString() })
    });
    setMsg("✓ Propuesta aceptada");
    setTimeout(() => setMsg(""), 2000);
    await cargar();
    setSaving(false);
  }

  async function marcarPagado() {
    setSaving(true);
    await api(`/proyecto_honorarios?id=eq.${hon.id}`, {
      method: "PATCH",
      body: JSON.stringify({ estado: "pagado", pagado_at: new Date().toISOString() })
    });
    setMsg("✓ Marcado como pagado");
    await cargar();
    setSaving(false);
  }

  const montoHon = form.monto_presupuesto && form.porcentaje
    ? Math.round(parseFloat(form.monto_presupuesto) * parseFloat(form.porcentaje) / 100)
    : null;

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ background: "#fff", borderRadius: 16, padding: 28, width: "min(520px, 95vw)", maxHeight: "90vh", overflow: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 17, fontWeight: 800 }}>Honorarios del calculista</h2>
            <p style={{ margin: "4px 0 0", fontSize: 12, color: "#888" }}>{proyecto.descripcion}</p>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer" }}>✕</button>
        </div>

        {/* Estado actual */}
        {hon?.estado && (
          <div style={{ background: hon.estado === "pagado" ? "#f0fdf4" : hon.estado === "aceptado" ? "#eff6ff" : "#fffbeb", borderRadius: 8, padding: "8px 14px", marginBottom: 16, fontSize: 13, fontWeight: 700, color: hon.estado === "pagado" ? "#1a8a5e" : hon.estado === "aceptado" ? "#3b82f6" : "#c4781a" }}>
            {hon.estado === "pagado" ? "✓ Pagado" : hon.estado === "aceptado" ? "✓ Aceptado por el calculista" : "⏳ Pendiente de aceptación"}
          </div>
        )}

        {/* Admin: configura la propuesta */}
        {esAdmin && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div>
                <span style={shared.lbl}>Calculista</span>
                <input value={form.calculista_nombre || ""} onChange={e => setForm(p => ({ ...p, calculista_nombre: e.target.value }))} style={shared.inp} placeholder="Nombre del calculista" />
              </div>
              <div>
                <span style={shared.lbl}>Monto presupuesto (ref)</span>
                <input type="number" value={form.monto_presupuesto || ""} onChange={e => setForm(p => ({ ...p, monto_presupuesto: e.target.value }))} style={shared.inp} placeholder="0" />
              </div>
              <div>
                <span style={shared.lbl}>% Honorario (máx 30%)</span>
                <input type="number" min="0" max="30" value={form.porcentaje || 30} onChange={e => setForm(p => ({ ...p, porcentaje: e.target.value }))} style={shared.inp} />
              </div>
              <div>
                <span style={shared.lbl}>Moneda</span>
                <select value={form.moneda || "ARS"} onChange={e => setForm(p => ({ ...p, moneda: e.target.value }))} style={shared.inp}>
                  <option value="ARS">$ ARS</option>
                  <option value="USD">U$S</option>
                </select>
              </div>
            </div>

            {/* Monto calculado */}
            {montoHon && (
              <div style={{ background: "#f0fdf4", borderRadius: 8, padding: "10px 14px", fontSize: 14, fontWeight: 800, color: "#1a8a5e", fontFamily: "monospace" }}>
                Honorario: {form.moneda === "USD" ? "U$S" : "$"} {montoHon.toLocaleString("es-AR")}
              </div>
            )}

            <div>
              <span style={shared.lbl}>Condición de pago</span>
              <input value={form.condicion || ""} onChange={e => setForm(p => ({ ...p, condicion: e.target.value }))} style={shared.inp} placeholder="Contra entrega del proyecto" />
            </div>
            <div>
              <span style={shared.lbl}>Condición especial (opcional)</span>
              <textarea value={form.condicion_especial || ""} onChange={e => setForm(p => ({ ...p, condicion_especial: e.target.value }))} style={{ ...shared.inp, resize: "none" }} rows={2} placeholder="Ej: 50% al iniciar, 50% al entregar" />
            </div>

            {msg && <div style={{ fontSize: 13, color: msg.startsWith("✓") ? "#1a8a5e" : "#c0392b", fontWeight: 600 }}>{msg}</div>}

            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={guardar} disabled={saving} style={shared.btn}>{saving ? "Guardando…" : "💾 Guardar propuesta"}</button>
              {hon?.estado === "aceptado" && <button onClick={marcarPagado} style={{ ...shared.btn, background: "#1a8a5e" }}>✓ Marcar pagado</button>}
            </div>

            {/* Datos de cobro del calculista */}
            {hon?.cbu && (
              <div style={{ background: "#f8f8f8", borderRadius: 8, padding: "10px 14px", fontSize: 12 }}>
                <div style={{ fontWeight: 700, marginBottom: 4 }}>Datos de cobro del calculista:</div>
                <div>CBU: {hon.cbu}</div>
                {hon.alias && <div>Alias: {hon.alias}</div>}
                {hon.factura && <div>✓ Emite factura</div>}
              </div>
            )}
          </div>
        )}

        {/* Calculista: ve la propuesta y acepta */}
        {esCalculista && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {hon ? (
              <>
                <div style={{ background: "#f8f8f8", borderRadius: 10, padding: 16 }}>
                  <div style={{ fontSize: 13, color: "#555", marginBottom: 8 }}>Propuesta de honorarios:</div>
                  <div style={{ fontSize: 22, fontWeight: 900, color: "#111", fontFamily: "monospace" }}>
                    {hon.moneda === "USD" ? "U$S" : "$"} {hon.monto_honorario?.toLocaleString("es-AR") || "—"}
                  </div>
                  <div style={{ fontSize: 13, color: "#888", marginTop: 6 }}>📋 {hon.condicion}</div>
                  {hon.condicion_especial && <div style={{ fontSize: 12, color: "#aaa", marginTop: 4 }}>{hon.condicion_especial}</div>}
                </div>

                {/* Datos de cobro */}
                <div>
                  <span style={shared.lbl}>Tu CBU</span>
                  <input value={form.cbu || ""} onChange={e => setForm(p => ({ ...p, cbu: e.target.value }))} style={shared.inp} placeholder="CBU para transferencia" />
                </div>
                <div>
                  <span style={shared.lbl}>Alias (opcional)</span>
                  <input value={form.alias || ""} onChange={e => setForm(p => ({ ...p, alias: e.target.value }))} style={shared.inp} placeholder="alias.cbu" />
                </div>
                <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13, cursor: "pointer" }}>
                  <input type="checkbox" checked={form.factura || false} onChange={e => setForm(p => ({ ...p, factura: e.target.checked }))} style={{ accentColor: "#111" }} />
                  Emito factura
                </label>

                {msg && <div style={{ fontSize: 13, color: msg.startsWith("✓") ? "#1a8a5e" : "#c0392b", fontWeight: 600 }}>{msg}</div>}

                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={guardar} disabled={saving} style={{ ...shared.btn, background: "#555" }}>{saving ? "Guardando…" : "💾 Guardar mis datos"}</button>
                  {hon.estado === "pendiente" && (
                    <button onClick={aceptar} disabled={saving || !form.cbu} style={shared.btn}>✅ Aceptar propuesta</button>
                  )}
                </div>
              </>
            ) : (
              <p style={{ color: "#aaa", fontSize: 13 }}>El admin todavía no cargó la propuesta de honorarios.</p>
            )}
          </div>
        )}
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
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      const tk = await getToken();
      const [clis, calcs, press] = await Promise.all([
        fetch(`${SUPA_URL}/clientes?select=id,empresa&order=empresa.asc`, { headers: hdrs(tk) }).then(r => r.json()),
        fetch(`${SUPA_URL}/calculistas?select=id,nombre,nivel&disponible=eq.true&order=nombre.asc`, { headers: hdrs(tk) }).then(r => r.json()),
        fetch(`${SUPA_URL}/presupuestos?estado=eq.aprobado&select=id,codigo,descripcion,cliente,monto,moneda,forma_pago,comitente_nombre&order=codigo.desc&limit=200`, { headers: hdrs(tk) }).then(r => r.json()),
      ]);
      setClientes(Array.isArray(clis) ? clis : []);
      setCalculistas(Array.isArray(calcs) ? calcs : []);
      setPresupuestos(Array.isArray(press) ? press : []);
    })();
  }, []);

  // Auto-completar cliente desde presupuesto vinculado
  useEffect(() => {
    if (form.presupuesto_id) {
      const pres = presupuestos.find(p => p.id === form.presupuesto_id);
      if (pres) {
        setForm(f => ({
          ...f,
          cliente: pres.comitente_nombre || pres.cliente || f.cliente,
        }));
      }
    }
  }, [form.presupuesto_id, presupuestos]);

  async function guardar() {
    if (!form.descripcion) return setError("La descripción es requerida");
    setSaving(true); setError("");
    try {
      const body = {
        ...form,
        cliente_id:         form.cliente_id || null,
        presupuesto_id:     form.presupuesto_id || null,
        superficie:         form.superficie ? parseFloat(form.superficie) : null,
        fecha_entrega_plan: form.fecha_entrega_plan || null,
      };
      if (proyecto?.id) {
        await api(`/proyectos?id=eq.${proyecto.id}`, { method: "PATCH", body: JSON.stringify(body) });
      } else {
        await api("/proyectos", { method: "POST", body: JSON.stringify(body) });
      }
      onGuardar();
    } catch(e) { setError(e.message); }
    setSaving(false);
  }

  const presSeleccionado = presupuestos.find(p => p.id === form.presupuesto_id);

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", zIndex: 999, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div style={{ background: "#fff", borderRadius: 16, padding: 28, width: "min(780px, 100%)", maxHeight: "90vh", overflow: "auto" }}>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>{esNuevo ? "Nuevo proyecto" : "Editar proyecto"}</h2>
            {proyecto?.codigo && <span style={{ fontSize: 12, fontFamily: "monospace", color: "#888" }}>[{proyecto.codigo}]</span>}
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "#888" }}>✕</button>
        </div>

        {/* Estado — solo admin puede cambiar */}
        {!esNuevo && (
          <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
            {ESTADOS.map(e => (
              <button key={e.v} onClick={() => esAdmin && setForm(f => ({ ...f, estado: e.v }))}
                style={{ padding: "7px 16px", borderRadius: 20, border: `2px solid ${form.estado === e.v ? e.color : "#e0e0e0"}`, background: form.estado === e.v ? e.bg : "#fff", color: form.estado === e.v ? e.color : "#888", fontWeight: form.estado === e.v ? 700 : 500, fontSize: 12, cursor: esAdmin ? "pointer" : "default" }}>
                {e.label}
              </button>
            ))}
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          {/* Nro proyecto */}
          <div>
            <span style={shared.lbl}>Nro proyecto</span>
            <input value={form.numero_proyecto} onChange={e => setForm(f => ({ ...f, numero_proyecto: e.target.value }))} style={shared.inp} placeholder="1188-P" />
          </div>
          {/* Descripción */}
          <div>
            <span style={shared.lbl}>Descripción *</span>
            <input value={form.descripcion} onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))} style={shared.inp} placeholder="Vivienda Los Puentes 168" />
          </div>

          {/* Presupuesto vinculado */}
          <div style={{ gridColumn: "1 / -1" }}>
            <span style={shared.lbl}>Presupuesto aprobado vinculado</span>
            <Combobox
              options={presupuestos.map(p => ({ value: p.id, label: `${p.codigo || ""} — ${p.descripcion || p.cliente || ""}` }))}
              value={form.presupuesto_id}
              onChange={val => setForm(f => ({ ...f, presupuesto_id: val }))}
              placeholder="Buscar presupuesto aprobado…"
              emptyLabel="Sin vincular"
            />
            {presSeleccionado && (
              <div style={{ marginTop: 6, background: "#f0fdf4", borderRadius: 7, padding: "7px 12px", fontSize: 12, color: "#555", display: "flex", gap: 16, flexWrap: "wrap" }}>
                <span>👤 {presSeleccionado.comitente_nombre || presSeleccionado.cliente}</span>
                {presSeleccionado.monto && <span>💰 {presSeleccionado.moneda === "USD" ? "U$S" : "$"}{parseFloat(presSeleccionado.monto).toLocaleString("es-AR")}</span>}
                {presSeleccionado.forma_pago && <span>📋 {presSeleccionado.forma_pago === "50_50" ? "50/50" : presSeleccionado.forma_pago === "25_50_25" ? "25/50/25" : "Personalizada"}</span>}
              </div>
            )}
          </div>

          {/* Cliente */}
          <div>
            <span style={shared.lbl}>Cliente / Comitente</span>
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
            <input value={form.cliente} onChange={e => setForm(f => ({ ...f, cliente: e.target.value }))} style={{ ...shared.inp, marginTop: 6, fontSize: 12 }} placeholder="O escribí el nombre…" />
          </div>

          {/* Calculista */}
          <div>
            <span style={shared.lbl}>Calculista encargado</span>
            <select value={form.encargado} onChange={e => setForm(f => ({ ...f, encargado: e.target.value }))} style={shared.inp}>
              <option value="">Sin asignar</option>
              {calculistas.map(c => <option key={c.id} value={c.nombre}>{c.nombre}{c.nivel ? ` · ${c.nivel}` : ""}</option>)}
            </select>
            {calculistas.length === 0 && <p style={{ fontSize: 11, color: "#aaa", margin: "4px 0 0" }}>No hay calculistas disponibles. Agregalos en Configuración → Usuarios.</p>}
          </div>

          {/* Tipo y superficie */}
          <div>
            <span style={shared.lbl}>Tipo de obra</span>
            <select value={form.tipo_obra} onChange={e => setForm(f => ({ ...f, tipo_obra: e.target.value }))} style={shared.inp}>
              <option value="">Seleccionar…</option>
              {TIPOS_OBRA.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <span style={shared.lbl}>Superficie m²</span>
            <input type="number" value={form.superficie} onChange={e => setForm(f => ({ ...f, superficie: e.target.value }))} style={shared.inp} placeholder="0" />
          </div>

          {/* Fecha entrega */}
          <div>
            <span style={shared.lbl}>Fecha entrega estimada</span>
            <input type="date" value={form.fecha_entrega_plan} onChange={e => setForm(f => ({ ...f, fecha_entrega_plan: e.target.value }))} style={shared.inp} />
          </div>

          {/* Drive */}
          <div>
            <span style={shared.lbl}>Link Drive</span>
            <input value={form.drive_url} onChange={e => setForm(f => ({ ...f, drive_url: e.target.value }))} style={shared.inp} placeholder="https://drive.google.com/…" />
          </div>

          {/* Observaciones */}
          <div style={{ gridColumn: "1 / -1" }}>
            <span style={shared.lbl}>Observaciones</span>
            <textarea value={form.obs} onChange={e => setForm(f => ({ ...f, obs: e.target.value }))} style={{ ...shared.inp, resize: "vertical" }} rows={3} />
          </div>
        </div>

        {/* Checkboxes de estado */}
        <div style={{ display: "flex", gap: 20, flexWrap: "wrap", marginTop: 16, paddingTop: 16, borderTop: "1px solid #f0f0f0" }}>
          {[
            { key: "anticipo", label: "💰 Anticipo cobrado" },
            { key: "check_diagnostico", label: "🔍 Diagnóstico OK" },
            { key: "proyecto_ok", label: "✅ Proyecto OK" },
            { key: "cobrado", label: "✓ Cobrado" },
          ].map(({ key, label }) => (
            <label key={key} style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13, cursor: "pointer" }}>
              <input type="checkbox" checked={form[key] || false} onChange={e => setForm(f => ({ ...f, [key]: e.target.checked }))} style={{ accentColor: "#111" }} />
              {label}
            </label>
          ))}
        </div>

        {error && <div style={{ background: "#fef2f2", color: "#c0392b", borderRadius: 8, padding: "8px 12px", marginTop: 12, fontSize: 13, fontWeight: 600 }}>❌ {error}</div>}

        <div style={{ display: "flex", gap: 8, marginTop: 20 }}>
          <button onClick={guardar} disabled={saving} style={shared.btn}>{saving ? "Guardando…" : "Guardar"}</button>
          <button onClick={onClose} style={shared.btnSm}>Cancelar</button>
        </div>
      </div>
    </div>
  );
}

/* ─── Componente principal ─── */
export default function Proyectos({ deepLinkId, perfil }) {
  const [proyectos, setProyectos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");
  const [tab, setTab] = useState("activos");
  const [busq, setBusq] = useState("");
  const [modal, setModal] = useState(null);
  const [panelChecklist, setPanelChecklist] = useState(null);
  const [panelHonorarios, setPanelHonorarios] = useState(null);
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
      const filtroCalc = esCalculista && perfil?.nombre ? `&encargado=eq.${encodeURIComponent(perfil.nombre)}` : "";
      let rows = await api(`/proyectos?order=created_at.desc${filtroCalc}`).catch(() => []);
      setProyectos(Array.isArray(rows) ? rows : []);
    } catch(e) { setError(e.message); }
    setLoading(false);
  }

  const TABS = [
    { id: "onboarding",  label: "Onboarding",   filter: p => p.estado === "onboarding" && !p.archivado },
    { id: "activos",     label: "Activos",        filter: p => p.estado === "activo" && !p.archivado },
    { id: "revision",    label: "Revisión",        filter: p => p.estado === "revision" && !p.archivado },
    { id: "para_cobrar", label: "Para cobrar",     filter: p => p.estado === "para_cobrar" && !p.archivado },
    { id: "terminado",   label: "Terminados",      filter: p => p.estado === "terminado" && !p.archivado },
    { id: "todos",       label: "Todos",            filter: p => !p.archivado },
  ];

  const tabActual = TABS.find(t => t.id === tab) || TABS[0];
  const filtrados = proyectos.filter(p => {
    const okTab = tabActual.filter(p);
    const q = busq.toLowerCase();
    const okBusq = !q || [p.descripcion, p.cliente, p.encargado, p.numero_proyecto, p.codigo].some(v => v?.toLowerCase().includes(q));
    return okTab && okBusq;
  });

  const kpis = {
    onboarding: proyectos.filter(p => p.estado === "onboarding" && !p.archivado).length,
    activos: proyectos.filter(p => p.estado === "activo" && !p.archivado).length,
    para_cobrar: proyectos.filter(p => p.estado === "para_cobrar" && !p.archivado).length,
    total: proyectos.filter(p => !p.archivado).length,
  };

  return (
    <div style={{ fontFamily: "system-ui, -apple-system, sans-serif", padding: "24px 20px", maxWidth: 1100, margin: "0 auto" }}>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20, flexWrap: "wrap", gap: 10 }}>
        <div>
          <p style={{ margin: 0, fontSize: 12, color: "#aaa" }}>NPL · Proyectos</p>
          <h1 style={{ margin: "2px 0 0", fontSize: 22, fontWeight: 800, color: "#111" }}>📐 Proyectos</h1>
        </div>
        {esAdmin && <button onClick={() => setModal("nuevo")} style={shared.btn}>+ Nuevo proyecto</button>}
      </div>

      {/* KPIs */}
      <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
        {[
          { label: "Onboarding", value: kpis.onboarding, color: "#f59e0b" },
          { label: "Activos",    value: kpis.activos,    color: "#3b82f6" },
          { label: "Para cobrar",value: kpis.para_cobrar,color: "#1a8a5e" },
          { label: "Total",      value: kpis.total,      color: "#888" },
        ].map(k => (
          <div key={k.label} style={{ background: "#fff", border: "1.5px solid #e8e8e8", borderRadius: 10, padding: "10px 16px", minWidth: 90 }}>
            <div style={{ fontSize: 20, fontWeight: 900, color: k.color, fontFamily: "monospace" }}>{k.value}</div>
            <div style={{ fontSize: 10, color: "#aaa", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5 }}>{k.label}</div>
          </div>
        ))}
      </div>

      {/* Filtros y tabs */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
        {TABS.map(t => {
          const count = proyectos.filter(t.filter).length;
          return (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              padding: "6px 14px", borderRadius: 8, fontSize: 12, fontWeight: tab === t.id ? 700 : 500,
              background: tab === t.id ? "#111" : "#f0f0f0",
              color: tab === t.id ? "#fff" : "#555",
              border: "none", cursor: "pointer",
            }}>
              {t.label} {count > 0 && <span style={{ opacity: 0.7 }}>({count})</span>}
            </button>
          );
        })}
        <input value={busq} onChange={e => setBusq(e.target.value)} placeholder="🔍 Buscar…"
          style={{ ...shared.inp, width: "auto", flex: 1, minWidth: 200, marginLeft: "auto" }} />
      </div>

      {msg && <div style={{ background: "#f0fdf4", color: "#1a8a5e", borderRadius: 8, padding: "8px 14px", marginBottom: 12, fontSize: 13, fontWeight: 600 }}>{msg}</div>}
      {error && <div style={{ background: "#fef2f2", color: "#c0392b", borderRadius: 8, padding: "8px 14px", marginBottom: 12, fontSize: 13 }}>❌ {error}</div>}
      {loading && <p style={{ color: "#aaa", textAlign: "center", padding: 40 }}>Cargando…</p>}

      {/* Lista */}
      {!loading && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {filtrados.map(p => (
            <div key={p.id}>
              <CardProyecto p={p} onClick={() => setModal(p)} onCambiarEstado={() => {}} />
              {/* Acciones */}
              <div style={{ display: "flex", gap: 6, padding: "6px 0 4px 16px" }}>
                <button onClick={() => setModal(p)} style={{ ...shared.btnSm, fontSize: 11 }}>✏️ Editar</button>
                <button onClick={() => setPanelChecklist(p)} style={{ ...shared.btnSm, fontSize: 11 }}>✅ Tareas</button>
                {esAdmin && (
                  <button onClick={() => setPanelHonorarios(p)} style={{ ...shared.btnSm, fontSize: 11 }}>💰 Honorarios</button>
                )}
                {esAdmin && p.estado !== "para_cobrar" && p.estado !== "terminado" && (
                  <button onClick={async () => {
                    await api(`/proyectos?id=eq.${p.id}`, { method: "PATCH", body: JSON.stringify({ estado: "para_cobrar" }) });
                    setMsg("✓ Proyecto marcado para cobrar");
                    setTimeout(() => setMsg(""), 2500);
                    cargar();
                  }} style={{ ...shared.btnSm, fontSize: 11, color: "#1a8a5e", borderColor: "#1a8a5e" }}>
                    → Para cobrar
                  </button>
                )}
                {esAdmin && p.estado === "para_cobrar" && (
                  <button onClick={async () => {
                    await api(`/proyectos?id=eq.${p.id}`, { method: "PATCH", body: JSON.stringify({ estado: "terminado", entregado: true }) });
                    setMsg("✓ Proyecto terminado");
                    setTimeout(() => setMsg(""), 2500);
                    cargar();
                  }} style={{ ...shared.btn, fontSize: 11, padding: "6px 14px", background: "#1a8a5e" }}>
                    ✓ Terminado
                  </button>
                )}
                {p.drive_url && (
                  <a href={p.drive_url} target="_blank" rel="noreferrer" style={{ ...shared.btnSm, fontSize: 11, textDecoration: "none" }}>📁 Drive</a>
                )}
              </div>
            </div>
          ))}
          {filtrados.length === 0 && !loading && (
            <div style={{ textAlign: "center", padding: 40, color: "#aaa", fontSize: 14 }}>Sin proyectos en esta categoría</div>
          )}
        </div>
      )}

      {/* Modales */}
      {modal && (
        <ModalProyecto
          proyecto={modal === "nuevo" ? null : modal}
          onClose={() => setModal(null)}
          perfil={perfil}
          onGuardar={async () => {
            setModal(null);
            setMsg("✓ Proyecto guardado");
            setTimeout(() => setMsg(""), 2500);
            await cargar();
          }}
        />
      )}
      {panelChecklist && (
        <PanelChecklist
          proyectoId={panelChecklist.id}
          perfil={perfil}
          onClose={() => { setPanelChecklist(null); cargar(); }}
        />
      )}
      {panelHonorarios && (
        <PanelHonorarios
          proyecto={panelHonorarios}
          perfil={perfil}
          onClose={() => setPanelHonorarios(null)}
          onActualizar={cargar}
        />
      )}
    </div>
  );
}
