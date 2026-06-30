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
   SECTION HEADER — título de módulo, sin repetir marca
   (la marca "NPL" ya vive en el nav global superior)
   Uso: <SectionHeader icon="🏗️" title="Obras" action={{label:"+ Nueva obra", onClick:...}} palette={palette} />
════════════════════════════════════════════ */
export function SectionHeader({ icon, title, subtitle, action, palette = LIGHT }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
      <div>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: palette.text, letterSpacing: -0.3, display: "flex", alignItems: "center", gap: 8 }}>
          {icon && <span style={{ fontSize: 20 }}>{icon}</span>}
          {title}
        </h1>
        {subtitle && <p style={{ margin: "4px 0 0", fontSize: 12.5, color: palette.textMuted, fontWeight: 500 }}>{subtitle}</p>}
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

/* ════════════════════════════════════════════
   GLOBAL SEARCH — command palette (Cmd+K) sobre vista_busqueda_global
   Uso: <GlobalSearch palette={palette} onNavegar={(tipo, id) => ...} />
════════════════════════════════════════════ */
const SUPA_URL_KIT = "https://imkmosifqxzbtqgzssst.supabase.co/rest/v1";
const ANON_KEY_KIT = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlta21vc2lmcXh6YnRxZ3pzc3N0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkxODk4NTUsImV4cCI6MjA5NDc2NTg1NX0.5gtCs8Yv3vDSrKxAmXSr3zjWJ5HjimCKejfO-XrHPss";

const TIPO_META = {
  presupuesto: { icon: "💰", label: "Presupuesto", modulo: "presupuestos" },
  proyecto:    { icon: "📋", label: "Proyecto",    modulo: "proyectos" },
  obra:        { icon: "🏗️", label: "Obra",         modulo: "obras" },
};

