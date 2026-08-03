import React, { useState, useEffect, createContext, useContext } from 'react'
import { supabase } from './supabase.js'
import App from './App.jsx'
import Proyectos from './Proyectos.jsx'
import Calculistas from './Calculistas.jsx'
import CRM from './CRM.jsx'
import Dashboard from './Dashboard.jsx'
import Obras from './Obras.jsx'
import Biblioteca from './Biblioteca.jsx'
import Configuracion from './Configuracion.jsx'
import { useTheme, ThemeToggle, makeShared, FONT_MONO, GlobalSearch } from './uiKit.jsx'
import Postulacion from './Postulacion.jsx'

const EDGE_URL = 'https://imkmosifqxzbtqgzssst.supabase.co/functions/v1/crear-usuario'
const EDGE_LIST_URL = 'https://imkmosifqxzbtqgzssst.supabase.co/functions/v1/listar-usuarios'

const APPS_ADMIN = [
  { id: 'dashboard', label: 'Dashboard', icon: '📊', desc: 'Panel de control' },
  { id: 'presupuestos', label: 'Presupuestos', icon: '📋', desc: 'Pipeline y seguimiento' },
  { id: 'proyectos', label: 'Proyectos', icon: '🗂️', desc: 'Kanban de proyectos' },
  { id: 'obras', label: 'Obras', icon: '🏗️', desc: 'Seguimiento diario' },
  { id: 'calculistas', label: 'Calculistas', icon: '👷', desc: 'Equipo y postulantes' },
  { id: 'crm', label: 'Clientes', icon: '👥', desc: '148 contactos' },
  { id: 'biblioteca', label: 'Biblioteca', icon: '📚', desc: 'Rubros y tareas' },
  { id: 'configuracion', label: 'Config', icon: '⚙️', desc: 'Datos empresa' },
  { id: 'usuarios', label: 'Usuarios', icon: '👤', desc: 'Gestión de accesos' },
]

const APPS_JEFE = [
  { id: 'obras', label: 'Mis obras', icon: '🏗️', desc: 'Seguimiento diario' },
]

const APPS_CALCULISTA = [
  { id: 'legajos', label: 'Mis legajos', icon: '🗂️', desc: 'Proyectos asignados' },
]

/* ─── Contexto de tema — para que cualquier módulo hijo pueda leer palette/theme
   sin tener que recibirlo por props explícitas ─── */
const ThemeContext = createContext(null);
export function useNplTheme() {
  return useContext(ThemeContext);
}

