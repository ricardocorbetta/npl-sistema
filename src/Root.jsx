import React, { useState } from 'react'
import App from './App.jsx'
import Legajos from './Legajos.jsx'
import Calculistas from './Calculistas.jsx'
import CRM from './CRM.jsx'

const APPS = [
  { id: 'presupuestos',  label: 'Presupuestos', icon: '📋', desc: 'Pipeline y seguimiento' },
  { id: 'legajos',       label: 'Legajos',      icon: '🗂️', desc: 'Proyectos y etapas' },
  { id: 'calculistas',   label: 'Calculistas',  icon: '👷', desc: 'Equipo y postulantes' },
  { id: 'crm',           label: 'Clientes',     icon: '👥', desc: '148 contactos' },
]

const s = {
  sans: { fontFamily: 'system-ui, -apple-system, sans-serif' },
}

export default function Root() {
  const [current, setCurrent] = useState(null)

  if (current === 'presupuestos') return <Layout current={current} onNav={setCurrent}><App /></Layout>
  if (current === 'legajos')      return <Layout current={current} onNav={setCurrent}><Legajos /></Layout>
  if (current === 'calculistas') return <Layout current={current} onNav={setCurrent}><Calculistas /></Layout>
  if (current === 'crm') return <Layout current={current} onNav={setCurrent}><CRM /></Layout>

  // Home
  return (
    <div style={{ ...s.sans, minHeight: '100vh', background: '#f9f9f9', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ marginBottom: 32, textAlign: 'center' }}>
        <div style={{ width: 48, height: 48, background: '#111', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, margin: '0 auto 12px', color: '#fff', fontWeight: 700 }}>N</div>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: '#111' }}>NPL Sistema</h1>
        <p style={{ margin: '6px 0 0', fontSize: 14, color: '#888' }}>Seleccioná una aplicación</p>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, width: '100%', maxWidth: 500 }}>
        {APPS.map(a => (
          <button key={a.id} onClick={() => setCurrent(a.id)}
            style={{ background: '#fff', border: '1px solid #e5e5e5', borderRadius: 12, padding: '20px 16px', cursor: 'pointer', textAlign: 'left', transition: 'border-color .15s' }}
            onMouseEnter={e => e.currentTarget.style.borderColor = '#111'}
            onMouseLeave={e => e.currentTarget.style.borderColor = '#e5e5e5'}>
            <div style={{ fontSize: 24, marginBottom: 8 }}>{a.icon}</div>
            <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: '#111' }}>{a.label}</p>
            <p style={{ margin: '2px 0 0', fontSize: 12, color: '#888' }}>{a.desc}</p>
          </button>
        ))}
      </div>
    </div>
  )
}

function Layout({ current, onNav, children }) {
  const app = APPS.find(a => a.id === current)
  return (
    <div style={{ ...s.sans, minHeight: '100vh', background: '#fff' }}>
      {/* Navbar */}
      <div style={{ background: '#111', padding: '0 20px', display: 'flex', alignItems: 'center', gap: 16, height: 44 }}>
        <button onClick={() => onNav(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#fff', fontWeight: 700, fontSize: 15, padding: 0 }}>N</button>
        <div style={{ width: 1, height: 20, background: '#333' }} />
        {APPS.map(a => (
          <button key={a.id} onClick={() => onNav(a.id)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 500, color: current === a.id ? '#fff' : '#888', padding: '0 4px', borderBottom: current === a.id ? '2px solid #fff' : '2px solid transparent', height: 44 }}>
            {a.label}
          </button>
        ))}
      </div>
      {/* Contenido */}
      <div>{children}</div>
    </div>
  )
}
