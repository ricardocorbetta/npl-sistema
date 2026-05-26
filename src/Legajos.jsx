import React, { useState, useEffect, useCallback } from "react";

const SUPA_URL = "https://imkmosifqxzbtqgzssst.supabase.co/rest/v1";
const SUPA_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlta21vc2lmcXh6YnRxZ3pzc3N0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkxODk4NTUsImV4cCI6MjA5NDc2NTg1NX0.5gtCs8Yv3vDSrKxAmXSr3zjWJ5HjimCKejfO-XrHPss";
const HDR = { "apikey": SUPA_KEY, "Authorization": `Bearer ${SUPA_KEY}`, "Content-Type": "application/json", "Prefer": "return=representation" };

const api = {
  getLegajos: () => fetch(`${SUPA_URL}/legajos?select=*&order=created_at.desc&limit=500`, { headers: HDR }).then(r => r.json()),
  postLegajo: (d) => fetch(`${SUPA_URL}/legajos`, { method: "POST", headers: HDR, body: JSON.stringify(d) }).then(r => r.json()),
  patchLegajo: (id, d) => fetch(`${SUPA_URL}/legajos?id=eq.${id}`, { method: "PATCH", headers: HDR, body: JSON.stringify(d) }).then(r => r.json()),
  deleteLegajo: (id) => fetch(`${SUPA_URL}/legajos?id=eq.${id}`, { method: "DELETE", headers: HDR }),
  getEtapas: (lid) => fetch(`${SUPA_URL}/legajo_etapas?legajo_id=eq.${lid}&order=orden.asc`, { headers: HDR }).then(r => r.json()),
  patchEtapa: (id, d) => fetch(`${SUPA_URL}/legajo_etapas?id=eq.${id}`, { method: "PATCH", headers: HDR, body: JSON.stringify(d) }).then(r => r.json()),
};

const ESTADOS_LEGAJO = [
  { id: "activo",     label: "Activo",      color: "#185FA5", bg: "#E6F1FB" },
  { id: "pausado",    label: "Pausado",     color: "#854F0B", bg: "#FAEEDA" },
  { id: "entregado",  label: "Entregado",   color: "#3B6D11", bg: "#EAF3DE" },
  { id: "cancelado",  label: "Cancelado",   color: "#A32D2D", bg: "#FCEBEB" },
];

const ESTADOS_ETAPA = [
  { id: "pendiente",   label: "Pendiente",   color: "#888", bg: "#f5f5f5" },
  { id: "en_proceso",  label: "En proceso",  color: "#185FA5", bg: "#E6F1FB" },
  { id: "revision",    label: "En revisión", color: "#854F0B", bg: "#FAEEDA" },
  { id: "completado",  label: "Completado",  color: "#3B6D11", bg: "#EAF3DE" },
];

const TIPOS = ["Vivienda unifamiliar","Edificio residencial","Local comercial","Industrial","Relevamiento","Ampliación","Otro"];

const s = {
  sans: { fontFamily: "system-ui, -apple-system, sans-serif" },
  card: { background: "#fff", border: "1px solid #e5e5e5", borderRadius: 10, padding: "12px 16px" },
  btn: { padding: "6px 16px", fontSize: 13, fontWeight: 500, borderRadius: 8, cursor: "pointer", border: "none" },
  input: { width: "100%", fontSize: 13, padding: "6px 10px", border: "1px solid #e5e5e5", borderRadius: 8, boxSizing: "border-box", background: "#fff" },
  label: { display: "block", fontSize: 12, fontWeight: 500, color: "#666", marginBottom: 5 },
};

function Badge({ estado, tabla = "legajo" }) {
  const arr = tabla === "legajo" ? ESTADOS_LEGAJO : ESTADOS_ETAPA;
  const e = arr.find(x => x.id === estado) || arr[0];
  return <span style={{ background: e.bg, color: e.color, fontSize: 11, fontWeight: 500, padding: "2px 10px", borderRadius: 99, whiteSpace: "nowrap" }}>{e.label}</span>;
}

