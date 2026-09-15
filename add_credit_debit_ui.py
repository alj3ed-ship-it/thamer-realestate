import pathlib

path = pathlib.Path("src/Invoices.jsx")
content = path.read_text(encoding="utf-8")

# 1) إضافة الزر على الفواتير المعتمدة (cleared) — نوسّع الشرط الحالي
old_condition = "{(inv.status === 'draft' || inv.status === 'ready') && !isReadOnly ? ("
new_condition = "{(inv.status === 'draft' || inv.status === 'ready' || inv.status === 'cleared') && !isReadOnly ? ("
assert content.count(old_condition) == 1
content = content.replace(old_condition, new_condition)

old_ready_block_end = """                          {inv.status === 'ready' && (
                            <button
                              type="button"
                              onClick={() => alert('ميزة الإرسال الفعلي (Clearance/Reporting) قيد البناء بعد — هذا زر مكانه محجوز فقط حالياً')}
                              style={{
                                padding: '6px 12px', fontSize: 12, whiteSpace: 'nowrap',
                                cursor: 'pointer', borderRadius: 6, border: '1px solid #27ae60',
                                background: '#fff', color: '#27ae60', fontWeight: 700,
                              }}>
                              📤 إرسال للهيئة (قريباً)
                            </button>
                          )}"""
new_ready_block_end = old_ready_block_end + """

                          {inv.status === 'cleared' && !inv.document_type && (
                            <div style={{ display: 'flex', gap: 6 }}>
                              <button
                                type="button"
                                onClick={() => handleOpenNoteForm(inv, 'credit_note')}
                                style={{
                                  padding: '6px 12px', fontSize: 12, whiteSpace: 'nowrap',
                                  cursor: 'pointer', borderRadius: 6, border: '1px solid #8e44ad',
                                  background: '#fff', color: '#8e44ad', fontWeight: 700,
                                }}>
                                📝 إشعار دائن
                              </button>
                              <button
                                type="button"
                                onClick={() => handleOpenNoteForm(inv, 'debit_note')}
                                style={{
                                  padding: '6px 12px', fontSize: 12, whiteSpace: 'nowrap',
                                  cursor: 'pointer', borderRadius: 6, border: '1px solid #d68910',
                                  background: '#fff', color: '#d68910', fontWeight: 700,
                                }}>
                                📝 إشعار مدين
                              </button>
                            </div>
                          )}"""
assert content.count(old_ready_block_end) == 1
content = content.replace(old_ready_block_end, new_ready_block_end)

# 2) إضافة نافذة النموذج (مودال) — تُعرض فوق كل شي لما noteForm فيه قيمة
old_return_open = "  return (\n    <div dir=\"rtl\" style={{ fontFamily: 'Cairo, sans-serif', padding: '40px 24px', maxWidth: '1200px', margin: '0 auto' }}>"
new_return_open = old_return_open + '''
      {noteForm && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 10000,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
        }}>
          <div style={{
            background: '#fff', borderRadius: 12, padding: 24, maxWidth: 640, width: '100%',
            maxHeight: '85vh', overflowY: 'auto',
          }}>
            <h3 style={{ margin: '0 0 4px', color: noteForm.noteType === 'debit_note' ? '#d68910' : '#8e44ad' }}>
              {noteForm.noteType === 'debit_note' ? 'إشعار مدين' : 'إشعار دائن'} — فاتورة {noteForm.invoice.invoice_number}
            </h3>
            <p style={{ color: '#6b7280', fontSize: 13, margin: '0 0 16px' }}>
              البنود معبأة تلقائياً من الفاتورة الأصلية — عدّل أي بند أو احذفه حسب الحاجة قبل الإصدار
            </p>

            <label style={labelStyle}>سبب الإشعار *</label>
            <input
              type="text"
              value={noteForm.reason}
              onChange={e => setNoteForm(f => ({ ...f, reason: e.target.value }))}
              placeholder="مثال: إلغاء جزء من الفاتورة، خصم متفق عليه..."
              style={{ ...inputStyle, marginBottom: 16 }}
            />

            <div style={{ overflowX: 'auto', marginBottom: 12 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 480 }}>
                <thead>
                  <tr style={{ background: '#f9fafb', textAlign: 'right' }}>
                    <th style={{ padding: '6px 8px', fontSize: 12, color: '#6b7280' }}>البيان</th>
                    <th style={{ padding: '6px 8px', fontSize: 12, color: '#6b7280', width: 80 }}>الكمية</th>
                    <th style={{ padding: '6px 8px', fontSize: 12, color: '#6b7280', width: 110 }}>سعر الوحدة</th>
                    <th style={{ width: 36 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {noteForm.items.map(it => (
                    <tr key={it.key}>
                      <td style={{ padding: '4px 6px' }}>
                        <input type="text" value={it.description} onChange={e => updateNoteItem(it.key, 'description', e.target.value)} style={inputStyle} />
                      </td>
                      <td style={{ padding: '4px 6px' }}>
                        <input type="number" min="0" value={it.quantity} onChange={e => updateNoteItem(it.key, 'quantity', e.target.value)} style={inputStyle} />
                      </td>
                      <td style={{ padding: '4px 6px' }}>
                        <input type="number" min="0" value={it.unit_price} onChange={e => updateNoteItem(it.key, 'unit_price', e.target.value)} style={inputStyle} />
                      </td>
                      <td style={{ padding: '4px 6px', textAlign: 'center' }}>
                        <button type="button" onClick={() => removeNoteItem(it.key)} style={{ border: 'none', background: 'none', color: '#e74c3c', cursor: 'pointer' }}>✕</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {noteError && <p style={{ color: '#e74c3c', fontWeight: 700 }}>{noteError}</p>}

            {noteResult && (
              <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', background: '#f9fafb', padding: 10, borderRadius: 8, marginBottom: 12 }}>
                <img src={noteResult.qrDataUrl} alt="ZATCA QR" width={90} height={90} style={{ borderRadius: 4, border: '1px solid #e5e7eb' }} />
                <div style={{ fontSize: 12 }}>
                  <span style={{
                    background: noteResult.compliance.passed ? '#EAFAF1' : '#FDEDEC',
                    color: noteResult.compliance.passed ? '#27ae60' : '#e74c3c',
                    padding: '2px 8px', borderRadius: 10, fontWeight: 700, display: 'inline-block',
                  }}>
                    {noteResult.compliance.passed ? 'PASS ✓' : 'FAIL ✕'} ({noteResult.compliance.status})
                  </span>
                  <div style={{ marginTop: 4, color: '#6b7280' }}>{noteResult.invoice_type} — تم حفظه كفاتورة معتمدة مرتبطة</div>
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => { setNoteForm(null); setNoteResult(null); setNoteError('') }}
                style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff', cursor: 'pointer' }}>
                {noteResult?.compliance?.passed ? 'إغلاق' : 'إلغاء'}
              </button>
              {!noteResult?.compliance?.passed && (
                <button
                  type="button"
                  onClick={handleSubmitNote}
                  disabled={noteSaving}
                  style={{
                    padding: '8px 20px', borderRadius: 8, border: 'none', fontWeight: 700, color: '#fff',
                    background: noteForm.noteType === 'debit_note' ? '#d68910' : '#8e44ad',
                    cursor: noteSaving ? 'default' : 'pointer', opacity: noteSaving ? 0.6 : 1,
                  }}>
                  {noteSaving ? 'جاري الإصدار...' : 'إصدار الإشعار'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}'''
assert content.count(old_return_open) == 1
content = content.replace(old_return_open, new_return_open)

path.write_text(content, encoding="utf-8")
print("تم التعديل بنجاح ✅")