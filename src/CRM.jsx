import React, { useState, useEffect, useCallback } from "react";
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

async function api(path, options = {}) {
  const tk = await getToken();
  const res = await fetch(`${SUPA_URL}${path}`, { ...options, headers: { ...hdrs(tk), ...(options.headers || {}) } });
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) throw new Error(data?.message || data?.error || `Error ${res.status}`);
  return data;
}

const TIPOS = ["Estudio de Arquitectura","Empresa Constructora","Empresa Constructora Steel Frame","Particular","Cliente final","Arquitecto particular","Desarrolladora","Ingeniero particular","Otro"];

const inp = { width: "100%", fontSize: 13, padding: "8px 10px", border: "1.5px solid #e5e5e5", borderRadius: 8, boxSizing: "border-box", background: "#fff" };

function TipoBadge({ tipo }) {
  const colors = {
    "Estudio de Arquitectura": { bg: "#E6F1FB", color: "#185FA5" },
    "Empresa Constructora": { bg: "#EAF3DE", color: "#3B6D11" },
    "Empresa Constructora Steel Frame": { bg: "#EAF3DE", color: "#3B6D11" },
    "Particular": { bg: "#f5f5f5", color: "#555" },
    "Cliente final": { bg: "#f5f5f5", color: "#555" },
    "Desarrolladora": { bg: "#FAEEDA", color: "#854F0B" },
  };
  const c = colors[tipo] || { bg: "#f5f5f5", color: "#888" };
  return <span style={{ background: c.bg, color: c.color, fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 99, whiteSpace: "nowrap" }}>{tipo || "—"}</span>;
}

function F({ label, children }) {
  return <div><label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#666", marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.5 }}>{label}</label>{children}</div>;
}

const emptyCliente = () => ({ empresa: "", tipo: TIPOS[0], ciudad: "", wsp: "", mail: "", obs: "" });
const emptyContacto = () => ({ nombre: "", cargo: "", wsp: "", mail: "", principal: false });

