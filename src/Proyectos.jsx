import React, { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "./supabase.js";
import Combobox from "./Combobox.jsx";
import { COLORS, FUNC, FONT_MONO, shared, SectionHeader, KpiGrid, Badge, ProgressBar, FilterBar, EmptyState, Toast, Acordeon } from "./uiKit.jsx";

const SUPA_URL = "https://imkmosifqxzbtqgzssst.supabase.co/rest/v1";
const ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlta21vc2lmcXh6YnRxZ3pzc3N0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkxODk4NTUsImV4cCI6MjA5NDc2NTg1NX0.5gtCs8Yv3vDSrKxAmXSr3zjWJ5HjimCKejfO-XrHPss";

async function getToken() {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token || ANON_KEY;
}
function hdrs(token) {
  return { apikey: ANON_KEY, Authorization: `Bearer ${token}`, "Content-Type": "application/json", Prefer: "return=representation" };
}
async function api(path, options = {}) {
  const token = await getToken();
  const res = await fetch(`${SUPA_URL}${path}`, { ...options, headers: { ...hdrs(token), ...(options.headers || {}) } });
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok || data?.error || data?.message || data?.code) {
    throw new Error(data?.message || data?.error || `Error HTTP ${res.status}`);
  }
  return data;
}

/* ─── Estados — colores funcionales del kit ─── */
const ESTADOS = {
  onboarding: { label: "Onboarding", color: FUNC.warning },
  activo:     { label: "Activo",     color: FUNC.success },
  revision:   { label: "Revisión",   color: FUNC.info },
  entregado:  { label: "Entregado",  color: COLORS.textMuted },
};

const TABS = [
  { id: "onboarding",  label: "Onboarding" },
  { id: "activos",     label: "Activos" },
  { id: "revision",    label: "Revisión" },
  { id: "entregados",  label: "Entregados" },
  { id: "archivados",  label: "Archivados" },
  { id: "todos",       label: "Todos" },
];

const TIPOS_OBRA = ["Steel Frame", "Wood Frame", "Hormigón", "Madera", "Panel SIP", "Metálica", "Mixta"];

const emptyToNull = value => value === "" || value === undefined ? null : value;
const normalizeEstado = p => p?.estado === "en_curso" ? "activo" : (p?.estado || "activo");
const isArchived = p => !!p?.archivado;
const isDelivered = p => !!(p?.entregado || normalizeEstado(p) === "entregado");
const isVisibleDelivered = p => isDelivered(p) && !isArchived(p);
const statusMeta = p => ESTADOS[isDelivered(p) ? "entregado" : normalizeEstado(p)] || ESTADOS.activo;
const dueDays = date => Math.ceil((new Date(`${date}T12:00`) - new Date()) / 86400000);

/* ════════════════════════════════════════════
   ERROR BANNER — usa Toast del kit
════════════════════════════════════════════ */
function ErrorBanner({ message }) {
  if (!message) return null;
  return <Toast tipo="error" texto={message} />;
}

/* ════════════════════════════════════════════
   STATUS PILL — usa Badge del kit
════════════════════════════════════════════ */
function StatusPill({ proyecto }) {
  const meta = statusMeta(proyecto);
  return <Badge color={meta.color} label={meta.label} />;
}

