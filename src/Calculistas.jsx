import React, { useEffect, useState, useCallback } from "react";
import { supabase } from "./supabase.js";

const SUPA_URL = "https://imkmosifqxzbtqgzssst.supabase.co/rest/v1";
const ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlta21vc2lmcXh6YnRxZ3pzc3N0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkxODk4NTUsImV4cCI6MjA5NDc2NTg1NX0.5gtCs8Yv3vDSrKxAmXSr3zjWJ5HjimCKejfO-XrHPss";

async function getToken() {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token || ANON_KEY;
}
function hdrs(tk) {
  return { apikey: ANON_KEY, Authorization: `Bearer ${tk}`, "Content-Type": "application/json", Prefer: "return=representation" };
}

const S = {
  inp: { width: "100%", padding: "9px 12px", border: "1.5px solid #e0e0e0", borderRadius: 8, fontSize: 13, boxSizing: "border-box", background: "#fff", fontFamily: "inherit" },
  lbl: { fontSize: 10, color: "#aaa", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4, display: "block" },
  btn: { padding: "9px 20px", background: "#0a0a0a", color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer" },
  btnSm: { padding: "5px 12px", background: "#f0f0f0", color: "#333", border: "1.5px solid #e0e0e0", borderRadius: 6, fontSize: 11, cursor: "pointer", fontWeight: 600 },
};

const NIVELES_SW = ["No lo utilizo", "Básico", "Intermedio", "Avanzado", "Experto / uso profesional frecuente"];
const CIUDADES_GBA = ["buenos aires", "caba", "capital federal", "gba", "gran buenos aires", "palermo", "belgrano", "flores", "caballito", "lanús", "lomas", "quilmes", "avellaneda", "morón", "merlo", "moreno", "tigre", "san isidro", "vicente lópez"];

/* ─── Algoritmo de ranking ─── */
function calcularScore(c, pesos = { experiencia: 35, disponibilidad: 25, cypecad: 20, factura: 10, freelance: 5, interior: 10 }) {
  let score = 0;
  const notas = [];

  // Experiencia
  const exp = (c.experiencia || "").toLowerCase();
  if (exp.includes("amplia")) { const pts = pesos.experiencia; score += pts; notas.push(`Amplia experiencia +${pts}`); }
  else if (exp.includes("intermedia")) { const pts = Math.round(pesos.experiencia * 0.63); score += pts; notas.push(`Experiencia intermedia +${pts}`); }
  else if (exp.includes("inicial")) { const pts = Math.round(pesos.experiencia * 0.29); score += pts; notas.push(`Experiencia inicial +${pts}`); }

  // Disponibilidad
  const disp = (c.disponibilidad || "").toLowerCase();
  if (disp.includes("más de 20") || disp.includes("mas de 20")) { const pts = pesos.disponibilidad; score += pts; notas.push(`+20h disponibles +${pts}`); }
  else if (disp.includes("10") && disp.includes("20")) { const pts = Math.round(pesos.disponibilidad * 0.6); score += pts; notas.push(`10-20h disponibles +${pts}`); }
  else if (disp.includes("menos")) { const pts = Math.round(pesos.disponibilidad * 0.2); score += pts; notas.push(`<10h disponibles +${pts}`); }

  // CYPECAD
  const cyp = (c.cypecad || "").toLowerCase();
  if (cyp.includes("experto")) { const pts = pesos.cypecad; score += pts; notas.push(`CYPECAD experto +${pts}`); }
  else if (cyp.includes("avanzado")) { const pts = Math.round(pesos.cypecad * 0.75); score += pts; notas.push(`CYPECAD avanzado +${pts}`); }
  else if (cyp.includes("intermedio")) { const pts = Math.round(pesos.cypecad * 0.4); score += pts; notas.push(`CYPECAD intermedio +${pts}`); }
  else if (cyp.includes("básico") || cyp.includes("basico")) { const pts = Math.round(pesos.cypecad * 0.15); score += pts; notas.push(`CYPECAD básico +${pts}`); }

  // Factura
  if (c.factura) { score += pesos.factura; notas.push(`Factura +${pesos.factura}`); }

  // Freelance
  if (c.freelance) { score += pesos.freelance; notas.push(`Experiencia freelance +${pesos.freelance}`); }

  // Interior del país
  const ciudad = (c.ciudad || "").toLowerCase();
  const esGBA = CIUDADES_GBA.some(g => ciudad.includes(g));
  if (ciudad && !esGBA) { score += pesos.interior; notas.push(`Interior del país +${pesos.interior}`); }

  // Puntaje manual tiebreaker
  if (c.puntaje) { const pts = Math.round((c.puntaje / 10) * 5); score += pts; notas.push(`Puntaje manual +${pts}`); }

  return { score: Math.min(score, 100), notas };
}

/* ─── Badge de estado ─── */
function EstadoBadge({ estado }) {
  const map = {
    activo: { bg: "#f0fdf4", color: "#1a8a5e", label: "Activo" },
    postulante: { bg: "#eff6ff", color: "#3b82f6", label: "Postulante" },
    inactivo: { bg: "#f8f8f8", color: "#888", label: "Inactivo" },
    pausado: { bg: "#fffbeb", color: "#c4781a", label: "Pausado" },
  };
  const s = map[estado] || map.inactivo;
  return <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 20, background: s.bg, color: s.color }}>{s.label}</span>;
}

