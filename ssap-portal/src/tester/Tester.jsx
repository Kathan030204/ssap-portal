import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import { 
  FaBug, FaCheckCircle, FaSearch, FaTimes, 
  FaSpinner, FaLayerGroup, FaHome,
  FaClock, FaCheckDouble, FaExclamationTriangle, FaListUl,
  FaSignOutAlt, FaUserCircle, FaBell 
} from 'react-icons/fa';

const api = axios.create({
  baseURL: 'http://localhost:8000/api', 
});

export function Tester({ onLogout }) {
  // --- UI & DATA STATES ---
  const [activeFilter, setActiveFilter] = useState('all'); 
  const [showReviewPanel, setShowReviewPanel] = useState(false);
  const [selectedSection, setSelectedSection] = useState(null);
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  
  // --- IDENTITY STATE ---
  const [currentUser, setCurrentUser] = useState({ id: null, name: '', role: '' });
  
  // --- NOTIFICATION STATE ---
  const [notifications, setNotifications] = useState([]);
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);
  const notifRef = useRef(null);

  const [issueData, setIssueData] = useState({ type: 'Bug', severity: 'Major', desc: '' });

  // Handle outside clicks for notification dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notifRef.current && !notifRef.current.contains(event.target)) {
        setShowNotifDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // --- 1. MEMOIZED FETCH FUNCTION (FIXED) ---
  const fetchInitialData = useCallback(async () => {
    try {
      const storedUser = sessionStorage.getItem('user');
      if (!storedUser) {
        onLogout();
        return;
      }

      const savedUser = JSON.parse(storedUser);
      setCurrentUser({ 
        id: savedUser.id, 
        name: savedUser.username || savedUser.name, 
        role: savedUser.role 
      });

      const secRes = await api.get('/sections');
      
      const relevantSections = secRes.data.filter(s => 
        s.tester_id === savedUser.id || s.current_status === 'Published'
      );

      const newAssignments = relevantSections.filter(s => 
         s.tester_id === savedUser.id && s.current_status === 'In Testing'
      );

      setNotifications(newAssignments.map(task => ({
        id: task.id,
        text: `New Assignment: ${task.title}`,
        time: 'Just now'
      })));

      setSections(relevantSections);
    } catch (error) {
      console.error("Tester Sync Error:", error);
    } finally {
      setLoading(false);
    }
  }, [onLogout]);

  // --- 2. INITIAL DATA FETCH & POLLING (FIXED) ---
  useEffect(() => { 
    fetchInitialData(); 
    const interval = setInterval(fetchInitialData, 30000); 
    return () => clearInterval(interval);
  }, [fetchInitialData]); // Stable dependency

  const stats = {
    total: sections.length,
    pending: sections.filter(s => s.current_status === 'In Testing').length,
    logged: sections.filter(s => s.current_status === 'Issue Logged').length,
    passed: sections.filter(s => s.current_status === 'Published').length,
  };

  const openReview = (section) => {
    setSelectedSection(section);
    setShowReviewPanel(true);
    setIssueData({ type: 'Bug', severity: 'Major', desc: '' });
    setNotifications(prev => prev.filter(n => n.id !== section.id));
  };

  const handleUpdateStatus = async (id, newStatus) => {
    try {
      const payload = { 
        current_status: newStatus,
        notes: newStatus === 'QA Passed' ? 'Approved by QA' : issueData.desc 
      };

      if (newStatus === 'Issue Logged') {
        payload.type = issueData.type;
        payload.severity = issueData.severity;
        payload.description = issueData.desc;
      }

      await api.put(`/sections/${id}`, payload);
      
      setSections(prev => prev.map(s => s.id === id ? { ...s, current_status: newStatus, ...payload } : s));
      setShowReviewPanel(false);
      setSelectedSection(null);
      alert(newStatus === 'QA Passed' ? "Asset Approved!" : "Issue Logged to Creator!");
    } catch {
      alert("Sync Error: Could not update the server.");
    }
  };

  const filteredSections = sections.filter(s => {
    const matchesSearch = s.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSidebar = 
      activeFilter === 'all' ? true :
      activeFilter === 'pending' ? s.current_status === 'In Testing' :
      activeFilter === 'logged' ? s.current_status === 'Issue Logged' :
      activeFilter === 'passed' ? (s.current_status === 'Published') : true;
    return matchesSearch && matchesSidebar;
  });

  return (
    <div className="flex min-h-screen bg-[#f8fafc] text-slate-900 font-sans">
      
      {/* SIDEBAR */}
      <div className="w-72 bg-slate-900 border-r border-slate-800 flex flex-col sticky top-0 h-screen">
        <div className="p-8">
          <h1 className="text-2xl font-black italic tracking-tighter text-white flex items-center gap-2">
            <div className="w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center text-white not-italic text-sm">QA</div>
            Portal
          </h1>
        </div>
        
        <nav className="flex-1 px-4 space-y-2">
          <SidebarItem icon={<FaHome />} label="Dashboard" active={activeFilter === 'all'} onClick={() => setActiveFilter('all')} />
          <SidebarItem icon={<FaClock className="text-blue-400" />} label="Waitlist" count={stats.pending} active={activeFilter === 'pending'} onClick={() => setActiveFilter('pending')} />
          <SidebarItem icon={<FaExclamationTriangle className="text-rose-400" />} label="Issues" count={stats.logged} active={activeFilter === 'logged'} onClick={() => setActiveFilter('logged')} />
          <SidebarItem icon={<FaCheckDouble className="text-emerald-400" />} label="Success" count={stats.passed} active={activeFilter === 'passed'} onClick={() => setActiveFilter('passed')} />
        </nav>

        <div className="p-4 border-t border-slate-800">
          <div className="flex items-center gap-3 px-4 py-3 mb-2">
            <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center border border-slate-700 font-black text-slate-400 text-xs">
                {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : <FaUserCircle size={20}/>}
            </div>
            <div className="overflow-hidden">
              <p className="text-white font-black text-sm leading-none truncate">{currentUser.name || "Loading..."}</p>
              <p className="text-slate-500 text-[10px] uppercase font-bold tracking-widest mt-1">{currentUser.role}</p>
            </div>
          </div>
          <button onClick={onLogout} className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-slate-400 hover:text-rose-400 hover:bg-rose-400/10 transition-all font-black text-xs uppercase tracking-widest">
            <FaSignOutAlt /> Logout
          </button>
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div className="flex-1 p-10 overflow-y-auto">
        <header className="flex items-center justify-between mb-10">
          <div>
            <h2 className="text-4xl font-black text-slate-900 tracking-tight italic">Tester Panel</h2>
            <p className="text-slate-500 font-medium italic">Active Session: {currentUser.name}</p>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="relative" ref={notifRef}>
              <button 
                onClick={() => setShowNotifDropdown(!showNotifDropdown)}
                className="p-4 bg-white border border-slate-200 rounded-2xl text-slate-400 hover:text-purple-600 transition-all shadow-sm"
              >
                <FaBell size={20} />
                {notifications.length > 0 && <span className="absolute top-3 right-3 w-2.5 h-2.5 bg-rose-500 border-2 border-white rounded-full"></span>}
              </button>

              {showNotifDropdown && (
                <div className="absolute right-0 mt-4 w-80 bg-white rounded-3xl shadow-2xl border border-slate-100 p-6 z-50">
                  <h4 className="font-black text-[10px] uppercase tracking-widest text-slate-400 mb-4">New Assignments</h4>
                  <div className="space-y-3 max-h-60 overflow-y-auto">
                    {notifications.length > 0 ? notifications.map(n => (
                      <div key={n.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex gap-3 cursor-pointer hover:bg-purple-50" onClick={() => { openReview(sections.find(s => s.id === n.id)); setShowNotifDropdown(false); }}>
                        <div className="text-purple-600 mt-1"><FaLayerGroup size={14}/></div>
                        <div>
                          <p className="text-xs font-black text-slate-800">{n.text}</p>
                          <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">Pending Review</p>
                        </div>
                      </div>
                    )) : <p className="text-center text-slate-400 py-4 text-xs italic">No new notifications</p>}
                  </div>
                </div>
              )}
            </div>

            <div className="relative">
              <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input type="text" placeholder="Search assets..." className="pl-12 pr-6 py-4 bg-white border border-slate-200 rounded-2xl w-80 shadow-sm outline-none focus:ring-2 ring-purple-500/20" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            </div>
          </div>
        </header>

        <div className="grid grid-cols-4 gap-6 mb-10">
          <StatusCard label="Total Items" count={stats.total} icon={<FaListUl />} color="bg-slate-100 text-slate-600" />
          <StatusCard label="Waiting" count={stats.pending} icon={<FaClock />} color="bg-blue-50 text-blue-600" />
          <StatusCard label="Active Bugs" count={stats.logged} icon={<FaExclamationTriangle />} color="bg-rose-50 text-rose-600" />
          <StatusCard label="Published" count={stats.passed} icon={<FaCheckDouble />} color="bg-emerald-50 text-emerald-600" />
        </div>

        {loading ? (
          <div className="py-40 text-center"><FaSpinner className="animate-spin text-purple-600 text-5xl mx-auto" /></div>
        ) : (
          <div className={`grid gap-8 ${showReviewPanel ? 'grid-cols-1 xl:grid-cols-2' : 'grid-cols-1'}`}>
            
            {/* LIST VIEW */}
            <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden h-fit">
              <table className="w-full text-left">
                <thead className="bg-slate-50/50">
                  <tr className="border-b border-slate-100">
                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Asset Name</th>
                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 text-right uppercase">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredSections.map((item) => (
                    <tr key={item.id} onClick={() => openReview(item)} className={`group cursor-pointer hover:bg-slate-50 transition-all ${selectedSection?.id === item.id ? 'bg-purple-50' : ''}`}>
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-4">
                          <div className="h-10 w-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-purple-100 group-hover:text-purple-600 transition-colors"><FaLayerGroup /></div>
                          <p className="font-black text-slate-800">{item.title}</p>
                        </div>
                      </td>
                      <td className="px-8 py-6 text-right">
                        <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase border ${
                          item.current_status === 'Published' || item.current_status === 'QA Passed' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                          item.current_status === 'Issue Logged' ? 'bg-rose-50 text-rose-600 border-rose-100' : 'bg-blue-50 text-blue-600 border-blue-100'
                        }`}>{item.current_status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* REVIEW PANEL */}
            {showReviewPanel && selectedSection && (
              <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-2xl p-10 h-fit sticky top-10">
                <div className="flex justify-between items-center mb-8">
                  <h3 className="text-2xl font-black italic">{selectedSection.title}</h3>
                  <button onClick={() => setShowReviewPanel(false)} className="text-slate-300 hover:text-slate-900"><FaTimes /></button>
                </div>

                <div className="space-y-8">
                  <button onClick={() => handleUpdateStatus(selectedSection.id, 'QA Passed')} className="w-full py-5 bg-emerald-500 text-white rounded-2xl font-black flex items-center justify-center gap-2 hover:bg-emerald-600 transition-all shadow-lg active:scale-95">
                    <FaCheckCircle /> Approve for Release
                  </button>

                  <div className="relative"><div className="absolute inset-0 flex items-center"><span className="w-full border-t border-slate-100"></span></div><div className="relative flex justify-center text-xs uppercase"><span className="bg-white px-4 text-slate-400 font-black">Reject & Log Issue</span></div></div>

                  <section className="space-y-4">
                    <div className="flex gap-2">
                      {['Bug', 'UI/UX', 'Logic'].map(type => (
                        <button key={type} onClick={() => setIssueData({ ...issueData, type })} className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase border transition-all ${issueData.type === type ? 'bg-slate-900 border-slate-900 text-white' : 'bg-white border-slate-200 text-slate-500'}`}>{type}</button>
                      ))}
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      {['Minor', 'Major', 'Critical'].map(sev => (
                        <button key={sev} onClick={() => setIssueData({ ...issueData, severity: sev })} className={`py-2 rounded-xl text-[10px] font-black uppercase border transition-all ${issueData.severity === sev ? 'bg-rose-600 border-rose-600 text-white' : 'bg-slate-50 border-slate-100 text-slate-400'}`}>{sev}</button>
                      ))}
                    </div>

                    <textarea rows="4" className="w-full p-5 bg-slate-50 border border-slate-100 rounded-3xl text-sm outline-none focus:ring-2 ring-rose-500/10" placeholder="Explain the problem to the creator..." value={issueData.desc} onChange={(e) => setIssueData({...issueData, desc: e.target.value})} />

                    <button disabled={!issueData.desc} onClick={() => handleUpdateStatus(selectedSection.id, 'Issue Logged')} className="w-full py-5 bg-rose-50 text-rose-600 rounded-2xl font-black hover:bg-rose-600 hover:text-white disabled:opacity-30 transition-all active:scale-95">
                      Send to Creator
                    </button>
                  </section>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// Helper Components
function StatusCard({ label, count, icon, color }) {
  return (
    <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center justify-between">
      <div>
        <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">{label}</p>
        <p className="text-3xl font-black text-slate-900">{count}</p>
      </div>
      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl ${color}`}>{icon}</div>
    </div>
  );
}

function SidebarItem({ icon, label, active, onClick, count }) {
  return (
    <button onClick={onClick} className={`w-full flex items-center justify-between px-5 py-4 rounded-2xl transition-all ${active ? 'bg-slate-800 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-800/50'}`}>
      <div className="flex items-center gap-3 font-bold text-sm uppercase tracking-tight">{icon} {label}</div>
      {count !== undefined && <span className="text-[10px] font-black bg-slate-900 px-2 py-1 rounded-lg border border-slate-700">{count}</span>}
    </button>
  );
}