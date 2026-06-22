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

/* ─── Constantes ─── */
const SISTEMAS = ["Steel Frame","Wood Frame","Ladrillo","Hormigón Armado","SIP Panel","Metálico","Prefab","Mixto"];
const ALCANCES = [
  { v: "fundacion",            label: "Fundación" },
  { v: "steel_frame_obra_gris",label: "Steel Frame Obra Gris" },
  { v: "fundacion_steel_frame",label: "Fundación + Steel Frame" },
  { v: "estructura",           label: "Estructura" },
  { v: "obra_completa",        label: "Obra completa" },
  { v: "llave_en_mano",        label: "Llave en mano" },
];
const CARPETAS = [
  { num: 1, nombre: "Contrato y Presupuesto", icon: "📄", subs: [] },
  { num: 2, nombre: "Proyecto",               icon: "📐", subs: ["00-Estudio de suelos","01-Arquitectura","02-Ingeniería"] },
  { num: 3, nombre: "Cómputo y Presupuesto",  icon: "📊", subs: [] },
  { num: 4, nombre: "Plan de trabajo y Gantt",icon: "📅", subs: [] },
  { num: 5, nombre: "Inspecciones y Checklist",icon:"✅", subs: [] },
  { num: 6, nombre: "Fotos y Videos",         icon: "📷", subs: [] },
];
const ETAPA_COLOR = {
  "Arranque":"#6366f1","Estructura":"#f59e0b","Exterior":"#3b82f6",
  "Cubierta":"#8b5cf6","Interior":"#10b981","Terminaciones":"#ec4899",
  "Instalaciones":"#14b8a6","Sin etapa":"#888",
};
const CLIMAS = [
  {v:"bueno",label:"☀️ Bueno"},{v:"nublado",label:"⛅ Nublado"},
  {v:"lluvia",label:"🌧️ Lluvia"},{v:"viento",label:"💨 Viento"},{v:"helada",label:"🧊 Helada"},
];
const TIPOS_EVENTO = [
  {v:"remito",label:"📦 Remito"},{v:"paralizacion",label:"⏸️ Paralización"},
  {v:"visita",label:"👁️ Visita"},{v:"incidente",label:"⚠️ Incidente"},{v:"otro",label:"📝 Otro"},
];

const shared = {
  btn:   { padding:"10px 18px", background:"#111", color:"#fff", border:"none", borderRadius:10, fontSize:14, fontWeight:600, cursor:"pointer" },
  btnSm: { padding:"7px 12px", background:"#f0f0f0", color:"#333", border:"none", borderRadius:8, fontSize:13, cursor:"pointer" },
  inp:   { width:"100%", padding:"10px 12px", border:"1px solid #e0e0e0", borderRadius:10, fontSize:14, boxSizing:"border-box" },
  card:  { background:"#fff", borderRadius:14, padding:16, boxShadow:"0 1px 6px rgba(0,0,0,.07)" },
  lbl:   { fontSize:11, color:"#888", fontWeight:600, textTransform:"uppercase", letterSpacing:.5, marginBottom:5, display:"block" },
};

