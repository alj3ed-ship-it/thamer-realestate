import io, re

path = "src/Entitlements.jsx"
with io.open(path, "r", encoding="utf-8") as f:
    lines = f.readlines()

# find the label line
label_idx = None
for i, line in enumerate(lines):
    if "نوع الوحدة</label>" in line:
        label_idx = i
        break
assert label_idx is not None, "لم يتم العثور على سطر التسمية"

# the opening <div> is the line right before the label
div_start = label_idx - 1
assert "<div>" in lines[div_start], f"السطر قبل التسمية مو <div>: {lines[div_start]!r}"

# find closing </select> then the </div> right after it
select_close_idx = None
for i in range(label_idx, min(label_idx + 15, len(lines))):
    if "</select>" in lines[i]:
        select_close_idx = i
        break
assert select_close_idx is not None, "لم يتم العثور على </select>"

div_end = select_close_idx + 1
assert "</div>" in lines[div_end], f"السطر بعد </select> مو </div>: {lines[div_end]!r}"

indent = lines[div_start][:len(lines[div_start]) - len(lines[div_start].lstrip())]
inner = indent + "  "
inner2 = indent + "    "
inner3 = indent + "      "

new_block = f'''{indent}<div style={{{{ position: "relative" }}}} ref={{unitTypeDropdownRef}}>
{inner}<label style={{{{ display: "block", fontSize: "13px", color: "#555", marginBottom: "6px", fontWeight: "bold" }}}}>نوع الوحدة</label>
{inner}<button type="button" onClick={{() => setUnitTypeDropdownOpen((o) => !o)}}
{inner2}style={{{{ display: "flex", alignItems: "center", gap: "8px", padding: "7px 12px", borderRadius: "8px", border: "1px solid #ddd", fontSize: "13px", color: "#111827", backgroundColor: "#fff", cursor: "pointer", minWidth: "160px", justifyContent: "space-between", fontFamily: "Cairo, sans-serif" }}}}>
{inner2}<span>{{unitTypeFilterLabel()}}</span>
{inner2}<span style={{{{ fontSize: "11px", color: "#6b7280" }}}}>▾</span>
{inner}</button>
{inner}{{unitTypeDropdownOpen && (
{inner2}<div style={{{{ position: "absolute", top: "calc(100% + 4px)", left: 0, zIndex: 20, backgroundColor: "#fff", border: "1px solid #d1d5db", borderRadius: "8px", boxShadow: "0 4px 12px rgba(0,0,0,0.12)", minWidth: "180px", maxHeight: "280px", overflowY: "auto", padding: "6px" }}}}>
{inner3}<label style={{{{ display: "flex", alignItems: "center", gap: "8px", padding: "7px 8px", borderRadius: "6px", fontSize: "13px", color: "#111827", cursor: "pointer" }}}}>
{inner3}  <input type="checkbox" checked={{selectedUnitTypes.length === 0}} onChange={{clearUnitTypeFilter}} />
{inner3}  <span>كل الأنواع</span>
{inner3}</label>
{inner3}<div style={{{{ height: "1px", backgroundColor: "#e5e7eb", margin: "4px 0" }}}} />
{inner3}{{uniqueUnitTypes.map((t) => (
{inner3}  <label key={{t}} style={{{{ display: "flex", alignItems: "center", gap: "8px", padding: "7px 8px", borderRadius: "6px", fontSize: "13px", color: "#111827", cursor: "pointer" }}}}>
{inner3}    <input type="checkbox" checked={{selectedUnitTypes.includes(t)}} onChange={{() => toggleUnitType(t)}} />
{inner3}    <span>{{t}}</span>
{inner3}  </label>
{inner3}))}}
{inner2}</div>
{inner})}}
{indent}</div>
'''

lines[div_start:div_end + 1] = [new_block]

with io.open(path, "w", encoding="utf-8") as f:
    f.writelines(lines)

print("✅ تم تطبيق تعديل الواجهة بنجاح")