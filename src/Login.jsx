import { useState } from "react";
import { supabase } from "./supabaseClient";

function Logo() {
  return (
    <div style={{ marginBottom: "24px" }}>
      <svg width="200" height="70" viewBox="0 0 200 70" xmlns="http://www.w3.org/2000/svg">
        {/* مبنى */}
        <rect x="10" y="20" width="40" height="40" rx="2" fill="#1B4D7A"/>
        <rect x="15" y="10" width="30" height="12" rx="2" fill="#2E6394"/>
        <rect x="22" y="3" width="16" height="9" rx="2" fill="#F5D98C"/>
        {/* نوافذ */}
        <rect x="15" y="25" width="8" height="8" rx="1" fill="#F5D98C"/>
        <rect x="27" y="25" width="8" height="8" rx="1" fill="#F5D98C"/>
        <rect x="39" y="25" width="8" height="8" rx="1" fill="#F5D98C"/>
        <rect x="15" y="38" width="8" height="8" rx="1" fill="#F5D98C"/>
        <rect x="27" y="38" width="8" height="8" rx="1" fill="#F5D98C"/>
        <rect x="39" y="38" width="8" height="8" rx="1" fill="#F5D98C"/>
        {/* باب */}
        <rect x="24" y="48" width="12" height="12" rx="1" fill="#D9A93E"/>
        {/* نص */}
        <text x="60" y="32" fontFamily="Cairo, sans-serif" fontSize="13" fontWeight="700" fill="#1B4D7A">مكتب ثامر</text>
        <text x="60" y="52" fontFamily="Cairo, sans-serif" fontSize="11" fill="#2E6394">بن سلمان العقاري</text>
      </svg>
    </div>
  );
}

export default function Login({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

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
        <h2 style={{ color: "#1B4D7A", marginBottom: "24px", fontSize: "20px" }}>دخول المدير</h2>
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
      </div>
    </div>
  );
}