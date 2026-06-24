import { useState } from "react";

const ADMIN_PASSWORD = "thamer2026";

export default function Login({ onLogin }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  function handleSubmit() {
    if (password === ADMIN_PASSWORD) {
      localStorage.setItem("role", "admin");
      onLogin("admin");
    } else {
      setError("كلمة المرور غير صحيحة");
    }
  }

  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center",
      justifyContent: "center", background: "#f0f4f8", fontFamily: "Tajawal, sans-serif"
    }}>
      <div style={{
        background: "#fff", padding: "48px 40px", borderRadius: "16px",
        boxShadow: "0 4px 24px rgba(0,0,0,0.10)", minWidth: "340px", textAlign: "center"
      }}>
        <img src="/logo_v6_wide.svg" alt="شعار" style={{ width: "180px", marginBottom: "24px" }} />
        <h2 style={{ color: "#1B4D7A", marginBottom: "24px", fontSize: "20px" }}>دخول المدير</h2>
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
        <button onClick={handleSubmit} style={{
          width: "100%", padding: "12px", background: "#1B4D7A", color: "#fff",
          border: "none", borderRadius: "8px", fontSize: "16px", cursor: "pointer"
        }}>دخول</button>
      </div>
    </div>
  );
}

