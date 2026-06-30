import React, { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "./supabase.js";
import Combobox from "./Combobox.jsx";

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

async function api(path, options = {}) {
  const token = await getToken();
  const res = await fetch(`${SUPA_URL}${path}`, {
    ...options,
    headers: { ...hdrs(token), ...(options.headers || {}) },
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;

  if (!res.ok || data?.error || data?.message || data?.code) {
    throw new Error(data?.message || data?.error || `Error HTTP ${res.status}`);
  }
  return data;
}

const ESTADOS = {
  onboarding: { label: "Onboarding", color: "#b45309", bg: "#fff7ed" },
  activo: { label: "Activo", color: "#15803d", bg: "#f0fdf4" },
  revision: { label: "Revision", color: "#1d4ed8", bg: "#eff6ff" },
  entregado: { label: "Entregado", color: "#525252", bg: "#f5f5f5" },
};

const TABS = [
  { id: "activos", label: "Activos" },
  { id: "onboarding", label: "Onboarding" },
  { id: "revision", label: "Revision" },
  { id: "entregados", label: "Entregados" },
  { id: "todos", label: "Todos" },
];

const TIPOS_OBRA = ["Steel Frame", "Wood Frame", "Hormigon", "Madera", "Panel SIP", "Metalica", "Mixta"];

const ui = {
  page: { fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif", background: "#f6f7f9", minHeight: "100vh", padding: "24px", color: "#151515" },
  shell: { maxWidth: 1180, margin: "0 auto" },
  button: { padding: "10px 14px", background: "#111", color: "#fff", border: "1px solid #111", borderRadius: 8, fontSize: 13, fontWeight: 650, cursor: "pointer" },
  secondary: { padding: "9px 12px", background: "#fff", color: "#333", border: "1px solid #dedede", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" },
  input: { width: "100%", padding: "10px 12px", border: "1px solid #dcdcdc", borderRadius: 8, fontSize: 14, boxSizing: "border-box", background: "#fff" },
  label: { fontSize: 11, color: "#6b7280", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 5, display: "block" },
};

const emptyToNull = value => value === "" || value === undefined ? null : value;
const normalizeEstado = p => p?.estado === "en_curso" ? "activo" : (p?.estado || "activo");
const isDelivered = p => !!(p?.archivado || p?.entregado || normalizeEstado(p) === "entregado");
const statusMeta = p => ESTADOS[isDelivered(p) ? "entregado" : normalizeEstado(p)] || ESTADOS.activo;
const dueDays = date => Math.ceil((new Date(`${date}T12:00`) - new Date()) / 86400000);

function ErrorBanner({ message }) {
  if (!message) return null;
  return <div style={{ background: "#fef2f2", color: "#991b1b", border: "1px solid #fecaca", borderRadius: 8, padding: "10px 12px", marginBottom: 14, fontSize: 13 }}>{message}</div>;
}

function StatusPill({ proyecto }) {
  const meta = statusMeta(proyecto);
  return <span style={{ fontSize: 11, fontWeight: 700, color: meta.color, background: meta.bg, border: `1px solid ${meta.color}22`, borderRadius: 999, padding: "3px 8px" }}>{meta.label}</span>;
}

function PanelChecklist({ proyectoId, onClose }) {
  const [items, setItems] = useState([]);
  const [nuevo, setNuevo] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef(null);

  useEffect(() => { cargar(); }, [proyectoId]);

  async function cargar() {
    setLoading(true);
    setError("");
    try {
      const rows = await api(`/proyecto_checklist?proyecto_id=eq.${proyectoId}&order=orden.asc,created_at.asc`);
      setItems(Array.isArray(rows) ? rows : []);
    } catch (e) {
      setError(e.message);
      setItems([]);
    }
    setLoading(false);
  }

  async function agregar() {
    if (!nuevo.trim()) return;
    setSaving(true);
    setError("");
    try {
      const rows = await api("/proyecto_checklist", {
        method: "POST",
        body: JSON.stringify({ proyecto_id: proyectoId, texto: nuevo.trim(), orden: items.length }),
      });
      if (!Array.isArray(rows) || !rows[0]) throw new Error("No se pudo crear la tarea");
      setItems(prev => [...prev, rows[0]]);
      setNuevo("");
      inputRef.current?.focus();
    } catch (e) {
      setError(e.message);
    }
    setSaving(false);
  }

  async function toggle(item) {
    const next = !item.completado;
    const previous = items;
    setItems(prev => prev.map(i => i.id === item.id ? { ...i, completado: next } : i));
    try {
      await api(`/proyecto_checklist?id=eq.${item.id}`, { method: "PATCH", body: JSON.stringify({ completado: next }) });
    } catch (e) {
      setError(e.message);
      setItems(previous);
    }
  }

  async function eliminar(id) {
    const previous = items;
    setItems(prev => prev.filter(i => i.id !== id));
    try {
      await api(`/proyecto_checklist?id=eq.${id}`, { method: "DELETE" });
    } catch (e) {
      setError(e.message);
      setItems(previous);
    }
  }

  const done = items.filter(i => i.completado).length;
  const pct = items.length ? Math.round(done / items.length * 100) : 0;

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.45)", display: "flex", justifyContent: "center", alignItems: "flex-end", zIndex: 200 }}>
      <div style={{ width: "100%", maxWidth: 620, maxHeight: "84vh", overflowY: "auto", background: "#fff", borderRadius: "18px 18px 0 0", padding: "18px 18px 28px", boxShadow: "0 -16px 48px rgba(0,0,0,.18)" }}>
        <div style={{ width: 42, height: 4, background: "#ddd", borderRadius: 10, margin: "0 auto 16px" }} />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 14 }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 18 }}>Checklist</h3>
            <p style={{ margin: "3px 0 0", color: "#777", fontSize: 13 }}>{items.length ? `${done}/${items.length} tareas completadas` : "Sin tareas cargadas"}</p>
          </div>
          <button onClick={onClose} style={ui.secondary}>Cerrar</button>
        </div>
        <ErrorBanner message={error} />
        {items.length > 0 && <div style={{ height: 7, background: "#eee", borderRadius: 999, overflow: "hidden", marginBottom: 14 }}><div style={{ width: `${pct}%`, height: "100%", background: "#16a34a" }} /></div>}
        <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 8, marginBottom: 16 }}>
          <input ref={inputRef} value={nuevo} onChange={e => setNuevo(e.target.value)} onKeyDown={e => e.key === "Enter" && agregar()} placeholder="Nueva tarea" style={ui.input} />
          <button onClick={agregar} disabled={saving || !nuevo.trim()} style={{ ...ui.button, opacity: saving || !nuevo.trim() ? 0.5 : 1 }}>Agregar</button>
        </div>
        {loading ? <p style={{ color: "#888" }}>Cargando...</p> : (
          <div style={{ display: "grid", gap: 8 }}>
            {items.map(item => (
              <div key={item.id} style={{ display: "grid", gridTemplateColumns: "auto 1fr auto", alignItems: "center", gap: 10, padding: "10px 12px", border: "1px solid #eee", borderRadius: 8, background: item.completado ? "#f0fdf4" : "#fff" }}>
                <input type="checkbox" checked={!!item.completado} onChange={() => toggle(item)} style={{ width: 18, height: 18 }} />
                <span style={{ fontSize: 14, color: item.completado ? "#15803d" : "#222", textDecoration: item.completado ? "line-through" : "none" }}>{item.texto}</span>
                <button onClick={() => eliminar(item.id)} style={{ ...ui.secondary, padding: "6px 9px", fontSize: 12 }}>Eliminar</button>
              </div>
            ))}
            {!items.length && <p style={{ color: "#999", textAlign: "center", padding: "18px 0" }}>Agrega la primera tarea para este proyecto.</p>}
          </div>
        )}
      </div>
    </div>
  );
}

