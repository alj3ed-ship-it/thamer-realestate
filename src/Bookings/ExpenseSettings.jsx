import React from 'react';
import {
  EVENT_TYPES, TYPE_COLORS, DEFAULT_ANNUAL_SALARY, DEFAULT_ANNUAL_ELECTRICITY,
} from './bookingsHelpers';

export default function ExpenseSettings({
  staffRates, setStaffRate,
  suppliesRates, setSuppliesRate,
  abuAyoubRates, setAbuAyoubRate,
  selectedYear,
  getAnnualSalary, setAnnualSalaryForYear,
  getElectricity, setElectricityForYear,
  waterRatePerPair, setWaterRatePerPairAndSave,
}) {
  return (
    <div style={{
      background: '#fff', borderRadius: '10px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
      padding: '16px 20px', marginBottom: '20px',
    }}>
      <h4 style={{ margin: '0 0 12px', color: '#555', fontSize: '14px' }}>⚙️ إعدادات المصاريف (لكل حفلة حسب نوعها)</h4>
      <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', marginBottom: '14px' }}>
        {EVENT_TYPES.map((t) => (
          <div key={t} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <span style={{ fontSize: '12px', fontWeight: 'bold', color: (TYPE_COLORS[t] || {}).text || '#555' }}>{t}</span>
            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
              <span style={{ fontSize: '11px', color: '#888', whiteSpace: 'nowrap' }}>مباشرين</span>
              <input
                type="number"
                value={staffRates[t] ?? 0}
                onChange={(e) => setStaffRate(t, Number(e.target.value) || 0)}
                style={{ width: '70px', padding: '4px 6px', borderRadius: '6px', border: '1px solid #ccc', fontFamily: 'Cairo, sans-serif' }}
              />
            </div>
            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
              <span style={{ fontSize: '11px', color: '#888', whiteSpace: 'nowrap' }}>قهوة وشاهي</span>
              <input
                type="number"
                value={suppliesRates[t] ?? 0}
                onChange={(e) => setSuppliesRate(t, Number(e.target.value) || 0)}
                style={{ width: '70px', padding: '4px 6px', borderRadius: '6px', border: '1px solid #ccc', fontFamily: 'Cairo, sans-serif' }}
              />
            </div>
            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
              <span style={{ fontSize: '11px', color: '#888', whiteSpace: 'nowrap' }}>عمولة أبو أيوب</span>
              <input
                type="number"
                value={abuAyoubRates[t] ?? 0}
                onChange={(e) => setAbuAyoubRate(t, Number(e.target.value) || 0)}
                style={{ width: '70px', padding: '4px 6px', borderRadius: '6px', border: '1px solid #ccc', fontFamily: 'Cairo, sans-serif' }}
              />
            </div>
          </div>
        ))}
      </div>
      <div style={{ borderTop: '1px solid #eee', paddingTop: '12px' }}>
        {selectedYear === 'all' ? (
          <span style={{ fontSize: '13px', color: '#888' }}>
            اختر سنة معينة من الأعلى لتعديل راتبها السنوي وكهرباءها (الافتراضي: راتب {DEFAULT_ANNUAL_SALARY.toLocaleString()} ر.س، كهرباء {DEFAULT_ANNUAL_ELECTRICITY.toLocaleString()} ر.س)
          </span>
        ) : (
          <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <label style={{ fontSize: '13px', color: '#555', fontWeight: 'bold', whiteSpace: 'nowrap' }}>
                الراتب السنوي {selectedYear} هـ (ر.س)
              </label>
              <input
                type="number"
                value={getAnnualSalary(selectedYear)}
                onChange={(e) => setAnnualSalaryForYear(selectedYear, Number(e.target.value) || 0)}
                style={{ width: '100px', padding: '6px 10px', borderRadius: '6px', border: '1px solid #ccc', fontFamily: 'Cairo, sans-serif' }}
              />
            </div>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <label style={{ fontSize: '13px', color: '#555', fontWeight: 'bold', whiteSpace: 'nowrap' }}>
                الكهرباء السنوية {selectedYear} هـ (ر.س)
              </label>
              <input
                type="number"
                value={getElectricity(selectedYear)}
                onChange={(e) => setElectricityForYear(selectedYear, Number(e.target.value) || 0)}
                style={{ width: '100px', padding: '6px 10px', borderRadius: '6px', border: '1px solid #ccc', fontFamily: 'Cairo, sans-serif' }}
              />
            </div>
          </div>
        )}
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginTop: '12px' }}>
          <label style={{ fontSize: '13px', color: '#555', fontWeight: 'bold', whiteSpace: 'nowrap' }}>
            الماء (ر.س لكل حفلتين)
          </label>
          <input
            type="number"
            value={waterRatePerPair}
            onChange={(e) => setWaterRatePerPairAndSave(Number(e.target.value) || 0)}
            style={{ width: '100px', padding: '6px 10px', borderRadius: '6px', border: '1px solid #ccc', fontFamily: 'Cairo, sans-serif' }}
          />
        </div>
      </div>
    </div>
  );
}
