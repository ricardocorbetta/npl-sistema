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
| `jefe_obra` | Solo módulo Obras mobile | Yonyali |
| `calculista` | Dashboard + Proyectos | Joaco, Cami |

---

## Módulos

### Dashboard
Panel de control general. Usa vista `dashboard_resumen`.

### Proyectos
Kanban de proyectos de ingeniería estructural.
- Encargado vinculado a tabla `calculistas` via Combobox
- Vínculos: `cliente_id` → clientes, `presupuesto_id` → presupuestos

### Presupuestos (`App.jsx`)
Pipeline comercial con tipos de servicio.
- Tipos: `calculo`, `calculo_obra`, `obra`, `auditoria`, `certificacion`, `otro`
- Cliente vinculado al CRM con opción de crear cliente nuevo inline
- Selector de estado inline en la lista

### Calculistas
Gestión del equipo. Campo `freelance` (bool) + `tipo` (interno/externo).

### CRM
Gestión de clientes. Campo clave: `empresa` (no `nombre`).

### Obras
Módulo de seguimiento diario de obras en construcción.

**Vista Admin (desktop + mobile responsive):**
- Dashboard de avance por obra con %
- Hamburguesa ☰ para editar obra con todos los vínculos
- Selector de responsable desplegable en la lista
- Tareas agrupadas por etapa con botones de % editables
- Archivos adjuntos por tarea (fotos/videos/audios)

**Vista Jefe de obra (mobile):**
- Tabs: Tareas / Parte del día / Eventos
- Panel bottom sheet al tocar tarea: % + nota + adjuntar archivo
- Upload a Supabase Storage bucket `npl-obras`

### Biblioteca
Recetario de rubros y tareas reutilizables.
- Sistemas: Steel Frame, Wood Frame, Ambos
- Alcances: solo estructura, fundaciones + estructura, obra completa
- 3 niveles: Rubro → Tarea → Pasos/subtareas
- Cada tarea tiene: nombre coloquial, nombre técnico, descripción, criterio de aceptación, gremio, días típicos

---

## Tablas Supabase

### Core
```
perfiles
  id → auth.users, nombre, mail, rol, activo

clientes
  id, empresa, contacto, mail, wsp, ciudad, tipo, created_at

calculistas
  id, nombre, estudio, freelance, tipo (interno/externo)
  nivel, ciudad, mail, wsp, disponible, sistemas, puntaje...

proyectos
  id, numero_proyecto, descripcion, cliente (texto), encargado (texto)
  cliente_id → clientes, presupuesto_id → presupuestos
  estado, categoria, anticipo, check_diagnostico, proyecto_ok
  entregado, cobrado, proxima_tarea, drive_url

presupuestos
  id, codigo, cliente (texto), cliente_id → clientes
  tipo (texto legacy), tipo_servicio (calculo|calculo_obra|obra|auditoria|certificacion|otro)
  descripcion, superficie, monto, moneda, estado, probabilidad
  fecha_emision, fecha_vencimiento, calculista (texto), obs
```

### Módulo Obras
```
obras_campo
  id, codigo (2026-SF-531), nombre, cliente (texto)
  cliente_id → clientes, proyecto_id → proyectos
  presupuesto_id → presupuestos
  jefe_id → auth.users (principal, legacy)
  sistema_constructivo, alcance
  fecha_inicio_plan, fecha_fin_plan, fecha_inicio_real, fecha_fin_real
  estado (activa|pausada|finalizada), notas

obra_responsables
  id, obra_id → obras_campo, perfil_id → perfiles
  rubro (texto libre), es_principal

tareas_obra
  id, obra_id → obras_campo, nombre, etapa, descripcion
  orden, fecha_inicio_plan, fecha_fin_plan

partes_diarios
  id, obra_id → obras_campo, fecha (UNIQUE con obra_id)
  jefe_id → auth.users, clima, horas_trabajadas
  personal_cantidad, observaciones

eventos_parte
  id, parte_id → partes_diarios
  tipo (remito|paralizacion|visita|incidente|otro)
  descripcion, proveedor, numero_remito, conforme, dias_perdidos

avances_tarea
  id, parte_id → partes_diarios, tarea_id → tareas_obra
  porcentaje (0-100), nota
  UNIQUE(parte_id, tarea_id)

archivos_avance
  id, avance_id → avances_tarea
  tipo (foto|video|audio), url, nombre_archivo, storage_path
```

### Biblioteca
```
biblioteca_rubros
  id, nombre, descripcion, orden, color
  sistema_constructivo (Steel Frame|Wood Frame|Ambos)
  aplica_alcance (text[])

biblioteca_tareas
  id, rubro_id → biblioteca_rubros
  nombre, nombre_tecnico, descripcion, criterio_aceptacion
  duracion_tipica_dias, gremio, orden

biblioteca_subtareas
  id, tarea_id → biblioteca_tareas
  nombre, descripcion, orden
```

### Relaciones N:N
```
proyecto_calculistas
  id, proyecto_id → proyectos, calculista_id → calculistas
  rol (principal|colaborador|revisor)

obra_responsables
  id, obra_id → obras_campo, perfil_id → perfiles
  rubro, es_principal
```

---

## Edge Functions

| Nombre | Descripción |
|--------|-------------|
| `crear-usuario` | Crea usuario en Auth + perfil. Solo admin. |
| `listar-usuarios` | Lista todos los perfiles. Bypasea RLS. |

---

## Vistas SQL

| Vista | Descripción |
|-------|-------------|
| `dashboard_obras` | Obras con avance %, jefe, cliente, proyecto, presupuesto |
| `dashboard_resumen` | KPIs globales: obras activas, proyectos, presupuestos, partes hoy |

---

## Storage

