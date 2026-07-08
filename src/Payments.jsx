import { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import ExportToolbar from './components/ExportToolbar';
import { getUnitTypeColor } from './theme';

const STATUS_COLORS = {
  'مدفوع': { bg: '#dcfce7', text: '#15803d', border: '#86efac' },
  'جزئي': { bg: '#fef9c3', text: '#a16207', border: '#fde047' },
  'متأخرة': { bg: '#fee2e2', text: '#b91c1c', border: '#fca5a5' },
  'لم تستحق بعد': { bg: '#fff7ed', text: '#c2410c', border: '#fed7aa' }
};

const HIJRI_MONTHS = [
  'محرم', 'صفر', 'ربيع الأول', 'ربيع الآخر',
  'جمادى الأولى', 'جمادى الآخرة', 'رجب', 'شعبان',
  'رمضان', 'شوال', 'ذو القعدة', 'ذو الحجة'
];

const UNIT_TYPE_ORDER = { 'محل': 1, 'شقة': 2, 'ورشة': 3 };

function parseHijri(dateStr) {
  if (!dateStr) return null;
  const parts = dateStr.split('/').map((p) => parseInt(p));
  if (parts.length !== 3 || parts.some((p) => isNaN(p))) return null;
  // يدعم صيغتين: يوم/شهر/سنة (مثل 1/2/1448) أو سنة/شهر/يوم (مثل 1448/02/01)
  // نحدد أي رقم هو السنة بناءً على كونه أكبر من 1300
  if (parts[0] >= 1300) {
    return { year: parts[0], month: parts[1], day: parts[2] };
  }
  if (parts[2] >= 1300) {
    return { day: parts[0], month: parts[1], year: parts[2] };
  }
  return null;
}

function addHijriMonths(date, months) {
  const totalMonths = date.year * 12 + (date.month - 1) + months;
  return { year: Math.floor(totalMonths / 12), month: (totalMonths % 12) + 1, day: date.day };
}

function computeInstallmentHijri(startDateHijri, totalInstallments, installmentNumber) {
  const start = parseHijri(startDateHijri);
  if (!start || !totalInstallments) return null;
  const intervalMonths = 12 / totalInstallments;
  const monthsToAdd = (Number(installmentNumber || 1) - 1) * intervalMonths;
  const result = addHijriMonths(start, Math.round(monthsToAdd));
  return `${result.day}/${result.month}/${result.year}`;
}

// نوع الدفع محسوب من عدد الأقساط الكلي — نفس فكرة عمود "نوع الدفع" بصفحة العقود
function paymentTypeLabel(totalInstallments) {
  const t = Number(totalInstallments);
  if (!t) return '—';
  if (t === 1) return 'سنوي';
  if (t === 2) return 'نصف سنوي';
  if (t === 3) return 'كل 4 أشهر';
  if (t === 4) return 'ربع سنوي';
  if (t === 6) return 'كل شهرين';
  if (t === 12) return 'شهري';
  const intervalMonths = Math.round(12 / t);
  return `كل ${intervalMonths} أشهر`;
}

function Payments() {
  const [properties, setProperties] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [selectedProperty, setSelectedProperty] = useState('all');
  const [selectedTenant, setSelectedTenant] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedHijriMonth, setSelectedHijriMonth] = useState('all');
  const [selectedHijriYear, setSelectedHijriYear] = useState('');
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [editAmount, setEditAmount] = useState('');
  const [editMethod, setEditMethod] = useState('تحويل بنكي');
  const [editDate, setEditDate] = useState('');

  useEffect(() => {
    loadProperties();
  }, []);

  useEffect(() => {
    loadPayments();
  }, [selectedProperty, selectedTenant]);

  const loadProperties = async () => {
    const { data } = await supabase.from('properties').select('id, name, priority').order('priority');
    setProperties(data || []);
    const { data: tData } = await supabase.from('tenants').select('id, name').order('name');
    setTenants(tData || []);
  };

  const computeStatus = (row) => {
    const due = Number(row.amount_due || 0);
    const paid = Number(row.amount_paid || 0);
    if (paid >= due && due > 0) return 'مدفوع';
    const today = new Date().toISOString().slice(0, 10);
    const isOverdue = row.due_date_gregorian && row.due_date_gregorian < today;
    if (paid > 0) return 'جزئي';
    if (isOverdue) return 'متأخرة';
    return 'لم تستحق بعد';
  };

  const loadPayments = async () => {
    setLoading(true);
    let query = supabase
      .from('payments')
      .select(`
        id, lease_id, amount_due, amount_paid, due_date_gregorian, due_date_hijri,
        installment_number, total_installments, payment_date, payment_method, notes,
        leases (
          id, property_id, tenant_id, start_date_hijri,
          properties ( name, priority ),
          tenants ( name, phone, note ),
          lease_units ( units ( unit_number, unit_type ) )
        )
      `)
      .order('due_date_gregorian', { ascending: true });

    const { data, error } = await query;
    if (!error && data) {
      let rows = data.filter((r) => r.leases);
      if (selectedProperty !== 'all') {
        rows = rows.filter((r) => r.leases.property_id === selectedProperty);
      }
      if (selectedTenant !== 'all') {
        rows = rows.filter((r) => r.leases.tenant_id === selectedTenant);
      }
      rows = rows.map((r) => {
        const computedHijri = computeInstallmentHijri(r.leases.start_date_hijri, r.total_installments, r.installment_number)
          || r.due_date_hijri;

        const units = r.leases?.lease_units?.map((lu) => lu.units).filter(Boolean) || [];
        let sortType = 99;
        let sortNum = 999;
        units.forEach((u) => {
          const t = UNIT_TYPE_ORDER[u.unit_type] || 4;
          const n = parseInt(u.unit_number) || 999;
          if (t < sortType || (t === sortType && n < sortNum)) {
            sortType = t;
            sortNum = n;
          }
        });

        return {
          ...r,
          computedStatus: computeStatus(r),
          computedHijri,
          propertyPriority: r.leases?.properties?.priority ?? 99,
          sortType,
          sortNum,
        };
      });
      setPayments(rows);
    }
    setLoading(false);
  };

  const startEdit = (row) => {
    setEditingId(row.id);
    setEditAmount(row.amount_due);
    setEditMethod('تحويل بنكي');
    setEditDate(new Date().toISOString().slice(0, 10));
  };

  const cancelEdit = () => {
    setEditingId(null);
  };

  const markAsPaid = async (row) => {
    const { error } = await supabase
      .from('payments')
      .update({
        amount_paid: Number(editAmount),
        payment_date: editDate,
        payment_method: editMethod
      })
      .eq('id', row.id);
    if (!error) {
      setEditingId(null);
      loadPayments();
    } else {
      alert('حصل خطأ أثناء الحفظ: ' + error.message);
    }
  };

  const unitsList = (row) => {
    return row.leases?.lease_units?.map((lu) => lu.units).filter(Boolean) || [];
  };

  const unitsLabel = (row) => {
    const units = unitsList(row);
    return units.map((u) => `${u.unit_type} ${u.unit_number}`).join(' + ') || '—';
  };

  const unitBadges = (row) => {
    const units = unitsList(row);
    if (units.length === 0) return '—';
    return (
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
        {units.map((u, idx) => {
          const c = getUnitTypeColor(u.unit_type);
          return (
            <span key={idx} style={{
              background: c.bg, color: c.color, border: `1px solid ${c.border}`,
              padding: '2px 8px', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold', whiteSpace: 'nowrap',
            }}>
              {u.unit_type} {u.unit_number}
            </span>
          );
        })}
      </div>
    );
  };

  const hijriYearActive = selectedHijriYear.trim() !== '';
  const hijriMonthActive = selectedHijriMonth !== 'all';
  const hijriFilterActive = hijriYearActive || hijriMonthActive;

  const hijriFiltered = payments.filter((r) => {
    if (!hijriFilterActive) return true;
    const d = parseHijri(r.computedHijri);
    if (!d) return false;
    if (hijriYearActive && d.year !== Number(selectedHijriYear)) return false;
    if (hijriMonthActive && d.month !== Number(selectedHijriMonth)) return false;
    return true;
  });

  let displayedPayments = selectedStatus === 'all'
    ? hijriFiltered
    : hijriFiltered.filter((r) => r.computedStatus === selectedStatus);

  // ترتيب دائم: المحلات أولاً تصاعدياً حسب رقمها، ثم الشقق/الورش/المستودعات كمجموعة أخيرة
  displayedPayments = [...displayedPayments].sort((a, b) => {
    if (a.sortType !== b.sortType) return a.sortType - b.sortType;
    return a.sortNum - b.sortNum;
  });

  const totalDue = displayedPayments.reduce((sum, r) => sum + Number(r.amount_due || 0), 0);
  const totalPaidCash = displayedPayments.reduce((sum, r) => sum + Number(r.amount_paid || 0), 0);
  const partialDue = displayedPayments
    .filter((r) => r.computedStatus === 'جزئي')
    .reduce((sum, r) => sum + Number(r.amount_due || 0), 0);
  const remainingDue = totalDue - totalPaidCash;

  const exportData = displayedPayments.map((row) => ({
    property: row.leases?.properties?.name || '—',
    tenant: row.leases?.tenants?.name || '—',
    activity: row.leases?.tenants?.note || '—',
    unit: unitsLabel(row),
    paymentType: paymentTypeLabel(row.total_installments),
    installment: `${row.installment_number}/${row.total_installments}`,
    amount: row.computedStatus === 'جزئي' || row.computedStatus === 'مدفوع'
      ? `${Number(row.amount_paid).toLocaleString()} / ${Number(row.amount_due).toLocaleString()} ريال`
      : `${Number(row.amount_due).toLocaleString()} ريال`,
    dueDate: row.due_date_gregorian || '—',
    status: row.computedStatus,
  }));

  const exportStats = [
    { label: 'مدفوع', value: `${totalPaidCash.toLocaleString()} ريال`, color: '#27ae60' },
    { label: 'جزئي', value: `${partialDue.toLocaleString()} ريال`, color: '#f39c12' },
    { label: 'متبقي', value: `${remainingDue.toLocaleString()} ريال`, color: '#e74c3c' },
    { label: 'الإجمالي', value: `${totalDue.toLocaleString()} ريال`, color: '#1B4D7A' },
  ];

  return (
    <div style={styles.page}>
      <h2 style={styles.title}>الدفعات</h2>
      <p style={styles.subtitle}>كل قسط ببطاقة مستقلة بتاريخ استحقاقه وحالته الخاصة</p>

      <div style={styles.filterRow} className="no-print">
        <select value={selectedProperty} onChange={(e) => setSelectedProperty(e.target.value)} style={styles.select}>
          <option value="all">كل العقارات</option>
          {properties.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
        <select value={selectedTenant} onChange={(e) => setSelectedTenant(e.target.value)} style={{ ...styles.select, marginRight: 10 }}>
          <option value="all">كل المستأجرين</option>
          {tenants.map((t) => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>
        <select value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value)} style={{ ...styles.select, marginRight: 10, minWidth: 160 }}>
          <option value="all">كل الحالات</option>
          <option value="مدفوع">مدفوع</option>
          <option value="جزئي">جزئي</option>
          <option value="متأخرة">متأخرة</option>
          <option value="لم تستحق بعد">لم تستحق بعد</option>
        </select>
        <select value={selectedHijriMonth} onChange={(e) => setSelectedHijriMonth(e.target.value)} style={{ ...styles.select, marginRight: 10, minWidth: 160 }}>
          <option value="all">كل الأشهر (هجري)</option>
          {HIJRI_MONTHS.map((name, i) => (
            <option key={i + 1} value={i + 1}>{i + 1} - {name}</option>
          ))}
        </select>
        <input
          type="number"
          placeholder="السنة الهجرية (مثال 1448)"
          value={selectedHijriYear}
          onChange={(e) => setSelectedHijriYear(e.target.value)}
          style={{ ...styles.select, marginRight: 10, width: 180 }}
        />
        {hijriFilterActive && (
          <button onClick={() => { setSelectedHijriMonth('all'); setSelectedHijriYear(''); }} style={{ ...styles.cancelBtn, marginRight: 10 }}>
            إلغاء فلتر الشهر
          </button>
        )}
      </div>

      {loading ? (
        <p style={styles.loading}>جارِ التحميل...</p>
      ) : (
        <div id="payments-table">
          <ExportToolbar
            data={exportData}
            columns={[
              { key: 'property', label: 'العقار' },
              { key: 'tenant', label: 'المستأجر' },
              { key: 'activity', label: 'النشاط' },
              { key: 'unit', label: 'الوحدة' },
              { key: 'paymentType', label: 'نوع الدفع' },
              { key: 'installment', label: 'رقم الدفعة' },
              { key: 'amount', label: 'المبلغ' },
              { key: 'dueDate', label: 'تاريخ الاستحقاق' },
              { key: 'status', label: 'الحالة' },
            ]}
            filename="payments_report"
            title="تقرير الدفعات"
            stats={exportStats}
          />

          <div className="no-print" style={{ marginBottom: 14, fontSize: 13, color: '#374151' }}>
            يعرض {displayedPayments.length} من أصل {payments.length} قسط
          </div>

          <div style={styles.statsRow} className="no-print">
            <div style={{ ...styles.statBox, background: '#EAFAF1', border: '1px solid #A9DFBF' }}>
              <div style={styles.statLabel}>مدفوع</div>
              <div style={{ ...styles.statValue, color: '#27ae60' }}>{totalPaidCash.toLocaleString()} ريال</div>
            </div>
            <div style={{ ...styles.statBox, background: '#FEF9E7', border: '1px solid #F9E79F' }}>
              <div style={styles.statLabel}>جزئي</div>
              <div style={{ ...styles.statValue, color: '#f39c12' }}>{partialDue.toLocaleString()} ريال</div>
            </div>
            <div style={{ ...styles.statBox, background: '#FDEDEC', border: '1px solid #F1948A' }}>
              <div style={styles.statLabel}>متبقي</div>
              <div style={{ ...styles.statValue, color: '#e74c3c' }}>{remainingDue.toLocaleString()} ريال</div>
            </div>
            <div style={{ ...styles.statBox, background: '#EBF5FB', border: '1px solid #AED6F1' }}>
              <div style={styles.statLabel}>الإجمالي</div>
              <div style={{ ...styles.statValue, color: '#1B4D7A' }}>{totalDue.toLocaleString()} ريال</div>
            </div>
          </div>

          <div style={styles.tableWrap}>
            <table style={styles.table}>
              <thead>
                <tr style={styles.headRow}>
                  {['العقار', 'المستأجر', 'النشاط', 'الوحدات', 'نوع الدفع', 'القسط', 'تاريخ الاستحقاق', 'المبلغ', 'الحالة', ''].map((h) => (
                    <th key={h} style={styles.th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {displayedPayments.map((row, idx) => {
                  const colors = STATUS_COLORS[row.computedStatus];
                  const isEditing = editingId === row.id;
                  return (
                    <tr key={row.id} style={{ background: idx % 2 === 0 ? '#fff' : '#f8fafc', borderBottom: '1px solid #e5e7eb' }}>
                      <td style={{ ...styles.td, color: '#6b7280' }}>{row.leases?.properties?.name || '—'}</td>
                      <td style={styles.td}>
                        <span style={styles.tenantName}>{row.leases?.tenants?.name || '—'}</span>
                      </td>
                      <td style={{ ...styles.td, color: '#9ca3af', fontSize: 13 }}>{row.leases?.tenants?.note || '—'}</td>
                      <td style={styles.td}>{unitBadges(row)}</td>
                      <td style={styles.td}>
                        <span style={styles.paymentTypeChip}>{paymentTypeLabel(row.total_installments)}</span>
                      </td>
                      <td style={{ ...styles.td, color: '#6b7280' }}>{row.installment_number}/{row.total_installments}</td>
                      <td style={{ ...styles.td, color: '#6b7280', whiteSpace: 'nowrap' }}>
                        {row.due_date_gregorian || '—'}
                        {row.computedHijri && <span style={{ color: '#9ca3af', fontSize: 12 }}> ({row.computedHijri}هـ)</span>}
                      </td>
                      <td style={{ ...styles.td, fontWeight: 600, whiteSpace: 'nowrap' }}>
                        {row.computedStatus === 'جزئي' || row.computedStatus === 'مدفوع'
                          ? `${Number(row.amount_paid).toLocaleString()}/${Number(row.amount_due).toLocaleString()}`
                          : Number(row.amount_due).toLocaleString()}
                        {' '}ريال
                      </td>
                      <td style={styles.td}>
                        <span style={{ ...styles.badge, backgroundColor: colors.bg, color: colors.text, border: `1px solid ${colors.border}` }}>
                          {row.computedStatus}
                        </span>
                      </td>
                      <td className="no-print" style={styles.td}>
                        {isEditing ? (
                          <div style={styles.editBox}>
                            <input
                              type="number"
                              value={editAmount}
                              onChange={(e) => setEditAmount(e.target.value)}
                              style={styles.miniInput}
                              placeholder="المبلغ"
                            />
                            <input
                              type="date"
                              value={editDate}
                              onChange={(e) => setEditDate(e.target.value)}
                              style={styles.miniInput}
                            />
                            <select value={editMethod} onChange={(e) => setEditMethod(e.target.value)} style={styles.miniInput}>
                              <option value="تحويل بنكي">تحويل بنكي</option>
                              <option value="نقداً">نقداً</option>
                              <option value="STC Pay">STC Pay</option>
                            </select>
                            <div style={{ display: 'flex', gap: 6 }}>
                              <button onClick={() => markAsPaid(row)} style={styles.saveBtn}>حفظ</button>
                              <button onClick={cancelEdit} style={styles.cancelBtn}>إلغاء</button>
                            </div>
                          </div>
                        ) : (
                          row.computedStatus !== 'مدفوع' && (
                            <button onClick={() => startEdit(row)} style={styles.payBtnSmall}>تسجيل كمدفوعة</button>
                          )
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  page: { padding: '24px' },
  title: { margin: 0, fontSize: '24px', fontWeight: 'bold', color: '#111827' },
  subtitle: { color: '#6b7280', fontSize: '14px', marginTop: '4px', marginBottom: '20px' },
  filterRow: { marginBottom: '20px', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '10px' },
  select: { padding: '10px 14px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '14px', minWidth: '180px' },
  loading: { textAlign: 'center', color: '#6b7280', padding: '40px 0' },

  statsRow: { display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' },
  statBox: { flex: '1 1 150px', borderRadius: '10px', padding: '14px 20px', textAlign: 'center' },
  statLabel: { fontSize: '13px', color: '#555' },
  statValue: { fontWeight: 'bold', fontSize: '18px', marginTop: '2px' },

  tableWrap: {
    overflowX: 'auto',
    borderRadius: '12px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '14px',
    background: '#fff',
  },
  headRow: { background: '#1B4D7A', textAlign: 'right' },
  th: { padding: '14px 12px', color: '#fff', fontWeight: 600, fontSize: 13, whiteSpace: 'nowrap' },
  td: { padding: '12px' },
  tenantName: { color: '#1B4D7A', fontWeight: 700, fontSize: '14px' },
  paymentTypeChip: {
    backgroundColor: '#EAF2FF', color: '#2563eb',
    padding: '2px 10px', borderRadius: '10px', fontSize: '12px', fontWeight: 'bold', whiteSpace: 'nowrap',
  },
  badge: { padding: '4px 10px', borderRadius: '16px', fontSize: '12px', fontWeight: 600, whiteSpace: 'nowrap' },
  payBtnSmall: { padding: '6px 12px', backgroundColor: '#2563eb', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '12px', cursor: 'pointer', whiteSpace: 'nowrap' },
  editBox: { display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center', minWidth: '260px' },
  miniInput: { padding: '5px 8px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '12px', flex: '1 1 100px' },
  saveBtn: { padding: '6px 10px', backgroundColor: '#10b981', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '12px', cursor: 'pointer' },
  cancelBtn: { padding: '6px 10px', backgroundColor: '#e5e7eb', color: '#374151', border: 'none', borderRadius: '6px', fontSize: '12px', cursor: 'pointer' },
};

export default Payments;