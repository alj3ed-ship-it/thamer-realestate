import { useState, useEffect } from "react";
import { supabase } from "./supabaseClient";
import thamerLogo from "./assets/thamer-logo.svg";

function Logo() {
  return (
    <div style={{ marginBottom: "24px", display: "flex", justifyContent: "center" }}>
      <img
        src={thamerLogo}
        alt="مكتب ثامر بن سلمان العقاري"
        style={{ width: "260px", height: "auto" }}
      />
    </div>
  );
}

export default function Login({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotMsg, setForgotMsg] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);

  useEffect(() => {
  const lastVisit = localStorage.getItem("demo_last_visit");
  const now = Date.now();
  const thirtyMinutes = 30 * 60 * 1000;

  if (!lastVisit || now - Number(lastVisit) > thirtyMinutes) {
    supabase.from("demo_visits").insert({}).then(() => {});
    localStorage.setItem("demo_last_visit", now.toString());
  }
}, []);

  async function handleSubmit() {
    if (!email || !password) {
      setError("الرجاء إدخال الإيميل وكلمة المرور");
      return;
    }
    setLoading(true);
    setError("");

    const { data, error: authError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password: password,
    });

    setLoading(false);

    if (authError) {
      setError("الإيميل أو كلمة المرور غير صحيحة");
      return;
    }

    if (data?.session) {
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

  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center",
      justifyContent: "center", background: "#f0f4f8", fontFamily: "Cairo, sans-serif"
    }}>
      <div style={{
        background: "#fff", padding: "48px 40px", borderRadius: "16px",
        boxShadow: "0 4px 24px rgba(0,0,0,0.10)", minWidth: "340px", textAlign: "center"
      }}>
        <Logo />
        <h2 style={{ color: "#1B4D7A", marginBottom: "24px", fontSize: "20px" }}>هلا بِك</h2>
        <input
          type="email"
          placeholder="الإيميل"
          value={email}
          onChange={e => { setEmail(e.target.value); setError(""); }}
          onKeyDown={e => e.key === "Enter" && handleSubmit()}
          style={{
            width: "100%", padding: "12px 16px", borderRadius: "8px",
            border: "1px solid #ccd6e0", fontSize: "16px", marginBottom: "12px",
            textAlign: "center", boxSizing: "border-box"
          }}
        />
        <input
          type="password"
          placeholder="كلمة المرور"
          value={password}
          onChange={e => { setPassword(e.target.value); setError(""); }}
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
}