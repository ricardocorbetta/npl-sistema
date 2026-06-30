import React, { useEffect, useState, useRef } from "react";
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

/* ─── Constantes ─── */
const ESTADOS = [
  { v: "onboarding", label: "Onboarding", color: "#f59e0b", icon: "🟡", desc: "Relevamiento inicial" },
  { v: "activo",     label: "Activo",     color: "#22c55e", icon: "🟢", desc: "En desarrollo" },
  { v: "revision",   label: "Revisión",   color: "#3b82f6", icon: "🔵", desc: "En corrección" },
  { v: "entregado",  label: "Entregado",  color: "#888",    icon: "⚪", desc: "Finalizado" },
];
const ESTADO_ORDER = ["onboarding", "activo", "revision"];
const TIPOS_OBRA = ["Steel Frame", "Wood Frame", "Hormigón", "Madera", "Panel SIP", "Metálica", "Mixta"];

const shared = {
  btn:   { padding: "10px 18px", background: "#111", color: "#fff", border: "none", borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: "pointer" },
  btnSm: { padding: "7px 12px", background: "#f0f0f0", color: "#333", border: "none", borderRadius: 8, fontSize: 13, cursor: "pointer" },
  inp:   { width: "100%", padding: "10px 12px", border: "1px solid #e0e0e0", borderRadius: 10, fontSize: 14, boxSizing: "border-box" },
  card:  { background: "#fff", borderRadius: 14, padding: 16, boxShadow: "0 1px 6px rgba(0,0,0,.07)" },
  lbl:   { fontSize: 11, color: "#888", fontWeight: 600, textTransform: "uppercase", letterSpacing: .5, marginBottom: 5, display: "block" },
};

