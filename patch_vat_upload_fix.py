import pathlib

path = pathlib.Path("src/VatReturns.jsx")
content = path.read_text(encoding="utf-8")

old_a = """                  {!isReadOnly && (
                  <div className="no-print" style={{ marginTop: 10, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>"""
new_a = """                  {!isReadOnly && (
                  <>
                  <div className="no-print" style={{ marginTop: 10, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>"""
assert content.count(old_a) == 1
content = content.replace(old_a, new_a)

old_b = """                      )
                    })}
                  </div>
                  )}"""
new_b = """                      )
                    })}
                  </div>
                  </>
                  )}"""
assert content.count(old_b) == 1
content = content.replace(old_b, new_b)

path.write_text(content, encoding="utf-8")
print("Fixed JSX fragment wrapping successfully")