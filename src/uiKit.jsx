import React from "react";

/* ════════════════════════════════════════════
   NPL SISTEMA — UI KIT COMPARTIDO
   Importar en cada módulo: import { COLORS, shared, KpiCard, Badge, SectionHeader, EstadoBar } from "./uiKit.jsx";
════════════════════════════════════════════ */

/* ─── Paleta funcional ─── */
export const COLORS = {
  text:      "#111",
  textSoft:  "#555",
  textMuted: "#888",
  textFaint: "#aaa",
  border:    "#e0e0e0",
  bgApp:     "#f5f5f7",
  bgCard:    "#fff",
  bgSoft:    "#f8f8f8",

  // Funcionales — significan algo siempre
  success: "#22c55e",
  warning: "#f59e0b",
  danger:  "#ef4444",
  info:    "#3b82f6",
  accent:  "#6366f1", // marca / interactivo destacado

  // Semáforo (mismo significado en todos los módulos)
  semaforo: { verde: "#22c55e", amarillo: "#f59e0b", rojo: "#ef4444" },
};

/* ─── Tipografía / espaciado base ─── */
export const TYPE = {
  fontFamily: "system-ui, -apple-system, sans-serif",
  h1:   { fontSize: 22, fontWeight: 700 },
  h2:   { fontSize: 16, fontWeight: 700 },
  kpi:  { fontSize: 26, fontWeight: 800 },
  body: { fontSize: 13, fontWeight: 400 },
  meta: { fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: .5 },
};

/* ─── Estilos base reutilizables ─── */
export const shared = {
  btn: {
    padding: "10px 18px", background: COLORS.text, color: "#fff", border: "none",
    borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: "pointer",
  },
  btnSm: {
    padding: "7px 12px", background: "#f0f0f0", color: "#333", border: "none",
    borderRadius: 8, fontSize: 13, cursor: "pointer",
  },
  btnAccent: {
    padding: "10px 18px", background: COLORS.accent, color: "#fff", border: "none",
    borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: "pointer",
  },
  inp: {
    width: "100%", padding: "10px 12px", border: `1px solid ${COLORS.border}`,
    borderRadius: 10, fontSize: 14, boxSizing: "border-box",
  },
  card: {
    background: COLORS.bgCard, borderRadius: 14, padding: 16,
    boxShadow: "0 1px 6px rgba(0,0,0,.07)",
  },
  lbl: {
    fontSize: 11, color: COLORS.textMuted, fontWeight: 600,
    textTransform: "uppercase", letterSpacing: .5, marginBottom: 5, display: "block",
  },
  page: {
    fontFamily: TYPE.fontFamily, padding: "24px", maxWidth: 1100, margin: "0 auto",
  },
};

