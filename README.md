# NPL Sistema — Documentación técnica

Sistema interno de gestión para NPL Ingeniería Civil.  
Desarrollado con React + Vite → GitHub → Vercel + Supabase.

---

## Stack

| Capa | Tecnología | URL |
|------|-----------|-----|
| Frontend | React + Vite | — |
| Hosting | Vercel | npl-sistema.vercel.app |
| Repositorio | GitHub | github.com/ricardocorbetta/npl-sistema |
| Backend / DB | Supabase | imkmosifqxzbtqgzssst.supabase.co |

---

## Usuarios y roles

| Rol | Acceso | Ejemplo |
|-----|--------|---------|
| `admin` | Todo el sistema | Ricardo, Lucas |
| `jefe_obra` | Solo módulo Obras (mobile) | Yonyali |
| `calculista` | Dashboard + Proyectos | Joaco, Cami |

La gestión de usuarios se hace desde **Usuarios** en la app.  
Internamente usa una Edge Function `crear-usuario` que llama a la Supabase Auth Admin API con la service role key.

---

## Módulos

### Dashboard
Panel de control general. KPIs cruzados de proyectos y obras.

### Proyectos
Kanban de proyectos de ingeniería estructural.  
Tabla: `proyectos`

### Presupuestos
Pipeline de presupuestos y seguimiento comercial.  
Tabla: `presupuestos` (módulo `App.jsx`)

### Calculistas
Gestión del equipo de calculistas y postulantes.  
Tabla: `calculistas`

### CRM
Gestión de clientes y contactos (148 contactos cargados).  
Tablas: `clientes`, `cliente_contactos`

### Obras
Módulo de seguimiento diario de obras en construcción.  
Dos vistas según rol:
- **Admin (desktop):** dashboard de avance por obra, tareas editables por etapa, historial de partes
- **Jefe de obra (mobile):** tabs Tareas / Parte del día / Eventos

### Biblioteca
Recetario de rubros y tareas reutilizables para armar obras nuevas.  
Soporta múltiples sistemas constructivos (Steel Frame, Wood Frame).  
Filtros por sistema y por alcance de obra.

---

## Tablas Supabase

### Módulo Obras

```
obras_campo
  id, nombre, cliente, direccion
  jefe_id → auth.users
  sistema_constructivo ('Steel Frame' | 'Wood Frame' | ...)
  alcance ('solo_estructura' | 'fundaciones_estructura' | 'obra_completa')
  fecha_inicio_plan, fecha_fin_plan, fecha_inicio_real, fecha_fin_real
  estado ('activa' | 'pausada' | 'finalizada')
  notas, created_at

tareas_obra
  id, obra_id → obras_campo
  nombre, etapa, descripcion
  orden, fecha_inicio_plan, fecha_fin_plan
  created_at

partes_diarios
  id, obra_id → obras_campo
  fecha (UNIQUE con obra_id)
  jefe_id → auth.users
  clima ('bueno' | 'nublado' | 'lluvia' | 'viento' | 'helada')
  horas_trabajadas, personal_cantidad, observaciones
  created_at

eventos_parte
  id, parte_id → partes_diarios
  tipo ('remito' | 'paralizacion' | 'visita' | 'incidente' | 'otro')
  descripcion, proveedor, numero_remito, conforme
  dias_perdidos, created_at

avances_tarea
  id, parte_id → partes_diarios, tarea_id → tareas_obra
  porcentaje (0-100)
  UNIQUE(parte_id, tarea_id)
  created_at
```

### Módulo Biblioteca

```
biblioteca_rubros
  id, nombre, descripcion, orden, color
  sistema_constructivo ('Steel Frame' | 'Wood Frame' | 'Ambos')
  aplica_alcance (text[]) → ['solo_estructura', 'fundaciones_estructura', 'obra_completa']
  activo, created_at

biblioteca_tareas
  id, rubro_id → biblioteca_rubros
  nombre (coloquial), nombre_tecnico
  descripcion, criterio_aceptacion
  duracion_tipica_dias, gremio
  orden, activo, created_at

biblioteca_subtareas
  id, tarea_id → biblioteca_tareas
  nombre, descripcion
  orden, activo, created_at
```

### Usuarios y perfiles

```
perfiles
  id → auth.users
  nombre, mail, rol, activo
  created_at
```

---

## Edge Functions (Supabase)

| Nombre | Descripción |
|--------|-------------|
| `crear-usuario` | Crea un usuario en Auth + perfil en `perfiles`. Solo admin puede llamarla. |
| `listar-usuarios` | Lista todos los perfiles. Usa service role key para bypassear RLS. |

