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

const ESTADOS = [
  { v: "onboarding", label: "Onboarding", color: "#f59e0b", icon: "O" },
  { v: "activo", label: "Activo", color: "#22c55e", icon: "A" },
  { v: "revision", label: "Revision", color: "#3b82f6", icon: "R" },
  { v: "entregado", label: "Entregado", color: "#888", icon: "E" },
];

const ESTADO_ORDER = ["onboarding", "activo", "revision"];
const TIPOS_OBRA = ["Steel Frame", "Wood Frame", "Hormigon", "Madera", "Panel SIP", "Metalica", "Mixta"];

const shared = {
  btn: { padding: "10px 18px", background: "#111", color: "#fff", border: "none", borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: "pointer" },
  btnSm: { padding: "7px 12px", background: "#f0f0f0", color: "#333", border: "none", borderRadius: 8, fontSize: 13, cursor: "pointer" },
  inp: { width: "100%", padding: "10px 12px", border: "1px solid #e0e0e0", borderRadius: 10, fontSize: 14, boxSizing: "border-box" },
  lbl: { fontSize: 11, color: "#888", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 5, display: "block" },
};

const emptyToNull = value => value === "" || value === undefined ? null : value;
const isArchived = p => !!(p.archivado || p.entregado || p.estado === "entregado");
const normalizedEstado = p => p.estado === "en_curso" ? "activo" : (p.estado || "activo");
const estadoConfig = p => ESTADOS.find(e => e.v === normalizedEstado(p)) || ESTADOS[1];
const dateDiffDays = date => Math.ceil((new Date(date + "T12:00") - new Date()) / 86400000);

