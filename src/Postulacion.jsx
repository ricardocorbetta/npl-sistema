import React, { useState } from "react";

const SUPA_URL = "https://imkmosifqxzbtqgzssst.supabase.co/rest/v1";
const ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlta21vc2lmcXh6YnRxZ3pzc3N0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkxODk4NTUsImV4cCI6MjA5NDc2NTg1NX0.5gtCs8Yv3vDSrKxAmXSr3zjWJ5HjimCKejfO-XrHPss";

const SISTEMAS = ["Hormigón armado","Steel frame","Wood frame","Panel SIP","Estructuras metálicas","Mampostería portante","Fundaciones superficiales","Fundaciones profundas","Refuerzos estructurales","Ampliaciones / reformas"];
const TIPOS_PROYECTO = ["Viviendas unifamiliares","Viviendas multifamiliares","PH / dúplex","Ampliaciones de viviendas existentes","Locales comerciales","Galpones / naves industriales","Estructuras livianas","Obras de mayor escala"];
const ENTREGABLES = ["Modelo estructural","Memoria de cálculo","Planos de estructura","Planillas de armaduras","Detalles constructivos","Cómputo de materiales","Informe técnico","Documentación municipal","Revisión / verificación de estructuras"];
const NIVELES_SW = ["No lo utilizo","Básico","Intermedio","Avanzado","Experto / uso profesional frecuente"];
const DISPONIBILIDAD = ["Menos de 10 horas semanales","Más de 10 y menos de 20","Más de 20 horas semanales"];
const EXPERIENCIA_NIVEL = ["No tengo experiencia aún","Sí, experiencia inicial","Sí, experiencia intermedia","Sí, amplia experiencia"];
const FORMACION = ["Estudiante avanzado/a de Ingeniería Civil","Estudiante avanzado/a de Arquitectura","Ingeniero/a Civil","Arquitecto/a","Otro"];

const inp = {
  width: "100%", padding: "10px 14px", border: "1.5px solid #e0e0e0",
  borderRadius: 8, fontSize: 14, boxSizing: "border-box",
  background: "#fff", fontFamily: "inherit", color: "#111",
};
const lbl = { fontSize: 13, fontWeight: 600, color: "#333", marginBottom: 6, display: "block" };
const sublbl = { fontSize: 12, color: "#888", marginBottom: 8, display: "block" };

function CheckGroup({ opciones, value = [], onChange, cols = 2 }) {
  const toggle = (op) => {
    if (value.includes(op)) onChange(value.filter(x => x !== op));
    else onChange([...value, op]);
  };
  return (
    <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 8 }}>
      {opciones.map(op => (
        <label key={op} onClick={() => toggle(op)} style={{
          display: "flex", alignItems: "flex-start", gap: 8, padding: "8px 12px",
          borderRadius: 8, cursor: "pointer", fontSize: 13,
          border: `1.5px solid ${value.includes(op) ? "#0a0a0a" : "#e0e0e0"}`,
          background: value.includes(op) ? "#f8f8f8" : "#fff",
          fontWeight: value.includes(op) ? 600 : 400,
        }}>
          <input type="checkbox" checked={value.includes(op)} onChange={() => {}} style={{ marginTop: 2, accentColor: "#111" }} />
          <span>{op}</span>
        </label>
      ))}
    </div>
  );
}

function RadioGroup({ opciones, value, onChange }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {opciones.map(op => (
        <label key={op} onClick={() => onChange(op)} style={{
          display: "flex", alignItems: "center", gap: 10, padding: "9px 14px",
          borderRadius: 8, cursor: "pointer", fontSize: 13,
          border: `1.5px solid ${value === op ? "#0a0a0a" : "#e0e0e0"}`,
          background: value === op ? "#f8f8f8" : "#fff",
          fontWeight: value === op ? 600 : 400,
        }}>
          <input type="radio" checked={value === op} onChange={() => {}} style={{ accentColor: "#111" }} />
          {op}
        </label>
      ))}
    </div>
  );
}

function SoftwareRow({ software, value, onChange }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid #f0f0f0" }}>
      <span style={{ fontSize: 13, color: "#333", fontWeight: 500 }}>{software}</span>
      <div style={{ display: "flex", gap: 4 }}>
        {NIVELES_SW.map(n => (
          <button key={n} onClick={() => onChange(n)} style={{
            padding: "4px 8px", borderRadius: 6, fontSize: 11, cursor: "pointer",
            border: `1.5px solid ${value === n ? "#0a0a0a" : "#e0e0e0"}`,
            background: value === n ? "#0a0a0a" : "#fff",
            color: value === n ? "#fff" : "#888",
            fontWeight: value === n ? 700 : 400,
            whiteSpace: "nowrap",
          }}>
            {n === "Experto / uso profesional frecuente" ? "Experto" : n}
          </button>
        ))}
      </div>
    </div>
  );
}