export default function CRM() {
  const [clientes, setClientes]         = useState([]);
  const [contactosMap, setContactosMap] = useState({});
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState(null);
  const [saving, setSaving]             = useState(false);
  const [vista, setVista]               = useState("lista");
  const [selected, setSelected]         = useState(null);
  const [editando, setEditando]         = useState(null);
  const [busq, setBusq]                 = useState("");
  const [filtroTipo, setFiltroTipo]     = useState("todos");
  const [editContacto, setEditContacto] = useState(null);
  const [nuevoContacto, setNuevoContacto] = useState(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const data = await api("/clientes?select=*&order=empresa.asc&limit=500");
      setClientes(Array.isArray(data) ? data : []);
    } catch (e) { setError(e.message); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const loadContactos = async (cid) => {
    if (contactosMap[cid]) return;
    try {
      const data = await api(`/cliente_contactos?cliente_id=eq.${cid}&order=principal.desc`);
      setContactosMap(prev => ({ ...prev, [cid]: data || [] }));
    } catch (_) { setContactosMap(prev => ({ ...prev, [cid]: [] })); }
  };

  const abrirDetalle = async (c) => {
    setSelected(c); setVista("detalle");
    await loadContactos(c.id);
  };

  const saveCliente = async (f) => {
    setSaving(true);
    try {
      const body = { empresa: f.empresa, tipo: f.tipo, ciudad: f.ciudad || null, wsp: f.wsp || null, mail: f.mail || null, obs: f.obs || null };
      if (f.id) {
        const res = await api(`/clientes?id=eq.${f.id}`, { method: "PATCH", body: JSON.stringify(body) });
        const upd = Array.isArray(res) ? res[0] : res;
        setClientes(prev => prev.map(x => x.id === f.id ? { ...x, ...upd } : x));
        if (selected?.id === f.id) setSelected(s => ({ ...s, ...upd }));
      } else {
        const res = await api("/clientes", { method: "POST", body: JSON.stringify(body) });
        const created = Array.isArray(res) ? res[0] : res;
        setClientes(prev => [created, ...prev]);
      }
      setVista(f.id && selected ? "detalle" : "lista"); setEditando(null);
    } catch (e) { alert("Error: " + e.message); }
    setSaving(false);
  };

  const eliminarCliente = async (id) => {
    if (!confirm("¿Eliminar este cliente y todos sus contactos?")) return;
    setClientes(prev => prev.filter(x => x.id !== id));
    try { await api(`/clientes?id=eq.${id}`, { method: "DELETE" }); } catch (_) { load(); }
    setVista("lista"); setSelected(null);
  };

  const saveContacto = async (f, clienteId) => {
    setSaving(true);
    try {
      if (f.id) {
        const res = await api(`/cliente_contactos?id=eq.${f.id}`, { method: "PATCH", body: JSON.stringify({ nombre: f.nombre, cargo: f.cargo, wsp: f.wsp, mail: f.mail, principal: f.principal }) });
        const upd = Array.isArray(res) ? res[0] : res;
        setContactosMap(prev => ({ ...prev, [clienteId]: prev[clienteId].map(x => x.id === f.id ? upd : x) }));
      } else {
        const res = await api("/cliente_contactos", { method: "POST", body: JSON.stringify({ cliente_id: clienteId, nombre: f.nombre, cargo: f.cargo, wsp: f.wsp, mail: f.mail, principal: f.principal }) });
        const created = Array.isArray(res) ? res[0] : res;
        setContactosMap(prev => ({ ...prev, [clienteId]: [...(prev[clienteId] || []), created] }));
      }
      setEditContacto(null); setNuevoContacto(null);
    } catch (e) { alert("Error: " + e.message); }
    setSaving(false);
  };

  const eliminarContacto = async (cid, clienteId) => {
    if (!confirm("¿Eliminar este contacto?")) return;
    setContactosMap(prev => ({ ...prev, [clienteId]: prev[clienteId].filter(x => x.id !== cid) }));
    try { await api(`/cliente_contactos?id=eq.${cid}`, { method: "DELETE" }); } catch (_) {}
  };

  const tipos = [...new Set(clientes.map(c => c.tipo).filter(Boolean))].sort();
  const filtrados = clientes.filter(c => {
    const okT = filtroTipo === "todos" || c.tipo === filtroTipo;
    const q = busq.toLowerCase();
    const okB = !q || [c.empresa, c.tipo, c.ciudad, c.wsp, c.mail].some(v => v?.toLowerCase().includes(q));
    return okT && okB;
  });

  const kpis = {
    total: clientes.length,
    estudios: clientes.filter(x => x.tipo?.includes("Arquitectura")).length,
    constructoras: clientes.filter(x => x.tipo?.includes("Constructora")).length,
    particulares: clientes.filter(x => ["Particular","Cliente final"].includes(x.tipo)).length,
  };

  if (vista === "form") return (
    <FormCliente
      inicial={editando || emptyCliente()}
      onSave={saveCliente}
      onCancel={() => { setVista(selected ? "detalle" : "lista"); setEditando(null); }}
      saving={saving}
    />
  );

  if (vista === "detalle" && selected) return (
    <DetalleCliente
      cliente={selected}
      contactos={contactosMap[selected.id] || []}
      editContacto={editContacto}
      nuevoContacto={nuevoContacto}
      saving={saving}
      onBack={() => { setVista("lista"); setSelected(null); }}
      onEdit={() => { setEditando({ ...selected }); setVista("form"); }}
      onEliminar={() => eliminarCliente(selected.id)}
      onEditContacto={setEditContacto}
      onNuevoContacto={() => setNuevoContacto(emptyContacto())}
      onSaveContacto={(f) => saveContacto(f, selected.id)}
      onCancelContacto={() => { setEditContacto(null); setNuevoContacto(null); }}
      onEliminarContacto={(cid) => eliminarContacto(cid, selected.id)}
    />
  );

  return (
    <div style={{ fontFamily: "system-ui, -apple-system, sans-serif", padding: "24px", maxWidth: 1100, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20, flexWrap: "wrap", gap: 10 }}>
        <div>
          <p style={{ margin: 0, fontSize: 12, color: "#999", fontWeight: 500 }}>NPL · CRM</p>
          <h1 style={{ margin: "2px 0 0", fontSize: 22, fontWeight: 800, color: "#111" }}>Clientes</h1>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={load} style={{ padding: "8px 12px", fontSize: 13, borderRadius: 8, cursor: "pointer", border: "1.5px solid #e5e5e5", background: "#f5f5f5", color: "#555" }}>↻</button>
          <button onClick={() => { setEditando(null); setVista("form"); }} style={{ padding: "8px 18px", fontSize: 13, fontWeight: 700, borderRadius: 8, cursor: "pointer", border: "none", background: "#111", color: "#fff" }}>+ Nuevo</button>
        </div>
      </div>

      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(120px,1fr))", gap: 10, marginBottom: 20 }}>
        {[["Total", kpis.total, "#111"], ["Estudios", kpis.estudios, "#185FA5"], ["Constructoras", kpis.constructoras, "#3B6D11"], ["Particulares", kpis.particulares, "#888"]].map(([l, v, color]) => (
          <div key={l} style={{ background: "#fff", borderRadius: 10, padding: "12px 16px", border: "1.5px solid #e8e8e8" }}>
            <p style={{ margin: 0, fontSize: 11, color: "#aaa", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5 }}>{l}</p>
            <p style={{ margin: "4px 0 0", fontSize: 22, fontWeight: 900, color, fontFamily: "JetBrains Mono, monospace" }}>{loading ? "…" : v}</p>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        <input placeholder="Buscar empresa, ciudad, mail, wsp..." value={busq} onChange={e => setBusq(e.target.value)}
          style={{ ...inp, flex: 1, minWidth: 200 }} />
        <select value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)} style={{ ...inp, width: "auto" }}>
          <option value="todos">Todos los tipos</option>
          {tipos.map(t => <option key={t}>{t}</option>)}
        </select>
        <span style={{ alignSelf: "center", fontSize: 12, color: "#aaa" }}>{filtrados.length} resultados</span>
      </div>

      {loading && <p style={{ textAlign: "center", padding: 40, color: "#aaa" }}>Cargando clientes…</p>}
      {error && <div style={{ background: "#fef2f2", color: "#c0392b", borderRadius: 8, padding: "10px 14px", marginBottom: 16, fontSize: 13 }}>❌ {error}</div>}

      {!loading && !error && (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {filtrados.map(c => (
            <div key={c.id} onClick={() => abrirDetalle(c)}
              style={{ background: "#fff", border: "1.5px solid #e8e8e8", borderRadius: 10, padding: "10px 16px", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}
              onMouseEnter={e => e.currentTarget.style.borderColor = "#111"}
              onMouseLeave={e => e.currentTarget.style.borderColor = "#e8e8e8"}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 2 }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: "#111" }}>{c.empresa}</span>
                  <TipoBadge tipo={c.tipo} />
                </div>
                <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                  {c.ciudad && <span style={{ fontSize: 12, color: "#aaa" }}>📍 {c.ciudad}</span>}
                  {c.wsp && <span style={{ fontSize: 12, color: "#25d366" }}>💬 {c.wsp}</span>}
                  {c.mail && <span style={{ fontSize: 12, color: "#3b82f6" }}>✉️ {c.mail}</span>}
                </div>
              </div>
              <button onClick={e => { e.stopPropagation(); setEditando({ ...c }); setVista("form"); }}
                style={{ fontSize: 11, padding: "4px 12px", border: "1.5px solid #e5e5e5", borderRadius: 6, background: "#fff", cursor: "pointer", color: "#555" }}>
                Editar
              </button>
            </div>
          ))}
          {filtrados.length === 0 && <p style={{ textAlign: "center", padding: 40, color: "#aaa" }}>No hay resultados.</p>}
        </div>
      )}
    </div>
  );
}

