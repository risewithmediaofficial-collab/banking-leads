import { createTableRow } from '../engine/fieldEngine'
import { formatCurrency } from '../engine/fieldEngine'

/**
 * DynamicTable — renders a dynamic add/remove-row table
 * Used for: Floor Details, Setback, Amenities, Construction Progress
 */
function DynamicTable({ section, rows, onChange }) {
  const cols = section.columns || []

  const addRow = () => {
    onChange([...rows, createTableRow(cols)])
  }

  const removeRow = (idx) => {
    onChange(rows.filter((_, i) => i !== idx))
  }

  const updateCell = (rowIdx, key, value) => {
    onChange(rows.map((row, i) => i === rowIdx ? { ...row, [key]: value } : row))
  }

  const renderCell = (col, row, rowIdx) => {
    const val = row[col.key] ?? ''

    if (col.type === 'calculated') {
      const num = parseFloat(val || 0)
      return (
        <div className="calculated-field" style={{ fontSize: '0.82rem' }}>
          <span className="calculated-value">{isNaN(num) ? '—' : formatCurrency(num)}</span>
        </div>
      )
    }

    if (col.type === 'select') {
      return (
        <select
          className="form-select"
          style={{ fontSize: '0.82rem', padding: '5px 8px', minWidth: 120 }}
          value={val}
          onChange={(e) => updateCell(rowIdx, col.key, e.target.value)}
        >
          <option value="">—</option>
          {(col.options || []).map((opt) => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      )
    }

    if (col.type === 'number' || col.type === 'currency') {
      return (
        <input
          type="number"
          min="0"
          step="0.01"
          className="form-input"
          style={{ fontSize: '0.82rem', padding: '5px 8px', minWidth: 90 }}
          value={val}
          onChange={(e) => updateCell(rowIdx, col.key, e.target.value)}
          placeholder="0"
        />
      )
    }

    return (
      <input
        type="text"
        className="form-input"
        style={{ fontSize: '0.82rem', padding: '5px 8px', minWidth: 110 }}
        value={val}
        onChange={(e) => updateCell(rowIdx, col.key, e.target.value)}
        placeholder={col.label}
      />
    )
  }

  return (
    <div className="dynamic-table-wrapper">
      <div className="table-scroll">
        <table className="dynamic-table">
          <thead>
            <tr>
              <th style={{ width: 36 }}>#</th>
              {cols.map((col) => <th key={col.key}>{col.label}</th>)}
              <th style={{ width: 44 }}>Del</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={cols.length + 2} style={{ textAlign: 'center', color: 'var(--gray-400)', padding: 20 }}>
                  No rows — click Add below
                </td>
              </tr>
            ) : rows.map((row, rowIdx) => (
              <tr key={rowIdx}>
                <td style={{ color: 'var(--gray-400)', fontSize: '0.8rem', textAlign: 'center' }}>{rowIdx + 1}</td>
                {cols.map((col) => (
                  <td key={col.key} style={{ padding: '4px 6px' }}>
                    {renderCell(col, row, rowIdx)}
                  </td>
                ))}
                <td style={{ textAlign: 'center' }}>
                  <button
                    type="button"
                    onClick={() => removeRow(rowIdx)}
                    style={{ background: 'none', border: 'none', color: 'var(--red-500)', cursor: 'pointer', fontSize: '1.1rem', padding: 4 }}
                    title="Remove row"
                  >×</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button type="button" className="btn btn-secondary" style={{ marginTop: 10, fontSize: '0.82rem', padding: '7px 14px' }} onClick={addRow}>
        + Add Row
      </button>
    </div>
  )
}

export default DynamicTable
