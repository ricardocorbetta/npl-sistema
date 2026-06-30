import React, { useState, useEffect, createContext, useContext } from 'react'
import { supabase } from './supabase.js'
import App from './App.jsx'
import Proyectos from './Proyectos.jsx'
import Calculistas from './Calculistas.jsx'
import CRM from './CRM.jsx'
import Dashboard from './Dashboard.jsx'
import Obras from './Obras.jsx'
import Biblioteca from './Biblioteca.jsx'
import { useTheme, ThemeToggle, makeShared, FONT_MONO, GlobalSearch } from './uiKit.jsx'

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
  { id: 'usuarios', label: 'Usuarios', icon: '⚙️', desc: 'Gestión de accesos' },
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
    return hash || null;
  })
  const { theme, toggle, palette } = useTheme();

  useEffect(() => {
    const onHashChange = () => {
      const hash = window.location.hash.replace("#", "");
      setCurrent(hash || null);
    };
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  useEffect(() => {
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
    setLoading(false)
  }

  const navTo = (modulo) => {
    setCurrent(modulo)
    if (modulo) {
      window.location.hash = modulo
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

  if (loading) return (
    <div style={{ ...sans, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', color: palette.textFaint, fontSize: 14, background: palette.bgApp }}>
      Cargando...
    </div>
  )

  if (!session) return <LoginScreen palette={palette} />
  if (!perfil || !perfil.activo) return <PendienteScreen onLogout={logout} perfil={perfil} palette={palette} />

  const apps = perfil.rol === 'admin' ? APPS_ADMIN : perfil.rol === 'jefe_obra' ? APPS_JEFE : APPS_CALCULISTA

  const themeCtx = { theme, palette };

  if (current === 'presupuestos') return <ThemeContext.Provider value={themeCtx}><Layout current={current} onNav={navTo} apps={apps} onLogout={logout} perfil={perfil} theme={theme} toggle={toggle} palette={palette}><App /></Layout></ThemeContext.Provider>
  if (current === 'proyectos') return <ThemeContext.Provider value={themeCtx}><Layout current={current} onNav={navTo} apps={apps} onLogout={logout} perfil={perfil} theme={theme} toggle={toggle} palette={palette}><Proyectos /></Layout></ThemeContext.Provider>
  if (current === 'calculistas') return <ThemeContext.Provider value={themeCtx}><Layout current={current} onNav={navTo} apps={apps} onLogout={logout} perfil={perfil} theme={theme} toggle={toggle} palette={palette}><Calculistas /></Layout></ThemeContext.Provider>
  if (current === 'crm') return <ThemeContext.Provider value={themeCtx}><Layout current={current} onNav={navTo} apps={apps} onLogout={logout} perfil={perfil} theme={theme} toggle={toggle} palette={palette}><CRM /></Layout></ThemeContext.Provider>
  if (current === 'dashboard') return <ThemeContext.Provider value={themeCtx}><Layout current={current} onNav={navTo} apps={apps} onLogout={logout} perfil={perfil} theme={theme} toggle={toggle} palette={palette}><Dashboard /></Layout></ThemeContext.Provider>
  if (current === 'obras') return <ThemeContext.Provider value={themeCtx}><Layout current={current} onNav={navTo} apps={apps} onLogout={logout} perfil={perfil} theme={theme} toggle={toggle} palette={palette}><Obras perfil={perfil} onLogout={logout} /></Layout></ThemeContext.Provider>
  if (current === 'biblioteca') return <ThemeContext.Provider value={themeCtx}><Layout current={current} onNav={navTo} apps={apps} onLogout={logout} perfil={perfil} theme={theme} toggle={toggle} palette={palette}><Biblioteca /></Layout></ThemeContext.Provider>
  if (current === 'usuarios') return <ThemeContext.Provider value={themeCtx}><Layout current={current} onNav={navTo} apps={apps} onLogout={logout} perfil={perfil} theme={theme} toggle={toggle} palette={palette}><Usuarios session={session} palette={palette} /></Layout></ThemeContext.Provider>

  // ─── Pantalla de inicio (selector de apps) ───
  return (
    <div style={{ ...sans, minHeight: '100vh', background: palette.bgApp, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ position: 'fixed', top: 20, right: 20, display: 'flex', gap: 8, alignItems: 'center' }}>
        <GlobalSearch palette={palette} onNavegar={(modulo) => navTo(modulo)} />
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
function Layout({ current, onNav, apps, onLogout, perfil, theme, toggle, palette, children }) {
  if (perfil?.rol === 'jefe_obra') {
    return <div style={{ fontFamily: 'system-ui, -apple-system, sans-serif', minHeight: '100vh', background: palette.bgApp }}>{children}</div>
  }
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
        <GlobalSearch palette={palette} onNavegar={(modulo, id, tipo) => { onNav(modulo); }} />
        <ThemeToggle theme={theme} onToggle={toggle} palette={palette} />
        <span style={{ fontSize: 11, color: '#777', flexShrink: 0, marginLeft: 4 }}>{perfil?.nombre}</span>
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
  const [form, setForm] = useState({ nombre: '', email: '', password: '', rol: 'calculista' })
  const shared = makeShared(palette);

  useEffect(() => { cargar() }, [])

  const cargar = async () => {
    const { data: { session: s } } = await supabase.auth.getSession()
    const res = await fetch(EDGE_LIST_URL, {
      headers: { 'Authorization': `Bearer ${s.access_token}` }
    })
    const json = await res.json()
    setUsers(json.data || [])
    setLoading(false)
  }

  const actualizar = async (id, campo, valor) => {
    await supabase.from('perfiles').update({ [campo]: valor }).eq('id', id)
    setUsers(prev => prev.map(u => u.id === id ? { ...u, [campo]: valor } : u))
  }

  const crearUsuario = async () => {
    if (!form.nombre || !form.email || !form.password) return setMsg('Completá todos los campos')
    setSaving(true); setMsg('')
    try {
      const { data: { session: s } } = await supabase.auth.getSession()
      const res = await fetch(EDGE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${s.access_token}`,
        },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (data.error) { setMsg(data.error); setSaving(false); return }
      setMsg('✓ Usuario creado correctamente')
      setForm({ nombre: '', email: '', password: '', rol: 'calculista' })
      setShowForm(false)
      cargar()
    } catch (e) { setMsg('Error de conexión') }
    setSaving(false)
  }

  const ROLES = [
    { value: 'admin', label: 'Admin' },
    { value: 'jefe_obra', label: 'Jefe de Obra' },
    { value: 'calculista', label: 'Calculista' },
    { value: 'pendiente', label: 'Pendiente' },
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
          <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 700, color: palette.text }}>Nuevo usuario</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
            <div>
              <label style={shared.lbl}>Nombre completo *</label>
              <input style={shared.inp} value={form.nombre} onChange={e => setForm(p => ({ ...p, nombre: e.target.value }))} placeholder="Nombre y apellido" />
            </div>
            <div>
              <label style={shared.lbl}>Email *</label>
              <input style={shared.inp} type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} placeholder="usuario@mail.com" />
            </div>
            <div>
              <label style={shared.lbl}>Contraseña *</label>
              <input style={shared.inp} type="password" value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))} placeholder="Mínimo 6 caracteres" />
            </div>
            <div>
              <label style={shared.lbl}>Rol *</label>
              <select style={shared.inp} value={form.rol} onChange={e => setForm(p => ({ ...p, rol: e.target.value }))}>
                {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </div>
          </div>
          {msg && <p style={{ fontSize: 13, color: msg.startsWith('✓') ? '#1a8a5e' : '#c0392b', margin: '0 0 12px' }}>{msg}</p>}
          <button onClick={crearUsuario} disabled={saving} style={shared.btn}>
            {saving ? 'Creando...' : 'Crear usuario'}
          </button>
        </div>
      )}

      {msg && !showForm && <p style={{ fontSize: 13, color: '#1a8a5e', marginBottom: 16 }}>{msg}</p>}
      {loading && <p style={{ color: palette.textFaint }}>Cargando...</p>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {users.map(u => (
          <div key={u.id} style={{ background: palette.bgCard, border: `1.5px solid ${palette.border}`, borderRadius: 12, padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
            <div>
              <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: palette.text }}>{u.nombre || '—'}</p>
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
