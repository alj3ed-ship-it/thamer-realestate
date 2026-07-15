import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import ExportToolbar from './components/ExportToolbar';

const EVENT_TYPES = ['كاملة', 'نساء', 'رجال', 'أخرى'];
const RECEIVER_STAGE1_OPTIONS = ['أبو أيوب', 'تحويل مباشر', 'نقدي مباشر'];
const RECEIVER_FINAL_OPTIONS = ['مستلم', 'الوالد', 'لسا ما وصل'];
const REMAINING_STATUS_OPTIONS = ['مستلم', 'جزئي', 'غير مستلم'];

const STATUS_COLORS = {
  'مستلم': { bg: '#E8F8F0', text: '#1E8449', label: '🟢 مستلم' },
  'جزئي': { bg: '#FEF9E7', text: '#9A7D0A', label: '🟡 جزئي' },
  'غير مستلم': { bg: '#FDEDEC', text: '#C0392B', label: '🔴 غير مستلم' },
};

export default function Bookings() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [hallId, setHallId] = useState(null);

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
    remaining_receiver_final: 'لسا ما وصل',
    notes: '',
  };
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    loadHallAndBookings();
  }, []);

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

      // ترتيب حسب السنة الهجرية ثم الشهر ثم اليوم
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
      remaining_receiver_final: booking.remaining_receiver_final || 'لسا ما وصل',
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

  // إجماليات سريعة
  const totalRevenue = bookings.reduce((sum, b) => sum + Number(b.total_amount || 0), 0);
  const totalPending = bookings
    .filter((b) => b.remaining_status !== 'مستلم')
    .reduce((sum, b) => sum + Number(b.remaining_amount || 0), 0);

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
        data={bookings}
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

      {/* بطاقات ملخص */}
      <div style={{ display: 'flex', gap: '16px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <SummaryCard label="عدد الحجوزات" value={bookings.length} color="#1B4D7A" />
        <SummaryCard label="إجمالي قيمة الحجوزات" value={`${totalRevenue.toLocaleString()} ر.س`} color="#148F77" />
        <SummaryCard label="مبالغ لسا ما استُلمت نهائياً" value={`${totalPending.toLocaleString()} ر.س`} color="#C0392B" />
      </div>

      {error && <div style={{ color: '#C0392B', marginBottom: '10px' }}>{error}</div>}
      {loading ? (
        <div>جاري التحميل...</div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
            <thead>
              <tr style={{ background: '#F4F6F7', textAlign: 'right' }}>
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
              {bookings.map((b) => {
                const statusStyle = STATUS_COLORS[b.remaining_status] || STATUS_COLORS['جزئي'];
                return (
                  <tr key={b.id} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={td}>{b.event_date_hijri} هـ</td>
                    <td style={td}>{b.event_type}</td>
                    <td style={td}>{b.client_name}</td>
                    <td style={td}>{Number(b.total_amount).toLocaleString()} ر.س</td>
                    <td style={td}>{Number(b.deposit_amount).toLocaleString()} ر.س</td>
                    <td style={td}>{Number(b.remaining_amount).toLocaleString()} ر.س</td>
                    <td style={td}>
                      <span
                        style={{
                          background: statusStyle.bg,
                          color: statusStyle.text,
                          padding: '4px 10px',
                          borderRadius: '6px',
                          fontSize: '13px',
                        }}
                      >
                        {statusStyle.label}
                      </span>
                    </td>
                    <td style={td}>{b.remaining_receiver_final || '—'}</td>
                    <td style={td}>
                      <button onClick={() => openEditForm(b)} style={actionBtn('#1B4D7A')}>تعديل</button>
                      <button onClick={() => handleDelete(b.id)} style={actionBtn('#C0392B')}>حذف</button>
                    </td>
                  </tr>
                );
              })}
              {bookings.length === 0 && (
                <tr>
                  <td colSpan={9} style={{ textAlign: 'center', padding: '20px', color: '#888' }}>
                    لا يوجد حجوزات حالياً
                  </td>
                </tr>
              )}
            </tbody>
          </table>
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

const th = { padding: '10px', borderBottom: '2px solid #ddd' };
const td = { padding: '10px' };
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