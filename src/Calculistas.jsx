import React, { useEffect, useState } from "react";
import { supabase } from "./supabase.js";
import { COLORS, shared, SectionHeader, KpiGrid, Badge, FilterBar, EmptyState, Toast } from "./uiKit.jsx";

const SUPA_URL = "https://imkmosifqxzbtqgzssst.supabase.co/rest/v1";
const ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlta21vc2lmcXh6YnRxZ3pzc3N0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkxODk4NTUsImV4cCI6MjA5NDc2NTg1NX0.5gtCs8Yv3vDSrKxAmXSr3zjWJ5HjimCKejfO-XrHPss";

async function getToken() {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token || ANON_KEY;
}
function hdrs(tk) {
  return { apikey: ANON_KEY, Authorization: `Bearer ${tk}`, "Content-Type": "application/json", Prefer: "return=representation" };
}

const NIVEL_COLOR = { Senior: COLORS.accent, Semi: COLORS.warning, Junior: COLORS.success };
const TIPO_COLOR  = { interno: COLORS.text, externo: COLORS.info };

/* ─── Modal crear/editar ─── */
function ModalCalculista({ calc, onClose, onGuardar }) {
  const esNuevo = !calc?.id;
  const [form, setForm] = useState({
    nombre: calc?.nombre || "",
    nivel: calc?.nivel || "Junior",
    tipo: calc?.tipo || "externo",
    ciudad: calc?.ciudad || "",
    mail: calc?.mail || "",
    wsp: calc?.wsp || "",
    disponible: calc?.disponible ?? true,
    disponibilidad: calc?.disponibilidad || "",
    freelance: calc?.freelance ?? false,
    factura: calc?.factura ?? false,
    puntaje: calc?.puntaje || 0,
    sistemas: calc?.sistemas || "",
    observaciones: calc?.observaciones || "",
    experiencia: calc?.experiencia || "",
  });
  const [saving, setSaving] = useState(false);

  async function guardar() {
    setSaving(true);
    const tk = await getToken();
    if (esNuevo) {
      await fetch(`${SUPA_URL}/calculistas`, { method: "POST", headers: hdrs(tk), body: JSON.stringify(form) });
    } else {
      await fetch(`${SUPA_URL}/calculistas?id=eq.${calc.id}`, { method: "PATCH", headers: hdrs(tk), body: JSON.stringify(form) });
    }
    await onGuardar();
    setSaving(false);
  }

  const F = ({ lbl, children }) => (
    <div style={{ marginBottom: 12 }}>
      <span style={shared.lbl}>{lbl}</span>
      {children}
    </div>
  );

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 16 }}>
      <div style={{ background: COLORS.bgCard, borderRadius: 16, padding: 28, width: "100%", maxWidth: 520, maxHeight: "90vh", overflowY: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
          <h3 style={{ margin: 0, fontSize: 17 }}>{esNuevo ? "Nuevo calculista" : "Editar calculista"}</h3>
          <button onClick={onClose} style={{ ...shared.btnSm, padding: "5px 10px" }}>✕</button>
        </div>

        <F lbl="Nombre *"><input value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} style={shared.inp} placeholder="Nombre completo" /></F>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
          <div>
            <span style={shared.lbl}>Nivel</span>
            <select value={form.nivel} onChange={e => setForm(f => ({ ...f, nivel: e.target.value }))} style={shared.inp}>
              {["Junior", "Semi", "Senior"].map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
          <div>
            <span style={shared.lbl}>Tipo</span>
            <select value={form.tipo} onChange={e => setForm(f => ({ ...f, tipo: e.target.value }))} style={shared.inp}>
              <option value="interno">Interno</option>
              <option value="externo">Externo</option>
            </select>
          </div>
          <div>
            <span style={shared.lbl}>Ciudad</span>
            <input value={form.ciudad} onChange={e => setForm(f => ({ ...f, ciudad: e.target.value }))} style={shared.inp} placeholder="Ciudad" />
          </div>
          <div>
            <span style={shared.lbl}>Puntaje (0–10)</span>
            <input type="number" min="0" max="10" value={form.puntaje} onChange={e => setForm(f => ({ ...f, puntaje: parseInt(e.target.value) || 0 }))} style={shared.inp} />
          </div>
          <div>
            <span style={shared.lbl}>Mail</span>
            <input type="email" value={form.mail} onChange={e => setForm(f => ({ ...f, mail: e.target.value }))} style={shared.inp} placeholder="mail@ejemplo.com" />
          </div>
          <div>
            <span style={shared.lbl}>WhatsApp</span>
            <input value={form.wsp} onChange={e => setForm(f => ({ ...f, wsp: e.target.value }))} style={shared.inp} placeholder="+54 9 ..." />
          </div>
        </div>

        <F lbl="Disponibilidad / notas">
          <input value={form.disponibilidad} onChange={e => setForm(f => ({ ...f, disponibilidad: e.target.value }))} style={shared.inp} placeholder="Ej: Lunes a viernes tarde" />
        </F>

        <F lbl="Software">
          <input value={form.sistemas} onChange={e => setForm(f => ({ ...f, sistemas: e.target.value }))} style={shared.inp} placeholder="CypeCad, AutoCad, SketchUp..." />
        </F>

        <F lbl="Experiencia">
          <textarea value={form.experiencia} onChange={e => setForm(f => ({ ...f, experiencia: e.target.value }))} rows={3} style={{ ...shared.inp, resize: "vertical" }} placeholder="Descripción de experiencia..." />
        </F>

        <F lbl="Observaciones">
          <textarea value={form.observaciones} onChange={e => setForm(f => ({ ...f, observaciones: e.target.value }))} rows={2} style={{ ...shared.inp, resize: "vertical" }} />
        </F>

        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 20 }}>
          {[
            { key: "disponible", label: "✅ Disponible" },
            { key: "freelance",  label: "💼 Freelance" },
            { key: "factura",    label: "🧾 Factura" },
          ].map(f => (
            <label key={f.key} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, cursor: "pointer" }}>
              <input type="checkbox" checked={form[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.checked }))} style={{ width: 16, height: 16 }} />
              {f.label}
            </label>
          ))}
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={guardar} disabled={saving || !form.nombre} style={{ ...shared.btn, flex: 1 }}>{saving ? "Guardando…" : "Guardar"}</button>
          <button onClick={onClose} style={{ ...shared.btnSm, flex: 1, padding: "10px" }}>Cancelar</button>
        </div>
      </div>
    </div>
  );
}

