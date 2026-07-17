import { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import ExportToolbar from './components/ExportToolbar';

const STATUS_COLORS = {
  'جاري': { bg: '#dbeafe', text: '#0c4a6e', border: '#0284c7' },
  'منتهي': { bg: '#dcfce7', text: '#15803d', border: '#86efac' }
};

function Projects() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [expandedDesc, setExpandedDesc] = useState(new Set());
  const [expandedNotes, setExpandedNotes] = useState(new Set());
  const emptyFormState = {
    name: '',
    description: '',
    date_created: '',
    status: 'جاري',
    expenses: '',
    revenues: '',
    notes: ''
  };
  const [formData, setFormData] = useState(emptyFormState);

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('projects')
      .select('*');

    if (!error && data) {
      setProjects(data);
    }
    if (error) {
      console.error('Projects load error:', error);
    }
    setLoading(false);
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const resetForm = () => {
    setFormData(emptyFormState);
    setEditingId(null);
    setShowForm(false);
  };

  const saveProject = async () => {
    if (!formData.name.trim()) {
      alert('أدخل اسم المشروع');
      return;
    }

    const projectData = {
      name: formData.name,
      description: formData.description,
      date_created: formData.date_created,
      status: formData.status,
      expenses: Number(formData.expenses) || 0,
      revenues: Number(formData.revenues) || 0,
      notes: formData.notes
    };

    if (editingId) {
      const { error } = await supabase
        .from('projects')
        .update(projectData)
        .eq('id', editingId);

      if (!error) {
        loadProjects();
        resetForm();
      } else {
        alert('حصل خطأ: ' + error.message);
      }
    } else {
      const { error } = await supabase
        .from('projects')
        .insert([projectData]);

      if (!error) {
        loadProjects();
        resetForm();
      } else {
        alert('حصل خطأ: ' + error.message);
      }
    }
  };

  const startEdit = (project) => {
    setFormData({
      name: project.name,
      description: project.description || '',
      date_created: project.date_created,
      status: project.status,
      expenses: project.expenses || '',
      revenues: project.revenues || '',
      notes: project.notes || ''
    });
    setEditingId(project.id);
    setShowForm(true);
  };

  const deleteProject = async (id) => {
    if (confirm('هل أنت متأكد من حذف هذا المشروع؟')) {
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', id);

      if (!error) {
        loadProjects();
      } else {
        alert('حصل خطأ: ' + error.message);
      }
    }
  };

  const toggleDesc = (id) => {
    setExpandedDesc(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleNotes = (id) => {
    setExpandedNotes(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const totalExpenses = projects.reduce((sum, p) => sum + (Number(p.expenses) || 0), 0);
  const totalRevenues = projects.reduce((sum, p) => sum + (Number(p.revenues) || 0), 0);
  const balance = totalRevenues - totalExpenses;

  const exportData = projects.map(p => ({
    name: p.name,
    description: p.description || '—',
    date: p.date_created ? `${p.date_created} هـ` : '—',
    status: p.status,
    expenses: `${Number(p.expenses || 0).toLocaleString()} ريال`,
    revenues: `${Number(p.revenues || 0).toLocaleString()} ريال`,
    balance: `${(Number(p.revenues || 0) - Number(p.expenses || 0)).toLocaleString()} ريال`,
    notes: p.notes || '—'
  }));

  const exportStats = [
    { label: 'إجمالي المصروفات', value: `${totalExpenses.toLocaleString()} ريال`, color: '#e74c3c' },
    { label: 'إجمالي الإيرادات', value: `${totalRevenues.toLocaleString()} ريال`, color: '#27ae60' },
    { label: 'الرصيد الكلي', value: `${balance.toLocaleString()} ريال`, color: balance >= 0 ? '#27ae60' : '#e74c3c' }
  ];

  return (
    <div style={styles.page}>
      <h2 style={styles.title}>المشاريع والصيانة</h2>
      <p style={styles.subtitle}>سجل المشاريع والمصروفات والإيرادات</p>

      {loading ? (
        <p style={styles.loading}>جارِ التحميل...</p>
      ) : (
        <>
          <div className="no-print" style={styles.buttonRow}>
            {!showForm ? (
              <button onClick={() => setShowForm(true)} style={styles.addBtn}>
                + إضافة مشروع جديد
              </button>
            ) : (
              <button onClick={resetForm} style={styles.cancelBtn}>
                إلغاء
              </button>
            )}
          </div>

          {showForm && (
            <div style={styles.formBox}>
              <h3 style={styles.formTitle}>{editingId ? 'تعديل المشروع' : 'مشروع جديد'}</h3>

              <div style={styles.formGrid}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>اسم المشروع *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    style={styles.input}
                    placeholder="مثال: صيانة الاستراحات الخمس"
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>التاريخ الهجري (يوم/شهر/سنة)</label>
                  <input
                    type="text"
                    value={formData.date_created}
                    onChange={(e) => handleInputChange('date_created', e.target.value)}
                    style={styles.input}
                    placeholder="مثال: 16/1/1448"
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>الحالة</label>
                  <select
                    value={formData.status}
                    onChange={(e) => handleInputChange('status', e.target.value)}
                    style={styles.input}
                  >
                    <option value="جاري">جاري</option>
                    <option value="منتهي">منتهي</option>
                  </select>
                </div>
              </div>

              <div style={styles.formGrid}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>المصروفات (ريال)</label>
                  <input
                    type="number"
                    value={formData.expenses}
                    onChange={(e) => handleInputChange('expenses', e.target.value)}
                    style={styles.input}
                    placeholder="0"
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>الإيرادات (ريال)</label>
                  <input
                    type="number"
                    value={formData.revenues}
                    onChange={(e) => handleInputChange('revenues', e.target.value)}
                    style={styles.input}
                    placeholder="0"
                  />
                </div>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>الوصف التفصيلي</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  style={{ ...styles.input, minHeight: '80px', resize: 'vertical' }}
                  placeholder="حداد: 250، سباك: 1000، كهربائي: 700..."
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>ملاحظات</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => handleInputChange('notes', e.target.value)}
                  style={{ ...styles.input, minHeight: '60px', resize: 'vertical' }}
                  placeholder="ملاحظات إضافية..."
                />
              </div>

              <div style={styles.formButtonRow}>
                <button onClick={saveProject} style={styles.saveBtn}>
                  {editingId ? 'تحديث' : 'إضافة'}
                </button>
                <button onClick={resetForm} style={styles.cancelBtn}>
                  إلغاء
                </button>
              </div>
            </div>
          )}

          <div id="projects-table">
            <ExportToolbar
              data={exportData}
              columns={[
                { key: 'name', label: 'اسم المشروع' },
                { key: 'description', label: 'الوصف' },
                { key: 'date', label: 'التاريخ' },
                { key: 'status', label: 'الحالة' },
                { key: 'expenses', label: 'المصروفات' },
                { key: 'revenues', label: 'الإيرادات' },
                { key: 'balance', label: 'الرصيد' },
                { key: 'notes', label: 'ملاحظات' }
              ]}
              filename="projects_report"
              title="تقرير المشاريع"
              stats={exportStats}
            />

            <div className="no-print" style={{ marginBottom: 14, fontSize: 13, color: '#374151' }}>
              إجمالي المشاريع: {projects.length}
            </div>

            <div style={styles.statsRow} className="no-print">
              <div style={{ ...styles.statBox, background: '#FDEDEC', border: '1px solid #F1948A' }}>
                <div style={styles.statLabel}>إجمالي المصروفات</div>
                <div style={{ ...styles.statValue, color: '#e74c3c' }}>{totalExpenses.toLocaleString()} ريال</div>
              </div>
              <div style={{ ...styles.statBox, background: '#EAFAF1', border: '1px solid #A9DFBF' }}>
                <div style={styles.statLabel}>إجمالي الإيرادات</div>
                <div style={{ ...styles.statValue, color: '#27ae60' }}>{totalRevenues.toLocaleString()} ريال</div>
              </div>
              <div style={{
                ...styles.statBox,
                background: balance >= 0 ? '#EAFAF1' : '#FDEDEC',
                border: balance >= 0 ? '1px solid #A9DFBF' : '1px solid #F1948A'
              }}>
                <div style={styles.statLabel}>الرصيد الكلي</div>
                <div style={{ ...styles.statValue, color: balance >= 0 ? '#27ae60' : '#e74c3c' }}>
                  {balance.toLocaleString()} ريال
                </div>
              </div>
            </div>

            <div style={styles.tableWrap}>
              <table style={styles.table}>
                <thead>
                  <tr style={styles.headRow}>
                    {['اسم المشروع', 'الوصف', 'التاريخ', 'الحالة', 'المصروفات', 'الإيرادات', 'الرصيد', 'ملاحظات', ''].map((h) => (
                      <th key={h} style={styles.th}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {projects.map((project, idx) => {
                    const colors = STATUS_COLORS[project.status];
                    const projectBalance = (Number(project.revenues) || 0) - (Number(project.expenses) || 0);
                    const descExpanded = expandedDesc.has(project.id);
                    const notesExpanded = expandedNotes.has(project.id);
                    const hasLongDesc = project.description && project.description.length > 50;
                    const hasLongNotes = project.notes && project.notes.length > 30;
                    return (
                      <tr key={project.id} style={{ background: idx % 2 === 0 ? '#fff' : '#f8fafc', borderBottom: '1px solid #e5e7eb' }}>
                        <td style={{ ...styles.td, fontWeight: 600, color: '#1B4D7A' }}>{project.name}</td>
                        <td
                          onClick={() => hasLongDesc && toggleDesc(project.id)}
                          title={project.description || ''}
                          style={{
                            ...styles.td,
                            fontSize: 13,
                            color: '#6b7280',
                            cursor: hasLongDesc ? 'pointer' : 'default',
                            whiteSpace: descExpanded ? 'normal' : 'nowrap',
                            maxWidth: descExpanded ? 'none' : 220,
                            minWidth: 160
                          }}
                        >
                          {project.description
                            ? (descExpanded ? project.description : project.description.substring(0, 50) + (hasLongDesc ? '...' : ''))
                            : '—'}
                          {hasLongDesc && (
                            <span style={{ color: '#2563eb', fontSize: 11, marginRight: 6, whiteSpace: 'nowrap' }}>
                              {descExpanded ? ' (إخفاء)' : ' (عرض الكل)'}
                            </span>
                          )}
                        </td>
                        <td style={{ ...styles.td, color: '#6b7280', whiteSpace: 'nowrap' }}>{project.date_created ? `${project.date_created} هـ` : '—'}</td>
                        <td style={styles.td}>
                          <span style={{ ...styles.badge, backgroundColor: colors.bg, color: colors.text, border: `1px solid ${colors.border}` }}>
                            {project.status}
                          </span>
                        </td>
                        <td style={{ ...styles.td, color: '#e74c3c', fontWeight: 600 }}>
                          {Number(project.expenses || 0).toLocaleString()} ريال
                        </td>
                        <td style={{ ...styles.td, color: '#27ae60', fontWeight: 600 }}>
                          {Number(project.revenues || 0).toLocaleString()} ريال
                        </td>
                        <td style={{
                          ...styles.td,
                          color: projectBalance >= 0 ? '#27ae60' : '#e74c3c',
                          fontWeight: 600
                        }}>
                          {projectBalance.toLocaleString()} ريال
                        </td>
                        <td
                          onClick={() => hasLongNotes && toggleNotes(project.id)}
                          title={project.notes || ''}
                          style={{
                            ...styles.td,
                            fontSize: 13,
                            color: '#9ca3af',
                            cursor: hasLongNotes ? 'pointer' : 'default',
                            whiteSpace: notesExpanded ? 'normal' : 'nowrap',
                            maxWidth: notesExpanded ? 'none' : 160,
                            minWidth: 100
                          }}
                        >
                          {project.notes
                            ? (notesExpanded ? project.notes : project.notes.substring(0, 30) + (hasLongNotes ? '...' : ''))
                            : '—'}
                          {hasLongNotes && (
                            <span style={{ color: '#2563eb', fontSize: 11, marginRight: 6, whiteSpace: 'nowrap' }}>
                              {notesExpanded ? ' (إخفاء)' : ' (عرض الكل)'}
                            </span>
                          )}
                        </td>
                        <td className="no-print" style={styles.td}>
                          <div style={styles.actionsBox}>
                            <button onClick={() => startEdit(project)} style={styles.editBtn}>تعديل</button>
                            <button onClick={() => deleteProject(project.id)} style={styles.deleteBtn}>حذف</button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

const styles = {
  page: { padding: '24px' },
  title: { margin: 0, fontSize: '24px', fontWeight: 'bold', color: '#111827' },
  subtitle: { color: '#6b7280', fontSize: '14px', marginTop: '4px', marginBottom: '20px' },
  loading: { textAlign: 'center', color: '#6b7280', padding: '40px 0' },

  buttonRow: { marginBottom: '20px', display: 'flex', gap: '10px' },
  addBtn: { padding: '10px 16px', backgroundColor: '#2563eb', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: 600, cursor: 'pointer' },
  cancelBtn: { padding: '10px 16px', backgroundColor: '#e5e7eb', color: '#374151', border: 'none', borderRadius: '8px', fontSize: '14px', cursor: 'pointer' },

  formBox: { background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '10px', padding: '20px', marginBottom: '20px' },
  formTitle: { margin: '0 0 16px 0', fontSize: '16px', fontWeight: 600, color: '#111827' },
  formGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '16px' },
  formGroup: { display: 'flex', flexDirection: 'column', gap: '6px' },
  label: { fontSize: '13px', fontWeight: 600, color: '#374151' },
  input: { padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '14px', fontFamily: 'inherit' },
  formButtonRow: { display: 'flex', gap: '10px', marginTop: '20px' },
  saveBtn: { padding: '10px 20px', backgroundColor: '#10b981', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: 600, cursor: 'pointer' },

  statsRow: { display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' },
  statBox: { flex: '1 1 150px', borderRadius: '10px', padding: '14px 20px', textAlign: 'center' },
  statLabel: { fontSize: '13px', color: '#555' },
  statValue: { fontWeight: 'bold', fontSize: '18px', marginTop: '2px' },

  tableWrap: { overflowX: 'auto', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: '14px', background: '#fff' },
  headRow: { background: '#1B4D7A', textAlign: 'right' },
  th: { padding: '14px 12px', color: '#fff', fontWeight: 600, fontSize: 13, whiteSpace: 'nowrap' },
  td: { padding: '12px' },
  badge: { padding: '4px 10px', borderRadius: '16px', fontSize: '12px', fontWeight: 600, whiteSpace: 'nowrap' },
  actionsBox: { display: 'flex', gap: '6px' },
  editBtn: { padding: '5px 10px', backgroundColor: '#2563eb', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '12px', cursor: 'pointer', whiteSpace: 'nowrap' },
  deleteBtn: { padding: '5px 10px', backgroundColor: '#ef4444', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '12px', cursor: 'pointer', whiteSpace: 'nowrap' }
};

export default Projects;