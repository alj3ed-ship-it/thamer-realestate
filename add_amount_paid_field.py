# -*- coding: utf-8 -*-
import io

path = r"src\Invoices.jsx"

with io.open(path, "r", encoding="utf-8") as f:
    content = f.read()

old = """                  <input type="text" value={form.customer_id_number} onChange={e => setForm(f => ({ ...f, customer_id_number: e.target.value }))} style={inputStyle} />
                </div>
              </div>"""

assert content.count(old) == 1, f"عدد التطابقات: {content.count(old)} — يحتاج مراجعة يدوية"

new = """                  <input type="text" value={form.customer_id_number} onChange={e => setForm(f => ({ ...f, customer_id_number: e.target.value }))} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>المبلغ المستلم (يدوي)</label>
                  <input type="number" value={form.amount_paid || ''} onChange={e => setForm(f => ({ ...f, amount_paid: e.target.value }))} style={inputStyle} placeholder="0" />
                </div>
              </div>"""

content = content.replace(old, new)

with io.open(path, "w", encoding="utf-8") as f:
    f.write(content)

print("تم إضافة حقل المبلغ المستلم بنجاح ✅")
