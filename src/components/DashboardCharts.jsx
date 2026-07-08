import { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { supabase } from '../supabaseClient';

const OCC_COLORS = { مؤجرة: '#2563eb', شاغرة: '#f59e0b', صيانة: '#ef4444' };
const PAY_COLORS = { مدفوع: '#10b981', جزئي: '#f59e0b', 'لم يُسدَّد': '#f43f5e' };
const BAR_PALETTE = ['#2563eb', '#0e7490', '#7c3aed', '#c2410c', '#0f766e', '#be123c', '#4338ca', '#15803d'];
const BAR_HIGHLIGHT = '#f59e0b';

function DashboardCharts() {
  const [properties, setProperties] = useState([]);
  const [selectedProperty, setSelectedProperty] = useState('all');
  const [occupancy, setOccupancy] = useState([]);
  const [payments, setPayments] = useState([]);
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
    await Promise.all([loadOccupancy(), loadPayments(), loadRevenue()]);
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
    const { data: pays, error: payErr } = await supabase.from('payments').select('status').in('lease_id', leaseIds);
    if (!payErr && pays) {
      const counts = { مدفوع: 0, جزئي: 0, 'لم يُسدَّد': 0 };
      pays.forEach((p) => { if (counts[p.status] !== undefined) counts[p.status]++; });
      setPayments(Object.entries(counts).filter(([, v]) => v > 0).map(([name, value]) => ({ name, value })));
    }
  };

  const loadRevenue = async () => {
    if (selectedProperty === 'all') {
      const { data: leases, error } = await supabase.from('leases').select('rent_amount, property_id, properties(name)');
      if (!error && leases) {
        const totals = {};
        leases.forEach((l) => {
          const pname = l.properties?.name || 'غير محدد';
          totals[pname] = (totals[pname] || 0) + Number(l.rent_amount || 0);
        });
        setRevenue(Object.entries(totals).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value));
      }
    } else {
      const { data: leases, error } = await supabase.from('leases').select('rent_amount, tenant_id, tenants(name)').eq('property_id', selectedProperty);
      if (!error && leases) {
        setRevenue(leases.map((l) => ({ name: l.tenants?.name || 'غير محدد', value: Number(l.rent_amount || 0) })).sort((a, b) => b.value - a.value));
      }
    }
  };

  const totalUnits = occupancy.reduce((s, o) => s + o.value, 0);
  const occupiedCount = occupancy.find((o) => o.name === 'مؤجرة')?.value || 0;
  const occupancyPct = totalUnits ? Math.round((occupiedCount / totalUnits) * 100) : 0;

  const totalPayments = payments.reduce((s, p) => s + p.value, 0);
  const paidCount = payments.find((p) => p.name === 'مدفوع')?.value || 0;
  const collectionPct = totalPayments ? Math.round((paidCount / totalPayments) * 100) : 0;

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
              <div style={{ ...styles.kpiValue, color: '#2563eb' }}>{totalRevenue.toLocaleString()}</div>
              <div style={styles.kpiLabel}>إجمالي الإيراد السنوي (ريال)</div>
            </div>
            <div style={styles.kpiCard}>
              <div style={{ ...styles.kpiValue, color: '#10b981' }}>{occupancyPct}%</div>
              <div style={styles.kpiLabel}>نسبة الإشغال ({occupiedCount} من {totalUnits})</div>
            </div>
            <div style={styles.kpiCard}>
              <div style={{ ...styles.kpiValue, color: '#f59e0b' }}>{collectionPct}%</div>
              <div style={styles.kpiLabel}>نسبة التحصيل ({paidCount} من {totalPayments})</div>
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
                <div style={styles.sectionTitle}>الإيراد السنوي</div>
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