function Seccion({ numero, titulo, children }) {
  return (
    <div style={{ marginBottom: 32 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16, paddingBottom: 12, borderBottom: "2px solid #f0f0f0" }}>
        <div style={{ width: 28, height: 28, borderRadius: "50%", background: "#0a0a0a", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 800, flexShrink: 0 }}>{numero}</div>
        <h2 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: "#111" }}>{titulo}</h2>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        {children}
      </div>
    </div>
  );
}

function Campo({ label, hint, children, required }) {
  return (
    <div>
      <label style={lbl}>{label}{required && <span style={{ color: "#c0392b", marginLeft: 2 }}>*</span>}</label>
      {hint && <span style={sublbl}>{hint}</span>}
      {children}
    </div>
  );
}

export default function Postulacion() {
  const [paso, setPaso] = useState(1);
  const [enviado, setEnviado] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    nombre: "", edad: "", ciudad: "", mail: "", wsp: "", linkedin: "",
    formacion: "", universidad: "", estudios_complementarios: "",
    experiencia: "", sistemas: [], experiencia_detalle: "",
    tipos_proyecto: [], entregables: [],
    cypecad: "", autocad: "", sketchup: "",
    otros_software: "", adaptacion_metodologia: "",
    disponibilidad: "", freelance: "", relacion_dependencia: "",
    factura: "", cv_url: "",
  });

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const TOTAL_PASOS = 4;

  async function enviar() {
    if (!form.nombre || !form.mail) { setError("Completá nombre y email"); return; }
    setSaving(true); setError("");
    try {
      const body = {
        nombre: form.nombre,
        mail: form.mail,
        wsp: form.wsp || null,
        ciudad: form.ciudad || null,
        experiencia: form.experiencia_detalle || null,
        sistemas: form.sistemas.join(", ") || null,
        cypecad: form.cypecad || null,
        autocad: form.autocad || null,
        sketchup: form.sketchup || null,
        otros_software: form.otros_software || null,
        experiencia: form.experiencia || null,
        disponibilidad: form.disponibilidad || null,
        factura: form.factura === "Sí",
        freelance: form.freelance === "Sí",
        ig: form.linkedin || null,
        estado: "postulante",
        tipo: "externo",
        disponible: false,
        observaciones: [
          form.formacion && `Formación: ${form.formacion}`,
          form.universidad && `Universidad: ${form.universidad}`,
          form.estudios_complementarios && `Estudios complementarios: ${form.estudios_complementarios}`,
          form.adaptacion_metodologia && `Adaptación metodología: ${form.adaptacion_metodologia}`,
          form.relacion_dependencia && `Relación de dependencia: ${form.relacion_dependencia}`,
          form.tipos_proyecto.length && `Tipos de proyecto: ${form.tipos_proyecto.join(", ")}`,
          form.entregables.length && `Entregables: ${form.entregables.join(", ")}`,
          form.cv_url && `CV: ${form.cv_url}`,
        ].filter(Boolean).join("\n") || null,
      };

      const res = await fetch(`${SUPA_URL}/calculistas`, {
        method: "POST",
        headers: { apikey: ANON_KEY, Authorization: `Bearer ${ANON_KEY}`, "Content-Type": "application/json", Prefer: "return=minimal" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Error al enviar");
      }
      setEnviado(true);
    } catch(e) { setError(e.message); }
    setSaving(false);
  }

  if (enviado) return (
    <div style={{ fontFamily: "system-ui, -apple-system, sans-serif", maxWidth: 600, margin: "0 auto", padding: "60px 24px", textAlign: "center" }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
      <h1 style={{ fontSize: 24, fontWeight: 800, color: "#111", marginBottom: 8 }}>¡Postulación recibida!</h1>
      <p style={{ fontSize: 15, color: "#666", lineHeight: 1.6 }}>Gracias por tu interés en trabajar con NPL Ingeniería Civil. Revisaremos tu perfil y nos pondremos en contacto a la brevedad.</p>
      <div style={{ marginTop: 24, padding: "16px 20px", background: "#f8f8f8", borderRadius: 10, fontSize: 13, color: "#888" }}>
        Podés seguirnos en Instagram <strong>@nplingenieria</strong> para estar al tanto de nuevas oportunidades.
      </div>
    </div>
  );

  return (
    <div style={{ fontFamily: "system-ui, -apple-system, sans-serif", maxWidth: 700, margin: "0 auto", padding: "40px 24px", color: "#111" }}>

      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: 40 }}>
        <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", color: "#888", marginBottom: 8 }}>NPL Ingeniería Civil</div>
        <h1 style={{ fontSize: 26, fontWeight: 900, margin: "0 0 8px", letterSpacing: -0.5 }}>Búsqueda de calculistas estructurales</h1>
        <p style={{ fontSize: 14, color: "#666", margin: 0, lineHeight: 1.6 }}>Trabajamos con profesionales freelance especializados en cálculo estructural para proyectos de pequeña y mediana escala en todo el país.</p>
      </div>

      {/* Progress */}
      <div style={{ display: "flex", gap: 8, marginBottom: 36, alignItems: "center" }}>
        {Array.from({ length: TOTAL_PASOS }, (_, i) => (
          <React.Fragment key={i}>
            <div style={{ width: 28, height: 28, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800, flexShrink: 0,
              background: paso > i + 1 ? "#1a8a5e" : paso === i + 1 ? "#0a0a0a" : "#e0e0e0",
              color: paso >= i + 1 ? "#fff" : "#aaa" }}>
              {paso > i + 1 ? "✓" : i + 1}
            </div>
            {i < TOTAL_PASOS - 1 && <div style={{ flex: 1, height: 2, background: paso > i + 1 ? "#1a8a5e" : "#e0e0e0", borderRadius: 1 }} />}
          </React.Fragment>
        ))}
      </div>

      {/* Paso 1 — Datos personales */}
      {paso === 1 && (
        <Seccion numero={1} titulo="Datos personales">
          <Campo label="Nombre completo" required>
            <input style={inp} value={form.nombre} onChange={e => set("nombre", e.target.value)} placeholder="Tu nombre y apellido" />
          </Campo>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <Campo label="Edad" required>
              <input type="number" style={inp} value={form.edad} onChange={e => set("edad", e.target.value)} placeholder="Ej: 28" />
            </Campo>
            <Campo label="Localidad y provincia">
              <input style={inp} value={form.ciudad} onChange={e => set("ciudad", e.target.value)} placeholder="Ej: La Plata, Buenos Aires" />
            </Campo>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <Campo label="Correo electrónico" required>
              <input type="email" style={inp} value={form.mail} onChange={e => set("mail", e.target.value)} placeholder="tu@mail.com" />
            </Campo>
            <Campo label="WhatsApp">
              <input style={inp} value={form.wsp} onChange={e => set("wsp", e.target.value)} placeholder="+54 9 11 ..." />
            </Campo>
          </div>
          <Campo label="LinkedIn / Instagram">
            <input style={inp} value={form.linkedin} onChange={e => set("linkedin", e.target.value)} placeholder="linkedin.com/in/tuperfil o @tuusuario" />
          </Campo>
        </Seccion>
      )}

      {/* Paso 2 — Formación y experiencia */}
      {paso === 2 && (
        <Seccion numero={2} titulo="Formación y experiencia">
          <Campo label="Estado de la formación" required>
            <RadioGroup opciones={FORMACION} value={form.formacion} onChange={v => set("formacion", v)} />
          </Campo>
          <Campo label="Universidad / institución">
            <input style={inp} value={form.universidad} onChange={e => set("universidad", e.target.value)} placeholder="Ej: Universidad Nacional de La Plata" />
          </Campo>
          <Campo label="Estudios complementarios relacionados con estructuras">
            <textarea style={{ ...inp, resize: "none" }} rows={3} value={form.estudios_complementarios} onChange={e => set("estudios_complementarios", e.target.value)} placeholder="Cursos, certificaciones, especializaciones..." />
          </Campo>
          <Campo label="¿Tenés experiencia en diseño y cálculo de estructuras para viviendas?" required>
            <RadioGroup opciones={EXPERIENCIA_NIVEL} value={form.experiencia} onChange={v => set("experiencia", v)} />
          </Campo>
          <Campo label="¿En qué sistemas estructurales tenés experiencia?">
            <CheckGroup opciones={SISTEMAS} value={form.sistemas} onChange={v => set("sistemas", v)} cols={2} />
          </Campo>
          <Campo label="Describí brevemente tu experiencia en proyectos residenciales">
            <textarea style={{ ...inp, resize: "none" }} rows={4} value={form.experiencia_detalle} onChange={e => set("experiencia_detalle", e.target.value)} placeholder="Tipo de proyectos, m², cantidad, complejidad, entregables que realizaste..." />
          </Campo>
          <Campo label="¿Qué tipo de proyectos calculaste con mayor frecuencia?">
            <CheckGroup opciones={TIPOS_PROYECTO} value={form.tipos_proyecto} onChange={v => set("tipos_proyecto", v)} cols={2} />
          </Campo>
          <Campo label="¿Qué entregables técnicos acostumbrás preparar?">
            <CheckGroup opciones={ENTREGABLES} value={form.entregables} onChange={v => set("entregables", v)} cols={2} />
          </Campo>
        </Seccion>
      )}

      {/* Paso 3 — Software y metodología */}
      {paso === 3 && (
        <Seccion numero={3} titulo="Software y metodología">
          <Campo label="Nivel de manejo de software principal" hint="Seleccioná tu nivel para cada programa">
            <div style={{ background: "#f8f8f8", borderRadius: 10, padding: "4px 12px" }}>
              <SoftwareRow software="CYPECAD" value={form.cypecad} onChange={v => set("cypecad", v)} />
              <SoftwareRow software="AutoCAD" value={form.autocad} onChange={v => set("autocad", v)} />
              <SoftwareRow software="SketchUp" value={form.sketchup} onChange={v => set("sketchup", v)} />
            </div>
          </Campo>
          <Campo label="Otros softwares que utilizás" hint="Ej: SAP2000, Revit, Robot Structural, Excel avanzado, IDEA StatiCa...">
            <textarea style={{ ...inp, resize: "none" }} rows={3} value={form.otros_software} onChange={e => set("otros_software", e.target.value)} placeholder="Listá los softwares y tu nivel de manejo" />
          </Campo>
          <Campo label="¿Tenés inconvenientes en adaptarte a la metodología NPL (CYPECAD, RAM Advanse)?">
            <textarea style={{ ...inp, resize: "none" }} rows={3} value={form.adaptacion_metodologia} onChange={e => set("adaptacion_metodologia", e.target.value)} placeholder="Contanos tu experiencia con estos programas y tu disposición a aprender" />
          </Campo>
          <Campo label="Utilizás Dropbox o Google Drive para compartir archivos">
            <RadioGroup opciones={["Sí, Drive","Sí, Dropbox","Sí, ambos","No, pero puedo adaptarme"]} value={form.drive} onChange={v => set("drive", v)} />
          </Campo>
        </Seccion>
      )}

      {/* Paso 4 — Disponibilidad y datos de trabajo */}
      {paso === 4 && (
        <Seccion numero={4} titulo="Disponibilidad y datos de trabajo">
          <Campo label="¿Tenés experiencia trabajando como asesor externo / freelance?">
            <RadioGroup opciones={["Sí","No"]} value={form.freelance} onChange={v => set("freelance", v)} />
          </Campo>
          <Campo label="¿Actualmente estás trabajando en relación de dependencia?">
            <RadioGroup opciones={["Sí","No"]} value={form.relacion_dependencia} onChange={v => set("relacion_dependencia", v)} />
          </Campo>
          <Campo label="Disponibilidad horaria para trabajar como asesor externo">
            <RadioGroup opciones={DISPONIBILIDAD} value={form.disponibilidad} onChange={v => set("disponibilidad", v)} />
          </Campo>
          <Campo label="¿Estás inscripto en monotributo / podés facturar tus honorarios?">
            <RadioGroup opciones={["Sí","No, pero puedo regularizarlo","No"]} value={form.factura} onChange={v => set("factura", v)} />
          </Campo>
          <Campo label="Link a tu CV" hint="Google Drive, Dropbox, LinkedIn o similar">
            <input style={inp} value={form.cv_url} onChange={e => set("cv_url", e.target.value)} placeholder="https://drive.google.com/..." />
          </Campo>

          {error && (
            <div style={{ background: "#fef2f2", color: "#c0392b", borderRadius: 8, padding: "10px 14px", fontSize: 13, fontWeight: 600 }}>❌ {error}</div>
          )}
        </Seccion>
      )}

      {/* Navegación */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8 }}>
        {paso > 1
          ? <button onClick={() => setPaso(p => p - 1)} style={{ padding: "10px 20px", background: "#f0f0f0", color: "#333", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>← Anterior</button>
          : <div />
        }
        {paso < TOTAL_PASOS
          ? <button onClick={() => {
              if (paso === 1 && (!form.nombre || !form.mail)) { setError("Completá nombre y email para continuar"); return; }
              setError(""); setPaso(p => p + 1);
            }} style={{ padding: "10px 24px", background: "#0a0a0a", color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
              Siguiente →
            </button>
          : <button onClick={enviar} disabled={saving} style={{ padding: "12px 28px", background: saving ? "#aaa" : "#1a8a5e", color: "#fff", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: saving ? "not-allowed" : "pointer" }}>
              {saving ? "Enviando…" : "✓ Enviar postulación"}
            </button>
        }
      </div>

      <p style={{ textAlign: "center", fontSize: 12, color: "#bbb", marginTop: 24 }}>NPL Ingeniería Civil · npl-sistema.vercel.app</p>
    </div>
  );
}
