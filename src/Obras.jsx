import React, { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "./supabase.js";
import Combobox from "./Combobox.jsx";

const SUPA_URL = "https://imkmosifqxzbtqgzssst.supabase.co/rest/v1";
const ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlta21vc2lmcXh6YnRxZ3pzc3N0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkxODk4NTUsImV4cCI6MjA5NDc2NTg1NX0.5gtCs8Yv3vDSrKxAmXSr3zjWJ5HjimCKejfO-XrHPss";
const EDGE_URL = "https://imkmosifqxzbtqgzssst.supabase.co/functions/v1";

async function getToken() {
  const { data:{ session } } = await supabase.auth.getSession();
  return session?.access_token || ANON_KEY;
}
function hdrs(tk) {
  return { apikey:ANON_KEY, Authorization:`Bearer ${tk}`, "Content-Type":"application/json", Prefer:"return=representation" };
}

const SISTEMAS = ["Steel Frame","Wood Frame","Ladrillo","Hormigón Armado","SIP Panel","Metálico","Prefab","Mixto"];
const ALCANCES = [
  {v:"fundacion",label:"Fundación"},{v:"steel_frame_obra_gris",label:"Steel Frame Obra Gris"},
  {v:"fundacion_steel_frame",label:"Fundación + Steel Frame"},{v:"estructura",label:"Estructura"},
  {v:"obra_completa",label:"Obra completa"},{v:"llave_en_mano",label:"Llave en mano"},
];
const CARPETAS_DEF = [
  {num:1,nombre:"Contrato y Presupuesto",icon:"📄",driveKey:"drive_carpeta_1",subs:["01-Interno","02-Con cliente"]},
  {num:2,nombre:"Proyecto Ejecutivo",icon:"📐",driveKey:"drive_carpeta_2",subs:["00-Estudio de suelos","01-Arquitectura","02-Ingeniería"]},
  {num:3,nombre:"Cómputo y Presupuesto",icon:"📊",driveKey:"drive_carpeta_3",subs:["00-Cómputo","01-Presupuestos proveedores","02-Mano de obra"]},
  {num:4,nombre:"Plan de trabajo y Gantt",icon:"📅",driveKey:"drive_carpeta_4",subs:[]},
  {num:5,nombre:"Inspecciones y Checklist",icon:"✅",driveKey:"drive_carpeta_5",subs:[]},
  {num:6,nombre:"Fotos y Videos",icon:"📷",driveKey:"drive_carpeta_6",subs:[]},
];
const ETAPA_COLOR = {
  "Arranque":"#6366f1","Estructura":"#f59e0b","Exterior":"#3b82f6","Cubierta":"#8b5cf6",
  "Interior":"#10b981","Terminaciones":"#ec4899","Instalaciones":"#14b8a6","Sin etapa":"#888",
};
const CLIMAS = [{v:"bueno",label:"☀️ Bueno"},{v:"nublado",label:"⛅ Nublado"},{v:"lluvia",label:"🌧️ Lluvia"},{v:"viento",label:"💨 Viento"},{v:"helada",label:"🧊 Helada"}];
const TIPOS_EVENTO = [{v:"remito",label:"📦 Remito"},{v:"paralizacion",label:"⏸️ Paralización"},{v:"visita",label:"👁️ Visita"},{v:"incidente",label:"⚠️ Incidente"},{v:"otro",label:"📝 Otro"}];
const shared = {
  btn:   {padding:"10px 18px",background:"#111",color:"#fff",border:"none",borderRadius:10,fontSize:14,fontWeight:600,cursor:"pointer"},
  btnSm: {padding:"7px 12px",background:"#f0f0f0",color:"#333",border:"none",borderRadius:8,fontSize:13,cursor:"pointer"},
  inp:   {width:"100%",padding:"10px 12px",border:"1px solid #e0e0e0",borderRadius:10,fontSize:14,boxSizing:"border-box"},
  card:  {background:"#fff",borderRadius:14,padding:16,boxShadow:"0 1px 6px rgba(0,0,0,.07)"},
  lbl:   {fontSize:11,color:"#888",fontWeight:600,textTransform:"uppercase",letterSpacing:.5,marginBottom:5,display:"block"},
};

/* ════════════════ CARD AVANCE ════════════════ */
function CardAvanceObra({ avance }) {
  if (!avance) return null;
  const { avance_real_pct=0, avance_teorico_pct, desvio_pct, semaforo,
    tareas_completadas=0, total_tareas=0, tareas_atrasadas=0, tareas_en_riesgo=0,
    checklist_completados=0, total_checklist=0 } = avance;
  const sColor = {verde:"#22c55e",amarillo:"#f59e0b",rojo:"#ef4444"}[semaforo]||"#888";
  const sLabel = {verde:"✅ En tiempo",amarillo:"⚠️ Leve desvío",rojo:"🔴 Atrasada"}[semaforo]||"Sin datos";
  return (
    <div style={{...shared.card,marginBottom:16,borderLeft:`4px solid ${sColor}`}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
        <div style={{fontWeight:700,fontSize:15}}>Estado de la obra</div>
        <div style={{background:sColor+"22",color:sColor,borderRadius:20,padding:"4px 12px",fontSize:12,fontWeight:700}}>{sLabel}</div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginBottom:12}}>
        {[
          {label:"Avance real",value:`${avance_real_pct}%`,color:sColor,sub:"ponderado por días"},
          {label:"Avance teórico",value:avance_teorico_pct!=null?`${avance_teorico_pct}%`:"—",color:"#6366f1",sub:"% tiempo transcurrido"},
          {label:"Desvío",value:desvio_pct!=null?(desvio_pct>=0?`+${desvio_pct}%`:`${desvio_pct}%`):"—",color:desvio_pct>=0?"#22c55e":"#ef4444",sub:"real vs teórico"},
        ].map(k=>(
          <div key={k.label} style={{background:"#f8f8f8",borderRadius:10,padding:"12px 8px",textAlign:"center"}}>
            <div style={{fontSize:22,fontWeight:800,color:k.color}}>{k.value}</div>
            <div style={{fontSize:11,fontWeight:600,color:"#555",marginTop:2}}>{k.label}</div>
            <div style={{fontSize:10,color:"#aaa",marginTop:1}}>{k.sub}</div>
          </div>
        ))}
      </div>
      {avance_teorico_pct!=null&&(
        <div style={{marginBottom:12}}>
          <div style={{display:"flex",justifyContent:"space-between",fontSize:11,color:"#888",marginBottom:3}}><span>Avance real</span><span style={{fontWeight:700,color:sColor}}>{avance_real_pct}%</span></div>
          <div style={{height:7,background:"#f0f0f0",borderRadius:4,overflow:"hidden",marginBottom:6}}><div style={{height:"100%",width:`${avance_real_pct}%`,background:sColor,transition:"width .5s"}}/></div>
          <div style={{display:"flex",justifyContent:"space-between",fontSize:11,color:"#888",marginBottom:3}}><span>Avance teórico</span><span style={{fontWeight:700,color:"#6366f1"}}>{avance_teorico_pct}%</span></div>
          <div style={{height:7,background:"#f0f0f0",borderRadius:4,overflow:"hidden"}}><div style={{height:"100%",width:`${avance_teorico_pct}%`,background:"#6366f1",transition:"width .5s"}}/></div>
        </div>
      )}
      <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
        <span style={{fontSize:11,background:"#f0f0f0",borderRadius:6,padding:"3px 8px"}}>✅ {tareas_completadas}/{total_tareas} tareas</span>
        {total_checklist>0&&<span style={{fontSize:11,background:"#f0f0f0",borderRadius:6,padding:"3px 8px"}}>🔍 {checklist_completados}/{total_checklist} checklist</span>}
        {tareas_atrasadas>0&&<span style={{fontSize:11,background:"#fef2f2",color:"#ef4444",borderRadius:6,padding:"3px 8px",fontWeight:700}}>⏰ {tareas_atrasadas} atrasadas</span>}
        {tareas_en_riesgo>0&&<span style={{fontSize:11,background:"#fffbeb",color:"#f59e0b",borderRadius:6,padding:"3px 8px",fontWeight:700}}>⚠️ {tareas_en_riesgo} en riesgo</span>}
      </div>
    </div>
  );
}

