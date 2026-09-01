import React from 'react';
import {
  formatHijriDisplay, getHijriYear, typeBadge, clientBadge, receiverColor,
  STATUS_COLORS, CANCEL_STATUS_LABELS, th, td, actionBtn,
} from './bookingsHelpers';

export default function BookingsTable({
  filteredBookings, isReadOnly, lockedYears,
  openEditForm, handleCancelBooking, handleReactivateBooking, handleDelete,
}) {
  return (
    <div style={{ background: '#fff', borderRadius: '12px', boxShadow: '0 2px 12px rgba(0,0,0,0.07)', overflow: 'hidden', marginBottom: '24px' }}>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
          <thead>
            <tr style={{ background: '#f8f9fa', borderBottom: '2px solid #e9ecef', textAlign: 'right' }}>
              <th style={th}>التاريخ الهجري</th>
              <th style={th}>النوع</th>
              <th style={th}>العميل</th>
              <th style={th}>الإجمالي</th>
              <th style={th}>العربون</th>
              <th style={th}>الباقي</th>
              <th style={th}>حالة الباقي</th>
              <th style={th}>الاستلام النهائي (باقي)</th>
              <th style={th}>حالة الحجز</th>
              {!isReadOnly && <th style={th}>إجراءات</th>}
            </tr>
          </thead>
          <tbody>
            {filteredBookings.map((b, idx) => {
              const statusStyle = STATUS_COLORS[b.remaining_status] || STATUS_COLORS['جزئي'];
              return (
                <tr key={b.id} style={{ borderBottom: '1px solid #f0f0f0', background: idx % 2 === 0 ? '#fff' : '#fafafa' }}>
                  <td style={td}>{formatHijriDisplay(b.event_date_hijri)} هـ</td>
                  <td style={td}>{typeBadge(b.event_type)}</td>
                  <td style={td}>{clientBadge(b.client_name)}</td>
                  <td style={{ ...td, fontWeight: 'bold', color: '#1B4D7A' }}>{Number(b.total_amount).toLocaleString()} ر.س</td>
                  <td style={{ ...td, fontWeight: 'bold', color: '#148F77' }}>{Number(b.deposit_amount).toLocaleString()} ر.س</td>
                  <td style={{ ...td, fontWeight: 'bold', color: '#e74c3c' }}>{Number(b.remaining_amount).toLocaleString()} ر.س</td>
                  <td style={td}>
                    <span
                      style={{
                        background: statusStyle.bg,
                        color: statusStyle.text,
                        padding: '4px 12px',
                        borderRadius: '20px',
                        fontSize: '12px',
                        fontWeight: 'bold',
                      }}
                    >
                      {statusStyle.label}
                    </span>
                  </td>
                  <td style={{ ...td, fontWeight: 'bold', color: receiverColor(b.remaining_receiver_final) }}>
                    {b.remaining_receiver_final || '—'}
                  </td>
                  <td style={td}>
                    {b.booking_status && b.booking_status !== 'active' ? (
                      <span style={{
                        background: (CANCEL_STATUS_LABELS[b.booking_status] || {}).bg,
                        color: (CANCEL_STATUS_LABELS[b.booking_status] || {}).text,
                        padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 'bold',
                      }}>
                        {(CANCEL_STATUS_LABELS[b.booking_status] || {}).label}
                      </span>
                    ) : (
                      <span style={{ color: '#27ae60', fontSize: '12px', fontWeight: 'bold' }}>نشط ✓</span>
                    )}
                  </td>
                  {!isReadOnly && (
                  <td style={td}>
                    {lockedYears.has(getHijriYear(b.event_date_hijri)) ? (
                      <span style={{ color: '#7f8c8d', fontSize: '12px', fontWeight: 'bold' }}>🔒 سنة مقفلة</span>
                    ) : (
                      <>
                        <button onClick={() => openEditForm(b)} style={actionBtn('#1B4D7A')}>تعديل</button>
                        {b.booking_status && b.booking_status !== 'active' ? (
                          <button onClick={() => handleReactivateBooking(b)} style={actionBtn('#27ae60')}>إعادة تفعيل</button>
                        ) : (
                          <button onClick={() => handleCancelBooking(b)} style={actionBtn('#f39c12')}>إلغاء</button>
                        )}
                        <button onClick={() => handleDelete(b.id)} style={actionBtn('#e74c3c')}>حذف</button>
                      </>
                    )}
                  </td>
                  )}
                </tr>
              );
            })}
            {filteredBookings.length === 0 && (
              <tr>
                <td colSpan={10} style={{ textAlign: 'center', padding: '20px', color: '#888' }}>
                  لا يوجد حجوزات لهذه السنة
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
