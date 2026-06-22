import React, { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "./supabase.js";
import Combobox from "./Combobox.jsx";

const SUPA_URL = "https://imkmosifqxzbtqgzssst.supabase.co/rest/v1";
const ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlta21vc2lmcXh6YnRxZ3pzc3N0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkxODk4NTUsImV4cCI6MjA5NDc2NTg1NX0.5gtCs8Yv3vDSrKxAmXSr3zjWJ5HjimCKejfO-XrHPss";

async function getToken() {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token || ANON_KEY;
}
function hdrs(tk) {
  return { apikey: ANON_KEY, Authorization: `Bearer ${tk}`, "Content-Type": "application/json", Prefer: "return=representation" };
}

const CLIMAS = [
  { v: "bueno",   label: "☀️ Bueno" },
  { v: "nublado", label: "⛅ Nublado" },
  { v: "lluvia",  label: "🌧️ Lluvia" },
  { v: "viento",  label: "💨 Viento" },
  { v: "helada",  label: "🧊 Helada" },
];

const TIPOS_EVENTO = [
  { v: "remito",       label: "📦 Remito" },
  { v: "paralizacion", label: "⏸️ Paralización" },
  { v: "visita",       label: "👁️ Visita" },
  { v: "incidente",    label: "⚠️ Incidente" },
  { v: "otro",         label: "📝 Otro" },
];

const PCT_BTNS = [0, 10, 25, 50, 75, 90, 100];

const ETAPA_COLOR = {
  "Arranque":      "#6366f1",
  "Estructura":    "#f59e0b",
  "Exterior":      "#3b82f6",
  "Cubierta":      "#8b5cf6",
  "Interior":      "#10b981",
  "Terminaciones": "#ec4899",
  "Instalaciones": "#14b8a6",
  "Sin etapa":     "#888",
};
const ETAPAS_ORDEN = ["Arranque","Estructura","Exterior","Cubierta","Interior","Terminaciones","Instalaciones","Sin etapa"];
const ESTADO_COLOR = { activa: "#22c55e", pausada: "#f59e0b", finalizada: "#888" };

const shared = {
  btn:  { padding: "10px 18px", background: "#111", color: "#fff", border: "none", borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: "pointer", WebkitTapHighlightColor: "transparent" },
  btnSm:{ padding: "8px 12px", background: "#f0f0f0", color: "#333", border: "none", borderRadius: 8, fontSize: 13, cursor: "pointer", WebkitTapHighlightColor: "transparent" },
  inp:  { width: "100%", padding: "11px 12px", border: "1px solid #e0e0e0", borderRadius: 10, fontSize: 15, boxSizing: "border-box" },
  card: { background: "#fff", borderRadius: 14, padding: 16, boxShadow: "0 1px 6px rgba(0,0,0,.07)" },
  lbl:  { fontSize: 11, color: "#888", fontWeight: 600, textTransform: "uppercase", letterSpacing: .5, marginBottom: 6, display: "block" },
};

/* ─── Upload archivo ─── */
async function uploadArchivo(file, codigoObra, tipo) {
  const ext = file.name.split(".").pop();
  const fecha = new Date().toISOString().slice(0, 10);
  const path = `obras/${codigoObra || "sin-codigo"}/${fecha}/${tipo}/${Date.now()}.${ext}`;
  const { data, error } = await supabase.storage.from("npl-obras").upload(path, file, { upsert: true, contentType: file.type });
  if (error) throw new Error("Error al subir: " + error.message);
  return { path, tipo, nombre: file.name };
}

/* ─── URL firmada ─── */
async function getUrlFirmada(path) {
  const { data, error } = await supabase.storage.from("npl-obras").createSignedUrl(path, 3600);
  if (error) return null;
  return data.signedUrl;
}

/* ─── Fecha relativa ─── */
function fechaRelativa(fecha) {
  if (!fecha) return null;
  const hoy = new Date();
  const f = new Date(fecha + "T12:00:00");
  const diff = Math.round((f - hoy) / (1000 * 60 * 60 * 24));
  if (diff === 0) return "hoy";
  if (diff === 1) return "mañana";
  if (diff === -1) return "ayer";
  if (diff > 0 && diff <= 7) return `en ${diff} días`;
  if (diff < 0 && diff >= -7) return `hace ${Math.abs(diff)} días`;
  return f.toLocaleDateString("es-AR", { day: "numeric", month: "short" });
}

/* ─── Ícono por tipo de archivo ─── */
function iconoArchivo(tipo) {
  if (tipo === "foto")  return "📷";
  if (tipo === "video") return "🎥";
  if (tipo === "audio") return "🎙️";
  return "📎";
}

/* ════════════════════════════════════════════
   PANEL AVANCE — bottom sheet para marcar % + nota + archivo
════════════════════════════════════════════ */
function PanelAvance({ tarea, avanceActual, notaActual, obraCodigo, onGuardar, onClose }) {
  const [pct,     setPct]     = useState(avanceActual || 0);
  const [nota,    setNota]    = useState(notaActual || "");
  const [archivo, setArchivo] = useState(null);
  const [subiendo,setSubiendo]= useState(false);
  const [msg,     setMsg]     = useState("");
  const fotoRef  = useRef();
  const videoRef = useRef();
  const audioRef = useRef();
  const color = ETAPA_COLOR[tarea.etapa] || "#888";

  async function guardar() {
    setSubiendo(true);
    try {
      let archivoData = null;
      if (archivo) {
        const tipo = archivo.type.startsWith("image") ? "foto" : archivo.type.startsWith("video") ? "video" : "audio";
        archivoData = await uploadArchivo(archivo, obraCodigo, tipo);
      }
      await onGuardar(pct, nota, archivoData);
      onClose();
    } catch (e) { setMsg("Error: " + e.message); }
    setSubiendo(false);
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.6)", display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 200 }}>
      <div style={{ background: "#fff", borderRadius: "20px 20px 0 0", padding: "20px 20px 40px", width: "100%", maxWidth: 560, maxHeight: "90vh", overflowY: "auto" }}>
        <div style={{ width: 40, height: 4, background: "#e0e0e0", borderRadius: 2, margin: "0 auto 16px" }} />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 11, color, fontWeight: 700, textTransform: "uppercase", marginBottom: 2 }}>{tarea.etapa}</div>
            <div style={{ fontWeight: 700, fontSize: 17 }}>{tarea.nombre}</div>
            {tarea.fecha_inicio_plan && (
              <div style={{ fontSize: 12, color: "#aaa", marginTop: 2 }}>
                📅 {new Date(tarea.fecha_inicio_plan + "T12:00").toLocaleDateString("es-AR")}
                {tarea.fecha_fin_plan && ` → ${new Date(tarea.fecha_fin_plan + "T12:00").toLocaleDateString("es-AR")}`}
              </div>
            )}
          </div>
          <button onClick={onClose} style={{ ...shared.btnSm, padding: "6px 10px" }}>✕</button>
        </div>

        <span style={shared.lbl}>Avance</span>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
          {PCT_BTNS.map(p => (
            <button key={p} onClick={() => setPct(p)} style={{
              ...shared.btnSm, minWidth: 52, minHeight: 44, fontWeight: 700, fontSize: 14,
              background: pct === p ? color : "#f0f0f0",
              color: pct === p ? "#fff" : "#333",
            }}>{p}%</button>
          ))}
        </div>
        <div style={{ height: 8, background: "#f0f0f0", borderRadius: 4, overflow: "hidden", marginBottom: 16 }}>
          <div style={{ height: "100%", width: `${pct}%`, background: pct === 100 ? "#22c55e" : color, transition: "width .3s" }} />
        </div>

        <span style={shared.lbl}>Nota</span>
        <textarea value={nota} onChange={e => setNota(e.target.value)} placeholder="¿Qué se hizo? Observaciones…" rows={3} style={{ ...shared.inp, resize: "none", marginBottom: 16, lineHeight: 1.5 }} />

        <span style={shared.lbl}>Adjuntar archivo</span>
        <input ref={fotoRef}  type="file" accept="image/*"   capture="environment" style={{ display: "none" }} onChange={e => setArchivo(e.target.files[0])} />
        <input ref={videoRef} type="file" accept="video/*"   capture="environment" style={{ display: "none" }} onChange={e => setArchivo(e.target.files[0])} />
        <input ref={audioRef} type="file" accept="audio/*"                         style={{ display: "none" }} onChange={e => setArchivo(e.target.files[0])} />
        <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
          {[
            { ref: fotoRef,  emoji: "📷", label: "Foto" },
            { ref: videoRef, emoji: "🎥", label: "Video" },
            { ref: audioRef, emoji: "🎙️", label: "Audio" },
          ].map(({ ref, emoji, label }) => (
            <button key={label} onClick={() => ref.current.click()} style={{
              ...shared.btnSm, flex: 1, minHeight: 52, display: "flex", flexDirection: "column", alignItems: "center", gap: 3, fontSize: 22,
              border: "1px dashed #ddd",
            }}>
              {emoji}<span style={{ fontSize: 11, color: "#888" }}>{label}</span>
            </button>
          ))}
        </div>

        {archivo && (
          <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 8, padding: "8px 12px", marginBottom: 14, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 13, color: "#16a34a" }}>
              {archivo.type.startsWith("image") ? "📷" : archivo.type.startsWith("video") ? "🎥" : "🎙️"} {archivo.name}
            </span>
            <button onClick={() => setArchivo(null)} style={{ ...shared.btnSm, padding: "3px 8px", fontSize: 11 }}>✕</button>
          </div>
        )}

        {msg && <div style={{ color: "#e53", fontSize: 13, marginBottom: 10 }}>{msg}</div>}
        <button onClick={guardar} disabled={subiendo} style={{ ...shared.btn, width: "100%", minHeight: 50, fontSize: 16 }}>
          {subiendo ? "Guardando…" : "Guardar avance"}
        </button>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════
   PANEL TAREA — historial + repositorio documental
