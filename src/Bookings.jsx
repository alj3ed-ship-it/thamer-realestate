import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from './supabaseClient';
import ExportToolbar from './components/ExportToolbar';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';

const EVENT_TYPES = ['كاملة', 'نساء', 'رجال', 'أخرى'];
const RECEIVER_STAGE1_OPTIONS = ['أبو أيوب', 'تحويل مباشر', 'نقدي مباشر'];
const RECEIVER_FINAL_OPTIONS = ['مستلم', 'الوالد', 'لم يستلم'];
const REMAINING_STATUS_OPTIONS = ['مستلم', 'جزئي', 'غير مستلم'];
const DEFAULT_EXPENSE_PCT = 25;

const STATUS_COLORS = {
  'مستلم': { bg: '#EAFAF1', text: '#27ae60', label: 'مستلم ✓' },
  'جزئي': { bg: '#FEF9E7', text: '#f39c12', label: 'جزئي ⚠' },
  'غير مستلم': { bg: '#FDEDEC', text: '#e74c3c', label: 'غير مستلم ✗' },
};

const TYPE_COLORS = {
  'كاملة': { bg: '#EAF2F8', text: '#1B4D7A', border: '#AED6F1' },
  'نساء': { bg: '#FDF2F8', text: '#C2185B', border: '#F8BBD0' },
  'رجال': { bg: '#E8F6F3', text: '#148F77', border: '#A2D9CE' },
  'أخرى': { bg: '#F4F6F7', text: '#7f8c8d', border: '#D5D8DC' },
};

