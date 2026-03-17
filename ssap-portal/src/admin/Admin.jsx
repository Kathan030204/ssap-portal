import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import {
    FaRocket, FaFolderOpen, FaCheckDouble, FaUsers, FaHome,
    FaHourglassHalf, FaPlus, FaTimes, FaTrash, FaCheck,
    FaDownload, FaSpinner, FaUndo, FaBars,
    FaChartLine, FaClock,
    FaUserShield, FaEye, FaRegImage, FaUserCircle, FaSearch,
    FaEdit, FaExclamationTriangle, FaCheckCircle,
    FaPalette
} from 'react-icons/fa';

const api = axios.create({ baseURL: '/api' });

// --- NOTIFICATION MODAL COMPONENT ---
const NotificationModal = ({ message, type, onClose }) => {
    if (!message) return null;
    const isError = type === 'error';

    return (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-110 flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden border border-slate-100">
                <div className="p-8 text-center">
                    <div className={`w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center ${isError ? 'bg-rose-50 text-rose-500' : 'bg-emerald-50 text-emerald-500'}`}>
                        {isError ? <FaExclamationTriangle size={28} /> : <FaCheckCircle size={28} />}
                    </div>
                    <h3 className="text-xl font-black text-slate-800 mb-2">{isError ? 'Action Failed' : 'Success!'}</h3>
                    <p className="text-slate-500 font-bold text-sm leading-relaxed">{message}</p>
                    <button
                        onClick={onClose}
                        className={`mt-6 w-full py-3 rounded-xl font-black text-white transition-all shadow-lg cursor-pointer ${isError ? 'bg-rose-500 shadow-rose-100 hover:bg-rose-600' : 'bg-slate-900 shadow-slate-200 hover:bg-slate-800'}`}
                    >
                        OK!
                    </button>
                </div>
            </div>
        </div>
    );
};