════════════════════════════════════════════ */
function PanelHistorial({ tarea, obraCodigo, onClose }) {
  const [historial, setHistorial] = useState([]);
  const [loading,   setLoading]   = useState(true);
  const color = ETAPA_COLOR[tarea.etapa] || "#888";

  useEffect(() => {
    async function cargar() {
      const tk = await getToken();
      // Todos los avances de esta tarea con archivos
      const avArr = await fetch(
        `${SUPA_URL}/avances_tarea?tarea_id=eq.${tarea.id}&order=created_at.desc`,
        { headers: hdrs(tk) }
      ).then(r => r.json());

      if (!Array.isArray(avArr) || avArr.length === 0) { setLoading(false); return; }

      const avIds = avArr.map(a => a.id).join(",");
      const archArr = await fetch(
        `${SUPA_URL}/archivos_avance?avance_id=in.(${avIds})&order=created_at.asc`,
        { headers: hdrs(tk) }
      ).then(r => r.json());

      // Agrupar archivos por avance y generar URLs firmadas
      const archMap = {};
      for (const ar of (Array.isArray(archArr) ? archArr : [])) {
        if (!archMap[ar.avance_id]) archMap[ar.avance_id] = [];
        const url = await getUrlFirmada(ar.storage_path);
        archMap[ar.avance_id].push({ ...ar, signedUrl: url });
      }

      // Obtener info del parte (fecha y jefe)
      const parteIds = [...new Set(avArr.map(a => a.parte_id))].join(",");
      const partesArr = await fetch(
        `${SUPA_URL}/partes_diarios?id=in.(${parteIds})&select=id,fecha,jefe_id`,
        { headers: hdrs(tk) }
      ).then(r => r.json());

      const parteMap = {};
      (Array.isArray(partesArr) ? partesArr : []).forEach(p => { parteMap[p.id] = p; });

      // Obtener nombres de jefes
      const jefeIds = [...new Set(Object.values(parteMap).map(p => p.jefe_id).filter(Boolean))].join(",");
      let perfilesMap = {};
      if (jefeIds) {
        const perfiles = await fetch(
          `${SUPA_URL}/perfiles?id=in.(${jefeIds})&select=id,nombre`,
          { headers: hdrs(tk) }
        ).then(r => r.json());
        (Array.isArray(perfiles) ? perfiles : []).forEach(p => { perfilesMap[p.id] = p.nombre; });
      }

      const hist = avArr.map(av => ({
        ...av,
        fecha: parteMap[av.parte_id]?.fecha,
        quien: perfilesMap[parteMap[av.parte_id]?.jefe_id] || "Admin",
        archivos: archMap[av.id] || [],
      }));

      setHistorial(hist);
      setLoading(false);
    }
    cargar();
  }, [tarea.id]);

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.6)", display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 200 }}>
      <div style={{ background: "#fff", borderRadius: "20px 20px 0 0", padding: "20px 20px 40px", width: "100%", maxWidth: 600, maxHeight: "90vh", overflowY: "auto" }}>
        <div style={{ width: 40, height: 4, background: "#e0e0e0", borderRadius: 2, margin: "0 auto 16px" }} />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 11, color, fontWeight: 700, textTransform: "uppercase", marginBottom: 2 }}>{tarea.etapa}</div>
            <div style={{ fontWeight: 700, fontSize: 17 }}>{tarea.nombre}</div>
          </div>
          <button onClick={onClose} style={{ ...shared.btnSm, padding: "6px 10px" }}>✕</button>
        </div>

        {loading ? (
          <p style={{ color: "#aaa", textAlign: "center", padding: 32 }}>Cargando historial…</p>
        ) : historial.length === 0 ? (
          <p style={{ color: "#aaa", textAlign: "center", padding: 32 }}>Sin registros aún</p>
        ) : historial.map((av, i) => (
          <div key={av.id} style={{ marginBottom: 16, paddingBottom: 16, borderBottom: i < historial.length - 1 ? "1px solid #f0f0f0" : "none" }}>
            {/* Header del registro */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontWeight: 700, fontSize: 18, color: av.porcentaje === 100 ? "#22c55e" : color }}>{av.porcentaje}%</span>
                <div style={{ height: 6, width: 80, background: "#f0f0f0", borderRadius: 3, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${av.porcentaje}%`, background: av.porcentaje === 100 ? "#22c55e" : color }} />
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: "#555" }}>👷 {av.quien}</div>
                {av.fecha && <div style={{ fontSize: 11, color: "#aaa" }}>{new Date(av.fecha + "T12:00").toLocaleDateString("es-AR", { weekday: "short", day: "numeric", month: "short" })}</div>}
              </div>
            </div>

            {/* Nota */}
            {av.nota && (
              <div style={{ background: "#f8f8f8", borderRadius: 8, padding: "8px 12px", marginBottom: 10, fontSize: 13, color: "#444", fontStyle: "italic" }}>
                💬 {av.nota}
              </div>
            )}

            {/* Archivos */}
            {av.archivos.length > 0 && (
              <div>
                <div style={{ fontSize: 11, color: "#aaa", fontWeight: 600, textTransform: "uppercase", marginBottom: 8 }}>Archivos adjuntos</div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {av.archivos.map(ar => (
                    <div key={ar.id} style={{ borderRadius: 10, overflow: "hidden", border: "1px solid #e0e0e0" }}>
                      {ar.tipo === "foto" && ar.signedUrl ? (
                        <a href={ar.signedUrl} target="_blank" rel="noreferrer">
                          <img src={ar.signedUrl} alt="" style={{ width: 100, height: 100, objectFit: "cover", display: "block" }} />
                        </a>
                      ) : (
                        <a href={ar.signedUrl} target="_blank" rel="noreferrer" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", width: 100, height: 100, background: "#f5f5f5", textDecoration: "none", gap: 4 }}>
                          <span style={{ fontSize: 28 }}>{iconoArchivo(ar.tipo)}</span>
                          <span style={{ fontSize: 10, color: "#888", textAlign: "center", padding: "0 4px" }}>{ar.nombre_archivo?.split("/").pop()?.substring(0, 15)}</span>
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════
   COMPONENTE TAREA — usado en ambas vistas
════════════════════════════════════════════ */
function TareaCard({ tarea, avance, archivos, color, isMobile, onMarcarAvance, onVerHistorial }) {
  const pctT = avance?.porcentaje || 0;
  const inicioRel = fechaRelativa(tarea.fecha_inicio_plan);

  return (
    <div style={{ ...shared.card, marginBottom: 10, borderLeft: `4px solid ${color}` }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
            <span style={{ fontWeight: 600, fontSize: 14 }}>{tarea.nombre}</span>
            {tarea.etapa && !isMobile && (
              <span style={{ fontSize: 10, fontWeight: 700, background: color + "22", color, borderRadius: 6, padding: "2px 7px" }}>{tarea.etapa}</span>
            )}
          </div>
          <div style={{ display: "flex", gap: 10, marginTop: 4, flexWrap: "wrap" }}>
            {tarea.fecha_inicio_plan && (
              <span style={{ fontSize: 11, color: "#aaa" }}>
                📅 {new Date(tarea.fecha_inicio_plan + "T12:00").toLocaleDateString("es-AR")}
                {inicioRel ? ` (${inicioRel})` : ""}
              </span>
            )}
            {tarea.fecha_fin_plan && (
              <span style={{ fontSize: 11, color: "#aaa" }}>
                🏁 {new Date(tarea.fecha_fin_plan + "T12:00").toLocaleDateString("es-AR")}
              </span>
            )}
          </div>
          {avance?.nota && (
            <div style={{ fontSize: 12, color: "#666", marginTop: 4, fontStyle: "italic", background: "#f8f8f8", borderRadius: 6, padding: "4px 8px" }}>
              💬 {avance.nota}
            </div>
          )}
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4, marginLeft: 10, flexShrink: 0 }}>
          <span style={{ fontWeight: 800, fontSize: 20, color: pctT === 100 ? "#22c55e" : "#111" }}>{pctT}%</span>
          {/* Botón historial */}
          <button onClick={onVerHistorial} style={{ ...shared.btnSm, fontSize: 11, padding: "3px 8px", color: "#888" }}>
            📂 {archivos?.length || 0} arch.
          </button>
        </div>
      </div>

      {/* Barra progreso */}
      <div style={{ height: 6, background: "#f0f0f0", borderRadius: 3, overflow: "hidden", marginBottom: 10 }}>
        <div style={{ height: "100%", width: `${pctT}%`, background: pctT === 100 ? "#22c55e" : color, transition: "width .3s" }} />
      </div>

      {/* Miniaturas de archivos recientes */}
      {archivos && archivos.length > 0 && (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
          {archivos.slice(0, 4).map(ar => (
            <div key={ar.id} onClick={onVerHistorial} style={{ width: 44, height: 44, borderRadius: 6, overflow: "hidden", border: "1px solid #e0e0e0", cursor: "pointer", background: "#f5f5f5", display: "flex", alignItems: "center", justifyContent: "center" }}>
              {ar.tipo === "foto" && ar.signedUrl ? (
                <img src={ar.signedUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                <span style={{ fontSize: 20 }}>{iconoArchivo(ar.tipo)}</span>
              )}
            </div>
          ))}
          {archivos.length > 4 && (
            <div onClick={onVerHistorial} style={{ width: 44, height: 44, borderRadius: 6, border: "1px solid #e0e0e0", cursor: "pointer", background: "#f0f0f0", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: "#888" }}>
              +{archivos.length - 4}
            </div>
          )}
        </div>
      )}

      {/* Botones % */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {PCT_BTNS.map(pct => (
          <button key={pct} onClick={() => onMarcarAvance(pct)} style={{
            ...shared.btnSm,
            minWidth: isMobile ? 44 : 38, minHeight: isMobile ? 40 : 32,
            fontWeight: 600, fontSize: 13,
            background: avance?.porcentaje === pct ? color : "#f0f0f0",
            color: avance?.porcentaje === pct ? "#fff" : "#333",
          }}>{pct}%</button>
        ))}
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════
   HOOK — cargar avances y archivos de una lista de tareas
════════════════════════════════════════════ */
async function cargarAvancesYArchivos(tareas) {
  if (!tareas.length) return { avMap: {}, archMap: {} };
  const tk = await getToken();

  const ids = tareas.map(t => t.id).join(",");
  const avArr = await fetch(`${SUPA_URL}/avances_tarea?tarea_id=in.(${ids})&order=created_at.desc`, { headers: hdrs(tk) }).then(r => r.json());

  const avMap = {};
  (Array.isArray(avArr) ? avArr : []).forEach(a => { if (!avMap[a.tarea_id]) avMap[a.tarea_id] = a; });

  // Archivos del avance más reciente por tarea
  const avIds = Object.values(avMap).map(a => a.id).join(",");
  let archMap = {};
  if (avIds) {
    const archArr = await fetch(`${SUPA_URL}/archivos_avance?avance_id=in.(${avIds})&order=created_at.asc`, { headers: hdrs(tk) }).then(r => r.json());
    // Generar URLs firmadas
    for (const ar of (Array.isArray(archArr) ? archArr : [])) {
      const url = await getUrlFirmada(ar.storage_path);
      if (!archMap[ar.avance_id]) archMap[ar.avance_id] = [];
      archMap[ar.avance_id].push({ ...ar, signedUrl: url });
    }
  }

  return { avMap, archMap };
}

/* ════════════════════════════════════════════
   VISTA JEFE — mobile
════════════════════════════════════════════ */
function VistaJefe({ perfil, onLogout }) {
  const [obra,         setObra]         = useState(null);
  const [tareas,       setTareas]       = useState([]);
  const [parte,        setParte]        = useState(null);
  const [eventos,      setEventos]      = useState([]);
  const [avances,      setAvances]      = useState({});
  const [archivosMap,  setArchivosMap]  = useState({});
  const [loading,      setLoading]      = useState(true);
  const [saving,       setSaving]       = useState(false);
  const [msg,          setMsg]          = useState("");
  const [tab,          setTab]          = useState("tareas");
  const [panelTarea,   setPanelTarea]   = useState(null); // { tarea, mode: 'avance'|'historial' }
  const [showEvt,      setShowEvt]      = useState(false);
  const [nuevoEvt,     setNuevoEvt]     = useState({ tipo: "remito", descripcion: "", proveedor: "", numero_remito: "", conforme: true, dias_perdidos: "" });

  const hoy = new Date().toISOString().slice(0, 10);

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const tk = await getToken();
      const obras = await fetch(`${SUPA_URL}/obras_campo?jefe_id=eq.${perfil.id}&estado=eq.activa&select=*`, { headers: hdrs(tk) }).then(r => r.json());
      const o = obras[0];
      if (!o) { setLoading(false); return; }
      setObra(o);

      const [tArr, pArr] = await Promise.all([
        fetch(`${SUPA_URL}/tareas_obra?obra_id=eq.${o.id}&order=orden.asc`, { headers: hdrs(tk) }).then(r => r.json()),
        fetch(`${SUPA_URL}/partes_diarios?obra_id=eq.${o.id}&fecha=eq.${hoy}&select=*`, { headers: hdrs(tk) }).then(r => r.json()),
      ]);
      const tFinal = Array.isArray(tArr) ? tArr : [];
      setTareas(tFinal);

      const p = pArr[0] || null;
      if (p) {
        setParte(p);
        const evArr = await fetch(`${SUPA_URL}/eventos_parte?parte_id=eq.${p.id}&order=created_at.asc`, { headers: hdrs(tk) }).then(r => r.json());
        setEventos(Array.isArray(evArr) ? evArr : []);
      }

      // Cargar avances y archivos
      const { avMap, archMap } = await cargarAvancesYArchivos(tFinal);
      // archMap está indexado por avance_id, necesitamos por tarea_id
      const archByTarea = {};
      Object.entries(avMap).forEach(([tareaId, av]) => {
        archByTarea[tareaId] = archMap[av.id] || [];
      });
      setAvances(avMap);
      setArchivosMap(archByTarea);
    } catch (e) { console.error(e); }
    setLoading(false);
  }, [perfil, hoy]);

  useEffect(() => { cargar(); }, [cargar]);

  async function asegurarParte() {
    const tk = await getToken();
    if (parte) return { parte, tk };
    const existentes = await fetch(`${SUPA_URL}/partes_diarios?obra_id=eq.${obra.id}&fecha=eq.${hoy}`, { headers: hdrs(tk) }).then(r => r.json());
    if (Array.isArray(existentes) && existentes.length > 0) {
      setParte(existentes[0]);
      return { parte: existentes[0], tk };
    }
    const r = await fetch(`${SUPA_URL}/partes_diarios`, { method: "POST", headers: hdrs(tk), body: JSON.stringify({ obra_id: obra.id, fecha: hoy, jefe_id: perfil.id }) });
    const rows = await r.json();
    const p = rows[0]; setParte(p);
    return { parte: p, tk };
  }

  async function guardarParte(campo, valor) {
    setSaving(true);
    try {
      const { parte: p, tk } = await asegurarParte();
      await fetch(`${SUPA_URL}/partes_diarios?id=eq.${p.id}`, { method: "PATCH", headers: hdrs(tk), body: JSON.stringify({ [campo]: valor }) });
      setParte(prev => ({ ...prev, [campo]: valor }));
    } catch (e) { console.error(e); }
    setSaving(false);
  }

  async function guardarAvance(tareaId, pct, nota, archivoData) {
    const { parte: p, tk } = await asegurarParte();
    const existing = avances[tareaId];
    let avanceId;

    if (existing) {
      await fetch(`${SUPA_URL}/avances_tarea?id=eq.${existing.id}`, { method: "PATCH", headers: hdrs(tk), body: JSON.stringify({ porcentaje: pct, nota }) });
      avanceId = existing.id;
    } else {
      const r = await fetch(`${SUPA_URL}/avances_tarea`, { method: "POST", headers: hdrs(tk), body: JSON.stringify({ parte_id: p.id, tarea_id: tareaId, porcentaje: pct, nota }) });
      const rows = await r.json();
      avanceId = rows[0].id;
    }

    if (archivoData && avanceId) {
      await fetch(`${SUPA_URL}/archivos_avance`, { method: "POST", headers: hdrs(tk), body: JSON.stringify({ avance_id: avanceId, tipo: archivoData.tipo, url: archivoData.path, nombre_archivo: archivoData.nombre, storage_path: archivoData.path }) });
      // Agregar miniatura
      const url = await getUrlFirmada(archivoData.path);
      setArchivosMap(prev => ({ ...prev, [tareaId]: [...(prev[tareaId] || []), { ...archivoData, id: Date.now(), avance_id: avanceId, signedUrl: url }] }));
    }

    setAvances(prev => ({ ...prev, [tareaId]: { ...prev[tareaId], id: avanceId, porcentaje: pct, nota } }));
    setMsg("✓ Guardado"); setTimeout(() => setMsg(""), 1500);
  }

  async function agregarEvento() {
    setSaving(true);
    try {
      const { parte: p, tk } = await asegurarParte();
      const body = { parte_id: p.id, ...nuevoEvt, dias_perdidos: nuevoEvt.dias_perdidos ? parseFloat(nuevoEvt.dias_perdidos) : null };
      const r = await fetch(`${SUPA_URL}/eventos_parte`, { method: "POST", headers: hdrs(tk), body: JSON.stringify(body) });
      const rows = await r.json();
      setEventos(prev => [...prev, rows[0]]);
      setNuevoEvt({ tipo: "remito", descripcion: "", proveedor: "", numero_remito: "", conforme: true, dias_perdidos: "" });
      setShowEvt(false);
      setMsg("✓ Evento guardado"); setTimeout(() => setMsg(""), 1500);
    } catch (e) { console.error(e); }
    setSaving(false);
  }

  if (loading) return <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", color: "#888", fontFamily: "system-ui" }}>Cargando obra…</div>;
  if (!obra) return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100vh", fontFamily: "system-ui", gap: 16 }}>
      <p style={{ color: "#888" }}>No tenés ninguna obra activa asignada.</p>
      <button onClick={onLogout} style={shared.btn}>Salir</button>
    </div>
  );

  const avanceGeneral = tareas.length > 0
    ? Math.round(tareas.reduce((s, t) => s + (avances[t.id]?.porcentaje || 0), 0) / tareas.length) : 0;

  const porEtapa = {};
  tareas.forEach(t => {
    const e = t.etapa || "Sin etapa";
    if (!porEtapa[e]) porEtapa[e] = [];
    porEtapa[e].push(t);
  });

  return (
    <div style={{ fontFamily: "system-ui, -apple-system, sans-serif", minHeight: "100vh", background: "#f5f5f7", paddingBottom: 32 }}>
      {/* Header */}
      <div style={{ background: "#111", color: "#fff", padding: "16px 20px", position: "sticky", top: 0, zIndex: 10 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            {obra.codigo && <div style={{ fontSize: 10, color: "#666", fontWeight: 700, letterSpacing: 1 }}>{obra.codigo}</div>}
            <div style={{ fontWeight: 700, fontSize: 17, marginTop: 2 }}>{obra.nombre}</div>
            {obra.direccion && <div style={{ fontSize: 12, color: "#aaa" }}>{obra.direccion}</div>}
          </div>
          <button onClick={onLogout} style={{ background: "none", border: "none", color: "#666", cursor: "pointer", fontSize: 12 }}>Salir</button>
        </div>
        <div style={{ marginTop: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#aaa", marginBottom: 5 }}>
            <span>Avance general</span>
            <span style={{ fontWeight: 700, color: "#fff", fontSize: 14 }}>{avanceGeneral}%</span>
          </div>
          <div style={{ height: 6, background: "#333", borderRadius: 3, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${avanceGeneral}%`, background: "#22c55e", transition: "width .5s" }} />
          </div>
        </div>
        <div style={{ marginTop: 6, fontSize: 11, color: "#666" }}>
          {new Date(hoy + "T12:00:00").toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" })}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", background: "#fff", borderBottom: "1px solid #eee", position: "sticky", top: 107, zIndex: 9 }}>
        {[["tareas","📋 Tareas"],["parte","📝 Parte"],["eventos","📦 Eventos"]].map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)} style={{
            flex: 1, padding: "13px 4px", fontSize: 13, fontWeight: tab === id ? 700 : 400,
            background: "none", border: "none", cursor: "pointer",
            color: tab === id ? "#111" : "#aaa",
            borderBottom: tab === id ? "2px solid #111" : "2px solid transparent",
            WebkitTapHighlightColor: "transparent",
          }}>{label}</button>
        ))}
      </div>

      {msg && <div style={{ background: "#d4edda", color: "#155724", padding: "8px 16px", textAlign: "center", fontSize: 13 }}>{msg}</div>}
      {saving && <div style={{ background: "#fff3cd", color: "#856404", padding: "5px 16px", textAlign: "center", fontSize: 12 }}>Guardando…</div>}

      {/* TAB TAREAS */}
      {tab === "tareas" && (
        <div style={{ padding: "12px 16px" }}>
          {ETAPAS_ORDEN.filter(e => porEtapa[e]).map(etapa => {
            const color = ETAPA_COLOR[etapa] || "#888";
            const tArr = porEtapa[etapa];
            const pctE = Math.round(tArr.reduce((s, t) => s + (avances[t.id]?.porcentaje || 0), 0) / tArr.length);
            return (
              <div key={etapa} style={{ marginBottom: 20 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                  <div style={{ width: 10, height: 10, borderRadius: "50%", background: color }} />
                  <span style={{ fontWeight: 700, fontSize: 13, flex: 1, color: "#333" }}>{etapa}</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color }}>{pctE}%</span>
                </div>
                {tArr.map(t => (
                  <TareaCard
                    key={t.id}
                    tarea={t}
                    avance={avances[t.id]}
                    archivos={archivosMap[t.id]}
                    color={color}
                    isMobile={true}
                    onMarcarAvance={pct => setPanelTarea({ tarea: t, pct, mode: "avance" })}
                    onVerHistorial={() => setPanelTarea({ tarea: t, mode: "historial" })}
                  />
                ))}
              </div>
            );
          })}
        </div>
      )}

      {/* TAB PARTE */}
      {tab === "parte" && (
        <div style={{ padding: "12px 16px" }}>
          <div style={{ ...shared.card, marginBottom: 12 }}>
            <span style={shared.lbl}>Clima del día</span>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {CLIMAS.map(c => (
                <button key={c.v} onClick={() => guardarParte("clima", c.v)} style={{ ...shared.btnSm, minHeight: 40, background: parte?.clima === c.v ? "#111" : "#f0f0f0", color: parte?.clima === c.v ? "#fff" : "#333" }}>{c.label}</button>
              ))}
            </div>
          </div>
          <div style={{ ...shared.card, marginBottom: 12 }}>
            <span style={shared.lbl}>Personal y horas</span>
            <div style={{ display: "flex", gap: 12 }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 12, color: "#888", display: "block", marginBottom: 4 }}>Personas</label>
                <input type="number" inputMode="numeric" min="0" defaultValue={parte?.personal_cantidad || ""} onBlur={e => guardarParte("personal_cantidad", parseInt(e.target.value) || null)} style={shared.inp} placeholder="0" />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 12, color: "#888", display: "block", marginBottom: 4 }}>Horas</label>
                <input type="number" inputMode="decimal" min="0" step="0.5" defaultValue={parte?.horas_trabajadas || ""} onBlur={e => guardarParte("horas_trabajadas", parseFloat(e.target.value) || null)} style={shared.inp} placeholder="0" />
              </div>
            </div>
          </div>
          <div style={{ ...shared.card }}>
            <span style={shared.lbl}>Observaciones</span>
            <textarea defaultValue={parte?.observaciones || ""} onBlur={e => guardarParte("observaciones", e.target.value)} placeholder="Novedades del día…" rows={5} style={{ ...shared.inp, resize: "vertical", lineHeight: 1.6 }} />
          </div>
        </div>
      )}

      {/* TAB EVENTOS */}
      {tab === "eventos" && (
        <div style={{ padding: "12px 16px" }}>
          <button onClick={() => setShowEvt(!showEvt)} style={{ ...shared.btn, width: "100%", marginBottom: 12 }}>
            {showEvt ? "Cancelar" : "+ Agregar evento"}
          </button>
          {showEvt && (
            <div style={{ ...shared.card, marginBottom: 12, background: "#f8f8f8" }}>
              <span style={shared.lbl}>Tipo</span>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
                {TIPOS_EVENTO.map(t => (
                  <button key={t.v} onClick={() => setNuevoEvt(prev => ({ ...prev, tipo: t.v }))} style={{ ...shared.btnSm, minHeight: 40, background: nuevoEvt.tipo === t.v ? "#111" : "#fff", color: nuevoEvt.tipo === t.v ? "#fff" : "#333", border: "1px solid #ddd" }}>{t.label}</button>
                ))}
              </div>
              {nuevoEvt.tipo === "remito" && (
                <>
                  <input placeholder="Proveedor" value={nuevoEvt.proveedor} onChange={e => setNuevoEvt(p => ({ ...p, proveedor: e.target.value }))} style={{ ...shared.inp, marginBottom: 10 }} />
                  <input placeholder="N° Remito" value={nuevoEvt.numero_remito} onChange={e => setNuevoEvt(p => ({ ...p, numero_remito: e.target.value }))} style={{ ...shared.inp, marginBottom: 10 }} />
                  <div style={{ display: "flex", gap: 10, marginBottom: 10, alignItems: "center" }}>
                    <span style={{ fontSize: 14 }}>Conforme:</span>
                    <button onClick={() => setNuevoEvt(p => ({ ...p, conforme: true }))}  style={{ ...shared.btnSm, minHeight: 40, background: nuevoEvt.conforme ? "#111" : "#f0f0f0", color: nuevoEvt.conforme ? "#fff" : "#333" }}>✓ Sí</button>
                    <button onClick={() => setNuevoEvt(p => ({ ...p, conforme: false }))} style={{ ...shared.btnSm, minHeight: 40, background: nuevoEvt.conforme === false ? "#e53" : "#f0f0f0", color: nuevoEvt.conforme === false ? "#fff" : "#333" }}>✗ No</button>
                  </div>
                </>
              )}
              {nuevoEvt.tipo === "paralizacion" && (
                <input type="number" inputMode="decimal" step="0.5" placeholder="Días perdidos" value={nuevoEvt.dias_perdidos} onChange={e => setNuevoEvt(p => ({ ...p, dias_perdidos: e.target.value }))} style={{ ...shared.inp, marginBottom: 10 }} />
              )}
              <textarea placeholder="Descripción / notas" value={nuevoEvt.descripcion} onChange={e => setNuevoEvt(p => ({ ...p, descripcion: e.target.value }))} rows={3} style={{ ...shared.inp, resize: "vertical", marginBottom: 12 }} />
              <button onClick={agregarEvento} style={{ ...shared.btn, width: "100%" }}>Guardar evento</button>
            </div>
          )}
          {eventos.length === 0 && !showEvt && <div style={{ textAlign: "center", color: "#aaa", fontSize: 14, padding: "32px 0" }}>Sin eventos hoy</div>}
          {eventos.map(ev => (
            <div key={ev.id} style={{ ...shared.card, marginBottom: 10, borderLeft: "4px solid #111" }}>
              <div style={{ fontWeight: 600, fontSize: 14 }}>{TIPOS_EVENTO.find(t => t.v === ev.tipo)?.label || ev.tipo}</div>
              {ev.proveedor && <div style={{ fontSize: 13, color: "#666", marginTop: 4 }}>Prov: {ev.proveedor} · Remito: {ev.numero_remito} · {ev.conforme ? "✓ Conforme" : "✗ No conforme"}</div>}
              {ev.dias_perdidos && <div style={{ fontSize: 13, color: "#e53", marginTop: 4 }}>⏸ {ev.dias_perdidos} días perdidos</div>}
              {ev.descripcion && <div style={{ fontSize: 14, marginTop: 6 }}>{ev.descripcion}</div>}
            </div>
          ))}
        </div>
      )}

      {/* Paneles */}
      {panelTarea?.mode === "avance" && (
        <PanelAvance
          tarea={panelTarea.tarea}
          avanceActual={panelTarea.pct}
          notaActual={avances[panelTarea.tarea.id]?.nota}
          obraCodigo={obra.codigo}
          onGuardar={(pct, nota, arch) => guardarAvance(panelTarea.tarea.id, pct, nota, arch)}
          onClose={() => setPanelTarea(null)}
        />
      )}
      {panelTarea?.mode === "historial" && (
        <PanelHistorial tarea={panelTarea.tarea} obraCodigo={obra.codigo} onClose={() => setPanelTarea(null)} />
      )}
    </div>
  );
}

