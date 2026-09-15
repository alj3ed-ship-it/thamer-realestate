import pathlib

path = pathlib.Path("src/VatReturns.jsx")
content = path.read_text(encoding="utf-8")

# 1) import useRef
old1 = "import { useState, useEffect } from 'react'"
new1 = "import { useState, useEffect, useRef } from 'react'"
assert content.count(old1) == 1
content = content.replace(old1, new1)

# 2) add upload state right after showAllQuarters state
old2 = "  const [showAllQuarters, setShowAllQuarters] = useState(false)"
new2 = """  const [showAllQuarters, setShowAllQuarters] = useState(false)
  const [uploadingKey, setUploadingKey] = useState(null)
  const fileInputRefs = useRef({})"""
assert content.count(old2) == 1
content = content.replace(old2, new2)

# 3) add the upload handler right after saveNote()
old3 = """    if (existing) {
      await supabase.from('vat_filings').update(payload).eq('quarter_key', quarter.key)
    } else {
      await supabase.from('vat_filings').insert([payload])
    }
    setSavingKey(null)
    fetchAll()
  }

  function getDeadlineColor(daysLeft) {"""
new3 = """    if (existing) {
      await supabase.from('vat_filings').update(payload).eq('quarter_key', quarter.key)
    } else {
      await supabase.from('vat_filings').insert([payload])
    }
    setSavingKey(null)
    fetchAll()
  }

  // رفع ملف الإقرار أو إيصال السداد لكل ربع — يُخزَّن برابط عام مباشر بـ Supabase Storage
  // (bucket: vat-documents) بنفس نمط رفع عقود الإيجار المعتمد بالنظام
  async function handleFilingFileUpload(quarter, file, field) {
    if (!file) return
    const uploadKey = `${quarter.key}:${field}`
    setUploadingKey(uploadKey)
    try {
      const ext = file.name.split('.').pop()
      const prefix = field === 'declaration_file_url' ? 'declaration' : 'payment'
      const path = `vat/${quarter.key}/${prefix}_${Date.now()}.${ext}`
      const { error: upErr } = await supabase.storage.from('vat-documents').upload(path, file, { upsert: true })
      if (upErr) {
        alert('فشل رفع الملف: ' + upErr.message)
        return
      }
      const { data: pub } = supabase.storage.from('vat-documents').getPublicUrl(path)
      const existing = getFiling(quarter.key)
      const payload = {
        quarter_key: quarter.key,
        filed: existing?.filed || false,
        filed_date: existing?.filed_date || null,
        notes: existing?.notes ?? null,
        declaration_file_url: existing?.declaration_file_url || null,
        payment_receipt_url: existing?.payment_receipt_url || null,
        [field]: pub.publicUrl,
      }
      if (existing) {
        await supabase.from('vat_filings').update(payload).eq('quarter_key', quarter.key)
      } else {
        await supabase.from('vat_filings').insert([payload])
      }
      fetchAll()
    } finally {
      setUploadingKey(null)
    }
  }

  function getDeadlineColor(daysLeft) {"""
assert content.count(old3) == 1
content = content.replace(old3, new3)

# 4) add the upload UI row under the existing "تأكيد التقديم" row
old4 = """                    <input
                      type="text"
                      placeholder="ملاحظة (اختياري)"
                      value={noteVal}
                      onChange={e => setNoteDrafts(prev => ({ ...prev, [q.key]: e.target.value }))}
                      onBlur={() => saveNote(q)}
                      style={{ flex: 1, minWidth: 140, padding: '5px 10px', borderRadius: 7, border: '1px solid #e5e7eb', fontSize: 12, fontFamily: 'Cairo, sans-serif' }}
                    />
                  </div>
                  )}"""
new4 = """                    <input
                      type="text"
                      placeholder="ملاحظة (اختياري)"
                      value={noteVal}
                      onChange={e => setNoteDrafts(prev => ({ ...prev, [q.key]: e.target.value }))}
                      onBlur={() => saveNote(q)}
                      style={{ flex: 1, minWidth: 140, padding: '5px 10px', borderRadius: 7, border: '1px solid #e5e7eb', fontSize: 12, fontFamily: 'Cairo, sans-serif' }}
                    />
                  </div>
                  <div className="no-print" style={{ marginTop: 8, display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap' }}>
                    {[
                      { field: 'declaration_file_url', label: 'ملف الإقرار', icon: '📄' },
                      { field: 'payment_receipt_url', label: 'إيصال السداد', icon: '🧾' },
                    ].map(({ field, label, icon }) => {
                      const uploadKey = `${q.key}:${field}`
                      const isUploading = uploadingKey === uploadKey
                      const fileUrl = filing?.[field]
                      return (
                        <div key={field} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ fontSize: 11, color: '#6b7280' }}>{label}:</span>
                          <input
                            type="file"
                            accept="application/pdf,image/*"
                            style={{ display: 'none' }}
                            ref={el => (fileInputRefs.current[uploadKey] = el)}
                            onChange={e => handleFilingFileUpload(q, e.target.files[0], field)}
                          />
                          {fileUrl ? (
                            <>
                              <a href={fileUrl} target="_blank" rel="noreferrer" style={{ fontSize: 11, color: '#1B4D7A', fontWeight: 700 }}>{icon} عرض</a>
                              <button onClick={() => fileInputRefs.current[uploadKey]?.click()} disabled={isUploading} style={{ fontSize: 11, border: 'none', background: 'none', color: '#6b7280', cursor: 'pointer', textDecoration: 'underline' }}>
                                {isUploading ? '...' : 'تغيير'}
                              </button>
                            </>
                          ) : (
                            <button onClick={() => fileInputRefs.current[uploadKey]?.click()} disabled={isUploading} style={{ fontSize: 11, padding: '2px 10px', borderRadius: 5, border: '1px dashed #8e44ad', background: '#fff', color: '#8e44ad', cursor: 'pointer' }}>
                              {isUploading ? 'جارِ الرفع...' : `${icon} رفع`}
                            </button>
                          )}
                        </div>
                      )
                    })}
                  </div>
                  )}"""
assert content.count(old4) == 1
content = content.replace(old4, new4)

path.write_text(content, encoding="utf-8")
print("Patched src/VatReturns.jsx (declaration/receipt upload) successfully")