import React, { useState, useEffect, useCallback } from "react";

const SUPA_URL = "https://imkmosifqxzbtqgzssst.supabase.co/rest/v1";
const SUPA_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlta21vc2lmcXh6YnRxZ3pzc3N0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkxODk4NTUsImV4cCI6MjA5NDc2NTg1NX0.5gtCs8Yv3vDSrKxAmXSr3zjWJ5HjimCKejfO-XrHPss";
const HDR = { "apikey": SUPA_KEY, "Authorization": `Bearer ${SUPA_KEY}`, "Content-Type": "application/json", "Prefer": "return=representation" };

const api = {
  get: () => fetch(`${SUPA_URL}/calculistas?select=*&order=numero.asc.nullslast`, { headers: HDR }).then(r => r.json()),
  post: (d) => fetch(`${SUPA_URL}/calculistas`, { method: "POST", headers: HDR, body: JSON.stringify(d) }).then(r => r.json()),
  patch: (id, d) => fetch(`${SUPA_URL}/calculistas?id=eq.${id}`, { method: "PATCH", headers: HDR, body: JSON.stringify(d) }).then(r => r.json()),
  delete: (id) => fetch(`${SUPA_URL}/calculistas?id=eq.${id}`, { method: "DELETE", headers: HDR }),
};

const ESTADOS = [
  { id: "activo",     label: "Activo",        color: "#3B6D11", bg: "#EAF3DE" },
  { id: "evaluacion", label: "En evaluación", color: "#854F0B", bg: "#FAEEDA" },
  { id: "postulante", label: "Postulante",    color: "#185FA5", bg: "#E6F1FB" },
  { id: "inactivo",   label: "Inactivo",      color: "#888",    bg: "#f5f5f5" },
];

const NIVELES = ["Junior", "Semi-Senior", "Senior"];
const SOFT = ["No lo uso", "Básico", "Intermedio", "Avanzado"];
const DISPONIBILIDAD = ["Menos de 10 hs semanales", "Entre 10 y 20 hs semanales", "Más de 20 hs semanales"];
const EXPERIENCIA = ["No tengo", "Menos de 5 proyectos", "Entre 5 y 20 proyectos", "Más de 20 proyectos"];

const inp = { width: "100%", fontSize: 13, padding: "6px 10px", border: "1px solid #e5e5e5", borderRadius: 8, boxSizing: "border-box", background: "#fff" };

function Badge({ estado }) {
  const e = ESTADOS.find(x => x.id === estado) || ESTADOS[0];
  return <span style={{ background: e.bg, color: e.color, fontSize: 11, fontWeight: 500, padding: "2px 10px", borderRadius: 99 }}>{e.label}</span>;
}

function NivelDot({ nivel }) {
  const colors = { "Junior": "#854F0B", "Semi-Senior": "#185FA5", "Senior": "#3B6D11" };
  return <span style={{ fontSize: 11, fontWeight: 500, color: colors[nivel] || "#888", background: "#f5f5f5", padding: "2px 8px", borderRadius: 99 }}>{nivel}</span>;
}

function SoftBadge({ label, nivel }) {
  const colors = { "No lo uso": "#f0f0f0", "Básico": "#FAEEDA", "Intermedio": "#E6F1FB", "Avanzado": "#EAF3DE" };
  const text = { "No lo uso": "#aaa", "Básico": "#854F0B", "Intermedio": "#185FA5", "Avanzado": "#3B6D11" };
  return (
    <div style={{ textAlign: "center" }}>
      <p style={{ margin: 0, fontSize: 10, color: "#aaa", marginBottom: 3 }}>{label}</p>
      <span style={{ fontSize: 11, fontWeight: 500, background: colors[nivel] || "#f5f5f5", color: text[nivel] || "#888", padding: "2px 8px", borderRadius: 99 }}>{nivel || "—"}</span>
    </div>
  );
}

function Grid({ children }) {
  return <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 14 }}>{children}</div>;
}

