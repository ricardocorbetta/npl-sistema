import React, { useEffect, useState, useCallback } from "react";
import { supabase } from "./supabase.js";
import { COLORS, shared, SectionHeader, KpiGrid, Badge, ProgressBar, FilterBar, EmptyState } from "./uiKit.jsx";

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
const ESTADO_PRES = { borrador: COLORS.textMuted, enviado: COLORS.info, negociacion: COLORS.warning, aprobado: COLORS.success, rechazado: COLORS.danger };

/* ─── Selector de período ─── */
function SelectorPeriodo({ valor, onChange }) {
  const meses = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];
  const hoy = new Date();
  const opciones = [{ v: "todo", label: "Todo el tiempo" }];
  for (let i = 0; i < 12; i++) {
    const d = new Date(hoy.getFullYear(), hoy.getMonth() - i, 1);
    const v = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;
    opciones.push({ v, label: `${meses[d.getMonth()]} ${d.getFullYear()}` });
  }
  return (
    <select value={valor} onChange={e => onChange(e.target.value)} style={{ ...shared.inp, width: 180 }}>
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
  const [tab, setTab] = useState("obras");

  const cargar = useCallback(async () => {
    setLoading(true);
    const tk = await getToken();

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

    const avMap = {};
    (Array.isArray(avR) ? avR : []).forEach(a => { avMap[a.obra_id] = a; });
    setAvancesObra(avMap);

    setLoading(false);
  }, [periodo]);

  useEffect(() => { cargar(); }, [cargar]);

  const presAprobados  = presupuestos.filter(p => p.estado === "aprobado");
  const presPendientes = presupuestos.filter(p => p.estado === "enviado");
  const montoAprobado  = presAprobados.reduce((s, p) => s + (parseFloat(p.monto) || 0), 0);
  const montoPendiente = presPendientes.reduce((s, p) => s + (parseFloat(p.monto) || 0), 0);

  const proyActivos    = proyectos.filter(p => p.estado === "activo");
  const proyEntregados = proyectos.filter(p => p.entregado);
  const proyCobrados   = proyectos.filter(p => p.cobrado);

  const calcDisp = calculistas.filter(c => c.disponible);
  const calcSenior = calculistas.filter(c => c.nivel === "Senior");

  const porTipoServicio = {};
  presupuestos.forEach(p => {
    const t = p.tipo_servicio || "Sin categoría";
    if (!porTipoServicio[t]) porTipoServicio[t] = { count: 0, monto: 0 };
    porTipoServicio[t].count++;
    porTipoServicio[t].monto += parseFloat(p.monto) || 0;
  });

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh", fontFamily: shared.page.fontFamily, color: COLORS.textFaint }}>
      Cargando dashboard…
    </div>
  );

  return (
    <div style={{ ...shared.page, maxWidth: 1200, background: COLORS.bgApp, minHeight: "100vh" }}>

      <SectionHeader
        icon="📊" title="Dashboard NPL"
        subtitle={new Date().toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
      />

      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 20, gap: 10 }}>
        <SelectorPeriodo valor={periodo} onChange={setPeriodo} />
        <button onClick={cargar} style={shared.btnSm}>↺</button>
      </div>

      {resumen && (
        <KpiGrid columns={3} items={[
          { label: "Obras activas",        value: resumen.obras_activas, color: COLORS.accent, icon: "🏗️" },
          { label: "Proyectos activos",    value: resumen.proyectos_activos, color: COLORS.info, icon: "📋", sub: `${proyEntregados.length} entregados · ${proyCobrados.length} cobrados` },
          { label: "Clientes",             value: resumen.total_clientes, color: COLORS.success, icon: "👥" },
          { label: "Presupuestos aprobados", value: resumen.presupuestos_aprobados, color: COLORS.success, icon: "✅", sub: `$${montoAprobado.toLocaleString("es-AR")}` },
          { label: "Monto pendiente",      value: `$${montoPendiente.toLocaleString("es-AR")}`, color: COLORS.warning, icon: "💰", sub: `${presPendientes.length} presup. enviados` },
          { label: "Partes hoy",           value: resumen.partes_hoy || 0, color: resumen.partes_hoy > 0 ? COLORS.success : COLORS.danger, icon: "📝", sub: "reportes de obras" },
        ]} />
      )}

      <div style={{ display: "flex", gap: 4, marginBottom: 20, background: COLORS.bgCard, borderRadius: 12, padding: 4, width: "fit-content", boxShadow: "0 1px 4px rgba(0,0,0,.06)" }}>
        {[["obras","🏗️ Obras"],["presupuestos","💰 Presupuestos"],["proyectos","📋 Proyectos"],["equipo","👷 Equipo"]].map(([id,label]) => (
          <button key={id} onClick={() => setTab(id)} style={{
            padding: "8px 16px", background: tab === id ? COLORS.text : "none", color: tab === id ? "#fff" : "#666",
            border: "none", borderRadius: 9, fontSize: 13, fontWeight: tab === id ? 700 : 400, cursor: "pointer", transition: "all .15s"
          }}>{label}</button>
        ))}
      </div>

      {/* ════════ TAB OBRAS ════════ */}
      {tab === "obras" && (
        <div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(340px,1fr))", gap: 14, marginBottom: 20 }}>
            {obras.map(o => {
              const av = avancesObra[o.id];
              const sColor = COLORS.semaforo[av?.semaforo] || COLORS.border;
              return (
                <div key={o.id} style={{ ...shared.card, borderLeft: `4px solid ${sColor}` }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                    <div>
                      {o.codigo && <div style={{ fontSize: 10, color: COLORS.textFaint, fontWeight: 700, letterSpacing: 1 }}>{o.codigo}</div>}
                      <div style={{ fontWeight: 700, fontSize: 14 }}>{o.nombre}</div>
                      <div style={{ fontSize: 11, color: COLORS.textMuted, marginTop: 2 }}>
                        {o.sistema_constructivo} · {ALCANCE_LABEL[o.alcance] || o.alcance}
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 22, fontWeight: 800, color: sColor }}>{av?.avance_real_pct || o.avance_pct || 0}%</div>
                      <div style={{ fontSize: 10, color: COLORS.textFaint }}>avance real</div>
                    </div>
                  </div>

                  <ProgressBar valor={av?.avance_real_pct || o.avance_pct || 0} max={100} color={sColor} label="Real" />
                  {av?.avance_teorico_pct != null && <ProgressBar valor={av.avance_teorico_pct} max={100} color={COLORS.accent} label="Teórico" />}

                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
                    {av?.desvio_pct != null && <Badge color={av.desvio_pct >= 0 ? COLORS.success : COLORS.danger} label={`${av.desvio_pct >= 0 ? "+" : ""}${av.desvio_pct}% desvío`} />}
                    {av?.tareas_atrasadas > 0 && <Badge color={COLORS.danger} label={`${av.tareas_atrasadas} atrasadas`} icon="⏰" />}
                    {o.jefe_nombre && <Badge color={COLORS.textMuted} label={o.jefe_nombre} icon="👷" />}
                    {o.partes_count > 0 && <Badge color={COLORS.textMuted} label={`${o.partes_count} partes`} icon="📝" />}
                  </div>

                  {o.fecha_inicio_plan && o.fecha_fin_plan && (
                    <div style={{ fontSize: 11, color: COLORS.textFaint, marginTop: 8 }}>
                      📅 {new Date(o.fecha_inicio_plan+"T12:00").toLocaleDateString("es-AR")} → {new Date(o.fecha_fin_plan+"T12:00").toLocaleDateString("es-AR")}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          {obras.length === 0 && <EmptyState message="Sin obras activas." />}
        </div>
      )}

      {/* ════════ TAB PRESUPUESTOS ════════ */}
      {tab === "presupuestos" && (
        <div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(160px,1fr))", gap: 12, marginBottom: 20 }}>
            {Object.entries(presupuestos.reduce((acc, p) => { acc[p.estado] = (acc[p.estado] || 0) + 1; return acc; }, {})).map(([estado, count]) => (
              <div key={estado} style={{ ...shared.card, padding: "14px 16px", borderLeft: `4px solid ${ESTADO_PRES[estado] || COLORS.textMuted}` }}>
                <div style={{ fontSize: 22, fontWeight: 800, color: ESTADO_PRES[estado] || COLORS.textMuted }}>{count}</div>
                <div style={{ fontSize: 12, color: COLORS.textSoft, marginTop: 2, textTransform: "capitalize" }}>{estado}</div>
              </div>
            ))}
          </div>

          {Object.keys(porTipoServicio).length > 0 && (
            <div style={{ ...shared.card, marginBottom: 20 }}>
              <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 14 }}>Por tipo de servicio</div>
              {Object.entries(porTipoServicio).sort((a, b) => b[1].count - a[1].count).map(([tipo, data]) => {
                const maxCount = Math.max(...Object.values(porTipoServicio).map(d => d.count));
                return (
                  <div key={tipo} style={{ marginBottom: 12 }}>
                    <ProgressBar valor={data.count} max={maxCount} color={COLORS.accent} label={`${tipo} — ${data.count} · $${data.monto.toLocaleString("es-AR")}`} showValue={false} height={8} />
                  </div>
                );
              })}
            </div>
          )}

          <div style={shared.card}>
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 14 }}>Últimos presupuestos {periodo !== "todo" ? `— ${periodo}` : ""}</div>
            {presupuestos.length === 0 ? <EmptyState message="Sin presupuestos en este período." /> : presupuestos.slice(0, 20).map(p => (
              <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: "1px solid #f5f5f5" }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: ESTADO_PRES[p.estado] || COLORS.textMuted, flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.descripcion || p.cliente || "Sin descripción"}</div>
                  <div style={{ fontSize: 11, color: COLORS.textFaint }}>{p.tipo_servicio || "—"} · {p.cliente || "—"} · {p.fecha_emision ? new Date(p.fecha_emision+"T12:00").toLocaleDateString("es-AR") : "—"}</div>
                </div>
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  {p.monto && <div style={{ fontSize: 13, fontWeight: 700 }}>${parseFloat(p.monto).toLocaleString("es-AR")}</div>}
                  <Badge color={ESTADO_PRES[p.estado] || COLORS.textMuted} label={p.estado} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ════════ TAB PROYECTOS ════════ */}
      {tab === "proyectos" && (
        <div>
          <KpiGrid items={[
            { label: "En curso",   value: proyActivos.length,    color: COLORS.accent },
            { label: "Entregados", value: proyEntregados.length, color: COLORS.success },
            { label: "Cobrados",   value: proyCobrados.length,   color: COLORS.success },
            { label: "Total",      value: proyectos.length,      color: COLORS.textMuted },
          ]} />

          <div style={shared.card}>
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 14 }}>Proyectos {periodo !== "todo" ? `— ${periodo}` : ""}</div>
            {proyectos.length === 0 ? <EmptyState message="Sin proyectos en este período." /> : proyectos.slice(0, 20).map(p => (
              <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: "1px solid #f5f5f5" }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                    {p.numero_proyecto && <span style={{ fontSize: 10, fontWeight: 700, color: COLORS.textFaint, background: "#f0f0f0", borderRadius: 4, padding: "1px 6px" }}>{p.numero_proyecto}</span>}
                    <span style={{ fontWeight: 600, fontSize: 13 }}>{p.descripcion || "Sin descripción"}</span>
                  </div>
                  <div style={{ fontSize: 11, color: COLORS.textFaint, marginTop: 2 }}>{p.cliente || "—"} · {p.categoria || "—"} · {p.encargado || "—"}</div>
                  {p.proxima_tarea && <div style={{ fontSize: 11, color: COLORS.accent, marginTop: 2 }}>→ {p.proxima_tarea}</div>}
                </div>
                <div style={{ display: "flex", gap: 6, flexShrink: 0, flexWrap: "wrap", justifyContent: "flex-end" }}>
                  {p.entregado  && <Badge color={COLORS.success} label="Entregado" icon="✓" />}
                  {p.cobrado    && <Badge color={COLORS.success} label="Cobrado" icon="✓" />}
                  {!p.entregado && <Badge color={COLORS.accent} label="En curso" />}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ════════ TAB EQUIPO ════════ */}
      {tab === "equipo" && (
        <div>
          <KpiGrid items={[
            { label: "Total",       value: calculistas.length, color: COLORS.accent },
            { label: "Disponibles", value: calcDisp.length,    color: COLORS.success },
            { label: "Seniors",     value: calcSenior.length,  color: COLORS.warning },
            { label: "Externos",    value: calculistas.filter(c => c.tipo === "externo").length, color: COLORS.info },
          ]} />

          <div style={{ ...shared.card, marginBottom: 16 }}>
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 14 }}>Por nivel</div>
            {["Senior","Semi","Junior"].map(nivel => {
              const arr = calculistas.filter(c => c.nivel === nivel);
              const color = { Senior: COLORS.accent, Semi: COLORS.warning, Junior: COLORS.success }[nivel];
              return (
                <div key={nivel} style={{ marginBottom: 12 }}>
                  <ProgressBar valor={arr.length} max={calculistas.length} color={color} label={`${nivel} — ${arr.length} · ${arr.filter(c => c.disponible).length} disponibles`} showValue={false} height={8} />
                </div>
              );
            })}
          </div>

          <div style={shared.card}>
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 14 }}>Equipo completo</div>
            {calculistas.map(c => {
              const color = { Senior: COLORS.accent, Semi: COLORS.warning, Junior: COLORS.success }[c.nivel] || COLORS.textMuted;
              return (
                <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: "1px solid #f5f5f5" }}>
                  <div style={{ width: 36, height: 36, borderRadius: "50%", background: color, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700, fontSize: 14, flexShrink: 0 }}>
                    {c.nombre?.charAt(0)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{c.nombre}</div>
                    <div style={{ fontSize: 11, color: COLORS.textFaint }}>{c.nivel} · {c.tipo} · {c.ciudad || "—"}</div>
                    {c.sistemas && <div style={{ fontSize: 11, color: COLORS.textSoft, marginTop: 1 }}>💻 {c.sistemas}</div>}
                  </div>
                  <div style={{ display: "flex", gap: 6, flexShrink: 0, flexDirection: "column", alignItems: "flex-end" }}>
                    <Badge color={c.disponible ? COLORS.success : COLORS.danger} label={c.disponible ? "Disponible" : "Ocupado"} />
                    {c.puntaje > 0 && <span style={{ fontSize: 10, color: COLORS.warning }}>{"★".repeat(Math.round(c.puntaje/2))} {c.puntaje}/10</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
