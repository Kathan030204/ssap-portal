import { useState, useEffect } from 'react';
import {
  FaUserEdit, FaVial, FaPaintBrush, FaUserShield,
  FaArrowRight, FaFingerprint, FaKey, FaArrowLeft,
  FaEye, FaEyeSlash
} from 'react-icons/fa';
import { Creator } from '../creator/Creator';
import { Tester } from '../tester/Tester';
import { Designer } from '../designer/Designer';
import { Admin } from '../admin/Admin';

export function Login() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userRole, setUserRole] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedChip, setSelectedChip] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // NEW STATE: Toggle password visibility
  const [showPassword, setShowPassword] = useState(false);

  const roles = [
    { id: 'creator', icon: <FaUserEdit />, color: 'text-blue-500' },
    { id: 'tester', icon: <FaVial />, color: 'text-purple-500' },
    { id: 'designer', icon: <FaPaintBrush />, color: 'text-pink-500' },
    { id: 'admin', icon: <FaUserShield />, color: 'text-emerald-500' },
  ];

  useEffect(() => {
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
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({ email, password, role: selectedChip }),
      });

      const data = await response.json();

      if (response.ok) {
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
            {<FaFingerprint size={24} />}
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            {"Sign in to Portal"}
          </h1>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div className="flex flex-wrap justify-center gap-2">
            {roles.map((role) => (
              <button
                key={role.id}
                type="button"
                onClick={() => setSelectedChip(role.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-full border text-xs font-bold transition-all cursor-pointer ${selectedChip === role.id
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

            {/* PASSWORD INPUT WITH TOGGLE */}
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Password"
                className="w-full p-4 rounded-2xl bg-slate-50 border border-slate-200 outline-none text-sm focus:ring-2 focus:ring-indigo-500/20"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-600 transition-colors cursor-pointer"
              >
                {showPassword ? <FaEyeSlash size={18} /> : <FaEye size={18} />}
              </button>
            </div>
          </div>

          <button type="submit" disabled={loading} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-2xl shadow-lg flex items-center justify-center gap-2 transition-all disabled:opacity-50 active:scale-95 cursor-pointer">
            {loading ? "Verifying..." : "Continue"} <FaArrowRight size={12} />
          </button>
          <div className="text-center">
          </div>
        </form>
      </div>
    </div>
  );
}