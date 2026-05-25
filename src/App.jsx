import React from "react";
import { useState, useEffect, useCallback } from "react";

const SUPA_URL = "https://imkmosifqxzbtqgzssst.supabase.co/rest/v1";
const SUPA_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlta21vc2lmcXh6YnRxZ3pzc3N0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkxODk4NTUsImV4cCI6MjA5NDc2NTg1NX0.5gtCs8Yv3vDSrKxAmXSr3zjWJ5HjimCKejfO-XrHPss";
const HDR = { "apikey": SUPA_KEY, "Authorization": `Bearer ${SUPA_KEY}`, "Content-Type": "application/json", "Prefer": "return=representation" };

const api = {
  get:    ()      => fetch(`${SUPA_URL}/presupuestos?select=*&order=created_at.desc&limit=1000`, { headers: HDR }).then(r => r.json()),
  post:   (d)     => fetch(`${SUPA_URL}/presupuestos`, { method: "POST",  headers: HDR, body: JSON.stringify(d) }).then(r => r.json()),
  patch:  (id, d) => fetch(`${SUPA_URL}/presupuestos?id=eq.${id}`, { method: "PATCH", headers: HDR, body: JSON.stringify(d) }).then(r => r.json()),
  delete: (id)    => fetch(`${SUPA_URL}/presupuestos?id=eq.${id}`, { method: "DELETE", headers: HDR }),
};

const toDb = p => ({
  cliente: p.cliente, tipo: p.tipo, descripcion: p.descripcion,
  superficie: p.superficie || null, monto: p.monto || null, moneda: p.moneda,
  estado: p.estado, fecha_emision: p.fechaEmision || null,
  fecha_vencimiento: p.fechaVencimiento || null,
  calculista: p.calculista, probabilidad: p.probabilidad, obs: p.obs,
});

const fromDb = r => ({
  id: r.id, codigo: r.codigo, cliente: r.cliente, tipo: r.tipo,
  descripcion: r.descripcion, superficie: r.superficie, monto: r.monto,
  moneda: r.moneda || "ARS", estado: r.estado || "borrador",
  fechaEmision: r.fecha_emision, fechaVencimiento: r.fecha_vencimiento,
  calculista: r.calculista, probabilidad: r.probabilidad ?? 50, obs: r.obs,
});

const ESTADOS = [
  { id: "borrador",    label: "Borrador",       color: "#5F5E5A", bg: "#F1EFE8" },
  { id: "enviado",     label: "Enviado",         color: "#185FA5", bg: "#E6F1FB" },
  { id: "negociacion", label: "En negociación",  color: "#854F0B", bg: "#FAEEDA" },
  { id: "aprobado",    label: "Aprobado",        color: "#3B6D11", bg: "#EAF3DE" },
  { id: "rechazado",   label: "Rechazado",       color: "#A32D2D", bg: "#FCEBEB" },
  { id: "vencido",     label: "Vencido",         color: "#993C1D", bg: "#FAECE7" },
];

const TIPOS = ["Vivienda unifamiliar","Edificio residencial","Local comercial","Industrial","Relevamiento","Ampliación","Otro"];

const s = {
  sans: { fontFamily: "system-ui, -apple-system, sans-serif" },
  card: { background: "#fff", border: "1px solid #e5e5e5", borderRadius: 10, padding: "12px 16px" },
  btn: { padding: "6px 16px", fontSize: 13, fontWeight: 500, borderRadius: 8, cursor: "pointer", border: "none" },
  input: { width: "100%", fontSize: 13, padding: "6px 10px", border: "1px solid #e5e5e5", borderRadius: 8, boxSizing: "border-box", background: "#fff" },
  label: { display: "block", fontSize: 12, fontWeight: 500, color: "#666", marginBottom: 5 },
};

function Badge({ estado }) {
  const e = ESTADOS.find(x => x.id === estado) || ESTADOS[0];
  return <span style={{ background: e.bg, color: e.color, fontSize: 11, fontWeight: 500, padding: "2px 10px", borderRadius: 99 }}>{e.label}</span>;
}

function fmt(v, m) {
  if (!v && v !== 0) return "—";
  return (m === "USD" ? "USD " : "$ ") + Number(v).toLocaleString("es-AR");
}

const emptyForm = () => ({
  cliente: "", tipo: TIPOS[0], descripcion: "", superficie: "", monto: "",
  moneda: "ARS", estado: "borrador", fechaEmision: new Date().toISOString().slice(0, 10),
  fechaVencimiento: "", calculista: "", probabilidad: 50, obs: "",
});