/* ════════════════ CHECKLIST ════════════════ */
function ChecklistConsolidado({ obra, onClose }) {
  const [items,setItems]=useState([]);const [loading,setLoading]=useState(true);const [saving,setSaving]=useState(null);const [msg,setMsg]=useState("");
  useEffect(()=>{cargar();},[obra.id]);
  async function cargar(){
    setLoading(true);const tk=await getToken();
    const arr=await fetch(`${SUPA_URL}/vista_gantt?obra_id=eq.${obra.id}&es_checklist=eq.true&order=checklist_rubro.asc,orden.asc`,{headers:hdrs(tk)}).then(r=>r.json());
    setItems(Array.isArray(arr)?arr:[]);setLoading(false);
  }
  async function toggleItem(t){
    setSaving(t.id);const tk=await getToken();const v=!t.completada;
    await fetch(`${SUPA_URL}/tareas_obra?id=eq.${t.id}`,{method:"PATCH",headers:hdrs(tk),body:JSON.stringify({completada:v,porcentaje_avance:v?100:t.porcentaje_avance,fecha_fin_real:v?new Date().toISOString().slice(0,10):null})});
    setItems(prev=>prev.map(i=>i.id===t.id?{...i,completada:v,porcentaje_avance:v?100:i.porcentaje_avance}:i));
    setMsg(v?"✓ Completado":"Reabierto");setTimeout(()=>setMsg(""),1500);setSaving(null);
  }
  const porRubro={};items.forEach(i=>{const r=i.checklist_rubro||i.etapa||"General";if(!porRubro[r])porRubro[r]=[];porRubro[r].push(i);});
  const totalOk=items.filter(i=>i.completada).length;const pct=items.length?Math.round((totalOk/items.length)*100):0;
  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.6)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:200,padding:16}}>
      <div style={{background:"#fff",borderRadius:16,width:"100%",maxWidth:600,maxHeight:"90vh",overflowY:"auto",display:"flex",flexDirection:"column"}}>
        <div style={{padding:"16px 20px 12px",borderBottom:"1px solid #f0f0f0",position:"sticky",top:0,background:"#fff",zIndex:1}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div><div style={{fontWeight:700,fontSize:17}}>✅ Inspecciones y Checklist</div><div style={{fontSize:12,color:"#888",marginTop:2}}>{totalOk}/{items.length} · {pct}%</div></div>
            <button onClick={onClose} style={{...shared.btnSm,padding:"6px 10px"}}>✕</button>
          </div>
          <div style={{height:6,background:"#f0f0f0",borderRadius:3,overflow:"hidden",marginTop:10}}><div style={{height:"100%",width:`${pct}%`,background:"#22c55e",transition:"width .5s"}}/></div>
        </div>
        {msg&&<div style={{background:"#d4edda",color:"#155724",padding:"6px 16px",fontSize:13}}>{msg}</div>}
        <div style={{padding:"14px 20px",flex:1}}>
          {loading?<p style={{color:"#aaa",textAlign:"center"}}>Cargando…</p>
          :items.length===0?<div style={{textAlign:"center",padding:"40px 20px"}}><p style={{color:"#aaa",marginBottom:8}}>No hay ítems de checklist.</p><p style={{fontSize:12,color:"#bbb"}}>Marcá tareas como "Checklist" en el Plan de trabajo.</p></div>
          :Object.entries(porRubro).map(([rubro,arr])=>{
            const ok=arr.filter(i=>i.completada).length;const color=ETAPA_COLOR[rubro]||"#6366f1";
            return(
              <div key={rubro} style={{marginBottom:20}}>
                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8,padding:"6px 10px",background:color+"12",borderRadius:8}}>
                  <div style={{width:8,height:8,borderRadius:"50%",background:color,flexShrink:0}}/>
                  <span style={{fontWeight:700,fontSize:13,flex:1}}>{rubro}</span>
                  <span style={{fontSize:11,color,fontWeight:700}}>{ok}/{arr.length}</span>
                </div>
                {arr.map(item=>(
                  <div key={item.id} onClick={()=>toggleItem(item)} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 12px",marginBottom:6,background:item.completada?"#f0fdf4":"#fff",borderRadius:10,border:`1px solid ${item.completada?"#bbf7d0":"#e0e0e0"}`,cursor:"pointer",opacity:saving===item.id?0.6:1}}>
                    <div style={{width:22,height:22,borderRadius:6,border:`2px solid ${item.completada?"#22c55e":"#ddd"}`,background:item.completada?"#22c55e":"#fff",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                      {item.completada&&<span style={{color:"#fff",fontSize:13,fontWeight:900}}>✓</span>}
                    </div>
                    <div style={{flex:1}}>
                      <div style={{display:"flex",alignItems:"center",gap:6}}>
                        {item.codigo&&<span style={{fontSize:10,fontWeight:700,color:"#aaa",background:"#f0f0f0",borderRadius:4,padding:"1px 5px"}}>{item.codigo}</span>}
                        <span style={{fontSize:13,fontWeight:600,color:item.completada?"#16a34a":"#111",textDecoration:item.completada?"line-through":"none"}}>{item.nombre}</span>
                      </div>
                      {item.fecha_fin_real&&<div style={{fontSize:10,color:"#aaa",marginTop:2}}>Completado: {new Date(item.fecha_fin_real+"T12:00").toLocaleDateString("es-AR")}</div>}
                    </div>
                    {item.estado_alerta==="atrasada"&&!item.completada&&<span style={{fontSize:10,color:"#ef4444",fontWeight:700,background:"#fef2f2",borderRadius:4,padding:"2px 6px"}}>ATRASADA</span>}
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
/* ════════════════ GANTT SVG ════════════════ */
function GanttObra({ obra, onClose }) {
  const [tareas,setTareas]=useState([]);const [deps,setDeps]=useState([]);const [loading,setLoading]=useState(true);
  const [panelTarea,setPanelTarea]=useState(null);const [showAdd,setShowAdd]=useState(false);
  const [msg,setMsg]=useState("");const [zoom,setZoom]=useState("semana");
  const [isMobile,setIsMobile]=useState(window.innerWidth<768);
  useEffect(()=>{const r=()=>setIsMobile(window.innerWidth<768);window.addEventListener("resize",r);return()=>window.removeEventListener("resize",r);},[]);
  useEffect(()=>{cargar();},[obra.id]);

  async function cargar(){
    setLoading(true);const tk=await getToken();
    const[tArr,dArr]=await Promise.all([
      fetch(`${SUPA_URL}/vista_gantt?obra_id=eq.${obra.id}&order=orden.asc`,{headers:hdrs(tk)}).then(r=>r.json()),
      fetch(`${SUPA_URL}/tarea_dependencias?select=tarea_id,depende_de_id,tipo,lag_dias`,{headers:hdrs(tk)}).then(r=>r.json()),
    ]);
    setTareas(Array.isArray(tArr)?tArr:[]);setDeps(Array.isArray(dArr)?dArr:[]);setLoading(false);
  }

  async function guardarTarea(id,campos){
    const tk=await getToken();
    await fetch(`${SUPA_URL}/tareas_obra?id=eq.${id}`,{method:"PATCH",headers:hdrs(tk),body:JSON.stringify(campos)});
    await cargar();setMsg("✓ Guardado");setTimeout(()=>setMsg(""),1500);
  }

  const hoy=new Date();
  const todasF=tareas.flatMap(t=>[t.fecha_inicio_plan,t.fecha_fin_plan].filter(Boolean).map(f=>new Date(f+"T12:00")));
  let minF=obra.fecha_inicio_plan?new Date(obra.fecha_inicio_plan+"T12:00"):(todasF.length?new Date(Math.min(...todasF)):new Date(hoy.getTime()-7*86400000));
  let maxF=obra.fecha_fin_plan?new Date(obra.fecha_fin_plan+"T12:00"):(todasF.length?new Date(Math.max(...todasF)):new Date(hoy.getTime()+90*86400000));
  minF.setDate(minF.getDate()-7);maxF.setDate(maxF.getDate()+14);
  const totalDias=Math.ceil((maxF-minF)/86400000);
  const pxD=isMobile?(zoom==="semana"?18:8):(zoom==="semana"?28:12);
  const anchoTL=Math.max(totalDias*pxD,600);
  const anchoGrid=isMobile?140:220;const altFila=isMobile?30:36;const altEtapa=isMobile?26:32;

  function xF(f){if(!f)return -999;return Math.ceil((new Date(f+"T12:00")-minF)/86400000)*pxD;}
  function wF(ini,fin){if(!ini||!fin)return 0;return Math.max(6,Math.ceil((new Date(fin+"T12:00")-new Date(ini+"T12:00"))/86400000)*pxD);}

  const marcas=[];const cur=new Date(minF);
  if(zoom==="semana"){while(cur.getDay()!==1)cur.setDate(cur.getDate()+1);while(cur<maxF){marcas.push({x:xF(cur.toISOString().slice(0,10)),label:`${cur.getDate()}/${cur.getMonth()+1}`});cur.setDate(cur.getDate()+7);}}
  else{cur.setDate(1);while(cur<maxF){marcas.push({x:xF(cur.toISOString().slice(0,10)),label:cur.toLocaleDateString("es-AR",{month:"short"})});cur.setMonth(cur.getMonth()+1);}}
  const xHoy=xF(hoy.toISOString().slice(0,10));

  const porEtapa={};tareas.forEach(t=>{const e=t.etapa||"Sin etapa";if(!porEtapa[e])porEtapa[e]=[];porEtapa[e].push(t);});
  const filas=[];let y=0;
  Object.entries(porEtapa).forEach(([etapa,tArr])=>{
    filas.push({tipo:"etapa",etapa,tareas:tArr,y,h:altEtapa});y+=altEtapa+4;
    tArr.forEach(t=>{filas.push({tipo:"tarea",tarea:t,y,h:altFila});y+=altFila+4;});y+=6;
  });
  const altTotal=Math.max(y,300);

  const totalTeo=tareas.reduce((s,t)=>s+(t.dias_teoricos||0),0);
  const totalReal=tareas.reduce((s,t)=>s+(parseFloat(t.dias_reales)||0),0);
  const avancePond=totalTeo>0?Math.round(tareas.reduce((s,t)=>s+(t.porcentaje_avance||0)*Math.max(t.dias_teoricos||1,1),0)/totalTeo):Math.round(tareas.reduce((s,t)=>s+(t.porcentaje_avance||0),0)/Math.max(tareas.length,1));
  const completadas=tareas.filter(t=>t.completada).length;
  const atrasadas=tareas.filter(t=>t.estado_alerta==="atrasada").length;

  if(loading)return<div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"100vh",fontFamily:"system-ui",color:"#aaa"}}>Cargando Gantt…</div>;

  return(
    <div style={{fontFamily:"system-ui,-apple-system,sans-serif",height:"100vh",display:"flex",flexDirection:"column",background:"#f8f9fa"}}>
      {/* Header */}
      <div style={{background:"#111",color:"#fff",padding:isMobile?"10px 12px":"12px 20px",flexShrink:0}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:8,flexWrap:"wrap"}}>
          <div style={{minWidth:0}}>
            <div style={{fontWeight:700,fontSize:isMobile?13:15,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>📅 {obra.nombre}</div>
            {obra.fecha_inicio_plan&&obra.fecha_fin_plan&&<div style={{fontSize:10,color:"#666",marginTop:1}}>{new Date(obra.fecha_inicio_plan+"T12:00").toLocaleDateString("es-AR")} → {new Date(obra.fecha_fin_plan+"T12:00").toLocaleDateString("es-AR")}</div>}
          </div>
          <div style={{display:"flex",gap:6,flexShrink:0,flexWrap:"wrap"}}>
            {!isMobile&&<button onClick={()=>setZoom(z=>z==="semana"?"mes":"semana")} style={{...shared.btnSm,fontSize:11,background:"#333",color:"#aaa"}}>{zoom==="semana"?"→ Mes":"→ Semana"}</button>}
            <button onClick={()=>setShowAdd(true)} style={{...shared.btnSm,fontSize:11,background:"#22c55e",color:"#fff"}}>+ Tarea</button>
            {obra.drive_carpeta_4&&<a href={`https://drive.google.com/drive/folders/${obra.drive_carpeta_4}`} target="_blank" rel="noreferrer" style={{...shared.btnSm,fontSize:11,background:"#1a73e8",color:"#fff",textDecoration:"none"}}>📂</a>}
            <button onClick={onClose} style={{...shared.btnSm,fontSize:11}}>✕</button>
          </div>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:5,marginTop:10}}>
          {[
            {label:"Avance",value:`${avancePond}%`,color:"#22c55e"},
            {label:"Completadas",value:`${completadas}/${tareas.length}`,color:"#6366f1"},
            {label:"Días teo.",value:totalTeo||"—",color:"#f59e0b"},
            {label:"Días real",value:Math.round(totalReal)||"—",color:totalReal>totalTeo&&totalTeo?"#ef4444":"#22c55e"},
            {label:"Atrasadas",value:atrasadas,color:atrasadas>0?"#ef4444":"#666"},
          ].map(k=>(
            <div key={k.label} style={{background:"rgba(255,255,255,.08)",borderRadius:8,padding:"5px 4px",textAlign:"center"}}>
              <div style={{fontSize:isMobile?12:15,fontWeight:800,color:k.color}}>{k.value}</div>
              <div style={{fontSize:8,color:"#666",marginTop:1}}>{k.label}</div>
            </div>
          ))}
        </div>
      </div>

      {msg&&<div style={{background:"#d4edda",color:"#155724",padding:"6px 16px",fontSize:12,flexShrink:0}}>{msg}</div>}

      {tareas.length===0?(
        <div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:12}}>
          <p style={{color:"#aaa",fontSize:14}}>No hay tareas.</p>
          <button onClick={()=>setShowAdd(true)} style={shared.btn}>+ Agregar tarea</button>
        </div>
      ):(
        <div style={{flex:1,display:"flex",overflow:"hidden"}}>
          {/* Grid izquierda */}
          <div style={{width:anchoGrid,flexShrink:0,background:"#fff",borderRight:"2px solid #e8e8e8",display:"flex",flexDirection:"column",overflow:"hidden"}}>
            <div style={{height:40,background:"#f5f5f5",borderBottom:"1px solid #e0e0e0",display:"flex",alignItems:"center",paddingLeft:12,fontSize:10,fontWeight:700,color:"#999",textTransform:"uppercase",flexShrink:0}}>Tarea</div>
            <div style={{flex:1,overflowY:"hidden"}} id="gantt-left">
              <div style={{position:"relative",height:altTotal}}>
                {filas.map((f,i)=>{
                  if(f.tipo==="etapa"){
                    const color=ETAPA_COLOR[f.etapa]||"#888";
                    const pctE=f.tareas.length?Math.round(f.tareas.reduce((s,t)=>s+(t.porcentaje_avance||0)*Math.max(t.dias_teoricos||1,1),0)/Math.max(f.tareas.reduce((s,t)=>s+Math.max(t.dias_teoricos||1,1),0),1)):0;
                    return(<div key={i} style={{position:"absolute",top:f.y,left:0,right:0,height:f.h,display:"flex",alignItems:"center",paddingLeft:10,background:color+"12",borderLeft:`3px solid ${color}`,gap:6}}>
                      <span style={{fontWeight:700,fontSize:isMobile?10:12,color:"#333",flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{f.etapa}</span>
                      <span style={{fontSize:10,fontWeight:700,color,paddingRight:6}}>{pctE}%</span>
                    </div>);
                  }
                  const t=f.tarea;
                  const bgAlert={atrasada:"#fef2f2",en_riesgo:"#fffbeb",ok:"#f0fdf4",normal:"#fff"}[t.estado_alerta]||"#fff";
                  return(<div key={i} onClick={()=>setPanelTarea(t)}
                    style={{position:"absolute",top:f.y,left:0,right:0,height:f.h,display:"flex",alignItems:"center",paddingLeft:isMobile?8:16,cursor:"pointer",borderBottom:"1px solid #f5f5f5",background:t.completada?"#f0fdf4":bgAlert,gap:6}}
                    onMouseEnter={e=>!isMobile&&(e.currentTarget.style.background=t.completada?"#dcfce7":"#f8f8f8")}
                    onMouseLeave={e=>!isMobile&&(e.currentTarget.style.background=t.completada?"#f0fdf4":bgAlert)}>
                    <div style={{width:12,height:12,borderRadius:"50%",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",background:t.completada?"#22c55e":t.estado_alerta==="atrasada"?"#ef4444":t.estado_alerta==="en_riesgo"?"#f59e0b":t.porcentaje_avance>0?"#6366f1":"#e0e0e0"}}>
                      {t.completada&&<span style={{color:"#fff",fontSize:7,fontWeight:900}}>✓</span>}
                    </div>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{display:"flex",alignItems:"center",gap:4,flexWrap:"nowrap"}}>
                        {t.codigo&&<span style={{fontSize:9,fontWeight:700,color:"#aaa",background:"#f0f0f0",borderRadius:3,padding:"0 4px",flexShrink:0}}>{t.codigo}</span>}
                        {t.es_checklist&&<span style={{fontSize:9,flexShrink:0}}>✅</span>}
                        {t.es_critica&&<span style={{fontSize:9,flexShrink:0}}>🔴</span>}
                      </div>
                      <div style={{fontSize:isMobile?10:12,fontWeight:600,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",color:t.completada?"#16a34a":"#111",textDecoration:t.completada?"line-through":"none"}}>{t.nombre}</div>
                      <div style={{fontSize:9,color:"#aaa"}}>{t.porcentaje_avance||0}%{t.dias_teoricos?` · ${t.dias_teoricos}d`:""}</div>
                    </div>
                  </div>);
                })}
              </div>
            </div>
          </div>

          {/* Timeline SVG */}
          <div style={{flex:1,overflow:"auto"}} id="gantt-right"
            onScroll={e=>{const l=document.getElementById("gantt-left");if(l)l.scrollTop=e.target.scrollTop;}}>
            <svg width={anchoTL} height={altTotal+40} style={{display:"block"}}>
              <rect x={0} y={0} width={anchoTL} height={40} fill="#f5f5f5"/>
              <line x1={0} y1={40} x2={anchoTL} y2={40} stroke="#e0e0e0" strokeWidth={1}/>
              {obra.fecha_inicio_plan&&obra.fecha_fin_plan&&<rect x={xF(obra.fecha_inicio_plan)} y={40} width={wF(obra.fecha_inicio_plan,obra.fecha_fin_plan)} height={altTotal} fill="rgba(99,102,241,.03)"/>}
              {marcas.map((m,i)=>(<g key={i}><line x1={m.x} y1={0} x2={m.x} y2={altTotal+40} stroke="#e8e8e8" strokeWidth={1}/><text x={m.x+3} y={26} fontSize={isMobile?8:10} fill="#999" fontFamily="system-ui">{m.label}</text></g>))}
              <line x1={xHoy} y1={0} x2={xHoy} y2={altTotal+40} stroke="#ef4444" strokeWidth={1.5} strokeDasharray="4,3" opacity={0.7}/>
              <rect x={xHoy-14} y={2} width={28} height={14} rx={3} fill="#ef4444"/>
              <text x={xHoy} y={12} fontSize={8} fill="#fff" fontFamily="system-ui" textAnchor="middle" fontWeight="bold">HOY</text>
              {obra.fecha_inicio_plan&&<line x1={xF(obra.fecha_inicio_plan)} y1={0} x2={xF(obra.fecha_inicio_plan)} y2={altTotal+40} stroke="#6366f1" strokeWidth={1} strokeDasharray="6,4" opacity={0.4}/>}
              {obra.fecha_fin_plan&&<line x1={xF(obra.fecha_fin_plan)} y1={0} x2={xF(obra.fecha_fin_plan)} y2={altTotal+40} stroke="#6366f1" strokeWidth={1} strokeDasharray="6,4" opacity={0.4}/>}
              <defs><marker id="arrow" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto"><path d="M0,0 L0,6 L6,3 z" fill="#94a3b8"/></marker></defs>
              {deps.map((d,i)=>{
                const src=tareas.find(t=>t.id===d.depende_de_id);const dst=tareas.find(t=>t.id===d.tarea_id);
                if(!src||!dst||!src.fecha_fin_plan||!dst.fecha_inicio_plan)return null;
                const fS=filas.find(f=>f.tipo==="tarea"&&f.tarea.id===src.id);const fD=filas.find(f=>f.tipo==="tarea"&&f.tarea.id===dst.id);
                if(!fS||!fD)return null;
                const x1=xF(src.fecha_fin_plan)+wF(src.fecha_inicio_plan,src.fecha_fin_plan);const y1=fS.y+fS.h/2+40;
                const x2=xF(dst.fecha_inicio_plan);const y2=fD.y+fD.h/2+40;const mx=(x1+x2)/2;
                return<path key={i} d={`M${x1},${y1} C${mx},${y1} ${mx},${y2} ${x2},${y2}`} fill="none" stroke="#94a3b8" strokeWidth={1.5} strokeDasharray="4,2" markerEnd="url(#arrow)"/>;
              })}
              {filas.map((f,i)=>{
                if(f.tipo==="etapa"){
                  const tArr=f.tareas;
                  const fIni=tArr.map(t=>t.fecha_inicio_plan).filter(Boolean).sort()[0];
                  const fFin=[...tArr.map(t=>t.fecha_fin_plan).filter(Boolean)].sort().pop();
                  if(!fIni||!fFin)return null;
                  const x=xF(fIni);const w=xF(fFin)+wF(fFin,fFin)-x;const color=ETAPA_COLOR[f.etapa]||"#888";
                  const pctE=tArr.length?tArr.reduce((s,t)=>s+(t.porcentaje_avance||0)*Math.max(t.dias_teoricos||1,1),0)/Math.max(tArr.reduce((s,t)=>s+Math.max(t.dias_teoricos||1,1),0),1):0;
                  return(<g key={i}>
                    <rect x={x} y={f.y+40+8} width={w} height={12} rx={3} fill={color} opacity={0.12}/>
                    <rect x={x} y={f.y+40+8} width={Math.max(0,w*(pctE/100))} height={12} rx={3} fill={color} opacity={0.35}/>
                    <polygon points={`${x},${f.y+54} ${x+5},${f.y+48} ${x+10},${f.y+54} ${x+5},${f.y+60}`} fill={color}/>
                    <polygon points={`${x+w-10},${f.y+54} ${x+w-5},${f.y+48} ${x+w},${f.y+54} ${x+w-5},${f.y+60}`} fill={color}/>
                  </g>);
                }
                const t=f.tarea;const color=t.es_critica?"#ef4444":(ETAPA_COLOR[t.etapa]||"#6366f1");
                const pct=t.porcentaje_avance||0;
                const xP=xF(t.fecha_inicio_plan);const wP=wF(t.fecha_inicio_plan,t.fecha_fin_plan);
                const xR=t.fecha_inicio_real?xF(t.fecha_inicio_real):xP;
                const wR=t.dias_reales>0?parseFloat(t.dias_reales)*pxD:0;
                const desvio=t.dias_teoricos&&t.dias_reales?Math.round(parseFloat(t.dias_reales)-t.dias_teoricos):null;
                const sinF=xP<0||wP===0;
                return(<g key={i} onClick={()=>setPanelTarea(t)} style={{cursor:"pointer"}}>
                  {sinF?(
                    <g><rect x={8} y={f.y+49} width={70} height={9} rx={2} fill="none" stroke="#ddd" strokeWidth={1} strokeDasharray="3,2"/><text x={12} y={f.y+56} fontSize={8} fill="#ccc" fontFamily="system-ui">sin fechas</text></g>
                  ):(
                    <g>
                      <rect x={xP} y={f.y+47} width={wP} height={11} rx={3} fill={color} opacity={0.15}/>
                      <rect x={xP} y={f.y+47} width={Math.max(0,wP*(pct/100))} height={11} rx={3} fill={t.completada?"#22c55e":color} opacity={0.75}/>
                      <rect x={xP} y={f.y+47} width={wP} height={11} rx={3} fill="none" stroke={color} strokeWidth={1} opacity={0.4}/>
                      {wP>30&&pct>5&&<text x={xP+Math.max(wP*(pct/100)/2,12)} y={f.y+56} fontSize={8} fill={t.completada?"#fff":color} fontFamily="system-ui" fontWeight="bold" textAnchor="middle">{pct}%</text>}
                      {wR>0&&<g><rect x={xR} y={f.y+60} width={wR} height={5} rx={2} fill={desvio>0?"#ef4444":"#22c55e"} opacity={0.85}/>{!isMobile&&desvio!=null&&<text x={xR+wR+3} y={f.y+65} fontSize={8} fill={desvio>0?"#ef4444":"#22c55e"} fontFamily="system-ui" fontWeight="bold">{desvio>0?"+":""}{desvio}d</text>}</g>}
                      {t.completada&&<text x={xP+wP+3} y={f.y+56} fontSize={9} fill="#22c55e">✓</text>}
                      {t.estado_alerta==="atrasada"&&!t.completada&&<rect x={xP} y={f.y+47} width={wP} height={11} rx={3} fill="none" stroke="#ef4444" strokeWidth={1.5}/>}
                    </g>
                  )}
                </g>);
              })}
            </svg>
          </div>
        </div>
      )}
      {panelTarea&&<PanelTareaDetalle tarea={panelTarea} onClose={()=>{setPanelTarea(null);cargar();}} onGuardar={guardarTarea} tareas={tareas} deps={deps}/>}
      {showAdd&&<ModalNuevaTarea obraId={obra.id} onClose={()=>setShowAdd(false)} onCreada={async()=>{setShowAdd(false);await cargar();}}/>}
    </div>
  );
}
/* ════════════════ PANEL TAREA DETALLE ════════════════ */
function PanelTareaDetalle({ tarea, onClose, onGuardar, tareas=[], deps=[] }) {
  const [subtareas,setSubtareas]=useState([]);const [diasPorSub,setDiasPorSub]=useState({});
  const [panelSub,setPanelSub]=useState(null);const [showAdd,setShowAdd]=useState(false);
  const [showDatos,setShowDatos]=useState(!tarea.fecha_inicio_plan);
  const [biblioSubs,setBiblioSubs]=useState([]);
  const [nueva,setNueva]=useState({nombre:"",codigo:"",dias_teoricos:"",desde_biblioteca:false,biblioteca_subtarea_id:""});
  const [editForm,setEditForm]=useState({
    codigo:tarea.codigo||"",dias_teoricos:tarea.dias_teoricos||"",
    fecha_inicio_plan:tarea.fecha_inicio_plan||"",fecha_fin_plan:tarea.fecha_fin_plan||"",
    fecha_inicio_real:tarea.fecha_inicio_real||"",fecha_fin_real:tarea.fecha_fin_real||"",
    dias_no_trabajados:tarea.dias_no_trabajados||"",porcentaje_avance:tarea.porcentaje_avance||0,
    completada:tarea.completada||false,es_checklist:tarea.es_checklist||false,
    checklist_rubro:tarea.checklist_rubro||"",es_critica:tarea.es_critica||false,
  });
  const [savingD,setSavingD]=useState(false);const [saving,setSaving]=useState(false);
  const color=ETAPA_COLOR[tarea.etapa]||"#6366f1";

  useEffect(()=>{cargar();},[tarea.id]);
  async function cargar(){
    const tk=await getToken();
    const[sArr,bArr]=await Promise.all([
      fetch(`${SUPA_URL}/subtareas_obra?tarea_id=eq.${tarea.id}&order=orden.asc`,{headers:hdrs(tk)}).then(r=>r.json()),
      fetch(`${SUPA_URL}/biblioteca_subtareas?activo=eq.true&order=orden.asc`,{headers:hdrs(tk)}).then(r=>r.json()),
    ]);
    const subs=Array.isArray(sArr)?sArr:[];setSubtareas(subs);setBiblioSubs(Array.isArray(bArr)?bArr:[]);
    if(subs.length>0){
      const ids=subs.map(s=>s.id).join(",");
      const rArr=await fetch(`${SUPA_URL}/subtarea_registros?subtarea_id=in.(${ids})`,{headers:hdrs(tk)}).then(r=>r.json());
      const map={};(Array.isArray(rArr)?rArr:[]).forEach(r=>{map[r.subtarea_id]=(map[r.subtarea_id]||0)+(parseFloat(r.dias)||0);});
      setDiasPorSub(map);
    }
  }
  useEffect(()=>{
    if(editForm.fecha_inicio_plan&&editForm.dias_teoricos&&!editForm.fecha_fin_plan){
      const fin=new Date(editForm.fecha_inicio_plan+"T12:00");fin.setDate(fin.getDate()+parseInt(editForm.dias_teoricos));
      setEditForm(f=>({...f,fecha_fin_plan:fin.toISOString().slice(0,10)}));
    }
  },[editForm.fecha_inicio_plan,editForm.dias_teoricos]);

  async function guardarDatos(){
    setSavingD(true);
    await onGuardar(tarea.id,{codigo:editForm.codigo||null,dias_teoricos:parseInt(editForm.dias_teoricos)||null,fecha_inicio_plan:editForm.fecha_inicio_plan||null,fecha_fin_plan:editForm.fecha_fin_plan||null,fecha_inicio_real:editForm.fecha_inicio_real||null,fecha_fin_real:editForm.fecha_fin_real||null,dias_no_trabajados:parseInt(editForm.dias_no_trabajados)||null,porcentaje_avance:parseInt(editForm.porcentaje_avance)||0,completada:editForm.completada,es_checklist:editForm.es_checklist,checklist_rubro:editForm.checklist_rubro||null,es_critica:editForm.es_critica});
    setSavingD(false);setShowDatos(false);
  }
  async function agregarSub(){
    setSaving(true);const tk=await getToken();
    await fetch(`${SUPA_URL}/subtareas_obra`,{method:"POST",headers:hdrs(tk),body:JSON.stringify({tarea_id:tarea.id,nombre:nueva.nombre,codigo:nueva.codigo||null,dias_teoricos:parseInt(nueva.dias_teoricos)||null,orden:subtareas.length+1,en_biblioteca:nueva.desde_biblioteca,biblioteca_subtarea_id:nueva.biblioteca_subtarea_id||null})});
    setNueva({nombre:"",codigo:"",dias_teoricos:"",desde_biblioteca:false,biblioteca_subtarea_id:""});setShowAdd(false);await cargar();setSaving(false);
  }
  async function toggleCompleta(subId,val){
    const tk=await getToken();
    await fetch(`${SUPA_URL}/subtareas_obra?id=eq.${subId}`,{method:"PATCH",headers:hdrs(tk),body:JSON.stringify({completada:val})});
    setSubtareas(prev=>prev.map(s=>s.id===subId?{...s,completada:val}:s));
  }

  const diasRealesTarea=Object.values(diasPorSub).reduce((s,v)=>s+v,0);
  const desvio=tarea.dias_teoricos?diasRealesTarea-tarea.dias_teoricos:null;
  const rendimiento=tarea.dias_teoricos&&diasRealesTarea>0?Math.round((tarea.dias_teoricos/diasRealesTarea)*100):null;

  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.5)",display:"flex",justifyContent:"flex-end",zIndex:300}}>
      <div style={{background:"#fff",width:"100%",maxWidth:460,height:"100%",overflowY:"auto",display:"flex",flexDirection:"column"}}>
        <div style={{padding:"16px 20px",borderBottom:"1px solid #f0f0f0",background:color+"10",flexShrink:0}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
            <div>
              <div style={{fontSize:10,color,fontWeight:700,textTransform:"uppercase"}}>{tarea.etapa}</div>
              <div style={{display:"flex",alignItems:"center",gap:6,marginTop:2,flexWrap:"wrap"}}>
                {tarea.codigo&&<span style={{fontSize:11,fontWeight:700,color:"#888",background:"#f0f0f0",borderRadius:4,padding:"1px 6px"}}>{tarea.codigo}</span>}
                <span style={{fontWeight:700,fontSize:16}}>{tarea.nombre}</span>
              </div>
              <div style={{display:"flex",gap:6,marginTop:4,flexWrap:"wrap"}}>
                {tarea.es_checklist&&<span style={{fontSize:10,background:"#f0fdf4",color:"#16a34a",borderRadius:4,padding:"2px 6px",fontWeight:600}}>✅ Checklist</span>}
                {tarea.es_critica&&<span style={{fontSize:10,background:"#fef2f2",color:"#ef4444",borderRadius:4,padding:"2px 6px",fontWeight:600}}>🔴 Ruta crítica</span>}
                {tarea.estado_alerta==="atrasada"&&<span style={{fontSize:10,background:"#fef2f2",color:"#ef4444",borderRadius:4,padding:"2px 6px",fontWeight:600}}>⏰ Atrasada</span>}
                {tarea.estado_alerta==="en_riesgo"&&<span style={{fontSize:10,background:"#fffbeb",color:"#f59e0b",borderRadius:4,padding:"2px 6px",fontWeight:600}}>⚠️ En riesgo</span>}
              </div>
            </div>
            <button onClick={onClose} style={{...shared.btnSm,padding:"6px 10px"}}>✕</button>
          </div>
          {diasRealesTarea>0&&(
            <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:6,marginTop:12}}>
              {[{label:"Teórico",value:tarea.dias_teoricos||"—",color:"#6366f1"},{label:"Real",value:diasRealesTarea,color:desvio>0?"#ef4444":"#22c55e"},{label:"Desvío",value:desvio!=null?(desvio>0?`+${desvio}`:desvio):"—",color:desvio>0?"#ef4444":"#22c55e"},{label:"Rendimiento",value:rendimiento?`${rendimiento}%`:"—",color:rendimiento>=100?"#22c55e":"#f59e0b"}].map(k=>(
                <div key={k.label} style={{background:"#fff",borderRadius:8,padding:"8px 6px",textAlign:"center",boxShadow:"0 1px 3px rgba(0,0,0,.06)"}}>
                  <div style={{fontSize:16,fontWeight:800,color:k.color}}>{k.value}</div>
                  <div style={{fontSize:8,color:"#888",marginTop:1}}>{k.label}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{flex:1,overflowY:"auto",padding:"14px 20px"}}>
          {/* Fechas colapsable */}
          <div style={{marginBottom:14}}>
            <button onClick={()=>setShowDatos(!showDatos)} style={{...shared.btnSm,width:"100%",textAlign:"left",fontSize:12,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <span>📋 Fechas y configuración</span><span>{showDatos?"▲":"▼"}</span>
            </button>
            {showDatos&&(
              <div style={{background:"#f8f8f8",borderRadius:10,padding:14,marginTop:8,border:"1px solid #e0e0e0"}}>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:10}}>
                  <div><label style={{fontSize:10,color:"#888",display:"block",marginBottom:3}}>Código</label><input value={editForm.codigo} onChange={e=>setEditForm(f=>({...f,codigo:e.target.value}))} style={shared.inp} placeholder="01.A"/></div>
                  <div><label style={{fontSize:10,color:"#888",display:"block",marginBottom:3}}>Días teóricos</label><input type="number" min="1" value={editForm.dias_teoricos} onChange={e=>setEditForm(f=>({...f,dias_teoricos:e.target.value}))} style={shared.inp}/></div>
                  <div><label style={{fontSize:10,color:"#888",display:"block",marginBottom:3}}>Inicio plan</label><input type="date" value={editForm.fecha_inicio_plan} onChange={e=>setEditForm(f=>({...f,fecha_inicio_plan:e.target.value}))} style={shared.inp}/></div>
                  <div><label style={{fontSize:10,color:"#888",display:"block",marginBottom:3}}>Fin plan</label><input type="date" value={editForm.fecha_fin_plan} onChange={e=>setEditForm(f=>({...f,fecha_fin_plan:e.target.value}))} style={shared.inp}/></div>
                  <div><label style={{fontSize:10,color:"#888",display:"block",marginBottom:3}}>Inicio real</label><input type="date" value={editForm.fecha_inicio_real} onChange={e=>setEditForm(f=>({...f,fecha_inicio_real:e.target.value}))} style={shared.inp}/></div>
                  <div><label style={{fontSize:10,color:"#888",display:"block",marginBottom:3}}>Fin real</label><input type="date" value={editForm.fecha_fin_real} onChange={e=>setEditForm(f=>({...f,fecha_fin_real:e.target.value}))} style={shared.inp}/></div>
                  <div><label style={{fontSize:10,color:"#888",display:"block",marginBottom:3}}>Días no trabajados</label><input type="number" min="0" value={editForm.dias_no_trabajados} onChange={e=>setEditForm(f=>({...f,dias_no_trabajados:e.target.value}))} style={shared.inp}/></div>
                </div>
                <div style={{marginBottom:10}}>
                  <label style={{fontSize:10,color:"#888",display:"block",marginBottom:3}}>Avance: {editForm.porcentaje_avance}%</label>
                  <input type="range" min="0" max="100" step="5" value={editForm.porcentaje_avance} onChange={e=>setEditForm(f=>({...f,porcentaje_avance:parseInt(e.target.value),completada:parseInt(e.target.value)===100}))} style={{width:"100%"}}/>
                </div>
                <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:12}}>
                  {[{key:"completada",label:"✅ Completada"},{key:"es_checklist",label:"🔍 Ítem de checklist (Carpeta 5)"},{key:"es_critica",label:"🔴 Ruta crítica"}].map(f=>(
                    <label key={f.key} style={{display:"flex",alignItems:"center",gap:8,fontSize:13,cursor:"pointer"}}>
                      <input type="checkbox" checked={editForm[f.key]} onChange={e=>{const v=e.target.checked;setEditForm(p=>({...p,[f.key]:v,...(f.key==="completada"&&v?{porcentaje_avance:100}:{})}));}} style={{width:16,height:16}}/>{f.label}
                    </label>
                  ))}
                </div>
                {editForm.es_checklist&&(
                  <div style={{marginBottom:12}}>
                    <label style={{fontSize:10,color:"#888",display:"block",marginBottom:3}}>Rubro checklist</label>
                    <select value={editForm.checklist_rubro} onChange={e=>setEditForm(f=>({...f,checklist_rubro:e.target.value}))} style={shared.inp}>
                      <option value="">— Mismo que etapa —</option>
                      {Object.keys(ETAPA_COLOR).filter(e=>e!=="Sin etapa").map(e=><option key={e} value={e}>{e}</option>)}
                    </select>
                  </div>
                )}
                <button onClick={guardarDatos} disabled={savingD} style={{...shared.btn,width:"100%",fontSize:13}}>{savingD?"Guardando…":"Guardar"}</button>
              </div>
            )}
          </div>

          {/* Subtareas */}
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
            <span style={shared.lbl}>Subtareas ({subtareas.length})</span>
            <button onClick={()=>setShowAdd(!showAdd)} style={{...shared.btnSm,fontSize:12}}>{showAdd?"Cancelar":"+ Agregar"}</button>
          </div>
          {showAdd&&(
            <div style={{background:"#f0f4ff",borderRadius:12,padding:14,marginBottom:14,border:"1px solid #c7d2fe"}}>
              <div style={{display:"flex",gap:8,marginBottom:10}}>
                <button onClick={()=>setNueva(f=>({...f,desde_biblioteca:false}))} style={{...shared.btnSm,flex:1,background:!nueva.desde_biblioteca?"#111":"#f0f0f0",color:!nueva.desde_biblioteca?"#fff":"#333"}}>Nueva</button>
                <button onClick={()=>setNueva(f=>({...f,desde_biblioteca:true}))} style={{...shared.btnSm,flex:1,background:nueva.desde_biblioteca?"#111":"#f0f0f0",color:nueva.desde_biblioteca?"#fff":"#333"}}>Biblioteca</button>
              </div>
              {nueva.desde_biblioteca&&<select value={nueva.biblioteca_subtarea_id} onChange={e=>{const sel=biblioSubs.find(b=>b.id===e.target.value);setNueva(f=>({...f,biblioteca_subtarea_id:e.target.value,nombre:sel?.nombre||"",codigo:sel?.codigo||"",dias_teoricos:sel?.duracion_tipica_dias||""}));}} style={{...shared.inp,marginBottom:10}}><option value="">— Seleccionar —</option>{biblioSubs.map(b=><option key={b.id} value={b.id}>{b.codigo?`[${b.codigo}] `:""}{b.nombre}{b.duracion_tipica_dias?` (${b.duracion_tipica_dias}d)`:""}</option>)}</select>}
              <div style={{display:"grid",gridTemplateColumns:"1fr 60px 60px",gap:8,marginBottom:10}}>
                <input value={nueva.nombre} onChange={e=>setNueva(f=>({...f,nombre:e.target.value}))} style={shared.inp} placeholder="Nombre"/>
                <input value={nueva.codigo} onChange={e=>setNueva(f=>({...f,codigo:e.target.value}))} style={shared.inp} placeholder="Cód."/>
                <input type="number" min="1" value={nueva.dias_teoricos} onChange={e=>setNueva(f=>({...f,dias_teoricos:e.target.value}))} style={shared.inp} placeholder="d"/>
              </div>
              <button onClick={agregarSub} disabled={saving||!nueva.nombre} style={{...shared.btn,width:"100%",fontSize:13}}>{saving?"Guardando…":"Agregar subtarea"}</button>
            </div>
          )}
          {subtareas.length===0?<p style={{color:"#aaa",textAlign:"center",padding:"20px 0",fontSize:13}}>Sin subtareas.</p>:subtareas.map(s=>{
            const dr=diasPorSub[s.id]||0;const excede=s.dias_teoricos>0&&dr>s.dias_teoricos;
            return(<div key={s.id} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 12px",background:s.completada?"#f0fdf4":"#f8f8f8",borderRadius:10,marginBottom:6,border:excede?"1px solid #fecaca":"1px solid transparent"}}>
              <input type="checkbox" checked={!!s.completada} onChange={e=>toggleCompleta(s.id,e.target.checked)} style={{width:16,height:16,cursor:"pointer",flexShrink:0}}/>
              <div style={{flex:1,minWidth:0}}>
                <div style={{display:"flex",alignItems:"center",gap:5}}>
                  {s.codigo&&<span style={{fontSize:9,fontWeight:700,color:"#888",background:"#e8e8e8",borderRadius:3,padding:"0 5px"}}>{s.codigo}</span>}
                  <span style={{fontSize:13,fontWeight:600,color:s.completada?"#16a34a":"#111",textDecoration:s.completada?"line-through":"none"}}>{s.nombre}</span>
                </div>
                {s.dias_teoricos>0&&<div style={{marginTop:4}}><div style={{height:3,background:"#e0e0e0",borderRadius:2,overflow:"hidden"}}><div style={{height:"100%",width:`${Math.min(100,Math.round((dr/s.dias_teoricos)*100))}%`,background:excede?"#ef4444":"#22c55e"}}/></div><div style={{fontSize:9,color:excede?"#ef4444":"#888",marginTop:1}}>{dr}/{s.dias_teoricos}d</div></div>}
              </div>
              <div style={{textAlign:"center",flexShrink:0}}><div style={{fontSize:14,fontWeight:800,color:excede?"#ef4444":"#111"}}>{dr}</div><div style={{fontSize:8,color:"#aaa"}}>días</div></div>
              <button onClick={()=>setPanelSub(s)} style={{...shared.btnSm,flexShrink:0,fontSize:12,padding:"6px 10px"}}>📝</button>
            </div>);
          })}
        </div>
      </div>
      {panelSub&&<PanelRegistroSubtarea subtarea={panelSub} onClose={()=>{setPanelSub(null);cargar();}}/>}
    </div>
  );
}

/* ════════════════ PANEL REGISTRO SUBTAREA ════════════════ */
function PanelRegistroSubtarea({ subtarea, onClose }) {
  const [registros,setRegistros]=useState([]);const [form,setForm]=useState({fecha:new Date().toISOString().slice(0,10),dias:1,personas:1,observaciones:""});const [saving,setSaving]=useState(false);const [loading,setLoading]=useState(true);
  useEffect(()=>{async function c(){const tk=await getToken();const r=await fetch(`${SUPA_URL}/subtarea_registros?subtarea_id=eq.${subtarea.id}&order=fecha.desc`,{headers:hdrs(tk)}).then(r=>r.json());setRegistros(Array.isArray(r)?r:[]);setLoading(false);}c();},[subtarea.id]);
  async function guardar(){setSaving(true);const tk=await getToken();const r=await fetch(`${SUPA_URL}/subtarea_registros`,{method:"POST",headers:hdrs(tk),body:JSON.stringify({subtarea_id:subtarea.id,...form,dias:parseFloat(form.dias)||1,personas:parseInt(form.personas)||1})}).then(r=>r.json());setRegistros(prev=>[r[0],...prev]);setForm(f=>({...f,observaciones:""}));setSaving(false);}
  const totalDias=registros.reduce((s,r)=>s+(parseFloat(r.dias)||0),0);
  const promPers=registros.length?Math.round(registros.reduce((s,r)=>s+(r.personas||0),0)/registros.length):0;
  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.6)",display:"flex",alignItems:"flex-end",justifyContent:"center",zIndex:400}}>
      <div style={{background:"#fff",borderRadius:"20px 20px 0 0",padding:"20px 20px 40px",width:"100%",maxWidth:540,maxHeight:"90vh",overflowY:"auto"}}>
        <div style={{width:40,height:4,background:"#e0e0e0",borderRadius:2,margin:"0 auto 16px"}}/>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:14}}>
          <div>{subtarea.codigo&&<div style={{fontSize:10,color:"#888",fontWeight:700}}>{subtarea.codigo}</div>}<div style={{fontWeight:700,fontSize:16}}>{subtarea.nombre}</div>{subtarea.dias_teoricos>0&&<div style={{fontSize:11,color:"#6366f1",marginTop:1}}>⏱ {subtarea.dias_teoricos} días teóricos</div>}</div>
          <button onClick={onClose} style={{...shared.btnSm,padding:"6px 10px"}}>✕</button>
        </div>
        {totalDias>0&&<div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:14}}>{[{label:"Días reales",value:totalDias,color:totalDias>(subtarea.dias_teoricos||999)?"#ef4444":"#22c55e"},{label:"Días teóricos",value:subtarea.dias_teoricos||"—",color:"#6366f1"},{label:"Prom. personas",value:promPers,color:"#f59e0b"}].map(k=>(<div key={k.label} style={{background:"#f8f8f8",borderRadius:10,padding:"10px 8px",textAlign:"center"}}><div style={{fontSize:20,fontWeight:800,color:k.color}}>{k.value}</div><div style={{fontSize:10,color:"#888",marginTop:2}}>{k.label}</div></div>))}</div>}
        {!loading&&registros.map(reg=>(<div key={reg.id} style={{borderBottom:"1px solid #f0f0f0",paddingBottom:10,marginBottom:10}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}><span style={{fontSize:13,fontWeight:600}}>{new Date(reg.fecha+"T12:00").toLocaleDateString("es-AR",{weekday:"short",day:"numeric",month:"short"})}</span><div style={{display:"flex",gap:10,fontSize:13,color:"#555"}}><span>📅 {reg.dias}d</span><span>👷 {reg.personas}p</span></div></div>{reg.observaciones&&<div style={{fontSize:12,color:"#666",marginTop:4,fontStyle:"italic"}}>💬 {reg.observaciones}</div>}</div>))}
        <div style={{background:"#f8f8f8",borderRadius:12,padding:14,marginTop:8}}>
          <span style={shared.lbl}>Registrar día</span>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:10}}>
            <div><label style={{fontSize:10,color:"#888",display:"block",marginBottom:3}}>Fecha</label><input type="date" value={form.fecha} onChange={e=>setForm(f=>({...f,fecha:e.target.value}))} style={shared.inp}/></div>
            <div><label style={{fontSize:10,color:"#888",display:"block",marginBottom:3}}>Días</label><input type="number" min="0.5" step="0.5" value={form.dias} onChange={e=>setForm(f=>({...f,dias:e.target.value}))} style={shared.inp}/></div>
            <div><label style={{fontSize:10,color:"#888",display:"block",marginBottom:3}}>Personas</label><input type="number" min="1" value={form.personas} onChange={e=>setForm(f=>({...f,personas:e.target.value}))} style={shared.inp}/></div>
          </div>
          <textarea value={form.observaciones} onChange={e=>setForm(f=>({...f,observaciones:e.target.value}))} placeholder="Observaciones…" rows={2} style={{...shared.inp,resize:"none",marginBottom:10}}/>
          <button onClick={guardar} disabled={saving} style={{...shared.btn,width:"100%"}}>{saving?"Guardando…":"Registrar"}</button>
        </div>
      </div>
    </div>
  );
}
/* ════════════════ MODAL NUEVA TAREA ════════════════ */
function ModalNuevaTarea({ obraId, onClose, onCreada }) {
  const [form,setForm]=useState({nombre:"",codigo:"",etapa:"",dias_teoricos:"",fecha_inicio_plan:"",fecha_fin_plan:"",es_checklist:false,es_critica:false,checklist_rubro:""});
  const [saving,setSaving]=useState(false);const [biblioRubros,setBiblioRubros]=useState([]);const [biblioTareas,setBiblioTareas]=useState([]);const [rubroSel,setRubroSel]=useState("");const [desdeLib,setDesdeLib]=useState(true);
  useEffect(()=>{async function c(){const tk=await getToken();const r=await fetch(`${SUPA_URL}/biblioteca_rubros?activo=eq.true&order=orden.asc`,{headers:hdrs(tk)}).then(r=>r.json());setBiblioRubros(Array.isArray(r)?r:[]);}c();},[]);
  useEffect(()=>{if(!rubroSel)return;async function c(){const tk=await getToken();const r=await fetch(`${SUPA_URL}/biblioteca_tareas?rubro_id=eq.${rubroSel}&activo=eq.true&order=orden.asc`,{headers:hdrs(tk)}).then(r=>r.json());setBiblioTareas(Array.isArray(r)?r:[]);}c();},[rubroSel]);
  useEffect(()=>{if(form.fecha_inicio_plan&&form.dias_teoricos&&!form.fecha_fin_plan){const fin=new Date(form.fecha_inicio_plan+"T12:00");fin.setDate(fin.getDate()+parseInt(form.dias_teoricos));setForm(f=>({...f,fecha_fin_plan:fin.toISOString().slice(0,10)}));}},[form.fecha_inicio_plan,form.dias_teoricos]);
  async function crear(){setSaving(true);const tk=await getToken();await fetch(`${SUPA_URL}/tareas_obra`,{method:"POST",headers:hdrs(tk),body:JSON.stringify({obra_id:obraId,nombre:form.nombre,codigo:form.codigo||null,etapa:form.etapa||null,dias_teoricos:parseInt(form.dias_teoricos)||null,fecha_inicio_plan:form.fecha_inicio_plan||null,fecha_fin_plan:form.fecha_fin_plan||null,es_checklist:form.es_checklist,es_critica:form.es_critica,checklist_rubro:form.checklist_rubro||null,orden:999,porcentaje_avance:0})});await onCreada();setSaving(false);}
  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.5)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:400,padding:16}}>
      <div style={{background:"#fff",borderRadius:16,padding:24,width:"100%",maxWidth:480,maxHeight:"90vh",overflowY:"auto"}}>
        <div style={{display:"flex",justifyContent:"space-between",marginBottom:16}}><h3 style={{margin:0,fontSize:16}}>Nueva tarea</h3><button onClick={onClose} style={{...shared.btnSm,padding:"4px 8px"}}>✕</button></div>
        <div style={{display:"flex",gap:8,marginBottom:14}}>
          <button onClick={()=>setDesdeLib(true)} style={{...shared.btnSm,flex:1,background:desdeLib?"#111":"#f0f0f0",color:desdeLib?"#fff":"#333"}}>Desde biblioteca</button>
          <button onClick={()=>setDesdeLib(false)} style={{...shared.btnSm,flex:1,background:!desdeLib?"#111":"#f0f0f0",color:!desdeLib?"#fff":"#333"}}>Manual</button>
        </div>
        {desdeLib&&(
          <div style={{background:"#f0f4ff",borderRadius:10,padding:14,marginBottom:14,border:"1px solid #c7d2fe"}}>
            <div style={{marginBottom:10}}>
              <label style={{fontSize:11,color:"#888",display:"block",marginBottom:3}}>Rubro / Etapa</label>
              <select value={rubroSel} onChange={e=>{setRubroSel(e.target.value);const r=biblioRubros.find(r=>r.id===e.target.value);if(r)setForm(f=>({...f,etapa:r.nombre}));}} style={shared.inp}>
                <option value="">— Seleccionar rubro —</option>
                {biblioRubros.map(r=><option key={r.id} value={r.id}>{r.codigo?`[${r.codigo}] `:""}{r.nombre}</option>)}
              </select>
            </div>
            {rubroSel&&biblioTareas.length>0&&(
              <div>
                <label style={{fontSize:11,color:"#888",display:"block",marginBottom:3}}>Tarea</label>
                <select onChange={e=>{const t=biblioTareas.find(t=>t.id===e.target.value);if(t)setForm(f=>({...f,nombre:t.nombre,codigo:t.codigo||"",dias_teoricos:t.duracion_tipica_dias||"",es_checklist:t.es_checklist||false,es_critica:t.es_critica||false}));}} style={shared.inp}>
                  <option value="">— Seleccionar tarea —</option>
                  {biblioTareas.map(t=><option key={t.id} value={t.id}>{t.codigo?`[${t.codigo}] `:""}{t.nombre}{t.duracion_tipica_dias?` · ${t.duracion_tipica_dias}d`:""}</option>)}
                </select>
              </div>
            )}
          </div>
        )}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:12}}>
          <div style={{gridColumn:"1/-1"}}><span style={shared.lbl}>Nombre *</span><input value={form.nombre} onChange={e=>setForm(f=>({...f,nombre:e.target.value}))} style={shared.inp} placeholder="Nombre de la tarea"/></div>
          <div><span style={shared.lbl}>Código</span><input value={form.codigo} onChange={e=>setForm(f=>({...f,codigo:e.target.value}))} style={shared.inp} placeholder="01.A"/></div>
          <div><span style={shared.lbl}>Etapa</span><select value={form.etapa} onChange={e=>setForm(f=>({...f,etapa:e.target.value}))} style={shared.inp}><option value="">— Sin etapa —</option>{Object.keys(ETAPA_COLOR).filter(e=>e!=="Sin etapa").map(e=><option key={e} value={e}>{e}</option>)}</select></div>
          <div><span style={shared.lbl}>Días teóricos</span><input type="number" min="1" value={form.dias_teoricos} onChange={e=>setForm(f=>({...f,dias_teoricos:e.target.value}))} style={shared.inp}/></div>
          <div><span style={shared.lbl}>Inicio plan</span><input type="date" value={form.fecha_inicio_plan} onChange={e=>setForm(f=>({...f,fecha_inicio_plan:e.target.value}))} style={shared.inp}/></div>
          <div style={{gridColumn:"1/-1"}}><span style={shared.lbl}>Fin plan</span><input type="date" value={form.fecha_fin_plan} onChange={e=>setForm(f=>({...f,fecha_fin_plan:e.target.value}))} style={shared.inp}/></div>
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:14}}>
          {[{key:"es_checklist",label:"✅ Ítem de checklist (aparece en Carpeta 5)"},{key:"es_critica",label:"🔴 Ruta crítica"}].map(f=>(
            <label key={f.key} style={{display:"flex",alignItems:"center",gap:8,fontSize:13,cursor:"pointer"}}><input type="checkbox" checked={form[f.key]} onChange={e=>setForm(p=>({...p,[f.key]:e.target.checked}))} style={{width:16,height:16}}/>{f.label}</label>
          ))}
          {form.es_checklist&&<div><span style={shared.lbl}>Rubro checklist</span><select value={form.checklist_rubro} onChange={e=>setForm(f=>({...f,checklist_rubro:e.target.value}))} style={shared.inp}><option value="">— Mismo que etapa —</option>{Object.keys(ETAPA_COLOR).filter(e=>e!=="Sin etapa").map(e=><option key={e} value={e}>{e}</option>)}</select></div>}
        </div>
        <div style={{display:"flex",gap:8}}>
          <button onClick={crear} disabled={saving||!form.nombre} style={{...shared.btn,flex:1}}>{saving?"Creando…":"Crear tarea"}</button>
          <button onClick={onClose} style={{...shared.btnSm,flex:1,padding:"10px"}}>Cancelar</button>
        </div>
      </div>
    </div>
  );
}