URL base: `https://imkmosifqxzbtqgzssst.supabase.co/functions/v1/`

---

## Etapas de obra (Steel Frame)

| Etapa | Color | Alcances |
|-------|-------|---------|
| Fundaciones | 🔴 #ef4444 | fundaciones, completa |
| Arranque | 🟣 #6366f1 | todos |
| Estructura SF | 🟡 #f59e0b | todos |
| Estructura WF | 🟤 #92400e | todos |
| Exterior | 🔵 #3b82f6 | todos |
| Cubierta | 💜 #8b5cf6 | todos |
| Interior | 🟢 #10b981 | completa |
| Terminaciones | 🩷 #ec4899 | completa |
| Instalaciones | 🩵 #14b8a6 | completa |

---

## Obras activas

| ID | Nombre | Sistema | Alcance | Jefe |
|----|--------|---------|---------|------|
| a100...001 | 531 - Vivienda Abasto Steel Frame | Steel Frame | Solo estructura | Yonyali |
| a100...002 | 1167 - Quincho Alfonsina | Steel Frame | Fundaciones + estructura | — |
| a100...003 | 555 - Ampliación Ceci y Mili | Steel Frame | Obra completa | — |

---

## Archivos del proyecto

```
src/
├── main.jsx          # Entry point
├── supabase.js       # Cliente Supabase (ANON_KEY actual)
├── Root.jsx          # Auth, routing por rol, navbar
├── App.jsx           # Módulo Presupuestos
├── Dashboard.jsx     # Módulo Dashboard
├── Proyectos.jsx     # Módulo Proyectos (Kanban)
├── Calculistas.jsx   # Módulo Calculistas
├── CRM.jsx           # Módulo CRM
├── Obras.jsx         # Módulo Obras (admin + jefe_obra)
├── Biblioteca.jsx    # Módulo Biblioteca de obra
└── Legajos.jsx       # OBSOLETO — reemplazado por Proyectos
```

---

## Pendientes

- [ ] Conectar Biblioteca con creación de obras (armar obra desde recetario)
- [ ] Historial de avances por tarea (quién cambió qué y cuándo)
- [ ] Exportar parte diario a PDF
- [ ] Notificaciones cuando el jefe carga el parte
- [ ] IA: recomendaciones de orden y duración de tareas
- [ ] Actualizar ANON_KEY en App.jsx, CRM.jsx, Calculistas.jsx, Dashboard.jsx, Proyectos.jsx
- [ ] Dashboard KPIs cruzados (Proyectos + Obras + CRM)

---

## Decisiones de diseño

**¿Por qué `obras_campo` y no renombrar `obras`?**  
La tabla `obras` ya existía con otra estructura (legajos). Renombrarla rompía triggers. Se creó `obras_campo` como tabla nueva limpia.

**¿Por qué Edge Functions para crear usuarios?**  
Crear usuarios requiere la `service_role_key` que no puede estar en el frontend. La Edge Function actúa como intermediario seguro.

**¿Por qué el avance de tareas se guarda por parte diario?**  
Para tener historial: se puede saber qué avance registró cada jefe cada día, no solo el estado actual.

**¿Por qué dos sistemas constructivos en la biblioteca?**  
NPL trabaja principalmente en Steel Frame pero tiene proyectos en Wood Frame. La biblioteca filtra por sistema para que cada obra vea solo las tareas relevantes.

---

## Historial de sesiones

### Sesión 1 — Setup inicial
- Creación del repo y estructura base
- Módulos Dashboard, Presupuestos, CRM, Calculistas

### Sesión 2 — Proyectos y auth
- Módulo Proyectos (Kanban)
- Sistema de autenticación con roles
- Panel de Usuarios básico

### Sesión 3 — Módulo Obras v1
- Diseño del módulo Obras
- Tablas Supabase: obras_campo, tareas_obra, partes_diarios, eventos_parte, avances_tarea
- Vista Jefe (mobile) y Vista Admin (desktop)

### Sesión 4 (hoy) — Obras funcional + Biblioteca
- Edge Functions: crear-usuario, listar-usuarios
- Panel de Usuarios con creación desde la app
- Obras: responsive mobile/desktop, tareas por etapa con colores
- Carga de obras y tareas de la obra 531 (Yonyali)
- Biblioteca: Steel Frame + Wood Frame, filtros por sistema y alcance
- README.md (este archivo)
