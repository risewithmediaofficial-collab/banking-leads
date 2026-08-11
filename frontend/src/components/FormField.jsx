import { formatCurrency } from '../engine/fieldEngine'

/**
 * Universal FormField renderer
 * Handles: text, textarea, number, currency, date, year, phone, email,
 *          select, radio, boolean, calculated, percentage
 */
function FormField({ field, value, onChange, computedValues }) {
  const displayValue = field.type === 'calculated' ? (computedValues?.[field.key] ?? value) : value
  const isReadonly = field.type === 'calculated' || field.readonly

  const base = `form-input${isReadonly ? ' form-input-readonly' : ''}`

  const handleChange = (e) => {
    if (isReadonly) return
    onChange(field.key, e.target.value)
  }

  const handleBoolChange = (e) => {
    onChange(field.key, e.target.value === 'true')
  }

  // ─── Boolean / Yes-No radio ───
  if (field.type === 'boolean') {
    const boolVal = value === true || value === 'true'
    return (
      <div className="bool-field">
        <label className="bool-option">
          <input type="radio" name={field.key} value="true" checked={boolVal === true} onChange={handleBoolChange} />
          <span>Yes</span>
        </label>
        <label className="bool-option">
          <input type="radio" name={field.key} value="false" checked={boolVal === false} onChange={handleBoolChange} />
          <span>No</span>
        </label>
      </div>
    )
  }

  // ─── Select dropdown ───
  if (field.type === 'select') {
    return (
      <select className="form-select" value={value || ''} onChange={handleChange} disabled={isReadonly}>
        <option value="">— Select —</option>
        {(field.options || []).map((opt) => (
          <option key={opt} value={opt}>{opt}</option>
        ))}
      </select>
    )
  }

  // ─── Textarea ───
  if (field.type === 'textarea') {
    return (
      <textarea
        className={`form-textarea${isReadonly ? ' form-input-readonly' : ''}`}
        value={value || ''}
        onChange={handleChange}
        readOnly={isReadonly}
        rows={3}
        placeholder={field.placeholder || field.label}
      />
    )
  }

  // ─── Calculated (read-only display) ───
  if (field.type === 'calculated') {
    const num = parseFloat(displayValue || 0)
    return (
      <div className="calculated-field">
        <span className="calculated-value">{isNaN(num) ? '—' : formatCurrency(num)}</span>
        <span className="calculated-badge">Auto</span>
      </div>
    )
  }

  // ─── Currency ───
  if (field.type === 'currency') {
    return (
      <div className="currency-field">
        <span className="currency-prefix">₹</span>
        <input
          className={`${base} currency-input`}
          type="number"
          min="0"
          step="0.01"
          value={value || ''}
          onChange={handleChange}
          readOnly={isReadonly}
          placeholder="0.00"
        />
      </div>
    )
  }

  // ─── Percentage ───
  if (field.type === 'percentage') {
    return (
      <div className="currency-field">
        <input
          className={`${base} currency-input`}
          type="number"
          min="0"
          max="100"
          step="0.01"
          value={value || ''}
          onChange={handleChange}
          placeholder="0.00"
        />
        <span className="currency-prefix">%</span>
      </div>
    )
  }

  // ─── Phone ───
  if (field.type === 'phone') {
    return (
      <input
        className={base}
        type="tel"
        value={value || ''}
        onChange={handleChange}
        readOnly={isReadonly}
        placeholder="Mobile number"
        maxLength={15}
      />
    )
  }

  // ─── Email ───
  if (field.type === 'email') {
    return (
      <input
        className={base}
        type="email"
        value={value || ''}
        onChange={handleChange}
        readOnly={isReadonly}
        placeholder="Email address"
      />
    )
  }

  // ─── Date ───
  if (field.type === 'date') {
    return (
      <input
        className={base}
        type="date"
        value={value || ''}
        onChange={handleChange}
        readOnly={isReadonly}
      />
    )
  }

  // ─── Year ───
  if (field.type === 'year') {
    return (
      <input
        className={base}
        type="number"
        min="1900"
        max={new Date().getFullYear()}
        value={value || ''}
        onChange={handleChange}
        placeholder="YYYY"
      />
    )
  }

  // ─── Number ───
  if (field.type === 'number') {
    return (
      <input
        className={base}
        type="number"
        min="0"
        step="1"
        value={value || ''}
        onChange={handleChange}
        readOnly={isReadonly}
        placeholder="0"
      />
    )
  }

  // ─── Default: text ───
  return (
    <input
      className={base}
      type="text"
      value={value || ''}
      onChange={handleChange}
      readOnly={isReadonly}
      placeholder={field.placeholder || field.label}
    />
  )
}

export default FormField
