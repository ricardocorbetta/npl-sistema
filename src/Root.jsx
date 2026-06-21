import React, { useState, useEffect } from 'react'
import { supabase } from './supabase.js'
import App from './App.jsx'
import Proyectos from './Proyectos.jsx'
import Calculistas from './Calculistas.jsx'
import CRM from './CRM.jsx'
import Dashboard from './Dashboard.jsx'
import Obras from './Obras.jsx'

const EDGE_URL = 'https://imkmosifqxzbtqgzssst.supabase.co/functions/v1/crear-usuario'

const APPS_ADMIN = [
  { id: 'dashboard',    label: 'Dashboard',    icon: '📊', desc: 'Panel de control' },
  { id: 'presupuestos', label: 'Presupuestos',  icon: '📋', desc: 'Pipeline y seguimiento' },
  { id: 'proyectos',   label: 'Proyectos',    icon: '🗂️', desc: 'Kanban de proyectos' },
  { id: 'obras',        label: 'Obras',         icon: '🏗️', desc: 'Seguimiento diario' },
  { id: 'calculistas',  label: 'Calculistas',   icon: '👷', desc: 'Equipo y postulantes' },
  { id: 'crm',          label: 'Clientes',      icon: '👥', desc: '148 contactos' },
  { id: 'usuarios',     label: 'Usuarios',      icon: '⚙️', desc: 'Gestión de accesos' },
]

const APPS_JEFE = [
  { id: 'obras', label: 'Mis obras', icon: '🏗️', desc: 'Seguimiento diario' },
]

const APPS_CALCULISTA = [
  { id: 'legajos', label: 'Mis legajos', icon: '🗂️', desc: 'Proyectos asignados' },
]

const s = {
  sans: { fontFamily: 'system-ui, -apple-system, sans-serif' },
  inp: { width: '100%', fontSize: 15, padding: '12px 14px', border: '1px solid #e5e5e5', borderRadius: 10, boxSizing: 'border-box', background: '#fff' },
}

export default function Root() {
  const [session, setSession]   = useState(null)
  const [perfil, setPerfil]     = useState(null)
  const [loading, setLoading]   = useState(true)
  const [current, setCurrent]   = useState(null)

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
    if (data?.rol === 'jefe_obra') setCurrent('obras')
    setLoading(false)
  }

  const logout = async () => {
    await supabase.auth.signOut()
    setCurrent(null)
  }

  if (loading) return (
    <div style={{ ...s.sans, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', color: '#aaa', fontSize: 14 }}>
      Cargando...
    </div>
  )

  if (!session) return <LoginScreen />
  if (!perfil || !perfil.activo) return <PendienteScreen onLogout={logout} perfil={perfil} />

  const apps = perfil.rol === 'admin' ? APPS_ADMIN : perfil.rol === 'jefe_obra' ? APPS_JEFE : APPS_CALCULISTA

  if (current === 'presupuestos') return <Layout current={current} onNav={setCurrent} apps={apps} onLogout={logout} perfil={perfil}><App /></Layout>
  if (current === 'proyectos')    return <Layout current={current} onNav={setCurrent} apps={apps} onLogout={logout} perfil={perfil}><Proyectos /></Layout>
  if (current === 'calculistas')  return <Layout current={current} onNav={setCurrent} apps={apps} onLogout={logout} perfil={perfil}><Calculistas /></Layout>
  if (current === 'crm')          return <Layout current={current} onNav={setCurrent} apps={apps} onLogout={logout} perfil={perfil}><CRM /></Layout>
  if (current === 'dashboard')    return <Layout current={current} onNav={setCurrent} apps={apps} onLogout={logout} perfil={perfil}><Dashboard /></Layout>
  if (current === 'obras')        return <Layout current={current} onNav={setCurrent} apps={apps} onLogout={logout} perfil={perfil}><Obras token={session?.access_token} perfil={perfil} onLogout={logout} /></Layout>
  if (current === 'usuarios')     return <Layout current={current} onNav={setCurrent} apps={apps} onLogout={logout} perfil={perfil}><Usuarios session={session} /></Layout>

  return (
    <div style={{ ...s.sans, minHeight: '100vh', background: '#f9f9f9', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ marginBottom: 32, textAlign: 'center' }}>
        <div style={{ width: 52, height: 52, background: '#111', borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, margin: '0 auto 12px', color: '#fff', fontWeight: 700 }}>N</div>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#111' }}>NPL Sistema</h1>
        <p style={{ margin: '4px 0 0', fontSize: 13, color: '#888' }}>Bienvenido, {perfil.nombre}</p>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, width: '100%', maxWidth: 600 }}>
        {apps.map(a => (
          <button key={a.id} onClick={() => setCurrent(a.id)}
            style={{ background: '#fff', border: '1px solid #e5e5e5', borderRadius: 14, padding: '20px 16px', cursor: 'pointer', textAlign: 'left' }}
            onMouseEnter={e => e.currentTarget.style.borderColor = '#111'}
            onMouseLeave={e => e.currentTarget.style.borderColor = '#e5e5e5'}>
            <div style={{ fontSize: 26, marginBottom: 8 }}>{a.icon}</div>
            <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: '#111' }}>{a.label}</p>
            <p style={{ margin: '2px 0 0', fontSize: 12, color: '#888' }}>{a.desc}</p>
          </button>
        ))}
      </div>
      <button onClick={logout} style={{ marginTop: 32, fontSize: 12, color: '#aaa', background: 'none', border: 'none', cursor: 'pointer' }}>Cerrar sesión</button>
    </div>
  )
}

