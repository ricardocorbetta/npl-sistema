import React, { useEffect, useState } from "react";
import Combobox from "./Combobox.jsx";
import AlertasPresupuestos from "./AlertasPresupuestos.jsx";
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
  { v: "borrador",    label: "Borrador",    color: "#888",    prob: 0   },
  { v: "enviado",     label: "Enviado",     color: "#3b82f6", prob: 25  },
  { v: "negociacion", label: "Negociación", color: "#f59e0b", prob: 60  },
  { v: "aprobado",    label: "Aprobado",    color: "#22c55e", prob: 100 },
  { v: "rechazado",   label: "Rechazado",   color: "#ef4444", prob: 0   },
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
  const TIPOS_CLIENTE = ["empresa", "arquitecto", "comitente", "desarrolladora", "particular", "otro"];
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
        <div style={{ marginBottom: 10 }}>
          <span style={shared.lbl}>Tipo</span>
          <select value={form.tipo} onChange={e => setForm(p => ({ ...p, tipo: e.target.value }))} style={shared.inp}>
            {TIPOS_CLIENTE.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
          </select>
        </div>
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
    fecha_aprobacion:     pres?.fecha_aprobacion || "",
    obs:                  pres?.obs || "",
    comitente_id:         pres?.comitente_id || "",
    comitente_nombre:     pres?.comitente_nombre || "",
    // Campos para generación de PDF
    obra_nombre:          pres?.obra_nombre || "",
    descripcion_larga:    pres?.descripcion_larga
      ? pres.descripcion_larga.replace(/\[X\]/g, pres.superficie ? String(pres.superficie) : "[X]")
      : "Las tareas encomendadas incluyen el diseño y cálculo estructural para todos los sectores indicados en los planos, que contemplan una superficie aproximada de [X] metros cuadrados entre superficie cubierta y semi cubierta.",
    items_alcance:        pres?.items_alcance || ["Anteproyecto final en 3D.","Planos de replanteo de fundaciones.","Planos de estructura y detalles necesarios.","Planos de doblado de armadura (planos con despiece de vigas).","Detalle de elementos atípicos y detalle de uniones.","Cómputo y presupuesto de materiales de la estructura.","Servicio postventa: Checklist para control durante etapa de ejecución en obra y respaldo vía whatsapp."],
    modalidad_trabajo:    pres?.modalidad_trabajo || "-Será necesario contar con planos de planta, vistas y cortes, de ser posible volumetría, antes de iniciar los trabajos.\n-Se deberá contar con estudio de suelos.\n-Aprobación de anteproyecto previo a la entrega del legajo final (se envía 3d + cad).\n✓ Incluye volumetría completa del proyecto de referencia en etapas.\n✓ Asesoramiento técnico durante toda la etapa de ejecución de las tareas",
    forma_pago:           pres?.forma_pago || "50_50",
    forma_pago_custom:    pres?.forma_pago_custom || "",
    notas_pdf:            pres?.notas_pdf || "-Para agendar los trabajos se solicita el cobro del anticipo.\n-No incluye: costos de timbrado de contratos, visado de colegio, estudio de suelos, ni gestión municipal. En caso de requerir por CIPBA se considera un 20% adicional para cubrir gastos totales.",
  });
  const [tabModal, setTabModal] = useState(esNuevo ? "datos" : "documento"); // "datos" | "documento"
  const [presupuestoCreado, setPresupuestoCreado] = useState(null); // ID del presupuesto recién creado
  const [generandoPDF, setGenerandoPDF] = useState(false);
  const [pdfUrl, setPdfUrl] = useState(pres?.pdf_url || "");
  const [clienteWsp, setClienteWsp] = useState("");
  const [clienteMail, setClienteMail] = useState("");
  const [enviandoEmail, setEnviandoEmail] = useState(false);
  const [clientes, setClientes] = useState([]);
  const [showNuevoCli, setShowNuevoCli] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function cargarAlertas() {
    try {
      const tk = await getToken();
      const r = await fetch(`${SUPA_URL}/vista_alertas_presupuestos?nivel_alerta=neq.ok&select=id`, {
        headers: hdrs(tk)
      }).then(r => r.json());
      setCantAlertas(Array.isArray(r) ? r.length : 0);
    } catch(_) {}
  }

  async function cargar() {
      const tk = await getToken();
      const d = await fetch(`${SUPA_URL}/clientes?select=id,empresa&order=empresa.asc`, { headers: hdrs(tk) }).then(r => r.json());
      setClientes(Array.isArray(d) ? d : []);

      // Cargar wsp y mail — primero cliente, si no hay buscar comitente
      const clienteId = pres?.cliente_id || form.cliente_id || pres?.comitente_id || form.comitente_id;
      if (clienteId) {
        const cli = await fetch(`${SUPA_URL}/clientes?id=eq.${clienteId}&select=wsp,mail,empresa`, { headers: hdrs(tk) }).then(r => r.json());
        if (Array.isArray(cli) && cli[0]) {
          setClienteWsp(cli[0].wsp || "");
          setClienteMail(cli[0].mail || "");
        }
      }

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

  function enviarWhatsApp() {
    if (!clienteWsp) return;
    // Cambiar estado a enviado si estaba en borrador
    const hoy = new Date().toISOString().slice(0,10);
    const patch = form.estado === "borrador"
      ? { estado: "enviado", probabilidad: 25, fecha_ultimo_contacto: hoy }
      : { fecha_ultimo_contacto: hoy };
    setForm(p => ({ ...p, ...patch }));
    onGuardar({ ...form, ...patch }).catch(() => {});
    const numero = clienteWsp.replace(/\D/g, "");
    const codigo = form.version ? `${form.codigo}-${form.version}` : form.codigo;
    const texto = encodeURIComponent(
      `Hola! Te enviamos el presupuesto NPL *${codigo}* - ${form.descripcion || form.obra_nombre || ""}\n\n${pdfUrl ? `Podés verlo acá: ${pdfUrl}\n\n` : ""}Quedamos a disposición para cualquier consulta.`
    );
    window.open(`https://wa.me/${numero}?text=${texto}`, "_blank");
  }

  function enviarEmail() {
    if (!clienteMail) return;
    // Cambiar estado a enviado si estaba en borrador
    const hoyE = new Date().toISOString().slice(0,10);
    const patchE = form.estado === "borrador"
      ? { estado: "enviado", probabilidad: 25, fecha_ultimo_contacto: hoyE }
      : { fecha_ultimo_contacto: hoyE };
    setForm(p => ({ ...p, ...patchE }));
    onGuardar({ ...form, ...patchE }).catch(() => {});
    const codigo = form.version ? `${form.codigo}-${form.version}` : form.codigo;
    const asunto = encodeURIComponent(`Presupuesto NPL ${codigo} - ${form.descripcion || form.obra_nombre || ""}`);
    const cuerpo = encodeURIComponent(
      `Hola${form.cliente ? ` ${form.cliente}` : ""},\n\nAdjuntamos el presupuesto ${codigo}${form.descripcion ? ` - ${form.descripcion}` : ""}.\n\n${pdfUrl ? `Podés verlo aquí: ${pdfUrl}\n\n` : ""}Quedamos a disposición para cualquier consulta.\n\nSaludos,\nNPL Ingeniería Civil\n(221) 455 0429`
    );
    window.open(`mailto:${clienteMail}?subject=${asunto}&body=${cuerpo}`, "_blank");
  }

  async function generarPDF() {
    if (!pres?.id) {
      setError("Guardá el presupuesto primero antes de generar el PDF.");
      return;
    }
    setGenerandoPDF(true);
    setError("");
    try {
      // Guardar campos del documento directamente sin pasar por onGuardar (que cierra el modal)
      const tk = await getToken();
      const body = { ...form };
      delete body.version;
      if (!body.cliente_id) body.cliente_id = null;
      if (!body.comitente_id) body.comitente_id = null;
      if (!body.fecha_emision) body.fecha_emision = null;
      if (!body.fecha_vencimiento) body.fecha_vencimiento = null;
      if (!body.fecha_aprobacion) body.fecha_aprobacion = null;
      if (body.monto === "" || body.monto === undefined) body.monto = null;
      if (body.superficie === "" || body.superficie === undefined) body.superficie = null;
      if (body.probabilidad === "" || body.probabilidad === undefined) body.probabilidad = null;

      await fetch(`${SUPA_URL}/presupuestos?id=eq.${pres.id}`, {
        method: "PATCH", headers: hdrs(tk), body: JSON.stringify(body)
      });

      // Llamar a la Edge Function
      const res = await fetch(`${EDGE_URL}/generar-presupuesto`, {
        method: "POST",
        headers: { Authorization: `Bearer ${tk}`, "Content-Type": "application/json" },
        body: JSON.stringify({ presupuesto_id: pres.id }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setPdfUrl(data.pdf_url);
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

          {/* Header con stepper */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
            <div>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: "#0a0a0a" }}>
                {esNuevo && tabModal === "datos" ? "Nuevo presupuesto" : esNuevo && tabModal === "documento" ? "Completar documento" : "Editar presupuesto"}
              </h3>
              {form.codigo && <span style={{ fontSize: 12, fontFamily: "JetBrains Mono, monospace", color: "#888", fontWeight: 700 }}>[ {form.version ? `${form.codigo}-${form.version}` : form.codigo} ]</span>}
            </div>
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              {/* Stepper */}
              <div style={{ display: "flex", alignItems: "center", gap: 0 }}>
                <div onClick={() => setTabModal("datos")} style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 14px", borderRadius: "8px 0 0 8px", cursor: "pointer", background: tabModal === "datos" ? "#0a0a0a" : (!esNuevo ? "#f0f0f0" : "#f8f8f8"), border: "1.5px solid #e0e0e0", borderRight: "none" }}>
                  <span style={{ width: 18, height: 18, borderRadius: "50%", background: tabModal === "datos" ? "#fff" : (!esNuevo ? "#1a8a5e" : "#ccc"), color: tabModal === "datos" ? "#111" : "#fff", fontSize: 10, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {!esNuevo ? "✓" : "1"}
                  </span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: tabModal === "datos" ? "#fff" : (!esNuevo ? "#555" : "#aaa") }}>Datos</span>
                </div>
                <div onClick={() => !esNuevo && setTabModal("documento")} style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 14px", borderRadius: "0 8px 8px 0", cursor: !esNuevo ? "pointer" : "default", background: tabModal === "documento" ? "#0a0a0a" : "#f8f8f8", border: "1.5px solid #e0e0e0" }}>
                  <span style={{ width: 18, height: 18, borderRadius: "50%", background: tabModal === "documento" ? "#fff" : "#e0e0e0", color: tabModal === "documento" ? "#111" : "#999", fontSize: 10, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center" }}>2</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: tabModal === "documento" ? "#fff" : (esNuevo ? "#ccc" : "#555") }}>Documento</span>
                </div>
              </div>
              <button onClick={onClose} style={{ background: "#f0f0f0", border: "none", borderRadius: 8, padding: "6px 12px", cursor: "pointer", fontSize: 16, color: "#555" }}>✕</button>
            </div>
          </div>

          {/* Tab DATOS */}
          {tabModal === "datos" && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>

            {/* ─── Columna izquierda ─── */}
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>

              {/* Tipo de servicio */}
              <div>
                <span style={shared.lbl}>Tipo de servicio *</span>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 5 }}>
                  {TIPOS_SERVICIO.map(t => (
                    <button key={t.v} onClick={() => setForm(p => ({ ...p, tipo_servicio: t.v }))} style={{
                      padding: "8px 10px", textAlign: "left", borderRadius: 8, cursor: "pointer", fontSize: 12,
                      border: form.tipo_servicio === t.v ? "2px solid #0a0a0a" : "1.5px solid #ccc",
                      background: form.tipo_servicio === t.v ? "#0a0a0a" : "#fafafa",
                      color: form.tipo_servicio === t.v ? "#fff" : "#222",
                      fontWeight: form.tipo_servicio === t.v ? 700 : 500,
                    }}>
                      <div style={{ fontSize: 12 }}>{t.label}</div>
                      {t.desc && <div style={{ fontSize: 10, opacity: .6, marginTop: 1 }}>{t.desc}</div>}
                    </button>
                  ))}
                </div>
              </div>

              {/* Sistema constructivo */}
              <div>
                <span style={shared.lbl}>Sistema constructivo</span>
                <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                  {SISTEMAS_CONSTRUCTIVOS.map(s => (
                    <button key={s.v} onClick={() => setForm(p => ({ ...p, sistema_constructivo: s.v }))} style={{
                      padding: "5px 11px", borderRadius: 7, cursor: "pointer", fontSize: 12,
                      border: form.sistema_constructivo === s.v ? "2px solid #0a0a0a" : "1.5px solid #ccc",
                      background: form.sistema_constructivo === s.v ? "#0a0a0a" : "#fafafa",
                      color: form.sistema_constructivo === s.v ? "#fff" : "#222",
                      fontWeight: form.sistema_constructivo === s.v ? 700 : 500,
                    }}>
                      {s.icon} {s.v}
                    </button>
                  ))}
                </div>
              </div>

              {/* Cliente + Comitente en grid */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                    <span style={shared.lbl}>Cliente <span style={{ fontWeight: 400, color: "#bbb", textTransform: "none", letterSpacing: 0 }}>(opcional)</span></span>
                    <button onClick={() => setShowNuevoCli(true)} style={{ fontSize: 10, padding: "1px 6px", background: "#f0f0f0", border: "none", borderRadius: 4, cursor: "pointer", color: "#555" }}>+ Nuevo</button>
                  </div>
                  <Combobox
                    options={[
                      // Incluir cliente actual si existe para que se muestre aunque las opciones aún no carguen
                      ...(form.cliente_id && form.cliente ? [{ value: form.cliente_id, label: form.cliente }] : []),
                      ...clientes.filter(c => c.id !== form.cliente_id).map(c => ({ value: c.id, label: `${c.empresa}${c.tipo ? ` · ${c.tipo}` : ""}` }))
                    ]}
                    value={form.cliente_id}
                    onChange={(val, label) => setForm(p => ({ ...p, cliente_id: val, cliente: label }))}
                    placeholder="Buscar cliente..."
                    emptyLabel="Sin cliente"
                  />
                </div>
                <div>
                  <span style={shared.lbl}>Comitente <span style={{ fontWeight: 400, color: "#bbb", textTransform: "none", letterSpacing: 0 }}>(opcional)</span></span>
                  <Combobox
                    options={[
                      ...(form.comitente_id && form.comitente_nombre ? [{ value: form.comitente_id, label: form.comitente_nombre }] : []),
                      ...clientes.filter(c => c.id !== form.comitente_id).map(c => ({ value: c.id, label: `${c.empresa}${c.tipo ? ` · ${c.tipo}` : ""}` }))
                    ]}
                    value={form.comitente_id}
                    onChange={(val, label) => setForm(p => ({ ...p, comitente_id: val, comitente_nombre: label }))}
                    placeholder="Buscar comitente..."
                    emptyLabel="Sin comitente"
                  />
                  {!form.comitente_id && (
                    <input value={form.comitente_nombre} onChange={e => setForm(p => ({ ...p, comitente_nombre: e.target.value }))}
                      style={{ ...shared.inp, marginTop: 5, fontSize: 12 }} placeholder="Nombre libre si no está en lista" />
                  )}
                </div>
              </div>

              {/* Descripción */}
              <div>
                <span style={shared.lbl}>Descripción <span style={{ fontWeight: 400, color: "#bbb", textTransform: "none", letterSpacing: 0 }}>(opcional)</span></span>
                <input value={form.descripcion} onChange={e => setForm(p => ({ ...p, descripcion: e.target.value }))} style={shared.inp} placeholder="Título corto del trabajo" />
              </div>

              {/* Observaciones */}
              <div>
                <span style={shared.lbl}>Observaciones</span>
                <textarea value={form.obs} onChange={e => setForm(p => ({ ...p, obs: e.target.value }))} rows={2} style={{ ...shared.inp, resize: "none" }} placeholder="Notas internas…" />
              </div>
            </div>

            {/* ─── Columna derecha ─── */}
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>

              {/* Código y versión */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
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
              <div style={{ display: "grid", gridTemplateColumns: "1fr 80px 80px", gap: 8 }}>
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
                  <span style={shared.lbl}>m²</span>
                  <input type="number" value={form.superficie} onChange={e => {
                    const sup = e.target.value;
                    setForm(p => ({
                      ...p,
                      superficie: sup,
                      // Auto-actualizar [X] en descripción larga si existe
                      descripcion_larga: p.descripcion_larga
                        ? p.descripcion_larga.replace(/\d+(?=\s*metros cuadrados)|\[X\]/g, sup || "[X]")
                        : p.descripcion_larga
                    }));
                  }} style={shared.inp} placeholder="0" />
                </div>
              </div>

              {/* Precio por m² */}
              {precioM2 !== null && (
                <div style={{ background: "#f0fdf4", borderRadius: 8, padding: "7px 12px", fontSize: 13, color: "#1a8a5e", fontWeight: 700, fontFamily: "JetBrains Mono, monospace" }}>
                  {form.moneda === "USD" ? "u$s" : "$"} {precioM2.toLocaleString("es-AR", { maximumFractionDigits: 0 })} / m²
                </div>
              )}

              {/* Estado y probabilidad */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 90px", gap: 8 }}>
                <div>
                  <span style={shared.lbl}>Estado</span>
                  <select value={form.estado} onChange={e => {
                    const est = ESTADOS.find(es => es.v === e.target.value);
                    setForm(p => ({ ...p, estado: e.target.value, probabilidad: est?.prob ?? p.probabilidad }));
                  }} style={shared.inp}>
                    {ESTADOS.map(e => <option key={e.v} value={e.v}>{e.label}</option>)}
                  </select>
                </div>
                <div>
                  <span style={shared.lbl}>Prob. %</span>
                  <input type="number" min="0" max="100" value={form.probabilidad} onChange={e => setForm(p => ({ ...p, probabilidad: e.target.value }))} style={shared.inp} placeholder="0" />
                </div>
              </div>

              {/* Fechas */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <div>
                  <span style={shared.lbl}>Fecha emisión</span>
                  <input type="date" value={form.fecha_emision} onChange={e => setForm(p => ({ ...p, fecha_emision: e.target.value }))} style={shared.inp} />
                </div>
                <div>
                  <span style={shared.lbl}>Vencimiento</span>
                  <input type="date" value={form.fecha_vencimiento} onChange={e => setForm(p => ({ ...p, fecha_vencimiento: e.target.value }))} style={shared.inp} />
                </div>
              </div>
              {(form.estado === "aprobado" || form.fecha_aprobacion) && (
                <div>
                  <span style={shared.lbl}>Fecha aprobación <span style={{ fontWeight: 400, color: "#1a8a5e", textTransform: "none", letterSpacing: 0 }}>✓</span></span>
                  <input type="date" value={form.fecha_aprobacion} onChange={e => setForm(p => ({ ...p, fecha_aprobacion: e.target.value }))} style={{ ...shared.inp, borderColor: "#1a8a5e" }} />
                </div>
              )}

              {/* Separador */}
              <div style={{ flex: 1 }} />

              {/* Error y aviso */}
              {error && <div style={{ background: "#fef2f2", color: "#c0392b", borderRadius: 8, padding: "8px 12px", fontSize: 12, fontWeight: 600 }}>❌ {error}</div>}
              {!form.tipo_servicio && <div style={{ background: "#fffbeb", color: "#c4781a", borderRadius: 8, padding: "8px 12px", fontSize: 12 }}>⚠️ Seleccioná un <strong>tipo de servicio</strong></div>}

              {/* Acciones */}
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={async () => { await guardar(); if (!error) setTabModal("documento"); }}
                  disabled={!form.tipo_servicio || saving}
                  style={{ ...shared.btn, flex: 1, opacity: (!form.tipo_servicio || saving) ? 0.4 : 1 }}>
                  {saving ? "Guardando…" : esNuevo ? "Crear y continuar →" : "Guardar cambios"}
                </button>
                <button onClick={onClose} style={{ ...shared.btnSm, padding: "10px 14px" }}>Cancelar</button>
              </div>
            </div>
          </div>
          )} {/* fin tab datos */}

          {/* Tab DOCUMENTO */}
          {tabModal === "documento" && (
            <div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
                <div>
                  <span style={shared.lbl}>Nombre de la obra</span>
                  <input value={form.obra_nombre} onChange={e => setForm(p => ({ ...p, obra_nombre: e.target.value }))} style={shared.inp} placeholder="Vivienda Vrick Ensenada" />
                </div>
                <div>
                  <span style={shared.lbl}>Comitente</span>
                  <div style={{ ...shared.inp, background: "#f8f8f8", color: "#555", display: "flex", alignItems: "center", fontSize: 13 }}>
                    {form.comitente_nombre || form.cliente || "— sin comitente —"}
                  </div>
                </div>
              </div>
              <div style={{ marginBottom: 14 }}>
                <span style={shared.lbl}>Modalidad de pago</span>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {[
                    { v: "50_50",   label: "50% Anticipo + 50% Contra entrega" },
                    { v: "25_50_25", label: "25% Anticipo + 50% Anteproyecto + 25% Contra entrega" },
                    { v: "custom",  label: "Personalizada" },
                  ].map(opt => (
                    <label key={opt.v} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, cursor: "pointer", padding: "7px 10px", borderRadius: 8, border: `1.5px solid ${form.forma_pago === opt.v ? "#0a0a0a" : "#e0e0e0"}`, background: form.forma_pago === opt.v ? "#f8f8f8" : "#fff" }}>
                      <input type="radio" name="modalidad_pago" value={opt.v} checked={form.forma_pago === opt.v} onChange={() => setForm(p => ({ ...p, forma_pago: opt.v }))} style={{ accentColor: "#111" }} />
                      {opt.label}
                    </label>
                  ))}
                  {form.forma_pago === "custom" && (
                    <input value={form.forma_pago_custom || ""} onChange={e => setForm(p => ({ ...p, forma_pago_custom: e.target.value }))} style={{ ...shared.inp, marginTop: 4 }} placeholder="Ej: 30% anticipo + 40% a mitad + 30% contra entrega" />
                  )}
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

              {/* 4 acciones en secuencia */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 8 }}>
                {/* 1. Guardar */}
                <button onClick={async () => { await guardar(); }} disabled={saving}
                  style={{ ...shared.btnSm, padding: "12px", fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                  {saving ? "Guardando…" : <><span>💾</span><span>1. Guardar</span></>}
                </button>

                {/* 2. Generar PDF */}
                <button onClick={generarPDF} disabled={generandoPDF || esNuevo}
                  style={{ ...shared.btn, padding: "12px", fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, opacity: esNuevo ? 0.4 : 1 }}>
                  {generandoPDF ? "Generando…" : <><span>📄</span><span>2. Generar PDF en Drive</span></>}
                </button>

                {/* 3. WhatsApp */}
                <button onClick={enviarWhatsApp} disabled={!clienteWsp}
                  style={{ padding: "12px", fontSize: 13, border: "1.5px solid #25d366", borderRadius: 10, background: clienteWsp ? "#25d366" : "#f0f0f0", color: clienteWsp ? "#fff" : "#aaa", cursor: clienteWsp ? "pointer" : "not-allowed", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                  <span>💬</span><span>3. Enviar por WhatsApp</span>
                </button>

                {/* 4. Email */}
                <button onClick={enviarEmail} disabled={!clienteMail}
                  style={{ padding: "12px", fontSize: 13, border: "1.5px solid #3b82f6", borderRadius: 10, background: clienteMail ? "#3b82f6" : "#f0f0f0", color: clienteMail ? "#fff" : "#aaa", cursor: clienteMail ? "pointer" : "not-allowed", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                  <span>✉️</span><span>4. Enviar por Email</span>
                </button>
              </div>

              {/* Info de contacto del cliente */}
              <div style={{ marginTop: 12, padding: "10px 14px", background: "#f8f8f8", borderRadius: 8, fontSize: 12, color: "#666", display: "flex", gap: 16 }}>
                <span>👤 {form.cliente || form.comitente_nombre || "Sin cliente/comitente"}</span>
                {clienteWsp ? <span style={{ color: "#25d366" }}>💬 {clienteWsp}</span> : <span style={{ color: "#ccc" }}>Sin WhatsApp</span>}
                {clienteMail ? <span style={{ color: "#3b82f6" }}>✉️ {clienteMail}</span> : <span style={{ color: "#ccc" }}>Sin email</span>}
              </div>

              {pdfUrl && !pdfUrl.includes("undefined") && (
                <div style={{ marginTop: 10, background: "#f0fdf4", borderRadius: 8, padding: "10px 14px", display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 16 }}>✅</span>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#1a8a5e" }}>PDF generado en Drive</div>
                    <a href={pdfUrl} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: "#1a73e8", textDecoration: "none" }}>📂 Abrir PDF →</a>
                  </div>
                </div>
              )}
              {esNuevo && <p style={{ fontSize: 11, color: "#aaa", marginTop: 8 }}>Guardá primero para habilitar las acciones.</p>}
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
    ? Math.round(parseFloat(p.monto) / parseFloat(p.superficie))
    : null;

  // Usar fecha_ultimo_contacto si existe, sino fecha_emision, nunca updated_at
  const fechaRef = p.fecha_ultimo_contacto || p.fecha_emision;
  const diasDesdeActualizacion = fechaRef
    ? Math.floor((new Date() - new Date(fechaRef + "T12:00")) / 86400000)
    : null;
  const necesitaRecontacto = (p.estado === "enviado" || p.estado === "negociacion")
    && diasDesdeActualizacion !== null && diasDesdeActualizacion >= 7;

  function mensajeRecontacto() {
    const codigo = p.codigo || "";
    const texto = encodeURIComponent(
      `Hola${p.cliente ? ` ${p.cliente}` : ""}! Te escribimos desde NPL Ingeniería para hacer un seguimiento del presupuesto *${codigo}* - ${p.descripcion || ""}.\n\n¿Pudiste revisar la propuesta? Quedamos a disposición para cualquier consulta.\n\n¡Gracias!`
    );
    return `https://wa.me/?text=${texto}`;
  }

  return (
    <div style={{
      background: "#fff", borderRadius: 10, padding: "10px 14px",
      border: `1px solid ${necesitaRecontacto ? "#f59e0b" : "#e8e8e8"}`,
      borderLeft: `4px solid ${estado?.color || "#e0e0e0"}`,
      display: "grid",
      gridTemplateColumns: "90px 1fr auto auto",
      gap: 12, alignItems: "center",
    }}>
      {/* Código + fecha */}
      <div>
        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, fontWeight: 700, color: "#555" }}>{p.codigo || "—"}</div>
        {p.fecha_emision && <div style={{ fontSize: 10, color: "#bbb", marginTop: 2 }}>{new Date(p.fecha_emision+"T12:00").toLocaleDateString("es-AR", { day:"2-digit", month:"2-digit", year:"2-digit" })}</div>}
      </div>

      {/* Info principal */}
      <div style={{ minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", marginBottom: 2 }}>
          <span style={{ fontWeight: 700, fontSize: 13, color: "#111", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.descripcion || "Sin descripción"}</span>
          {necesitaRecontacto && <span style={{ fontSize: 10, background: "#fef3c7", color: "#c4781a", borderRadius: 4, padding: "1px 6px", fontWeight: 700, flexShrink: 0 }}>⏰ {diasDesdeActualizacion}d</span>}
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          {(p.cliente || p.comitente_nombre) && <span style={{ fontSize: 11, color: "#888" }}>{p.cliente || p.comitente_nombre}</span>}
          {tipo && <span style={{ fontSize: 10, background: "#f0f0f0", borderRadius: 4, padding: "1px 6px", color: "#666" }}>{tipo.label}</span>}
          {sistema && <span style={{ fontSize: 10, background: "#f0f4ff", borderRadius: 4, padding: "1px 6px", color: "#6366f1" }}>{sistema.icon} {sistema.v}</span>}
        </div>
      </div>

      {/* Monto + precio m2 + estado */}
      <div style={{ textAlign: "right", flexShrink: 0 }}>
        {p.monto && <div style={{ fontWeight: 800, fontSize: 14, color: "#111", fontFamily: "'JetBrains Mono', monospace" }}>
          {p.moneda === "USD" ? "u$s" : "$"}{parseFloat(p.monto).toLocaleString("es-AR")}
        </div>}
        {precioM2 && <div style={{ fontSize: 10, color: "#1a8a5e", fontWeight: 600 }}>${precioM2.toLocaleString("es-AR")}/m²</div>}
        <select value={p.estado || "borrador"} onChange={e => onCambiarEstado(p.id, e.target.value)}
          style={{ fontSize: 11, padding: "3px 6px", borderRadius: 6, cursor: "pointer", border: `1px solid ${estado?.color || "#e0e0e0"}`, color: estado?.color || "#888", background: "#fff", fontWeight: 700, marginTop: 4 }}>
          {ESTADOS.map(e => <option key={e.v} value={e.v}>{e.label}</option>)}
        </select>
      </div>

      {/* Acciones — siempre en una fila */}
      <div style={{ display: "flex", gap: 4, flexShrink: 0, alignItems: "center" }}>
        <button onClick={() => onEditar(p)} style={{ background: "#f0f0f0", border: "none", borderRadius: 6, padding: "5px 10px", fontSize: 11, cursor: "pointer", color: "#333", fontWeight: 600 }}>✏️</button>
        {necesitaRecontacto && (
          <a href={mensajeRecontacto()} target="_blank" rel="noreferrer"
            style={{ background: "#25d366", border: "none", borderRadius: 6, padding: "5px 10px", fontSize: 11, cursor: "pointer", color: "#fff", fontWeight: 700, textDecoration: "none" }}>💬</a>
        )}
        {p.archivado === true
          ? <button onClick={() => onDesarchivar && onDesarchivar(p.id)} style={{ background: "#f0f0f0", border: "none", borderRadius: 6, padding: "5px 10px", fontSize: 11, cursor: "pointer", color: "#333" }}>↩</button>
          : <button onClick={() => onArchivar && onArchivar(p.id)} style={{ background: "#f0f0f0", border: "none", borderRadius: 6, padding: "5px 10px", fontSize: 11, cursor: "pointer", color: "#999" }}>📦</button>
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
  const [filtroEstado, setFiltroEstado] = useState("seguimiento"); // Default: enviado + negociacion
  const [filtroTipo, setFiltroTipo] = useState("todos");
  const [filtroSistema, setFiltroSistema] = useState("todos");
  const [filtroMes, setFiltroMes] = useState("todos");
  const [verArchivados, setVerArchivados] = useState(false);
  const [showAlertas, setShowAlertas] = useState(false);
  const [cantAlertas, setCantAlertas] = useState(0);
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

      // Limpiar campos UUID vacíos → null (Postgres rechaza "" como uuid)
      if (!body.cliente_id) body.cliente_id = null;
      if (!body.comitente_id) body.comitente_id = null;

      // Limpiar campos date vacíos → null
      if (!body.fecha_emision) body.fecha_emision = null;
      if (!body.fecha_vencimiento) body.fecha_vencimiento = null;

      // Limpiar campos numéricos vacíos → null
      if (body.monto === "" || body.monto === undefined) body.monto = null;
      if (body.superficie === "" || body.superficie === undefined) body.superficie = null;
      if (body.probabilidad === "" || body.probabilidad === undefined) body.probabilidad = null;

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
        // Para nuevo presupuesto: no cerrar modal, actualizar editando con el id creado
        const created = await res.json().catch(() => null);
        if (created?.[0]?.id) {
          setEditando(created[0]); // ahora editando tiene el id real
          setMsg("✓ Presupuesto creado — completá el documento");
          setTimeout(() => setMsg(""), 4000);
          cargar();
          return; // no cierra el modal
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
    const est = ESTADOS.find(e => e.v === estado);
    const hoy = new Date().toISOString().slice(0, 10);
    const patch = {
      estado,
      probabilidad: est?.prob ?? 0,
      // Auto-registrar fecha de aprobación
      ...(estado === "aprobado" ? { fecha_aprobacion: hoy } : {}),
    };
    await fetch(`${SUPA_URL}/presupuestos?id=eq.${id}`, { method: "PATCH", headers: hdrs(tk), body: JSON.stringify(patch) });
    setPresupuestos(prev => prev.map(p => p.id === id ? { ...p, ...patch } : p));
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
    presupuestos.flatMap(p => [
      p.fecha_emision ? p.fecha_emision.slice(0,7) : null,
      p.fecha_aprobacion ? p.fecha_aprobacion.slice(0,7) : null,
    ].filter(Boolean))
  )].sort().reverse();

  // Filtros
  const filtrados = presupuestos.filter(p => {
    if (verArchivados) return p.archivado === true;
    if (p.archivado === true) return false;
    const pasaEstado  = filtroEstado === "todos"
      ? true
      : filtroEstado === "seguimiento"
      ? (p.estado === "enviado" || p.estado === "negociacion")
      : p.estado === filtroEstado;
    const pasaTipo    = filtroTipo === "todos"     || p.tipo_servicio === filtroTipo;
    const pasaSistema = filtroSistema === "todos"  || p.sistema_constructivo === filtroSistema;
    const fechaRef = (filtroEstado === "aprobado" && p.fecha_aprobacion)
      ? p.fecha_aprobacion
      : p.fecha_emision;
    const pasaMes     = filtroMes === "todos" || (fechaRef && fechaRef.slice(0,7) === filtroMes);
    return pasaEstado && pasaTipo && pasaSistema && pasaMes;
  });

  const totalArchivados = presupuestos.filter(p => p.archivado === true).length;

  // Orden: por código descendente (el "último enviado" tiene el número más alto)
  const ordenados = [...filtrados].sort((a, b) => codigoNumero(b.codigo) - codigoNumero(a.codigo));

  // KPIs
  // KPIs: aprobados filtran por mes independientemente del filtro de estado
  const aprobadosPorMes = presupuestos.filter(p => {
    if (p.estado !== "aprobado") return false;
    if (filtroMes === "todos") return true;
    const fecha = p.fecha_aprobacion || p.fecha_emision;
    return fecha && fecha.slice(0,7) === filtroMes;
  });
  const totalMonto    = aprobadosPorMes.reduce((s, p) => s + (parseFloat(p.monto) || 0), 0);
  const enviados      = ordenados.filter(p => p.estado === "enviado").length;
  const enNegociacion = ordenados.filter(p => p.estado === "negociacion").length;
  const montoEnviados = ordenados.filter(p => p.estado === "enviado" || p.estado === "negociacion").reduce((s, p) => s + (parseFloat(p.monto) || 0), 0);
  const paraRecontactar = ordenados.filter(p => {
    if (p.estado !== "enviado" && p.estado !== "negociacion") return false;
    const ref = p.fecha_ultimo_contacto || p.fecha_emision;
    if (!ref) return false;
    return Math.floor((new Date() - new Date(ref + "T12:00")) / 86400000) >= 7;
  }).length;

  return (
    <div style={{ fontFamily: "system-ui, -apple-system, sans-serif", padding: isMobile ? 16 : 28, maxWidth: 1100, margin: "0 auto" }}>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <div>
          <p style={{ margin: 0, fontSize: 12, color: "#999", fontWeight: 500 }}>NPL · Admin</p>
          <h1 style={{ margin: "2px 0 0", fontSize: isMobile ? 20 : 24, fontWeight: 700 }}>💰 Presupuestos</h1>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <button onClick={() => setShowAlertas(true)} style={{
            padding: "9px 16px", background: cantAlertas > 0 ? "#fef3c7" : "#f0f0f0",
            color: cantAlertas > 0 ? "#c4781a" : "#555",
            border: cantAlertas > 0 ? "1.5px solid #f59e0b" : "1.5px solid #e0e0e0",
            borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: "pointer",
          }}>
            🔔 Alertas {cantAlertas > 0 ? `(${cantAlertas})` : ""}
          </button>
          <button onClick={() => { setEditando(null); setShowModal(true); }} style={shared.btn}>+ Nuevo presupuesto</button>
        </div>
      </div>

      {msg && (
        <div style={{ background: msg.startsWith("❌") ? "#fef2f2" : "#f0fdf4", color: msg.startsWith("❌") ? "#c0392b" : "#1a8a5e", borderRadius: 8, padding: "8px 12px", marginBottom: 14, fontSize: 13, fontWeight: 600 }}>
          {msg}
        </div>
      )}

      {/* KPIs compactos — una sola fila */}
      <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
        {[
          { label: filtroMes !== "todos" ? `Aprobado ${MESES[parseInt(filtroMes.slice(5))-1]}` : "Aprobado",     value: `$${totalMonto.toLocaleString("es-AR")}`,          color: "#1a8a5e" },
          { label: "Enviados",     value: enviados,                                            color: "#3b82f6" },
          { label: "Negociación",  value: enNegociacion,                                       color: "#f59e0b" },
          { label: "⏰ Recontactar", value: paraRecontactar,                                   color: paraRecontactar > 0 ? "#c4781a" : "#aaa" },
          { label: "En seguimiento", value: `$${montoEnviados.toLocaleString("es-AR")}`,      color: "#6366f1" },
          { label: "Total",        value: presupuestos.length,                                 color: "#888" },
        ].map(k => (
          <div key={k.label} style={{ background: "#fff", borderRadius: 10, padding: "10px 16px", border: "1.5px solid #e8e8e8", display: "flex", flexDirection: "column", gap: 2, minWidth: 100 }}>
            <div style={{ fontSize: 18, fontWeight: 800, color: k.color, fontFamily: "'JetBrains Mono', monospace", lineHeight: 1 }}>{k.value}</div>
            <div style={{ fontSize: 10, color: "#aaa", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>{k.label}</div>
          </div>
        ))}
      </div>

      {/* Filtros compactos */}
      <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap", alignItems: "center", background: "#fff", borderRadius: 10, padding: "8px 12px", border: "1.5px solid #e8e8e8" }}>
        <select value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)} style={{ fontSize: 12, padding: "5px 10px", border: filtroEstado === "seguimiento" ? "1.5px solid #c4781a" : "1.5px solid #e0e0e0", borderRadius: 7, background: filtroEstado === "seguimiento" ? "#fff7ed" : "#f8f8f8", color: filtroEstado === "seguimiento" ? "#c4781a" : "#333", fontWeight: 700, cursor: "pointer" }}>
          <option value="seguimiento">📨 En seguimiento</option>
          <option value="todos">Todos</option>
          {ESTADOS.map(e => <option key={e.v} value={e.v}>{e.label}</option>)}
        </select>
        <select value={filtroMes} onChange={e => setFiltroMes(e.target.value)} style={{ fontSize: 12, padding: "5px 10px", border: "1.5px solid #e0e0e0", borderRadius: 7, background: "#f8f8f8", cursor: "pointer" }}>
          <option value="todos">📅 Todos los meses</option>
          {mesesDisponibles.map(m => { const [y, mo] = m.split("-"); return <option key={m} value={m}>{MESES[parseInt(mo)-1]} {y}</option>; })}
        </select>
        <select value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)} style={{ fontSize: 12, padding: "5px 10px", border: "1.5px solid #e0e0e0", borderRadius: 7, background: "#f8f8f8", cursor: "pointer" }}>
          <option value="todos">Todos los servicios</option>
          {TIPOS_SERVICIO.map(t => <option key={t.v} value={t.v}>{t.label}</option>)}
        </select>
        <select value={filtroSistema} onChange={e => setFiltroSistema(e.target.value)} style={{ fontSize: 12, padding: "5px 10px", border: "1.5px solid #e0e0e0", borderRadius: 7, background: "#f8f8f8", cursor: "pointer" }}>
          <option value="todos">🏗️ Sistemas</option>
          {SISTEMAS_CONSTRUCTIVOS.map(s => <option key={s.v} value={s.v}>{s.icon} {s.v}</option>)}
        </select>
        {(filtroEstado !== "seguimiento" || filtroTipo !== "todos" || filtroSistema !== "todos" || filtroMes !== "todos") && (
          <button onClick={() => { setFiltroEstado("seguimiento"); setFiltroTipo("todos"); setFiltroSistema("todos"); setFiltroMes("todos"); }} style={{ fontSize: 11, padding: "5px 10px", background: "none", border: "1px solid #e0e0e0", borderRadius: 7, cursor: "pointer", color: "#888" }}>✕</button>
        )}
        <button onClick={() => setVerArchivados(v => !v)} style={{ fontSize: 11, padding: "5px 10px", background: verArchivados ? "#111" : "#f8f8f8", color: verArchivados ? "#fff" : "#666", border: "1.5px solid #e0e0e0", borderRadius: 7, cursor: "pointer" }}>
          📦 {verArchivados ? "Activos" : `Archivados${totalArchivados > 0 ? ` (${totalArchivados})` : ""}`}
        </button>
        <span style={{ fontSize: 11, color: "#aaa", marginLeft: "auto", fontFamily: "'JetBrains Mono', monospace" }}>{ordenados.length}</span>
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
          key={editando?.id || "nuevo"}
          pres={editando}
          onGuardar={guardar}
          onClose={() => { setShowModal(false); setEditando(null); }}
        />
      )}

      {showAlertas && (
        <AlertasPresupuestos onClose={() => { setShowAlertas(false); cargarAlertas(); }} />
      )}
    </div>
  );
}
