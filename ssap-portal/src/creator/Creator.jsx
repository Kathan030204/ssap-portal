import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import {
  FaUpload, FaBug, FaCheckCircle, FaSpinner,
  FaEye, FaTimes, FaPlus, FaSyncAlt,
  FaFileAlt, FaFlask, FaLayerGroup,
  FaHome, FaBoxOpen,
  FaSignOutAlt, FaBell,
  FaUserCircle, FaHourglassHalf
} from 'react-icons/fa';

const api = axios.create({ baseURL: '/api' });

export function Creator({ onLogout }) {
  const [activeTab, setActiveTab] = useState('inventory');
  const [sections, setSections] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [selectedIssue, setSelectedIssue] = useState(null);
  const [isEditing, setIsEditing] = useState(null);
  const [formData, setFormData] = useState({ title: '', category: 'Hero', docs: '', live_link: '', shopify_admin_link: '' });
  const [file, setFile] = useState(null);
  const [statusFilter, setStatusFilter] = useState('All');
  const [user, setUser] = useState({ id: null, name: '', role: '', loggedIn: false });
  const [notifications, setNotifications] = useState([]);
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);
  const notifRef = useRef(null);

  // --- API FETCHING ---
  const fetchSections = useCallback(async (userId) => {
    if (!userId) return;
    try {
      const response = await api.get(`/sections?creator_id=${userId}`);
      
      /** * SORTING LOGIC: 
       * We sort the incoming data in descending order based on 'id'.
       * This ensures the newest submissions appear at the top.
       */
      const sortedData = response.data.sort((a, b) => b.id - a.id);
      
      const mySections = sortedData.filter(s => s.creator_id === userId);
      setSections(mySections);

      // Handle Notifications for Issues
      const issueAlerts = mySections
        .filter(s => s.current_status === 'Issue Logged')
        .map(s => ({
          id: s.id,
          title: s.title,
          msg: "QA found a bug",
          severity: s.severity || s.issues?.[0]?.severity || 'Major'
        }));
      setNotifications(issueAlerts);

      // Live Update for Sidebar/Panel
      setSelectedIssue(current => {
        if (!current) return null;
        const updatedData = mySections.find(s => s.id === current.id);
        return (updatedData && updatedData.current_status === 'Issue Logged') ? updatedData : null;
      });
    } catch (error) {
      console.error("Fetch Error:", error);
    }
  }, []);

  useEffect(() => {
    const savedUser = JSON.parse(sessionStorage.getItem('user'));
    if (savedUser) {
      const uid = savedUser.id;
      setUser({
        id: uid,
        name: savedUser.username || savedUser.name,
        role: savedUser.role,
        loggedIn: true
      });
      fetchSections(uid);
    } else {
      onLogout();
    }
  }, [onLogout, fetchSections]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) setShowNotifDropdown(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleNotifClick = (sectionId) => {
    const target = sections.find(s => s.id === sectionId);
    if (target) {
      setStatusFilter('Fix Required');
      setActiveTab('inventory');
      setSelectedIssue(target);
      setShowNotifDropdown(false);
    }
  };

  const startReupload = (sec) => {
    setIsEditing(sec.id);
    setSelectedIssue(null);
    setFormData({
      title: sec.title,
      live_link: sec.live_link || '',
      shopify_admin_link: sec.shopify_admin_link || '',
      category: sec.category || 'Hero',
      docs: sec.docs || ''
    });
    setActiveTab('submit');
  };

  const handleSubmission = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    const data = new FormData();
    data.append('title', formData.title);
    data.append('category', formData.category);
    data.append('docs', formData.docs);
    data.append('live_link', formData.live_link);
    data.append('shopify_admin_link', formData.shopify_admin_link);
    data.append('creator_id', user.id);

    if (file) data.append('zip_file', file);

    const nextStatus = isEditing ? 'In Testing' : 'Pending Allocation';
    data.append('current_status', nextStatus);

    try {
      if (isEditing) {
        data.append('_method', 'PUT'); 
        await api.post(`/sections/${isEditing}`, data);
      } else {
        await api.post('/sections', data);
      }

      setFormData({ title: '', category: 'Hero', docs: '', live_link: '', shopify_admin_link: '' });
      setFile(null);
      setIsEditing(null);
      setSelectedIssue(null);
      setActiveTab('inventory');
      fetchSections(user.id);
    } catch (err) {
      console.error(err);
      alert("Submission error.");
    } finally {
      setSubmitting(false);
    }
  };

  // --- STATS CALCULATION ---
  const stats = {
    total: sections.length,
    review: sections.filter(s => s.current_status === 'Pending Allocation' || s.current_status === 'In Testing').length,
    issues: sections.filter(s => s.current_status === 'Issue Logged').length,
    passed: sections.filter(s => s.current_status === 'Published').length,
  };

  // --- FILTERING LOGIC ---
  const filteredSections = sections.filter(sec => {
    if (statusFilter === 'All') return true;
    if (statusFilter === 'In Review') {
      return sec.current_status === 'Pending Allocation' || sec.current_status === 'In Testing';
    }
    if (statusFilter === 'Fix Required') return sec.current_status === 'Issue Logged';
    if (statusFilter === 'Published') return sec.current_status === 'Published';
    return true;
  });

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans text-slate-800">

      {/* SIDEBAR */}
      <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col sticky top-0 h-screen">
        <div className="p-6 border-b border-slate-800">
          <h1 className="text-xl font-black text-white tracking-tighter italic">CREATOR HUB</h1>
        </div>

        <nav className="flex-1 p-4 space-y-2 mt-4">
          <button
            onClick={() => { setActiveTab('inventory'); setStatusFilter('All'); setSelectedIssue(null); }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all cursor-pointer ${activeTab === 'inventory' && statusFilter === 'All' ? 'bg-indigo-600 text-white shadow-lg' : 'hover:bg-slate-800 text-slate-500'}`}
          >
            <FaHome size={18} /> Dashboard
          </button>

          <div className="pt-4 pb-2 px-4 text-[10px] font-black uppercase text-slate-600 tracking-widest">Pipeline</div>
          {['In Review', 'Fix Required', 'Published'].map((f) => (
            <button
              key={f}
              onClick={() => { setActiveTab('inventory'); setStatusFilter(f); setSelectedIssue(null); }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all cursor-pointer ${statusFilter === f && activeTab === 'inventory' ? 'bg-slate-800 text-indigo-400' : 'hover:bg-slate-800 text-slate-500'}`}
            >
              {f === 'In Review' ? <FaFlask /> : f === 'Fix Required' ? <FaBug /> : <FaCheckCircle />} {f}
            </button>
          ))}

          <button
            onClick={() => { setActiveTab('submit'); setIsEditing(null); setSelectedIssue(null); setFormData({ title: '', category: 'Hero', docs: '', live_link: '', shopify_admin_link: '' }); }}
            className="mt-4 w-full flex items-center gap-3 px-4 py-3 rounded-xl font-black text-xs uppercase bg-white text-slate-900 hover:bg-indigo-50 transition-all cursor-pointer"
          >
            <FaPlus /> New Asset
          </button>
        </nav>

        <div className="p-4 border-t border-slate-800">
          <div className="flex items-center gap-3 px-2 mb-4">
            <div className="w-9 h-9 rounded-full bg-indigo-500 flex items-center justify-center text-white font-black text-xs"><FaUserCircle size={20} /></div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-black text-white truncate">{user.name}</p>
              <p className="text-[9px] font-bold text-slate-500 uppercase">{user.role}</p>
            </div>
          </div>
          <button onClick={onLogout} className="w-full flex items-center justify-center gap-2 py-2 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-rose-400 cursor-pointer">
            <FaSignOutAlt size={12} /> Sign Out
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 p-10 overflow-y-auto">
        <header className="mb-10 flex justify-between items-start">
          <div>
            <h2 className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-1">{activeTab} // {statusFilter}</h2>
            <h3 className="text-3xl font-black text-slate-900 italic">Work Console</h3>
          </div>

          <div className="relative" ref={notifRef}>
            <button onClick={() => setShowNotifDropdown(!showNotifDropdown)} className="p-4 rounded-2xl bg-white border border-slate-200 text-slate-400 hover:text-indigo-600 transition-all relative cursor-pointer">
              <FaBell size={20} />
              {notifications.length > 0 && <span className="absolute top-3 right-3 w-4 h-4 bg-rose-500 border-2 border-white rounded-full flex items-center justify-center text-[8px] text-white font-black">{notifications.length}</span>}
            </button>
            {showNotifDropdown && (
              <div className="absolute right-0 top-full mt-4 w-80 bg-white rounded-3xl shadow-2xl border border-slate-100 p-6 z-50">
                <h4 className="font-black text-[10px] uppercase tracking-widest text-slate-400 mb-4">Urgent Attention</h4>
                {notifications.length === 0 && <p className="text-xs text-slate-400 italic">No new issues logged.</p>}
                {notifications.map(n => (
                  <div key={n.id} onClick={() => handleNotifClick(n.id)} className="p-4 rounded-2xl bg-rose-50 border border-rose-100 mb-2 cursor-pointer hover:bg-rose-500 group transition-all">
                    <p className="text-xs font-black text-rose-900 group-hover:text-white">{n.title}</p>
                    <p className="text-[10px] font-bold text-rose-400 group-hover:text-rose-100 uppercase italic">ACTION REQUIRED</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </header>

        {activeTab === 'inventory' ? (
          <div className={`grid ${statusFilter === 'Fix Required' ? 'grid-cols-12' : 'grid-cols-1'} gap-8`}>
            {/* Table Column */}
            <div className={statusFilter === 'Fix Required' ? 'col-span-8' : 'col-span-1'}>
              <div className="grid grid-cols-4 gap-4 mb-8">
                <StatBox label="TOTAL" val={stats.total} />
                <StatBox label="IN REVIEW" val={stats.review} color="text-amber-500" />
                <StatBox label="ISSUES" val={stats.issues} color="text-rose-500" />
                <StatBox label="PASSED" val={stats.passed} color="text-emerald-500" />
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 border-b border-slate-100">
                    <tr>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase">Asset Details</th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase text-center">Lifecycle</th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase text-right">Utility</th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase text-right">View</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {filteredSections.map(sec => (
                      <tr
                        key={sec.id}
                        className={`group hover:bg-slate-50 transition ${statusFilter === 'Fix Required' ? 'cursor-pointer' : 'cursor-default'} ${selectedIssue?.id === sec.id ? 'bg-indigo-50/50' : ''}`}
                      >
                        <td className="px-6 py-5">
                          <p className="font-black text-slate-800">{sec.title}</p>
                          <p className="text-[9px] font-bold text-slate-400 uppercase">#{sec.id}</p>
                        </td>
                        <td className="px-6 py-5 text-center">
                          <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase border flex items-center justify-center gap-1 w-max mx-auto ${sec.current_status === 'Issue Logged' ? 'bg-rose-50 text-rose-600 border-rose-100' :
                            sec.current_status === 'Pending Allocation' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                              sec.current_status === 'In Testing' ? 'bg-indigo-50 text-indigo-600 border-indigo-100' :
                                'bg-slate-100 text-slate-500'
                            }`}>
                            {sec.current_status}
                          </span>
                        </td>
                        <td className="px-6 py-5 text-right">
                          <div className="flex justify-end gap-2">
                            {sec.current_status === 'Issue Logged' && (
                              <button
                                onClick={(e) => { e.stopPropagation(); startReupload(sec); }}
                                className="px-3 py-2 bg-slate-700 text-white rounded-lg shadow-lg text-[10px] font-bold uppercase cursor-pointer hover:bg-slate-900 transition-all"
                              >
                                Fix Issues
                              </button>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-5 text-right">
                          <button
                            onClick={() => { if (statusFilter === 'Fix Required') setSelectedIssue(sec); }}
                            className="p-2 text-slate-400 hover:text-indigo-600 cursor-pointer"
                          >
                            <FaEye />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Issue Viewer */}
            {statusFilter === 'Fix Required' && (
              <div className="col-span-4">
                <div className="bg-white rounded-3xl border border-slate-200 p-8 sticky top-10 shadow-sm min-h-100">
                  {selectedIssue ? (
                    <div className="space-y-6">
                      <div className="flex justify-between items-start">
                        <h3 className="font-black text-slate-900 italic uppercase">Issue Logged Viewer</h3>
                        <button
                          type="button"
                          onClick={() => setSelectedIssue(null)}
                          className="text-slate-300 hover:text-slate-900 p-1 transition-colors cursor-pointer"
                        >
                          <FaTimes size={18} />
                        </button>
                      </div>

                      <div className="pb-4 border-b border-slate-100">
                        <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Asset Name</p>
                        <p className="font-black text-slate-800 text-lg">{selectedIssue.title}</p>
                      </div>

                      <div className="space-y-4">
                        <p className="text-[10px] font-black text-rose-500 uppercase tracking-widest">Defect Log ({selectedIssue.issues?.length || 0})</p>
                        <div className="space-y-3 max-h-80 overflow-y-auto pr-2 custom-scrollbar">
                          {selectedIssue.issues?.map((bug, index) => (
                            <div key={index} className="p-5 bg-rose-50 rounded-2xl border border-rose-100 relative overflow-hidden">
                              <div className="absolute top-0 left-0 w-1 h-full bg-rose-500"></div>
                              <p className="text-base font-medium text-slate-700 leading-relaxed">
                                {bug.description || 'No description provided.'}
                              </p>
                            </div>
                          ))}
                        </div>
                        <button onClick={() => startReupload(selectedIssue)} className="w-full py-4 bg-slate-800 text-white rounded-2xl font-black text-xs uppercase shadow-xl flex items-center justify-center gap-2 hover:bg-slate-900 transition-all cursor-pointer">
                          <FaSyncAlt /> Push Fix Build
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-32">
                      <FaBoxOpen className="mx-auto text-slate-200 mb-4" size={48} />
                      <p className="text-slate-300 italic text-sm">Select an asset to view feedback.</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ) : (
          /* FORM SECTION */
          <div className="max-w-2xl mx-auto py-10">
            <form onSubmit={handleSubmission} className="bg-white rounded-[2.5rem] border border-slate-200 shadow-2xl overflow-hidden">
              <div className={`${isEditing ? 'bg-indigo-600' : 'bg-slate-800'} p-10 text-white text-center transition-colors`}>
                <h2 className="text-3xl font-black italic uppercase tracking-tighter">
                  {isEditing ? 'Revise Section' : 'Add New Section'}
                </h2>
                <p className="text-[10px] font-bold text-slate-300 mt-2 uppercase tracking-widest">
                  {isEditing ? `Pushing updates to existing Tester` : 'Initial status: Pending Admin Allocation'}
                </p>
              </div>
              <div className="p-10 space-y-8">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block ml-1">Asset Label</label>
                  <input
                    required
                    value={formData.title}
                    disabled={isEditing}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full border-2 border-slate-50 bg-slate-50 rounded-2xl p-5 text-sm font-bold outline-none focus:border-indigo-500 disabled:opacity-70"
                    placeholder="e.g. Hero Section V2"
                  />
                </div>

                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block ml-1">Live Page Link</label>
                    <input
                      type="url"
                      value={formData.live_link}
                      onChange={(e) => setFormData({ ...formData, live_link: e.target.value })}
                      className="w-full border-2 border-slate-50 bg-slate-50 rounded-2xl p-5 text-sm font-bold outline-none focus:border-indigo-500"
                      placeholder="https://example.com/live"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block ml-1">Shopify Admin Link</label>
                    <input
                      type="url"
                      value={formData.shopify_admin_link}
                      onChange={(e) => setFormData({ ...formData, shopify_admin_link: e.target.value })}
                      className="w-full border-2 border-slate-50 bg-slate-50 rounded-2xl p-5 text-sm font-bold outline-none focus:border-indigo-500"
                      placeholder="https://admin.shopify.com/..."
                    />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block ml-1">Package (.zip)</label>
                  <div className="p-10 border-4 border-dashed border-indigo-50 bg-indigo-50/20 rounded-3xl text-center group hover:border-indigo-200 transition-all">
                    <FaUpload className="mx-auto text-indigo-200 mb-4" size={32} />
                    <p className="text-sm font-black italic mb-6">{file ? file.name : 'Drag & Drop code package'}</p>
                    <label className="bg-indigo-600 text-white px-8 py-3 rounded-xl text-xs font-black cursor-pointer shadow-lg hover:bg-indigo-700">
                      BROWSE <input type="file" className="hidden" onChange={(e) => setFile(e.target.files[0])} />
                    </label>
                  </div>
                </div>
                <div className="flex justify-end gap-6 pt-4">
                  <button type="button" onClick={() => setActiveTab('inventory')} className="text-xs font-black uppercase text-slate-400 cursor-pointer">Cancel</button>
                  <button type="submit" disabled={submitting || !file} className="bg-slate-900 text-white px-10 py-4 rounded-xl font-black text-xs uppercase shadow-xl hover:bg-indigo-600 disabled:opacity-50 cursor-pointer">
                    {submitting ? 'Transmitting...' : isEditing ? 'Push Fix' : 'Send to QA'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        )}
      </main>
    </div>
  );
}

function StatBox({ label, val, color = "text-slate-900" }) {
  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
      <p className="text-[10px] font-black text-slate-400 mb-1">{label}</p>
      <p className={`text-3xl font-black ${color}`}>{val}</p>
    </div>
  );
}