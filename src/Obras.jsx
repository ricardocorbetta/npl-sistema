import React, { useState, useEffect, useCallback, useRef } from "react";

const SUPA_URL = "https://imkmosifqxzbtqgzssst.supabase.co/rest/v1";
const SUPA_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlta21vc2lmcXh6YnRxZ3pzc3N0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkxODk4NTUsImV4cCI6MjA5NDc2NTg1NX0.5gtCs8Yv3vDSrKxAmXSr3zjWJ5HjimCKejfO-XrHPss";
const HDR = { "apikey": SUPA_KEY, "Authorization": `Bearer ${SUPA_KEY}`, "Content-Type": "application/json", "Prefer": "return=representation" };

const SUPA_STORAGE = "https://imkmosifqxzbtqgzssst.supabase.co/storage/v1";

const api = {
  getObras:     ()      => fetch(`${SUPA_URL}/obras?select=*&order=created_at.desc`, { headers: HDR }).then(r => r.json()),
  postObra:     (d)     => fetch(`${SUPA_URL}/obras`, { method: "POST", headers: HDR, body: JSON.stringify(d) }).then(r => r.json()),
  patchObra:    (id, d) => fetch(`${SUPA_URL}/obras?id=eq.${id}`, { method: "PATCH", headers: HDR, body: JSON.stringify(d) }).then(r => r.json()),
  getTareas:    (oid)   => fetch(`${SUPA_URL}/obra_tareas?obra_id=eq.${oid}&order=orden.asc`, { headers: HDR }).then(r => r.json()),
  postTarea:    (d)     => fetch(`${SUPA_URL}/obra_tareas`, { method: "POST", headers: HDR, body: JSON.stringify(d) }).then(r => r.json()),
  patchTarea:   (id, d) => fetch(`${SUPA_URL}/obra_tareas?id=eq.${id}`, { method: "PATCH", headers: HDR, body: JSON.stringify(d) }).then(r => r.json()),
  deleteTarea:  (id)    => fetch(`${SUPA_URL}/obra_tareas?id=eq.${id}`, { method: "DELETE", headers: HDR }),
  getReportes:  (oid)   => fetch(`${SUPA_URL}/obra_reportes?obra_id=eq.${oid}&order=fecha.desc&limit=30`, { headers: HDR }).then(r => r.json()),
  postReporte:  (d)     => fetch(`${SUPA_URL}/obra_reportes`, { method: "POST", headers: HDR, body: JSON.stringify(d) }).then(r => r.json()),
  getRepTareas: (rid)   => fetch(`${SUPA_URL}/reporte_tareas?reporte_id=eq.${rid}`, { headers: HDR }).then(r => r.json()),
  postRepTarea: (d)     => fetch(`${SUPA_URL}/reporte_tareas`, { method: "POST", headers: HDR, body: JSON.stringify(d) }).then(r => r.json()),
};

const uploadFoto = async (file, obraId) => {
  const ext  = file.name.split('.').pop();
  const path = `${obraId}/${Date.now()}.${ext}`;
  const res  = await fetch(`${SUPA_STORAGE}/object/obra-fotos/${path}`, {
    method: "POST",
    headers: { "apikey": SUPA_KEY, "Authorization": `Bearer ${SUPA_KEY}`, "Content-Type": file.type },
    body: file,
  });
  if (!res.ok) return null;
  return `${SUPA_STORAGE}/object/public/obra-fotos/${path}`;
};

const SISTEMAS = ["Steel Frame", "Hormigón", "Madera", "Mixto", "Otro"];
const today    = () => new Date().toISOString().slice(0, 10);
const fmtFecha = (f) => f ? new Date(f + "T12:00:00").toLocaleDateString("es-AR", { day: "2-digit", month: "short" }) : "—";

function ProgBar({ pct, height = 8, color }) {
  const c = pct >= 100 ? "#3B6D11" : color || "#185FA5";
  return (
    <div style={{ background: "#f0f0f0", borderRadius: 99, height, overflow: "hidden" }}>
      <div style={{ width: `${Math.min(pct || 0, 100)}%`, background: c, height, borderRadius: 99, transition: "width .4s" }} />
    </div>
  );
}