function formatHijriDisplay(dateStr) {
  if (!dateStr) return '—';
  const parts = dateStr.split('/');
  if (parts.length !== 3) return dateStr;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

function getHijriYear(dateStr) {
  if (!dateStr) return null;
  const parts = dateStr.split('/');
  if (parts.length !== 3) return null;
  return parts[2];
}

function typeBadge(type) {
  const c = TYPE_COLORS[type] || TYPE_COLORS['أخرى'];
  return (
    <span style={{
      background: c.bg, color: c.text, border: `1px solid ${c.border}`,
      padding: '4px 12px', borderRadius: '12px', fontSize: '13px', fontWeight: 'bold', whiteSpace: 'nowrap',
    }}>
      {type}
    </span>
  );
}

function clientBadge(name) {
  return (
    <span style={{
      background: '#FEF9E7', color: '#9A7D0A', border: '1px solid #F7DC6F',
      padding: '4px 12px', borderRadius: '12px', fontSize: '13px', fontWeight: 'bold', whiteSpace: 'nowrap',
    }}>
      {name}
    </span>
  );
}

function receiverColor(value) {
  if (value === 'مستلم') return '#27ae60';
  if (value === 'لم يستلم') return '#e74c3c';
  return '#1B4D7A';
}

export default function Bookings() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [hallId, setHallId] = useState(null);
  const [selectedYear, setSelectedYear] = useState('all');
  const [expensePct, setExpensePct] = useState(() => {
    const saved = localStorage.getItem('bookings_expense_pct');
    return saved ? Number(saved) : DEFAULT_EXPENSE_PCT;
  });

  const emptyForm = {
    event_date_hijri: '',
    event_type: 'كاملة',
    client_name: '',
    total_amount: '',
    deposit_amount: '',
    deposit_receiver_stage1: RECEIVER_STAGE1_OPTIONS[0],
    deposit_receiver_final: RECEIVER_FINAL_OPTIONS[0],
    remaining_amount: '',
    remaining_status: 'جزئي',
    remaining_receiver_stage1: '',
    remaining_receiver_final: 'لم يستلم',
    notes: '',
  };
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    loadHallAndBookings();
  }, []);

  useEffect(() => {
    localStorage.setItem('bookings_expense_pct', String(expensePct));
  }, [expensePct]);

  async function loadHallAndBookings() {
    setLoading(true);
    setError(null);
    try {
      const { data: hall, error: hallErr } = await supabase
        .from('properties')
        .select('id')
        .eq('name', 'قاعة مذهلة')
        .single();

      if (hallErr) throw hallErr;
      setHallId(hall.id);

      const { data, error: bookingsErr } = await supabase
        .from('bookings')
        .select('*')
        .eq('property_id', hall.id);

      if (bookingsErr) throw bookingsErr;

      const sorted = (data || []).sort((a, b) => {
        const pa = a.event_date_hijri.split('/').map(Number);
        const pb = b.event_date_hijri.split('/').map(Number);
        if (pa[2] !== pb[2]) return pa[2] - pb[2];
        if (pa[1] !== pb[1]) return pa[1] - pb[1];
        return pa[0] - pb[0];
      });

      setBookings(sorted);
    } catch (err) {
      console.error(err);
      setError('حدث خطأ أثناء تحميل الحجوزات: ' + err.message);
    } finally {
      setLoading(false);
    }
  }

  function openAddForm() {
    setForm(emptyForm);
    setEditingId(null);
    setShowForm(true);
  }

  function openEditForm(booking) {
    setForm({
      event_date_hijri: booking.event_date_hijri,
      event_type: booking.event_type,
      client_name: booking.client_name,
      total_amount: booking.total_amount,
      deposit_amount: booking.deposit_amount,
      deposit_receiver_stage1: booking.deposit_receiver_stage1 || RECEIVER_STAGE1_OPTIONS[0],
      deposit_receiver_final: booking.deposit_receiver_final || RECEIVER_FINAL_OPTIONS[0],
      remaining_amount: booking.remaining_amount,
      remaining_status: booking.remaining_status,
      remaining_receiver_stage1: booking.remaining_receiver_stage1 || '',
      remaining_receiver_final: booking.remaining_receiver_final || 'لم يستلم',
      notes: booking.notes || '',
    });
    setEditingId(booking.id);
    setShowForm(true);
  }

  async function handleSave() {
    if (!form.event_date_hijri || !form.client_name || !form.total_amount) {
      alert('الرجاء تعبئة التاريخ واسم العميل والمبلغ الإجمالي على الأقل');
      return;
    }

    const payload = {
      property_id: hallId,
      event_date_hijri: form.event_date_hijri,
      event_type: form.event_type,
      client_name: form.client_name,
      total_amount: Number(form.total_amount),
      deposit_amount: Number(form.deposit_amount) || 0,
      deposit_receiver_stage1: form.deposit_receiver_stage1,
      deposit_receiver_final: form.deposit_receiver_final,
      remaining_amount: Number(form.remaining_amount) || 0,
      remaining_status: form.remaining_status,
      remaining_receiver_stage1: form.remaining_receiver_stage1,
      remaining_receiver_final: form.remaining_receiver_final,
      notes: form.notes,
      updated_at: new Date().toISOString(),
    };

    try {
      if (editingId) {
        const { error: updateErr } = await supabase
          .from('bookings')
          .update(payload)
          .eq('id', editingId);
        if (updateErr) throw updateErr;
      } else {
        const { error: insertErr } = await supabase
          .from('bookings')
          .insert([payload]);
        if (insertErr) throw insertErr;
      }
      setShowForm(false);
      loadHallAndBookings();
    } catch (err) {
      console.error(err);
      alert('خطأ أثناء الحفظ: ' + err.message);
    }
  }

  async function handleDelete(id) {
    if (!confirm('متأكد تبي تحذف هذا الحجز؟')) return;
    try {
      const { error: delErr } = await supabase.from('bookings').delete().eq('id', id);
      if (delErr) throw delErr;
      loadHallAndBookings();
    } catch (err) {
      alert('خطأ أثناء الحذف: ' + err.message);
    }
  }

  // استخراج كل السنين الموجودة فعلياً بالبيانات (ديناميكياً)
  const availableYears = useMemo(() => {
    const years = new Set();
    bookings.forEach((b) => {
      const y = getHijriYear(b.event_date_hijri);
      if (y) years.add(y);
    });
    return Array.from(years).sort();
  }, [bookings]);

  // بيانات الرسم البياني: لكل سنة عدد الحجوزات، الدخل، الصافي بعد خصم نسبة المصاريف
  const yearlyStats = useMemo(() => {
    const map = {};
    bookings.forEach((b) => {
      const y = getHijriYear(b.event_date_hijri);
      if (!y) return;
      if (!map[y]) map[y] = { year: y, count: 0, revenue: 0 };
      map[y].count += 1;
      map[y].revenue += Number(b.total_amount || 0);
    });
    return Object.values(map)
      .sort((a, b) => a.year.localeCompare(b.year))
      .map((row) => ({
        ...row,
        net: Math.round(row.revenue * (1 - expensePct / 100)),
      }));
  }, [bookings, expensePct]);

  const filteredBookings = selectedYear === 'all'
    ? bookings
    : bookings.filter((b) => getHijriYear(b.event_date_hijri) === selectedYear);

  const totalRevenue = filteredBookings.reduce((sum, b) => sum + Number(b.total_amount || 0), 0);
  const totalPending = filteredBookings
    .filter((b) => b.remaining_status !== 'مستلم')
    .reduce((sum, b) => sum + Number(b.remaining_amount || 0), 0);
  const totalCollected = totalRevenue - totalPending;
  const totalNet = Math.round(totalRevenue * (1 - expensePct / 100));

  return (
    <div style={{ direction: 'rtl', fontFamily: 'Cairo, sans-serif', padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2 style={{ margin: 0 }}>🎉 حجوزات قاعة مذهلة</h2>
        <button
          onClick={openAddForm}
          style={{
            background: '#1B4D7A',
            color: '#fff',
            border: 'none',
            padding: '10px 20px',
            borderRadius: '8px',
            cursor: 'pointer',
            fontFamily: 'Cairo, sans-serif',
          }}
        >
          + إضافة حجز جديد
        </button>
      </div>

      <ExportToolbar
        data={filteredBookings.map((b) => ({ ...b, event_date_hijri: formatHijriDisplay(b.event_date_hijri) }))}
        columns={[
          { key: 'event_date_hijri', label: 'التاريخ الهجري' },
          { key: 'event_type', label: 'النوع' },
          { key: 'client_name', label: 'العميل' },
          { key: 'total_amount', label: 'الإجمالي' },
          { key: 'deposit_amount', label: 'العربون' },
          { key: 'remaining_amount', label: 'الباقي' },
          { key: 'remaining_status', label: 'حالة الباقي' },
        ]}
      />

      {/* تبويبات السنوات */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
        <button
          onClick={() => setSelectedYear('all')}
          style={yearTabStyle(selectedYear === 'all')}
        >
          كل السنين
        </button>
        {availableYears.map((y) => (
          <button
            key={y}
            onClick={() => setSelectedYear(y)}
            style={yearTabStyle(selectedYear === y)}
          >
            {y} هـ
          </button>
        ))}
      </div>

      {/* بطاقات ملخص (حسب التبويب المختار) */}
      <div style={{ display: 'flex', gap: '16px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <SummaryCard label="عدد الحجوزات" value={filteredBookings.length} color="#1B4D7A" />
        <SummaryCard label="إجمالي قيمة الحجوزات" value={`${totalRevenue.toLocaleString()} ر.س`} color="#1B4D7A" />
        <SummaryCard label="إجمالي المبالغ المستلمة" value={`${totalCollected.toLocaleString()} ر.س`} color="#27ae60" />
        <SummaryCard label="الباقي غير المحصّل" value={`${totalPending.toLocaleString()} ر.س`} color="#e74c3c" />
        <SummaryCard label={`صافي الدخل (بعد خصم ${expensePct}%)`} value={`${totalNet.toLocaleString()} ر.س`} color="#8E44AD" />
      </div>

      {/* نسبة المصاريف القابلة للتعديل */}
      <div style={{
        background: '#fff', borderRadius: '10px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
        padding: '14px 20px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px', maxWidth: '320px',
      }}>
        <label style={{ fontSize: '14px', color: '#555', fontWeight: 'bold', whiteSpace: 'nowrap' }}>
          نسبة المصاريف الثابتة (%)
        </label>
        <input
          type="number"
          value={expensePct}
          onChange={(e) => setExpensePct(Number(e.target.value) || 0)}
          style={{ width: '80px', padding: '6px 10px', borderRadius: '6px', border: '1px solid #ccc', fontFamily: 'Cairo, sans-serif' }}
        />
      </div>

      {/* الرسم البياني المقارن بين السنين */}
      {yearlyStats.length > 1 && (
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
              <Bar dataKey="net" name={`الصافي (بعد ${expensePct}%)`} fill="#27ae60" radius={[6, 6, 0, 0]} />
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
      )}

      {error && <div style={{ color: '#e74c3c', marginBottom: '10px' }}>{error}</div>}
      {loading ? (
        <div>جاري التحميل...</div>
      ) : (
        <div style={{ background: '#fff', borderRadius: '12px', boxShadow: '0 2px 12px rgba(0,0,0,0.07)', overflow: 'hidden' }}>
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
                  <th style={th}>إجراءات</th>
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
                        <button onClick={() => openEditForm(b)} style={actionBtn('#1B4D7A')}>تعديل</button>
                        <button onClick={() => handleDelete(b.id)} style={actionBtn('#e74c3c')}>حذف</button>
                      </td>
                    </tr>
                  );
                })}
                {filteredBookings.length === 0 && (
                  <tr>
                    <td colSpan={9} style={{ textAlign: 'center', padding: '20px', color: '#888' }}>
                      لا يوجد حجوزات لهذه السنة
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* فورم الإضافة/التعديل */}
      {showForm && (
        <div style={overlayStyle}>
          <div style={modalStyle}>
            <h3>{editingId ? 'تعديل حجز' : 'إضافة حجز جديد'}</h3>

            <label style={label}>تاريخ المناسبة (هجري - يوم/شهر/سنة)</label>
            <input
              type="text"
              placeholder="مثال: 24/1/1448"
              value={form.event_date_hijri}
              onChange={(e) => setForm({ ...form, event_date_hijri: e.target.value })}
              style={input}
            />

            <label style={label}>نوع المناسبة</label>
            <select
              value={form.event_type}
              onChange={(e) => setForm({ ...form, event_type: e.target.value })}
              style={input}
            >
              {EVENT_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>

            <label style={label}>اسم العميل</label>
            <input
              type="text"
              value={form.client_name}
              onChange={(e) => setForm({ ...form, client_name: e.target.value })}
              style={input}
            />

            <label style={label}>المبلغ الإجمالي</label>
            <input
              type="number"
              value={form.total_amount}
              onChange={(e) => setForm({ ...form, total_amount: e.target.value })}
              style={input}
            />

            <div style={{ display: 'flex', gap: '10px' }}>
              <div style={{ flex: 1 }}>
                <label style={label}>العربون</label>
                <input
                  type="number"
                  value={form.deposit_amount}
                  onChange={(e) => setForm({ ...form, deposit_amount: e.target.value })}
                  style={input}
                />
              </div>
              <div style={{ flex: 1 }}>
                <label style={label}>الباقي</label>
                <input
                  type="number"
                  value={form.remaining_amount}
                  onChange={(e) => setForm({ ...form, remaining_amount: e.target.value })}
                  style={input}
                />
              </div>
            </div>

            <label style={label}>استلام العربون (مرحلة أولى)</label>
            <select
              value={form.deposit_receiver_stage1}
              onChange={(e) => setForm({ ...form, deposit_receiver_stage1: e.target.value })}
              style={input}
            >
              {RECEIVER_STAGE1_OPTIONS.map((o) => (
                <option key={o} value={o}>{o}</option>
              ))}
            </select>

            <label style={label}>استلام العربون (نهائي)</label>
            <select
              value={form.deposit_receiver_final}
              onChange={(e) => setForm({ ...form, deposit_receiver_final: e.target.value })}
              style={input}
            >
              {RECEIVER_FINAL_OPTIONS.map((o) => (
                <option key={o} value={o}>{o}</option>
              ))}
            </select>

            <label style={label}>حالة الباقي</label>
            <select
              value={form.remaining_status}
              onChange={(e) => setForm({ ...form, remaining_status: e.target.value })}
              style={input}
            >
              {REMAINING_STATUS_OPTIONS.map((o) => (
                <option key={o} value={o}>{o}</option>
              ))}
            </select>

            <label style={label}>استلام الباقي (نهائي)</label>
            <select
              value={form.remaining_receiver_final}
              onChange={(e) => setForm({ ...form, remaining_receiver_final: e.target.value })}
              style={input}
            >
              {RECEIVER_FINAL_OPTIONS.map((o) => (
                <option key={o} value={o}>{o}</option>
              ))}
            </select>

            <label style={label}>ملاحظات</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              style={{ ...input, minHeight: '60px' }}
            />

            <div style={{ display: 'flex', gap: '10px', marginTop: '15px' }}>
              <button onClick={handleSave} style={{ ...actionBtn('#1B4D7A'), flex: 1, padding: '10px' }}>
                حفظ
              </button>
              <button onClick={() => setShowForm(false)} style={{ ...actionBtn('#999'), flex: 1, padding: '10px' }}>
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SummaryCard({ label, value, color }) {
  return (
    <div style={{ background: '#fff', border: `2px solid ${color}`, borderRadius: '10px', padding: '14px 20px', minWidth: '180px' }}>
      <div style={{ fontSize: '13px', color: '#666' }}>{label}</div>
      <div style={{ fontSize: '20px', fontWeight: 'bold', color }}>{value}</div>
    </div>
  );
}

function yearTabStyle(active) {
  return {
    padding: '8px 20px',
    borderRadius: '8px',
    border: active ? 'none' : '1px solid #ddd',
    background: active ? '#1B4D7A' : '#fff',
    color: active ? '#fff' : '#555',
    fontWeight: 'bold',
    fontSize: '14px',
    fontFamily: 'Cairo, sans-serif',
    cursor: 'pointer',
  };
}

const th = { padding: '12px 16px', fontWeight: 'bold', color: '#555' };
const td = { padding: '12px 16px' };
const label = { display: 'block', marginTop: '10px', marginBottom: '4px', fontSize: '13px', color: '#555' };
const input = {
  width: '100%',
  padding: '8px',
  borderRadius: '6px',
  border: '1px solid #ccc',
  fontFamily: 'Cairo, sans-serif',
  boxSizing: 'border-box',
};
const overlayStyle = {
  position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
  background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
};
const modalStyle = {
  background: '#fff', borderRadius: '12px', padding: '24px', width: '420px', maxHeight: '90vh', overflowY: 'auto',
  direction: 'rtl', fontFamily: 'Cairo, sans-serif',
};
function actionBtn(color) {
  return {
    background: color, color: '#fff', border: 'none', padding: '6px 12px',
    borderRadius: '6px', cursor: 'pointer', marginLeft: '6px', fontSize: '13px', fontFamily: 'Cairo, sans-serif',
  };
}