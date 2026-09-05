import pathlib

path = pathlib.Path("src/Leases.jsx")
content = path.read_text(encoding="utf-8")

old_func = '''  async function syncUnpaidInstallments(leaseId, newRentAmount) {
    const { data: existingPayments, error } = await supabase
      .from("payments")
      .select("id, total_installments, amount_paid")
      .eq("lease_id", leaseId);

    if (error || !existingPayments || existingPayments.length === 0) return;

    const totalInstallments = existingPayments[0].total_installments || existingPayments.length;
    const newInstallmentAmount = Math.round(Number(newRentAmount) / totalInstallments);

    for (const p of existingPayments) {
      if (Number(p.amount_paid) === 0) {
        await supabase
          .from("payments")
          .update({ amount_due: newInstallmentAmount, amount: newInstallmentAmount })
          .eq("id", p.id);
      }
    }
  }'''

assert content.count(old_func) == 1, "old_func not found or not unique"

new_func = '''  async function syncUnpaidInstallments(leaseId, newRentAmount, newPaymentType, startDate) {
    const { data: existingPayments, error } = await supabase
      .from("payments")
      .select("id, total_installments, amount_paid")
      .eq("lease_id", leaseId);

    if (error || !existingPayments || existingPayments.length === 0) return null;

    const oldTotalInstallments = existingPayments[0].total_installments || existingPayments.length;
    const plan = getInstallmentPlan(newPaymentType);
    const newCount = plan.count;
    const hasAnyPaid = existingPayments.some(p => Number(p.amount_paid) > 0);

    if (newCount !== oldTotalInstallments) {
      if (hasAnyPaid) {
        const newInstallmentAmount = Math.round(Number(newRentAmount) / oldTotalInstallments);
        for (const p of existingPayments) {
          if (Number(p.amount_paid) === 0) {
            await supabase.from("payments")
              .update({ amount_due: newInstallmentAmount, amount: newInstallmentAmount })
              .eq("id", p.id);
          }
        }
        return { blockedDueToPaid: true, oldCount: oldTotalInstallments };
      }
      if (startDate) {
        await supabase.from("payments").delete().eq("lease_id", leaseId);
        const amountPer = Math.round(Number(newRentAmount) / newCount);
        const newRows = Array.from({ length: newCount }, (_, i) => {
          const gDate = addGregorianMonths(startDate, i * plan.stepMonths);
          const hijriText = gregorianToHijriText(gDate);
          return {
            lease_id: leaseId,
            installment_number: i + 1,
            total_installments: newCount,
            amount_due: amountPer,
            amount: amountPer,
            amount_paid: 0,
            due_date_hijri: hijriText,
            due_date_gregorian: gDate,
            status: "لم يُسدَّد",
          };
        });
        await supabase.from("payments").insert(newRows);
        return { rebuilt: true, newCount };
      }
    }

    const newInstallmentAmount = Math.round(Number(newRentAmount) / oldTotalInstallments);
    for (const p of existingPayments) {
      if (Number(p.amount_paid) === 0) {
        await supabase.from("payments")
          .update({ amount_due: newInstallmentAmount, amount: newInstallmentAmount })
          .eq("id", p.id);
      }
    }
    return { unchangedCount: true };
  }'''

content = content.replace(old_func, new_func)

old_call = '      await syncUnpaidInstallments(editingId, form.rent_amount);'
assert content.count(old_call) == 1, "old_call not found or not unique"

new_call = '''      const syncResult = await syncUnpaidInstallments(editingId, form.rent_amount, form.payment_type, form.start_date);
      if (syncResult?.blockedDueToPaid) {
        window.alert("تنبيه: عدد الدفعات لم يتغيّر فعلياً لوجود دفعة/دفعات مسددة مسبقاً على هذا العقد. تم فقط تحديث مبلغ الدفعات غير المسددة على نفس العدد القديم (" + syncResult.oldCount + "). لتغيير عدد الدفعات يلزم التعامل مع الدفعات المسددة يدوياً أولاً.");
      }'''

content = content.replace(old_call, new_call)

path.write_text(content, encoding="utf-8")
print("تم التعديل بنجاح")