export function GlobalSearch({ palette = LIGHT, onNavegar }) {
  const [open, setOpen] = React.useState(false);
  const [q, setQ] = React.useState("");
  const [resultados, setResultados] = React.useState([]);
  const [loading, setLoading] = React.useState(false);
  const inputRef = React.useRef();

  // Atajo Cmd+K / Ctrl+K
  React.useEffect(() => {
    function onKey(e) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen(true);
      }
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  React.useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50);
    else { setQ(""); setResultados([]); }
  }, [open]);

  React.useEffect(() => {
    if (!q || q.length < 2) { setResultados([]); return; }
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const tk = (await import("./supabase.js")).supabase;
        const { data: { session } } = await tk.auth.getSession();
        const token = session?.access_token || ANON_KEY_KIT;
        const headers = { apikey: ANON_KEY_KIT, Authorization: `Bearer ${token}` };
        const qEnc = encodeURIComponent(`%${q}%`);
        const r = await fetch(
          `${SUPA_URL_KIT}/vista_busqueda_global?or=(codigo.ilike.${qEnc},titulo.ilike.${qEnc},cliente.ilike.${qEnc})&limit=15&order=created_at.desc`,
          { headers }
        ).then(r => r.json());
        setResultados(Array.isArray(r) ? r : []);
      } catch (e) { setResultados([]); }
      setLoading(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [q]);

  return (
    <>
      <button onClick={() => setOpen(true)} style={{
        display: "flex", alignItems: "center", gap: 8, background: palette.bgSoft,
        border: `1px solid ${palette.border}`, borderRadius: 8, padding: "6px 10px",
        cursor: "pointer", color: palette.textMuted, fontSize: 12,
      }}>
        <span>🔍</span>
        <span>Buscar…</span>
        <span style={{ fontFamily: FONT_MONO, fontSize: 10, background: palette.border, padding: "1px 5px", borderRadius: 4, marginLeft: 4 }}>⌘K</span>
      </button>

      {open && (
        <div onClick={() => setOpen(false)} style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,.5)", zIndex: 500,
          display: "flex", alignItems: "flex-start", justifyContent: "center", paddingTop: "12vh",
        }}>
          <div onClick={e => e.stopPropagation()} style={{
            background: palette.bgCard, borderRadius: 14, width: "100%", maxWidth: 560,
            border: `1.5px solid ${palette.border}`, overflow: "hidden", maxHeight: "70vh", display: "flex", flexDirection: "column",
          }}>
            <div style={{ padding: "14px 16px", borderBottom: `1px solid ${palette.border}`, display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ color: palette.textFaint }}>🔍</span>
              <input
                ref={inputRef}
                value={q}
                onChange={e => setQ(e.target.value)}
                placeholder="Buscar por código, cliente, descripción…"
                style={{ flex: 1, border: "none", outline: "none", fontSize: 14, background: "transparent", color: palette.text }}
              />
              <span style={{ fontSize: 10, color: palette.textFaint, fontFamily: FONT_MONO }}>ESC</span>
            </div>
            <div style={{ overflowY: "auto", flex: 1 }}>
              {loading && <div style={{ padding: 20, textAlign: "center", color: palette.textFaint, fontSize: 13 }}>Buscando…</div>}
              {!loading && q.length >= 2 && resultados.length === 0 && (
                <div style={{ padding: 20, textAlign: "center", color: palette.textFaint, fontSize: 13 }}>Sin resultados.</div>
              )}
              {!loading && q.length < 2 && (
                <div style={{ padding: 20, textAlign: "center", color: palette.textFaint, fontSize: 13 }}>Escribí al menos 2 caracteres…</div>
              )}
              {resultados.map(r => {
                const meta = TIPO_META[r.tipo] || { icon: "📄", label: r.tipo, modulo: r.tipo };
                return (
                  <div key={`${r.tipo}-${r.id}`}
                    onClick={() => { setOpen(false); onNavegar && onNavegar(meta.modulo, r.id, r.tipo); }}
                    style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 16px", cursor: "pointer", borderBottom: `1px solid ${palette.border}` }}
                    onMouseEnter={e => e.currentTarget.style.background = palette.bgSoft}
                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                    <span style={{ fontSize: 18, flexShrink: 0 }}>{meta.icon}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: palette.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.titulo}</div>
                      <div style={{ fontSize: 11, color: palette.textMuted, display: "flex", gap: 6, alignItems: "center", marginTop: 1 }}>
                        {r.codigo && <span style={{ fontFamily: FONT_MONO }}>[{r.codigo}]</span>}
                        {r.cliente && <span>· {r.cliente}</span>}
                      </div>
                    </div>
                    <span style={{ fontSize: 10, fontWeight: 700, color: palette.textFaint, textTransform: "uppercase", flexShrink: 0 }}>{meta.label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/* ════════════════════════════════════════════
   FLOW BREADCRUMB — señalética de ubicación en el flujo
   Presupuesto → Proyecto → Obra, con el paso actual resaltado
   Uso: <FlowBreadcrumb actual="proyecto" tiene={{presupuesto:true, proyecto:true, obra:false}}
          codigo="2026-SF-531" onClick={(paso) => ...} palette={palette} />
════════════════════════════════════════════ */
export function FlowBreadcrumb({ actual, tiene = {}, codigo, onClick, palette = LIGHT }) {
  const pasos = [
    { id: "presupuesto", label: "Presupuesto", icon: "💰" },
    { id: "proyecto",    label: "Proyecto",    icon: "📋" },
    { id: "obra",        label: "Obra",        icon: "🏗️" },
  ];
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 16, flexWrap: "wrap" }}>
      {codigo && (
        <span style={{ fontFamily: FONT_MONO, fontSize: 11, color: palette.textFaint, marginRight: 8, fontWeight: 700 }}>
          [ {codigo} ]
        </span>
      )}
      {pasos.map((p, i) => {
        const activo = p.id === actual;
        const existe = tiene[p.id];
        const clickable = existe && onClick;
        return (
          <React.Fragment key={p.id}>
            {i > 0 && <span style={{ color: palette.textFaint, fontSize: 12 }}>→</span>}
            <div
              onClick={() => clickable && onClick(p.id)}
              style={{
                display: "flex", alignItems: "center", gap: 5, padding: "4px 10px", borderRadius: 20,
                background: activo ? palette.bgInverse : existe ? palette.bgSoft : "transparent",
                color: activo ? palette.textInverse : existe ? palette.text : palette.textFaint,
                fontSize: 11.5, fontWeight: activo ? 800 : 600,
                border: existe && !activo ? `1px solid ${palette.border}` : "1px solid transparent",
                cursor: clickable ? "pointer" : "default",
                opacity: existe ? 1 : 0.45,
              }}>
              <span>{p.icon}</span>
              <span>{p.label}</span>
              {activo && <span style={{ width: 5, height: 5, borderRadius: "50%", background: palette.textInverse, marginLeft: 2 }} />}
            </div>
          </React.Fragment>
        );
      })}
    </div>
  );
}


export default {
  COLORS, FUNC, FONT_MONO, FONT_SANS, shared, makeShared, useTheme, NplFontLoader,
  ThemeToggle, SectionHeader, KpiCard, KpiGrid, Badge, CodeTag, SemaforoBadge,
  ProgressBar, Acordeon, EmptyState, Toast, FilterBar, GlobalSearch, FlowBreadcrumb,
};