/* ════════════════════════════════════════════
   MODAL EDITAR OBRA
════════════════════════════════════════════ */
function ModalEditarObra({ obra, jefesList, onGuardar, onClose }) {
  const [form, setForm] = useState({
    nombre:               obra.nombre || "",
    direccion:            obra.direccion || "",
    codigo:               obra.codigo || "",
    sistema_constructivo: obra.sistema_constructivo || "Steel Frame",
    alcance:              obra.alcance || "obra_completa",
    fecha_inicio_plan:    obra.fecha_inicio_plan || "",
    fecha_fin_plan:       obra.fecha_fin_plan || "",
    jefe_id:              obra.jefe_id || "",
    notas:                obra.notas || "",
    cliente_id:           obra.cliente_id || "",
    proyecto_id:          obra.proyecto_id || "",
    presupuesto_id:       obra.presupuesto_id || "",
  });

  const [proyectos,   setProyectos]   = useState([]);
  const [clientesCRM, setClientesCRM] = useState([]);
  const [presupuestos,setPresupuestos]= useState([]);

  useEffect(() => {
    async function cargar() {
      const tk = await getToken();
      const [pArr, cArr, prArr] = await Promise.all([
        fetch(`${SUPA_URL}/proyectos?select=id,descripcion,numero_proyecto&order=numero_proyecto.asc`, { headers: hdrs(tk) }).then(r => r.json()),
        fetch(`${SUPA_URL}/clientes?select=id,empresa&order=empresa.asc`, { headers: hdrs(tk) }).then(r => r.json()),
        fetch(`${SUPA_URL}/presupuestos?select=id,codigo,descripcion,cliente&order=created_at.desc`, { headers: hdrs(tk) }).then(r => r.json()),
      ]);
      setProyectos(Array.isArray(pArr) ? pArr : []);
      setClientesCRM(Array.isArray(cArr) ? cArr : []);
      setPresupuestos(Array.isArray(prArr) ? prArr : []);
    }
    cargar();
  }, []);

  const ALCANCES = [
    { v: "solo_estructura",        label: "Solo estructura" },
    { v: "fundaciones_estructura", label: "Fundaciones + estructura" },
    { v: "obra_completa",          label: "Obra completa" },
  ];

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 16 }}>
      <div style={{ background: "#fff", borderRadius: 16, padding: 28, width: "100%", maxWidth: 480, maxHeight: "90vh", overflowY: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
          <h3 style={{ margin: 0, fontSize: 17 }}>Editar obra</h3>
          <button onClick={onClose} style={{ ...shared.btnSm, padding: "5px 10px" }}>✕</button>
        </div>

        {[
          { lbl: "Código", key: "codigo", ph: "2026-SF-531" },
          { lbl: "Nombre *", key: "nombre", ph: "Nombre de la obra" },
          { lbl: "Dirección", key: "direccion", ph: "Dirección de la obra" },
        ].map(f => (
          <div key={f.key} style={{ marginBottom: 12 }}>
            <span style={shared.lbl}>{f.lbl}</span>
            <input value={form[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))} style={shared.inp} placeholder={f.ph} />
          </div>
        ))}

        <div style={{ marginBottom: 12 }}>
          <span style={shared.lbl}>🏢 Cliente</span>
          <Combobox
            options={clientesCRM.map(c => ({ value: c.id, label: c.empresa }))}
            value={form.cliente_id}
            onChange={val => setForm(p => ({ ...p, cliente_id: val }))}
            placeholder="Buscar cliente..."
            emptyLabel="Sin vincular"
          />
        </div>

        <div style={{ marginBottom: 12 }}>
          <span style={shared.lbl}>Sistema constructivo</span>
          <div style={{ display: "flex", gap: 8 }}>
            {["Steel Frame","Wood Frame"].map(s => (
              <button key={s} onClick={() => setForm(p => ({ ...p, sistema_constructivo: s }))} style={{ ...shared.btnSm, flex: 1, background: form.sistema_constructivo === s ? "#111" : "#f0f0f0", color: form.sistema_constructivo === s ? "#fff" : "#333" }}>{s}</button>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: 12 }}>
          <span style={shared.lbl}>Alcance</span>
          <select value={form.alcance} onChange={e => setForm(p => ({ ...p, alcance: e.target.value }))} style={{ ...shared.inp }}>
            {ALCANCES.map(a => <option key={a.v} value={a.v}>{a.label}</option>)}
          </select>
        </div>

        <div style={{ display: "flex", gap: 12, marginBottom: 12 }}>
          <div style={{ flex: 1 }}>
            <span style={shared.lbl}>Inicio plan</span>
            <input type="date" value={form.fecha_inicio_plan} onChange={e => setForm(p => ({ ...p, fecha_inicio_plan: e.target.value }))} style={shared.inp} />
          </div>
          <div style={{ flex: 1 }}>
            <span style={shared.lbl}>Fin plan</span>
            <input type="date" value={form.fecha_fin_plan} onChange={e => setForm(p => ({ ...p, fecha_fin_plan: e.target.value }))} style={shared.inp} />
          </div>
        </div>

        {jefesList.length > 0 && (
          <div style={{ marginBottom: 12 }}>
            <span style={shared.lbl}>Responsable de obra</span>
            <select value={form.jefe_id} onChange={e => setForm(p => ({ ...p, jefe_id: e.target.value }))} style={shared.inp}>
              <option value="">Sin asignar</option>
              {jefesList.map(j => <option key={j.id} value={j.id}>{j.nombre}</option>)}
            </select>
          </div>
        )}

        {/* Vínculos */}
        <div style={{ background: "#f8f8f8", borderRadius: 10, padding: 14, marginBottom: 14 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#888", marginBottom: 12, textTransform: "uppercase", letterSpacing: .5 }}>Vínculos</div>
          <div style={{ marginBottom: 10 }}>
            <span style={shared.lbl}>📋 Proyecto</span>
            <Combobox
              options={proyectos.map(p => ({ value: p.id, label: `${p.numero_proyecto || ""} — ${p.descripcion || ""}`.trim() }))}
              value={form.proyecto_id}
              onChange={val => setForm(p => ({ ...p, proyecto_id: val }))}
              placeholder="Buscar proyecto..."
              emptyLabel="Sin vincular"
            />
          </div>
          <div style={{ marginBottom: 0 }}>
            <span style={shared.lbl}>💰 Presupuesto</span>
            <Combobox
              options={presupuestos.map(p => ({ value: p.id, label: `${p.codigo || ""} — ${p.descripcion || p.cliente || ""}`.trim() }))}
              value={form.presupuesto_id}
              onChange={val => setForm(p => ({ ...p, presupuesto_id: val }))}
              placeholder="Buscar presupuesto..."
              emptyLabel="Sin vincular"
            />
          </div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <span style={shared.lbl}>Notas internas</span>
          <textarea value={form.notas} onChange={e => setForm(p => ({ ...p, notas: e.target.value }))} rows={3} style={{ ...shared.inp, resize: "vertical" }} placeholder="Observaciones, contexto…" />
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => onGuardar(form)} disabled={!form.nombre} style={{ ...shared.btn, flex: 1 }}>Guardar cambios</button>
          <button onClick={onClose} style={{ ...shared.btnSm, flex: 1, padding: "10px" }}>Cancelar</button>
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════
   VISTA ADMIN
════════════════════════════════════════════ */
function VistaAdmin() {
  const [obras,         setObras]         = useState([]);
  const [selected,      setSelected]      = useState(null);
  const [tareas,        setTareas]        = useState([]);
  const [avancesTareas, setAvancesTareas] = useState({});
  const [archivosMap,   setArchivosMap]   = useState({});
  const [partes,        setPartes]        = useState([]);
  const [avancesObra,   setAvancesObra]   = useState({});
  const [loading,       setLoading]       = useState(true);
  const [savingTarea,   setSavingTarea]   = useState(null);
  const [panelTarea,    setPanelTarea]    = useState(null);
  const [showModal,     setShowModal]     = useState(false);
  const [showEditObra,  setShowEditObra]  = useState(false);
  const [showTareaM,    setShowTareaM]    = useState(false);
  const [jefesList,     setJefesList]     = useState([]);
  const [nuevaObra,     setNuevaObra]     = useState({ nombre: "", cliente_id: "", direccion: "", codigo: "", sistema_constructivo: "Steel Frame", alcance: "obra_completa", fecha_inicio_plan: "", fecha_fin_plan: "", jefe_id: "" });
  const [nuevaTarea,    setNuevaTarea]    = useState({ nombre: "", etapa: "", descripcion: "", fecha_inicio_plan: "", fecha_fin_plan: "" });
  const [msg,           setMsg]           = useState("");
  const [isMobile,      setIsMobile]      = useState(window.innerWidth < 768);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", check);
    cargarTodo();
    return () => window.removeEventListener("resize", check);
  }, []);

  async function cargarTodo() {
    setLoading(true);
    const tk = await getToken();
    const [obrasData, jefesData] = await Promise.all([
      fetch(`${SUPA_URL}/obras_campo?order=created_at.desc&select=*`, { headers: hdrs(tk) }).then(r => r.json()),
      fetch(`${SUPA_URL}/perfiles?rol=eq.jefe_obra&select=id,nombre`, { headers: hdrs(tk) }).then(r => r.json()),
    ]);
    const obrasArr = Array.isArray(obrasData) ? obrasData : [];
    setJefesList(Array.isArray(jefesData) ? jefesData : []);

    // Avance por obra
    const avMap = {};
    await Promise.all(obrasArr.map(async o => {
      const tk2 = await getToken();
      const tArr = await fetch(`${SUPA_URL}/tareas_obra?obra_id=eq.${o.id}&select=id`, { headers: hdrs(tk2) }).then(r => r.json());
      if (!Array.isArray(tArr) || tArr.length === 0) { avMap[o.id] = 0; return; }
      const ids = tArr.map(t => t.id).join(",");
      const avArr = await fetch(`${SUPA_URL}/avances_tarea?tarea_id=in.(${ids})&order=created_at.desc`, { headers: hdrs(tk2) }).then(r => r.json());
      if (!Array.isArray(avArr) || avArr.length === 0) { avMap[o.id] = 0; return; }
      const latest = {};
      avArr.forEach(a => { if (!latest[a.tarea_id]) latest[a.tarea_id] = a.porcentaje; });
      const vals = Object.values(latest);
      avMap[o.id] = Math.round(vals.reduce((s, v) => s + v, 0) / tArr.length);
    }));
    setAvancesObra(avMap);
    setObras(obrasArr);
    setLoading(false);
  }

  async function seleccionar(o) {
    setSelected(o); setTareas([]); setAvancesTareas({}); setArchivosMap({}); setPartes([]);
    const tk = await getToken();
    const [tArr, pArr] = await Promise.all([
      fetch(`${SUPA_URL}/tareas_obra?obra_id=eq.${o.id}&order=orden.asc`, { headers: hdrs(tk) }).then(r => r.json()),
      fetch(`${SUPA_URL}/partes_diarios?obra_id=eq.${o.id}&order=fecha.desc&limit=15`, { headers: hdrs(tk) }).then(r => r.json()),
    ]);
    const tFinal = Array.isArray(tArr) ? tArr : [];
    setTareas(tFinal);
    setPartes(Array.isArray(pArr) ? pArr : []);

    const { avMap, archMap } = await cargarAvancesYArchivos(tFinal);
    const archByTarea = {};
    Object.entries(avMap).forEach(([tareaId, av]) => {
      archByTarea[tareaId] = archMap[av.id] || [];
    });
    setAvancesTareas(avMap);
    setArchivosMap(archByTarea);
  }

  async function guardarAvanceTarea(tareaId, pct, nota = null, archivoData = null) {
    setSavingTarea(tareaId);
    try {
      const tk = await getToken();
      const hoy = new Date().toISOString().slice(0, 10);
      const { data: { user } } = await supabase.auth.getUser();
      const uid = user?.id;

      let parteHoy = partes.find(p => p.fecha === hoy);
      if (!parteHoy) {
        const existentes = await fetch(`${SUPA_URL}/partes_diarios?obra_id=eq.${selected.id}&fecha=eq.${hoy}`, { headers: hdrs(tk) }).then(r => r.json());
        if (Array.isArray(existentes) && existentes.length > 0) {
          parteHoy = existentes[0];
        } else {
          const r = await fetch(`${SUPA_URL}/partes_diarios`, { method: "POST", headers: hdrs(tk), body: JSON.stringify({ obra_id: selected.id, fecha: hoy, jefe_id: uid }) });
          const rows = await r.json();
          parteHoy = rows[0];
        }
        setPartes(prev => [parteHoy, ...prev.filter(p => p.fecha !== hoy)]);
      }

      const existing = avancesTareas[tareaId];
      let avanceId;
      if (existing) {
        await fetch(`${SUPA_URL}/avances_tarea?id=eq.${existing.id}`, { method: "PATCH", headers: hdrs(tk), body: JSON.stringify({ porcentaje: pct, ...(nota !== null ? { nota } : {}) }) });
        avanceId = existing.id;
      } else {
        const r = await fetch(`${SUPA_URL}/avances_tarea`, { method: "POST", headers: hdrs(tk), body: JSON.stringify({ parte_id: parteHoy.id, tarea_id: tareaId, porcentaje: pct, nota }) });
        const rows = await r.json();
        avanceId = rows[0].id;
      }

      if (archivoData && avanceId) {
        await fetch(`${SUPA_URL}/archivos_avance`, { method: "POST", headers: hdrs(tk), body: JSON.stringify({ avance_id: avanceId, tipo: archivoData.tipo, url: archivoData.path, nombre_archivo: archivoData.nombre, storage_path: archivoData.path }) });
        const url = await getUrlFirmada(archivoData.path);
        setArchivosMap(prev => ({ ...prev, [tareaId]: [...(prev[tareaId] || []), { ...archivoData, id: Date.now(), signedUrl: url }] }));
      }

      const newAv = { ...avancesTareas, [tareaId]: { ...avancesTareas[tareaId], id: avanceId, porcentaje: pct, nota: nota || avancesTareas[tareaId]?.nota } };
      setAvancesTareas(newAv);
      const vals = tareas.map(t => newAv[t.id]?.porcentaje || 0);
      setAvancesObra(prev => ({ ...prev, [selected.id]: Math.round(vals.reduce((s, v) => s + v, 0) / tareas.length) }));
      setMsg("✓ Guardado"); setTimeout(() => setMsg(""), 2000);
    } catch (e) { console.error(e); setMsg("Error al guardar"); setTimeout(() => setMsg(""), 3000); }
    setSavingTarea(null);
  }

  async function editarObra(form) {
    const tk = await getToken();
    await fetch(`${SUPA_URL}/obras_campo?id=eq.${selected.id}`, { method: "PATCH", headers: hdrs(tk), body: JSON.stringify(form) });
    setSelected(prev => ({ ...prev, ...form }));
    setObras(prev => prev.map(o => o.id === selected.id ? { ...o, ...form } : o));
    setShowEditObra(false);
    setMsg("✓ Obra actualizada"); setTimeout(() => setMsg(""), 2000);
  }

  async function crearObra() {
    const tk = await getToken();
    await fetch(`${SUPA_URL}/obras_campo`, { method: "POST", headers: hdrs(tk), body: JSON.stringify(nuevaObra) });
    setShowModal(false);
    setNuevaObra({ nombre: "", cliente_id: "", direccion: "", codigo: "", sistema_constructivo: "Steel Frame", alcance: "obra_completa", fecha_inicio_plan: "", fecha_fin_plan: "", jefe_id: "" });
    cargarTodo();
  }

  async function crearTarea() {
    if (!selected) return;
    const tk = await getToken();
    await fetch(`${SUPA_URL}/tareas_obra`, { method: "POST", headers: hdrs(tk), body: JSON.stringify({ ...nuevaTarea, obra_id: selected.id, orden: tareas.length + 1 }) });
    setShowTareaM(false);
    setNuevaTarea({ nombre: "", etapa: "", descripcion: "", fecha_inicio_plan: "", fecha_fin_plan: "" });
    seleccionar(selected);
  }

  async function cambiarEstado(id, estado) {
    const tk = await getToken();
    await fetch(`${SUPA_URL}/obras_campo?id=eq.${id}`, { method: "PATCH", headers: hdrs(tk), body: JSON.stringify({ estado }) });
    cargarTodo();
    if (selected?.id === id) setSelected(prev => ({ ...prev, estado }));
  }

  const porEtapa = {};
  tareas.forEach(t => {
    const e = t.etapa || "Sin etapa";
    if (!porEtapa[e]) porEtapa[e] = [];
    porEtapa[e].push(t);
  });

  const jefeNombre = selected ? jefesList.find(j => j.id === selected.jefe_id)?.nombre : null;

  const S = {
    wrap:   { display: "flex", minHeight: "100vh", fontFamily: "system-ui, -apple-system, sans-serif", flexDirection: isMobile ? "column" : "row" },
    list:   isMobile ? { background: "#fff", borderBottom: "1px solid #eee" } : { width: 280, borderRight: "1px solid #e8e8e8", background: "#fafafa", overflowY: "auto", flexShrink: 0 },
    detail: { flex: 1, padding: isMobile ? 16 : 28, overflowY: "auto" },
    btn:    { ...shared.btn },
    btnSm:  { ...shared.btnSm, minHeight: 36 },
    inp:    { ...shared.inp },
    lbl:    { ...shared.lbl },
  };

  return (
    <div style={S.wrap}>
      {/* Lista obras */}
      {(!isMobile || !selected) && (
        <div style={S.list}>
          <div style={{ padding: "14px 16px", borderBottom: "1px solid #e8e8e8", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontWeight: 700, fontSize: 15 }}>🏗️ Obras</span>
            <button onClick={() => setShowModal(true)} style={{ ...S.btn, padding: "5px 10px", fontSize: 12 }}>+ Nueva</button>
          </div>
          {loading ? <p style={{ padding: 20, color: "#aaa", fontSize: 13 }}>Cargando…</p> : obras.map(o => {
            const pct = avancesObra[o.id] || 0;
            return (
              <div key={o.id} style={{ borderBottom: "1px solid #f0f0f0", background: !isMobile && selected?.id === o.id ? "#111" : "#fff" }}>
                <div onClick={() => seleccionar(o)} style={{ padding: "12px 16px 6px", cursor: "pointer" }}>
                  {o.codigo && <div style={{ fontSize: 10, fontWeight: 700, color: !isMobile && selected?.id === o.id ? "#666" : "#aaa", marginBottom: 2 }}>{o.codigo}</div>}
                  <div style={{ fontWeight: 600, fontSize: 13, color: !isMobile && selected?.id === o.id ? "#fff" : "#111" }}>{o.nombre}</div>
                </div>
                <div style={{ padding: "0 12px 6px" }}>
                  <select
                    value={o.jefe_id || ""}
                    onChange={async e => {
                      const nuevoJefeId = e.target.value;
                      const tk = await getToken();
                      await fetch(`${SUPA_URL}/obras_campo?id=eq.${o.id}`, { method: "PATCH", headers: hdrs(tk), body: JSON.stringify({ jefe_id: nuevoJefeId || null }) });
                      setObras(prev => prev.map(ob => ob.id === o.id ? { ...ob, jefe_id: nuevoJefeId || null } : ob));
                      if (selected?.id === o.id) setSelected(prev => ({ ...prev, jefe_id: nuevoJefeId || null }));
                    }}
                    style={{ fontSize: 11, padding: "4px 8px", border: "1px solid " + (!isMobile && selected?.id === o.id ? "#444" : "#e0e0e0"), borderRadius: 6, background: !isMobile && selected?.id === o.id ? "#222" : "#f8f8f8", color: !isMobile && selected?.id === o.id ? "#ccc" : "#555", cursor: "pointer", width: "100%" }}
                  >
                    <option value="">👷 Sin responsable</option>
                    {jefesList.map(j => <option key={j.id} value={j.id}>👷 {j.nombre}</option>)}
                  </select>
                </div>
                <div onClick={() => seleccionar(o)} style={{ padding: "0 16px 12px", cursor: "pointer" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 3 }}>
                    <span style={{ display: "flex", alignItems: "center", gap: 4, color: !isMobile && selected?.id === o.id ? "#aaa" : "#888" }}>
                      <span style={{ width: 7, height: 7, borderRadius: "50%", background: ESTADO_COLOR[o.estado] || "#888", display: "inline-block" }} />
                      {o.estado}
                    </span>
                    <span style={{ fontWeight: 700, color: !isMobile && selected?.id === o.id ? "#fff" : "#111" }}>{pct}%</span>
                  </div>
                  <div style={{ height: 4, background: !isMobile && selected?.id === o.id ? "#333" : "#eee", borderRadius: 2, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${pct}%`, background: pct === 100 ? "#22c55e" : !isMobile && selected?.id === o.id ? "#fff" : "#111" }} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Detalle */}
      {(!isMobile || selected) && (
        <div style={S.detail}>
          {!selected ? (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 10 }}>
                <h2 style={{ margin: 0, fontSize: isMobile ? 18 : 22, fontWeight: 700 }}>Dashboard de obras</h2>
                <button onClick={() => setShowModal(true)} style={{ ...S.btn, padding: "8px 14px", fontSize: 13 }}>+ Nueva obra</button>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fill, minmax(260px, 1fr))", gap: 14 }}>
                {obras.map(o => {
                  const pct = avancesObra[o.id] || 0;
                  const jefe = jefesList.find(j => j.id === o.jefe_id);
                  return (
                    <div key={o.id} onClick={() => seleccionar(o)} style={{ ...shared.card, cursor: "pointer" }}
                      onMouseEnter={e => !isMobile && (e.currentTarget.style.boxShadow = "0 6px 20px rgba(0,0,0,.1)")}
                      onMouseLeave={e => !isMobile && (e.currentTarget.style.boxShadow = shared.card.boxShadow)}>
                      {o.codigo && <div style={{ fontSize: 10, fontWeight: 700, color: "#aaa", marginBottom: 4 }}>{o.codigo}</div>}
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                        <div style={{ flex: 1, marginRight: 10 }}>
                          <div style={{ fontWeight: 700, fontSize: 14 }}>{o.nombre}</div>
                          {jefe && <div style={{ fontSize: 12, color: "#aaa", marginTop: 2 }}>👷 {jefe.nombre}</div>}
                        </div>
                        <span style={{ fontSize: 24, fontWeight: 800, color: pct === 100 ? "#22c55e" : "#111" }}>{pct}%</span>
                      </div>
                      <div style={{ height: 8, background: "#f0f0f0", borderRadius: 4, overflow: "hidden", marginBottom: 8 }}>
                        <div style={{ height: "100%", width: `${pct}%`, background: pct === 100 ? "#22c55e" : "#111" }} />
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#888" }}>
                        <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                          <span style={{ width: 8, height: 8, borderRadius: "50%", background: ESTADO_COLOR[o.estado] || "#888", display: "inline-block" }} />
                          {o.estado}
                        </span>
                        {o.fecha_fin_plan && <span>Plazo: {new Date(o.fecha_fin_plan + "T12:00").toLocaleDateString("es-AR")}</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <>
              {/* Header obra */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20, flexWrap: "wrap", gap: 10 }}>
                <div>
                  <button onClick={() => setSelected(null)} style={{ fontSize: 13, color: "#888", background: "none", border: "none", cursor: "pointer", padding: "0 0 6px", display: "block" }}>← Volver</button>
                  {selected.codigo && <div style={{ fontSize: 11, fontWeight: 700, color: "#aaa", marginBottom: 2 }}>{selected.codigo}</div>}
                  <h2 style={{ margin: 0, fontSize: isMobile ? 18 : 22, fontWeight: 700 }}>{selected.nombre}</h2>
                  {selected.direccion && <p style={{ margin: "2px 0 0", color: "#aaa", fontSize: 12 }}>{selected.direccion}</p>}
                  {jefeNombre && (
                    <div style={{ marginTop: 6, display: "inline-flex", alignItems: "center", gap: 6, background: "#f5f5f5", borderRadius: 20, padding: "4px 12px" }}>
                      <span style={{ fontSize: 12 }}>👷</span>
                      <span style={{ fontSize: 12, fontWeight: 600, color: "#555" }}>{jefeNombre}</span>
                    </div>
                  )}
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button onClick={() => setShowEditObra(true)} style={{ ...S.btnSm, padding: "8px 12px", fontSize: 16 }} title="Editar obra">☰</button>
                  {selected.estado !== "activa"     && <button onClick={() => cambiarEstado(selected.id, "activa")}     style={{ ...S.btn, background: "#22c55e", padding: "7px 12px", fontSize: 12 }}>Activar</button>}
                  {selected.estado !== "pausada"    && <button onClick={() => cambiarEstado(selected.id, "pausada")}    style={{ ...S.btn, background: "#f59e0b", padding: "7px 12px", fontSize: 12 }}>Pausar</button>}
                  {selected.estado !== "finalizada" && <button onClick={() => cambiarEstado(selected.id, "finalizada")} style={{ ...S.btn, background: "#888",    padding: "7px 12px", fontSize: 12 }}>Finalizar</button>}
                </div>
              </div>

              {msg && <div style={{ background: "#d4edda", color: "#155724", padding: "10px 16px", borderRadius: 10, marginBottom: 16, fontSize: 13 }}>{msg}</div>}

              {/* Vínculos activos */}
              {(selected.cliente_id || selected.proyecto_id || selected.presupuesto_id) && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
                  {selected.proyecto_id    && <span style={{ fontSize: 12, background: "#eff6ff", color: "#1d4ed8", borderRadius: 20, padding: "4px 12px" }}>📋 Proyecto</span>}
                  {selected.cliente_id     && <span style={{ fontSize: 12, background: "#fdf4ff", color: "#7e22ce", borderRadius: 20, padding: "4px 12px" }}>🏢 Cliente</span>}
                  {selected.presupuesto_id && <span style={{ fontSize: 12, background: "#fff7ed", color: "#c2410c", borderRadius: 20, padding: "4px 12px" }}>💰 Presupuesto</span>}
                </div>
              )}

              {/* Avance general */}
              <div style={{ ...shared.card, marginBottom: 24 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                  <span style={{ fontWeight: 600, fontSize: 15 }}>Avance general</span>
                  <span style={{ fontWeight: 800, fontSize: 24 }}>{avancesObra[selected.id] || 0}%</span>
                </div>
                <div style={{ height: 10, background: "#f0f0f0", borderRadius: 5, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${avancesObra[selected.id] || 0}%`, background: "#111", transition: "width .5s" }} />
                </div>
                {Object.keys(porEtapa).length > 0 && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 14 }}>
                    {ETAPAS_ORDEN.filter(e => porEtapa[e]).map(etapa => {
                      const tArr = porEtapa[etapa];
                      const pctE = Math.round(tArr.reduce((s, t) => s + (avancesTareas[t.id]?.porcentaje || 0), 0) / tArr.length);
                      const color = ETAPA_COLOR[etapa] || "#888";
                      return (
                        <div key={etapa} style={{ display: "flex", alignItems: "center", gap: 5, background: "#f5f5f5", borderRadius: 20, padding: "5px 12px" }}>
                          <span style={{ width: 8, height: 8, borderRadius: "50%", background: color, display: "inline-block" }} />
                          <span style={{ fontSize: 12, color: "#555" }}>{etapa}</span>
                          <span style={{ fontSize: 12, fontWeight: 700, color }}>{pctE}%</span>
                        </div>
                      );
                    })}
                  </div>
                )}
                {(selected.fecha_inicio_plan || selected.fecha_fin_plan) && (
                  <div style={{ display: "flex", gap: 20, marginTop: 12, fontSize: 13, color: "#666", flexWrap: "wrap" }}>
                    {selected.fecha_inicio_plan && <span>Inicio: {new Date(selected.fecha_inicio_plan + "T12:00").toLocaleDateString("es-AR")}</span>}
                    {selected.fecha_fin_plan    && <span>Fin plan: {new Date(selected.fecha_fin_plan + "T12:00").toLocaleDateString("es-AR")}</span>}
                  </div>
                )}
              </div>

              {/* Tareas por etapa */}
              <div style={{ marginBottom: 28 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                  <h3 style={{ margin: 0, fontSize: 17 }}>Tareas</h3>
                  <button onClick={() => setShowTareaM(true)} style={{ ...S.btn, padding: "7px 14px", fontSize: 13 }}>+ Tarea</button>
                </div>
                {tareas.length === 0 ? <p style={{ color: "#aaa" }}>Sin tareas.</p> : (
                  ETAPAS_ORDEN.filter(e => porEtapa[e]).map(etapa => {
                    const color = ETAPA_COLOR[etapa] || "#888";
                    const tArr = porEtapa[etapa];
                    const pctE = Math.round(tArr.reduce((s, t) => s + (avancesTareas[t.id]?.porcentaje || 0), 0) / tArr.length);
                    return (
                      <div key={etapa} style={{ marginBottom: 20 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10, paddingBottom: 6, borderBottom: `2px solid ${color}` }}>
                          <span style={{ width: 10, height: 10, borderRadius: "50%", background: color, display: "inline-block" }} />
                          <span style={{ fontWeight: 700, fontSize: 14, flex: 1 }}>{etapa}</span>
                          <span style={{ fontSize: 14, fontWeight: 700, color }}>{pctE}%</span>
                        </div>
                        {tArr.map(t => (
                          <TareaCard
                            key={t.id}
                            tarea={t}
                            avance={avancesTareas[t.id]}
                            archivos={archivosMap[t.id]}
                            color={color}
                            isMobile={isMobile}
                            onMarcarAvance={pct => setPanelTarea({ tarea: t, pct, mode: "avance" })}
                            onVerHistorial={() => setPanelTarea({ tarea: t, mode: "historial" })}
                          />
                        ))}
                      </div>
                    );
                  })
                )}
              </div>

              {/* Últimos partes */}
              <div>
                <h3 style={{ margin: "0 0 14px", fontSize: 17 }}>Últimos partes</h3>
                {partes.length === 0 ? <p style={{ color: "#aaa" }}>Sin partes.</p> : partes.map(p => (
                  <div key={p.id} style={{ ...shared.card, marginBottom: 8 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                      <span style={{ fontWeight: 600, fontSize: 14 }}>{new Date(p.fecha + "T12:00").toLocaleDateString("es-AR", { weekday: "short", day: "numeric", month: "short" })}</span>
                      <span style={{ fontSize: 13, color: "#888" }}>{CLIMAS.find(c => c.v === p.clima)?.label || ""}</span>
                    </div>
                    {p.personal_cantidad && <div style={{ fontSize: 13, color: "#888" }}>👷 {p.personal_cantidad} personas · ⏱ {p.horas_trabajadas}hs</div>}
                    {p.observaciones && <p style={{ margin: "6px 0 0", fontSize: 13, color: "#444" }}>{p.observaciones}</p>}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* Modales */}
      {showModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 16 }}>
          <div style={{ background: "#fff", borderRadius: 16, padding: 28, width: "100%", maxWidth: 440, maxHeight: "90vh", overflowY: "auto" }}>
            <h3 style={{ margin: "0 0 20px" }}>Nueva obra</h3>
            {[
              { lbl: "Código", key: "codigo", ph: "2026-SF-531" },
              { lbl: "Nombre *", key: "nombre", ph: "Nombre de la obra" },
              { lbl: "Dirección", key: "direccion", ph: "Dirección de la obra" },
            ].map(f => (
              <div key={f.key} style={{ marginBottom: 10 }}>
                <span style={S.lbl}>{f.lbl}</span>
                <input value={nuevaObra[f.key] || ""} onChange={e => setNuevaObra(p => ({ ...p, [f.key]: e.target.value }))} style={S.inp} placeholder={f.ph} />
              </div>
            ))}
            <div style={{ marginBottom: 10 }}>
              <span style={S.lbl}>Sistema</span>
              <div style={{ display: "flex", gap: 8 }}>
                {["Steel Frame","Wood Frame"].map(s => (
                  <button key={s} onClick={() => setNuevaObra(p => ({ ...p, sistema_constructivo: s }))} style={{ ...S.btnSm, flex: 1, background: nuevaObra.sistema_constructivo === s ? "#111" : "#f0f0f0", color: nuevaObra.sistema_constructivo === s ? "#fff" : "#333" }}>{s}</button>
                ))}
              </div>
            </div>
            <div style={{ display: "flex", gap: 12, marginBottom: 10 }}>
              <div style={{ flex: 1 }}><span style={S.lbl}>Inicio plan</span><input type="date" value={nuevaObra.fecha_inicio_plan} onChange={e => setNuevaObra(p => ({ ...p, fecha_inicio_plan: e.target.value }))} style={S.inp} /></div>
              <div style={{ flex: 1 }}><span style={S.lbl}>Fin plan</span><input type="date" value={nuevaObra.fecha_fin_plan} onChange={e => setNuevaObra(p => ({ ...p, fecha_fin_plan: e.target.value }))} style={S.inp} /></div>
            </div>
            {jefesList.length > 0 && (
              <div style={{ marginBottom: 10 }}>
                <span style={S.lbl}>Responsable</span>
                <select value={nuevaObra.jefe_id} onChange={e => setNuevaObra(p => ({ ...p, jefe_id: e.target.value }))} style={S.inp}>
                  <option value="">Sin asignar</option>
                  {jefesList.map(j => <option key={j.id} value={j.id}>{j.nombre}</option>)}
                </select>
              </div>
            )}
            <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
              <button onClick={crearObra} disabled={!nuevaObra.nombre} style={{ ...S.btn, flex: 1 }}>Crear obra</button>
              <button onClick={() => setShowModal(false)} style={{ ...S.btnSm, flex: 1, padding: "10px" }}>Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {showTareaM && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 16 }}>
          <div style={{ background: "#fff", borderRadius: 16, padding: 28, width: "100%", maxWidth: 400 }}>
            <h3 style={{ margin: "0 0 20px" }}>Nueva tarea</h3>
            <span style={S.lbl}>Etapa</span>
            <select value={nuevaTarea.etapa} onChange={e => setNuevaTarea(p => ({ ...p, etapa: e.target.value }))} style={{ ...S.inp, marginBottom: 10 }}>
              <option value="">Sin etapa</option>
              {ETAPAS_ORDEN.filter(e => e !== "Sin etapa").map(e => <option key={e} value={e}>{e}</option>)}
            </select>
            <span style={S.lbl}>Nombre *</span>
            <input value={nuevaTarea.nombre} onChange={e => setNuevaTarea(p => ({ ...p, nombre: e.target.value }))} style={{ ...S.inp, marginBottom: 10 }} placeholder="Ej: Fabricar paneles" />
            <span style={S.lbl}>Descripción</span>
            <input value={nuevaTarea.descripcion || ""} onChange={e => setNuevaTarea(p => ({ ...p, descripcion: e.target.value }))} style={{ ...S.inp, marginBottom: 10 }} placeholder="Detalle (opcional)" />
            <div style={{ display: "flex", gap: 12 }}>
              <div style={{ flex: 1 }}><span style={S.lbl}>Inicio plan</span><input type="date" value={nuevaTarea.fecha_inicio_plan} onChange={e => setNuevaTarea(p => ({ ...p, fecha_inicio_plan: e.target.value }))} style={S.inp} /></div>
              <div style={{ flex: 1 }}><span style={S.lbl}>Fin plan</span><input type="date" value={nuevaTarea.fecha_fin_plan} onChange={e => setNuevaTarea(p => ({ ...p, fecha_fin_plan: e.target.value }))} style={S.inp} /></div>
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
              <button onClick={crearTarea} disabled={!nuevaTarea.nombre} style={{ ...S.btn, flex: 1 }}>Agregar</button>
              <button onClick={() => setShowTareaM(false)} style={{ ...S.btnSm, flex: 1, padding: "10px" }}>Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {showEditObra && selected && (
        <ModalEditarObra obra={selected} jefesList={jefesList} onGuardar={editarObra} onClose={() => setShowEditObra(false)} />
      )}

      {/* Panel avance — admin */}
      {panelTarea?.mode === "avance" && (
        <PanelAvance
          tarea={panelTarea.tarea}
          avanceActual={panelTarea.pct}
          notaActual={avancesTareas[panelTarea.tarea.id]?.nota}
          obraCodigo={selected?.codigo}
          onGuardar={async (pct, nota, arch) => {
            await guardarAvanceTarea(panelTarea.tarea.id, pct, nota, arch);
            setPanelTarea(null);
          }}
          onClose={() => setPanelTarea(null)}
        />
      )}

      {/* Panel historial — admin */}
      {panelTarea?.mode === "historial" && (
        <PanelHistorial
          tarea={panelTarea.tarea}
          obraCodigo={selected?.codigo}
          onClose={() => setPanelTarea(null)}
        />
      )}
    </div>
  );
}

/* ════════════════════════════════════════════
   EXPORT
════════════════════════════════════════════ */
export default function Obras({ perfil, onLogout }) {
  if (!perfil) return <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", color: "#aaa", fontFamily: "system-ui" }}>Cargando…</div>;
  if (perfil.rol === "jefe_obra") return <VistaJefe perfil={perfil} onLogout={onLogout} />;
  return <VistaAdmin />;
}
