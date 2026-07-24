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

export default function GraficoObjetivos({ presupuestos }) {
  const [anio, setAnio] = useState(ANIO_ACTUAL);
  const [metrica, setMetrica] = useState("monto"); // "monto" | "cantidad"
  const [objetivos, setObjetivos] = useState({});
  const [editando, setEditando] = useState(null); // { mes, campo, valor }
  const [saving, setSaving] = useState(false);
  const [tipoCambioRef, setTipoCambioRef] = useState(null);

  // Traer tipo de cambio dólar blue
  useEffect(() => {
    fetch("https://dolarapi.com/v1/dolares/blue")
      .then(r => r.json())
      .then(d => setTipoCambioRef(d.venta))
      .catch(() => {});
  }, []);

  const cargarObjetivos = useCallback(async () => {
    const tk = await getToken();
    const r = await fetch(`${SUPA_URL}/objetivos_mensuales?anio=eq.${anio}&order=mes.asc`, {
      headers: hdrs(tk)
    }).then(r => r.json());
    const map = {};
    (Array.isArray(r) ? r : []).forEach(o => { map[o.mes] = o; });
    setObjetivos(map);
  }, [anio]);

  useEffect(() => { cargarObjetivos(); }, [cargarObjetivos]);

  // Calcular reales por mes del año seleccionado
  const realesPorMes = {};
  for (let m = 1; m <= 12; m++) {
    const aprobados = presupuestos.filter(p => {
      if (p.estado !== "aprobado" || p.archivado) return false;
      const f = p.fecha_aprobacion || p.fecha_emision;
      if (!f) return false;
      const [y, mo] = f.split("-").map(Number);
      return y === anio && mo === m;
    });
    const tc = objetivos[m]?.tipo_cambio || 1;
    realesPorMes[m] = {
      monto_ars: aprobados.reduce((s, p) => s + (parseFloat(p.monto) || 0), 0),
      monto_usd: tc > 0 ? aprobados.reduce((s, p) => s + (parseFloat(p.monto) || 0), 0) / tc : 0,
      cantidad: aprobados.length,
    };
  }

  async function guardarCampo(mes, campo, valor) {
    setSaving(true);
    const tk = await getToken();
    const existe = objetivos[mes];
    const body = { anio, mes, [campo]: valor || null };
    if (existe) {
      await fetch(`${SUPA_URL}/objetivos_mensuales?anio=eq.${anio}&mes=eq.${mes}`, {
        method: "PATCH", headers: hdrs(tk), body: JSON.stringify({ [campo]: valor || null })
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

  // Calcular escala del gráfico
  const valores = Object.values(realesPorMes).map(r => metrica === "monto" ? r.monto_usd : r.cantidad);
  const objVals = Object.values(objetivos).map(o => metrica === "monto" ? (o.objetivo_usd || 0) : (o.objetivo_qty || 0));
  const maxVal = Math.max(...valores, ...objVals, 1);

  const W = 700, H = 220, PAD = { top: 20, right: 20, bottom: 60, left: 60 };
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;
  const xStep = innerW / 11;

  function xPos(i) { return PAD.left + i * xStep; }
  function yPos(v) { return PAD.top + innerH - (v / maxVal) * innerH; }

  const puntosReal = Array.from({ length: 12 }, (_, i) => {
    const m = i + 1;
    const v = metrica === "monto" ? realesPorMes[m].monto_usd : realesPorMes[m].cantidad;
    return { x: xPos(i), y: yPos(v), v, m };
  });

  const puntosObj = Array.from({ length: 12 }, (_, i) => {
    const m = i + 1;
    const obj = objetivos[m];
    const v = obj ? (metrica === "monto" ? (obj.objetivo_usd || 0) : (obj.objetivo_qty || 0)) : 0;
    return { x: xPos(i), y: yPos(v), v, m };
  });

  const lineReal = puntosReal.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  const lineObj  = puntosObj.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");

  // Ticks Y
  const nTicks = 5;
  const ticks = Array.from({ length: nTicks + 1 }, (_, i) => ({
    v: Math.round(maxVal * i / nTicks),
    y: yPos(maxVal * i / nTicks),
  }));

  function fmtVal(v) {
    if (metrica === "monto") return v >= 1000 ? `U$S ${(v/1000).toFixed(0)}k` : `U$S ${Math.round(v)}`;
    return `${v}`;
  }

  const aniosDisponibles = [2023, 2024, 2025, 2026, 2027];

  return (
    <div style={{ background: "#fff", borderRadius: 12, border: "1.5px solid #e8e8e8", padding: "20px 24px", marginTop: 24 }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
        <div>
          <h3 style={{ margin: 0, fontSize: 14, fontWeight: 800, color: "#111" }}>📈 Objetivo vs Real</h3>
          <p style={{ margin: "2px 0 0", fontSize: 11, color: "#aaa" }}>Aprobados por mes · {anio}</p>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {/* Tipo de cambio referencial */}
          {tipoCambioRef && (
            <span style={{ fontSize: 11, color: "#888", background: "#f8f8f8", padding: "4px 10px", borderRadius: 6, border: "1px solid #e8e8e8" }}>
              💵 Dólar blue ref: ${tipoCambioRef?.toLocaleString("es-AR")}
            </span>
          )}
          {/* Métrica */}
          <div style={{ display: "flex", background: "#f0f0f0", borderRadius: 8, padding: 2 }}>
            {[["monto","U$S"],["cantidad","Qty"]].map(([v, l]) => (
              <button key={v} onClick={() => setMetrica(v)} style={{
                padding: "4px 12px", borderRadius: 6, border: "none", fontSize: 11, fontWeight: metrica === v ? 700 : 400,
                background: metrica === v ? "#111" : "transparent", color: metrica === v ? "#fff" : "#666", cursor: "pointer"
              }}>{l}</button>
            ))}
          </div>
          {/* Año */}
          <select value={anio} onChange={e => setAnio(parseInt(e.target.value))} style={{ fontSize: 12, padding: "5px 10px", border: "1.5px solid #e0e0e0", borderRadius: 7, cursor: "pointer", fontWeight: 700 }}>
            {aniosDisponibles.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>
      </div>

      {/* Gráfico SVG */}
      <div style={{ overflowX: "auto" }}>
        <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ display: "block", maxWidth: "100%" }}>
          {/* Grid */}
          {ticks.map(t => (
            <g key={t.v}>
              <line x1={PAD.left} y1={t.y} x2={W - PAD.right} y2={t.y} stroke="#f0f0f0" strokeWidth="1" />
              <text x={PAD.left - 6} y={t.y + 4} textAnchor="end" fontSize="10" fill="#aaa">{fmtVal(t.v)}</text>
            </g>
          ))}

          {/* Mes actual — línea vertical */}
          {anio === ANIO_ACTUAL && (
            <line x1={xPos(MES_ACTUAL - 1)} y1={PAD.top} x2={xPos(MES_ACTUAL - 1)} y2={H - PAD.bottom}
              stroke="#e0e0e0" strokeWidth="1" strokeDasharray="4,3" />
          )}

          {/* Línea objetivo */}
          {puntosObj.some(p => p.v > 0) && (
            <path d={lineObj} fill="none" stroke="#3b82f6" strokeWidth="2" strokeDasharray="6,3" />
          )}

          {/* Línea real */}
          <path d={lineReal} fill="none" stroke="#1a8a5e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

          {/* Puntos real */}
          {puntosReal.map((p, i) => {
            const futuro = anio === ANIO_ACTUAL && p.m > MES_ACTUAL;
            return (
              <circle key={i} cx={p.x} cy={p.y} r={p.v > 0 ? 5 : 3}
                fill={futuro ? "#fff" : "#1a8a5e"} stroke="#1a8a5e" strokeWidth="2" />
            );
          })}

          {/* Puntos objetivo */}
          {puntosObj.map((p, i) => p.v > 0 && (
            <circle key={i} cx={p.x} cy={p.y} r={4} fill="#fff" stroke="#3b82f6" strokeWidth="2" />
          ))}

          {/* Eje X — labels de mes */}
          {MESES.map((m, i) => (
            <text key={i} x={xPos(i)} y={H - PAD.bottom + 16} textAnchor="middle" fontSize="11" fill="#888">{m}</text>
          ))}
        </svg>
      </div>

      {/* Leyenda */}
      <div style={{ display: "flex", gap: 16, marginBottom: 16, marginTop: 4 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "#555" }}>
          <svg width="20" height="4"><line x1="0" y1="2" x2="20" y2="2" stroke="#1a8a5e" strokeWidth="2.5" /></svg>
          Real aprobado
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "#555" }}>
          <svg width="20" height="4"><line x1="0" y1="2" x2="20" y2="2" stroke="#3b82f6" strokeWidth="2" strokeDasharray="4,2" /></svg>
          Objetivo
        </div>
      </div>

      {/* Tabla editable por mes */}
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
          <thead>
            <tr style={{ borderBottom: "2px solid #e8e8e8" }}>
              <th style={{ padding: "6px 8px", textAlign: "left", color: "#aaa", fontWeight: 700, fontSize: 10, textTransform: "uppercase" }}>Mes</th>
              <th style={{ padding: "6px 8px", textAlign: "right", color: "#aaa", fontWeight: 700, fontSize: 10, textTransform: "uppercase" }}>Aprobado ARS</th>
              <th style={{ padding: "6px 8px", textAlign: "right", color: "#aaa", fontWeight: 700, fontSize: 10, textTransform: "uppercase" }}>TC ($/USD)</th>
              <th style={{ padding: "6px 8px", textAlign: "right", color: "#aaa", fontWeight: 700, fontSize: 10, textTransform: "uppercase" }}>Aprobado USD</th>
              <th style={{ padding: "6px 8px", textAlign: "right", color: "#3b82f6", fontWeight: 700, fontSize: 10, textTransform: "uppercase" }}>Obj. USD</th>
              <th style={{ padding: "6px 8px", textAlign: "right", color: "#3b82f6", fontWeight: 700, fontSize: 10, textTransform: "uppercase" }}>Obj. Qty</th>
              <th style={{ padding: "6px 8px", textAlign: "right", color: "#aaa", fontWeight: 700, fontSize: 10, textTransform: "uppercase" }}>Qty real</th>
              <th style={{ padding: "6px 8px", textAlign: "right", color: "#aaa", fontWeight: 700, fontSize: 10, textTransform: "uppercase" }}>%</th>
            </tr>
          </thead>
          <tbody>
            {MESES.map((nombre, i) => {
              const m = i + 1;
              const real = realesPorMes[m];
              const obj = objetivos[m] || {};
              const esFuturo = anio === ANIO_ACTUAL && m > MES_ACTUAL;
              const esMesActual = anio === ANIO_ACTUAL && m === MES_ACTUAL;
              const cumpleMonto = obj.objetivo_usd && real.monto_usd >= obj.objetivo_usd;
              const cumpleQty = obj.objetivo_qty && real.cantidad >= obj.objetivo_qty;
              const pctMonto = obj.objetivo_usd ? Math.round(real.monto_usd / obj.objetivo_usd * 100) : null;

              function CeldaEditable({ campo, valor, prefix = "" }) {
                const key = `${m}-${campo}`;
                const editKey = editando?.key === key;
                if (editKey) {
                  return (
                    <input autoFocus type="number" defaultValue={valor || ""}
                      style={{ width: 80, padding: "2px 6px", border: "1.5px solid #3b82f6", borderRadius: 4, fontSize: 12, textAlign: "right" }}
                      onBlur={e => guardarCampo(m, campo, parseFloat(e.target.value) || null)}
                      onKeyDown={e => { if (e.key === "Enter") e.target.blur(); if (e.key === "Escape") setEditando(null); }}
                    />
                  );
                }
                return (
                  <span onClick={() => !esFuturo || campo === "objetivo_usd" || campo === "objetivo_qty" || campo === "tipo_cambio" ? setEditando({ key }) : null}
                    style={{ cursor: "pointer", padding: "2px 4px", borderRadius: 4, display: "inline-block",
                      background: editando ? "transparent" : "transparent",
                      color: valor ? "#111" : "#ccc" }}
                    title="Click para editar">
                    {valor ? `${prefix}${valor.toLocaleString("es-AR")}` : "—"}
                  </span>
                );
              }

              return (
                <tr key={m} style={{
                  borderBottom: "1px solid #f0f0f0",
                  background: esMesActual ? "#f0fdf4" : esFuturo ? "#fafafa" : "#fff",
                  opacity: esFuturo ? 0.6 : 1,
                }}>
                  <td style={{ padding: "7px 8px", fontWeight: esMesActual ? 800 : 500, color: esMesActual ? "#1a8a5e" : "#333" }}>
                    {nombre} {esMesActual && <span style={{ fontSize: 9, background: "#1a8a5e", color: "#fff", borderRadius: 4, padding: "1px 5px", marginLeft: 4 }}>HOY</span>}
                  </td>
                  <td style={{ padding: "7px 8px", textAlign: "right", color: "#555", fontFamily: "JetBrains Mono, monospace" }}>
                    {real.monto_ars > 0 ? `$${Math.round(real.monto_ars).toLocaleString("es-AR")}` : "—"}
                  </td>
                  <td style={{ padding: "7px 8px", textAlign: "right" }}>
                    <CeldaEditable campo="tipo_cambio" valor={obj.tipo_cambio} prefix="$" />
                  </td>
                  <td style={{ padding: "7px 8px", textAlign: "right", fontWeight: 600, color: cumpleMonto ? "#1a8a5e" : "#333", fontFamily: "JetBrains Mono, monospace" }}>
                    {real.monto_usd > 0 ? `U$S ${Math.round(real.monto_usd).toLocaleString("es-AR")}` : "—"}
                  </td>
                  <td style={{ padding: "7px 8px", textAlign: "right" }}>
                    <CeldaEditable campo="objetivo_usd" valor={obj.objetivo_usd} prefix="U$S " />
                  </td>
                  <td style={{ padding: "7px 8px", textAlign: "right" }}>
                    <CeldaEditable campo="objetivo_qty" valor={obj.objetivo_qty} />
                  </td>
                  <td style={{ padding: "7px 8px", textAlign: "right", fontWeight: 600, color: cumpleQty ? "#1a8a5e" : "#333" }}>
                    {real.cantidad > 0 ? real.cantidad : "—"}
                  </td>
                  <td style={{ padding: "7px 8px", textAlign: "right" }}>
                    {pctMonto !== null && !esFuturo ? (
                      <span style={{ fontSize: 11, fontWeight: 700, color: pctMonto >= 100 ? "#1a8a5e" : pctMonto >= 70 ? "#c4781a" : "#c0392b",
                        background: pctMonto >= 100 ? "#f0fdf4" : pctMonto >= 70 ? "#fffbeb" : "#fef2f2",
                        padding: "2px 8px", borderRadius: 20 }}>
                        {pctMonto}%
                      </span>
                    ) : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p style={{ fontSize: 10, color: "#ccc", marginTop: 8 }}>* Click en cualquier celda azul para editar objetivo o tipo de cambio</p>
    </div>
  );
}