function DetalleCliente({ cliente, contactos, editContacto, nuevoContacto, saving, onBack, onEdit, onEliminar, onEditContacto, onNuevoContacto, onSaveContacto, onCancelContacto, onEliminarContacto }) {
  return (
    <div style={{ fontFamily: "system-ui, -apple-system, sans-serif", padding: "24px", maxWidth: 800, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
        <button onClick={onBack} style={{ fontSize: 13, color: "#666", background: "none", border: "none", cursor: "pointer", padding: 0 }}>← Volver</button>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: "#111", flex: 1 }}>{cliente.empresa}</h2>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={onEdit} style={{ padding: "7px 16px", fontSize: 13, fontWeight: 600, borderRadius: 8, background: "#f5f5f5", color: "#555", border: "1.5px solid #e5e5e5", cursor: "pointer" }}>Editar</button>
          <button onClick={onEliminar} style={{ padding: "7px 16px", fontSize: 13, fontWeight: 600, borderRadius: 8, background: "#fff", color: "#c0392b", border: "1.5px solid #fecaca", cursor: "pointer" }}>Eliminar</button>
        </div>
      </div>

      <div style={{ background: "#fff", border: "1.5px solid #e8e8e8", borderRadius: 12, padding: "16px", marginBottom: 16 }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
          <TipoBadge tipo={cliente.tipo} />
          {cliente.ciudad && <span style={{ fontSize: 12, color: "#888" }}>📍 {cliente.ciudad}</span>}
        </div>
        <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: cliente.obs ? 10 : 0 }}>
          {cliente.wsp && <a href={`https://wa.me/${cliente.wsp.replace(/\D/g,"")}`} target="_blank" rel="noreferrer" style={{ fontSize: 13, color: "#25d366", textDecoration: "none", fontWeight: 600 }}>💬 {cliente.wsp}</a>}
          {cliente.mail && <a href={`mailto:${cliente.mail}`} style={{ fontSize: 13, color: "#3b82f6", textDecoration: "none", fontWeight: 600 }}>✉️ {cliente.mail}</a>}
        </div>
        {cliente.obs && <p style={{ margin: 0, fontSize: 13, color: "#555", background: "#fffbe6", border: "1px solid #f0e68c", borderRadius: 8, padding: "8px 12px" }}>{cliente.obs}</p>}
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "#111" }}>Contactos ({contactos.length})</h3>
        <button onClick={onNuevoContacto} style={{ padding: "5px 14px", fontSize: 12, fontWeight: 700, borderRadius: 6, background: "#111", color: "#fff", border: "none", cursor: "pointer" }}>+ Agregar</button>
      </div>

      {nuevoContacto && <ContactoForm f={nuevoContacto} onSave={onSaveContacto} onCancel={onCancelContacto} saving={saving} titulo="Nuevo contacto" />}

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {contactos.map(ct => (
          editContacto?.id === ct.id ? (
            <ContactoForm key={ct.id} f={editContacto} onSave={onSaveContacto} onCancel={onCancelContacto} saving={saving} titulo="Editar contacto" onChange={v => onEditContacto(v)} />
          ) : (
            <div key={ct.id} style={{ background: "#fff", border: "1.5px solid #e8e8e8", borderRadius: 10, padding: "10px 14px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 8 }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: "#111" }}>{ct.nombre}</span>
                    {ct.principal && <span style={{ fontSize: 10, background: "#EAF3DE", color: "#3B6D11", padding: "1px 7px", borderRadius: 99, fontWeight: 700 }}>Principal</span>}
                  </div>
                  {ct.cargo && <p style={{ margin: "0 0 6px", fontSize: 12, color: "#888" }}>{ct.cargo}</p>}
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {ct.wsp && <a href={`https://wa.me/${ct.wsp.replace(/\D/g,"")}`} target="_blank" rel="noreferrer" style={{ fontSize: 11, padding: "3px 10px", borderRadius: 6, background: "#EAF3DE", color: "#3B6D11", textDecoration: "none", fontWeight: 600 }}>💬 {ct.wsp}</a>}
                    {ct.mail && <a href={`mailto:${ct.mail}`} style={{ fontSize: 11, padding: "3px 10px", borderRadius: 6, background: "#E6F1FB", color: "#185FA5", textDecoration: "none", fontWeight: 600 }}>✉️ {ct.mail}</a>}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  <button onClick={() => onEditContacto({ ...ct })} style={{ fontSize: 11, padding: "4px 10px", border: "1.5px solid #e5e5e5", borderRadius: 6, background: "#fff", cursor: "pointer" }}>Editar</button>
                  <button onClick={() => onEliminarContacto(ct.id)} style={{ fontSize: 11, padding: "4px 10px", border: "1.5px solid #fecaca", borderRadius: 6, background: "#fff", color: "#c0392b", cursor: "pointer" }}>✕</button>
                </div>
              </div>
            </div>
          )
        ))}
        {contactos.length === 0 && !nuevoContacto && <p style={{ color: "#aaa", fontSize: 13, textAlign: "center", padding: 20 }}>Sin contactos. Hacé clic en "+ Agregar".</p>}
      </div>
    </div>
  );
}