function ErrorBox({ message }) {
  if (!message) return null;
  return (
    <div style={{ background: "#fee2e2", color: "#991b1b", borderRadius: 8, padding: "9px 12px", marginBottom: 14, fontSize: 13 }}>
      {message}
    </div>
  );
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
      if (!Array.isArray(rows) || !rows[0]) throw new Error("Supabase no devolvio la tarea creada");
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
    setError("");
    setItems(prev => prev.map(i => i.id === item.id ? { ...i, completado: next } : i));
    try {
      await api(`/proyecto_checklist?id=eq.${item.id}`, {
        method: "PATCH",
        body: JSON.stringify({ completado: next }),
      });
    } catch (e) {
      setError(e.message);
      setItems(prev => prev.map(i => i.id === item.id ? { ...i, completado: item.completado } : i));
    }
  }

  async function eliminar(id) {
    const prev = items;
    setError("");
    setItems(items.filter(i => i.id !== id));
    try {
      await api(`/proyecto_checklist?id=eq.${id}`, { method: "DELETE" });
    } catch (e) {
      setError(e.message);
      setItems(prev);
    }
  }

  const completados = items.filter(i => i.completado).length;
  const pct = items.length ? Math.round((completados / items.length) * 100) : 0;

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.55)", display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 200 }}>
      <div style={{ background: "#fff", borderRadius: "20px 20px 0 0", padding: "20px 20px 40px", width: "100%", maxWidth: 560, maxHeight: "80vh", overflowY: "auto" }}>
        <div style={{ width: 40, height: 4, background: "#e0e0e0", borderRadius: 2, margin: "0 auto 16px" }} />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 17 }}>Checklist</div>
            {items.length > 0 && <div style={{ fontSize: 12, color: "#888", marginTop: 2 }}>{completados}/{items.length} - {pct}%</div>}
          </div>
          <button onClick={onClose} style={{ ...shared.btnSm, padding: "6px 10px" }}>x</button>
        </div>

        <ErrorBox message={error} />

        {items.length > 0 && (
          <div style={{ height: 5, background: "#f0f0f0", borderRadius: 3, overflow: "hidden", marginBottom: 14 }}>
            <div style={{ height: "100%", width: `${pct}%`, background: "#22c55e", transition: "width .4s" }} />
          </div>
        )}

        <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          <input
            ref={inputRef}
            value={nuevo}
            onChange={e => setNuevo(e.target.value)}
            onKeyDown={e => e.key === "Enter" && agregar()}
            placeholder="Nueva tarea... (Enter para agregar)"
            style={{ ...shared.inp, flex: 1 }}
          />
          <button onClick={agregar} disabled={saving || !nuevo.trim()} style={{ ...shared.btn, padding: "10px 14px", fontSize: 13, flexShrink: 0 }}>+</button>
        </div>

        {loading ? <p style={{ color: "#aaa", textAlign: "center" }}>Cargando...</p>
          : items.length === 0 ? <p style={{ color: "#bbb", textAlign: "center", padding: "20px 0", fontSize: 13 }}>Sin tareas. Agrega la primera.</p>
          : items.map(item => (
            <div key={item.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", background: item.completado ? "#f0fdf4" : "#f8f8f8", borderRadius: 10, marginBottom: 6 }}>
              <button
                onClick={() => toggle(item)}
                style={{ width: 22, height: 22, borderRadius: 6, border: `2px solid ${item.completado ? "#22c55e" : "#ddd"}`, background: item.completado ? "#22c55e" : "#fff", cursor: "pointer", flexShrink: 0, color: "#fff", fontWeight: 900 }}
              >
                {item.completado ? "✓" : ""}
              </button>
              <span style={{ flex: 1, fontSize: 14, color: item.completado ? "#16a34a" : "#111", textDecoration: item.completado ? "line-through" : "none" }}>{item.texto}</span>
              <button onClick={() => eliminar(item.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "#999", fontSize: 16, flexShrink: 0 }}>Eliminar</button>
            </div>
          ))}
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
    estado: normalizedEstado(proyecto || {}),
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
      setError("");
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
    };

    try {
      if (esNuevo) {
        await api("/proyectos", { method: "POST", body: JSON.stringify(body) });
      } else {
        await api(`/proyectos?id=eq.${proyecto.id}`, { method: "PATCH", body: JSON.stringify(body) });
      }
      await onGuardar();
    } catch (e) {
      setError(e.message);
    }

    setSaving(false);
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 16 }}>
      <div style={{ background: "#fff", borderRadius: 16, padding: 28, width: "100%", maxWidth: 560, maxHeight: "92vh", overflowY: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
          <h3 style={{ margin: 0, fontSize: 17 }}>{esNuevo ? "Nuevo proyecto" : "Editar proyecto"}</h3>
          <button onClick={onClose} style={{ ...shared.btnSm, padding: "5px 10px" }}>x</button>
        </div>

        <ErrorBox message={error} />

        <div style={{ marginBottom: 16 }}>
          <span style={shared.lbl}>Estado</span>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {ESTADOS.map(e => (
              <button
                key={e.v}
                onClick={() => setForm(f => ({ ...f, estado: e.v }))}
                style={{ padding: "8px 14px", borderRadius: 10, border: `2px solid ${form.estado === e.v ? e.color : "#e0e0e0"}`, background: form.estado === e.v ? e.color + "18" : "#fff", color: form.estado === e.v ? e.color : "#888", fontWeight: form.estado === e.v ? 700 : 400, fontSize: 13, cursor: "pointer" }}
              >
                {e.icon} {e.label}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "120px 1fr", gap: 12, marginBottom: 12 }}>
          <div>
            <span style={shared.lbl}>Nro Proyecto</span>
            <input value={form.numero_proyecto} onChange={e => setForm(f => ({ ...f, numero_proyecto: e.target.value }))} style={shared.inp} placeholder="2026-001" />
          </div>
          <div>
            <span style={shared.lbl}>Descripcion *</span>
            <input value={form.descripcion} onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))} style={shared.inp} placeholder="Descripcion del proyecto" />
          </div>
        </div>

        <div style={{ marginBottom: 12 }}>
          <span style={shared.lbl}>Cliente</span>
          <Combobox
            options={clientes.map(c => ({ value: c.id, label: c.empresa }))}
            value={form.cliente_id}
            onChange={(val, label) => setForm(f => ({ ...f, cliente_id: val, cliente: label || "" }))}
            placeholder="Buscar cliente..."
            emptyLabel="Sin vincular"
          />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
          <div>
            <span style={shared.lbl}>Encargado</span>
            <select value={form.encargado} onChange={e => setForm(f => ({ ...f, encargado: e.target.value }))} style={shared.inp}>
              <option value="">Sin asignar</option>
              {calculistas.map(c => <option key={c.id} value={c.nombre}>{c.nombre} - {c.nivel}</option>)}
            </select>
          </div>
          <div>
            <span style={shared.lbl}>Categoria</span>
            <input value={form.categoria} onChange={e => setForm(f => ({ ...f, categoria: e.target.value }))} style={shared.inp} placeholder="Ej: Vivienda, Comercial..." />
          </div>
          <div>
            <span style={shared.lbl}>Tipo de obra</span>
            <select value={form.tipo_obra} onChange={e => setForm(f => ({ ...f, tipo_obra: e.target.value }))} style={shared.inp}>
              <option value="">Seleccionar</option>
              {TIPOS_OBRA.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <span style={shared.lbl}>Superficie (m2)</span>
            <input type="number" min="0" value={form.superficie} onChange={e => setForm(f => ({ ...f, superficie: e.target.value }))} style={shared.inp} placeholder="0" />
          </div>
          <div>
            <span style={shared.lbl}>Fecha entrega plan</span>
            <input type="date" value={form.fecha_entrega_plan} onChange={e => setForm(f => ({ ...f, fecha_entrega_plan: e.target.value }))} style={shared.inp} />
          </div>
          <div>
            <span style={shared.lbl}>Proxima tarea</span>
            <input value={form.proxima_tarea} onChange={e => setForm(f => ({ ...f, proxima_tarea: e.target.value }))} style={shared.inp} placeholder="Ej: Revisar planos..." />
          </div>
        </div>

        <div style={{ marginBottom: 12 }}>
          <span style={shared.lbl}>Presupuesto vinculado</span>
          <Combobox
            options={presupuestos.map(p => ({ value: p.id, label: `${p.codigo || ""} - ${p.descripcion || p.cliente || ""}`.trim() }))}
            value={form.presupuesto_id}
            onChange={val => setForm(f => ({ ...f, presupuesto_id: val }))}
            placeholder="Buscar presupuesto..."
            emptyLabel="Sin vincular"
          />
        </div>

        <div style={{ marginBottom: 12 }}>
          <span style={shared.lbl}>Link Drive</span>
          <input value={form.drive_url} onChange={e => setForm(f => ({ ...f, drive_url: e.target.value }))} style={shared.inp} placeholder="https://drive.google.com/..." />
        </div>

        <div style={{ marginBottom: 16 }}>
          <span style={shared.lbl}>Observaciones</span>
          <textarea value={form.obs} onChange={e => setForm(f => ({ ...f, obs: e.target.value }))} rows={3} style={{ ...shared.inp, resize: "vertical" }} />
        </div>

        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 20 }}>
          {[
            ["anticipo", "Anticipo cobrado"],
            ["check_diagnostico", "Diagnostico OK"],
            ["proyecto_ok", "Proyecto OK"],
            ["cobrado", "Cobrado"],
          ].map(([key, label]) => (
            <label key={key} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, cursor: "pointer" }}>
              <input type="checkbox" checked={!!form[key]} onChange={e => setForm(p => ({ ...p, [key]: e.target.checked }))} style={{ width: 16, height: 16 }} />
              {label}
            </label>
          ))}
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={guardar} disabled={saving || !form.descripcion.trim()} style={{ ...shared.btn, flex: 1 }}>{saving ? "Guardando..." : "Guardar"}</button>
          <button onClick={onClose} style={{ ...shared.btnSm, flex: 1, padding: "10px" }}>Cancelar</button>
        </div>
      </div>
    </div>
  );
}

