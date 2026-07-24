import React, { useEffect, useState, useCallback } from "react";
import { supabase } from "./supabase.js";

const SUPA_URL = "https://imkmosifqxzbtqgzssst.supabase.co/rest/v1";
const ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlta21vc2lmcXh6YnRxZ3pzc3N0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkxODk4NTUsImV4cCI6MjA5NDc2NTg1NX0.5gtCs8Yv3vDSrKxAmXSr3zjWJ5HjimCKejfO-XrHPss";

async function getToken() {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token || ANON_KEY;
}
function hdrs(tk) {
  return { apikey: ANON_KEY, Authorization: `Bearer ${tk}`, "Content-Type": "application/json", Prefer: "return=representation" };
}

const MESES = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];
const ANIO_ACTUAL = new Date().getFullYear();
const MES_ACTUAL = new Date().getMonth() + 1;
const ANIOS = [2023, 2024, 2025, 2026, 2027];

const TC_TIPOS = [
  { v: "blue", label: "Blue", url: "https://dolarapi.com/v1/dolares/blue" },
  { v: "mep",  label: "MEP",  url: "https://dolarapi.com/v1/dolares/bolsa" },
  { v: "oficial", label: "Oficial", url: "https://dolarapi.com/v1/dolares/oficial" },
];

export default function GraficoObjetivos({ presupuestos }) {
  const [abierto, setAbierto] = useState(false);
  const [anios, setAnios] = useState([ANIO_ACTUAL]);
  const toggleAnio = (a) => setAnios(prev => prev.includes(a) ? prev.filter(x => x !== a) : [...prev, a].sort());
  const [metrica, setMetrica] = useState("monto");
  const [objetivos, setObjetivos] = useState({});
  const [editando, setEditando] = useState(null);
  const [saving, setSaving] = useState(false);
  const [tcRef, setTcRef] = useState({});
  const [tcTipo, setTcTipo] = useState("mep");

  // Traer cotizaciones en tiempo real
  useEffect(() => {
    TC_TIPOS.forEach(t => {
      fetch(t.url)
        .then(r => r.json())
        .then(d => setTcRef(prev => ({ ...prev, [t.v]: d.venta })))
        .catch(() => {});
    });
  }, []);

  const cargarObjetivos = useCallback(async () => {
    const tk = await getToken();
    const aniosPrm = anios.join(",");
    const r = await fetch(`${SUPA_URL}/objetivos_mensuales?anio=in.(${aniosPrm})&order=mes.asc`, { headers: hdrs(tk) }).then(r => r.json());
    const map = {};
    (Array.isArray(r) ? r : []).forEach(o => {
      if (!map[o.anio]) map[o.anio] = {};
      map[o.anio][o.mes] = o;
    });
    setObjetivos(map);
  }, [anios]);

  useEffect(() => { if (abierto) cargarObjetivos(); }, [cargarObjetivos, abierto]);

  const COLORES = { 2023: "#6366f1", 2024: "#f59e0b", 2025: "#3b82f6", 2026: "#1a8a5e", 2027: "#c0392b" };

  // Reales por año y mes
  const realesPorAnioMes = {};
  for (const a of anios) {
    realesPorAnioMes[a] = {};
    for (let m = 1; m <= 12; m++) {
      const aprobados = presupuestos.filter(p => {
        if (p.estado !== "aprobado" || p.archivado) return false;
        const f = p.fecha_aprobacion || p.fecha_emision;
        if (!f) return false;
        const [y, mo] = f.split("-").map(Number);
        return y === a && mo === m;
      });
      const tc = (objetivos[a] || {})[m]?.tipo_cambio || tcRef[tcTipo] || 1500;
      const monto_ars = aprobados.reduce((s, p) => s + (parseFloat(p.monto) || 0), 0);
      realesPorAnioMes[a][m] = { monto_ars, monto_usd: tc > 0 ? monto_ars / tc : 0, cantidad: aprobados.length };
    }
  }
  // Para la tabla usamos el primer año seleccionado
  const anio = anios[anios.length - 1]; // año más reciente para tabla
  const realesPorMes = realesPorAnioMes[anio] || {};
  const objetivosAnio = objetivos[anio] || {};

  async function guardarCampo(mes, campo, valor) {
    setSaving(true);
    const tk = await getToken();
    const body = { anio: anio, mes, [campo]: parseFloat(valor) || null };
    if ((objetivos[anio] || {})[mes]) {
      await fetch(`${SUPA_URL}/objetivos_mensuales?anio=eq.${anio}&mes=eq.${mes}`, {
        method: "PATCH", headers: hdrs(tk), body: JSON.stringify({ [campo]: parseFloat(valor) || null })
      });
    } else {
      await fetch(`${SUPA_URL}/objetivos_mensuales`, {
        method: "POST", headers: hdrs(tk), body: JSON.stringify(body)
      });
    }
    await cargarObjetivos();
    setEditando(null);
    setSaving(false);
  }

  // SVG gráfico
  const W = 680, H = 200, PAD = { top: 16, right: 16, bottom: 48, left: 56 };
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;
  const xStep = innerW / 11;

  // Valores para escala — todos los años
  const todosVals = anios.flatMap(a => Array.from({ length: 12 }, (_, i) => {
    const r = (realesPorAnioMes[a] || {})[i+1];
    return r ? (metrica === "monto" ? r.monto_usd : r.cantidad) : 0;
  }));
  const objVals = Array.from({ length: 12 }, (_, i) => {
    const o = objetivosAnio[i+1];
    return o ? (metrica === "monto" ? (o.objetivo_usd || 0) : (o.objetivo_qty || 0)) : 0;
  });
  const maxVal = Math.max(...todosVals, ...objVals, 1);
  const valores = Array.from({ length: 12 }, (_, i) => metrica === "monto" ? (realesPorMes[i+1]?.monto_usd || 0) : (realesPorMes[i+1]?.cantidad || 0));

  function xPos(i) { return PAD.left + i * xStep; }
  function yPos(v) { return PAD.top + innerH - (v / maxVal) * innerH; }

  const ptsReal = valores.map((v, i) => ({ x: xPos(i), y: yPos(v), v, m: i+1 }));
  const ptsObj  = objVals.map((v, i) => ({ x: xPos(i), y: yPos(v), v, m: i+1 }));

  const lineReal = ptsReal.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  const lineObj  = ptsObj.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");

  const ticks = Array.from({ length: 5 }, (_, i) => ({
    v: maxVal * (i+1) / 5,
    y: yPos(maxVal * (i+1) / 5),
  }));

  function fmtVal(v) {
    if (metrica === "monto") return v >= 1000 ? `U$S ${Math.round(v/1000)}k` : `U$S ${Math.round(v)}`;
    return String(Math.round(v));
  }

  function CeldaEdit({ mes, campo, valor, prefix = "" }) {
    const key = `${mes}-${campo}`;
    if (editando === key) {
      return (
        <input autoFocus type="number" defaultValue={valor || ""}
          style={{ width: 72, padding: "2px 4px", border: "1.5px solid #3b82f6", borderRadius: 4, fontSize: 11, textAlign: "right" }}
          onBlur={e => guardarCampo(mes, campo, e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") e.target.blur(); if (e.key === "Escape") setEditando(null); }}
        />
      );
    }
    return (
      <span onClick={() => setEditando(key)} style={{ cursor: "pointer", color: valor ? "#111" : "#bbb", fontSize: 11 }}
        title="Click para editar">
        {valor ? `${prefix}${Number(valor).toLocaleString("es-AR")}` : "—"}
      </span>
    );
  }

  return (
    <div style={{ background: "#fff", borderRadius: 12, border: "1.5px solid #e8e8e8", marginBottom: 16, overflow: "hidden" }}>
      {/* Header hamburguesa */}
      <div onClick={() => setAbierto(a => !a)}
        style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", cursor: "pointer", userSelect: "none" }}
        onMouseEnter={e => e.currentTarget.style.background = "#fafafa"}
        onMouseLeave={e => e.currentTarget.style.background = "#fff"}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 16 }}>📈</span>
          <div>
            <span style={{ fontSize: 13, fontWeight: 800, color: "#111" }}>Objetivo vs Real</span>
            <span style={{ fontSize: 11, color: "#aaa", marginLeft: 8 }}>Aprobados por mes</span>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {tcRef.mep && <span style={{ fontSize: 11, color: "#888", background: "#f8f8f8", padding: "3px 8px", borderRadius: 5 }}>MEP ${tcRef.mep?.toLocaleString("es-AR")}</span>}
          <span style={{ fontSize: 18, color: "#aaa", transform: abierto ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}>⌄</span>
        </div>
      </div>

      {/* Contenido desplegable */}
      {abierto && (
        <div style={{ borderTop: "1px solid #f0f0f0", padding: "16px 20px" }}>
          {/* Controles */}
          <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
            {/* Año */}
            <div style={{ display: "flex", gap: 4 }}>
              {ANIOS.map(a => (
                <button key={a} onClick={() => toggleAnio(a)} style={{
                  padding: "4px 10px", borderRadius: 6, border: `1.5px solid ${anios.includes(a) ? (COLORES[a] || "#111") : "#e0e0e0"}`,
                  background: anios.includes(a) ? (COLORES[a] || "#111") : "#f8f8f8",
                  color: anios.includes(a) ? "#fff" : "#666",
                  fontSize: 11, fontWeight: 700, cursor: "pointer"
                }}>{a}</button>
              ))}
            </div>

            {/* Métrica */}
            <div style={{ display: "flex", background: "#f0f0f0", borderRadius: 8, padding: 2 }}>
              {[["monto","U$S"],["cantidad","Qty"]].map(([v,l]) => (
                <button key={v} onClick={() => setMetrica(v)} style={{
                  padding: "4px 12px", borderRadius: 6, border: "none", fontSize: 11,
                  fontWeight: metrica === v ? 700 : 400,
                  background: metrica === v ? "#111" : "transparent",
                  color: metrica === v ? "#fff" : "#666", cursor: "pointer"
                }}>{l}</button>
              ))}
            </div>

            {/* TC tipo */}
            <div style={{ display: "flex", background: "#f0f0f0", borderRadius: 8, padding: 2 }}>
              {TC_TIPOS.map(t => (
                <button key={t.v} onClick={() => setTcTipo(t.v)} style={{
                  padding: "4px 10px", borderRadius: 6, border: "none", fontSize: 11,
                  fontWeight: tcTipo === t.v ? 700 : 400,
                  background: tcTipo === t.v ? "#3b82f6" : "transparent",
                  color: tcTipo === t.v ? "#fff" : "#666", cursor: "pointer"
                }}>{t.label} {tcRef[t.v] ? `$${Math.round(tcRef[t.v]/1000)}k` : ""}</button>
              ))}
            </div>

            <span style={{ fontSize: 11, color: "#aaa", marginLeft: "auto" }}>* Click en celda para editar objetivo o TC</span>
          </div>

          {/* Gráfico SVG */}
          <div style={{ overflowX: "auto", marginBottom: 16 }}>
            <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ display: "block" }}>
              {/* Grid + ticks Y */}
              {ticks.map((t, i) => (
                <g key={i}>
                  <line x1={PAD.left} y1={t.y} x2={W - PAD.right} y2={t.y} stroke="#f0f0f0" strokeWidth="1" />
                  <text x={PAD.left - 6} y={t.y + 4} textAnchor="end" fontSize="10" fill="#bbb">{fmtVal(t.v)}</text>
                </g>
              ))}
              {/* Línea hoy */}
              {anio === ANIO_ACTUAL && (
                <line x1={xPos(MES_ACTUAL-1)} y1={PAD.top} x2={xPos(MES_ACTUAL-1)} y2={H - PAD.bottom}
                  stroke="#e0e0e0" strokeWidth="1" strokeDasharray="3,3" />
              )}
              {/* Línea objetivo */}
              {ptsObj.some(p => p.v > 0) && (
                <path d={lineObj} fill="none" stroke="#3b82f6" strokeWidth="1.5" strokeDasharray="6,3" />
              )}
              {/* Líneas años comparativos */}
              {anios.map(a => {
                const color = COLORES[a] || "#888";
                const pts = Array.from({ length: 12 }, (_, i) => {
                  const r = (realesPorAnioMes[a] || {})[i+1];
                  const v = r ? (metrica === "monto" ? r.monto_usd : r.cantidad) : 0;
                  return { x: xPos(i), y: yPos(v), v, m: i+1 };
                });
                const line = pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
                const esActual = a === anio;
                return (
                  <g key={a}>
                    {esActual && <path d={`${line} L ${pts[11].x} ${H - PAD.bottom} L ${PAD.left} ${H - PAD.bottom} Z`}
                      fill={color} fillOpacity="0.06" />}
                    <path d={line} fill="none" stroke={color} strokeWidth={esActual ? 2.5 : 1.5}
                      strokeLinecap="round" strokeLinejoin="round" strokeOpacity={esActual ? 1 : 0.6} />
                    {pts.map((p, i) => {
                      const obj = ptsObj[i].v;
                      const cumple = obj > 0 && p.v >= obj;
                      const futuro = a === ANIO_ACTUAL && p.m > MES_ACTUAL;
                      return p.v > 0 ? (
                        <g key={i}>
                          <circle cx={p.x} cy={p.y} r={esActual ? 5 : 3}
                            fill={futuro ? "#fff" : color} stroke={color} strokeWidth="2" />
                          {esActual && !futuro && (
                            <text x={p.x} y={p.y - 8} textAnchor="middle" fontSize="9" fill={color} fontWeight="700">
                              {fmtVal(p.v)}
                            </text>
                          )}
                        </g>
                      ) : null;
                    })}
                  </g>
                );
              })}
              {/* Labels eje X */}
              {MESES.map((m, i) => (
                <text key={i} x={xPos(i)} y={H - PAD.bottom + 14} textAnchor="middle" fontSize="10"
                  fill={anio === ANIO_ACTUAL && i+1 === MES_ACTUAL ? "#111" : "#bbb"}
                  fontWeight={anio === ANIO_ACTUAL && i+1 === MES_ACTUAL ? "700" : "400"}>{m}</text>
              ))}
            </svg>
          </div>

          {/* Leyenda */}
          <div style={{ display: "flex", gap: 12, marginBottom: 12, flexWrap: "wrap", alignItems: "center" }}>
            {anios.map(a => (
              <div key={a} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: "#555" }}>
                <svg width="16" height="4"><line x1="0" y1="2" x2="16" y2="2" stroke={COLORES[a] || "#888"} strokeWidth={a === anio ? "2.5" : "1.5"} /></svg>
                {a}
              </div>
            ))}
            <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: "#555" }}>
              <svg width="16" height="4"><line x1="0" y1="2" x2="16" y2="2" stroke="#3b82f6" strokeWidth="1.5" strokeDasharray="4,2" /></svg> Objetivo
            </div>
          </div>

          {/* Tabla */}
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr style={{ borderBottom: "2px solid #f0f0f0" }}>
                  {["Mes","ARS real","TC $/USD","USD real","Obj. USD","Obj. Qty","Qty real","%"].map(h => (
                    <th key={h} style={{ padding: "5px 8px", textAlign: h === "Mes" ? "left" : "right", fontSize: 10, fontWeight: 700, color: "#aaa", textTransform: "uppercase" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {MESES.map((nombre, i) => {
                  const m = i + 1;
                  const real = realesPorMes[m];
                  const obj = objetivosAnio[m] || {};
                  const esMesActual = anio === ANIO_ACTUAL && m === MES_ACTUAL;
                  const esFuturo = anio === ANIO_ACTUAL && m > MES_ACTUAL;
                  const cumpleMonto = obj.objetivo_usd && real.monto_usd >= obj.objetivo_usd;
                  const pct = obj.objetivo_usd ? Math.round(real.monto_usd / obj.objetivo_usd * 100) : null;
                  return (
                    <tr key={m} style={{ borderBottom: "1px solid #f8f8f8", background: esMesActual ? "#f0fdf4" : "#fff", opacity: esFuturo ? 0.5 : 1 }}>
                      <td style={{ padding: "6px 8px", fontWeight: esMesActual ? 800 : 500, color: esMesActual ? "#1a8a5e" : "#333" }}>
                        {nombre} {esMesActual && <span style={{ fontSize: 9, background: "#1a8a5e", color: "#fff", borderRadius: 3, padding: "1px 4px", marginLeft: 3 }}>HOY</span>}
                      </td>
                      <td style={{ padding: "6px 8px", textAlign: "right", color: "#666", fontFamily: "monospace", fontSize: 11 }}>
                        {real.monto_ars > 0 ? `$${Math.round(real.monto_ars).toLocaleString("es-AR")}` : "—"}
                      </td>
                      <td style={{ padding: "6px 8px", textAlign: "right" }}>
                        <CeldaEdit mes={m} campo="tipo_cambio" valor={obj.tipo_cambio} prefix="$" />
                      </td>
                      <td style={{ padding: "6px 8px", textAlign: "right", fontWeight: 600, color: cumpleMonto ? "#1a8a5e" : "#333", fontFamily: "monospace", fontSize: 11 }}>
                        {real.monto_usd > 0 ? `U$S ${Math.round(real.monto_usd).toLocaleString("es-AR")}` : "—"}
                      </td>
                      <td style={{ padding: "6px 8px", textAlign: "right", color: "#3b82f6" }}>
                        <CeldaEdit mes={m} campo="objetivo_usd" valor={obj.objetivo_usd} prefix="U$S " />
                      </td>
                      <td style={{ padding: "6px 8px", textAlign: "right", color: "#3b82f6" }}>
                        <CeldaEdit mes={m} campo="objetivo_qty" valor={obj.objetivo_qty} />
                      </td>
                      <td style={{ padding: "6px 8px", textAlign: "right", fontWeight: 600, color: obj.objetivo_qty && real.cantidad >= obj.objetivo_qty ? "#1a8a5e" : "#333" }}>
                        {real.cantidad > 0 ? real.cantidad : "—"}
                      </td>
                      <td style={{ padding: "6px 8px", textAlign: "right" }}>
                        {pct !== null && !esFuturo ? (
                          <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 7px", borderRadius: 20,
                            color: pct >= 100 ? "#1a8a5e" : pct >= 70 ? "#c4781a" : "#c0392b",
                            background: pct >= 100 ? "#f0fdf4" : pct >= 70 ? "#fffbeb" : "#fef2f2" }}>
                            {pct}%
                          </span>
                        ) : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