/* ════════════════════════════════════════════
   CHECKLIST — kanban pendientes/completadas + detalle
════════════════════════════════════════════ */
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
    setLoading(true); setError("");
    try {
      const rows = await api(`/proyecto_checklist?proyecto_id=eq.${proyectoId}&order=orden.asc,created_at.asc`);
      setItems(Array.isArray(rows) ? rows : []);
    } catch (e) { setError(e.message); setItems([]); }
    setLoading(false);
  }

  async function abrirDetalle(item) {
    setSelected(item); setNuevoComentario(""); setError("");
    try {
      const rows = await api(`/proyecto_checklist_comentarios?item_id=eq.${item.id}&order=created_at.asc`);
      setComentarios(Array.isArray(rows) ? rows : []);
    } catch (e) { setComentarios([]); setError(e.message); }
  }

  async function agregar() {
    if (!nuevo.trim()) return;
    setSaving(true); setError("");
    try {
      const rows = await api("/proyecto_checklist", { method: "POST", body: JSON.stringify({ proyecto_id: proyectoId, texto: nuevo.trim(), orden: items.length }) });
      if (!Array.isArray(rows) || !rows[0]) throw new Error("No se pudo crear la tarea");
      setItems(prev => [...prev, rows[0]]); setNuevo(""); inputRef.current?.focus();
    } catch (e) { setError(e.message); }
    setSaving(false);
  }

  async function toggle(item) {
    const next = !item.completado;
    const estado = next ? "completado" : "pendiente";
    const previous = items;
    setItems(prev => prev.map(i => i.id === item.id ? { ...i, completado: next, estado } : i));
    if (selected?.id === item.id) setSelected(prev => ({ ...prev, completado: next, estado }));
    try { await api(`/proyecto_checklist?id=eq.${item.id}`, { method: "PATCH", body: JSON.stringify({ completado: next, estado }) }); }
    catch (e) { setError(e.message); setItems(previous); }
  }

  async function eliminar(id) {
    const previous = items;
    setItems(prev => prev.filter(i => i.id !== id));
    try { await api(`/proyecto_checklist?id=eq.${id}`, { method: "DELETE" }); }
    catch (e) { setError(e.message); setItems(previous); }
  }

  async function actualizarItem(item, patch) {
    const previous = items;
    const updated = { ...item, ...patch };
    setItems(prev => prev.map(i => i.id === item.id ? updated : i));
    setSelected(updated);
    try {
      const rows = await api(`/proyecto_checklist?id=eq.${item.id}`, { method: "PATCH", body: JSON.stringify(patch) });
      if (Array.isArray(rows) && rows[0]) { setItems(prev => prev.map(i => i.id === item.id ? rows[0] : i)); setSelected(rows[0]); }
    } catch (e) { setError(e.message); setItems(previous); setSelected(item); }
  }

  async function agregarComentario() {
    if (!selected || !nuevoComentario.trim()) return;
    const texto = nuevoComentario.trim();
    setNuevoComentario("");
    try {
      const rows = await api("/proyecto_checklist_comentarios", { method: "POST", body: JSON.stringify({ item_id: selected.id, autor, comentario: texto }) });
      const creado = Array.isArray(rows) ? rows[0] : null;
      if (creado) setComentarios(prev => [...prev, creado]);
      await actualizarItem(selected, { ultimo_comentario: `${autor}: ${texto}` });
    } catch (e) { setNuevoComentario(texto); setError(e.message); }
  }

  const done = items.filter(i => i.completado).length;
  const pct = items.length ? Math.round(done / items.length * 100) : 0;
  const pendientes = items.filter(i => !i.completado);
  const completadas = items.filter(i => i.completado);

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(10,10,10,.55)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 200, padding: 24 }}>
      <div style={{ width: "min(1040px, 100%)", maxHeight: "88vh", overflow: "hidden", background: COLORS.bgCard, borderRadius: 14, border: `1.5px solid ${COLORS.border}`, display: "grid", gridTemplateRows: "auto auto 1fr" }}>
        <div style={{ padding: "22px 24px 14px", borderBottom: `1px solid ${COLORS.border}` }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16 }}>
            <div>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: COLORS.text }}>✅ Checklist de comunicación</h3>
              <p style={{ margin: "5px 0 0", color: COLORS.textMuted, fontSize: 13 }}>
                {items.length ? `${done}/${items.length} tareas completadas` : "Sin tareas cargadas"} · Director / calculista
              </p>
            </div>
            <button onClick={onClose} style={shared.btnSm}>Cerrar</button>
          </div>
          <div style={{ marginTop: 16 }}>
            <ProgressBar valor={pct} max={100} color={FUNC.success} showValue={false} height={7} />
          </div>
        </div>

        <div style={{ padding: "14px 24px", borderBottom: `1px solid ${COLORS.border}`, background: COLORS.bgSoft }}>
          <ErrorBanner message={error} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 10 }}>
            <input ref={inputRef} value={nuevo} onChange={e => setNuevo(e.target.value)} onKeyDown={e => e.key === "Enter" && agregar()} placeholder="Nueva observación, ajuste o tarea técnica" style={{ ...shared.inp, fontSize: 14 }} />
            <button onClick={agregar} disabled={saving || !nuevo.trim()} style={{ ...shared.btn, opacity: saving || !nuevo.trim() ? 0.5 : 1 }}>Agregar</button>
          </div>
        </div>

        <div style={{ overflowY: "auto", padding: 24, background: COLORS.bgApp }}>
          {loading ? <p style={{ color: COLORS.textFaint }}>Cargando…</p> : (
            <div style={{ display: "grid", gridTemplateColumns: selected ? "minmax(260px,1fr) minmax(260px,1fr) 360px" : "minmax(280px,1fr) minmax(280px,1fr)", gap: 16, alignItems: "start" }}>
              <ChecklistColumn title="Pendientes" count={pendientes.length}>
                {pendientes.map(item => <ChecklistCard key={item.id} item={item} selected={selected?.id === item.id} onOpen={abrirDetalle} onToggle={toggle} onDelete={eliminar} />)}
              </ChecklistColumn>
              <ChecklistColumn title="Completadas" count={completadas.length} tone={FUNC.success}>
                {completadas.map(item => <ChecklistCard key={item.id} item={item} selected={selected?.id === item.id} onOpen={abrirDetalle} onToggle={toggle} onDelete={eliminar} />)}
              </ChecklistColumn>
              {selected && (
                <ChecklistDetail item={selected} comentarios={comentarios} autor={autor} setAutor={setAutor} nuevoComentario={nuevoComentario} setNuevoComentario={setNuevoComentario} onComment={agregarComentario} onUpdate={patch => actualizarItem(selected, patch)} onClose={() => setSelected(null)} />
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
    <div style={{ background: tone ? tone + "0d" : COLORS.bgCard, border: `1.5px solid ${COLORS.border}`, borderRadius: 12, padding: 12, minHeight: 280 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <strong style={{ fontSize: 13, color: COLORS.text }}>{title}</strong>
        <span style={{ fontSize: 11, color: COLORS.textMuted, background: COLORS.bgCard, border: `1px solid ${COLORS.border}`, borderRadius: 999, padding: "2px 8px", fontFamily: FONT_MONO }}>{count}</span>
      </div>
      <div style={{ display: "grid", gap: 10 }}>
        {React.Children.count(children) ? children : <div style={{ border: `1px dashed ${COLORS.border}`, borderRadius: 10, padding: 28, textAlign: "center", color: COLORS.textFaint, fontSize: 13 }}>Sin tarjetas</div>}
      </div>
    </div>
  );
}

function ChecklistCard({ item, selected, onOpen, onToggle, onDelete }) {
  return (
    <div onClick={() => onOpen(item)} style={{ background: COLORS.bgCard, border: selected ? `2px solid ${COLORS.text}` : `1.5px solid ${COLORS.border}`, borderRadius: 10, padding: selected ? 11 : 12, cursor: "pointer" }}>
      <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", alignItems: "start", gap: 10 }}>
        <input type="checkbox" checked={!!item.completado} onClick={e => e.stopPropagation()} onChange={() => onToggle(item)} style={{ width: 18, height: 18, marginTop: 1 }} />
        <div>
          <div style={{ fontSize: 13.5, lineHeight: 1.4, color: item.completado ? FUNC.success : COLORS.text, textDecoration: item.completado ? "line-through" : "none" }}>{item.texto}</div>
          {item.ultimo_comentario && <div style={{ marginTop: 8, padding: "7px 9px", background: COLORS.bgSoft, borderRadius: 8, color: COLORS.textSoft, fontSize: 12 }}>{item.ultimo_comentario}</div>}
        </div>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 10 }}>
        <span style={{ fontSize: 11, color: COLORS.textFaint }}>{item.responsable || "Sin responsable"}</span>
        <button onClick={e => { e.stopPropagation(); onDelete(item.id); }} style={{ background: "none", border: "none", color: COLORS.textFaint, fontSize: 12, padding: 0, cursor: "pointer" }}>🗑</button>
      </div>
    </div>
  );
}

function ChecklistDetail({ item, comentarios, autor, setAutor, nuevoComentario, setNuevoComentario, onComment, onUpdate, onClose }) {
  return (
    <aside style={{ background: COLORS.bgCard, border: `1.5px solid ${COLORS.border}`, borderRadius: 12, padding: 14, minHeight: 360, position: "sticky", top: 0 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, marginBottom: 12 }}>
        <div>
          <strong style={{ fontSize: 14, color: COLORS.text }}>Detalle</strong>
          <div style={{ color: COLORS.textMuted, fontSize: 12, marginTop: 3 }}>Feedback director / calculista</div>
        </div>
        <button onClick={onClose} style={{ ...shared.btnSm, padding: "5px 9px", fontSize: 12 }}>Cerrar</button>
      </div>

      <div style={{ fontSize: 14, fontWeight: 700, lineHeight: 1.35, marginBottom: 12, color: COLORS.text }}>{item.texto}</div>

      <div style={{ display: "grid", gap: 10, marginBottom: 14 }}>
        <div>
          <span style={shared.lbl}>Responsable</span>
          <select value={item.responsable || ""} onChange={e => onUpdate({ responsable: e.target.value || null })} style={shared.inp}>
            <option value="">Sin responsable</option>
            <option value="Director">Director</option>
            <option value="Calculista">Calculista</option>
            <option value="Ricardo">Ricardo</option>
            <option value="Lucas">Lucas</option>
            <option value="Joaco">Joaco</option>
            <option value="Cami">Cami</option>
          </select>
        </div>
        <div>
          <span style={shared.lbl}>Estado</span>
          <select value={item.completado ? "completado" : (item.estado || "pendiente")} onChange={e => { const estado = e.target.value; onUpdate({ estado, completado: estado === "completado" }); }} style={shared.inp}>
            <option value="pendiente">Pendiente</option>
            <option value="en_proceso">En proceso</option>
            <option value="necesita_respuesta">Necesita respuesta</option>
            <option value="para_revisar">Para revisar</option>
            <option value="completado">Completado</option>
          </select>
        </div>
      </div>

      <div style={{ borderTop: `1px solid ${COLORS.border}`, paddingTop: 12 }}>
        <strong style={{ fontSize: 13, color: COLORS.text }}>Comentarios</strong>
        <div style={{ display: "grid", gap: 8, margin: "10px 0 12px", maxHeight: 210, overflowY: "auto" }}>
          {comentarios.map(c => (
            <div key={c.id} style={{ background: COLORS.bgSoft, border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: 9 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8, marginBottom: 4 }}>
                <strong style={{ fontSize: 12, color: COLORS.text }}>{c.autor || "Usuario"}</strong>
                <span style={{ fontSize: 11, color: COLORS.textFaint, fontFamily: FONT_MONO }}>{c.created_at ? new Date(c.created_at).toLocaleDateString("es-AR") : ""}</span>
              </div>
              <div style={{ fontSize: 13, color: COLORS.textSoft, lineHeight: 1.35 }}>{c.comentario}</div>
            </div>
          ))}
          {!comentarios.length && <div style={{ color: COLORS.textFaint, fontSize: 13, padding: "8px 0" }}>Todavía no hay comentarios.</div>}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "130px 1fr", gap: 8, marginBottom: 8 }}>
          <select value={autor} onChange={e => setAutor(e.target.value)} style={shared.inp}>
            <option value="Director">Director</option>
            <option value="Calculista">Calculista</option>
            <option value="Ricardo">Ricardo</option>
            <option value="Lucas">Lucas</option>
            <option value="Joaco">Joaco</option>
            <option value="Cami">Cami</option>
          </select>
          <input value={nuevoComentario} onChange={e => setNuevoComentario(e.target.value)} onKeyDown={e => e.key === "Enter" && onComment()} placeholder="Escribir comentario…" style={shared.inp} />
        </div>
        <button onClick={onComment} disabled={!nuevoComentario.trim()} style={{ ...shared.btn, width: "100%", opacity: nuevoComentario.trim() ? 1 : 0.5 }}>Enviar comentario</button>
      </div>
    </aside>
  );
}