// --- NEW CONFIRMATION MODAL COMPONENT ---
const ConfirmationModal = ({ isOpen, title, message, onConfirm, onCancel, confirmText = "PROCEED" }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-100 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden">
                <div className="p-8 text-center">
                    <div className="w-16 h-16 rounded-full bg-amber-50 text-amber-500 mx-auto mb-4 flex items-center justify-center">
                        <FaExclamationTriangle size={28} />
                    </div>
                    <h3 className="text-xl font-black text-slate-800 mb-2">{title}</h3>
                    <p className="text-slate-500 font-bold text-sm leading-relaxed">{message}</p>
                    <div className="flex flex-col sm:flex-row gap-3 mt-8">
                        <button onClick={onCancel} className="flex-1 py-3 rounded-xl font-black text-slate-400 hover:bg-slate-50 transition-all uppercase text-xs cursor-pointer">Cancel</button>
                        <button onClick={onConfirm} className="flex-1 py-3 rounded-xl font-black text-white bg-slate-900 hover:bg-blue-600 transition-all shadow-lg uppercase text-xs cursor-pointer">
                            {confirmText}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

const StatusBadge = ({ status }) => {
    const statusConfig = {
        'Published': 'bg-emerald-100 text-emerald-700 border-emerald-200',
        'Ready for Store': 'bg-blue-100 text-blue-700 border-blue-200',
        'In Testing': 'bg-amber-100 text-amber-700 border-amber-200',
        'Issue Logged': 'bg-rose-100 text-rose-700 border-rose-200',
        'Rejected by Admin': 'bg-red-600 text-white border-red-700 shadow-sm',
    };
    const style = statusConfig[status] || 'bg-slate-100 text-slate-600 border-slate-200';
    return (
        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase border whitespace-nowrap ${style}`}>
            {status}
        </span>
    );
};

export function Admin({ onLogout }) {
    const [activeTab, setActiveTab] = useState('home');
    const [accounts, setAccounts] = useState([]);
    const [sections, setSections] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    const [notification, setNotification] = useState({ message: '', type: 'success' });
    const showAlert = (message, type = 'success') => setNotification({ message, type });
    const closeAlert = () => setNotification({ message: '', type: 'success' });

    const [confirmModal, setConfirmModal] = useState({ isOpen: false, title: '', message: '', onConfirm: () => { } });
    const closeConfirm = () => setConfirmModal({ ...confirmModal, isOpen: false });

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [editingUserId, setEditingUserId] = useState(null);
    const [formData, setFormData] = useState({ username: '', email: '', password: '', role: 'creator' });

    const [approvalSearch, setApprovalSearch] = useState('');
    const [approvalFilter, setApprovalFilter] = useState('all');
    const [repoSearch, setRepoSearch] = useState('');
    const [repoFilter, setRepoFilter] = useState('all');

    const [isAssetsModalOpen, setIsAssetsModalOpen] = useState(false);
    const [selectedSection, setSelectedSection] = useState(null);
    const [sectionDesigns, setSectionDesigns] = useState([]);
    const [assetsLoading, setAssetsLoading] = useState(false);

    const [adminUser, setAdminUser] = useState({ username: 'Administrator', role: 'Super Admin' });

    const fetchInitialData = useCallback(async () => {
        setLoading(true);
        try {
            const [accRes, secRes] = await Promise.all([
                api.get('/accounts'),
                api.get('/sections'),
            ]);
            const sortedSections = secRes.data.sort((a, b) => b.id - a.id);
            setAccounts(accRes.data);
            setSections(sortedSections);
        } catch (err) {
            console.error("Sync Error:", err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        const storedUser = sessionStorage.getItem('user');
        if (storedUser) {
            const savedUser = JSON.parse(storedUser);
            setAdminUser({
                username: savedUser.username || savedUser.name || "Admin",
                role: savedUser.role || "Super Admin"
            });
            fetchInitialData();
        } else {
            onLogout();
        }
    }, [fetchInitialData, onLogout]);

    const openCreateModal = () => {
        setIsEditMode(false);
        setEditingUserId(null);
        setFormData({ username: '', email: '', password: '', role: 'creator' });
        setIsModalOpen(true);
    };

    const openEditModal = (user) => {
        setIsEditMode(true);
        setEditingUserId(user.id);
        setFormData({
            username: user.username,
            email: user.email,
            password: '',
            role: user.role
        });
        setIsModalOpen(true);
    };

    const handleSubmitAccount = async (e) => {
        e.preventDefault();
        try {
            if (isEditMode) {
                await api.put(`/accounts/${editingUserId}`, formData);
                showAlert("Account updated successfully.");
            } else {
                await api.post('/accounts', formData);
                showAlert("Account created successfully.");
            }
            setIsModalOpen(false);
            fetchInitialData();
        } catch {
            showAlert(isEditMode ? "Error updating account." : "Error creating account.", 'error');
        }
    };

    const handleDeleteAccount = (id) => {
        setConfirmModal({
            isOpen: true,
            title: "Delete User?",
            message: "This will permanently remove the user from the system. This action cannot be undone.",
            onConfirm: async () => {
                try {
                    await api.delete(`/accounts/${id}`);
                    showAlert("User removed from system.");
                    fetchInitialData();
                } catch { showAlert("Delete failed.", 'error'); }
                closeConfirm();
            }
        });
    };

    const handleRejectAssets = (id) => {
        setConfirmModal({
            isOpen: true,
            title: "Reject Assets?",
            message: "This will notify the Designer and send the project back to the Studio immediately.",
            onConfirm: async () => {
                try {
                    await api.put(`/sections/${id}`, { current_status: 'Rejected by Admin' });
                    showAlert("Assets rejected. Sent back to Designer Studio.");
                    fetchInitialData();
                } catch { showAlert("Rejection command failed.", 'error'); }
                closeConfirm();
            }
        });
    };

    const handleStatusUpdate = (id, newStatus) => {
        const isRollback = newStatus === 'Issue Logged';
        setConfirmModal({
            isOpen: true,
            title: isRollback ? "Trigger Rollback?" : "Finalize Go-Live?",
            message: isRollback ? "This will pull the section from the live view." : "Are you sure you want to push this section to the LIVE store?",
            confirmText: isRollback ? "ROLLBACK" : "PUBLISH NOW",
            onConfirm: async () => {
                try {
                    const payload = isRollback
                        ? { current_status: newStatus, tester_id: null }
                        : { current_status: newStatus };
                    await api.put(`/sections/${id}`, payload);
                    showAlert(isRollback ? "Section rolled back." : "Section is now LIVE!");
                    fetchInitialData();
                } catch { showAlert("Update failed.", 'error'); }
                closeConfirm();
            }
        });
    };

    const [selectedTesters, setSelectedTesters] = React.useState({});
    const handleAssignTester = async (sectionId, testerId) => {
        if (!testerId) return;
        try {
            await api.put(`/sections/${sectionId}`, {
                tester_id: testerId,
                current_status: 'In Testing'
            });
            showAlert("Tester assigned. Asset is now In Testing.");
            fetchInitialData();
        } catch { showAlert("Assignment failed.", 'error'); }
    };

    const [selectedDesigners, setSelectedDesigners] = React.useState({});
    const handleAssignDesigner = async (sectionId, designerId) => {
        if (!designerId) return;
        try {
            await api.put(`/sections/${sectionId}`, {
                designer_id: designerId,
                current_status: 'In Design'
            });
            showAlert("Task successfully allocated to Designer!");
            fetchInitialData();
        } catch {
            showAlert("Allocation failed. Please try again.", "error");
        }
    };

    const openAssetsViewer = async (section) => {
        setSelectedSection(section);
        setIsAssetsModalOpen(true);
        setAssetsLoading(true);
        try {
            const response = await api.get('/design');
            const filtered = response.data
                .filter(d => d.section_id === section.id)
                .sort((a, b) => b.id - a.id);
            setSectionDesigns(filtered);
        } catch (error) {
            console.error("Error loading assets:", error);
        } finally {
            setAssetsLoading(false);
        }
    };

    const downloadDesignImage = async (designId) => {
        try {
            const response = await api.get(`/design/${designId}/download`, { responseType: 'blob' });
            const blob = new Blob([response.data], { type: response.headers['content-type'] || 'image/jpeg' });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            const contentDisposition = response.headers['content-disposition'];
            let fileName = `design_${designId}.jpg`;
            if (contentDisposition) {
                const fileNameMatch = contentDisposition.match(/filename="?(.+?)"?$/);
                if (fileNameMatch && fileNameMatch[1]) fileName = fileNameMatch[1];
            }
            link.setAttribute('download', fileName);
            document.body.appendChild(link);
            link.click();
            setTimeout(() => {
                link.remove();
                window.URL.revokeObjectURL(url);
            }, 100);
        } catch (error) {
            console.error("Download failed:", error);
            alert("The original file could not be downloaded.");
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
            showAlert("Download failed.", 'error');
        }
    };

    const handleLogout = () => {
        sessionStorage.removeItem('user');
        onLogout();
    };

    const testers = accounts.filter(acc => acc.role === 'tester');
    const getWorkload = (id) => sections.filter(s => s.tester_id === id && s.current_status === 'In Testing').length;

    const designers = accounts.filter(acc => acc.role === 'designer');
    const getDesignerWorkload = (id) => sections.filter(s => s.designer_id === id && s.current_status === 'In Design').length;

    const calculateAvgTime = () => {
        const published = sections.filter(s => s.current_status === 'Published' && s.updated_at);
        if (published.length === 0) return "0 Days";
        const totalTime = published.reduce((acc, curr) => {
            const start = new Date(curr.created_at);
            const end = new Date(curr.updated_at);
            return acc + (end - start);
        }, 0);
        const avgDays = (totalTime / published.length / (1000 * 60 * 60 * 24)).toFixed(1);
        return `${avgDays} Days`;
    };

    const pipelineCount = sections.filter(s => s.current_status !== 'Published').length;
    const publishedCount = sections.filter(s => s.current_status === 'Published').length;
    const totalUsers = accounts.length;

    return (
        <div className="flex h-screen bg-slate-50 font-sans text-slate-900 overflow-hidden">
            <NotificationModal message={notification.message} type={notification.type} onClose={closeAlert} />
            <ConfirmationModal isOpen={confirmModal.isOpen} title={confirmModal.title} message={confirmModal.message} confirmText={confirmModal.confirmText} onConfirm={confirmModal.onConfirm} onCancel={closeConfirm} />

            {/* MOBILE OVERLAY */}
            {isSidebarOpen && (
                <div
                    className="fixed inset-0 bg-slate-900/50 z-90 lg:hidden"
                    onClick={() => setIsSidebarOpen(false)}
                />
            )}

            {/* SIDEBAR */}
            <aside className={`fixed lg:static inset-y-0 left-0 w-72 bg-slate-900 text-white flex flex-col shadow-xl shrink-0 z-100 transition-transform duration-300 transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
                <div className="p-8 text-2xl font-black italic flex items-center justify-between border-b border-slate-800">
                    <div className="flex items-center gap-3">
                        <FaUserShield className="text-blue-400 h-8 w-8" />
                        <span>Admin Panel</span>
                    </div>
                    <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden text-slate-400">
                        <FaTimes size={20} />
                    </button>
                </div>
                <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
                    {[
                        { id: 'home', label: 'Dashboard', icon: <FaHome /> },
                        { id: 'repository', label: 'Master Repo', icon: <FaFolderOpen /> },
                        { id: 'approval', label: 'Go-Live Review', icon: <FaCheckDouble /> },
                        { id: 'users', label: 'Permissions', icon: <FaUsers /> },
                    ].map(item => (
                        <button key={item.id} onClick={() => { setActiveTab(item.id); setIsSidebarOpen(false); }}
                            className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl font-bold transition-all cursor-pointer ${activeTab === item.id ? 'bg-blue-600 shadow-lg text-white' : 'hover:bg-slate-800 text-slate-400'}`}>
                            {item.icon} {item.label}
                        </button>
                    ))}
                </nav>
                <div className="p-4 border-t border-slate-800 bg-slate-900/40">
                    <div className="flex items-center gap-3 px-2 mb-4">
                        <FaUserCircle className="text-slate-500" size={30} />
                        <div className="overflow-hidden">
                <p className="text-base font-bold tracking-wider text-white truncate">{adminUser.username}</p>
                <p className="text-sm uppercase text-slate-500">{adminUser.role}</p>
              </div>
                    </div>
                    <button onClick={handleLogout} className="w-full rounded-xl bg-rose-500/10 py-3 text-[10px] font-black uppercase text-rose-500 transition-all hover:bg-rose-500 hover:text-white cursor-pointer">Logout</button>
                </div>
            </aside>

            {/* MAIN CONTENT */}
            <main className="flex-1 overflow-y-auto">
                {/* TOP MOBILE BAR */}
                <div className="lg:hidden flex items-center justify-between p-4 bg-white border-b sticky top-0 z-40">
                    <div className="flex items-center gap-2">
                        <FaUserShield className="text-blue-600 h-6 w-6" />
                        <span className="font-black italic text-lg uppercase">Admin</span>
                    </div>
                    <button onClick={() => setIsSidebarOpen(true)} className="p-2 bg-slate-100 rounded-lg text-slate-600">
                        <FaBars size={20} />
                    </button>
                </div>

                <div className="p-4 md:p-10 max-w-7xl mx-auto">
                    {loading ? (
                        <div className="h-[60vh] flex flex-col items-center justify-center text-center">
                            <FaSpinner className="animate-spin text-4xl text-blue-600 mb-4" />
                            <p className="font-bold text-slate-400 uppercase tracking-tighter">Syncing Core Systems...</p>
                        </div>
                    ) : (
                        <>
                            {activeTab === 'home' && (
                                <div className="space-y-6 md:space-y-10">
                                    <h1 className="text-3xl md:text-4xl font-black tracking-tight">System Overview</h1>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                                        <StatusTile label="In Pipeline" val={pipelineCount} icon={<FaChartLine className="text-blue-400" />} />
                                        <StatusTile label="Avg. Publish" val={calculateAvgTime()} icon={<FaClock className="text-amber-500" />} />
                                        <StatusTile label="Live Sections" val={publishedCount} icon={<FaCheckDouble className="text-emerald-500" />} />
                                        <StatusTile label="Total Users" val={totalUsers} icon={<FaUsers className="text-indigo-600" />} />
                                    </div>

                                    <div className="grid grid-cols-1 gap-6 md:gap-8">
                                        {/* Unassigned Queue */}
                                        <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-200 shadow-sm">
                                            <h3 className="font-black text-xl mb-6 flex items-center gap-2">
                                                <FaHourglassHalf className="text-amber-500" /> Unassigned Queue
                                            </h3>
                                            <div className="space-y-4">
                                                {sections.filter(s => s.current_status === 'Pending Allocation' && !s.tester_id).length > 0 ? (
                                                    sections.filter(s => s.current_status === 'Pending Allocation' && !s.tester_id).map(sec => (
                                                        <div key={sec.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 gap-4">
                                                            <div className="flex flex-col">
                                                                <span className="font-bold">{sec.title}</span>
                                                                <span className="text-[10px] text-amber-600 font-black uppercase tracking-tight">Awaiting Assignment</span>
                                                            </div>
                                                            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                                                                <select
                                                                    onChange={(e) => setSelectedTesters({ ...selectedTesters, [sec.id]: e.target.value })}
                                                                    className="bg-white border p-2 rounded-lg text-sm font-bold shadow-sm outline-none"
                                                                    defaultValue=""
                                                                >
                                                                    <option value="" disabled>Select Tester...</option>
                                                                    {testers.map(t => (
                                                                        <option key={t.id} value={t.id}>{t.username} (Load: {getWorkload(t.id)})</option>
                                                                    ))}                                                                </select>
                                                                <button
                                                                    onClick={() => handleAssignTester(sec.id, selectedTesters[sec.id])}
                                                                    disabled={!selectedTesters[sec.id]}
                                                                    className={`px-4 py-2 font-extrabold rounded-xl transition-all cursor-pointer text-sm ${selectedTesters[sec.id] ? "bg-blue-600 text-white hover:bg-blue-700 shadow-lg" : "bg-slate-200 text-slate-400 cursor-not-allowed"}`}
                                                                >
                                                                    Assign QA
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ))
                                                ) : <p className="text-slate-400 italic text-center py-8">Queue is clear.</p>}
                                            </div>
                                        </div>

                                        {/* Designer Allocation */}
                                        <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-200 shadow-sm">
                                            <h3 className="font-black text-xl mb-6 flex items-center gap-2">
                                                <FaPalette className="text-indigo-500" /> Designer Allocation
                                            </h3>
                                            <div className="space-y-4">
                                                {sections.filter(s => s.current_status === 'Pending Admin' && !s.designer_id).length > 0 ? (
                                                    sections.filter(s => s.current_status === 'Pending Admin' && !s.designer_id).map(sec => (
                                                        <div key={sec.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-indigo-50/30 rounded-2xl border border-indigo-100 gap-4">
                                                            <div className="flex flex-col">
                                                                <span className="font-bold text-slate-800">{sec.title}</span>
                                                                <span className="text-[10px] text-indigo-600 font-black uppercase tracking-tight">Passed by Tester</span>
                                                            </div>
                                                            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                                                                <select
                                                                    onChange={(e) => setSelectedDesigners({ ...selectedDesigners, [sec.id]: e.target.value })}
                                                                    className="bg-white border p-2 rounded-lg text-sm font-bold shadow-sm outline-none cursor-pointer hover:border-indigo-400 transition-colors"
                                                                    defaultValue=""
                                                                >
                                                                    <option value="" disabled>Allocate Designer...</option>
                                                                    {designers.map(d => (
                                                                        <option key={d.id} value={d.id}>{d.username} (Load: {getDesignerWorkload(d.id)})</option>
                                                                    ))}
                                                                </select>
                                                                <button
                                                                    onClick={() => handleAssignDesigner(sec.id, selectedDesigners[sec.id])}
                                                                    disabled={!selectedDesigners[sec.id]}
                                                                    className={`px-4 py-2 font-extrabold rounded-xl transition-all cursor-pointer text-sm ${selectedDesigners[sec.id] ? "bg-blue-600 text-white hover:bg-blue-700 shadow-lg" : "bg-slate-200 text-slate-400 cursor-not-allowed"}`}
                                                                >
                                                                    Assign Designer
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ))
                                                ) : <div className="text-center py-8"><p className="text-slate-400 italic">No tasks awaiting design allocation.</p></div>}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'repository' && (
                                <div className="space-y-8 animate-in fade-in duration-500">
                                    {/* Header Section */}
                                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                                        <div>
                                            <h2 className="text-3xl font-black tracking-tight text-slate-900">Master Asset Repository</h2>
                                            <p className="text-slate-500 font-medium text-sm mt-1">Manage, reassign, and publish production assets.</p>
                                        </div>

                                        <div className="flex flex-wrap items-center gap-3">
                                            <div className="relative group">
                                                <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                                                <input
                                                    type="text"
                                                    placeholder="Search assets..."
                                                    value={repoSearch}
                                                    onChange={(e) => setRepoSearch(e.target.value)}
                                                    className="pl-11 pr-4 py-2.5 bg-white border border-slate-200 rounded-2xl font-bold text-sm outline-none focus:ring-4 ring-blue-500/10 focus:border-blue-500 w-full sm:w-72 shadow-sm transition-all"
                                                />
                                            </div>
                                            <select className="bg-white border border-slate-200 px-4 py-2.5 rounded-2xl font-bold text-sm outline-none focus:ring-4 ring-blue-500/10 focus:border-blue-500 shadow-sm cursor-pointer text-slate-700" value={repoFilter} onChange={(e) => setRepoFilter(e.target.value)}>
                                                <option value="all">All Statuses</option>
                                                <option value="In Testing">In Testing</option>
                                                <option value="Ready for Store">Ready for Store</option>
                                                <option value="Published">Published</option>
                                                <option value="Issue Logged">Issue Logged</option>
                                                <option value="Rejected by Admin">Rejected by Admin</option>
                                            </select>
                                        </div>
                                    </div>

                                    {/* Table Container */}
                                    <div className="bg-white rounded-4xl shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-left border-collapse">
                                                <thead>
                                                    <tr className="bg-slate-50/50 border-b border-slate-100">
                                                        <th className="px-8 py-5 text-[11px] uppercase tracking-widest font-black text-slate-400">Asset Identity</th>
                                                        <th className="px-6 py-5 text-[11px] uppercase tracking-widest font-black text-slate-400">Content Details</th>
                                                        <th className="px-6 py-5 text-[11px] uppercase tracking-widest font-black text-slate-400">Current Status</th>
                                                        <th className="px-8 py-5 text-[11px] uppercase tracking-widest font-black text-slate-400 text-right">Management</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-50">
                                                    {sections
                                                        .filter(sec => repoFilter === 'all' || sec.current_status === repoFilter)
                                                        .filter(sec => sec.title.toLowerCase().includes(repoSearch.toLowerCase()))
                                                        .map(sec => (
                                                            <tr key={sec.id} className="hover:bg-blue-50/30 transition-all group">
                                                                <td className="px-8 py-6">
                                                                    <span className="px-3 py-1 bg-slate-100 rounded-lg text-[11px] font-black text-slate-500 tracking-tighter">
                                                                        SEC-{sec.id}
                                                                    </span>
                                                                </td>
                                                                <td className="px-6 py-6">
                                                                    <div className="font-extrabold text-slate-800 text-base mb-1.5 group-hover:text-blue-700 transition-colors">
                                                                        {sec.title}
                                                                    </div>
                                                                    <div className="flex flex-wrap gap-1.5">
                                                                        {sec.tester_id && (
                                                                            <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[10px] font-bold uppercase ring-1 ring-inset ring-slate-200">
                                                                                QA: {accounts.find(a => a.id === sec.tester_id)?.username || 'N/A'}
                                                                            </span>
                                                                        )}
                                                                        {sec.designer_id && (
                                                                            <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-600 text-[10px] font-bold uppercase ring-1 ring-inset ring-indigo-100">
                                                                                Design: {accounts.find(a => a.id === sec.designer_id)?.username || 'N/A'}
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                </td>
                                                                <td className="px-6 py-6">
                                                                    <StatusBadge status={sec.current_status} />
                                                                </td>
                                                                <td className="px-8 py-6">
                                                                    <div className="flex justify-end items-center gap-3">

                                                                        {/* Reassignment Controls */}
                                                                        <div className="flex items-center gap-2">
                                                                            {sec.current_status === 'In Testing' && (
                                                                                <div className="flex items-center bg-white p-1 rounded-xl border border-amber-200 shadow-sm ring-4 ring-amber-50">
                                                                                    <select
                                                                                        onChange={(e) => setSelectedTesters({ ...selectedTesters, [sec.id]: e.target.value })}
                                                                                        className="bg-transparent pl-2 text-[10px] font-black uppercase outline-none cursor-pointer text-amber-700 min-w-28"
                                                                                        defaultValue=""
                                                                                    >
                                                                                        <option value="" disabled>Reassign QA</option>
                                                                                        {testers.map(t => (
                                                                                            <option key={t.id} value={t.id}>{t.username} ({getWorkload(t.id)})</option>
                                                                                        ))}
                                                                                    </select>
                                                                                    <button
                                                                                        onClick={() => handleAssignTester(sec.id, selectedTesters[sec.id])}
                                                                                        disabled={!selectedTesters[sec.id]}
                                                                                        className={`ml-1 p-1.5 rounded-lg transition-all ${selectedTesters[sec.id] ? 'bg-amber-600 text-white hover:scale-105' : 'text-slate-300'}`}
                                                                                    >
                                                                                        <FaCheck className='text-sm text-amber-600' />
                                                                                    </button>
                                                                                </div>
                                                                            )}

                                                                            {(sec.current_status === 'In Design' || sec.current_status === 'Pending Admin') && (
                                                                                <div className="flex items-center bg-white p-1 rounded-xl border border-indigo-200 shadow-sm ring-4 ring-indigo-50">
                                                                                    <select onChange={(e) => setSelectedDesigners({ ...selectedDesigners, [sec.id]: e.target.value })} className="bg-transparent pl-2 text-[10px] font-black uppercase outline-none cursor-pointer text-indigo-700 min-w-28" defaultValue="">
                                                                                        <option value="" disabled>Reassign Design</option>
                                                                                        {designers.map(d => (
                                                                                            <option key={d.id} value={d.id}>{d.username} ({getDesignerWorkload(d.id)})</option>
                                                                                        ))}
                                                                                    </select>
                                                                                    <button onClick={() => handleAssignDesigner(sec.id, selectedDesigners[sec.id])} disabled={!selectedDesigners[sec.id]} className={`ml-1 p-1.5 rounded-lg transition-all ${selectedTesters[sec.id] ? 'bg-indigo-600 text-white hover:scale-105' : 'text-slate-300'}`}>
                                                                                        <FaCheck className='text-sm text-indigo-600' />
                                                                                    </button>
                                                                                </div>
                                                                            )}
                                                                        </div>

                                                                        {/* Final Actions */}
                                                                        <div className="flex items-center gap-2 pl-3">
                                                                            {sec.current_status === 'Ready for Store' && (
                                                                                <>
                                                                                    <button onClick={() => handleStatusUpdate(sec.id, 'Published')} className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl font-bold tracking-tight text-xs transition-transform active:scale-95 shadow-md shadow-emerald-200/50">Publish</button>
                                                                                    <button onClick={() => handleRejectAssets(sec.id)} className="bg-rose-50 hover:bg-rose-100 text-rose-600 px-3 py-2 rounded-xl font-bold text-xs transition-colors">Reject</button>
                                                                                </>
                                                                            )}
                                                                            <button onClick={() => openAssetsViewer(sec)} className="p-2.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all" title="View Assets"><FaEye /></button>
                                                                            <button onClick={() => handleDownload(sec.id, sec.title)} className="p-2.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all" title="Download ZIP"><FaDownload /></button>
                                                                        </div>
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'approval' && (
                                <div className="space-y-6">
                                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                        <h2 className="text-3xl font-black">Go-Live Module</h2>
                                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                                            <div className="relative flex items-center">
                                                <FaSearch className="absolute left-4 text-slate-400 text-sm" />
                                                <input type="text" placeholder="Search by title..." value={approvalSearch} onChange={(e) => setApprovalSearch(e.target.value)} className="pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl font-bold text-sm outline-none focus:ring-2 ring-blue-500 w-full sm:w-64 shadow-sm cursor-pointer" />
                                            </div>
                                            <select className="bg-white border border-slate-200 px-4 py-2 rounded-xl font-bold text-sm outline-none focus:ring-2 ring-blue-500 shadow-sm cursor-pointer" value={approvalFilter} onChange={(e) => setApprovalFilter(e.target.value)}>
                                                <option value="all">All Statuses</option>
                                                <option value="Ready for Store">Ready for Store</option>
                                                <option value="Published">Published</option>
                                                <option value="Issue Logged">Issue Logged</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div className="grid gap-4 md:gap-6">
                                        {sections
                                            .filter(sec => ['Ready for Store', 'Published', 'Issue Logged'].includes(sec.current_status))
                                            .filter(sec => approvalFilter === 'all' || sec.current_status === approvalFilter)
                                            .filter(sec => sec.title.toLowerCase().includes(approvalSearch.toLowerCase()))
                                            .map(sec => (
                                                <div key={sec.id} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 transition-all hover:shadow-md">
                                                    <div>
                                                        <h3 className="text-xl font-black">{sec.title}</h3>
                                                        <div className="mt-1"><StatusBadge status={sec.current_status} /></div>
                                                    </div>
                                                    <div className="flex w-full sm:w-auto gap-3">
                                                        {sec.current_status === 'Published' ? (
                                                            <button onClick={() => handleStatusUpdate(sec.id, 'Issue Logged')} className="w-full sm:w-auto bg-rose-100 text-rose-600 px-4 py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-rose-200 transition-colors cursor-pointer text-sm"><FaUndo /> Rollback</button>
                                                        ) : sec.current_status === 'Issue Logged' ? (
                                                            <span className="w-full sm:w-auto text-center bg-rose-50 text-rose-500 px-4 py-3 rounded-xl font-black text-xs border border-rose-100 uppercase">ROLLED BACK</span>
                                                        ) : (
                                                            <button onClick={() => handleStatusUpdate(sec.id, 'Published')} className="w-full sm:w-auto bg-emerald-600 text-white px-6 py-3 rounded-xl font-black flex items-center justify-center gap-2 hover:bg-emerald-700 shadow-lg shadow-emerald-100 transition-all cursor-pointer"><FaRocket /> Publish</button>
                                                        )}
                                                    </div>
                                                </div>
                                            ))
                                        }
                                    </div>
                                </div>
                            )}

                            {activeTab === 'users' && (
                                <div className="space-y-6">
                                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                                        <h2 className="text-2xl md:text-3xl font-extrabold">User Permissions</h2>
                                        <button onClick={openCreateModal} className="w-full sm:w-auto bg-blue-600 text-white px-6 py-3 rounded-2xl font-bold flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-blue-100"><FaPlus /> Create Member</button>
                                    </div>
                                    <div className="bg-white rounded-3xl border border-slate-200 overflow-x-auto shadow-sm">
                                        <table className="w-full text-left min-w-150">
                                            <thead className="bg-slate-50 text-[10px] font-black uppercase text-slate-400">
                                                <tr>
                                                    <th className="px-6 py-4">User_ID</th>
                                                    <th className="px-6 py-4">User_Name</th>
                                                    <th className="px-6 py-4">Role</th>
                                                    <th className="px-6 py-4 text-right">Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100">
                                                {accounts.map(acc => (
                                                    <tr key={acc.id} className="hover:bg-slate-50 transition-colors">
                                                        <td className="px-6 py-4 font-bold text-slate-500">{acc.id}</td>
                                                        <td className="px-6 py-4 font-bold">
                                                            <div className="truncate max-w-50">{acc.username}</div>
                                                            <span className="text-slate-400 font-medium text-xs">{acc.email}</span>
                                                        </td>
                                                        <td className="px-6 py-4 font-bold text-[10px] text-indigo-600 uppercase">{acc.role}</td>
                                                        <td className="px-6 py-4 text-right">
                                                            <div className="flex justify-end gap-6 md:gap-10">
                                                                <button onClick={() => openEditModal(acc)} className="text-blue-500 hover:text-blue-700 transition-colors cursor-pointer" title="Edit User Role"><FaEdit size={18} /></button>
                                                                <button onClick={() => handleDeleteAccount(acc.id)} className="text-rose-400 hover:text-rose-600 transition-colors cursor-pointer" title="Delete User"><FaTrash size={16} /></button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </main>

            {/* ASSETS VIEWER MODAL - Responsive tweaks */}
            {isAssetsModalOpen && selectedSection && (
                <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-120 flex items-center justify-center p-4">
                    <div className="bg-white rounded-4xl md:rounded-[2.5rem] w-full max-w-6xl h-[90vh] md:h-[85vh] flex flex-col shadow-2xl overflow-hidden border border-white/20">
                        <div className="p-6 md:p-8 border-b flex justify-between items-start bg-slate-50">
                            <div className="flex-1 min-w-0">
                                <h3 className="text-xl md:text-3xl font-black text-slate-900 truncate">{selectedSection.title}</h3>
                                <div className="flex flex-wrap items-center gap-3 mt-2">
                                    <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Creative Assets</p>
                                    <div className="flex gap-2">
                                        {selectedSection.live_link && (
                                            <a href={selectedSection.live_link} target="_blank" rel="noreferrer" className="text-xs tracking-wider font-medium bg-slate-900 text-white px-2 py-1 rounded-full hover:bg-blue-600 transition-colors">PREVIEW LINK</a>
                                        )}
                                        {selectedSection.shopify_admin_link && (
                                            <a href={selectedSection.shopify_admin_link} target="_blank" rel="noreferrer" className="text-xs tracking-wider font-medium bg-[#95BF47] text-white px-2 py-1 rounded-full hover:opacity-90">SHOPIFY ADMIN LINK</a>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <button onClick={() => setIsAssetsModalOpen(false)} className="ml-4 bg-white border p-3 rounded-full hover:bg-rose-50 transition-all text-slate-400 hover:text-rose-600"><FaTimes /></button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 md:p-10 bg-slate-100/30">
                            {assetsLoading ? (
                                <div className="h-full flex flex-col items-center justify-center"><FaSpinner className="animate-spin text-3xl text-blue-600" /></div>
                            ) : sectionDesigns.length > 0 ? (
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-8">
                                    {sectionDesigns.map((design) => (
                                        <div key={design.id} className="group bg-white p-4 rounded-3xl md:rounded-4xl shadow-sm border border-slate-200 hover:shadow-xl transition-all">
                                            <div className="rounded-2xl md:rounded-3xl overflow-hidden bg-slate-200 relative aspect-square flex items-center justify-center">
                                                <img src={design.image_url} alt={design.image_type} className="max-w-full max-h-full object-contain" />
                                            </div>
                                            <div className="mt-4 md:mt-6 flex justify-between items-center px-2">
                                                <div className="min-w-0">
                                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter truncate">{design.image_type}</p>
                                                    <p className="font-bold text-slate-700">#{design.id}</p>
                                                </div>
                                                <button onClick={() => downloadDesignImage(design.id)} className="bg-slate-900 text-white p-3 rounded-xl md:rounded-2xl hover:bg-blue-600 transition-all shadow-lg cursor-pointer shrink-0"><FaDownload /></button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center text-slate-300">
                                    <FaRegImage className="text-6xl md:text-8xl mb-4 opacity-20" />
                                    <p className="font-black uppercase tracking-widest text-sm">No creative assets found</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* CREATE / EDIT USER MODAL - Responsive tweaks */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-120 flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden">
                        <div className="p-6 border-b flex justify-between items-center bg-slate-50">
                            <h3 className="text-xl font-black italic text-slate-800 truncate pr-4">
                                {isEditMode ? `Edit: ${formData.username}` : "New Member"}
                            </h3>
                            <button onClick={() => { setIsModalOpen(false); setIsEditMode(false); }} className="text-slate-400 hover:text-slate-600 cursor-pointer shrink-0"><FaTimes /></button>
                        </div>
                        <form onSubmit={handleSubmitAccount} className="p-6 md:p-8 space-y-4">
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Username</label>
                                <input required className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 outline-none focus:ring-2 ring-blue-500 font-bold" placeholder="Username" value={formData.username} onChange={(e) => setFormData({ ...formData, username: e.target.value })} />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Email</label>
                                <input type="email" required className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 outline-none focus:ring-2 ring-blue-500 font-bold" placeholder="Email Address" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Password {isEditMode && '(Optional)'}</label>
                                <input type="password" required={!isEditMode} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 outline-none focus:ring-2 ring-blue-500 font-bold" placeholder={isEditMode ? "••••••••" : "Set Password"} value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase ml-1">System Role</label>
                                <select className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-bold cursor-pointer" value={formData.role} onChange={(e) => setFormData({ ...formData, role: e.target.value })}>
                                    <option value="creator">Creator (Dev)</option>
                                    <option value="tester">Tester (QA Lab)</option>
                                    <option value="designer">Designer (Studio)</option>
                                    <option value="admin">Super Admin</option>
                                </select>
                            </div>
                            <button type="submit" className="w-full bg-blue-600 text-white py-4 rounded-2xl font-bold shadow-lg shadow-blue-200 mt-4 uppercase tracking-widest cursor-pointer active:scale-[0.98] transition-transform">{isEditMode ? "Save Changes" : "Authorize User"}</button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

function StatusTile({ label, val, icon }) {
    return (
        <div className="bg-white p-5 md:p-6 rounded-3xl border border-slate-200 shadow-sm transition-transform hover:scale-[1.02]">
            <p className="text-slate-500 text-sm md:text-xs font-bold uppercase tracking-wider">{label}</p>
            <div className="flex items-end justify-between mt-1">
                <span className="text-2xl md:text-3xl font-extrabold text-slate-900 truncate">{val}</span>
                <div className="text-xl mb-1 shrink-0">{icon}</div>
            </div>
        </div>
    );
}