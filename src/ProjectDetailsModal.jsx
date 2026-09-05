import ExportToolbar from './components/ExportToolbar';

function splitToNumberedItems(text) {
  if (!text) return [];
  return text
    .split(/؛|\n/)
    .map(s => s.trim())
    .filter(s => s.length > 0);
}

export default function ProjectDetailsModal({ project, onClose, onEdit, onDelete, isReadOnly }) {
  if (!project) return null;

  const balance = (Number(project.revenues) || 0) - (Number(project.expenses) || 0);

  const exportData = [{
    name: project.name,
    type: project.project_type || 'مصروف',
    description: (splitToNumberedItems(project.description).map((item, i) => `${i + 1}. ${item}`).join('\n') + `\n\nالمجموع = ${Number(project.project_type === 'إيراد' ? project.revenues : project.expenses || 0).toLocaleString()} ريال`) || '—',
    date: project.date_created ? `${project.date_created} هـ` : '—',
    status: project.status,
    expenses: `${Number(project.expenses || 0).toLocaleString()} ريال`,
    revenues: `${Number(project.revenues || 0).toLocaleString()} ريال`,
    balance: `${balance.toLocaleString()} ريال`,
    notes: project.notes || '—'
  }];

  const exportStats = [
    { label: 'المصروفات', value: `${Number(project.expenses || 0).toLocaleString()} ريال`, color: '#c0392b' },
    { label: 'الإيرادات', value: `${Number(project.revenues || 0).toLocaleString()} ريال`, color: '#1e8449' },
    { label: 'الرصيد', value: `${balance.toLocaleString()} ريال`, color: balance >= 0 ? '#1e8449' : '#c0392b' }
  ];

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#0006', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 60 }}>
      <div style={{ background: '#fff', borderRadius: 12, padding: '1.5rem', width: 640, maxWidth: '95%', maxHeight: '90vh', overflowY: 'auto', fontFamily: 'Cairo, sans-serif' }} dir="rtl">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ margin: 0, color: '#1B4D7A' }}>{project.name}</h3>
          <button onClick={onClose} className="no-print" style={{ border: 'none', background: 'none', fontSize: 20, cursor: 'pointer', color: '#6b7280' }}>✕</button>
        </div>

        <div className="no-print" style={{ marginBottom: 16 }}>
          <ExportToolbar
            data={exportData}
            columns={[
              { key: 'name', label: 'اسم المشروع' },
              { key: 'type', label: 'النوع' },
              { key: 'description', label: 'الوصف' },
              { key: 'date', label: 'التاريخ' },
              { key: 'status', label: 'الحالة' },
              { key: 'expenses', label: 'المصروفات' },
              { key: 'revenues', label: 'الإيرادات' },
              { key: 'balance', label: 'الرصيد' },
              { key: 'notes', label: 'ملاحظات' }
            ]}
            filename={`project_${project.name}`}
            title={project.name}
            stats={exportStats}
          />
        </div>

        <div style={rowStyle}><span style={labelStyle}>النوع:</span> {project.project_type || 'مصروف'}</div>
        <div style={rowStyle}><span style={labelStyle}>التاريخ:</span> {project.date_created ? `${project.date_created} هـ` : '—'}</div>
        <div style={rowStyle}><span style={labelStyle}>الحالة:</span> {project.status}</div>
        <div style={rowStyle}><span style={labelStyle}>المصروفات:</span> {Number(project.expenses || 0).toLocaleString()} ريال</div>
        <div style={rowStyle}><span style={labelStyle}>الإيرادات:</span> {Number(project.revenues || 0).toLocaleString()} ريال</div>
        <div style={{ ...rowStyle, fontWeight: 700, color: balance >= 0 ? '#27ae60' : '#e74c3c' }}><span style={labelStyle}>الرصيد:</span> {balance.toLocaleString()} ريال</div>
        <div style={{ ...rowStyle, alignItems: 'flex-start' }}>
          <span style={labelStyle}>الوصف:</span>
          <div style={{ flex: 1, color: '#374151' }}>
            {splitToNumberedItems(project.description).length > 0 ? (
              <>
                <ol style={{ margin: 0, paddingRight: 20 }}>
                  {splitToNumberedItems(project.description).map((item, i) => (
                    <li key={i} style={{ marginBottom: 6 }}>{item}</li>
                  ))}
                </ol>
                <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontWeight: 700 }}>المجموع =</span>
                  <span style={{
                    display: 'inline-block', background: '#e74c3c', color: '#fff',
                    borderRadius: '50%', width: 90, height: 90, display: 'flex',
                    alignItems: 'center', justifyContent: 'center', fontWeight: 700,
                    fontSize: 15, textAlign: 'center', lineHeight: 1.2
                  }}>
                    {Number(project.project_type === 'إيراد' ? project.revenues : project.expenses || 0).toLocaleString()}<br/>ريال
                  </span>
                </div>
              </>
            ) : '—'}
          </div>
        </div>
        <div style={{ ...rowStyle, alignItems: 'flex-start' }}>
          <span style={labelStyle}>ملاحظات:</span>
          <div style={{ whiteSpace: 'pre-wrap', flex: 1, color: '#374151' }}>{project.notes || '—'}</div>
        </div>

        {!isReadOnly && (
          <div className="no-print" style={{ display: 'flex', gap: 10, marginTop: 20, justifyContent: 'flex-end' }}>
            <button onClick={() => onDelete(project.id)} style={{ padding: '8px 16px', background: '#fee', color: '#c00', border: '1px solid #fcc', borderRadius: 8, cursor: 'pointer' }}>حذف المشروع</button>
            <button onClick={() => onEdit(project)} style={{ padding: '8px 16px', background: '#eef3ff', color: '#1B4D7A', border: '1px solid #c0d0e8', borderRadius: 8, cursor: 'pointer' }}>تعديل المشروع</button>
          </div>
        )}
      </div>
    </div>
  );
}

const rowStyle = { display: 'flex', gap: 10, padding: '8px 0', borderBottom: '1px solid #f3f4f6', fontSize: 14 };
const labelStyle = { fontWeight: 600, color: '#374151', minWidth: 100, whiteSpace: 'nowrap' };