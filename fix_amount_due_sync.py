import pathlib

path = pathlib.Path("src/Payments.jsx")
content = path.read_text(encoding="utf-8")

old_payload = '''    const payload = {
      lease_id: form.lease_id,
      amount: due,
      amount_paid: totalPaid,'''
assert content.count(old_payload) == 1

new_payload = '''    const payload = {
      lease_id: form.lease_id,
      amount: due,
      amount_due: due,
      amount_paid: totalPaid,'''
content = content.replace(old_payload, new_payload)

path.write_text(content, encoding="utf-8")
print("تم التعديل بنجاح")