/* ════════════════════════════════════════════
   CHECKLIST PANEL
════════════════════════════════════════════ */
function PanelChecklist({ proyectoId, onClose }) {
  const [items, setItems]   = useState([]);
  const [nuevo, setNuevo]   = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]  = useState(false);
  const inputRef = useRef();

  useEffect(() => { cargar(); }, [proyectoId]);

  async function cargar() {
    const tk = await getToken();
    const r = await fetch(`${SUPA_URL}/proyecto_checklist?proyecto_id=eq.${proyectoId}&order=orden.asc,created_at.asc`, { headers: hdrs(tk) }).then(r => r.json());
    setItems(Array.isArray(r) ? r : []);
    setLoading(false);
  }

  async function agregar() {
    if (!nuevo.trim()) return;
    setSaving(true);
    const tk = await getToken();
    const r = await fetch(`${SUPA_URL}/proyecto_checklist`, {
      method: "POST", headers: hdrs(tk),
      body: JSON.stringify({ proyecto_id: proyectoId, texto: nuevo.trim(), orden: items.length })
    }).then(r => r.json());
    setItems(prev => [...prev, r[0]]);
    setNuevo("");
    inputRef.current?.focus();
    setSaving(false);
  }

  async function toggle(item) {
    const tk = await getToken();
    await fetch(`${SUPA_URL}/proyecto_checklist?id=eq.${item.id}`, {
      method: "PATCH", headers: hdrs(tk),
      body: JSON.stringify({ completado: !item.completado })
    });
    setItems(prev => prev.map(i => i.id === item.id ? { ...i, completado: !i.completado } : i));
  }

  async function eliminar(id) {
    const tk = await getToken();
    await fetch(`${SUPA_URL}/proyecto_checklist?id=eq.${id}`, { method: "DELETE", headers: hdrs(tk) });
    setItems(prev => prev.filter(i => i.id !== id));
  }

  const completados = items.filter(i => i.completado).length;
  const pct = items.length ? Math.round((completados / items.length) * 100) : 0;

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.55)", display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 200 }}>
      <div style={{ background: "#fff", borderRadius: "20px 20px 0 0", padding: "20px 20px 40px", width: "100%", maxWidth: 560, maxHeight: "80vh", overflowY: "auto" }}>
        <div style={{ width: 40, height: 4, background: "#e0e0e0", borderRadius: 2, margin: "0 auto 16px" }} />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 17 }}>✅ Checklist</div>
            {items.length > 0 && <div style={{ fontSize: 12, color: "#888", marginTop: 2 }}>{completados}/{items.length} · {pct}%</div>}
          </div>
          <button onClick={onClose} style={{ ...shared.btnSm, padding: "6px 10px" }}>✕</button>
        </div>

        {items.length > 0 && (
          <div style={{ height: 5, background: "#f0f0f0", borderRadius: 3, overflow: "hidden", marginBottom: 14 }}>
            <div style={{ height: "100%", width: `${pct}%`, background: "#22c55e", transition: "width .4s" }} />
          </div>
        )}

        {/* Input nuevo item */}
        <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          <input ref={inputRef} value={nuevo} onChange={e => setNuevo(e.target.value)}
            onKeyDown={e => e.key === "Enter" && agregar()}
            placeholder="Nueva tarea… (Enter para agregar)"
            style={{ ...shared.inp, flex: 1 }} />
          <button onClick={agregar} disabled={saving || !nuevo.trim()} style={{ ...shared.btn, padding: "10px 14px", fontSize: 13, flexShrink: 0 }}>+</button>
        </div>

        {/* Lista */}
        {loading ? <p style={{ color: "#aaa", textAlign: "center" }}>Cargando…</p>
        : items.length === 0 ? <p style={{ color: "#bbb", textAlign: "center", padding: "20px 0", fontSize: 13 }}>Sin tareas. Agregá la primera.</p>
        : items.map(item => (
          <div key={item.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", background: item.completado ? "#f0fdf4" : "#f8f8f8", borderRadius: 10, marginBottom: 6 }}>
            <div onClick={() => toggle(item)} style={{ width: 22, height: 22, borderRadius: 6, border: `2px solid ${item.completado ? "#22c55e" : "#ddd"}`, background: item.completado ? "#22c55e" : "#fff", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}>
              {item.completado && <span style={{ color: "#fff", fontSize: 13, fontWeight: 900 }}>✓</span>}
            </div>
            <span style={{ flex: 1, fontSize: 14, color: item.completado ? "#16a34a" : "#111", textDecoration: item.completado ? "line-through" : "none" }}>{item.texto}</span>
            <button onClick={() => eliminar(item.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "#ccc", fontSize: 16, flexShrink: 0 }}>🗑</button>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════
   MODAL CREAR / EDITAR PROYECTO
════════════════════════════════════════════ */
function ModalProyecto({ proyecto, onClose, onGuardar }) {
  const esNuevo = !proyecto?.id;
  const [form, setForm] = useState({
    numero_proyecto:    proyecto?.numero_proyecto    || "",
    descripcion:        proyecto?.descripcion        || "",
    cliente:            proyecto?.cliente            || "",
    cliente_id:         proyecto?.cliente_id         || "",
    encargado:          proyecto?.encargado          || "",
    estado:             proyecto?.estado             || "onboarding",
    categoria:          proyecto?.categoria          || "",
    tipo_obra:          proyecto?.tipo_obra          || "",
    superficie:         proyecto?.superficie         || "",
    fecha_entrega_plan: proyecto?.fecha_entrega_plan || "",
    anticipo:           proyecto?.anticipo           || false,
    check_diagnostico:  proyecto?.check_diagnostico  || false,
    proyecto_ok:        proyecto?.proyecto_ok        || false,
    cobrado:            proyecto?.cobrado            || false,
    drive_url:          proyecto?.drive_url          || "",
    obs:                proyecto?.obs                || "",
    proxima_tarea:      proyecto?.proxima_tarea      || "",
    presupuesto_id:     proyecto?.presupuesto_id     || "",
  });
  const [saving, setSaving] = useState(false);
  const [clientes, setClientes] = useState([]);
  const [presupuestos, setPresupuestos] = useState([]);
  const [calculistas, setCalculistas] = useState([]);

  useEffect(() => {
    async function cargar() {
      const tk = await getToken();
      const [cArr, pArr, calcArr] = await Promise.all([
        fetch(`${SUPA_URL}/clientes?select=id,empresa&order=empresa.asc`, { headers: hdrs(tk) }).then(r => r.json()),
        fetch(`${SUPA_URL}/presupuestos?select=id,codigo,descripcion,cliente&order=created_at.desc`, { headers: hdrs(tk) }).then(r => r.json()),
        fetch(`${SUPA_URL}/calculistas?select=id,nombre,nivel&order=nombre.asc`, { headers: hdrs(tk) }).then(r => r.json()),
      ]);
      setClientes(Array.isArray(cArr) ? cArr : []);
      setPresupuestos(Array.isArray(pArr) ? pArr : []);
      setCalculistas(Array.isArray(calcArr) ? calcArr : []);
    }
    cargar();
  }, []);

  async function guardar() {
    setSaving(true);
    const tk = await getToken();
    const body = { ...form, superficie: form.superficie ? parseFloat(form.superficie) : null };
    if (esNuevo) {
      await fetch(`${SUPA_URL}/proyectos`, { method: "POST", headers: hdrs(tk), body: JSON.stringify(body) });
    } else {
      await fetch(`${SUPA_URL}/proyectos?id=eq.${proyecto.id}`, { method: "PATCH", headers: hdrs(tk), body: JSON.stringify(body) });
    }
    await onGuardar();
    setSaving(false);
  }

  const estadoActual = ESTADOS.find(e => e.v === form.estado);

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 16 }}>
      <div style={{ background: "#fff", borderRadius: 16, padding: 28, width: "100%", maxWidth: 560, maxHeight: "92vh", overflowY: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
          <h3 style={{ margin: 0, fontSize: 17 }}>{esNuevo ? "Nuevo proyecto" : "Editar proyecto"}</h3>
          <button onClick={onClose} style={{ ...shared.btnSm, padding: "5px 10px" }}>✕</button>
        </div>

        {/* Estado selector visual */}
        <div style={{ marginBottom: 16 }}>
          <span style={shared.lbl}>Estado</span>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {ESTADOS.map(e => (
              <button key={e.v} onClick={() => setForm(f => ({ ...f, estado: e.v }))}
                style={{ padding: "8px 14px", borderRadius: 10, border: `2px solid ${form.estado === e.v ? e.color : "#e0e0e0"}`, background: form.estado === e.v ? e.color + "18" : "#fff", color: form.estado === e.v ? e.color : "#888", fontWeight: form.estado === e.v ? 700 : 400, fontSize: 13, cursor: "pointer" }}>
                {e.icon} {e.label}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "120px 1fr", gap: 12, marginBottom: 12 }}>
          <div>
            <span style={shared.lbl}>N° Proyecto</span>
            <input value={form.numero_proyecto} onChange={e => setForm(f => ({ ...f, numero_proyecto: e.target.value }))} style={shared.inp} placeholder="2026-001" />
          </div>
          <div>
            <span style={shared.lbl}>Descripción *</span>
            <input value={form.descripcion} onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))} style={shared.inp} placeholder="Descripción del proyecto" />
          </div>
        </div>

        <div style={{ marginBottom: 12 }}>
          <span style={shared.lbl}>Cliente</span>
          <Combobox options={clientes.map(c => ({ value: c.id, label: c.empresa }))} value={form.cliente_id} onChange={val => { const c = clientes.find(c => c.id === val); setForm(f => ({ ...f, cliente_id: val, cliente: c?.empresa || f.cliente })); }} placeholder="Buscar cliente…" emptyLabel="Sin vincular" />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
          <div>
            <span style={shared.lbl}>Encargado</span>
            <select value={form.encargado} onChange={e => setForm(f => ({ ...f, encargado: e.target.value }))} style={shared.inp}>
              <option value="">Sin asignar</option>
              {calculistas.map(c => <option key={c.id} value={c.nombre}>{c.nombre} · {c.nivel}</option>)}
            </select>
          </div>
          <div>
            <span style={shared.lbl}>Categoría</span>
            <input value={form.categoria} onChange={e => setForm(f => ({ ...f, categoria: e.target.value }))} style={shared.inp} placeholder="Ej: Vivienda, Comercial…" />
          </div>
          <div>
            <span style={shared.lbl}>Tipo de obra</span>
            <select value={form.tipo_obra} onChange={e => setForm(f => ({ ...f, tipo_obra: e.target.value }))} style={shared.inp}>
              <option value="">— Seleccionar —</option>
              {TIPOS_OBRA.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <span style={shared.lbl}>Superficie (m²)</span>
            <input type="number" min="0" value={form.superficie} onChange={e => setForm(f => ({ ...f, superficie: e.target.value }))} style={shared.inp} placeholder="0" />
          </div>
          <div>
            <span style={shared.lbl}>Fecha entrega plan</span>
            <input type="date" value={form.fecha_entrega_plan} onChange={e => setForm(f => ({ ...f, fecha_entrega_plan: e.target.value }))} style={shared.inp} />
          </div>
          <div>
            <span style={shared.lbl}>Próxima tarea</span>
            <input value={form.proxima_tarea} onChange={e => setForm(f => ({ ...f, proxima_tarea: e.target.value }))} style={shared.inp} placeholder="Ej: Revisar planos…" />
          </div>
        </div>

        <div style={{ marginBottom: 12 }}>
          <span style={shared.lbl}>Presupuesto vinculado</span>
          <Combobox options={presupuestos.map(p => ({ value: p.id, label: `${p.codigo || ""} — ${p.descripcion || p.cliente || ""}`.trim() }))} value={form.presupuesto_id} onChange={val => setForm(f => ({ ...f, presupuesto_id: val }))} placeholder="Buscar presupuesto…" emptyLabel="Sin vincular" />
        </div>

        <div style={{ marginBottom: 12 }}>
          <span style={shared.lbl}>Link Drive</span>
          <input value={form.drive_url} onChange={e => setForm(f => ({ ...f, drive_url: e.target.value }))} style={shared.inp} placeholder="https://drive.google.com/…" />
        </div>

        <div style={{ marginBottom: 16 }}>
          <span style={shared.lbl}>Observaciones</span>
          <textarea value={form.obs} onChange={e => setForm(f => ({ ...f, obs: e.target.value }))} rows={3} style={{ ...shared.inp, resize: "vertical" }} />
        </div>

        {/* Flags */}
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 20 }}>
          {[
            { key: "anticipo",          label: "💰 Anticipo cobrado" },
            { key: "check_diagnostico", label: "🔍 Diagnóstico OK" },
            { key: "proyecto_ok",       label: "✅ Proyecto OK" },
            { key: "cobrado",           label: "✓ Cobrado" },
          ].map(f => (
            <label key={f.key} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, cursor: "pointer" }}>
              <input type="checkbox" checked={!!form[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.checked }))} style={{ width: 16, height: 16 }} />
              {f.label}
            </label>
          ))}
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={guardar} disabled={saving || !form.descripcion} style={{ ...shared.btn, flex: 1 }}>{saving ? "Guardando…" : "Guardar"}</button>
          <button onClick={onClose} style={{ ...shared.btnSm, flex: 1, padding: "10px" }}>Cancelar</button>
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════
   FILA DE PROYECTO
