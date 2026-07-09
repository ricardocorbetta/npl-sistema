import React, { useEffect, useState } from "react";
import Combobox from "./Combobox.jsx";
import { supabase } from "./supabase.js";

const SUPA_URL = "https://imkmosifqxzbtqgzssst.supabase.co/rest/v1";
const EDGE_URL = "https://imkmosifqxzbtqgzssst.supabase.co/functions/v1";
const ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlta21vc2lmcXh6YnRxZ3pzc3N0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkxODk4NTUsImV4cCI6MjA5NDc2NTg1NX0.5gtCs8Yv3vDSrKxAmXSr3zjWJ5HjimCKejfO-XrHPss";

async function getToken() {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token || ANON_KEY;
}
function hdrs(tk) {
  return { apikey: ANON_KEY, Authorization: `Bearer ${tk}`, "Content-Type": "application/json", Prefer: "return=representation" };
}

const TIPOS_SERVICIO = [
  { v: "calculo",        label: "📐 Cálculo estructural", desc: "Genera proyecto de ingeniería" },
  { v: "calculo_obra",   label: "📐🏗️ Cálculo + Obra",     desc: "Genera proyecto y obra" },
  { v: "obra",           label: "🏗️ Dirección de obra",   desc: "Genera obra de campo" },
  { v: "auditoria",      label: "🔍 Auditoría de obra",   desc: "Revisión de obra existente" },
  { v: "certificacion",  label: "📋 Certificación",        desc: "Revisión y certificación" },
  { v: "otro",           label: "📝 Otro", desc: "" },
];

const ESTADOS = [
  { v: "borrador",     label: "Borrador",     color: "#888" },
  { v: "enviado",      label: "Enviado",      color: "#3b82f6" },
  { v: "negociacion",  label: "Negociación",  color: "#f59e0b" },
  { v: "aprobado",     label: "Aprobado",     color: "#22c55e" },
  { v: "rechazado",    label: "Rechazado",    color: "#ef4444" },
];

const SISTEMAS_CONSTRUCTIVOS = [
  { v: "Hormigón",    icon: "🧱" },
  { v: "Steel Frame", icon: "🔩" },
  { v: "Wood Frame",  icon: "🪵" },
  { v: "Panel SIP",   icon: "🧊" },
  { v: "Metálica",    icon: "⚙️" },
];

const MESES = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];

const shared = {
  btn:   { padding: "9px 18px", background: "#111", color: "#fff", border: "none", borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: "pointer" },
  btnSm: { padding: "6px 12px", background: "#f0f0f0", color: "#333", border: "none", borderRadius: 8, fontSize: 12, cursor: "pointer" },
  inp:   { width: "100%", padding: "10px 12px", border: "1px solid #e0e0e0", borderRadius: 10, fontSize: 14, boxSizing: "border-box" },
  card:  { background: "#fff", borderRadius: 12, padding: 16, boxShadow: "0 1px 5px rgba(0,0,0,.07)" },
  lbl:   { fontSize: 11, color: "#888", fontWeight: 600, textTransform: "uppercase", letterSpacing: .5, marginBottom: 4, display: "block" },
};

/* ─── Helper: ordenar por código tipo "1140", "859-A" descendente ─── */
function codigoNumero(codigo) {
  if (!codigo) return -1;
  const match = String(codigo).match(/\d+/);
  return match ? parseInt(match[0]) : -1;
}

