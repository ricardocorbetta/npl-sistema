import React, { useEffect, useState, useCallback } from "react";
import { supabase } from "./supabase.js";

const SUPA_URL = "https://imkmosifqxzbtqgzssst.supabase.co/rest/v1";
const ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlta21vc2lmcXh6YnRxZ3pzc3N0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkxODk4NTUsImV4cCI6MjA5NDc2NTg1NX0.5gtCs8Yv3vDSrKxAmXSr3zjWJ5HjimCKejfO-XrHPss";

async function getToken() {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token || ANON_KEY;
}

async function api(path, opts = {}) {
  const tk = await getToken();
  const res = await fetch(`${SUPA_URL}${path}`, {
    ...opts,
    headers: {
      apikey: ANON_KEY,
      Authorization: `Bearer ${tk}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
      ...(opts.headers || {}),
    },
  });
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

const NIVELES_SW = ["No lo utilizo", "Básico", "Intermedio", "Avanzado", "Experto"];
const ROLES_CALC = ["Ingeniero Calculista", "Arquitecto", "Project Manager", "Director"];
const CIUDADES_GBA = ["buenos aires", "caba", "capital federal", "palermo", "belgrano", "caballito", "lanús", "quilmes", "avellaneda", "morón", "merlo", "moreno", "tigre", "san isidro", "vicente lópez", "lomas de zamora"];

function calcularScore(c, pesos = { experiencia: 35, disponibilidad: 25, cypecad: 20, factura: 10, freelance: 5, interior: 10 }) {
  let score = 0;
  const exp = (c.experiencia || "").toLowerCase();
  if (exp.includes("amplia")) score += pesos.experiencia;
  else if (exp.includes("intermedia")) score += Math.round(pesos.experiencia * 0.63);
  else if (exp.includes("inicial")) score += Math.round(pesos.experiencia * 0.29);

  const disp = (c.disponibilidad || "").toLowerCase();
  if (disp.includes("más de 20") || disp.includes("mas de 20")) score += pesos.disponibilidad;
  else if (disp.includes("10") && disp.includes("20")) score += Math.round(pesos.disponibilidad * 0.6);
  else if (disp.includes("menos")) score += Math.round(pesos.disponibilidad * 0.2);

  const cyp = (c.cypecad || "").toLowerCase();
  if (cyp.includes("experto")) score += pesos.cypecad;
  else if (cyp.includes("avanzado")) score += Math.round(pesos.cypecad * 0.75);
  else if (cyp.includes("intermedio")) score += Math.round(pesos.cypecad * 0.4);
  else if (cyp.includes("básico") || cyp.includes("basico")) score += Math.round(pesos.cypecad * 0.15);

  if (c.factura) score += pesos.factura;
  if (c.freelance) score += pesos.freelance;

  const ciudad = (c.ciudad || "").toLowerCase();
  const esGBA = CIUDADES_GBA.some(g => ciudad.includes(g));
  if (ciudad && !esGBA) score += pesos.interior;

  return Math.min(score, 100);
}

function Badge({ label, color = "#888", bg = "#f0f0f0" }) {
  return <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 20, background: bg, color }}>{label}</span>;
}

function ScoreCircle({ score }) {
  const color = score >= 70 ? "#1a8a5e" : score >= 45 ? "#f59e0b" : "#c0392b";
  return (
    <div style={{ width: 38, height: 38, borderRadius: "50%", background: color, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 900, flexShrink: 0 }}>
      {score}
    </div>
  );
}

function ModalCalc({ calc, onClose, onGuardar }) {
  const esNuevo = !calc;
  const [form, setForm] = useState({
    nombre: calc?.nombre || "",
    mail: calc?.mail || "",
    wsp: calc?.wsp || "",
    ciudad: calc?.ciudad || "",
    estado: calc?.estado || "postulante",
    nivel: calc?.nivel || "Ingeniero Calculista",
    experiencia: calc?.experiencia || "",
    sistemas: calc?.sistemas || "",
    cypecad: calc?.cypecad || "",
    autocad: calc?.autocad || "",
    sketchup: calc?.sketchup || "",
    otros_software: calc?.otros_software || "",
    disponibilidad: calc?.disponibilidad || "",
    factura: calc?.factura || false,
    freelance: calc?.freelance || false,
    disponible: calc?.disponible || false,
    observaciones: calc?.observaciones || "",
  });
  const [saving, setSaving] = useState(false);

  async function guardar() {
    if (!form.nombre) return;
    setSaving(true);
    if (calc?.id) {
      await api(`/calculistas?id=eq.${calc.id}`, { method: "PATCH", body: JSON.stringify(form) });
    } else {
      await api("/calculistas", { method: "POST", body: JSON.stringify({ ...form, tipo: "externo" }) });
    }
    onGuardar();
    setSaving(false);
  }

  const S = {
    inp: { width: "100%", padding: "8px 12px", border: "1.5px solid #e0e0e0", borderRadius: 8, fontSize: 13, boxSizing: "border-box", fontFamily: "inherit" },
    lbl: { fontSize: 10, fontWeight: 700, color: "#aaa", textTransform: "uppercase", letterSpacing: 0.5, display: "block", marginBottom: 4 },
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div style={{ background: "#fff", borderRadius: 14, width: "min(680px,100%)", maxHeight: "90vh", overflow: "auto", display: "flex", flexDirection: "column" }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid #f0f0f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 800 }}>{esNuevo ? "Nuevo calculista" : "Editar calculista"}</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "#888" }}>✕</button>
        </div>
        <div style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div><span style={S.lbl}>Nombre *</span><input style={S.inp} value={form.nombre} onChange={e => setForm(p => ({ ...p, nombre: e.target.value }))} /></div>
            <div><span style={S.lbl}>Email</span><input style={S.inp} value={form.mail} onChange={e => setForm(p => ({ ...p, mail: e.target.value }))} /></div>
            <div><span style={S.lbl}>WhatsApp</span><input style={S.inp} value={form.wsp} onChange={e => setForm(p => ({ ...p, wsp: e.target.value }))} placeholder="+54 9..." /></div>
            <div><span style={S.lbl}>Ciudad</span><input style={S.inp} value={form.ciudad} onChange={e => setForm(p => ({ ...p, ciudad: e.target.value }))} /></div>
            <div>
              <span style={S.lbl}>Estado</span>
              <select style={S.inp} value={form.estado} onChange={e => setForm(p => ({ ...p, estado: e.target.value }))}>
                {["postulante","activo","pausado","inactivo"].map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <span style={S.lbl}>Rol</span>
              <select style={S.inp} value={form.nivel} onChange={e => setForm(p => ({ ...p, nivel: e.target.value }))}>
                {ROLES_CALC.map(r => <option key={r}>{r}</option>)}
              </select>
            </div>
          </div>
          <div><span style={S.lbl}>Experiencia</span><textarea style={{ ...S.inp, resize: "none" }} rows={2} value={form.experiencia} onChange={e => setForm(p => ({ ...p, experiencia: e.target.value }))} /></div>
          <div><span style={S.lbl}>Sistemas estructurales</span><input style={S.inp} value={form.sistemas} onChange={e => setForm(p => ({ ...p, sistemas: e.target.value }))} /></div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
            {[["cypecad","CYPECAD"],["autocad","AutoCAD"],["sketchup","SketchUp"]].map(([k, label]) => (
              <div key={k}>
                <span style={S.lbl}>{label}</span>
                <select style={S.inp} value={form[k]} onChange={e => setForm(p => ({ ...p, [k]: e.target.value }))}>
                  <option value="">—</option>
                  {NIVELES_SW.map(n => <option key={n}>{n}</option>)}
                </select>
              </div>
            ))}
          </div>
          <div>
            <span style={S.lbl}>Disponibilidad</span>
            <select style={S.inp} value={form.disponibilidad} onChange={e => setForm(p => ({ ...p, disponibilidad: e.target.value }))}>
              <option value="">—</option>
              {["Menos de 10 horas semanales","Más de 10 y menos de 20","Más de 20 horas semanales"].map(d => <option key={d}>{d}</option>)}
            </select>
          </div>
          <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
            {[["factura","✓ Factura"],["freelance","Freelance"],["disponible","Disponible ahora"]].map(([k, label]) => (
              <label key={k} style={{ display: "flex", gap: 7, alignItems: "center", fontSize: 13, cursor: "pointer" }}>
                <input type="checkbox" checked={form[k] || false} onChange={e => setForm(p => ({ ...p, [k]: e.target.checked }))} style={{ accentColor: "#111" }} />
                {label}
              </label>
            ))}
          </div>
          <div><span style={S.lbl}>Observaciones</span><textarea style={{ ...S.inp, resize: "none" }} rows={3} value={form.observaciones} onChange={e => setForm(p => ({ ...p, observaciones: e.target.value }))} /></div>
        </div>
        <div style={{ padding: "12px 20px", borderTop: "1px solid #f0f0f0", display: "flex", gap: 8 }}>
          <button onClick={guardar} disabled={saving || !form.nombre} style={{ padding: "9px 20px", background: "#0a0a0a", color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>{saving ? "Guardando…" : "Guardar"}</button>
          <button onClick={onClose} style={{ padding: "9px 14px", background: "#f0f0f0", border: "1.5px solid #e0e0e0", borderRadius: 8, fontSize: 12, cursor: "pointer" }}>Cancelar</button>
        </div>
      </div>
    </div>
  );
}

export default function Calculistas() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [busq, setBusq] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("todos");
  const [ordenar, setOrdenar] = useState("score");
  const [msg, setMsg] = useState("");
  const [showPesos, setShowPesos] = useState(false);
  const [pesos, setPesos] = useState({ experiencia: 35, disponibilidad: 25, cypecad: 20, factura: 10, freelance: 5, interior: 10 });

  const cargar = useCallback(async () => {
    setLoading(true);
    const data = await api("/calculistas?order=nombre.asc");
    setItems(Array.isArray(data) ? data : []);
    setLoading(false);
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  async function cambiarEstado(id, estado) {
    await api(`/calculistas?id=eq.${id}`, { method: "PATCH", body: JSON.stringify({ estado, disponible: estado === "activo" }) });
    setMsg("✓ Estado actualizado");
    setTimeout(() => setMsg(""), 2000);
    cargar();
  }

  async function toggleDisponible(id, actual) {
    await api(`/calculistas?id=eq.${id}`, { method: "PATCH", body: JSON.stringify({ disponible: !actual }) });
    cargar();
  }

  async function eliminar(id) {
    if (!confirm("¿Eliminar este calculista?")) return;
    await api(`/calculistas?id=eq.${id}`, { method: "DELETE" });
    setMsg("✓ Eliminado");
    setTimeout(() => setMsg(""), 2000);
    cargar();
  }

  function copiarLink(c) {
    navigator.clipboard.writeText("https://npl-sistema.vercel.app/#postulacion");
    setMsg(`✓ Link copiado — compartí con ${c.nombre}`);
    setTimeout(() => setMsg(""), 3000);
  }

  const conScore = items.map(c => ({ ...c, _score: calcularScore(c, pesos) }));

  const filtrados = conScore.filter(c => {
    const okEstado = filtroEstado === "todos" || c.estado === filtroEstado;
    const q = busq.toLowerCase();
    const okBusq = !q || [c.nombre, c.mail, c.ciudad, c.sistemas].some(v => v?.toLowerCase().includes(q));
    return okEstado && okBusq;
  }).sort((a, b) => {
    if (ordenar === "score") return b._score - a._score;
    if (ordenar === "nombre") return (a.nombre || "").localeCompare(b.nombre || "");
    return (b.disponible ? 1 : 0) - (a.disponible ? 1 : 0);
  });

  const kpis = {
    activos: items.filter(c => c.estado === "activo").length,
    disponibles: items.filter(c => c.disponible).length,
    postulantes: items.filter(c => c.estado === "postulante").length,
    interior: items.filter(c => c.ciudad && !CIUDADES_GBA.some(g => (c.ciudad || "").toLowerCase().includes(g))).length,
  };

  const top3 = [...conScore].filter(c => ["activo","postulante"].includes(c.estado)).sort((a, b) => b._score - a._score).slice(0, 3);

  const S = {
    btn: { padding: "9px 20px", background: "#0a0a0a", color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer" },
    btnSm: { padding: "5px 12px", background: "#f0f0f0", color: "#333", border: "1.5px solid #e0e0e0", borderRadius: 6, fontSize: 11, cursor: "pointer", fontWeight: 600 },
  };

  return (
    <div style={{ fontFamily: "system-ui, -apple-system, sans-serif", padding: 20, maxWidth: 1100, margin: "0 auto" }}>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
        <div>
          <p style={{ margin: 0, fontSize: 11, color: "#aaa" }}>NPL · Calculistas</p>
          <h1 style={{ margin: "2px 0 0", fontSize: 20, fontWeight: 800, color: "#111" }}>👷 Calculistas</h1>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => { navigator.clipboard.writeText("https://npl-sistema.vercel.app/#postulacion"); setMsg("✓ Link copiado"); setTimeout(() => setMsg(""), 2500); }}
            style={{ ...S.btnSm, color: "#6366f1", borderColor: "#6366f1" }}>🔗 Link postulación</button>
          <button onClick={() => setModal("nuevo")} style={S.btn}>+ Nuevo</button>
        </div>
      </div>

      {/* KPIs */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        {[
          { label: "Activos", value: kpis.activos, color: "#1a8a5e" },
          { label: "Disponibles", value: kpis.disponibles, color: "#3b82f6" },
          { label: "Postulantes", value: kpis.postulantes, color: "#f59e0b" },
          { label: "Interior", value: kpis.interior, color: "#6366f1" },
        ].map(k => (
          <div key={k.label} style={{ background: "#fff", border: "1.5px solid #e8e8e8", borderRadius: 10, padding: "8px 14px", minWidth: 80 }}>
            <div style={{ fontSize: 20, fontWeight: 900, color: k.color, fontFamily: "monospace" }}>{k.value}</div>
            <div style={{ fontSize: 10, color: "#aaa", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5 }}>{k.label}</div>
          </div>
        ))}
      </div>

      {/* Top 3 */}
      {top3.length > 0 && (
        <div style={{ background: "#f0fdf4", border: "1.5px solid #1a8a5e30", borderRadius: 12, padding: "12px 16px", marginBottom: 14 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#1a8a5e", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 10 }}>⭐ Mejores perfiles</div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {top3.map((c, i) => (
              <div key={c.id} onClick={() => setModal(c)} style={{ background: "#fff", borderRadius: 8, padding: "8px 14px", cursor: "pointer", border: "1.5px solid #e8e8e8", display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 16, fontWeight: 900, color: ["#f59e0b","#888","#cd7f32"][i] }}>#{i+1}</span>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 13 }}>{c.nombre}</div>
                  <div style={{ fontSize: 11, color: "#888" }}>{c.ciudad} · Score: {c._score}/100</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Panel pesos algoritmo */}
      <div style={{ background: "#fff", border: "1.5px solid #e8e8e8", borderRadius: 12, marginBottom: 14, overflow: "hidden" }}>
        <div onClick={() => setShowPesos(v => !v)} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 16px", cursor: "pointer" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span>⚙️</span>
            <span style={{ fontSize: 13, fontWeight: 700 }}>Algoritmo de ranking</span>
            <span style={{ fontSize: 11, color: "#aaa" }}>— ajustá los pesos</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 11, color: "#888" }}>Total: {Object.values(pesos).reduce((s, v) => s + v, 0)} pts</span>
            <span style={{ color: "#aaa", fontSize: 16, transform: showPesos ? "rotate(180deg)" : "none", transition: "0.2s" }}>⌄</span>
          </div>
        </div>
        {showPesos && (
          <div style={{ borderTop: "1px solid #f0f0f0", padding: 16 }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 16 }}>
              {[
                { key: "experiencia", label: "💼 Experiencia" },
                { key: "disponibilidad", label: "🕐 Disponibilidad" },
                { key: "cypecad", label: "💻 CYPECAD" },
                { key: "factura", label: "🧾 Factura" },
                { key: "freelance", label: "🤝 Freelance" },
                { key: "interior", label: "🗺 Interior" },
              ].map(({ key, label }) => (
                <div key={key}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ fontSize: 12, fontWeight: 700 }}>{label}</span>
                    <span style={{ fontSize: 13, fontWeight: 900, fontFamily: "monospace" }}>{pesos[key]}</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <button onClick={() => setPesos(p => ({ ...p, [key]: Math.max(0, p[key] - 5) }))} style={{ width: 22, height: 22, borderRadius: 5, border: "1.5px solid #e0e0e0", background: "#f8f8f8", cursor: "pointer", fontWeight: 700 }}>−</button>
                    <input type="range" min="0" max="50" step="5" value={pesos[key]} onChange={e => setPesos(p => ({ ...p, [key]: parseInt(e.target.value) }))} style={{ flex: 1, accentColor: "#0a0a0a" }} />
                    <button onClick={() => setPesos(p => ({ ...p, [key]: Math.min(50, p[key] + 5) }))} style={{ width: 22, height: 22, borderRadius: 5, border: "1.5px solid #e0e0e0", background: "#f8f8f8", cursor: "pointer", fontWeight: 700 }}>+</button>
                  </div>
                  <div style={{ height: 3, background: "#f0f0f0", borderRadius: 2, marginTop: 4, overflow: "hidden" }}>
                    <div style={{ width: `${(pesos[key] / 50) * 100}%`, height: "100%", background: "#0a0a0a", borderRadius: 2 }} />
                  </div>
                </div>
              ))}
            </div>
            <button onClick={() => setPesos({ experiencia: 35, disponibilidad: 25, cypecad: 20, factura: 10, freelance: 5, interior: 10 })}
              style={{ ...S.btnSm, marginTop: 14 }}>↺ Restablecer</button>
          </div>
        )}
      </div>

      {/* Filtros */}
      <div style={{ display: "flex", gap: 6, marginBottom: 14, flexWrap: "wrap", alignItems: "center", background: "#fff", borderRadius: 10, padding: "8px 12px", border: "1.5px solid #e8e8e8" }}>
        {["todos","activo","postulante","pausado","inactivo"].map(e => (
          <button key={e} onClick={() => setFiltroEstado(e)} style={{
            padding: "4px 12px", borderRadius: 7, fontSize: 12, fontWeight: filtroEstado === e ? 700 : 500,
            background: filtroEstado === e ? "#111" : "transparent", color: filtroEstado === e ? "#fff" : "#888", border: "none", cursor: "pointer", textTransform: "capitalize",
          }}>{e === "todos" ? `Todos (${items.length})` : e}</button>
        ))}
        <div style={{ width: 1, height: 16, background: "#e0e0e0", margin: "0 4px" }} />
        <select value={ordenar} onChange={e => setOrdenar(e.target.value)} style={{ border: "none", outline: "none", fontSize: 12, background: "transparent", cursor: "pointer" }}>
          <option value="score">↓ Mejor score</option>
          <option value="nombre">A-Z Nombre</option>
          <option value="disponibilidad">Disponibles primero</option>
        </select>
        <input value={busq} onChange={e => setBusq(e.target.value)} placeholder="Filtrar…"
          style={{ border: "none", outline: "none", fontSize: 12, color: "#555", background: "transparent", width: 140 }} />
        {busq && <button onClick={() => setBusq("")} style={{ background: "none", border: "none", cursor: "pointer", color: "#aaa" }}>✕</button>}
      </div>

      {msg && <div style={{ background: "#f0fdf4", color: "#1a8a5e", borderRadius: 8, padding: "7px 12px", marginBottom: 10, fontSize: 13, fontWeight: 600 }}>{msg}</div>}
      {loading && <p style={{ color: "#aaa", textAlign: "center", padding: 40 }}>Cargando…</p>}

      {/* Lista */}
      {!loading && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {filtrados.map(c => {
            const esInterior = c.ciudad && !CIUDADES_GBA.some(g => (c.ciudad || "").toLowerCase().includes(g));
            const ESTADO_COLOR = { activo: "#1a8a5e", postulante: "#3b82f6", pausado: "#f59e0b", inactivo: "#888" };
            const estadoColor = ESTADO_COLOR[c.estado] || "#888";
            return (
              <div key={c.id} style={{ background: "#fff", border: "1.5px solid #e8e8e8", borderRadius: 12, overflow: "hidden" }}>
                <div style={{ padding: "12px 16px", display: "flex", alignItems: "flex-start", gap: 12 }}>
                  <ScoreCircle score={c._score} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 4 }}>
                      <span style={{ fontWeight: 800, fontSize: 14, color: "#111" }}>{c.nombre}</span>
                      <Badge label={c.estado} color={estadoColor} bg={`${estadoColor}15`} />
                      {esInterior && <Badge label="🗺 Interior" color="#6366f1" bg="#ede9fe" />}
                      {c.factura && <Badge label="✓ Factura" color="#1a8a5e" bg="#f0fdf4" />}
                      {c.nivel && <Badge label={c.nivel} color="#555" bg="#f0f0f0" />}
                    </div>
                    <div style={{ display: "flex", gap: 12, fontSize: 12, color: "#888", flexWrap: "wrap" }}>
                      {c.ciudad && <span>📍 {c.ciudad}</span>}
                      {c.mail && <span>✉️ {c.mail}</span>}
                      {c.cypecad && c.cypecad !== "No lo utilizo" && <span>💻 CYPECAD: {c.cypecad.split(" ")[0]}</span>}
                      {c.disponibilidad && <span>🕐 {c.disponibilidad.split(" ").slice(0, 3).join(" ")}</span>}
                    </div>
                  </div>
                </div>
                <div style={{ borderTop: "1px solid #f5f5f5", padding: "7px 14px", display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                  <button onClick={() => setModal(c)} style={S.btnSm}>✏️ Editar</button>
                  {c.wsp && <a href={`https://wa.me/${c.wsp.replace(/\D/g,"")}`} target="_blank" rel="noreferrer" style={{ ...S.btnSm, background: "#25d366", color: "#fff", border: "none", textDecoration: "none" }}>💬 WA</a>}
                  {c.mail && <a href={`mailto:${c.mail}`} style={{ ...S.btnSm, textDecoration: "none" }}>📧 Email</a>}
                  {c.estado === "postulante" && <button onClick={() => cambiarEstado(c.id, "activo")} style={{ ...S.btnSm, color: "#1a8a5e", borderColor: "#1a8a5e", background: "#f0fdf4" }}>✓ Activar</button>}
                  {c.estado === "activo" && <>
                    <button onClick={() => toggleDisponible(c.id, c.disponible)} style={{ ...S.btnSm, color: c.disponible ? "#1a8a5e" : "#888", borderColor: c.disponible ? "#1a8a5e" : "#e0e0e0", background: c.disponible ? "#f0fdf4" : "#f8f8f8" }}>
                      {c.disponible ? "✓ Disponible" : "○ No disponible"}
                    </button>
                    <button onClick={() => cambiarEstado(c.id, "pausado")} style={{ ...S.btnSm, color: "#c4781a", borderColor: "#f59e0b" }}>⏸ Pausar</button>
                  </>}
                  {c.estado === "pausado" && <button onClick={() => cambiarEstado(c.id, "activo")} style={{ ...S.btnSm, color: "#3b82f6", borderColor: "#3b82f6" }}>▶ Reactivar</button>}
                  <button onClick={() => copiarLink(c)} style={{ ...S.btnSm, marginLeft: "auto" }}>🔗 Compartir</button>
                  <button onClick={() => eliminar(c.id)} style={{ ...S.btnSm, color: "#c0392b", borderColor: "#fecaca", background: "#fef2f2" }}>🗑</button>
                </div>
              </div>
            );
          })}
          {filtrados.length === 0 && <div style={{ textAlign: "center", padding: 40, color: "#aaa" }}>Sin resultados</div>}
        </div>
      )}

      {modal && <ModalCalc calc={modal === "nuevo" ? null : modal} onClose={() => setModal(null)} onGuardar={() => { setModal(null); cargar(); setMsg("✓ Guardado"); setTimeout(() => setMsg(""), 2000); }} />}
    </div>
  );
}
