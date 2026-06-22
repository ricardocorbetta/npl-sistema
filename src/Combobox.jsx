import React, { useState, useRef, useEffect } from "react";

/**
 * Combobox con búsqueda reutilizable
 * Props:
 *   options: [{ value, label }]
 *   value: string (value seleccionado)
 *   onChange: (value, label) => void
 *   placeholder: string
 *   emptyLabel: string (texto cuando no hay selección)
 *   disabled: bool
 */
export default function Combobox({ options = [], value, onChange, placeholder = "Buscar...", emptyLabel = "Sin selección", disabled = false }) {
  const [query,    setQuery]    = useState("");
  const [open,     setOpen]     = useState(false);
  const [focused,  setFocused]  = useState(false);
  const inputRef = useRef();
  const wrapRef  = useRef();

  // Label del valor actual
  const selectedLabel = options.find(o => o.value === value)?.label || "";

  // Filtrar opciones
  const filtered = options.filter(o =>
    o.label.toLowerCase().includes(query.toLowerCase())
  ).slice(0, 50); // max 50 resultados

  // Cerrar al click fuera
  useEffect(() => {
    function handleClick(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setOpen(false);
        setQuery("");
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function seleccionar(opt) {
    onChange(opt.value, opt.label);
    setQuery("");
    setOpen(false);
    inputRef.current?.blur();
  }

  function limpiar(e) {
    e.stopPropagation();
    onChange("", "");
    setQuery("");
  }

  return (
    <div ref={wrapRef} style={{ position: "relative", width: "100%" }}>
      {/* Input de búsqueda */}
      <div style={{
        display: "flex", alignItems: "center",
        border: `1px solid ${open || focused ? "#111" : "#e0e0e0"}`,
        borderRadius: 10, background: disabled ? "#f8f8f8" : "#fff",
        transition: "border-color .15s",
        overflow: "hidden",
      }}>
        <input
          ref={inputRef}
          value={open ? query : selectedLabel}
          onChange={e => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => { setFocused(true); setOpen(true); setQuery(""); }}
          onBlur={() => setFocused(false)}
          placeholder={open ? placeholder : (selectedLabel || emptyLabel)}
          disabled={disabled}
          style={{
            flex: 1, padding: "10px 12px", border: "none", outline: "none",
            fontSize: 14, background: "transparent", color: open && !query && selectedLabel ? "#aaa" : "#111",
          }}
        />
        {/* Botón limpiar */}
        {value && !disabled && (
          <button onClick={limpiar} style={{ padding: "0 10px", background: "none", border: "none", cursor: "pointer", color: "#aaa", fontSize: 16, lineHeight: 1 }}>
            ✕
          </button>
        )}
        {/* Flecha */}
        <div onClick={() => { if (!disabled) { setOpen(!open); if (!open) inputRef.current?.focus(); } }}
          style={{ padding: "0 12px", cursor: "pointer", color: "#aaa", fontSize: 12 }}>
          {open ? "▲" : "▼"}
        </div>
      </div>

      {/* Dropdown */}
      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0,
          background: "#fff", border: "1px solid #e0e0e0", borderRadius: 10,
          boxShadow: "0 8px 24px rgba(0,0,0,.12)", zIndex: 1000,
          maxHeight: 240, overflowY: "auto",
        }}>
          {/* Opción vacía */}
          <div
            onClick={() => seleccionar({ value: "", label: "" })}
            style={{
              padding: "10px 14px", cursor: "pointer", fontSize: 13, color: "#aaa",
              borderBottom: "1px solid #f0f0f0",
              background: !value ? "#f8f8f8" : "#fff",
            }}
          >{emptyLabel}</div>

          {filtered.length === 0 ? (
            <div style={{ padding: "12px 14px", fontSize: 13, color: "#aaa", textAlign: "center" }}>
              Sin resultados para "{query}"
            </div>
          ) : filtered.map(opt => (
            <div
              key={opt.value}
              onClick={() => seleccionar(opt)}
              style={{
                padding: "10px 14px", cursor: "pointer", fontSize: 14,
                background: opt.value === value ? "#f0f0f0" : "#fff",
                fontWeight: opt.value === value ? 600 : 400,
                borderBottom: "1px solid #f8f8f8",
              }}
              onMouseEnter={e => e.currentTarget.style.background = "#f5f5f5"}
              onMouseLeave={e => e.currentTarget.style.background = opt.value === value ? "#f0f0f0" : "#fff"}
            >
              {opt.label}
            </div>
          ))}

          {filtered.length === 50 && (
            <div style={{ padding: "8px 14px", fontSize: 11, color: "#aaa", textAlign: "center", borderTop: "1px solid #f0f0f0" }}>
              Mostrando 50 resultados — escribí para filtrar más
            </div>
          )}
        </div>
      )}
    </div>
  );
}