/* ════════════════════════════════════════════
   UPLOAD ARCHIVO A SUPABASE STORAGE
════════════════════════════════════════════ */
async function uploadArchivo(file, obraId, carpetaNum, subcarpeta) {
  const ext = file.name.split(".").pop();
  const sub = subcarpeta ? `${subcarpeta}/` : "";
  const path = `obras/${obraId}/carpeta-${carpetaNum}/${sub}${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from("npl-obras").upload(path, file, { upsert:true, contentType:file.type });
  if (error) throw new Error(error.message);
  return path;
}
async function getUrlFirmada(path) {
  const { data } = await supabase.storage.from("npl-obras").createSignedUrl(path, 3600);
  return data?.signedUrl || null;
}

/* ════════════════════════════════════════════
   CARPETA 4 — PLAN DE TRABAJO Y GANTT
════════════════════════════════════════════ */
function PanelSubtareaRegistro({ subtarea, onClose, onGuardado }) {
  const [registros, setRegistros] = useState([]);
  const [form, setForm] = useState({ fecha: new Date().toISOString().slice(0,10), dias:1, personas:1, observaciones:"" });
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function cargar() {
      const tk = await getToken();
      const r = await fetch(`${SUPA_URL}/subtarea_registros?subtarea_id=eq.${subtarea.id}&order=fecha.asc`, { headers:hdrs(tk) }).then(r=>r.json());
      setRegistros(Array.isArray(r) ? r : []);
      setLoading(false);
    }
    cargar();
  }, [subtarea.id]);

  async function guardar() {
    setSaving(true);
    const tk = await getToken();
    const r = await fetch(`${SUPA_URL}/subtarea_registros`, {
      method:"POST", headers:hdrs(tk),
      body: JSON.stringify({ subtarea_id: subtarea.id, ...form, dias: parseFloat(form.dias)||1, personas: parseInt(form.personas)||1 })
    }).then(r=>r.json());
    const nuevo = r[0];
    setRegistros(prev => [...prev, nuevo]);
    setForm(f => ({ ...f, observaciones:"" }));
    onGuardado && onGuardado(nuevo);
    setSaving(false);
  }

  const totalDias = registros.reduce((s,r) => s+(parseFloat(r.dias)||0), 0);
  const promPersonas = registros.length ? Math.round(registros.reduce((s,r)=>s+(r.personas||0),0)/registros.length) : 0;

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.6)", display:"flex", alignItems:"flex-end", justifyContent:"center", zIndex:300 }}>
      <div style={{ background:"#fff", borderRadius:"20px 20px 0 0", padding:"20px 20px 40px", width:"100%", maxWidth:560, maxHeight:"90vh", overflowY:"auto" }}>
        <div style={{ width:40, height:4, background:"#e0e0e0", borderRadius:2, margin:"0 auto 16px" }} />
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:16 }}>
          <div>
            {subtarea.codigo && <div style={{ fontSize:11, color:"#888", fontWeight:700 }}>{subtarea.codigo}</div>}
            <div style={{ fontWeight:700, fontSize:17 }}>{subtarea.nombre}</div>
            {subtarea.dias_teoricos > 0 && <div style={{ fontSize:12, color:"#6366f1", marginTop:2 }}>⏱ {subtarea.dias_teoricos} días teóricos</div>}
          </div>
          <button onClick={onClose} style={{ ...shared.btnSm, padding:"6px 10px" }}>✕</button>
        </div>

        {/* Resumen */}
        {registros.length > 0 && (
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8, marginBottom:16 }}>
            {[
              { label:"Días reales", value: totalDias, color: totalDias > (subtarea.dias_teoricos||0) && subtarea.dias_teoricos > 0 ? "#ef4444" : "#22c55e" },
              { label:"Días teóricos", value: subtarea.dias_teoricos || "—", color:"#6366f1" },
              { label:"Personas prom.", value: promPersonas, color:"#f59e0b" },
            ].map(k => (
              <div key={k.label} style={{ background:"#f8f8f8", borderRadius:10, padding:"10px 12px", textAlign:"center" }}>
                <div style={{ fontSize:20, fontWeight:800, color:k.color }}>{k.value}</div>
                <div style={{ fontSize:10, color:"#888", marginTop:2 }}>{k.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Historial */}
        {loading ? <p style={{ color:"#aaa", fontSize:13 }}>Cargando…</p> : registros.map((reg,i) => (
          <div key={reg.id} style={{ borderBottom:"1px solid #f0f0f0", paddingBottom:10, marginBottom:10 }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <span style={{ fontSize:13, fontWeight:600 }}>{new Date(reg.fecha+"T12:00").toLocaleDateString("es-AR",{weekday:"short",day:"numeric",month:"short"})}</span>
              <div style={{ display:"flex", gap:12, fontSize:13, color:"#555" }}>
                <span>📅 {reg.dias} día{reg.dias!==1?"s":""}</span>
                <span>👷 {reg.personas} pers.</span>
              </div>
            </div>
            {reg.observaciones && <div style={{ fontSize:12, color:"#666", marginTop:4, fontStyle:"italic" }}>💬 {reg.observaciones}</div>}
          </div>
        ))}

        {/* Form nuevo registro */}
        <div style={{ background:"#f8f8f8", borderRadius:12, padding:14, marginTop:8 }}>
          <span style={shared.lbl}>Nuevo registro</span>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8, marginBottom:10 }}>
            <div>
              <label style={{ fontSize:11, color:"#888", display:"block", marginBottom:3 }}>Fecha</label>
              <input type="date" value={form.fecha} onChange={e=>setForm(f=>({...f,fecha:e.target.value}))} style={shared.inp} />
            </div>
            <div>
              <label style={{ fontSize:11, color:"#888", display:"block", marginBottom:3 }}>Días</label>
              <input type="number" min="0.5" step="0.5" value={form.dias} onChange={e=>setForm(f=>({...f,dias:e.target.value}))} style={shared.inp} />
            </div>
            <div>
              <label style={{ fontSize:11, color:"#888", display:"block", marginBottom:3 }}>Personas</label>
              <input type="number" min="1" value={form.personas} onChange={e=>setForm(f=>({...f,personas:e.target.value}))} style={shared.inp} />
            </div>
          </div>
          <textarea value={form.observaciones} onChange={e=>setForm(f=>({...f,observaciones:e.target.value}))} placeholder="Observaciones del día…" rows={2} style={{ ...shared.inp, resize:"none", marginBottom:10 }} />
          <button onClick={guardar} disabled={saving} style={{ ...shared.btn, width:"100%" }}>
            {saving ? "Guardando…" : "Registrar día"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Fila de subtarea dentro de una tarea ─── */
function FilaSubtarea({ subtarea, onVerRegistros, diasReales, onToggleCompleta, onEliminar }) {
  const pct = subtarea.dias_teoricos > 0 ? Math.min(100, Math.round((diasReales / subtarea.dias_teoricos) * 100)) : null;
  const excede = subtarea.dias_teoricos > 0 && diasReales > subtarea.dias_teoricos;

  return (
    <div style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 12px", background: subtarea.completada ? "#f0fdf4" : "#f8f8f8", borderRadius:10, marginBottom:6, border: excede ? "1px solid #fecaca" : "1px solid transparent" }}>
      {/* Checkbox completada */}
      <input type="checkbox" checked={!!subtarea.completada} onChange={e=>onToggleCompleta(subtarea.id, e.target.checked)}
        style={{ width:16, height:16, cursor:"pointer", flexShrink:0 }} />

      {/* Código + nombre */}
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ display:"flex", alignItems:"center", gap:6, flexWrap:"wrap" }}>
          {subtarea.codigo && <span style={{ fontSize:10, fontWeight:700, color:"#888", background:"#e8e8e8", borderRadius:4, padding:"1px 6px" }}>{subtarea.codigo}</span>}
          <span style={{ fontSize:13, fontWeight:600, color: subtarea.completada ? "#16a34a" : "#111" }}>{subtarea.nombre}</span>
          {subtarea.completada && <span style={{ fontSize:10, color:"#16a34a" }}>✓</span>}
        </div>
        {/* Barra de progreso días */}
        {subtarea.dias_teoricos > 0 && (
          <div style={{ marginTop:5 }}>
            <div style={{ height:4, background:"#e0e0e0", borderRadius:2, overflow:"hidden" }}>
              <div style={{ height:"100%", width:`${Math.min(100,pct)}%`, background: excede ? "#ef4444" : "#22c55e", transition:"width .3s" }} />
            </div>
            <div style={{ fontSize:10, color: excede ? "#ef4444" : "#888", marginTop:2 }}>
              {diasReales}/{subtarea.dias_teoricos} días {excede ? `(+${diasReales-subtarea.dias_teoricos} días)` : ""}
            </div>
          </div>
        )}
      </div>

      {/* Días reales badge */}
      <div style={{ textAlign:"center", flexShrink:0 }}>
        <div style={{ fontSize:16, fontWeight:800, color: excede ? "#ef4444" : "#111" }}>{diasReales}</div>
        <div style={{ fontSize:9, color:"#aaa" }}>días</div>
      </div>

      {/* Botón registrar */}
      <button onClick={() => onVerRegistros(subtarea)} style={{ ...shared.btnSm, flexShrink:0, fontSize:12, padding:"6px 10px" }}>
        📝
      </button>
    </div>
  );
}

/* ─── Panel tarea con subtareas y métricas ─── */
function PanelTareaGantt({ tarea, onClose, onActualizar }) {
  const [subtareas, setSubtareas] = useState([]);
  const [diasPorSubtarea, setDiasPorSubtarea] = useState({});
  const [panelSubtarea, setPanelSubtarea] = useState(null);
  const [showAddSub, setShowAddSub] = useState(false);
  const [biblioSubs, setBiblioSubs] = useState([]);
  const [nuevaSub, setNuevaSub] = useState({ nombre:"", codigo:"", dias_teoricos:"", desde_biblioteca: false, biblioteca_subtarea_id:"" });
  const [editTarea, setEditTarea] = useState({
    dias_teoricos: tarea.dias_teoricos || "",
    fecha_inicio_plan: tarea.fecha_inicio_plan || "",
    fecha_fin_plan: tarea.fecha_fin_plan || "",
    dias_no_trabajados: tarea.dias_no_trabajados || "",
  });
  const [saving, setSaving] = useState(false);
  const color = ETAPA_COLOR[tarea.etapa] || "#888";

  useEffect(() => { cargar(); }, [tarea.id]);

  async function cargar() {
    const tk = await getToken();
    const [sArr, bArr] = await Promise.all([
      fetch(`${SUPA_URL}/subtareas_obra?tarea_id=eq.${tarea.id}&order=orden.asc`, { headers:hdrs(tk) }).then(r=>r.json()),
      fetch(`${SUPA_URL}/biblioteca_subtareas?activo=eq.true&order=orden.asc`, { headers:hdrs(tk) }).then(r=>r.json()),
    ]);
    const subs = Array.isArray(sArr) ? sArr : [];
    setSubtareas(subs);
    setBiblioSubs(Array.isArray(bArr) ? bArr : []);

    if (subs.length > 0) {
      const ids = subs.map(s=>s.id).join(",");
      const rArr = await fetch(`${SUPA_URL}/subtarea_registros?subtarea_id=in.(${ids})`, { headers:hdrs(tk) }).then(r=>r.json());
      const map = {};
      (Array.isArray(rArr) ? rArr : []).forEach(r => {
        map[r.subtarea_id] = (map[r.subtarea_id]||0) + (parseFloat(r.dias)||0);
      });
      setDiasPorSubtarea(map);
    }
  }

  async function guardarTarea() {
    setSaving(true);
    const tk = await getToken();
    await fetch(`${SUPA_URL}/tareas_obra?id=eq.${tarea.id}`, {
      method:"PATCH", headers:hdrs(tk),
      body: JSON.stringify({
        dias_teoricos: parseInt(editTarea.dias_teoricos)||null,
        fecha_inicio_plan: editTarea.fecha_inicio_plan || null,
        fecha_fin_plan: editTarea.fecha_fin_plan || null,
        dias_no_trabajados: parseInt(editTarea.dias_no_trabajados)||null,
      })
    });
    onActualizar && onActualizar();
    setSaving(false);
  }

  async function agregarSubtarea() {
    setSaving(true);
    const tk = await getToken();
    const body = {
      tarea_id: tarea.id,
      nombre: nuevaSub.nombre,
      codigo: nuevaSub.codigo || null,
      dias_teoricos: parseInt(nuevaSub.dias_teoricos)||null,
      orden: subtareas.length + 1,
      en_biblioteca: nuevaSub.desde_biblioteca,
      biblioteca_subtarea_id: nuevaSub.biblioteca_subtarea_id || null,
    };
    await fetch(`${SUPA_URL}/subtareas_obra`, { method:"POST", headers:hdrs(tk), body:JSON.stringify(body) });
    setNuevaSub({ nombre:"", codigo:"", dias_teoricos:"", desde_biblioteca:false, biblioteca_subtarea_id:"" });
    setShowAddSub(false);
    await cargar();
    setSaving(false);
  }

  async function toggleCompleta(subId, val) {
    const tk = await getToken();
    await fetch(`${SUPA_URL}/subtareas_obra?id=eq.${subId}`, { method:"PATCH", headers:hdrs(tk), body:JSON.stringify({ completada:val }) });
    setSubtareas(prev => prev.map(s => s.id===subId ? {...s, completada:val} : s));
  }

  async function eliminarSub(subId) {
    if (!confirm("¿Eliminar subtarea?")) return;
    const tk = await getToken();
    await fetch(`${SUPA_URL}/subtareas_obra?id=eq.${subId}`, { method:"DELETE", headers:hdrs(tk) });
    setSubtareas(prev => prev.filter(s=>s.id!==subId));
  }

  const diasRealesTarea = Object.values(diasPorSubtarea).reduce((s,v)=>s+v,0);
  const desvio = editTarea.dias_teoricos ? diasRealesTarea - parseInt(editTarea.dias_teoricos) : null;
  const rendimiento = editTarea.dias_teoricos && diasRealesTarea > 0
    ? Math.round((parseInt(editTarea.dias_teoricos) / diasRealesTarea) * 100) : null;

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.6)", display:"flex", alignItems:"flex-end", justifyContent:"center", zIndex:200 }}>
      <div style={{ background:"#fff", borderRadius:"20px 20px 0 0", padding:"20px 20px 40px", width:"100%", maxWidth:640, maxHeight:"93vh", overflowY:"auto" }}>
        <div style={{ width:40, height:4, background:"#e0e0e0", borderRadius:2, margin:"0 auto 14px" }} />

        {/* Header tarea */}
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:16 }}>
          <div>
            <div style={{ fontSize:11, color, fontWeight:700, textTransform:"uppercase" }}>{tarea.etapa}</div>
            <div style={{ fontWeight:700, fontSize:18 }}>{tarea.nombre}</div>
          </div>
          <button onClick={onClose} style={{ ...shared.btnSm, padding:"6px 10px" }}>✕</button>
        </div>

        {/* Métricas de rendimiento */}
        {diasRealesTarea > 0 && (
          <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:8, marginBottom:16 }}>
            {[
              { label:"Días teóricos", value: editTarea.dias_teoricos || "—", color:"#6366f1" },
              { label:"Días reales",   value: diasRealesTarea, color: desvio > 0 ? "#ef4444" : "#22c55e" },
              { label:"Desvío",        value: desvio !== null ? (desvio > 0 ? `+${desvio}` : desvio) : "—", color: desvio > 0 ? "#ef4444" : "#22c55e" },
              { label:"Rendimiento",   value: rendimiento !== null ? `${rendimiento}%` : "—", color: rendimiento >= 100 ? "#22c55e" : "#f59e0b" },
            ].map(k => (
              <div key={k.label} style={{ background:"#f8f8f8", borderRadius:10, padding:"10px 8px", textAlign:"center" }}>
                <div style={{ fontSize:18, fontWeight:800, color:k.color }}>{k.value}</div>
                <div style={{ fontSize:9, color:"#888", marginTop:2 }}>{k.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Datos de la tarea */}
        <div style={{ background:"#f8f8f8", borderRadius:12, padding:14, marginBottom:16 }}>
          <span style={shared.lbl}>Datos de la tarea</span>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
            <div>
              <label style={{ fontSize:11, color:"#888", display:"block", marginBottom:3 }}>Días teóricos</label>
              <input type="number" min="1" value={editTarea.dias_teoricos} onChange={e=>setEditTarea(f=>({...f,dias_teoricos:e.target.value}))} style={shared.inp} placeholder="0" />
            </div>
            <div>
              <label style={{ fontSize:11, color:"#888", display:"block", marginBottom:3 }}>Días no trabajados</label>
              <input type="number" min="0" value={editTarea.dias_no_trabajados} onChange={e=>setEditTarea(f=>({...f,dias_no_trabajados:e.target.value}))} style={shared.inp} placeholder="0" />
            </div>
            <div>
              <label style={{ fontSize:11, color:"#888", display:"block", marginBottom:3 }}>Fecha inicio plan</label>
              <input type="date" value={editTarea.fecha_inicio_plan} onChange={e=>setEditTarea(f=>({...f,fecha_inicio_plan:e.target.value}))} style={shared.inp} />
            </div>
            <div>
              <label style={{ fontSize:11, color:"#888", display:"block", marginBottom:3 }}>Fecha fin plan</label>
              <input type="date" value={editTarea.fecha_fin_plan} onChange={e=>setEditTarea(f=>({...f,fecha_fin_plan:e.target.value}))} style={shared.inp} />
            </div>
          </div>
          <button onClick={guardarTarea} disabled={saving} style={{ ...shared.btn, width:"100%", marginTop:10, fontSize:13 }}>
            {saving ? "Guardando…" : "Guardar datos"}
          </button>
        </div>

        {/* Subtareas */}
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
          <span style={shared.lbl}>Subtareas ({subtareas.length})</span>
          <button onClick={()=>setShowAddSub(!showAddSub)} style={{ ...shared.btnSm, fontSize:12 }}>
            {showAddSub ? "Cancelar" : "+ Agregar"}
          </button>
        </div>

        {/* Form agregar subtarea */}
        {showAddSub && (
          <div style={{ background:"#f0f4ff", borderRadius:12, padding:14, marginBottom:14, border:"1px solid #c7d2fe" }}>
            <div style={{ display:"flex", gap:8, marginBottom:10 }}>
              <button onClick={()=>setNuevaSub(f=>({...f,desde_biblioteca:false}))} style={{ ...shared.btnSm, flex:1, background:!nuevaSub.desde_biblioteca?"#111":"#f0f0f0", color:!nuevaSub.desde_biblioteca?"#fff":"#333" }}>Nueva</button>
              <button onClick={()=>setNuevaSub(f=>({...f,desde_biblioteca:true}))} style={{ ...shared.btnSm, flex:1, background:nuevaSub.desde_biblioteca?"#111":"#f0f0f0", color:nuevaSub.desde_biblioteca?"#fff":"#333" }}>Desde biblioteca</button>
            </div>

            {nuevaSub.desde_biblioteca ? (
              <div style={{ marginBottom:10 }}>
                <label style={{ fontSize:11, color:"#888", display:"block", marginBottom:3 }}>Seleccionar de biblioteca</label>
                <select value={nuevaSub.biblioteca_subtarea_id} onChange={e => {
                  const sel = biblioSubs.find(b=>b.id===e.target.value);
                  setNuevaSub(f=>({ ...f, biblioteca_subtarea_id:e.target.value, nombre:sel?.nombre||"", dias_teoricos:sel?.duracion_tipica_dias||"" }));
                }} style={shared.inp}>
                  <option value="">— Seleccionar —</option>
                  {biblioSubs.map(b => <option key={b.id} value={b.id}>{b.nombre}{b.duracion_tipica_dias?` (${b.duracion_tipica_dias}d)`:""}</option>)}
                </select>
              </div>
            ) : null}

            <div style={{ display:"grid", gridTemplateColumns:"1fr 80px 80px", gap:8, marginBottom:10 }}>
              <div>
                <label style={{ fontSize:11, color:"#888", display:"block", marginBottom:3 }}>Nombre</label>
                <input value={nuevaSub.nombre} onChange={e=>setNuevaSub(f=>({...f,nombre:e.target.value}))} style={shared.inp} placeholder="Nombre de la subtarea" />
              </div>
              <div>
                <label style={{ fontSize:11, color:"#888", display:"block", marginBottom:3 }}>Código</label>
                <input value={nuevaSub.codigo} onChange={e=>setNuevaSub(f=>({...f,codigo:e.target.value}))} style={shared.inp} placeholder="01.A" />
              </div>
              <div>
                <label style={{ fontSize:11, color:"#888", display:"block", marginBottom:3 }}>Días teóricos</label>
                <input type="number" min="1" value={nuevaSub.dias_teoricos} onChange={e=>setNuevaSub(f=>({...f,dias_teoricos:e.target.value}))} style={shared.inp} placeholder="0" />
              </div>
            </div>
            <button onClick={agregarSubtarea} disabled={saving||!nuevaSub.nombre} style={{ ...shared.btn, width:"100%", fontSize:13 }}>
              {saving ? "Guardando…" : "Agregar subtarea"}
            </button>
          </div>
        )}

        {/* Lista subtareas */}
        {subtareas.length === 0 ? (
          <p style={{ color:"#aaa", textAlign:"center", padding:"20px 0", fontSize:13 }}>Sin subtareas. Agregá desde biblioteca o crear nueva.</p>
        ) : subtareas.map(s => (
          <FilaSubtarea
            key={s.id}
            subtarea={s}
            diasReales={diasPorSubtarea[s.id]||0}
            onVerRegistros={sub => setPanelSubtarea(sub)}
            onToggleCompleta={toggleCompleta}
            onEliminar={eliminarSub}
          />
        ))}

        {/* Panel registro de subtarea */}
        {panelSubtarea && (
          <PanelSubtareaRegistro
            subtarea={panelSubtarea}
            onClose={() => setPanelSubtarea(null)}
            onGuardado={async () => { await cargar(); }}
          />
        )}
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════
   CARPETA — GESTOR DE ARCHIVOS
════════════════════════════════════════════ */
function GestorCarpeta({ obra, carpeta, onClose }) {
  const [archivos, setArchivos] = useState([]);
  const [subCarpetaActiva, setSubCarpetaActiva] = useState(carpeta.subs[0] || null);
  const [subiendo, setSubiendo] = useState(false);
  const [loading, setLoading] = useState(true);
  const fileRef = useRef();

  const subcarpeta = subCarpetaActiva || null;

  useEffect(() => { cargar(); }, [carpeta.num, subCarpetaActiva]);

  async function cargar() {
    setLoading(true);
    const tk = await getToken();
    let url = `${SUPA_URL}/obra_archivos?obra_id=eq.${obra.id}&carpeta_numero=eq.${carpeta.num}`;
    if (subcarpeta) url += `&subcarpeta=eq.${encodeURIComponent(subcarpeta)}`;
    const r = await fetch(url+"&order=created_at.desc", { headers:hdrs(tk) }).then(r=>r.json());
    const arr = Array.isArray(r) ? r : [];
    // Generar URLs firmadas
    const conUrls = await Promise.all(arr.map(async a => ({
      ...a,
      signedUrl: a.storage_path ? await getUrlFirmada(a.storage_path) : null
    })));
    setArchivos(conUrls);
    setLoading(false);
  }

  async function subirArchivo(file) {
    setSubiendo(true);
    try {
      const path = await uploadArchivo(file, obra.id, carpeta.num, subcarpeta);
      const tk = await getToken();
      const ext = file.name.split(".").pop().toLowerCase();
      const tipo = ["jpg","jpeg","png","gif","webp"].includes(ext) ? "imagen"
        : ["mp4","mov","avi"].includes(ext) ? "video"
        : ["pdf"].includes(ext) ? "pdf" : "documento";
      await fetch(`${SUPA_URL}/obra_archivos`, {
        method:"POST", headers:hdrs(tk),
        body: JSON.stringify({
          obra_id: obra.id,
          carpeta_numero: carpeta.num,
          subcarpeta: subcarpeta,
          nombre: file.name,
          nombre_archivo: file.name,
          storage_path: path,
          tipo,
          subido_por: (await supabase.auth.getUser()).data.user?.id
        })
      });
      await cargar();
    } catch(e) { alert("Error: "+e.message); }
    setSubiendo(false);
  }

  function iconoTipo(tipo) {
    if (tipo==="imagen") return "🖼️";
    if (tipo==="video") return "🎥";
    if (tipo==="pdf") return "📄";
    return "📎";
  }

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.6)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:200, padding:16 }}>
      <div style={{ background:"#fff", borderRadius:16, width:"100%", maxWidth:600, maxHeight:"90vh", overflowY:"auto", display:"flex", flexDirection:"column" }}>
        {/* Header */}
        <div style={{ padding:"18px 20px 14px", borderBottom:"1px solid #f0f0f0" }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <div style={{ fontWeight:700, fontSize:17 }}>{carpeta.icon} {carpeta.nombre}</div>
            <button onClick={onClose} style={{ ...shared.btnSm, padding:"6px 10px" }}>✕</button>
          </div>
          {/* Subcarpetas */}
          {carpeta.subs.length > 0 && (
            <div style={{ display:"flex", gap:6, marginTop:12, flexWrap:"wrap" }}>
              {carpeta.subs.map(s => (
                <button key={s} onClick={()=>setSubCarpetaActiva(s)} style={{
                  ...shared.btnSm, fontSize:12,
                  background: subCarpetaActiva===s ? "#111" : "#f0f0f0",
                  color: subCarpetaActiva===s ? "#fff" : "#333"
                }}>{s}</button>
              ))}
            </div>
          )}
        </div>

        {/* Contenido */}
        <div style={{ padding:"14px 20px", flex:1 }}>
          {/* Botón subir */}
          <input ref={fileRef} type="file" style={{ display:"none" }} multiple onChange={e => Array.from(e.target.files).forEach(subirArchivo)} />
          <button onClick={()=>fileRef.current.click()} disabled={subiendo} style={{ ...shared.btn, width:"100%", marginBottom:14, fontSize:14 }}>
            {subiendo ? "Subiendo…" : "⬆️ Subir archivo"}
          </button>

          {/* Lista archivos */}
          {loading ? <p style={{ color:"#aaa", textAlign:"center" }}>Cargando…</p>
          : archivos.length === 0 ? <p style={{ color:"#aaa", textAlign:"center", padding:"32px 0" }}>Sin archivos en esta carpeta</p>
          : archivos.map(a => (
            <div key={a.id} style={{ display:"flex", alignItems:"center", gap:12, padding:"10px 0", borderBottom:"1px solid #f5f5f5" }}>
              {a.tipo==="imagen" && a.signedUrl ? (
                <img src={a.signedUrl} alt="" style={{ width:48, height:48, objectFit:"cover", borderRadius:8, flexShrink:0 }} />
              ) : (
                <div style={{ width:48, height:48, background:"#f0f0f0", borderRadius:8, display:"flex", alignItems:"center", justifyContent:"center", fontSize:24, flexShrink:0 }}>
                  {iconoTipo(a.tipo)}
                </div>
              )}
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:13, fontWeight:600, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{a.nombre || a.nombre_archivo || "Archivo"}</div>
                <div style={{ fontSize:11, color:"#aaa" }}>{new Date(a.created_at).toLocaleDateString("es-AR")}</div>
              </div>
              {a.signedUrl && (
                <a href={a.signedUrl} target="_blank" rel="noreferrer" style={{ ...shared.btnSm, textDecoration:"none", fontSize:12, flexShrink:0 }}>
                  Ver
                </a>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════
   VISTA ADMIN — DETALLE DE OBRA CON CARPETAS
════════════════════════════════════════════ */
function DetalleObra({ obra, jefesList, onVolver, onActualizarObra }) {
  const [carpetaActiva, setCarpetaActiva] = useState(null); // null = vista carpetas
  const [panelTarea, setPanelTarea] = useState(null);
  const [tareas, setTareas] = useState([]);
  const [avancesTareas, setAvancesTareas] = useState({}); // pct avance por tarea
  const [rendimientos, setRendimientos] = useState({}); // diasReales por tarea
  const [showEditObra, setShowEditObra] = useState(false);
  const [showAddTarea, setShowAddTarea] = useState(false);
  const [nuevaTarea, setNuevaTarea] = useState({ nombre:"", etapa:"", dias_teoricos:"", fecha_inicio_plan:"", fecha_fin_plan:"" });
  const [partes, setPartes] = useState([]);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const color_obra = "#111";

  useEffect(() => { cargarTareas(); }, [obra.id]);

  async function cargarTareas() {
    const tk = await getToken();
    const [tArr, pArr] = await Promise.all([
      fetch(`${SUPA_URL}/tareas_obra?obra_id=eq.${obra.id}&order=orden.asc`, { headers:hdrs(tk) }).then(r=>r.json()),
      fetch(`${SUPA_URL}/partes_diarios?obra_id=eq.${obra.id}&order=fecha.desc&limit=10`, { headers:hdrs(tk) }).then(r=>r.json()),
    ]);
    const tFinal = Array.isArray(tArr) ? tArr : [];
    setTareas(tFinal);
    setPartes(Array.isArray(pArr) ? pArr : []);

    if (tFinal.length > 0) {
      // Cargar avances (%) y días reales por tarea
      const tIds = tFinal.map(t=>t.id).join(",");
      const [avArr, sArr] = await Promise.all([
        fetch(`${SUPA_URL}/avances_tarea?tarea_id=in.(${tIds})&order=created_at.desc`, { headers:hdrs(tk) }).then(r=>r.json()),
        fetch(`${SUPA_URL}/subtareas_obra?tarea_id=in.(${tIds})&select=id,tarea_id`, { headers:hdrs(tk) }).then(r=>r.json()),
      ]);
      // Avance % (último por tarea)
      const avMap = {};
      (Array.isArray(avArr)?avArr:[]).forEach(a => { if(!avMap[a.tarea_id]) avMap[a.tarea_id]=a.porcentaje; });
      setAvancesTareas(avMap);

      // Días reales por tarea (via subtareas)
      const subs = Array.isArray(sArr) ? sArr : [];
      if (subs.length > 0) {
        const sIds = subs.map(s=>s.id).join(",");
        const rArr = await fetch(`${SUPA_URL}/subtarea_registros?subtarea_id=in.(${sIds})`, { headers:hdrs(tk) }).then(r=>r.json());
        const diasPorSub = {};
        (Array.isArray(rArr)?rArr:[]).forEach(r => { diasPorSub[r.subtarea_id]=(diasPorSub[r.subtarea_id]||0)+(parseFloat(r.dias)||0); });
        // Agrupar por tarea
        const rMap = {};
        subs.forEach(s => { rMap[s.tarea_id]=(rMap[s.tarea_id]||0)+(diasPorSub[s.id]||0); });
        setRendimientos(rMap);
      }
    }
  }

  async function agregarTarea() {
    setSaving(true);
    const tk = await getToken();
    await fetch(`${SUPA_URL}/tareas_obra`, {
      method:"POST", headers:hdrs(tk),
      body: JSON.stringify({
        obra_id: obra.id,
        nombre: nuevaTarea.nombre,
        etapa: nuevaTarea.etapa,
        orden: tareas.length+1,
        dias_teoricos: parseInt(nuevaTarea.dias_teoricos)||null,
        fecha_inicio_plan: nuevaTarea.fecha_inicio_plan||null,
        fecha_fin_plan: nuevaTarea.fecha_fin_plan||null,
      })
    });
    setNuevaTarea({ nombre:"", etapa:"", dias_teoricos:"", fecha_inicio_plan:"", fecha_fin_plan:"" });
    setShowAddTarea(false);
    await cargarTareas();
    setSaving(false);
  }

  // Avance general
  const avanceGeneral = tareas.length > 0
    ? Math.round(tareas.reduce((s,t)=>s+(avancesTareas[t.id]||0),0)/tareas.length) : 0;
  const diasTeoricosTotales = tareas.reduce((s,t)=>s+(t.dias_teoricos||0),0);
  const diasRealesTotales = Object.values(rendimientos).reduce((s,v)=>s+v,0);

  // Agrupar tareas por etapa
  const porEtapa = {};
  tareas.forEach(t => {
    const e = t.etapa || "Sin etapa";
    if (!porEtapa[e]) porEtapa[e] = [];
    porEtapa[e].push(t);
  });

  return (
    <div style={{ fontFamily:"system-ui, -apple-system, sans-serif" }}>
      {/* Header obra */}
      <div style={{ background:"#111", color:"#fff", padding:"16px 20px" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
          <div>
            <button onClick={onVolver} style={{ background:"none", border:"none", color:"#888", fontSize:12, cursor:"pointer", padding:0, marginBottom:6 }}>← Volver</button>
            {obra.codigo && <div style={{ fontSize:10, color:"#666", fontWeight:700, letterSpacing:1 }}>{obra.codigo}</div>}
            <div style={{ fontWeight:700, fontSize:18 }}>{obra.nombre}</div>
            <div style={{ fontSize:12, color:"#888", marginTop:2 }}>
              {obra.sistema_constructivo} · {ALCANCES.find(a=>a.v===obra.alcance)?.label || obra.alcance}
            </div>
          </div>
          <button onClick={()=>setShowEditObra(true)} style={{ ...shared.btnSm, fontSize:12 }}>✏️ Editar</button>
        </div>
        {/* KPIs generales */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:8, marginTop:14 }}>
          {[
            { label:"Avance", value:`${avanceGeneral}%`, color:"#22c55e" },
            { label:"Días teóricos", value:diasTeoricosTotales||"—", color:"#6366f1" },
            { label:"Días reales", value:diasRealesTotales||"—", color: diasRealesTotales>diasTeoricosTotales?"#ef4444":"#22c55e" },
            { label:"Desvío", value:diasTeoricosTotales&&diasRealesTotales ? `${diasRealesTotales-diasTeoricosTotales>0?"+":""}${diasRealesTotales-diasTeoricosTotales}d`:"—", color:diasRealesTotales>diasTeoricosTotales?"#ef4444":"#aaa" },
          ].map(k=>(
            <div key={k.label} style={{ background:"rgba(255,255,255,.07)", borderRadius:8, padding:"8px 10px", textAlign:"center" }}>
              <div style={{ fontSize:16, fontWeight:800, color:k.color }}>{k.value}</div>
              <div style={{ fontSize:9, color:"#666", marginTop:1 }}>{k.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* 6 CARPETAS */}
      <div style={{ padding:"16px 16px 0" }}>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:10 }}>
          {CARPETAS.map(c => (
            <button key={c.num} onClick={()=>{ if(c.num===4) setCarpetaActiva("gantt"); else setCarpetaActiva(c); }}
              style={{ background:"#fff", border:"1px solid #e0e0e0", borderRadius:12, padding:"14px 10px", cursor:"pointer", textAlign:"center", boxShadow:"0 1px 4px rgba(0,0,0,.06)" }}>
              <div style={{ fontSize:26, marginBottom:4 }}>{c.icon}</div>
              <div style={{ fontSize:11, fontWeight:600, color:"#333", lineHeight:1.3 }}>{c.nombre}</div>
            </button>
          ))}
        </div>
      </div>

      {/* CARPETA 4 — PLAN Y GANTT */}
      {carpetaActiva === "gantt" && (
        <div style={{ padding:"16px" }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
            <div style={{ fontWeight:700, fontSize:15 }}>📅 Plan de trabajo y Gantt</div>
            <div style={{ display:"flex", gap:8 }}>
              <button onClick={()=>setShowAddTarea(!showAddTarea)} style={{ ...shared.btnSm, fontSize:12 }}>+ Tarea</button>
              <button onClick={()=>setCarpetaActiva(null)} style={{ ...shared.btnSm, fontSize:12 }}>✕</button>
            </div>
          </div>

          {msg && <div style={{ background:"#d4edda", color:"#155724", borderRadius:8, padding:"8px 12px", marginBottom:10, fontSize:13 }}>{msg}</div>}

          {showAddTarea && (
            <div style={{ ...shared.card, marginBottom:14, background:"#f0f4ff", border:"1px solid #c7d2fe" }}>
              <span style={shared.lbl}>Nueva tarea</span>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:10 }}>
                <div style={{ gridColumn:"1/-1" }}>
                  <input value={nuevaTarea.nombre} onChange={e=>setNuevaTarea(f=>({...f,nombre:e.target.value}))} style={shared.inp} placeholder="Nombre de la tarea" />
                </div>
                <div>
                  <select value={nuevaTarea.etapa} onChange={e=>setNuevaTarea(f=>({...f,etapa:e.target.value}))} style={shared.inp}>
                    <option value="">— Etapa —</option>
                    {Object.keys(ETAPA_COLOR).filter(e=>e!=="Sin etapa").map(e=><option key={e} value={e}>{e}</option>)}
                  </select>
                </div>
                <div>
                  <input type="number" min="1" value={nuevaTarea.dias_teoricos} onChange={e=>setNuevaTarea(f=>({...f,dias_teoricos:e.target.value}))} style={shared.inp} placeholder="Días teóricos" />
                </div>
                <div>
                  <input type="date" value={nuevaTarea.fecha_inicio_plan} onChange={e=>setNuevaTarea(f=>({...f,fecha_inicio_plan:e.target.value}))} style={shared.inp} />
                </div>
                <div>
                  <input type="date" value={nuevaTarea.fecha_fin_plan} onChange={e=>setNuevaTarea(f=>({...f,fecha_fin_plan:e.target.value}))} style={shared.inp} />
                </div>
              </div>
              <button onClick={agregarTarea} disabled={saving||!nuevaTarea.nombre} style={{ ...shared.btn, width:"100%", fontSize:13 }}>
                {saving?"Guardando…":"Agregar tarea"}
              </button>
            </div>
          )}

          {/* Tareas por etapa */}
          {Object.keys(porEtapa).map(etapa => {
            const color = ETAPA_COLOR[etapa]||"#888";
            const tArr = porEtapa[etapa];
            const diasTeoEtapa = tArr.reduce((s,t)=>s+(t.dias_teoricos||0),0);
            const diasRealEtapa = tArr.reduce((s,t)=>s+(rendimientos[t.id]||0),0);
            return (
              <div key={etapa} style={{ marginBottom:20 }}>
                {/* Header etapa */}
                <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:10, padding:"8px 12px", background:color+"18", borderRadius:10 }}>
                  <div style={{ width:10, height:10, borderRadius:"50%", background:color, flexShrink:0 }} />
                  <span style={{ fontWeight:700, fontSize:13, flex:1, color:"#333" }}>{etapa}</span>
                  {diasTeoEtapa > 0 && (
                    <div style={{ display:"flex", gap:8, fontSize:11 }}>
                      <span style={{ color:"#6366f1" }}>⏱ {diasTeoEtapa}d teo.</span>
                      <span style={{ color: diasRealEtapa>diasTeoEtapa?"#ef4444":"#22c55e" }}>📅 {diasRealEtapa}d real</span>
                    </div>
                  )}
                </div>

                {tArr.map(t => {
                  const pct = avancesTareas[t.id]||0;
                  const diasReales = rendimientos[t.id]||0;
                  const desvio = t.dias_teoricos && diasReales ? diasReales - t.dias_teoricos : null;
                  const rend = t.dias_teoricos && diasReales ? Math.round((t.dias_teoricos/diasReales)*100) : null;
                  return (
                    <div key={t.id} onClick={()=>setPanelTarea(t)} style={{ ...shared.card, marginBottom:8, cursor:"pointer", borderLeft:`4px solid ${color}` }}>
                      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
                        <div style={{ flex:1 }}>
                          <div style={{ fontWeight:600, fontSize:14 }}>{t.nombre}</div>
                          <div style={{ display:"flex", gap:12, marginTop:4, flexWrap:"wrap" }}>
                            {t.fecha_inicio_plan && <span style={{ fontSize:11, color:"#aaa" }}>📅 {new Date(t.fecha_inicio_plan+"T12:00").toLocaleDateString("es-AR")}</span>}
                            {t.fecha_fin_plan && <span style={{ fontSize:11, color:"#aaa" }}>🏁 {new Date(t.fecha_fin_plan+"T12:00").toLocaleDateString("es-AR")}</span>}
                            {t.dias_teoricos && <span style={{ fontSize:11, color:"#6366f1" }}>⏱ {t.dias_teoricos}d teo.</span>}
                            {diasReales>0 && <span style={{ fontSize:11, color:desvio>0?"#ef4444":"#22c55e" }}>📅 {diasReales}d real {desvio!==null?`(${desvio>0?"+":""}${desvio}d)`:""}</span>}
                            {rend && <span style={{ fontSize:11, fontWeight:700, color:rend>=100?"#22c55e":"#f59e0b" }}>⚡ {rend}%</span>}
                          </div>
                        </div>
                        <div style={{ textAlign:"right", flexShrink:0 }}>
                          <div style={{ fontSize:18, fontWeight:800 }}>{pct}%</div>
                        </div>
                      </div>
                      {/* Barra avance */}
                      <div style={{ height:5, background:"#f0f0f0", borderRadius:3, overflow:"hidden", marginTop:8 }}>
                        <div style={{ height:"100%", width:`${pct}%`, background:pct===100?"#22c55e":color }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      )}

      {/* CARPETAS 1,2,3,5,6 — Gestor de archivos */}
      {carpetaActiva && carpetaActiva !== "gantt" && (
        <GestorCarpeta obra={obra} carpeta={carpetaActiva} onClose={()=>setCarpetaActiva(null)} />
      )}

      {/* Panel tarea con subtareas */}
      {panelTarea && (
        <PanelTareaGantt
          tarea={panelTarea}
          onClose={()=>setPanelTarea(null)}
          onActualizar={async()=>{ await cargarTareas(); setPanelTarea(null); setMsg("✓ Tarea actualizada"); setTimeout(()=>setMsg(""),2000); }}
        />
      )}

      {/* Modal editar obra */}
      {showEditObra && (
        <ModalEditarObra
          obra={obra}
          jefesList={jefesList}
          onGuardar={async form => {
            const tk = await getToken();
            await fetch(`${SUPA_URL}/obras_campo?id=eq.${obra.id}`, { method:"PATCH", headers:hdrs(tk), body:JSON.stringify(form) });
            setShowEditObra(false);
            onActualizarObra && onActualizarObra({ ...obra, ...form });
          }}
          onClose={()=>setShowEditObra(false)}
        />
      )}
    </div>
  );
}

/* ════════════════════════════════════════════
   MODAL EDITAR OBRA
════════════════════════════════════════════ */
function ModalEditarObra({ obra, jefesList, onGuardar, onClose }) {
  const [form, setForm] = useState({
    nombre: obra.nombre||"",
    direccion: obra.direccion||"",
    codigo: obra.codigo||"",
    sistema_constructivo: obra.sistema_constructivo||"Steel Frame",
    alcance: obra.alcance||"obra_completa",
    fecha_inicio_plan: obra.fecha_inicio_plan||"",
    fecha_fin_plan: obra.fecha_fin_plan||"",
    jefe_id: obra.jefe_id||"",
    notas: obra.notas||"",
    cliente_id: obra.cliente_id||"",
    proyecto_id: obra.proyecto_id||"",
    presupuesto_id: obra.presupuesto_id||"",
  });
  const [proyectos, setProyectos] = useState([]);
  const [clientesCRM, setClientesCRM] = useState([]);
  const [presupuestos, setPresupuestos] = useState([]);

  useEffect(()=>{
    async function cargar(){
      const tk = await getToken();
      const [pArr,cArr,prArr] = await Promise.all([
        fetch(`${SUPA_URL}/proyectos?select=id,descripcion,numero_proyecto&order=numero_proyecto.asc`,{headers:hdrs(tk)}).then(r=>r.json()),
        fetch(`${SUPA_URL}/clientes?select=id,empresa&order=empresa.asc`,{headers:hdrs(tk)}).then(r=>r.json()),
        fetch(`${SUPA_URL}/presupuestos?select=id,codigo,descripcion,cliente&order=created_at.desc`,{headers:hdrs(tk)}).then(r=>r.json()),
      ]);
      setProyectos(Array.isArray(pArr)?pArr:[]);
      setClientesCRM(Array.isArray(cArr)?cArr:[]);
      setPresupuestos(Array.isArray(prArr)?prArr:[]);
    }
    cargar();
  },[]);

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.5)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:100, padding:16 }}>
      <div style={{ background:"#fff", borderRadius:16, padding:28, width:"100%", maxWidth:480, maxHeight:"90vh", overflowY:"auto" }}>
        <div style={{ display:"flex", justifyContent:"space-between", marginBottom:20 }}>
          <h3 style={{ margin:0, fontSize:17 }}>Editar obra</h3>
          <button onClick={onClose} style={{ ...shared.btnSm, padding:"5px 10px" }}>✕</button>
        </div>

        {[{lbl:"Código",key:"codigo",ph:"2026-SF-531"},{lbl:"Nombre *",key:"nombre",ph:"Nombre de la obra"},{lbl:"Dirección",key:"direccion",ph:"Dirección"}].map(f=>(
          <div key={f.key} style={{ marginBottom:12 }}>
            <span style={shared.lbl}>{f.lbl}</span>
            <input value={form[f.key]} onChange={e=>setForm(p=>({...p,[f.key]:e.target.value}))} style={shared.inp} placeholder={f.ph} />
          </div>
        ))}

        <div style={{ marginBottom:12 }}>
          <span style={shared.lbl}>🏢 Cliente</span>
          <Combobox options={clientesCRM.map(c=>({value:c.id,label:c.empresa}))} value={form.cliente_id} onChange={val=>setForm(p=>({...p,cliente_id:val}))} placeholder="Buscar cliente..." emptyLabel="Sin vincular" />
        </div>

        <div style={{ marginBottom:12 }}>
          <span style={shared.lbl}>Sistema constructivo</span>
          <select value={form.sistema_constructivo} onChange={e=>setForm(p=>({...p,sistema_constructivo:e.target.value}))} style={shared.inp}>
            {SISTEMAS.map(s=><option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        <div style={{ marginBottom:12 }}>
          <span style={shared.lbl}>Alcance</span>
          <select value={form.alcance} onChange={e=>setForm(p=>({...p,alcance:e.target.value}))} style={shared.inp}>
            {ALCANCES.map(a=><option key={a.v} value={a.v}>{a.label}</option>)}
          </select>
        </div>

        <div style={{ display:"flex", gap:12, marginBottom:12 }}>
          <div style={{ flex:1 }}>
            <span style={shared.lbl}>Inicio plan</span>
            <input type="date" value={form.fecha_inicio_plan} onChange={e=>setForm(p=>({...p,fecha_inicio_plan:e.target.value}))} style={shared.inp} />
          </div>
          <div style={{ flex:1 }}>
            <span style={shared.lbl}>Fin plan</span>
            <input type="date" value={form.fecha_fin_plan} onChange={e=>setForm(p=>({...p,fecha_fin_plan:e.target.value}))} style={shared.inp} />
          </div>
        </div>

        {jefesList.length > 0 && (
          <div style={{ marginBottom:12 }}>
            <span style={shared.lbl}>Responsable de obra</span>
            <select value={form.jefe_id} onChange={e=>setForm(p=>({...p,jefe_id:e.target.value}))} style={shared.inp}>
              <option value="">Sin asignar</option>
              {jefesList.map(j=><option key={j.id} value={j.id}>{j.nombre}</option>)}
            </select>
          </div>
        )}

        <div style={{ background:"#f8f8f8", borderRadius:10, padding:14, marginBottom:14 }}>
          <div style={{ fontSize:11, fontWeight:700, color:"#888", marginBottom:12, textTransform:"uppercase" }}>Vínculos</div>
          <div style={{ marginBottom:10 }}>
            <span style={shared.lbl}>📋 Proyecto</span>
            <Combobox options={proyectos.map(p=>({value:p.id,label:`${p.numero_proyecto||""} — ${p.descripcion||""}`.trim()}))} value={form.proyecto_id} onChange={val=>setForm(p=>({...p,proyecto_id:val}))} placeholder="Buscar proyecto..." emptyLabel="Sin vincular" />
          </div>
          <div>
            <span style={shared.lbl}>💰 Presupuesto</span>
            <Combobox options={presupuestos.map(p=>({value:p.id,label:`${p.codigo||""} — ${p.descripcion||p.cliente||""}`.trim()}))} value={form.presupuesto_id} onChange={val=>setForm(p=>({...p,presupuesto_id:val}))} placeholder="Buscar presupuesto..." emptyLabel="Sin vincular" />
          </div>
        </div>

        <div style={{ marginBottom:16 }}>
          <span style={shared.lbl}>Notas internas</span>
          <textarea value={form.notas} onChange={e=>setForm(p=>({...p,notas:e.target.value}))} rows={3} style={{ ...shared.inp, resize:"vertical" }} placeholder="Observaciones…" />
        </div>

        <div style={{ display:"flex", gap:8 }}>
          <button onClick={()=>onGuardar(form)} disabled={!form.nombre} style={{ ...shared.btn, flex:1 }}>Guardar cambios</button>
          <button onClick={onClose} style={{ ...shared.btnSm, flex:1, padding:"10px" }}>Cancelar</button>
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════
   VISTA JEFE — MOBILE (parte diario)
════════════════════════════════════════════ */
function VistaJefe({ perfil, onLogout }) {
  const [obra, setObra] = useState(null);
  const [tareas, setTareas] = useState([]);
  const [parte, setParte] = useState(null);
  const [eventos, setEventos] = useState([]);
  const [avances, setAvances] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [tab, setTab] = useState("tareas");
  const [panelTarea, setPanelTarea] = useState(null);
  const [showEvt, setShowEvt] = useState(false);
  const [nuevoEvt, setNuevoEvt] = useState({ tipo:"remito", descripcion:"", proveedor:"", numero_remito:"", conforme:true, dias_perdidos:"" });
  const hoy = new Date().toISOString().slice(0,10);

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const tk = await getToken();
      const obras = await fetch(`${SUPA_URL}/obras_campo?jefe_id=eq.${perfil.id}&estado=eq.activa&select=*`,{headers:hdrs(tk)}).then(r=>r.json());
      const o = obras[0]; if(!o){setLoading(false);return;}
      setObra(o);
      const [tArr,pArr] = await Promise.all([
        fetch(`${SUPA_URL}/tareas_obra?obra_id=eq.${o.id}&order=orden.asc`,{headers:hdrs(tk)}).then(r=>r.json()),
        fetch(`${SUPA_URL}/partes_diarios?obra_id=eq.${o.id}&fecha=eq.${hoy}&select=*`,{headers:hdrs(tk)}).then(r=>r.json()),
      ]);
      const tFinal = Array.isArray(tArr)?tArr:[];
      setTareas(tFinal);
      const p = pArr[0]||null; setParte(p);
      if(p){
        const evArr = await fetch(`${SUPA_URL}/eventos_parte?parte_id=eq.${p.id}&order=created_at.asc`,{headers:hdrs(tk)}).then(r=>r.json());
        setEventos(Array.isArray(evArr)?evArr:[]);
      }
      if(tFinal.length>0){
        const ids=tFinal.map(t=>t.id).join(",");
        const avArr=await fetch(`${SUPA_URL}/avances_tarea?tarea_id=in.(${ids})&order=created_at.desc`,{headers:hdrs(tk)}).then(r=>r.json());
        const avMap={};
        (Array.isArray(avArr)?avArr:[]).forEach(a=>{if(!avMap[a.tarea_id])avMap[a.tarea_id]=a;});
        setAvances(avMap);
      }
    } catch(e){console.error(e);}
    setLoading(false);
  },[perfil,hoy]);

  useEffect(()=>{cargar();},[cargar]);

  async function asegurarParte() {
    const tk=await getToken();
    if(parte) return {parte,tk};
    const exist=await fetch(`${SUPA_URL}/partes_diarios?obra_id=eq.${obra.id}&fecha=eq.${hoy}`,{headers:hdrs(tk)}).then(r=>r.json());
    if(Array.isArray(exist)&&exist.length>0){setParte(exist[0]);return{parte:exist[0],tk};}
    const r=await fetch(`${SUPA_URL}/partes_diarios`,{method:"POST",headers:hdrs(tk),body:JSON.stringify({obra_id:obra.id,fecha:hoy,jefe_id:perfil.id})});
    const rows=await r.json();const p=rows[0];setParte(p);return{parte:p,tk};
  }

  async function guardarParte(campo,valor){
    setSaving(true);
    try{const{parte:p,tk}=await asegurarParte();await fetch(`${SUPA_URL}/partes_diarios?id=eq.${p.id}`,{method:"PATCH",headers:hdrs(tk),body:JSON.stringify({[campo]:valor})});setParte(prev=>({...prev,[campo]:valor}));}
    catch(e){console.error(e);}
    setSaving(false);
  }

  async function guardarAvance(tareaId,pct,nota){
    const{parte:p,tk}=await asegurarParte();
    const existing=avances[tareaId];
    let avanceId;
    if(existing){await fetch(`${SUPA_URL}/avances_tarea?id=eq.${existing.id}`,{method:"PATCH",headers:hdrs(tk),body:JSON.stringify({porcentaje:pct,nota})});avanceId=existing.id;}
    else{const r=await fetch(`${SUPA_URL}/avances_tarea`,{method:"POST",headers:hdrs(tk),body:JSON.stringify({parte_id:p.id,tarea_id:tareaId,porcentaje:pct,nota})});const rows=await r.json();avanceId=rows[0].id;}
    setAvances(prev=>({...prev,[tareaId]:{...prev[tareaId],id:avanceId,porcentaje:pct,nota}}));
    setMsg("✓ Guardado");setTimeout(()=>setMsg(""),1500);
  }

  async function agregarEvento(){
    setSaving(true);
    try{
      const{parte:p,tk}=await asegurarParte();
      const body={parte_id:p.id,...nuevoEvt,dias_perdidos:nuevoEvt.dias_perdidos?parseFloat(nuevoEvt.dias_perdidos):null};
      const r=await fetch(`${SUPA_URL}/eventos_parte`,{method:"POST",headers:hdrs(tk),body:JSON.stringify(body)});
      const rows=await r.json();setEventos(prev=>[...prev,rows[0]]);
      setNuevoEvt({tipo:"remito",descripcion:"",proveedor:"",numero_remito:"",conforme:true,dias_perdidos:""});
      setShowEvt(false);setMsg("✓ Evento guardado");setTimeout(()=>setMsg(""),1500);
    }catch(e){console.error(e);}
    setSaving(false);
  }

  if(loading) return <div style={{display:"flex",alignItems:"center",justifyContent:"center",minHeight:"100vh",color:"#888",fontFamily:"system-ui"}}>Cargando obra…</div>;
  if(!obra) return <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",minHeight:"100vh",fontFamily:"system-ui",gap:16}}><p style={{color:"#888"}}>No tenés obra activa asignada.</p><button onClick={onLogout} style={shared.btn}>Salir</button></div>;

  const avanceGeneral = tareas.length>0 ? Math.round(tareas.reduce((s,t)=>s+(avances[t.id]?.porcentaje||0),0)/tareas.length) : 0;
  const porEtapa={};
  tareas.forEach(t=>{const e=t.etapa||"Sin etapa";if(!porEtapa[e])porEtapa[e]=[];porEtapa[e].push(t);});

  return (
    <div style={{fontFamily:"system-ui, -apple-system, sans-serif",minHeight:"100vh",background:"#f5f5f7",paddingBottom:32}}>
      {/* Header */}
      <div style={{background:"#111",color:"#fff",padding:"16px 20px",position:"sticky",top:0,zIndex:10}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
          <div>
            {obra.codigo&&<div style={{fontSize:10,color:"#666",fontWeight:700,letterSpacing:1}}>{obra.codigo}</div>}
            <div style={{fontWeight:700,fontSize:17,marginTop:2}}>{obra.nombre}</div>
            <div style={{fontSize:11,color:"#888"}}>{obra.sistema_constructivo} · {ALCANCES.find(a=>a.v===obra.alcance)?.label||obra.alcance}</div>
          </div>
          <button onClick={onLogout} style={{background:"none",border:"none",color:"#666",cursor:"pointer",fontSize:12}}>Salir</button>
        </div>
        <div style={{marginTop:10}}>
          <div style={{display:"flex",justifyContent:"space-between",fontSize:12,color:"#aaa",marginBottom:4}}>
            <span>Avance general</span><span style={{fontWeight:700,color:"#fff",fontSize:14}}>{avanceGeneral}%</span>
          </div>
          <div style={{height:6,background:"#333",borderRadius:3,overflow:"hidden"}}>
            <div style={{height:"100%",width:`${avanceGeneral}%`,background:"#22c55e",transition:"width .5s"}}/>
          </div>
        </div>
        <div style={{marginTop:5,fontSize:11,color:"#666"}}>{new Date(hoy+"T12:00:00").toLocaleDateString("es-AR",{weekday:"long",day:"numeric",month:"long"})}</div>
      </div>

      {/* Tabs */}
      <div style={{display:"flex",background:"#fff",borderBottom:"1px solid #eee",position:"sticky",top:107,zIndex:9}}>
        {[["tareas","📋 Tareas"],["parte","📝 Parte"],["eventos","📦 Eventos"]].map(([id,label])=>(
          <button key={id} onClick={()=>setTab(id)} style={{flex:1,padding:"13px 4px",fontSize:13,fontWeight:tab===id?700:400,background:"none",border:"none",cursor:"pointer",color:tab===id?"#111":"#aaa",borderBottom:tab===id?"2px solid #111":"2px solid transparent"}}>
            {label}
          </button>
        ))}
      </div>

      {msg&&<div style={{background:"#d4edda",color:"#155724",padding:"8px 16px",textAlign:"center",fontSize:13}}>{msg}</div>}
      {saving&&<div style={{background:"#fff3cd",color:"#856404",padding:"5px 16px",textAlign:"center",fontSize:12}}>Guardando…</div>}

      {/* TAB TAREAS */}
      {tab==="tareas"&&(
        <div style={{padding:"12px 16px"}}>
          {Object.entries(porEtapa).map(([etapa,tArr])=>{
            const color=ETAPA_COLOR[etapa]||"#888";
            const pctE=Math.round(tArr.reduce((s,t)=>s+(avances[t.id]?.porcentaje||0),0)/tArr.length);
            return(
              <div key={etapa} style={{marginBottom:20}}>
                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
                  <div style={{width:10,height:10,borderRadius:"50%",background:color}}/>
                  <span style={{fontWeight:700,fontSize:13,flex:1}}>{etapa}</span>
                  <span style={{fontSize:13,fontWeight:700,color}}>{pctE}%</span>
                </div>
                {tArr.map(t=>{
                  const pct=avances[t.id]?.porcentaje||0;
                  return(
                    <div key={t.id} style={{...shared.card,marginBottom:8,borderLeft:`4px solid ${color}`}}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:6}}>
                        <span style={{fontWeight:600,fontSize:14}}>{t.nombre}</span>
                        <span style={{fontWeight:800,fontSize:18}}>{pct}%</span>
                      </div>
                      <div style={{height:5,background:"#f0f0f0",borderRadius:3,overflow:"hidden",marginBottom:8}}>
                        <div style={{height:"100%",width:`${pct}%`,background:pct===100?"#22c55e":color}}/>
                      </div>
                      {/* Botones % rápidos */}
                      <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
                        {[0,10,25,50,75,90,100].map(p=>(
                          <button key={p} onClick={()=>guardarAvance(t.id,p,avances[t.id]?.nota)} style={{...shared.btnSm,minWidth:42,minHeight:38,fontWeight:700,fontSize:13,background:pct===p?color:"#f0f0f0",color:pct===p?"#fff":"#333"}}>{p}%</button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      )}

      {/* TAB PARTE */}
      {tab==="parte"&&(
        <div style={{padding:"12px 16px"}}>
          <div style={{...shared.card,marginBottom:12}}>
            <span style={shared.lbl}>Clima del día</span>
            <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
              {CLIMAS.map(c=><button key={c.v} onClick={()=>guardarParte("clima",c.v)} style={{...shared.btnSm,minHeight:40,background:parte?.clima===c.v?"#111":"#f0f0f0",color:parte?.clima===c.v?"#fff":"#333"}}>{c.label}</button>)}
            </div>
          </div>
          <div style={{...shared.card,marginBottom:12}}>
            <span style={shared.lbl}>Personal y horas</span>
            <div style={{display:"flex",gap:12}}>
              <div style={{flex:1}}>
                <label style={{fontSize:12,color:"#888",display:"block",marginBottom:4}}>Personas</label>
                <input type="number" inputMode="numeric" min="0" defaultValue={parte?.personal_cantidad||""} onBlur={e=>guardarParte("personal_cantidad",parseInt(e.target.value)||null)} style={shared.inp} placeholder="0"/>
              </div>
              <div style={{flex:1}}>
                <label style={{fontSize:12,color:"#888",display:"block",marginBottom:4}}>Horas</label>
                <input type="number" inputMode="decimal" min="0" step="0.5" defaultValue={parte?.horas_trabajadas||""} onBlur={e=>guardarParte("horas_trabajadas",parseFloat(e.target.value)||null)} style={shared.inp} placeholder="0"/>
              </div>
            </div>
          </div>
          <div style={{...shared.card}}>
            <span style={shared.lbl}>Observaciones</span>
            <textarea defaultValue={parte?.observaciones||""} onBlur={e=>guardarParte("observaciones",e.target.value)} placeholder="Novedades del día…" rows={5} style={{...shared.inp,resize:"vertical",lineHeight:1.6}}/>
          </div>
        </div>
      )}

      {/* TAB EVENTOS */}
      {tab==="eventos"&&(
        <div style={{padding:"12px 16px"}}>
          <button onClick={()=>setShowEvt(!showEvt)} style={{...shared.btn,width:"100%",marginBottom:12}}>
            {showEvt?"Cancelar":"+ Agregar evento"}
          </button>
          {showEvt&&(
            <div style={{...shared.card,marginBottom:12,background:"#f8f8f8"}}>
              <span style={shared.lbl}>Tipo</span>
              <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:12}}>
                {TIPOS_EVENTO.map(t=><button key={t.v} onClick={()=>setNuevoEvt(p=>({...p,tipo:t.v}))} style={{...shared.btnSm,minHeight:40,background:nuevoEvt.tipo===t.v?"#111":"#fff",color:nuevoEvt.tipo===t.v?"#fff":"#333",border:"1px solid #ddd"}}>{t.label}</button>)}
              </div>
              {nuevoEvt.tipo==="remito"&&<><input placeholder="Proveedor" value={nuevoEvt.proveedor} onChange={e=>setNuevoEvt(p=>({...p,proveedor:e.target.value}))} style={{...shared.inp,marginBottom:10}}/><input placeholder="N° Remito" value={nuevoEvt.numero_remito} onChange={e=>setNuevoEvt(p=>({...p,numero_remito:e.target.value}))} style={{...shared.inp,marginBottom:10}}/><div style={{display:"flex",gap:10,marginBottom:10,alignItems:"center"}}><span style={{fontSize:14}}>Conforme:</span><button onClick={()=>setNuevoEvt(p=>({...p,conforme:true}))} style={{...shared.btnSm,minHeight:40,background:nuevoEvt.conforme?"#111":"#f0f0f0",color:nuevoEvt.conforme?"#fff":"#333"}}>✓ Sí</button><button onClick={()=>setNuevoEvt(p=>({...p,conforme:false}))} style={{...shared.btnSm,minHeight:40,background:nuevoEvt.conforme===false?"#e53":"#f0f0f0",color:nuevoEvt.conforme===false?"#fff":"#333"}}>✗ No</button></div></>}
              {nuevoEvt.tipo==="paralizacion"&&<input type="number" inputMode="decimal" step="0.5" placeholder="Días perdidos" value={nuevoEvt.dias_perdidos} onChange={e=>setNuevoEvt(p=>({...p,dias_perdidos:e.target.value}))} style={{...shared.inp,marginBottom:10}}/>}
              <textarea placeholder="Descripción / notas" value={nuevoEvt.descripcion} onChange={e=>setNuevoEvt(p=>({...p,descripcion:e.target.value}))} rows={3} style={{...shared.inp,resize:"vertical",marginBottom:12}}/>
              <button onClick={agregarEvento} style={{...shared.btn,width:"100%"}}>Guardar evento</button>
            </div>
          )}
          {eventos.length===0&&!showEvt&&<div style={{textAlign:"center",color:"#aaa",fontSize:14,padding:"32px 0"}}>Sin eventos hoy</div>}
          {eventos.map(ev=>(
            <div key={ev.id} style={{...shared.card,marginBottom:10,borderLeft:"4px solid #111"}}>
              <div style={{fontWeight:600,fontSize:14}}>{TIPOS_EVENTO.find(t=>t.v===ev.tipo)?.label||ev.tipo}</div>
              {ev.proveedor&&<div style={{fontSize:13,color:"#666",marginTop:4}}>Prov: {ev.proveedor} · Remito: {ev.numero_remito} · {ev.conforme?"✓ Conforme":"✗ No conforme"}</div>}
              {ev.dias_perdidos&&<div style={{fontSize:13,color:"#e53",marginTop:4}}>⏸ {ev.dias_perdidos} días perdidos</div>}
              {ev.descripcion&&<div style={{fontSize:14,marginTop:6}}>{ev.descripcion}</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════
   VISTA ADMIN — LISTA DE OBRAS
════════════════════════════════════════════ */
function VistaAdmin() {
  const [obras, setObras] = useState([]);
  const [loading, setLoading] = useState(true);
  const [jefesList, setJefesList] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [obraDetalle, setObraDetalle] = useState(null);
  const [avancesObra, setAvancesObra] = useState({});
  const [msg, setMsg] = useState("");
  const [nuevaObra, setNuevaObra] = useState({ nombre:"", codigo:"", sistema_constructivo:"Steel Frame", alcance:"obra_completa", fecha_inicio_plan:"", fecha_fin_plan:"", jefe_id:"", cliente_id:"" });
  const [saving, setSaving] = useState(false);

  useEffect(()=>{ cargarTodo(); },[]);

  async function cargarTodo() {
    setLoading(true);
    const tk = await getToken();
    const [obrasData, jefesData] = await Promise.all([
      fetch(`${SUPA_URL}/obras_campo?order=created_at.desc&select=*`,{headers:hdrs(tk)}).then(r=>r.json()),
      fetch(`${SUPA_URL}/perfiles?rol=eq.jefe_obra&select=id,nombre`,{headers:hdrs(tk)}).then(r=>r.json()),
    ]);
    const obrasArr = Array.isArray(obrasData)?obrasData:[];
    setJefesList(Array.isArray(jefesData)?jefesData:[]);
    setObras(obrasArr);

    // Avance por obra
    const avMap={};
    await Promise.all(obrasArr.map(async o=>{
      const tk2=await getToken();
      const tArr=await fetch(`${SUPA_URL}/tareas_obra?obra_id=eq.${o.id}&select=id`,{headers:hdrs(tk2)}).then(r=>r.json());
      if(!Array.isArray(tArr)||tArr.length===0){avMap[o.id]=0;return;}
      const ids=tArr.map(t=>t.id).join(",");
      const avArr=await fetch(`${SUPA_URL}/avances_tarea?tarea_id=in.(${ids})&order=created_at.desc`,{headers:hdrs(tk2)}).then(r=>r.json());
      if(!Array.isArray(avArr)||avArr.length===0){avMap[o.id]=0;return;}
      const latest={};avArr.forEach(a=>{if(!latest[a.tarea_id])latest[a.tarea_id]=a.porcentaje;});
      const vals=Object.values(latest);
      avMap[o.id]=Math.round(vals.reduce((s,v)=>s+v,0)/tArr.length);
    }));
    setAvancesObra(avMap);
    setLoading(false);
  }

  async function crearObra() {
    setSaving(true);
    const tk = await getToken();
    await fetch(`${SUPA_URL}/obras_campo`,{method:"POST",headers:hdrs(tk),body:JSON.stringify({...nuevaObra,estado:"activa"})});
    setShowModal(false);
    setNuevaObra({nombre:"",codigo:"",sistema_constructivo:"Steel Frame",alcance:"obra_completa",fecha_inicio_plan:"",fecha_fin_plan:"",jefe_id:"",cliente_id:""});
    await cargarTodo();
    setSaving(false);
  }

  async function cambiarJefe(obraId, jefeId) {
    const tk = await getToken();
    await fetch(`${SUPA_URL}/obras_campo?id=eq.${obraId}`,{method:"PATCH",headers:hdrs(tk),body:JSON.stringify({jefe_id:jefeId||null})});
    setObras(prev=>prev.map(o=>o.id===obraId?{...o,jefe_id:jefeId}:o));
  }

  if (obraDetalle) {
    return (
      <DetalleObra
        obra={obraDetalle}
        jefesList={jefesList}
        onVolver={()=>setObraDetalle(null)}
        onActualizarObra={obraActualizada => setObraDetalle(obraActualizada)}
      />
    );
  }

  return (
    <div style={{fontFamily:"system-ui, -apple-system, sans-serif", padding:"20px 20px", maxWidth:1100, margin:"0 auto"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20,flexWrap:"wrap",gap:12}}>
        <h1 style={{margin:0,fontSize:22,fontWeight:700}}>🏗️ Obras</h1>
        <button onClick={()=>setShowModal(true)} style={shared.btn}>+ Nueva obra</button>
      </div>

      {msg&&<div style={{background:"#d4edda",color:"#155724",borderRadius:8,padding:"8px 12px",marginBottom:14,fontSize:13}}>{msg}</div>}

      {loading ? <p style={{color:"#aaa"}}>Cargando…</p> : (
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          {obras.map(o=>{
            const jefe = jefesList.find(j=>j.id===o.jefe_id);
            const pct = avancesObra[o.id]||0;
            const estadoColor = {activa:"#22c55e",pausada:"#f59e0b",finalizada:"#888"}[o.estado]||"#888";
            return (
              <div key={o.id} style={{...shared.card,display:"flex",gap:14,alignItems:"flex-start",flexWrap:"wrap",cursor:"pointer"}} onClick={()=>setObraDetalle(o)}>
                <div style={{flex:1,minWidth:200}}>
                  <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:3,flexWrap:"wrap"}}>
                    {o.codigo&&<span style={{fontSize:11,fontWeight:700,color:"#aaa"}}>{o.codigo}</span>}
                    <span style={{fontSize:12,background:estadoColor+"22",color:estadoColor,borderRadius:6,padding:"2px 8px",fontWeight:600}}>{o.estado}</span>
                  </div>
                  <div style={{fontWeight:700,fontSize:16,marginBottom:2}}>{o.nombre}</div>
                  <div style={{fontSize:12,color:"#888"}}>{o.sistema_constructivo} · {ALCANCES.find(a=>a.v===o.alcance)?.label||o.alcance}</div>
                  {o.direccion&&<div style={{fontSize:12,color:"#aaa",marginTop:2}}>📍 {o.direccion}</div>}
                  {/* Barra avance */}
                  <div style={{marginTop:8}}>
                    <div style={{display:"flex",justifyContent:"space-between",fontSize:11,color:"#aaa",marginBottom:3}}>
                      <span>Avance</span><span style={{fontWeight:700,color:"#111"}}>{pct}%</span>
                    </div>
                    <div style={{height:5,background:"#f0f0f0",borderRadius:3,overflow:"hidden"}}>
                      <div style={{height:"100%",width:`${pct}%`,background:pct===100?"#22c55e":"#6366f1"}}/>
                    </div>
                  </div>
                </div>
                {/* Selector responsable */}
                <div style={{flexShrink:0}} onClick={e=>e.stopPropagation()}>
                  <span style={shared.lbl}>Responsable</span>
                  <select value={o.jefe_id||""} onChange={e=>cambiarJefe(o.id,e.target.value)} style={{...shared.inp,width:160,fontSize:13,padding:"7px 10px"}}>
                    <option value="">Sin asignar</option>
                    {jefesList.map(j=><option key={j.id} value={j.id}>{j.nombre}</option>)}
                  </select>
                </div>
              </div>
            );
          })}
          {obras.length===0&&<p style={{color:"#aaa",textAlign:"center",padding:40}}>Sin obras. Creá la primera.</p>}
        </div>
      )}

      {/* Modal nueva obra */}
      {showModal&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.5)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:100,padding:16}}>
          <div style={{background:"#fff",borderRadius:16,padding:28,width:"100%",maxWidth:440,maxHeight:"90vh",overflowY:"auto"}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:20}}>
              <h3 style={{margin:0}}>Nueva obra</h3>
              <button onClick={()=>setShowModal(false)} style={{...shared.btnSm,padding:"5px 10px"}}>✕</button>
            </div>
            {[{lbl:"Código",key:"codigo",ph:"2026-SF-531"},{lbl:"Nombre *",key:"nombre",ph:"Nombre de la obra"}].map(f=>(
              <div key={f.key} style={{marginBottom:12}}>
                <span style={shared.lbl}>{f.lbl}</span>
                <input value={nuevaObra[f.key]} onChange={e=>setNuevaObra(p=>({...p,[f.key]:e.target.value}))} style={shared.inp} placeholder={f.ph}/>
              </div>
            ))}
            <div style={{marginBottom:12}}>
              <span style={shared.lbl}>Sistema constructivo</span>
              <select value={nuevaObra.sistema_constructivo} onChange={e=>setNuevaObra(p=>({...p,sistema_constructivo:e.target.value}))} style={shared.inp}>
                {SISTEMAS.map(s=><option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div style={{marginBottom:12}}>
              <span style={shared.lbl}>Alcance</span>
              <select value={nuevaObra.alcance} onChange={e=>setNuevaObra(p=>({...p,alcance:e.target.value}))} style={shared.inp}>
                {ALCANCES.map(a=><option key={a.v} value={a.v}>{a.label}</option>)}
              </select>
            </div>
            <div style={{display:"flex",gap:12,marginBottom:12}}>
              <div style={{flex:1}}>
                <span style={shared.lbl}>Inicio plan</span>
                <input type="date" value={nuevaObra.fecha_inicio_plan} onChange={e=>setNuevaObra(p=>({...p,fecha_inicio_plan:e.target.value}))} style={shared.inp}/>
              </div>
              <div style={{flex:1}}>
                <span style={shared.lbl}>Fin plan</span>
                <input type="date" value={nuevaObra.fecha_fin_plan} onChange={e=>setNuevaObra(p=>({...p,fecha_fin_plan:e.target.value}))} style={shared.inp}/>
              </div>
            </div>
            <div style={{marginBottom:16}}>
              <span style={shared.lbl}>Responsable</span>
              <select value={nuevaObra.jefe_id} onChange={e=>setNuevaObra(p=>({...p,jefe_id:e.target.value}))} style={shared.inp}>
                <option value="">Sin asignar</option>
                {jefesList.map(j=><option key={j.id} value={j.id}>{j.nombre}</option>)}
              </select>
            </div>
            <div style={{display:"flex",gap:8}}>
              <button onClick={crearObra} disabled={saving||!nuevaObra.nombre} style={{...shared.btn,flex:1}}>
                {saving?"Creando…":"Crear obra"}
              </button>
              <button onClick={()=>setShowModal(false)} style={{...shared.btnSm,flex:1,padding:"10px"}}>Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════
   EXPORT
════════════════════════════════════════════ */
export default function Obras({ perfil, onLogout }) {
  if (!perfil) return <div style={{display:"flex",alignItems:"center",justifyContent:"center",minHeight:"100vh",color:"#aaa",fontFamily:"system-ui"}}>Cargando…</div>;
  if (perfil.rol === "jefe_obra") return <VistaJefe perfil={perfil} onLogout={onLogout} />;
  return <VistaAdmin />;
}
