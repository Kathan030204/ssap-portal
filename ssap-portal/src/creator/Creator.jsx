import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import {
  FaUpload, FaBug, FaCheckCircle, FaSpinner,
  FaEye, FaTimes, FaPlus, FaSyncAlt,
  FaFileAlt, FaFlask, FaClipboardList, FaLayerGroup,
  FaHome, FaBoxOpen, FaExclamationTriangle,
  FaSignOutAlt, FaBell // Added FaBell
} from 'react-icons/fa';

const api = axios.create({ baseURL: 'http://localhost:8000/api' });

export function Creator({ onLogout }) {
  const [activeTab, setActiveTab] = useState('inventory');
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [selectedIssue, setSelectedIssue] = useState(null);
  const [isEditing, setIsEditing] = useState(null);
  const [formData, setFormData] = useState({ title: '', category: 'Hero', docs: '' });
  const [file, setFile] = useState(null);
  const [statusFilter, setStatusFilter] = useState('All');
  const [user, setUser] = useState({ name: '', role: '', loggedIn: false });

  // --- NOTIFICATION STATE ---
  const [notifications, setNotifications] = useState([]);
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);
  const notifRef = useRef(null);

  useEffect(() => {
    fetchSections();
    fetchCreatorAccount();
    
    // Auto-refresh every 30 seconds to catch Tester updates
    const interval = setInterval(fetchSections, 30000);
    return () => clearInterval(interval);
  }, []);

  // Handle clicking outside the notification bell
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) setShowNotifDropdown(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchCreatorAccount = async () => {
    try {
      const response = await api.get('/accounts');
      const creatorData = response.data.find(acc => acc.role === 'creator');
      if (creatorData) {
        setUser({ name: creatorData.username, role: creatorData.role, loggedIn: true });
      }
    } catch (error) { console.error("Account Fetch Error:", error); }
  };

  const fetchSections = async () => {
    try {
      // Don't show global loader on background refreshes
      const response = await api.get('/sections');
      const allSections = response.data;
      setSections(allSections);

      // ALERT LOGIC: Filter for 'Issue Logged'
      const issueAlerts = allSections
        .filter(s => s.current_status === 'Issue Logged')
        .map(s => ({
          id: s.id,
          title: s.title,
          msg: "Bug detected by QA",
          severity: s.issues?.[0]?.severity || 'Standard'
        }));
      setNotifications(issueAlerts);

    } catch (error) {
      console.error("Fetch Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleNotifClick = (sectionId) => {
    const target = sections.find(s => s.id === sectionId);
    if (target) {
      setStatusFilter('Fix Required');
      setActiveTab('inventory');
      setSelectedIssue(target);
      setShowNotifDropdown(false);
    }
  };

  const stats = {
    total: sections.length,
    testing: sections.filter(s => s.current_status === 'In Testing').length,
    issues: sections.filter(s => s.current_status === 'Issue Logged').length,
    passed: sections.filter(s => s.current_status === 'QA Passed').length,
  };

  const filteredSections = sections.filter(sec => {
    if (statusFilter === 'All') return true;
    if (statusFilter === 'In Review') return sec.current_status === 'In Testing';
    if (statusFilter === 'Fix Required') return sec.current_status === 'Issue Logged';
    if (statusFilter === 'QA Passed') return sec.current_status === 'QA Passed';
    return true;
  });

  const startReupload = (sec) => {
    setIsEditing(sec.id);
    setSelectedIssue(sec);
    setFormData({ title: sec.title, category: sec.category || 'Hero', docs: sec.docs || '' });
    setActiveTab('submit');
  };

  const handleSubmission = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    const data = new FormData();
    data.append('title', formData.title);
    data.append('category', formData.category);
    data.append('docs', formData.docs);
    data.append('current_status', 'In Testing');
    if (file) data.append('zip_file', file);

    try {
      if (isEditing) {
        data.append('_method', 'PUT'); 
        await api.post(`/sections/${isEditing}`, data, { headers: { 'Content-Type': 'multipart/form-data' } });
      } else {
        data.append('creator_id', 1);
        await api.post('/sections', data, { headers: { 'Content-Type': 'multipart/form-data' } });
      }
      setFormData({ title: '', category: 'Hero', docs: '' });
      setFile(null); setIsEditing(null); setSelectedIssue(null); setActiveTab('inventory');
      fetchSections();
    } catch { alert("Action failed."); } 
    finally { setSubmitting(false); }
  };

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans text-slate-800">

      {/* --- SIDEBAR --- */}
      <div className="w-64 bg-slate-900 text-slate-300 flex flex-col sticky top-0 h-screen">
        <div className="p-6 border-b border-slate-800">
          <h1 className="text-xl font-black text-white tracking-tighter">CREATOR <span className="text-indigo-400">UI</span></h1>
        </div>
        <nav className="flex-1 p-4 space-y-2 mt-4">
          <button onClick={() => { setActiveTab('inventory'); setStatusFilter('All'); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all ${activeTab === 'inventory' && statusFilter === 'All' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'hover:bg-slate-800'}`}>
            <FaHome size={18} /> Dashboard
          </button>
          <div className="pt-4 pb-2 px-4 text-[10px] font-black uppercase text-slate-500 tracking-widest">Filters</div>
          {[{ label: 'In Review', icon: <FaFlask />, filter: 'In Review' }, { label: 'Fix Required', icon: <FaBug />, filter: 'Fix Required' }, { label: 'QA Passed', icon: <FaCheckCircle />, filter: 'QA Passed' }].map((item) => (
            <button key={item.label} onClick={() => { setActiveTab('inventory'); setStatusFilter(item.filter); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all ${statusFilter === item.filter && activeTab === 'inventory' ? 'bg-slate-800 text-indigo-400' : 'hover:bg-slate-800'}`}>
              {item.icon} {item.label}
            </button>
          ))}
          <div className="pt-4 pb-2 px-4 text-[10px] font-black uppercase text-slate-500 tracking-widest">Actions</div>
          <button onClick={() => { setActiveTab('submit'); setIsEditing(null); setFile(null); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all ${activeTab === 'submit' ? 'bg-indigo-600 text-white' : 'hover:bg-slate-800'}`}>
            <FaPlus size={16} /> New Asset
          </button>
        </nav>
        <div className="p-4 border-t border-slate-800 bg-slate-950/30">
          {user.loggedIn && (
            <div className="space-y-3">
              <div className="flex items-center gap-3 px-2">
                <div className="w-9 h-9 rounded-full bg-linear-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-black text-xs">{user.name.charAt(0)}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-black text-white truncate">{user.name}</p>
                  <p className="text-[9px] font-bold text-slate-500 uppercase">{user.role}</p>
                </div>
              </div>
              <button onClick={onLogout} className="w-full flex items-center justify-center gap-2 py-2.5 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-all border border-transparent hover:border-rose-500/20"><FaSignOutAlt size={12} /> Logout</button>
            </div>
          )}
        </div>
      </div>

      <main className="flex-1 p-4 md:p-10 overflow-y-auto">
        <div className="max-w-6xl mx-auto">
          <header className="mb-8 flex justify-between items-start">
            <div>
              <h2 className="text-sm font-black text-indigo-600 uppercase tracking-widest mb-1">{activeTab} / {statusFilter}</h2>
              <h3 className="text-3xl font-black text-slate-900 italic">Work Console</h3>
            </div>

            {/* --- NOTIFICATION BELL --- */}
            <div className="relative flex items-center gap-4" ref={notifRef}>
              <div className="hidden md:block text-right mr-2">
                <p className="text-xs font-bold text-slate-400">QA SYNC</p>
                <div className="flex items-center gap-2 text-emerald-500 font-black text-xs">
                  <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span> ACTIVE
                </div>
              </div>

              <button 
                onClick={() => setShowNotifDropdown(!showNotifDropdown)}
                className={`p-4 rounded-2xl bg-white border border-slate-200 text-slate-400 hover:text-indigo-600 transition-all relative ${notifications.length > 0 ? 'shadow-xl shadow-rose-100 border-rose-100' : ''}`}
              >
                <FaBell size={20} />
                {notifications.length > 0 && (
                  <span className="absolute top-3 right-3 w-4 h-4 bg-rose-500 border-2 border-white rounded-full flex items-center justify-center text-[8px] text-white font-black animate-bounce">
                    {notifications.length}
                  </span>
                )}
              </button>

              {showNotifDropdown && (
                <div className="absolute right-0 top-full mt-4 w-80 bg-white rounded-4xl shadow-2xl border border-slate-100 p-6 z-50 animate-in fade-in zoom-in-95 duration-200">
                  <h4 className="font-black text-[10px] uppercase tracking-[0.2em] text-slate-400 mb-4">Urgent Fixes Required</h4>
                  <div className="space-y-3 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
                    {notifications.length > 0 ? (
                      notifications.map(n => (
                        <div 
                          key={n.id} 
                          onClick={() => handleNotifClick(n.id)}
                          className="p-4 rounded-2xl bg-rose-50 border border-rose-100 group cursor-pointer hover:bg-rose-500 transition-all"
                        >
                          <div className="flex justify-between items-start mb-1">
                            <p className="text-xs font-black text-rose-900 group-hover:text-white leading-tight truncate w-40">{n.title}</p>
                            <span className="text-[8px] font-black bg-white px-2 py-0.5 rounded text-rose-500 uppercase">{n.severity}</span>
                          </div>
                          <p className="text-[10px] font-bold text-rose-400 group-hover:text-rose-100 uppercase">{n.msg}</p>
                        </div>
                      ))
                    ) : (
                      <div className="py-8 text-center">
                        <FaCheckCircle className="mx-auto text-emerald-200 mb-2" size={24} />
                        <p className="text-slate-400 italic text-sm">All assets are clean.</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </header>

          {/* STATS & INVENTORY (KEEP EXISTING UI) */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
            {[{ label: 'All', val: stats.total, icon: <FaLayerGroup />, color: 'text-slate-600', bg: 'bg-white' }, { label: 'In Review', val: stats.testing, icon: <FaFlask />, color: 'text-amber-600', bg: 'bg-amber-50' }, { label: 'Fix Required', val: stats.issues, icon: <FaBug />, color: 'text-rose-600', bg: 'bg-rose-50' }, { label: 'QA Passed', val: stats.passed, icon: <FaCheckCircle />, color: 'text-emerald-600', bg: 'bg-emerald-50' }].map((stat, i) => (
              <button key={i} onClick={() => setStatusFilter(stat.label)} className={`p-5 rounded-2xl border ${statusFilter === stat.label ? 'border-indigo-500 ring-2 ring-indigo-500/10' : 'border-slate-200'} shadow-sm transition-all text-left group ${stat.bg}`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{stat.label}</span>
                  <span className={`${stat.color} opacity-40 text-lg`}>{stat.icon}</span>
                </div>
                <p className={`text-3xl font-black ${stat.color}`}>{stat.val}</p>
              </button>
            ))}
          </div>

          {activeTab === 'inventory' ? (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              {/* TABLE AREA */}
              <div className="lg:col-span-8">
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                  {loading ? <div className="p-20 text-center animate-pulse text-slate-400 font-black uppercase">Syncing...</div> : (
                    <table className="w-full text-left">
                      <thead className="bg-slate-50 border-b">
                        <tr>
                          <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase">Asset Name</th>
                          <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase text-center">Status</th>
                          <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredSections.map((sec) => (
                          <tr key={sec.id} className={`group hover:bg-slate-50 transition ${selectedIssue?.id === sec.id ? 'bg-indigo-50/50' : ''}`}>
                            <td className="px-6 py-5">
                              <span className="text-[9px] font-black text-indigo-500 block">ID: #{sec.id}</span>
                              <span className="font-bold text-slate-800">{sec.title}</span>
                            </td>
                            <td className="px-6 py-5 text-center">
                              <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase border ${sec.current_status === 'Issue Logged' ? 'bg-red-50 text-red-600 border-red-100' : sec.current_status === 'QA Passed' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-slate-100 text-slate-600'}`}>{sec.current_status}</span>
                            </td>
                            <td className="px-6 py-5 text-right">
                              <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                {sec.current_status === 'Issue Logged' && (
                                  <button onClick={() => startReupload(sec)} className="bg-amber-500 text-white px-3 py-1.5 rounded-lg text-[10px] font-black flex items-center gap-1 shadow-md shadow-amber-200"><FaSyncAlt /> FIX</button>
                                )}
                                <button onClick={() => setSelectedIssue(sec)} className={`p-2 rounded-lg transition ${selectedIssue?.id === sec.id ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-slate-100'}`}><FaEye /></button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>

              {/* DETAIL AREA */}
              <div className="lg:col-span-4">
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sticky top-10 min-h-full">
                  {selectedIssue ? (
                    <div className="space-y-6">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-black text-slate-800 uppercase italic">Detail Viewer</h3>
                          <p className="text-[10px] font-bold text-slate-400 uppercase">Asset ID: {selectedIssue.id}</p>
                        </div>
                        <button onClick={() => setSelectedIssue(null)} className="p-2 hover:bg-slate-100 rounded-full text-slate-300"><FaTimes /></button>
                      </div>
                      <div className="h-px bg-slate-100"></div>
                      {selectedIssue.current_status === 'Issue Logged' ? (
                        <div className="space-y-4">
                          <div className="p-3 bg-red-50 rounded-lg text-red-700 text-[10px] font-black flex items-center gap-2">
                            <FaBug className="animate-bounce" /> FOUND DEFECTS:
                          </div>
                          {selectedIssue.issues?.map((issue, i) => (
                            <div key={i} className="p-4 bg-slate-50 rounded-xl border border-red-100 relative overflow-hidden">
                              <div className="absolute top-0 left-0 w-1 h-full bg-red-500"></div>
                              <p className="text-[10px] font-black text-red-500 mb-1 uppercase tracking-tighter">{issue.severity} Severity</p>
                              <p className="text-sm text-slate-600 italic leading-relaxed">"{issue.description}"</p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><FaFileAlt /> Notes</div>
                          <p className="text-sm text-slate-600 leading-relaxed italic border-l-4 pl-4 border-indigo-400 bg-slate-50 py-4 rounded-r-lg">{selectedIssue.docs || "No additional notes."}</p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-24 flex flex-col items-center">
                      <FaBoxOpen className="text-slate-200 text-4xl mb-6" />
                      <p className="text-slate-400 text-xs font-black uppercase">Select an asset</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            /* FORM VIEW (KEEP EXISTING UI) */
            <div className="max-w-3xl mx-auto py-10">
              <form onSubmit={handleSubmission} className="bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden">
                <div className={`${isEditing ? 'bg-amber-500' : 'bg-slate-900'} p-8 text-white`}>
                  <h2 className="text-2xl font-black uppercase italic flex items-center gap-3">
                    {isEditing ? <FaSyncAlt className="animate-spin" /> : <FaPlus />} {isEditing ? 'Revise Submission' : 'Create New Asset'}
                  </h2>
                </div>
                <div className="p-8 space-y-6">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Asset Identifier</label>
                    <input required placeholder="Asset Name" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} className="w-full border-2 border-slate-100 rounded-2xl p-4 text-sm font-bold bg-slate-50 outline-none focus:border-indigo-500" />
                  </div>
                  <div className="p-6 rounded-2xl border-2 border-indigo-100 border-dashed bg-indigo-50/30 flex justify-between items-center">
                    <div className="flex items-center gap-3 text-indigo-900">
                      <FaUpload className="text-indigo-400" />
                      <span className="text-sm font-black italic">{file ? file.name : "SOURCE_PACKAGE.ZIP"}</span>
                    </div>
                    <label className="bg-indigo-600 text-white px-6 py-2.5 rounded-xl text-xs font-black cursor-pointer hover:bg-indigo-700 shadow-lg">
                      {file ? 'CHANGE' : 'UPLOAD'}
                      <input type="file" className="hidden" onChange={(e) => setFile(e.target.files[0])} />
                    </label>
                  </div>
                  <div className="flex justify-end gap-6 pt-4 items-center">
                    <button type="button" onClick={() => setActiveTab('inventory')} className="text-xs font-black text-slate-400 uppercase hover:text-rose-500">Discard</button>
                    <button type="submit" disabled={submitting} className="bg-indigo-600 text-white px-10 py-4 rounded-2xl font-black text-sm uppercase shadow-xl hover:bg-indigo-700 disabled:bg-slate-300">
                      {submitting ? <FaSpinner className="animate-spin" /> : 'Submit for QA Review'}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}