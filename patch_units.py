import re

path = r"src\Units.jsx"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

old1 = "  const propertyPriorityById = Object.fromEntries(properties.map(p => [p.id, p.priority ?? 99]))"
new1 = "  const propertyOrderIndex = Object.fromEntries(sortedProperties.map((p, idx) => [p.id, idx]))"

old2 = """      const prA = propertyPriorityById[a.property_id] ?? 99
      const prB = propertyPriorityById[b.property_id] ?? 99"""
new2 = """      const prA = propertyOrderIndex[a.property_id] ?? 999
      const prB = propertyOrderIndex[b.property_id] ?? 999"""

assert old1 in content, "old1 not found"
assert old2 in content, "old2 not found"

content = content.replace(old1, new1)
content = content.replace(old2, new2)

with open(path, "w", encoding="utf-8") as f:
    f.write(content)

print("تم التعديل بنجاح")
