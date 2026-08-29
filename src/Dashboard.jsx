import React, { useEffect, useState, useCallback } from "react";
import { supabase } from "./supabase.js";

const SUPA_URL = "https://imkmosifqxzbtqgzssst.supabase.co/rest/v1";
const ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlta21vc2lmcXh6YnRxZ3pzc3N0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkxODk4NTUsImV4cCI6MjA5NDc2NTg1NX0.5gtCs8Yv3vDSrKxAmXSr3zjWJ5HjimCKejfO-XrHPss";

async function getToken() {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token || ANON_KEY;
}
function hdrs(tk) {
  return { apikey: ANON_KEY, Authorization: `Bearer ${tk}`, "Content-Type": "application/json" };
}
function fmtMonto(v) {
  if (!v) return "—";
  const n = parseFloat(v);
  if (n >= 1000000) return `$${(n/1000000).toFixed(1)}M`;
  if (n >= 1000) return `$${(n/1000).toFixed(0)}k`;
  return `$${n.toLocaleString("es-AR")}`;
}
function fmtFecha(d) {
  if (!d) return "—";
  return new Date(d + "T12:00").toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit" });
}
function tiempoRelativo(d) {
  const diff = Math.floor((new Date() - new Date(d)) / 60000);
  if (diff < 60) return `${diff}m`;
  if (diff < 1440) return `${Math.floor(diff/60)}h`;
  return `${Math.floor(diff/1440)}d`;
}

// Mini barra de progreso
function MiniBar({ value, max, color = "#3b82f6", height = 4 }) {
  const pct = max > 0 ? Math.min(100, Math.round(value / max * 100)) : 0;
  return (
    <div style={{ height, background: "#f0f0f0", borderRadius: 2, overflow: "hidden" }}>
      <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: 2, transition: "width 0.4s" }} />
    </div>
  );
}

// KPI card
function KpiCard({ icon, label, value, sub, color = "#111", onClick, trend }) {
  return (
    <div onClick={onClick} style={{ background: "#fff", border: "1.5px solid #e8e8e8", borderRadius: 12, padding: "12px 16px", cursor: onClick ? "pointer" : "default", transition: "all 0.1s" }}
      onMouseEnter={e => onClick && (e.currentTarget.style.borderColor = "#3b82f6")}
      onMouseLeave={e => onClick && (e.currentTarget.style.borderColor = "#e8e8e8")}>
      <div style={{ fontSize: 18, marginBottom: 4 }}>{icon}</div>
      <div style={{ fontSize: 24, fontWeight: 900, color, fontFamily: "monospace", lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 10, color: "#aaa", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.4, marginTop: 2 }}>{label}</div>
      {sub && <div style={{ fontSize: 11, color: "#bbb", marginTop: 3 }}>{sub}</div>}
      {trend !== undefined && (
        <div style={{ fontSize: 11, color: trend >= 0 ? "#1a8a5e" : "#c0392b", marginTop: 3, fontWeight: 600 }}>
          {trend >= 0 ? "↑" : "↓"} {Math.abs(trend)}% vs mes anterior
        </div>
      )}
    </div>
  );
}