function ModalProyecto({ proyecto, onClose, onGuardar }) {
  const esNuevo = !proyecto?.id;
  const [form, setForm] = useState({
    numero_proyecto: proyecto?.numero_proyecto || "",
    descripcion: proyecto?.descripcion || "",
    cliente: proyecto?.cliente || "",
    cliente_id: proyecto?.cliente_id || "",
    encargado: proyecto?.encargado || "",
    estado: isDelivered(proyecto) ? "entregado" : normalizeEstado(proyecto || {}),
    categoria: proyecto?.categoria || "",
    tipo_obra: proyecto?.tipo_obra || "",
    superficie: proyecto?.superficie ?? "",
    fecha_entrega_plan: proyecto?.fecha_entrega_plan || "",
    anticipo: !!proyecto?.anticipo,
    check_diagnostico: !!proyecto?.check_diagnostico,
    proyecto_ok: !!proyecto?.proyecto_ok,
    cobrado: !!proyecto?.cobrado,
    drive_url: proyecto?.drive_url || "",
    obs: proyecto?.obs || "",
    proxima_tarea: proyecto?.proxima_tarea || "",
    presupuesto_id: proyecto?.presupuesto_id || "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [clientes, setClientes] = useState([]);
  const [presupuestos, setPresupuestos] = useState([]);
  const [calculistas, setCalculistas] = useState([]);

  useEffect(() => {
    async function cargarOpciones() {
      try {
        const [cArr, pArr, calcArr] = await Promise.all([
          api("/clientes?select=id,empresa&order=empresa.asc"),
          api("/presupuestos?select=id,codigo,descripcion,cliente&order=created_at.desc"),
          api("/calculistas?select=id,nombre,nivel&order=nombre.asc"),
        ]);
        setClientes(Array.isArray(cArr) ? cArr : []);
        setPresupuestos(Array.isArray(pArr) ? pArr : []);
        setCalculistas(Array.isArray(calcArr) ? calcArr : []);
      } catch (e) {
        setError(e.message);
      }
    }
    cargarOpciones();
  }, []);

  async function guardar() {
    if (!form.descripcion.trim()) return;
    setSaving(true);
    setError("");
    const delivered = form.estado === "entregado";
    const body = {
      ...form,
      numero_proyecto: form.numero_proyecto.trim() || null,
      descripcion: form.descripcion.trim(),
      cliente: form.cliente || null,
      cliente_id: emptyToNull(form.cliente_id),
      encargado: form.encargado || null,
      categoria: form.categoria || null,
      tipo_obra: form.tipo_obra || null,
      superficie: form.superficie !== "" ? parseFloat(form.superficie) : null,
      fecha_entrega_plan: emptyToNull(form.fecha_entrega_plan),
      drive_url: form.drive_url || null,
      obs: form.obs || null,
      proxima_tarea: form.proxima_tarea || null,
      presupuesto_id: emptyToNull(form.presupuesto_id),
      entregado: delivered,
      archivado: delivered,
    };
    try {
      if (esNuevo) await api("/proyectos", { method: "POST", body: JSON.stringify(body) });
      else await api(`/proyectos?id=eq.${proyecto.id}`, { method: "PATCH", body: JSON.stringify(body) });
      await onGuardar();
    } catch (e) {
      setError(e.message);
    }
    setSaving(false);
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.45)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16, zIndex: 100 }}>
      <div style={{ width: "100%", maxWidth: 760, maxHeight: "92vh", overflowY: "auto", background: "#fff", borderRadius: 12, boxShadow: "0 20px 60px rgba(0,0,0,.22)", padding: 22 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 18 }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 19 }}>{esNuevo ? "Nuevo proyecto" : "Editar proyecto"}</h3>
            <p style={{ margin: "4px 0 0", fontSize: 13, color: "#777" }}>Datos operativos, estado, cliente y seguimiento.</p>
          </div>
          <button onClick={onClose} style={ui.secondary}>Cerrar</button>
        </div>
        <ErrorBanner message={error} />

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 18 }}>
          {Object.entries(ESTADOS).map(([id, meta]) => (
            <button key={id} onClick={() => setForm(f => ({ ...f, estado: id }))} style={{ ...ui.secondary, background: form.estado === id ? meta.bg : "#fff", color: form.estado === id ? meta.color : "#333", borderColor: form.estado === id ? meta.color : "#dedede" }}>{meta.label}</button>
          ))}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "minmax(120px,.4fr) minmax(220px,1fr)", gap: 12, marginBottom: 12 }}>
          <Field label="Nro proyecto"><input value={form.numero_proyecto} onChange={e => setForm(f => ({ ...f, numero_proyecto: e.target.value }))} style={ui.input} placeholder="553" /></Field>
          <Field label="Descripcion *"><input value={form.descripcion} onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))} style={ui.input} placeholder="Descripcion del proyecto" /></Field>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 12 }}>
          <Field label="Cliente">
            <Combobox options={clientes.map(c => ({ value: c.id, label: c.empresa }))} value={form.cliente_id} onChange={(val, label) => setForm(f => ({ ...f, cliente_id: val, cliente: label || "" }))} placeholder="Buscar cliente" emptyLabel="Sin vincular" />
          </Field>
          <Field label="Encargado">
            <select value={form.encargado} onChange={e => setForm(f => ({ ...f, encargado: e.target.value }))} style={ui.input}>
              <option value="">Sin asignar</option>
              {calculistas.map(c => <option key={c.id} value={c.nombre}>{c.nombre} - {c.nivel}</option>)}
            </select>
          </Field>
          <Field label="Categoria"><input value={form.categoria} onChange={e => setForm(f => ({ ...f, categoria: e.target.value }))} style={ui.input} /></Field>
          <Field label="Tipo de obra"><select value={form.tipo_obra} onChange={e => setForm(f => ({ ...f, tipo_obra: e.target.value }))} style={ui.input}><option value="">Seleccionar</option>{TIPOS_OBRA.map(t => <option key={t} value={t}>{t}</option>)}</select></Field>
          <Field label="Superficie m2"><input type="number" min="0" value={form.superficie} onChange={e => setForm(f => ({ ...f, superficie: e.target.value }))} style={ui.input} /></Field>
          <Field label="Fecha entrega"><input type="date" value={form.fecha_entrega_plan} onChange={e => setForm(f => ({ ...f, fecha_entrega_plan: e.target.value }))} style={ui.input} /></Field>
          <Field label="Proxima tarea"><input value={form.proxima_tarea} onChange={e => setForm(f => ({ ...f, proxima_tarea: e.target.value }))} style={ui.input} /></Field>
          <Field label="Presupuesto">
            <Combobox options={presupuestos.map(p => ({ value: p.id, label: `${p.codigo || ""} - ${p.descripcion || p.cliente || ""}`.trim() }))} value={form.presupuesto_id} onChange={val => setForm(f => ({ ...f, presupuesto_id: val }))} placeholder="Buscar presupuesto" emptyLabel="Sin vincular" />
          </Field>
        </div>

        <div style={{ marginTop: 12, display: "grid", gap: 12 }}>
          <Field label="Link Drive"><input value={form.drive_url} onChange={e => setForm(f => ({ ...f, drive_url: e.target.value }))} style={ui.input} placeholder="https://drive.google.com/..." /></Field>
          <Field label="Observaciones"><textarea value={form.obs} onChange={e => setForm(f => ({ ...f, obs: e.target.value }))} rows={3} style={{ ...ui.input, resize: "vertical" }} /></Field>
        </div>

        <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginTop: 16 }}>
          {[
            ["anticipo", "Anticipo cobrado"],
            ["check_diagnostico", "Diagnostico OK"],
            ["proyecto_ok", "Proyecto OK"],
            ["cobrado", "Cobrado"],
          ].map(([key, label]) => <label key={key} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}><input type="checkbox" checked={!!form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.checked }))} />{label}</label>)}
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 20 }}>
          <button onClick={onClose} style={ui.secondary}>Cancelar</button>
          <button onClick={guardar} disabled={saving || !form.descripcion.trim()} style={{ ...ui.button, opacity: saving || !form.descripcion.trim() ? 0.5 : 1 }}>{saving ? "Guardando..." : "Guardar"}</button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return <div><span style={ui.label}>{label}</span>{children}</div>;
}