/* ─── Card calculista ─── */
function CardCalculista({ calc, onClick }) {
  const nivelColor = NIVEL_COLOR[calc.nivel] || COLORS.textMuted;
  const estrellas = Math.round((calc.puntaje || 0) / 2);

  return (
    <div onClick={onClick} style={{ ...shared.card, cursor: "pointer", borderTop: `4px solid ${nivelColor}`, transition: "box-shadow .15s" }}
      onMouseEnter={e => e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,.12)"}
      onMouseLeave={e => e.currentTarget.style.boxShadow = "0 1px 6px rgba(0,0,0,.07)"}>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 15, color: COLORS.text }}>{calc.nombre}</div>
          <div style={{ fontSize: 12, color: COLORS.textMuted, marginTop: 2 }}>{calc.ciudad || "—"}</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
          <Badge color={nivelColor} label={calc.nivel} />
          <Badge color={TIPO_COLOR[calc.tipo] || COLORS.textMuted} label={calc.tipo} />
        </div>
      </div>

      {calc.puntaje > 0 && (
        <div style={{ fontSize: 14, marginBottom: 8, color: COLORS.warning }}>
          {"★".repeat(estrellas)}{"☆".repeat(5 - estrellas)}
          <span style={{ fontSize: 11, color: COLORS.textMuted, marginLeft: 6 }}>{calc.puntaje}/10</span>
        </div>
      )}

      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
        <Badge color={calc.disponible ? COLORS.success : COLORS.danger} label={calc.disponible ? "Disponible" : "No disponible"} icon={calc.disponible ? "✅" : "❌"} />
        {calc.freelance && <Badge color={COLORS.accent} label="Freelance" icon="💼" />}
        {calc.factura   && <Badge color={COLORS.warning} label="Factura" icon="🧾" />}
      </div>

      {calc.sistemas && (
        <div style={{ fontSize: 12, color: COLORS.textSoft, marginBottom: 6 }}>
          💻 {calc.sistemas}
        </div>
      )}

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        {calc.mail && (
          <a href={`mailto:${calc.mail}`} onClick={e => e.stopPropagation()} style={{ fontSize: 12, color: COLORS.accent, textDecoration: "none" }}>
            ✉️ {calc.mail}
          </a>
        )}
        {calc.wsp && (
          <a href={`https://wa.me/${calc.wsp.replace(/\D/g, "")}`} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()} style={{ fontSize: 12, color: COLORS.success, textDecoration: "none" }}>
            💬 WhatsApp
          </a>
        )}
      </div>
    </div>
  );
}