export default function Root() {
  const [session, setSession] = useState(null)
  const [perfil, setPerfil] = useState(null)
  const [loading, setLoading] = useState(true)
  const [current, setCurrent] = useState(() => {
    const hash = window.location.hash.replace("#", "");
    return hash.split(":")[0] || null;
  })
  const [deepLinkId, setDeepLinkId] = useState(() => {
    const hash = window.location.hash.replace("#", "");
    return hash.split(":")[1] || null;
  })
  const { theme, toggle, palette } = useTheme();

  useEffect(() => {
    const onHashChange = () => {
      const hash = window.location.hash.replace("#", "");
      const [mod, id] = hash.split(":");
      setCurrent(mod || null);
      setDeepLinkId(id || null);
    };
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  const isPostulacion = window.location.hash.replace("#", "").split(":")[0] === "postulacion";

  useEffect(() => {
    if (isPostulacion) return; // No inicializar auth para formulario público
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session) cargarPerfil(session.user.id)
      else setLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setSession(session)
      if (session) cargarPerfil(session.user.id)
      else { setPerfil(null); setLoading(false) }
    })
    return () => subscription.unsubscribe()
  }, [])

  const cargarPerfil = async (uid) => {
    const { data } = await supabase.from('perfiles').select('*').eq('id', uid).single()
    setPerfil(data)
    if (data?.rol === 'jefe_obra') navTo('obras')
    if (data?.rol === 'calculista') navTo('legajos')
    setLoading(false)
  }

  const navTo = (modulo, deepId) => {
    const hashValue = deepId ? `${modulo}:${deepId}` : modulo;
    setCurrent(modulo)
    setDeepLinkId(deepId || null)
    if (modulo) {
      window.location.hash = hashValue
    } else {
      window.history.pushState(null, '', window.location.pathname)
    }
  }

  const logout = async () => {
    await supabase.auth.signOut()
    navTo(null)
  }

  const shared = makeShared(palette);
  const sans = { fontFamily: 'system-ui, -apple-system, sans-serif' };

  if (current === 'postulacion') return <Postulacion />

  if (loading) return (
    <div style={{ ...sans, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', color: palette.textFaint, fontSize: 14, background: palette.bgApp }}>
      Cargando...
    </div>
  )

  if (!session) return <LoginScreen palette={palette} />
  if (!perfil || !perfil.activo) return <PendienteScreen onLogout={logout} perfil={perfil} palette={palette} />

  const apps = perfil.rol === 'admin' ? APPS_ADMIN : perfil.rol === 'jefe_obra' ? APPS_JEFE : APPS_CALCULISTA

  const themeCtx = { theme, palette };

  if (current === 'presupuestos') return <ThemeContext.Provider value={themeCtx}><Layout current={current} onNav={navTo} apps={apps} onLogout={logout} perfil={perfil} theme={theme} toggle={toggle} palette={palette}><App deepLinkId={deepLinkId} onNav={navTo} /></Layout></ThemeContext.Provider>
  if (current === 'proyectos') return <ThemeContext.Provider value={themeCtx}><Layout current={current} onNav={navTo} apps={apps} onLogout={logout} perfil={perfil} theme={theme} toggle={toggle} palette={palette}><Proyectos deepLinkId={deepLinkId} perfil={perfil} /></Layout></ThemeContext.Provider>
  if (current === 'perfil') return <ThemeContext.Provider value={themeCtx}><Layout current={current} onNav={navTo} apps={apps} onLogout={logout} perfil={perfil} theme={theme} toggle={toggle} palette={palette}><PanelPerfil perfil={perfil} palette={palette} onVolver={() => navTo(null)} /></Layout></ThemeContext.Provider>
  if (current === 'legajos') return <ThemeContext.Provider value={themeCtx}><Layout current={current} onNav={navTo} apps={apps} onLogout={logout} perfil={perfil} theme={theme} toggle={toggle} palette={palette} hideBuscador={true}><Proyectos deepLinkId={deepLinkId} perfil={perfil} /></Layout></ThemeContext.Provider>
  if (current === 'calculistas') return <ThemeContext.Provider value={themeCtx}><Layout current={current} onNav={navTo} apps={apps} onLogout={logout} perfil={perfil} theme={theme} toggle={toggle} palette={palette}><Calculistas /></Layout></ThemeContext.Provider>
  if (current === 'crm') return <ThemeContext.Provider value={themeCtx}><Layout current={current} onNav={navTo} apps={apps} onLogout={logout} perfil={perfil} theme={theme} toggle={toggle} palette={palette}><CRM /></Layout></ThemeContext.Provider>
  if (current === 'dashboard') return <ThemeContext.Provider value={themeCtx}><Layout current={current} onNav={navTo} apps={apps} onLogout={logout} perfil={perfil} theme={theme} toggle={toggle} palette={palette}><Dashboard onNav={navTo} /></Layout></ThemeContext.Provider>
  if (current === 'obras') return <ThemeContext.Provider value={themeCtx}><Layout current={current} onNav={navTo} apps={apps} onLogout={logout} perfil={perfil} theme={theme} toggle={toggle} palette={palette}><Obras perfil={perfil} onLogout={logout} deepLinkId={deepLinkId} /></Layout></ThemeContext.Provider>
  if (current === 'biblioteca') return <ThemeContext.Provider value={themeCtx}><Layout current={current} onNav={navTo} apps={apps} onLogout={logout} perfil={perfil} theme={theme} toggle={toggle} palette={palette}><Biblioteca /></Layout></ThemeContext.Provider>
  if (current === 'configuracion') return <ThemeContext.Provider value={themeCtx}><Layout current={current} onNav={navTo} apps={apps} onLogout={logout} perfil={perfil} theme={theme} toggle={toggle} palette={palette}><Configuracion /></Layout></ThemeContext.Provider>
  if (current === 'usuarios') return <ThemeContext.Provider value={themeCtx}><Layout current={current} onNav={navTo} apps={apps} onLogout={logout} perfil={perfil} theme={theme} toggle={toggle} palette={palette}><Usuarios session={session} palette={palette} /></Layout></ThemeContext.Provider>

  // ─── Pantalla de inicio (selector de apps) ───
  return (
    <div style={{ ...sans, minHeight: '100vh', background: palette.bgApp, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ position: 'fixed', top: 20, right: 20, display: 'flex', gap: 8, alignItems: 'center' }}>
        <ThemeToggle theme={theme} onToggle={toggle} palette={palette} />
      </div>
      <div style={{ marginBottom: 32, textAlign: 'center' }}>
        <div style={{ width: 52, height: 52, background: palette.bgInverse, borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, margin: '0 auto 12px', color: palette.textInverse, fontWeight: 900, fontFamily: FONT_MONO }}>N</div>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: palette.text, letterSpacing: -0.3 }}>NPL Sistema</h1>
        <p style={{ margin: '4px 0 0', fontSize: 13, color: palette.textMuted }}>Bienvenido, {perfil.nombre}</p>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, width: '100%', maxWidth: 600 }}>
        {apps.map(a => (
          <button key={a.id} onClick={() => navTo(a.id)}
            style={{ background: palette.bgCard, border: `1.5px solid ${palette.border}`, borderRadius: 12, padding: '20px 16px', cursor: 'pointer', textAlign: 'left' }}
            onMouseEnter={e => e.currentTarget.style.borderColor = palette.bgInverse}
            onMouseLeave={e => e.currentTarget.style.borderColor = palette.border}>
            <div style={{ fontSize: 26, marginBottom: 8 }}>{a.icon}</div>
            <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: palette.text }}>{a.label}</p>
            <p style={{ margin: '2px 0 0', fontSize: 12, color: palette.textMuted }}>{a.desc}</p>
          </button>
        ))}
      </div>
      <button onClick={logout} style={{ marginTop: 32, fontSize: 12, color: palette.textFaint, background: 'none', border: 'none', cursor: 'pointer' }}>Cerrar sesión</button>
    </div>
  )
}