// ─── Layout ───────────────────────────────────────────────────
function Layout({ current, onNav, apps, onLogout, perfil, children }) {
  if (perfil?.rol === 'jefe_obra') {
    return <div style={{ ...s.sans, minHeight: '100vh', background: '#f8f8f8' }}>{children}</div>
  }
  return (
    <div style={{ ...s.sans, minHeight: '100vh', background: '#fff' }}>
      <div style={{ background: '#111', padding: '0 16px', display: 'flex', alignItems: 'center', gap: 12, height: 46, overflowX: 'auto' }}>
        <button onClick={() => onNav(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#fff', fontWeight: 700, fontSize: 16, padding: 0, flexShrink: 0 }}>N</button>
        <div style={{ width: 1, height: 20, background: '#333', flexShrink: 0 }} />
        {apps.map(a => (
          <button key={a.id} onClick={() => onNav(a.id)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 500, color: current === a.id ? '#fff' : '#888', padding: '0 4px', borderBottom: current === a.id ? '2px solid #fff' : '2px solid transparent', height: 46, whiteSpace: 'nowrap', flexShrink: 0 }}>
            {a.label}
          </button>
        ))}
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 11, color: '#666', flexShrink: 0 }}>{perfil?.nombre}</span>
        <button onClick={onLogout} style={{ fontSize: 11, color: '#888', background: 'none', border: 'none', cursor: 'pointer', flexShrink: 0 }}>Salir</button>
      </div>
      <div>{children}</div>
    </div>
  )
}

