import pathlib

path = pathlib.Path("src/Projects.jsx")
content = path.read_text(encoding="utf-8")

# 1) إضافة ثوابت التقويم الهجري ودوال التحويل بعد الاستيرادات
old_top = "import ProjectDetailsModal from './ProjectDetailsModal';"
assert content.count(old_top) == 1
new_top = old_top + '''

const HIJRI_MONTHS = ["محرم","صفر","ربيع الأول","ربيع الثاني","جمادى الأولى","جمادى الثانية","رجب","شعبان","رمضان","شوال","ذو القعدة","ذو الحجة"];
const HIJRI_YEARS = Array.from({ length: 21 }, (_, i) => 1445 + i);
const HIJRI_DAYS = Array.from({ length: 30 }, (_, i) => i + 1);

function parseDMY(text) {
  if (!text) return { day: '', month: '', year: '' };
  const parts = String(text).split('/');
  if (parts.length !== 3) return { day: '', month: '', year: '' };
  return { day: Number(parts[0]) || '', month: Number(parts[1]) || '', year: Number(parts[2]) || '' };
}

function composeDMY({ day, month, year }) {
  if (!day || !month || !year) return '';
  return `${day}/${month}/${year}`;
}'''
content = content.replace(old_top, new_top)

# 2) استبدال حقل التاريخ النصي بثلاث قوائم منسدلة
old_field = '''                <div style={styles.formGroup}>
                  <label style={styles.label}>التاريخ الهجري (يوم/شهر/سنة)</label>
                  <input
                    type="text"
                    value={formData.date_created}
                    onChange={(e) => handleInputChange('date_created', e.target.value)}
                    style={styles.input}
                    placeholder="مثال: 16/1/1448"
                  />
                </div>'''
assert content.count(old_field) == 1

new_field = '''                <div style={styles.formGroup}>
                  <label style={styles.label}>التاريخ الهجري</label>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <select
                      value={parseDMY(formData.date_created).year || ''}
                      onChange={(e) => handleInputChange('date_created', composeDMY({ ...parseDMY(formData.date_created), year: e.target.value }))}
                      style={{ ...styles.input, flex: 2 }}
                    >
                      <option value="">السنة</option>
                      {HIJRI_YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                    <select
                      value={parseDMY(formData.date_created).month || ''}
                      onChange={(e) => handleInputChange('date_created', composeDMY({ ...parseDMY(formData.date_created), month: e.target.value }))}
                      style={{ ...styles.input, flex: 3 }}
                    >
                      <option value="">الشهر</option>
                      {HIJRI_MONTHS.map((m, i) => <option key={i+1} value={i+1}>{m}</option>)}
                    </select>
                    <select
                      value={parseDMY(formData.date_created).day || ''}
                      onChange={(e) => handleInputChange('date_created', composeDMY({ ...parseDMY(formData.date_created), day: e.target.value }))}
                      style={{ ...styles.input, flex: 2 }}
                    >
                      <option value="">اليوم</option>
                      {HIJRI_DAYS.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>
                </div>'''
content = content.replace(old_field, new_field)

path.write_text(content, encoding="utf-8")
print("تم التعديل بنجاح")