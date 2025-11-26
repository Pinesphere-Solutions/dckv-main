// import React, { useState } from "react";
// import { loginUser } from "../api/auth";
// import "./Login.css";

// export default function Login({ setToken, navigate }) {
//   const [username, setUsername] = useState("");
//   const [password, setPassword] = useState("");
//   const [showPassword, setShowPassword] = useState(false);
//   const [error, setError] = useState("");

//   const handleLogin = async (e) => {
//     e.preventDefault();
//     const res = await loginUser(username, password);

//     if (res.success) {
//       localStorage.setItem("token", res.token);
//       setToken(res.token);
//       navigate("/dashboard");
//     } else {
//       setError("Invalid username or password");
//     }
//   };

//   return (
//     <div className="login-container">
//       <div className="login-card">
//         <h2 className="login-title">DCKV Login</h2>

//         {error && <p className="login-error">{error}</p>}

//         <form onSubmit={handleLogin}>
//           <div className="input-group">
//             <label>Username</label>
//             <input
//               type="text"
//               placeholder="Enter username"
//               onChange={(e) => setUsername(e.target.value)}
//             />
//           </div>

//           <div className="input-group password-group">
//             <label>Password</label>
//             <div className="password-wrapper">
//               <input
//                 type={showPassword ? "text" : "password"}
//                 placeholder="Enter password"
//                 onChange={(e) => setPassword(e.target.value)}
//               />
//               <span
//                 className="toggle-password"
//                 onClick={() => setShowPassword(!showPassword)}
//               >
//                 {showPassword ? "🙈" : "👁️"}
//               </span>
//             </div>
//           </div>

//           <button type="submit" className="login-btn">
//             Login
//           </button>
//         </form>
//       </div>
//     </div>
//   );
// }




import React, { useState } from "react";
import { loginUser } from "../api/auth";
import "./Login.css";

export default function Login({ setToken, navigate }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    
    const res = await loginUser(username, password);

    if (res.success) {
      localStorage.setItem("token", res.token);
      setToken(res.token);
      navigate("/dashboard");
    } else {
      setError("Invalid username or password");
      setIsLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-bg-blur login-bg-blur-1"></div>
      <div className="login-bg-blur login-bg-blur-2"></div>

      <div className="login-card">
        <div className="login-icon">
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2L2 7l10 5 10-5-10-5z"></path>
            <path d="M2 17l10 5 10-5"></path>
            <path d="M2 12l10 5 10-5"></path>
          </svg>
        </div>

        <h2 className="login-title">DCKV Portal</h2>
        <p className="login-subtitle">Demand Controlled Kitchen Ventilation</p>

        {error && (
          <div className="login-error">
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        <div className="login-form">
          <div className="input-group">
            <label>Username</label>
            <input
              type="text"
              placeholder="Enter your username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && username && password) {
                  handleLogin(e);
                }
              }}
            />
          </div>

          <div className="input-group">
            <label>Password</label>
            <div className="password-wrapper">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && username && password) {
                    handleLogin(e);
                  }
                }}
              />
              <button
                type="button"
                className="toggle-password"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                    <line x1="1" y1="1" x2="23" y2="23"></line>
                  </svg>
                ) : (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                    <circle cx="12" cy="12" r="3"></circle>
                  </svg>
                )}
              </button>
            </div>
          </div>

          <button
            type="button"
            className="login-btn"
            onClick={handleLogin}
            disabled={isLoading || !username || !password}
          >
            {isLoading ? (
              <>
                <svg className="spinner" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 12a9 9 0 1 1-6.219-8.56"></path>
                </svg>
                Signing in...
              </>
            ) : (
              "Sign In"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
