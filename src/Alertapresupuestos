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

/* ─── Configuración visual de niveles ─── */
const NIVELES = {
  vencido:     { color: "#7c1d1d", bg: "#fef2f2", border: "#ef4444", icon: "🚨", label: "Vencido" },
  critico:     { color: "#c0392b", bg: "#fef2f2", border: "#f87171", icon: "🔴", label: "Crítico" },
  archivar:    { color: "#4b3a1a", bg: "#fffbeb", border: "#f59e0b", icon: "⚫", label: "Sin respuesta" },
  urgente:     { color: "#c4781a", bg: "#fff7ed", border: "#fb923c", icon: "🟠", label: "Urgente" },
  por_vencer:  { color: "#c4781a", bg: "#fff7ed", border: "#fb923c", icon: "⏳", label: "Por vencer" },
  advertencia: { color: "#854d0e", bg: "#fefce8", border: "#eab308", icon: "🟡", label: "Seguimiento" },
  ok:          { color: "#166534", bg: "#f0fdf4", border: "#4ade80", icon: "✅", label: "OK" },
};

/* ─── Mensajes pre-redactados ─── */
function getMensaje(alerta) {
  const cod  = alerta.codigo  || "";
  const cli  = alerta.cliente || "";
  const desc = alerta.descripcion || "";

  const MENSAJES = {
    seguimiento_3d: `Hola${cli ? ` ${cli}` : ""}! Quería confirmar que hayas recibido bien el presupuesto *${cod}*${desc ? ` - ${desc}` : ""}. Quedamos disponibles para cualquier consulta. Saludos, NPL Ingeniería`,
    seguimiento_7d: `Hola${cli ? ` ${cli}` : ""}! Te escribimos para hacer un seguimiento del presupuesto *${cod}*${desc ? ` - ${desc}` : ""}. ¿Pudiste revisarlo? Estamos a disposición. Saludos, NPL Ingeniería`,
    seguimiento_14d: `Hola${cli ? ` ${cli}` : ""}! Notamos que el presupuesto *${cod}* lleva un tiempo sin respuesta. Si necesitás ajustar algo de la propuesta o tenés alguna duda, con gusto lo analizamos. Saludos, NPL Ingeniería`,
    negociacion_5d: `Hola${cli ? ` ${cli}` : ""}! Queríamos saber si pudiste avanzar con la confirmación del presupuesto *${cod}*. Para reservar agenda necesitamos la aprobación. ¿Cómo seguimos? Saludos, NPL Ingeniería`,
    negociacion_critico: `Hola${cli ? ` ${cli}` : ""}! Te recordamos que el presupuesto *${cod}* está en etapa de negociación y necesitamos confirmar para reservar tu fecha de inicio. ¿Podemos avanzar? Saludos, NPL Ingeniería`,
    recordatorio_anticipo: `Hola${cli ? ` ${cli}` : ""}! Te recordamos que para dar inicio a los trabajos del proyecto *${cod}* necesitamos el anticipo del 50%. ¿Cómo lo coordinamos? Saludos, NPL Ingeniería`,
  };

  return MENSAJES[alerta.tipo_mensaje] || `Seguimiento presupuesto *${cod}* - NPL Ingeniería`;
}