Bucket: `npl-obras` (privado)
Estructura: `obras/{codigo_obra}/{fecha}/{tipo}/archivo`
Tipos: `fotos`, `videos`, `audios`
URLs firmadas con expiración de 1 hora.

---

## Flujo de negocio NPL

```
CLIENTE (CRM)
    └── PRESUPUESTO (tipo_servicio define el flujo)
            ├── calculo        → PROYECTO → calculistas
            ├── calculo_obra   → PROYECTO + OBRA → calculistas + jefe obra
            ├── obra           → OBRA → jefe obra
            ├── auditoria      → OBRA (revisión)
            └── certificacion  → PROYECTO (revisión)
```

---

## Codificación de obras

Formato: `[AÑO]-[SISTEMA]-[NÚMERO]`
- `2026-SF-531` — Steel Frame
- `2026-WF-xxx` — Wood Frame

---

## Etapas de obra

| Etapa | Color | Aplica a |
|-------|-------|---------|
| Fundaciones | 🔴 #ef4444 | fundaciones, completa |
| Arranque | 🟣 #6366f1 | todos |
| Estructura SF | 🟡 #f59e0b | todos (Steel Frame) |
| Estructura WF | 🟤 #92400e | todos (Wood Frame) |
| Exterior | 🔵 #3b82f6 | todos |
| Cubierta | 💜 #8b5cf6 | todos |
| Interior | 🟢 #10b981 | obra completa |
| Terminaciones | 🩷 #ec4899 | obra completa |
| Instalaciones | 🩵 #14b8a6 | obra completa |

---

## Obras activas

| Código | Nombre | Sistema | Alcance | Responsable |
|--------|--------|---------|---------|-------------|
| 2026-SF-531 | Vivienda Abasto Steel Frame | Steel Frame | Solo estructura | Yonyali |
| 2026-SF-1167 | Quincho Alfonsina | Steel Frame | Fundaciones + estructura | — |
| 2026-SF-555 | Ampliación Ceci y Mili | Steel Frame | Obra completa | — |

---

## Archivos del proyecto

```
src/
├── main.jsx           # Entry point
├── supabase.js        # Cliente Supabase (ANON_KEY vigente)
├── Root.jsx           # Auth, routing por rol, navbar, gestión usuarios
├── Combobox.jsx       # Componente selector con búsqueda reutilizable
├── App.jsx            # Módulo Presupuestos
├── Dashboard.jsx      # Módulo Dashboard
├── Proyectos.jsx      # Módulo Proyectos (Kanban)
├── Calculistas.jsx    # Módulo Calculistas
├── CRM.jsx            # Módulo CRM
├── Obras.jsx          # Módulo Obras (admin + jefe_obra)
├── Biblioteca.jsx     # Módulo Biblioteca de obra
└── Legajos.jsx        # OBSOLETO
```

---

## Componente Combobox

Selector con búsqueda reutilizable. Props:
```jsx
<Combobox
  options={[{ value: "id", label: "Texto visible" }]}
  value={valorSeleccionado}
  onChange={(value, label) => ...}
  placeholder="Buscar..."
  emptyLabel="Sin selección"
  disabled={false}
/>
```
Usado en: Presupuestos (cliente), Proyectos (encargado, cliente CRM, presupuesto), Obras modal ☰ (cliente, proyecto, presupuesto).

---

## RLS — Reglas importantes

- `perfiles` → `USING (true)` — todos los autenticados leen todos los perfiles
- `obras_campo` → admin ve todo, jefe_obra solo su obra (`jefe_id = auth.uid()`)
- `biblioteca_*` → todos leen, solo admin escribe
- `partes_diarios` → jefe inserta solo los suyos, admin ve todo
- `archivos_avance` → jefe sube solo a sus avances, admin ve todo

---

## Pendientes

- [ ] Conectar Biblioteca con creación de obras (armar obra desde recetario)
- [ ] Historial de avances por tarea con timeline
- [ ] Exportar parte diario a PDF
- [ ] Notificaciones cuando el jefe carga el parte
- [ ] IA: recomendaciones de orden y duración de tareas
- [ ] Dashboard KPIs cruzados con rentabilidad
- [ ] Certificaciones de avance vinculadas a presupuesto
- [ ] Actualizar ANON_KEY en módulos legacy (CRM, Calculistas, Dashboard)
- [ ] Completar vínculos en obras (calculista)

---

## Historial de sesiones

### Sesión 1-2 — Setup + módulos base
Setup repo, Dashboard, Presupuestos, CRM, Calculistas, auth con roles.

### Sesión 3 — Proyectos y usuarios
Módulo Proyectos (Kanban), sistema de autenticación con roles, panel de Usuarios con Edge Functions.

### Sesión 4 — Módulo Obras v1
Tablas Supabase para obras de campo, vista Jefe mobile y Admin desktop, obras 531/1167/555 cargadas.

### Sesión 5 — Biblioteca + sistemas constructivos
Biblioteca Steel Frame + Wood Frame con filtros por sistema y alcance. 8 rubros, 55+ tareas normalizadas.

### Sesión 6 (hoy) — Cruces + Combobox + Presupuestos
- Cruces entre módulos: obras ↔ clientes, proyectos, presupuestos
- Tipos de servicio en presupuestos (calculo, calculo_obra, obra, auditoria, certificacion)
- Combobox reutilizable con búsqueda en tiempo real
- Presupuestos: cliente inline, tipo de servicio visual
- Proyectos: encargado desde calculistas DB, vínculos CRM y presupuesto
- Obras: hamburguesa ☰ editable, selector responsable inline, archivos adjuntos por tarea
- Storage bucket npl-obras para fotos/videos/audios desde mobile
- RLS corregida en perfiles, clientes, calculistas, presupuestos, proyectos
- README actualizado
