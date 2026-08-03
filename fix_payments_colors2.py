path = r"src\Payments.jsx"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

old = """    let base
    if (computed === 'partial') {
      const remaining = due - paid
      const partialColor = '#d4ac0d'
      base = (
        <span style={{ fontSize: 13, fontWeight: 700, whiteSpace: 'nowrap', color: partialColor }}>
          <span style={{ fontSize: 10, fontWeight: 600, color: '#9ca3af' }}>مدفوع </span>
          {paid.toLocaleString()}
          <span style={{ color: '#9ca3af', margin: '0 4px' }}>|</span>
          <span style={{ fontSize: 10, fontWeight: 600, color: '#9ca3af' }}>متبقي </span>
          {remaining.toLocaleString()}
          <span style={{ color: '#9ca3af', margin: '0 4px' }}>|</span>
          <span style={{ fontSize: 10, fontWeight: 600, color: '#9ca3af' }}>الإجمالي </span>
          {due.toLocaleString()}
        </span>
      )
    } else {"""

new = """    let base
    if (computed === 'partial') {
      const remaining = due - paid
      base = (
        <span style={{ fontSize: 13, fontWeight: 700, whiteSpace: 'nowrap' }}>
          <span style={{ fontSize: 10, fontWeight: 600, color: '#9ca3af' }}>مدفوع </span>
          <span style={{ color: '#27ae60' }}>{paid.toLocaleString()}</span>
          <span style={{ color: '#9ca3af', margin: '0 4px' }}>|</span>
          <span style={{ fontSize: 10, fontWeight: 600, color: '#9ca3af' }}>متبقي </span>
          <span style={{ color: '#d4ac0d' }}>{remaining.toLocaleString()}</span>
          <span style={{ color: '#9ca3af', margin: '0 4px' }}>|</span>
          <span style={{ fontSize: 10, fontWeight: 600, color: '#9ca3af' }}>الإجمالي </span>
          <span style={{ color: '#e74c3c' }}>{due.toLocaleString()}</span>
        </span>
      )
    } else {"""

assert content.count(old) == 1, "block not found"
content = content.replace(old, new)

with open(path, "w", encoding="utf-8") as f:
    f.write(content)

print("تم تصحيح الألوان ✓")