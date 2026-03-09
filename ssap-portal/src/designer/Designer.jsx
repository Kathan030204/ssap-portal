import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import {
  FaPalette, FaImage, FaDesktop, FaMobileAlt,
  FaAd, FaSpinner, FaCloudUploadAlt, FaExternalLinkAlt, FaInfoCircle,
  FaListUl, FaCheckCircle, FaLayerGroup, FaChartBar, FaStore, FaRocket, FaCheck,
  FaUserCircle, FaSignOutAlt, FaBell // Added FaBell
} from 'react-icons/fa';

const api = axios.create({ baseURL: 'http://localhost:8000/api' });

export function Designer({ onLogout }) {
  const [loading, setLoading] = useState(false);
  const [sections, setSections] = useState([]);
  const [selectedSectionId, setSelectedSectionId] = useState(null);
  const [viewFilter, setViewFilter] = useState('all');
  const [currentUser, setCurrentUser] = useState({ id: null, name: '', role: '' });
  
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

      // NOTIFICATION LOGIC: Filter sections that are 'QA Passed'
      // These are tasks ready for the Designer to upload assets.
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
    fetchDesignTasks(); 
    // Auto-refresh every 30 seconds to catch QA updates
    const interval = setInterval(fetchDesignTasks, 30000);

    const savedUser = JSON.parse(localStorage.getItem('user'));
    if (savedUser) {
      setCurrentUser({
        id: savedUser.id,
        name: savedUser.username || savedUser.name,
        role: savedUser.role
      });
    }
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    setPendingAssets({ desktop: null, mobile: null, banner: null });
  }, [selectedSectionId]);

  // Handle selecting a task from the notification bell
  const handleNotifClick = (sectionId) => {
    setViewFilter('passed'); // Switch view to show the item
    setSelectedSectionId(sectionId); // Select it
    setShowNotifDropdown(false); // Close menu
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
    completed: sections.filter(s => ['Published'].includes(s.current_status)).length
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
    } catch (err) {
      console.error("Submit Error:", err);
    } finally {
      setLoading(false);
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

        <div className="p-4 border-t border-slate-800">
          <div className="flex items-center gap-3 px-4 py-3 mb-2">
            <div className="w-10 h-10 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400 border border-indigo-500/30">
              <FaUserCircle size={24} />
            </div>
            <div>
              <p className="text-white font-black text-sm leading-none truncate w-32">{currentUser.name || "Designer"}</p>
              <p className="text-slate-500 text-[10px] uppercase font-bold tracking-widest mt-1">ID: {currentUser.id || 'N/A'} • {currentUser.role}</p>
            </div>
          </div>
          <button onClick={() => { localStorage.removeItem('user'); onLogout(); }} className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-slate-400 hover:text-rose-400 hover:bg-rose-400/10 transition-all font-black text-xs uppercase tracking-widest">
            <FaSignOutAlt /> Logout
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 ml-64 p-10">
        <div className="max-w-7xl mx-auto">
          <header className="flex justify-between items-start mb-10">
            <div>
              <h2 className="text-4xl font-black text-slate-900 tracking-tight italic">Design Dashboard</h2>
              <p className="text-slate-500 font-medium mt-1">Welcome back, {currentUser.name}. You are working in the Design Hub.</p>
            </div>

            {/* --- NOTIFICATION BELL COMPONENT --- */}
            <div className="relative" ref={notifRef}>
              <button 
                onClick={() => setShowNotifDropdown(!showNotifDropdown)}
                className={`p-4 rounded-2xl bg-white border border-slate-200 text-slate-400 hover:text-indigo-600 transition-all relative ${notifications.length > 0 ? 'shadow-xl shadow-indigo-100' : ''}`}
              >
                <FaBell size={22} />
                {notifications.length > 0 && (
                  <span className="absolute top-3 right-3 w-3.5 h-3.5 bg-rose-500 border-2 border-white rounded-full animate-bounce"></span>
                )}
              </button>

              {showNotifDropdown && (
                <div className="absolute right-0 mt-4 w-80 bg-white rounded-4xl shadow-2xl border border-slate-100 p-6 z-50 animate-in fade-in zoom-in duration-200">
                  <h4 className="font-black text-[10px] uppercase tracking-[0.2em] text-slate-400 mb-4">Pending Design Tasks</h4>
                  <div className="space-y-3 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
                    {notifications.length > 0 ? (
                      notifications.map(n => (
                        <div 
                          key={n.id} 
                          onClick={() => handleNotifClick(n.id)}
                          className="p-4 rounded-2xl bg-indigo-50 border border-indigo-100 group cursor-pointer hover:bg-indigo-600 transition-all"
                        >
                          <p className="text-xs font-black text-indigo-900 group-hover:text-white leading-tight">{n.title}</p>
                          <p className="text-[10px] font-bold text-indigo-400 group-hover:text-indigo-200 mt-1 uppercase">{n.msg}</p>
                        </div>
                      ))
                    ) : (
                      <div className="py-8 text-center">
                        <FaCheckCircle className="mx-auto text-slate-200 mb-2" size={24} />
                        <p className="text-slate-400 italic text-sm">No pending QA approvals.</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </header>

          {/* STATS CARDS */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
              <p className="text-slate-400 text-[10px] font-black uppercase tracking-wider">Total Library</p>
              <div className="flex justify-between items-end mt-1 font-black text-3xl">
                {stats.total} <FaLayerGroup className="text-slate-200 text-2xl" />
              </div>
            </div>
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm border-l-4 border-l-indigo-500">
              <p className="text-indigo-500 text-[10px] font-black uppercase tracking-wider">QA Approved</p>
              <div className="flex justify-between items-end mt-1 font-black text-3xl">
                {stats.passed} <FaCheckCircle className="text-indigo-100 text-2xl" />
              </div>
            </div>
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm border-l-4 border-l-emerald-500">
              <p className="text-emerald-500 text-[10px] font-black uppercase tracking-wider">Total Completed</p>
              <div className="flex justify-between items-end mt-1 font-black text-3xl text-emerald-600">
                {stats.completed} <FaChartBar className="text-emerald-100 text-2xl" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className={`${showPipeline ? 'lg:col-span-7' : 'lg:col-span-12'} space-y-4`}>
              <h1 className="text-3xl font-black mb-6 capitalize tracking-tight">{viewFilter.replace('all', 'Master')} View</h1>
              {loading && sections.length === 0 ? (
                <FaSpinner className="animate-spin text-3xl text-indigo-600 mx-auto block mt-10" />
              ) : (
                displaySections.map((section) => (
                  <div key={section.id} onClick={() => showPipeline && setSelectedSectionId(section.id)}
                    className={`p-6 rounded-3xl border-2 transition-all bg-white flex justify-between items-center ${selectedSectionId === section.id ? 'border-indigo-600 ring-4 ring-indigo-50 shadow-lg' : 'border-transparent shadow-sm'} ${showPipeline ? 'cursor-pointer hover:border-slate-300' : ''}`}
                  >
                    <div className="flex gap-4 items-center">
                      <div className={`p-4 rounded-2xl ${selectedSectionId === section.id ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-400'}`}>
                        <FaImage size={20} />
                      </div>
                      <h3 className="font-bold text-lg leading-none">{section.title}</h3>
                    </div>
                    <span className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest shadow-sm ${getStatusClasses(section.current_status)}`}>
                      {section.current_status}
                    </span>
                  </div>
                ))
              )}
            </div>

            {showPipeline && (
              <div className="lg:col-span-5">
                <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm sticky top-10">
                  <h3 className="font-bold text-xl mb-6 italic">Asset Pipeline</h3>
                  {selectedSection ? (
                    <div className="space-y-4">
                      <div className="p-4 bg-indigo-50 rounded-2xl mb-4 border border-indigo-100">
                        <p className="text-[10px] font-black text-indigo-400 uppercase">Target Section</p>
                        <p className="font-bold text-indigo-900 leading-tight">{selectedSection.title}</p>
                      </div>
                      {[
                        { id: 'desktop', icon: <FaDesktop />, label: 'Desktop Asset' },
                        { id: 'mobile', icon: <FaMobileAlt />, label: 'Mobile Asset' },
                        { id: 'banner', icon: <FaAd />, label: 'Marketing Banner' }
                      ].map(asset => (
                        <label key={asset.id} className={`group flex flex-col p-4 rounded-2xl border-2 border-dashed transition-all cursor-pointer ${pendingAssets[asset.id] ? 'border-emerald-500 bg-emerald-50/30' : 'border-slate-200 hover:border-indigo-400'}`}>
                          <div className="flex justify-between items-center">
                            <span className={`text-[11px] font-black uppercase flex items-center gap-2 ${pendingAssets[asset.id] ? 'text-emerald-600' : 'text-slate-600'}`}>
                              {asset.icon} {asset.label}
                            </span>
                            {pendingAssets[asset.id] ? <FaCheck className="text-emerald-500" /> : <FaCloudUploadAlt className="text-slate-300 group-hover:text-indigo-500" />}
                          </div>
                          {pendingAssets[asset.id] && <p className="text-[10px] text-emerald-600 mt-2 font-bold truncate">File: {pendingAssets[asset.id].name}</p>}
                          <input type="file" className="hidden" disabled={loading} onChange={(e) => handleFileSelect(e, asset.id)} />
                        </label>
                      ))}
                      <button onClick={handleFinalSubmit} disabled={loading || selectedSection.current_status !== 'QA Passed'} className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black shadow-lg hover:bg-indigo-700 disabled:bg-slate-200 transition-all mt-6">
                        {loading ? <FaSpinner className="animate-spin mx-auto text-xl" /> : 'Submit Design Package'}
                      </button>
                      {selectedSection.current_status !== 'QA Passed' && (
                        <p className="text-center text-[10px] text-rose-500 font-bold uppercase italic mt-4 flex items-center justify-center gap-2">
                          <FaInfoCircle /> Must be 'QA Passed' to submit
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-20 text-slate-400 italic">Select a section from the list or notification to start.</div>
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