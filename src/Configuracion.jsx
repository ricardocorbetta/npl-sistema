import React, { useEffect, useState } from "react";
import { supabase } from "./supabase.js";

const SUPA_URL = "https://imkmosifqxzbtqgzssst.supabase.co/rest/v1";
const ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlta21vc2lmcXh6YnRxZ3pzc3N0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkxODk4NTUsImV4cCI6MjA5NDc2NTg1NX0.5gtCs8Yv3vDSrKxAmXSr3zjWJ5HjimCKejfO-XrHPss";

async function getToken() {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token || ANON_KEY;
}

const shared = {
  inp: { width: "100%", padding: "10px 12px", border: "1.5px solid #e0e0e0", borderRadius: 10, fontSize: 14, boxSizing: "border-box", background: "#fff" },
  lbl: { fontSize: 11, color: "#888", fontWeight: 700, textTransform: "uppercase", letterSpacing: .5, marginBottom: 4, display: "block" },
  btn: { padding: "10px 20px", background: "#111", color: "#fff", border: "none", borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: "pointer" },
  btnSm: { padding: "6px 12px", background: "#f0f0f0", color: "#333", border: "none", borderRadius: 8, fontSize: 12, cursor: "pointer" },
};

const GRUPOS = [
  { id: "comercial",     label: "🏢 Datos comerciales",    desc: "Aparecen en el PDF y comunicaciones" },
  { id: "bancario",      label: "🏦 Datos bancarios",       desc: "Para cobros y anticipo" },
  { id: "presupuestos",  label: "📋 Config presupuestos",   desc: "Valores por defecto al generar presupuestos" },
];

const LABELS = {
  empresa_nombre:         "Nombre de la empresa",
  empresa_email:          "Email",
  empresa_tel:            "Teléfono",
  empresa_web:            "Sitio web",
  empresa_whatsapp:       "WhatsApp (con código país)",
  empresa_instagram:      "Instagram",
  empresa_direccion_lp:   "Dirección La Plata",
  empresa_direccion_caba: "Dirección CABA",
  empresa_cbu:            "CBU",
  empresa_alias:          "Alias CBU",
  empresa_fiscal:         "Condición fiscal / Facturación",
  presup_validez_dias:    "Validez presupuesto (días)",
  presup_anticipo_pct:    "Anticipo %",
  firma_nombre:           "Nombre para firma",
  firma_cargo:            "Cargo para firma",
};