/* ─── Layout — header global con marca + nav + theme toggle, una sola vez ─── */
/* ─── Panel de perfil editable ─── */
function PanelPerfil({ perfil, palette, onVolver }) {
  const shared = makeShared(palette)
  const [form, setForm] = useState({ nombre: perfil?.nombre || '', mail: perfil?.mail || '', wsp: '', ciudad: '' })
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')
  const [passForm, setPassForm] = useState({ nueva: '', confirmar: '' })
  const [changingPass, setChangingPass] = useState(false)

  async function guardar() {
    setSaving(true)
    const { error } = await supabase.from('perfiles').update({ nombre: form.nombre }).eq('id', perfil.id)
    if (error) setMsg('❌ ' + error.message)
    else setMsg('✓ Perfil actualizado')
    setTimeout(() => setMsg(''), 3000)
    setSaving(false)
  }

  async function cambiarPassword() {
    if (passForm.nueva !== passForm.confirmar) return setMsg('❌ Las contraseñas no coinciden')
    if (passForm.nueva.length < 6) return setMsg('❌ Mínimo 6 caracteres')
    setChangingPass(true)
    const { error } = await supabase.auth.updateUser({ password: passForm.nueva })
    if (error) setMsg('❌ ' + error.message)
    else { setMsg('✓ Contraseña actualizada'); setPassForm({ nueva: '', confirmar: '' }) }
    setTimeout(() => setMsg(''), 3000)
    setChangingPass(false)
  }

  return (
    <div style={{ maxWidth: 520, margin: '40px auto', padding: 24, fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <button onClick={onVolver} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: '#888' }}>← Volver</button>
        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: palette.text }}>Mi perfil</h2>
        <span style={{ fontSize: 11, background: palette.bgSoft, color: palette.textMuted, padding: '2px 8px', borderRadius: 20, fontWeight: 600 }}>{perfil?.rol}</span>
      </div>

      <div style={{ background: palette.bgCard, border: `1.5px solid ${palette.border}`, borderRadius: 12, padding: 20, marginBottom: 16 }}>
        <h3 style={{ margin: '0 0 14px', fontSize: 14, fontWeight: 700, color: palette.text }}>Datos personales</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div>
            <label style={shared.lbl}>Nombre completo</label>
            <input style={shared.inp} value={form.nombre} onChange={e => setForm(p => ({ ...p, nombre: e.target.value }))} />
          </div>
          <div>
            <label style={shared.lbl}>Email</label>
            <input style={{ ...shared.inp, background: palette.bgSoft, color: palette.textMuted }} value={form.mail} disabled />
            <p style={{ fontSize: 11, color: palette.textFaint, margin: '3px 0 0' }}>El email no se puede cambiar</p>
          </div>
        </div>
        {msg && <p style={{ fontSize: 13, color: msg.startsWith('✓') ? '#1a8a5e' : '#c0392b', margin: '10px 0 0', fontWeight: 600 }}>{msg}</p>}
        <button onClick={guardar} disabled={saving} style={{ ...shared.btn, marginTop: 14 }}>{saving ? 'Guardando…' : 'Guardar cambios'}</button>
      </div>

      <div style={{ background: palette.bgCard, border: `1.5px solid ${palette.border}`, borderRadius: 12, padding: 20 }}>
        <h3 style={{ margin: '0 0 14px', fontSize: 14, fontWeight: 700, color: palette.text }}>Cambiar contraseña</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div>
            <label style={shared.lbl}>Nueva contraseña</label>
            <input type="password" style={shared.inp} value={passForm.nueva} onChange={e => setPassForm(p => ({ ...p, nueva: e.target.value }))} placeholder="Mínimo 6 caracteres" />
          </div>
          <div>
            <label style={shared.lbl}>Confirmar contraseña</label>
            <input type="password" style={shared.inp} value={passForm.confirmar} onChange={e => setPassForm(p => ({ ...p, confirmar: e.target.value }))} placeholder="Repetí la contraseña" />
          </div>
        </div>
        <button onClick={cambiarPassword} disabled={changingPass || !passForm.nueva} style={{ ...shared.btn, marginTop: 14 }}>{changingPass ? 'Actualizando…' : 'Cambiar contraseña'}</button>
      </div>
    </div>
  )
}