export default function App() {
  const [items, setItems]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);
  const [saving, setSaving]     = useState(false);
  const [vista, setVista]       = useState("lista");
  const [editando, setEditando] = useState(null);
  const [filtro, setFiltro]     = useState("todos");
  const [busq, setBusq]         = useState("");

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const data = await api.get();
      if (data?.message) throw new Error(data.message);
      setItems((data || []).map(fromDb));
    } catch (e) { setError(e.message); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const saveForm = async (f) => {
    setSaving(true);
    try {
      if (f.id) {
        const res = await api.patch(f.id, toDb(f));
        const upd = Array.isArray(res) ? res[0] : res;
        setItems(prev => prev.map(x => x.id === f.id ? fromDb(upd) : x));
      } else {
        const res = await api.post(toDb(f));
        const created = Array.isArray(res) ? res[0] : res;
        setItems(prev => [fromDb(created), ...prev]);
      }
      setVista("lista"); setEditando(null);
    } catch (e) { alert("Error al guardar: " + e.message); }
    setSaving(false);
  };

  const cambiarEstado = async (id, estado) => {
    setItems(prev => prev.map(x => x.id === id ? { ...x, estado } : x));
    try { await api.patch(id, { estado }); } catch (_) { load(); }
  };

  const eliminar = async (id) => {
    if (!confirm("¿Eliminar este presupuesto?")) return;
    setItems(prev => prev.filter(x => x.id !== id));
    try { await api.delete(id); } catch (_) { load(); }
  };

  const filtrados = items.filter(p => {
    const okE = filtro === "todos" || p.estado === filtro;
    const q = busq.toLowerCase();
    const okB = !q || [p.cliente, p.codigo, p.descripcion].some(v => v?.toLowerCase().includes(q));
    return okE && okB;
  });

  const kpis = {
    total: items.length,
    aprobados: items.filter(x => x.estado === "aprobado").length,
    enCurso: items.filter(x => ["enviado", "negociacion"].includes(x.estado)).length,
    monto: items.filter(x => x.estado === "aprobado" && x.moneda === "ARS").reduce((s, x) => s + (Number(x.monto) || 0), 0),
  };

  if (vista === "form") return (
    <FormView
      inicial={editando || emptyForm()}
      onSave={saveForm}
      onCancel={() => { setVista("lista"); setEditando(null); }}
      saving={saving}
    />
  );

  return (
    <div style={{ ...s.sans, padding: "20px", maxWidth: 1100, margin: "0 auto" }}>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20, flexWrap: "wrap", gap: 10 }}>
        <div>
          <p style={{ margin: 0, fontSize: 12, color: "#999", fontWeight: 500 }}>NPL · APP 06</p>
          <h1 style={{ margin: "2px 0 0", fontSize: 22, fontWeight: 600, color: "#111" }}>Seguimiento de presupuestos</h1>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button onClick={load} style={{ ...s.btn, background: "#f5f5f5", color: "#555", border: "1px solid #e5e5e5" }}>↻</button>
          <div style={{ display: "flex", border: "1px solid #e5e5e5", borderRadius: 8, overflow: "hidden" }}>
            {["lista", "kanban"].map(v => (
              <button key={v} onClick={() => setVista(v)} style={{ padding: "6px 14px", fontSize: 12, fontWeight: 500, background: vista === v ? "#f0f0f0" : "#fff", border: "none", cursor: "pointer", color: vista === v ? "#111" : "#888" }}>
                {v === "lista" ? "Lista" : "Kanban"}
              </button>
            ))}
          </div>
          <button onClick={() => { setEditando(null); setVista("form"); }} style={{ ...s.btn, background: "#111", color: "#fff" }}>
            + Nuevo
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(130px,1fr))", gap: 10, marginBottom: 20 }}>
        {[
          ["Total", kpis.total],
          ["Aprobados", kpis.aprobados],
          ["En curso", kpis.enCurso],
          ["Facturado ARS", kpis.monto > 0 ? "$ " + kpis.monto.toLocaleString("es-AR") : "—"],
        ].map(([l, v]) => (
          <div key={l} style={{ background: "#f9f9f9", borderRadius: 8, padding: "10px 14px", border: "1px solid #eee" }}>
            <p style={{ margin: 0, fontSize: 12, color: "#888" }}>{l}</p>
            <p style={{ margin: "4px 0 0", fontSize: 20, fontWeight: 600, color: "#111" }}>{loading ? "..." : v}</p>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        <input
          placeholder="Buscar cliente, código, descripción..."
          value={busq} onChange={e => setBusq(e.target.value)}
          style={{ ...s.input, flex: 1, minWidth: 200 }}
        />
        <select value={filtro} onChange={e => setFiltro(e.target.value)} style={{ ...s.input, width: "auto" }}>
          <option value="todos">Todos los estados</option>
          {ESTADOS.map(e => <option key={e.id} value={e.id}>{e.label}</option>)}
        </select>
      </div>

      {/* Estado */}
      {loading && <p style={{ textAlign: "center", padding: 40, color: "#999" }}>Cargando datos...</p>}
      {error && (
        <div style={{ textAlign: "center", padding: 40 }}>
          <p style={{ color: "#c00", marginBottom: 12 }}>Error: {error}</p>
          <button onClick={load} style={{ ...s.btn, background: "#f5f5f5", border: "1px solid #ddd", color: "#333" }}>Reintentar</button>
        </div>
      )}

      {!loading && !error && vista === "lista" && (
        <Lista items={filtrados} onEdit={p => { setEditando(p); setVista("form"); }} onDelete={eliminar} onEstado={cambiarEstado} />
      )}
      {!loading && !error && vista === "kanban" && (
        <Kanban items={filtrados} onEdit={p => { setEditando(p); setVista("form"); }} onEstado={cambiarEstado} />
      )}
      {!loading && !error && filtrados.length === 0 && (
        <p style={{ textAlign: "center", padding: 40, color: "#999" }}>
          {items.length === 0 ? 'No hay presupuestos. Hacé clic en "+ Nuevo" para crear el primero.' : "No hay resultados para ese filtro."}
        </p>
      )}
    </div>
  );
}

function Lista({ items, onEdit, onDelete, onEstado }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {items.map(p => (
        <div key={p.id} style={{ ...s.card }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap", alignItems: "flex-start" }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 4 }}>
                <span style={{ fontSize: 12, fontWeight: 500, color: "#999" }}>{p.codigo || "—"}</span>
                <Badge estado={p.estado} />
                <span style={{ fontSize: 12, color: "#aaa" }}>{p.tipo}</span>
              </div>
              <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: "#111" }}>{p.cliente || "Sin cliente"}</p>
              {p.descripcion && <p style={{ margin: "2px 0 0", fontSize: 12, color: "#666", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.descripcion}</p>}
            </div>
            <div style={{ textAlign: "right", flexShrink: 0 }}>
              <p style={{ margin: 0, fontSize: 15, fontWeight: 600, color: "#111" }}>{fmt(p.monto, p.moneda)}</p>
              {p.superficie && <p style={{ margin: "2px 0 0", fontSize: 12, color: "#aaa" }}>{p.superficie} m²</p>}
            </div>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 10, flexWrap: "wrap", gap: 8 }}>
            <div style={{ display: "flex", gap: 10, fontSize: 11, color: "#aaa", flexWrap: "wrap" }}>
              {p.calculista && <span>👤 {p.calculista}</span>}
              {p.fechaEmision && <span>📅 {p.fechaEmision}</span>}
              {p.probabilidad > 0 && <span>🎯 {p.probabilidad}%</span>}
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <select value={p.estado} onChange={e => onEstado(p.id, e.target.value)}
                style={{ fontSize: 11, padding: "3px 6px", border: "1px solid #e5e5e5", borderRadius: 6, background: "#f9f9f9", cursor: "pointer" }}>
                {ESTADOS.map(e => <option key={e.id} value={e.id}>{e.label}</option>)}
              </select>
              <button onClick={() => onEdit(p)} style={{ fontSize: 11, padding: "3px 10px", border: "1px solid #e5e5e5", borderRadius: 6, background: "#fff", cursor: "pointer" }}>Editar</button>
              <button onClick={() => onDelete(p.id)} style={{ fontSize: 11, padding: "3px 10px", border: "1px solid #e5e5e5", borderRadius: 6, background: "#fff", color: "#c00", cursor: "pointer" }}>✕</button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function Kanban({ items, onEdit, onEstado }) {
  const cols = ESTADOS.filter(e => e.id !== "vencido");
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 10, alignItems: "start" }}>
      {cols.map(col => {
        const cards = items.filter(p => p.estado === col.id);
        return (
          <div key={col.id} style={{ background: "#f9f9f9", borderRadius: 10, padding: 10, border: "1px solid #eee" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: col.color }}>{col.label}</span>
              <span style={{ fontSize: 11, background: col.bg, color: col.color, borderRadius: 99, padding: "1px 7px" }}>{cards.length}</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {cards.map(p => (
                <div key={p.id} onClick={() => onEdit(p)} style={{ ...s.card, cursor: "pointer" }}>
                  <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: "#111", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.cliente || "Sin cliente"}</p>
                  <p style={{ margin: "2px 0 0", fontSize: 11, color: "#aaa" }}>{p.codigo}</p>
                  <p style={{ margin: "4px 0 0", fontSize: 12, fontWeight: 600, color: "#111" }}>{fmt(p.monto, p.moneda)}</p>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function FormView({ inicial, onSave, onCancel, saving }) {
  const [f, setF] = useState({ ...inicial });
  const set = (k, v) => setF(p => ({ ...p, [k]: v }));

  return (
    <div style={{ ...s.sans, padding: "20px", maxWidth: 800, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
        <button onClick={onCancel} style={{ fontSize: 13, color: "#666", background: "none", border: "none", cursor: "pointer", padding: 0 }}>← Volver</button>
        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: "#111" }}>
          {f.id ? `Editar ${f.codigo || "presupuesto"}` : "Nuevo presupuesto"}
        </h2>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 16 }}>
        <F label="Cliente / empresa *"><input style={s.input} value={f.cliente} onChange={e => set("cliente", e.target.value)} placeholder="Nombre del cliente" /></F>
        <F label="Tipo de proyecto"><select style={s.input} value={f.tipo} onChange={e => set("tipo", e.target.value)}>{TIPOS.map(t => <option key={t}>{t}</option>)}</select></F>
        <F label="Descripción"><input style={s.input} value={f.descripcion} onChange={e => set("descripcion", e.target.value)} placeholder="Descripción breve" /></F>
        <F label="Superficie (m²)"><input style={s.input} type="number" value={f.superficie} onChange={e => set("superficie", e.target.value)} placeholder="ej: 120" /></F>
        <F label="Monto">
          <div style={{ display: "flex", gap: 6 }}>
            <select style={{ ...s.input, width: 80 }} value={f.moneda} onChange={e => set("moneda", e.target.value)}>
              <option>ARS</option><option>USD</option>
            </select>
            <input style={{ ...s.input, flex: 1 }} type="number" value={f.monto} onChange={e => set("monto", e.target.value)} placeholder="0" />
          </div>
        </F>
        <F label="Estado"><select style={s.input} value={f.estado} onChange={e => set("estado", e.target.value)}>{ESTADOS.map(e => <option key={e.id} value={e.id}>{e.label}</option>)}</select></F>
        <F label="Calculista asignado"><input style={s.input} value={f.calculista} onChange={e => set("calculista", e.target.value)} placeholder="Nombre del calculista" /></F>
        <F label={`Probabilidad de cierre: ${f.probabilidad}%`}><input type="range" min={0} max={100} step={5} value={f.probabilidad} onChange={e => set("probabilidad", Number(e.target.value))} style={{ width: "100%" }} /></F>
        <F label="Fecha de emisión"><input style={s.input} type="date" value={f.fechaEmision} onChange={e => set("fechaEmision", e.target.value)} /></F>
        <F label="Fecha de vencimiento"><input style={s.input} type="date" value={f.fechaVencimiento} onChange={e => set("fechaVencimiento", e.target.value)} /></F>
      </div>

      <div style={{ marginTop: 16 }}>
        <F label="Observaciones">
          <textarea style={{ ...s.input, resize: "vertical" }} value={f.obs} onChange={e => set("obs", e.target.value)} rows={3} placeholder="Notas internas..." />
        </F>
      </div>

      <div style={{ display: "flex", gap: 8, marginTop: 24 }}>
        <button onClick={() => { if (!f.cliente?.trim()) return alert("El cliente es obligatorio"); onSave(f); }} disabled={saving}
          style={{ ...s.btn, background: "#111", color: "#fff", opacity: saving ? 0.6 : 1 }}>
          {saving ? "Guardando..." : "Guardar presupuesto"}
        </button>
        <button onClick={onCancel} style={{ ...s.btn, background: "#f5f5f5", color: "#555", border: "1px solid #e5e5e5" }}>Cancelar</button>
      </div>
    </div>
  );
}

function F({ label, children }) {
  return (
    <div>
      <label style={s.label}>{label}</label>
      {children}
    </div>
  );
}
