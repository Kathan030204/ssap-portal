import React, { useState } from 'react';
import { 
  FaUserEdit, FaVial, FaPaintBrush, FaUserShield, 
  FaArrowRight, FaFingerprint, FaKey, FaArrowLeft 
} from 'react-icons/fa';
import { Creator } from '../creator/Creator';
import { Tester } from '../tester/Tester';
import { Designer } from '../designer/Designer';
import { Admin } from '../admin/Admin';

export function Login() {
  // Authentication States
  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    const user = localStorage.getItem('user');
    return !!user;
  });
  const [userRole, setUserRole] = useState(() => {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user).role : "";
  });

  
  // UI States
  const [isResetMode, setIsResetMode] = useState(false); 
  const [loading, setLoading] = useState(false);
  
  // Form States
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

  // --- LOGIN HANDLER ---
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
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          email: email,
          password: password,
          role: selectedChip
        }),
      });

      const data = await response.json();

      if (response.ok) {
        localStorage.setItem('user', JSON.stringify({
          id: data.user.id,
          username: data.user.username,
          role: data.user.role
        }));

        setUserRole(data.user.role);
        setIsLoggedIn(true);
      } else {
        alert(data.message || "Invalid credentials.");
      }
    } catch (error) {
      console.error("Login Error:", error);
      alert("Could not connect to the server. Check if your Laravel backend is running.");
    } finally {
      setLoading(false);
    }
  };

  // --- PASSWORD RESET HANDLER ---
  const handleResetPassword = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('http://localhost:8000/api/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          email: email,
          password: newPassword, // Sending new password to backend
        }),
      });

      const data = await response.json();

      if (response.ok) {
        alert("Success! Password has been updated. You can now login.");
        setIsResetMode(false);
        setNewPassword("");
        setPassword(""); 
      } else {
        // This will display warnings like "Email not found" or "New password cannot be same as old"
        alert(data.message || "Reset failed.");
      }
    } catch (error) {
      console.error("Reset Error:", error);
      alert("Connection error. Ensure your Laravel API route is set up.");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('user');
    setIsLoggedIn(false);
    setUserRole("");
    setSelectedChip("");
    setEmail("");
    setPassword("");
  };

  // --- DASHBOARD VIEW ---
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

  // --- LOGIN & RESET UI ---
  return (
    <div className="min-h-screen bg-white text-slate-900 flex flex-col items-center justify-center p-6 font-sans">
      <div className="relative w-full max-w-md space-y-8">
        
        {/* Header Section */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 mb-2">
            {isResetMode ? <FaKey size={24} /> : <FaFingerprint size={24} />}
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            {isResetMode ? "Reset Password" : "Sign in to Portal"}
          </h1>
          <p className="text-slate-500 text-sm font-medium">
            {isResetMode ? "Enter your email to set a new password" : "Verify your credentials to continue"}
          </p>
        </div>

        {!isResetMode ? (
          /* STANDARD LOGIN FORM */
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
                  <span className={selectedChip === role.id ? 'text-white' : role.color}>
                    {role.icon}
                  </span>
                  <span className="capitalize">{role.id}</span>
                </button>
              ))}
            </div>

            <div className="space-y-2">
              <input
                type="email"
                placeholder="Email"
                className="w-full p-4 rounded-2xl bg-slate-50 border border-slate-200 outline-none text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <input
                type="password"
                placeholder="Password"
                className="w-full p-4 rounded-2xl bg-slate-50 border border-slate-200 outline-none text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <div className="flex justify-end">
              <button 
                type="button"
                onClick={() => setIsResetMode(true)}
                className="text-xs font-bold text-indigo-600 hover:text-indigo-800 transition-colors"
              >
                Forgot Password?
              </button>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-2xl shadow-lg shadow-indigo-100 flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50"
            >
              {loading ? "Verifying..." : "Continue"} <FaArrowRight size={12} />
            </button>
          </form>
        ) : (
          /* FORGOT PASSWORD FORM */
          <form onSubmit={handleResetPassword} className="space-y-6">
            <div className="space-y-2">
              <input
                type="email"
                placeholder="Confirm your registered email"
                className="w-full p-4 rounded-2xl bg-slate-50 border border-slate-200 outline-none text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <input
                type="password"
                placeholder="New Password"
                className="w-full p-4 rounded-2xl bg-slate-50 border border-slate-200 outline-none text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-4 rounded-2xl shadow-lg flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50"
            >
              {loading ? "Updating..." : "Update Password"}
            </button>

            <button 
              type="button"
              onClick={() => setIsResetMode(false)}
              className="w-full flex items-center justify-center gap-2 text-xs font-bold text-slate-500 hover:text-slate-700 transition-colors py-2"
            >
              <FaArrowLeft size={10} /> Back to Sign In
            </button>
          </form>
        )}
      </div>
    </div>
  );
}