export default function Dashboard({ onNav }) {
  const [perfil, setPerfil] = useState(null);
  const [presupuestos, setPresupuestos] = useState([]);
  const [proyectos, setProyectos] = useState([]);
  const [calculistas, setCalculistas] = useState([]);
  const [cobros, setCobros] = useState([]);
  const [honorarios, setHonorarios] = useState([]);
  const [inbox, setInbox] = useState([]);
  const [inboxAbierto, setInboxAbierto] = useState(null);
  const [inboxMensajes, setInboxMensajes] = useState([]);
  const [inboxReply, setInboxReply] = useState("");
  const [loadingInbox, setLoadingInbox] = useState(false);
  const [loading, setLoading] = useState(true);
  const [tc, setTc] = useState(null);
  const [seccion, setSeccion] = useState("general"); // general | equipo | tiempos | financiero

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const { data } = await supabase.from("perfiles").select("*").eq("id", session.user.id).single();
        setPerfil(data);
      }
    })();
    fetch("https://dolarapi.com/v1/dolares/bolsa").then(r => r.json()).then(d => setTc(d.venta)).catch(() => {});
  }, []);

  const cargar = useCallback(async () => {
    setLoading(true);
    const tk = await getToken();
    const [presR, proyR, calcR, cobrosR, honR, msgsR] = await Promise.all([
      fetch(`${SUPA_URL}/presupuestos?archivado=is.false&order=created_at.desc&limit=300`, { headers: hdrs(tk) }).then(r => r.json()),
      fetch(`${SUPA_URL}/proyectos?archivado=is.false&order=created_at.desc`, { headers: hdrs(tk) }).then(r => r.json()),
      fetch(`${SUPA_URL}/calculistas?order=nombre.asc`, { headers: hdrs(tk) }).then(r => r.json()),
      fetch(`${SUPA_URL}/proyecto_cobros?order=fecha_cobro.desc&limit=200`, { headers: hdrs(tk) }).then(r => r.json()),
      fetch(`${SUPA_URL}/proyecto_honorarios?order=created_at.desc`, { headers: hdrs(tk) }).then(r => r.json()),
      fetch(`${SUPA_URL}/tarea_mensajes?order=created_at.desc&limit=200`, { headers: hdrs(tk) }).then(r => r.json()),
    ]);
    setPresupuestos(Array.isArray(presR) ? presR : []);
    setProyectos(Array.isArray(proyR) ? proyR : []);
    setCalculistas(Array.isArray(calcR) ? calcR : []);
    setCobros(Array.isArray(cobrosR) ? cobrosR : []);
    setHonorarios(Array.isArray(honR) ? honR : []);

    const msgs = Array.isArray(msgsR) ? msgsR : [];
    const proyMap = {};
    msgs.forEach(m => {
      if (!proyMap[m.proyecto_id]) proyMap[m.proyecto_id] = { proyecto_id: m.proyecto_id, mensajes: [], ultimo: m };
      proyMap[m.proyecto_id].mensajes.push(m);
    });
    const proyIds = Object.keys(proyMap);
    if (proyIds.length > 0) {
      const pi = await fetch(`${SUPA_URL}/proyectos?id=in.(${proyIds.join(",")})&select=id,descripcion,codigo,numero_proyecto,encargado,estado`, { headers: hdrs(tk) }).then(r => r.json());
      (Array.isArray(pi) ? pi : []).forEach(p => { if (proyMap[p.id]) proyMap[p.id].proyecto = p; });
    }
    setInbox(Object.values(proyMap).sort((a, b) => new Date(b.ultimo.created_at) - new Date(a.ultimo.created_at)));
    setLoading(false);
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  async function cargarMensajesProyecto(proyId) {
    setLoadingInbox(true);
    const tk = await getToken();
    const msgs = await fetch(`${SUPA_URL}/tarea_mensajes?proyecto_id=eq.${proyId}&order=created_at.asc`, { headers: hdrs(tk) }).then(r => r.json());
    setInboxMensajes(Array.isArray(msgs) ? msgs : []);
    setLoadingInbox(false);
  }

  async function responderInbox() {
    if (!inboxReply.trim() || !inboxAbierto || !perfil) return;
    const tk = await getToken();
    const item = inbox.find(i => i.proyecto_id === inboxAbierto);
    await fetch(`${SUPA_URL}/tarea_mensajes`, {
      method: "POST", headers: hdrs(tk),
      body: JSON.stringify({ proyecto_id: inboxAbierto, tarea_id: item?.ultimo?.tarea_id, autor: perfil.nombre, rol: perfil.rol, mensaje: inboxReply.trim() })
    });
    setInboxReply("");
    await cargarMensajesProyecto(inboxAbierto);
    cargar();
  }

  // ── Métricas ──
  const HOY = new Date().toISOString().slice(0, 10);
  const mesActual = HOY.slice(0, 7);
  const mesAnterior = (() => { const d = new Date(); d.setMonth(d.getMonth() - 1); return d.toISOString().slice(0, 7); })();

  // PRESUPUESTOS
  const presAprobados = presupuestos.filter(p => p.estado === "aprobado");
  const presAprobadosMes = presAprobados.filter(p => (p.fecha_aprobacion || "").slice(0, 7) === mesActual);
  const presAprobadosMesAnt = presAprobados.filter(p => (p.fecha_aprobacion || "").slice(0, 7) === mesAnterior);
  const presEnviados = presupuestos.filter(p => ["enviado", "negociacion"].includes(p.estado));
  const montoAprobadoMes = presAprobadosMes.reduce((s, p) => s + (parseFloat(p.monto) || 0), 0);
  const montoAprobadoMesAnt = presAprobadosMesAnt.reduce((s, p) => s + (parseFloat(p.monto) || 0), 0);
  const emitidosMes = presupuestos.filter(p => p.estado !== "borrador" && !p.archivado && (p.fecha_emision || "").slice(0, 7) === mesActual).length;
  const tasaPct = emitidosMes > 0 ? Math.round(presAprobadosMes.length / emitidosMes * 100) : null;
  const recontactar = presEnviados.filter(p => {
    const ref = p.fecha_ultimo_contacto || p.fecha_emision;
    return ref && Math.floor((new Date() - new Date(ref + "T12:00")) / 86400000) >= 7;
  });

  // PROYECTOS
  const proyActivos = proyectos.filter(p => p.estado === "activo" && !p.archivado);
  const proyOnboarding = proyectos.filter(p => p.estado === "onboarding" && !p.archivado);
  const proyRevision = proyectos.filter(p => p.estado === "revision" && !p.archivado);
  const proyEntregados = proyectos.filter(p => p.estado === "entregado" && !p.archivado);
  const proyEntregadosMes = proyEntregados.filter(p => (p.fecha_entrega_real || "").slice(0, 7) === mesActual);
  const proyVencidos = proyectos.filter(p => p.fecha_entrega_plan && p.fecha_entrega_plan < HOY && !["entregado"].includes(p.estado) && !p.archivado);
  const proyProximos7 = proyectos.filter(p => {
    if (!p.fecha_entrega_plan || p.estado === "entregado") return false;
    const dias = Math.ceil((new Date(p.fecha_entrega_plan + "T12:00") - new Date()) / 86400000);
    return dias >= 0 && dias <= 7;
  });
  const proyNuevosMes = proyectos.filter(p => (p.created_at || "").slice(0, 7) === mesActual);

  // TIEMPOS
  const tiemposEntrega = proyEntregados
    .filter(p => p.fecha_inicio_real && p.fecha_entrega_real)
    .map(p => Math.ceil((new Date(p.fecha_entrega_real + "T12:00") - new Date(p.fecha_inicio_real + "T12:00")) / 86400000));
  const promDias = tiemposEntrega.length > 0 ? Math.round(tiemposEntrega.reduce((s, d) => s + d, 0) / tiemposEntrega.length) : null;
  const entregadosATiempo = proyEntregados.filter(p => p.fecha_entrega_plan && p.fecha_entrega_real && p.fecha_entrega_real <= p.fecha_entrega_plan).length;
  const tasaATiempo = proyEntregados.length > 0 ? Math.round(entregadosATiempo / proyEntregados.length * 100) : null;

  // EQUIPO
  const calcActivos = calculistas.filter(c => c.estado === "activo");
  const calcDisponibles = calculistas.filter(c => c.disponible && c.estado === "activo");
  const calcOcupados = calcActivos.filter(c => !c.disponible);
  const calcPostulantes = calculistas.filter(c => c.estado === "postulante");
  const cargaPorCalc = calcActivos.map(c => ({
    ...c,
    proyectos: proyectos.filter(p => p.encargado === c.nombre && ["onboarding","activo","revision"].includes(p.estado)).length,
    vencidos: proyectos.filter(p => p.encargado === c.nombre && p.fecha_entrega_plan && p.fecha_entrega_plan < HOY && p.estado !== "entregado").length,
  })).sort((a, b) => b.proyectos - a.proyectos);
  const maxCarga = Math.max(...cargaPorCalc.map(c => c.proyectos), 1);

  // FINANCIERO
  const totalCobrado = cobros.reduce((s, c) => s + parseFloat(c.monto || 0), 0);
  const cobradoMes = cobros.filter(c => (c.fecha_cobro || "").slice(0, 7) === mesActual).reduce((s, c) => s + parseFloat(c.monto || 0), 0);
  const honorariosPendientes = honorarios.filter(h => h.estado !== "pagado").reduce((s, h) => s + parseFloat(h.monto || 0), 0);
  const montoProyActivos = proyActivos.reduce((s, p) => s + parseFloat(p.monto_anticipo || 0) + parseFloat(p.monto_saldo || 0), 0);
  const sinResponder = inbox.filter(i => i.ultimo?.rol !== "admin");

  // Tendencia monto aprobado
  const tendenciaMonto = montoAprobadoMesAnt > 0 ? Math.round((montoAprobadoMes - montoAprobadoMesAnt) / montoAprobadoMesAnt * 100) : null;

  // Alertas
  const alertas = [];
  if (recontactar.length > 0) alertas.push({ tipo: "warning", msg: `${recontactar.length} presupuesto${recontactar.length > 1 ? "s" : ""} para recontactar`, modulo: "presupuestos" });
  if (proyVencidos.length > 0) alertas.push({ tipo: "danger", msg: `${proyVencidos.length} proyecto${proyVencidos.length > 1 ? "s" : ""} vencido${proyVencidos.length > 1 ? "s" : ""}`, modulo: "proyectos" });
  if (proyProximos7.length > 0) alertas.push({ tipo: "warning", msg: `${proyProximos7.length} proyecto${proyProximos7.length > 1 ? "s" : ""} vence en ≤7 días`, modulo: "proyectos" });
  if (calcPostulantes.length > 0) alertas.push({ tipo: "info", msg: `${calcPostulantes.length} postulante${calcPostulantes.length > 1 ? "s" : ""} sin revisar`, modulo: "calculistas" });
  if (sinResponder.length > 0) alertas.push({ tipo: "purple", msg: `${sinResponder.length} conversación${sinResponder.length > 1 ? "es" : ""} sin respuesta`, modulo: null });

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh", fontFamily: "system-ui", color: "#aaa", fontSize: 14 }}>
      Cargando dashboard…
    </div>
  );

  const S = {
    card: { background: "#fff", border: "1.5px solid #e8e8e8", borderRadius: 12, padding: "14px 16px" },
    secBtn: (id) => ({
      padding: "6px 16px", borderRadius: 8, border: "none", fontSize: 12, fontWeight: seccion === id ? 700 : 500,
      background: seccion === id ? "#0a0a0a" : "#f0f0f0", color: seccion === id ? "#fff" : "#666", cursor: "pointer",
    }),
  };

  return (
    <div style={{ fontFamily: "system-ui, -apple-system, sans-serif", padding: "20px", maxWidth: 1200, margin: "0 auto" }}>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
        <div>
          <p style={{ margin: 0, fontSize: 11, color: "#aaa" }}>NPL Ingeniería Civil</p>
          <h1 style={{ margin: "2px 0 0", fontSize: 22, fontWeight: 900, color: "#111" }}>
            Buenos días{perfil?.nombre ? `, ${perfil.nombre.split(" ")[0]}` : ""} 👋
          </h1>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: "#888" }}>
            {new Date().toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" })}
            {tc && <span style={{ marginLeft: 10, background: "#f8f8f8", borderRadius: 5, padding: "1px 8px", fontSize: 11, color: "#888" }}>💵 MEP ${tc.toLocaleString("es-AR")}</span>}
          </p>
        </div>
        <button onClick={cargar} style={{ padding: "7px 14px", background: "#f0f0f0", border: "none", borderRadius: 8, fontSize: 12, cursor: "pointer", color: "#555", fontWeight: 600 }}>↺ Actualizar</button>
      </div>

      {/* Alertas */}
      {alertas.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 20 }}>
          {alertas.map((a, i) => {
            const colores = {
              warning: { bg: "#fffbeb", border: "#f59e0b", color: "#c4781a", icon: "⚠️" },
              danger:  { bg: "#fef2f2", border: "#c0392b", color: "#c0392b", icon: "🔴" },
              info:    { bg: "#eff6ff", border: "#3b82f6", color: "#3b82f6", icon: "ℹ️" },
              purple:  { bg: "#ede9fe", border: "#6366f1", color: "#6366f1", icon: "💬" },
            };
            const c = colores[a.tipo] || colores.info;
            return (
              <div key={i} onClick={() => a.modulo && onNav && onNav(a.modulo)}
                style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 14px", background: c.bg, border: `1.5px solid ${c.border}30`, borderRadius: 9, cursor: a.modulo ? "pointer" : "default" }}>
                <span>{c.icon}</span>
                <span style={{ fontSize: 13, color: c.color, fontWeight: 600 }}>{a.msg}</span>
                {a.modulo && <span style={{ marginLeft: "auto", fontSize: 11, color: c.color }}>Ver →</span>}
              </div>
            );
          })}
        </div>
      )}

      {/* Tabs de sección */}
      <div style={{ display: "flex", gap: 6, marginBottom: 20 }}>
        {[["general","📊 General"],["equipo","👷 Equipo"],["tiempos","⏱ Tiempos"],["financiero","💰 Financiero"]].map(([id, label]) => (
          <button key={id} onClick={() => setSeccion(id)} style={S.secBtn(id)}>{label}</button>
        ))}
      </div>

      {/* ── SECCIÓN GENERAL ── */}
      {seccion === "general" && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 10, marginBottom: 20 }}>
            <KpiCard icon="✅" label="Aprobado este mes" value={fmtMonto(montoAprobadoMes)} sub={tc && montoAprobadoMes ? `U$S ${Math.round(montoAprobadoMes/tc).toLocaleString("es-AR")}` : null} color="#1a8a5e" trend={tendenciaMonto} onClick={() => onNav && onNav("presupuestos")} />
            <KpiCard icon="📈" label="Conversión mes" value={tasaPct !== null ? `${tasaPct}%` : "—"} sub={`${presAprobadosMes.length} aprobados / ${emitidosMes} emitidos`} color={tasaPct >= 50 ? "#1a8a5e" : tasaPct >= 30 ? "#f59e0b" : "#c0392b"} />
            <KpiCard icon="📐" label="Proyectos activos" value={proyActivos.length} sub={`${proyOnboarding.length} onboarding · ${proyRevision.length} revisión`} color="#3b82f6" onClick={() => onNav && onNav("proyectos")} />
            <KpiCard icon="📦" label="Entregados este mes" value={proyEntregadosMes.length} sub={`Total: ${proyEntregados.length} entregados`} color="#1a8a5e" />
            <KpiCard icon="⚠️" label="En riesgo" value={proyVencidos.length + proyProximos7.length} sub={`${proyVencidos.length} vencidos · ${proyProximos7.length} ≤7d`} color={proyVencidos.length > 0 ? "#c0392b" : "#f59e0b"} onClick={() => onNav && onNav("planificacion")} />
            <KpiCard icon="💰" label="Cobrado este mes" value={fmtMonto(cobradoMes)} sub={`Total: ${fmtMonto(totalCobrado)}`} color="#1a8a5e" />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            {/* Proyectos activos */}
            <div style={S.card}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
                <span style={{ fontSize: 14, fontWeight: 800 }}>📐 Proyectos en curso</span>
                <button onClick={() => onNav && onNav("proyectos")} style={{ fontSize: 11, color: "#3b82f6", background: "none", border: "none", cursor: "pointer" }}>Ver todos →</button>
              </div>
              {proyectos.filter(p => ["onboarding","activo","revision"].includes(p.estado)).slice(0, 6).map(p => {
                const ECOLOR = { onboarding: "#f59e0b", activo: "#3b82f6", revision: "#6366f1" };
                const color = ECOLOR[p.estado] || "#888";
                const dias = p.fecha_entrega_plan ? Math.ceil((new Date(p.fecha_entrega_plan + "T12:00") - new Date()) / 86400000) : null;
                return (
                  <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 0", borderBottom: "1px solid #f5f5f5" }}>
                    <div style={{ width: 4, height: 28, borderRadius: 2, background: color, flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.descripcion}</div>
                      <div style={{ fontSize: 10, color: "#aaa" }}>{p.encargado || "Sin asignar"}</div>
                    </div>
                    {dias !== null && <span style={{ fontSize: 10, fontWeight: 700, color: dias < 0 ? "#c0392b" : dias <= 7 ? "#f59e0b" : "#aaa" }}>{dias < 0 ? `${Math.abs(dias)}d vencido` : `${dias}d`}</span>}
                  </div>
                );
              })}
            </div>

            {/* Presupuestos recientes */}
            <div style={S.card}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
                <span style={{ fontSize: 14, fontWeight: 800 }}>💰 Presupuestos recientes</span>
                <button onClick={() => onNav && onNav("presupuestos")} style={{ fontSize: 11, color: "#3b82f6", background: "none", border: "none", cursor: "pointer" }}>Ver todos →</button>
              </div>
              {presupuestos.slice(0, 7).map(p => {
                const ECOLOR = { aprobado: "#1a8a5e", enviado: "#3b82f6", negociacion: "#f59e0b", rechazado: "#c0392b", borrador: "#aaa" };
                const color = ECOLOR[p.estado] || "#888";
                return (
                  <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0", borderBottom: "1px solid #f5f5f5" }}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: color, flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.descripcion || p.cliente || "—"}</div>
                      <div style={{ fontSize: 10, color: "#aaa" }}>{p.cliente}</div>
                    </div>
                    {p.monto && <span style={{ fontSize: 11, fontWeight: 700, fontFamily: "monospace", color }}>{fmtMonto(p.monto)}</span>}
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}

      {/* ── SECCIÓN EQUIPO ── */}
      {seccion === "equipo" && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 10, marginBottom: 20 }}>
            <KpiCard icon="👷" label="Calculistas activos" value={calcActivos.length} sub={`${calcDisponibles.length} disponibles · ${calcOcupados.length} ocupados`} color="#6366f1" />
            <KpiCard icon="✅" label="Disponibles ahora" value={calcDisponibles.length} sub={calcActivos.length > 0 ? `${Math.round(calcDisponibles.length/calcActivos.length*100)}% del equipo` : "—"} color="#1a8a5e" />
            <KpiCard icon="📋" label="Postulantes" value={calcPostulantes.length} sub="Sin revisar" color="#3b82f6" onClick={() => onNav && onNav("calculistas")} />
            <KpiCard icon="📐" label="Proyectos por calc." value={calcActivos.length > 0 ? (proyActivos.length / calcActivos.length).toFixed(1) : "—"} sub="promedio activos" color="#f59e0b" />
          </div>

          <div style={S.card}>
            <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 14 }}>Carga de trabajo por calculista</div>
            {cargaPorCalc.length === 0 && <p style={{ color: "#aaa", fontSize: 13 }}>Sin calculistas activos</p>}
            {cargaPorCalc.map(c => (
              <div key={c.id} style={{ marginBottom: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ width: 28, height: 28, borderRadius: "50%", background: c.disponible ? "#1a8a5e" : "#e0e0e0", color: c.disponible ? "#fff" : "#aaa", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800 }}>
                      {c.nombre[0].toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700 }}>{c.nombre}</div>
                      <div style={{ fontSize: 10, color: "#aaa" }}>{c.nivel || "Calculista"} · {c.disponible ? "✓ Disponible" : "Ocupado"}</div>
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 16, fontWeight: 900, color: c.proyectos > 5 ? "#c0392b" : c.proyectos > 3 ? "#f59e0b" : "#1a8a5e" }}>{c.proyectos}</div>
                    <div style={{ fontSize: 10, color: "#aaa" }}>proyectos</div>
                  </div>
                </div>
                <MiniBar value={c.proyectos} max={maxCarga} color={c.proyectos > 5 ? "#c0392b" : c.proyectos > 3 ? "#f59e0b" : "#1a8a5e"} height={6} />
                {c.vencidos > 0 && <div style={{ fontSize: 10, color: "#c0392b", marginTop: 3, fontWeight: 700 }}>⚠️ {c.vencidos} proyecto{c.vencidos > 1 ? "s" : ""} vencido{c.vencidos > 1 ? "s" : ""}</div>}
                {/* Proyectos de este calculista */}
                <div style={{ marginTop: 6, display: "flex", gap: 4, flexWrap: "wrap" }}>
                  {proyectos.filter(p => p.encargado === c.nombre && ["onboarding","activo","revision"].includes(p.estado)).map(p => {
                    const dias = p.fecha_entrega_plan ? Math.ceil((new Date(p.fecha_entrega_plan + "T12:00") - new Date()) / 86400000) : null;
                    return (
                      <span key={p.id} style={{ fontSize: 10, padding: "2px 8px", borderRadius: 5, background: dias !== null && dias < 0 ? "#fef2f2" : dias !== null && dias <= 7 ? "#fffbeb" : "#f8f8f8", border: `1px solid ${dias !== null && dias < 0 ? "#fecaca" : dias !== null && dias <= 7 ? "#fde68a" : "#e8e8e8"}`, color: "#555" }}>
                        {p.descripcion?.slice(0, 20)}{dias !== null ? ` (${dias < 0 ? "venc." : `${dias}d`})` : ""}
                      </span>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* ── SECCIÓN TIEMPOS ── */}
      {seccion === "tiempos" && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 10, marginBottom: 20 }}>
            <KpiCard icon="⏱" label="Tiempo promedio entrega" value={promDias !== null ? `${promDias}d` : "—"} sub="desde inicio a entrega" color="#6366f1" />
            <KpiCard icon="✅" label="Entregados a tiempo" value={tasaATiempo !== null ? `${tasaATiempo}%` : "—"} sub={`${entregadosATiempo} de ${proyEntregados.length}`} color={tasaATiempo >= 80 ? "#1a8a5e" : tasaATiempo >= 60 ? "#f59e0b" : "#c0392b"} />
            <KpiCard icon="🔴" label="Vencidos" value={proyVencidos.length} sub="con fecha pasada" color={proyVencidos.length > 0 ? "#c0392b" : "#1a8a5e"} onClick={() => onNav && onNav("planificacion")} />
            <KpiCard icon="🟡" label="Vencen en 7 días" value={proyProximos7.length} sub="en riesgo inmediato" color={proyProximos7.length > 0 ? "#f59e0b" : "#1a8a5e"} />
            <KpiCard icon="📦" label="Entregados este mes" value={proyEntregadosMes.length} sub={`Total histórico: ${proyEntregados.length}`} color="#1a8a5e" />
            <KpiCard icon="🆕" label="Nuevos este mes" value={proyNuevosMes.length} sub="proyectos iniciados" color="#3b82f6" />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            {/* Proyectos vencidos */}
            <div style={S.card}>
              <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 12, color: "#c0392b" }}>🔴 Proyectos vencidos</div>
              {proyVencidos.length === 0 ? <p style={{ color: "#1a8a5e", fontSize: 13 }}>✅ Sin proyectos vencidos</p> :
                proyVencidos.map(p => {
                  const dias = Math.ceil((new Date() - new Date(p.fecha_entrega_plan + "T12:00")) / 86400000);
                  return (
                    <div key={p.id} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid #f5f5f5" }}>
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 600 }}>{p.descripcion}</div>
                        <div style={{ fontSize: 10, color: "#aaa" }}>{p.encargado || "Sin asignar"}</div>
                      </div>
                      <span style={{ fontSize: 11, fontWeight: 800, color: "#c0392b" }}>{dias}d vencido</span>
                    </div>
                  );
                })
              }
            </div>

            {/* Próximos a vencer */}
            <div style={S.card}>
              <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 12, color: "#f59e0b" }}>🟡 Vencen próximamente</div>
              {proyProximos7.length === 0 ? <p style={{ color: "#1a8a5e", fontSize: 13 }}>✅ Sin vencimientos próximos</p> :
                proyProximos7.map(p => {
                  const dias = Math.ceil((new Date(p.fecha_entrega_plan + "T12:00") - new Date()) / 86400000);
                  return (
                    <div key={p.id} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid #f5f5f5" }}>
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 600 }}>{p.descripcion}</div>
                        <div style={{ fontSize: 10, color: "#aaa" }}>{p.encargado || "Sin asignar"} · {fmtFecha(p.fecha_entrega_plan)}</div>
                      </div>
                      <span style={{ fontSize: 11, fontWeight: 800, color: dias <= 3 ? "#c0392b" : "#f59e0b" }}>{dias === 0 ? "HOY" : `${dias}d`}</span>
                    </div>
                  );
                })
              }
            </div>
          </div>
        </>
      )}

      {/* ── SECCIÓN FINANCIERO ── */}
      {seccion === "financiero" && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 10, marginBottom: 20 }}>
            <KpiCard icon="💰" label="Cobrado este mes" value={fmtMonto(cobradoMes)} sub={`Total: ${fmtMonto(totalCobrado)}`} color="#1a8a5e" />
            <KpiCard icon="📊" label="Aprobado este mes" value={fmtMonto(montoAprobadoMes)} sub={tc ? `U$S ${Math.round(montoAprobadoMes/tc).toLocaleString("es-AR")}` : null} color="#1a8a5e" trend={tendenciaMonto} />
            <KpiCard icon="⏳" label="Hon. pendientes" value={fmtMonto(honorariosPendientes)} sub="calculistas sin pagar" color="#f59e0b" />
            <KpiCard icon="📈" label="Conversión mes" value={tasaPct !== null ? `${tasaPct}%` : "—"} sub={`${presAprobadosMes.length} de ${emitidosMes} emitidos`} color={tasaPct >= 50 ? "#1a8a5e" : "#f59e0b"} />
            <KpiCard icon="📋" label="En seguimiento" value={presEnviados.length} sub={`${recontactar.length} para recontactar`} color={recontactar.length > 0 ? "#f59e0b" : "#888"} onClick={() => onNav && onNav("presupuestos")} />
            <KpiCard icon="💵" label="MEP hoy" value={tc ? `$${tc.toLocaleString("es-AR")}` : "—"} sub="tipo de cambio bolsa" color="#888" />
          </div>

          <div style={S.card}>
            <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 14 }}>Honorarios pendientes por calculista</div>
            {calcActivos.filter(c => {
              return honorarios.some(h => h.calculista === c.nombre && h.estado !== "pagado");
            }).map(c => {
              const hons = honorarios.filter(h => h.calculista === c.nombre && h.estado !== "pagado");
              const total = hons.reduce((s, h) => s + parseFloat(h.monto || 0), 0);
              return (
                <div key={c.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid #f5f5f5" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ width: 26, height: 26, borderRadius: "50%", background: "#6366f1", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800 }}>
                      {c.nombre[0]}
                    </div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{c.nombre}</div>
                      <div style={{ fontSize: 10, color: "#aaa" }}>{hons.length} proyecto{hons.length > 1 ? "s" : ""}</div>
                    </div>
                  </div>
                  <span style={{ fontSize: 14, fontWeight: 800, color: "#f59e0b", fontFamily: "monospace" }}>{fmtMonto(total)}</span>
                </div>
              );
            })}
            {calcActivos.filter(c => honorarios.some(h => h.calculista === c.nombre && h.estado !== "pagado")).length === 0 && (
              <p style={{ color: "#1a8a5e", fontSize: 13 }}>✅ Sin honorarios pendientes</p>
            )}
          </div>
        </>
      )}

      {/* ── INBOX ── */}
      <div style={{ ...S.card, marginTop: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
          <span style={{ fontSize: 16 }}>💬</span>
          <h2 style={{ margin: 0, fontSize: 15, fontWeight: 800 }}>Comunicaciones</h2>
          {sinResponder.length > 0 && <span style={{ fontSize: 11, background: "#6366f1", color: "#fff", borderRadius: 20, padding: "2px 9px", fontWeight: 700 }}>{sinResponder.length} sin responder</span>}
          <span style={{ marginLeft: "auto", fontSize: 11, color: "#aaa" }}>{inbox.length} proyectos</span>
        </div>
        {inbox.length === 0 ? (
          <div style={{ textAlign: "center", padding: 24, color: "#ccc" }}>Sin mensajes aún</div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: inboxAbierto ? "300px 1fr" : "1fr", gap: 12 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {inbox.map(item => {
                const p = item.proyecto;
                const sel = inboxAbierto === item.proyecto_id;
                const sinResp = item.ultimo?.rol !== "admin";
                return (
                  <div key={item.proyecto_id} onClick={async () => {
                    if (sel) { setInboxAbierto(null); return; }
                    setInboxAbierto(item.proyecto_id);
                    await cargarMensajesProyecto(item.proyecto_id);
                  }} style={{ padding: "9px 12px", borderRadius: 9, cursor: "pointer", border: `1.5px solid ${sel ? "#6366f1" : sinResp ? "#c4b5fd" : "#e8e8e8"}`, background: sel ? "#ede9fe" : sinResp ? "#faf5ff" : "#fff" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                      <div style={{ fontWeight: 700, fontSize: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "75%" }}>{p?.descripcion || "Proyecto"}</div>
                      <div style={{ display: "flex", gap: 5, alignItems: "center", flexShrink: 0 }}>
                        {sinResp && <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#6366f1", display: "inline-block" }} />}
                        <span style={{ fontSize: 10, color: "#bbb" }}>{tiempoRelativo(item.ultimo.created_at)}</span>
                      </div>
                    </div>
                    <div style={{ fontSize: 11, color: "#888", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      <span style={{ color: item.ultimo.rol === "admin" ? "#555" : "#6366f1", fontWeight: 600 }}>{item.ultimo.autor.split(" ")[0]}: </span>
                      {item.ultimo.mensaje}
                    </div>
                  </div>
                );
              })}
            </div>
            {inboxAbierto && (
              <div style={{ border: "1.5px solid #e8e8e8", borderRadius: 10, display: "flex", flexDirection: "column", overflow: "hidden", height: 380 }}>
                <div style={{ padding: "10px 14px", borderBottom: "1px solid #f0f0f0", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 13 }}>{inbox.find(i => i.proyecto_id === inboxAbierto)?.proyecto?.descripcion}</div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={() => onNav && onNav("proyectos", inboxAbierto)} style={{ fontSize: 11, color: "#3b82f6", background: "none", border: "none", cursor: "pointer", fontWeight: 600 }}>Ver proyecto →</button>
                    <button onClick={() => setInboxAbierto(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "#aaa", fontSize: 16 }}>✕</button>
                  </div>
                </div>
                <div style={{ flex: 1, overflow: "auto", padding: "10px 14px" }}>
                  {loadingInbox ? <p style={{ color: "#aaa", fontSize: 12 }}>Cargando…</p> :
                    inboxMensajes.map(m => {
                      const esAdmin = m.rol === "admin";
                      return (
                        <div key={m.id} style={{ display: "flex", gap: 7, marginBottom: 8, flexDirection: esAdmin ? "row-reverse" : "row" }}>
                          <div style={{ width: 24, height: 24, borderRadius: "50%", background: esAdmin ? "#0a0a0a" : "#6366f1", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 800, flexShrink: 0 }}>
                            {(m.autor || "?")[0].toUpperCase()}
                          </div>
                          <div style={{ maxWidth: "70%", display: "flex", flexDirection: "column", alignItems: esAdmin ? "flex-end" : "flex-start" }}>
                            <div style={{ fontSize: 9, color: "#bbb", marginBottom: 2 }}>{m.autor} · {tiempoRelativo(m.created_at)}</div>
                            <div style={{ fontSize: 12, padding: "6px 10px", borderRadius: esAdmin ? "10px 2px 10px 10px" : "2px 10px 10px 10px", background: esAdmin ? "#0a0a0a" : "#ede9fe", color: esAdmin ? "#fff" : "#333", lineHeight: 1.4 }}>
                              {m.mensaje}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  }
                </div>
                <div style={{ padding: "8px 10px", borderTop: "1px solid #f0f0f0", display: "flex", gap: 6, flexShrink: 0 }}>
                  <input value={inboxReply} onChange={e => setInboxReply(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && responderInbox()}
                    style={{ flex: 1, padding: "6px 10px", border: "1.5px solid #e0e0e0", borderRadius: 7, fontSize: 12, fontFamily: "inherit" }}
                    placeholder="Responder… (Enter)" />
                  <button onClick={responderInbox} disabled={!inboxReply.trim()}
                    style={{ padding: "6px 14px", background: inboxReply.trim() ? "#0a0a0a" : "#f0f0f0", color: inboxReply.trim() ? "#fff" : "#aaa", border: "none", borderRadius: 7, fontSize: 12, cursor: inboxReply.trim() ? "pointer" : "default", fontWeight: 700 }}>→</button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
