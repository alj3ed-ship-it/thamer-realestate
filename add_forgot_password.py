# -*- coding: utf-8 -*-
"""
سكربت إضافة ميزة "نسيت كلمة المرور"
شغّله من داخل مجلد المشروع (بعد ما تعمل cd للمشروع)
"""

# ==========================================================
# 1) إنشاء ملف ResetPassword.jsx الجديد
# ==========================================================
reset_password_content = '''import { useState, useEffect } from "react";
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
'''

with open("src/ResetPassword.jsx", "w", encoding="utf-8") as f:
    f.write(reset_password_content)
print("تم إنشاء src/ResetPassword.jsx")

# ==========================================================
# 2) تعديل Login.jsx
# ==========================================================
with open("src/Login.jsx", "r", encoding="utf-8") as f:
    login_content = f.read()

# 2.1 إضافة states جديدة
old_states = '''  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);'''
new_states = '''  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotMsg, setForgotMsg] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);'''

assert login_content.count(old_states) == 1
login_content = login_content.replace(old_states, new_states)

# 2.2 إضافة دالة handleForgotSubmit بعد handleSubmit
old_fn_end = '''    if (data?.session) {
      onLogin("admin");
    }
  }

  return ('''
new_fn_end = '''    if (data?.session) {
      onLogin("admin");
    }
  }

  async function handleForgotSubmit() {
    if (!forgotEmail) {
      setForgotMsg("الرجاء إدخال الإيميل");
      return;
    }
    setForgotLoading(true);
    setForgotMsg("");
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(
      forgotEmail.trim(),
      { redirectTo: window.location.origin + "/reset-password" }
    );
    setForgotLoading(false);
    if (resetError) {
      setForgotMsg("تعذر إرسال الرابط، تأكد من صحة الإيميل");
      return;
    }
    setForgotMsg("sent");
  }

  return ('''

assert login_content.count(old_fn_end) == 1
login_content = login_content.replace(old_fn_end, new_fn_end)

# 2.3 إضافة رابط "نسيت كلمة المرور" + النافذة المنبثقة
old_tail = '''        {error && <p style={{ color: "red", marginBottom: "8px", fontSize: "14px" }}>{error}</p>}
        <button onClick={handleSubmit} disabled={loading} style={{
          width: "100%", padding: "12px", background: "#1B4D7A", color: "#fff",
          border: "none", borderRadius: "8px", fontSize: "16px",
          cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1
        }}>{loading ? "جاري الدخول..." : "دخول"}</button>
      </div>
    </div>
  );
}'''

new_tail = '''        {error && <p style={{ color: "red", marginBottom: "8px", fontSize: "14px" }}>{error}</p>}
        <button onClick={handleSubmit} disabled={loading} style={{
          width: "100%", padding: "12px", background: "#1B4D7A", color: "#fff",
          border: "none", borderRadius: "8px", fontSize: "16px",
          cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1
        }}>{loading ? "جاري الدخول..." : "دخول"}</button>

        <p style={{ marginTop: "16px" }}>
          <span
            onClick={() => { setShowForgot(true); setForgotEmail(email); setForgotMsg(""); }}
            style={{ color: "#2E6394", fontSize: "14px", cursor: "pointer", textDecoration: "underline" }}
          >
            نسيت كلمة المرور؟
          </span>
        </p>
      </div>

      {showForgot && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)",
          display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000
        }}>
          <div style={{ background: "#fff", padding: "32px", borderRadius: "16px", minWidth: "320px", textAlign: "center" }}>
            <h3 style={{ color: "#1B4D7A", marginBottom: "16px", fontSize: "17px" }}>إعادة تعيين كلمة المرور</h3>
            {forgotMsg === "sent" ? (
              <>
                <p style={{ color: "#27ae60", marginBottom: "16px", fontSize: "14px" }}>
                  تم إرسال رابط إعادة التعيين إلى بريدك الإلكتروني ✅
                </p>
                <button onClick={() => setShowForgot(false)} style={{
                  padding: "10px 20px", background: "#1B4D7A", color: "#fff",
                  border: "none", borderRadius: "8px", cursor: "pointer"
                }}>إغلاق</button>
              </>
            ) : (
              <>
                <input
                  type="email"
                  placeholder="الإيميل"
                  value={forgotEmail}
                  onChange={e => setForgotEmail(e.target.value)}
                  style={{
                    width: "100%", padding: "12px 16px", borderRadius: "8px",
                    border: "1px solid #ccd6e0", fontSize: "16px", marginBottom: "12px",
                    textAlign: "center", boxSizing: "border-box"
                  }}
                />
                {forgotMsg && forgotMsg !== "sent" && (
                  <p style={{ color: "red", marginBottom: "8px", fontSize: "14px" }}>{forgotMsg}</p>
                )}
                <div style={{ display: "flex", gap: "8px" }}>
                  <button onClick={handleForgotSubmit} disabled={forgotLoading} style={{
                    flex: 1, padding: "10px", background: "#1B4D7A", color: "#fff",
                    border: "none", borderRadius: "8px", cursor: forgotLoading ? "not-allowed" : "pointer"
                  }}>{forgotLoading ? "جاري الإرسال..." : "إرسال الرابط"}</button>
                  <button onClick={() => setShowForgot(false)} style={{
                    flex: 1, padding: "10px", background: "#eee", color: "#333",
                    border: "none", borderRadius: "8px", cursor: "pointer"
                  }}>إلغاء</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}'''

assert login_content.count(old_tail) == 1
login_content = login_content.replace(old_tail, new_tail)

with open("src/Login.jsx", "w", encoding="utf-8") as f:
    f.write(login_content)
print("تم تعديل src/Login.jsx")

# ==========================================================
# 3) تعديل App.jsx
# ==========================================================
with open("src/App.jsx", "r", encoding="utf-8") as f:
    app_content = f.read()

# 3.1 إضافة import
old_import = 'import Login from "./Login";'
new_import = 'import Login from "./Login";\nimport ResetPassword from "./ResetPassword";'
assert app_content.count(old_import) == 1
app_content = app_content.replace(old_import, new_import)

# 3.2 إضافة التحقق من المسار
old_check = '''  if (checkingSession) {
    return ('''
new_check = '''  if (window.location.pathname === "/reset-password") {
    return <ResetPassword />;
  }

  if (checkingSession) {
    return ('''
assert app_content.count(old_check) == 1
app_content = app_content.replace(old_check, new_check)

with open("src/App.jsx", "w", encoding="utf-8") as f:
    f.write(app_content)
print("تم تعديل src/App.jsx")

print("\\nكل التعديلات تمت بنجاح ✅")
