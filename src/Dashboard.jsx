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

const ALCANCE_LABEL = {
  fundacion: "Fundación", steel_frame_obra_gris: "SF Obra Gris",
  fundacion_steel_frame: "Fund. + SF", estructura: "Estructura",
  obra_completa: "Obra completa", llave_en_mano: "Llave en mano",
};
const SEMAFORO = { verde: "#22c55e", amarillo: "#f59e0b", rojo: "#ef4444" };
const ESTADO_PRES = { borrador: "#888", enviado: "#3b82f6", aprobado: "#22c55e", rechazado: "#ef4444", vencido: "#f59e0b" };

/* ─── Mini barra horizontal ─── */
function Barra({ valor, max, color = "#6366f1", height = 6 }) {
  const pct = max > 0 ? Math.min(100, Math.round((valor / max) * 100)) : 0;
  return (
    <div style={{ height, background: "#f0f0f0", borderRadius: height, overflow: "hidden" }}>
      <div style={{ height: "100%", width: `${pct}%`, background: color, transition: "width .4s" }} />
    </div>
  );
}

/* ─── KPI card ─── */
function KpiCard({ label, value, sub, color = "#6366f1", icon }) {
  return (
    <div style={{ background: "#fff", borderRadius: 14, padding: "18px 16px", boxShadow: "0 1px 6px rgba(0,0,0,.07)", borderTop: `4px solid ${color}` }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ fontSize: 28, fontWeight: 800, color }}>{value}</div>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#555", marginTop: 2 }}>{label}</div>
          {sub && <div style={{ fontSize: 11, color: "#aaa", marginTop: 4 }}>{sub}</div>}
        </div>
        {icon && <span style={{ fontSize: 28, opacity: .3 }}>{icon}</span>}
      </div>
    </div>
  );
}

/* ─── Selector de período ─── */
function SelectorPeriodo({ valor, onChange }) {
  const meses = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];
  const hoy = new Date();
  const opciones = [];
  // Últimos 12 meses + "Todo"
  opciones.push({ v: "todo", label: "Todo el tiempo" });
  for (let i = 0; i < 12; i++) {
    const d = new Date(hoy.getFullYear(), hoy.getMonth() - i, 1);
    const v = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;
    opciones.push({ v, label: `${meses[d.getMonth()]} ${d.getFullYear()}` });
  }
  return (
    <select value={valor} onChange={e => onChange(e.target.value)}
      style={{ padding: "8px 12px", border: "1px solid #e0e0e0", borderRadius: 10, fontSize: 13, background: "#fff", cursor: "pointer" }}>
      {opciones.map(o => <option key={o.v} value={o.v}>{o.label}</option>)}
    </select>
  );
}