/* ════════════════════════════════════════════
   MODAL PROYECTO
════════════════════════════════════════════ */
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
      } catch (e) { setError(e.message); }
    }
    cargarOpciones();
  }, []);

  async function guardar() {
    if (!form.descripcion.trim()) return;
    setSaving(true); setError("");
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
    } catch (e) { setError(e.message); }
    setSaving(false);
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(10,10,10,.5)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16, zIndex: 100 }}>
      <div style={{ width: "100%", maxWidth: 760, maxHeight: "92vh", overflowY: "auto", background: COLORS.bgCard, borderRadius: 16, border: `1.5px solid ${COLORS.border}`, padding: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 18 }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: COLORS.text }}>{esNuevo ? "Nuevo proyecto" : "Editar proyecto"}</h3>
            <p style={{ margin: "4px 0 0", fontSize: 13, color: COLORS.textMuted }}>Datos operativos, estado, cliente y seguimiento.</p>
          </div>
          <button onClick={onClose} style={shared.btnSm}>Cerrar</button>
        </div>
        <ErrorBanner message={error} />

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 18 }}>
          {Object.entries(ESTADOS).map(([id, meta]) => (
            <button key={id} onClick={() => setForm(f => ({ ...f, estado: id }))} style={{
              padding: "8px 14px", borderRadius: 10, cursor: "pointer", fontSize: 13, fontWeight: form.estado === id ? 700 : 500,
              border: `2px solid ${form.estado === id ? meta.color : COLORS.border}`,
              background: form.estado === id ? meta.color + "1a" : COLORS.bgCard,
              color: form.estado === id ? meta.color : COLORS.textSoft,
            }}>{meta.label}</button>
          ))}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "minmax(120px,.4fr) minmax(220px,1fr)", gap: 12, marginBottom: 12 }}>
          <div><span style={shared.lbl}>Nro proyecto</span><input value={form.numero_proyecto} onChange={e => setForm(f => ({ ...f, numero_proyecto: e.target.value }))} style={shared.inp} placeholder="553" /></div>
          <div><span style={shared.lbl}>Descripción *</span><input value={form.descripcion} onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))} style={shared.inp} placeholder="Descripción del proyecto" /></div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 12 }}>
          <div>
            <span style={shared.lbl}>Cliente</span>
            <Combobox options={clientes.map(c => ({ value: c.id, label: c.empresa }))} value={form.cliente_id} onChange={(val, label) => setForm(f => ({ ...f, cliente_id: val, cliente: label || "" }))} placeholder="Buscar cliente" emptyLabel="Sin vincular" />
          </div>
          <div>
            <span style={shared.lbl}>Encargado</span>
            <select value={form.encargado} onChange={e => setForm(f => ({ ...f, encargado: e.target.value }))} style={shared.inp}>
              <option value="">Sin asignar</option>
              {calculistas.map(c => <option key={c.id} value={c.nombre}>{c.nombre} · {c.nivel}</option>)}
            </select>
          </div>
          <div><span style={shared.lbl}>Categoría</span><input value={form.categoria} onChange={e => setForm(f => ({ ...f, categoria: e.target.value }))} style={shared.inp} /></div>
          <div><span style={shared.lbl}>Tipo de obra</span><select value={form.tipo_obra} onChange={e => setForm(f => ({ ...f, tipo_obra: e.target.value }))} style={shared.inp}><option value="">Seleccionar</option>{TIPOS_OBRA.map(t => <option key={t} value={t}>{t}</option>)}</select></div>
          <div><span style={shared.lbl}>Superficie m²</span><input type="number" min="0" value={form.superficie} onChange={e => setForm(f => ({ ...f, superficie: e.target.value }))} style={shared.inp} /></div>
          <div><span style={shared.lbl}>Fecha entrega</span><input type="date" value={form.fecha_entrega_plan} onChange={e => setForm(f => ({ ...f, fecha_entrega_plan: e.target.value }))} style={shared.inp} /></div>
          <div><span style={shared.lbl}>Próxima tarea</span><input value={form.proxima_tarea} onChange={e => setForm(f => ({ ...f, proxima_tarea: e.target.value }))} style={shared.inp} /></div>
          <div>
            <span style={shared.lbl}>Presupuesto</span>
            <Combobox options={presupuestos.map(p => ({ value: p.id, label: `${p.codigo || ""} — ${p.descripcion || p.cliente || ""}`.trim() }))} value={form.presupuesto_id} onChange={val => setForm(f => ({ ...f, presupuesto_id: val }))} placeholder="Buscar presupuesto" emptyLabel="Sin vincular" />
          </div>
        </div>

        <div style={{ marginTop: 12, display: "grid", gap: 12 }}>
          <div><span style={shared.lbl}>Link Drive</span><input value={form.drive_url} onChange={e => setForm(f => ({ ...f, drive_url: e.target.value }))} style={shared.inp} placeholder="https://drive.google.com/…" /></div>
          <div><span style={shared.lbl}>Observaciones</span><textarea value={form.obs} onChange={e => setForm(f => ({ ...f, obs: e.target.value }))} rows={3} style={{ ...shared.inp, resize: "vertical" }} /></div>
        </div>

        <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginTop: 16 }}>
          {[["anticipo", "💰 Anticipo cobrado"], ["check_diagnostico", "🔍 Diagnóstico OK"], ["proyecto_ok", "✅ Proyecto OK"], ["cobrado", "✓ Cobrado"]].map(([key, label]) => (
            <label key={key} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: COLORS.textSoft, cursor: "pointer" }}>
              <input type="checkbox" checked={!!form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.checked }))} style={{ width: 16, height: 16 }} />{label}
            </label>
          ))}
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 20 }}>
          <button onClick={onClose} style={shared.btnSm}>Cancelar</button>
          <button onClick={guardar} disabled={saving || !form.descripcion.trim()} style={{ ...shared.btn, opacity: saving || !form.descripcion.trim() ? 0.5 : 1 }}>{saving ? "Guardando…" : "Guardar"}</button>
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════
   CARD PROYECTO — expandible