function Progreso({ etapas }) {
  if (!etapas?.length) return null;
  const completadas = etapas.filter(e => e.estado === "completado").length;
  const pct = Math.round((completadas / etapas.length) * 100);
  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#888", marginBottom: 4 }}>
        <span>{completadas}/{etapas.length} etapas</span>
        <span>{pct}%</span>
      </div>
      <div style={{ background: "#f0f0f0", borderRadius: 99, height: 6 }}>
        <div style={{ background: pct === 100 ? "#3B6D11" : "#185FA5", width: `${pct}%`, height: 6, borderRadius: 99, transition: "width .3s" }} />
      </div>
    </div>
  );
}

const emptyForm = () => ({
  descripcion: "", tipo: TIPOS[0], superficie: "", calculista: "", drive_url: "", obs: "",
});

export default function Legajos() {
  const [legajos, setLegajos]     = useState([]);
  const [etapasMap, setEtapasMap] = useState({});
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(null);
  const [saving, setSaving]       = useState(false);
  const [vista, setVista]         = useState("lista");
  const [selected, setSelected]   = useState(null);
  const [editando, setEditando]   = useState(null);
  const [busq, setBusq]           = useState("");
  const [filtro, setFiltro]       = useState("todos");

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const data = await api.getLegajos();
      if (data?.message) throw new Error(data.message);
      setLegajos(data || []);
    } catch (e) { setError(e.message); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const loadEtapas = async (lid) => {
    if (etapasMap[lid]) return;
    try {
      const data = await api.getEtapas(lid);
      setEtapasMap(prev => ({ ...prev, [lid]: data || [] }));
    } catch (_) {}
  };

  const abrirDetalle = async (l) => {
    setSelected(l);
    setVista("detalle");
    await loadEtapas(l.id);
  };

  const saveForm = async (f) => {
    setSaving(true);
    try {
      if (f.id) {
        const res = await api.patchLegajo(f.id, {
          descripcion: f.descripcion, tipo: f.tipo,
          superficie: f.superficie || null, calculista: f.calculista,
          drive_url: f.drive_url, obs: f.obs
        });
        const upd = Array.isArray(res) ? res[0] : res;
        setLegajos(prev => prev.map(x => x.id === f.id ? upd : x));
        if (selected?.id === f.id) setSelected(upd);
      } else {
        const res = await api.postLegajo({
          descripcion: f.descripcion, tipo: f.tipo,
          superficie: f.superficie || null, calculista: f.calculista,
          drive_url: f.drive_url, obs: f.obs
        });
        const created = Array.isArray(res) ? res[0] : res;
        setLegajos(prev => [created, ...prev]);
      }
      setVista("lista"); setEditando(null);
    } catch (e) { alert("Error: " + e.message); }
    setSaving(false);
  };

  const actualizarEtapa = async (lid, etapaId, campo, valor) => {
    setEtapasMap(prev => ({
      ...prev,
      [lid]: prev[lid].map(e => e.id === etapaId ? { ...e, [campo]: valor } : e)
    }));
    try { await api.patchEtapa(etapaId, { [campo]: valor }); } catch (_) {}
  };

  const eliminar = async (id) => {
    if (!confirm("¿Eliminar este legajo?")) return;
    setLegajos(prev => prev.filter(x => x.id !== id));
    try { await api.deleteLegajo(id); } catch (_) { load(); }
  };

  const filtrados = legajos.filter(l => {
    const okF = filtro === "todos" || l.estado === filtro;
    const q = busq.toLowerCase();
    const okB = !q || [l.numero, l.descripcion, l.calculista].some(v => v?.toLowerCase().includes(q));
    return okF && okB;
  });

  const kpis = {
    total: legajos.length,
    activos: legajos.filter(x => x.estado === "activo").length,
    entregados: legajos.filter(x => x.estado === "entregado").length,
  };

  if (vista === "form") return (
    <FormView
      inicial={editando || emptyForm()}
      onSave={saveForm}
      onCancel={() => { setVista(selected ? "detalle" : "lista"); setEditando(null); }}
      saving={saving}
    />
  );

  if (vista === "detalle" && selected) return (
    <DetalleView
      legajo={selected}
      etapas={etapasMap[selected.id] || []}
      onBack={() => { setVista("lista"); setSelected(null); }}
      onEdit={() => { setEditando(selected); setVista("form"); }}
      onEtapa={actualizarEtapa}
      onEliminar={() => { eliminar(selected.id); setVista("lista"); setSelected(null); }}
    />
  );

  return (
    <div style={{ ...s.sans, padding: "20px", maxWidth: 1000, margin: "0 auto" }}>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20, flexWrap: "wrap", gap: 10 }}>
        <div>
          <p style={{ margin: 0, fontSize: 12, color: "#999", fontWeight: 500 }}>NPL · Legajos</p>
          <h1 style={{ margin: "2px 0 0", fontSize: 22, fontWeight: 600, color: "#111" }}>Seguimiento de legajos</h1>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={load} style={{ ...s.btn, background: "#f5f5f5", color: "#555", border: "1px solid #e5e5e5" }}>↻</button>
          <button onClick={() => { setEditando(null); setVista("form"); }} style={{ ...s.btn, background: "#111", color: "#fff" }}>+ Nuevo legajo</button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(120px,1fr))", gap: 10, marginBottom: 20 }}>
        {[["Total", kpis.total], ["Activos", kpis.activos], ["Entregados", kpis.entregados]].map(([l, v]) => (
          <div key={l} style={{ background: "#f9f9f9", borderRadius: 8, padding: "10px 14px", border: "1px solid #eee" }}>
            <p style={{ margin: 0, fontSize: 12, color: "#888" }}>{l}</p>
            <p style={{ margin: "4px 0 0", fontSize: 20, fontWeight: 600, color: "#111" }}>{loading ? "..." : v}</p>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        <input placeholder="Buscar legajo, calculista..." value={busq} onChange={e => setBusq(e.target.value)}
          style={{ ...s.input, flex: 1, minWidth: 200 }} />
        <select value={filtro} onChange={e => setFiltro(e.target.value)} style={{ ...s.input, width: "auto" }}>
          <option value="todos">Todos</option>
          {ESTADOS_LEGAJO.map(e => <option key={e.id} value={e.id}>{e.label}</option>)}
        </select>
      </div>

      {loading && <p style={{ textAlign: "center", padding: 40, color: "#999" }}>Cargando...</p>}
      {error && <p style={{ textAlign: "center", padding: 40, color: "#c00" }}>Error: {error}</p>}

      {!loading && !error && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {filtrados.map(l => (
            <div key={l.id} style={{ ...s.card, cursor: "pointer" }} onClick={() => abrirDetalle(l)}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 8 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 4 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: "#111" }}>{l.numero}</span>
                    <Badge estado={l.estado} tabla="legajo" />
                    {l.tipo && <span style={{ fontSize: 12, color: "#aaa" }}>{l.tipo}</span>}
                  </div>
                  <p style={{ margin: 0, fontSize: 14, color: "#333", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{l.descripcion}</p>
                  <div style={{ display: "flex", gap: 10, marginTop: 4, fontSize: 11, color: "#aaa", flexWrap: "wrap" }}>
                    {l.calculista && <span>👤 {l.calculista}</span>}
                    {l.superficie && <span>📐 {l.superficie} m²</span>}
                    {l.drive_url && <span style={{ color: "#185FA5" }}>📁 Drive vinculado</span>}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 6 }} onClick={e => e.stopPropagation()}>
                  <button onClick={() => { setEditando(l); setVista("form"); }}
                    style={{ fontSize: 11, padding: "3px 10px", border: "1px solid #e5e5e5", borderRadius: 6, background: "#fff", cursor: "pointer" }}>Editar</button>
                  <button onClick={() => eliminar(l.id)}
                    style={{ fontSize: 11, padding: "3px 10px", border: "1px solid #e5e5e5", borderRadius: 6, background: "#fff", color: "#c00", cursor: "pointer" }}>✕</button>
                </div>
              </div>
              {etapasMap[l.id] && <Progreso etapas={etapasMap[l.id]} />}
            </div>
          ))}
          {filtrados.length === 0 && (
            <p style={{ textAlign: "center", padding: 40, color: "#999" }}>No hay legajos. Hacé clic en "+ Nuevo legajo" para crear el primero.</p>
          )}
        </div>
      )}
    </div>
  );
}