/* ─── Card de alerta individual ─── */
function CardAlerta({ alerta, onContactar, onMarcarContactado, onArchivar }) {
  const [expandido, setExpandido] = useState(false);
  const nivel = NIVELES[alerta.nivel_alerta] || NIVELES.advertencia;
  const mensaje = getMensaje(alerta);

  const diasLabel = alerta.dias_sin_contacto > 0
    ? `${alerta.dias_sin_contacto}d sin contacto`
    : "Recién enviado";

  const vencLabel = alerta.dias_hasta_vencimiento !== null
    ? alerta.dias_hasta_vencimiento <= 0
      ? `Vencido hace ${Math.abs(alerta.dias_hasta_vencimiento)}d`
      : `Vence en ${alerta.dias_hasta_vencimiento}d`
    : null;

  return (
    <div style={{
      background: nivel.bg, border: `1.5px solid ${nivel.border}`,
      borderLeft: `4px solid ${nivel.border}`, borderRadius: 12,
      marginBottom: 8, overflow: "hidden",
    }}>
      {/* Fila principal */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", cursor: "pointer" }}
        onClick={() => setExpandido(!expandido)}>
        <span style={{ fontSize: 18, flexShrink: 0 }}>{nivel.icon}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, fontWeight: 700, color: nivel.color }}>
              [{alerta.codigo}]
            </span>
            <span style={{ fontSize: 13, fontWeight: 700, color: nivel.color }}>{alerta.descripcion || "Sin descripción"}</span>
            <span style={{ fontSize: 11, background: nivel.border + "33", color: nivel.color, borderRadius: 4, padding: "1px 6px", fontWeight: 700 }}>
              {nivel.label}
            </span>
            {alerta.estado === "aprobado" && !alerta.anticipo_cobrado && (
              <span style={{ fontSize: 11, background: "#fef2f2", color: "#c0392b", borderRadius: 4, padding: "1px 6px", fontWeight: 700 }}>
                💰 Sin anticipo
              </span>
            )}
          </div>
          <div style={{ fontSize: 12, color: nivel.color + "bb", marginTop: 2, display: "flex", gap: 12, flexWrap: "wrap" }}>
            <span>{alerta.cliente || "Sin cliente"}</span>
            <span>·</span>
            <span style={{ fontWeight: 700 }}>{diasLabel}</span>
            {vencLabel && <><span>·</span><span style={{ fontWeight: 700 }}>{vencLabel}</span></>}
            {alerta.monto && <><span>·</span><span>${parseFloat(alerta.monto).toLocaleString("es-AR")}</span></>}
          </div>
        </div>
        <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
          {/* Botón WhatsApp */}
          {alerta.cliente_wsp && (
            <button onClick={e => { e.stopPropagation(); onContactar(alerta, "whatsapp"); }}
              style={{ background: "#25d366", color: "#fff", border: "none", borderRadius: 8, padding: "6px 12px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
              💬 WA
            </button>
          )}
          {/* Botón Email */}
          {alerta.cliente_mail && (
            <button onClick={e => { e.stopPropagation(); onContactar(alerta, "email"); }}
              style={{ background: "#3b82f6", color: "#fff", border: "none", borderRadius: 8, padding: "6px 12px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
              ✉️
            </button>
          )}
          <span style={{ fontSize: 12, color: nivel.color, padding: "6px 4px" }}>{expandido ? "▲" : "▼"}</span>
        </div>
      </div>

      {/* Panel expandido */}
      {expandido && (
        <div style={{ padding: "0 16px 14px", borderTop: `1px solid ${nivel.border}33` }}>
          {/* Mensaje pre-redactado */}
          <div style={{ background: "rgba(255,255,255,.6)", borderRadius: 8, padding: 12, marginBottom: 12, marginTop: 10 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: nivel.color, marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 }}>
              💬 Mensaje sugerido
            </div>
            <div style={{ fontSize: 13, color: "#333", lineHeight: 1.5, whiteSpace: "pre-wrap" }}>{mensaje}</div>
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {alerta.cliente_wsp && (
              <button onClick={() => onContactar(alerta, "whatsapp")}
                style={{ background: "#25d366", color: "#fff", border: "none", borderRadius: 8, padding: "8px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                💬 Enviar por WhatsApp
              </button>
            )}
            {alerta.cliente_mail && (
              <button onClick={() => onContactar(alerta, "email")}
                style={{ background: "#3b82f6", color: "#fff", border: "none", borderRadius: 8, padding: "8px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                ✉️ Enviar por Email
              </button>
            )}
            <button onClick={() => onMarcarContactado(alerta.id)}
              style={{ background: "#fff", color: "#555", border: "1.5px solid #ddd", borderRadius: 8, padding: "8px 14px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
              ✓ Marcar contactado hoy
            </button>
            {alerta.nivel_alerta === "archivar" && (
              <button onClick={() => onArchivar(alerta.id)}
                style={{ background: "#fff", color: "#888", border: "1.5px solid #ddd", borderRadius: 8, padding: "8px 14px", fontSize: 12, cursor: "pointer" }}>
                📦 Archivar
              </button>
            )}
            {!alerta.cliente_wsp && !alerta.cliente_mail && (
              <span style={{ fontSize: 12, color: "#aaa", padding: "8px 0" }}>
                ⚠️ Sin datos de contacto — vinculá el cliente para habilitar envíos
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Panel principal de alertas ─── */
export default function AlertasPresupuestos({ onClose }) {
  const [alertas, setAlertas]     = useState([]);
  const [loading, setLoading]     = useState(true);
  const [filtroNivel, setFiltroNivel] = useState("todos");
  const [msg, setMsg]             = useState("");

  const cargar = useCallback(async () => {
    setLoading(true);
    const tk = await getToken();
    const r = await fetch(`${SUPA_URL}/vista_alertas_presupuestos`, { headers: hdrs(tk) }).then(r => r.json());
    setAlertas(Array.isArray(r) ? r.filter(a => a.nivel_alerta !== "ok") : []);
    setLoading(false);
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  async function marcarContactado(id) {
    const tk = await getToken();
    await fetch(`${SUPA_URL}/presupuestos?id=eq.${id}`, {
      method: "PATCH", headers: hdrs(tk),
      body: JSON.stringify({ fecha_ultimo_contacto: new Date().toISOString().slice(0, 10) }),
    });
    setMsg("✓ Marcado como contactado hoy");
    setTimeout(() => setMsg(""), 2000);
    await cargar();
  }

  async function archivar(id) {
    const tk = await getToken();
    await fetch(`${SUPA_URL}/presupuestos?id=eq.${id}`, {
      method: "PATCH", headers: hdrs(tk),
      body: JSON.stringify({ archivado: true }),
    });
    setMsg("✓ Archivado");
    setTimeout(() => setMsg(""), 2000);
    await cargar();
  }

  function contactar(alerta, canal) {
    const mensaje = getMensaje(alerta);

    if (canal === "whatsapp") {
      const numero = (alerta.cliente_wsp || "").replace(/\D/g, "");
      const texto = encodeURIComponent(mensaje);
      window.open(`https://wa.me/${numero}?text=${texto}`, "_blank");
    } else {
      const asunto = encodeURIComponent(`Seguimiento presupuesto NPL ${alerta.codigo}`);
      const cuerpo = encodeURIComponent(mensaje);
      window.open(`mailto:${alerta.cliente_mail}?subject=${asunto}&body=${cuerpo}`, "_blank");
    }

    // Actualizar fecha_ultimo_contacto automáticamente al contactar
    marcarContactado(alerta.id);
  }

  // Filtrar por nivel
  const ORDEN_NIVELES = ["vencido", "critico", "archivar", "urgente", "por_vencer", "advertencia"];
  const filtradas = filtroNivel === "todos"
    ? alertas
    : alertas.filter(a => a.nivel_alerta === filtroNivel);

  // Conteos por nivel
  const conteos = alertas.reduce((acc, a) => {
    acc[a.nivel_alerta] = (acc[a.nivel_alerta] || 0) + 1;
    return acc;
  }, {});

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.55)", display: "flex", justifyContent: "flex-end", zIndex: 300 }}>
      <div style={{ background: "#f5f5f7", width: "100%", maxWidth: 600, height: "100%", display: "flex", flexDirection: "column", boxShadow: "-4px 0 24px rgba(0,0,0,.15)" }}>

        {/* Header */}
        <div style={{ background: "#0a0a0a", color: "#fff", padding: "18px 20px", flexShrink: 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <div>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>🔔 Alertas de seguimiento</h2>
              <p style={{ margin: "4px 0 0", fontSize: 12, color: "#888" }}>{alertas.length} presupuestos requieren atención</p>
            </div>
            <button onClick={onClose} style={{ background: "none", border: "none", color: "#888", fontSize: 20, cursor: "pointer" }}>✕</button>
          </div>

          {/* KPIs de alertas */}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {ORDEN_NIVELES.filter(n => conteos[n]).map(n => {
              const niv = NIVELES[n];
              return (
                <button key={n} onClick={() => setFiltroNivel(filtroNivel === n ? "todos" : n)}
                  style={{ background: filtroNivel === n ? niv.border : niv.border + "33", color: filtroNivel === n ? "#fff" : niv.color, border: "none", borderRadius: 20, padding: "4px 12px", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
                  {niv.icon} {niv.label} ({conteos[n]})
                </button>
              );
            })}
          </div>
        </div>

        {/* Lista */}
        {msg && <div style={{ background: "#d4edda", color: "#155724", padding: "8px 16px", fontSize: 13, flexShrink: 0 }}>{msg}</div>}

        <div style={{ flex: 1, overflowY: "auto", padding: 16 }}>
          {loading ? (
            <p style={{ color: "#aaa", textAlign: "center", padding: 40 }}>Cargando alertas…</p>
          ) : filtradas.length === 0 ? (
            <div style={{ textAlign: "center", padding: "60px 20px" }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
              <p style={{ fontSize: 15, fontWeight: 700, color: "#111" }}>Todo al día</p>
              <p style={{ fontSize: 13, color: "#888", marginTop: 4 }}>No hay presupuestos que requieran seguimiento ahora.</p>
            </div>
          ) : (
            <>
              {filtroNivel === "todos" && (
                <p style={{ fontSize: 12, color: "#aaa", marginBottom: 12 }}>
                  Ordenados por urgencia · Click para ver mensaje sugerido
                </p>
              )}
              {filtradas.map(a => (
                <CardAlerta key={a.id} alerta={a}
                  onContactar={contactar}
                  onMarcarContactado={marcarContactado}
                  onArchivar={archivar}
                />
              ))}
            </>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: "12px 16px", borderTop: "1px solid #e0e0e0", background: "#fff", flexShrink: 0, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 12, color: "#aaa" }}>7d enviado · 5d negociación · 3d anticipo</span>
          <button onClick={cargar} style={{ background: "none", border: "1px solid #e0e0e0", borderRadius: 8, padding: "6px 12px", fontSize: 12, cursor: "pointer", color: "#555" }}>↺ Actualizar</button>
        </div>
      </div>
    </div>
  );
}
