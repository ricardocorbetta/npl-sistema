import React, { useState, useEffect, useCallback } from "react";

const SUPA_URL = "https://imkmosifqxzbtqgzssst.supabase.co/rest/v1";
const SUPA_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlta21vc2lmcXh6YnRxZ3pzc3N0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkxODk4NTUsImV4cCI6MjA5NDc2NTg1NX0.5gtCs8Yv3vDSrKxAmXSr3zjWJ5HjimCKejfO-XrHPss";
const HDR = { "apikey": SUPA_KEY, "Authorization": `Bearer ${SUPA_KEY}`, "Content-Type": "application/json", "Prefer": "return=representation" };

const api = {
  getObras:      ()      => fetch(`${SUPA_URL}/obras?select=*&order=created_at.desc`, { headers: HDR }).then(r => r.json()),
  postObra:      (d)     => fetch(`${SUPA_URL}/obras`, { method: "POST", headers: HDR, body: JSON.stringify(d) }).then(r => r.json()),
  patchObra:     (id, d) => fetch(`${SUPA_URL}/obras?id=eq.${id}`, { method: "PATCH", headers: HDR, body: JSON.stringify(d) }).then(r => r.json()),
  getTareas:     (oid)   => fetch(`${SUPA_URL}/obra_tareas?obra_id=eq.${oid}&order=orden.asc`, { headers: HDR }).then(r => r.json()),
  postTarea:     (d)     => fetch(`${SUPA_URL}/obra_tareas`, { method: "POST", headers: HDR, body: JSON.stringify(d) }).then(r => r.json()),
  patchTarea:    (id, d) => fetch(`${SUPA_URL}/obra_tareas?id=eq.${id}`, { method: "PATCH", headers: HDR, body: JSON.stringify(d) }).then(r => r.json()),
  deleteTarea:   (id)    => fetch(`${SUPA_URL}/obra_tareas?id=eq.${id}`, { method: "DELETE", headers: HDR }),
  getReportes:   (oid)   => fetch(`${SUPA_URL}/obra_reportes?obra_id=eq.${oid}&order=fecha.desc&limit=30`, { headers: HDR }).then(r => r.json()),
  postReporte:   (d)     => fetch(`${SUPA_URL}/obra_reportes`, { method: "POST", headers: HDR, body: JSON.stringify(d) }).then(r => r.json()),
  getRepTareas:  (rid)   => fetch(`${SUPA_URL}/reporte_tareas?reporte_id=eq.${rid}`, { headers: HDR }).then(r => r.json()),
  postRepTarea:  (d)     => fetch(`${SUPA_URL}/reporte_tareas`, { method: "POST", headers: HDR, body: JSON.stringify(d) }).then(r => r.json()),
  patchRepTarea: (id, d) => fetch(`${SUPA_URL}/reporte_tareas?id=eq.${id}`, { method: "PATCH", headers: HDR, body: JSON.stringify(d) }).then(r => r.json()),
};

const SISTEMAS = ["Steel Frame", "Hormigón", "Madera", "Mixto", "Otro"];
const CLIMAS   = ["Soleado", "Nublado", "Lluvioso", "Viento fuerte", "Frío extremo"];
const ESTADOS_OBRA  = [
  { id: "activo",    label: "Activa",    color: "#185FA5", bg: "#E6F1FB" },
  { id: "pausada",   label: "Pausada",   color: "#854F0B", bg: "#FAEEDA" },
  { id: "finalizada",label: "Finalizada",color: "#3B6D11", bg: "#EAF3DE" },
];
const ESTADOS_TAREA = [
  { id: "pendiente",  label: "Pendiente",  color: "#888",    bg: "#f5f5f5" },
  { id: "en_curso",   label: "En curso",   color: "#185FA5", bg: "#E6F1FB" },
  { id: "completada", label: "Completada", color: "#3B6D11", bg: "#EAF3DE" },
];

const inp = { width: "100%", fontSize: 14, padding: "8px 12px", border: "1px solid #e5e5e5", borderRadius: 10, boxSizing: "border-box", background: "#fff" };

function Badge({ id, arr }) {
  const e = arr.find(x => x.id === id) || arr[0];
  return <span style={{ background: e.bg, color: e.color, fontSize: 11, fontWeight: 600, padding: "2px 10px", borderRadius: 99 }}>{e.label}</span>;
}