════════════════════════════════════════════ */
function ProyectoCard({ proyecto, onEditar, onChecklist, onArchivar }) {
  const [open, setOpen] = useState(false);
  const meta = statusMeta(proyecto);
  const days = proyecto.fecha_entrega_plan ? dueDays(proyecto.fecha_entrega_plan) : null;
  const pct = proyecto.checklist_total > 0 ? Math.round(proyecto.checklist_completados / proyecto.checklist_total * 100) : null;

  return (
    <div style={{ background: COLORS.bgCard, border: `1.5px solid ${COLORS.border}`, borderLeft: `4px solid ${meta.color}`, borderRadius: 12, overflow: "hidden" }}>
      <div style={{ display: "grid", gridTemplateColumns: "74px minmax(0,1fr) auto", gap: 12, alignItems: "start", padding: "14px 16px" }}>
        <button onClick={() => setOpen(!open)} style={{ border: "none", background: "transparent", padding: 0, textAlign: "left", cursor: "pointer" }}>
          <div style={{ fontSize: 11, color: COLORS.textFaint, fontWeight: 700, fontFamily: FONT_MONO }}>{proyecto.numero_proyecto || "—"}</div>
        </button>
        <button onClick={() => setOpen(!open)} style={{ border: "none", background: "transparent", padding: 0, textAlign: "left", cursor: "pointer", minWidth: 0 }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <strong style={{ fontSize: 14, color: COLORS.text }}>{proyecto.descripcion || "Sin descripción"}</strong>
              <StatusPill proyecto={proyecto} />
              {proyecto.tipo_obra && <Badge color={COLORS.textMuted} label={proyecto.tipo_obra} />}
            </div>
            <div style={{ fontSize: 12, color: COLORS.textMuted, marginTop: 3 }}>{proyecto.cliente || "Sin cliente"}{proyecto.encargado ? ` · ${proyecto.encargado}` : ""}{proyecto.superficie ? ` · ${proyecto.superficie}m²` : ""}</div>
            {proyecto.proxima_tarea && <div style={{ fontSize: 12, color: FUNC.info, marginTop: 4 }}>→ {proyecto.proxima_tarea}</div>}
          </div>
        </button>
        <div style={{ display: "flex", alignItems: "flex-end", flexDirection: "column", gap: 5 }}>
          {days !== null && <Badge color={days < 0 ? FUNC.danger : days < 7 ? FUNC.warning : FUNC.success} label={days < 0 ? `${Math.abs(days)}d vencido` : days === 0 ? "Hoy" : `${days}d`} mono />}
          {pct !== null && <span style={{ fontSize: 11, color: pct === 100 ? FUNC.success : COLORS.textMuted }}>✅ {proyecto.checklist_completados}/{proyecto.checklist_total}</span>}
          <button onClick={() => setOpen(!open)} style={{ border: "none", background: "transparent", color: COLORS.textMuted, fontSize: 12, cursor: "pointer" }}>{open ? "▲" : "▼"}</button>
        </div>
      </div>
      {open && (
        <div style={{ padding: "0 16px 14px 102px", borderTop: `1px solid ${COLORS.border}` }}>
          {proyecto.obs && <p style={{ margin: "10px 0 10px", color: COLORS.textSoft, fontSize: 13 }}>{proyecto.obs}</p>}
          {pct !== null && <div style={{ marginTop: 10, marginBottom: 12 }}><ProgressBar valor={pct} max={100} color={FUNC.success} showValue={false} /></div>}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button onClick={() => onEditar(proyecto)} style={shared.btnSm}>✏️ Editar</button>
            <button onClick={() => onChecklist(proyecto)} style={shared.btnSm}>✅ Checklist</button>
            {proyecto.drive_url && <a href={proyecto.drive_url} target="_blank" rel="noreferrer" style={{ ...shared.btnSm, textDecoration: "none", display: "inline-block" }}>📂 Drive</a>}
            {!isDelivered(proyecto) && <button onClick={() => onArchivar(proyecto, "entregar")} style={shared.btnSm}>Marcar entregado</button>}
            {isDelivered(proyecto) && !isArchived(proyecto) && <button onClick={() => onArchivar(proyecto, "archivar")} style={shared.btnSm}>📦 Archivar</button>}
          </div>
        </div>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════
   ESTADO DROPDOWN — selector de pestaña tipo menú
════════════════════════════════════════════ */
function EstadoDropdown({ tab, setTab }) {
  const [open, setOpen] = useState(false);
  const current = TABS.find(t => t.id === tab) || TABS[0];
  return (
    <div style={{ position: "relative" }}>
      <button onClick={() => setOpen(v => !v)} style={{ ...shared.btnSm, display: "flex", alignItems: "center", gap: 10, minWidth: 176, justifyContent: "space-between" }}>
        <span>{current.label}</span>
        <span style={{ fontSize: 10, color: COLORS.textFaint }}>▼</span>
      </button>
      {open && (
        <div style={{ position: "absolute", left: 0, top: "100%", marginTop: 6, width: 210, background: COLORS.bgCard, border: `1.5px solid ${COLORS.border}`, borderRadius: 10, boxShadow: "0 12px 28px rgba(0,0,0,.14)", zIndex: 30, padding: 6 }}>
          <div style={{ padding: "7px 10px 6px", fontSize: 10, color: COLORS.textMuted, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5 }}>Estado</div>
          {TABS.map(t => (
            <button key={t.id} onClick={() => { setTab(t.id); setOpen(false); }} style={{ width: "100%", textAlign: "left", padding: "8px 10px", background: tab === t.id ? COLORS.bgSoft : "transparent", border: "none", color: COLORS.text, borderRadius: 6, cursor: "pointer", fontSize: 13, fontWeight: tab === t.id ? 700 : 500 }}>
              {t.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════
   ENTREGAS — timeline (esta semana / próxima / por mes)
════════════════════════════════════════════ */
function EntregasTimeline({ proyectos }) {
  const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
  const en14 = new Date(hoy); en14.setDate(hoy.getDate() + 14);

  const ordenados = [...proyectos].filter(p => p.fecha_entrega_plan).sort((a, b) => new Date(`${a.fecha_entrega_plan}T12:00`) - new Date(`${b.fecha_entrega_plan}T12:00`));
  const semanaActual = ordenados.filter(p => { const d = new Date(`${p.fecha_entrega_plan}T12:00`); return d >= hoy && d < new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() + 7); });
  const semanaProxima = ordenados.filter(p => { const d = new Date(`${p.fecha_entrega_plan}T12:00`); return d >= new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() + 7) && d <= en14; });

  const porMes = {};
  ordenados.forEach(p => { const d = new Date(`${p.fecha_entrega_plan}T12:00`); const key = d.toLocaleDateString("es-AR", { month: "long", year: "numeric" }); porMes[key] = [...(porMes[key] || []), p]; });

  if (!ordenados.length) return null;

  return (
    <section style={{ marginBottom: 18 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <h2 style={{ fontSize: 16, margin: 0, fontWeight: 800, color: COLORS.text }}>📅 Próximas entregas</h2>
        <span style={{ fontSize: 12, color: COLORS.textMuted }}>{ordenados.length} proyectos con fecha</span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(250px,1fr))", gap: 10, marginBottom: 12 }}>
        <EntregaBucket title="Esta semana" items={semanaActual} />
        <EntregaBucket title="Próxima semana" items={semanaProxima} />
      </div>
      <div style={shared.card}>
        <div style={{ fontSize: 12, color: COLORS.textMuted, fontWeight: 700, marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>Por mes</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(210px,1fr))", gap: 10 }}>
          {Object.entries(porMes).slice(0, 6).map(([mes, items]) => (
            <div key={mes} style={{ border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: 10 }}>
              <strong style={{ display: "block", textTransform: "capitalize", fontSize: 13, marginBottom: 6, color: COLORS.text }}>{mes}</strong>
              {items.slice(0, 4).map(p => <EntregaMini key={p.id} proyecto={p} />)}
              {items.length > 4 && <div style={{ fontSize: 12, color: COLORS.textFaint, marginTop: 5 }}>+{items.length - 4} más</div>}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function EntregaBucket({ title, items }) {
  return (
    <div style={{ ...shared.card, minHeight: 128 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <strong style={{ fontSize: 13, color: COLORS.text }}>{title}</strong>
        <span style={{ fontSize: 11, color: COLORS.textMuted, background: COLORS.bgSoft, borderRadius: 999, padding: "2px 8px", fontFamily: FONT_MONO }}>{items.length}</span>
      </div>
      {items.length ? items.map(p => <EntregaMini key={p.id} proyecto={p} />) : <div style={{ color: COLORS.textFaint, fontSize: 13, paddingTop: 20, textAlign: "center" }}>Sin entregas</div>}
    </div>
  );
}

function EntregaMini({ proyecto }) {
  const d = new Date(`${proyecto.fecha_entrega_plan}T12:00`);
  const days = dueDays(proyecto.fecha_entrega_plan);
  const color = days < 0 ? FUNC.danger : days < 7 ? FUNC.warning : FUNC.success;
  return (
    <div style={{ display: "grid", gridTemplateColumns: "38px 1fr", gap: 8, alignItems: "center", padding: "7px 0", borderTop: `1px solid ${COLORS.border}` }}>
      <div style={{ textAlign: "center", borderRadius: 8, background: color + "1a", color, padding: "4px 0", fontWeight: 800, fontSize: 13, fontFamily: FONT_MONO }}>{d.getDate()}</div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: COLORS.text }}>{proyecto.descripcion}</div>
        <div style={{ fontSize: 11, color: COLORS.textMuted }}>{proyecto.cliente || "Sin cliente"} · {days < 0 ? `${Math.abs(days)}d vencido` : days === 0 ? "Hoy" : `${days}d`}</div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════
   CRONOGRAMA MENSUAL — 6 meses adelante
════════════════════════════════════════════ */
function CronogramaMensual({ proyectos }) {
  const hoy = new Date();
  const meses = Array.from({ length: 6 }, (_, i) => { const d = new Date(hoy.getFullYear(), hoy.getMonth() + i, 1); return { year: d.getFullYear(), month: d.getMonth(), label: d.toLocaleDateString("es-AR", { month: "long", year: "numeric" }) }; });
  const porMes = {};
  proyectos.forEach(p => { if (!p.fecha_entrega_plan) return; const d = new Date(`${p.fecha_entrega_plan}T12:00`); const key = `${d.getFullYear()}-${d.getMonth()}`; porMes[key] = [...(porMes[key] || []), p]; });
  if (!meses.some(m => porMes[`${m.year}-${m.month}`]?.length)) return null;

  return (
    <section style={{ marginTop: 28 }}>
      <h2 style={{ fontSize: 16, margin: "0 0 12px", fontWeight: 800, color: COLORS.text }}>🗓️ Cronograma</h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(240px,1fr))", gap: 12 }}>
        {meses.map(m => {
          const key = `${m.year}-${m.month}`;
          const items = porMes[key] || [];
          if (!items.length) return null;
          return (
            <div key={key} style={shared.card}>
              <div style={{ fontSize: 13, fontWeight: 700, textTransform: "capitalize", marginBottom: 8, color: COLORS.text }}>{m.label}</div>
              {items.map(p => (
                <div key={p.id} style={{ display: "grid", gridTemplateColumns: "32px 1fr", gap: 8, padding: "7px 0", borderTop: `1px solid ${COLORS.border}` }}>
                  <strong style={{ color: statusMeta(p).color, fontFamily: FONT_MONO }}>{new Date(`${p.fecha_entrega_plan}T12:00`).getDate()}</strong>
                  <span style={{ fontSize: 12, color: COLORS.textSoft }}>{p.descripcion}</span>
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </section>
  );
}

/* ════════════════════════════════════════════
   PRINCIPAL
════════════════════════════════════════════ */
export default function Proyectos({ deepLinkId }) {
  const [proyectos, setProyectos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [panelChecklist, setPanelChecklist] = useState(null);
  const [tab, setTab] = useState("activos");
  const [busqueda, setBusqueda] = useState("");
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");

  useEffect(() => { cargar(); }, []);

  // Deep link: abrir un proyecto específico al llegar desde el buscador global
  useEffect(() => {
    if (deepLinkId && proyectos.length > 0) {
      const p = proyectos.find(pr => pr.id === deepLinkId);
      if (p) setModal(p);
    }
  }, [deepLinkId, proyectos]);

  async function cargar() {
    setLoading(true); setError("");
    try {
      let rows;
      try { rows = await api("/vista_proyectos?order=numero_proyecto.desc.nullslast"); }
      catch (_) { rows = await api("/proyectos?order=numero_proyecto.desc.nullslast"); }
      setProyectos(Array.isArray(rows) ? rows : []);
    } catch (e) { setError(e.message); setProyectos([]); }
    setLoading(false);
  }

  async function archivar(p, accion = "entregar") {
    const esArchivo = accion === "archivar";
    if (!confirm(`¿${esArchivo ? "Archivar" : "Marcar como entregado"} "${p.descripcion}"?`)) return;
    setError("");
    try {
      await api(`/proyectos?id=eq.${p.id}`, { method: "PATCH", body: JSON.stringify(esArchivo ? { archivado: true } : { estado: "entregado", archivado: false, entregado: true }) });
      setMsg(esArchivo ? "✓ Proyecto archivado" : "✓ Proyecto marcado como entregado");
      setTimeout(() => setMsg(""), 2200);
      await cargar();
      setTab(esArchivo ? "archivados" : "entregados");
    } catch (e) { setError(e.message); }
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
    <div style={{ ...shared.page, maxWidth: 1180 }}>
      <SectionHeader icon="📋" title="Proyectos" subtitle="Operación, entregas y seguimiento técnico." action={{ label: "+ Nuevo proyecto", onClick: () => setModal("nuevo") }} />

      {msg && <Toast texto={msg} />}
      <ErrorBanner message={error} />

      <KpiGrid columns={6} items={[
        { label: "En curso",    value: activos.length,           color: COLORS.accent },
        { label: "Activos",     value: activosOperacion.length,  color: FUNC.success },
        { label: "Revisión",    value: revision.length,          color: FUNC.info },
        { label: "Entregados",  value: entregados.length,        color: COLORS.textMuted },
        { label: "Archivados",  value: archivados.length,        color: COLORS.textFaint },
        { label: "Vencidos",    value: vencidos.length,          color: vencidos.length ? FUNC.danger : COLORS.textMuted },
      ]} />

      <EntregasTimeline proyectos={activos.filter(p => p.fecha_entrega_plan)} />

      <div style={{ ...shared.card, marginBottom: 14 }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", justifyContent: "space-between" }}>
          <EstadoDropdown tab={tab} setTab={setTab} />
          <input value={busqueda} onChange={e => setBusqueda(e.target.value)} placeholder="🔍 Buscar proyecto, cliente, encargado…" style={{ ...shared.inp, maxWidth: 340 }} />
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", margin: "12px 0", color: COLORS.textMuted, fontSize: 13 }}>
        <span>{loading ? "Cargando…" : `${visibles.length} resultado${visibles.length === 1 ? "" : "s"}`}</span>
        {tab === "entregados" && <strong style={{ color: COLORS.text, fontWeight: 600, fontSize: 12 }}>Los entregados están acá. Si ya no los necesitás, abrilos y usá Archivar.</strong>}
        {tab === "archivados" && <strong style={{ color: COLORS.text, fontWeight: 600, fontSize: 12 }}>Archivo histórico.</strong>}
      </div>

      {loading ? <p style={{ color: COLORS.textFaint }}>Cargando proyectos…</p> : (
        <div style={{ display: "grid", gap: 8 }}>
          {visibles.map(p => <ProyectoCard key={p.id} proyecto={p} onEditar={setModal} onChecklist={setPanelChecklist} onArchivar={archivar} />)}
          {!visibles.length && <EmptyState message="No hay proyectos en esta vista." />}
        </div>
      )}

      <CronogramaMensual proyectos={activos.filter(p => p.fecha_entrega_plan)} />

      {modal && <ModalProyecto proyecto={modal === "nuevo" ? null : modal} onClose={() => setModal(null)} onGuardar={async () => { setModal(null); setMsg("✓ Proyecto guardado"); setTimeout(() => setMsg(""), 2200); await cargar(); }} />}
      {panelChecklist && <PanelChecklist proyectoId={panelChecklist.id} onClose={() => { setPanelChecklist(null); cargar(); }} />}
    </div>
  );
}
