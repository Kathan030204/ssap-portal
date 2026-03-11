import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import { 
  FaBug, FaCheckCircle, FaSearch, FaTimes, 
  FaSpinner, FaLayerGroup, FaHome,
  FaClock, FaCheckDouble, FaExclamationTriangle, FaListUl,
  FaSignOutAlt, FaUserCircle, FaBell, FaTrashAlt, FaPlus 
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
  
  // --- ISSUE REPORT STATES ---
  const [issueData, setIssueData] = useState({ type: 'Bug', severity: 'Major', desc: '' });
  const [reportIssues, setReportIssues] = useState([]); 
  
  // --- IDENTITY & NOTIFICATIONS ---
  const [currentUser, setCurrentUser] = useState({ id: null, name: '', role: '' });
  const [notifications, setNotifications] = useState([]);
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);
  const notifRef = useRef(null);

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

  // --- DATA FETCHING ---
  const fetchInitialData = useCallback(async () => {
    try {
      const storedUser = sessionStorage.getItem('user') || localStorage.getItem('user');
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
      const allData = secRes.data;

      // Filter logic: Tester sees their assigned items OR everything that is Published
      const relevant = allData.filter(s => 
        s.tester_id === savedUser.id || s.current_status === 'Published'
      );

      // Notification Logic: Check for newly assigned "In Testing" tasks
      const newTasks = relevant.filter(s => 
          s.tester_id === savedUser.id && s.current_status === 'In Testing'
      );

      setNotifications(newTasks.map(task => ({
        id: task.id,
        text: `New Assignment: ${task.title}`,
        time: 'Just now'
      })));

      setSections(relevant);
    } catch (error) {
      console.error("Tester Sync Error:", error);
    } finally {
      setLoading(false);
    }
  }, [onLogout]);

  useEffect(() => { 
    fetchInitialData(); 
    const interval = setInterval(fetchInitialData, 30000); 
    return () => clearInterval(interval);
  }, [fetchInitialData]);

  // --- HANDLERS ---
  const openReview = (section) => {
    setSelectedSection(section);
    setShowReviewPanel(true);
    setReportIssues([]); 
    setIssueData({ type: 'Bug', severity: 'Major', desc: '' });
    // Remove notification for this specific item once opened
    setNotifications(prev => prev.filter(n => n.id !== section.id));
  };

  const addIssueToReport = () => {
    if (!issueData.desc.trim()) return;
    setReportIssues([...reportIssues, { ...issueData, id: Date.now() }]);
    setIssueData({ type: 'Bug', severity: 'Major', desc: '' }); 
  };

  const removeIssueFromReport = (id) => {
    setReportIssues(reportIssues.filter(issue => issue.id !== id));
  };

  // --- SEPARATE STORAGE LOGIC ---
  const handleUpdateStatus = async (id, newStatus) => {
    try {
      if (newStatus === 'Issue Logged') {
        // Send a separate request for EVERY issue in the reportIssues list
        const promises = reportIssues.map(issue => {
          return api.put(`/sections/${id}`, { 
            current_status: 'Issue Logged',
            type: issue.type,
            severity: issue.severity,
            description: issue.desc,
            notes: `Individual Log: ${issue.type}`,
            title: selectedSection.title // Keeps context in the DB
          });
        });

        await Promise.all(promises);
        alert(`Successfully logged ${reportIssues.length} individual issues.`);
      } else {
        // Single update for Approval
        await api.put(`/sections/${id}`, { 
          current_status: 'QA Passed',
          description: 'Approved',
          notes: 'QA Approval'
        });
        alert("Asset Approved!");
      }
      
      fetchInitialData(); // Refresh list to show separate entries
      setShowReviewPanel(false);
      setSelectedSection(null);
    } catch (error) {
      console.error("Submission Error:", error);
      alert("Failed to sync with database.");
    }
  };

  // --- STATS & FILTERS ---
  const stats = {
    total: sections.length,
    pending: sections.filter(s => s.current_status === 'In Testing').length,
    logged: sections.filter(s => s.current_status === 'Issue Logged').length,
    passed: sections.filter(s => s.current_status === 'Published').length,
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
            TestingHub
          </h1>
        </div>
        
        <nav className="flex-1 px-4 space-y-2">
          <SidebarItem icon={<FaHome />} label="All Assets" active={activeFilter === 'all'} onClick={() => setActiveFilter('all')} />
          <SidebarItem icon={<FaClock className="text-blue-400" />} label="In Testing" count={stats.pending} active={activeFilter === 'pending'} onClick={() => setActiveFilter('pending')} />
          <SidebarItem icon={<FaExclamationTriangle className="text-rose-400" />} label="Issues" count={stats.logged} active={activeFilter === 'logged'} onClick={() => setActiveFilter('logged')} />
          <SidebarItem icon={<FaCheckDouble className="text-emerald-400" />} label="Completed" count={stats.passed} active={activeFilter === 'passed'} onClick={() => setActiveFilter('passed')} />
        </nav>

        <div className="p-4 border-t border-slate-800">
          <div className="flex items-center gap-3 px-4 py-3 mb-2">
            <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center font-black text-white text-xs">
                {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : <FaUserCircle />}
            </div>
            <div className="overflow-hidden">
              <p className="text-white font-black text-sm leading-none truncate">{currentUser.name || "Tester"}</p>
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
            <p className="text-slate-500 font-medium">Protocol: Separate Issue Logging</p>
          </div>
          
          <div className="flex items-center gap-4">
            {/* NOTIFICATION DROPDOWN */}
            <div className="relative" ref={notifRef}>
              <button 
                onClick={() => setShowNotifDropdown(!showNotifDropdown)} 
                className="p-4 bg-white border border-slate-200 rounded-2xl text-slate-400 hover:text-purple-600 transition-all shadow-sm relative"
              >
                <FaBell size={20} />
                {notifications.length > 0 && <span className="absolute top-3 right-3 w-2.5 h-2.5 bg-rose-500 border-2 border-white rounded-full"></span>}
              </button>

              {showNotifDropdown && (
                <div className="absolute right-0 mt-4 w-80 bg-white rounded-3xl shadow-2xl border border-slate-100 p-6 z-50">
                  <h4 className="font-black text-[10px] uppercase tracking-widest text-slate-400 mb-4">Notifications</h4>
                  <div className="space-y-3 max-h-60 overflow-y-auto">
                    {notifications.length > 0 ? notifications.map(n => (
                      <div key={n.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex gap-3 cursor-pointer hover:bg-purple-50" onClick={() => { openReview(sections.find(s => s.id === n.id)); setShowNotifDropdown(false); }}>
                        <div className="text-purple-600 mt-1"><FaLayerGroup size={14}/></div>
                        <div>
                          <p className="text-xs font-black text-slate-800">{n.text}</p>
                          <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">Pending Task</p>
                        </div>
                      </div>
                    )) : <p className="text-center text-slate-400 py-4 text-xs italic">Clear</p>}
                  </div>
                </div>
              )}
            </div>

            <div className="relative">
              <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input 
                type="text" 
                placeholder="Search assets..." 
                className="pl-12 pr-6 py-4 bg-white border border-slate-200 rounded-2xl w-80 shadow-sm outline-none focus:ring-2 ring-purple-500/20" 
                value={searchTerm} 
                onChange={(e) => setSearchTerm(e.target.value)} 
              />
            </div>
          </div>
        </header>

        <div className="grid grid-cols-4 gap-6 mb-10">
          <StatusCard label="Total" count={stats.total} icon={<FaListUl />} color="bg-slate-100 text-slate-600" />
          <StatusCard label="Waitlist" count={stats.pending} icon={<FaClock />} color="bg-blue-50 text-blue-600" />
          <StatusCard label="Bugs Found" count={stats.logged} icon={<FaExclamationTriangle />} color="bg-rose-50 text-rose-600" />
          <StatusCard label="Approved" count={stats.passed} icon={<FaCheckDouble />} color="bg-emerald-50 text-emerald-600" />
        </div>

        {loading ? (
          <div className="py-40 text-center"><FaSpinner className="animate-spin text-purple-600 text-5xl mx-auto" /></div>
        ) : (
          <div className={`grid gap-8 ${showReviewPanel ? 'grid-cols-1 xl:grid-cols-2' : 'grid-cols-1'}`}>
            
            {/* LIST SECTION */}
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

            {/* MULTI-ISSUE REVIEW PANEL */}
            {showReviewPanel && selectedSection && (
              <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-2xl p-10 h-fit sticky top-10">
                <div className="flex justify-between items-center mb-8">
                  <div>
                    <h3 className="text-2xl font-black italic">{selectedSection.title}</h3>
                    <span className="text-[10px] font-black text-purple-600 uppercase tracking-tighter">Diagnostic Mode</span>
                  </div>
                  <button onClick={() => setShowReviewPanel(false)} className="text-slate-300 hover:text-slate-900"><FaTimes /></button>
                </div>

                <div className="space-y-6">
                  <button onClick={() => handleUpdateStatus(selectedSection.id, 'QA Passed')} className="w-full py-5 bg-emerald-500 text-white rounded-2xl font-black flex items-center justify-center gap-2 hover:bg-emerald-600 transition-all shadow-lg">
                    <FaCheckCircle /> Approve for Release
                  </button>

                  <div className="relative py-2">
                    <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-slate-100"></span></div>
                    <div className="relative flex justify-center text-[10px] uppercase font-black"><span className="bg-white px-4 text-slate-400">Add Revisions Below</span></div>
                  </div>

                  {/* STAGING AREA */}
                  {reportIssues.length > 0 && (
                    <div className="space-y-3">
                      <div className="bg-slate-50 rounded-2xl border border-slate-100 overflow-hidden">
                        {reportIssues.map((issue) => (
                          <div key={issue.id} className="p-4 border-b border-white last:border-0 flex items-center justify-between group">
                            <div className="flex items-center gap-3">
                              <span className={`w-2 h-2 rounded-full ${issue.severity === 'Critical' ? 'bg-rose-500' : 'bg-blue-500'}`}></span>
                              <div>
                                <p className="text-xs font-black text-slate-800">{issue.type}: {issue.desc.substring(0, 30)}...</p>
                                <p className="text-[9px] font-bold text-slate-400 uppercase">{issue.severity}</p>
                              </div>
                            </div>
                            <button onClick={() => removeIssueFromReport(issue.id)} className="text-slate-300 hover:text-rose-500 transition-colors">
                              <FaTrashAlt size={12} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* INPUT FORM */}
                  <div className="bg-slate-50 p-6 rounded-4xl border border-slate-100 space-y-4">
                    <div className="flex gap-2">
                      {['Bug', 'UI/UX', 'Logic'].map(type => (
                        <button key={type} onClick={() => setIssueData({ ...issueData, type })} className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase border transition-all ${issueData.type === type ? 'bg-slate-900 border-slate-900 text-white' : 'bg-white border-slate-200 text-slate-500'}`}>{type}</button>
                      ))}
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      {['Minor', 'Major', 'Critical'].map(sev => (
                        <button key={sev} onClick={() => setIssueData({ ...issueData, severity: sev })} className={`py-2 rounded-xl text-[10px] font-black uppercase border transition-all ${issueData.severity === sev ? 'bg-rose-600 border-rose-600 text-white' : 'bg-white border-slate-100 text-slate-400'}`}>{sev}</button>
                      ))}
                    </div>

                    <textarea rows="3" className="w-full p-4 bg-white border border-slate-200 rounded-2xl text-sm outline-none focus:ring-2 ring-purple-500/10" placeholder="Specific problem description..." value={issueData.desc} onChange={(e) => setIssueData({...issueData, desc: e.target.value})} />

                    <button 
                      onClick={addIssueToReport}
                      disabled={!issueData.desc}
                      className="w-full py-3 border-2 border-dashed border-slate-300 text-slate-500 rounded-xl font-black text-[11px] uppercase hover:border-purple-400 hover:text-purple-600 transition-all flex items-center justify-center gap-2"
                    >
                      <FaPlus /> Staging: Add to Report
                    </button>
                  </div>

                  <button 
                    disabled={reportIssues.length === 0} 
                    onClick={() => handleUpdateStatus(selectedSection.id, 'Issue Logged')} 
                    className="w-full py-5 bg-rose-600 text-white rounded-2xl font-black hover:bg-rose-700 disabled:opacity-30 transition-all shadow-lg shadow-rose-200"
                  >
                    Submit {reportIssues.length} Separate Issues
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// Sub-components
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
    <button onClick={onClick} className={`w-full flex items-center justify-between px-5 py-4 rounded-2xl transition-all ${active ? 'bg-slate-800 text-white' : 'text-slate-500 hover:bg-slate-800/50'}`}>
      <div className="flex items-center gap-3 font-bold text-sm uppercase tracking-tight">{icon} {label}</div>
      {count !== undefined && <span className="text-[10px] font-black bg-slate-900 px-2 py-1 rounded-lg border border-slate-700">{count}</span>}
    </button>
  );
}