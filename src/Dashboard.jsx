import React, { useState, useEffect, useCallback } from "react";

const SUPA_URL = "https://imkmosifqxzbtqgzssst.supabase.co/rest/v1";
const SUPA_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlta21vc2lmcXh6YnRxZ3pzc3N0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkxODk4NTUsImV4cCI6MjA5NDc2NTg1NX0.5gtCs8Yv3vDSrKxAmXSr3zjWJ5HjimCKejfO-XrHPss";
const HDR = { "apikey": SUPA_KEY, "Authorization": `Bearer ${SUPA_KEY}` };

const api = {
  presupuestos: () => fetch(`${SUPA_URL}/presupuestos?select=*&limit=1000`, { headers: HDR }).then(r => r.json()),
  legajos:      () => fetch(`${SUPA_URL}/legajos?select=*&limit=500`, { headers: HDR }).then(r => r.json()),
  etapas:       () => fetch(`${SUPA_URL}/legajo_etapas?select=*&limit=5000`, { headers: HDR }).then(r => r.json()),
  calculistas:  () => fetch(`${SUPA_URL}/calculistas?select=*&limit=100`, { headers: HDR }).then(r => r.json()),
};

function fmt(v) {
  if (!v) return "—";
  return "$ " + Number(v).toLocaleString("es-AR");
}

function KPI({ label, value, sub, color }) {
  return (
    <div style={{ background: "#fff", border: "1px solid #e5e5e5", borderRadius: 10, padding: "14px 16px" }}>
      <p style={{ margin: 0, fontSize: 12, color: "#888" }}>{label}</p>
      <p style={{ margin: "4px 0 2px", fontSize: 22, fontWeight: 700, color: color || "#111" }}>{value}</p>
      {sub && <p style={{ margin: 0, fontSize: 11, color: "#aaa" }}>{sub}</p>}
    </div>
  );
}

