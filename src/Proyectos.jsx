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
  { id: "onboarding", label: "Onboarding" },
  { id: "activos", label: "Activos" },
  { id: "revision", label: "Revision" },
  { id: "entregados", label: "Entregados" },
  { id: "archivados", label: "Archivados" },
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
  menuLine: { display: "block", width: 14, height: 2, borderRadius: 999, background: "#333" },
};

const emptyToNull = value => value === "" || value === undefined ? null : value;
const normalizeEstado = p => p?.estado === "en_curso" ? "activo" : (p?.estado || "activo");
const isArchived = p => !!p?.archivado;
const isDelivered = p => !!(p?.entregado || normalizeEstado(p) === "entregado");
const isVisibleDelivered = p => isDelivered(p) && !isArchived(p);
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
  const [selected, setSelected] = useState(null);
  const [comentarios, setComentarios] = useState([]);
  const [nuevoComentario, setNuevoComentario] = useState("");
  const [autor, setAutor] = useState("Director");
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

  async function abrirDetalle(item) {
    setSelected(item);
    setNuevoComentario("");
    setError("");
    try {
      const rows = await api(`/proyecto_checklist_comentarios?item_id=eq.${item.id}&order=created_at.asc`);
      setComentarios(Array.isArray(rows) ? rows : []);
    } catch (e) {
      setComentarios([]);
      setError(e.message);
    }
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
    const estado = next ? "completado" : "pendiente";
    const previous = items;
    setItems(prev => prev.map(i => i.id === item.id ? { ...i, completado: next, estado } : i));
    if (selected?.id === item.id) setSelected(prev => ({ ...prev, completado: next, estado }));
    try {
      await api(`/proyecto_checklist?id=eq.${item.id}`, { method: "PATCH", body: JSON.stringify({ completado: next, estado }) });
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

  async function actualizarItem(item, patch) {
    const previous = items;
    const updated = { ...item, ...patch };
    setItems(prev => prev.map(i => i.id === item.id ? updated : i));
    setSelected(updated);
    try {
      const rows = await api(`/proyecto_checklist?id=eq.${item.id}`, {
        method: "PATCH",
        body: JSON.stringify(patch),
      });
      if (Array.isArray(rows) && rows[0]) {
        setItems(prev => prev.map(i => i.id === item.id ? rows[0] : i));
        setSelected(rows[0]);
      }
    } catch (e) {
      setError(e.message);
      setItems(previous);
      setSelected(item);
    }
  }

  async function agregarComentario() {
    if (!selected || !nuevoComentario.trim()) return;
    const texto = nuevoComentario.trim();
    setNuevoComentario("");
    try {
      const rows = await api("/proyecto_checklist_comentarios", {
        method: "POST",
        body: JSON.stringify({ item_id: selected.id, autor, comentario: texto }),
      });
      const creado = Array.isArray(rows) ? rows[0] : null;
      if (creado) setComentarios(prev => [...prev, creado]);
      await actualizarItem(selected, { ultimo_comentario: `${autor}: ${texto}` });
    } catch (e) {
      setNuevoComentario(texto);
      setError(e.message);
    }
  }

  const done = items.filter(i => i.completado).length;
  const pct = items.length ? Math.round(done / items.length * 100) : 0;
  const pendientes = items.filter(i => !i.completado);
  const completadas = items.filter(i => i.completado);

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(17,17,17,.48)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 200, padding: 24 }}>
      <div style={{ width: "min(1040px, 100%)", maxHeight: "88vh", overflow: "hidden", background: "#fff", borderRadius: 14, boxShadow: "0 24px 80px rgba(0,0,0,.28)", display: "grid", gridTemplateRows: "auto auto 1fr" }}>
        <div style={{ padding: "22px 24px 14px", borderBottom: "1px solid #eee" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16 }}>
            <div>
              <h3 style={{ margin: 0, fontSize: 21, letterSpacing: 0 }}>Checklist de comunicacion</h3>
              <p style={{ margin: "5px 0 0", color: "#777", fontSize: 13 }}>
                {items.length ? `${done}/${items.length} tareas completadas` : "Sin tareas cargadas"} - Director / calculista
              </p>
            </div>
            <button onClick={onClose} style={ui.secondary}>Cerrar</button>
          </div>
          <div style={{ height: 7, background: "#eee", borderRadius: 999, overflow: "hidden", marginTop: 16 }}>
            <div style={{ width: `${pct}%`, height: "100%", background: "#16a34a", transition: "width .2s ease" }} />
          </div>
        </div>

        <div style={{ padding: "14px 24px", borderBottom: "1px solid #eee", background: "#fafafa" }}>
          <ErrorBanner message={error} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 10 }}>
            <input ref={inputRef} value={nuevo} onChange={e => setNuevo(e.target.value)} onKeyDown={e => e.key === "Enter" && agregar()} placeholder="Nueva observacion, ajuste o tarea tecnica" style={{ ...ui.input, fontSize: 15 }} />
            <button onClick={agregar} disabled={saving || !nuevo.trim()} style={{ ...ui.button, opacity: saving || !nuevo.trim() ? 0.5 : 1 }}>Agregar</button>
          </div>
        </div>

        <div style={{ overflowY: "auto", padding: 24, background: "#f6f7f9" }}>
          {loading ? <p style={{ color: "#888" }}>Cargando...</p> : (
            <div style={{ display: "grid", gridTemplateColumns: selected ? "minmax(260px,1fr) minmax(260px,1fr) 360px" : "minmax(280px,1fr) minmax(280px,1fr)", gap: 16, alignItems: "start" }}>
              <ChecklistColumn title="Pendientes" count={pendientes.length} tone="#f8fafc">
                {pendientes.map(item => <ChecklistCard key={item.id} item={item} selected={selected?.id === item.id} onOpen={abrirDetalle} onToggle={toggle} onDelete={eliminar} />)}
              </ChecklistColumn>
              <ChecklistColumn title="Completadas" count={completadas.length} tone="#f0fdf4">
                {completadas.map(item => <ChecklistCard key={item.id} item={item} selected={selected?.id === item.id} onOpen={abrirDetalle} onToggle={toggle} onDelete={eliminar} />)}
              </ChecklistColumn>
              {selected && (
                <ChecklistDetail
                  item={selected}
                  comentarios={comentarios}
                  autor={autor}
                  setAutor={setAutor}
                  nuevoComentario={nuevoComentario}
                  setNuevoComentario={setNuevoComentario}
                  onComment={agregarComentario}
                  onUpdate={patch => actualizarItem(selected, patch)}
                  onClose={() => setSelected(null)}
                />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ChecklistColumn({ title, count, tone, children }) {
  return (
    <div style={{ background: tone, border: "1px solid #e1e5ea", borderRadius: 12, padding: 12, minHeight: 280 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <strong style={{ fontSize: 14 }}>{title}</strong>
        <span style={{ fontSize: 12, color: "#555", background: "#fff", border: "1px solid #e5e7eb", borderRadius: 999, padding: "2px 8px" }}>{count}</span>
      </div>
      <div style={{ display: "grid", gap: 10 }}>
        {React.Children.count(children) ? children : <div style={{ border: "1px dashed #cfd5dd", borderRadius: 10, padding: 28, textAlign: "center", color: "#8a8f98", fontSize: 13, background: "rgba(255,255,255,.48)" }}>Sin tarjetas</div>}
      </div>
    </div>
  );
}

function ChecklistCard({ item, selected, onOpen, onToggle, onDelete }) {
  return (
    <div onClick={() => onOpen(item)} style={{ background: "#fff", border: selected ? "2px solid #111" : "1px solid #e1e5ea", borderRadius: 10, padding: selected ? 11 : 12, boxShadow: "0 1px 2px rgba(0,0,0,.04)", cursor: "pointer" }}>
      <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", alignItems: "start", gap: 10 }}>
        <input type="checkbox" checked={!!item.completado} onClick={e => e.stopPropagation()} onChange={() => onToggle(item)} style={{ width: 18, height: 18, marginTop: 1 }} />
        <div>
          <div style={{ fontSize: 14, lineHeight: 1.38, color: item.completado ? "#15803d" : "#222", textDecoration: item.completado ? "line-through" : "none" }}>{item.texto}</div>
          {item.ultimo_comentario && <div style={{ marginTop: 8, padding: "7px 9px", background: "#f8fafc", borderRadius: 8, color: "#555", fontSize: 12 }}>{item.ultimo_comentario}</div>}
        </div>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 10 }}>
        <span style={{ fontSize: 11, color: "#777" }}>{item.responsable || "Sin responsable"}</span>
        <button onClick={e => { e.stopPropagation(); onDelete(item.id); }} style={{ background: "none", border: "none", color: "#777", fontSize: 12, padding: 0, cursor: "pointer" }}>Eliminar</button>
      </div>
    </div>
  );
}

function ChecklistDetail({ item, comentarios, autor, setAutor, nuevoComentario, setNuevoComentario, onComment, onUpdate, onClose }) {
  return (
    <aside style={{ background: "#fff", border: "1px solid #e1e5ea", borderRadius: 12, padding: 14, minHeight: 360, position: "sticky", top: 0 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, marginBottom: 12 }}>
        <div>
          <strong style={{ fontSize: 15 }}>Detalle</strong>
          <div style={{ color: "#777", fontSize: 12, marginTop: 3 }}>Feedback director / calculista</div>
        </div>
        <button onClick={onClose} style={{ ...ui.secondary, padding: "5px 9px", fontSize: 12 }}>Cerrar</button>
      </div>

      <div style={{ fontSize: 15, fontWeight: 750, lineHeight: 1.35, marginBottom: 12 }}>{item.texto}</div>

      <div style={{ display: "grid", gap: 10, marginBottom: 14 }}>
        <Field label="Responsable">
          <select value={item.responsable || ""} onChange={e => onUpdate({ responsable: e.target.value || null })} style={ui.input}>
            <option value="">Sin responsable</option>
            <option value="Director">Director</option>
            <option value="Calculista">Calculista</option>
            <option value="Ricardo">Ricardo</option>
            <option value="Lucas">Lucas</option>
            <option value="Joaco">Joaco</option>
            <option value="Cami">Cami</option>
          </select>
        </Field>
        <Field label="Estado">
          <select value={item.completado ? "completado" : (item.estado || "pendiente")} onChange={e => {
            const estado = e.target.value;
            onUpdate({ estado, completado: estado === "completado" });
          }} style={ui.input}>
            <option value="pendiente">Pendiente</option>
            <option value="en_proceso">En proceso</option>
            <option value="necesita_respuesta">Necesita respuesta</option>
            <option value="para_revisar">Para revisar</option>
            <option value="completado">Completado</option>
          </select>
        </Field>
      </div>

      <div style={{ borderTop: "1px solid #eee", paddingTop: 12 }}>
        <strong style={{ fontSize: 13 }}>Comentarios</strong>
        <div style={{ display: "grid", gap: 8, margin: "10px 0 12px", maxHeight: 210, overflowY: "auto" }}>
          {comentarios.map(c => (
            <div key={c.id} style={{ background: "#f8fafc", border: "1px solid #edf0f4", borderRadius: 8, padding: 9 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8, marginBottom: 4 }}>
                <strong style={{ fontSize: 12 }}>{c.autor || "Usuario"}</strong>
                <span style={{ fontSize: 11, color: "#888" }}>{c.created_at ? new Date(c.created_at).toLocaleDateString("es-AR") : ""}</span>
              </div>
              <div style={{ fontSize: 13, color: "#333", lineHeight: 1.35 }}>{c.comentario}</div>
            </div>
          ))}
          {!comentarios.length && <div style={{ color: "#999", fontSize: 13, padding: "8px 0" }}>Todavia no hay comentarios.</div>}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "130px 1fr", gap: 8, marginBottom: 8 }}>
          <select value={autor} onChange={e => setAutor(e.target.value)} style={ui.input}>
            <option value="Director">Director</option>
            <option value="Calculista">Calculista</option>
            <option value="Ricardo">Ricardo</option>
            <option value="Lucas">Lucas</option>
            <option value="Joaco">Joaco</option>
            <option value="Cami">Cami</option>
          </select>
          <input value={nuevoComentario} onChange={e => setNuevoComentario(e.target.value)} onKeyDown={e => e.key === "Enter" && onComment()} placeholder="Escribir comentario..." style={ui.input} />
        </div>
        <button onClick={onComment} disabled={!nuevoComentario.trim()} style={{ ...ui.button, width: "100%", opacity: nuevoComentario.trim() ? 1 : 0.5 }}>Enviar comentario</button>
      </div>
    </aside>
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
      archivado: delivered ? !!proyecto?.archivado : false,
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
      <div style={{ display: "grid", gridTemplateColumns: "74px minmax(0,1fr) auto", gap: 12, alignItems: "start", padding: "14px 16px" }}>
        <button onClick={() => setOpen(!open)} style={{ border: "none", background: "transparent", padding: 0, textAlign: "left", cursor: "pointer" }}>
          <div style={{ fontSize: 12, color: "#777", fontWeight: 800 }}>{proyecto.numero_proyecto || "-"}</div>
        </button>
        <button onClick={() => setOpen(!open)} style={{ border: "none", background: "transparent", padding: 0, textAlign: "left", cursor: "pointer", minWidth: 0 }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <strong style={{ fontSize: 14 }}>{proyecto.descripcion || "Sin descripcion"}</strong>
              <StatusPill proyecto={proyecto} />
              {proyecto.tipo_obra && <span style={{ fontSize: 11, color: "#666", background: "#f4f4f5", borderRadius: 999, padding: "3px 8px" }}>{proyecto.tipo_obra}</span>}
            </div>
            <div style={{ fontSize: 12, color: "#777", marginTop: 3 }}>{proyecto.cliente || "Sin cliente"}{proyecto.encargado ? ` - ${proyecto.encargado}` : ""}{proyecto.superficie ? ` - ${proyecto.superficie}m2` : ""}</div>
            {proyecto.proxima_tarea && <div style={{ fontSize: 12, color: "#3730a3", marginTop: 4 }}>{proyecto.proxima_tarea}</div>}
          </div>
        </button>
        <div style={{ display: "flex", alignItems: "flex-end", flexDirection: "column", gap: 5 }}>
          {days !== null && <span style={{ fontSize: 11, fontWeight: 800, color: days < 0 ? "#b91c1c" : days < 7 ? "#a16207" : "#15803d", background: days < 0 ? "#fef2f2" : days < 7 ? "#fefce8" : "#f0fdf4", borderRadius: 999, padding: "3px 8px" }}>{days < 0 ? `${Math.abs(days)}d vencido` : days === 0 ? "Hoy" : `${days}d`}</span>}
          {pct !== null && <span style={{ fontSize: 11, color: pct === 100 ? "#15803d" : "#777" }}>Checklist {proyecto.checklist_completados}/{proyecto.checklist_total}</span>}
          <button onClick={() => setOpen(!open)} style={{ border: "none", background: "transparent", color: "#666", fontSize: 12, cursor: "pointer" }}>{open ? "Cerrar" : "Abrir"}</button>
        </div>
      </div>
      {open && (
        <div style={{ padding: "0 16px 14px 102px", borderTop: "1px solid #f2f2f2" }}>
          {proyecto.obs && <p style={{ margin: "0 0 10px", color: "#555", fontSize: 13 }}>{proyecto.obs}</p>}
          {pct !== null && <div style={{ height: 6, background: "#eee", borderRadius: 999, overflow: "hidden", marginBottom: 12 }}><div style={{ height: "100%", width: `${pct}%`, background: "#16a34a" }} /></div>}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button onClick={() => onEditar(proyecto)} style={ui.secondary}>Editar</button>
            <button onClick={() => onChecklist(proyecto)} style={ui.secondary}>Checklist</button>
            {proyecto.drive_url && <a href={proyecto.drive_url} target="_blank" rel="noreferrer" style={{ ...ui.secondary, textDecoration: "none" }}>Drive</a>}
            {!isDelivered(proyecto) && <button onClick={() => onArchivar(proyecto, "entregar")} style={ui.secondary}>Marcar entregado</button>}
            {isDelivered(proyecto) && !isArchived(proyecto) && <button onClick={() => onArchivar(proyecto, "archivar")} style={ui.secondary}>Archivar</button>}
          </div>
        </div>
      )}
    </div>
  );
}

function EstadoDropdown({ tab, setTab }) {
  const [open, setOpen] = useState(false);
  const current = TABS.find(t => t.id === tab) || TABS[0];
  return (
    <div style={{ position: "relative" }}>
      <button onClick={() => setOpen(v => !v)} style={{ ...ui.secondary, display: "flex", alignItems: "center", gap: 10, minWidth: 176, justifyContent: "space-between" }}>
        <span>{current.label}</span>
        <span style={{ display: "grid", gap: 3 }}>
          <span style={ui.menuLine} />
          <span style={ui.menuLine} />
          <span style={ui.menuLine} />
        </span>
      </button>
      {open && (
        <div style={{ position: "absolute", left: 0, top: "100%", marginTop: 6, width: 210, background: "#fff", border: "1px solid #ddd", borderRadius: 8, boxShadow: "0 12px 28px rgba(0,0,0,.14)", zIndex: 30, padding: 6 }}>
          <div style={{ padding: "7px 10px 6px", fontSize: 11, color: "#777", fontWeight: 800, textTransform: "uppercase" }}>Estado</div>
          {TABS.map(t => (
            <button key={t.id} onClick={() => { setTab(t.id); setOpen(false); }} style={{ width: "100%", textAlign: "left", padding: "8px 10px", background: tab === t.id ? "#f4f4f5" : "transparent", border: "none", color: "#333", borderRadius: 6, cursor: "pointer", fontSize: 13, fontWeight: tab === t.id ? 800 : 500 }}>
              {t.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function EntregasTimeline({ proyectos }) {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const en14 = new Date(hoy);
  en14.setDate(hoy.getDate() + 14);

  const ordenados = [...proyectos]
    .filter(p => p.fecha_entrega_plan)
    .sort((a, b) => new Date(`${a.fecha_entrega_plan}T12:00`) - new Date(`${b.fecha_entrega_plan}T12:00`));

  const semanaActual = ordenados.filter(p => {
    const d = new Date(`${p.fecha_entrega_plan}T12:00`);
    return d >= hoy && d < new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() + 7);
  });
  const semanaProxima = ordenados.filter(p => {
    const d = new Date(`${p.fecha_entrega_plan}T12:00`);
    return d >= new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() + 7) && d <= en14;
  });

  const porMes = {};
  ordenados.forEach(p => {
    const d = new Date(`${p.fecha_entrega_plan}T12:00`);
    const key = d.toLocaleDateString("es-AR", { month: "long", year: "numeric" });
    porMes[key] = [...(porMes[key] || []), p];
  });

  if (!ordenados.length) return null;

  return (
    <section style={{ marginBottom: 18 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <h2 style={{ fontSize: 17, margin: 0 }}>Proximas entregas</h2>
        <span style={{ fontSize: 12, color: "#666" }}>{ordenados.length} proyectos con fecha</span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(250px,1fr))", gap: 10, marginBottom: 12 }}>
        <EntregaBucket title="Esta semana" items={semanaActual} />
        <EntregaBucket title="Proxima semana" items={semanaProxima} />
      </div>
      <div style={{ background: "#fff", border: "1px solid #e6e6e6", borderRadius: 10, padding: 12 }}>
        <div style={{ fontSize: 13, color: "#666", fontWeight: 750, marginBottom: 8 }}>Por mes</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(210px,1fr))", gap: 10 }}>
          {Object.entries(porMes).slice(0, 6).map(([mes, items]) => (
            <div key={mes} style={{ border: "1px solid #eee", borderRadius: 8, padding: 10 }}>
              <strong style={{ display: "block", textTransform: "capitalize", fontSize: 13, marginBottom: 6 }}>{mes}</strong>
              {items.slice(0, 4).map(p => <EntregaMini key={p.id} proyecto={p} />)}
              {items.length > 4 && <div style={{ fontSize: 12, color: "#777", marginTop: 5 }}>+{items.length - 4} mas</div>}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function EntregaBucket({ title, items }) {
  return (
    <div style={{ background: "#fff", border: "1px solid #e6e6e6", borderRadius: 10, padding: 12, minHeight: 128 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <strong style={{ fontSize: 14 }}>{title}</strong>
        <span style={{ fontSize: 11, color: "#666", background: "#f4f4f5", borderRadius: 999, padding: "2px 8px" }}>{items.length}</span>
      </div>
      {items.length ? items.map(p => <EntregaMini key={p.id} proyecto={p} />) : <div style={{ color: "#999", fontSize: 13, paddingTop: 20, textAlign: "center" }}>Sin entregas</div>}
    </div>
  );
}

function EntregaMini({ proyecto }) {
  const d = new Date(`${proyecto.fecha_entrega_plan}T12:00`);
  const days = dueDays(proyecto.fecha_entrega_plan);
  return (
    <div style={{ display: "grid", gridTemplateColumns: "38px 1fr", gap: 8, alignItems: "center", padding: "7px 0", borderTop: "1px solid #f1f1f1" }}>
      <div style={{ textAlign: "center", borderRadius: 8, background: days < 0 ? "#fef2f2" : days < 7 ? "#fefce8" : "#f0fdf4", color: days < 0 ? "#b91c1c" : days < 7 ? "#a16207" : "#15803d", padding: "4px 0", fontWeight: 850, fontSize: 13 }}>{d.getDate()}</div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 750, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{proyecto.descripcion}</div>
        <div style={{ fontSize: 11, color: "#777" }}>{proyecto.cliente || "Sin cliente"} - {days < 0 ? `${Math.abs(days)}d vencido` : days === 0 ? "Hoy" : `${days}d`}</div>
      </div>
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

  async function archivar(p, accion = "entregar") {
    const esArchivo = accion === "archivar";
    if (!confirm(`${esArchivo ? "Archivar" : "Marcar como entregado"} "${p.descripcion}"?`)) return;
    setError("");
    try {
      await api(`/proyectos?id=eq.${p.id}`, {
        method: "PATCH",
        body: JSON.stringify(esArchivo
          ? { archivado: true }
          : { estado: "entregado", archivado: false, entregado: true }),
      });
      setMsg(esArchivo ? "Proyecto archivado" : "Proyecto marcado como entregado");
      setTimeout(() => setMsg(""), 2200);
      await cargar();
      setTab(esArchivo ? "archivados" : "entregados");
    } catch (e) {
      setError(e.message);
    }
  }

  const q = busqueda.trim().toLowerCase();
  const archivados = proyectos.filter(isArchived);
  const activos = proyectos.filter(p => !isDelivered(p) && !isArchived(p));
  const entregados = proyectos.filter(isVisibleDelivered);
  const revision = activos.filter(p => normalizeEstado(p) === "revision");
  const onboarding = activos.filter(p => normalizeEstado(p) === "onboarding");
  const activosOperacion = activos.filter(p => normalizeEstado(p) === "activo");
  const conEntrega = activos.filter(p => p.fecha_entrega_plan);
  const vencidos = conEntrega.filter(p => dueDays(p.fecha_entrega_plan) < 0);

  const base = useMemo(() => {
    if (tab === "entregados") return entregados;
    if (tab === "archivados") return archivados;
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
          <Metric label="Archivados" value={archivados.length} color="#71717a" onClick={() => setTab("archivados")} />
          <Metric label="Vencidos" value={vencidos.length} color={vencidos.length ? "#b91c1c" : "#777"} />
        </div>

        <EntregasTimeline proyectos={activos.filter(p => p.fecha_entrega_plan)} />

        <section style={{ background: "#fff", border: "1px solid #e6e6e6", borderRadius: 10, padding: 12, marginBottom: 14 }}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              <EstadoDropdown tab={tab} setTab={setTab} />
            </div>
            <input value={busqueda} onChange={e => setBusqueda(e.target.value)} placeholder="Buscar proyecto, cliente, encargado..." style={{ ...ui.input, maxWidth: 340 }} />
          </div>
        </section>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", margin: "12px 0", color: "#666", fontSize: 13 }}>
          <span>{loading ? "Cargando..." : `${visibles.length} resultado${visibles.length === 1 ? "" : "s"}`}</span>
          {tab === "entregados" && <strong style={{ color: "#333" }}>Los entregados estan aca. Si ya no los necesitas, abrilos y usa Archivar.</strong>}
          {tab === "archivados" && <strong style={{ color: "#333" }}>Archivo historico.</strong>}
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