export default function Dashboard() {
  const [resumen, setResumen] = useState(null);
  const [obras, setObras] = useState([]);
  const [presupuestos, setPresupuestos] = useState([]);
  const [proyectos, setProyectos] = useState([]);
  const [calculistas, setCalculistas] = useState([]);
  const [avancesObra, setAvancesObra] = useState({});
  const [loading, setLoading] = useState(true);
  const [periodo, setPeriodo] = useState("todo");
  const [tab, setTab] = useState("obras"); // obras | presupuestos | proyectos | equipo

  const cargar = useCallback(async () => {
    setLoading(true);
    const tk = await getToken();

    // Filtro fecha según período
    let filtroFecha = "";
    if (periodo !== "todo") {
      const [y, m] = periodo.split("-");
      const desde = `${y}-${m}-01`;
      const hasta = new Date(parseInt(y), parseInt(m), 0).toISOString().slice(0,10);
      filtroFecha = `&created_at=gte.${desde}&created_at=lte.${hasta}`;
    }

    const [resR, obrasR, presR, proyR, calcR, avR] = await Promise.all([
      fetch(`${SUPA_URL}/dashboard_resumen`, { headers: hdrs(tk) }).then(r => r.json()),
      fetch(`${SUPA_URL}/dashboard_obras?order=created_at.desc`, { headers: hdrs(tk) }).then(r => r.json()),
      fetch(`${SUPA_URL}/presupuestos?order=created_at.desc&limit=50${filtroFecha}`, { headers: hdrs(tk) }).then(r => r.json()),
      fetch(`${SUPA_URL}/proyectos?order=created_at.desc&limit=50${filtroFecha}`, { headers: hdrs(tk) }).then(r => r.json()),
      fetch(`${SUPA_URL}/calculistas?order=nombre.asc`, { headers: hdrs(tk) }).then(r => r.json()),
      fetch(`${SUPA_URL}/vista_avance_obra`, { headers: hdrs(tk) }).then(r => r.json()),
    ]);

    setResumen(Array.isArray(resR) ? resR[0] : null);
    setObras(Array.isArray(obrasR) ? obrasR : []);
    setPresupuestos(Array.isArray(presR) ? presR : []);
    setProyectos(Array.isArray(proyR) ? proyR : []);
    setCalculistas(Array.isArray(calcR) ? calcR : []);

    // Mapa avance por obra
    const avMap = {};
    (Array.isArray(avR) ? avR : []).forEach(a => { avMap[a.obra_id] = a; });
    setAvancesObra(avMap);

    setLoading(false);
  }, [periodo]);

  useEffect(() => { cargar(); }, [cargar]);

  // ── Métricas presupuestos ──
  const presAprobados  = presupuestos.filter(p => p.estado === "aprobado");
  const presPendientes = presupuestos.filter(p => p.estado === "enviado");
  const montoAprobado  = presAprobados.reduce((s, p) => s + (parseFloat(p.monto) || 0), 0);
  const montoPendiente = presPendientes.reduce((s, p) => s + (parseFloat(p.monto) || 0), 0);

  // ── Métricas proyectos ──
  const proyActivos    = proyectos.filter(p => p.estado === "en_curso" || p.estado === "activo");
  const proyEntregados = proyectos.filter(p => p.entregado);
  const proyCobrados   = proyectos.filter(p => p.cobrado);

  // ── Métricas equipo ──
  const calcDisp = calculistas.filter(c => c.disponible);
  const calcSenior = calculistas.filter(c => c.nivel === "Senior");

  // ── Por tipo de servicio ──
  const porTipoServicio = {};
  presupuestos.forEach(p => {
    const t = p.tipo_servicio || "Sin categoría";
    if (!porTipoServicio[t]) porTipoServicio[t] = { count: 0, monto: 0 };
    porTipoServicio[t].count++;
    porTipoServicio[t].monto += parseFloat(p.monto) || 0;
  });

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh", fontFamily: "system-ui", color: "#aaa" }}>
      Cargando dashboard…
    </div>
  );

  return (
    <div style={{ fontFamily: "system-ui, -apple-system, sans-serif", padding: "20px 24px", maxWidth: 1200, margin: "0 auto", background: "#f5f5f7", minHeight: "100vh" }}>

      {/* ── Header ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800 }}>📊 Dashboard NPL</h1>
          <div style={{ fontSize: 12, color: "#aaa", marginTop: 2 }}>
            {new Date().toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
          </div>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <SelectorPeriodo valor={periodo} onChange={setPeriodo} />
          <button onClick={cargar} style={{ padding: "8px 14px", background: "#f0f0f0", border: "none", borderRadius: 10, fontSize: 13, cursor: "pointer" }}>↺</button>
        </div>
      </div>

      {/* ── KPIs globales ── */}
      {resumen && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14, marginBottom: 28 }}>
          <KpiCard label="Obras activas"        value={resumen.obras_activas}            color="#6366f1" icon="🏗️" />
          <KpiCard label="Proyectos activos"    value={resumen.proyectos_activos}         color="#3b82f6" icon="📋" sub={`${proyEntregados.length} entregados · ${proyCobrados.length} cobrados`} />
          <KpiCard label="Clientes"             value={resumen.total_clientes}            color="#10b981" icon="👥" />
          <KpiCard label="Presupuestos aprobados" value={resumen.presupuestos_aprobados} color="#22c55e" icon="✅" sub={`$${montoAprobado.toLocaleString("es-AR")}`} />
          <KpiCard label="Monto pendiente"      value={`$${montoPendiente.toLocaleString("es-AR")}`} color="#f59e0b" icon="💰" sub={`${presPendientes.length} presup. enviados`} />
          <KpiCard label="Partes hoy"           value={resumen.partes_hoy || 0}           color={resumen.partes_hoy > 0 ? "#22c55e" : "#ef4444"} icon="📝" sub="reportes de obras" />
        </div>
      )}

      {/* ── Tabs ── */}
      <div style={{ display: "flex", gap: 4, marginBottom: 20, background: "#fff", borderRadius: 12, padding: 4, width: "fit-content", boxShadow: "0 1px 4px rgba(0,0,0,.06)" }}>
        {[["obras","🏗️ Obras"],["presupuestos","💰 Presupuestos"],["proyectos","📋 Proyectos"],["equipo","👷 Equipo"]].map(([id,label]) => (
          <button key={id} onClick={() => setTab(id)} style={{
            padding: "8px 16px", background: tab === id ? "#111" : "none", color: tab === id ? "#fff" : "#666",
            border: "none", borderRadius: 9, fontSize: 13, fontWeight: tab === id ? 700 : 400, cursor: "pointer", transition: "all .15s"
          }}>{label}</button>
        ))}
      </div>

      {/* ════════ TAB OBRAS ════════ */}
      {tab === "obras" && (
        <div>
          {/* Resumen avance obras */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(340px,1fr))", gap: 14, marginBottom: 20 }}>
            {obras.map(o => {
              const av = avancesObra[o.id];
              const sColor = SEMAFORO[av?.semaforo] || "#e0e0e0";
              return (
                <div key={o.id} style={{ background: "#fff", borderRadius: 14, padding: 18, boxShadow: "0 1px 6px rgba(0,0,0,.07)", borderLeft: `4px solid ${sColor}` }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                    <div>
                      {o.codigo && <div style={{ fontSize: 10, color: "#aaa", fontWeight: 700, letterSpacing: 1 }}>{o.codigo}</div>}
                      <div style={{ fontWeight: 700, fontSize: 14 }}>{o.nombre}</div>
                      <div style={{ fontSize: 11, color: "#888", marginTop: 2 }}>
                        {o.sistema_constructivo} · {ALCANCE_LABEL[o.alcance] || o.alcance}
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 22, fontWeight: 800, color: sColor }}>{av?.avance_real_pct || o.avance_pct || 0}%</div>
                      <div style={{ fontSize: 10, color: "#aaa" }}>avance real</div>
                    </div>
                  </div>

                  {/* Barras avance */}
                  <div style={{ marginBottom: 8 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#aaa", marginBottom: 3 }}>
                      <span>Real</span><span style={{ color: sColor, fontWeight: 700 }}>{av?.avance_real_pct || o.avance_pct || 0}%</span>
                    </div>
                    <Barra valor={av?.avance_real_pct || o.avance_pct || 0} max={100} color={sColor} />
                  </div>
                  {av?.avance_teorico_pct != null && (
                    <div style={{ marginBottom: 8 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#aaa", marginBottom: 3 }}>
                        <span>Teórico</span><span style={{ color: "#6366f1", fontWeight: 700 }}>{av.avance_teorico_pct}%</span>
                      </div>
                      <Barra valor={av.avance_teorico_pct} max={100} color="#6366f1" />
                    </div>
                  )}

                  {/* Desvío y métricas */}
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
                    {av?.desvio_pct != null && (
                      <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 6, background: av.desvio_pct >= 0 ? "#f0fdf4" : "#fef2f2", color: av.desvio_pct >= 0 ? "#16a34a" : "#ef4444", fontWeight: 700 }}>
                        {av.desvio_pct >= 0 ? `+${av.desvio_pct}%` : `${av.desvio_pct}%`} desvío
                      </span>
                    )}
                    {av?.tareas_atrasadas > 0 && <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 6, background: "#fef2f2", color: "#ef4444", fontWeight: 700 }}>⏰ {av.tareas_atrasadas} atrasadas</span>}
                    {o.jefe_nombre && <span style={{ fontSize: 11, color: "#666", padding: "2px 8px", background: "#f5f5f5", borderRadius: 6 }}>👷 {o.jefe_nombre}</span>}
                    {o.partes_count > 0 && <span style={{ fontSize: 11, color: "#888", padding: "2px 8px", background: "#f5f5f5", borderRadius: 6 }}>📝 {o.partes_count} partes</span>}
                  </div>

                  {/* Fechas */}
                  {o.fecha_inicio_plan && o.fecha_fin_plan && (
                    <div style={{ fontSize: 11, color: "#bbb", marginTop: 8 }}>
                      📅 {new Date(o.fecha_inicio_plan+"T12:00").toLocaleDateString("es-AR")} → {new Date(o.fecha_fin_plan+"T12:00").toLocaleDateString("es-AR")}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          {obras.length === 0 && <p style={{ color: "#aaa", textAlign: "center", padding: 40 }}>Sin obras activas.</p>}
        </div>
      )}

      {/* ════════ TAB PRESUPUESTOS ════════ */}
      {tab === "presupuestos" && (
        <div>
          {/* Por estado */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(160px,1fr))", gap: 12, marginBottom: 20 }}>
            {Object.entries(
              presupuestos.reduce((acc, p) => {
                acc[p.estado] = (acc[p.estado] || 0) + 1;
                return acc;
              }, {})
            ).map(([estado, count]) => (
              <div key={estado} style={{ background: "#fff", borderRadius: 12, padding: "14px 16px", boxShadow: "0 1px 4px rgba(0,0,0,.06)", borderLeft: `4px solid ${ESTADO_PRES[estado] || "#888"}` }}>
                <div style={{ fontSize: 22, fontWeight: 800, color: ESTADO_PRES[estado] || "#888" }}>{count}</div>
                <div style={{ fontSize: 12, color: "#666", marginTop: 2, textTransform: "capitalize" }}>{estado}</div>
              </div>
            ))}
          </div>

          {/* Por tipo de servicio */}
          {Object.keys(porTipoServicio).length > 0 && (
            <div style={{ background: "#fff", borderRadius: 14, padding: 20, boxShadow: "0 1px 6px rgba(0,0,0,.07)", marginBottom: 20 }}>
              <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 14 }}>Por tipo de servicio</div>
              {Object.entries(porTipoServicio).sort((a, b) => b[1].count - a[1].count).map(([tipo, data]) => {
                const maxCount = Math.max(...Object.values(porTipoServicio).map(d => d.count));
                return (
                  <div key={tipo} style={{ marginBottom: 12 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}>
                      <span style={{ fontWeight: 600 }}>{tipo}</span>
                      <span style={{ color: "#888" }}>{data.count} · ${data.monto.toLocaleString("es-AR")}</span>
                    </div>
                    <Barra valor={data.count} max={maxCount} color="#6366f1" height={8} />
                  </div>
                );
              })}
            </div>
          )}

          {/* Lista presupuestos */}
          <div style={{ background: "#fff", borderRadius: 14, padding: 20, boxShadow: "0 1px 6px rgba(0,0,0,.07)" }}>
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 14 }}>Últimos presupuestos {periodo !== "todo" ? `— ${periodo}` : ""}</div>
            {presupuestos.length === 0 ? (
              <p style={{ color: "#aaa", textAlign: "center", padding: 20 }}>Sin presupuestos en este período.</p>
            ) : presupuestos.slice(0, 20).map(p => (
              <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: "1px solid #f5f5f5" }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: ESTADO_PRES[p.estado] || "#888", flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {p.descripcion || p.cliente || "Sin descripción"}
                  </div>
                  <div style={{ fontSize: 11, color: "#aaa" }}>
                    {p.tipo_servicio || "—"} · {p.cliente || "—"} · {p.fecha_emision ? new Date(p.fecha_emision+"T12:00").toLocaleDateString("es-AR") : "—"}
                  </div>
                </div>
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  {p.monto && <div style={{ fontSize: 13, fontWeight: 700 }}>${parseFloat(p.monto).toLocaleString("es-AR")}</div>}
                  <div style={{ fontSize: 11, color: ESTADO_PRES[p.estado] || "#888", fontWeight: 600, textTransform: "capitalize" }}>{p.estado}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ════════ TAB PROYECTOS ════════ */}
      {tab === "proyectos" && (
        <div>
          {/* KPIs proyectos */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 20 }}>
            {[
              { label: "En curso",    value: proyActivos.length,    color: "#6366f1" },
              { label: "Entregados",  value: proyEntregados.length, color: "#22c55e" },
              { label: "Cobrados",    value: proyCobrados.length,   color: "#10b981" },
              { label: "Total",       value: proyectos.length,      color: "#888"    },
            ].map(k => (
              <div key={k.label} style={{ background: "#fff", borderRadius: 12, padding: "14px 16px", boxShadow: "0 1px 4px rgba(0,0,0,.06)", textAlign: "center" }}>
                <div style={{ fontSize: 26, fontWeight: 800, color: k.color }}>{k.value}</div>
                <div style={{ fontSize: 12, color: "#888", marginTop: 2 }}>{k.label}</div>
              </div>
            ))}
          </div>

          {/* Lista proyectos */}
          <div style={{ background: "#fff", borderRadius: 14, padding: 20, boxShadow: "0 1px 6px rgba(0,0,0,.07)" }}>
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 14 }}>Proyectos {periodo !== "todo" ? `— ${periodo}` : ""}</div>
            {proyectos.length === 0 ? (
              <p style={{ color: "#aaa", textAlign: "center", padding: 20 }}>Sin proyectos en este período.</p>
            ) : proyectos.slice(0, 20).map(p => (
              <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: "1px solid #f5f5f5" }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                    {p.numero_proyecto && <span style={{ fontSize: 10, fontWeight: 700, color: "#aaa", background: "#f0f0f0", borderRadius: 4, padding: "1px 6px" }}>{p.numero_proyecto}</span>}
                    <span style={{ fontWeight: 600, fontSize: 13 }}>{p.descripcion || "Sin descripción"}</span>
                  </div>
                  <div style={{ fontSize: 11, color: "#aaa", marginTop: 2 }}>
                    {p.cliente || "—"} · {p.categoria || "—"} · {p.encargado || "—"}
                  </div>
                  {p.proxima_tarea && <div style={{ fontSize: 11, color: "#6366f1", marginTop: 2 }}>→ {p.proxima_tarea}</div>}
                </div>
                <div style={{ display: "flex", gap: 6, flexShrink: 0, flexWrap: "wrap", justifyContent: "flex-end" }}>
                  {p.entregado  && <span style={{ fontSize: 10, background: "#f0fdf4", color: "#16a34a", borderRadius: 4, padding: "2px 6px", fontWeight: 600 }}>✓ Entregado</span>}
                  {p.cobrado    && <span style={{ fontSize: 10, background: "#f0fdf4", color: "#16a34a", borderRadius: 4, padding: "2px 6px", fontWeight: 600 }}>✓ Cobrado</span>}
                  {!p.entregado && <span style={{ fontSize: 10, background: "#f0f4ff", color: "#6366f1", borderRadius: 4, padding: "2px 6px" }}>En curso</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ════════ TAB EQUIPO ════════ */}
      {tab === "equipo" && (
        <div>
          {/* KPIs equipo */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 20 }}>
            {[
              { label: "Total",       value: calculistas.length, color: "#6366f1" },
              { label: "Disponibles", value: calcDisp.length,    color: "#22c55e" },
              { label: "Seniors",     value: calcSenior.length,  color: "#f59e0b" },
              { label: "Externos",    value: calculistas.filter(c => c.tipo === "externo").length, color: "#3b82f6" },
            ].map(k => (
              <div key={k.label} style={{ background: "#fff", borderRadius: 12, padding: "14px 16px", boxShadow: "0 1px 4px rgba(0,0,0,.06)", textAlign: "center" }}>
                <div style={{ fontSize: 26, fontWeight: 800, color: k.color }}>{k.value}</div>
                <div style={{ fontSize: 12, color: "#888", marginTop: 2 }}>{k.label}</div>
              </div>
            ))}
          </div>

          {/* Por nivel */}
          <div style={{ background: "#fff", borderRadius: 14, padding: 20, boxShadow: "0 1px 6px rgba(0,0,0,.07)", marginBottom: 16 }}>
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 14 }}>Por nivel</div>
            {["Senior","Semi","Junior"].map(nivel => {
              const arr = calculistas.filter(c => c.nivel === nivel);
              return (
                <div key={nivel} style={{ marginBottom: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}>
                    <span style={{ fontWeight: 600, color: { Senior:"#6366f1", Semi:"#f59e0b", Junior:"#22c55e" }[nivel] }}>{nivel}</span>
                    <span style={{ color: "#888" }}>{arr.length} · {arr.filter(c => c.disponible).length} disponibles</span>
                  </div>
                  <Barra valor={arr.length} max={calculistas.length} color={{ Senior:"#6366f1", Semi:"#f59e0b", Junior:"#22c55e" }[nivel]} height={8} />
                </div>
              );
            })}
          </div>

          {/* Lista calculistas */}
          <div style={{ background: "#fff", borderRadius: 14, padding: 20, boxShadow: "0 1px 6px rgba(0,0,0,.07)" }}>
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 14 }}>Equipo completo</div>
            {calculistas.map(c => (
              <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: "1px solid #f5f5f5" }}>
                <div style={{ width: 36, height: 36, borderRadius: "50%", background: { Senior:"#6366f1", Semi:"#f59e0b", Junior:"#22c55e" }[c.nivel] || "#888", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700, fontSize: 14, flexShrink: 0 }}>
                  {c.nombre?.charAt(0)}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{c.nombre}</div>
                  <div style={{ fontSize: 11, color: "#aaa" }}>{c.nivel} · {c.tipo} · {c.ciudad || "—"}</div>
                  {c.sistemas && <div style={{ fontSize: 11, color: "#666", marginTop: 1 }}>💻 {c.sistemas}</div>}
                </div>
                <div style={{ display: "flex", gap: 6, flexShrink: 0, flexDirection: "column", alignItems: "flex-end" }}>
                  <span style={{ fontSize: 10, padding: "2px 7px", borderRadius: 5, background: c.disponible ? "#f0fdf4" : "#fef2f2", color: c.disponible ? "#16a34a" : "#dc2626", fontWeight: 600 }}>
                    {c.disponible ? "Disponible" : "Ocupado"}
                  </span>
                  {c.puntaje > 0 && <span style={{ fontSize: 10, color: "#f59e0b" }}>{"★".repeat(Math.round(c.puntaje/2))} {c.puntaje}/10</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