function ProgBar({ pct, color }) {
  return (
    <div style={{ background: "#f0f0f0", borderRadius: 99, height: 8, overflow: "hidden" }}>
      <div style={{ width: `${Math.min(pct, 100)}%`, background: color || "#185FA5", height: 8, borderRadius: 99, transition: "width .3s" }} />
    </div>
  );
}

function FL({ label, children }) {
  return <div style={{ marginBottom: 14 }}><label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#666", marginBottom: 5 }}>{label}</label>{children}</div>;
}

const today = () => new Date().toISOString().slice(0, 10);

// ─── Pantallas ────────────────────────────────────────────────
export default function Obras() {
  const [obras, setObras]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [vista, setVista]     = useState("lista"); // lista | detalle | nueva_obra | reporte
  const [selected, setSelected] = useState(null);
  const [tareas, setTareas]   = useState([]);
  const [reportes, setReportes] = useState([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getObras();
      setObras(data || []);
    } catch (_) {}
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

  const onObraCreada = (o) => {
    setObras(prev => [o, ...prev]);
    abrirObra(o);
  };

  const onTareaActualizada = (t) => {
    setTareas(prev => prev.map(x => x.id === t.id ? t : x));
  };

  const onTareaAgregada = (t) => {
    setTareas(prev => [...prev, t]);
  };

  const onReporteGuardado = async (r) => {
    setReportes(prev => [r, ...prev]);
    // refrescar avances de tareas
    const t = await api.getTareas(selected.id);
    setTareas(t || []);
    setVista("detalle");
  };

  if (vista === "nueva_obra") return (
    <NuevaObra onBack={() => setVista("lista")} onCreada={onObraCreada} />
  );

  if (vista === "reporte" && selected) return (
    <NuevoReporte
      obra={selected}
      tareas={tareas}
      onBack={() => setVista("detalle")}
      onGuardado={onReporteGuardado}
    />
  );

  if (vista === "detalle" && selected) return (
    <DetalleObra
      obra={selected}
      tareas={tareas}
      reportes={reportes}
      onBack={() => { setVista("lista"); setSelected(null); }}
      onReporte={() => setVista("reporte")}
      onTareaActualizada={onTareaActualizada}
      onTareaAgregada={onTareaAgregada}
    />
  );

  // Lista de obras
  const activas    = obras.filter(o => o.estado === "activo").length;
  const finalizadas = obras.filter(o => o.estado === "finalizada").length;

  return (
    <div style={{ fontFamily: "system-ui, -apple-system, sans-serif", padding: "20px", maxWidth: 800, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20, flexWrap: "wrap", gap: 10 }}>
        <div>
          <p style={{ margin: 0, fontSize: 12, color: "#999", fontWeight: 500 }}>NPL · Obras</p>
          <h1 style={{ margin: "2px 0 0", fontSize: 22, fontWeight: 600, color: "#111" }}>Seguimiento de obras</h1>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={load} style={{ padding: "6px 12px", fontSize: 13, borderRadius: 8, cursor: "pointer", border: "1px solid #e5e5e5", background: "#f5f5f5", color: "#555" }}>↻</button>
          <button onClick={() => setVista("nueva_obra")} style={{ padding: "8px 16px", fontSize: 13, fontWeight: 600, borderRadius: 8, cursor: "pointer", border: "none", background: "#111", color: "#fff" }}>+ Nueva obra</button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, marginBottom: 20 }}>
        {[["Total", obras.length], ["Activas", activas], ["Finalizadas", finalizadas]].map(([l, v]) => (
          <div key={l} style={{ background: "#f9f9f9", borderRadius: 10, padding: "12px 14px", border: "1px solid #eee" }}>
            <p style={{ margin: 0, fontSize: 12, color: "#888" }}>{l}</p>
            <p style={{ margin: "4px 0 0", fontSize: 22, fontWeight: 700, color: "#111" }}>{loading ? "..." : v}</p>
          </div>
        ))}
      </div>

      {loading && <p style={{ textAlign: "center", padding: 40, color: "#999" }}>Cargando...</p>}

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {obras.map(o => (
          <div key={o.id} onClick={() => abrirObra(o)}
            style={{ background: "#fff", border: "1px solid #e5e5e5", borderRadius: 12, padding: "14px 16px", cursor: "pointer" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 11, color: "#aaa", fontWeight: 500 }}>{o.numero}</span>
                  <Badge id={o.estado} arr={ESTADOS_OBRA} />
                  <span style={{ fontSize: 11, color: "#aaa" }}>{o.sistema}</span>
                </div>
                <p style={{ margin: 0, fontSize: 15, fontWeight: 600, color: "#111" }}>{o.nombre}</p>
                {o.comitente && <p style={{ margin: "2px 0 0", fontSize: 12, color: "#888" }}>{o.comitente}</p>}
              </div>
              {o.superficie && <span style={{ fontSize: 12, color: "#aaa" }}>{o.superficie} m²</span>}
            </div>
            <div style={{ display: "flex", gap: 12, fontSize: 11, color: "#aaa" }}>
              {o.responsable && <span>👷 {o.responsable}</span>}
              {o.fecha_inicio && <span>📅 Inicio: {o.fecha_inicio}</span>}
              {o.fecha_fin_est && <span>🏁 Est: {o.fecha_fin_est}</span>}
            </div>
          </div>
        ))}
        {!loading && obras.length === 0 && (
          <p style={{ textAlign: "center", padding: 40, color: "#999" }}>No hay obras. Hacé clic en "+ Nueva obra".</p>
        )}
      </div>
    </div>
  );
}

