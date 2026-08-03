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

const ESTADO_COLOR = {
  onboarding: "#f59e0b", activo: "#3b82f6", revision: "#6366f1",
  aprobado: "#1a8a5e", enviado: "#3b82f6", negociacion: "#f59e0b",
  rechazado: "#c0392b", borrador: "#aaa",
};

export default function Dashboard({ onNav }) {
  const [perfil, setPerfil] = useState(null);
  const [presupuestos, setPresupuestos] = useState([]);
  const [proyectos, setProyectos] = useState([]);
  const [calculistas, setCalculistas] = useState([]);
  const [cobros, setCobros] = useState([]);
  const [inbox, setInbox] = useState([]);
  const [inboxAbierto, setInboxAbierto] = useState(null);
  const [inboxMensajes, setInboxMensajes] = useState([]);
  const [inboxReply, setInboxReply] = useState("");
  const [loadingInbox, setLoadingInbox] = useState(false);
  const [loading, setLoading] = useState(true);
  const [tc, setTc] = useState(null);

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
    const [presR, proyR, calcR, cobrosR, msgsR] = await Promise.all([
      fetch(`${SUPA_URL}/presupuestos?archivado=is.false&order=created_at.desc&limit=200`, { headers: hdrs(tk) }).then(r => r.json()),
      fetch(`${SUPA_URL}/proyectos?archivado=is.false&order=created_at.desc`, { headers: hdrs(tk) }).then(r => r.json()),
      fetch(`${SUPA_URL}/calculistas?order=nombre.asc`, { headers: hdrs(tk) }).then(r => r.json()),
      fetch(`${SUPA_URL}/proyecto_cobros?order=fecha_cobro.desc&limit=100`, { headers: hdrs(tk) }).then(r => r.json()),
      fetch(`${SUPA_URL}/tarea_mensajes?order=created_at.desc&limit=200`, { headers: hdrs(tk) }).then(r => r.json()),
    ]);
    setPresupuestos(Array.isArray(presR) ? presR : []);
    setProyectos(Array.isArray(proyR) ? proyR : []);
    setCalculistas(Array.isArray(calcR) ? calcR : []);
    setCobros(Array.isArray(cobrosR) ? cobrosR : []);

    // Armar inbox agrupado por proyecto
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
  const mesActual = new Date().toISOString().slice(0, 7);
  const hoy = new Date().toISOString().slice(0, 10);

  const presAprobados = presupuestos.filter(p => p.estado === "aprobado");
  const presAprobadosMes = presAprobados.filter(p => (p.fecha_aprobacion || p.fecha_emision || "").slice(0, 7) === mesActual);
  const presEnviados = presupuestos.filter(p => ["enviado", "negociacion"].includes(p.estado));
  const montoAprobadoMes = presAprobadosMes.reduce((s, p) => s + (parseFloat(p.monto) || 0), 0);
  const montoAprobadoMesUSD = tc ? Math.round(montoAprobadoMes / tc) : null;
  const tasaConversion = presupuestos.filter(p => p.estado !== "borrador" && !p.archivado && (p.fecha_emision || "").slice(0, 7) === mesActual).length;
  const tasaPct = tasaConversion > 0 ? Math.round(presAprobadosMes.length / tasaConversion * 100) : null;

  const proyOnboarding = proyectos.filter(p => p.estado === "onboarding");
  const proyActivos = proyectos.filter(p => p.estado === "activo");
  const proyRevision = proyectos.filter(p => p.estado === "revision");

  const totalCobrado = cobros.reduce((s, c) => s + parseFloat(c.monto || 0), 0);
  const cobradoMes = cobros.filter(c => (c.fecha_cobro || "").slice(0, 7) === mesActual).reduce((s, c) => s + parseFloat(c.monto || 0), 0);

  const calcActivos = calculistas.filter(c => c.estado === "activo");
  const calcDisponibles = calculistas.filter(c => c.disponible);
  const calcPostulantes = calculistas.filter(c => c.estado === "postulante");

  // Alertas
  const alertas = [];
  // Presupuestos para recontactar
  const recontactar = presEnviados.filter(p => {
    const ref = p.fecha_ultimo_contacto || p.fecha_emision;
    if (!ref) return false;
    return Math.floor((new Date() - new Date(ref + "T12:00")) / 86400000) >= 7;
  });
  if (recontactar.length > 0) alertas.push({ tipo: "warning", msg: `${recontactar.length} presupuesto${recontactar.length > 1 ? "s" : ""} para recontactar`, modulo: "presupuestos" });

  // Proyectos vencidos
  const proyVencidos = proyectos.filter(p => p.fecha_entrega_plan && p.fecha_entrega_plan < hoy && p.estado !== "revision" && !p.archivado);
  if (proyVencidos.length > 0) alertas.push({ tipo: "danger", msg: `${proyVencidos.length} proyecto${proyVencidos.length > 1 ? "s" : ""} con fecha vencida`, modulo: "proyectos" });

  // Calculistas postulantes sin revisar
  if (calcPostulantes.length > 0) alertas.push({ tipo: "info", msg: `${calcPostulantes.length} postulante${calcPostulantes.length > 1 ? "s" : ""} sin revisar`, modulo: "calculistas" });

  // Mensajes sin responder (del calculista, sin respuesta admin posterior)
  const sinResponder = inbox.filter(i => i.ultimo?.rol !== "admin");
  if (sinResponder.length > 0) alertas.push({ tipo: "purple", msg: `${sinResponder.length} conversación${sinResponder.length > 1 ? "es" : ""} sin respuesta`, modulo: null });

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh", fontFamily: "system-ui", color: "#aaa", fontSize: 14 }}>
      Cargando dashboard…
    </div>
  );

  const S = {
    card: { background: "#fff", border: "1.5px solid #e8e8e8", borderRadius: 12, padding: "14px 16px" },
    lbl: { fontSize: 10, color: "#aaa", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5 },
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

      {/* ── Alertas ── */}
      {alertas.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 20 }}>
          {alertas.map((a, i) => {
            const colores = {
              warning: { bg: "#fffbeb", border: "#f59e0b", color: "#c4781a", icon: "⚠️" },
              danger: { bg: "#fef2f2", border: "#c0392b", color: "#c0392b", icon: "🔴" },
              info: { bg: "#eff6ff", border: "#3b82f6", color: "#3b82f6", icon: "ℹ️" },
              purple: { bg: "#ede9fe", border: "#6366f1", color: "#6366f1", icon: "💬" },
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

      {/* ── KPIs principales ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 10, marginBottom: 20 }}>
        {[
          { label: "Aprobado este mes", value: fmtMonto(montoAprobadoMes), sub: montoAprobadoMesUSD ? `U$S ${montoAprobadoMesUSD.toLocaleString("es-AR")}` : null, color: "#1a8a5e", icon: "✅" },
          { label: "Conversión mes", value: tasaPct !== null ? `${tasaPct}%` : "—", sub: `${presAprobadosMes.length} aprobados`, color: tasaPct >= 50 ? "#1a8a5e" : tasaPct >= 30 ? "#f59e0b" : "#c0392b", icon: "📈" },
          { label: "Proyectos activos", value: proyActivos.length, sub: `${proyOnboarding.length} onboarding · ${proyRevision.length} revisión`, color: "#3b82f6", icon: "📐" },
          { label: "Cobrado total", value: fmtMonto(totalCobrado), sub: cobradoMes > 0 ? `${fmtMonto(cobradoMes)} este mes` : null, color: "#1a8a5e", icon: "💰" },
          { label: "En seguimiento", value: presEnviados.length, sub: `${recontactar.length} para recontactar`, color: recontactar.length > 0 ? "#f59e0b" : "#888", icon: "📨" },
          { label: "Calculistas", value: calcActivos.length, sub: `${calcDisponibles.length} disponibles · ${calcPostulantes.length} postulantes`, color: "#6366f1", icon: "👷" },
        ].map(k => (
          <div key={k.label} style={{ ...S.card, display: "flex", flexDirection: "column", gap: 2 }}>
            <div style={{ fontSize: 18, marginBottom: 2 }}>{k.icon}</div>
            <div style={{ fontSize: 22, fontWeight: 900, color: k.color, fontFamily: "monospace", lineHeight: 1 }}>{k.value}</div>
            <div style={{ fontSize: 10, color: "#aaa", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.4 }}>{k.label}</div>
            {k.sub && <div style={{ fontSize: 11, color: "#bbb", marginTop: 2 }}>{k.sub}</div>}
          </div>
        ))}
      </div>

      {/* ── Grid principal ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>

        {/* Proyectos activos */}
        <div style={S.card}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <span style={{ fontSize: 14, fontWeight: 800, color: "#111" }}>📐 Proyectos en curso</span>
            <button onClick={() => onNav && onNav("proyectos")} style={{ fontSize: 11, color: "#3b82f6", background: "none", border: "none", cursor: "pointer", fontWeight: 600 }}>Ver todos →</button>
          </div>
          {proyectos.filter(p => ["onboarding","activo","revision"].includes(p.estado)).slice(0, 6).map(p => {
            const color = ESTADO_COLOR[p.estado] || "#888";
            const diasEntrega = p.fecha_entrega_plan ? Math.ceil((new Date(p.fecha_entrega_plan + "T12:00") - new Date()) / 86400000) : null;
            return (
              <div key={p.id} onClick={() => onNav && onNav("proyectos", p.id)} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: "1px solid #f5f5f5", cursor: "pointer" }}>
                <div style={{ width: 4, height: 32, borderRadius: 2, background: color, flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#111", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.descripcion}</div>
                  <div style={{ fontSize: 11, color: "#aaa" }}>
                    {p.encargado || "Sin asignar"}
                    {p.cliente && ` · ${p.cliente}`}
                  </div>
                </div>
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 20, background: `${color}15`, color }}>{p.estado}</div>
                  {diasEntrega !== null && <div style={{ fontSize: 10, color: diasEntrega < 0 ? "#c0392b" : diasEntrega <= 7 ? "#f59e0b" : "#aaa", marginTop: 2 }}>{diasEntrega < 0 ? "Vencido" : `${diasEntrega}d`}</div>}
                </div>
              </div>
            );
          })}
          {proyectos.filter(p => ["onboarding","activo","revision"].includes(p.estado)).length === 0 && (
            <p style={{ color: "#ccc", fontSize: 13, textAlign: "center", padding: 20 }}>Sin proyectos activos</p>
          )}
        </div>

        {/* Presupuestos recientes */}
        <div style={S.card}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <span style={{ fontSize: 14, fontWeight: 800, color: "#111" }}>💰 Presupuestos recientes</span>
            <button onClick={() => onNav && onNav("presupuestos")} style={{ fontSize: 11, color: "#3b82f6", background: "none", border: "none", cursor: "pointer", fontWeight: 600 }}>Ver todos →</button>
          </div>
          {presupuestos.slice(0, 7).map(p => {
            const color = ESTADO_COLOR[p.estado] || "#888";
            return (
              <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 0", borderBottom: "1px solid #f5f5f5" }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: color, flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "#111", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.descripcion || p.cliente || "—"}</div>
                  <div style={{ fontSize: 10, color: "#aaa" }}>{p.cliente} · {fmtFecha(p.fecha_emision)}</div>
                </div>
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  {p.monto && <div style={{ fontSize: 12, fontWeight: 700, fontFamily: "monospace" }}>{fmtMonto(p.monto)}</div>}
                  <div style={{ fontSize: 10, color, fontWeight: 600 }}>{p.estado}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Calculistas top ── */}
      <div style={{ ...S.card, marginBottom: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <span style={{ fontSize: 14, fontWeight: 800, color: "#111" }}>👷 Equipo de calculistas</span>
          <button onClick={() => onNav && onNav("calculistas")} style={{ fontSize: 11, color: "#3b82f6", background: "none", border: "none", cursor: "pointer", fontWeight: 600 }}>Ver todos →</button>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 8 }}>
          {calcActivos.map(c => {
            const proyAsignados = proyectos.filter(p => p.encargado === c.nombre && ["onboarding","activo","revision"].includes(p.estado)).length;
            return (
              <div key={c.id} style={{ background: "#f8f8f8", borderRadius: 9, padding: "10px 12px", display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 32, height: 32, borderRadius: "50%", background: c.disponible ? "#1a8a5e" : "#e0e0e0", color: c.disponible ? "#fff" : "#aaa", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 800, flexShrink: 0 }}>
                  {(c.nombre || "?")[0].toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#111", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.nombre}</div>
                  <div style={{ fontSize: 10, color: "#aaa" }}>
                    {proyAsignados > 0 ? `${proyAsignados} proyecto${proyAsignados > 1 ? "s" : ""}` : "Sin proyectos"}
                    {c.nivel && ` · ${c.nivel}`}
                  </div>
                </div>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: c.disponible ? "#1a8a5e" : "#e0e0e0", flexShrink: 0 }} />
              </div>
            );
          })}
          {calcActivos.length === 0 && <p style={{ color: "#ccc", fontSize: 12, gridColumn: "1/-1", textAlign: "center", padding: 12 }}>Sin calculistas activos</p>}
        </div>
        {calcPostulantes.length > 0 && (
          <div style={{ marginTop: 10, padding: "8px 12px", background: "#eff6ff", borderRadius: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 12, color: "#3b82f6", fontWeight: 600 }}>📋 {calcPostulantes.length} postulante{calcPostulantes.length > 1 ? "s" : ""} esperando revisión</span>
            <button onClick={() => onNav && onNav("calculistas")} style={{ fontSize: 11, color: "#3b82f6", background: "none", border: "none", cursor: "pointer", fontWeight: 700 }}>Revisar →</button>
          </div>
        )}
      </div>

      {/* ── Inbox ── */}
      <div style={S.card}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
          <span style={{ fontSize: 16 }}>💬</span>
          <h2 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: "#111" }}>Comunicaciones</h2>
          {sinResponder.length > 0 && (
            <span style={{ fontSize: 11, background: "#6366f1", color: "#fff", borderRadius: 20, padding: "2px 9px", fontWeight: 700 }}>
              {sinResponder.length} sin responder
            </span>
          )}
          <span style={{ marginLeft: "auto", fontSize: 11, color: "#aaa" }}>{inbox.length} proyectos con mensajes</span>
        </div>

        {inbox.length === 0 ? (
          <div style={{ textAlign: "center", padding: 32, color: "#ccc" }}>
            <div style={{ fontSize: 28, marginBottom: 6 }}>💬</div>
            <div style={{ fontSize: 13 }}>Sin mensajes aún</div>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: inboxAbierto ? "300px 1fr" : "1fr", gap: 12 }}>

            {/* Lista */}
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
                  }} style={{ padding: "9px 12px", borderRadius: 9, cursor: "pointer", border: `1.5px solid ${sel ? "#6366f1" : sinResp ? "#c4b5fd" : "#e8e8e8"}`, background: sel ? "#ede9fe" : sinResp ? "#faf5ff" : "#fff", transition: "all 0.1s" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 3 }}>
                      <div style={{ fontWeight: 700, fontSize: 12, color: "#111", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "75%" }}>
                        {p?.descripcion || "Proyecto"}
                      </div>
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

            {/* Panel conversación */}
            {inboxAbierto && (
              <div style={{ border: "1.5px solid #e8e8e8", borderRadius: 10, display: "flex", flexDirection: "column", overflow: "hidden", height: 400 }}>
                <div style={{ padding: "10px 14px", borderBottom: "1px solid #f0f0f0", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 13 }}>{inbox.find(i => i.proyecto_id === inboxAbierto)?.proyecto?.descripcion}</div>
                    <div style={{ fontSize: 10, color: "#aaa" }}>{inboxMensajes.length} mensajes</div>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={() => onNav && onNav("proyectos", inboxAbierto)} style={{ fontSize: 11, color: "#3b82f6", background: "none", border: "none", cursor: "pointer", fontWeight: 600 }}>Ver proyecto →</button>
                    <button onClick={() => setInboxAbierto(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "#aaa", fontSize: 16 }}>✕</button>
                  </div>
                </div>
                <div style={{ flex: 1, overflow: "auto", padding: "10px 14px" }}>
                  {loadingInbox ? <p style={{ color: "#aaa", fontSize: 12, textAlign: "center" }}>Cargando…</p> :
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