function DetalleView({ legajo, etapas, onBack, onEdit, onEtapa, onEliminar }) {
  return (
    <div style={{ fontFamily: "system-ui, -apple-system, sans-serif", padding: "20px", maxWidth: 900, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
        <button onClick={onBack} style={{ fontSize: 13, color: "#666", background: "none", border: "none", cursor: "pointer", padding: 0 }}>← Volver</button>
        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: "#111", flex: 1 }}>{legajo.numero}</h2>
        <div style={{ display: "flex", gap: 8 }}>
          {legajo.drive_url && (
            <a href={legajo.drive_url} target="_blank" rel="noopener noreferrer"
              style={{ padding: "6px 16px", fontSize: 13, fontWeight: 500, borderRadius: 8, background: "#E6F1FB", color: "#185FA5", textDecoration: "none" }}>
              📁 Abrir Drive
            </a>
          )}
          <button onClick={onEdit} style={{ padding: "6px 16px", fontSize: 13, fontWeight: 500, borderRadius: 8, background: "#f5f5f5", color: "#555", border: "1px solid #e5e5e5", cursor: "pointer" }}>Editar</button>
        </div>
      </div>

      <div style={{ background: "#fff", border: "1px solid #e5e5e5", borderRadius: 10, padding: "12px 16px", marginBottom: 20 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 12 }}>
          {[
            ["Descripción", legajo.descripcion],
            ["Tipo", legajo.tipo],
            ["Superficie", legajo.superficie ? legajo.superficie + " m²" : "—"],
            ["Calculista", legajo.calculista || "—"],
            ["Estado", <Badge estado={legajo.estado} tabla="legajo" />],
          ].map(([l, v]) => (
            <div key={l}>
              <p style={{ margin: 0, fontSize: 11, color: "#888" }}>{l}</p>
              <p style={{ margin: "2px 0 0", fontSize: 13, fontWeight: 500, color: "#111" }}>{v}</p>
            </div>
          ))}
        </div>
        {legajo.obs && <p style={{ margin: "12px 0 0", fontSize: 12, color: "#666", borderTop: "1px solid #f0f0f0", paddingTop: 10 }}>{legajo.obs}</p>}
        <Progreso etapas={etapas} />
      </div>

      <h3 style={{ margin: "0 0 12px", fontSize: 14, fontWeight: 600, color: "#111" }}>Etapas del proyecto</h3>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {etapas.length === 0 && <p style={{ color: "#999", fontSize: 13 }}>Cargando etapas...</p>}
        {etapas.map((e, i) => (
          <div key={e.id} style={{ background: "#fff", border: "1px solid #e5e5e5", borderRadius: 10, padding: "12px 16px", borderLeft: `3px solid ${ESTADOS_ETAPA.find(x => x.id === e.estado)?.color || "#ddd"}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 8 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 11, fontWeight: 600, color: "#aaa" }}>{i + 1}</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: "#111" }}>{e.nombre}</span>
                  <Badge estado={e.estado} tabla="etapa" />
                </div>
                <div style={{ display: "flex", gap: 12, fontSize: 11, color: "#aaa", flexWrap: "wrap" }}>
                  {e.encargado && <span>👤 {e.encargado}</span>}
                  {e.entregables && <span>📎 {e.entregables}</span>}
                </div>
              </div>
              <select value={e.estado} onChange={ev => onEtapa(legajo.id, e.id, "estado", ev.target.value)}
                style={{ fontSize: 11, padding: "3px 6px", border: "1px solid #e5e5e5", borderRadius: 6, background: "#f9f9f9", cursor: "pointer" }}>
                {ESTADOS_ETAPA.map(x => <option key={x.id} value={x.id}>{x.label}</option>)}
              </select>
            </div>
            <div style={{ marginTop: 8, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              <span style={{ fontSize: 11, color: "#aaa", whiteSpace: "nowrap" }}>Fecha entrega:</span>
              <input type="date" value={e.fecha_entrega || ""} onChange={ev => onEtapa(legajo.id, e.id, "fecha_entrega", ev.target.value)}
                style={{ fontSize: 11, padding: "2px 6px", border: "1px solid #e5e5e5", borderRadius: 6, background: "#fff" }} />
              <input placeholder="Observaciones..." value={e.obs || ""} onChange={ev => onEtapa(legajo.id, e.id, "obs", ev.target.value)}
                style={{ fontSize: 11, padding: "2px 8px", border: "1px solid #e5e5e5", borderRadius: 6, background: "#fff", flex: 1, minWidth: 120 }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function FormView({ inicial, onSave, onCancel, saving }) {
  const [f, setF] = useState({ ...inicial });
  const set = (k, v) => setF(p => ({ ...p, [k]: v }));

  return (
    <div style={{ fontFamily: "system-ui, -apple-system, sans-serif", padding: "20px", maxWidth: 700, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
        <button onClick={onCancel} style={{ fontSize: 13, color: "#666", background: "none", border: "none", cursor: "pointer", padding: 0 }}>← Volver</button>
        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: "#111" }}>
          {f.id ? `Editar ${f.numero}` : "Nuevo legajo"}
        </h2>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 16 }}>
        <FL label="Descripción *"><input style={{ width: "100%", fontSize: 13, padding: "6px 10px", border: "1px solid #e5e5e5", borderRadius: 8, boxSizing: "border-box", background: "#fff" }} value={f.descripcion} onChange={e => set("descripcion", e.target.value)} placeholder="ej: Vivienda 230m² hormigón" /></FL>
        <FL label="Tipo"><select style={{ width: "100%", fontSize: 13, padding: "6px 10px", border: "1px solid #e5e5e5", borderRadius: 8, boxSizing: "border-box", background: "#fff" }} value={f.tipo} onChange={e => set("tipo", e.target.value)}>{TIPOS.map(t => <option key={t}>{t}</option>)}</select></FL>
        <FL label="Superficie (m²)"><input style={{ width: "100%", fontSize: 13, padding: "6px 10px", border: "1px solid #e5e5e5", borderRadius: 8, boxSizing: "border-box", background: "#fff" }} type="number" value={f.superficie} onChange={e => set("superficie", e.target.value)} placeholder="ej: 230" /></FL>
        <FL label="Calculista asignado"><input style={{ width: "100%", fontSize: 13, padding: "6px 10px", border: "1px solid #e5e5e5", borderRadius: 8, boxSizing: "border-box", background: "#fff" }} value={f.calculista} onChange={e => set("calculista", e.target.value)} placeholder="Nombre del calculista" /></FL>
      </div>

      <div style={{ marginTop: 16 }}>
        <FL label="📁 Link carpeta Drive">
          <input style={{ width: "100%", fontSize: 13, padding: "6px 10px", border: "1px solid #e5e5e5", borderRadius: 8, boxSizing: "border-box", background: "#fff" }} value={f.drive_url} onChange={e => set("drive_url", e.target.value)} placeholder="https://drive.google.com/drive/folders/..." />
        </FL>
      </div>

      <div style={{ marginTop: 16 }}>
        <FL label="Observaciones">
          <textarea style={{ width: "100%", fontSize: 13, padding: "6px 10px", border: "1px solid #e5e5e5", borderRadius: 8, boxSizing: "border-box", background: "#fff", resize: "vertical" }} value={f.obs} onChange={e => set("obs", e.target.value)} rows={3} placeholder="Notas internas..." />
        </FL>
      </div>

      <div style={{ display: "flex", gap: 8, marginTop: 24 }}>
        <button onClick={() => { if (!f.descripcion?.trim()) return alert("La descripción es obligatoria"); onSave(f); }} disabled={saving}
          style={{ padding: "6px 16px", fontSize: 13, fontWeight: 500, borderRadius: 8, cursor: saving ? "not-allowed" : "pointer", border: "none", background: "#111", color: "#fff", opacity: saving ? 0.6 : 1 }}>
          {saving ? "Guardando..." : f.id ? "Guardar cambios" : "Crear legajo"}
        </button>
        <button onClick={onCancel} style={{ padding: "6px 16px", fontSize: 13, fontWeight: 500, borderRadius: 8, cursor: "pointer", border: "1px solid #e5e5e5", background: "#f5f5f5", color: "#555" }}>Cancelar</button>
      </div>
    </div>
  );
}

function FL({ label, children }) {
  return (
    <div>
      <label style={{ display: "block", fontSize: 12, fontWeight: 500, color: "#666", marginBottom: 5 }}>{label}</label>
      {children}
    </div>
  );
}
