import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import {
  FaCheckCircle, FaSearch, FaTimes,
  FaSpinner, FaLayerGroup, FaHome,
  FaClock, FaCheckDouble, FaExclamationTriangle, FaListUl,
  FaUserCircle, FaBell, FaTrashAlt,
  FaDownload, FaEdit
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
  const [issueHistory, setIssueHistory] = useState([]);
  const [isFetchingHistory, setIsFetchingHistory] = useState(false);
  const [editingIssueId, setEditingIssueId] = useState(null);

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
      
      // --- DESCENDING SORT LOGIC ---
      // We sort by ID descending (b.id - a.id) so newest items appear first.
      const myData = secRes.data
        .filter(s => s.tester_id === savedUser.id)
        .sort((a, b) => b.id - a.id);

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
      const history = Array.isArray(data) ? data : (data.issues || []);
      setIssueHistory(history);
    } catch (error) {
      console.error("History fetch failed:", error);
    } finally {
      setIsFetchingHistory(false);
    }
  };

  const openReview = async (section) => {
    const reviewableStatuses = ['In Testing', 'Issue Logged'];
    if (!reviewableStatuses.includes(section.current_status)) {
      setShowReviewPanel(false);
      setSelectedSection(null);
      return;
    }
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
      setIssueData({ severity: 'Major', desc: '', isCustomType: false });
    }
    setReportIssues(prev => prev.filter(issue => issue.id !== id));
  };

  const handleAction = async () => {
    if (!issueData.desc.trim()) return;

    const isDbIssue = issueHistory.find(h => h.id === editingIssueId);

    if (isDbIssue) {
      try {
        await api.put(`/issues/${editingIssueId}`, {
          severity: issueData.severity,
          description: issueData.desc
        });
        setEditingIssueId(null);
        setIssueData({ severity: 'Major', desc: '', isCustomType: false });
        fetchSectionHistory(selectedSection.id);
      } catch {
        alert("Failed to update record.");
      }
    } else {
      if (editingIssueId) {
        setReportIssues(reportIssues.map(issue =>
          issue.id === editingIssueId ? { ...issueData, id: editingIssueId } : issue
        ));
        setEditingIssueId(null);
      } else {
        setReportIssues([...reportIssues, { ...issueData, id: Date.now() }]);
      }
      setIssueData({ severity: 'Major', desc: '', isCustomType: false });
    }
  };

  const handleUpdateStatus = async (id, newStatus) => {
    try {
      if (newStatus === 'Issue Logged') {
        const promises = reportIssues.map(issue =>
          api.post(`/issues`, {
            section_id: id,
            severity: issue.severity,
            description: issue.desc
          })
        );
        await Promise.all(promises);
      } else {
        await api.put(`/sections/${id}`, {
          current_status: 'Pending Admin',
          notes: 'QA Approval'
        });
      }
      fetchInitialData();
      setShowReviewPanel(false);
      setSelectedSection(null);
      setReportIssues([]);
    } catch {
      alert("Status update failed.");
    }
  };

  const deleteIssueFromDb = async (issueId) => {
    if (!window.confirm("Delete this logged issue?")) return;
    try {
      await api.delete(`/issues/${issueId}`);
      fetchSectionHistory(selectedSection.id);
    } catch {
      alert("Delete failed.");
    }
  };

  const handleDownload = async (sectionId, title) => {
    try {
      const response = await api.get(`/sections/${sectionId}/download`, { responseType: 'blob' });
      const section = sections.find(s => s.id === sectionId);
      const originalFileName = section?.zip_url ? section.zip_url.split('/').pop() : `${title}.zip`;
      const blob = new Blob([response.data], { type: response.headers['content-type'] });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', originalFileName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error(error);
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
      <aside className="sticky top-0 flex h-screen w-72 flex-col bg-slate-900 z-20">
        <div className="flex items-center gap-2 p-8 text-2xl font-black italic text-white">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-500 text-sm not-italic">QA</div>
          TestingHub
        </div>
        <nav className="flex-1 space-y-2 px-4">
          <SidebarItem icon={<FaHome />} label="My Assets" active={activeFilter === 'all'} onClick={() => setActiveFilter('all')} />
          <SidebarItem icon={<FaClock className="text-blue-400" />} label="In Testing" count={stats.pending} active={activeFilter === 'pending'} onClick={() => setActiveFilter('pending')} />
          <SidebarItem icon={<FaExclamationTriangle className="text-rose-400" />} label="Issues Found" count={stats.logged} active={activeFilter === 'logged'} onClick={() => setActiveFilter('logged')} />
          <SidebarItem icon={<FaCheckCircle className="text-cyan-400" />} label="QA Passed" count={stats.qaPassed} active={activeFilter === 'qa_passed'} onClick={() => setActiveFilter('qa_passed')} />
          <SidebarItem icon={<FaCheckDouble className="text-emerald-400" />} label="Published" count={stats.published} active={activeFilter === 'passed'} onClick={() => setActiveFilter('passed')} />
        </nav>
        <div className="border-t border-slate-800 p-6">
          <div className="mb-4 flex items-center gap-3">
            <FaUserCircle className="text-slate-500" size={30} />
            <div className="overflow-hidden">
              <p className="truncate text-xs font-black text-white">{currentUser.name}</p>
              <p className="text-[10px] uppercase text-slate-500">{currentUser.role}</p>
            </div>
          </div>
          <button onClick={onLogout} className="w-full rounded-xl bg-rose-500/10 py-3 text-[10px] font-black uppercase text-rose-500 transition-all hover:bg-rose-500 hover:text-white cursor-pointer">Logout</button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto p-10">
        <header className="mb-10 flex items-center justify-between">
          <h2 className="text-4xl font-black italic">Tester Dashboard</h2>
          <div className="flex items-center gap-4">
            <div className="relative" ref={notifRef}>
              <button onClick={() => setShowNotifDropdown(!showNotifDropdown)} className="relative rounded-2xl border border-slate-200 bg-white p-4 text-slate-400 shadow-sm transition-all hover:text-purple-500 cursor-pointer">
                <FaBell size={20} />
                {notifications.length > 0 && <span className="absolute right-3 top-3 h-2.5 w-2.5 rounded-full border-2 border-white bg-rose-500"></span>}
              </button>
              {showNotifDropdown && (
                <div className="absolute right-0 z-50 mt-4 w-72 rounded-3xl border border-slate-100 bg-white p-6 shadow-2xl">
                  <h4 className="mb-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Notifications</h4>
                  <div className="space-y-3">
                    {notifications.length > 0 ? notifications.map(n => (
                      <div key={n.id} className="rounded-xl border border-slate-100 bg-slate-50 p-3 text-xs font-bold italic text-slate-600">{n.text}</div>
                    )) : <div className="py-4 text-center text-xs italic text-slate-400">No new updates</div>}
                  </div>
                </div>
              )}
            </div>
            <div className="relative">
              <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input type="text" placeholder="Search my assets..." className="w-80 rounded-2xl border border-slate-200 bg-white py-4 pl-12 pr-6 shadow-sm outline-none ring-purple-500/20 focus:ring-2" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            </div>
          </div>
        </header>

        <div className="mb-10 grid grid-cols-5 gap-4">
          <StatusCard label="Total" count={stats.total} icon={<FaListUl />} color="bg-slate-100 text-slate-600" />
          <StatusCard label="Pending" count={stats.pending} icon={<FaClock />} color="bg-blue-50 text-blue-600" />
          <StatusCard label="Issues Found" count={stats.logged} icon={<FaExclamationTriangle />} color="bg-rose-50 text-rose-600" />
          <StatusCard label="QA Passed" count={stats.qaPassed} icon={<FaCheckCircle />} color="bg-cyan-50 text-cyan-600" />
          <StatusCard label="Published" count={stats.published} icon={<FaCheckDouble />} color="bg-emerald-50 text-emerald-600" />
        </div>

        {loading ? (
          <div className="py-40 text-center"><FaSpinner className="mx-auto animate-spin text-5xl text-purple-600" /></div>
        ) : (
          <div className={`grid gap-8 ${showReviewPanel ? 'grid-cols-1 xl:grid-cols-12' : 'grid-cols-1'}`}>
            <div className={`${showReviewPanel ? 'xl:col-span-7' : 'col-span-1'} h-fit overflow-hidden rounded-[2.5rem] border border-slate-200 bg-white shadow-sm`}>
              <table className="w-full text-left">
                <thead className="border-b border-slate-100 bg-slate-50/50">
                  <tr>
                    <th className="px-8 py-5 text-[11px] font-black uppercase tracking-widest text-slate-400">Asset</th>
                    <th className="px-6 py-5 text-[11px] font-black uppercase tracking-widest text-slate-400">Status</th>
                    <th className="px-6 py-5 text-[11px] font-black uppercase tracking-widest text-slate-400">Preview</th>
                    <th className="px-6 py-5 text-[11px] font-black uppercase tracking-widest text-slate-400">Admin</th>
                    <th className="px-8 py-5 text-right text-[11px] font-black uppercase tracking-widest text-slate-400">Pkg</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredSections.map(item => {
                    const isReviewable = ['In Testing', 'Issue Logged'].includes(item.current_status);
                    return (
                      <tr key={item.id}
                        onClick={() => openReview(item)}
                        className={`group transition-all ${isReviewable ? 'cursor-pointer hover:bg-slate-50' : 'cursor-default'} ${selectedSection?.id === item.id ? 'bg-purple-50' : ''}`}>
                        <td className="px-8 py-6">
                          <div className="flex items-center gap-4">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-400 transition-colors group-hover:text-purple-600"><FaLayerGroup /></div>
                            <div>
                              <p className="font-black leading-none text-slate-800">{item.title}</p>
                              <p className="mt-1 text-[9px] font-bold uppercase text-slate-400">ID: {item.id}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-6">
                          <span className={`inline-block whitespace-nowrap rounded-full border px-4 py-1.5 text-[10px] font-black uppercase
                            ${item.current_status === 'Published' ? 'border-emerald-100 bg-emerald-50 text-emerald-600' :
                              item.current_status === 'Issue Logged' ? 'border-rose-100 bg-rose-50 text-rose-600' :
                                'border-blue-100 bg-blue-50 text-blue-600'}`}>
                            {item.current_status}
                          </span>
                        </td>
                        <td className="px-6 py-6">
                          {item.live_link ? (
                            <a href={item.live_link} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="group/link flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-purple-600">
                              <span className="max-w-25 truncate">{item.live_link}</span>
                            </a>
                          ) : <span className="text-[10px] font-bold italic text-slate-300">N/A</span>}
                        </td>
                        <td className="px-6 py-6">
                          {item.shopify_admin_link ? (
                            <a href={item.shopify_admin_link} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="group/link flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-purple-600">
                              <span className="max-w-25 truncate">{item.shopify_admin_link}</span>
                            </a>
                          ) : <span className="text-[10px] font-bold italic text-slate-300">N/A</span>}
                        </td>
                        <td className="px-8 py-6 text-right">
                          <button onClick={(e) => { e.stopPropagation(); handleDownload(item.id, item.title); }} className="rounded-xl p-3 text-blue-600 transition-colors hover:bg-blue-50 cursor-pointer"><FaDownload /></button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {showReviewPanel && selectedSection && (
              <div className="sticky top-10 h-fit rounded-[2.5rem] border border-slate-200 bg-white p-10 shadow-2xl animate-in fade-in slide-in-from-right-4 duration-300 xl:col-span-5">
                <div className="mb-8 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-purple-500">
                      {editingIssueId ? 'Editing Entry' : 'Review Panel'}
                    </span>
                    <h3 className="text-3xl font-black italic">{selectedSection.title}</h3>
                  </div>
                  <button onClick={() => setShowReviewPanel(false)} className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 transition-all hover:bg-slate-900 hover:text-white cursor-pointer"><FaTimes /></button>
                </div>

                {(editingIssueId || selectedSection.current_status === 'In Testing') && (
                  <div className={`mb-6 rounded-3xl border p-6 ${editingIssueId ? 'border-purple-200 bg-purple-50' : 'border-slate-100 bg-slate-50'}`}>
                    <div className="mb-4 grid grid-cols-3 gap-2">
                      {['Minor', 'Major', 'Critical'].map(sev => (
                        <button key={sev} onClick={() => setIssueData({ ...issueData, severity: sev })} className={`rounded-xl border py-2 text-[10px] font-black uppercase transition-all ${issueData.severity === sev ? 'border-rose-600 bg-rose-600 text-white' : 'border-slate-100 bg-white text-slate-400 cursor-pointer'}`}>{sev}</button>
                      ))}
                    </div>
                    <textarea
                      className="mb-4 h-24 w-full rounded-2xl border border-slate-200 p-4 text-sm font-bold outline-none ring-purple-500/20 focus:ring-2"
                      placeholder="Describe the issue..."
                      value={issueData.desc}
                      onChange={(e) => setIssueData({ ...issueData, desc: e.target.value })}
                    />
                    <div className="flex gap-2">
                      {editingIssueId && <button onClick={() => { setEditingIssueId(null); setIssueData({ severity: 'Major', desc: '', isCustomType: false }) }} className="flex-1 rounded-xl bg-slate-200 py-3 text-[10px] font-black uppercase text-slate-600 cursor-pointer">Cancel</button>}
                      <button onClick={handleAction} className="flex-2 rounded-xl bg-slate-900 py-3 text-[10px] font-black uppercase text-white cursor-pointer">
                        {editingIssueId ? 'Update Record' : 'Add to Batch'}
                      </button>
                    </div>
                  </div>
                )}

                <div className="space-y-6">
                  {reportIssues.length > 0 && (
                    <div className="space-y-3">
                      <p className="text-[10px] font-black uppercase tracking-widest text-purple-600">New Batch to Submit</p>
                      {reportIssues.map(issue => (
                        <div key={issue.id} className="flex items-center justify-between rounded-2xl border border-purple-100 bg-purple-50 p-4">
                          <span className="truncate pr-4 text-xs font-bold text-purple-900">{issue.desc}</span>
                          <div className="shrink-0 flex gap-2">
                            <button onClick={() => startEditIssue(issue)} className="p-1 text-blue-500 cursor-pointer"><FaEdit /></button>
                            <button onClick={() => removeIssueFromReport(issue.id)} className="p-1 text-rose-500 cursor-pointer"><FaTrashAlt /></button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="space-y-4">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Already Logged Issues</p>
                    <div className="custom-scrollbar max-h-60 space-y-3 overflow-y-auto pr-2">
                      {isFetchingHistory ? <FaSpinner className="mx-auto animate-spin text-rose-500" /> :
                        issueHistory.length > 0 ? issueHistory.map((issue) => (
                          <div key={issue.id} className="flex items-start justify-between rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                            <div className="flex-1 pr-4">
                              <span className="mb-2 inline-block rounded bg-rose-100 px-2 py-0.5 text-[8px] font-black uppercase text-rose-600">{issue.severity}</span>
                              <p className="text-xs font-bold leading-relaxed text-slate-700">{issue.description || issue.desc}</p>
                            </div>
                            <div className="flex flex-col gap-1">
                              <button onClick={() => startEditIssue(issue)} className="rounded-lg p-2 text-blue-500 transition-all hover:bg-blue-50 cursor-pointer"><FaEdit size={14} /></button>
                              <button onClick={() => deleteIssueFromDb(issue.id)} className="rounded-lg p-2 text-rose-500 transition-all hover:bg-rose-50 cursor-pointer"><FaTrashAlt size={14} /></button>
                            </div>
                          </div>
                        )) : <p className="py-10 text-center text-xs italic text-slate-400">No history found</p>
                      }
                    </div>
                  </div>

                  {selectedSection.current_status === 'In Testing' && (
                    <div className="space-y-3 border-t border-slate-100 pt-6">
                      {reportIssues.length > 0 ? (
                        <button onClick={() => handleUpdateStatus(selectedSection.id, 'Issue Logged')} className="w-full rounded-3xl bg-rose-600 py-5 text-[11px] font-black uppercase italic tracking-widest text-white shadow-lg shadow-rose-200 transition-all hover:bg-rose-700  cursor-pointer">
                          Submit Batch ({reportIssues.length})
                        </button>
                      ) : (
                        <button onClick={() => handleUpdateStatus(selectedSection.id, 'QA Passed')} className="w-full rounded-3xl bg-emerald-500 py-5 text-[11px] font-black uppercase italic tracking-widest text-white shadow-lg shadow-emerald-200 transition-all hover:bg-emerald-600  cursor-pointer">
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
      </main>
    </div>
  );
}

function StatusCard({ label, count, icon, color }) {
  return (
    <div className="flex items-center justify-between rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div>
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</p>
        <p className="text-3xl font-black text-slate-900">{count}</p>
      </div>
      <div className={`flex h-12 w-12 items-center justify-center rounded-2xl text-xl ${color}`}>{icon}</div>
    </div>
  );
}

function SidebarItem({ icon, label, active, onClick, count }) {
  return (
    <button onClick={onClick} className={`flex w-full items-center justify-between rounded-2xl px-5 py-4 transition-all ${active ? 'bg-slate-800 text-white' : 'text-slate-500 hover:bg-slate-800/50 cursor-pointer'}`}>
      <div className="flex items-center gap-3 text-sm font-bold uppercase tracking-tight">{icon} {label}</div>
      {count !== undefined && <span className="rounded-lg border border-slate-700 bg-slate-900 px-2 py-1 text-[10px] font-black">{count}</span>}
    </button>
  );
}