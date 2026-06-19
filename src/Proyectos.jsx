import React from "react";
import { useState, useEffect, useCallback } from "react";
import { supabase } from "./supabase.js";

const ESTADOS = [
  { id: "activo",    label: "Activo",    color: "#e8f5e9", text: "#2e7d32" },
  { id: "entregado", label: "Entregado", color: "#e3f2fd", text: "#1565c0" },
  { id: "revision",  label: "Revision",  color: "#fff8e1", text: "#f57f17" },
];
const ENCARGADOS_FIJOS = ["LUCAS", "JOACO", "NPL", "LUCAS/JOACO", "EDU Y LUCAS", "EDY Y LUCAS", "CAMI"];
const CATEGORIAS = ["proyecto", "obra", "revision"];
const CHECKS = [
  { key: "anticipo",          label: "Anticipo",    abbr: "A" },
  { key: "check_diagnostico", label: "Diagnostico", abbr: "D" },
  { key: "proyecto_ok",       label: "Proyecto",    abbr: "P" },
  { key: "entregado",         label: "Entregado",   abbr: "E" },
  { key: "cobrado",           label: "Cobrado",     abbr: "C" },
];

const api = {
  async list() {
    const { data, error } = await supabase
      .from("proyectos")
      .select("*")
      .order("numero_proyecto", { ascending: true, nullsFirst: false });
    if (error) throw error;
    return data;
  },
  async insert(p) {
    const { data, error } = await supabase.from("proyectos").insert([p]).select().single();
    if (error) throw error;
    return data;
  },
  async update(id, p) {
    const { data, error } = await supabase.from("proyectos").update(p).eq("id", id).select().single();
    if (error) throw error;
    return data;
  },
  async remove(id) {
    const { error } = await supabase.from("proyectos").delete().eq("id", id);
    if (error) throw error;
  },
};

const s = {
  sans:  { fontFamily: "system-ui, -apple-system, sans-serif" },
  btn:   { border: "none", borderRadius: 8, padding: "8px 14px", fontSize: 13, fontWeight: 500, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6 },
  input: { width: "100%", border: "1px solid #e5e5e5", borderRadius: 8, padding: "8px 12px", fontSize: 14, outline: "none", background: "#fff", boxSizing: "border-box" },
  label: { fontSize: 12, fontWeight: 500, color: "#666", marginBottom: 4, display: "block" },
};

function EstadoBadge({ estado }) {
  const e = ESTADOS.find(x => x.id === estado) || ESTADOS[0];
  return (
    <span style={{ fontSize: 11, fontWeight: 600, background: e.color, color: e.text, borderRadius: 6, padding: "2px 8px" }}>
      {e.label}
    </span>
  );
}

function CheckProgress({ p }) {
  const done = CHECKS.filter(c => p[c.key]).length;
  const pct = Math.round((done / CHECKS.length) * 100);
  return (
    <div style={{ display: "flex", gap: 3, alignItems: "center" }}>
      {CHECKS.map(c => (
        <span
          key={c.key}
          title={c.label}
          style={{ width: 18, height: 18, borderRadius: 4, fontSize: 9, fontWeight: 700, background: p[c.key] ? "#111" : "#efefef", color: p[c.key] ? "#fff" : "#bbb", display: "flex", alignItems: "center", justifyContent: "center" }}
        >
          {c.abbr}
        </span>
      ))}
      <span style={{ fontSize: 11, color: "#aaa", marginLeft: 2 }}>{pct}%</span>
    </div>
  );
}

function ProyectoCard({ p, onEdit, onDelete }) {
  return (
    <div
      onClick={() => onEdit(p)}
      style={{ background: "#fff", border: "1px solid #e8e8e8", borderRadius: 10, padding: "11px 13px", marginBottom: 8, cursor: "pointer" }}
      onMouseEnter={e => e.currentTarget.style.boxShadow = "0 3px 10px rgba(0,0,0,.09)"}
      onMouseLeave={e => e.currentTarget.style.boxShadow = "none"}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 6, marginBottom: 4 }}>
        <div style={{ flex: 1 }}>
          {p.numero_proyecto && (
            <span style={{ fontSize: 11, color: "#bbb", fontWeight: 600 }}>{p.numero_proyecto} - </span>
          )}
          <span style={{ fontSize: 13, fontWeight: 600, color: "#111" }}>{p.descripcion}</span>
        </div>
        <button
          onClick={e => { e.stopPropagation(); onDelete(p.id); }}
          style={{ background: "none", border: "none", cursor: "pointer", color: "#d0d0d0", fontSize: 17, padding: 0 }}
        >x</button>
      </div>
      <p style={{ margin: "0 0 7px", fontSize: 12, color: "#888" }}>{p.cliente || "-"}</p>
      {p.proxima_tarea && (
        <p style={{ margin: "0 0 8px", fontSize: 11, color: "#444", background: "#f7f7f7", borderRadius: 6, padding: "4px 8px", borderLeft: "3px solid #111" }}>
          {p.proxima_tarea}
        </p>
      )}
      <CheckProgress p={p} />
    </div>
  );
}

