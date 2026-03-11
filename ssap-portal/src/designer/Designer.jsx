import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import {
  FaPalette, FaImage, FaDesktop, FaMobileAlt,
  FaAd, FaSpinner, FaCloudUploadAlt, FaDownload,
  FaListUl, FaCheckCircle, FaLayerGroup, FaChartBar, FaStore, FaRocket, FaCheck,
  FaUserCircle, FaSignOutAlt, FaBell
} from 'react-icons/fa';

const api = axios.create({ baseURL: 'http://localhost:8000/api' });

export function Designer({ onLogout }) {
  const [loading, setLoading] = useState(false);
  const [sections, setSections] = useState([]);
  const [selectedSectionId, setSelectedSectionId] = useState(null);
  const [viewFilter, setViewFilter] = useState('all');

  // --- AUTH STATE ---
  const [currentUser, setCurrentUser] = useState({ id: null, name: 'Designer', role: 'Designer' });

  // --- NOTIFICATION STATE ---
  const [notifications, setNotifications] = useState([]);
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);
  const notifRef = useRef(null);

  const [pendingAssets, setPendingAssets] = useState({
    desktop: null,
    mobile: null,
    banner: null
  });

  // Handle clicking outside the notification bell
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) setShowNotifDropdown(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchDesignTasks = async () => {
    try {
      const response = await api.get('/sections');
      const allSections = response.data;
      setSections(allSections);

      // Filter sections that are 'QA Passed' for notifications
      const readyForDesign = allSections.filter(s => s.current_status === 'QA Passed');
      const alerts = readyForDesign.map(s => ({
        id: s.id,
        title: s.title,
        msg: "QA PASSED",
        time: "Action Required"
      }));
      setNotifications(alerts);
    } catch (error) {
      console.error("Fetch error:", error);
    }
  };

  useEffect(() => {
    // 1. Initialize User Data from Storage
    const storedUser = sessionStorage.getItem('user') || localStorage.getItem('user');
    if (storedUser) {
      const savedUser = JSON.parse(storedUser);
      setCurrentUser({
        id: savedUser.id || 'N/A',
        name: savedUser.username || savedUser.name || savedUser.display_name || "Designer",
        role: savedUser.role || "Designer"
      });
    }

    // 2. Initial Data Fetch
    fetchDesignTasks();

    // 3. Auto-refresh
    const interval = setInterval(fetchDesignTasks, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    setPendingAssets({ desktop: null, mobile: null, banner: null });
  }, [selectedSectionId]);

  const handleNotifClick = (sectionId) => {
    setViewFilter('passed');
    setSelectedSectionId(sectionId);
    setShowNotifDropdown(false);
  };

  const getStatusClasses = (status) => {
    switch (status) {
      case 'In Testing': return 'text-blue-600 bg-blue-100';
      case 'Issue Logged': return 'text-rose-600 bg-rose-100';
      case 'QA Passed': return 'text-indigo-600 bg-indigo-100 border border-indigo-200';
      default: return 'text-emerald-600 bg-emerald-100';
    }
  };

  const displaySections = sections.filter(s => {
    if (viewFilter === 'all') return true;
    if (viewFilter === 'passed') return s.current_status === 'QA Passed';
    if (viewFilter === 'ready') return s.current_status === 'Ready for Store';
    if (viewFilter === 'published') return s.current_status === 'Published';
    return true;
  });

  const showPipeline = viewFilter === 'all' || viewFilter === 'passed';

  const stats = {
    total: sections.length,
    passed: sections.filter(s => s.current_status === 'QA Passed').length,
    completed: sections.filter(s => ['Published', 'Ready for Store'].includes(s.current_status)).length
  };

  const selectedSection = sections.find(s => s.id === selectedSectionId);

  const handleFileSelect = (e, assetType) => {
    const file = e.target.files[0];
    if (file) setPendingAssets(prev => ({ ...prev, [assetType]: file }));
  };

  const handleFinalSubmit = async () => {
    if (!pendingAssets.desktop && !pendingAssets.mobile && !pendingAssets.banner) {
      alert("Please select at least one asset to upload.");
      return;
    }
    setLoading(true);
    try {
      const uploadPromises = Object.entries(pendingAssets).map(([type, file]) => {
        if (!file) return null;
        const formData = new FormData();
        formData.append('image_url', file);
        formData.append('section_id', selectedSectionId);
        formData.append('image_type', type);
        return api.post('/design', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      }).filter(p => p !== null);

      await Promise.all(uploadPromises);
      await api.put(`/sections/${selectedSectionId}`, { current_status: 'Ready for Store' });

      alert("Package Submitted Successfully!");
      setSelectedSectionId(null);
      fetchDesignTasks();
    } catch {
      alert("Error uploading assets. Please check server connection.");
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (sectionId, title) => {
    try {
      const response = await api.get(`/sections/${sectionId}/download`, {
        responseType: 'blob',
      });
      const section = sections.find(s => s.id === sectionId);
      const originalFileName = section?.zip_url ? section.zip_url.split('/').pop() : 'file.zip';
      const extension = originalFileName.split('.').pop();

      const blob = new Blob([response.data], { type: response.headers['content-type'] });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const cleanTitle = title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
      link.setAttribute('download', `${cleanTitle}.${extension}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch {
      alert("Download failed.");
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans text-slate-900">
      {/* SIDEBAR */}
      <aside className="w-64 bg-slate-900 text-white flex flex-col shrink-0 fixed h-full z-20">
        <div className="p-8 text-xl font-black italic flex items-center gap-3 border-b border-slate-800">
          <FaPalette className="text-indigo-400" /> Designer Hub
        </div>

        <nav className="flex-1 px-4 py-6 space-y-1">
          <p className="text-[10px] font-black text-slate-500 uppercase px-4 mb-2 tracking-widest">Workflow</p>
          <button onClick={() => { setViewFilter('all'); setSelectedSectionId(null); }}
            className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl font-bold transition-all ${viewFilter === 'all' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-800'}`}>
            <FaListUl /> All Sections
          </button>
          <button onClick={() => { setViewFilter('passed'); setSelectedSectionId(null); }}
            className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl font-bold transition-all ${viewFilter === 'passed' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-800'}`}>
            <FaCheckCircle /> QA Passed
          </button>
          <div className="pt-4 mt-4 border-t border-slate-800">
            <p className="text-[10px] font-black text-slate-500 uppercase px-4 mb-2 tracking-widest">Archive</p>
            <button onClick={() => { setViewFilter('ready'); setSelectedSectionId(null); }}
              className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl font-bold transition-all ${viewFilter === 'ready' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-800'}`}>
              <FaStore /> Ready for Store
            </button>
            <button onClick={() => { setViewFilter('published'); setSelectedSectionId(null); }}
              className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl font-bold transition-all ${viewFilter === 'published' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-800'}`}>
              <FaRocket /> Published
            </button>
          </div>
        </nav>

        {/* LOGGED IN USER SECTION */}
        <div className="p-4 border-t border-slate-800">
          <div className="flex items-center gap-3 px-4 py-3 mb-2">
            <div className="w-10 h-10 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400 border border-indigo-500/30 font-black">
              <FaUserCircle size={20} />
            </div>
            <div className="overflow-hidden">
              <p className="text-white font-black text-sm leading-none truncate w-32 uppercase tracking-tight">{currentUser.name}</p>
              <p className="text-slate-500 text-[9px] uppercase font-bold tracking-widest mt-1">Role: {currentUser.role}</p>
            </div>
          </div>
          <button onClick={() => { sessionStorage.clear(); localStorage.clear(); onLogout(); }} className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-slate-400 hover:text-rose-400 hover:bg-rose-400/10 transition-all font-black text-xs uppercase tracking-widest">
            <FaSignOutAlt /> Terminate Session
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 ml-64 p-10">
        <div className="max-w-7xl mx-auto">
          <header className="flex justify-between items-start mb-10">
            <div>
              <h2 className="text-4xl font-black text-slate-900 tracking-tight italic">Studio Pipeline</h2>
              <p className="text-slate-500 font-medium mt-1">Active User: <span className="text-indigo-600 font-bold">{currentUser.name}</span></p>
            </div>

            <div className="relative" ref={notifRef}>
              <button onClick={() => setShowNotifDropdown(!showNotifDropdown)}
                className={`p-4 rounded-2xl bg-white border border-slate-200 text-slate-400 hover:text-indigo-600 transition-all relative ${notifications.length > 0 ? 'shadow-xl shadow-indigo-100 border-indigo-100' : ''}`}>
                <FaBell size={22} />
                {notifications.length > 0 && (
                  <span className="absolute top-3 right-3 w-3.5 h-3.5 bg-rose-500 border-2 border-white rounded-full animate-bounce"></span>
                )}
              </button>

              {showNotifDropdown && (
                <div className="absolute right-0 mt-4 w-80 bg-white rounded-3xl shadow-2xl border border-slate-100 p-6 z-50 overflow-hidden">
                  <h4 className="font-black text-[10px] uppercase tracking-[0.2em] text-slate-400 mb-4">QA Approvals</h4>
                  <div className="space-y-3 max-h-64 overflow-y-auto pr-2">
                    {notifications.length > 0 ? (
                      notifications.map(n => (
                        <div key={n.id} onClick={() => handleNotifClick(n.id)}
                          className="p-4 rounded-2xl bg-indigo-50 border border-indigo-100 group cursor-pointer hover:bg-indigo-600 transition-all">
                          <p className="text-xs font-black text-indigo-900 group-hover:text-white leading-tight">{n.title}</p>
                          <p className="text-[10px] font-bold text-indigo-400 group-hover:text-indigo-200 mt-1 uppercase italic">{n.msg}</p>
                        </div>
                      ))
                    ) : (
                      <p className="text-slate-400 italic text-sm text-center py-4">All caught up!</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </header>

          {/* STATS CARDS */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
            <StatCard label="Master Library" val={stats.total} icon={<FaLayerGroup />} color="text-slate-400" />
            <StatCard label="Awaiting Assets" val={stats.passed} icon={<FaCheckCircle />} color="text-indigo-500" />
            <StatCard label="Handed Over" val={stats.completed} icon={<FaChartBar />} color="text-emerald-500" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className={`${showPipeline ? 'lg:col-span-7' : 'lg:col-span-12'} space-y-4`}>
              <h1 className="text-2xl font-black mb-6 capitalize tracking-tight flex items-center gap-3">
                <div className="h-2 w-10 bg-indigo-600 rounded-full"></div> {viewFilter} Repository
              </h1>
              {loading && sections.length === 0 ? (
                <div className="flex flex-col items-center py-20 text-slate-300">
                  <FaSpinner className="animate-spin text-4xl mb-4" />
                  <p className="font-black uppercase text-xs tracking-widest">Syncing Pipeline...</p>
                </div>
              ) : (
                displaySections.map((section) => (
                  <div key={section.id} onClick={() => showPipeline && setSelectedSectionId(section.id)}
                    className={`p-6 rounded-3xl border-2 transition-all bg-white flex justify-between items-center ${selectedSectionId === section.id ? 'border-indigo-600 ring-4 ring-indigo-50 shadow-lg' : 'border-transparent shadow-sm'} ${showPipeline ? 'cursor-pointer hover:border-slate-300' : ''}`}>
                    <div className="flex gap-4 items-center">
                      <div className={`p-4 rounded-2xl ${selectedSectionId === section.id ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-400'}`}>
                        <FaImage size={20} />
                      </div>
                      <h3 className="font-bold text-lg leading-none">{section.title}</h3>
                    </div>
                    <div className="flex gap-4 items-center">
                      <button onClick={() => handleDownload(section.id, section.title)} className="p-3 text-blue-600 hover:bg-blue-50 rounded-xl">
                        <FaDownload />
                      </button>
                      <span className={`px-2 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest shadow-sm ${getStatusClasses(section.current_status)}`}>
                        {section.current_status}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>

            {showPipeline && (
              <div className="lg:col-span-5">
                <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm sticky top-10">
                  <h3 className="font-black text-xl mb-6 italic flex items-center gap-2">
                    <FaCloudUploadAlt className="text-indigo-600" /> Asset Pipeline
                  </h3>
                  {selectedSection ? (
                    <div className="space-y-4">
                      <div className="p-4 bg-indigo-50 rounded-2xl mb-4 border border-indigo-100">
                        <p className="text-[10px] font-black text-indigo-400 uppercase">Current Project</p>
                        <p className="font-bold text-indigo-900 leading-tight">{selectedSection.title}</p>
                      </div>
                      {[
                        { id: 'desktop', icon: <FaDesktop />, label: 'Desktop (1920x1080)' },
                        { id: 'mobile', icon: <FaMobileAlt />, label: 'Mobile (1080x1920)' },
                        { id: 'banner', icon: <FaAd />, label: 'Marketing Banner' }
                      ].map(asset => (
                        <label key={asset.id} className={`group flex flex-col p-4 rounded-2xl border-2 border-dashed transition-all cursor-pointer ${pendingAssets[asset.id] ? 'border-emerald-500 bg-emerald-50/30' : 'border-slate-200 hover:border-indigo-400'}`}>
                          <div className="flex justify-between items-center">
                            <span className={`text-[11px] font-black uppercase flex items-center gap-2 ${pendingAssets[asset.id] ? 'text-emerald-600' : 'text-slate-600'}`}>
                              {asset.icon} {asset.label}
                            </span>
                            {pendingAssets[asset.id] ? <FaCheck className="text-emerald-500" /> : <FaCloudUploadAlt className="text-slate-300 group-hover:text-indigo-500" />}
                          </div>
                          {pendingAssets[asset.id] && <p className="text-[10px] text-emerald-600 mt-2 font-bold truncate">✓ {pendingAssets[asset.id].name}</p>}
                          <input type="file" className="hidden" disabled={loading} onChange={(e) => handleFileSelect(e, asset.id)} />
                        </label>
                      ))}
                      <button onClick={handleFinalSubmit} disabled={loading || selectedSection.current_status !== 'QA Passed'} className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black shadow-lg hover:bg-indigo-700 disabled:bg-slate-200 transition-all mt-6 uppercase tracking-widest text-xs">
                        {loading ? <FaSpinner className="animate-spin mx-auto text-xl" /> : 'Finalize Package'}
                      </button>
                    </div>
                  ) : (
                    <div className="text-center py-20">
                      <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-dashed border-slate-200">
                        <FaPalette className="text-slate-200 text-2xl" />
                      </div>
                      <p className="text-slate-400 italic text-sm">Pick a QA Passed item to start the asset upload workflow.</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

// Helper Sub-component
function StatCard({ label, val, icon, color }) {
  return (
    <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
      <p className={`text-[10px] font-black uppercase tracking-wider ${color}`}>{label}</p>
      <div className="flex justify-between items-end mt-1 font-black text-3xl">
        {val} <span className="text-slate-100 text-2xl">{icon}</span>
      </div>
    </div>
  );
}