// ─── App principal ────────────────────────────────────────────
export default function Obras() {
  const [obras, setObras]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [vista, setVista]       = useState("lista");
  const [selected, setSelected] = useState(null);
  const [tareas, setTareas]     = useState([]);
  const [reportes, setReportes] = useState([]);

  const load = useCallback(async () => {
    setLoading(true);
    const data = await api.getObras();
    setObras(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const abrirObra = async (o) => {
    setSelected(o);
    setVista("detalle");
    const [t, r] = await Promise.all([api.getTareas(o.id), api.getReportes(o.id)]);
    setTareas(t || []);
    setReportes(r || []);
  };

  const onTareaActualizada = (t) => setTareas(prev => prev.map(x => x.id === t.id ? t : x));
  const onTareaAgregada    = (t) => setTareas(prev => [...prev, t]);

  const onReporteGuardado = async () => {
    const [t, r] = await Promise.all([api.getTareas(selected.id), api.getReportes(selected.id)]);
    setTareas(t || []);
    setReportes(r || []);
    setVista("detalle");
  };

  if (vista === "nueva_obra") return <NuevaObra onBack={() => setVista("lista")} onCreada={(o) => { setObras(p => [o, ...p]); abrirObra(o); }} />;
  if (vista === "reporte" && selected) return <Reporte obra={selected} tareas={tareas} onBack={() => setVista("detalle")} onGuardado={onReporteGuardado} />;
  if (vista === "detalle" && selected) return <DetalleObra obra={selected} tareas={tareas} reportes={reportes} onBack={() => { setVista("lista"); setSelected(null); }} onReporte={() => setVista("reporte")} onTareaActualizada={onTareaActualizada} onTareaAgregada={onTareaAgregada} />;

  const activas = obras.filter(o => o.estado === "activo").length;

  return (
    <div style={{ fontFamily: "system-ui, sans-serif", padding: "16px", maxWidth: 600, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div>
          <p style={{ margin: 0, fontSize: 11, color: "#999" }}>NPL · Obras</p>
          <h1 style={{ margin: "2px 0 0", fontSize: 20, fontWeight: 700, color: "#111" }}>Seguimiento de obras</h1>
        </div>
        <button onClick={() => setVista("nueva_obra")} style={{ padding: "10px 16px", fontSize: 13, fontWeight: 700, borderRadius: 10, border: "none", background: "#111", color: "#fff", cursor: "pointer" }}>+ Nueva</button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 20 }}>
        {[["Total", obras.length], ["Activas", activas]].map(([l, v]) => (
          <div key={l} style={{ background: "#f9f9f9", borderRadius: 12, padding: "12px 14px", border: "1px solid #eee" }}>
            <p style={{ margin: 0, fontSize: 12, color: "#888" }}>{l}</p>
            <p style={{ margin: "4px 0 0", fontSize: 24, fontWeight: 700, color: "#111" }}>{loading ? "..." : v}</p>
          </div>
        ))}
      </div>

      {loading && <p style={{ textAlign: "center", padding: 40, color: "#aaa" }}>Cargando...</p>}

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {obras.map(o => (
          <div key={o.id} onClick={() => abrirObra(o)}
            style={{ background: "#fff", border: "1px solid #e5e5e5", borderRadius: 14, padding: "16px", cursor: "pointer", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
              <div>
                <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "#111" }}>{o.nombre}</p>
                {o.comitente && <p style={{ margin: "2px 0 0", fontSize: 12, color: "#888" }}>{o.comitente}</p>}
              </div>
              <span style={{ fontSize: 11, background: o.estado === "activo" ? "#EAF3DE" : "#f5f5f5", color: o.estado === "activo" ? "#3B6D11" : "#888", padding: "3px 10px", borderRadius: 99, fontWeight: 600, height: "fit-content" }}>
                {o.estado === "activo" ? "Activa" : o.estado === "pausada" ? "Pausada" : "Finalizada"}
              </span>
            </div>
            <div style={{ display: "flex", gap: 12, fontSize: 11, color: "#aaa", marginBottom: 8 }}>
              {o.responsable && <span>👷 {o.responsable}</span>}
              {o.sistema && <span>🏗 {o.sistema}</span>}
              {o.superficie && <span>📐 {o.superficie} m²</span>}
            </div>
            {o.fecha_inicio && <p style={{ margin: 0, fontSize: 11, color: "#aaa" }}>📅 Inicio: {fmtFecha(o.fecha_inicio)} {o.fecha_fin_est ? `· Fin est: ${fmtFecha(o.fecha_fin_est)}` : ""}</p>}
          </div>
        ))}
        {!loading && obras.length === 0 && <p style={{ textAlign: "center", padding: 40, color: "#aaa" }}>No hay obras. Creá la primera.</p>}
      </div>
    </div>
  );
}

// ─── Detalle de obra ──────────────────────────────────────────
function DetalleObra({ obra, tareas, reportes, onBack, onReporte, onTareaActualizada, onTareaAgregada }) {
  const [tab, setTab]         = useState("tareas");
  const [agregando, setAgregando] = useState(false);
  const [form, setForm]       = useState({ nombre: "", etapa: "", duracion_dias: "", fecha_inicio_est: "" });
  const [saving, setSaving]   = useState(false);

  const avance = tareas.length > 0 ? Math.round(tareas.reduce((s, t) => s + (t.avance || 0), 0) / tareas.length) : 0;
  const completadas = tareas.filter(t => t.estado === "completada").length;

  const guardarTarea = async () => {
    if (!form.nombre.trim()) return;
    setSaving(true);
    const res = await api.postTarea({ obra_id: obra.id, orden: tareas.length + 1, ...form, duracion_dias: form.duracion_dias || null });
    onTareaAgregada(Array.isArray(res) ? res[0] : res);
    setForm({ nombre: "", etapa: "", duracion_dias: "", fecha_inicio_est: "" });
    setAgregando(false);
    setSaving(false);
  };

  return (
    <div style={{ fontFamily: "system-ui, sans-serif", maxWidth: 600, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ background: "#111", padding: "16px", color: "#fff" }}>
        <button onClick={onBack} style={{ background: "none", border: "none", color: "#aaa", fontSize: 13, cursor: "pointer", padding: 0, marginBottom: 10 }}>← Volver</button>
        <h2 style={{ margin: "0 0 4px", fontSize: 18, fontWeight: 700 }}>{obra.nombre}</h2>
        <p style={{ margin: 0, fontSize: 13, color: "#aaa" }}>{obra.comitente} · {obra.sistema}</p>

        {/* Avance */}
        <div style={{ marginTop: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
            <span style={{ fontSize: 12, color: "#aaa" }}>{completadas}/{tareas.length} tareas completadas</span>
            <span style={{ fontSize: 16, fontWeight: 700, color: avance >= 100 ? "#6fcf97" : "#fff" }}>{avance}%</span>
          </div>
          <ProgBar pct={avance} height={10} color="#6fcf97" />
        </div>
      </div>

      {/* Botón reporte */}
      <div style={{ padding: "14px 16px", background: "#f9f9f9", borderBottom: "1px solid #eee" }}>
        <button onClick={onReporte}
          style={{ width: "100%", padding: "14px", fontSize: 16, fontWeight: 700, borderRadius: 12, border: "none", background: "#185FA5", color: "#fff", cursor: "pointer" }}>
          📋 Cargar reporte del día
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", borderBottom: "1px solid #eee" }}>
        {[["tareas", "Tareas"], ["reportes", `Reportes (${reportes.length})`]].map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)}
            style={{ flex: 1, padding: "12px", fontSize: 14, fontWeight: 600, background: "#fff", color: tab === id ? "#111" : "#aaa", border: "none", borderBottom: tab === id ? "2px solid #111" : "2px solid transparent", cursor: "pointer" }}>
            {label}
          </button>
        ))}
      </div>

      <div style={{ padding: "16px" }}>
        {tab === "tareas" && (
          <div>
            {tareas.map((t, i) => (
              <TareaRow key={t.id} tarea={t} num={i + 1} onActualizar={onTareaActualizada} />
            ))}

            {agregando ? (
              <div style={{ background: "#f9f9f9", border: "1px solid #e5e5e5", borderRadius: 12, padding: 14, marginTop: 10 }}>
                <input value={form.nombre} onChange={e => setForm(p => ({ ...p, nombre: e.target.value }))} placeholder="Nombre de la tarea *"
                  style={{ width: "100%", fontSize: 14, padding: "10px 12px", border: "1px solid #e5e5e5", borderRadius: 10, boxSizing: "border-box", marginBottom: 8 }} />
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 10 }}>
                  <input value={form.etapa} onChange={e => setForm(p => ({ ...p, etapa: e.target.value }))} placeholder="Etapa (ej: Etapa 1)"
                    style={{ fontSize: 13, padding: "8px 10px", border: "1px solid #e5e5e5", borderRadius: 8, width: "100%", boxSizing: "border-box" }} />
                  <input type="number" value={form.duracion_dias} onChange={e => setForm(p => ({ ...p, duracion_dias: e.target.value }))} placeholder="Días estimados"
                    style={{ fontSize: 13, padding: "8px 10px", border: "1px solid #e5e5e5", borderRadius: 8, width: "100%", boxSizing: "border-box" }} />
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={guardarTarea} disabled={saving} style={{ flex: 1, padding: "10px", fontSize: 14, fontWeight: 700, borderRadius: 10, border: "none", background: "#111", color: "#fff", cursor: "pointer" }}>Guardar</button>
                  <button onClick={() => setAgregando(false)} style={{ padding: "10px 16px", fontSize: 14, borderRadius: 10, border: "1px solid #e5e5e5", background: "#fff", color: "#555", cursor: "pointer" }}>Cancelar</button>
                </div>
              </div>
            ) : (
              <button onClick={() => setAgregando(true)} style={{ width: "100%", marginTop: 10, padding: "12px", fontSize: 14, borderRadius: 12, border: "2px dashed #ddd", background: "#fff", color: "#aaa", cursor: "pointer" }}>
                + Agregar tarea
              </button>
            )}
          </div>
        )}

        {tab === "reportes" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {reportes.map(r => <ReporteCard key={r.id} reporte={r} />)}
            {reportes.length === 0 && <p style={{ textAlign: "center", padding: 40, color: "#aaa", fontSize: 14 }}>Aún no hay reportes. Usá el botón de arriba para cargar el primero.</p>}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Fila de tarea ────────────────────────────────────────────
function TareaRow({ tarea, num, onActualizar }) {
  const completada = tarea.estado === "completada";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 0", borderBottom: "1px solid #f5f5f5" }}>
      {/* Check */}
      <div style={{ width: 28, height: 28, borderRadius: "50%", border: `2px solid ${completada ? "#3B6D11" : "#ddd"}`, background: completada ? "#EAF3DE" : "#fff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, cursor: "pointer" }}
        onClick={async () => {
          const nuevo = completada ? "en_curso" : "completada";
          const avance = nuevo === "completada" ? 100 : tarea.avance;
          const res = await api.patchTarea(tarea.id, { estado: nuevo, avance });
          onActualizar(Array.isArray(res) ? res[0] : res);
        }}>
        {completada && <span style={{ fontSize: 14, color: "#3B6D11" }}>✓</span>}
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: completada ? "#aaa" : "#111", textDecoration: completada ? "line-through" : "none", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{tarea.nombre}</p>
        <div style={{ display: "flex", gap: 8, fontSize: 11, color: "#aaa", marginTop: 2 }}>
          {tarea.etapa && <span>{tarea.etapa}</span>}
          {tarea.duracion_dias && <span>⏱ {tarea.duracion_dias}d</span>}
          {tarea.fecha_inicio_est && <span>📅 {fmtFecha(tarea.fecha_inicio_est)}</span>}
        </div>
        {!completada && tarea.avance > 0 && (
          <div style={{ marginTop: 6 }}>
            <ProgBar pct={tarea.avance} height={5} />
          </div>
        )}
      </div>

      {/* % */}
      <span style={{ fontSize: 13, fontWeight: 700, color: completada ? "#3B6D11" : "#185FA5", flexShrink: 0 }}>{tarea.avance || 0}%</span>
    </div>
  );
}

// ─── Reporte del día (mobile-first) ──────────────────────────
function Reporte({ obra, tareas, onBack, onGuardado }) {
  const [saving, setSaving]   = useState(false);
  const [paso, setPaso]       = useState(0); // 0=info, 1=tareas, 2=confirmacion
  const [info, setInfo]       = useState({ fecha: today(), responsable: obra.responsable || "", clima: "", personal: "", resumen: "" });
  const [avances, setAvances] = useState(
    tareas.filter(t => t.estado !== "completada").map(t => ({
      tarea_id: t.id, nombre: t.nombre, avance_actual: t.avance || 0,
      avance_dia: 0, completada: false, obs: "", foto_url: "", foto_file: null,
    }))
  );

  const CLIMAS = ["☀️ Soleado", "⛅ Nublado", "🌧 Lluvioso", "💨 Viento fuerte", "🥶 Frío extremo"];

  const setAvance = (idx, k, v) => setAvances(prev => prev.map((a, i) => i === idx ? { ...a, [k]: v } : a));

  const guardar = async () => {
    setSaving(true);
    try {
      const rep = await api.postReporte({ obra_id: obra.id, ...info, personal: info.personal || null });
      const repData = Array.isArray(rep) ? rep[0] : rep;

      for (const a of avances) {
        if (a.completada || a.avance_dia > 0 || a.obs) {
          let foto_url = a.foto_url;
          if (a.foto_file) foto_url = await uploadFoto(a.foto_file, obra.id) || "";
          const nuevo_acum = a.completada ? 100 : Math.min((a.avance_actual || 0) + (a.avance_dia || 0), 100);
          await api.postRepTarea({ reporte_id: repData.id, tarea_id: a.tarea_id, avance_dia: a.avance_dia || 0, avance_acum: nuevo_acum, obs: a.obs, foto_url });
          await api.patchTarea(a.tarea_id, { avance: nuevo_acum, estado: nuevo_acum >= 100 ? "completada" : "en_curso" });
        }
      }
      onGuardado();
    } catch (e) { alert("Error al guardar: " + e.message); }
    setSaving(false);
  };

  const inp = { width: "100%", fontSize: 15, padding: "12px 14px", border: "1px solid #e5e5e5", borderRadius: 12, boxSizing: "border-box", background: "#fff" };

  // PASO 0 — Info del día
  if (paso === 0) return (
    <div style={{ fontFamily: "system-ui, sans-serif", maxWidth: 500, margin: "0 auto", padding: 16 }}>
      <button onClick={onBack} style={{ background: "none", border: "none", color: "#aaa", fontSize: 13, cursor: "pointer", padding: "0 0 16px" }}>← Volver</button>
      <h2 style={{ margin: "0 0 4px", fontSize: 20, fontWeight: 700, color: "#111" }}>Reporte del día</h2>
      <p style={{ margin: "0 0 24px", fontSize: 13, color: "#888" }}>{obra.nombre}</p>

      <div style={{ marginBottom: 16 }}>
        <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#555", marginBottom: 6 }}>Fecha</label>
        <input type="date" style={inp} value={info.fecha} onChange={e => setInfo(p => ({ ...p, fecha: e.target.value }))} />
      </div>

      <div style={{ marginBottom: 16 }}>
        <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#555", marginBottom: 6 }}>Responsable</label>
        <input style={inp} value={info.responsable} onChange={e => setInfo(p => ({ ...p, responsable: e.target.value }))} placeholder="Tu nombre" />
      </div>

      <div style={{ marginBottom: 16 }}>
        <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#555", marginBottom: 8 }}>Clima</label>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          {CLIMAS.map(c => (
            <button key={c} onClick={() => setInfo(p => ({ ...p, clima: c }))}
              style={{ padding: "10px 8px", fontSize: 13, borderRadius: 10, border: `2px solid ${info.clima === c ? "#111" : "#e5e5e5"}`, background: info.clima === c ? "#111" : "#fff", color: info.clima === c ? "#fff" : "#333", cursor: "pointer", fontWeight: info.clima === c ? 700 : 400 }}>
              {c}
            </button>
          ))}
        </div>
      </div>

      <div style={{ marginBottom: 16 }}>
        <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#555", marginBottom: 6 }}>Personal en obra</label>
        <input type="number" style={inp} value={info.personal} onChange={e => setInfo(p => ({ ...p, personal: e.target.value }))} placeholder="ej: 4" />
      </div>

      <button onClick={() => setPaso(1)}
        style={{ width: "100%", padding: "16px", fontSize: 16, fontWeight: 700, borderRadius: 12, border: "none", background: "#111", color: "#fff", cursor: "pointer", marginTop: 8 }}>
        Siguiente → Registrar avance
      </button>
    </div>
  );

  // PASO 1 — Avance por tarea
  if (paso === 1) return (
    <div style={{ fontFamily: "system-ui, sans-serif", maxWidth: 500, margin: "0 auto", padding: 16 }}>
      <button onClick={() => setPaso(0)} style={{ background: "none", border: "none", color: "#aaa", fontSize: 13, cursor: "pointer", padding: "0 0 16px" }}>← Volver</button>
      <h2 style={{ margin: "0 0 4px", fontSize: 20, fontWeight: 700, color: "#111" }}>¿Qué se hizo hoy?</h2>
      <p style={{ margin: "0 0 24px", fontSize: 13, color: "#888" }}>Tocá ✓ si la tarea está completa o mové el slider</p>

      {avances.length === 0 && <p style={{ color: "#aaa", textAlign: "center", padding: 40 }}>Todas las tareas están completadas 🎉</p>}

      {avances.map((a, idx) => (
        <TareaReporte key={a.tarea_id} a={a} idx={idx} obraId={obra.id} setAvance={setAvance} />
      ))}

      <button onClick={() => setPaso(2)}
        style={{ width: "100%", padding: "16px", fontSize: 16, fontWeight: 700, borderRadius: 12, border: "none", background: "#111", color: "#fff", cursor: "pointer", marginTop: 16 }}>
        Siguiente → Confirmar
      </button>
    </div>
  );

  // PASO 2 — Confirmación
  return (
    <div style={{ fontFamily: "system-ui, sans-serif", maxWidth: 500, margin: "0 auto", padding: 16 }}>
      <button onClick={() => setPaso(1)} style={{ background: "none", border: "none", color: "#aaa", fontSize: 13, cursor: "pointer", padding: "0 0 16px" }}>← Volver</button>
      <h2 style={{ margin: "0 0 4px", fontSize: 20, fontWeight: 700, color: "#111" }}>Confirmar reporte</h2>
      <p style={{ margin: "0 0 24px", fontSize: 13, color: "#888" }}>{info.fecha} · {info.responsable}</p>

      <div style={{ background: "#f9f9f9", borderRadius: 12, padding: 16, marginBottom: 20 }}>
        {avances.filter(a => a.completada || a.avance_dia > 0).map(a => (
          <div key={a.tarea_id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid #eee" }}>
            <span style={{ fontSize: 14, color: "#333" }}>{a.nombre}</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: a.completada ? "#3B6D11" : "#185FA5" }}>
              {a.completada ? "✓ Completada" : `+${a.avance_dia}%`}
            </span>
          </div>
        ))}
        {avances.filter(a => a.completada || a.avance_dia > 0).length === 0 && (
          <p style={{ color: "#aaa", fontSize: 13, textAlign: "center" }}>No registraste avance en ninguna tarea.</p>
        )}
      </div>

      <button onClick={guardar} disabled={saving}
        style={{ width: "100%", padding: "16px", fontSize: 16, fontWeight: 700, borderRadius: 12, border: "none", background: saving ? "#aaa" : "#3B6D11", color: "#fff", cursor: saving ? "not-allowed" : "pointer" }}>
        {saving ? "Guardando..." : "✓ Guardar reporte"}
      </button>
    </div>
  );
}

