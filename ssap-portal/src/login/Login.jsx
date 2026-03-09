import React, { useState, useEffect } from 'react';
import { 
  FaUserEdit, FaVial, FaPaintBrush, FaUserShield, 
  FaArrowRight, FaFingerprint, FaKey, FaArrowLeft 
} from 'react-icons/fa';
import { Creator } from '../creator/Creator';
import { Tester } from '../tester/Tester';
import { Designer } from '../designer/Designer';
import { Admin } from '../admin/Admin';

export function Login() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userRole, setUserRole] = useState(""); 
  const [isResetMode, setIsResetMode] = useState(false); 
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState(""); 
  const [selectedChip, setSelectedChip] = useState(""); 
  const [loading, setLoading] = useState(false);

  // Check if user is already logged in on page load
  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      const user = JSON.parse(savedUser);
      setUserRole(user.role);
      setIsLoggedIn(true);
    }
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!selectedChip) { alert("Please select a role."); return; }
    setLoading(true);

    try {
      const response = await fetch('http://localhost:8000/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({ email, password, role: selectedChip }),
      });

      const data = await response.json();
      if (response.ok) {
        localStorage.setItem('user', JSON.stringify(data.user));
        setUserRole(data.user.role);
        setIsLoggedIn(true);
      } else {
        alert(data.message || "Invalid credentials.");
      }
    } catch {
      alert("Server connection failed.");
    } finally { setLoading(false); }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await fetch('http://localhost:8000/api/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({ email, password: newPassword }),
      });
      const data = await response.json();
      if (response.ok) {
        alert("Password updated!");
        setIsResetMode(false);
      } else { alert(data.message); }
    } catch { alert("Error connecting to server."); }
    finally { setLoading(false); }
  };

  const handleLogout = () => {
    localStorage.removeItem('user');
    setIsLoggedIn(false);
    setUserRole("");
  };

  if (isLoggedIn) {
    if (userRole === "admin") return <Admin onLogout={handleLogout} />;
    if (userRole === "creator") return <Creator onLogout={handleLogout} />;
    if (userRole === "tester") return <Tester onLogout={handleLogout} />;
    if (userRole === "designer") return <Designer onLogout={handleLogout} />;
  }

  return (
    <div className="min-h-screen bg-white text-slate-900 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 mb-2">
            {isResetMode ? <FaKey size={24} /> : <FaFingerprint size={24} />}
          </div>
          <h1 className="text-2xl font-black">{isResetMode ? "Reset Password" : "Sign in"}</h1>
        </div>

        {!isResetMode ? (
          <form onSubmit={handleLogin} className="space-y-6">
            <div className="flex flex-wrap justify-center gap-2">
              {['creator', 'tester', 'designer', 'admin'].map((role) => (
                <button key={role} type="button" onClick={() => setSelectedChip(role)}
                  className={`px-4 py-2 rounded-full border text-xs font-bold ${selectedChip === role ? 'bg-slate-900 text-white' : 'bg-white'}`}>
                  {role.toUpperCase()}
                </button>
              ))}
            </div>
            <div className="space-y-2">
              <input type="email" placeholder="Email" className="w-full p-4 bg-slate-50 rounded-2xl border" value={email} onChange={(e) => setEmail(e.target.value)} required />
              <input type="password" placeholder="Password" className="w-full p-4 bg-slate-50 rounded-2xl border" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>
            <div className="text-right">
              <button type="button" onClick={() => setIsResetMode(true)} className="text-xs font-bold text-indigo-600">Forgot Password?</button>
            </div>
            <button type="submit" className="w-full bg-indigo-600 text-white p-4 rounded-2xl font-bold">
              {loading ? "Processing..." : "Continue"}
            </button>
          </form>
        ) : (
          <form onSubmit={handleResetPassword} className="space-y-6">
            <input type="email" placeholder="Confirm Email" className="w-full p-4 bg-slate-50 rounded-2xl border" value={email} onChange={(e) => setEmail(e.target.value)} required />
            <input type="password" placeholder="New Password" className="w-full p-4 bg-slate-50 rounded-2xl border" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required />
            <button type="submit" className="w-full bg-slate-900 text-white p-4 rounded-2xl font-bold">Update Password</button>
            <button type="button" onClick={() => setIsResetMode(false)} className="w-full text-xs text-slate-500 font-bold">Back to Login</button>
          </form>
        )}
      </div>
    </div>
  );
}