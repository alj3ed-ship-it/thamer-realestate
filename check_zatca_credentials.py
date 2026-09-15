# check_zatca_credentials.py
import json
import os

path = "zatca_sandbox_credentials.json"

if not os.path.exists(path):
    print(f"❌ الملف غير موجود: {path}")
else:
    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)

    print("✅ المفاتيح الموجودة بالملف:\n")
    for key, value in data.items():
        if isinstance(value, str):
            preview = value[:15] + "..." if len(value) > 15 else value
        else:
            preview = value
        print(f"  - {key}: {preview}")

    print("\n🔍 فحص خاص:")
    for candidate in ["requestID", "requestId", "request_id", "binarySecurityToken"]:
        if candidate in data:
            print(f"  ✅ موجود: {candidate}")
        else:
            print(f"  ⬜ غير موجود: {candidate}")