════════════════════════════════════════════ */
function FilaProyecto({ proyecto, onEditar, onChecklist, onArchivar }) {
  const estado = ESTADOS.find(e => e.v === proyecto.estado) || ESTADOS[1];
  const [expanded, setExpanded] = useState(false);

  const diasRestantes = proyecto.fecha_entrega_plan
    ? Math.ceil((new Date(proyecto.fecha_entrega_plan + "T12:00") - new Date()) / 86400000)
    : null;

  const pctChecklist = proyecto.checklist_total > 0
    ? Math.round((proyecto.checklist_completados / proyecto.checklist_total) * 100) : null;

  return (
    <div style={{ background: "#fff", borderRadius: 14, marginBottom: 8, boxShadow: "0 1px 5px rgba(0,0,0,.06)", overflow: "hidden", borderLeft: `4px solid ${estado.color}` }}>
      {/* Fila principal */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", cursor: "pointer" }} onClick={() => setExpanded(!expanded)}>
        {/* Número */}
        <div style={{ fontSize: 11, fontWeight: 700, color: "#aaa", minWidth: 70, flexShrink: 0 }}>
          {proyecto.numero_proyecto || "—"}
        </div>

        {/* Info principal */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span style={{ fontWeight: 700, fontSize: 14 }}>{proyecto.descripcion || "Sin descripción"}</span>
            {proyecto.tipo_obra && <span style={{ fontSize: 10, background: "#f0f0f0", borderRadius: 4, padding: "1px 6px", color: "#666" }}>{proyecto.tipo_obra}</span>}
          </div>
          <div style={{ fontSize: 12, color: "#888", marginTop: 2 }}>
            {proyecto.cliente || "—"}
            {proyecto.encargado && ` · ${proyecto.encargado}`}
            {proyecto.superficie && ` · ${proyecto.superficie}m²`}
          </div>
          {proyecto.proxima_tarea && (
            <div style={{ fontSize: 11, color: "#6366f1", marginTop: 3 }}>→ {proyecto.proxima_tarea}</div>
          )}
        </div>

        {/* Badges derechos */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4, flexShrink: 0 }}>
          {/* Fecha entrega */}
          {diasRestantes !== null && (
            <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 5,
              background: diasRestantes < 0 ? "#fef2f2" : diasRestantes < 7 ? "#fffbeb" : "#f0fdf4",
              color: diasRestantes < 0 ? "#ef4444" : diasRestantes < 7 ? "#d97706" : "#16a34a" }}>
              {diasRestantes < 0 ? `${Math.abs(diasRestantes)}d vencido` : diasRestantes === 0 ? "Hoy" : `${diasRestantes}d`}
            </span>
          )}
          {/* Checklist */}
          {pctChecklist !== null && (
            <span style={{ fontSize: 10, color: pctChecklist === 100 ? "#22c55e" : "#888" }}>
              ✅ {proyecto.checklist_completados}/{proyecto.checklist_total}
            </span>
          )}
          {/* Flags */}
          <div style={{ display: "flex", gap: 4 }}>
            {proyecto.anticipo          && <span title="Anticipo" style={{ fontSize: 12 }}>💰</span>}
            {proyecto.proyecto_ok       && <span title="Proyecto OK" style={{ fontSize: 12 }}>✅</span>}
            {proyecto.cobrado           && <span title="Cobrado" style={{ fontSize: 12 }}>✓</span>}
            {proyecto.drive_url         && <a href={proyecto.drive_url} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()} style={{ fontSize: 12 }}>📂</a>}
          </div>
          <span style={{ fontSize: 11, color: "#bbb" }}>{expanded ? "▲" : "▼"}</span>
        </div>
      </div>

      {/* Expandido */}
      {expanded && (
        <div style={{ padding: "0 16px 14px", borderTop: "1px solid #f5f5f5" }}>
          {proyecto.obs && <p style={{ fontSize: 13, color: "#666", margin: "10px 0 10px" }}>{proyecto.obs}</p>}

          {/* Barra checklist */}
          {proyecto.checklist_total > 0 && (
            <div style={{ marginBottom: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#aaa", marginBottom: 3 }}>
                <span>Checklist</span><span>{pctChecklist}%</span>
              </div>
              <div style={{ height: 5, background: "#f0f0f0", borderRadius: 3, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${pctChecklist}%`, background: "#22c55e" }} />
              </div>
            </div>
          )}

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button onClick={() => onEditar(proyecto)} style={{ ...shared.btnSm, fontSize: 12 }}>✏️ Editar</button>
            <button onClick={() => onChecklist(proyecto)} style={{ ...shared.btnSm, fontSize: 12 }}>✅ Checklist</button>
            {proyecto.estado !== "entregado" && (
              <button onClick={() => onArchivar(proyecto)} style={{ ...shared.btnSm, fontSize: 12, color: "#888" }}>📦 Archivar</button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════
   CRONOGRAMA MENSUAL
════════════════════════════════════════════ */
function CronogramaMensual({ proyectos }) {
  const hoy = new Date();
  const meses = [];
  for (let i = 0; i < 6; i++) {
    const d = new Date(hoy.getFullYear(), hoy.getMonth() + i, 1);
    meses.push({ year: d.getFullYear(), month: d.getMonth(), label: d.toLocaleDateString("es-AR", { month: "long", year: "numeric" }) });
  }

  const porMes = {};
  proyectos.forEach(p => {
    if (!p.fecha_entrega_plan) return;
    const d = new Date(p.fecha_entrega_plan + "T12:00");
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    if (!porMes[key]) porMes[key] = [];
    porMes[key].push(p);
  });

  const conProyectos = meses.filter(m => porMes[`${m.year}-${m.month}`]?.length > 0);
  if (conProyectos.length === 0) return null;

  return (
    <div style={{ marginTop: 32 }}>
      <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 16 }}>📅 Cronograma de entregas</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 14 }}>
        {meses.map(m => {
          const key = `${m.year}-${m.month}`;
          const items = porMes[key] || [];
          if (items.length === 0) return null;
          const esActual = m.year === hoy.getFullYear() && m.month === hoy.getMonth();
          return (
            <div key={key} style={{ background: "#fff", borderRadius: 14, padding: 16, boxShadow: "0 1px 6px rgba(0,0,0,.07)", border: esActual ? "2px solid #6366f1" : "none" }}>
              <div style={{ fontWeight: 700, fontSize: 13, color: esActual ? "#6366f1" : "#111", marginBottom: 10, textTransform: "capitalize" }}>
                {esActual && "📍 "}{m.label}
                <span style={{ fontSize: 11, fontWeight: 400, color: "#aaa", marginLeft: 6 }}>{items.length} entrega{items.length > 1 ? "s" : ""}</span>
              </div>
              {items.map(p => {
                const estado = ESTADOS.find(e => e.v === p.estado) || ESTADOS[1];
                const dia = new Date(p.fecha_entrega_plan + "T12:00").getDate();
                return (
                  <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: "1px solid #f5f5f5" }}>
                    <div style={{ width: 32, height: 32, borderRadius: 8, background: estado.color + "18", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <span style={{ fontWeight: 800, fontSize: 14, color: estado.color }}>{dia}</span>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.descripcion}</div>
                      <div style={{ fontSize: 10, color: "#aaa" }}>{p.cliente || "—"} · {p.numero_proyecto || "—"}</div>
                    </div>
                    <span style={{ fontSize: 10, padding: "2px 6px", borderRadius: 4, background: estado.color + "18", color: estado.color, fontWeight: 600 }}>{estado.label}</span>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════
   ACORDEÓN DE GRUPOS POR ESTADO
════════════════════════════════════════════ */
function GruposAcordeon({ grupos, archivados, mostrarArchivados, onEditar, onChecklist, onArchivar }) {
  // Inicialmente todos abiertos excepto archivados
  const [abiertos, setAbiertos] = useState(() => {
    const init = {};
    ["onboarding","activo","revision"].forEach(e => { init[e] = true; });
    init["archivado"] = false;
    return init;
  });

  function toggle(estado) {
    setAbiertos(prev => ({ ...prev, [estado]: !prev[estado] }));
  }

  const todoGrupos = [
    ...grupos,
    ...(mostrarArchivados && archivados.length > 0 ? [{
      estado: "archivado",
      config: { v:"archivado", label:"Archivados / Entregados", color:"#888", icon:"📦" },
      items: archivados,
    }] : []),
  ];

  if (todoGrupos.length === 0) {
    return <p style={{ color:"#aaa", textAlign:"center", padding:40 }}>No hay proyectos activos.</p>;
  }

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
      {todoGrupos.map(g => {
        const abierto = abiertos[g.estado] !== false;
        return (
          <div key={g.estado} style={{ borderRadius:14, overflow:"hidden", boxShadow:"0 1px 5px rgba(0,0,0,.06)" }}>
            {/* Cabecera acordeón — clickeable */}
            <div
              onClick={() => toggle(g.estado)}
              style={{ display:"flex", alignItems:"center", gap:10, padding:"13px 16px", background:g.config.color+"18", cursor:"pointer", userSelect:"none", borderLeft:`4px solid ${g.config.color}` }}>
              <span style={{ fontSize:16 }}>{g.config.icon}</span>
              <span style={{ fontWeight:700, fontSize:14, color:g.config.color, flex:1 }}>{g.config.label}</span>
              <span style={{ fontSize:12, color:g.config.color, fontWeight:700, background:g.config.color+"22", borderRadius:20, padding:"2px 10px" }}>
                {g.items.length}
              </span>
              <span style={{ fontSize:13, color:g.config.color, marginLeft:4, transition:"transform .2s", display:"inline-block", transform: abierto ? "rotate(0deg)" : "rotate(-90deg)" }}>
                ▼
              </span>
            </div>

            {/* Contenido desplegable */}
            {abierto && (
              <div style={{ background:"#f8f9fa", padding:"10px 10px 4px" }}>
                {g.items.length === 0 ? (
                  <p style={{ color:"#bbb", textAlign:"center", padding:"16px 0", fontSize:13 }}>Sin proyectos en este estado.</p>
                ) : g.items.map(p => (
                  <FilaProyecto
                    key={p.id}
                    proyecto={p}
                    onEditar={onEditar}
                    onChecklist={onChecklist}
                    onArchivar={onArchivar}
                  />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ════════════════════════════════════════════
   COMPONENTE PRINCIPAL
════════════════════════════════════════════ */
export default function Proyectos({ deepLinkId }) {
  const [proyectos, setProyectos] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [modal, setModal]         = useState(null);
  const [panelChecklist, setPanelChecklist] = useState(null);
  const [mostrarArchivados, setMostrarArchivados] = useState(false);
  const [busqueda, setBusqueda]   = useState("");
  const [msg, setMsg]             = useState("");

  useEffect(() => { cargar(); }, []);

  // Deep link: abrir un proyecto específico al llegar desde el buscador global
  useEffect(() => {
    if (deepLinkId && proyectos.length > 0) {
      const p = proyectos.find(pr => pr.id === deepLinkId);
      if (p) setModal(p);
    }
  }, [deepLinkId, proyectos]);

  async function cargar() {
    setLoading(true);
    const tk = await getToken();
    // Intentar vista primero, fallback a tabla directa
    let r = await fetch(`${SUPA_URL}/vista_proyectos?order=numero_proyecto.desc.nullslast`, { headers: hdrs(tk) }).then(r => r.json());
    if (!Array.isArray(r) || r.error) {
      r = await fetch(`${SUPA_URL}/proyectos?order=numero_proyecto.desc.nullslast`, { headers: hdrs(tk) }).then(r => r.json());
    }
    setProyectos(Array.isArray(r) ? r : []);
    setLoading(false);
  }

  async function archivar(p) {
    if (!confirm(`¿Archivar "${p.descripcion}"?`)) return;
    const tk = await getToken();
    await fetch(`${SUPA_URL}/proyectos?id=eq.${p.id}`, { method: "PATCH", headers: hdrs(tk), body: JSON.stringify({ estado: "entregado", archivado: true }) });
    setMsg("✓ Archivado"); setTimeout(() => setMsg(""), 2000);
    await cargar();
  }

  // Filtrar
  const q = busqueda.toLowerCase();
  const filtrados = proyectos.filter(p => {
    if (p.archivado && !mostrarArchivados) return false;
    if (!q) return true;
    return (p.descripcion || "").toLowerCase().includes(q)
      || (p.cliente || "").toLowerCase().includes(q)
      || (p.numero_proyecto || "").toLowerCase().includes(q)
      || (p.encargado || "").toLowerCase().includes(q);
  });

  // Agrupar: onboarding, activo, revision (entregados archivados)
  const grupos = ESTADO_ORDER.map(estado => ({
    estado,
    config: ESTADOS.find(e => e.v === estado),
    items: filtrados.filter(p => p.estado === estado),
  })).filter(g => g.items.length > 0);

  const archivados = filtrados.filter(p => p.estado === "entregado" || p.archivado);

  // Stats
  const total    = proyectos.filter(p => !p.archivado).length;
  const activos  = proyectos.filter(p => p.estado === "activo").length;
  const entregas = proyectos.filter(p => p.fecha_entrega_plan && !p.archivado).length;
  const vencidos = proyectos.filter(p => {
    if (!p.fecha_entrega_plan || p.archivado || p.estado === "entregado") return false;
    return new Date(p.fecha_entrega_plan + "T12:00") < new Date();
  }).length;

  return (
    <div style={{ fontFamily: "system-ui, -apple-system, sans-serif", padding: "24px", maxWidth: 1100, margin: "0 auto" }}>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>📋 Proyectos</h1>
        <button onClick={() => setModal("nuevo")} style={shared.btn}>+ Nuevo proyecto</button>
      </div>

      {msg && <div style={{ background: "#d4edda", color: "#155724", borderRadius: 8, padding: "8px 12px", marginBottom: 14, fontSize: 13 }}>{msg}</div>}

      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 24 }}>
        {[
          { label: "En curso",   value: total,    color: "#6366f1" },
          { label: "Activos",    value: activos,  color: "#22c55e" },
          { label: "Con entrega",value: entregas, color: "#f59e0b" },
          { label: "Vencidos",   value: vencidos, color: vencidos > 0 ? "#ef4444" : "#888" },
        ].map(k => (
          <div key={k.label} style={{ background: "#fff", borderRadius: 12, padding: "14px 16px", boxShadow: "0 1px 4px rgba(0,0,0,.06)", textAlign: "center" }}>
            <div style={{ fontSize: 26, fontWeight: 800, color: k.color }}>{k.value}</div>
            <div style={{ fontSize: 12, color: "#888", marginTop: 2 }}>{k.label}</div>
          </div>
        ))}
      </div>

      {/* Buscador */}
      <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
        <input value={busqueda} onChange={e => setBusqueda(e.target.value)} placeholder="🔍 Buscar proyecto, cliente, encargado…" style={{ ...shared.inp, width: 320 }} />
        <button onClick={() => setMostrarArchivados(!mostrarArchivados)} style={{ ...shared.btnSm, background: mostrarArchivados ? "#111" : "#f0f0f0", color: mostrarArchivados ? "#fff" : "#333" }}>
          📦 Archivados ({archivados.length})
        </button>
      </div>

      {loading ? <p style={{ color: "#aaa" }}>Cargando…</p> : (
        <>
          {/* Acordeón por estado */}
          <GruposAcordeon
            grupos={grupos}
            archivados={archivados}
            mostrarArchivados={mostrarArchivados}
            onEditar={proj => setModal(proj)}
            onChecklist={proj => setPanelChecklist(proj)}
            onArchivar={archivar}
          />

          {/* Cronograma mensual */}
          <CronogramaMensual proyectos={filtrados.filter(p => !p.archivado)} />
        </>
      )}

      {/* Modal */}
      {modal && (
        <ModalProyecto
          proyecto={modal === "nuevo" ? null : modal}
          onClose={() => setModal(null)}
          onGuardar={async () => { setModal(null); setMsg("✓ Guardado"); setTimeout(() => setMsg(""), 2000); await cargar(); }}
        />
      )}

      {/* Panel checklist */}
      {panelChecklist && (
        <PanelChecklist
          proyectoId={panelChecklist.id}
          onClose={() => { setPanelChecklist(null); cargar(); }}
        />
      )}
    </div>
  );
}
