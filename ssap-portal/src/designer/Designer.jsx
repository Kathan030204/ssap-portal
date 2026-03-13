import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import {
  FaPalette, FaImage, FaDesktop, FaMobileAlt,
  FaAd, FaSpinner, FaCloudUploadAlt, FaDownload,
  FaListUl, FaCheckCircle, FaLayerGroup, FaStore, FaRocket,
  FaUserCircle, FaSignOutAlt, FaBell, FaTimes, FaExclamationTriangle, FaCheck, FaEye, FaEdit, FaTrash, FaPlus
} from 'react-icons/fa';

const api = axios.create({ baseURL: '/api' });

// --- ASSET VIEWER MODAL ---
function AssetViewerModal({ isOpen, assets, onClose, sectionTitle, onEditAsset, onDeleteAsset }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-120 flex items-center justify-center p-6 bg-slate-900/80 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-white rounded-4xl shadow-2xl max-w-4xl w-full max-h-[80vh] flex flex-col overflow-hidden animate-in zoom-in-95">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
          <div>
            <h3 className="text-xl font-black text-slate-900 italic uppercase tracking-tight">Stored Assets</h3>
            <p className="text-slate-400 text-xs font-bold uppercase">{sectionTitle}</p>
          </div>
          <button onClick={onClose} className="p-3 bg-slate-100 hover:bg-rose-100 hover:text-rose-600 rounded-2xl transition-colors">
            <FaTimes />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-6 bg-slate-50">
          {assets.length === 0 ? (
            <div className="text-center py-20 text-slate-400 font-bold italic">No assets found for this section.</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {assets.map((asset, idx) => (
                <div key={idx} className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm group relative">
                  <div className="mb-4 rounded-2xl bg-slate-100 h-48 flex items-center justify-center overflow-hidden relative">
                    <img src={asset.image_url} alt={asset.image_type} className="max-w-full max-h-full object-contain" />
                    <div className="absolute top-2 right-2 bg-slate-900/80 text-white text-[10px] px-3 py-1 rounded-full font-black uppercase tracking-widest">
                      {asset.image_type}
                    </div>
                  </div>
                  <div className="flex justify-between items-center px-1">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter truncate w-16">#ID: {asset.id}</span>

                    <div className="flex gap-2">
                      <button
                        onClick={() => onEditAsset(asset)}
                        className="flex items-center gap-1 px-3 py-1.5 bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white rounded-lg text-[10px] font-black uppercase transition-all"
                      >
                        <FaEdit />
                      </button>

                      <button
                        onClick={() => onDeleteAsset(asset.id)}
                        className="flex items-center gap-1 px-3 py-1.5 bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white rounded-lg text-[10px] font-black uppercase transition-all"
                      >
                        <FaTrash />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// --- ALERT MODAL COMPONENT ---
function AlertModal({ isOpen, type, title, message, onClose }) {
  if (!isOpen) return null;
  const isError = type === 'error';
  return (
    <div className="fixed inset-0 z-200 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-4xl shadow-2xl max-w-sm w-full p-8 text-center animate-in zoom-in-95 duration-200">
        <div className={`w-20 h-20 rounded-full mx-auto mb-6 flex items-center justify-center text-3xl ${isError ? 'bg-rose-100 text-rose-600' : 'bg-emerald-100 text-emerald-600'}`}>
          {isError ? <FaExclamationTriangle /> : <FaCheck />}
        </div>
        <h3 className="text-2xl font-black text-slate-900 mb-2 italic">{title}</h3>
        <p className="text-slate-500 font-medium mb-8 leading-relaxed">{message}</p>
        <button
          onClick={onClose}
          className={`w-full py-4 rounded-2xl font-black uppercase tracking-widest text-xs shadow-lg transition-transform active:scale-95 ${isError ? 'bg-rose-600 shadow-rose-200' : 'bg-slate-900 shadow-slate-200'} text-white`}
        >
          OK!
        </button>
      </div>
    </div>
  );
}

// --- CONFIRMATION MODAL COMPONENT ---
function ConfirmModal({ isOpen, title, message, onConfirm, onCancel }) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-200 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-4xl shadow-2xl max-w-sm w-full p-8 text-center animate-in zoom-in-95 duration-200">
        <div className="w-20 h-20 rounded-full mx-auto mb-6 flex items-center justify-center text-3xl bg-amber-100 text-amber-600">
          <FaExclamationTriangle />
        </div>
        <h3 className="text-2xl font-black text-slate-900 mb-2 italic">{title}</h3>
        <p className="text-slate-500 font-medium mb-8">{message}</p>
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 py-4 rounded-2xl font-black uppercase text-xs bg-slate-100 text-slate-600 hover:bg-slate-200 transition-all">
            Cancel
          </button>
          <button onClick={onConfirm} className="flex-1 py-4 rounded-2xl font-black uppercase text-xs bg-rose-600 text-white shadow-lg shadow-rose-200 hover:bg-rose-700 transition-all">
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

export function Designer({ onLogout }) {
  const [loading, setLoading] = useState(false);
  const [sections, setSections] = useState([]);
  const [selectedSectionId, setSelectedSectionId] = useState(null);
  const [viewFilter, setViewFilter] = useState('all');

  const [modalConfig, setModalConfig] = useState({ isOpen: false, type: 'success', title: '', message: '' });
  const [confirmConfig, setConfirmConfig] = useState({ isOpen: false, assetId: null });

  const [viewerOpen, setViewerOpen] = useState(false);
  const [currentAssets, setCurrentAssets] = useState([]);
  const [viewingSectionTitle, setViewingSectionTitle] = useState("");
  const [activeSectionForViewer, setActiveSectionForViewer] = useState(null);

  const editInputRef = useRef(null);
  const [assetToEdit, setAssetToEdit] = useState(null);

  const [currentUser] = useState(() => {
    const storedUser = sessionStorage.getItem('user') || localStorage.getItem('user');
    if (storedUser) {
      const savedUser = JSON.parse(storedUser);
      return {
        id: savedUser.id || 'N/A',
        name: savedUser.username || savedUser.name || savedUser.display_name || "Designer",
        role: savedUser.role || "Designer"
      };
    }
    return { id: null, name: 'Designer', role: 'Designer' };
  });

  const [notifications, setNotifications] = useState([]);
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);
  const notifRef = useRef(null);

  const [pendingAssets, setPendingAssets] = useState({
    desktop: [], mobile: [], banner: []
  });

  const showAlert = useCallback((type, title, message) => {
    setModalConfig({ isOpen: true, type, title, message });
  }, []);

  const fetchDesignTasks = useCallback(async () => {
    try {
      if (!currentUser.id || currentUser.id === 'N/A') return;
      const response = await api.get('/sections');
      const myData = response.data.filter(s => s.designer_id === currentUser.id);
      setSections(myData);

      const actionable = myData.filter(s =>
        s.current_status === 'In Design' || s.current_status === 'Rejected by Admin'
      );

      const alerts = actionable.map(s => ({
        id: s.id,
        title: s.title,
        status: s.current_status,
        msg: s.current_status === 'Rejected by Admin' ? "REJECTED BY ADMIN" : "IN DESIGN",
      }));
      setNotifications(alerts);
    } catch (error) {
      console.error("Fetch error:", error);
    }
  }, [currentUser.id]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) setShowNotifDropdown(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    fetchDesignTasks();
    const interval = setInterval(fetchDesignTasks, 30000);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      clearInterval(interval);
    };
  }, [fetchDesignTasks]);

  useEffect(() => {
    setPendingAssets({ desktop: [], mobile: [], banner: [] });
  }, [selectedSectionId]);

  const handleViewAssets = async (section) => {
    setLoading(true);
    setCurrentAssets([]);
    setViewingSectionTitle(section.title);
    setActiveSectionForViewer(section);

    try {
      const response = await api.get(`/design`, {
        params: { section_id: section.id }
      });
      setCurrentAssets(response.data);
      setViewerOpen(true);
    } catch {
      showAlert('error', 'Fetch Error', 'Failed to load assets for this section.');
    } finally {
      setLoading(false);
    }
  };

  const triggerEdit = (asset) => {
    setAssetToEdit(asset);
    if (editInputRef.current) editInputRef.current.click();
  };

  const handleEditFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file || !assetToEdit) return;

    setLoading(true);
    const formData = new FormData();
    formData.append('_method', 'PUT');
    formData.append('image_url', file);
    formData.append('section_id', assetToEdit.section_id);
    formData.append('image_type', assetToEdit.image_type);

    try {
      await api.post(`/design/${assetToEdit.id}`, formData);
      showAlert('success', 'Asset Updated', 'The image has been replaced successfully.');
      if (activeSectionForViewer) handleViewAssets(activeSectionForViewer);
    } catch {
      showAlert('error', 'Update Failed', 'Server could not update the asset.');
    } finally {
      setLoading(false);
      setAssetToEdit(null);
      e.target.value = null;
    }
  };

  const requestDeleteAsset = (assetId) => {
    setConfirmConfig({ isOpen: true, assetId });
  };

  const executeDeleteAsset = async () => {
    const assetId = confirmConfig.assetId;
    setConfirmConfig({ isOpen: false, assetId: null });
    setLoading(true);
    try {
      await api.delete(`/design/${assetId}`);
      showAlert('success', 'Asset Deleted', 'Asset removed successfully.');
      if (activeSectionForViewer) handleViewAssets(activeSectionForViewer);
    } catch {
      showAlert('error', 'Delete Failed', 'Could not delete the asset.');
    } finally {
      setLoading(false);
    }
  };

  const handleNotifClick = (sectionId, status) => {
    setViewFilter(status === 'Rejected by Admin' ? 'rejected' : 'passed');
    setSelectedSectionId(sectionId);
    setShowNotifDropdown(false);
  };

  const getStatusClasses = (status) => {
    switch (status) {
      case 'Rejected by Admin': return 'text-white bg-rose-600 border border-rose-700 animate-pulse';
      case 'In Design': return 'text-indigo-600 bg-indigo-100 border border-indigo-200';
      case 'Published': return 'text-emerald-600 bg-emerald-100';
      case 'Ready for Store': return 'text-emerald-700 bg-emerald-50 border border-emerald-200';
      default: return 'text-slate-600 bg-slate-100';
    }
  };

  const displaySections = sections.filter(s => {
    if (viewFilter === 'all') return ['In Design', 'Published', 'Rejected by Admin', 'Ready for Store'].includes(s.current_status);
    if (viewFilter === 'passed') return s.current_status === 'In Design';
    if (viewFilter === 'rejected') return s.current_status === 'Rejected by Admin';
    if (viewFilter === 'ready') return s.current_status === 'Ready for Store';
    if (viewFilter === 'published') return s.current_status === 'Published';
    return true;
  });

  const showPipeline = (viewFilter === 'passed' || viewFilter === 'rejected' || viewFilter === 'ready') && selectedSectionId !== null;

  const stats = {
    total: sections.length,
    passed: sections.filter(s => s.current_status === 'In Design').length,
    rejected: sections.filter(s => s.current_status === 'Rejected by Admin').length,
    published: sections.filter(s => s.current_status === 'Published').length
  };

  const selectedSection = sections.find(s => s.id === selectedSectionId);

  const handleFileSelect = (e, assetType) => {
    const files = Array.from(e.target.files);
    if (files.length > 0) {
      setPendingAssets(prev => ({ ...prev, [assetType]: [...prev[assetType], ...files] }));
    }
    e.target.value = null;
  };

  const removeFile = (assetType, index) => {
    setPendingAssets(prev => ({
      ...prev,
      [assetType]: prev[assetType].filter((_, i) => i !== index)
    }));
  };

  const handleFinalSubmit = async () => {
    const totalFiles = [...pendingAssets.desktop, ...pendingAssets.mobile, ...pendingAssets.banner].length;
    if (totalFiles === 0) {
      showAlert('error', 'Selection Empty', 'Please select at least one asset to upload.');
      return;
    }
    setLoading(true);
    try {
      const uploadPromises = [];
      Object.entries(pendingAssets).forEach(([type, files]) => {
        files.forEach(file => {
          const formData = new FormData();
          formData.append('image_url', file);
          formData.append('section_id', selectedSectionId);
          formData.append('image_type', type);
          uploadPromises.push(api.post('/design', formData));
        });
      });
      await Promise.all(uploadPromises);
      await api.put(`/sections/${selectedSectionId}`, { current_status: 'Ready for Store' });

      showAlert('success', 'Sync Complete', 'Assets submitted successfully.');
      setSelectedSectionId(null);
      fetchDesignTasks();
    } catch {
      showAlert('error', 'Upload Failed', 'The server rejected the assets.');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (sectionId, title) => {
    try {
      const response = await api.get(`/sections/${sectionId}/download`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${title.replace(/\s+/g, '_').toLowerCase()}.zip`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch {
      showAlert('error', 'Download Error', 'Could not retrieve the zip package.');
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans text-slate-900">
      <AlertModal {...modalConfig} onClose={() => setModalConfig({ ...modalConfig, isOpen: false })} />

      <ConfirmModal
        isOpen={confirmConfig.isOpen}
        title="Delete Asset?"
        message="This action is permanent. Do you want to proceed?"
        onConfirm={executeDeleteAsset}
        onCancel={() => setConfirmConfig({ isOpen: false, assetId: null })}
      />

      <input type="file" ref={editInputRef} className="hidden" onChange={handleEditFileChange} />

      <AssetViewerModal
        isOpen={viewerOpen}
        assets={currentAssets}
        sectionTitle={viewingSectionTitle}
        onClose={() => setViewerOpen(false)}
        onEditAsset={triggerEdit}
        onDeleteAsset={requestDeleteAsset}
      />

      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 text-white flex flex-col shrink-0 fixed h-full z-20">
        <div className="p-8 text-xl font-black italic flex items-center gap-3 border-b border-slate-800">
          <FaPalette className="text-indigo-400" /> Designer Hub
        </div>
        <nav className="flex-1 px-4 py-6 space-y-1">
          <button onClick={() => { setViewFilter('all'); setSelectedSectionId(null); }}
            className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl font-bold transition-all ${viewFilter === 'all' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-800'}`}>
            <FaListUl /> All Sections
          </button>
          <button onClick={() => { setViewFilter('rejected'); setSelectedSectionId(null); }}
            className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl font-bold transition-all ${viewFilter === 'rejected' ? 'bg-rose-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-800'}`}>
            <FaExclamationTriangle /> Rejections {stats.rejected > 0 && `(${stats.rejected})`}
          </button>
          <button onClick={() => { setViewFilter('passed'); setSelectedSectionId(null); }}
            className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl font-bold transition-all ${viewFilter === 'passed' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-800'}`}>
            <FaCheckCircle /> QA Passed
          </button>
          <div className="pt-4 mt-4 border-t border-slate-800">
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
        <div className="p-4 border-t border-slate-800 text-white">
          <div className="flex items-center gap-3 px-4 py-3 mb-2">
            <FaUserCircle size={20} className="text-indigo-400" />
            <div className="overflow-hidden">
              <p className="font-black text-sm truncate w-32 uppercase">{currentUser.name}</p>
              <p className="text-slate-500 text-[9px] uppercase font-bold tracking-widest">{currentUser.role}</p>
            </div>
          </div>
          <button onClick={() => { sessionStorage.clear(); onLogout(); }} className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-slate-400 hover:text-rose-400 font-black text-xs uppercase tracking-widest">
            <FaSignOutAlt /> Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 ml-64 p-10">
        <div className="max-w-7xl mx-auto">
          <header className="flex justify-between items-start mb-10">
            <div>
              <h2 className="text-4xl font-black text-slate-900 tracking-tight italic">Studio Pipeline</h2>
              <p className="text-slate-500 font-medium mt-1">Active User: <span className="text-indigo-600 font-bold">{currentUser.name}</span></p>
            </div>
            <div className="relative" ref={notifRef}>
              <button onClick={() => setShowNotifDropdown(!showNotifDropdown)}
                className={`p-4 rounded-2xl bg-white border border-slate-200 text-slate-400 transition-all relative ${notifications.length > 0 ? 'shadow-xl border-indigo-100' : ''}`}>
                {loading ? <FaSpinner className="animate-spin" size={22} /> : <FaBell size={22} />}
                {notifications.length > 0 && <span className="absolute top-3 right-3 w-3.5 h-3.5 bg-rose-500 border-2 border-white rounded-full"></span>}
              </button>
              {showNotifDropdown && (
                <div className="absolute right-0 mt-4 w-80 bg-white rounded-3xl shadow-2xl border border-slate-100 p-6 z-50">
                  <h4 className="font-black text-[10px] uppercase text-slate-400 mb-4">Urgent Actions</h4>
                  <div className="space-y-3 max-h-64 overflow-y-auto">
                    {notifications.map(n => (
                      <div key={n.id} onClick={() => handleNotifClick(n.id, n.status)} className={`p-4 rounded-2xl border cursor-pointer ${n.status === 'Rejected by Admin' ? 'bg-rose-50 border-rose-100' : 'bg-indigo-50 border-indigo-100'}`}>
                        <p className="text-xs font-black text-slate-900">{n.title}</p>
                        <p className="text-[10px] font-bold mt-1 uppercase italic text-slate-500">{n.msg}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </header>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
            <StatCard label="My Tasks" val={stats.total} icon={<FaLayerGroup />} color="text-slate-400" />
            <StatCard label="QA Passed" val={stats.passed} icon={<FaCheckCircle />} color="text-indigo-500" />
            <StatCard label="Rejected" val={stats.rejected} icon={<FaExclamationTriangle />} color="text-rose-500" />
            <StatCard label="Published" val={stats.published} icon={<FaRocket />} color="text-emerald-500" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className={`${showPipeline ? 'lg:col-span-7' : 'lg:col-span-12'} space-y-4 transition-all duration-300`}>
              <h1 className="text-2xl font-black mb-6 capitalize tracking-tight flex items-center gap-3">
                <div className={`h-2 w-10 rounded-full ${viewFilter === 'rejected' ? 'bg-rose-600' : viewFilter === 'ready' ? 'bg-emerald-600' : 'bg-indigo-600'}`}></div> {viewFilter} Repository
              </h1>
              {displaySections.length === 0 ? (
                <div className="p-20 text-center bg-white rounded-4xl border-2 border-dashed border-slate-200 text-slate-400 font-bold italic">No records found for this view.</div>
              ) : (
                displaySections.map((section) => (
                  <div key={section.id}
                    // UPDATED: Clicking the card only triggers selection IF NOT in "Ready for Store"
                    onClick={() => viewFilter !== 'ready' && (viewFilter === 'passed' || viewFilter === 'rejected') && setSelectedSectionId(section.id)}
                    className={`p-6 rounded-3xl border-2 transition-all bg-white flex justify-between items-center ${selectedSectionId === section.id ? 'border-indigo-600 ring-4 ring-indigo-50 shadow-lg' : 'border-transparent shadow-sm'} ${(viewFilter === 'passed' || viewFilter === 'rejected') ? 'cursor-pointer hover:border-slate-300' : ''}`}>
                    <div className="flex gap-4 items-center">
                      <div className={`p-4 rounded-2xl ${selectedSectionId === section.id ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-400'}`}>
                        <FaImage size={20} />
                      </div>
                      <div>
                        <h3 className="font-bold text-lg mb-3">{section.title}</h3>
                        <span className={`p-1 rounded-xl text-[10px] font-black uppercase tracking-widest ${getStatusClasses(section.current_status)}`}>
                          {section.current_status}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-3 items-center">
                      {/* ACTION BUTTONS */}
                      {section.current_status === 'Ready for Store' && viewFilter === 'ready' && (
                        <button
                          onClick={(e) => { e.stopPropagation(); setSelectedSectionId(section.id); }}
                          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white hover:bg-indigo-700 rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors shadow-md"
                        >
                          <FaPlus size={14} />
                        </button>
                      )}

                      {(section.current_status === 'Ready for Store' || section.current_status === 'Published') && (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleViewAssets(section); }}
                          className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors border border-emerald-100"
                        >
                          <FaEye size={14} />
                        </button>
                      )}

                      <button onClick={(e) => { e.stopPropagation(); handleDownload(section.id, section.title) }} className="p-3 text-blue-600 hover:bg-blue-50 rounded-xl transition-colors">
                        <FaDownload />
                      </button>

                    </div>
                  </div>
                ))
              )}
            </div>

            {showPipeline && (
              <div className="lg:col-span-5 animate-in slide-in-from-right duration-300">
                <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm sticky top-10">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="font-black text-xl italic flex items-center gap-2">
                      <FaCloudUploadAlt className="text-indigo-600" /> Asset Pipeline
                    </h3>
                    <button onClick={() => setSelectedSectionId(null)} className="p-2 bg-slate-100 text-slate-400 hover:text-rose-500 rounded-full transition-colors">
                      <FaTimes size={16} />
                    </button>
                  </div>

                  {selectedSection && (
                    <div className="space-y-4">
                      <div className="p-4 bg-slate-50 rounded-2xl mb-4">
                        <p className="text-[10px] font-black uppercase text-slate-400 mb-1">Target Section</p>
                        <p className="font-bold text-slate-900 truncate">{selectedSection.title}</p>
                      </div>

                      {[
                        { id: 'desktop', icon: <FaDesktop />, label: 'Desktop' },
                        { id: 'mobile', icon: <FaMobileAlt />, label: 'Mobile' },
                        { id: 'banner', icon: <FaAd />, label: 'Banner' }
                      ].map(asset => (
                        <div key={asset.id}>
                          <label className="group flex flex-col p-4 rounded-2xl border-2 border-dashed border-slate-200 hover:border-indigo-400 cursor-pointer transition-colors bg-white">
                            <span className="text-[11px] font-black uppercase text-slate-600 flex items-center gap-2">
                              {asset.icon} {asset.label}
                            </span>
                            <input type="file" multiple className="hidden" onChange={(e) => handleFileSelect(e, asset.id)} />
                          </label>
                          <div className="flex flex-wrap gap-2 mt-2">
                            {pendingAssets[asset.id].map((file, idx) => (
                              <div key={idx} className="flex items-center gap-2 bg-emerald-50 text-emerald-700 px-2 py-1 rounded-lg text-[10px] font-bold">
                                <span className="truncate max-w-20">{file.name}</span>
                                <button onClick={() => removeFile(asset.id, idx)} className="text-rose-400 hover:text-rose-600"><FaTimes size={10} /></button>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                      <button onClick={handleFinalSubmit} disabled={loading} className="w-full py-4 rounded-2xl font-black shadow-lg bg-indigo-600 hover:bg-indigo-700 text-white uppercase text-xs transition-all active:scale-95 disabled:bg-slate-200 mt-4">
                        {loading ? <FaSpinner className="animate-spin mx-auto text-lg" /> : 'Add to Store'}
                      </button>
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

function StatCard({ label, val, icon, color }) {
  return (
    <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
      <p className={`text-[10px] font-black uppercase tracking-wider ${color}`}>{label}</p>
      <div className="flex justify-between items-end mt-1 font-black text-3xl text-slate-900">
        <span>{val}</span>
        <span className="text-slate-100 text-xl">{icon}</span>
      </div>
    </div>
  );
}