// ─── Login ───────────────────────────────────────────────────
function LoginScreen() {
  const [tab, setTab]       = useState('login')
  const [mail, setMail]     = useState('')
  const [pass, setPass]     = useState('')
  const [nombre, setNombre] = useState('')
  const [loading, setLoading] = useState(false)
  const [msg, setMsg]       = useState('')

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
    <div style={{ ...s.sans, minHeight: '100vh', background: '#f9f9f9', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ background: '#fff', border: '1px solid #e5e5e5', borderRadius: 16, padding: '32px 28px', width: '100%', maxWidth: 380 }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ width: 48, height: 48, background: '#111', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, margin: '0 auto 12px', color: '#fff', fontWeight: 700 }}>N</div>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#111' }}>NPL Sistema</h1>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: '#888' }}>Ingeniería Civil</p>
        </div>
        <div style={{ display: 'flex', border: '1px solid #e5e5e5', borderRadius: 10, overflow: 'hidden', marginBottom: 20 }}>
          {[['login', 'Ingresar'], ['registro', 'Registrarse']].map(([id, label]) => (
            <button key={id} onClick={() => { setTab(id); setMsg('') }}
              style={{ flex: 1, padding: '8px', fontSize: 13, fontWeight: 600, background: tab === id ? '#111' : '#fff', color: tab === id ? '#fff' : '#888', border: 'none', cursor: 'pointer' }}>
              {label}
            </button>
          ))}
        </div>
        {tab === 'registro' && (
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#666', marginBottom: 5 }}>Nombre completo</label>
            <input style={s.inp} value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Tu nombre" />
          </div>
        )}
        <div style={{ marginBottom: 14 }}>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#666', marginBottom: 5 }}>Email</label>
          <input style={s.inp} type="email" value={mail} onChange={e => setMail(e.target.value)} placeholder="tu@mail.com" />
        </div>
        <div style={{ marginBottom: 20 }}>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#666', marginBottom: 5 }}>Contraseña</label>
          <input style={s.inp} type="password" value={pass} onChange={e => setPass(e.target.value)} placeholder="••••••••"
            onKeyDown={e => e.key === 'Enter' && (tab === 'login' ? login() : registro())} />
        </div>
        {msg && <p style={{ fontSize: 13, color: msg.includes('exitoso') ? '#3B6D11' : '#c00', marginBottom: 14, textAlign: 'center' }}>{msg}</p>}
        <button onClick={tab === 'login' ? login : registro} disabled={loading}
          style={{ width: '100%', padding: '13px', fontSize: 15, fontWeight: 700, borderRadius: 10, border: 'none', background: loading ? '#aaa' : '#111', color: '#fff', cursor: loading ? 'not-allowed' : 'pointer' }}>
          {loading ? 'Cargando...' : tab === 'login' ? 'Ingresar' : 'Crear cuenta'}
        </button>
      </div>
    </div>
  )
}

// ─── Pantalla pendiente ───────────────────────────────────────
function PendienteScreen({ onLogout, perfil }) {
  return (
    <div style={{ ...s.sans, minHeight: '100vh', background: '#f9f9f9', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ background: '#fff', border: '1px solid #e5e5e5', borderRadius: 16, padding: '32px 28px', width: '100%', maxWidth: 380, textAlign: 'center' }}>
        <div style={{ fontSize: 40, marginBottom: 16 }}>⏳</div>
        <h2 style={{ margin: '0 0 8px', fontSize: 18, fontWeight: 700, color: '#111' }}>Cuenta pendiente</h2>
        <p style={{ margin: '0 0 24px', fontSize: 14, color: '#888', lineHeight: 1.5 }}>
          Tu cuenta fue creada correctamente. El administrador de NPL debe activarla y asignarte un rol antes de que puedas acceder.
        </p>
        <p style={{ margin: '0 0 24px', fontSize: 12, color: '#aaa' }}>{perfil?.mail}</p>
        <button onClick={onLogout} style={{ padding: '10px 24px', fontSize: 14, fontWeight: 600, borderRadius: 10, border: '1px solid #e5e5e5', background: '#fff', color: '#555', cursor: 'pointer' }}>
          Cerrar sesión
        </button>
      </div>
    </div>
  )
}

