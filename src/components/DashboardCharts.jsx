import { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LabelList } from 'recharts';
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

  const chartHeight = Math.max(300, revenue.length * 55);

  const Donut = ({ data, colors, centerValue, centerLabel }) => (
    <div style={styles.donutBlock}>
      <div style={styles.donutChartWrap}>
        <ResponsiveContainer width={200} height={200}>
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={62} outerRadius={90} paddingAngle={3}>
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

          <div style={styles.donutsRow}>
            {occupancy.length > 0 && (
              <div style={styles.donutSection}>
                <div style={styles.sectionTitle}>حالة الوحدات</div>
                <Donut data={occupancy} colors={OCC_COLORS} centerValue={occupancyPct} centerLabel="إشغال" />
              </div>
            )}
            {payments.length > 0 && (
              <div style={styles.donutSection}>
                <div style={styles.sectionTitle}>حالة الدفعات</div>
                <Donut data={payments} colors={PAY_COLORS} centerValue={collectionPct} centerLabel="تحصيل" />
              </div>
            )}
          </div>

          {revenue.length > 0 && (
            <div style={{ marginTop: '32px' }}>
              <div style={styles.sectionTitle}>الإيراد السنوي</div>
              <ResponsiveContainer width="100%" height={chartHeight}>
                <BarChart data={revenue} layout="vertical" margin={{ top: 10, right: 60, bottom: 10, left: 10 }} barCategoryGap={18}>
                  <XAxis type="number" tick={{ fill: '#374151', fontSize: 12 }} />
                  <YAxis type="category" dataKey="name" width={170} tick={{ fill: '#111827', fontSize: 14, fontWeight: 600 }} tickLine={false} />
                  <Tooltip formatter={(v) => `${v.toLocaleString()} ريال`} />
                  <Bar dataKey="value" radius={[0, 8, 8, 0]} barSize={28}>
                    {revenue.map((_, i) => (
                      <Cell key={i} fill={selectedProperty === 'all' ? BAR_PALETTE[i % BAR_PALETTE.length] : BAR_HIGHLIGHT} />
                    ))}
                    <LabelList dataKey="value" position="right" formatter={(v) => `${v.toLocaleString()} ﷼`} style={{ fill: '#111827', fontSize: 13, fontWeight: 'bold' }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </>
      )}
    </div>
  );
}

const styles = {
  card: { backgroundColor: '#fff', borderRadius: '12px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginTop: '24px' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' },
  title: { margin: 0, fontSize: '19px', fontWeight: 'bold', color: '#111827' },
  select: { padding: '8px 12px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '14px', color: '#111827' },
  loading: { textAlign: 'center', color: '#6b7280', padding: '40px 0' },
  kpiRow: { display: 'flex', gap: '16px', flexWrap: 'wrap', marginBottom: '28px' },
  kpiCard: { flex: 1, minWidth: '180px', backgroundColor: '#f8fafc', borderRadius: '10px', padding: '18px', textAlign: 'center' },
  kpiValue: { fontSize: '28px', fontWeight: 'bold' },
  kpiLabel: { fontSize: '13px', color: '#6b7280', marginTop: '6px' },
  sectionTitle: { fontSize: '15px', fontWeight: 'bold', color: '#374151', marginBottom: '12px' },
  donutsRow: { display: 'flex', gap: '32px', flexWrap: 'wrap' },
  donutSection: { flex: 1, minWidth: '320px' },
  donutBlock: { display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' },
  donutChartWrap: { position: 'relative', width: '200px', height: '200px' },
  donutCenter: { position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center' },
  donutCenterValue: { fontSize: '26px', fontWeight: 'bold', color: '#111827' },
  donutCenterLabel: { fontSize: '12px', color: '#6b7280' },
  legendList: { display: 'flex', flexDirection: 'column', gap: '10px' },
  legendRow: { display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' },
  legendDot: { width: '12px', height: '12px', borderRadius: '3px', display: 'inline-block' },
  legendName: { color: '#111827', fontWeight: 600, minWidth: '80px' },
  legendValue: { color: '#6b7280' }
};

export default DashboardCharts;