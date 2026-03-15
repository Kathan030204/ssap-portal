import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import {
  FaCheckCircle, FaSearch, FaTimes,
  FaSpinner, FaLayerGroup, FaHome,
  FaClock, FaCheckDouble, FaExclamationTriangle, FaListUl,
  FaUserCircle, FaBell, FaTrashAlt, FaPlus,
  FaDownload, FaHistory, FaEdit
} from 'react-icons/fa';

const api = axios.create({
  baseURL: '/api',
});

export function Tester({ onLogout }) {
  // --- UI & DATA STATES ---
  const [activeFilter, setActiveFilter] = useState('all');
  const [showReviewPanel, setShowReviewPanel] = useState(false);
  const [selectedSection, setSelectedSection] = useState(null);
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  // --- ISSUE REPORT & HISTORY STATES ---
  const [issueData, setIssueData] = useState({ severity: 'Major', desc: '', isCustomType: false });
  const [reportIssues, setReportIssues] = useState([]);
  const [customTypeText, setCustomTypeText] = useState("");
  const [issueHistory, setIssueHistory] = useState([]);
  const [isFetchingHistory, setIsFetchingHistory] = useState(false);
  const [editingIssueId, setEditingIssueId] = useState(null);

  const [issueTypes, setIssueTypes] = useState(() => {
    const saved = localStorage.getItem('tester_custom_issue_types');
    return saved ? JSON.parse(saved) :null;
  });

  // --- IDENTITY & NOTIFICATIONS ---
  const [currentUser, setCurrentUser] = useState({ id: null, name: '', role: '' });
  const [notifications, setNotifications] = useState([]);
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);
  const notifRef = useRef(null);

  useEffect(() => {
    setShowReviewPanel(false);
    setSelectedSection(null);
    setEditingIssueId(null);
    setReportIssues([]);
  }, [activeFilter]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) setShowNotifDropdown(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchInitialData = useCallback(async () => {
    try {
      const storedUser = sessionStorage.getItem('user') || localStorage.getItem('user');
      if (!storedUser) { onLogout(); return; }
      const savedUser = JSON.parse(storedUser);
      setCurrentUser({ id: savedUser.id, name: savedUser.username || savedUser.name, role: savedUser.role });

      const secRes = await api.get('/sections');
      const myData = secRes.data.filter(s => s.tester_id === savedUser.id);
      const pending = myData.filter(s => s.current_status === 'In Testing');
      setNotifications(pending.map(p => ({ id: p.id, text: `Review needed: ${p.title}` })));
      setSections(myData);
    } catch (error) {
      console.error("Fetch Error:", error);
    } finally {
      setLoading(false);
    }
  }, [onLogout]);

  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  const fetchSectionHistory = async (sectionId) => {
    setIsFetchingHistory(true);
    try {
      const response = await api.get(`/sections/${sectionId}`);
      const data = response.data;
      const history = Array.isArray(data) ? data : (data.issues || [data]);
      setIssueHistory(history);
    } catch (err) {
      console.error("History fetch failed:", err);
    } finally {
      setIsFetchingHistory(false);
    }
  };

  const openReview = async (section) => {
    const finalizedStatuses = ['Published', 'Ready for Store', 'QA Passed', 'Pending Admin'];
    if (finalizedStatuses.includes(section.current_status)) return;

    setSelectedSection(section);
    setShowReviewPanel(true);
    setReportIssues([]);
    setEditingIssueId(null);
    setIssueData({ severity: 'Major', desc: '', isCustomType: false });
    fetchSectionHistory(section.id);
  };

  const startEditIssue = (issue) => {
    setEditingIssueId(issue.id);
    const description = issue.description || issue.desc || "";

    setIssueData({
      severity: issue.severity || 'Major',
      desc: description,
    });
  };

  const removeIssueFromReport = (id) => {
    if (editingIssueId === id) {
      setEditingIssueId(null);
      setIssueData({ severity: 'Major', desc: '', isCustomType: false});
    }
    setReportIssues(prev => prev.filter(issue => issue.id !== id));
  };

  const handleAction = async () => {
    if (!issueData.desc.trim()) return;

    let finalType = issueData.type;
    if (issueData.isCustomType) {
      finalType = customTypeText.trim() || 'Custom';
      if (!issueTypes.includes(finalType)) {
        const updatedTypes = [...issueTypes, finalType];
        setIssueTypes(updatedTypes);
        localStorage.setItem('tester_custom_issue_types', JSON.stringify(updatedTypes));
      }
    }

    const isDbIssue = issueHistory.find(h => h.id === editingIssueId);

    if (isDbIssue) {
      try {
        await api.put(`/sections/${selectedSection.id}`, {
          issue_id: editingIssueId,
          current_status: 'Issue Logged',
          type: finalType,
          severity: issueData.severity,
          description: issueData.desc,
          title: selectedSection.title
        });
        setEditingIssueId(null);
        setIssueData({ severity: 'Major', desc: '', isCustomType: false });
        fetchSectionHistory(selectedSection.id);
      } catch (err) {
        console.error("Update failed:", err);
        alert("Failed to update database record.");
      }
    } else {
      if (editingIssueId) {
        setReportIssues(reportIssues.map(issue =>
          issue.id === editingIssueId ? { ...issueData, type: finalType, id: editingIssueId } : issue
        ));
        setEditingIssueId(null);
      } else {
        setReportIssues([...reportIssues, { ...issueData, type: finalType, id: Date.now() }]);
      }
      setIssueData({ severity: 'Major', desc: '', isCustomType: false });
      setCustomTypeText("");
    }
  };

  const handleUpdateStatus = async (id, newStatus) => {
    try {
      if (newStatus === 'Issue Logged') {
        const promises = reportIssues.map(issue =>
          api.put(`/sections/${id}`, {
            current_status: 'Issue Logged',
            type: issue.type,
            severity: issue.severity,
            description: issue.desc,
            title: selectedSection.title
          })
        );
        await Promise.all(promises);
      } else {
        await api.put(`/sections/${id}`, {
          current_status: 'Pending Admin',
          description: 'Tester approved.',
          notes: 'QA Approval'
        });
      }
      fetchInitialData();
      setShowReviewPanel(false);
      setSelectedSection(null);
    } catch (err) {
      console.error("Status update failed:", err);
      alert("Database Sync Failed");
    }
  };

  const handleDownload = async (sectionId, title) => {
    try {
      const response = await api.get(`/sections/${sectionId}/download`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${title.replace(/[^a-z0-9]/gi, '_')}.zip`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error("Download failed:", err);
      alert("Download failed.");
    }
  };

  const stats = {
    total: sections.length,
    pending: sections.filter(s => s.current_status === 'In Testing').length,
    logged: sections.filter(s => s.current_status === 'Issue Logged').length,
    qaPassed: sections.filter(s => s.current_status === 'QA Passed' || s.current_status === 'Pending Admin').length,
    published: sections.filter(s => s.current_status === 'Published').length,
  };

  const filteredSections = sections.filter(s => {
    const matchesSearch = s.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesTab = activeFilter === 'all' ? true :
      activeFilter === 'pending' ? s.current_status === 'In Testing' :
        activeFilter === 'logged' ? s.current_status === 'Issue Logged' :
          activeFilter === 'qa_passed' ? (s.current_status === 'QA Passed' || s.current_status === 'Pending Admin') :
            activeFilter === 'passed' ? s.current_status === 'Published' : true;
    return matchesSearch && matchesTab;
  });

  return (
    <div className="flex min-h-screen bg-[#f8fafc] text-slate-900 font-sans">
      {/* SIDEBAR */}
      <div className="w-72 bg-slate-900 flex flex-col sticky top-0 h-screen">
        <div className="p-8 text-white font-black italic text-2xl flex items-center gap-2">
          <div className="w-8 h-8 bg-purple-500 rounded-lg not-italic flex items-center justify-center text-sm">QA</div>
          TestingHub
        </div>
        <nav className="flex-1 px-4 space-y-2">
          <SidebarItem icon={<FaHome />} label="My Assets" active={activeFilter === 'all'} onClick={() => setActiveFilter('all')} />
          <SidebarItem icon={<FaClock className="text-blue-400" />} label="In Testing" count={stats.pending} active={activeFilter === 'pending'} onClick={() => setActiveFilter('pending')} />
          <SidebarItem icon={<FaExclamationTriangle className="text-rose-400" />} label="Issues Found" count={stats.logged} active={activeFilter === 'logged'} onClick={() => setActiveFilter('logged')} />
          <SidebarItem icon={<FaCheckCircle className="text-cyan-400" />} label="QA Passed" count={stats.qaPassed} active={activeFilter === 'qa_passed'} onClick={() => setActiveFilter('qa_passed')} />
          <SidebarItem icon={<FaCheckDouble className="text-emerald-400" />} label="Published Section" count={stats.published} active={activeFilter === 'passed'} onClick={() => setActiveFilter('passed')} />
        </nav>
        <div className="p-6 border-t border-slate-800">
          <div className="flex items-center gap-3 mb-4">
            <FaUserCircle className="text-slate-500" size={30} />
            <div className="overflow-hidden">
              <p className="text-white text-xs font-black truncate">{currentUser.name}</p>
              <p className="text-[10px] text-slate-500 uppercase">{currentUser.role}</p>
            </div>
          </div>
          <button onClick={onLogout} className="w-full py-3 bg-rose-500/10 text-rose-500 rounded-xl text-[10px] font-black uppercase hover:bg-rose-500 hover:text-white transition-all">Logout</button>
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div className="flex-1 p-10 overflow-y-auto">
        <header className="flex justify-between items-center mb-10">
          <h2 className="text-4xl font-black italic">Tester Dashboard</h2>
          <div className="flex items-center gap-4">
            {/* NOTIFICATIONS */}
            <div className="relative" ref={notifRef}>
              <button onClick={() => setShowNotifDropdown(!showNotifDropdown)} className="p-4 bg-white border border-slate-200 rounded-2xl relative text-slate-400 hover:text-purple-500 transition-all shadow-sm">
                <FaBell size={20} />
                {notifications.length > 0 && <span className="absolute top-3 right-3 w-2.5 h-2.5 bg-rose-500 rounded-full border-2 border-white"></span>}
              </button>
              {showNotifDropdown && (
                <div className="absolute right-0 mt-4 w-72 bg-white border border-slate-100 rounded-3xl shadow-2xl z-50 p-6">
                  <h4 className="text-[10px] font-black uppercase text-slate-400 mb-4 tracking-widest">Notifications</h4>
                  <div className="space-y-3">
                    {notifications.length > 0 ? notifications.map(n => (
                      <div key={n.id} className="p-3 bg-slate-50 rounded-xl text-xs font-bold text-slate-600 border border-slate-100 italic">
                        {n.text}
                      </div>
                    )) : <div className="text-xs text-slate-400 italic py-4 text-center">No new updates</div>}
                  </div>
                </div>
              )}
            </div>

            <div className="relative">
              <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input type="text" placeholder="Search my assets..." className="pl-12 pr-6 py-4 bg-white border border-slate-200 rounded-2xl w-80 shadow-sm outline-none focus:ring-2 ring-purple-500/20" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            </div>
          </div>
        </header>

        <div className="grid grid-cols-5 gap-4 mb-10">
          <StatusCard label="Total" count={stats.total} icon={<FaListUl />} color="bg-slate-100 text-slate-600" />
          <StatusCard label="Pending" count={stats.pending} icon={<FaClock />} color="bg-blue-50 text-blue-600" />
          <StatusCard label="Issue Logged" count={stats.logged} icon={<FaExclamationTriangle />} color="bg-rose-50 text-rose-600" />
          <StatusCard label="QA Passed" count={stats.qaPassed} icon={<FaCheckCircle />} color="bg-cyan-50 text-cyan-600" />
          <StatusCard label="Published" count={stats.published} icon={<FaCheckDouble />} color="bg-emerald-50 text-emerald-600" />
        </div>

        {loading ? (
          <div className="py-40 text-center"><FaSpinner className="animate-spin text-purple-600 text-5xl mx-auto" /></div>
        ) : (
          <div className={`grid gap-8 ${showReviewPanel ? 'grid-cols-1 xl:grid-cols-2' : 'grid-cols-1'}`}>
            <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden h-fit">
              <table className="w-full text-left">
                <thead className="bg-slate-50/50 border-b border-slate-100">
                  <tr>
                    <th className="px-8 py-5 text-base font-black uppercase tracking-widest text-slate-600">Asset Name</th>
                    <th className="px-6 py-5 text-base font-black uppercase tracking-widest text-slate-600">Status</th>
                    <th className="px-8 py-5 text-base font-black uppercase tracking-widest text-slate-600 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredSections.map(item => (
                    <tr key={item.id} onClick={() => openReview(item)} className={`group transition-all cursor-pointer hover:bg-slate-50 ${selectedSection?.id === item.id ? 'bg-purple-50' : ''}`}>
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-4">
                          <div className="h-10 w-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 group-hover:text-purple-600 transition-colors"><FaLayerGroup /></div>
                          <p className="font-black text-slate-800">{item.title}</p>
                        </div>
                      </td>
                      <td className="py-6">
                        <span className={`px-4 py-1.5 rounded-full text-[10px] font-black border uppercase 
                          ${item.current_status === 'Published' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                            item.current_status === 'Issue Logged' ? 'bg-rose-50 text-rose-600 border-rose-100' :
                              'bg-blue-50 text-blue-600 border-blue-100'}`}>
                          {item.current_status}
                        </span>
                      </td>
                      <td className="px-8 py-6 text-right">
                        <button onClick={(e) => { e.stopPropagation(); handleDownload(item.id, item.title); }} className="p-3 text-blue-600 hover:bg-blue-50 rounded-xl transition-colors"><FaDownload /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {showReviewPanel && selectedSection && (
              <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-2xl p-10 h-fit sticky top-10 animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="flex justify-between items-center mb-8">
                  <div>
                    <span className="text-[10px] font-black uppercase text-purple-500 tracking-widest">
                      {editingIssueId ? 'Editing Entry' : 'Review Panel'}
                    </span>
                    <h3 className="text-3xl font-black italic">{selectedSection.title}</h3>
                  </div>
                  <button onClick={() => setShowReviewPanel(false)} className="w-10 h-10 flex items-center justify-center bg-slate-100 rounded-full hover:bg-slate-900 hover:text-white transition-all"><FaTimes /></button>
                </div>

                {/* EDIT FORM */}
                {(editingIssueId || selectedSection.current_status === 'In Testing') && (
                  <div className={`p-6 mb-6 rounded-3xl border ${editingIssueId ? 'bg-purple-50 border-purple-200' : 'bg-slate-50 border-slate-100'}`}>
                    <div className="grid grid-cols-3 gap-2 mb-4">
                      {['Minor', 'Major', 'Critical'].map(sev => (
                        <button key={sev} onClick={() => setIssueData({ ...issueData, severity: sev })} className={`py-2 rounded-xl text-[10px] font-black uppercase border transition-all ${issueData.severity === sev ? 'bg-rose-600 border-rose-600 text-white' : 'bg-white border-slate-100 text-slate-400'}`}>{sev}</button>
                      ))}
                    </div>
                    <textarea
                      className="w-full p-4 border border-slate-200 rounded-2xl text-sm font-bold h-24 mb-4 outline-none focus:ring-2 ring-purple-500/20"
                      placeholder="Describe the issue..."
                      value={issueData.desc}
                      onChange={(e) => setIssueData({ ...issueData, desc: e.target.value })}
                    />
                    <div className="flex gap-2">
                      {editingIssueId && <button onClick={() => { setEditingIssueId(null); setIssueData({ severity: 'Major', desc: '', isCustomType: false }) }} className="flex-1 py-3 bg-slate-200 text-slate-600 rounded-xl text-[10px] font-black uppercase">Cancel</button>}
                      <button onClick={handleAction} className="flex-2 py-3 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase">
                        {editingIssueId ? 'Update Record' : 'Add to Batch'}
                      </button>
                    </div>
                  </div>
                )}

                <div className="space-y-6">
                  {/* LOCAL BATCH (BEFORE DB SUBMISSION) */}
                  {reportIssues.length > 0 && (
                    <div className="space-y-3">
                      <p className="text-[10px] font-black uppercase text-purple-600 tracking-widest">New Batch to Submit</p>
                      {reportIssues.map(issue => (
                        <div key={issue.id} className="p-4 bg-purple-50 border border-purple-100 rounded-2xl flex justify-between items-center">
                          <span className="text-xs font-bold text-purple-900">{issue.desc.substring(0, 30)}...</span>
                          <div className="flex gap-2">
                            <button onClick={() => startEditIssue(issue)} className="text-blue-500 p-1"><FaEdit /></button>
                            <button onClick={() => removeIssueFromReport(issue.id)} className="text-rose-500 p-1"><FaTrashAlt /></button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* HISTORY LIST */}
                  <div className="space-y-4">
                    <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Already Logged Issues</p>
                    <div className="max-h-60 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
                      {isFetchingHistory ? <FaSpinner className="animate-spin mx-auto text-rose-500" /> :
                        issueHistory.length > 0 ? issueHistory.map((issue) => (
                          <div key={issue.id} className="p-4 bg-white border border-slate-100 rounded-2xl shadow-sm flex justify-between items-start">
                            <div>
                              <div className="flex gap-2 mb-1">
                                <span className="text-[8px] bg-rose-100 text-rose-600 px-2 py-0.5 rounded font-black uppercase">{issue.severity}</span>
                                <span className="text-[8px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-black uppercase">{issue.type}</span>
                              </div>
                              <p className="text-xs font-bold text-slate-700">{issue.description || issue.desc}</p>
                            </div>
                            <button onClick={() => startEditIssue(issue)} className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition-all"><FaEdit size={14} /></button>
                          </div>
                        )) : <p className="text-center text-xs text-slate-400 italic">No history found</p>
                      }
                    </div>
                  </div>

                  {/* SUBMISSION BUTTONS */}
                  {selectedSection.current_status === 'In Testing' && (
                    <div className="pt-6 border-t border-slate-100 space-y-3">
                      {reportIssues.length > 0 ? (
                        <button onClick={() => handleUpdateStatus(selectedSection.id, 'Issue Logged')} className="w-full py-5 bg-rose-600 text-white rounded-3xl font-black uppercase italic tracking-widest shadow-lg shadow-rose-200 hover:bg-rose-700 transition-all">
                          Submit Batch ({reportIssues.length})
                        </button>
                      ) : (
                        <button onClick={() => handleUpdateStatus(selectedSection.id, 'QA Passed')} className="w-full py-5 bg-emerald-500 text-white rounded-3xl font-black uppercase italic tracking-widest shadow-lg shadow-emerald-200 hover:bg-emerald-600 transition-all">
                          Approve Section
                        </button>
                      )}
                    </div>
                  )}
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
    <button onClick={onClick} className={`w-full flex items-center justify-between px-5 py-4 rounded-2xl transition-all ${active ? 'bg-slate-800 text-white' : 'text-slate-500 hover:bg-slate-800/50'}`}>
      <div className="flex items-center gap-3 font-bold text-sm uppercase tracking-tight">{icon} {label}</div>
      {count !== undefined && <span className="text-[10px] font-black bg-slate-900 px-2 py-1 rounded-lg border border-slate-700">{count}</span>}
    </button>
  );
}