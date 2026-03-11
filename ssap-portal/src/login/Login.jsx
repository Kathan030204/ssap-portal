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
  const [loading, setLoading] = useState(false);
  const [selectedChip, setSelectedChip] = useState(""); 
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState(""); 

  const roles = [
    { id: 'creator', icon: <FaUserEdit />, color: 'text-blue-500' },
    { id: 'tester', icon: <FaVial />, color: 'text-purple-500' },
    { id: 'designer', icon: <FaPaintBrush />, color: 'text-pink-500' },
    { id: 'admin', icon: <FaUserShield />, color: 'text-emerald-500' },
  ];

  useEffect(() => {
    // USING sessionStorage instead of localStorage for multi-tab support
    const savedData = sessionStorage.getItem('user');
    if (savedData) {
      try {
        const user = JSON.parse(savedData);
        setUserRole(user.role);
        setIsLoggedIn(true);
      } catch {
        sessionStorage.removeItem('user');
      }
    }
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!selectedChip) {
      alert("Please select your professional role.");
      return;
    }
    setLoading(true);

    try {
      const response = await fetch('http://localhost:8000/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({ email, password, role: selectedChip }),
      });

      const data = await response.json();

      if (response.ok) {
        // Save to sessionStorage so this TAB has its own user
        sessionStorage.setItem('user', JSON.stringify({
          id: data.user.id,
          username: data.user.username,
          role: data.user.role,
        }));

        setUserRole(data.user.role);
        setIsLoggedIn(true);
      } else {
        alert(data.message || "Invalid credentials.");
      }
    } catch {
      alert("Could not connect to the server.");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem('user');
    setIsLoggedIn(false);
    setUserRole("");
    setSelectedChip("");
    setEmail("");
    setPassword("");
  };

  if (isLoggedIn) {
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
          {userRole === "creator" && <Creator onLogout={handleLogout} />}
          {userRole === "tester" && <Tester onLogout={handleLogout} />}
          {userRole === "designer" && <Designer onLogout={handleLogout} />}
          {userRole === "admin" && <Admin onLogout={handleLogout} />}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-slate-900 flex flex-col items-center justify-center p-6 font-sans">
      <div className="relative w-full max-w-md space-y-8">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 mb-2">
            {isResetMode ? <FaKey size={24} /> : <FaFingerprint size={24} />}
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            {isResetMode ? "Reset Password" : "Sign in to Portal"}
          </h1>
        </div>

        {!isResetMode ? (
          <form onSubmit={handleLogin} className="space-y-6">
            <div className="flex flex-wrap justify-center gap-2">
              {roles.map((role) => (
                <button
                  key={role.id}
                  type="button"
                  onClick={() => setSelectedChip(role.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full border text-xs font-bold transition-all ${
                    selectedChip === role.id
                      ? 'bg-slate-900 border-slate-900 text-white shadow-xl scale-105'
                      : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                  }`}
                >
                  <span className={selectedChip === role.id ? 'text-white' : role.color}>{role.icon}</span>
                  <span className="capitalize">{role.id}</span>
                </button>
              ))}
            </div>

            <div className="space-y-2">
              <input type="email" placeholder="Email" className="w-full p-4 rounded-2xl bg-slate-50 border border-slate-200 outline-none text-sm focus:ring-2 focus:ring-indigo-500/20" value={email} onChange={(e) => setEmail(e.target.value)} required />
              <input type="password" placeholder="Password" className="w-full p-4 rounded-2xl bg-slate-50 border border-slate-200 outline-none text-sm focus:ring-2 focus:ring-indigo-500/20" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>

            <button type="submit" disabled={loading} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-2xl shadow-lg flex items-center justify-center gap-2 transition-all disabled:opacity-50 active:scale-95">
              {loading ? "Verifying..." : "Continue"} <FaArrowRight size={12} />
            </button>
            <div className="text-center">
              <button type="button" onClick={() => setIsResetMode(true)} className="text-xs font-bold text-slate-400 hover:text-indigo-600 transition-colors">Forgot Password?</button>
            </div>
          </form>
        ) : (
          <form onSubmit={(e) => e.preventDefault()} className="space-y-6">
             <div className="space-y-2">
               <input type="email" placeholder="Confirm registered email" className="w-full p-4 rounded-2xl bg-slate-50 border border-slate-200 outline-none text-sm" value={email} onChange={(e) => setEmail(e.target.value)} required />
               <input type="password" placeholder="New Password" className="w-full p-4 rounded-2xl bg-slate-50 border border-slate-200 outline-none text-sm" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required />
             </div>
             <button type="submit" className="w-full bg-slate-900 text-white font-bold py-4 rounded-2xl shadow-lg active:scale-95">Update Password</button>
             <button type="button" onClick={() => setIsResetMode(false)} className="w-full flex items-center justify-center gap-2 text-xs font-bold text-slate-500 py-2 hover:text-slate-800"><FaArrowLeft size={10} /> Back to Sign In</button>
          </form>
        )}
      </div>
    </div>
  );
}