/* ─── Score badge ─── */
function ScoreBadge({ score, notas }) {
  const [show, setShow] = useState(false);
  const color = score >= 70 ? "#1a8a5e" : score >= 45 ? "#f59e0b" : "#c0392b";
  return (
    <div style={{ position: "relative" }}>
      <div onClick={() => setShow(v => !v)} style={{ display: "flex", alignItems: "center", gap: 4, cursor: "pointer" }}>
        <div style={{ width: 36, height: 36, borderRadius: "50%", background: color, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 900, fontSize: 12 }}>{score}</div>
      </div>
      {show && (
        <div style={{ position: "absolute", right: 0, top: 44, background: "#fff", border: "1.5px solid #e0e0e0", borderRadius: 10, padding: 12, zIndex: 10, minWidth: 200, boxShadow: "0 4px 20px rgba(0,0,0,0.1)" }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#888", textTransform: "uppercase", marginBottom: 8 }}>Desglose score</div>
          {notas.map((n, i) => <div key={i} style={{ fontSize: 12, color: "#555", padding: "2px 0", borderBottom: "1px solid #f5f5f5" }}>{n}</div>)}
          <div style={{ fontSize: 12, fontWeight: 800, color: color, marginTop: 8 }}>Total: {score}/100</div>
        </div>
      )}
    </div>
  );
}

/* ─── Card calculista ─── */
function CardCalculista({ calc, onClick, onCopiarLink, onCambiarEstado, onToggleDisponible }) {
  const { score, notas } = calcularScore(calc);
  const esInterior = calc.ciudad && !CIUDADES_GBA.some(g => (calc.ciudad || "").toLowerCase().includes(g));

  return (
    <div style={{ background: "#fff", border: "1.5px solid #e8e8e8", borderRadius: 12, overflow: "hidden" }}>
      <div onClick={onClick} style={{ padding: "12px 16px", cursor: "pointer", display: "grid", gridTemplateColumns: "1fr auto", gap: 12, alignItems: "start" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <span style={{ fontWeight: 800, fontSize: 14, color: "#111" }}>{calc.nombre}</span>
            <EstadoBadge estado={calc.estado || "postulante"} />
            {esInterior && <span style={{ fontSize: 10, background: "#ede9fe", color: "#6366f1", borderRadius: 20, padding: "1px 7px", fontWeight: 700 }}>🗺 Interior</span>}
            {calc.factura && <span style={{ fontSize: 10, background: "#f0fdf4", color: "#1a8a5e", borderRadius: 20, padding: "1px 7px", fontWeight: 700 }}>✓ Factura</span>}
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", fontSize: 12, color: "#888" }}>
            {calc.ciudad && <span>📍 {calc.ciudad}</span>}
            {calc.mail && <span>✉️ {calc.mail}</span>}
            {calc.wsp && <span>💬 {calc.wsp}</span>}
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 6, flexWrap: "wrap" }}>
            {calc.cypecad && calc.cypecad !== "No lo utilizo" && <span style={{ fontSize: 11, background: "#f8f8f8", borderRadius: 5, padding: "2px 8px", color: "#555" }}>CYPECAD: {calc.cypecad.split(" ")[0]}</span>}
            {calc.disponibilidad && <span style={{ fontSize: 11, background: "#eff6ff", borderRadius: 5, padding: "2px 8px", color: "#3b82f6" }}>🕐 {calc.disponibilidad.split(" ").slice(0, 3).join(" ")}</span>}
            {calc.experiencia && <span style={{ fontSize: 11, background: "#fafafa", borderRadius: 5, padding: "2px 8px", color: "#666" }}>💼 {calc.experiencia.split(",")[0]?.slice(0, 30)}</span>}
          </div>
        </div>
        <ScoreBadge score={calc._score || score} notas={calc._notas || notas} />
      </div>
      <div style={{ borderTop: "1px solid #f5f5f5", padding: "7px 16px", display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
        <button onClick={onClick} style={S.btnSm}>✏️ Editar</button>
        {calc.wsp && (
          <a href={`https://wa.me/${calc.wsp.replace(/\D/g, "")}`} target="_blank" rel="noreferrer"
            style={{ ...S.btnSm, background: "#25d366", color: "#fff", border: "none", textDecoration: "none" }}>💬 WhatsApp</a>
        )}
        {calc.mail && (
          <a href={`mailto:${calc.mail}`} style={{ ...S.btnSm, textDecoration: "none" }}>📧 Email</a>
        )}
        {/* Acciones rápidas de estado */}
        {calc.estado === "postulante" && (
          <button onClick={() => onCambiarEstado && onCambiarEstado(calc.id, "activo")}
            style={{ ...S.btnSm, color: "#1a8a5e", borderColor: "#1a8a5e", background: "#f0fdf4" }}>✓ Activar</button>
        )}
        {calc.estado === "activo" && (
          <>
            <button onClick={() => onToggleDisponible && onToggleDisponible(calc.id, calc.disponible)}
              style={{ ...S.btnSm, color: calc.disponible ? "#1a8a5e" : "#888", borderColor: calc.disponible ? "#1a8a5e" : "#e0e0e0", background: calc.disponible ? "#f0fdf4" : "#f8f8f8" }}>
              {calc.disponible ? "✓ Disponible" : "○ No disponible"}
            </button>
            <button onClick={() => onCambiarEstado && onCambiarEstado(calc.id, "pausado")}
              style={{ ...S.btnSm, color: "#c4781a", borderColor: "#f59e0b" }}>⏸ Pausar</button>
          </>
        )}
        {calc.estado === "pausado" && (
          <button onClick={() => onCambiarEstado && onCambiarEstado(calc.id, "activo")}
            style={{ ...S.btnSm, color: "#3b82f6", borderColor: "#3b82f6" }}>▶ Reactivar</button>
        )}
        <button onClick={() => onCopiarLink(calc)} style={{ ...S.btnSm, marginLeft: "auto" }} title="Copiar link de postulación">🔗 Compartir</button>
      </div>
    </div>
  );
}

/* ─── Modal editar calculista ─── */
function ModalCalculista({ calc, onClose, onGuardar }) {
  const [form, setForm] = useState({
    nombre: calc?.nombre || "", mail: calc?.mail || "", wsp: calc?.wsp || "",
    ciudad: calc?.ciudad || "", nivel: calc?.nivel || "", estado: calc?.estado || "postulante",
    experiencia: calc?.experiencia || "", sistemas: calc?.sistemas || "",
    cypecad: calc?.cypecad || "", autocad: calc?.autocad || "", sketchup: calc?.sketchup || "",
    otros_software: calc?.otros_software || "", disponibilidad: calc?.disponibilidad || "",
    factura: calc?.factura || false, freelance: calc?.freelance || false,
    disponible: calc?.disponible || false, puntaje: calc?.puntaje || 0,
    observaciones: calc?.observaciones || "",
  });
  const [saving, setSaving] = useState(false);

  async function guardar() {
    setSaving(true);
    const tk = await getToken();
    const body = { ...form, puntaje: parseInt(form.puntaje) || 0 };
    if (calc?.id) {
      await fetch(`${SUPA_URL}/calculistas?id=eq.${calc.id}`, { method: "PATCH", headers: hdrs(tk), body: JSON.stringify(body) });
    } else {
      await fetch(`${SUPA_URL}/calculistas`, { method: "POST", headers: hdrs(tk), body: JSON.stringify({ ...body, tipo: "externo" }) });
    }
    onGuardar();
    setSaving(false);
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 999, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div style={{ background: "#fff", borderRadius: 14, width: "min(700px, 100%)", maxHeight: "90vh", overflow: "auto" }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid #f0f0f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 800 }}>{calc ? "Editar calculista" : "Nuevo calculista"}</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "#888" }}>✕</button>
        </div>
        <div style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div><span style={S.lbl}>Nombre *</span><input value={form.nombre} onChange={e => setForm(p => ({ ...p, nombre: e.target.value }))} style={S.inp} /></div>
            <div><span style={S.lbl}>Email</span><input value={form.mail} onChange={e => setForm(p => ({ ...p, mail: e.target.value }))} style={S.inp} /></div>
            <div><span style={S.lbl}>WhatsApp</span><input value={form.wsp} onChange={e => setForm(p => ({ ...p, wsp: e.target.value }))} style={S.inp} placeholder="+54 9 11..." /></div>
            <div><span style={S.lbl}>Ciudad / Provincia</span><input value={form.ciudad} onChange={e => setForm(p => ({ ...p, ciudad: e.target.value }))} style={S.inp} /></div>
            <div>
              <span style={S.lbl}>Estado</span>
              <select value={form.estado} onChange={e => setForm(p => ({ ...p, estado: e.target.value }))} style={S.inp}>
                {["postulante", "activo", "pausado", "inactivo"].map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <span style={S.lbl}>Nivel</span>
              <select value={form.nivel} onChange={e => setForm(p => ({ ...p, nivel: e.target.value }))} style={S.inp}>
                <option value="">Seleccionar</option>
                {["Junior", "Semi-senior", "Senior"].map(n => <option key={n}>{n}</option>)}
              </select>
            </div>
          </div>

          <div><span style={S.lbl}>Experiencia</span><textarea value={form.experiencia} onChange={e => setForm(p => ({ ...p, experiencia: e.target.value }))} style={{ ...S.inp, resize: "none" }} rows={2} /></div>
          <div><span style={S.lbl}>Sistemas estructurales</span><input value={form.sistemas} onChange={e => setForm(p => ({ ...p, sistemas: e.target.value }))} style={S.inp} /></div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
            {[["cypecad","CYPECAD"],["autocad","AutoCAD"],["sketchup","SketchUp"]].map(([k, label]) => (
              <div key={k}>
                <span style={S.lbl}>{label}</span>
                <select value={form[k]} onChange={e => setForm(p => ({ ...p, [k]: e.target.value }))} style={S.inp}>
                  <option value="">—</option>
                  {NIVELES_SW.map(n => <option key={n} value={n}>{n === "Experto / uso profesional frecuente" ? "Experto" : n}</option>)}
                </select>
              </div>
            ))}
          </div>

          <div><span style={S.lbl}>Otros softwares</span><input value={form.otros_software} onChange={e => setForm(p => ({ ...p, otros_software: e.target.value }))} style={S.inp} /></div>

          <div>
            <span style={S.lbl}>Disponibilidad</span>
            <select value={form.disponibilidad} onChange={e => setForm(p => ({ ...p, disponibilidad: e.target.value }))} style={S.inp}>
              <option value="">Seleccionar</option>
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

          <div><span style={S.lbl}>Puntaje manual (0-10)</span><input type="number" min="0" max="10" value={form.puntaje} onChange={e => setForm(p => ({ ...p, puntaje: e.target.value }))} style={{ ...S.inp, width: 80 }} /></div>
          <div><span style={S.lbl}>Observaciones</span><textarea value={form.observaciones} onChange={e => setForm(p => ({ ...p, observaciones: e.target.value }))} style={{ ...S.inp, resize: "none" }} rows={3} /></div>
        </div>
        <div style={{ padding: "12px 20px", borderTop: "1px solid #f0f0f0", display: "flex", gap: 8 }}>
          <button onClick={guardar} disabled={saving} style={S.btn}>{saving ? "Guardando…" : "Guardar"}</button>
          <button onClick={onClose} style={S.btnSm}>Cancelar</button>
        </div>
      </div>
    </div>
  );
}

/* ─── Componente principal ─── */
export default function Calculistas() {
  const [calculistas, setCalculistas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [busq, setBusq] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("todos");
  const [ordenar, setOrdenar] = useState("score");
  const [msg, setMsg] = useState("");
  const [showPesos, setShowPesos] = useState(false);
  const [pesos, setPesos] = useState({
    experiencia: 35,
    disponibilidad: 25,
    cypecad: 20,
    factura: 10,
    freelance: 5,
    interior: 10,
  });

  const cargar = useCallback(async () => {
    setLoading(true);
    const tk = await getToken();
    const r = await fetch(`${SUPA_URL}/calculistas?order=nombre.asc`, { headers: hdrs(tk) }).then(r => r.json());
    setCalculistas(Array.isArray(r) ? r : []);
    setLoading(false);
  }, []);

  async function cambiarEstado(id, nuevoEstado) {
    const tk = await getToken();
    await fetch(`${SUPA_URL}/calculistas?id=eq.${id}`, {
      method: "PATCH", headers: hdrs(tk),
      body: JSON.stringify({ estado: nuevoEstado, disponible: nuevoEstado === "activo" })
    });
    setMsg(`✓ Estado actualizado a ${nuevoEstado}`);
    setTimeout(() => setMsg(""), 2000);
    cargar();
  }

  async function toggleDisponible(id, actual) {
    const tk = await getToken();
    await fetch(`${SUPA_URL}/calculistas?id=eq.${id}`, {
      method: "PATCH", headers: hdrs(tk),
      body: JSON.stringify({ disponible: !actual })
    });
    cargar();
  }

  useEffect(() => { cargar(); }, [cargar]);

  function copiarLink(calc) {
    const link = `https://npl-sistema.vercel.app/#postulacion`;
    navigator.clipboard.writeText(link);
    setMsg(`✓ Link copiado — compartí con ${calc.nombre}`);
    setTimeout(() => setMsg(""), 3000);
  }

  // Aplicar score a todos
  const conScore = calculistas.map(c => ({ ...c, _score: calcularScore(c, pesos).score, _notas: calcularScore(c, pesos).notas }));

  // Filtrar
  const filtrados = conScore.filter(c => {
    const okEstado = filtroEstado === "todos" || c.estado === filtroEstado;
    const q = busq.toLowerCase();
    const okBusq = !q || [c.nombre, c.mail, c.ciudad, c.sistemas].some(v => v?.toLowerCase().includes(q));
    return okEstado && okBusq;
  });

  // Ordenar
  const ordenados = [...filtrados].sort((a, b) => {
    if (ordenar === "score") return b._score - a._score;
    if (ordenar === "nombre") return (a.nombre || "").localeCompare(b.nombre || "");
    if (ordenar === "disponibilidad") return (b.disponible ? 1 : 0) - (a.disponible ? 1 : 0);
    return 0;
  });

  const kpis = {
    activos: calculistas.filter(c => c.estado === "activo").length,
    postulantes: calculistas.filter(c => c.estado === "postulante").length,
    disponibles: calculistas.filter(c => c.disponible).length,
    interior: calculistas.filter(c => c.ciudad && !CIUDADES_GBA.some(g => (c.ciudad || "").toLowerCase().includes(g))).length,
  };

  // Top 3 recomendados
  const top3 = [...conScore].filter(c => c.estado === "activo" || c.estado === "postulante")
    .sort((a, b) => b._score - a._score).slice(0, 3);

  return (
    <div style={{ fontFamily: "system-ui, -apple-system, sans-serif", padding: "20px", maxWidth: 1100, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
        <div>
          <p style={{ margin: 0, fontSize: 11, color: "#aaa" }}>NPL · Calculistas</p>
          <h1 style={{ margin: "2px 0 0", fontSize: 20, fontWeight: 800, color: "#111" }}>👷 Calculistas</h1>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => { navigator.clipboard.writeText("https://npl-sistema.vercel.app/#postulacion"); setMsg("✓ Link de postulación copiado"); setTimeout(() => setMsg(""), 3000); }}
            style={{ ...S.btnSm, color: "#6366f1", borderColor: "#6366f1" }}>🔗 Link postulación</button>
          <button onClick={() => setModal("nuevo")} style={S.btn}>+ Nuevo</button>
        </div>
      </div>

      {/* KPIs */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        {[
          { label: "Activos", value: kpis.activos, color: "#1a8a5e" },
          { label: "Postulantes", value: kpis.postulantes, color: "#3b82f6" },
          { label: "Disponibles", value: kpis.disponibles, color: "#f59e0b" },
          { label: "Interior", value: kpis.interior, color: "#6366f1" },
        ].map(k => (
          <div key={k.label} style={{ background: "#fff", border: "1.5px solid #e8e8e8", borderRadius: 10, padding: "8px 14px", minWidth: 80 }}>
            <div style={{ fontSize: 20, fontWeight: 900, color: k.color, fontFamily: "monospace" }}>{k.value}</div>
            <div style={{ fontSize: 10, color: "#aaa", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5 }}>{k.label}</div>
          </div>
        ))}
      </div>

      {/* Top 3 recomendados */}
      {top3.length > 0 && (
        <div style={{ background: "#f0fdf4", border: "1.5px solid #1a8a5e30", borderRadius: 12, padding: "12px 16px", marginBottom: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#1a8a5e", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 10 }}>⭐ Mejores perfiles según algoritmo</div>
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

      {/* Panel de pesos del algoritmo */}
      <div style={{ background: "#fff", border: "1.5px solid #e8e8e8", borderRadius: 12, marginBottom: 14, overflow: "hidden" }}>
        <div onClick={() => setShowPesos(v => !v)} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 16px", cursor: "pointer" }}
          onMouseEnter={e => e.currentTarget.style.background = "#fafafa"}
          onMouseLeave={e => e.currentTarget.style.background = "#fff"}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span>⚙️</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: "#111" }}>Algoritmo de ranking</span>
            <span style={{ fontSize: 11, color: "#aaa" }}>— ajustá los pesos de cada factor</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 11, color: "#888" }}>Total: {Object.values(pesos).reduce((s, v) => s + v, 0)} pts</span>
            <span style={{ color: "#aaa", fontSize: 16, transform: showPesos ? "rotate(180deg)" : "none", transition: "0.2s" }}>⌄</span>
          </div>
        </div>
        {showPesos && (
          <div style={{ borderTop: "1px solid #f0f0f0", padding: "16px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 16 }}>
              {[
                { key: "experiencia", label: "💼 Experiencia", desc: "Nivel técnico declarado" },
                { key: "disponibilidad", label: "🕐 Disponibilidad", desc: "Horas semanales disponibles" },
                { key: "cypecad", label: "💻 CYPECAD", desc: "Dominio del software principal" },
                { key: "factura", label: "🧾 Factura", desc: "Inscripto en monotributo" },
                { key: "freelance", label: "🤝 Freelance", desc: "Experiencia independiente" },
                { key: "interior", label: "🗺 Interior", desc: "Fuera de CABA/GBA" },
              ].map(({ key, label, desc }) => (
                <div key={key}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: "#333" }}>{label}</span>
                    <span style={{ fontSize: 13, fontWeight: 900, color: "#111", fontFamily: "monospace", minWidth: 28, textAlign: "right" }}>{pesos[key]}</span>
                  </div>
                  <div style={{ fontSize: 10, color: "#aaa", marginBottom: 6 }}>{desc}</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <button onClick={() => setPesos(p => ({ ...p, [key]: Math.max(0, p[key] - 5) }))}
                      style={{ width: 24, height: 24, borderRadius: 6, border: "1.5px solid #e0e0e0", background: "#f8f8f8", cursor: "pointer", fontWeight: 700, fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center" }}>−</button>
                    <input type="range" min="0" max="50" step="5" value={pesos[key]}
                      onChange={e => setPesos(p => ({ ...p, [key]: parseInt(e.target.value) }))}
                      style={{ flex: 1, accentColor: "#0a0a0a" }} />
                    <button onClick={() => setPesos(p => ({ ...p, [key]: Math.min(50, p[key] + 5) }))}
                      style={{ width: 24, height: 24, borderRadius: 6, border: "1.5px solid #e0e0e0", background: "#f8f8f8", cursor: "pointer", fontWeight: 700, fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center" }}>+</button>
                  </div>
                  <div style={{ height: 4, background: "#f0f0f0", borderRadius: 2, marginTop: 4, overflow: "hidden" }}>
                    <div style={{ width: `${(pesos[key] / 50) * 100}%`, height: "100%", background: "#0a0a0a", borderRadius: 2 }} />
                  </div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 14, display: "flex", gap: 8, alignItems: "center" }}>
              <button onClick={() => setPesos({ experiencia: 35, disponibilidad: 25, cypecad: 20, factura: 10, freelance: 5, interior: 10 })}
                style={S.btnSm}>↺ Restablecer</button>
              <span style={{ fontSize: 11, color: "#aaa" }}>Los cambios se aplican en tiempo real al ranking</span>
            </div>
          </div>
        )}
      </div>

      {/* Filtros */}
      <div style={{ display: "flex", gap: 6, marginBottom: 14, flexWrap: "wrap", alignItems: "center", background: "#fff", borderRadius: 10, padding: "8px 12px", border: "1.5px solid #e8e8e8" }}>
        {["todos","activo","postulante","pausado","inactivo"].map(e => (
          <button key={e} onClick={() => setFiltroEstado(e)} style={{
            padding: "4px 12px", borderRadius: 7, fontSize: 12, fontWeight: filtroEstado === e ? 700 : 500,
            background: filtroEstado === e ? "#111" : "transparent", color: filtroEstado === e ? "#fff" : "#888",
            border: "none", cursor: "pointer", textTransform: "capitalize",
          }}>{e === "todos" ? `Todos (${calculistas.length})` : e}</button>
        ))}
        <div style={{ width: 1, height: 16, background: "#e0e0e0", margin: "0 4px" }} />
        <select value={ordenar} onChange={e => setOrdenar(e.target.value)} style={{ ...S.inp, width: "auto", fontSize: 11, padding: "4px 8px" }}>
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

      {!loading && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {ordenados.map(c => (
            <CardCalculista key={c.id} calc={c} onClick={() => setModal(c)} onCopiarLink={copiarLink} onCambiarEstado={cambiarEstado} onToggleDisponible={toggleDisponible} />
          ))}
          {ordenados.length === 0 && <div style={{ textAlign: "center", padding: 40, color: "#aaa" }}>Sin resultados</div>}
        </div>
      )}

      {modal && (
        <ModalCalculista
          calc={modal === "nuevo" ? null : modal}
          onClose={() => setModal(null)}
          onGuardar={() => { setModal(null); cargar(); setMsg("✓ Guardado"); setTimeout(() => setMsg(""), 2000); }}
        />
      )}
    </div>
  );
}
