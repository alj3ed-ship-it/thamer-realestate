# -*- coding: utf-8 -*-
import io

path = r"src\Invoices.jsx"

with io.open(path, "r", encoding="utf-8") as f:
    lines = f.readlines()

target = "customer_id_number: e.target.value"

for i, line in enumerate(lines):
    if target in line:
        start = max(0, i - 1)
        end = min(len(lines), i + 4)
        print(f"--- تطابق عند السطر {i+1} ---")
        for j in range(start, end):
            print(f"{j+1}: {repr(lines[j])}")
        print()