/* ════════════════════════════════════════════
   HEADER DE MÓDULO — título + acción primaria
   Uso: <SectionHeader icon="🏗️" title="Obras" action={{label:"+ Nueva obra", onClick:...}} />
════════════════════════════════════════════ */
export function SectionHeader({ icon, title, subtitle, action }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
      <div>
        {subtitle && <p style={{ margin: 0, fontSize: 12, color: COLORS.textFaint, fontWeight: 500 }}>{subtitle}</p>}
        <h1 style={{ margin: "2px 0 0", fontSize: 22, fontWeight: 700, color: COLORS.text }}>
          {icon} {title}
        </h1>
      </div>
      {action && (
        <button onClick={action.onClick} style={shared.btn}>{action.label}</button>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════
   KPI CARD — mismo look en todos los módulos
   Uso: <KpiCard label="Avance" value="45%" color={COLORS.success} sub="ponderado" icon="📊" />
════════════════════════════════════════════ */
export function KpiCard({ label, value, sub, color = COLORS.accent, icon }) {
  return (
    <div style={{ background: COLORS.bgCard, borderRadius: 14, padding: "16px 16px", boxShadow: "0 1px 6px rgba(0,0,0,.07)", borderTop: `4px solid ${color}` }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ fontSize: 26, fontWeight: 800, color }}>{value}</div>
          <div style={{ fontSize: 12, fontWeight: 600, color: COLORS.textSoft, marginTop: 2 }}>{label}</div>
          {sub && <div style={{ fontSize: 11, color: COLORS.textFaint, marginTop: 3 }}>{sub}</div>}
        </div>
        {icon && <span style={{ fontSize: 24, opacity: .3 }}>{icon}</span>}
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════
   KPI GRID — fila de KpiCards responsive
   Uso: <KpiGrid items={[{label,value,color,icon}, ...]} />
════════════════════════════════════════════ */
export function KpiGrid({ items, columns = 4 }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: `repeat(${columns}, 1fr)`, gap: 12, marginBottom: 24 }}>
      {items.map((k, i) => <KpiCard key={i} {...k} />)}
    </div>
  );
}

/* ════════════════════════════════════════════
   BADGE — etiqueta con fondo translúcido del color
   Uso: <Badge color={COLORS.success} label="Disponible" icon="✅" />
════════════════════════════════════════════ */
export function Badge({ color = COLORS.textMuted, label, icon, size = "md" }) {
  const sizes = {
    sm: { fontSize: 10, padding: "2px 6px" },
    md: { fontSize: 11, padding: "3px 8px" },
    lg: { fontSize: 12, padding: "4px 10px" },
  };
  return (
    <span style={{
      ...sizes[size], background: color + "18", color, borderRadius: 6, fontWeight: 600,
      display: "inline-flex", alignItems: "center", gap: 4, whiteSpace: "nowrap",
    }}>
      {icon} {label}
    </span>
  );
}

/* ════════════════════════════════════════════
   SEMÁFORO BADGE — específico para estado de obra/proyecto
   Uso: <SemaforoBadge estado="verde" labels={{verde:"En tiempo",...}} />
════════════════════════════════════════════ */
export function SemaforoBadge({ estado, labels }) {
  const color = COLORS.semaforo[estado] || COLORS.textMuted;
  const defaultLabels = { verde: "✅ En tiempo", amarillo: "⚠️ Leve desvío", rojo: "🔴 Atrasada" };
  const label = (labels || defaultLabels)[estado] || "Sin datos";
  return (
    <span style={{ background: color + "22", color, borderRadius: 20, padding: "4px 12px", fontSize: 12, fontWeight: 700 }}>
      {label}
    </span>
  );
}

/* ════════════════════════════════════════════
   BARRA DE PROGRESO — comparativa real vs teórico
   Uso: <ProgressBar valor={45} max={100} color={COLORS.success} label="Avance real" />
════════════════════════════════════════════ */
export function ProgressBar({ valor = 0, max = 100, color = COLORS.accent, label, showValue = true, height = 7 }) {
  const pct = max > 0 ? Math.min(100, Math.round((valor / max) * 100)) : 0;
  return (
    <div style={{ marginBottom: label ? 8 : 0 }}>
      {label && (
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: COLORS.textMuted, marginBottom: 3 }}>
          <span>{label}</span>
          {showValue && <span style={{ fontWeight: 700, color }}>{pct}%</span>}
        </div>
      )}
      <div style={{ height, background: "#f0f0f0", borderRadius: height, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${pct}%`, background: color, transition: "width .4s" }} />
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════
   ACORDEÓN GENÉRICO — header clickeable + contenido colapsable
   Uso: <Acordeon icon="🟡" label="Onboarding" color={COLORS.warning} count={3} defaultOpen={true}>...</Acordeon>
════════════════════════════════════════════ */
export function Acordeon({ icon, label, color = COLORS.accent, count, defaultOpen = true, children }) {
  const [abierto, setAbierto] = React.useState(defaultOpen);
  return (
    <div style={{ borderRadius: 14, overflow: "hidden", boxShadow: "0 1px 5px rgba(0,0,0,.06)", marginBottom: 10 }}>
      <div onClick={() => setAbierto(!abierto)}
        style={{ display: "flex", alignItems: "center", gap: 10, padding: "13px 16px", background: color + "18", cursor: "pointer", userSelect: "none", borderLeft: `4px solid ${color}` }}>
        {icon && <span style={{ fontSize: 16 }}>{icon}</span>}
        <span style={{ fontWeight: 700, fontSize: 14, color, flex: 1 }}>{label}</span>
        {count !== undefined && (
          <span style={{ fontSize: 12, color, fontWeight: 700, background: color + "22", borderRadius: 20, padding: "2px 10px" }}>{count}</span>
        )}
        <span style={{ fontSize: 13, color, marginLeft: 4, transition: "transform .2s", display: "inline-block", transform: abierto ? "rotate(0deg)" : "rotate(-90deg)" }}>▼</span>
      </div>
      {abierto && <div style={{ background: COLORS.bgApp, padding: "10px 10px 4px" }}>{children}</div>}
    </div>
  );
}

/* ════════════════════════════════════════════
   EMPTY STATE — mensaje + acción cuando no hay datos
   Uso: <EmptyState message="Sin obras todavía." actionLabel="+ Crear obra" onAction={...} />
════════════════════════════════════════════ */
export function EmptyState({ message, actionLabel, onAction }) {
  return (
    <div style={{ textAlign: "center", padding: "48px 20px", color: COLORS.textFaint }}>
      <p style={{ fontSize: 14, marginBottom: actionLabel ? 16 : 0 }}>{message}</p>
      {actionLabel && <button onClick={onAction} style={shared.btn}>{actionLabel}</button>}
    </div>
  );
}

/* ════════════════════════════════════════════
   TOAST / MENSAJE INLINE — confirmaciones
   Uso: {msg && <Toast tipo="success" texto={msg} />}
════════════════════════════════════════════ */
export function Toast({ tipo = "success", texto }) {
  const styles = {
    success: { bg: "#d4edda", color: "#155724" },
    warning: { bg: "#fff3cd", color: "#856404" },
    error:   { bg: "#fef2f2", color: "#dc2626" },
  };
  const s = styles[tipo] || styles.success;
  return (
    <div style={{ background: s.bg, color: s.color, borderRadius: 8, padding: "8px 12px", marginBottom: 14, fontSize: 13 }}>
      {texto}
    </div>
  );
}

/* ════════════════════════════════════════════
   FILTER BAR — fila de selects/búsqueda consistente
   Uso: <FilterBar><input .../><select .../></FilterBar>
════════════════════════════════════════════ */
export function FilterBar({ children, resultCount }) {
  return (
    <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap", alignItems: "center" }}>
      {children}
      {resultCount !== undefined && (
        <span style={{ fontSize: 12, color: COLORS.textFaint, marginLeft: "auto" }}>{resultCount} resultados</span>
      )}
    </div>
  );
}

export default { COLORS, TYPE, shared, SectionHeader, KpiCard, KpiGrid, Badge, SemaforoBadge, ProgressBar, Acordeon, EmptyState, Toast, FilterBar };
