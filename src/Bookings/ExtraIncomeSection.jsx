import React from 'react';
import {
  INCOME_TYPES, formatHijriDisplay, incomeTypeBadge, clientBadge,
  th, td, actionBtn, overlayStyle, modalStyle, wideModalStyle, label, input,
} from './bookingsHelpers';

export default function ExtraIncomeSection({
  showExtraDetails, setShowExtraDetails,
  filteredExtraIncome, bookings, isReadOnly,
  openEditExtraForm, handleDeleteExtra,
  showExtraForm, setShowExtraForm,
  extraForm, setExtraForm, editingExtraId,
  handleSaveExtra, bookingLabel,
}) {
  return (
    <>
      {/* نافذة تفاصيل الدخل الإضافي (تُفتح بالضغط على بطاقة "دخل إضافي") */}
      {showExtraDetails && (
        <div style={overlayStyle} onClick={() => setShowExtraDetails(false)}>
          <div style={wideModalStyle} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, color: '#148F77' }}>💰 تفاصيل الدخل الإضافي</h3>
              <button onClick={() => setShowExtraDetails(false)} style={{ ...actionBtn('#999'), padding: '8px 16px' }}>
                إغلاق ✕
              </button>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                <thead>
                  <tr style={{ background: '#f8f9fa', borderBottom: '2px solid #e9ecef', textAlign: 'right' }}>
                    <th style={th}>التاريخ</th>
                    <th style={th}>النوع</th>
                    <th style={th}>مرتبط بحجز</th>
                    <th style={th}>العميل</th>
                    <th style={th}>المبلغ</th>
                    <th style={th}>ملاحظات</th>
                    {!isReadOnly && <th style={th}>إجراءات</th>}
                  </tr>
                </thead>
                <tbody>
                  {filteredExtraIncome.map((e, idx) => {
                    const linkedBooking = bookings.find((b) => b.id === e.booking_id);
                    return (
                      <tr key={e.id} style={{ borderBottom: '1px solid #f0f0f0', background: idx % 2 === 0 ? '#fff' : '#fafafa' }}>
                        <td style={td}>{e.date_hijri ? `${formatHijriDisplay(e.date_hijri)} هـ` : '—'}</td>
                        <td style={td}>{incomeTypeBadge(e.income_type)}</td>
                        <td style={td}>{linkedBooking ? clientBadge(linkedBooking.client_name) : '— مستقل —'}</td>
                        <td style={td}>{e.client_name || '—'}</td>
                        <td style={{ ...td, fontWeight: 'bold', color: '#148F77' }}>{Number(e.amount).toLocaleString()} ر.س</td>
                        <td style={td}>{e.notes || '—'}</td>
                        {!isReadOnly && (
                        <td style={td}>
                          <button onClick={() => openEditExtraForm(e)} style={actionBtn('#1B4D7A')}>تعديل</button>
                          <button onClick={() => handleDeleteExtra(e.id)} style={actionBtn('#e74c3c')}>حذف</button>
                        </td>
                        )}
                      </tr>
                    );
                  })}
                  {filteredExtraIncome.length === 0 && (
                    <tr>
                      <td colSpan={7} style={{ textAlign: 'center', padding: '20px', color: '#888' }}>
                        لا يوجد دخل إضافي مسجّل
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* فورم الإضافة/التعديل - الدخل الإضافي */}
      {showExtraForm && (
        <div style={overlayStyle}>
          <div style={modalStyle}>
            <h3>{editingExtraId ? 'تعديل دخل إضافي' : 'إضافة دخل إضافي'}</h3>

            <label style={label}>نوع الدخل</label>
            <select
              value={extraForm.income_type}
              onChange={(e) => setExtraForm({ ...extraForm, income_type: e.target.value })}
              style={input}
            >
              {INCOME_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>

            <label style={label}>مرتبط بحجز (اختياري)</label>
            <select
              value={extraForm.booking_id}
              onChange={(e) => setExtraForm({ ...extraForm, booking_id: e.target.value })}
              style={input}
            >
              <option value="">— دخل مستقل (غير مرتبط) —</option>
              {bookings.map((b) => (
                <option key={b.id} value={b.id}>{bookingLabel(b)}</option>
              ))}
            </select>

            <label style={label}>المبلغ</label>
            <input
              type="number"
              value={extraForm.amount}
              onChange={(e) => setExtraForm({ ...extraForm, amount: e.target.value })}
              style={input}
            />

            <label style={label}>التاريخ (هجري - يوم/شهر/سنة) - اختياري</label>
            <input
              type="text"
              placeholder="مثال: 24/1/1448"
              value={extraForm.date_hijri}
              onChange={(e) => setExtraForm({ ...extraForm, date_hijri: e.target.value })}
              style={input}
            />

            <label style={label}>اسم العميل (اختياري)</label>
            <input
              type="text"
              value={extraForm.client_name}
              onChange={(e) => setExtraForm({ ...extraForm, client_name: e.target.value })}
              style={input}
            />

            <label style={label}>ملاحظات</label>
            <textarea
              value={extraForm.notes}
              onChange={(e) => setExtraForm({ ...extraForm, notes: e.target.value })}
              style={{ ...input, minHeight: '60px' }}
            />

            <div style={{ display: 'flex', gap: '10px', marginTop: '15px' }}>
              <button onClick={handleSaveExtra} style={{ ...actionBtn('#148F77'), flex: 1, padding: '10px' }}>
                حفظ
              </button>
              <button onClick={() => setShowExtraForm(false)} style={{ ...actionBtn('#999'), flex: 1, padding: '10px' }}>
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