/* ════════════════ GESTOR CARPETA ════════════════ */
function GestorCarpeta({ obra, carpeta, onClose }) {
  const [links,setLinks]=useState([]);const [archivos,setArchivos]=useState([]);const [subActiva,setSubActiva]=useState(carpeta.subs[0]||null);const [showAddLink,setShowAddLink]=useState(false);const [nuevoLink,setNuevoLink]=useState({nombre:"",url:"",tipo:"link",descripcion:""});const [subiendo,setSubiendo]=useState(false);const [saving,setSaving]=useState(false);const fileRef=useRef();
  const driveFolderId=obra[carpeta.driveKey];
  useEffect(()=>{cargar();},[carpeta.num,subActiva]);
  async function cargar(){
    const tk=await getToken();const sub=subActiva?`&subcarpeta=eq.${encodeURIComponent(subActiva)}`:"";
    const[lArr,aArr]=await Promise.all([fetch(`${SUPA_URL}/obra_links?obra_id=eq.${obra.id}&carpeta_numero=eq.${carpeta.num}${sub}`,{headers:hdrs(tk)}).then(r=>r.json()),fetch(`${SUPA_URL}/obra_archivos?obra_id=eq.${obra.id}&carpeta_numero=eq.${carpeta.num}${sub}&order=created_at.desc`,{headers:hdrs(tk)}).then(r=>r.json())]);
    setLinks(Array.isArray(lArr)?lArr:[]);
    const aF=Array.isArray(aArr)?aArr:[];
    const conU=await Promise.all(aF.map(async a=>({...a,signedUrl:a.storage_path?await(async()=>{const{data}=await supabase.storage.from("npl-obras").createSignedUrl(a.storage_path,3600);return data?.signedUrl||null;})():null})));
    setArchivos(conU);
  }
  async function guardarLink(){setSaving(true);const tk=await getToken();await fetch(`${SUPA_URL}/obra_links`,{method:"POST",headers:hdrs(tk),body:JSON.stringify({obra_id:obra.id,carpeta_numero:carpeta.num,subcarpeta:subActiva,...nuevoLink,subido_por:(await supabase.auth.getUser()).data.user?.id})});setNuevoLink({nombre:"",url:"",tipo:"link",descripcion:""});setShowAddLink(false);await cargar();setSaving(false);}
  async function subirArchivo(file){setSubiendo(true);try{const ext=file.name.split(".").pop().toLowerCase();const sub=subActiva?`${subActiva}/`:"";const path=`obras/${obra.id}/carpeta-${carpeta.num}/${sub}${Date.now()}.${ext}`;const{error}=await supabase.storage.from("npl-obras").upload(path,file,{upsert:true,contentType:file.type});if(error)throw new Error(error.message);const tipo=["jpg","jpeg","png","webp"].includes(ext)?"imagen":["mp4","mov"].includes(ext)?"video":"documento";const tk=await getToken();await fetch(`${SUPA_URL}/obra_archivos`,{method:"POST",headers:hdrs(tk),body:JSON.stringify({obra_id:obra.id,carpeta_numero:carpeta.num,subcarpeta:subActiva,nombre:file.name,nombre_archivo:file.name,storage_path:path,tipo,subido_por:(await supabase.auth.getUser()).data.user?.id})});await cargar();}catch(e){alert("Error: "+e.message);}setSubiendo(false);}
  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.6)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:200,padding:16}}>
      <div style={{background:"#fff",borderRadius:16,width:"100%",maxWidth:600,maxHeight:"90vh",overflowY:"auto",display:"flex",flexDirection:"column"}}>
        <div style={{padding:"16px 20px 12px",borderBottom:"1px solid #f0f0f0"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}><div style={{fontWeight:700,fontSize:16}}>{carpeta.icon} {carpeta.nombre}</div><button onClick={onClose} style={{...shared.btnSm,padding:"6px 10px"}}>✕</button></div>
          {driveFolderId&&<a href={`https://drive.google.com/drive/folders/${driveFolderId}`} target="_blank" rel="noreferrer" style={{display:"inline-flex",alignItems:"center",gap:6,fontSize:12,color:"#1a73e8",textDecoration:"none",background:"#e8f0fe",borderRadius:8,padding:"5px 10px",marginBottom:carpeta.subs.length?10:0}}>📂 Abrir en Drive</a>}
          {carpeta.subs.length>0&&<div style={{display:"flex",gap:6,flexWrap:"wrap"}}><button onClick={()=>setSubActiva(null)} style={{...shared.btnSm,fontSize:12,background:!subActiva?"#111":"#f0f0f0",color:!subActiva?"#fff":"#333"}}>Todos</button>{carpeta.subs.map(s=><button key={s} onClick={()=>setSubActiva(s)} style={{...shared.btnSm,fontSize:12,background:subActiva===s?"#111":"#f0f0f0",color:subActiva===s?"#fff":"#333"}}>{s}</button>)}</div>}
        </div>
        <div style={{padding:"14px 20px",flex:1}}>
          <div style={{display:"flex",gap:8,marginBottom:14,flexWrap:"wrap"}}>
            <button onClick={()=>setShowAddLink(!showAddLink)} style={{...shared.btnSm,fontSize:13}}>{showAddLink?"Cancelar":"🔗 Agregar link"}</button>
            <input ref={fileRef} type="file" style={{display:"none"}} multiple onChange={e=>Array.from(e.target.files).forEach(subirArchivo)}/>
            <button onClick={()=>fileRef.current.click()} disabled={subiendo} style={{...shared.btnSm,fontSize:13}}>{subiendo?"Subiendo…":"⬆️ Subir archivo"}</button>
          </div>
          {showAddLink&&(
            <div style={{background:"#f8f8f8",borderRadius:12,padding:14,marginBottom:14,border:"1px solid #e0e0e0"}}>
              <div style={{marginBottom:10}}><label style={{fontSize:11,color:"#888",display:"block",marginBottom:3}}>Nombre</label><input value={nuevoLink.nombre} onChange={e=>setNuevoLink(f=>({...f,nombre:e.target.value}))} style={shared.inp} placeholder="Ej: Contrato firmado"/></div>
              <div style={{marginBottom:10}}><label style={{fontSize:11,color:"#888",display:"block",marginBottom:3}}>URL</label><input value={nuevoLink.url} onChange={e=>setNuevoLink(f=>({...f,url:e.target.value}))} style={shared.inp} placeholder="https://drive.google.com/..."/></div>
              <div style={{display:"flex",gap:8,marginBottom:10}}>
                <div style={{flex:1}}><label style={{fontSize:11,color:"#888",display:"block",marginBottom:3}}>Tipo</label><select value={nuevoLink.tipo} onChange={e=>setNuevoLink(f=>({...f,tipo:e.target.value}))} style={shared.inp}><option value="link">Link</option><option value="drive">Drive</option><option value="contrato">Contrato</option><option value="presupuesto">Presupuesto</option><option value="plano">Plano</option><option value="otro">Otro</option></select></div>
                <div style={{flex:1}}><label style={{fontSize:11,color:"#888",display:"block",marginBottom:3}}>Descripción</label><input value={nuevoLink.descripcion} onChange={e=>setNuevoLink(f=>({...f,descripcion:e.target.value}))} style={shared.inp} placeholder="Opcional"/></div>
              </div>
              <button onClick={guardarLink} disabled={saving||!nuevoLink.nombre||!nuevoLink.url} style={{...shared.btn,width:"100%",fontSize:13}}>{saving?"Guardando…":"Guardar"}</button>
            </div>
          )}
          {links.map(l=>(<div key={l.id} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 0",borderBottom:"1px solid #f5f5f5"}}><div style={{width:40,height:40,background:"#e8f0fe",borderRadius:8,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,flexShrink:0}}>{l.tipo==="contrato"?"📝":l.tipo==="presupuesto"?"💰":l.tipo==="plano"?"📐":l.tipo==="drive"?"📂":"🔗"}</div><div style={{flex:1,minWidth:0}}><div style={{fontSize:13,fontWeight:600,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{l.nombre}</div>{l.descripcion&&<div style={{fontSize:11,color:"#aaa"}}>{l.descripcion}</div>}</div><a href={l.url} target="_blank" rel="noreferrer" style={{...shared.btnSm,textDecoration:"none",fontSize:12,flexShrink:0}}>Abrir →</a></div>))}
          {archivos.map(a=>(<div key={a.id} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 0",borderBottom:"1px solid #f5f5f5"}}>{a.tipo==="imagen"&&a.signedUrl?<img src={a.signedUrl} alt="" style={{width:44,height:44,objectFit:"cover",borderRadius:8,flexShrink:0}}/>:<div style={{width:44,height:44,background:"#f0f0f0",borderRadius:8,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,flexShrink:0}}>{a.tipo==="video"?"🎥":"📄"}</div>}<div style={{flex:1,minWidth:0}}><div style={{fontSize:13,fontWeight:600,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{a.nombre||a.nombre_archivo}</div><div style={{fontSize:11,color:"#aaa"}}>{new Date(a.created_at).toLocaleDateString("es-AR")}</div></div>{a.signedUrl&&<a href={a.signedUrl} target="_blank" rel="noreferrer" style={{...shared.btnSm,textDecoration:"none",fontSize:12,flexShrink:0}}>Ver</a>}</div>))}
          {links.length===0&&archivos.length===0&&<p style={{color:"#aaa",textAlign:"center",padding:"32px 0",fontSize:13}}>Sin documentos.</p>}
        </div>
      </div>
    </div>
  );
}
/* ════════════════ MODAL EDITAR OBRA ════════════════ */
function ModalEditarObra({ obra, jefesList, onGuardar, onClose }) {
  const [form,setForm]=useState({nombre:obra.nombre||"",direccion:obra.direccion||"",codigo:obra.codigo||"",sistema_constructivo:obra.sistema_constructivo||"Steel Frame",alcance:obra.alcance||"obra_completa",fecha_inicio_plan:obra.fecha_inicio_plan||"",fecha_fin_plan:obra.fecha_fin_plan||"",jefe_id:obra.jefe_id||"",notas:obra.notas||"",cliente_id:obra.cliente_id||"",proyecto_id:obra.proyecto_id||"",presupuesto_id:obra.presupuesto_id||""});
  const [proyectos,setProyectos]=useState([]);const [clientes,setClientes]=useState([]);const [presupuestos,setPresupuestos]=useState([]);
  useEffect(()=>{async function c(){const tk=await getToken();const[p,cl,pr]=await Promise.all([fetch(`${SUPA_URL}/proyectos?select=id,descripcion,numero_proyecto&order=numero_proyecto.asc`,{headers:hdrs(tk)}).then(r=>r.json()),fetch(`${SUPA_URL}/clientes?select=id,empresa&order=empresa.asc`,{headers:hdrs(tk)}).then(r=>r.json()),fetch(`${SUPA_URL}/presupuestos?select=id,codigo,descripcion,cliente&order=created_at.desc`,{headers:hdrs(tk)}).then(r=>r.json())]);setProyectos(Array.isArray(p)?p:[]);setClientes(Array.isArray(cl)?cl:[]);setPresupuestos(Array.isArray(pr)?pr:[]);}c();},[]);
  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.5)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:100,padding:16}}>
      <div style={{background:"#fff",borderRadius:16,padding:28,width:"100%",maxWidth:480,maxHeight:"90vh",overflowY:"auto"}}>
        <div style={{display:"flex",justifyContent:"space-between",marginBottom:20}}><h3 style={{margin:0,fontSize:17}}>Editar obra</h3><button onClick={onClose} style={{...shared.btnSm,padding:"5px 10px"}}>✕</button></div>
        {[{lbl:"Código",key:"codigo",ph:"2026-SF-531"},{lbl:"Nombre *",key:"nombre",ph:"Nombre"},{lbl:"Dirección",key:"direccion",ph:"Dirección"}].map(f=>(<div key={f.key} style={{marginBottom:12}}><span style={shared.lbl}>{f.lbl}</span><input value={form[f.key]} onChange={e=>setForm(p=>({...p,[f.key]:e.target.value}))} style={shared.inp} placeholder={f.ph}/></div>))}
        <div style={{marginBottom:12}}><span style={shared.lbl}>🏢 Cliente</span><Combobox options={clientes.map(c=>({value:c.id,label:c.empresa}))} value={form.cliente_id} onChange={val=>setForm(p=>({...p,cliente_id:val}))} placeholder="Buscar cliente..." emptyLabel="Sin vincular"/></div>
        <div style={{marginBottom:12}}><span style={shared.lbl}>Sistema constructivo</span><select value={form.sistema_constructivo} onChange={e=>setForm(p=>({...p,sistema_constructivo:e.target.value}))} style={shared.inp}>{SISTEMAS.map(s=><option key={s} value={s}>{s}</option>)}</select></div>
        <div style={{marginBottom:12}}><span style={shared.lbl}>Alcance</span><select value={form.alcance} onChange={e=>setForm(p=>({...p,alcance:e.target.value}))} style={shared.inp}>{ALCANCES.map(a=><option key={a.v} value={a.v}>{a.label}</option>)}</select></div>
        <div style={{display:"flex",gap:12,marginBottom:12}}><div style={{flex:1}}><span style={shared.lbl}>Inicio plan</span><input type="date" value={form.fecha_inicio_plan} onChange={e=>setForm(p=>({...p,fecha_inicio_plan:e.target.value}))} style={shared.inp}/></div><div style={{flex:1}}><span style={shared.lbl}>Fin plan</span><input type="date" value={form.fecha_fin_plan} onChange={e=>setForm(p=>({...p,fecha_fin_plan:e.target.value}))} style={shared.inp}/></div></div>
        {jefesList.length>0&&<div style={{marginBottom:12}}><span style={shared.lbl}>Responsable</span><select value={form.jefe_id} onChange={e=>setForm(p=>({...p,jefe_id:e.target.value}))} style={shared.inp}><option value="">Sin asignar</option>{jefesList.map(j=><option key={j.id} value={j.id}>{j.nombre}</option>)}</select></div>}
        <div style={{background:"#f8f8f8",borderRadius:10,padding:14,marginBottom:14}}>
          <div style={{fontSize:11,fontWeight:700,color:"#888",marginBottom:12,textTransform:"uppercase"}}>Vínculos</div>
          <div style={{marginBottom:10}}><span style={shared.lbl}>📋 Proyecto</span><Combobox options={proyectos.map(p=>({value:p.id,label:`${p.numero_proyecto||""} — ${p.descripcion||""}`.trim()}))} value={form.proyecto_id} onChange={val=>setForm(p=>({...p,proyecto_id:val}))} placeholder="Buscar proyecto..." emptyLabel="Sin vincular"/></div>
          <div><span style={shared.lbl}>💰 Presupuesto</span><Combobox options={presupuestos.map(p=>({value:p.id,label:`${p.codigo||""} — ${p.descripcion||p.cliente||""}`.trim()}))} value={form.presupuesto_id} onChange={val=>setForm(p=>({...p,presupuesto_id:val}))} placeholder="Buscar presupuesto..." emptyLabel="Sin vincular"/></div>
        </div>
        <div style={{marginBottom:16}}><span style={shared.lbl}>Notas</span><textarea value={form.notas} onChange={e=>setForm(p=>({...p,notas:e.target.value}))} rows={3} style={{...shared.inp,resize:"vertical"}}/></div>
        <div style={{display:"flex",gap:8}}><button onClick={()=>onGuardar(form)} disabled={!form.nombre} style={{...shared.btn,flex:1}}>Guardar</button><button onClick={onClose} style={{...shared.btnSm,flex:1,padding:"10px"}}>Cancelar</button></div>
      </div>
    </div>
  );
}

/* ════════════════ DETALLE OBRA ════════════════ */
function DetalleObra({ obra: obraInicial, jefesList, onVolver }) {
  const [obra,setObra]=useState(obraInicial);const [carpetaActiva,setCarpetaActiva]=useState(null);const [showEdit,setShowEdit]=useState(false);const [creandoDrive,setCreandoDrive]=useState(false);const [avance,setAvance]=useState(null);const [msg,setMsg]=useState("");
  useEffect(()=>{cargarAvance();},[obra.id]);
  async function cargarAvance(){const tk=await getToken();const r=await fetch(`${SUPA_URL}/vista_avance_obra?obra_id=eq.${obra.id}`,{headers:hdrs(tk)}).then(r=>r.json());if(Array.isArray(r)&&r.length>0)setAvance(r[0]);}
  async function crearCarpetasDrive(){setCreandoDrive(true);try{const tk=await getToken();const res=await fetch(`${EDGE_URL}/crear-carpetas-drive`,{method:"POST",headers:{Authorization:`Bearer ${tk}`,"Content-Type":"application/json"},body:JSON.stringify({obra_id:obra.id,obra_nombre:obra.nombre,obra_codigo:obra.codigo})}).then(r=>r.json());if(res.ok){setObra(prev=>({...prev,drive_folder_id:res.drive_folder_id,drive_carpeta_1:res.carpetas.carpeta_1,drive_carpeta_2:res.carpetas.carpeta_2,drive_carpeta_3:res.carpetas.carpeta_3,drive_carpeta_4:res.carpetas.carpeta_4,drive_carpeta_5:res.carpetas.carpeta_5,drive_carpeta_6:res.carpetas.carpeta_6}));setMsg("✓ Carpetas creadas en Drive");}else setMsg("Error: "+(res.error||res.msg));}catch(e){setMsg("Error: "+e.message);}setCreandoDrive(false);setTimeout(()=>setMsg(""),4000);}
  async function guardarObra(form){const tk=await getToken();await fetch(`${SUPA_URL}/obras_campo?id=eq.${obra.id}`,{method:"PATCH",headers:hdrs(tk),body:JSON.stringify(form)});setObra(prev=>({...prev,...form}));setShowEdit(false);await cargarAvance();}
  return(
    <div style={{fontFamily:"system-ui,-apple-system,sans-serif",minHeight:"100vh",background:"#f5f5f7"}}>
      <div style={{background:"#111",color:"#fff",padding:"16px 20px"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
          <div>
            <button onClick={onVolver} style={{background:"none",border:"none",color:"#888",fontSize:12,cursor:"pointer",padding:0,marginBottom:6}}>← Volver</button>
            {obra.codigo&&<div style={{fontSize:10,color:"#666",fontWeight:700,letterSpacing:1}}>{obra.codigo}</div>}
            <div style={{fontWeight:700,fontSize:18}}>{obra.nombre}</div>
            <div style={{fontSize:12,color:"#888",marginTop:2}}>{obra.sistema_constructivo} · {ALCANCES.find(a=>a.v===obra.alcance)?.label||obra.alcance}</div>
            {obra.fecha_inicio_plan&&obra.fecha_fin_plan&&<div style={{fontSize:11,color:"#555",marginTop:2}}>📅 {new Date(obra.fecha_inicio_plan+"T12:00").toLocaleDateString("es-AR")} → {new Date(obra.fecha_fin_plan+"T12:00").toLocaleDateString("es-AR")}</div>}
          </div>
          <div style={{display:"flex",gap:8,flexDirection:"column",alignItems:"flex-end"}}>
            <button onClick={()=>setShowEdit(true)} style={{...shared.btnSm,fontSize:12}}>✏️ Editar</button>
            {obra.drive_folder_id?<a href={`https://drive.google.com/drive/folders/${obra.drive_folder_id}`} target="_blank" rel="noreferrer" style={{...shared.btnSm,fontSize:11,textDecoration:"none"}}>📂 Drive</a>:<button onClick={crearCarpetasDrive} disabled={creandoDrive} style={{...shared.btnSm,fontSize:11,background:"#1a73e8",color:"#fff"}}>{creandoDrive?"Creando…":"📂 Crear Drive"}</button>}
          </div>
        </div>
      </div>
      {msg&&<div style={{background:"#d4edda",color:"#155724",padding:"8px 20px",fontSize:13}}>{msg}</div>}
      <div style={{padding:16}}>
        <CardAvanceObra avance={avance}/>
        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10}}>
          {CARPETAS_DEF.map(c=>(
            <button key={c.num} onClick={()=>{if(c.num===4)setCarpetaActiva("gantt");else if(c.num===5)setCarpetaActiva("checklist");else setCarpetaActiva(c);}}
              style={{background:"#fff",border:"1px solid #e0e0e0",borderRadius:12,padding:"14px 10px",cursor:"pointer",textAlign:"center",boxShadow:"0 1px 4px rgba(0,0,0,.06)",position:"relative"}}>
              <div style={{fontSize:26,marginBottom:4}}>{c.icon}</div>
              <div style={{fontSize:11,fontWeight:600,color:"#333",lineHeight:1.3}}>{c.nombre}</div>
              {obra[c.driveKey]&&<div style={{position:"absolute",top:6,right:6,width:8,height:8,borderRadius:"50%",background:"#1a73e8"}}/>}
              {c.num===5&&avance?.total_checklist>0&&<div style={{fontSize:10,color:"#22c55e",marginTop:4,fontWeight:700}}>{avance.checklist_completados}/{avance.total_checklist}</div>}
            </button>
          ))}
        </div>
      </div>
      {carpetaActiva==="gantt"&&<div style={{position:"fixed",inset:0,background:"#fff",zIndex:100,overflow:"hidden"}}><GanttObra obra={obra} onClose={()=>{setCarpetaActiva(null);cargarAvance();}}/></div>}
      {carpetaActiva==="checklist"&&<ChecklistConsolidado obra={obra} onClose={()=>{setCarpetaActiva(null);cargarAvance();}}/>}
      {carpetaActiva&&carpetaActiva!=="gantt"&&carpetaActiva!=="checklist"&&<GestorCarpeta obra={obra} carpeta={carpetaActiva} onClose={()=>setCarpetaActiva(null)}/>}
      {showEdit&&<ModalEditarObra obra={obra} jefesList={jefesList} onGuardar={guardarObra} onClose={()=>setShowEdit(false)}/>}
    </div>
  );
}

/* ════════════════ VISTA ADMIN ════════════════ */
function VistaAdmin({ deepLinkId }) {
  const [obras,setObras]=useState([]);const [avances,setAvances]=useState({});const [loading,setLoading]=useState(true);const [jefesList,setJefesList]=useState([]);const [obraDetalle,setObraDetalle]=useState(null);const [showModal,setShowModal]=useState(false);const [nuevaObra,setNuevaObra]=useState({nombre:"",codigo:"",sistema_constructivo:"Steel Frame",alcance:"obra_completa",fecha_inicio_plan:"",fecha_fin_plan:"",jefe_id:""});const [saving,setSaving]=useState(false);const [msg,setMsg]=useState("");
  useEffect(()=>{cargarTodo();},[]);

  // Deep link: abrir obra específica al llegar desde el buscador global
  useEffect(()=>{
    if(deepLinkId && obras.length>0){
      const o = obras.find(ob=>ob.id===deepLinkId);
      if(o) setObraDetalle(o);
    }
  },[deepLinkId, obras]);
  async function cargarTodo(){
    setLoading(true);const tk=await getToken();
    const[od,jd,avd]=await Promise.all([fetch(`${SUPA_URL}/obras_campo?order=created_at.desc&select=*`,{headers:hdrs(tk)}).then(r=>r.json()),fetch(`${SUPA_URL}/perfiles?rol=eq.jefe_obra&select=id,nombre`,{headers:hdrs(tk)}).then(r=>r.json()),fetch(`${SUPA_URL}/vista_avance_obra`,{headers:hdrs(tk)}).then(r=>r.json())]);
    setObras(Array.isArray(od)?od:[]);setJefesList(Array.isArray(jd)?jd:[]);
    const avMap={};(Array.isArray(avd)?avd:[]).forEach(a=>{avMap[a.obra_id]=a;});setAvances(avMap);setLoading(false);
  }
  async function crearObra(){
    setSaving(true);const tk=await getToken();
    const r=await fetch(`${SUPA_URL}/obras_campo`,{method:"POST",headers:hdrs(tk),body:JSON.stringify({...nuevaObra,estado:"activa"})}).then(r=>r.json());
    const oc=r[0];setShowModal(false);setNuevaObra({nombre:"",codigo:"",sistema_constructivo:"Steel Frame",alcance:"obra_completa",fecha_inicio_plan:"",fecha_fin_plan:"",jefe_id:""});
    await cargarTodo();
    if(oc?.id){try{const tk2=await getToken();await fetch(`${EDGE_URL}/crear-carpetas-drive`,{method:"POST",headers:{Authorization:`Bearer ${tk2}`,"Content-Type":"application/json"},body:JSON.stringify({obra_id:oc.id,obra_nombre:oc.nombre,obra_codigo:oc.codigo})});setMsg("✓ Obra creada con carpetas en Drive");}catch(e){setMsg("✓ Obra creada");}}
    setTimeout(()=>setMsg(""),4000);setSaving(false);
  }
  async function cambiarJefe(obraId,jefeId){const tk=await getToken();await fetch(`${SUPA_URL}/obras_campo?id=eq.${obraId}`,{method:"PATCH",headers:hdrs(tk),body:JSON.stringify({jefe_id:jefeId||null})});setObras(prev=>prev.map(o=>o.id===obraId?{...o,jefe_id:jefeId}:o));}
  if(obraDetalle)return<DetalleObra obra={obraDetalle} jefesList={jefesList} onVolver={()=>{setObraDetalle(null);cargarTodo();}}/>;
  return(
    <div style={{fontFamily:"system-ui,-apple-system,sans-serif",padding:20,maxWidth:1100,margin:"0 auto"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20,flexWrap:"wrap",gap:12}}>
        <h1 style={{margin:0,fontSize:22,fontWeight:700}}>🏗️ Obras</h1>
        <button onClick={()=>setShowModal(true)} style={shared.btn}>+ Nueva obra</button>
      </div>
      {msg&&<div style={{background:"#d4edda",color:"#155724",borderRadius:8,padding:"8px 12px",marginBottom:14,fontSize:13}}>{msg}</div>}
      {loading?<p style={{color:"#aaa"}}>Cargando…</p>:(
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          {obras.map(o=>{
            const av=avances[o.id];const sColor={verde:"#22c55e",amarillo:"#f59e0b",rojo:"#ef4444"}[av?.semaforo]||"#e0e0e0";
            return(<div key={o.id} style={{...shared.card,display:"flex",gap:14,alignItems:"flex-start",flexWrap:"wrap",cursor:"pointer",borderLeft:`4px solid ${sColor}`}} onClick={()=>setObraDetalle(o)}>
              <div style={{flex:1,minWidth:200}}>
                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:3,flexWrap:"wrap"}}>
                  {o.codigo&&<span style={{fontSize:11,fontWeight:700,color:"#aaa"}}>{o.codigo}</span>}
                  <span style={{fontSize:12,background:{activa:"#22c55e22",pausada:"#f59e0b22",finalizada:"#88888822"}[o.estado]||"#f0f0f0",color:{activa:"#22c55e",pausada:"#f59e0b",finalizada:"#888"}[o.estado]||"#888",borderRadius:6,padding:"2px 8px",fontWeight:600}}>{o.estado}</span>
                  {o.drive_folder_id&&<span style={{fontSize:10,color:"#1a73e8",background:"#e8f0fe",borderRadius:6,padding:"2px 6px"}}>📂 Drive</span>}
                  {av?.tareas_atrasadas>0&&<span style={{fontSize:10,color:"#ef4444",background:"#fef2f2",borderRadius:6,padding:"2px 6px",fontWeight:700}}>⏰ {av.tareas_atrasadas} atrasadas</span>}
                </div>
                <div style={{fontWeight:700,fontSize:16,marginBottom:2}}>{o.nombre}</div>
                <div style={{fontSize:12,color:"#888"}}>{o.sistema_constructivo} · {ALCANCES.find(a=>a.v===o.alcance)?.label||o.alcance}</div>
                {o.fecha_inicio_plan&&o.fecha_fin_plan&&<div style={{fontSize:11,color:"#aaa",marginTop:2}}>📅 {new Date(o.fecha_inicio_plan+"T12:00").toLocaleDateString("es-AR")} → {new Date(o.fecha_fin_plan+"T12:00").toLocaleDateString("es-AR")}</div>}
                {av&&(<div style={{marginTop:8}}>
                  <div style={{display:"flex",justifyContent:"space-between",fontSize:10,color:"#aaa",marginBottom:2}}><span>Real</span><span style={{fontWeight:700,color:sColor}}>{av.avance_real_pct||0}%</span></div>
                  <div style={{height:5,background:"#f0f0f0",borderRadius:3,overflow:"hidden",marginBottom:4}}><div style={{height:"100%",width:`${av.avance_real_pct||0}%`,background:sColor}}/></div>
                  {av.avance_teorico_pct!=null&&<><div style={{display:"flex",justifyContent:"space-between",fontSize:10,color:"#aaa",marginBottom:2}}><span>Teórico</span><span style={{fontWeight:700,color:"#6366f1"}}>{av.avance_teorico_pct}%</span></div><div style={{height:4,background:"#f0f0f0",borderRadius:3,overflow:"hidden"}}><div style={{height:"100%",width:`${av.avance_teorico_pct}%`,background:"#6366f1",opacity:0.5}}/></div></>}
                </div>)}
              </div>
              <div style={{flexShrink:0}} onClick={e=>e.stopPropagation()}>
                <span style={shared.lbl}>Responsable</span>
                <select value={o.jefe_id||""} onChange={e=>cambiarJefe(o.id,e.target.value)} style={{...shared.inp,width:160,fontSize:13,padding:"7px 10px"}}>
                  <option value="">Sin asignar</option>{jefesList.map(j=><option key={j.id} value={j.id}>{j.nombre}</option>)}
                </select>
              </div>
            </div>);
          })}
          {obras.length===0&&<p style={{color:"#aaa",textAlign:"center",padding:40}}>Sin obras todavía.</p>}
        </div>
      )}
      {showModal&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.5)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:100,padding:16}}>
          <div style={{background:"#fff",borderRadius:16,padding:28,width:"100%",maxWidth:440,maxHeight:"90vh",overflowY:"auto"}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:20}}><h3 style={{margin:0}}>Nueva obra</h3><button onClick={()=>setShowModal(false)} style={{...shared.btnSm,padding:"5px 10px"}}>✕</button></div>
            {[{lbl:"Código",key:"codigo",ph:"2026-SF-531"},{lbl:"Nombre *",key:"nombre",ph:"Nombre"}].map(f=>(<div key={f.key} style={{marginBottom:12}}><span style={shared.lbl}>{f.lbl}</span><input value={nuevaObra[f.key]} onChange={e=>setNuevaObra(p=>({...p,[f.key]:e.target.value}))} style={shared.inp} placeholder={f.ph}/></div>))}
            <div style={{marginBottom:12}}><span style={shared.lbl}>Sistema constructivo</span><select value={nuevaObra.sistema_constructivo} onChange={e=>setNuevaObra(p=>({...p,sistema_constructivo:e.target.value}))} style={shared.inp}>{SISTEMAS.map(s=><option key={s} value={s}>{s}</option>)}</select></div>
            <div style={{marginBottom:12}}><span style={shared.lbl}>Alcance</span><select value={nuevaObra.alcance} onChange={e=>setNuevaObra(p=>({...p,alcance:e.target.value}))} style={shared.inp}>{ALCANCES.map(a=><option key={a.v} value={a.v}>{a.label}</option>)}</select></div>
            <div style={{display:"flex",gap:12,marginBottom:12}}><div style={{flex:1}}><span style={shared.lbl}>Inicio</span><input type="date" value={nuevaObra.fecha_inicio_plan} onChange={e=>setNuevaObra(p=>({...p,fecha_inicio_plan:e.target.value}))} style={shared.inp}/></div><div style={{flex:1}}><span style={shared.lbl}>Fin</span><input type="date" value={nuevaObra.fecha_fin_plan} onChange={e=>setNuevaObra(p=>({...p,fecha_fin_plan:e.target.value}))} style={shared.inp}/></div></div>
            <div style={{marginBottom:16}}><span style={shared.lbl}>Responsable</span><select value={nuevaObra.jefe_id} onChange={e=>setNuevaObra(p=>({...p,jefe_id:e.target.value}))} style={shared.inp}><option value="">Sin asignar</option>{jefesList.map(j=><option key={j.id} value={j.id}>{j.nombre}</option>)}</select></div>
            <div style={{background:"#f0f4ff",borderRadius:10,padding:12,marginBottom:16,fontSize:12,color:"#3730a3"}}>📂 Se crearán las 6 carpetas en Google Drive automáticamente.</div>
            <div style={{display:"flex",gap:8}}><button onClick={crearObra} disabled={saving||!nuevaObra.nombre} style={{...shared.btn,flex:1}}>{saving?"Creando…":"Crear obra"}</button><button onClick={()=>setShowModal(false)} style={{...shared.btnSm,flex:1,padding:"10px"}}>Cancelar</button></div>
          </div>
        </div>
      )}
    </div>
  );
}
/* ════════════════ VISTA JEFE MOBILE ════════════════ */
function VistaJefe({ perfil, onLogout }) {
  const [obra,setObra]=useState(null);const [tareas,setTareas]=useState([]);const [parte,setParte]=useState(null);const [eventos,setEventos]=useState([]);const [avances,setAvances]=useState({});const [loading,setLoading]=useState(true);const [saving,setSaving]=useState(false);const [msg,setMsg]=useState("");const [tab,setTab]=useState("tareas");const [showEvt,setShowEvt]=useState(false);const [nuevoEvt,setNuevoEvt]=useState({tipo:"remito",descripcion:"",proveedor:"",numero_remito:"",conforme:true,dias_perdidos:""});
  const hoy=new Date().toISOString().slice(0,10);
  const cargar=useCallback(async()=>{
    setLoading(true);
    try{const tk=await getToken();const obras=await fetch(`${SUPA_URL}/obras_campo?jefe_id=eq.${perfil.id}&estado=eq.activa&select=*`,{headers:hdrs(tk)}).then(r=>r.json());const o=obras[0];if(!o){setLoading(false);return;}setObra(o);
    const[tArr,pArr]=await Promise.all([fetch(`${SUPA_URL}/tareas_obra?obra_id=eq.${o.id}&order=orden.asc`,{headers:hdrs(tk)}).then(r=>r.json()),fetch(`${SUPA_URL}/partes_diarios?obra_id=eq.${o.id}&fecha=eq.${hoy}&select=*`,{headers:hdrs(tk)}).then(r=>r.json())]);
    const tF=Array.isArray(tArr)?tArr:[];setTareas(tF);const p=pArr[0]||null;setParte(p);
    if(p){const evArr=await fetch(`${SUPA_URL}/eventos_parte?parte_id=eq.${p.id}&order=created_at.asc`,{headers:hdrs(tk)}).then(r=>r.json());setEventos(Array.isArray(evArr)?evArr:[]);}
    if(tF.length>0){const ids=tF.map(t=>t.id).join(",");const avArr=await fetch(`${SUPA_URL}/avances_tarea?tarea_id=in.(${ids})&order=created_at.desc`,{headers:hdrs(tk)}).then(r=>r.json());const avMap={};(Array.isArray(avArr)?avArr:[]).forEach(a=>{if(!avMap[a.tarea_id])avMap[a.tarea_id]=a;});setAvances(avMap);}}
    catch(e){console.error(e);}setLoading(false);
  },[perfil,hoy]);
  useEffect(()=>{cargar();},[cargar]);
  async function asegurarParte(){const tk=await getToken();if(parte)return{parte,tk};const ex=await fetch(`${SUPA_URL}/partes_diarios?obra_id=eq.${obra.id}&fecha=eq.${hoy}`,{headers:hdrs(tk)}).then(r=>r.json());if(Array.isArray(ex)&&ex.length>0){setParte(ex[0]);return{parte:ex[0],tk};}const r=await fetch(`${SUPA_URL}/partes_diarios`,{method:"POST",headers:hdrs(tk),body:JSON.stringify({obra_id:obra.id,fecha:hoy,jefe_id:perfil.id})});const rows=await r.json();const p=rows[0];setParte(p);return{parte:p,tk};}
  async function guardarParte(campo,valor){setSaving(true);try{const{parte:p,tk}=await asegurarParte();await fetch(`${SUPA_URL}/partes_diarios?id=eq.${p.id}`,{method:"PATCH",headers:hdrs(tk),body:JSON.stringify({[campo]:valor})});setParte(prev=>({...prev,[campo]:valor}));}catch(e){console.error(e);}setSaving(false);}
  async function guardarAvance(tareaId,pct){const{parte:p,tk}=await asegurarParte();const ex=avances[tareaId];let avId;if(ex){await fetch(`${SUPA_URL}/avances_tarea?id=eq.${ex.id}`,{method:"PATCH",headers:hdrs(tk),body:JSON.stringify({porcentaje:pct})});avId=ex.id;}else{const r=await fetch(`${SUPA_URL}/avances_tarea`,{method:"POST",headers:hdrs(tk),body:JSON.stringify({parte_id:p.id,tarea_id:tareaId,porcentaje:pct})});const rows=await r.json();avId=rows[0].id;}setAvances(prev=>({...prev,[tareaId]:{...prev[tareaId],id:avId,porcentaje:pct}}));setMsg("✓ Guardado");setTimeout(()=>setMsg(""),1500);}
  async function agregarEvento(){setSaving(true);try{const{parte:p,tk}=await asegurarParte();const body={parte_id:p.id,...nuevoEvt,dias_perdidos:nuevoEvt.dias_perdidos?parseFloat(nuevoEvt.dias_perdidos):null};const r=await fetch(`${SUPA_URL}/eventos_parte`,{method:"POST",headers:hdrs(tk),body:JSON.stringify(body)});const rows=await r.json();setEventos(prev=>[...prev,rows[0]]);setNuevoEvt({tipo:"remito",descripcion:"",proveedor:"",numero_remito:"",conforme:true,dias_perdidos:""});setShowEvt(false);setMsg("✓ Guardado");setTimeout(()=>setMsg(""),1500);}catch(e){console.error(e);}setSaving(false);}
  if(loading)return<div style={{display:"flex",alignItems:"center",justifyContent:"center",minHeight:"100vh",color:"#888",fontFamily:"system-ui"}}>Cargando…</div>;
  if(!obra)return<div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",minHeight:"100vh",fontFamily:"system-ui",gap:16}}><p style={{color:"#888"}}>No tenés obra activa asignada.</p><button onClick={onLogout} style={shared.btn}>Salir</button></div>;
  const avanceG=tareas.length>0?Math.round(tareas.reduce((s,t)=>s+(avances[t.id]?.porcentaje||0),0)/tareas.length):0;
  const porEtapa={};tareas.forEach(t=>{const e=t.etapa||"Sin etapa";if(!porEtapa[e])porEtapa[e]=[];porEtapa[e].push(t);});
  return(
    <div style={{fontFamily:"system-ui,-apple-system,sans-serif",minHeight:"100vh",background:"#f5f5f7",paddingBottom:32}}>
      <div style={{background:"#111",color:"#fff",padding:"16px 20px",position:"sticky",top:0,zIndex:10}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
          <div>{obra.codigo&&<div style={{fontSize:10,color:"#666",fontWeight:700,letterSpacing:1}}>{obra.codigo}</div>}<div style={{fontWeight:700,fontSize:17,marginTop:2}}>{obra.nombre}</div><div style={{fontSize:11,color:"#888"}}>{obra.sistema_constructivo}</div></div>
          <button onClick={onLogout} style={{background:"none",border:"none",color:"#666",cursor:"pointer",fontSize:12}}>Salir</button>
        </div>
        <div style={{marginTop:10}}><div style={{display:"flex",justifyContent:"space-between",fontSize:12,color:"#aaa",marginBottom:4}}><span>Avance general</span><span style={{fontWeight:700,color:"#fff",fontSize:14}}>{avanceG}%</span></div><div style={{height:6,background:"#333",borderRadius:3,overflow:"hidden"}}><div style={{height:"100%",width:`${avanceG}%`,background:"#22c55e",transition:"width .5s"}}/></div></div>
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
            const color=ETAPA_COLOR[etapa]||"#888";const pctE=Math.round(tArr.reduce((s,t)=>s+(avances[t.id]?.porcentaje||0),0)/tArr.length);
            return(<div key={etapa} style={{marginBottom:20}}>
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}><div style={{width:10,height:10,borderRadius:"50%",background:color}}/><span style={{fontWeight:700,fontSize:13,flex:1}}>{etapa}</span><span style={{fontSize:13,fontWeight:700,color}}>{pctE}%</span></div>
              {tArr.map(t=>{const pct=avances[t.id]?.porcentaje||0;return(
                <div key={t.id} style={{...shared.card,marginBottom:8,borderLeft:`4px solid ${color}`}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:6}}>
                    <div><div style={{display:"flex",alignItems:"center",gap:4}}>{t.codigo&&<span style={{fontSize:9,color:"#aaa",background:"#f0f0f0",borderRadius:3,padding:"0 4px"}}>{t.codigo}</span>}<span style={{fontWeight:600,fontSize:14}}>{t.nombre}</span></div></div>
                    <span style={{fontWeight:800,fontSize:18}}>{pct}%</span>
                  </div>
                  <div style={{height:5,background:"#f0f0f0",borderRadius:3,overflow:"hidden",marginBottom:8}}><div style={{height:"100%",width:`${pct}%`,background:pct===100?"#22c55e":color}}/></div>
                  <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>{[0,10,25,50,75,90,100].map(p=><button key={p} onClick={()=>guardarAvance(t.id,p)} style={{...shared.btnSm,minWidth:42,minHeight:38,fontWeight:700,fontSize:13,background:pct===p?color:"#f0f0f0",color:pct===p?"#fff":"#333"}}>{p}%</button>)}</div>
                </div>
              );})}
            </div>);
          })}
        </div>
      )}
      {tab==="parte"&&(
        <div style={{padding:"12px 16px"}}>
          <div style={{...shared.card,marginBottom:12}}><span style={shared.lbl}>Clima</span><div style={{display:"flex",gap:8,flexWrap:"wrap"}}>{CLIMAS.map(c=><button key={c.v} onClick={()=>guardarParte("clima",c.v)} style={{...shared.btnSm,minHeight:40,background:parte?.clima===c.v?"#111":"#f0f0f0",color:parte?.clima===c.v?"#fff":"#333"}}>{c.label}</button>)}</div></div>
          <div style={{...shared.card,marginBottom:12}}><span style={shared.lbl}>Personal y horas</span><div style={{display:"flex",gap:12}}><div style={{flex:1}}><label style={{fontSize:12,color:"#888",display:"block",marginBottom:4}}>Personas</label><input type="number" inputMode="numeric" min="0" defaultValue={parte?.personal_cantidad||""} onBlur={e=>guardarParte("personal_cantidad",parseInt(e.target.value)||null)} style={shared.inp} placeholder="0"/></div><div style={{flex:1}}><label style={{fontSize:12,color:"#888",display:"block",marginBottom:4}}>Horas</label><input type="number" inputMode="decimal" min="0" step="0.5" defaultValue={parte?.horas_trabajadas||""} onBlur={e=>guardarParte("horas_trabajadas",parseFloat(e.target.value)||null)} style={shared.inp} placeholder="0"/></div></div></div>
          <div style={{...shared.card}}><span style={shared.lbl}>Observaciones</span><textarea defaultValue={parte?.observaciones||""} onBlur={e=>guardarParte("observaciones",e.target.value)} placeholder="Novedades del día…" rows={5} style={{...shared.inp,resize:"vertical",lineHeight:1.6}}/></div>
        </div>
      )}
      {tab==="eventos"&&(
        <div style={{padding:"12px 16px"}}>
          <button onClick={()=>setShowEvt(!showEvt)} style={{...shared.btn,width:"100%",marginBottom:12}}>{showEvt?"Cancelar":"+ Agregar evento"}</button>
          {showEvt&&(<div style={{...shared.card,marginBottom:12,background:"#f8f8f8"}}>
            <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:12}}>{TIPOS_EVENTO.map(t=><button key={t.v} onClick={()=>setNuevoEvt(p=>({...p,tipo:t.v}))} style={{...shared.btnSm,minHeight:40,background:nuevoEvt.tipo===t.v?"#111":"#fff",color:nuevoEvt.tipo===t.v?"#fff":"#333",border:"1px solid #ddd"}}>{t.label}</button>)}</div>
            {nuevoEvt.tipo==="remito"&&<><input placeholder="Proveedor" value={nuevoEvt.proveedor} onChange={e=>setNuevoEvt(p=>({...p,proveedor:e.target.value}))} style={{...shared.inp,marginBottom:10}}/><input placeholder="N° Remito" value={nuevoEvt.numero_remito} onChange={e=>setNuevoEvt(p=>({...p,numero_remito:e.target.value}))} style={{...shared.inp,marginBottom:10}}/><div style={{display:"flex",gap:10,marginBottom:10,alignItems:"center"}}><span>Conforme:</span><button onClick={()=>setNuevoEvt(p=>({...p,conforme:true}))} style={{...shared.btnSm,minHeight:40,background:nuevoEvt.conforme?"#111":"#f0f0f0",color:nuevoEvt.conforme?"#fff":"#333"}}>✓ Sí</button><button onClick={()=>setNuevoEvt(p=>({...p,conforme:false}))} style={{...shared.btnSm,minHeight:40,background:nuevoEvt.conforme===false?"#e53":"#f0f0f0",color:nuevoEvt.conforme===false?"#fff":"#333"}}>✗ No</button></div></>}
            {nuevoEvt.tipo==="paralizacion"&&<input type="number" inputMode="decimal" step="0.5" placeholder="Días perdidos" value={nuevoEvt.dias_perdidos} onChange={e=>setNuevoEvt(p=>({...p,dias_perdidos:e.target.value}))} style={{...shared.inp,marginBottom:10}}/>}
            <textarea placeholder="Descripción" value={nuevoEvt.descripcion} onChange={e=>setNuevoEvt(p=>({...p,descripcion:e.target.value}))} rows={3} style={{...shared.inp,resize:"vertical",marginBottom:12}}/>
            <button onClick={agregarEvento} style={{...shared.btn,width:"100%"}}>Guardar evento</button>
          </div>)}
          {eventos.length===0&&!showEvt&&<div style={{textAlign:"center",color:"#aaa",fontSize:14,padding:"32px 0"}}>Sin eventos hoy</div>}
          {eventos.map(ev=>(<div key={ev.id} style={{...shared.card,marginBottom:10,borderLeft:"4px solid #111"}}><div style={{fontWeight:600,fontSize:14}}>{TIPOS_EVENTO.find(t=>t.v===ev.tipo)?.label||ev.tipo}</div>{ev.proveedor&&<div style={{fontSize:13,color:"#666",marginTop:4}}>Prov: {ev.proveedor} · {ev.numero_remito} · {ev.conforme?"✓":"✗"}</div>}{ev.dias_perdidos&&<div style={{fontSize:13,color:"#e53",marginTop:4}}>⏸ {ev.dias_perdidos} días</div>}{ev.descripcion&&<div style={{fontSize:14,marginTop:6}}>{ev.descripcion}</div>}</div>))}
        </div>
      )}
    </div>
  );
}

/* ════════════════ EXPORT ════════════════ */
export default function Obras({ perfil, onLogout, deepLinkId }) {
  if(!perfil)return<div style={{display:"flex",alignItems:"center",justifyContent:"center",minHeight:"100vh",color:"#aaa",fontFamily:"system-ui"}}>Cargando…</div>;
  if(perfil.rol==="jefe_obra")return<VistaJefe perfil={perfil} onLogout={onLogout}/>;
  return<VistaAdmin deepLinkId={deepLinkId}/>;
}