function Kanban({ items, onEdit, onDelete }) {
  const COLS = [
    { id: "LUCAS",     label: "LUCAS",       bg: "#fafafa", filter: p => p.estado === "activo" && p.encargado === "LUCAS" },
    { id: "JOACO",     label: "JOACO",       bg: "#fafafa", filter: p => p.estado === "activo" && p.encargado === "JOACO" },
    { id: "CAMI",      label: "CAMI",        bg: "#fafafa", filter: p => p.estado === "activo" && p.encargado === "CAMI" },
    { id: "NPL",       label: "NPL / Otros", bg: "#fafafa", filter: p => p.estado === "activo" && !["LUCAS", "JOACO", "CAMI"].includes(p.encargado) },
    { id: "revision",  label: "Revision",    bg: "#fffcf0", filter: p => p.estado === "revision" },
    { id: "entregado", label: "Entregado",   bg: "#f5f9ff", filter: p => p.estado === "entregado" },
  ];
  return (
    <div style={{ display: "flex", gap: 10, overflowX: "auto", paddingBottom: 16, alignItems: "flex-start" }}>
      {COLS.map(col => {
        const colItems = items.filter(col.filter);
        return (
          <div key={col.id} style={{ flex: "0 0 268px", background: col.bg, borderRadius: 12, padding: 12, border: "1px solid #efefef" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: "#333", textTransform: "uppercase" }}>{col.label}</span>
              <span style={{ fontSize: 11, color: "#888", background: "#e8e8e8", borderRadius: 12, padding: "1px 8px" }}>{colItems.length}</span>
            </div>
            {colItems.map(p => (
              <ProyectoCard key={p.id} p={p} onEdit={onEdit} onDelete={onDelete} />
            ))}
            {colItems.length === 0 && (
              <p style={{ fontSize: 12, color: "#ccc", textAlign: "center", padding: "18px 0" }}>Sin proyectos</p>
            )}
          </div>
        );
      })}
    </div>
  );
}

