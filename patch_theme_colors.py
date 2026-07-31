path = r"src\theme.js"

with open(path, "r", encoding="utf-8") as f:
    content = f.read()

old = '''export const UNIT_TYPE_COLORS = {
  "محل": { color: "#2E86C1", bg: "#EBF5FB", border: "#AED6F1" },
  "شقة": { color: "#8E44AD", bg: "#F4ECF7", border: "#D2B4DE" },
};'''

new = '''export const UNIT_TYPE_COLORS = {
  "محل": { color: "#8E44AD", bg: "#F4ECF7", border: "#D2B4DE" },
  "شقة": { color: "#2E86C1", bg: "#EBF5FB", border: "#AED6F1" },
  "مستودع": { color: "#16A085", bg: "#E8F8F5", border: "#A3E4D7" },
  "ورشة": { color: "#16A085", bg: "#E8F8F5", border: "#A3E4D7" },
};'''

if old not in content:
    print("❌ لم يتم العثور على النص المطلوب استبداله. تحقق من الملف يدوياً.")
else:
    content = content.replace(old, new)
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)
    print("✅ تم تحديث theme.js:")
    print("   - محل الآن بنفسجي #8E44AD")
    print("   - شقة الآن أزرق #2E86C1")
    print("   - مستودع + ورشة الآن تركواز مشترك #16A085")