function ContactoForm({ f, onSave, onCancel, saving, titulo, onChange }) {
  const [local, setLocal] = useState({ ...f });
  const set = (k, v) => { const upd = { ...local, [k]: v }; setLocal(upd); if (onChange) onChange(upd); };
  return (
    <div style={{ background: "#f8f8f8", border: "1.5px solid #e5e5e5", borderRadius: 10, padding: "14px 16px", marginBottom: 8 }}>
      <p style={{ margin: "0 0 12px", fontSize: 13, fontWeight: 700, color: "#111" }}>{titulo}</p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 10, marginBottom: 10 }}>
        <F label="Nombre *"><input style={inp} value={local.nombre} onChange={e => set("nombre", e.target.value)} placeholder="Nombre completo" /></F>
        <F label="Cargo"><input style={inp} value={local.cargo} onChange={e => set("cargo", e.target.value)} placeholder="Cargo o rol" /></F>
        <F label="WhatsApp"><input style={inp} value={local.wsp} onChange={e => set("wsp", e.target.value)} placeholder="+54 9 11 ..." /></F>
        <F label="Mail"><input style={inp} value={local.mail} onChange={e => set("mail", e.target.value)} placeholder="mail@ejemplo.com" /></F>
      </div>
      <label style={{ display: "flex", gap: 6, alignItems: "center", fontSize: 13, marginBottom: 12, cursor: "pointer" }}>
        <input type="checkbox" checked={local.principal} onChange={e => set("principal", e.target.checked)} /> Contacto principal
      </label>
      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={() => { if (!local.nombre?.trim()) return alert("El nombre es obligatorio"); onSave(local); }} disabled={saving}
          style={{ padding: "7px 18px", fontSize: 13, fontWeight: 700, borderRadius: 8, border: "none", background: "#111", color: "#fff", cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.6 : 1 }}>
          {saving ? "Guardando…" : "Guardar"}
        </button>
        <button onClick={onCancel} style={{ padding: "7px 14px", fontSize: 13, borderRadius: 8, border: "1.5px solid #e5e5e5", background: "#fff", color: "#555", cursor: "pointer" }}>Cancelar</button>
      </div>
    </div>
  );
}