/* ─── Principal ─── */
export default function Calculistas() {
  const [calculistas, setCalculistas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [busqueda, setBusqueda] = useState("");
  const [filtroNivel, setFiltroNivel] = useState("");
  const [filtroTipo, setFiltroTipo] = useState("");
  const [filtroDisp, setFiltroDisp] = useState("");
  const [msg, setMsg] = useState("");

  useEffect(() => { cargar(); }, []);

  async function cargar() {
    setLoading(true);
    const tk = await getToken();
    const r = await fetch(`${SUPA_URL}/calculistas?order=nombre.asc`, { headers: hdrs(tk) }).then(r => r.json());
    setCalculistas(Array.isArray(r) ? r : []);
    setLoading(false);
  }

  async function eliminar(id) {
    if (!confirm("¿Eliminar calculista?")) return;
    const tk = await getToken();
    await fetch(`${SUPA_URL}/calculistas?id=eq.${id}`, { method: "DELETE", headers: hdrs(tk) });
    setMsg("Eliminado"); setTimeout(() => setMsg(""), 2000);
    await cargar();
  }

  const filtrados = calculistas.filter(c => {
    const q = busqueda.toLowerCase();
    const matchQ = !q || c.nombre?.toLowerCase().includes(q) || c.ciudad?.toLowerCase().includes(q) || c.mail?.toLowerCase().includes(q);
    const matchN = !filtroNivel || c.nivel === filtroNivel;
    const matchT = !filtroTipo  || c.tipo  === filtroTipo;
    const matchD = !filtroDisp  || (filtroDisp === "si" ? c.disponible : !c.disponible);
    return matchQ && matchN && matchT && matchD;
  });

  const total       = calculistas.length;
  const disponibles = calculistas.filter(c => c.disponible).length;
  const seniors     = calculistas.filter(c => c.nivel === "Senior").length;
  const externos    = calculistas.filter(c => c.tipo === "externo").length;

  return (
    <div style={{ ...shared.page, maxWidth: 1200 }}>
      <SectionHeader icon="👷" title="Calculistas" action={{ label: "+ Nuevo calculista", onClick: () => setModal("nuevo") }} />

      {msg && <Toast texto={msg} />}

      <KpiGrid items={[
        { label: "Total",       value: total,       color: COLORS.accent },
        { label: "Disponibles", value: disponibles, color: COLORS.success },
        { label: "Seniors",     value: seniors,      color: COLORS.warning },
        { label: "Externos",    value: externos,     color: COLORS.info },
      ]} />

      <FilterBar resultCount={`${filtrados.length} de ${total}`}>
        <input value={busqueda} onChange={e => setBusqueda(e.target.value)} placeholder="🔍 Buscar…" style={{ ...shared.inp, width: 220 }} />
        {[
          { val: filtroNivel, set: setFiltroNivel, opts: ["", "Junior", "Semi", "Senior"], placeholder: "Nivel" },
          { val: filtroTipo,  set: setFiltroTipo,  opts: ["", "interno", "externo"], placeholder: "Tipo" },
          { val: filtroDisp,  set: setFiltroDisp,  opts: ["", "si", "no"], placeholder: "Disponibilidad" },
        ].map((f, i) => (
          <select key={i} value={f.val} onChange={e => f.set(e.target.value)} style={{ ...shared.inp, width: 150 }}>
            {f.opts.map(o => <option key={o} value={o}>{o || f.placeholder}</option>)}
          </select>
        ))}
        {(busqueda || filtroNivel || filtroTipo || filtroDisp) && (
          <button onClick={() => { setBusqueda(""); setFiltroNivel(""); setFiltroTipo(""); setFiltroDisp(""); }} style={shared.btnSm}>✕ Limpiar</button>
        )}
      </FilterBar>

      {loading ? (
        <p style={{ color: COLORS.textFaint }}>Cargando…</p>
      ) : filtrados.length === 0 ? (
        <EmptyState message="No hay resultados con esos filtros." />
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16 }}>
          {filtrados.map(c => (
            <div key={c.id} style={{ position: "relative" }}>
              <CardCalculista calc={c} onClick={() => setModal(c)} />
              <button onClick={e => { e.stopPropagation(); eliminar(c.id); }}
                style={{ position: "absolute", top: 12, right: 12, background: "none", border: "none", cursor: "pointer", fontSize: 16, color: "#ccc", lineHeight: 1 }}
                title="Eliminar">🗑</button>
            </div>
          ))}
        </div>
      )}

      {modal && (
        <ModalCalculista
          calc={modal === "nuevo" ? null : modal}
          onClose={() => setModal(null)}
          onGuardar={async () => { setModal(null); setMsg("✓ Guardado"); setTimeout(() => setMsg(""), 2000); await cargar(); }}
        />
      )}
    </div>
  );
}