function Section({ title, children }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <p style={{ margin: "0 0 12px", fontSize: 13, fontWeight: 600, color: "#111", borderBottom: "1px solid #f0f0f0", paddingBottom: 8 }}>{title}</p>
      {children}
    </div>
  );
}

function F({ label, children }) {
  return (
    <div>
      <label style={{ display: "block", fontSize: 12, fontWeight: 500, color: "#666", marginBottom: 5 }}>{label}</label>
      {children}
    </div>
  );
}

const emptyForm = () => ({
  nombre: "", estudio: "", nivel: "Junior", ciudad: "", estado: "postulante",
  wsp: "", mail: "", ig: "", disponible: true,
  cypecad: "No lo uso", autocad: "No lo uso", sketchup: "No lo uso",
  otros_software: "", experiencia: "No tengo", sistemas: "",
  freelance: false, factura: false, disponibilidad: "", observaciones: "", puntaje: 0,
});

export default function Calculistas() {
  const [items, setItems]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);
  const [saving, setSaving]     = useState(false);
  const [vista, setVista]       = useState("lista");
  const [selected, setSelected] = useState(null);
  const [editando, setEditando] = useState(null);
  const [busq, setBusq]         = useState("");
  const [tab, setTab]           = useState("activos");

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const data = await api.get();
      if (data?.message) throw new Error(data.message);
      setItems(data || []);
    } catch (e) { setError(e.message); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const saveForm = async (f) => {
    setSaving(true);
    try {
      const body = {
        nombre: f.nombre, estudio: f.estudio, nivel: f.nivel, ciudad: f.ciudad,
        estado: f.estado, wsp: f.wsp, mail: f.mail, ig: f.ig, disponible: f.disponible,
        cypecad: f.cypecad, autocad: f.autocad, sketchup: f.sketchup,
        otros_software: f.otros_software, experiencia: f.experiencia, sistemas: f.sistemas,
        freelance: f.freelance, factura: f.factura, disponibilidad: f.disponibilidad,
        observaciones: f.observaciones, puntaje: f.puntaje,
      };
      if (f.id) {
        const res = await api.patch(f.id, body);
        const upd = Array.isArray(res) ? res[0] : res;
        setItems(prev => prev.map(x => x.id === f.id ? upd : x));
        if (selected?.id === f.id) setSelected(upd);
      } else {
        const res = await api.post(body);
        const created = Array.isArray(res) ? res[0] : res;
        setItems(prev => [...prev, created]);
      }
      setVista("lista"); setEditando(null);
    } catch (e) { alert("Error: " + e.message); }
    setSaving(false);
  };

  const eliminar = async (id) => {
    if (!confirm("¿Eliminar este calculista?")) return;
    setItems(prev => prev.filter(x => x.id !== id));
    try { await api.delete(id); } catch (_) { load(); }
  };

  const activos    = items.filter(x => x.estado === "activo");
  const evaluacion = items.filter(x => ["evaluacion", "postulante"].includes(x.estado));
  const inactivos  = items.filter(x => x.estado === "inactivo");
  const tabItems   = tab === "activos" ? activos : tab === "evaluacion" ? evaluacion : inactivos;

  const filtrados = tabItems.filter(c => {
    const q = busq.toLowerCase();
    return !q || [c.nombre, c.estudio, c.ciudad].some(v => v?.toLowerCase().includes(q));
  });

  const kpis = {
    activos: activos.length,
    disponibles: activos.filter(x => x.disponible).length,
    evaluacion: evaluacion.length,
  };

  if (vista === "form") return (
    <FormView
      inicial={editando || emptyForm()}
      onSave={saveForm}
      onCancel={() => { setVista("lista"); setEditando(null); }}
      saving={saving}
    />
  );

  if (vista === "detalle" && selected) return (
    <DetalleView
      c={selected}
      onBack={() => { setVista("lista"); setSelected(null); }}
      onEdit={() => { setEditando(selected); setVista("form"); }}
      onEliminar={() => { eliminar(selected.id); setVista("lista"); setSelected(null); }}
    />
  );

  return (
    <div style={{ fontFamily: "system-ui, -apple-system, sans-serif", padding: "20px", maxWidth: 1000, margin: "0 auto" }}>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20, flexWrap: "wrap", gap: 10 }}>
        <div>
          <p style={{ margin: 0, fontSize: 12, color: "#999", fontWeight: 500 }}>NPL · APP 03</p>
          <h1 style={{ margin: "2px 0 0", fontSize: 22, fontWeight: 600, color: "#111" }}>Calculistas</h1>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={load} style={{ padding: "6px 16px", fontSize: 13, fontWeight: 500, borderRadius: 8, cursor: "pointer", border: "1px solid #e5e5e5", background: "#f5f5f5", color: "#555" }}>↻</button>
          <button onClick={() => { setEditando(null); setVista("form"); }} style={{ padding: "6px 16px", fontSize: 13, fontWeight: 500, borderRadius: 8, cursor: "pointer", border: "none", background: "#111", color: "#fff" }}>+ Nuevo</button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(130px,1fr))", gap: 10, marginBottom: 20 }}>
        {[["Activos", kpis.activos], ["Disponibles", kpis.disponibles], ["En evaluación", kpis.evaluacion]].map(([l, v]) => (
          <div key={l} style={{ background: "#f9f9f9", borderRadius: 8, padding: "10px 14px", border: "1px solid #eee" }}>
            <p style={{ margin: 0, fontSize: 12, color: "#888" }}>{l}</p>
            <p style={{ margin: "4px 0 0", fontSize: 20, fontWeight: 600, color: "#111" }}>{loading ? "..." : v}</p>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", marginBottom: 16, border: "1px solid #e5e5e5", borderRadius: 8, overflow: "hidden", width: "fit-content" }}>
        {[
          { id: "activos",    label: `Equipo activo (${activos.length})` },
          { id: "evaluacion", label: `En evaluación (${evaluacion.length})` },
          { id: "inactivos",  label: `Inactivos (${inactivos.length})` },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{ padding: "6px 16px", fontSize: 12, fontWeight: 500, background: tab === t.id ? "#111" : "#fff", color: tab === t.id ? "#fff" : "#888", border: "none", cursor: "pointer" }}>
            {t.label}
          </button>
        ))}
      </div>

      <div style={{ marginBottom: 16 }}>
        <input placeholder="Buscar por nombre, estudio, ciudad..." value={busq} onChange={e => setBusq(e.target.value)}
          style={{ ...inp, maxWidth: 400 }} />
      </div>

      {loading && <p style={{ textAlign: "center", padding: 40, color: "#999" }}>Cargando...</p>}
      {error && <p style={{ textAlign: "center", padding: 40, color: "#c00" }}>Error: {error}</p>}

      {!loading && !error && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))", gap: 12 }}>
          {filtrados.map(c => (
            <div key={c.id} style={{ background: "#fff", border: "1px solid #e5e5e5", borderRadius: 10, padding: "14px 16px", cursor: "pointer" }}
              onClick={() => { setSelected(c); setVista("detalle"); }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                <div>
                  <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: "#111" }}>{c.nombre}</p>
                  {c.estudio && <p style={{ margin: "2px 0 0", fontSize: 12, color: "#888" }}>{c.estudio}</p>}
                </div>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
                  <Badge estado={c.estado} />
                  <span style={{ fontSize: 10, color: c.disponible ? "#3B6D11" : "#A32D2D" }}>
                    {c.disponible ? "● Disponible" : "● Ocupado"}
                  </span>
                </div>
              </div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
                <NivelDot nivel={c.nivel} />
                {c.ciudad && <span style={{ fontSize: 11, color: "#888", background: "#f5f5f5", padding: "2px 8px", borderRadius: 99 }}>📍 {c.ciudad}</span>}
              </div>
              <div style={{ display: "flex", gap: 12, justifyContent: "space-between" }}>
                <SoftBadge label="CYPECAD" nivel={c.cypecad} />
                <SoftBadge label="AUTOCAD" nivel={c.autocad} />
                <SoftBadge label="SKETCHUP" nivel={c.sketchup} />
              </div>
              {c.observaciones && (
                <p style={{ margin: "10px 0 0", fontSize: 11, color: "#888", borderTop: "1px solid #f0f0f0", paddingTop: 8, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {c.observaciones}
                </p>
              )}
              <div style={{ display: "flex", gap: 6, marginTop: 10, justifyContent: "flex-end" }} onClick={e => e.stopPropagation()}>
                {c.wsp && <a href={`https://wa.me/${c.wsp.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer"
                  style={{ fontSize: 11, padding: "3px 10px", border: "1px solid #e5e5e5", borderRadius: 6, background: "#f5f5f5", color: "#333", textDecoration: "none" }}>WSP</a>}
                {c.mail && <a href={`mailto:${c.mail}`}
                  style={{ fontSize: 11, padding: "3px 10px", border: "1px solid #e5e5e5", borderRadius: 6, background: "#f5f5f5", color: "#333", textDecoration: "none" }}>Mail</a>}
                <button onClick={() => { setEditando(c); setVista("form"); }}
                  style={{ fontSize: 11, padding: "3px 10px", border: "1px solid #e5e5e5", borderRadius: 6, background: "#fff", cursor: "pointer" }}>Editar</button>
              </div>
            </div>
          ))}
          {filtrados.length === 0 && (
            <p style={{ textAlign: "center", padding: 40, color: "#999", gridColumn: "1/-1" }}>No hay calculistas en esta categoría.</p>
          )}
        </div>
      )}
    </div>
  );
}

function DetalleView({ c, onBack, onEdit, onEliminar }) {
  return (
    <div style={{ fontFamily: "system-ui, -apple-system, sans-serif", padding: "20px", maxWidth: 800, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
        <button onClick={onBack} style={{ fontSize: 13, color: "#666", background: "none", border: "none", cursor: "pointer", padding: 0 }}>← Volver</button>
        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: "#111", flex: 1 }}>{c.nombre}</h2>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={onEdit} style={{ padding: "6px 16px", fontSize: 13, fontWeight: 500, borderRadius: 8, background: "#f5f5f5", color: "#555", border: "1px solid #e5e5e5", cursor: "pointer" }}>Editar</button>
          <button onClick={onEliminar} style={{ padding: "6px 16px", fontSize: 13, fontWeight: 500, borderRadius: 8, background: "#fff", color: "#c00", border: "1px solid #e5e5e5", cursor: "pointer" }}>Eliminar</button>
        </div>
      </div>

      <div style={{ background: "#fff", border: "1px solid #e5e5e5", borderRadius: 10, padding: "16px", marginBottom: 16 }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
          <Badge estado={c.estado} />
          <NivelDot nivel={c.nivel} />
          <span style={{ fontSize: 11, color: c.disponible ? "#3B6D11" : "#A32D2D", fontWeight: 500 }}>
            {c.disponible ? "● Disponible" : "● Ocupado"}
          </span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 12 }}>
          {[
            ["Estudio", c.estudio || "—"], ["Ciudad", c.ciudad || "—"],
            ["Experiencia", c.experiencia || "—"], ["Disponibilidad", c.disponibilidad || "—"],
            ["Freelance", c.freelance ? "Sí" : "No"], ["Factura", c.factura ? "Sí" : "No"],
          ].map(([l, v]) => (
            <div key={l}>
              <p style={{ margin: 0, fontSize: 11, color: "#aaa" }}>{l}</p>
              <p style={{ margin: "2px 0 0", fontSize: 13, fontWeight: 500, color: "#111" }}>{v}</p>
            </div>
          ))}
        </div>
      </div>

      <div style={{ background: "#fff", border: "1px solid #e5e5e5", borderRadius: 10, padding: "16px", marginBottom: 16 }}>
        <p style={{ margin: "0 0 12px", fontSize: 13, fontWeight: 600, color: "#111" }}>Software</p>
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
          <SoftBadge label="CYPECAD" nivel={c.cypecad} />
          <SoftBadge label="AUTOCAD" nivel={c.autocad} />
          <SoftBadge label="SKETCHUP" nivel={c.sketchup} />
        </div>
        {c.otros_software && <p style={{ margin: "10px 0 0", fontSize: 12, color: "#666" }}>Otros: {c.otros_software}</p>}
        {c.sistemas && <p style={{ margin: "6px 0 0", fontSize: 12, color: "#666" }}>Sistemas: {c.sistemas}</p>}
      </div>

      <div style={{ background: "#fff", border: "1px solid #e5e5e5", borderRadius: 10, padding: "16px", marginBottom: 16 }}>
        <p style={{ margin: "0 0 12px", fontSize: 13, fontWeight: 600, color: "#111" }}>Contacto</p>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {c.wsp && <a href={`https://wa.me/${c.wsp.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer"
            style={{ padding: "6px 14px", fontSize: 12, borderRadius: 8, background: "#EAF3DE", color: "#3B6D11", textDecoration: "none", fontWeight: 500 }}>💬 WhatsApp</a>}
          {c.mail && <a href={`mailto:${c.mail}`}
            style={{ padding: "6px 14px", fontSize: 12, borderRadius: 8, background: "#E6F1FB", color: "#185FA5", textDecoration: "none", fontWeight: 500 }}>✉️ {c.mail}</a>}
          {c.ig && <span style={{ padding: "6px 14px", fontSize: 12, borderRadius: 8, background: "#f5f5f5", color: "#555", fontWeight: 500 }}>📸 {c.ig}</span>}
        </div>
      </div>

      {c.observaciones && (
        <div style={{ background: "#fffbe6", border: "1px solid #f0e68c", borderRadius: 10, padding: "14px 16px" }}>
          <p style={{ margin: "0 0 4px", fontSize: 12, fontWeight: 600, color: "#888" }}>Observaciones internas</p>
          <p style={{ margin: 0, fontSize: 13, color: "#555" }}>{c.observaciones}</p>
        </div>
      )}
    </div>
  );
}

function FormView({ inicial, onSave, onCancel, saving }) {
  const [f, setF] = useState({ ...inicial });
  const set = (k, v) => setF(p => ({ ...p, [k]: v }));

  return (
    <div style={{ fontFamily: "system-ui, -apple-system, sans-serif", padding: "20px", maxWidth: 800, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
        <button onClick={onCancel} style={{ fontSize: 13, color: "#666", background: "none", border: "none", cursor: "pointer", padding: 0 }}>← Volver</button>
        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: "#111" }}>
          {f.id ? `Editar — ${f.nombre}` : "Nuevo calculista"}
        </h2>
      </div>

      <Section title="Datos personales">
        <Grid>
          <F label="Nombre y apellido *"><input style={inp} value={f.nombre} onChange={e => set("nombre", e.target.value)} placeholder="Nombre completo" /></F>
          <F label="Estudio / empresa"><input style={inp} value={f.estudio} onChange={e => set("estudio", e.target.value)} placeholder="Nombre del estudio" /></F>
          <F label="Nivel"><select style={inp} value={f.nivel} onChange={e => set("nivel", e.target.value)}>{NIVELES.map(n => <option key={n}>{n}</option>)}</select></F>
          <F label="Ciudad"><input style={inp} value={f.ciudad} onChange={e => set("ciudad", e.target.value)} placeholder="Ciudad" /></F>
          <F label="Estado"><select style={inp} value={f.estado} onChange={e => set("estado", e.target.value)}>{ESTADOS.map(e => <option key={e.id} value={e.id}>{e.label}</option>)}</select></F>
          <F label="Disponibilidad">
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input type="checkbox" checked={f.disponible} onChange={e => set("disponible", e.target.checked)} id="disp" />
              <label htmlFor="disp" style={{ fontSize: 13, color: "#333" }}>Disponible ahora</label>
            </div>
          </F>
        </Grid>
      </Section>

      <Section title="Contacto">
        <Grid>
          <F label="WhatsApp"><input style={inp} value={f.wsp} onChange={e => set("wsp", e.target.value)} placeholder="54 9 11 1234-5678" /></F>
          <F label="Mail"><input style={inp} value={f.mail} onChange={e => set("mail", e.target.value)} placeholder="mail@ejemplo.com" /></F>
          <F label="Instagram"><input style={inp} value={f.ig} onChange={e => set("ig", e.target.value)} placeholder="@usuario" /></F>
        </Grid>
      </Section>

      <Section title="Software">
        <Grid>
          <F label="CYPECAD"><select style={inp} value={f.cypecad} onChange={e => set("cypecad", e.target.value)}>{SOFT.map(s => <option key={s}>{s}</option>)}</select></F>
          <F label="AUTOCAD"><select style={inp} value={f.autocad} onChange={e => set("autocad", e.target.value)}>{SOFT.map(s => <option key={s}>{s}</option>)}</select></F>
          <F label="SKETCHUP"><select style={inp} value={f.sketchup} onChange={e => set("sketchup", e.target.value)}>{SOFT.map(s => <option key={s}>{s}</option>)}</select></F>
          <F label="Otros software"><input style={inp} value={f.otros_software} onChange={e => set("otros_software", e.target.value)} placeholder="CYPE 3D, SAP2000, etc." /></F>
          <F label="Sistemas constructivos"><input style={inp} value={f.sistemas} onChange={e => set("sistemas", e.target.value)} placeholder="Hormigón, Steel Frame, etc." /></F>
        </Grid>
      </Section>

      <Section title="Experiencia y modalidad">
        <Grid>
          <F label="Experiencia en viviendas"><select style={inp} value={f.experiencia} onChange={e => set("experiencia", e.target.value)}>{EXPERIENCIA.map(s => <option key={s}>{s}</option>)}</select></F>
          <F label="Disponibilidad horaria">
            <select style={inp} value={f.disponibilidad} onChange={e => set("disponibilidad", e.target.value)}>
              <option value="">Sin especificar</option>
              {DISPONIBILIDAD.map(s => <option key={s}>{s}</option>)}
            </select>
          </F>
          <F label="Modalidad">
            <div style={{ display: "flex", gap: 16 }}>
              <label style={{ display: "flex", gap: 6, alignItems: "center", fontSize: 13 }}>
                <input type="checkbox" checked={f.freelance} onChange={e => set("freelance", e.target.checked)} /> Freelance
              </label>
              <label style={{ display: "flex", gap: 6, alignItems: "center", fontSize: 13 }}>
                <input type="checkbox" checked={f.factura} onChange={e => set("factura", e.target.checked)} /> Factura
              </label>
            </div>
          </F>
        </Grid>
      </Section>

      <Section title="Observaciones internas">
        <textarea style={{ ...inp, resize: "vertical" }} value={f.observaciones} onChange={e => set("observaciones", e.target.value)} rows={3} placeholder="Notas internas sobre este calculista..." />
      </Section>

      <div style={{ display: "flex", gap: 8, marginTop: 24 }}>
        <button onClick={() => { if (!f.nombre?.trim()) return alert("El nombre es obligatorio"); onSave(f); }} disabled={saving}
          style={{ padding: "8px 24px", fontSize: 14, fontWeight: 500, borderRadius: 8, cursor: saving ? "not-allowed" : "pointer", border: "none", background: "#111", color: "#fff", opacity: saving ? 0.6 : 1 }}>
          {saving ? "Guardando..." : f.id ? "Guardar cambios" : "Crear calculista"}
        </button>
        <button onClick={onCancel} style={{ padding: "8px 18px", fontSize: 14, fontWeight: 500, borderRadius: 8, cursor: "pointer", border: "1px solid #e5e5e5", background: "#f5f5f5", color: "#555" }}>Cancelar</button>
      </div>
    </div>
  );
}