/* ─── Modal nuevo cliente inline ─── */
function ModalNuevoCliente({ onCreado, onClose }) {
  const [form, setForm] = useState({ empresa: "", contacto: "", mail: "", wsp: "", ciudad: "", tipo: "empresa" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function crear() {
    setSaving(true);
    const tk = await getToken();
    const r = await fetch(`${SUPA_URL}/clientes`, { method: "POST", headers: hdrs(tk), body: JSON.stringify(form) });
    const rows = await r.json();
    onCreado(rows[0]);
    setSaving(false);
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200, padding: 16 }}>
      <div style={{ background: "#fff", borderRadius: 16, padding: 28, width: "100%", maxWidth: 400 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
          <h3 style={{ margin: 0 }}>Nuevo cliente</h3>
          <button onClick={onClose} style={{ ...shared.btnSm, padding: "5px 10px" }}>✕</button>
        </div>
        {[
          { lbl: "Empresa / Nombre *", key: "empresa", ph: "Razón social o nombre" },
          { lbl: "Contacto", key: "contacto", ph: "Nombre del contacto" },
          { lbl: "Email", key: "mail", ph: "mail@ejemplo.com" },
          { lbl: "WhatsApp", key: "wsp", ph: "+54 9 11 ..." },
          { lbl: "Ciudad", key: "ciudad", ph: "Buenos Aires" },
        ].map(f => (
          <div key={f.key} style={{ marginBottom: 10 }}>
            <span style={shared.lbl}>{f.lbl}</span>
            <input value={form[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))} style={shared.inp} placeholder={f.ph} />
          </div>
        ))}
        <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
          <button onClick={crear} disabled={!form.empresa || saving} style={{ ...shared.btn, flex: 1 }}>
            {saving ? "Creando…" : "Crear cliente"}
          </button>
          <button onClick={onClose} style={{ ...shared.btnSm, flex: 1, padding: "9px" }}>Cancelar</button>
        </div>
      </div>
    </div>
  );
}

/* ─── Modal nuevo/editar presupuesto ─── */
function ModalPresupuesto({ pres, onGuardar, onClose }) {
  const esNuevo = !pres?.id;
  const [form, setForm] = useState({
    codigo:               pres?.codigo ? pres.codigo.replace(/-[A-Z]$/, '') : "",
    version:              pres?.codigo?.match(/-([A-Z])$/)?.[1] || "",
    cliente:              pres?.cliente || "",
    cliente_id:           pres?.cliente_id || "",
    tipo_servicio:        pres?.tipo_servicio || "",
    sistema_constructivo: pres?.sistema_constructivo || "",
    descripcion:          pres?.descripcion || "",
    superficie:           pres?.superficie || "",
    monto:                pres?.monto || "",
    moneda:               pres?.moneda || "ARS",
    estado:               pres?.estado || "borrador",
    probabilidad:         pres?.probabilidad || "",
    fecha_emision:        pres?.fecha_emision || new Date().toISOString().slice(0,10),
    fecha_vencimiento:    pres?.fecha_vencimiento || "",
    obs:                  pres?.obs || "",
    // Campos para generación de PDF
    obra_nombre:          pres?.obra_nombre || "",
    comitente:            pres?.comitente || pres?.cliente || "",
    descripcion_larga:    pres?.descripcion_larga || "Las tareas encomendadas incluyen el diseño y cálculo estructural para todos los sectores indicados en los planos, que contemplan una superficie aproximada de [X] metros cuadrados entre superficie cubierta y semi cubierta.",
    items_alcance:        pres?.items_alcance || ["Anteproyecto final en 3D.","Planos de replanteo de fundaciones.","Planos de estructura y detalles necesarios.","Planos de doblado de armadura (planos con despiece de vigas).","Detalle de elementos atípicos y detalle de uniones.","Cómputo y presupuesto de materiales de la estructura.","Servicio postventa: Checklist para control durante etapa de ejecución en obra y respaldo vía whatsapp."],
    modalidad_trabajo:    pres?.modalidad_trabajo || "-Será necesario contar con planos de planta, vistas y cortes, de ser posible volumetría, antes de iniciar los trabajos.\n-Se deberá contar con estudio de suelos.\n-Aprobación de anteproyecto previo a la entrega del legajo final (se envía 3d + cad).\n✓ Incluye volumetría completa del proyecto de referencia en etapas.\n✓ Asesoramiento técnico durante toda la etapa de ejecución de las tareas",
    notas_pdf:            pres?.notas_pdf || "-Forma de pago: 50% Anticipo 50% Contra entrega final.\n-Para agendar los trabajos se solicita el cobro del anticipo.\n-No incluye: costos de timbrado de contratos, visado de colegio, estudio de suelos, ni gestión municipal.\n-Medios de pago: Efectivo, transferencia bancaria. Se realiza factura tipo C.",
  });
  const [tabModal, setTabModal] = useState("datos"); // "datos" | "documento"
  const [generandoPDF, setGenerandoPDF] = useState(false);
  const [pdfUrl, setPdfUrl] = useState(pres?.pdf_url || "");
  const [clientes, setClientes] = useState([]);
  const [showNuevoCli, setShowNuevoCli] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function cargar() {
      const tk = await getToken();
      const d = await fetch(`${SUPA_URL}/clientes?select=id,empresa&order=empresa.asc`, { headers: hdrs(tk) }).then(r => r.json());
      setClientes(Array.isArray(d) ? d : []);

      // Auto-código solo si es presupuesto nuevo y no tiene código
      if (!pres?.id && !form.codigo) {
        try {
          const r = await fetch(`${SUPA_URL}/presupuestos?select=codigo&codigo=not.is.null&order=created_at.desc`, { headers: hdrs(tk) }).then(r => r.json());
          const nums = (Array.isArray(r) ? r : [])
            .map(p => p.codigo || "")
            .filter(c => /^\d+$/.test(c))  // solo códigos puramente numéricos (1158, no 928-1)
            .map(c => parseInt(c, 10))
            .filter(n => !isNaN(n) && n > 0);
          const max = nums.length ? Math.max(...nums) : 1158;
          setForm(f => ({ ...f, codigo: String(max + 1) }));
        } catch(e) { /* no bloquear si falla */ }
      }
    }
    cargar();
  }, []);

  function clienteCreado(cli) {
    setClientes(prev => [...prev, cli].sort((a,b) => a.empresa.localeCompare(b.empresa)));
    setForm(p => ({ ...p, cliente_id: cli.id, cliente: cli.empresa }));
    setShowNuevoCli(false);
  }

  async function guardar() {
    setSaving(true);
    setError("");
    try {
      await onGuardar(form);
    } catch(e) {
      setError(e.message || "Error al guardar");
      console.error("Error guardando presupuesto:", e);
    }
    setSaving(false);
  }

  const tipoInfo = TIPOS_SERVICIO.find(t => t.v === form.tipo_servicio);

  async function generarPDF() {
    if (!pres?.id && !editando?.id) {
      setError("Guardá el presupuesto primero antes de generar el PDF.");
      return;
    }
    setGenerandoPDF(true);
    setError("");
    try {
      const tk = await getToken();
      const res = await fetch(`${EDGE_URL}/generar-presupuesto-pdf`, {
        method: "POST",
        headers: { Authorization: `Bearer ${tk}`, "Content-Type": "application/json" },
        body: JSON.stringify({ presupuesto_id: pres?.id }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setPdfUrl(data.pdf_url);
      window.open(data.pdf_url, "_blank");
    } catch(e) {
      setError("Error generando PDF: " + e.message);
    }
    setGenerandoPDF(false);
  }
  const precioM2 = form.monto && form.superficie && parseFloat(form.superficie) > 0
    ? (parseFloat(form.monto) / parseFloat(form.superficie))
    : null;

  return (
    <>
      <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 20 }}>
        <div style={{ background: "#fff", borderRadius: 16, padding: 28, width: "100%", maxWidth: 860, maxHeight: "92vh", overflowY: "auto" }}>

          {/* Header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: "#0a0a0a" }}>{esNuevo ? "Nuevo presupuesto" : "Editar presupuesto"}</h3>
              {form.codigo && <span style={{ fontSize: 12, fontFamily: "JetBrains Mono, monospace", color: "#888", fontWeight: 700 }}>[ {form.version ? `${form.codigo}-${form.version}` : form.codigo} ]</span>}
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              {/* Tabs */}
              <div style={{ display: "flex", background: "#f0f0f0", borderRadius: 8, padding: 3, gap: 3 }}>
                {[["datos","📋 Datos"],["documento","📄 Documento"]].map(([id, label]) => (
                  <button key={id} onClick={() => setTabModal(id)} style={{ padding: "6px 14px", borderRadius: 6, border: "none", fontSize: 12, fontWeight: tabModal === id ? 700 : 400, background: tabModal === id ? "#111" : "transparent", color: tabModal === id ? "#fff" : "#666", cursor: "pointer" }}>{label}</button>
                ))}
              </div>
              <button onClick={onClose} style={{ ...shared.btnSm, padding: "6px 12px" }}>✕</button>
            </div>
          </div>

          {/* Tab DATOS */}
          {tabModal === "datos" && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>

            {/* ─── Columna izquierda ─── */}
            <div>
              {/* Tipo de servicio */}
              <div style={{ marginBottom: 16 }}>
                <span style={shared.lbl}>Tipo de servicio *</span>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                  {TIPOS_SERVICIO.map(t => (
                    <button key={t.v} onClick={() => setForm(p => ({ ...p, tipo_servicio: t.v }))} style={{
                      padding: "9px 10px", textAlign: "left", borderRadius: 8, cursor: "pointer", fontSize: 12,
                      border: form.tipo_servicio === t.v ? "2px solid #0a0a0a" : "1.5px solid #e0e0e0",
                      background: form.tipo_servicio === t.v ? "#0a0a0a" : "#fff",
                      color: form.tipo_servicio === t.v ? "#fff" : "#333",
                      fontWeight: form.tipo_servicio === t.v ? 600 : 400,
                    }}>
                      <div>{t.label}</div>
                      {t.desc && <div style={{ fontSize: 10, opacity: .65, marginTop: 2 }}>{t.desc}</div>}
                    </button>
                  ))}
                </div>
              </div>

              {/* Sistema constructivo */}
              <div style={{ marginBottom: 16 }}>
                <span style={shared.lbl}>Sistema constructivo</span>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {SISTEMAS_CONSTRUCTIVOS.map(s => (
                    <button key={s.v} onClick={() => setForm(p => ({ ...p, sistema_constructivo: s.v }))} style={{
                      padding: "6px 12px", borderRadius: 8, cursor: "pointer", fontSize: 12,
                      border: form.sistema_constructivo === s.v ? "2px solid #0a0a0a" : "1.5px solid #e0e0e0",
                      background: form.sistema_constructivo === s.v ? "#0a0a0a" : "#fff",
                      color: form.sistema_constructivo === s.v ? "#fff" : "#555",
                      fontWeight: form.sistema_constructivo === s.v ? 700 : 400,
                    }}>
                      {s.icon} {s.v}
                    </button>
                  ))}
                </div>
              </div>

              {/* Cliente */}
              <div style={{ marginBottom: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
                  <span style={shared.lbl}>Cliente</span>
                  <button onClick={() => setShowNuevoCli(true)} style={{ ...shared.btnSm, fontSize: 11, padding: "2px 8px" }}>+ Nuevo</button>
                </div>
                <Combobox
                  options={clientes.map(c => ({ value: c.id, label: c.empresa }))}
                  value={form.cliente_id}
                  onChange={(val, label) => setForm(p => ({ ...p, cliente_id: val, cliente: label }))}
                  placeholder="Buscar cliente..."
                  emptyLabel="Sin cliente asignado"
                />
              </div>

              {/* Descripción */}
              <div style={{ marginBottom: 14 }}>
                <span style={shared.lbl}>Descripción *</span>
                <input value={form.descripcion} onChange={e => setForm(p => ({ ...p, descripcion: e.target.value }))} style={shared.inp} placeholder="Breve descripción del trabajo" />
              </div>

              {/* Observaciones */}
              <div style={{ marginBottom: 14 }}>
                <span style={shared.lbl}>Observaciones</span>
                <textarea value={form.obs} onChange={e => setForm(p => ({ ...p, obs: e.target.value }))} rows={4} style={{ ...shared.inp, resize: "vertical" }} placeholder="Notas internas…" />
              </div>
            </div>

            {/* ─── Columna derecha ─── */}
            <div>
              {/* Código y versión */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
                <div>
                  <span style={shared.lbl}>Código</span>
                  <input value={form.codigo} onChange={e => setForm(p => ({ ...p, codigo: e.target.value }))} style={shared.inp} placeholder="1159" />
                </div>
                <div>
                  <span style={shared.lbl}>Versión</span>
                  <select value={form.version} onChange={e => setForm(p => ({ ...p, version: e.target.value }))} style={shared.inp}>
                    <option value="">Sin versión</option>
                    {["A","B","C","D","E","F"].map(v => <option key={v} value={v}>{v}</option>)}
                  </select>
                </div>
              </div>

              {/* Monto, moneda, superficie */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 90px 90px", gap: 10, marginBottom: 8 }}>
                <div>
                  <span style={shared.lbl}>Monto</span>
                  <input type="number" value={form.monto} onChange={e => setForm(p => ({ ...p, monto: e.target.value }))} style={shared.inp} placeholder="0" />
                </div>
                <div>
                  <span style={shared.lbl}>Moneda</span>
                  <select value={form.moneda} onChange={e => setForm(p => ({ ...p, moneda: e.target.value }))} style={shared.inp}>
                    <option value="ARS">$ ARS</option>
                    <option value="USD">u$s</option>
                  </select>
                </div>
                <div>
                  <span style={shared.lbl}>Sup. m²</span>
                  <input type="number" value={form.superficie} onChange={e => setForm(p => ({ ...p, superficie: e.target.value }))} style={shared.inp} placeholder="0" />
                </div>
              </div>

              {/* Precio por m² */}
              {precioM2 !== null && (
                <div style={{ marginBottom: 14, background: "#f0fdf4", borderRadius: 8, padding: "8px 12px", fontSize: 13, color: "#1a8a5e", fontWeight: 700, fontFamily: "JetBrains Mono, monospace" }}>
                  {form.moneda === "USD" ? "u$s" : "$"} {precioM2.toLocaleString("es-AR", { maximumFractionDigits: 0 })} / m²
                </div>
              )}

              {/* Estado y probabilidad */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 100px", gap: 10, marginBottom: 14 }}>
                <div>
                  <span style={shared.lbl}>Estado</span>
                  <select value={form.estado} onChange={e => setForm(p => ({ ...p, estado: e.target.value }))} style={shared.inp}>
                    {ESTADOS.map(e => <option key={e.v} value={e.v}>{e.label}</option>)}
                  </select>
                </div>
                <div>
                  <span style={shared.lbl}>Prob. %</span>
                  <input type="number" min="0" max="100" value={form.probabilidad} onChange={e => setForm(p => ({ ...p, probabilidad: e.target.value }))} style={shared.inp} placeholder="0" />
                </div>
              </div>

              {/* Fechas */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
                <div>
                  <span style={shared.lbl}>Fecha emisión</span>
                  <input type="date" value={form.fecha_emision} onChange={e => setForm(p => ({ ...p, fecha_emision: e.target.value }))} style={shared.inp} />
                </div>
                <div>
                  <span style={shared.lbl}>Vencimiento</span>
                  <input type="date" value={form.fecha_vencimiento} onChange={e => setForm(p => ({ ...p, fecha_vencimiento: e.target.value }))} style={shared.inp} />
                </div>
              </div>

              {/* Error */}
              {error && (
                <div style={{ background: "#fef2f2", color: "#c0392b", borderRadius: 8, padding: "8px 12px", marginBottom: 12, fontSize: 13, fontWeight: 600 }}>
                  ❌ {error}
                </div>
              )}

              {/* Acciones */}
              <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                <button onClick={guardar} disabled={!form.tipo_servicio || !form.descripcion || saving} style={{ ...shared.btn, flex: 1 }}>
                  {saving ? "Guardando…" : esNuevo ? "Crear presupuesto" : "Guardar cambios"}
                </button>
                <button onClick={onClose} style={{ ...shared.btnSm, flex: 1, padding: "10px" }}>Cancelar</button>
              </div>
            </div>
          </div>
          )} {/* fin tab datos */}

          {/* Tab DOCUMENTO */}
          {tabModal === "documento" && (
            <div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 14 }}>
                <div>
                  <span style={shared.lbl}>Nombre de la obra</span>
                  <input value={form.obra_nombre} onChange={e => setForm(p => ({ ...p, obra_nombre: e.target.value }))} style={shared.inp} placeholder="Vivienda Vrick Ensenada" />
                </div>
                <div>
                  <span style={shared.lbl}>Comitente</span>
                  <input value={form.comitente} onChange={e => setForm(p => ({ ...p, comitente: e.target.value }))} style={shared.inp} placeholder="Estudio Hatrick" />
                </div>
              </div>

              <div style={{ marginBottom: 14 }}>
                <span style={shared.lbl}>Descripción general</span>
                <textarea value={form.descripcion_larga} onChange={e => setForm(p => ({ ...p, descripcion_larga: e.target.value }))} rows={3} style={{ ...shared.inp, resize: "vertical" }} />
              </div>

              <div style={{ marginBottom: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <span style={shared.lbl}>Items del alcance</span>
                  <button onClick={() => setForm(p => ({ ...p, items_alcance: [...(p.items_alcance || []), ""] }))} style={{ ...shared.btnSm, fontSize: 11, padding: "3px 8px" }}>+ Agregar item</button>
                </div>
                {(form.items_alcance || []).map((item, i) => (
                  <div key={i} style={{ display: "flex", gap: 8, marginBottom: 6 }}>
                    <input value={item} onChange={e => { const arr = [...form.items_alcance]; arr[i] = e.target.value; setForm(p => ({ ...p, items_alcance: arr })); }} style={{ ...shared.inp, flex: 1 }} placeholder={`Item ${i+1}`} />
                    <button onClick={() => setForm(p => ({ ...p, items_alcance: p.items_alcance.filter((_, j) => j !== i) }))} style={{ ...shared.btnSm, padding: "6px 10px", color: "#c0392b" }}>✕</button>
                  </div>
                ))}
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
                <div>
                  <span style={shared.lbl}>Modalidad de trabajo</span>
                  <textarea value={form.modalidad_trabajo} onChange={e => setForm(p => ({ ...p, modalidad_trabajo: e.target.value }))} rows={6} style={{ ...shared.inp, resize: "vertical", fontSize: 12 }} />
                </div>
                <div>
                  <span style={shared.lbl}>Notas</span>
                  <textarea value={form.notas_pdf} onChange={e => setForm(p => ({ ...p, notas_pdf: e.target.value }))} rows={6} style={{ ...shared.inp, resize: "vertical", fontSize: 12 }} />
                </div>
              </div>

              {error && <div style={{ background: "#fef2f2", color: "#c0392b", borderRadius: 8, padding: "8px 12px", marginBottom: 12, fontSize: 13, fontWeight: 600 }}>❌ {error}</div>}

              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <button onClick={async () => { await guardar(); }} disabled={saving} style={{ ...shared.btnSm, fontSize: 13 }}>
                  {saving ? "Guardando…" : "💾 Guardar"}
                </button>
                <button onClick={generarPDF} disabled={generandoPDF || esNuevo} style={{ ...shared.btn, fontSize: 13 }}>
                  {generandoPDF ? "Generando PDF…" : "📄 Generar PDF en Drive"}
                </button>
                {pdfUrl && <a href={pdfUrl} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: "#1a73e8", textDecoration: "none" }}>📂 Ver PDF →</a>}
                {esNuevo && <span style={{ fontSize: 11, color: "#aaa" }}>Guardá primero para poder generar el PDF</span>}
              </div>
            </div>
          )} {/* fin tab documento */}

        </div>
      </div>

      {showNuevoCli && <ModalNuevoCliente onCreado={clienteCreado} onClose={() => setShowNuevoCli(false)} />}
    </>
  );
}

/* ─── Card presupuesto ─── */
function CardPresupuesto({ p, onEditar, onCambiarEstado, onArchivar, onDesarchivar }) {
  const estado = ESTADOS.find(e => e.v === p.estado);
  const tipo = TIPOS_SERVICIO.find(t => t.v === p.tipo_servicio);
  const sistema = SISTEMAS_CONSTRUCTIVOS.find(s => s.v === p.sistema_constructivo);
  const precioM2 = p.monto && p.superficie && parseFloat(p.superficie) > 0
    ? (parseFloat(p.monto) / parseFloat(p.superficie))
    : null;

  return (
    <div style={{ ...shared.card, display: "flex", gap: 16, alignItems: "flex-start", flexWrap: "wrap" }}>
      <div style={{ flex: 1, minWidth: 200 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
          {p.codigo && <span style={{ fontSize: 11, fontWeight: 700, color: "#aaa" }}>{p.codigo}</span>}
          {tipo && <span style={{ fontSize: 11, background: "#f0f0f0", borderRadius: 8, padding: "2px 8px", color: "#555" }}>{tipo.label}</span>}
          {sistema && <span style={{ fontSize: 11, background: "#eef2ff", borderRadius: 8, padding: "2px 8px", color: "#6366f1", fontWeight: 600 }}>{sistema.icon} {sistema.v}</span>}
        </div>
        <div style={{ fontWeight: 700, fontSize: 15, color: "#111", marginBottom: 3 }}>{p.descripcion || "Sin descripción"}</div>
        <div style={{ fontSize: 13, color: "#888" }}>{p.cliente}</div>
        {p.tipo && !p.tipo_servicio && <div style={{ fontSize: 11, color: "#aaa", marginTop: 2 }}>{p.tipo}</div>}
        {p.fecha_emision && <div style={{ fontSize: 11, color: "#bbb", marginTop: 4 }}>📅 {new Date(p.fecha_emision+"T12:00").toLocaleDateString("es-AR")}</div>}
        {p.obs && <div style={{ fontSize: 12, color: "#aaa", marginTop: 4, fontStyle: "italic" }}>{p.obs}</div>}
      </div>

      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6, flexShrink: 0 }}>
        {p.monto && (
          <div style={{ fontWeight: 800, fontSize: 16, color: "#111" }}>
            {p.moneda === "USD" ? "u$s" : "$"} {parseFloat(p.monto).toLocaleString("es-AR")}
          </div>
        )}
        {/* Precio por m2 debajo del monto */}
        {precioM2 !== null && (
          <div style={{ fontSize: 11, color: "#16a34a", fontWeight: 600, background: "#f0fdf4", borderRadius: 6, padding: "1px 7px" }}>
            {p.moneda === "USD" ? "u$s" : "$"}{precioM2.toLocaleString("es-AR", { maximumFractionDigits: 0 })}/m²
          </div>
        )}

        <select
          value={p.estado || "borrador"}
          onChange={e => onCambiarEstado(p.id, e.target.value)}
          style={{
            fontSize: 12, padding: "5px 8px", borderRadius: 8, cursor: "pointer",
            border: `1px solid ${estado?.color || "#e0e0e0"}`,
            color: estado?.color || "#888",
            background: "#fff", fontWeight: 600,
          }}
        >
          {ESTADOS.map(e => <option key={e.v} value={e.v}>{e.label}</option>)}
        </select>

        <button onClick={() => onEditar(p)} style={{ ...shared.btnSm, fontSize: 12 }}>Editar</button>
        {p.archivado === true
          ? <button onClick={() => onDesarchivar && onDesarchivar(p.id)} style={{ ...shared.btnSm, fontSize: 12 }}>↩ Restaurar</button>
          : <button onClick={() => onArchivar && onArchivar(p.id)} style={{ ...shared.btnSm, fontSize: 12, color: "#888" }}>📦 Archivar</button>
        }
      </div>
    </div>
  );
}

/* ─── Lista de presupuestos ─── */
export default function App({ deepLinkId }) {
  const [presupuestos, setPresupuestos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editando, setEditando] = useState(null);
  const [filtroEstado, setFiltroEstado] = useState("enviado"); // Default: enviado, es el que se monitorea
  const [filtroTipo, setFiltroTipo] = useState("todos");
  const [filtroSistema, setFiltroSistema] = useState("todos");
  const [filtroMes, setFiltroMes] = useState("todos");
  const [verArchivados, setVerArchivados] = useState(false);
  const [msg, setMsg] = useState("");
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  // Deep link: abrir presupuesto específico al llegar desde el buscador global
  useEffect(() => {
    if (deepLinkId && presupuestos.length > 0) {
      const p = presupuestos.find(pr => pr.id === deepLinkId);
      if (p) { setEditando(p); setShowModal(true); setFiltroEstado("todos"); }
    }
  }, [deepLinkId, presupuestos]);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", check);
    cargar();
    return () => window.removeEventListener("resize", check);
  }, []);

  async function cargar() {
    setLoading(true);
    const tk = await getToken();
    const d = await fetch(`${SUPA_URL}/presupuestos?order=created_at.desc`, { headers: hdrs(tk) }).then(r => r.json());
    setPresupuestos(Array.isArray(d) ? d : []);
    setLoading(false);
  }

  async function getSiguienteCodigo() {
    const tk = await getToken();
    const r = await fetch(`${SUPA_URL}/presupuestos?select=codigo&codigo=not.is.null&order=created_at.desc`, { headers: hdrs(tk) }).then(r => r.json());
    const nums = (Array.isArray(r) ? r : [])
      .map(p => p.codigo || "")
      .filter(c => /^\d+$/.test(c))
      .map(c => parseInt(c, 10))
      .filter(n => !isNaN(n) && n > 0);
    const max = nums.length ? Math.max(...nums) : 1158; // fallback al máximo conocido
    return String(max + 1);
  }

  async function guardar(form) {
    const tk = await getToken();
    try {
      let body = { ...form };
      // Combinar código base + versión → "1159" + "A" = "1159-A"
      if (body.version && body.version.trim()) {
        body.codigo = `${body.codigo}-${body.version.trim().toUpperCase()}`;
      }
      delete body.version; // no existe en la tabla

      if (editando?.id) {
        // Edición — PATCH
        const res = await fetch(`${SUPA_URL}/presupuestos?id=eq.${editando.id}`, {
          method: "PATCH", headers: hdrs(tk), body: JSON.stringify(body)
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.message || err.details || `Error ${res.status}`);
        }
      } else {
        // Nuevo — auto-generar código si no tiene
        if (!body.codigo || body.codigo.trim() === "") {
          body.codigo = await getSiguienteCodigo();
        }
        const res = await fetch(`${SUPA_URL}/presupuestos`, {
          method: "POST", headers: hdrs(tk), body: JSON.stringify(body)
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.message || err.details || `Error ${res.status}`);
        }
      }

      setShowModal(false);
      setEditando(null);
      setMsg("✓ Presupuesto guardado");
      setTimeout(() => setMsg(""), 3000);
      cargar();
    } catch(e) {
      setMsg("❌ Error: " + e.message);
      setTimeout(() => setMsg(""), 6000);
      console.error("Error guardando presupuesto:", e);
    }
  }

  async function cambiarEstado(id, estado) {
    const tk = await getToken();
    await fetch(`${SUPA_URL}/presupuestos?id=eq.${id}`, { method: "PATCH", headers: hdrs(tk), body: JSON.stringify({ estado }) });
    setPresupuestos(prev => prev.map(p => p.id === id ? { ...p, estado } : p));
  }

  async function archivar(id) {
    const tk = await getToken();
    await fetch(`${SUPA_URL}/presupuestos?id=eq.${id}`, { method: "PATCH", headers: hdrs(tk), body: JSON.stringify({ archivado: true }) });
    setMsg("✓ Presupuesto archivado"); setTimeout(() => setMsg(""), 3000);
    cargar();
  }

  async function desarchivar(id) {
    const tk = await getToken();
    await fetch(`${SUPA_URL}/presupuestos?id=eq.${id}`, { method: "PATCH", headers: hdrs(tk), body: JSON.stringify({ archivado: false }) });
    setMsg("✓ Presupuesto restaurado"); setTimeout(() => setMsg(""), 3000);
    cargar();
  }

  // Meses disponibles según datos reales (para el desplegable)
  const mesesDisponibles = [...new Set(
    presupuestos.filter(p => p.fecha_emision).map(p => p.fecha_emision.slice(0,7))
  )].sort().reverse();

  // Filtros
  const filtrados = presupuestos.filter(p => {
    if (verArchivados) return p.archivado === true;
    if (p.archivado === true) return false;
    const pasaEstado  = filtroEstado === "todos"   || p.estado === filtroEstado;
    const pasaTipo    = filtroTipo === "todos"     || p.tipo_servicio === filtroTipo;
    const pasaSistema = filtroSistema === "todos"  || p.sistema_constructivo === filtroSistema;
    const pasaMes     = filtroMes === "todos"      || (p.fecha_emision && p.fecha_emision.slice(0,7) === filtroMes);
    return pasaEstado && pasaTipo && pasaSistema && pasaMes;
  });

  const totalArchivados = presupuestos.filter(p => p.archivado === true).length;

  // Orden: por código descendente (el "último enviado" tiene el número más alto)
  const ordenados = [...filtrados].sort((a, b) => codigoNumero(b.codigo) - codigoNumero(a.codigo));

  // KPIs
  const totalMonto    = presupuestos.filter(p => p.estado === "aprobado").reduce((s, p) => s + (parseFloat(p.monto) || 0), 0);
  const enviados      = presupuestos.filter(p => p.estado === "enviado").length;
  const montoEnviados = presupuestos.filter(p => p.estado === "enviado").reduce((s, p) => s + (parseFloat(p.monto) || 0), 0);

  return (
    <div style={{ fontFamily: "system-ui, -apple-system, sans-serif", padding: isMobile ? 16 : 28, maxWidth: 1100, margin: "0 auto" }}>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <div>
          <p style={{ margin: 0, fontSize: 12, color: "#999", fontWeight: 500 }}>NPL · Admin</p>
          <h1 style={{ margin: "2px 0 0", fontSize: isMobile ? 20 : 24, fontWeight: 700 }}>💰 Presupuestos</h1>
        </div>
        <button onClick={() => { setEditando(null); setShowModal(true); }} style={shared.btn}>+ Nuevo presupuesto</button>
      </div>

      {msg && (
        <div style={{ background: msg.startsWith("❌") ? "#fef2f2" : "#f0fdf4", color: msg.startsWith("❌") ? "#c0392b" : "#1a8a5e", borderRadius: 8, padding: "8px 12px", marginBottom: 14, fontSize: 13, fontWeight: 600 }}>
          {msg}
        </div>
      )}

      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 12, marginBottom: 20 }}>
        {[
          { label: "Total aprobado",      value: `$${totalMonto.toLocaleString("es-AR")}`, color: "#22c55e" },
          { label: "📨 Enviados (seguimiento)", value: enviados, color: "#3b82f6" },
          { label: "Monto en seguimiento", value: `$${montoEnviados.toLocaleString("es-AR")}`, color: "#3b82f6" },
          { label: "Total",               value: presupuestos.length, color: "#888" },
        ].map(k => (
          <div key={k.label} style={{ ...shared.card, textAlign: "center" }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: k.color }}>{k.value}</div>
            <div style={{ fontSize: 12, color: "#888", marginTop: 4 }}>{k.label}</div>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16, alignItems: "center" }}>
        {/* Filtro estado — destacado para "enviado" */}
        <select value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)} style={{
          ...shared.btnSm, padding: "8px 12px",
          background: filtroEstado === "enviado" ? "#3b82f618" : "#f0f0f0",
          color: filtroEstado === "enviado" ? "#3b82f6" : "#333",
          fontWeight: filtroEstado === "enviado" ? 700 : 400,
          border: filtroEstado === "enviado" ? "1px solid #3b82f6" : "1px solid transparent",
        }}>
          <option value="todos">Todos los estados</option>
          {ESTADOS.map(e => <option key={e.v} value={e.v}>{e.label}</option>)}
        </select>

        {/* Filtro mes — desplegable */}
        <select value={filtroMes} onChange={e => setFiltroMes(e.target.value)} style={{ ...shared.btnSm, padding: "8px 12px" }}>
          <option value="todos">📅 Todos los meses</option>
          {mesesDisponibles.map(m => {
            const [y, mo] = m.split("-");
            return <option key={m} value={m}>{MESES[parseInt(mo)-1]} {y}</option>;
          })}
        </select>

        <select value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)} style={{ ...shared.btnSm, padding: "8px 12px" }}>
          <option value="todos">Todos los servicios</option>
          {TIPOS_SERVICIO.map(t => <option key={t.v} value={t.v}>{t.label}</option>)}
        </select>

        <select value={filtroSistema} onChange={e => setFiltroSistema(e.target.value)} style={{ ...shared.btnSm, padding: "8px 12px" }}>
          <option value="todos">🏗️ Todos los sistemas</option>
          {SISTEMAS_CONSTRUCTIVOS.map(s => <option key={s.v} value={s.v}>{s.icon} {s.v}</option>)}
        </select>

        {(filtroEstado !== "todos" || filtroTipo !== "todos" || filtroSistema !== "todos" || filtroMes !== "todos") && (
          <button onClick={() => { setFiltroEstado("todos"); setFiltroTipo("todos"); setFiltroSistema("todos"); setFiltroMes("todos"); }} style={{ ...shared.btnSm, padding: "8px 12px" }}>✕ Limpiar</button>
        )}
        <button onClick={() => setVerArchivados(v => !v)} style={{ ...shared.btnSm, padding: "8px 12px", background: verArchivados ? "#111" : "#f0f0f0", color: verArchivados ? "#fff" : "#333" }}>
          📦 {verArchivados ? "Ver activos" : `Archivados${totalArchivados > 0 ? ` (${totalArchivados})` : ""}`}
        </button>
        <span style={{ fontSize: 13, color: "#aaa", alignSelf: "center" }}>{ordenados.length} resultados</span>
      </div>

      {/* Lista */}
      {loading ? <p style={{ color: "#aaa" }}>Cargando…</p> : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {ordenados.map(p => (
            <CardPresupuesto key={p.id} p={p} onEditar={p => { setEditando(p); setShowModal(true); }} onCambiarEstado={cambiarEstado} onArchivar={archivar} onDesarchivar={desarchivar} />
          ))}
          {ordenados.length === 0 && <p style={{ color: "#aaa", textAlign: "center", padding: 40 }}>Sin resultados</p>}
        </div>
      )}

      {showModal && (
        <ModalPresupuesto
          pres={editando}
          onGuardar={guardar}
          onClose={() => { setShowModal(false); setEditando(null); }}
        />
      )}
    </div>
  );
}
