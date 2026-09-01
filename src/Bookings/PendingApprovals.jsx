import React from 'react';
import { formatHijriDisplay, clientBadge, th, td, actionBtn } from './bookingsHelpers';

export default function PendingApprovals({ pendingBookings, onApprove, onReject }) {
  return (
    <div style={{
      background: '#FFFBF3', border: '2px solid #F5CBA7', borderRadius: '12px',
      padding: '18px 20px', marginBottom: '24px',
    }}>
      <h3 style={{ margin: '0 0 14px', color: '#B9770E', fontSize: '16px' }}>
        ⏳ بانتظار الاعتماد ({pendingBookings.length})
      </h3>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px', background: '#fff', borderRadius: '8px', overflow: 'hidden' }}>
          <thead>
            <tr style={{ background: '#f8f9fa', borderBottom: '2px solid #e9ecef', textAlign: 'right' }}>
              <th style={th}>النوع</th>
              <th style={th}>التاريخ الهجري</th>
              <th style={th}>العميل</th>
              <th style={th}>الإجمالي</th>
              <th style={th}>مقدّم من</th>
              <th style={th}>إجراءات</th>
            </tr>
          </thead>
          <tbody>
            {pendingBookings.map((b, idx) => (
              <tr key={b.id} style={{ borderBottom: '1px solid #f0f0f0', background: idx % 2 === 0 ? '#fff' : '#fafafa' }}>
                <td style={td}>
                  <span style={{
                    background: b.previous_data ? '#EAF2F8' : '#EAFAF1',
                    color: b.previous_data ? '#1B4D7A' : '#27ae60',
                    padding: '4px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold',
                  }}>
                    {b.previous_data ? 'تعديل على حجز' : 'حجز جديد'}
                  </span>
                </td>
                <td style={td}>{formatHijriDisplay(b.event_date_hijri)} هـ</td>
                <td style={td}>{clientBadge(b.client_name)}</td>
                <td style={{ ...td, fontWeight: 'bold', color: '#1B4D7A' }}>{Number(b.total_amount || 0).toLocaleString()} ر.س</td>
                <td style={td}>{b.submitted_by || 'المحاسب'}</td>
                <td style={td}>
                  <button onClick={() => onApprove(b)} style={actionBtn('#27ae60')}>✅ اعتماد</button>
                  <button onClick={() => onReject(b)} style={actionBtn('#e74c3c')}>❌ رفض</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