function Lista({ items, onEdit, onDelete }) {
  if (items.length === 0) {
    return <p style={{ textAlign: "center", padding: 40, color: "#999" }}>Sin resultados</p>;
  }
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
      {items.map(p => (
        <div
          key={p.id}
          onClick={() => onEdit(p)}
          style={{ background: "#fff", border: "1px solid #e5e5e5", borderRadius: 10, padding: "10px 16px", cursor: "pointer", display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}
        >
          <span style={{ fontSize: 12, color: "#bbb", fontWeight: 600, minWidth: 44 }}>{p.numero_proyecto || "-"}</span>
          <div style={{ flex: 1, minWidth: 180 }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: "#111" }}>{p.descripcion}</span>
            {p.cliente && <span style={{ fontSize: 12, color: "#888", marginLeft: 8 }}>{p.cliente}</span>}
          </div>
          {p.proxima_tarea && (
            <span style={{ fontSize: 11, color: "#555", background: "#f5f5f5", borderRadius: 6, padding: "3px 8px", maxWidth: 240, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {p.proxima_tarea}
            </span>
          )}
          <span style={{ fontSize: 12, color: "#666", minWidth: 80 }}>{p.encargado || "-"}</span>
          <EstadoBadge estado={p.estado} />
          <CheckProgress p={p} />
          <button
            onClick={e => { e.stopPropagation(); onDelete(p.id); }}
            style={{ background: "none", border: "none", cursor: "pointer", color: "#ccc", fontSize: 16, marginLeft: "auto" }}
          >x</button>
        </div>
      ))}
    </div>
  );
}

const EMPTY = { numero_proyecto: "", descripcion: "", cliente: "", encargado: "NPL", estado: "activo", categoria: "proyecto", anticipo: false, check_diagnostico: false, proyecto_ok: false, entregado: false, cobrado: false, proxima_tarea: "" };

function Form({ item, onSave, onCancel }) {
  const [form, setForm] = useState(item ? { ...item } : { ...EMPTY });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState(null);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const submit = async () => {
    if (!form.descripcion.trim()) { setErr("La descripcion es requerida"); return; }
    setSaving(true); setErr(null);
    try {
      const { id, created_at, ...data } = form;
      if (item && item.id) await api.update(item.id, data);
      else await api.insert(data);
      onSave();
    } catch (e) { setErr(e.message); }
    setSaving(false);
  };
  return (
    <div style={{ ...s.sans, maxWidth: 620, margin: "0 auto", padding: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "#111" }}>
          {item ? "Editar proyecto" : "Nuevo proyecto"}
        </h2>
        <button onClick={onCancel} style={{ ...s.btn, background: "#f5f5f5", color: "#555" }}>Cancelar</button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <div>
          <label style={s.label}>Numero</label>
          <input style={s.input} value={form.numero_proyecto || ""} onChange={e => set("numero_proyecto", e.target.value)} placeholder="ej: 539" />
        </div>
        <div>
          <label style={s.label}>Estado</label>
          <select style={s.input} value={form.estado} onChange={e => set("estado", e.target.value)}>
            {ESTADOS.map(e => (
              <option key={e.id} value={e.id}>{e.label}</option>
            ))}
          </select>
        </div>
        <div style={{ gridColumn: "1 / -1" }}>
          <label style={s.label}>Descripcion *</label>
          <input style={s.input} value={form.descripcion} onChange={e => set("descripcion", e.target.value)} placeholder="Ej: Vivienda Abasto" />
        </div>
        <div>
          <label style={s.label}>Cliente</label>
          <input style={s.input} value={form.cliente || ""} onChange={e => set("cliente", e.target.value)} placeholder="Ej: Arq. Nievas" />
        </div>
        <div>
          <label style={s.label}>Encargado</label>
          <select style={s.input} value={form.encargado || ""} onChange={e => set("encargado", e.target.value)}>
            <option value="">Sin asignar</option>
            {ENCARGADOS_FIJOS.map(e => (
              <option key={e} value={e}>{e}</option>
            ))}
          </select>
        </div>
        <div>
          <label style={s.label}>Categoria</label>
          <select style={s.input} value={form.categoria || "proyecto"} onChange={e => set("categoria", e.target.value)}>
            {CATEGORIAS.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        <div style={{ gridColumn: "1 / -1" }}>
          <label style={s.label}>Proxima tarea</label>
          <input style={s.input} value={form.proxima_tarea || ""} onChange={e => set("proxima_tarea", e.target.value)} placeholder="Ej: Entregar" />
        </div>
      </div>
      <div style={{ marginTop: 16 }}>
        <label style={s.label}>Avance del proyecto</label>
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginTop: 6 }}>
          {CHECKS.map(c => (
            <label key={c.key} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, cursor: "pointer" }}>
              <input type="checkbox" checked={!!form[c.key]} onChange={e => set(c.key, e.target.checked)} style={{ width: 15, height: 15 }} />
              {c.label}
            </label>
          ))}
        </div>
      </div>
      {err && <p style={{ color: "#c00", fontSize: 13, marginTop: 12 }}>{err}</p>}
      <button
        onClick={submit}
        disabled={saving}
        style={{ ...s.btn, background: "#111", color: "#fff", width: "100%", justifyContent: "center", marginTop: 20, padding: "11px", opacity: saving ? .6 : 1 }}
      >
        {saving ? "Guardando..." : "Guardar proyecto"}
      </button>
    </div>
  );
}