// ─── Tarea en el reporte ──────────────────────────────────────
function TareaReporte({ a, idx, obraId, setAvance }) {
  const fileRef = useRef();
  const [fotoPreview, setFotoPreview] = useState(null);

  const onFoto = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setAvance(idx, "foto_file", file);
    setFotoPreview(URL.createObjectURL(file));
  };

  return (
    <div style={{ background: "#fff", border: `2px solid ${a.completada ? "#3B6D11" : "#e5e5e5"}`, borderRadius: 14, padding: "14px", marginBottom: 12 }}>
      {/* Nombre + check */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: a.completada ? "#3B6D11" : "#111", flex: 1, textDecoration: a.completada ? "line-through" : "none" }}>{a.nombre}</p>
        <button onClick={() => setAvance(idx, "completada", !a.completada)}
          style={{ width: 36, height: 36, borderRadius: "50%", border: `2px solid ${a.completada ? "#3B6D11" : "#ddd"}`, background: a.completada ? "#3B6D11" : "#fff", color: "#fff", fontSize: 18, cursor: "pointer", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
          {a.completada ? "✓" : ""}
        </button>
      </div>

      {!a.completada && (
        <>
          {/* Slider avance */}
          <div style={{ marginBottom: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#888", marginBottom: 6 }}>
              <span>Avance acumulado: {a.avance_actual}%</span>
              <span style={{ color: "#185FA5", fontWeight: 700 }}>+{a.avance_dia}% hoy</span>
            </div>
            <input type="range" min={0} max={100 - a.avance_actual} step={5} value={a.avance_dia}
              onChange={e => setAvance(idx, "avance_dia", Number(e.target.value))}
              style={{ width: "100%", accentColor: "#185FA5", height: 6 }} />
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#aaa" }}>
              <span>0%</span><span>{100 - a.avance_actual}% máx</span>
            </div>
          </div>

          {/* Nota */}
          <input value={a.obs} onChange={e => setAvance(idx, "obs", e.target.value)}
            placeholder="Nota rápida (opcional)..."
            style={{ width: "100%", fontSize: 14, padding: "10px 12px", border: "1px solid #e5e5e5", borderRadius: 10, boxSizing: "border-box", marginBottom: 10 }} />
        </>
      )}

      {/* Foto */}
      <div>
        <input ref={fileRef} type="file" accept="image/*" capture="environment" style={{ display: "none" }} onChange={onFoto} />
        {fotoPreview ? (
          <div style={{ position: "relative" }}>
            <img src={fotoPreview} alt="foto" style={{ width: "100%", borderRadius: 10, maxHeight: 200, objectFit: "cover" }} />
            <button onClick={() => { setFotoPreview(null); setAvance(idx, "foto_file", null); }}
              style={{ position: "absolute", top: 6, right: 6, background: "rgba(0,0,0,0.6)", border: "none", borderRadius: "50%", color: "#fff", width: 28, height: 28, cursor: "pointer", fontSize: 14 }}>✕</button>
          </div>
        ) : (
          <button onClick={() => fileRef.current.click()}
            style={{ width: "100%", padding: "10px", fontSize: 13, borderRadius: 10, border: "1px dashed #ccc", background: "#f9f9f9", color: "#888", cursor: "pointer" }}>
            📷 Sacar foto
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Card de reporte ──────────────────────────────────────────
function ReporteCard({ reporte }) {
  const [expanded, setExpanded]   = useState(false);
  const [repTareas, setRepTareas] = useState([]);

  const cargar = async () => {
    if (expanded) { setExpanded(false); return; }
    const data = await api.getRepTareas(reporte.id);
    setRepTareas(data || []);
    setExpanded(true);
  };

  return (
    <div style={{ background: "#fff", border: "1px solid #e5e5e5", borderRadius: 12, overflow: "hidden" }}>
      <div onClick={cargar} style={{ padding: "14px 16px", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "#111" }}>📅 {reporte.fecha}</p>
          <div style={{ display: "flex", gap: 10, fontSize: 12, color: "#aaa", marginTop: 3 }}>
            {reporte.responsable && <span>👷 {reporte.responsable}</span>}
            {reporte.clima && <span>{reporte.clima}</span>}
            {reporte.personal && <span>👥 {reporte.personal} personas</span>}
          </div>
          {reporte.resumen && <p style={{ margin: "4px 0 0", fontSize: 13, color: "#555" }}>{reporte.resumen}</p>}
        </div>
        <span style={{ fontSize: 18, color: "#aaa" }}>{expanded ? "▲" : "▼"}</span>
      </div>
      {expanded && (
        <div style={{ borderTop: "1px solid #f0f0f0", padding: "12px 16px", background: "#f9f9f9" }}>
          {repTareas.map(rt => (
            <div key={rt.id} style={{ marginBottom: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14 }}>
                <span style={{ color: "#333", fontWeight: 500 }}>{rt.nombre || "Tarea"}</span>
                <span style={{ color: rt.avance_acum >= 100 ? "#3B6D11" : "#185FA5", fontWeight: 700 }}>
                  {rt.avance_acum >= 100 ? "✓ Completada" : `+${rt.avance_dia}% → ${rt.avance_acum}%`}
                </span>
              </div>
              {rt.obs && <p style={{ margin: "3px 0 0", fontSize: 12, color: "#888" }}>{rt.obs}</p>}
              {rt.foto_url && <img src={rt.foto_url} alt="foto" style={{ marginTop: 6, width: "100%", borderRadius: 8, maxHeight: 160, objectFit: "cover" }} />}
            </div>
          ))}
          {repTareas.length === 0 && <p style={{ color: "#aaa", fontSize: 13 }}>Sin detalle de tareas.</p>}
        </div>
      )}
    </div>
  );
}

// ─── Nueva obra ───────────────────────────────────────────────
function NuevaObra({ onBack, onCreada }) {
  const [saving, setSaving] = useState(false);
  const [f, setF] = useState({ nombre: "", comitente: "", responsable: "", sistema: "Steel Frame", superficie: "", fecha_inicio: today(), fecha_fin_est: "", obs: "" });
  const set = (k, v) => setF(p => ({ ...p, [k]: v }));
  const inp = { width: "100%", fontSize: 15, padding: "12px 14px", border: "1px solid #e5e5e5", borderRadius: 12, boxSizing: "border-box", background: "#fff", marginBottom: 14 };

  const guardar = async () => {
    if (!f.nombre.trim()) return alert("El nombre es obligatorio");
    setSaving(true);
    try {
      const res = await api.postObra({ ...f, superficie: f.superficie || null });
      onCreada(Array.isArray(res) ? res[0] : res);
    } catch (e) { alert("Error: " + e.message); }
    setSaving(false);
  };

  return (
    <div style={{ fontFamily: "system-ui, sans-serif", maxWidth: 500, margin: "0 auto", padding: 16 }}>
      <button onClick={onBack} style={{ background: "none", border: "none", color: "#aaa", fontSize: 13, cursor: "pointer", padding: "0 0 16px" }}>← Volver</button>
      <h2 style={{ margin: "0 0 20px", fontSize: 20, fontWeight: 700, color: "#111" }}>Nueva obra</h2>

      <label style={{ fontSize: 13, fontWeight: 600, color: "#555" }}>Nombre de la obra *</label>
      <input style={inp} value={f.nombre} onChange={e => set("nombre", e.target.value)} placeholder="ej: Vivienda Abasto Steel Frame" />

      <label style={{ fontSize: 13, fontWeight: 600, color: "#555" }}>Comitente</label>
      <input style={inp} value={f.comitente} onChange={e => set("comitente", e.target.value)} placeholder="Cliente o estudio" />

      <label style={{ fontSize: 13, fontWeight: 600, color: "#555" }}>Responsable de obra</label>
      <input style={inp} value={f.responsable} onChange={e => set("responsable", e.target.value)} placeholder="Jefe de obra" />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <div>
          <label style={{ fontSize: 13, fontWeight: 600, color: "#555" }}>Sistema</label>
          <select style={{ ...inp, marginTop: 4 }} value={f.sistema} onChange={e => set("sistema", e.target.value)}>{SISTEMAS.map(s => <option key={s}>{s}</option>)}</select>
        </div>
        <div>
          <label style={{ fontSize: 13, fontWeight: 600, color: "#555" }}>Superficie m²</label>
          <input type="number" style={{ ...inp, marginTop: 4 }} value={f.superficie} onChange={e => set("superficie", e.target.value)} placeholder="155" />
        </div>
        <div>
          <label style={{ fontSize: 13, fontWeight: 600, color: "#555" }}>Fecha inicio</label>
          <input type="date" style={{ ...inp, marginTop: 4 }} value={f.fecha_inicio} onChange={e => set("fecha_inicio", e.target.value)} />
        </div>
        <div>
          <label style={{ fontSize: 13, fontWeight: 600, color: "#555" }}>Fecha fin est.</label>
          <input type="date" style={{ ...inp, marginTop: 4 }} value={f.fecha_fin_est} onChange={e => set("fecha_fin_est", e.target.value)} />
        </div>
      </div>

      <button onClick={guardar} disabled={saving}
        style={{ width: "100%", padding: "16px", fontSize: 16, fontWeight: 700, borderRadius: 12, border: "none", background: saving ? "#aaa" : "#111", color: "#fff", cursor: saving ? "not-allowed" : "pointer", marginTop: 8 }}>
        {saving ? "Guardando..." : "Crear obra"}
      </button>
    </div>
  );
}
