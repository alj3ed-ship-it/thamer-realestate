import { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { supabase } from '../supabaseClient';
function parseHijri(dateStr) {
  if (!dateStr) return null;
  const parts = dateStr.split("/").map((p) => parseInt(p));
  if (parts.length !== 3 || parts.some((p) => isNaN(p))) return null;
  if (parts[0] >= 1300) return { year: parts[0], month: parts[1], day: parts[2] };
  if (parts[2] >= 1300) return { day: parts[0], month: parts[1], year: parts[2] };
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
  return addHijriMonths(start, Math.round(monthsToAdd));
}

const OCC_COLORS = { مؤجرة: '#2563eb', شاغرة: '#f59e0b', صيانة: '#ef4444' };
const PAY_COLORS = { مدفوع: '#10b981', جزئي: '#f59e0b', متأخر: '#f43f5e', 'لم يستحق بعد': '#9ca3af' };
const BAR_PALETTE = ['#2563eb', '#0e7490', '#7c3aed', '#c2410c', '#0f766e', '#be123c', '#4338ca', '#15803d'];
const BAR_HIGHLIGHT = '#f59e0b';

function DashboardCharts() {
  const [properties, setProperties] = useState([]);
  const [selectedProperty, setSelectedProperty] = useState('all');
  const [occupancy, setOccupancy] = useState([]);
  const [payments, setPayments] = useState([]);
  const [hijriYearTotal, setHijriYearTotal] = useState(0);
  const [revenue, setRevenue] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProperties();
  }, []);

  useEffect(() => {
    loadAll();
  }, [selectedProperty]);

  const loadProperties = async () => {
    const { data, error } = await supabase.from('properties').select('id, name').order('name');
    if (!error) setProperties(data || []);
  };

  const loadAll = async () => {
    setLoading(true);
    await Promise.all([loadOccupancy(), loadPayments(), loadRevenue(), loadHijriYearTotal()]);
    setLoading(false);
  };

  const loadOccupancy = async () => {
    let query = supabase.from('units').select('status, property_id');
    if (selectedProperty !== 'all') query = query.eq('property_id', selectedProperty);
    const { data, error } = await query;
    if (!error && data) {
      const counts = { مؤجرة: 0, شاغرة: 0, صيانة: 0 };
      data.forEach((u) => { if (counts[u.status] !== undefined) counts[u.status]++; });
      setOccupancy(Object.entries(counts).filter(([, v]) => v > 0).map(([name, value]) => ({ name, value })));
    }
  };

  const loadPayments = async () => {
    let leaseQuery = supabase.from('leases').select('id, property_id');
    if (selectedProperty !== 'all') leaseQuery = leaseQuery.eq('property_id', selectedProperty);
    const { data: leases, error: leaseErr } = await leaseQuery;
    if (leaseErr || !leases) { setPayments([]); return; }
    const leaseIds = leases.map((l) => l.id);
    if (leaseIds.length === 0) { setPayments([]); return; }
    const { data: pays, error: payErr } = await supabase.from('payments').select('amount, amount_paid, due_date_gregorian, status').in('lease_id', leaseIds);
    if (!payErr && pays) {
      const today = new Date(); today.setHours(0, 0, 0, 0);
      const counts = { مدفوع: 0, جزئي: 0, متأخر: 0, 'لم يستحق بعد': 0 };
            pays.forEach((p) => {
        if (p.status === "ملغى") return;
        const due = Number(p.amount || 0);
        const paid = Number(p.amount_paid || 0);
        // نفس منطق حساب الحالة المستخدم في صفحة الاستحقاقات (Entitlements.jsx):
        // فصل حالة السداد (مدفوع/جزئي/لا شيء) عن الحالة الزمنية (استحق/لم يستحق بعد)
        if (paid > 0 && paid >= due && due > 0) {
          counts['مدفوع']++;
        } else if (paid > 0) {
          counts['جزئي']++;
        } else {
          const dueDate = p.due_date_gregorian ? new Date(p.due_date_gregorian) : null;
          if (dueDate && dueDate > today) counts['لم يستحق بعد']++;
          else counts['متأخر']++;
        }
      });
      setPayments(Object.entries(counts).filter(([, v]) => v > 0).map(([name, value]) => ({ name, value })));
    }
  };

  // يحسب صافي دخل المالك الفعلي من مبلغ عقد واحد، حسب حالة الضريبة عليه:
  // - عقد غير خاضع للضريبة: الصافي = المبلغ كامل
  // - عقد خاضع وشامل الضريبة (مثل المجاهدين): الصافي = المبلغ الأساسي بعد فرز الـ15% من الداخل (الضريبة مو من جيبه)
  // - عقد خاضع وغير شامل: الصافي = المبلغ ناقص الـ15% اللي يتحملها المالك من جيبه لصالح الحكومة
   function computeNetRevenue(rentAmount, taxEnabled, amountIncludesVat) {
    const amt = Number(rentAmount || 0);
    if (!taxEnabled) return amt;
    if (amountIncludesVat) return amt / 1.15;
    return amt * 0.85;
  }

  const loadHijriYearTotal = async () => {
    const { data, error } = await supabase
      .from("payments")
      .select("amount_due, status, installment_number, total_installments, leases(start_date_hijri, tax_enabled, amount_includes_vat)");
    if (error || !data) return;
    let total = 0;
    data.forEach((row) => {
      if (row.status === "ملغى") return;
      const lease = row.leases;
      if (!lease) return;
      const hijri = computeInstallmentHijri(lease.start_date_hijri, row.total_installments, row.installment_number);
      if (!hijri || hijri.year !== 1448) return;
      total += computeNetRevenue(row.amount_due, lease.tax_enabled, lease.amount_includes_vat);
    });
    setHijriYearTotal(Math.round(total));
  };

  const loadRevenue = async () => {
    if (selectedProperty === 'all') {
      const { data: leases, error } = await supabase.from('leases').select('rent_amount, property_id, tax_enabled, amount_includes_vat, properties(name)').neq('status', 'منتهي');
      if (!error && leases) {
        const totals = {};
        leases.forEach((l) => {
          const pname = l.properties?.name || 'غير محدد';
          const net = computeNetRevenue(l.rent_amount, l.tax_enabled, l.amount_includes_vat);
          totals[pname] = (totals[pname] || 0) + net;
        });
        setRevenue(Object.entries(totals).map(([name, value]) => ({ name, value: Math.round(value) })).sort((a, b) => b.value - a.value));
      }
    } else {
      const { data: leases, error } = await supabase.from('leases').select('rent_amount, tenant_id, tax_enabled, amount_includes_vat, tenants(name)').eq('property_id', selectedProperty).neq('status', 'منتهي');
      if (!error && leases) {
        setRevenue(leases.map((l) => ({
          name: l.tenants?.name || 'غير محدد',
          value: Math.round(computeNetRevenue(l.rent_amount, l.tax_enabled, l.amount_includes_vat))
        })).sort((a, b) => b.value - a.value));
      }
    }
  };

  const totalUnits = occupancy.reduce((s, o) => s + o.value, 0);
  const occupiedCount = occupancy.find((o) => o.name === 'مؤجرة')?.value || 0;
  const occupancyPct = totalUnits ? Math.round((occupiedCount / totalUnits) * 100) : 0;

  const totalPayments = payments.reduce((s, p) => s + p.value, 0);
  const paidCount = payments.find((p) => p.name === 'مدفوع')?.value || 0;
  // نسبة التحصيل تُحسب من الدفعات المستحقة فقط (نستثني "لم يستحق بعد" لأنها ليست جزءاً من المطلوب تحصيله حالياً)
  const dueSoFarCount = totalPayments - (payments.find((p) => p.name === 'لم يستحق بعد')?.value || 0);
  const collectionPct = dueSoFarCount ? Math.round((paidCount / dueSoFarCount) * 100) : 0;

  const totalRevenue = revenue.reduce((s, r) => s + r.value, 0);
  const maxRevenue = Math.max(...revenue.map((r) => r.value), 1);

  const Donut = ({ data, colors, centerValue, centerLabel }) => (
    <div style={styles.donutBlock}>
      <div style={styles.donutChartWrap}>
        <ResponsiveContainer width={190} height={190}>
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={56} outerRadius={84} paddingAngle={3}>
              {data.map((entry, i) => <Cell key={i} fill={colors[entry.name] || '#94a3b8'} />)}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
        <div style={styles.donutCenter}>
          <div style={styles.donutCenterValue}>{centerValue}%</div>
          <div style={styles.donutCenterLabel}>{centerLabel}</div>
        </div>
      </div>
      <div style={styles.legendList}>
        {data.map((d, i) => {
          const total = data.reduce((s, x) => s + x.value, 0);
          const pct = total ? Math.round((d.value / total) * 100) : 0;
          return (
            <div key={i} style={styles.legendRow}>
              <span style={{ ...styles.legendDot, backgroundColor: colors[d.name] || '#94a3b8' }} />
              <span style={styles.legendName}>{d.name}</span>
              <span style={styles.legendValue}>{d.value} ({pct}%)</span>
            </div>
          );
        })}
      </div>
    </div>
  );

  // قائمة أشرطة مخصّصة (بدون recharts) للإيراد السنوي — تفادي تداخل الأسماء وتصغير المساحة
  const RevenueBars = () => (
    <div style={styles.revenueList}>
      {revenue.map((r, i) => {
        const pct = Math.max((r.value / maxRevenue) * 100, 3);
        const color = selectedProperty === 'all' ? BAR_PALETTE[i % BAR_PALETTE.length] : BAR_HIGHLIGHT;
        return (
          <div key={i} style={styles.revenueRow} title={r.name}>
            <div style={styles.revenueName}>{r.name}</div>
            <div style={styles.revenueTrack}>
              <div style={{ ...styles.revenueFill, width: `${pct}%`, background: color }} />
            </div>
            <div style={styles.revenueValue}>{r.value.toLocaleString()}</div>
          </div>
        );
      })}
    </div>
  );

  return (
    <div style={styles.card}>
      <div style={styles.header}>
        <h3 style={styles.title}>لوحة المعلومات</h3>
        <select value={selectedProperty} onChange={(e) => setSelectedProperty(e.target.value)} style={styles.select}>
          <option value="all">كل العقارات</option>
          {properties.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>

      {loading ? (
        <p style={styles.loading}>جارِ التحميل...</p>
      ) : (
        <>
              <div style={styles.kpiRow}>
                <div style={styles.kpiCard}>
        <div style={{ ...styles.kpiValue, color: '#f59e0b' }}>{collectionPct}%</div>
        <div style={styles.kpiLabel}>نسبة التحصيل ({paidCount} من {dueSoFarCount} مستحق)</div>
      </div>
      <div style={styles.kpiCard}>
        <div style={{ ...styles.kpiValue, color: '#7c3aed' }}>{hijriYearTotal.toLocaleString()}</div>
        <div style={styles.kpiLabel}>إجمالي عقود السنة الهجرية 1448 (صافي، ريال)</div>
      </div>
    </div>

          {/* صف واحد: حالة الوحدات | الإيراد السنوي (بالوسط) | حالة الدفعات */}
          <div style={styles.chartsRow}>
            {occupancy.length > 0 && (
              <div style={styles.sideChartSection}>
                <div style={styles.sectionTitle}>حالة الوحدات</div>
                <Donut data={occupancy} colors={OCC_COLORS} centerValue={occupancyPct} centerLabel="إشغال" />
              </div>
            )}

            {revenue.length > 0 && (
              <div style={styles.middleChartSection}>
                <div style={styles.sectionTitle}>صافي الإيراد السنوي</div>
                <RevenueBars />
              </div>
            )}

            {payments.length > 0 && (
              <div style={styles.sideChartSection}>
                <div style={styles.sectionTitle}>حالة الدفعات</div>
                <Donut data={payments} colors={PAY_COLORS} centerValue={collectionPct} centerLabel="تحصيل" />
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

const styles = {
  card: { backgroundColor: '#fff', borderRadius: '12px', padding: '22px 26px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginTop: '16px' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' },
  title: { margin: 0, fontSize: '19px', fontWeight: 'bold', color: '#111827' },
  select: { padding: '7px 12px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '13px', color: '#111827' },
  loading: { textAlign: 'center', color: '#6b7280', padding: '30px 0' },

  kpiRow: { display: 'flex', gap: '14px', flexWrap: 'wrap', marginBottom: '20px' },
  kpiCard: { flex: 1, minWidth: '170px', backgroundColor: '#f8fafc', borderRadius: '10px', padding: '14px 18px', textAlign: 'center' },
  kpiValue: { fontSize: '24px', fontWeight: 'bold' },
  kpiLabel: { fontSize: '13px', color: '#6b7280', marginTop: '4px' },

  sectionTitle: { fontSize: '15px', fontWeight: 'bold', color: '#374151', marginBottom: '12px', textAlign: 'center' },

  chartsRow: { display: 'grid', gridTemplateColumns: '1fr 1.6fr 1fr', gap: '20px', alignItems: 'start' },
  sideChartSection: { minWidth: '0' },
  middleChartSection: { minWidth: '0' },

  donutBlock: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' },
  donutChartWrap: { position: 'relative', width: '190px', height: '190px' },
  donutCenter: { position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center' },
  donutCenterValue: { fontSize: '22px', fontWeight: 'bold', color: '#111827' },
  donutCenterLabel: { fontSize: '13px', color: '#6b7280' },
  legendList: { display: 'flex', flexDirection: 'column', gap: '6px', width: '100%' },
  legendRow: { display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', justifyContent: 'center' },
  legendDot: { width: '12px', height: '12px', borderRadius: '3px', display: 'inline-block', flexShrink: 0 },
  legendName: { color: '#111827', fontWeight: 600 },
  legendValue: { color: '#6b7280' },

  revenueList: { display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '280px', overflowY: 'auto', paddingLeft: '2px' },
  revenueRow: { display: 'flex', alignItems: 'center', gap: '10px' },
  revenueName: { width: '130px', flexShrink: 0, fontSize: '14px', color: '#111827', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  revenueTrack: { flex: 1, height: '20px', background: '#f1f5f9', borderRadius: '10px', overflow: 'hidden' },
  revenueFill: { height: '100%', borderRadius: '10px', transition: 'width 0.3s ease' },
  revenueValue: { width: '90px', flexShrink: 0, fontSize: '14px', color: '#111827', fontWeight: 700, textAlign: 'left' },
};

export default DashboardCharts;