export default function Configuracion() {
  const [config, setConfig] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => { cargar(); }, []);

  async function cargar() {
    setLoading(true);
    const tk = await getToken();
    const r = await fetch(`${SUPA_URL}/configuracion?select=key,value`, {
      headers: { apikey: ANON_KEY, Authorization: `Bearer ${tk}` }
    }).then(r => r.json());
    const map = {};
    (Array.isArray(r) ? r : []).forEach((row) => { map[row.key] = row.value || ""; });
    setConfig(map);
    setLoading(false);
  }

  async function guardar() {
    setSaving(true);
    const tk = await getToken();
    try {
      // Actualizar cada clave individualmente con PATCH
      const errores = [];
      for (const [key, value] of Object.entries(config)) {
        const res = await fetch(`${SUPA_URL}/configuracion?key=eq.${key}`, {
          method: "PATCH",
          headers: {
            apikey: ANON_KEY, Authorization: `Bearer ${tk}`,
            "Content-Type": "application/json",
            "Prefer": "return=minimal",
          },
          body: JSON.stringify({ value }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          errores.push(`${key}: ${err.message || res.status}`);
        }
      }
      if (errores.length > 0) {
        setMsg("❌ Errores: " + errores.join(", "));
      } else {
        setMsg("✓ Configuración guardada");
        setTimeout(() => setMsg(""), 3000);
      }
    } catch(e) {
      setMsg("❌ Error: " + e.message);
    }
    setSaving(false);
  }

  if (loading) return <div style={{ padding: 40, color: "#aaa" }}>Cargando…</div>;

  return (
    <div style={{ fontFamily: "system-ui, -apple-system, sans-serif", padding: 28, maxWidth: 800, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: "#0a0a0a" }}>⚙️ Configuración</h1>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: "#888" }}>Datos de la empresa usados en PDFs y comunicaciones</p>
        </div>
        <button onClick={guardar} disabled={saving} style={shared.btn}>
          {saving ? "Guardando…" : "💾 Guardar"}
        </button>
      </div>

      {msg && (
        <div style={{ background: msg.startsWith("✓") ? "#f0fdf4" : "#fef2f2", color: msg.startsWith("✓") ? "#1a8a5e" : "#c0392b", borderRadius: 8, padding: "8px 14px", marginBottom: 20, fontSize: 13, fontWeight: 600 }}>
          {msg}
        </div>
      )}

      {GRUPOS.map(grupo => {
        const keys = Object.keys(LABELS).filter(k => {
          if (grupo.id === "comercial") return ["empresa_nombre","empresa_email","empresa_tel","empresa_web","empresa_whatsapp","empresa_instagram","empresa_direccion_lp","empresa_direccion_caba"].includes(k);
          if (grupo.id === "bancario") return ["empresa_cbu","empresa_alias","empresa_fiscal"].includes(k);
          return ["presup_validez_dias","presup_anticipo_pct","firma_nombre","firma_cargo"].includes(k);
        });
        return (
          <div key={grupo.id} style={{ background: "#fff", border: "1.5px solid #e8e8e8", borderRadius: 12, padding: 20, marginBottom: 16 }}>
            <div style={{ marginBottom: 16 }}>
              <h2 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: "#111" }}>{grupo.label}</h2>
              <p style={{ margin: "3px 0 0", fontSize: 12, color: "#aaa" }}>{grupo.desc}</p>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              {keys.map(key => (
                <div key={key}>
                  <span style={shared.lbl}>{LABELS[key]}</span>
                  <input
                    value={config[key] || ""}
                    onChange={e => setConfig(p => ({ ...p, [key]: e.target.value }))}
                    style={shared.inp}
                    placeholder={key === "empresa_email" ? "info@nplingenieria.com.ar" : ""}
                  />
                </div>
              ))}
            </div>
          </div>
        );
      })}

      {/* Preview */}
      <div style={{ background: "#f8f8f8", border: "1.5px solid #e8e8e8", borderRadius: 12, padding: 20 }}>
        <h3 style={{ margin: "0 0 12px", fontSize: 13, fontWeight: 700, color: "#555", textTransform: "uppercase", letterSpacing: 0.5 }}>Preview footer del PDF</h3>
        <div style={{ fontFamily: "Arial, sans-serif", fontSize: 12, color: "#555", display: "flex", justifyContent: "space-between" }}>
          <div>
            <strong style={{ fontSize: 13, color: "#111", display: "block", marginBottom: 4 }}>{config.empresa_nombre || "NPL Ingeniería Civil"}</strong>
            <div>{config.empresa_web} &nbsp;|&nbsp; {config.empresa_tel}</div>
            {config.empresa_instagram && <div style={{ color: "#888", fontSize: 11 }}>{config.empresa_instagram}</div>}
          </div>
          <div style={{ textAlign: "right", color: "#888" }}>
            <div>{config.empresa_email}</div>
            {config.empresa_direccion_lp && <div style={{ fontSize: 11 }}>{config.empresa_direccion_lp}</div>}
            {config.empresa_direccion_caba && <div style={{ fontSize: 11 }}>{config.empresa_direccion_caba}</div>}
          </div>
        </div>
        {config.firma_nombre && (
          <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid #eee", fontSize: 12, color: "#555" }}>
            <strong style={{ color: "#111" }}>{config.firma_nombre}</strong> — {config.firma_cargo}
          </div>
        )}
      </div>
    </div>
  );
}