// ─── Detalle obra ────────────────────────────────────────────
function DetalleObra({ obra, tareas, reportes, onBack, onReporte, onTareaActualizada, onTareaAgregada }) {
  const [tab, setTab]           = useState("tareas");
  const [nuevaTarea, setNuevaTarea] = useState(false);
  const [formTarea, setFormTarea]   = useState({ nombre: "", etapa: "", duracion_dias: "", fecha_inicio_est: "", fecha_fin_est: "", obs: "" });

  const avanceObra = tareas.length > 0
    ? Math.round(tareas.reduce((s, t) => s + (t.avance || 0), 0) / tareas.length)
    : 0;

  const guardarTarea = async () => {
    if (!formTarea.nombre.trim()) return alert("El nombre es obligatorio");
    try {
      const res = await api.postTarea({ obra_id: obra.id, orden: tareas.length + 1, ...formTarea, duracion_dias: formTarea.duracion_dias || null });
      const created = Array.isArray(res) ? res[0] : res;
      onTareaAgregada(created);
      setNuevaTarea(false);
      setFormTarea({ nombre: "", etapa: "", duracion_dias: "", fecha_inicio_est: "", fecha_fin_est: "", obs: "" });
    } catch (e) { alert("Error: " + e.message); }
  };

  const cambiarEstadoTarea = async (t, estado) => {
    try {
      const res = await api.patchTarea(t.id, { estado });
      const upd = Array.isArray(res) ? res[0] : res;
      onTareaActualizada(upd);
    } catch (_) {}
  };

  return (
    <div style={{ fontFamily: "system-ui, -apple-system, sans-serif", padding: "20px", maxWidth: 800, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
        <button onClick={onBack} style={{ fontSize: 13, color: "#666", background: "none", border: "none", cursor: "pointer", padding: 0 }}>← Volver</button>
        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "#111", flex: 1 }}>{obra.nombre}</h2>
        <button onClick={onReporte}
          style={{ padding: "8px 18px", fontSize: 13, fontWeight: 700, borderRadius: 10, border: "none", background: "#185FA5", color: "#fff", cursor: "pointer" }}>
          📋 Reporte del día
        </button>
      </div>

      {/* Info */}
      <div style={{ background: "#f9f9f9", borderRadius: 12, padding: "12px 16px", marginBottom: 16, display: "flex", gap: 16, flexWrap: "wrap" }}>
        <div><p style={{ margin: 0, fontSize: 11, color: "#aaa" }}>Comitente</p><p style={{ margin: "2px 0 0", fontSize: 13, fontWeight: 600, color: "#111" }}>{obra.comitente || "—"}</p></div>
        <div><p style={{ margin: 0, fontSize: 11, color: "#aaa" }}>Responsable</p><p style={{ margin: "2px 0 0", fontSize: 13, fontWeight: 600, color: "#111" }}>{obra.responsable || "—"}</p></div>
        <div><p style={{ margin: 0, fontSize: 11, color: "#aaa" }}>Sistema</p><p style={{ margin: "2px 0 0", fontSize: 13, fontWeight: 600, color: "#111" }}>{obra.sistema}</p></div>
        <div><p style={{ margin: 0, fontSize: 11, color: "#aaa" }}>Superficie</p><p style={{ margin: "2px 0 0", fontSize: 13, fontWeight: 600, color: "#111" }}>{obra.superficie ? obra.superficie + " m²" : "—"}</p></div>
        <div><p style={{ margin: 0, fontSize: 11, color: "#aaa" }}>Inicio</p><p style={{ margin: "2px 0 0", fontSize: 13, fontWeight: 600, color: "#111" }}>{obra.fecha_inicio || "—"}</p></div>
        <div><p style={{ margin: 0, fontSize: 11, color: "#aaa" }}>Fin estimado</p><p style={{ margin: "2px 0 0", fontSize: 13, fontWeight: 600, color: "#111" }}>{obra.fecha_fin_est || "—"}</p></div>
      </div>

      {/* Avance general */}
      <div style={{ background: "#fff", border: "1px solid #e5e5e5", borderRadius: 12, padding: "14px 16px", marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: "#111" }}>Avance general</span>
          <span style={{ fontSize: 18, fontWeight: 700, color: avanceObra >= 100 ? "#3B6D11" : "#185FA5" }}>{avanceObra}%</span>
        </div>
        <ProgBar pct={avanceObra} color={avanceObra >= 100 ? "#3B6D11" : "#185FA5"} />
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", border: "1px solid #e5e5e5", borderRadius: 10, overflow: "hidden", marginBottom: 16, width: "fit-content" }}>
        {[["tareas", "Tareas"], ["reportes", `Reportes (${reportes.length})`]].map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)}
            style={{ padding: "8px 18px", fontSize: 13, fontWeight: 600, background: tab === id ? "#111" : "#fff", color: tab === id ? "#fff" : "#888", border: "none", cursor: "pointer" }}>
            {label}
          </button>
        ))}
      </div>

      {tab === "tareas" && (
        <div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {tareas.map(t => (
              <div key={t.id} style={{ background: "#fff", border: "1px solid #e5e5e5", borderRadius: 12, padding: "12px 14px", borderLeft: `3px solid ${ESTADOS_TAREA.find(x => x.id === t.estado)?.color || "#ddd"}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 8, marginBottom: 8 }}>
                  <div>
                    <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 2 }}>
                      <span style={{ fontSize: 11, color: "#aaa" }}>{t.orden}</span>
                      <span style={{ fontSize: 14, fontWeight: 600, color: "#111" }}>{t.nombre}</span>
                      <Badge id={t.estado} arr={ESTADOS_TAREA} />
                    </div>
                    {t.etapa && <span style={{ fontSize: 11, color: "#aaa" }}>{t.etapa}</span>}
                    <div style={{ display: "flex", gap: 10, fontSize: 11, color: "#aaa", marginTop: 2 }}>
                      {t.fecha_inicio_est && <span>📅 {t.fecha_inicio_est}</span>}
                      {t.duracion_dias && <span>⏱ {t.duracion_dias} días</span>}
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <span style={{ fontSize: 18, fontWeight: 700, color: t.avance >= 100 ? "#3B6D11" : "#185FA5" }}>{t.avance || 0}%</span>
                    <div style={{ marginTop: 4 }}>
                      <select value={t.estado} onChange={e => cambiarEstadoTarea(t, e.target.value)}
                        style={{ fontSize: 11, padding: "3px 6px", border: "1px solid #e5e5e5", borderRadius: 6, background: "#f9f9f9", cursor: "pointer" }}>
                        {ESTADOS_TAREA.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                      </select>
                    </div>
                  </div>
                </div>
                <ProgBar pct={t.avance || 0} color={t.avance >= 100 ? "#3B6D11" : "#185FA5"} />
              </div>
            ))}
          </div>

          {/* Nueva tarea */}
          {nuevaTarea ? (
            <div style={{ background: "#f9f9f9", border: "1px solid #e5e5e5", borderRadius: 12, padding: "14px", marginTop: 12 }}>
              <p style={{ margin: "0 0 12px", fontSize: 14, fontWeight: 600, color: "#111" }}>Nueva tarea</p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <FL label="Nombre *"><input style={inp} value={formTarea.nombre} onChange={e => setFormTarea(p => ({ ...p, nombre: e.target.value }))} placeholder="Nombre de la tarea" /></FL>
                <FL label="Etapa"><input style={inp} value={formTarea.etapa} onChange={e => setFormTarea(p => ({ ...p, etapa: e.target.value }))} placeholder="ej: Etapa 1" /></FL>
                <FL label="Duración (días)"><input type="number" style={inp} value={formTarea.duracion_dias} onChange={e => setFormTarea(p => ({ ...p, duracion_dias: e.target.value }))} placeholder="ej: 5" /></FL>
                <FL label="Fecha inicio est."><input type="date" style={inp} value={formTarea.fecha_inicio_est} onChange={e => setFormTarea(p => ({ ...p, fecha_inicio_est: e.target.value }))} /></FL>
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                <button onClick={guardarTarea} style={{ padding: "8px 18px", fontSize: 13, fontWeight: 600, borderRadius: 8, border: "none", background: "#111", color: "#fff", cursor: "pointer" }}>Guardar</button>
                <button onClick={() => setNuevaTarea(false)} style={{ padding: "8px 14px", fontSize: 13, borderRadius: 8, border: "1px solid #e5e5e5", background: "#fff", color: "#555", cursor: "pointer" }}>Cancelar</button>
              </div>
            </div>
          ) : (
            <button onClick={() => setNuevaTarea(true)} style={{ marginTop: 12, padding: "8px 16px", fontSize: 13, borderRadius: 10, border: "1px dashed #ccc", background: "#fff", color: "#888", cursor: "pointer", width: "100%" }}>
              + Agregar tarea
            </button>
          )}
        </div>
      )}

      {tab === "reportes" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {reportes.map(r => (
            <ReporteCard key={r.id} reporte={r} />
          ))}
          {reportes.length === 0 && <p style={{ textAlign: "center", padding: 40, color: "#999" }}>No hay reportes aún. Usá el botón "Reporte del día".</p>}
        </div>
      )}
    </div>
  );
}

// ─── Card de reporte ─────────────────────────────────────────
function ReporteCard({ reporte }) {
  const [expanded, setExpanded] = useState(false);
  const [repTareas, setRepTareas] = useState([]);

  const cargar = async () => {
    if (expanded) { setExpanded(false); return; }
    const data = await api.getRepTareas(reporte.id);
    setRepTareas(data || []);
    setExpanded(true);
  };

  return (
    <div style={{ background: "#fff", border: "1px solid #e5e5e5", borderRadius: 12, overflow: "hidden" }}>
      <div onClick={cargar} style={{ padding: "12px 16px", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "#111" }}>📅 {reporte.fecha}</p>
          {reporte.resumen && <p style={{ margin: "2px 0 0", fontSize: 12, color: "#888" }}>{reporte.resumen}</p>}
          <div style={{ display: "flex", gap: 10, fontSize: 11, color: "#aaa", marginTop: 4 }}>
            {reporte.responsable && <span>👷 {reporte.responsable}</span>}
            {reporte.clima && <span>🌤 {reporte.clima}</span>}
            {reporte.personal && <span>👥 {reporte.personal} personas</span>}
          </div>
        </div>
        <span style={{ fontSize: 18, color: "#aaa" }}>{expanded ? "▲" : "▼"}</span>
      </div>
      {expanded && repTareas.length > 0 && (
        <div style={{ borderTop: "1px solid #f0f0f0", padding: "10px 16px", background: "#f9f9f9" }}>
          {repTareas.map(rt => (
            <div key={rt.id} style={{ marginBottom: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                <span style={{ color: "#333", fontWeight: 500 }}>{rt.tarea_nombre || "Tarea"}</span>
                <span style={{ color: "#185FA5", fontWeight: 700 }}>+{rt.avance_dia}% → {rt.avance_acum}%</span>
              </div>
              {rt.obs && <p style={{ margin: "2px 0 0", fontSize: 12, color: "#888" }}>{rt.obs}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Nuevo reporte diario (mobile-first) ─────────────────────
function NuevoReporte({ obra, tareas, onBack, onGuardado }) {
  const [saving, setSaving] = useState(false);
  const [form, setForm]     = useState({ fecha: today(), responsable: obra.responsable || "", clima: "", personal: "", resumen: "" });
  const [avances, setAvances] = useState(
    tareas.filter(t => t.estado !== "completada").map(t => ({ tarea_id: t.id, nombre: t.nombre, avance_actual: t.avance || 0, avance_dia: 0, obs: "", foto_url: "" }))
  );

  const setAvance = (idx, k, v) => {
    setAvances(prev => prev.map((a, i) => i === idx ? { ...a, [k]: v } : a));
  };

  const guardar = async () => {
    if (!form.fecha) return alert("La fecha es obligatoria");
    setSaving(true);
    try {
      // Crear reporte
      const repRes = await api.postReporte({ obra_id: obra.id, ...form, personal: form.personal || null });
      const rep = Array.isArray(repRes) ? repRes[0] : repRes;

      // Guardar avances por tarea
      for (const a of avances) {
        if (a.avance_dia > 0 || a.obs) {
          const nuevo_acum = Math.min((a.avance_actual || 0) + (a.avance_dia || 0), 100);
          await api.postRepTarea({ reporte_id: rep.id, tarea_id: a.tarea_id, avance_dia: a.avance_dia || 0, avance_acum: nuevo_acum, obs: a.obs, foto_url: a.foto_url });
          await api.patchTarea(a.tarea_id, { avance: nuevo_acum, estado: nuevo_acum >= 100 ? "completada" : "en_curso" });
        }
      }
      onGuardado(rep);
    } catch (e) { alert("Error: " + e.message); }
    setSaving(false);
  };

  return (
    <div style={{ fontFamily: "system-ui, -apple-system, sans-serif", padding: "20px", maxWidth: 600, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
        <button onClick={onBack} style={{ fontSize: 13, color: "#666", background: "none", border: "none", cursor: "pointer", padding: 0 }}>← Volver</button>
        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "#111" }}>Reporte del día</h2>
      </div>

      <div style={{ background: "#E6F1FB", borderRadius: 10, padding: "10px 14px", marginBottom: 20 }}>
        <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "#185FA5" }}>{obra.nombre}</p>
        <p style={{ margin: "2px 0 0", fontSize: 12, color: "#185FA5" }}>{obra.comitente}</p>
      </div>

      {/* Info del día */}
      <div style={{ background: "#fff", border: "1px solid #e5e5e5", borderRadius: 12, padding: "16px", marginBottom: 16 }}>
        <p style={{ margin: "0 0 14px", fontSize: 14, fontWeight: 700, color: "#111" }}>Información del día</p>
        <FL label="Fecha"><input type="date" style={inp} value={form.fecha} onChange={e => setForm(p => ({ ...p, fecha: e.target.value }))} /></FL>
        <FL label="Responsable"><input style={inp} value={form.responsable} onChange={e => setForm(p => ({ ...p, responsable: e.target.value }))} placeholder="Nombre del jefe de obra" /></FL>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <FL label="Clima">
            <select style={inp} value={form.clima} onChange={e => setForm(p => ({ ...p, clima: e.target.value }))}>
              <option value="">Seleccionar</option>
              {CLIMAS.map(c => <option key={c}>{c}</option>)}
            </select>
          </FL>
          <FL label="Personal en obra"><input type="number" style={inp} value={form.personal} onChange={e => setForm(p => ({ ...p, personal: e.target.value }))} placeholder="ej: 4" /></FL>
        </div>
        <FL label="Resumen del día">
          <textarea style={{ ...inp, resize: "vertical" }} rows={2} value={form.resumen} onChange={e => setForm(p => ({ ...p, resumen: e.target.value }))} placeholder="¿Qué se hizo hoy?" />
        </FL>
      </div>

      {/* Avance por tarea */}
      <p style={{ margin: "0 0 12px", fontSize: 14, fontWeight: 700, color: "#111" }}>Avance por tarea</p>
      {avances.length === 0 && <p style={{ color: "#aaa", fontSize: 13, marginBottom: 16 }}>Todas las tareas están completadas.</p>}
      {avances.map((a, idx) => (
        <div key={a.tarea_id} style={{ background: "#fff", border: "1px solid #e5e5e5", borderRadius: 12, padding: "14px", marginBottom: 10 }}>
          <p style={{ margin: "0 0 10px", fontSize: 14, fontWeight: 600, color: "#111" }}>{a.nombre}</p>
          <div style={{ marginBottom: 8 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#888", marginBottom: 4 }}>
              <span>Acumulado actual: {a.avance_actual}%</span>
              <span style={{ color: "#185FA5", fontWeight: 700 }}>Nuevo: {Math.min((a.avance_actual || 0) + (a.avance_dia || 0), 100)}%</span>
            </div>
            <ProgBar pct={a.avance_actual} color="#e5e5e5" />
          </div>
          <FL label={`Avance de hoy: +${a.avance_dia || 0}%`}>
            <input type="range" min={0} max={100 - a.avance_actual} step={5} value={a.avance_dia}
              onChange={e => setAvance(idx, "avance_dia", Number(e.target.value))}
              style={{ width: "100%", accentColor: "#185FA5" }} />
          </FL>
          <FL label="Observaciones">
            <input style={inp} value={a.obs} onChange={e => setAvance(idx, "obs", e.target.value)} placeholder="Notas, problemas, materiales..." />
          </FL>
          <FL label="Link de foto (Drive o similar)">
            <input style={inp} value={a.foto_url} onChange={e => setAvance(idx, "foto_url", e.target.value)} placeholder="https://..." />
          </FL>
        </div>
      ))}

      <button onClick={guardar} disabled={saving}
        style={{ width: "100%", padding: "14px", fontSize: 15, fontWeight: 700, borderRadius: 12, border: "none", background: saving ? "#aaa" : "#111", color: "#fff", cursor: saving ? "not-allowed" : "pointer", marginTop: 8 }}>
        {saving ? "Guardando..." : "💾 Guardar reporte"}
      </button>
    </div>
  );
}

// ─── Nueva obra ───────────────────────────────────────────────
function NuevaObra({ onBack, onCreada }) {
  const [saving, setSaving] = useState(false);
  const [f, setF] = useState({ nombre: "", comitente: "", responsable: "", sistema: "Steel Frame", superficie: "", direccion: "", fecha_inicio: today(), fecha_fin_est: "", obs: "" });
  const set = (k, v) => setF(p => ({ ...p, [k]: v }));

  const guardar = async () => {
    if (!f.nombre.trim()) return alert("El nombre es obligatorio");
    setSaving(true);
    try {
      const res = await api.postObra({ ...f, superficie: f.superficie || null });
      const created = Array.isArray(res) ? res[0] : res;
      onCreada(created);
    } catch (e) { alert("Error: " + e.message); }
    setSaving(false);
  };

  return (
    <div style={{ fontFamily: "system-ui, -apple-system, sans-serif", padding: "20px", maxWidth: 600, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
        <button onClick={onBack} style={{ fontSize: 13, color: "#666", background: "none", border: "none", cursor: "pointer", padding: 0 }}>← Volver</button>
        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "#111" }}>Nueva obra</h2>
      </div>
      <FL label="Nombre de la obra *"><input style={inp} value={f.nombre} onChange={e => set("nombre", e.target.value)} placeholder="ej: Vivienda Abasto Steel Frame" /></FL>
      <FL label="Comitente"><input style={inp} value={f.comitente} onChange={e => set("comitente", e.target.value)} placeholder="Cliente o estudio" /></FL>
      <FL label="Responsable de obra"><input style={inp} value={f.responsable} onChange={e => set("responsable", e.target.value)} placeholder="Jefe de obra" /></FL>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <FL label="Sistema"><select style={inp} value={f.sistema} onChange={e => set("sistema", e.target.value)}>{SISTEMAS.map(s => <option key={s}>{s}</option>)}</select></FL>
        <FL label="Superficie (m²)"><input type="number" style={inp} value={f.superficie} onChange={e => set("superficie", e.target.value)} placeholder="ej: 155" /></FL>
        <FL label="Fecha de inicio"><input type="date" style={inp} value={f.fecha_inicio} onChange={e => set("fecha_inicio", e.target.value)} /></FL>
        <FL label="Fecha fin estimada"><input type="date" style={inp} value={f.fecha_fin_est} onChange={e => set("fecha_fin_est", e.target.value)} /></FL>
      </div>
      <FL label="Dirección"><input style={inp} value={f.direccion} onChange={e => set("direccion", e.target.value)} placeholder="Dirección de la obra" /></FL>
      <FL label="Observaciones"><textarea style={{ ...inp, resize: "vertical" }} rows={2} value={f.obs} onChange={e => set("obs", e.target.value)} placeholder="Notas generales..." /></FL>
      <button onClick={guardar} disabled={saving}
        style={{ width: "100%", padding: "14px", fontSize: 15, fontWeight: 700, borderRadius: 12, border: "none", background: saving ? "#aaa" : "#111", color: "#fff", cursor: saving ? "not-allowed" : "pointer", marginTop: 8 }}>
        {saving ? "Guardando..." : "Crear obra"}
      </button>
    </div>
  );
}
