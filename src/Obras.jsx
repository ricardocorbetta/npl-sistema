import React, { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "./supabase.js";
import Combobox from "./Combobox.jsx";
import { Gantt, Willow } from "@svar-ui/react-gantt";

const SUPA_URL = "https://imkmosifqxzbtqgzssst.supabase.co/rest/v1";
const ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlta21vc2lmcXh6YnRxZ3pzc3N0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkxODk4NTUsImV4cCI6MjA5NDc2NTg1NX0.5gtCs8Yv3vDSrKxAmXSr3zjWJ5HjimCKejfO-XrHPss";
const EDGE_URL = "https://imkmosifqxzbtqgzssst.supabase.co/functions/v1";

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
  { v:"fundacion",             label:"Fundación" },
  { v:"steel_frame_obra_gris", label:"Steel Frame Obra Gris" },
  { v:"fundacion_steel_frame", label:"Fundación + Steel Frame" },
  { v:"estructura",            label:"Estructura" },
  { v:"obra_completa",         label:"Obra completa" },
  { v:"llave_en_mano",         label:"Llave en mano" },
];
const CARPETAS_DEF = [
  { num:1, nombre:"Contrato y Presupuesto", icon:"📄", driveKey:"drive_carpeta_1",
    subs:["01-Interno","02-Con cliente"], tipoLinks:["contrato","presupuesto"] },
  { num:2, nombre:"Proyecto Ejecutivo",     icon:"📐", driveKey:"drive_carpeta_2",
    subs:["00-Estudio de suelos","01-Arquitectura","02-Ingeniería"], tipoLinks:["plano"] },
  { num:3, nombre:"Cómputo y Presupuesto",  icon:"📊", driveKey:"drive_carpeta_3",
    subs:["00-Cómputo","01-Presupuestos proveedores","02-Mano de obra"], tipoLinks:["otro"] },
  { num:4, nombre:"Plan de trabajo y Gantt",icon:"📅", driveKey:"drive_carpeta_4", subs:[], tipoLinks:[] },
  { num:5, nombre:"Inspecciones y Checklist",icon:"✅",driveKey:"drive_carpeta_5", subs:[], tipoLinks:["otro"] },
  { num:6, nombre:"Fotos y Videos",         icon:"📷", driveKey:"drive_carpeta_6", subs:[], tipoLinks:["otro"] },
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
   GANTT SVAR — Carpeta 4
════════════════════════════════════════════ */
function GanttObra({ obra, onClose }) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [panelTarea, setPanelTarea] = useState(null);
  const [rendimientos, setRendimientos] = useState({});
  const [msg, setMsg] = useState("");

  useEffect(() => { cargar(); }, [obra.id]);

  async function cargar() {
    setLoading(true);
    const tk = await getToken();
    const tArr = await fetch(`${SUPA_URL}/tareas_obra?obra_id=eq.${obra.id}&order=orden.asc`, { headers:hdrs(tk) }).then(r=>r.json());
    const tFinal = Array.isArray(tArr) ? tArr : [];

    // Avances % y días reales
    if (tFinal.length > 0) {
      const ids = tFinal.map(t=>t.id).join(",");
      const [avArr, sArr] = await Promise.all([
        fetch(`${SUPA_URL}/avances_tarea?tarea_id=in.(${ids})&order=created_at.desc`, { headers:hdrs(tk) }).then(r=>r.json()),
        fetch(`${SUPA_URL}/subtareas_obra?tarea_id=in.(${ids})&select=id,tarea_id`, { headers:hdrs(tk) }).then(r=>r.json()),
      ]);

      // Pct por tarea
      const pctMap = {};
      (Array.isArray(avArr)?avArr:[]).forEach(a => { if(!pctMap[a.tarea_id]) pctMap[a.tarea_id]=a.porcentaje; });

      // Días reales por tarea
      const subs = Array.isArray(sArr) ? sArr : [];
      let rMap = {};
      if (subs.length > 0) {
        const sIds = subs.map(s=>s.id).join(",");
        const rArr = await fetch(`${SUPA_URL}/subtarea_registros?subtarea_id=in.(${sIds})`, { headers:hdrs(tk) }).then(r=>r.json());
        const diasPorSub = {};
        (Array.isArray(rArr)?rArr:[]).forEach(r => { diasPorSub[r.subtarea_id]=(diasPorSub[r.subtarea_id]||0)+(parseFloat(r.dias)||0); });
        subs.forEach(s => { rMap[s.tarea_id]=(rMap[s.tarea_id]||0)+(diasPorSub[s.id]||0); });
      }
      setRendimientos(rMap);

      // Convertir a formato SVAR Gantt
      // Agrupar por etapa → summary tasks
      const etapas = {};
      tFinal.forEach(t => {
        const e = t.etapa || "Sin etapa";
        if (!etapas[e]) etapas[e] = [];
        etapas[e].push(t);
      });

      const svarTasks = [];
      let order = 1;
      const hoy = new Date();

      Object.entries(etapas).forEach(([etapa, tArr]) => {
        const etapaId = `etapa-${etapa}`;
        // Fechas del grupo
        const fechasIni = tArr.filter(t=>t.fecha_inicio_plan).map(t=>new Date(t.fecha_inicio_plan));
        const fechasFin = tArr.filter(t=>t.fecha_fin_plan).map(t=>new Date(t.fecha_fin_plan));
        const iniGrupo = fechasIni.length ? new Date(Math.min(...fechasIni)) : hoy;
        const finGrupo = fechasFin.length ? new Date(Math.max(...fechasFin)) : new Date(hoy.getTime() + 7*86400000);

        svarTasks.push({
          id: etapaId,
          text: etapa,
          start_date: iniGrupo,
          end_date: finGrupo,
          type: "summary",
          open: true,
          order: order++,
          color: ETAPA_COLOR[etapa] || "#888",
        });

        tArr.forEach(t => {
          const ini = t.fecha_inicio_plan ? new Date(t.fecha_inicio_plan) : hoy;
          const fin = t.fecha_fin_plan ? new Date(t.fecha_fin_plan) : new Date(ini.getTime() + (t.dias_teoricos||1)*86400000);
          const pct = pctMap[t.id] || 0;
          const diasReales = rMap[t.id] || 0;
          const desvio = t.dias_teoricos && diasReales ? diasReales - t.dias_teoricos : null;

          svarTasks.push({
            id: t.id,
            text: t.nombre,
            start_date: ini,
            end_date: fin,
            parent: etapaId,
            progress: pct / 100,
            order: order++,
            color: ETAPA_COLOR[etapa] || "#888",
            // datos extra para el panel lateral
            _tarea: t,
            _diasReales: diasReales,
            _desvio: desvio,
          });
        });
      });

      setTasks(svarTasks);
    } else {
      setTasks([]);
    }
    setLoading(false);
  }

  async function onTaskUpdate(task) {
    // Sincronizar fechas editadas en el Gantt → Supabase
    if (task.id?.toString().startsWith("etapa-")) return; // no tocar grupos
    const tk = await getToken();
    await fetch(`${SUPA_URL}/tareas_obra?id=eq.${task.id}`, {
      method:"PATCH", headers:hdrs(tk),
      body: JSON.stringify({
        fecha_inicio_plan: task.start_date?.toISOString().slice(0,10),
        fecha_fin_plan:    task.end_date?.toISOString().slice(0,10),
      })
    });
    setMsg("✓ Fechas actualizadas"); setTimeout(()=>setMsg(""),1500);
  }

  if (loading) return <div style={{padding:40,textAlign:"center",color:"#aaa"}}>Cargando Gantt…</div>;

  if (tasks.length === 0) return (
    <div style={{padding:40,textAlign:"center"}}>
      <p style={{color:"#aaa",marginBottom:16}}>No hay tareas cargadas en esta obra.</p>
      <button onClick={onClose} style={shared.btnSm}>Volver</button>
    </div>
  );

  return (
    <div style={{fontFamily:"system-ui", height:"100%"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"14px 20px",borderBottom:"1px solid #f0f0f0"}}>
        <div style={{fontWeight:700,fontSize:15}}>📅 Plan de trabajo y Gantt — {obra.nombre}</div>
        <div style={{display:"flex",gap:8,alignItems:"center"}}>
          {obra.drive_carpeta_4 && (
            <a href={`https://drive.google.com/drive/folders/${obra.drive_carpeta_4}`} target="_blank" rel="noreferrer"
               style={{...shared.btnSm,textDecoration:"none",fontSize:12,display:"flex",alignItems:"center",gap:4}}>
              📂 Ver en Drive
            </a>
          )}
          <button onClick={onClose} style={{...shared.btnSm,fontSize:12}}>✕ Cerrar</button>
        </div>
      </div>

      {msg && <div style={{background:"#d4edda",color:"#155724",padding:"6px 20px",fontSize:13}}>{msg}</div>}

      {/* Métricas rápidas */}
      <div style={{display:"flex",gap:10,padding:"12px 20px",borderBottom:"1px solid #f0f0f0",flexWrap:"wrap"}}>
        {tasks.filter(t=>!t.id?.toString().startsWith("etapa-")).map(t => {
          if (!t._tarea?.dias_teoricos || !t._diasReales) return null;
          const desvio = t._diasReales - t._tarea.dias_teoricos;
          const rend = Math.round((t._tarea.dias_teoricos/t._diasReales)*100);
          return (
            <div key={t.id} style={{background:desvio>0?"#fef2f2":"#f0fdf4",borderRadius:8,padding:"6px 10px",fontSize:11,border:`1px solid ${desvio>0?"#fecaca":"#bbf7d0"}`}}>
              <span style={{fontWeight:600}}>{t.text}</span>
              <span style={{color:desvio>0?"#ef4444":"#22c55e",marginLeft:6}}>
                {desvio>0?`+${desvio}d`:`${desvio}d`} · ⚡{rend}%
              </span>
            </div>
          );
        }).filter(Boolean)}
      </div>

      {/* SVAR Gantt */}
      <div style={{height:"calc(100vh - 200px)", overflow:"hidden"}}>
        <Willow>
          <Gantt
            tasks={tasks}
            onTaskUpdate={onTaskUpdate}
            onTaskClick={task => {
              if (!task.id?.toString().startsWith("etapa-")) {
                setPanelTarea(task._tarea);
              }
            }}
            scales={[
              { unit:"month", format:"MMMM yyyy" },
              { unit:"week",  format:"'S'w" },
            ]}
            columns={[
              { id:"text",     header:"Tarea",    width:200, resize:true },
              { id:"start_date", header:"Inicio", width:90,
                template: t => t.start_date ? new Date(t.start_date).toLocaleDateString("es-AR",{day:"2-digit",month:"2-digit"}) : "" },
              { id:"end_date", header:"Fin",      width:90,
                template: t => t.end_date ? new Date(t.end_date).toLocaleDateString("es-AR",{day:"2-digit",month:"2-digit"}) : "" },
              { id:"_diasReales", header:"Días R.", width:65,
                template: t => t._diasReales > 0 ? `${t._diasReales}d` : "" },
            ]}
          />
        </Willow>
      </div>

      {/* Panel lateral tarea */}
      {panelTarea && (
        <PanelTareaDetalle
          tarea={panelTarea}
          onClose={() => { setPanelTarea(null); cargar(); }}
        />
      )}
    </div>
  );
}