function Layout({ current, onNav, apps, onLogout, perfil, theme, toggle, palette, children, hideBuscador }) {
  if (perfil?.rol === 'jefe_obra') {
    return <div style={{ fontFamily: 'system-ui, -apple-system, sans-serif', minHeight: '100vh', background: palette.bgApp }}>{children}</div>
  }
  const esCalculista = perfil?.rol === 'calculista';
  return (
    <div style={{ fontFamily: 'system-ui, -apple-system, sans-serif', minHeight: '100vh', background: palette.bgApp }}>
      <div style={{ background: palette.bgInverse, padding: '0 16px', display: 'flex', alignItems: 'center', gap: 12, height: 48, overflowX: 'auto' }}>
        <button onClick={() => onNav(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: palette.textInverse, fontWeight: 900, fontSize: 16, padding: 0, flexShrink: 0, fontFamily: FONT_MONO, letterSpacing: -0.5 }}>N</button>
        <div style={{ width: 1, height: 20, background: theme === 'dark' ? '#333' : '#2a2a2a', flexShrink: 0 }} />
        {apps.map(a => (
          <button key={a.id} onClick={() => onNav(a.id)}
            style={{
              background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600,
              color: current === a.id ? palette.textInverse : '#888',
              padding: '0 4px', borderBottom: current === a.id ? `2px solid ${palette.textInverse}` : '2px solid transparent',
              height: 48, whiteSpace: 'nowrap', flexShrink: 0,
            }}>
            {a.label}
          </button>
        ))}
        <div style={{ flex: 1 }} />
        {!hideBuscador && !esCalculista && (
          <div style={{ position: 'relative' }}>
            <GlobalSearch palette={palette} onNavegar={(modulo, id) => onNav(modulo, id)} />
          </div>
        )}
        <ThemeToggle theme={theme} onToggle={toggle} palette={palette} />
        <button onClick={() => onNav('perfil')} style={{ fontSize: 11, color: '#aaa', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 6, padding: '3px 10px', cursor: 'pointer', flexShrink: 0 }}>
          👤 {perfil?.nombre}
        </button>
        <button onClick={onLogout} style={{ fontSize: 11, color: '#999', background: 'none', border: 'none', cursor: 'pointer', flexShrink: 0 }}>Salir</button>
      </div>
      <div>{children}</div>
    </div>
  )
}