function ProyectoCard({ proyecto, onEditar, onChecklist, onArchivar }) {
  const [open, setOpen] = useState(false);
  const meta = statusMeta(proyecto);
  const days = proyecto.fecha_entrega_plan ? dueDays(proyecto.fecha_entrega_plan) : null;
  const pct = proyecto.checklist_total > 0 ? Math.round(proyecto.checklist_completados / proyecto.checklist_total * 100) : null;

  return (
    <div style={{ background: "#fff", border: "1px solid #e8e8e8", borderLeft: `4px solid ${meta.color}`, borderRadius: 8, overflow: "hidden" }}>
      <button onClick={() => setOpen(!open)} style={{ width: "100%", textAlign: "left", border: "none", background: "transparent", padding: "14px 16px", cursor: "pointer" }}>
        <div style={{ display: "grid", gridTemplateColumns: "74px minmax(0,1fr) auto", gap: 12, alignItems: "start" }}>
          <div style={{ fontSize: 12, color: "#777", fontWeight: 800 }}>{proyecto.numero_proyecto || "-"}</div>
          <div style={{ minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <strong style={{ fontSize: 14 }}>{proyecto.descripcion || "Sin descripcion"}</strong>
              <StatusPill proyecto={proyecto} />
              {proyecto.tipo_obra && <span style={{ fontSize: 11, color: "#666", background: "#f4f4f5", borderRadius: 999, padding: "3px 8px" }}>{proyecto.tipo_obra}</span>}
            </div>
            <div style={{ fontSize: 12, color: "#777", marginTop: 3 }}>{proyecto.cliente || "Sin cliente"}{proyecto.encargado ? ` - ${proyecto.encargado}` : ""}{proyecto.superficie ? ` - ${proyecto.superficie}m2` : ""}</div>
            {proyecto.proxima_tarea && <div style={{ fontSize: 12, color: "#3730a3", marginTop: 4 }}>{proyecto.proxima_tarea}</div>}
          </div>
          <div style={{ display: "flex", alignItems: "flex-end", flexDirection: "column", gap: 5 }}>
            {days !== null && <span style={{ fontSize: 11, fontWeight: 800, color: days < 0 ? "#b91c1c" : days < 7 ? "#a16207" : "#15803d", background: days < 0 ? "#fef2f2" : days < 7 ? "#fefce8" : "#f0fdf4", borderRadius: 999, padding: "3px 8px" }}>{days < 0 ? `${Math.abs(days)}d vencido` : days === 0 ? "Hoy" : `${days}d`}</span>}
            {pct !== null && <span style={{ fontSize: 11, color: pct === 100 ? "#15803d" : "#777" }}>Checklist {proyecto.checklist_completados}/{proyecto.checklist_total}</span>}
            <span style={{ fontSize: 12, color: "#999" }}>{open ? "Cerrar" : "Abrir"}</span>
          </div>
        </div>
      </button>
      {open && (
        <div style={{ padding: "0 16px 14px 102px" }}>
          {proyecto.obs && <p style={{ margin: "0 0 10px", color: "#555", fontSize: 13 }}>{proyecto.obs}</p>}
          {pct !== null && <div style={{ height: 6, background: "#eee", borderRadius: 999, overflow: "hidden", marginBottom: 12 }}><div style={{ height: "100%", width: `${pct}%`, background: "#16a34a" }} /></div>}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button onClick={() => onEditar(proyecto)} style={ui.secondary}>Editar</button>
            <button onClick={() => onChecklist(proyecto)} style={ui.secondary}>Checklist</button>
            {proyecto.drive_url && <a href={proyecto.drive_url} target="_blank" rel="noreferrer" style={{ ...ui.secondary, textDecoration: "none" }}>Drive</a>}
            {!isDelivered(proyecto) && <button onClick={() => onArchivar(proyecto)} style={ui.secondary}>Marcar entregado</button>}
          </div>
        </div>
      )}
    </div>
  );
}

function CronogramaMensual({ proyectos }) {
  const hoy = new Date();
  const meses = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(hoy.getFullYear(), hoy.getMonth() + i, 1);
    return { year: d.getFullYear(), month: d.getMonth(), label: d.toLocaleDateString("es-AR", { month: "long", year: "numeric" }) };
  });
  const porMes = {};
  proyectos.forEach(p => {
    if (!p.fecha_entrega_plan) return;
    const d = new Date(`${p.fecha_entrega_plan}T12:00`);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    porMes[key] = [...(porMes[key] || []), p];
  });
  if (!meses.some(m => porMes[`${m.year}-${m.month}`]?.length)) return null;

  return (
    <section style={{ marginTop: 28 }}>
      <h2 style={{ fontSize: 16, margin: "0 0 12px" }}>Cronograma</h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(240px,1fr))", gap: 12 }}>
        {meses.map(m => {
          const key = `${m.year}-${m.month}`;
          const items = porMes[key] || [];
          if (!items.length) return null;
          return (
            <div key={key} style={{ background: "#fff", border: "1px solid #e8e8e8", borderRadius: 8, padding: 14 }}>
              <div style={{ fontSize: 13, fontWeight: 800, textTransform: "capitalize", marginBottom: 8 }}>{m.label}</div>
              {items.map(p => <div key={p.id} style={{ display: "grid", gridTemplateColumns: "32px 1fr", gap: 8, padding: "7px 0", borderTop: "1px solid #f1f1f1" }}><strong style={{ color: statusMeta(p).color }}>{new Date(`${p.fecha_entrega_plan}T12:00`).getDate()}</strong><span style={{ fontSize: 12 }}>{p.descripcion}</span></div>)}
            </div>
          );
        })}
      </div>
    </section>
  );
}