function BarChart({ data, colorFn }) {
  const max = Math.max(...data.map(d => d.value), 1);
  return (
    <div>
      {data.map((d, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
          <span style={{ fontSize: 12, color: "#555", minWidth: 140, textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>{d.label}</span>
          <div style={{ flex: 1, background: "#f0f0f0", borderRadius: 99, height: 8 }}>
            <div style={{ width: `${(d.value / max) * 100}%`, background: colorFn ? colorFn(d) : "#185FA5", height: 8, borderRadius: 99, transition: "width .3s" }} />
          </div>
          <span style={{ fontSize: 12, fontWeight: 600, color: "#111", minWidth: 30, textAlign: "right" }}>{d.value}</span>
        </div>
      ))}
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <p style={{ margin: "0 0 12px", fontSize: 13, fontWeight: 600, color: "#111", borderBottom: "1px solid #f0f0f0", paddingBottom: 8 }}>{title}</p>
      {children}
    </div>
  );
}

export default function Dashboard() {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);
  const [periodo, setPeriodo] = useState("todo");

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const [presupuestos, legajos, etapas, calculistas] = await Promise.all([
        api.presupuestos(), api.legajos(), api.etapas(), api.calculistas()
      ]);
      if (presupuestos?.message) throw new Error(presupuestos.message);
      setData({ presupuestos, legajos, etapas, calculistas });
    } catch (e) { setError(e.message); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return <div style={{ fontFamily: "system-ui", padding: 40, textAlign: "center", color: "#999" }}>Cargando dashboard...</div>;
  if (error)   return <div style={{ fontFamily: "system-ui", padding: 40, textAlign: "center", color: "#c00" }}>Error: {error}</div>;

  const { presupuestos, legajos, etapas, calculistas } = data;

  const ahora = new Date();
  const filtrarPeriodo = (items) => {
    if (periodo === "todo") return items;
    return items.filter(p => {
      if (!p.fecha_emision) return false;
      const f = new Date(p.fecha_emision);
      if (periodo === "mes") return f.getMonth() === ahora.getMonth() && f.getFullYear() === ahora.getFullYear();
      if (periodo === "anio") return f.getFullYear() === ahora.getFullYear();
      return true;
    });
  };

  const pres       = filtrarPeriodo(presupuestos);
  const totalPres  = pres.length;
  const aprobados  = pres.filter(p => p.estado === "aprobado");
  const rechazados = pres.filter(p => p.estado === "rechazado");
  const enviados   = pres.filter(p => p.estado === "enviado");
  const negociacion = pres.filter(p => p.estado === "negociacion");
  const facturadoARS = aprobados.filter(p => p.moneda === "ARS").reduce((s, p) => s + (Number(p.monto) || 0), 0);
  const facturadoUSD = aprobados.filter(p => p.moneda === "USD").reduce((s, p) => s + (Number(p.monto) || 0), 0);
  const conversion   = totalPres > 0 ? Math.round((aprobados.length / totalPres) * 100) : 0;
  const ticketProm   = aprobados.length > 0 ? Math.round(facturadoARS / aprobados.length) : 0;

  const pipeline = [
    { label: "Aprobados",      value: aprobados.length,   color: "#3B6D11" },
    { label: "En negociación", value: negociacion.length, color: "#854F0B" },
    { label: "Enviados",       value: enviados.length,    color: "#185FA5" },
    { label: "Rechazados",     value: rechazados.length,  color: "#A32D2D" },
  ];

  const clientesCount = {};
  aprobados.forEach(p => {
    if (p.cliente) clientesCount[p.cliente] = (clientesCount[p.cliente] || 0) + 1;
  });
  const topClientes = Object.entries(clientesCount)
    .sort((a, b) => b[1] - a[1]).slice(0, 8)
    .map(([label, value]) => ({ label, value }));

  const meses = {};
  presupuestos.forEach(p => {
    if (!p.fecha_emision) return;
    const f = new Date(p.fecha_emision);
    const key = `${f.getFullYear()}-${String(f.getMonth() + 1).padStart(2, "0")}`;
    if (!meses[key]) meses[key] = { total: 0, aprobados: 0 };
    meses[key].total++;
    if (p.estado === "aprobado") meses[key].aprobados++;
  });
  const ultimos12 = Object.entries(meses)
    .sort((a, b) => a[0].localeCompare(b[0])).slice(-12)
    .map(([key, v]) => ({ label: key.slice(5) + "/" + key.slice(2, 4), value: v.aprobados, total: v.total }));

  const legajosActivos    = legajos.filter(l => l.estado === "activo").length;
  const legajosEntregados = legajos.filter(l => l.estado === "entregado").length;

  const etapaCount = {};
  etapas.forEach(e => { etapaCount[e.estado] = (etapaCount[e.estado] || 0) + 1; });
  const etapaData = [
    { label: "Pendiente",   value: etapaCount["pendiente"]  || 0 },
    { label: "En proceso",  value: etapaCount["en_proceso"] || 0 },
    { label: "En revisión", value: etapaCount["revision"]   || 0 },
    { label: "Completado",  value: etapaCount["completado"] || 0 },
  ];

  const calcCount = {};
  legajos.filter(l => l.estado === "activo").forEach(l => {
    if (l.calculista) calcCount[l.calculista] = (calcCount[l.calculista] || 0) + 1;
  });
  const cargaCalc = Object.entries(calcCount).sort((a, b) => b[1] - a[1]).map(([label, value]) => ({ label, value }));

  const calcDisponibles = calculistas.filter(c => c.disponible && c.estado === "activo").length;
  const calcActivos     = calculistas.filter(c => c.estado === "activo").length;

  return (
    <div style={{ fontFamily: "system-ui, -apple-system, sans-serif", padding: "20px", maxWidth: 1100, margin: "0 auto" }}>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24, flexWrap: "wrap", gap: 10 }}>
        <div>
          <p style={{ margin: 0, fontSize: 12, color: "#999", fontWeight: 500 }}>NPL · Dashboard</p>
          <h1 style={{ margin: "2px 0 0", fontSize: 22, fontWeight: 600, color: "#111" }}>Panel de control</h1>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <div style={{ display: "flex", border: "1px solid #e5e5e5", borderRadius: 8, overflow: "hidden" }}>
            {[["mes","Este mes"], ["anio","Este año"], ["todo","Todo"]].map(([id, label]) => (
              <button key={id} onClick={() => setPeriodo(id)}
                style={{ padding: "6px 14px", fontSize: 12, fontWeight: 500, background: periodo === id ? "#111" : "#fff", color: periodo === id ? "#fff" : "#888", border: "none", cursor: "pointer" }}>
                {label}
              </button>
            ))}
          </div>
          <button onClick={load} style={{ padding: "6px 12px", fontSize: 13, borderRadius: 8, cursor: "pointer", border: "1px solid #e5e5e5", background: "#f5f5f5", color: "#555" }}>↻</button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 10, marginBottom: 24 }}>
        <KPI label="Presupuestos" value={totalPres} sub={periodo === "todo" ? "histórico" : periodo === "anio" ? "este año" : "este mes"} />
        <KPI label="Aprobados" value={aprobados.length} sub={`${conversion}% conversión`} color="#3B6D11" />
        <KPI label="En curso" value={enviados.length + negociacion.length} sub="enviados + negociando" color="#185FA5" />
        <KPI label="Facturado ARS" value={fmt(facturadoARS)} sub="presupuestos aprobados" color="#854F0B" />
        {facturadoUSD > 0 && <KPI label="Facturado USD" value={"USD " + facturadoUSD.toLocaleString("es-AR")} color="#854F0B" />}
        <KPI label="Ticket promedio" value={fmt(ticketProm)} sub="proyectos aprobados ARS" />
        <KPI label="Legajos activos" value={legajosActivos} sub={`${legajosEntregados} entregados`} />
        <KPI label="Calculistas" value={`${calcDisponibles}/${calcActivos}`} sub="disponibles / activos" color={calcDisponibles === 0 ? "#A32D2D" : "#3B6D11"} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 24 }}>
        <div style={{ background: "#fff", border: "1px solid #e5e5e5", borderRadius: 10, padding: "16px" }}>
          <Section title="Pipeline de presupuestos">
            <BarChart data={pipeline} colorFn={d => pipeline.find(x => x.label === d.label)?.color || "#185FA5"} />
          </Section>
        </div>
        <div style={{ background: "#fff", border: "1px solid #e5e5e5", borderRadius: 10, padding: "16px" }}>
          <Section title="Clientes con más proyectos aprobados">
            {topClientes.length > 0 ? <BarChart data={topClientes} /> : <p style={{ color: "#aaa", fontSize: 13 }}>Sin datos</p>}
          </Section>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 24 }}>
        <div style={{ background: "#fff", border: "1px solid #e5e5e5", borderRadius: 10, padding: "16px" }}>
          <Section title="Proyectos aprobados por mes (últimos 12)">
            {ultimos12.length > 0 ? <BarChart data={ultimos12} colorFn={() => "#3B6D11"} /> : <p style={{ color: "#aaa", fontSize: 13 }}>Sin datos</p>}
          </Section>
        </div>
        <div style={{ background: "#fff", border: "1px solid #e5e5e5", borderRadius: 10, padding: "16px" }}>
          <Section title="Estado de etapas (todos los legajos)">
            <BarChart data={etapaData} colorFn={d => {
              const c = { "Pendiente": "#aaa", "En proceso": "#185FA5", "En revisión": "#854F0B", "Completado": "#3B6D11" };
              return c[d.label] || "#185FA5";
            }} />
          </Section>
        </div>
      </div>

      {cargaCalc.length > 0 && (
        <div style={{ background: "#fff", border: "1px solid #e5e5e5", borderRadius: 10, padding: "16px", marginBottom: 24 }}>
          <Section title="Carga de trabajo por calculista (legajos activos)">
            <BarChart data={cargaCalc} colorFn={() => "#185FA5"} />
          </Section>
        </div>
      )}

      <p style={{ textAlign: "center", fontSize: 11, color: "#ccc", marginTop: 8 }}>Datos en tiempo real · Supabase</p>
    </div>
  );
}
