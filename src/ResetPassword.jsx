import { useState, useEffect } from "react";
import { supabase } from "./supabaseClient";

export default function ResetPassword() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setReady(!!session);
    });
  }, []);

  async function handleSubmit() {
    if (!password || !confirmPassword) {
      setError("الرجاء تعبئة الحقلين");
      return;
    }
    if (password.length < 6) {
      setError("كلمة المرور يجب أن تكون 6 أحرف على الأقل");
      return;
    }
    if (password !== confirmPassword) {
      setError("كلمتا المرور غير متطابقتين");
      return;
    }
    setLoading(true);
    setError("");
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (updateError) {
      setError("حدث خطأ أثناء تحديث كلمة المرور، حاول مرة أخرى");
      return;
    }
    setSuccess(true);
  }

  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center",
      justifyContent: "center", background: "#f0f4f8", fontFamily: "Cairo, sans-serif"
    }}>
      <div style={{
        background: "#fff", padding: "48px 40px", borderRadius: "16px",
        boxShadow: "0 4px 24px rgba(0,0,0,0.10)", minWidth: "340px", textAlign: "center"
      }}>
        <h2 style={{ color: "#1B4D7A", marginBottom: "24px", fontSize: "20px" }}>تعيين كلمة مرور جديدة</h2>

        {success ? (
          <div>
            <p style={{ color: "#27ae60", marginBottom: "16px" }}>تم تحديث كلمة المرور بنجاح ✅</p>
            <a href="/" style={{
              display: "inline-block", padding: "12px 24px", background: "#1B4D7A", color: "#fff",
              borderRadius: "8px", textDecoration: "none", fontSize: "15px"
            }}>الذهاب لتسجيل الدخول</a>
          </div>
        ) : !ready ? (
          <p style={{ color: "#666" }}>الرابط غير صالح أو منتهي الصلاحية، اطلب رابطاً جديداً من صفحة تسجيل الدخول.</p>
        ) : (
          <>
            <input
              type="password"
              placeholder="كلمة المرور الجديدة"
              value={password}
              onChange={e => { setPassword(e.target.value); setError(""); }}
              style={{
                width: "100%", padding: "12px 16px", borderRadius: "8px",
                border: "1px solid #ccd6e0", fontSize: "16px", marginBottom: "12px",
                textAlign: "center", boxSizing: "border-box"
              }}
            />
            <input
              type="password"
              placeholder="تأكيد كلمة المرور"
              value={confirmPassword}
              onChange={e => { setConfirmPassword(e.target.value); setError(""); }}
              onKeyDown={e => e.key === "Enter" && handleSubmit()}
              style={{
                width: "100%", padding: "12px 16px", borderRadius: "8px",
                border: "1px solid #ccd6e0", fontSize: "16px", marginBottom: "12px",
                textAlign: "center", boxSizing: "border-box"
              }}
            />
            {error && <p style={{ color: "red", marginBottom: "8px", fontSize: "14px" }}>{error}</p>}
            <button onClick={handleSubmit} disabled={loading} style={{
              width: "100%", padding: "12px", background: "#1B4D7A", color: "#fff",
              border: "none", borderRadius: "8px", fontSize: "16px",
              cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1
            }}>{loading ? "جاري الحفظ..." : "حفظ كلمة المرور"}</button>
          </>
        )}
      </div>
    </div>
  );
}