/* ════════════════════════════════════════════
   PANEL LATERAL TAREA — subtareas + registro días
════════════════════════════════════════════ */
function PanelTareaDetalle({ tarea, onClose }) {
  const [subtareas, setSubtareas] = useState([]);
  const [diasPorSub, setDiasPorSub] = useState({});
  const [panelSub, setPanelSub] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [biblioSubs, setBiblioSubs] = useState([]);
  const [nueva, setNueva] = useState({ nombre:"", codigo:"", dias_teoricos:"", desde_biblioteca:false, biblioteca_subtarea_id:"" });
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
      (Array.isArray(rArr)?rArr:[]).forEach(r => { map[r.subtarea_id]=(map[r.subtarea_id]||0)+(parseFloat(r.dias)||0); });
      setDiasPorSub(map);
    }
  }

  async function agregarSub() {
    setSaving(true);
    const tk = await getToken();
    await fetch(`${SUPA_URL}/subtareas_obra`, {
      method:"POST", headers:hdrs(tk),
      body: JSON.stringify({
        tarea_id: tarea.id, nombre: nueva.nombre, codigo: nueva.codigo||null,
        dias_teoricos: parseInt(nueva.dias_teoricos)||null,
        orden: subtareas.length+1, en_biblioteca: nueva.desde_biblioteca,
        biblioteca_subtarea_id: nueva.biblioteca_subtarea_id||null,
      })
    });
    setNueva({ nombre:"", codigo:"", dias_teoricos:"", desde_biblioteca:false, biblioteca_subtarea_id:"" });
    setShowAdd(false);
    await cargar();
    setSaving(false);
  }

  async function toggleCompleta(subId, val) {
    const tk = await getToken();
    await fetch(`${SUPA_URL}/subtareas_obra?id=eq.${subId}`, { method:"PATCH", headers:hdrs(tk), body:JSON.stringify({ completada:val }) });
    setSubtareas(prev => prev.map(s => s.id===subId ? {...s, completada:val} : s));
  }

  const diasRealesTarea = Object.values(diasPorSub).reduce((s,v)=>s+v,0);
  const desvio = tarea.dias_teoricos ? diasRealesTarea - tarea.dias_teoricos : null;
  const rendimiento = tarea.dias_teoricos && diasRealesTarea > 0
    ? Math.round((tarea.dias_teoricos/diasRealesTarea)*100) : null;

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.5)",display:"flex",justifyContent:"flex-end",zIndex:300}}>
      <div style={{background:"#fff",width:"100%",maxWidth:480,height:"100%",overflowY:"auto",display:"flex",flexDirection:"column"}}>
        {/* Header */}
        <div style={{padding:"20px 20px 16px",borderBottom:"1px solid #f0f0f0",background:color+"10"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
            <div>
              <div style={{fontSize:11,color,fontWeight:700,textTransform:"uppercase"}}>{tarea.etapa}</div>
              <div style={{fontWeight:700,fontSize:18,marginTop:2}}>{tarea.nombre}</div>
            </div>
            <button onClick={onClose} style={{...shared.btnSm,padding:"6px 10px"}}>✕</button>
          </div>
          {/* KPIs */}
          {diasRealesTarea > 0 && (
            <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8,marginTop:14}}>
              {[
                { label:"Teórico",    value:tarea.dias_teoricos||"—", color:"#6366f1" },
                { label:"Real",       value:diasRealesTarea,          color:desvio>0?"#ef4444":"#22c55e" },
                { label:"Desvío",     value:desvio!==null?(desvio>0?`+${desvio}`:desvio):"—", color:desvio>0?"#ef4444":"#22c55e" },
                { label:"Rendimiento",value:rendimiento?`${rendimiento}%`:"—", color:rendimiento>=100?"#22c55e":"#f59e0b" },
              ].map(k=>(
                <div key={k.label} style={{background:"#fff",borderRadius:10,padding:"10px 8px",textAlign:"center",boxShadow:"0 1px 4px rgba(0,0,0,.06)"}}>
                  <div style={{fontSize:18,fontWeight:800,color:k.color}}>{k.value}</div>
                  <div style={{fontSize:9,color:"#888",marginTop:2}}>{k.label}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Subtareas */}
        <div style={{flex:1,overflowY:"auto",padding:"16px 20px"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
            <span style={shared.lbl}>Subtareas ({subtareas.length})</span>
            <button onClick={()=>setShowAdd(!showAdd)} style={{...shared.btnSm,fontSize:12}}>
              {showAdd?"Cancelar":"+ Agregar"}
            </button>
          </div>

          {showAdd && (
            <div style={{background:"#f0f4ff",borderRadius:12,padding:14,marginBottom:14,border:"1px solid #c7d2fe"}}>
              <div style={{display:"flex",gap:8,marginBottom:10}}>
                <button onClick={()=>setNueva(f=>({...f,desde_biblioteca:false}))} style={{...shared.btnSm,flex:1,background:!nueva.desde_biblioteca?"#111":"#f0f0f0",color:!nueva.desde_biblioteca?"#fff":"#333"}}>Nueva</button>
                <button onClick={()=>setNueva(f=>({...f,desde_biblioteca:true}))} style={{...shared.btnSm,flex:1,background:nueva.desde_biblioteca?"#111":"#f0f0f0",color:nueva.desde_biblioteca?"#fff":"#333"}}>Biblioteca</button>
              </div>
              {nueva.desde_biblioteca && (
                <select value={nueva.biblioteca_subtarea_id} onChange={e=>{
                  const sel=biblioSubs.find(b=>b.id===e.target.value);
                  setNueva(f=>({...f,biblioteca_subtarea_id:e.target.value,nombre:sel?.nombre||"",dias_teoricos:sel?.duracion_tipica_dias||""}));
                }} style={{...shared.inp,marginBottom:10}}>
                  <option value="">— Seleccionar —</option>
                  {biblioSubs.map(b=><option key={b.id} value={b.id}>{b.nombre}{b.duracion_tipica_dias?` (${b.duracion_tipica_dias}d)`:""}</option>)}
                </select>
              )}
              <div style={{display:"grid",gridTemplateColumns:"1fr 70px 70px",gap:8,marginBottom:10}}>
                <input value={nueva.nombre} onChange={e=>setNueva(f=>({...f,nombre:e.target.value}))} style={shared.inp} placeholder="Nombre subtarea"/>
                <input value={nueva.codigo} onChange={e=>setNueva(f=>({...f,codigo:e.target.value}))} style={shared.inp} placeholder="Cód."/>
                <input type="number" min="1" value={nueva.dias_teoricos} onChange={e=>setNueva(f=>({...f,dias_teoricos:e.target.value}))} style={shared.inp} placeholder="días"/>
              </div>
              <button onClick={agregarSub} disabled={saving||!nueva.nombre} style={{...shared.btn,width:"100%",fontSize:13}}>
                {saving?"Guardando…":"Agregar subtarea"}
              </button>
            </div>
          )}

          {subtareas.length===0 ? (
            <p style={{color:"#aaa",textAlign:"center",padding:"20px 0",fontSize:13}}>Sin subtareas todavía.</p>
          ) : subtareas.map(s => {
            const dr = diasPorSub[s.id]||0;
            const excede = s.dias_teoricos>0 && dr>s.dias_teoricos;
            return (
              <div key={s.id} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 12px",background:s.completada?"#f0fdf4":"#f8f8f8",borderRadius:10,marginBottom:6,border:excede?"1px solid #fecaca":"1px solid transparent"}}>
                <input type="checkbox" checked={!!s.completada} onChange={e=>toggleCompleta(s.id,e.target.checked)} style={{width:16,height:16,cursor:"pointer",flexShrink:0}}/>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{display:"flex",alignItems:"center",gap:6,flexWrap:"wrap"}}>
                    {s.codigo&&<span style={{fontSize:10,fontWeight:700,color:"#888",background:"#e8e8e8",borderRadius:4,padding:"1px 6px"}}>{s.codigo}</span>}
                    <span style={{fontSize:13,fontWeight:600,color:s.completada?"#16a34a":"#111"}}>{s.nombre}</span>
                  </div>
                  {s.dias_teoricos>0&&(
                    <div style={{marginTop:4}}>
                      <div style={{height:3,background:"#e0e0e0",borderRadius:2,overflow:"hidden"}}>
                        <div style={{height:"100%",width:`${Math.min(100,s.dias_teoricos>0?Math.round((dr/s.dias_teoricos)*100):0)}%`,background:excede?"#ef4444":"#22c55e"}}/>
                      </div>
                      <div style={{fontSize:10,color:excede?"#ef4444":"#888",marginTop:1}}>{dr}/{s.dias_teoricos}d</div>
                    </div>
                  )}
                </div>
                <div style={{textAlign:"center",flexShrink:0}}>
                  <div style={{fontSize:15,fontWeight:800,color:excede?"#ef4444":"#111"}}>{dr}</div>
                  <div style={{fontSize:9,color:"#aaa"}}>días</div>
                </div>
                <button onClick={()=>setPanelSub(s)} style={{...shared.btnSm,flexShrink:0,fontSize:12,padding:"6px 10px"}}>📝</button>
              </div>
            );
          })}
        </div>
      </div>

      {panelSub && (
        <PanelRegistroSubtarea subtarea={panelSub} onClose={()=>{ setPanelSub(null); cargar(); }} />
      )}
    </div>
  );
}

/* ════════════════════════════════════════════
   PANEL REGISTRO SUBTAREA (días, personas, obs)
════════════════════════════════════════════ */
function PanelRegistroSubtarea({ subtarea, onClose }) {
  const [registros, setRegistros] = useState([]);
  const [form, setForm] = useState({ fecha:new Date().toISOString().slice(0,10), dias:1, personas:1, observaciones:"" });
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function cargar() {
      const tk = await getToken();
      const r = await fetch(`${SUPA_URL}/subtarea_registros?subtarea_id=eq.${subtarea.id}&order=fecha.desc`, { headers:hdrs(tk) }).then(r=>r.json());
      setRegistros(Array.isArray(r)?r:[]);
      setLoading(false);
    }
    cargar();
  }, [subtarea.id]);

  async function guardar() {
    setSaving(true);
    const tk = await getToken();
    const r = await fetch(`${SUPA_URL}/subtarea_registros`, {
      method:"POST", headers:hdrs(tk),
      body: JSON.stringify({ subtarea_id:subtarea.id, ...form, dias:parseFloat(form.dias)||1, personas:parseInt(form.personas)||1 })
    }).then(r=>r.json());
    setRegistros(prev=>[r[0],...prev]);
    setForm(f=>({...f,observaciones:""}));
    setSaving(false);
  }

  const totalDias = registros.reduce((s,r)=>s+(parseFloat(r.dias)||0),0);
  const promPers = registros.length ? Math.round(registros.reduce((s,r)=>s+(r.personas||0),0)/registros.length) : 0;

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.6)",display:"flex",alignItems:"flex-end",justifyContent:"center",zIndex:400}}>
      <div style={{background:"#fff",borderRadius:"20px 20px 0 0",padding:"20px 20px 40px",width:"100%",maxWidth:540,maxHeight:"90vh",overflowY:"auto"}}>
        <div style={{width:40,height:4,background:"#e0e0e0",borderRadius:2,margin:"0 auto 16px"}}/>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:14}}>
          <div>
            {subtarea.codigo&&<div style={{fontSize:11,color:"#888",fontWeight:700}}>{subtarea.codigo}</div>}
            <div style={{fontWeight:700,fontSize:17}}>{subtarea.nombre}</div>
            {subtarea.dias_teoricos>0&&<div style={{fontSize:12,color:"#6366f1",marginTop:2}}>⏱ {subtarea.dias_teoricos} días teóricos</div>}
          </div>
          <button onClick={onClose} style={{...shared.btnSm,padding:"6px 10px"}}>✕</button>
        </div>

        {/* Resumen */}
        {totalDias > 0 && (
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:16}}>
            {[
              { label:"Días reales", value:totalDias, color:totalDias>(subtarea.dias_teoricos||999)?"#ef4444":"#22c55e" },
              { label:"Días teóricos", value:subtarea.dias_teoricos||"—", color:"#6366f1" },
              { label:"Prom. personas", value:promPers, color:"#f59e0b" },
            ].map(k=>(
              <div key={k.label} style={{background:"#f8f8f8",borderRadius:10,padding:"10px 8px",textAlign:"center"}}>
                <div style={{fontSize:20,fontWeight:800,color:k.color}}>{k.value}</div>
                <div style={{fontSize:10,color:"#888",marginTop:2}}>{k.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Historial */}
        {!loading && registros.map((reg,i)=>(
          <div key={reg.id} style={{borderBottom:"1px solid #f0f0f0",paddingBottom:10,marginBottom:10}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <span style={{fontSize:13,fontWeight:600}}>{new Date(reg.fecha+"T12:00").toLocaleDateString("es-AR",{weekday:"short",day:"numeric",month:"short"})}</span>
              <div style={{display:"flex",gap:12,fontSize:13,color:"#555"}}>
                <span>📅 {reg.dias}d</span><span>👷 {reg.personas}p</span>
              </div>
            </div>
            {reg.observaciones&&<div style={{fontSize:12,color:"#666",marginTop:4,fontStyle:"italic"}}>💬 {reg.observaciones}</div>}
          </div>
        ))}

        {/* Form nuevo registro */}
        <div style={{background:"#f8f8f8",borderRadius:12,padding:14,marginTop:8}}>
          <span style={shared.lbl}>Registrar día</span>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:10}}>
            <div>
              <label style={{fontSize:11,color:"#888",display:"block",marginBottom:3}}>Fecha</label>
              <input type="date" value={form.fecha} onChange={e=>setForm(f=>({...f,fecha:e.target.value}))} style={shared.inp}/>
            </div>
            <div>
              <label style={{fontSize:11,color:"#888",display:"block",marginBottom:3}}>Días</label>
              <input type="number" min="0.5" step="0.5" value={form.dias} onChange={e=>setForm(f=>({...f,dias:e.target.value}))} style={shared.inp}/>
            </div>
            <div>
              <label style={{fontSize:11,color:"#888",display:"block",marginBottom:3}}>Personas</label>
              <input type="number" min="1" value={form.personas} onChange={e=>setForm(f=>({...f,personas:e.target.value}))} style={shared.inp}/>
            </div>
          </div>
          <textarea value={form.observaciones} onChange={e=>setForm(f=>({...f,observaciones:e.target.value}))} placeholder="Observaciones del día…" rows={2} style={{...shared.inp,resize:"none",marginBottom:10}}/>
          <button onClick={guardar} disabled={saving} style={{...shared.btn,width:"100%"}}>
            {saving?"Guardando…":"Registrar"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════
   GESTOR CARPETA — links Drive + archivos Storage
════════════════════════════════════════════ */
function GestorCarpeta({ obra, carpeta, onClose }) {
  const [links, setLinks] = useState([]);
  const [archivos, setArchivos] = useState([]);
  const [subActiva, setSubActiva] = useState(carpeta.subs[0]||null);
  const [showAddLink, setShowAddLink] = useState(false);
  const [nuevoLink, setNuevoLink] = useState({ nombre:"", url:"", tipo:"link", descripcion:"" });
  const [subiendo, setSubiendo] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef();
  const driveFolderId = obra[carpeta.driveKey];

  useEffect(() => { cargar(); }, [carpeta.num, subActiva]);

  async function cargar() {
    const tk = await getToken();
    const [lArr, aArr] = await Promise.all([
      fetch(`${SUPA_URL}/obra_links?obra_id=eq.${obra.id}&carpeta_numero=eq.${carpeta.num}${subActiva?`&subcarpeta=eq.${encodeURIComponent(subActiva)}`:""}`, { headers:hdrs(tk) }).then(r=>r.json()),
      fetch(`${SUPA_URL}/obra_archivos?obra_id=eq.${obra.id}&carpeta_numero=eq.${carpeta.num}${subActiva?`&subcarpeta=eq.${encodeURIComponent(subActiva)}`:""}`, { headers:hdrs(tk) }).then(r=>r.json()),
    ]);
    setLinks(Array.isArray(lArr)?lArr:[]);
    // Generar URLs firmadas para archivos
    const aFinal = Array.isArray(aArr) ? aArr : [];
    const conUrls = await Promise.all(aFinal.map(async a => ({
      ...a,
      signedUrl: a.storage_path ? await (async()=>{
        const{data}=await supabase.storage.from("npl-obras").createSignedUrl(a.storage_path,3600);
        return data?.signedUrl||null;
      })() : null
    })));
    setArchivos(conUrls);
  }

  async function guardarLink() {
    setSaving(true);
    const tk = await getToken();
    await fetch(`${SUPA_URL}/obra_links`, {
      method:"POST", headers:hdrs(tk),
      body: JSON.stringify({ obra_id:obra.id, carpeta_numero:carpeta.num, subcarpeta:subActiva, ...nuevoLink, subido_por:(await supabase.auth.getUser()).data.user?.id })
    });
    setNuevoLink({ nombre:"", url:"", tipo:"link", descripcion:"" });
    setShowAddLink(false);
    await cargar();
    setSaving(false);
  }

  async function subirArchivo(file) {
    setSubiendo(true);
    try {
      const ext = file.name.split(".").pop().toLowerCase();
      const sub = subActiva ? `${subActiva}/` : "";
      const path = `obras/${obra.id}/carpeta-${carpeta.num}/${sub}${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("npl-obras").upload(path, file, { upsert:true, contentType:file.type });
      if (error) throw new Error(error.message);
      const tipo = ["jpg","jpeg","png","webp"].includes(ext)?"imagen":["mp4","mov"].includes(ext)?"video":"documento";
      const tk = await getToken();
      await fetch(`${SUPA_URL}/obra_archivos`, {
        method:"POST", headers:hdrs(tk),
        body: JSON.stringify({ obra_id:obra.id, carpeta_numero:carpeta.num, subcarpeta:subActiva, nombre:file.name, nombre_archivo:file.name, storage_path:path, tipo, subido_por:(await supabase.auth.getUser()).data.user?.id })
      });
      await cargar();
    } catch(e) { alert("Error: "+e.message); }
    setSubiendo(false);
  }

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.6)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:200,padding:16}}>
      <div style={{background:"#fff",borderRadius:16,width:"100%",maxWidth:600,maxHeight:"90vh",overflowY:"auto",display:"flex",flexDirection:"column"}}>
        {/* Header */}
        <div style={{padding:"18px 20px 14px",borderBottom:"1px solid #f0f0f0"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
            <div style={{fontWeight:700,fontSize:17}}>{carpeta.icon} {carpeta.nombre}</div>
            <button onClick={onClose} style={{...shared.btnSm,padding:"6px 10px"}}>✕</button>
          </div>

          {/* Link a Drive si existe */}
          {driveFolderId && (
            <a href={`https://drive.google.com/drive/folders/${driveFolderId}`} target="_blank" rel="noreferrer"
               style={{display:"inline-flex",alignItems:"center",gap:6,fontSize:12,color:"#1a73e8",textDecoration:"none",background:"#e8f0fe",borderRadius:8,padding:"5px 10px"}}>
              📂 Abrir en Google Drive
            </a>
          )}

          {/* Subcarpetas */}
          {carpeta.subs.length > 0 && (
            <div style={{display:"flex",gap:6,marginTop:10,flexWrap:"wrap"}}>
              <button onClick={()=>setSubActiva(null)} style={{...shared.btnSm,fontSize:12,background:!subActiva?"#111":"#f0f0f0",color:!subActiva?"#fff":"#333"}}>Todos</button>
              {carpeta.subs.map(s=>(
                <button key={s} onClick={()=>setSubActiva(s)} style={{...shared.btnSm,fontSize:12,background:subActiva===s?"#111":"#f0f0f0",color:subActiva===s?"#fff":"#333"}}>{s}</button>
              ))}
            </div>
          )}
        </div>

        {/* Contenido */}
        <div style={{padding:"14px 20px",flex:1}}>
          {/* Botones acción */}
          <div style={{display:"flex",gap:8,marginBottom:14,flexWrap:"wrap"}}>
            <button onClick={()=>setShowAddLink(!showAddLink)} style={{...shared.btnSm,fontSize:13}}>
              {showAddLink?"Cancelar":"🔗 Agregar link"}
            </button>
            <input ref={fileRef} type="file" style={{display:"none"}} multiple onChange={e=>Array.from(e.target.files).forEach(subirArchivo)}/>
            <button onClick={()=>fileRef.current.click()} disabled={subiendo} style={{...shared.btnSm,fontSize:13}}>
              {subiendo?"Subiendo…":"⬆️ Subir archivo"}
            </button>
          </div>

          {/* Form agregar link */}
          {showAddLink && (
            <div style={{background:"#f8f8f8",borderRadius:12,padding:14,marginBottom:14,border:"1px solid #e0e0e0"}}>
              <div style={{marginBottom:10}}>
                <label style={{fontSize:11,color:"#888",display:"block",marginBottom:3}}>Nombre</label>
                <input value={nuevoLink.nombre} onChange={e=>setNuevoLink(f=>({...f,nombre:e.target.value}))} style={shared.inp} placeholder="Ej: Contrato firmado"/>
              </div>
              <div style={{marginBottom:10}}>
                <label style={{fontSize:11,color:"#888",display:"block",marginBottom:3}}>URL (Drive, PDF, etc.)</label>
                <input value={nuevoLink.url} onChange={e=>setNuevoLink(f=>({...f,url:e.target.value}))} style={shared.inp} placeholder="https://drive.google.com/..."/>
              </div>
              <div style={{display:"flex",gap:8,marginBottom:10}}>
                <div style={{flex:1}}>
                  <label style={{fontSize:11,color:"#888",display:"block",marginBottom:3}}>Tipo</label>
                  <select value={nuevoLink.tipo} onChange={e=>setNuevoLink(f=>({...f,tipo:e.target.value}))} style={shared.inp}>
                    <option value="link">Link general</option>
                    <option value="drive">Google Drive</option>
                    <option value="contrato">Contrato</option>
                    <option value="presupuesto">Presupuesto</option>
                    <option value="plano">Plano</option>
                    <option value="otro">Otro</option>
                  </select>
                </div>
                <div style={{flex:1}}>
                  <label style={{fontSize:11,color:"#888",display:"block",marginBottom:3}}>Descripción</label>
                  <input value={nuevoLink.descripcion} onChange={e=>setNuevoLink(f=>({...f,descripcion:e.target.value}))} style={shared.inp} placeholder="Opcional"/>
                </div>
              </div>
              <button onClick={guardarLink} disabled={saving||!nuevoLink.nombre||!nuevoLink.url} style={{...shared.btn,width:"100%",fontSize:13}}>
                {saving?"Guardando…":"Guardar link"}
              </button>
            </div>
          )}

          {/* Links */}
          {links.map(l=>(
            <div key={l.id} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 0",borderBottom:"1px solid #f5f5f5"}}>
              <div style={{width:40,height:40,background:"#e8f0fe",borderRadius:8,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,flexShrink:0}}>
                {l.tipo==="contrato"?"📝":l.tipo==="presupuesto"?"💰":l.tipo==="plano"?"📐":l.tipo==="drive"?"📂":"🔗"}
              </div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:13,fontWeight:600,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{l.nombre}</div>
                {l.descripcion&&<div style={{fontSize:11,color:"#aaa"}}>{l.descripcion}</div>}
              </div>
              <a href={l.url} target="_blank" rel="noreferrer" style={{...shared.btnSm,textDecoration:"none",fontSize:12,flexShrink:0}}>Abrir →</a>
            </div>
          ))}

          {/* Archivos subidos */}
          {archivos.map(a=>(
            <div key={a.id} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 0",borderBottom:"1px solid #f5f5f5"}}>
              {a.tipo==="imagen"&&a.signedUrl ? (
                <img src={a.signedUrl} alt="" style={{width:44,height:44,objectFit:"cover",borderRadius:8,flexShrink:0}}/>
              ) : (
                <div style={{width:44,height:44,background:"#f0f0f0",borderRadius:8,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,flexShrink:0}}>
                  {a.tipo==="video"?"🎥":"📄"}
                </div>
              )}
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:13,fontWeight:600,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{a.nombre||a.nombre_archivo}</div>
                <div style={{fontSize:11,color:"#aaa"}}>{new Date(a.created_at).toLocaleDateString("es-AR")}</div>
              </div>
              {a.signedUrl&&<a href={a.signedUrl} target="_blank" rel="noreferrer" style={{...shared.btnSm,textDecoration:"none",fontSize:12,flexShrink:0}}>Ver</a>}
            </div>
          ))}

          {links.length===0&&archivos.length===0&&(
            <p style={{color:"#aaa",textAlign:"center",padding:"32px 0",fontSize:13}}>Sin documentos en esta carpeta.</p>
          )}
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════
   MODAL EDITAR OBRA
════════════════════════════════════════════ */
function ModalEditarObra({ obra, jefesList, onGuardar, onClose }) {
  const [form, setForm] = useState({
    nombre:obra.nombre||"", direccion:obra.direccion||"", codigo:obra.codigo||"",
    sistema_constructivo:obra.sistema_constructivo||"Steel Frame",
    alcance:obra.alcance||"obra_completa",
    fecha_inicio_plan:obra.fecha_inicio_plan||"", fecha_fin_plan:obra.fecha_fin_plan||"",
    jefe_id:obra.jefe_id||"", notas:obra.notas||"",
    cliente_id:obra.cliente_id||"", proyecto_id:obra.proyecto_id||"", presupuesto_id:obra.presupuesto_id||"",
  });
  const [proyectos,setProyectos]=useState([]);
  const [clientes,setClientes]=useState([]);
  const [presupuestos,setPresupuestos]=useState([]);

  useEffect(()=>{
    async function cargar(){
      const tk=await getToken();
      const[p,c,pr]=await Promise.all([
        fetch(`${SUPA_URL}/proyectos?select=id,descripcion,numero_proyecto&order=numero_proyecto.asc`,{headers:hdrs(tk)}).then(r=>r.json()),
        fetch(`${SUPA_URL}/clientes?select=id,empresa&order=empresa.asc`,{headers:hdrs(tk)}).then(r=>r.json()),
        fetch(`${SUPA_URL}/presupuestos?select=id,codigo,descripcion,cliente&order=created_at.desc`,{headers:hdrs(tk)}).then(r=>r.json()),
      ]);
      setProyectos(Array.isArray(p)?p:[]);
      setClientes(Array.isArray(c)?c:[]);
      setPresupuestos(Array.isArray(pr)?pr:[]);
    }
    cargar();
  },[]);

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.5)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:100,padding:16}}>
      <div style={{background:"#fff",borderRadius:16,padding:28,width:"100%",maxWidth:480,maxHeight:"90vh",overflowY:"auto"}}>
        <div style={{display:"flex",justifyContent:"space-between",marginBottom:20}}>
          <h3 style={{margin:0,fontSize:17}}>Editar obra</h3>
          <button onClick={onClose} style={{...shared.btnSm,padding:"5px 10px"}}>✕</button>
        </div>
        {[{lbl:"Código",key:"codigo",ph:"2026-SF-531"},{lbl:"Nombre *",key:"nombre",ph:"Nombre"},{lbl:"Dirección",key:"direccion",ph:"Dirección"}].map(f=>(
          <div key={f.key} style={{marginBottom:12}}>
            <span style={shared.lbl}>{f.lbl}</span>
            <input value={form[f.key]} onChange={e=>setForm(p=>({...p,[f.key]:e.target.value}))} style={shared.inp} placeholder={f.ph}/>
          </div>
        ))}
        <div style={{marginBottom:12}}>
          <span style={shared.lbl}>🏢 Cliente</span>
          <Combobox options={clientes.map(c=>({value:c.id,label:c.empresa}))} value={form.cliente_id} onChange={val=>setForm(p=>({...p,cliente_id:val}))} placeholder="Buscar cliente..." emptyLabel="Sin vincular"/>
        </div>
        <div style={{marginBottom:12}}>
          <span style={shared.lbl}>Sistema constructivo</span>
          <select value={form.sistema_constructivo} onChange={e=>setForm(p=>({...p,sistema_constructivo:e.target.value}))} style={shared.inp}>
            {SISTEMAS.map(s=><option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div style={{marginBottom:12}}>
          <span style={shared.lbl}>Alcance</span>
          <select value={form.alcance} onChange={e=>setForm(p=>({...p,alcance:e.target.value}))} style={shared.inp}>
            {ALCANCES.map(a=><option key={a.v} value={a.v}>{a.label}</option>)}
          </select>
        </div>
        <div style={{display:"flex",gap:12,marginBottom:12}}>
          <div style={{flex:1}}><span style={shared.lbl}>Inicio plan</span><input type="date" value={form.fecha_inicio_plan} onChange={e=>setForm(p=>({...p,fecha_inicio_plan:e.target.value}))} style={shared.inp}/></div>
          <div style={{flex:1}}><span style={shared.lbl}>Fin plan</span><input type="date" value={form.fecha_fin_plan} onChange={e=>setForm(p=>({...p,fecha_fin_plan:e.target.value}))} style={shared.inp}/></div>
        </div>
        {jefesList.length>0&&(
          <div style={{marginBottom:12}}>
            <span style={shared.lbl}>Responsable</span>
            <select value={form.jefe_id} onChange={e=>setForm(p=>({...p,jefe_id:e.target.value}))} style={shared.inp}>
              <option value="">Sin asignar</option>
              {jefesList.map(j=><option key={j.id} value={j.id}>{j.nombre}</option>)}
            </select>
          </div>
        )}
        <div style={{background:"#f8f8f8",borderRadius:10,padding:14,marginBottom:14}}>
          <div style={{fontSize:11,fontWeight:700,color:"#888",marginBottom:12,textTransform:"uppercase"}}>Vínculos</div>
          <div style={{marginBottom:10}}>
            <span style={shared.lbl}>📋 Proyecto</span>
            <Combobox options={proyectos.map(p=>({value:p.id,label:`${p.numero_proyecto||""} — ${p.descripcion||""}`.trim()}))} value={form.proyecto_id} onChange={val=>setForm(p=>({...p,proyecto_id:val}))} placeholder="Buscar proyecto..." emptyLabel="Sin vincular"/>
          </div>
          <div>
            <span style={shared.lbl}>💰 Presupuesto</span>
            <Combobox options={presupuestos.map(p=>({value:p.id,label:`${p.codigo||""} — ${p.descripcion||p.cliente||""}`.trim()}))} value={form.presupuesto_id} onChange={val=>setForm(p=>({...p,presupuesto_id:val}))} placeholder="Buscar presupuesto..." emptyLabel="Sin vincular"/>
          </div>
        </div>
        <div style={{marginBottom:16}}>
          <span style={shared.lbl}>Notas</span>
          <textarea value={form.notas} onChange={e=>setForm(p=>({...p,notas:e.target.value}))} rows={3} style={{...shared.inp,resize:"vertical"}}/>
        </div>
        <div style={{display:"flex",gap:8}}>
          <button onClick={()=>onGuardar(form)} disabled={!form.nombre} style={{...shared.btn,flex:1}}>Guardar</button>
          <button onClick={onClose} style={{...shared.btnSm,flex:1,padding:"10px"}}>Cancelar</button>
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════
   DETALLE DE OBRA — 6 carpetas
════════════════════════════════════════════ */
function DetalleObra({ obra: obraInicial, jefesList, onVolver }) {
  const [obra, setObra] = useState(obraInicial);
  const [carpetaActiva, setCarpetaActiva] = useState(null);
  const [showEditObra, setShowEditObra] = useState(false);
  const [creandoDrive, setCreandoDrive] = useState(false);
  const [msg, setMsg] = useState("");

  async function crearCarpetasDrive() {
    setCreandoDrive(true);
    try {
      const tk = await getToken();
      const res = await fetch(`${EDGE_URL}/crear-carpetas-drive`, {
        method:"POST",
        headers:{ Authorization:`Bearer ${tk}`, "Content-Type":"application/json" },
        body: JSON.stringify({ obra_id:obra.id, obra_nombre:obra.nombre, obra_codigo:obra.codigo })
      }).then(r=>r.json());

      if (res.ok) {
        setObra(prev => ({ ...prev, drive_folder_id:res.drive_folder_id, drive_carpeta_1:res.carpetas.carpeta_1, drive_carpeta_2:res.carpetas.carpeta_2, drive_carpeta_3:res.carpetas.carpeta_3, drive_carpeta_4:res.carpetas.carpeta_4, drive_carpeta_5:res.carpetas.carpeta_5, drive_carpeta_6:res.carpetas.carpeta_6 }));
        setMsg("✓ Carpetas creadas en Drive");
      } else {
        setMsg("Error: " + (res.error || res.msg));
      }
    } catch(e) { setMsg("Error: "+e.message); }
    setCreandoDrive(false);
    setTimeout(()=>setMsg(""),4000);
  }

  async function guardarObra(form) {
    const tk = await getToken();
    await fetch(`${SUPA_URL}/obras_campo?id=eq.${obra.id}`, { method:"PATCH", headers:hdrs(tk), body:JSON.stringify(form) });
    setObra(prev => ({ ...prev, ...form }));
    setShowEditObra(false);
  }

  return (
    <div style={{fontFamily:"system-ui, -apple-system, sans-serif"}}>
      {/* Header */}
      <div style={{background:"#111",color:"#fff",padding:"16px 20px"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
          <div>
            <button onClick={onVolver} style={{background:"none",border:"none",color:"#888",fontSize:12,cursor:"pointer",padding:0,marginBottom:6}}>← Volver</button>
            {obra.codigo&&<div style={{fontSize:10,color:"#666",fontWeight:700,letterSpacing:1}}>{obra.codigo}</div>}
            <div style={{fontWeight:700,fontSize:18}}>{obra.nombre}</div>
            <div style={{fontSize:12,color:"#888",marginTop:2}}>{obra.sistema_constructivo} · {ALCANCES.find(a=>a.v===obra.alcance)?.label||obra.alcance}</div>
          </div>
          <div style={{display:"flex",gap:8,flexDirection:"column",alignItems:"flex-end"}}>
            <button onClick={()=>setShowEditObra(true)} style={{...shared.btnSm,fontSize:12}}>✏️ Editar</button>
            {obra.drive_folder_id ? (
              <a href={`https://drive.google.com/drive/folders/${obra.drive_folder_id}`} target="_blank" rel="noreferrer"
                 style={{...shared.btnSm,fontSize:11,textDecoration:"none",display:"flex",alignItems:"center",gap:4}}>
                📂 Drive
              </a>
            ) : (
              <button onClick={crearCarpetasDrive} disabled={creandoDrive} style={{...shared.btnSm,fontSize:11,background:"#1a73e8",color:"#fff"}}>
                {creandoDrive?"Creando…":"📂 Crear carpetas Drive"}
              </button>
            )}
          </div>
        </div>
      </div>

      {msg&&<div style={{background:"#d4edda",color:"#155724",padding:"8px 20px",fontSize:13}}>{msg}</div>}

      {/* 6 Carpetas */}
      <div style={{padding:16}}>
        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10}}>
          {CARPETAS_DEF.map(c=>(
            <button key={c.num} onClick={()=>setCarpetaActiva(c)}
              style={{background:"#fff",border:"1px solid #e0e0e0",borderRadius:12,padding:"16px 10px",cursor:"pointer",textAlign:"center",boxShadow:"0 1px 4px rgba(0,0,0,.06)",position:"relative"}}>
              <div style={{fontSize:28,marginBottom:4}}>{c.icon}</div>
              <div style={{fontSize:11,fontWeight:600,color:"#333",lineHeight:1.3}}>{c.nombre}</div>
              {/* Indicador Drive conectado */}
              {obra[c.driveKey]&&<div style={{position:"absolute",top:6,right:6,width:8,height:8,borderRadius:"50%",background:"#1a73e8"}}/>}
            </button>
          ))}
        </div>
      </div>

      {/* Carpeta 4 → SVAR Gantt en pantalla completa */}
      {carpetaActiva?.num===4 && (
        <div style={{position:"fixed",inset:0,background:"#fff",zIndex:100,overflow:"auto"}}>
          <GanttObra obra={obra} onClose={()=>setCarpetaActiva(null)}/>
        </div>
      )}

      {/* Otras carpetas → Gestor */}
      {carpetaActiva && carpetaActiva.num!==4 && (
        <GestorCarpeta obra={obra} carpeta={carpetaActiva} onClose={()=>setCarpetaActiva(null)}/>
      )}

      {showEditObra&&(
        <ModalEditarObra obra={obra} jefesList={jefesList} onGuardar={guardarObra} onClose={()=>setShowEditObra(false)}/>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════
   VISTA ADMIN — LISTA DE OBRAS
════════════════════════════════════════════ */
function VistaAdmin() {
  const [obras,setObras]=useState([]);
  const [loading,setLoading]=useState(true);
  const [jefesList,setJefesList]=useState([]);
  const [obraDetalle,setObraDetalle]=useState(null);
  const [avancesObra,setAvancesObra]=useState({});
  const [showModal,setShowModal]=useState(false);
  const [nuevaObra,setNuevaObra]=useState({nombre:"",codigo:"",sistema_constructivo:"Steel Frame",alcance:"obra_completa",fecha_inicio_plan:"",fecha_fin_plan:"",jefe_id:""});
  const [saving,setSaving]=useState(false);
  const [msg,setMsg]=useState("");

  useEffect(()=>{ cargarTodo(); },[]);

  async function cargarTodo() {
    setLoading(true);
    const tk=await getToken();
    const[od,jd]=await Promise.all([
      fetch(`${SUPA_URL}/obras_campo?order=created_at.desc&select=*`,{headers:hdrs(tk)}).then(r=>r.json()),
      fetch(`${SUPA_URL}/perfiles?rol=eq.jefe_obra&select=id,nombre`,{headers:hdrs(tk)}).then(r=>r.json()),
    ]);
    const obrasArr=Array.isArray(od)?od:[];
    setJefesList(Array.isArray(jd)?jd:[]);
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
    const tk=await getToken();
    const r=await fetch(`${SUPA_URL}/obras_campo`,{method:"POST",headers:hdrs(tk),body:JSON.stringify({...nuevaObra,estado:"activa"})}).then(r=>r.json());
    const obraCreada=r[0];
    setShowModal(false);
    setNuevaObra({nombre:"",codigo:"",sistema_constructivo:"Steel Frame",alcance:"obra_completa",fecha_inicio_plan:"",fecha_fin_plan:"",jefe_id:""});
    await cargarTodo();
    // Intentar crear carpetas Drive automáticamente
    if (obraCreada?.id) {
      try {
        const tk2=await getToken();
        await fetch(`${EDGE_URL}/crear-carpetas-drive`,{method:"POST",headers:{Authorization:`Bearer ${tk2}`,"Content-Type":"application/json"},body:JSON.stringify({obra_id:obraCreada.id,obra_nombre:obraCreada.nombre,obra_codigo:obraCreada.codigo})});
        setMsg("✓ Obra creada y carpetas Drive generadas");
      } catch(e) { setMsg("✓ Obra creada (Drive no configurado)"); }
    }
    setTimeout(()=>setMsg(""),4000);
    setSaving(false);
  }

  async function cambiarJefe(obraId,jefeId) {
    const tk=await getToken();
    await fetch(`${SUPA_URL}/obras_campo?id=eq.${obraId}`,{method:"PATCH",headers:hdrs(tk),body:JSON.stringify({jefe_id:jefeId||null})});
    setObras(prev=>prev.map(o=>o.id===obraId?{...o,jefe_id:jefeId}:o));
  }

  if (obraDetalle) {
    return <DetalleObra obra={obraDetalle} jefesList={jefesList} onVolver={()=>{ setObraDetalle(null); cargarTodo(); }}/>;
  }

  return (
    <div style={{fontFamily:"system-ui, -apple-system, sans-serif",padding:"20px",maxWidth:1100,margin:"0 auto"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20,flexWrap:"wrap",gap:12}}>
        <h1 style={{margin:0,fontSize:22,fontWeight:700}}>🏗️ Obras</h1>
        <button onClick={()=>setShowModal(true)} style={shared.btn}>+ Nueva obra</button>
      </div>

      {msg&&<div style={{background:"#d4edda",color:"#155724",borderRadius:8,padding:"8px 12px",marginBottom:14,fontSize:13}}>{msg}</div>}

      {loading?<p style={{color:"#aaa"}}>Cargando…</p>:(
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          {obras.map(o=>{
            const jefe=jefesList.find(j=>j.id===o.jefe_id);
            const pct=avancesObra[o.id]||0;
            const ec={activa:"#22c55e",pausada:"#f59e0b",finalizada:"#888"}[o.estado]||"#888";
            return (
              <div key={o.id} style={{...shared.card,display:"flex",gap:14,alignItems:"flex-start",flexWrap:"wrap",cursor:"pointer"}} onClick={()=>setObraDetalle(o)}>
                <div style={{flex:1,minWidth:200}}>
                  <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:3,flexWrap:"wrap"}}>
                    {o.codigo&&<span style={{fontSize:11,fontWeight:700,color:"#aaa"}}>{o.codigo}</span>}
                    <span style={{fontSize:12,background:ec+"22",color:ec,borderRadius:6,padding:"2px 8px",fontWeight:600}}>{o.estado}</span>
                    {o.drive_folder_id&&<span style={{fontSize:10,color:"#1a73e8",background:"#e8f0fe",borderRadius:6,padding:"2px 6px"}}>📂 Drive</span>}
                  </div>
                  <div style={{fontWeight:700,fontSize:16,marginBottom:2}}>{o.nombre}</div>
                  <div style={{fontSize:12,color:"#888"}}>{o.sistema_constructivo} · {ALCANCES.find(a=>a.v===o.alcance)?.label||o.alcance}</div>
                  <div style={{marginTop:8}}>
                    <div style={{display:"flex",justifyContent:"space-between",fontSize:11,color:"#aaa",marginBottom:3}}>
                      <span>Avance</span><span style={{fontWeight:700,color:"#111"}}>{pct}%</span>
                    </div>
                    <div style={{height:5,background:"#f0f0f0",borderRadius:3,overflow:"hidden"}}>
                      <div style={{height:"100%",width:`${pct}%`,background:pct===100?"#22c55e":"#6366f1"}}/>
                    </div>
                  </div>
                </div>
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
          {obras.length===0&&<p style={{color:"#aaa",textAlign:"center",padding:40}}>Sin obras todavía.</p>}
        </div>
      )}

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
              <div style={{flex:1}}><span style={shared.lbl}>Inicio</span><input type="date" value={nuevaObra.fecha_inicio_plan} onChange={e=>setNuevaObra(p=>({...p,fecha_inicio_plan:e.target.value}))} style={shared.inp}/></div>
              <div style={{flex:1}}><span style={shared.lbl}>Fin</span><input type="date" value={nuevaObra.fecha_fin_plan} onChange={e=>setNuevaObra(p=>({...p,fecha_fin_plan:e.target.value}))} style={shared.inp}/></div>
            </div>
            <div style={{marginBottom:16}}>
              <span style={shared.lbl}>Responsable</span>
              <select value={nuevaObra.jefe_id} onChange={e=>setNuevaObra(p=>({...p,jefe_id:e.target.value}))} style={shared.inp}>
                <option value="">Sin asignar</option>
                {jefesList.map(j=><option key={j.id} value={j.id}>{j.nombre}</option>)}
              </select>
            </div>
            <div style={{background:"#f0f4ff",borderRadius:10,padding:12,marginBottom:16,fontSize:12,color:"#3730a3"}}>
              📂 Al crear la obra se generarán automáticamente las 6 carpetas en Google Drive.
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
   VISTA JEFE — MOBILE
════════════════════════════════════════════ */
function VistaJefe({ perfil, onLogout }) {
  const [obra,setObra]=useState(null);
  const [tareas,setTareas]=useState([]);
  const [parte,setParte]=useState(null);
  const [eventos,setEventos]=useState([]);
  const [avances,setAvances]=useState({});
  const [loading,setLoading]=useState(true);
  const [saving,setSaving]=useState(false);
  const [msg,setMsg]=useState("");
  const [tab,setTab]=useState("tareas");
  const [showEvt,setShowEvt]=useState(false);
  const [nuevoEvt,setNuevoEvt]=useState({tipo:"remito",descripcion:"",proveedor:"",numero_remito:"",conforme:true,dias_perdidos:""});
  const hoy=new Date().toISOString().slice(0,10);

  const cargar=useCallback(async()=>{
    setLoading(true);
    try{
      const tk=await getToken();
      const obras=await fetch(`${SUPA_URL}/obras_campo?jefe_id=eq.${perfil.id}&estado=eq.activa&select=*`,{headers:hdrs(tk)}).then(r=>r.json());
      const o=obras[0];if(!o){setLoading(false);return;}
      setObra(o);
      const[tArr,pArr]=await Promise.all([
        fetch(`${SUPA_URL}/tareas_obra?obra_id=eq.${o.id}&order=orden.asc`,{headers:hdrs(tk)}).then(r=>r.json()),
        fetch(`${SUPA_URL}/partes_diarios?obra_id=eq.${o.id}&fecha=eq.${hoy}&select=*`,{headers:hdrs(tk)}).then(r=>r.json()),
      ]);
      const tFinal=Array.isArray(tArr)?tArr:[];
      setTareas(tFinal);
      const p=pArr[0]||null;setParte(p);
      if(p){const evArr=await fetch(`${SUPA_URL}/eventos_parte?parte_id=eq.${p.id}&order=created_at.asc`,{headers:hdrs(tk)}).then(r=>r.json());setEventos(Array.isArray(evArr)?evArr:[]);}
      if(tFinal.length>0){
        const ids=tFinal.map(t=>t.id).join(",");
        const avArr=await fetch(`${SUPA_URL}/avances_tarea?tarea_id=in.(${ids})&order=created_at.desc`,{headers:hdrs(tk)}).then(r=>r.json());
        const avMap={};(Array.isArray(avArr)?avArr:[]).forEach(a=>{if(!avMap[a.tarea_id])avMap[a.tarea_id]=a;});
        setAvances(avMap);
      }
    }catch(e){console.error(e);}
    setLoading(false);
  },[perfil,hoy]);

  useEffect(()=>{cargar();},[cargar]);

  async function asegurarParte(){
    const tk=await getToken();
    if(parte)return{parte,tk};
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

  async function guardarAvance(tareaId,pct){
    const{parte:p,tk}=await asegurarParte();
    const existing=avances[tareaId];
    let avanceId;
    if(existing){await fetch(`${SUPA_URL}/avances_tarea?id=eq.${existing.id}`,{method:"PATCH",headers:hdrs(tk),body:JSON.stringify({porcentaje:pct})});avanceId=existing.id;}
    else{const r=await fetch(`${SUPA_URL}/avances_tarea`,{method:"POST",headers:hdrs(tk),body:JSON.stringify({parte_id:p.id,tarea_id:tareaId,porcentaje:pct})});const rows=await r.json();avanceId=rows[0].id;}
    setAvances(prev=>({...prev,[tareaId]:{...prev[tareaId],id:avanceId,porcentaje:pct}}));
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

  if(loading)return<div style={{display:"flex",alignItems:"center",justifyContent:"center",minHeight:"100vh",color:"#888",fontFamily:"system-ui"}}>Cargando obra…</div>;
  if(!obra)return<div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",minHeight:"100vh",fontFamily:"system-ui",gap:16}}><p style={{color:"#888"}}>No tenés obra activa asignada.</p><button onClick={onLogout} style={shared.btn}>Salir</button></div>;

  const avanceGeneral=tareas.length>0?Math.round(tareas.reduce((s,t)=>s+(avances[t.id]?.porcentaje||0),0)/tareas.length):0;
  const porEtapa={};tareas.forEach(t=>{const e=t.etapa||"Sin etapa";if(!porEtapa[e])porEtapa[e]=[];porEtapa[e].push(t);});

  return(
    <div style={{fontFamily:"system-ui, -apple-system, sans-serif",minHeight:"100vh",background:"#f5f5f7",paddingBottom:32}}>
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
          <div style={{display:"flex",justifyContent:"space-between",fontSize:12,color:"#aaa",marginBottom:4}}><span>Avance general</span><span style={{fontWeight:700,color:"#fff",fontSize:14}}>{avanceGeneral}%</span></div>
          <div style={{height:6,background:"#333",borderRadius:3,overflow:"hidden"}}><div style={{height:"100%",width:`${avanceGeneral}%`,background:"#22c55e",transition:"width .5s"}}/></div>
        </div>
        <div style={{marginTop:5,fontSize:11,color:"#666"}}>{new Date(hoy+"T12:00:00").toLocaleDateString("es-AR",{weekday:"long",day:"numeric",month:"long"})}</div>
      </div>

      <div style={{display:"flex",background:"#fff",borderBottom:"1px solid #eee",position:"sticky",top:107,zIndex:9}}>
        {[["tareas","📋 Tareas"],["parte","📝 Parte"],["eventos","📦 Eventos"]].map(([id,label])=>(
          <button key={id} onClick={()=>setTab(id)} style={{flex:1,padding:"13px 4px",fontSize:13,fontWeight:tab===id?700:400,background:"none",border:"none",cursor:"pointer",color:tab===id?"#111":"#aaa",borderBottom:tab===id?"2px solid #111":"2px solid transparent"}}>{label}</button>
        ))}
      </div>

      {msg&&<div style={{background:"#d4edda",color:"#155724",padding:"8px 16px",textAlign:"center",fontSize:13}}>{msg}</div>}
      {saving&&<div style={{background:"#fff3cd",color:"#856404",padding:"5px 16px",textAlign:"center",fontSize:12}}>Guardando…</div>}

      {tab==="tareas"&&(
        <div style={{padding:"12px 16px"}}>
          {Object.entries(porEtapa).map(([etapa,tArr])=>{
            const color=ETAPA_COLOR[etapa]||"#888";
            const pctE=Math.round(tArr.reduce((s,t)=>s+(avances[t.id]?.porcentaje||0),0)/tArr.length);
            return(
              <div key={etapa} style={{marginBottom:20}}>
                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}><div style={{width:10,height:10,borderRadius:"50%",background:color}}/><span style={{fontWeight:700,fontSize:13,flex:1}}>{etapa}</span><span style={{fontSize:13,fontWeight:700,color}}>{pctE}%</span></div>
                {tArr.map(t=>{
                  const pct=avances[t.id]?.porcentaje||0;
                  return(
                    <div key={t.id} style={{...shared.card,marginBottom:8,borderLeft:`4px solid ${color}`}}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:6}}><span style={{fontWeight:600,fontSize:14}}>{t.nombre}</span><span style={{fontWeight:800,fontSize:18}}>{pct}%</span></div>
                      <div style={{height:5,background:"#f0f0f0",borderRadius:3,overflow:"hidden",marginBottom:8}}><div style={{height:"100%",width:`${pct}%`,background:pct===100?"#22c55e":color}}/></div>
                      <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
                        {[0,10,25,50,75,90,100].map(p=>(
                          <button key={p} onClick={()=>guardarAvance(t.id,p)} style={{...shared.btnSm,minWidth:42,minHeight:38,fontWeight:700,fontSize:13,background:pct===p?color:"#f0f0f0",color:pct===p?"#fff":"#333"}}>{p}%</button>
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

      {tab==="parte"&&(
        <div style={{padding:"12px 16px"}}>
          <div style={{...shared.card,marginBottom:12}}>
            <span style={shared.lbl}>Clima del día</span>
            <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>{CLIMAS.map(c=><button key={c.v} onClick={()=>guardarParte("clima",c.v)} style={{...shared.btnSm,minHeight:40,background:parte?.clima===c.v?"#111":"#f0f0f0",color:parte?.clima===c.v?"#fff":"#333"}}>{c.label}</button>)}</div>
          </div>
          <div style={{...shared.card,marginBottom:12}}>
            <span style={shared.lbl}>Personal y horas</span>
            <div style={{display:"flex",gap:12}}>
              <div style={{flex:1}}><label style={{fontSize:12,color:"#888",display:"block",marginBottom:4}}>Personas</label><input type="number" inputMode="numeric" min="0" defaultValue={parte?.personal_cantidad||""} onBlur={e=>guardarParte("personal_cantidad",parseInt(e.target.value)||null)} style={shared.inp} placeholder="0"/></div>
              <div style={{flex:1}}><label style={{fontSize:12,color:"#888",display:"block",marginBottom:4}}>Horas</label><input type="number" inputMode="decimal" min="0" step="0.5" defaultValue={parte?.horas_trabajadas||""} onBlur={e=>guardarParte("horas_trabajadas",parseFloat(e.target.value)||null)} style={shared.inp} placeholder="0"/></div>
            </div>
          </div>
          <div style={{...shared.card}}><span style={shared.lbl}>Observaciones</span><textarea defaultValue={parte?.observaciones||""} onBlur={e=>guardarParte("observaciones",e.target.value)} placeholder="Novedades del día…" rows={5} style={{...shared.inp,resize:"vertical",lineHeight:1.6}}/></div>
        </div>
      )}

      {tab==="eventos"&&(
        <div style={{padding:"12px 16px"}}>
          <button onClick={()=>setShowEvt(!showEvt)} style={{...shared.btn,width:"100%",marginBottom:12}}>{showEvt?"Cancelar":"+ Agregar evento"}</button>
          {showEvt&&(
            <div style={{...shared.card,marginBottom:12,background:"#f8f8f8"}}>
              <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:12}}>{TIPOS_EVENTO.map(t=><button key={t.v} onClick={()=>setNuevoEvt(p=>({...p,tipo:t.v}))} style={{...shared.btnSm,minHeight:40,background:nuevoEvt.tipo===t.v?"#111":"#fff",color:nuevoEvt.tipo===t.v?"#fff":"#333",border:"1px solid #ddd"}}>{t.label}</button>)}</div>
              {nuevoEvt.tipo==="remito"&&<><input placeholder="Proveedor" value={nuevoEvt.proveedor} onChange={e=>setNuevoEvt(p=>({...p,proveedor:e.target.value}))} style={{...shared.inp,marginBottom:10}}/><input placeholder="N° Remito" value={nuevoEvt.numero_remito} onChange={e=>setNuevoEvt(p=>({...p,numero_remito:e.target.value}))} style={{...shared.inp,marginBottom:10}}/><div style={{display:"flex",gap:10,marginBottom:10,alignItems:"center"}}><span>Conforme:</span><button onClick={()=>setNuevoEvt(p=>({...p,conforme:true}))} style={{...shared.btnSm,minHeight:40,background:nuevoEvt.conforme?"#111":"#f0f0f0",color:nuevoEvt.conforme?"#fff":"#333"}}>✓ Sí</button><button onClick={()=>setNuevoEvt(p=>({...p,conforme:false}))} style={{...shared.btnSm,minHeight:40,background:nuevoEvt.conforme===false?"#e53":"#f0f0f0",color:nuevoEvt.conforme===false?"#fff":"#333"}}>✗ No</button></div></>}
              {nuevoEvt.tipo==="paralizacion"&&<input type="number" inputMode="decimal" step="0.5" placeholder="Días perdidos" value={nuevoEvt.dias_perdidos} onChange={e=>setNuevoEvt(p=>({...p,dias_perdidos:e.target.value}))} style={{...shared.inp,marginBottom:10}}/>}
              <textarea placeholder="Descripción" value={nuevoEvt.descripcion} onChange={e=>setNuevoEvt(p=>({...p,descripcion:e.target.value}))} rows={3} style={{...shared.inp,resize:"vertical",marginBottom:12}}/>
              <button onClick={agregarEvento} style={{...shared.btn,width:"100%"}}>Guardar evento</button>
            </div>
          )}
          {eventos.length===0&&!showEvt&&<div style={{textAlign:"center",color:"#aaa",fontSize:14,padding:"32px 0"}}>Sin eventos hoy</div>}
          {eventos.map(ev=>(
            <div key={ev.id} style={{...shared.card,marginBottom:10,borderLeft:"4px solid #111"}}>
              <div style={{fontWeight:600,fontSize:14}}>{TIPOS_EVENTO.find(t=>t.v===ev.tipo)?.label||ev.tipo}</div>
              {ev.proveedor&&<div style={{fontSize:13,color:"#666",marginTop:4}}>Prov: {ev.proveedor} · {ev.numero_remito} · {ev.conforme?"✓":"✗"}</div>}
              {ev.dias_perdidos&&<div style={{fontSize:13,color:"#e53",marginTop:4}}>⏸ {ev.dias_perdidos} días</div>}
              {ev.descripcion&&<div style={{fontSize:14,marginTop:6}}>{ev.descripcion}</div>}
            </div>
          ))}
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