/* ─── Login ─── */
function LoginScreen({ palette }) {
  const [tab, setTab] = useState('login')
  const [mail, setMail] = useState('')
  const [pass, setPass] = useState('')
  const [nombre, setNombre] = useState('')
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState('')
  const shared = makeShared(palette);

  const login = async () => {
    setLoading(true); setMsg('')
    const { error } = await supabase.auth.signInWithPassword({ email: mail, password: pass })
    if (error) setMsg(error.message)
    setLoading(false)
  }

  const registro = async () => {
    if (!nombre.trim()) return setMsg('El nombre es obligatorio')
    setLoading(true); setMsg('')
    const { error } = await supabase.auth.signUp({ email: mail, password: pass, options: { data: { nombre } } })
    if (error) setMsg(error.message)
    else setMsg('¡Registro exitoso! Tu cuenta está pendiente de activación por el administrador.')
    setLoading(false)
  }

  return (
    <div style={{ fontFamily: 'system-ui, -apple-system, sans-serif', minHeight: '100vh', background: palette.bgApp, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ background: palette.bgCard, border: `1.5px solid ${palette.border}`, borderRadius: 16, padding: '32px 28px', width: '100%', maxWidth: 380 }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ width: 48, height: 48, background: palette.bgInverse, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, margin: '0 auto 12px', color: palette.textInverse, fontWeight: 900, fontFamily: FONT_MONO }}>N</div>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: palette.text }}>NPL Sistema</h1>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: palette.textMuted }}>Ingeniería Civil</p>
        </div>
        <div style={{ display: 'flex', border: `1.5px solid ${palette.border}`, borderRadius: 10, overflow: 'hidden', marginBottom: 20 }}>
          {[['login', 'Ingresar'], ['registro', 'Registrarse']].map(([id, label]) => (
            <button key={id} onClick={() => { setTab(id); setMsg('') }}
              style={{ flex: 1, padding: '8px', fontSize: 13, fontWeight: 700, background: tab === id ? palette.bgInverse : palette.bgCard, color: tab === id ? palette.textInverse : palette.textMuted, border: 'none', cursor: 'pointer' }}>
              {label}
            </button>
          ))}
        </div>
        {tab === 'registro' && (
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: palette.textSoft, marginBottom: 5 }}>Nombre completo</label>
            <input style={shared.inp} value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Tu nombre" />
          </div>
        )}
        <div style={{ marginBottom: 14 }}>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: palette.textSoft, marginBottom: 5 }}>Email</label>
          <input style={shared.inp} type="email" value={mail} onChange={e => setMail(e.target.value)} placeholder="tu@mail.com" />
        </div>
        <div style={{ marginBottom: 20 }}>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: palette.textSoft, marginBottom: 5 }}>Contraseña</label>
          <input style={shared.inp} type="password" value={pass} onChange={e => setPass(e.target.value)} placeholder="••••••••"
            onKeyDown={e => e.key === 'Enter' && (tab === 'login' ? login() : registro())} />
        </div>
        {msg && <p style={{ fontSize: 13, color: msg.includes('exitoso') ? '#1a8a5e' : '#c0392b', marginBottom: 14, textAlign: 'center' }}>{msg}</p>}
        <button onClick={tab === 'login' ? login : registro} disabled={loading}
          style={{ width: '100%', padding: '13px', fontSize: 15, fontWeight: 700, borderRadius: 10, border: 'none', background: loading ? palette.textFaint : palette.bgInverse, color: palette.textInverse, cursor: loading ? 'not-allowed' : 'pointer' }}>
          {loading ? 'Cargando...' : tab === 'login' ? 'Ingresar' : 'Crear cuenta'}
        </button>
      </div>
    </div>
  )
}