function FilaProyecto({ proyecto, onEditar, onChecklist, onArchivar }) {
  const estado = estadoConfig(proyecto);
  const [expanded, setExpanded] = useState(false);
  const diasRestantes = proyecto.fecha_entrega_plan ? dateDiffDays(proyecto.fecha_entrega_plan) : null;
  const pctChecklist = proyecto.checklist_total > 0 ? Math.round((proyecto.checklist_completados / proyecto.checklist_total) * 100) : null;

  return (
    <div style={{ background: "#fff", borderRadius: 14, marginBottom: 8, boxShadow: "0 1px 5px rgba(0,0,0,.06)", overflow: "hidden", borderLeft: `4px solid ${estado.color}` }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", cursor: "pointer" }} onClick={() => setExpanded(!expanded)}>
        <div style={{ fontSize: 11, fontWeight: 700, color: "#aaa", minWidth: 70, flexShrink: 0 }}>{proyecto.numero_proyecto || "-"}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span style={{ fontWeight: 700, fontSize: 14 }}>{proyecto.descripcion || "Sin descripcion"}</span>
            {proyecto.tipo_obra && <span style={{ fontSize: 10, background: "#f0f0f0", borderRadius: 4, padding: "1px 6px", color: "#666" }}>{proyecto.tipo_obra}</span>}
          </div>
          <div style={{ fontSize: 12, color: "#888", marginTop: 2 }}>
            {proyecto.cliente || "-"}
            {proyecto.encargado && ` - ${proyecto.encargado}`}
            {proyecto.superficie && ` - ${proyecto.superficie}m2`}
          </div>
          {proyecto.proxima_tarea && <div style={{ fontSize: 11, color: "#6366f1", marginTop: 3 }}>-> {proyecto.proxima_tarea}</div>}
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4, flexShrink: 0 }}>
          {diasRestantes !== null && (
            <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 5, background: diasRestantes < 0 ? "#fef2f2" : diasRestantes < 7 ? "#fffbeb" : "#f0fdf4", color: diasRestantes < 0 ? "#ef4444" : diasRestantes < 7 ? "#d97706" : "#16a34a" }}>
              {diasRestantes < 0 ? `${Math.abs(diasRestantes)}d vencido` : diasRestantes === 0 ? "Hoy" : `${diasRestantes}d`}
            </span>
          )}
          {pctChecklist !== null && <span style={{ fontSize: 10, color: pctChecklist === 100 ? "#22c55e" : "#888" }}>Checklist {proyecto.checklist_completados}/{proyecto.checklist_total}</span>}
          <div style={{ display: "flex", gap: 4 }}>
            {proyecto.anticipo && <span title="Anticipo" style={{ fontSize: 12 }}>$</span>}
            {proyecto.proyecto_ok && <span title="Proyecto OK" style={{ fontSize: 12 }}>OK</span>}
            {proyecto.cobrado && <span title="Cobrado" style={{ fontSize: 12 }}>Cobrado</span>}
            {proyecto.drive_url && <a href={proyecto.drive_url} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()} style={{ fontSize: 12 }}>Drive</a>}
          </div>
          <span style={{ fontSize: 11, color: "#bbb" }}>{expanded ? "^" : "v"}</span>
        </div>
      </div>

      {expanded && (
        <div style={{ padding: "0 16px 14px", borderTop: "1px solid #f5f5f5" }}>
          {proyecto.obs && <p style={{ fontSize: 13, color: "#666", margin: "10px 0 10px" }}>{proyecto.obs}</p>}
          {proyecto.checklist_total > 0 && (
            <div style={{ marginBottom: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#aaa", marginBottom: 3 }}><span>Checklist</span><span>{pctChecklist}%</span></div>
              <div style={{ height: 5, background: "#f0f0f0", borderRadius: 3, overflow: "hidden" }}><div style={{ height: "100%", width: `${pctChecklist}%`, background: "#22c55e" }} /></div>
            </div>
          )}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button onClick={() => onEditar(proyecto)} style={{ ...shared.btnSm, fontSize: 12 }}>Editar</button>
            <button onClick={() => onChecklist(proyecto)} style={{ ...shared.btnSm, fontSize: 12 }}>Checklist</button>
            {!isArchived(proyecto) && <button onClick={() => onArchivar(proyecto)} style={{ ...shared.btnSm, fontSize: 12, color: "#888" }}>Archivar</button>}
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
    const d = new Date(p.fecha_entrega_plan + "T12:00");
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    porMes[key] = [...(porMes[key] || []), p];
  });

  if (!meses.some(m => porMes[`${m.year}-${m.month}`]?.length)) return null;

  return (
    <div style={{ marginTop: 32 }}>
      <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 16 }}>Cronograma de entregas</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 14 }}>
        {meses.map(m => {
          const key = `${m.year}-${m.month}`;
          const items = porMes[key] || [];
          if (!items.length) return null;
          const esActual = m.year === hoy.getFullYear() && m.month === hoy.getMonth();
          return (
            <div key={key} style={{ background: "#fff", borderRadius: 14, padding: 16, boxShadow: "0 1px 6px rgba(0,0,0,.07)", border: esActual ? "2px solid #6366f1" : "none" }}>
              <div style={{ fontWeight: 700, fontSize: 13, color: esActual ? "#6366f1" : "#111", marginBottom: 10, textTransform: "capitalize" }}>{m.label}<span style={{ fontSize: 11, fontWeight: 400, color: "#aaa", marginLeft: 6 }}>{items.length} entrega{items.length > 1 ? "s" : ""}</span></div>
              {items.map(p => {
                const estado = estadoConfig(p);
                const dia = new Date(p.fecha_entrega_plan + "T12:00").getDate();
                return (
                  <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: "1px solid #f5f5f5" }}>
                    <div style={{ width: 32, height: 32, borderRadius: 8, background: estado.color + "18", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><span style={{ fontWeight: 800, fontSize: 14, color: estado.color }}>{dia}</span></div>
                    <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 12, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.descripcion}</div><div style={{ fontSize: 10, color: "#aaa" }}>{p.cliente || "-"} - {p.numero_proyecto || "-"}</div></div>
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

function GruposAcordeon({ grupos, archivados, mostrarArchivados, onEditar, onChecklist, onArchivar }) {
  const [abiertos, setAbiertos] = useState({ onboarding: true, activo: true, revision: true, archivado: false });
  const todoGrupos = [
    ...grupos,
    ...(mostrarArchivados && archivados.length > 0 ? [{ estado: "archivado", config: { label: "Archivados / Entregados", color: "#888", icon: "AR" }, items: archivados }] : []),
  ];

  if (!todoGrupos.length) return <p style={{ color: "#aaa", textAlign: "center", padding: 40 }}>No hay proyectos para mostrar.</p>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {todoGrupos.map(g => {
        const abierto = abiertos[g.estado] !== false;
        return (
          <div key={g.estado} style={{ borderRadius: 14, overflow: "hidden", boxShadow: "0 1px 5px rgba(0,0,0,.06)" }}>
            <div onClick={() => setAbiertos(prev => ({ ...prev, [g.estado]: !prev[g.estado] }))} style={{ display: "flex", alignItems: "center", gap: 10, padding: "13px 16px", background: g.config.color + "18", cursor: "pointer", userSelect: "none", borderLeft: `4px solid ${g.config.color}` }}>
              <span style={{ fontSize: 16 }}>{g.config.icon}</span>
              <span style={{ fontWeight: 700, fontSize: 14, color: g.config.color, flex: 1 }}>{g.config.label}</span>
              <span style={{ fontSize: 12, color: g.config.color, fontWeight: 700, background: g.config.color + "22", borderRadius: 20, padding: "2px 10px" }}>{g.items.length}</span>
              <span style={{ fontSize: 13, color: g.config.color, transform: abierto ? "rotate(0deg)" : "rotate(-90deg)", display: "inline-block" }}>v</span>
            </div>
            {abierto && (
              <div style={{ background: "#f8f9fa", padding: "10px 10px 4px" }}>
                {g.items.length ? g.items.map(p => <FilaProyecto key={p.id} proyecto={p} onEditar={onEditar} onChecklist={onChecklist} onArchivar={onArchivar} />) : <p style={{ color: "#bbb", textAlign: "center", padding: "16px 0", fontSize: 13 }}>Sin proyectos en este estado.</p>}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function Proyectos() {
  const [proyectos, setProyectos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [panelChecklist, setPanelChecklist] = useState(null);
  const [mostrarArchivados, setMostrarArchivados] = useState(false);
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
    if (!confirm(`Archivar "${p.descripcion}"?`)) return;
    setError("");
    try {
      await api(`/proyectos?id=eq.${p.id}`, {
        method: "PATCH",
        body: JSON.stringify({ estado: "entregado", archivado: true, entregado: true }),
      });
      setMsg("Archivado");
      setTimeout(() => setMsg(""), 2000);
      await cargar();
    } catch (e) {
      setError(e.message);
    }
  }

  const q = busqueda.trim().toLowerCase();

  const filtrados = useMemo(() => proyectos.filter(p => {
    if (isArchived(p) && !mostrarArchivados) return false;
    if (!q) return true;
    return [p.descripcion, p.cliente, p.numero_proyecto, p.encargado].some(v => (v || "").toLowerCase().includes(q));
  }), [proyectos, mostrarArchivados, q]);

  const activosBase = proyectos.filter(p => !isArchived(p));
  const archivadosBase = proyectos.filter(isArchived);
  const archivadosVisibles = filtrados.filter(isArchived);
  const grupos = ESTADO_ORDER.map(estado => ({
    estado,
    config: ESTADOS.find(e => e.v === estado),
    items: filtrados.filter(p => !isArchived(p) && normalizedEstado(p) === estado),
  })).filter(g => g.items.length > 0);

  const proyectosConEntrega = activosBase.filter(p => p.fecha_entrega_plan);
  const vencidos = proyectosConEntrega.filter(p => dateDiffDays(p.fecha_entrega_plan) < 0);

  return (
    <div style={{ fontFamily: "system-ui, -apple-system, sans-serif", padding: "24px", maxWidth: 1100, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>Proyectos</h1>
        <button onClick={() => setModal("nuevo")} style={shared.btn}>+ Nuevo proyecto</button>
      </div>

      {msg && <div style={{ background: "#d4edda", color: "#155724", borderRadius: 8, padding: "8px 12px", marginBottom: 14, fontSize: 13 }}>{msg}</div>}
      <ErrorBox message={error} />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(130px,1fr))", gap: 12, marginBottom: 24 }}>
        {[
          ["En curso", activosBase.length, "#6366f1"],
          ["Activos", activosBase.filter(p => normalizedEstado(p) === "activo").length, "#22c55e"],
          ["Con entrega", proyectosConEntrega.length, "#f59e0b"],
          ["Vencidos", vencidos.length, vencidos.length ? "#ef4444" : "#888"],
        ].map(([label, value, color]) => (
          <div key={label} style={{ background: "#fff", borderRadius: 12, padding: "14px 16px", boxShadow: "0 1px 4px rgba(0,0,0,.06)", textAlign: "center" }}>
            <div style={{ fontSize: 26, fontWeight: 800, color }}>{value}</div>
            <div style={{ fontSize: 12, color: "#888", marginTop: 2 }}>{label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
        <input value={busqueda} onChange={e => setBusqueda(e.target.value)} placeholder="Buscar proyecto, cliente, encargado..." style={{ ...shared.inp, width: 320 }} />
        <button onClick={() => setMostrarArchivados(!mostrarArchivados)} style={{ ...shared.btnSm, background: mostrarArchivados ? "#111" : "#f0f0f0", color: mostrarArchivados ? "#fff" : "#333" }}>
          Archivados ({q ? archivadosVisibles.length : archivadosBase.length})
        </button>
      </div>

      {loading ? <p style={{ color: "#aaa" }}>Cargando...</p> : (
        <>
          <GruposAcordeon
            grupos={grupos}
            archivados={q ? archivadosVisibles : archivadosBase}
            mostrarArchivados={mostrarArchivados}
            onEditar={setModal}
            onChecklist={setPanelChecklist}
            onArchivar={archivar}
          />
          <CronogramaMensual proyectos={filtrados.filter(p => !isArchived(p))} />
        </>
      )}

      {modal && (
        <ModalProyecto
          proyecto={modal === "nuevo" ? null : modal}
          onClose={() => setModal(null)}
          onGuardar={async () => {
            setModal(null);
            setMsg("Guardado");
            setTimeout(() => setMsg(""), 2000);
            await cargar();
          }}
        />
      )}

      {panelChecklist && (
        <PanelChecklist
          proyectoId={panelChecklist.id}
          onClose={() => { setPanelChecklist(null); cargar(); }}
        />
      )}
    </div>
  );
}