function FormCliente({ inicial, onSave, onCancel, saving }) {
  const [f, setF] = useState({ ...inicial });
  const set = (k, v) => setF(p => ({ ...p, [k]: v }));
  return (
    <div style={{ fontFamily: "system-ui, -apple-system, sans-serif", padding: "24px", maxWidth: 700, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
        <button onClick={onCancel} style={{ fontSize: 13, color: "#666", background: "none", border: "none", cursor: "pointer", padding: 0 }}>← Volver</button>
        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: "#111" }}>{f.id ? `Editar — ${f.empresa}` : "Nuevo cliente"}</h2>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 14, marginBottom: 14 }}>
        <F label="Empresa / nombre *"><input style={inp} value={f.empresa} onChange={e => set("empresa", e.target.value)} placeholder="Nombre de la empresa" /></F>
        <F label="Tipo"><select style={inp} value={f.tipo} onChange={e => set("tipo", e.target.value)}>{TIPOS.map(t => <option key={t}>{t}</option>)}</select></F>
        <F label="Ciudad"><input style={inp} value={f.ciudad || ""} onChange={e => set("ciudad", e.target.value)} placeholder="Ciudad" /></F>
        <F label="WhatsApp"><input style={inp} value={f.wsp || ""} onChange={e => set("wsp", e.target.value)} placeholder="+54 9 11 ..." /></F>
        <F label="Email"><input style={inp} value={f.mail || ""} onChange={e => set("mail", e.target.value)} placeholder="mail@ejemplo.com" /></F>
      </div>
      <F label="Observaciones">
        <textarea style={{ ...inp, resize: "vertical" }} value={f.obs || ""} onChange={e => set("obs", e.target.value)} rows={3} placeholder="Notas internas…" />
      </F>
      <div style={{ display: "flex", gap: 8, marginTop: 20 }}>
        <button onClick={() => { if (!f.empresa?.trim()) return alert("La empresa es obligatoria"); onSave(f); }} disabled={saving}
          style={{ padding: "9px 24px", fontSize: 14, fontWeight: 700, borderRadius: 8, border: "none", background: "#111", color: "#fff", cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.6 : 1 }}>
          {saving ? "Guardando…" : f.id ? "Guardar cambios" : "Crear cliente"}
        </button>
        <button onClick={onCancel} style={{ padding: "9px 18px", fontSize: 14, borderRadius: 8, border: "1.5px solid #e5e5e5", background: "#f5f5f5", color: "#555", cursor: "pointer" }}>Cancelar</button>
      </div>
    </div>
  );
}