export default function Proyectos() {
  const [proyectos, setProyectos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [panelChecklist, setPanelChecklist] = useState(null);
  const [tab, setTab] = useState("activos");
  const [busqueda, setBusqueda] = useState("");
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");

  useEffect(() => { cargar(); }, []);

  async function cargar() {
    setLoading(true);
    setError("");
    try {
      let rows;
      try {
        rows = await api("/vista_proyectos?order=numero_proyecto.desc.nullslast");
      } catch (_) {
        rows = await api("/proyectos?order=numero_proyecto.desc.nullslast");
      }
      setProyectos(Array.isArray(rows) ? rows : []);
    } catch (e) {
      setError(e.message);
      setProyectos([]);
    }
    setLoading(false);
  }

  async function archivar(p) {
    if (!confirm(`Marcar como entregado "${p.descripcion}"?`)) return;
    setError("");
    try {
      await api(`/proyectos?id=eq.${p.id}`, {
        method: "PATCH",
        body: JSON.stringify({ estado: "entregado", archivado: true, entregado: true }),
      });
      setMsg("Proyecto marcado como entregado");
      setTimeout(() => setMsg(""), 2200);
      await cargar();
      setTab("entregados");
    } catch (e) {
      setError(e.message);
    }
  }

  const q = busqueda.trim().toLowerCase();
  const activos = proyectos.filter(p => !isDelivered(p));
  const entregados = proyectos.filter(isDelivered);
  const revision = activos.filter(p => normalizeEstado(p) === "revision");
  const onboarding = activos.filter(p => normalizeEstado(p) === "onboarding");
  const activosOperacion = activos.filter(p => normalizeEstado(p) === "activo");
  const conEntrega = activos.filter(p => p.fecha_entrega_plan);
  const vencidos = conEntrega.filter(p => dueDays(p.fecha_entrega_plan) < 0);

  const base = useMemo(() => {
    if (tab === "entregados") return entregados;
    if (tab === "revision") return revision;
    if (tab === "onboarding") return onboarding;
    if (tab === "todos") return proyectos;
    return activos;
  }, [tab, proyectos]);

  const visibles = base.filter(p => {
    if (!q) return true;
    return [p.descripcion, p.cliente, p.numero_proyecto, p.encargado, p.proxima_tarea].some(v => (v || "").toLowerCase().includes(q));
  });

  return (
    <div style={ui.page}>
      <div style={ui.shell}>
        <header style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, marginBottom: 18 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 26, letterSpacing: 0 }}>Proyectos</h1>
            <p style={{ margin: "5px 0 0", color: "#666", fontSize: 14 }}>Operacion, entregas y seguimiento tecnico.</p>
          </div>
          <button onClick={() => setModal("nuevo")} style={ui.button}>Nuevo proyecto</button>
        </header>

        {msg && <div style={{ background: "#ecfdf5", color: "#166534", border: "1px solid #bbf7d0", borderRadius: 8, padding: "10px 12px", marginBottom: 14, fontSize: 13 }}>{msg}</div>}
        <ErrorBanner message={error} />

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 10, marginBottom: 16 }}>
          <Metric label="En curso" value={activos.length} color="#4338ca" />
          <Metric label="Activos" value={activosOperacion.length} color="#15803d" />
          <Metric label="Revision" value={revision.length} color="#1d4ed8" />
          <Metric label="Entregados" value={entregados.length} color="#525252" onClick={() => setTab("entregados")} />
          <Metric label="Vencidos" value={vencidos.length} color={vencidos.length ? "#b91c1c" : "#777"} />
        </div>

        <section style={{ background: "#fff", border: "1px solid #e6e6e6", borderRadius: 10, padding: 12, marginBottom: 14 }}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {TABS.map(t => <button key={t.id} onClick={() => setTab(t.id)} style={{ ...ui.secondary, background: tab === t.id ? "#111" : "#fff", color: tab === t.id ? "#fff" : "#333", borderColor: tab === t.id ? "#111" : "#dedede" }}>{t.label}</button>)}
            </div>
            <input value={busqueda} onChange={e => setBusqueda(e.target.value)} placeholder="Buscar proyecto, cliente, encargado..." style={{ ...ui.input, maxWidth: 340 }} />
          </div>
        </section>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", margin: "12px 0", color: "#666", fontSize: 13 }}>
          <span>{loading ? "Cargando..." : `${visibles.length} resultado${visibles.length === 1 ? "" : "s"}`}</span>
          {tab === "entregados" && <strong style={{ color: "#333" }}>Los entregados estan aca.</strong>}
        </div>

        {loading ? <p style={{ color: "#888" }}>Cargando proyectos...</p> : (
          <div style={{ display: "grid", gap: 8 }}>
            {visibles.map(p => <ProyectoCard key={p.id} proyecto={p} onEditar={setModal} onChecklist={setPanelChecklist} onArchivar={archivar} />)}
            {!visibles.length && <div style={{ background: "#fff", border: "1px dashed #d7d7d7", borderRadius: 10, padding: 32, textAlign: "center", color: "#777" }}>No hay proyectos en esta vista.</div>}
          </div>
        )}

        <CronogramaMensual proyectos={activos.filter(p => p.fecha_entrega_plan)} />

        {modal && <ModalProyecto proyecto={modal === "nuevo" ? null : modal} onClose={() => setModal(null)} onGuardar={async () => { setModal(null); setMsg("Proyecto guardado"); setTimeout(() => setMsg(""), 2200); await cargar(); }} />}
        {panelChecklist && <PanelChecklist proyectoId={panelChecklist.id} onClose={() => { setPanelChecklist(null); cargar(); }} />}
      </div>
    </div>
  );
}

function Metric({ label, value, color, onClick }) {
  const Comp = onClick ? "button" : "div";
  return (
    <Comp onClick={onClick} style={{ background: "#fff", border: "1px solid #e8e8e8", borderRadius: 10, padding: "13px 14px", textAlign: "left", cursor: onClick ? "pointer" : "default" }}>
      <div style={{ fontSize: 25, fontWeight: 850, color, lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 12, color: "#666", marginTop: 5, fontWeight: 650 }}>{label}</div>
    </Comp>
  );
}
