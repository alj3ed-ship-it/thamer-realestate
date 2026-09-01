import React from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';

export default function YearlyChart({ yearlyStats }) {
  if (yearlyStats.length <= 1) return null;

  return (
    <div style={{
      background: '#fff', borderRadius: '12px', boxShadow: '0 2px 12px rgba(0,0,0,0.07)',
      padding: '20px', marginBottom: '24px',
    }}>
      <h3 style={{ margin: '0 0 16px', color: '#1B4D7A', fontSize: '16px' }}>مقارنة الدخل والصافي بين السنين</h3>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={yearlyStats}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="year" tick={{ fontFamily: 'Cairo, sans-serif', fontSize: 13 }} />
          <YAxis tick={{ fontFamily: 'Cairo, sans-serif', fontSize: 12 }} />
          <Tooltip
            contentStyle={{ fontFamily: 'Cairo, sans-serif', direction: 'rtl' }}
            formatter={(value) => `${Number(value).toLocaleString()} ر.س`}
          />
          <Legend wrapperStyle={{ fontFamily: 'Cairo, sans-serif' }} />
          <Bar dataKey="revenue" name="إجمالي الدخل" fill="#1B4D7A" radius={[6, 6, 0, 0]} />
          <Bar dataKey="net" name="الصافي (بعد خصم المصاريف)" fill="#27ae60" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>

      <div style={{ display: 'flex', gap: '24px', marginTop: '16px', flexWrap: 'wrap', justifyContent: 'center' }}>
        {yearlyStats.map((y) => (
          <div key={y.year} style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '13px', color: '#666' }}>{y.year} هـ</div>
            <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#1B4D7A' }}>{y.count} حجز</div>
          </div>
        ))}
      </div>
    </div>
  );
}
