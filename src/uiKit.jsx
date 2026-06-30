import React from "react";

/* ════════════════════════════════════════════
   NPL SISTEMA — UI KIT
   Identidad: monocromo NPL (negro/blanco), brackets [ ] como
   acento de marca, JetBrains Mono para datos técnicos (códigos,
   porcentajes, fechas), color solo para semántica de estado.
   Soporta modo claro / oscuro vía atributo data-theme en <html>.
════════════════════════════════════════════ */

/* ─── Fuente monoespaciada (cargar una vez, en Root.jsx idealmente) ─── */
export function NplFontLoader() {
  return (
    <link
      rel="stylesheet"
      href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@500;700;800&family=Inter:wght@400;500;600;700;800;900&display=swap"
    />
  );
}

/* ─── Paleta — light / dark ─── */
const LIGHT = {
  text:      "#0a0a0a",
  textSoft:  "#444",
  textMuted: "#888",
  textFaint: "#aaa",
  border:    "#e8e8e8",
  borderStrong: "#d4d4d4",
  bgApp:     "#f4f4f4",
  bgCard:    "#fff",
  bgSoft:    "#f7f7f7",
  bgInverse: "#0a0a0a",
  textInverse: "#fff",
};
const DARK = {
  text:      "#f4f4f4",
  textSoft:  "#cfcfcf",
  textMuted: "#9a9a9a",
  textFaint: "#777",
  border:    "#262626",
  borderStrong: "#333",
  bgApp:     "#0a0a0a",
  bgCard:    "#141414",
  bgSoft:    "#1a1a1a",
  bgInverse: "#f4f4f4",
  textInverse: "#0a0a0a",
};

/* ─── Hook de tema — persiste en localStorage, default claro ─── */
export function useTheme() {
  const [theme, setTheme] = React.useState(() => {
    try { return localStorage.getItem("npl_theme") || "light"; } catch { return "light"; }
  });
  React.useEffect(() => {
    try { localStorage.setItem("npl_theme", theme); } catch {}
  }, [theme]);
  const toggle = () => setTheme(t => t === "light" ? "dark" : "light");
  const palette = theme === "dark" ? DARK : LIGHT;
  return { theme, toggle, palette };
}

/* ─── Funcionales — mismas en ambos modos (legibilidad sobre fondo claro/oscuro) ─── */
export const FUNC = {
  success: "#1a8a5e",
  warning: "#c4781a",
  danger:  "#c0392b",
  info:    "#2563a8",
  accent:  "#0a0a0a", // el "acento" de NPL es el propio negro/blanco, no un color de marca
  semaforo: { verde: "#1a8a5e", amarillo: "#c4781a", rojo: "#c0392b" },
};

/* ─── COLORS legacy-compat: para no romper imports existentes, exportamos
   un objeto plano basado en LIGHT + FUNC. Los módulos que usan useTheme()
   deben preferir `palette` en vez de este export estático. ─── */
export const COLORS = { ...LIGHT, ...FUNC };

export const FONT_MONO = "'JetBrains Mono', 'SF Mono', Consolas, monospace";
export const FONT_SANS = "'Inter', system-ui, -apple-system, sans-serif";

/* ─── Estilos base — toman palette como parámetro opcional ─── */
export function makeShared(p = LIGHT) {
  return {
    btn: {
      padding: "10px 18px", background: p.bgInverse, color: p.textInverse, border: "none",
      borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: "pointer",
    },
    btnSm: {
      padding: "7px 12px", background: p.bgSoft, color: p.text, border: `1px solid ${p.border}`,
      borderRadius: 8, fontSize: 13, cursor: "pointer", fontWeight: 500,
    },
    inp: {
      width: "100%", padding: "10px 12px", border: `1.5px solid ${p.border}`, background: p.bgCard,
      color: p.text, borderRadius: 10, fontSize: 14, boxSizing: "border-box",
    },
    card: {
      background: p.bgCard, borderRadius: 12, padding: 16,
      border: `1.5px solid ${p.border}`,
    },
    lbl: {
      fontSize: 11, color: p.textMuted, fontWeight: 700,
      textTransform: "uppercase", letterSpacing: .8, marginBottom: 5, display: "block",
    },
    page: {
      fontFamily: FONT_SANS, padding: "24px", maxWidth: 1100, margin: "0 auto", color: p.text,
    },
    mono: { fontFamily: FONT_MONO },
  };
}
// Export estático para compatibilidad con código existente (modo claro fijo)
export const shared = makeShared(LIGHT);