/* ─── Pantalla pendiente ─── */
function PendienteScreen({ onLogout, perfil, palette }) {
  return (
    <div style={{ fontFamily: 'system-ui, -apple-system, sans-serif', minHeight: '100vh', background: palette.bgApp, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ background: palette.bgCard, border: `1.5px solid ${palette.border}`, borderRadius: 16, padding: '32px 28px', width: '100%', maxWidth: 380, textAlign: 'center' }}>
        <div style={{ fontSize: 40, marginBottom: 16 }}>⏳</div>
        <h2 style={{ margin: '0 0 8px', fontSize: 18, fontWeight: 800, color: palette.text }}>Cuenta pendiente</h2>
        <p style={{ margin: '0 0 24px', fontSize: 14, color: palette.textMuted, lineHeight: 1.5 }}>
          Tu cuenta fue creada correctamente. El administrador de NPL debe activarla y asignarte un rol antes de que puedas acceder.
        </p>
        <p style={{ margin: '0 0 24px', fontSize: 12, color: palette.textFaint }}>{perfil?.mail}</p>
        <button onClick={onLogout} style={{ padding: '10px 24px', fontSize: 14, fontWeight: 700, borderRadius: 10, border: `1.5px solid ${palette.border}`, background: palette.bgCard, color: palette.textSoft, cursor: 'pointer' }}>
          Cerrar sesión
        </button>
      </div>
    </div>
  )
}