export default function Proyectos() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [vista, setVista] = useState("kanban");
  const [editando, setEditando] = useState(null);
  const [busq, setBusq] = useState("");
  const [filtroEst, setFiltroEst] = useState("todos");
  const [filtroEnc, setFiltroEnc] = useState("todos");

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try { setItems(await api.list()); }
    catch (e) { setError(e.message); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const eliminar = async (id) => {
    if (!confirm("Eliminar este proyecto?")) return;
    try { await api.remove(id); setItems(i => i.filter(x => x.id !== id)); }
    catch (e) { alert("Error: " + e.message); }
  };

  const filtrados = items.filter(p => {
    const q = busq.toLowerCase();
    const okB = !q || [p.descripcion, p.cliente, p.numero_proyecto, p.encargado, p.proxima_tarea].some(v => v && v.toLowerCase().includes(q));
    const okE = filtroEst === "todos" || p.estado === filtroEst;
    const okN = filtroEnc === "todos" || p.encargado === filtroEnc;
    return okB && okE && okN;
  });

  const encargadosUnicos = [...new Set(items.map(p => p.encargado).filter(Boolean))].sort();
  const kpis = {
    activos:    items.filter(p => p.estado === "activo").length,
    revision:   items.filter(p => p.estado === "revision").length,
    entregados: items.filter(p => p.estado === "entregado").length,
    sinCobrar:  items.filter(p => p.entregado && !p.cobrado).length,
  };

  if (editando !== null) {
    return (
      <div style={s.sans}>
        <Form
          item={editando || null}
          onSave={() => { setEditando(null); load(); }}
          onCancel={() => setEditando(null)}
        />
      </div>
    );
  }

  return (
    <div style={{ ...s.sans, padding: "16px 20px", maxWidth: 1600, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, flexWrap: "wrap", gap: 10 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: "#111" }}>Proyectos</h1>
          <p style={{ margin: "2px 0 0", fontSize: 13, color: "#888" }}>{items.length} proyectos en total</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <div style={{ display: "flex", background: "#f0f0f0", borderRadius: 8, padding: 2 }}>
            {[["kanban", "Kanban"], ["lista", "Lista"]].map(([v, lbl]) => (
              <button key={v} onClick={() => setVista(v)} style={{ ...s.btn, background: vista === v ? "#fff" : "transparent", color: vista === v ? "#111" : "#888" }}>
                {lbl}
              </button>
            ))}
          </div>
          <button onClick={() => setEditando(false)} style={{ ...s.btn, background: "#111", color: "#fff" }}>+ Nuevo</button>
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(120px,1fr))", gap: 10, marginBottom: 14 }}>
        {[["Activos", kpis.activos, "#fff"], ["Revision", kpis.revision, "#fffcf0"], ["Entregados", kpis.entregados, "#f5f9ff"], ["Sin cobrar", kpis.sinCobrar, "#fff5f5"]].map(([l, v, bg]) => (
          <div key={l} style={{ background: bg, borderRadius: 8, padding: "10px 14px", border: "1px solid #eee" }}>
            <p style={{ margin: 0, fontSize: 12, color: "#888" }}>{l}</p>
            <p style={{ margin: "4px 0 0", fontSize: 22, fontWeight: 700, color: "#111" }}>{loading ? "..." : v}</p>
          </div>
        ))}
      </div>
      <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
        <input
          placeholder="Buscar proyecto, cliente, numero..."
          value={busq}
          onChange={e => setBusq(e.target.value)}
          style={{ ...s.input, flex: 1, minWidth: 200 }}
        />
        <select value={filtroEst} onChange={e => setFiltroEst(e.target.value)} style={{ ...s.input, width: "auto" }}>
          <option value="todos">Todos los estados</option>
          {ESTADOS.map(e => (
            <option key={e.id} value={e.id}>{e.label}</option>
          ))}
        </select>
        <select value={filtroEnc} onChange={e => setFiltroEnc(e.target.value)} style={{ ...s.input, width: "auto" }}>
          <option value="todos">Todos los encargados</option>
          {encargadosUnicos.map(e => (
            <option key={e} value={e}>{e}</option>
          ))}
        </select>
        {(busq || filtroEst !== "todos" || filtroEnc !== "todos") && (
          <button
            onClick={() => { setBusq(""); setFiltroEst("todos"); setFiltroEnc("todos"); }}
            style={{ ...s.btn, background: "#f5f5f5", color: "#888", border: "1px solid #e5e5e5", fontSize: 12 }}
          >
            Limpiar
          </button>
        )}
      </div>
      {loading && <p style={{ textAlign: "center", padding: 40, color: "#999" }}>Cargando proyectos...</p>}
      {error && (
        <div style={{ textAlign: "center", padding: 40 }}>
          <p style={{ color: "#c00", marginBottom: 12 }}>Error: {error}</p>
          <button onClick={load} style={{ ...s.btn, background: "#f5f5f5", border: "1px solid #ddd", color: "#333" }}>Reintentar</button>
        </div>
      )}
      {!loading && !error && vista === "kanban" && (
        <Kanban items={filtrados} onEdit={p => setEditando(p)} onDelete={eliminar} />
      )}
      {!loading && !error && vista === "lista" && (
        <Lista items={filtrados} onEdit={p => setEditando(p)} onDelete={eliminar} />
      )}
    </div>
  );
}