/* ════════════════════════════════════════════
   THEME TOGGLE — switcher claro/oscuro
   Uso: <ThemeToggle theme={theme} onToggle={toggle} />
════════════════════════════════════════════ */
export function ThemeToggle({ theme, onToggle, palette = LIGHT }) {
  return (
    <div onClick={onToggle} style={{
      display: "flex", gap: 3, alignItems: "center", background: palette.bgSoft,
      borderRadius: 8, padding: 3, cursor: "pointer", border: `1px solid ${palette.border}`, width: "fit-content",
    }}>
      <div style={{
        width: 28, height: 26, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 13, background: theme === "light" ? palette.bgCard : "transparent",
        boxShadow: theme === "light" ? "0 1px 2px rgba(0,0,0,.12)" : "none",
      }}>☀</div>
      <div style={{
        width: 28, height: 26, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 13, color: theme === "dark" ? palette.text : palette.textFaint,
        background: theme === "dark" ? palette.bgCard : "transparent",
        boxShadow: theme === "dark" ? "0 1px 2px rgba(0,0,0,.3)" : "none",
      }}>☾</div>
    </div>
  );
}

/* ════════════════════════════════════════════
   SECTION HEADER — marca NPL + brackets + título
   Uso: <SectionHeader icon="🏗️" title="Obras" action={{label:"+ Nueva obra", onClick:...}} palette={palette} />
════════════════════════════════════════════ */
export function SectionHeader({ icon, title, subtitle, action, palette = LIGHT, showBrand = true }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
      <div>
        {showBrand && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
            <span style={{ fontSize: 13, fontWeight: 900, color: palette.text, letterSpacing: -0.5 }}>NPL</span>
            <div style={{ width: 1, height: 12, background: palette.borderStrong }} />
            <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.5, color: palette.textMuted, textTransform: "uppercase", fontFamily: FONT_MONO }}>
              [ {title} ]
            </span>
          </div>
        )}
        {subtitle && <p style={{ margin: "2px 0 0", fontSize: 12, color: palette.textFaint, fontWeight: 500 }}>{subtitle}</p>}
        <h1 style={{ margin: showBrand ? "2px 0 0" : 0, fontSize: 22, fontWeight: 800, color: palette.text, letterSpacing: -0.3 }}>
          {icon} {title}
        </h1>
      </div>
      {action && (
        <button onClick={action.onClick} style={makeShared(palette).btn}>{action.label}</button>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════
   KPI CARD — número en mono, fondo invertido opcional para impacto
   Uso: <KpiCard label="Avance" value="45%" color={FUNC.success} sub="ponderado" invert palette={palette} />
════════════════════════════════════════════ */
export function KpiCard({ label, value, sub, color, icon, invert = false, palette = LIGHT }) {
  const bg = invert ? palette.bgInverse : palette.bgCard;
  const txtMain = invert ? palette.textInverse : (color || palette.text);
  const txtLabel = invert ? (palette.theme === "dark" ? "#9a9a9a" : "#999") : palette.textMuted;
  return (
    <div style={{
      background: bg, borderRadius: 12, padding: "16px 16px",
      border: invert ? "none" : `1.5px solid ${palette.border}`,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ fontSize: 24, fontWeight: 900, color: txtMain, fontFamily: FONT_MONO, letterSpacing: -1 }}>{value}</div>
          <div style={{ fontSize: 10.5, fontWeight: 700, color: txtLabel, marginTop: 4, textTransform: "uppercase", letterSpacing: 0.5 }}>{label}</div>
          {sub && <div style={{ fontSize: 11, color: invert ? "#777" : palette.textFaint, marginTop: 3 }}>{sub}</div>}
        </div>
        {icon && <span style={{ fontSize: 22, opacity: invert ? .6 : .25 }}>{icon}</span>}
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════
   KPI GRID — primera card invertida (impacto), resto neutras
   Uso: <KpiGrid items={[{label,value,color,icon}, ...]} palette={palette} />
════════════════════════════════════════════ */
export function KpiGrid({ items, columns = 4, palette = LIGHT, firstInverted = true }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: `repeat(${columns}, 1fr)`, gap: 10, marginBottom: 24 }}>
      {items.map((k, i) => <KpiCard key={i} {...k} invert={firstInverted && i === 0} palette={palette} />)}
    </div>
  );
}

/* ════════════════════════════════════════════
   BADGE — etiqueta de estado, texto en mono cuando es numérico/código
   Uso: <Badge color={FUNC.success} label="Disponible" icon="✅" palette={palette} />
════════════════════════════════════════════ */
export function Badge({ color, label, icon, size = "md", mono = false, palette = LIGHT }) {
  const c = color || palette.textMuted;
  const sizes = {
    sm: { fontSize: 10, padding: "2px 6px" },
    md: { fontSize: 11, padding: "3px 8px" },
    lg: { fontSize: 12, padding: "4px 10px" },
  };
  return (
    <span style={{
      ...sizes[size], background: c + "1a", color: c, borderRadius: 6, fontWeight: 700,
      display: "inline-flex", alignItems: "center", gap: 4, whiteSpace: "nowrap",
      fontFamily: mono ? FONT_MONO : FONT_SANS,
    }}>
      {icon} {label}
    </span>
  );
}

/* ════════════════════════════════════════════
   CODE TAG — para códigos de obra/proyecto, estilo "[ 2026-SF-531 ]"
   Uso: <CodeTag value="2026-SF-531" palette={palette} />
════════════════════════════════════════════ */
export function CodeTag({ value, palette = LIGHT }) {
  if (!value) return null;
  return (
    <span style={{
      fontFamily: FONT_MONO, fontSize: 10, fontWeight: 700, color: palette.textFaint,
      letterSpacing: 0.5,
    }}>
      [ {value} ]
    </span>
  );
}

/* ════════════════════════════════════════════
   SEMÁFORO BADGE
   Uso: <SemaforoBadge estado="verde" palette={palette} />
════════════════════════════════════════════ */
export function SemaforoBadge({ estado, labels, palette = LIGHT }) {
  const color = FUNC.semaforo[estado] || palette.textMuted;
  const defaultLabels = { verde: "EN TIEMPO", amarillo: "LEVE DESVÍO", rojo: "ATRASADA" };
  const label = (labels || defaultLabels)[estado] || "SIN DATOS";
  return (
    <span style={{ background: color, color: "#fff", borderRadius: 6, padding: "5px 10px", fontSize: 10, fontWeight: 800, letterSpacing: 0.5 }}>
      {label}
    </span>
  );
}

/* ════════════════════════════════════════════
   PROGRESS BAR — sólido negro/blanco por defecto, color si se especifica
   Uso: <ProgressBar valor={45} max={100} label="Avance real" palette={palette} />
════════════════════════════════════════════ */
export function ProgressBar({ valor = 0, max = 100, color, label, showValue = true, height = 6, palette = LIGHT }) {
  const pct = max > 0 ? Math.min(100, Math.round((valor / max) * 100)) : 0;
  const barColor = color || palette.bgInverse;
  return (
    <div style={{ marginBottom: label ? 8 : 0 }}>
      {label && (
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: palette.textMuted, marginBottom: 4 }}>
          <span>{label}</span>
          {showValue && <span style={{ fontWeight: 800, color: barColor, fontFamily: FONT_MONO }}>{pct}%</span>}
        </div>
      )}
      <div style={{ height, background: palette.bgSoft, borderRadius: height, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${pct}%`, background: barColor, transition: "width .4s" }} />
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════
   ACORDEÓN
   Uso: <Acordeon icon="🟡" label="Onboarding" color={FUNC.warning} count={3} palette={palette}>...</Acordeon>
════════════════════════════════════════════ */
export function Acordeon({ icon, label, color, count, defaultOpen = true, children, palette = LIGHT }) {
  const [abierto, setAbierto] = React.useState(defaultOpen);
  const c = color || palette.text;
  return (
    <div style={{ borderRadius: 12, overflow: "hidden", border: `1.5px solid ${palette.border}`, marginBottom: 10 }}>
      <div onClick={() => setAbierto(!abierto)}
        style={{ display: "flex", alignItems: "center", gap: 10, padding: "13px 16px", background: c + "12", cursor: "pointer", userSelect: "none", borderLeft: `3px solid ${c}` }}>
        {icon && <span style={{ fontSize: 16 }}>{icon}</span>}
        <span style={{ fontWeight: 800, fontSize: 13, color: c, flex: 1, textTransform: "uppercase", letterSpacing: 0.5 }}>{label}</span>
        {count !== undefined && (
          <span style={{ fontSize: 11, color: c, fontWeight: 800, background: c + "1f", borderRadius: 20, padding: "2px 10px", fontFamily: FONT_MONO }}>{count}</span>
        )}
        <span style={{ fontSize: 12, color: c, marginLeft: 4, transition: "transform .2s", display: "inline-block", transform: abierto ? "rotate(0deg)" : "rotate(-90deg)" }}>▼</span>
      </div>
      {abierto && <div style={{ background: palette.bgApp, padding: "10px 10px 4px" }}>{children}</div>}
    </div>
  );
}

/* ════════════════════════════════════════════
   EMPTY STATE
════════════════════════════════════════════ */
export function EmptyState({ message, actionLabel, onAction, palette = LIGHT }) {
  return (
    <div style={{ textAlign: "center", padding: "48px 20px", color: palette.textFaint }}>
      <p style={{ fontSize: 14, marginBottom: actionLabel ? 16 : 0 }}>{message}</p>
      {actionLabel && <button onClick={onAction} style={makeShared(palette).btn}>{actionLabel}</button>}
    </div>
  );
}

/* ════════════════════════════════════════════
   TOAST
════════════════════════════════════════════ */
export function Toast({ tipo = "success", texto, palette = LIGHT }) {
  const styles = {
    success: { bg: FUNC.success + "1a", color: FUNC.success },
    warning: { bg: FUNC.warning + "1a", color: FUNC.warning },
    error:   { bg: FUNC.danger + "1a", color: FUNC.danger },
  };
  const s = styles[tipo] || styles.success;
  return (
    <div style={{ background: s.bg, color: s.color, borderRadius: 8, padding: "8px 12px", marginBottom: 14, fontSize: 13, fontWeight: 600 }}>
      {texto}
    </div>
  );
}

/* ════════════════════════════════════════════
   FILTER BAR
════════════════════════════════════════════ */
export function FilterBar({ children, resultCount, palette = LIGHT }) {
  return (
    <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap", alignItems: "center" }}>
      {children}
      {resultCount !== undefined && (
        <span style={{ fontSize: 11, color: palette.textFaint, marginLeft: "auto", fontFamily: FONT_MONO }}>{resultCount}</span>
      )}
    </div>
  );
}

export default {
  COLORS, FUNC, FONT_MONO, FONT_SANS, shared, makeShared, useTheme, NplFontLoader,
  ThemeToggle, SectionHeader, KpiCard, KpiGrid, Badge, CodeTag, SemaforoBadge,
  ProgressBar, Acordeon, EmptyState, Toast, FilterBar,
};
