import { useEffect, useState } from 'react'

interface NumberFieldProps {
  label: string
  value: number
  onChange: (value: number) => void
  step?: number
  min?: number
  max?: number
  unit?: string
  digits?: number
}

/**
 * Numeric input that keeps its own text while typing and commits on
 * Enter/blur, so values from the store never fight the caret.
 */
export function NumberField({
  label,
  value,
  onChange,
  step = 0.05,
  min,
  max,
  unit = 'm',
  digits = 2,
}: NumberFieldProps) {
  const [text, setText] = useState(value.toFixed(digits))
  const [editing, setEditing] = useState(false)

  useEffect(() => {
    if (!editing) setText(value.toFixed(digits))
  }, [value, editing, digits])

  const commit = (raw: string = text) => {
    setEditing(false)
    const parsed = Number.parseFloat(raw)
    if (!Number.isFinite(parsed)) {
      setText(value.toFixed(digits))
      return
    }
    let next = parsed
    if (min !== undefined) next = Math.max(min, next)
    if (max !== undefined) next = Math.min(max, next)
    onChange(next)
    setText(next.toFixed(digits))
  }

  return (
    <label className="field">
      <span className="field-label">{label}</span>
      <span className="field-input">
        <input
          type="number"
          step={step}
          value={text}
          onFocus={() => setEditing(true)}
          onChange={(e) => setText(e.target.value)}
          onBlur={(e) => commit(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              // Commit straight away: waiting for the blur that follows would
              // drop the edit if the field is unmounted by the re-render.
              commit(e.currentTarget.value)
              e.currentTarget.blur()
            }
          }}
        />
        {unit && <span className="unit">{unit}</span>}
      </span>
    </label>
  )
}

export function TextField({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (value: string) => void
}) {
  const [text, setText] = useState(value)
  const [editing, setEditing] = useState(false)
  useEffect(() => {
    if (!editing) setText(value)
  }, [value, editing])
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      <span className="field-input">
        <input
          value={text}
          onFocus={() => setEditing(true)}
          onChange={(e) => setText(e.target.value)}
          onBlur={(e) => {
            setEditing(false)
            onChange(e.target.value)
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              setEditing(false)
              onChange(e.currentTarget.value)
              e.currentTarget.blur()
            }
          }}
        />
      </span>
    </label>
  )
}

export function ColorField({
  label,
  value,
  onChange,
  swatches,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  swatches?: string[]
}) {
  return (
    <div className="field color-field">
      <span className="field-label">{label}</span>
      <span className="field-input">
        <input type="color" value={value} onChange={(e) => onChange(e.target.value)} />
        {swatches && (
          <span className="swatches">
            {swatches.map((color) => (
              <button
                key={color}
                type="button"
                className={`swatch${color.toLowerCase() === value.toLowerCase() ? ' active' : ''}`}
                style={{ background: color }}
                onClick={() => onChange(color)}
                title={color}
              />
            ))}
          </span>
        )}
      </span>
    </div>
  )
}

export function SelectField<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: T
  options: { value: T; label: string }[]
  onChange: (value: T) => void
}) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      <span className="field-input">
        <select value={value} onChange={(e) => onChange(e.target.value as T)}>
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </span>
    </label>
  )
}

export function Row({ children }: { children: React.ReactNode }) {
  return <div className="field-row">{children}</div>
}