// ─── Panel de usuarios ────────────────────────────────────────
function Usuarios({ session }) {
  const [users, setUsers]     = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving]   = useState(false)
  const [msg, setMsg]         = useState('')
  const [form, setForm]       = useState({ nombre: '', email: '', password: '', rol: 'calculista' })

  useEffect(() => { cargar() }, [])

  const cargar = async () => {
    const { data } = await supabase.from('perfiles').select('*').order('created_at', { ascending: false })
    setUsers(data || [])
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
    { value: 'admin',      label: 'Admin' },
    { value: 'jefe_obra',  label: 'Jefe de Obra' },
    { value: 'calculista', label: 'Calculista' },
    { value: 'pendiente',  label: 'Pendiente' },
  ]

  return (
    <div style={{ fontFamily: 'system-ui, -apple-system, sans-serif', padding: '24px 20px', maxWidth: 800, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 20 }}>
        <div>
          <p style={{ margin: 0, fontSize: 12, color: '#999', fontWeight: 500 }}>NPL · Admin</p>
          <h1 style={{ margin: '2px 0 0', fontSize: 22, fontWeight: 700, color: '#111' }}>Gestión de usuarios</h1>
        </div>
        <button onClick={() => { setShowForm(!showForm); setMsg('') }}
          style={{ padding: '9px 18px', fontSize: 13, fontWeight: 600, background: '#111', color: '#fff', border: 'none', borderRadius: 10, cursor: 'pointer' }}>
          {showForm ? 'Cancelar' : '+ Nuevo usuario'}
        </button>
      </div>

      {/* Formulario nuevo usuario */}
      {showForm && (
        <div style={{ background: '#f9f9f9', border: '1px solid #e5e5e5', borderRadius: 14, padding: 20, marginBottom: 20 }}>
          <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 600 }}>Nuevo usuario</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#666', marginBottom: 5 }}>Nombre completo *</label>
              <input style={s.inp} value={form.nombre} onChange={e => setForm(p => ({ ...p, nombre: e.target.value }))} placeholder="Nombre y apellido" />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#666', marginBottom: 5 }}>Email *</label>
              <input style={s.inp} type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} placeholder="usuario@mail.com" />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#666', marginBottom: 5 }}>Contraseña *</label>
              <input style={s.inp} type="password" value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))} placeholder="Mínimo 6 caracteres" />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#666', marginBottom: 5 }}>Rol *</label>
              <select style={{ ...s.inp }} value={form.rol} onChange={e => setForm(p => ({ ...p, rol: e.target.value }))}>
                {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </div>
          </div>
          {msg && <p style={{ fontSize: 13, color: msg.startsWith('✓') ? '#3B6D11' : '#c00', margin: '0 0 12px' }}>{msg}</p>}
          <button onClick={crearUsuario} disabled={saving}
            style={{ padding: '10px 24px', fontSize: 14, fontWeight: 600, background: saving ? '#aaa' : '#111', color: '#fff', border: 'none', borderRadius: 10, cursor: saving ? 'not-allowed' : 'pointer' }}>
            {saving ? 'Creando...' : 'Crear usuario'}
          </button>
        </div>
      )}

      {msg && !showForm && <p style={{ fontSize: 13, color: '#3B6D11', marginBottom: 16 }}>{msg}</p>}

      {loading && <p style={{ color: '#aaa' }}>Cargando...</p>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {users.map(u => (
          <div key={u.id} style={{ background: '#fff', border: '1px solid #e5e5e5', borderRadius: 12, padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
            <div>
              <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: '#111' }}>{u.nombre || '—'}</p>
              <p style={{ margin: '2px 0 0', fontSize: 12, color: '#888' }}>{u.mail}</p>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <select value={u.rol} onChange={e => actualizar(u.id, 'rol', e.target.value)}
                style={{ fontSize: 12, padding: '5px 8px', border: '1px solid #e5e5e5', borderRadius: 8, background: '#f9f9f9', cursor: 'pointer' }}>
                {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
              <button onClick={() => actualizar(u.id, 'activo', !u.activo)}
                style={{ fontSize: 12, padding: '5px 12px', borderRadius: 8, border: 'none', cursor: 'pointer', background: u.activo ? '#EAF3DE' : '#f5f5f5', color: u.activo ? '#3B6D11' : '#888', fontWeight: 600 }}>
                {u.activo ? '✓ Activo' : 'Inactivo'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