/* ─── Panel de usuarios ─── */
function Usuarios({ session, palette }) {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')
  const [form, setForm] = useState({ nombre: '', email: '', rol: 'calculista' })
  const shared = makeShared(palette);

  useEffect(() => { cargar() }, [])

  const cargar = async () => {
    setLoading(true)
    const { data: { session: s } } = await supabase.auth.getSession()
    const res = await fetch(EDGE_LIST_URL, { headers: { 'Authorization': `Bearer ${s.access_token}` } })
    const json = await res.json()
    const lista = json.data || []

    // Verificar cuáles calculistas están vinculados
    const emails = lista.filter(u => u.rol === 'calculista').map(u => u.mail).filter(Boolean)
    let vinculados = new Set()
    if (emails.length > 0) {
      const { data: calcs } = await supabase.from('calculistas').select('mail, perfil_id').in('mail', emails)
      if (calcs) calcs.forEach(c => { if (c.perfil_id || c.mail) vinculados.add(c.mail) })
    }

    setUsers(lista.map(u => ({ ...u, calculista_vinculado: u.rol === 'calculista' && vinculados.has(u.mail) })))
    setLoading(false)
  }

  const actualizar = async (id, campo, valor) => {
    await supabase.from('perfiles').update({ [campo]: valor }).eq('id', id)
    setUsers(prev => prev.map(u => u.id === id ? { ...u, [campo]: valor } : u))
  }

  const invitarUsuario = async () => {
    if (!form.nombre || !form.email) return setMsg('Completá nombre y email')
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(form.email)) return setMsg('Email inválido')
    setSaving(true); setMsg('')
    try {
      const { data: { session: s } } = await supabase.auth.getSession()
      const res = await fetch(EDGE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${s.access_token}` },
        body: JSON.stringify({ nombre: form.nombre, email: form.email, rol: form.rol, invite: true }),
      })
      const data = await res.json()
      if (data.error) { setMsg('❌ ' + data.error); setSaving(false); return }

      // Si es calculista, vincular con tabla calculistas por email
      if (form.rol === 'calculista' && data.id) {
        const { data: calcs } = await supabase.from('calculistas').select('id').eq('mail', form.email).limit(1)
        if (calcs && calcs.length > 0) {
          await supabase.from('calculistas').update({ perfil_id: data.id }).eq('id', calcs[0].id)
          setMsg(`✓ Invitación enviada a ${form.email} — vinculado con calculista existente`)
        } else {
          setMsg(`✓ Invitación enviada a ${form.email} — recibirá un email para configurar su contraseña`)
        }
      } else {
        setMsg(`✓ Invitación enviada a ${form.email}`)
      }

      setForm({ nombre: '', email: '', rol: 'calculista' })
      setShowForm(false)
      cargar()
    } catch (e) { setMsg('❌ Error de conexión') }
    setSaving(false)
  }

  const ROLES = [
    { value: 'admin', label: '🔑 Admin', desc: 'Acceso completo' },
    { value: 'calculista', label: '📐 Calculista', desc: 'Ve sus proyectos asignados' },
    { value: 'jefe_obra', label: '🏗 Jefe de Obra', desc: 'Ve sus obras asignadas' },
  ]

  return (
    <div style={{ fontFamily: 'system-ui, -apple-system, sans-serif', padding: '24px 20px', maxWidth: 800, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: palette.text }}>⚙️ Gestión de usuarios</h1>
        <button onClick={() => { setShowForm(!showForm); setMsg('') }} style={shared.btn}>
          {showForm ? 'Cancelar' : '+ Nuevo usuario'}
        </button>
      </div>

      {showForm && (
        <div style={{ background: palette.bgSoft, border: `1.5px solid ${palette.border}`, borderRadius: 12, padding: 20, marginBottom: 20 }}>
          <h3 style={{ margin: '0 0 4px', fontSize: 15, fontWeight: 700, color: palette.text }}>Invitar usuario</h3>
          <p style={{ margin: '0 0 16px', fontSize: 12, color: palette.textFaint }}>El usuario recibirá un email para configurar su contraseña y acceder al sistema.</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
            <div>
              <label style={shared.lbl}>Nombre completo *</label>
              <input style={shared.inp} value={form.nombre} onChange={e => setForm(p => ({ ...p, nombre: e.target.value }))} placeholder="Ej: Joaquín García" />
            </div>
            <div>
              <label style={shared.lbl}>Email *</label>
              <input style={shared.inp} type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} placeholder="calculista@mail.com" />
            </div>
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={shared.lbl}>Rol *</label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {ROLES.map(r => (
                <label key={r.value} onClick={() => setForm(p => ({ ...p, rol: r.value }))} style={{
                  display: 'flex', flexDirection: 'column', gap: 2, padding: '10px 16px', borderRadius: 10, cursor: 'pointer',
                  border: `2px solid ${form.rol === r.value ? '#0a0a0a' : palette.border}`,
                  background: form.rol === r.value ? '#0a0a0a' : palette.bgCard,
                  color: form.rol === r.value ? '#fff' : palette.text,
                  minWidth: 140,
                }}>
                  <span style={{ fontSize: 13, fontWeight: 700 }}>{r.label}</span>
                  <span style={{ fontSize: 11, opacity: 0.7 }}>{r.desc}</span>
                </label>
              ))}
            </div>
          </div>
          {msg && <p style={{ fontSize: 13, color: msg.startsWith('✓') ? '#1a8a5e' : '#c0392b', margin: '0 0 12px' }}>{msg}</p>}
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={invitarUsuario} disabled={saving} style={shared.btn}>
              {saving ? 'Enviando invitación…' : '📧 Enviar invitación'}
            </button>
            <button onClick={() => { setShowForm(false); setMsg(''); }} style={shared.btnSm}>Cancelar</button>
          </div>
        </div>
      )}

      {msg && !showForm && <p style={{ fontSize: 13, color: '#1a8a5e', marginBottom: 16 }}>{msg}</p>}
      {loading && <p style={{ color: palette.textFaint }}>Cargando...</p>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {users.map(u => (
          <div key={u.id} style={{ background: palette.bgCard, border: `1.5px solid ${palette.border}`, borderRadius: 12, padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: palette.text }}>{u.nombre || '—'}</p>
                {u.rol === 'calculista' && (
                  <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 20, background: u.calculista_vinculado ? '#f0fdf4' : '#fef9c3', color: u.calculista_vinculado ? '#1a8a5e' : '#c4781a', fontWeight: 700, border: `1px solid ${u.calculista_vinculado ? '#1a8a5e40' : '#f59e0b40'}` }}>
                    {u.calculista_vinculado ? '✓ Vinculado' : '⚠ Sin vincular en Calculistas'}
                  </span>
                )}
              </div>
              <p style={{ margin: '2px 0 0', fontSize: 12, color: palette.textMuted }}>{u.mail}</p>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <select value={u.rol} onChange={e => actualizar(u.id, 'rol', e.target.value)}
                style={{ fontSize: 12, padding: '5px 8px', border: `1px solid ${palette.border}`, borderRadius: 8, background: palette.bgSoft, cursor: 'pointer', color: palette.text }}>
                {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
              <button onClick={() => actualizar(u.id, 'activo', !u.activo)}
                style={{ fontSize: 12, padding: '5px 12px', borderRadius: 8, border: 'none', cursor: 'pointer', background: u.activo ? '#1a8a5e1a' : palette.bgSoft, color: u.activo ? '#1a8a5e' : palette.textMuted, fontWeight: 700 }}>
                {u.activo ? '✓ Activo' : 'Inactivo'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
