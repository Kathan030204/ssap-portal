import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import {
    FaRocket, FaFolderOpen, FaCheckDouble, FaUsers, FaHome,
    FaHourglassHalf, FaPlus, FaTimes, FaTrash, FaCheck,
    FaDownload, FaSpinner, FaUndo,
    FaDesktop,
    FaMobileAlt,
    FaChartLine, FaTrophy, FaClock,
    FaSignOutAlt, FaUserShield, FaEye, FaRegImage
} from 'react-icons/fa';

const api = axios.create({ baseURL: 'http://localhost:8000/api' });

export function Admin({ onLogout }) {
    const [activeTab, setActiveTab] = useState('home');
    const [accounts, setAccounts] = useState([]);
    const [sections, setSections] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);

    // ASSETS VIEWER STATES
    const [isAssetsModalOpen, setIsAssetsModalOpen] = useState(false);
    const [selectedSection, setSelectedSection] = useState(null);
    const [sectionDesigns, setSectionDesigns] = useState([]); 
    const [assetsLoading, setAssetsLoading] = useState(false);

    const [formData, setFormData] = useState({ username: '', email: '', password: '', role: 'creator' });
    const [adminUser, setAdminUser] = useState({ username: 'Administrator', role: 'Super Admin' });

    // --- 1. MEMOIZED DATA FETCHING ---
    const fetchInitialData = useCallback(async () => {
        setLoading(true);
        try {
            const [accRes, secRes] = await Promise.all([
                api.get('/accounts'),
                api.get('/sections'),
            ]);
            setAccounts(accRes.data);
            setSections(secRes.data);
        } catch (err) {
            console.error("Sync Error:", err);
        } finally {
            setLoading(false);
        }
    }, []);

    // --- 2. SESSION & INITIALIZATION ---
    useEffect(() => {
        // CRITICAL FIX: Changed from localStorage to sessionStorage
        const storedUser = sessionStorage.getItem('user');
        if (storedUser) {
            const savedUser = JSON.parse(storedUser);
            setAdminUser({
                username: savedUser.username || savedUser.name || "Admin",
                role: savedUser.role || "Super Admin"
            });
            fetchInitialData();
        } else {
            // Force logout if no session exists
            onLogout();
        }
    }, [fetchInitialData, onLogout]);

    // --- 3. ASSET VIEWER LOGIC ---
    const openAssetsViewer = async (section) => {
        setSelectedSection(section);
        setIsAssetsModalOpen(true);
        setAssetsLoading(true);
        try {
            const response = await api.get('/design');
            const filtered = response.data.filter(d => d.section_id === section.id);
            setSectionDesigns(filtered);
        } catch (error) {
            console.error("Error loading assets:", error);
        } finally {
            setAssetsLoading(false);
        }
    };

    const downloadDesignImage = (imageUrl, imageType, designId) => {
        const link = document.createElement('a');
        link.href = imageUrl;
        const fileName = `${imageType.toLowerCase().replace(/\s+/g, '_')}_${designId}.png`;
        link.setAttribute('download', fileName);
        link.setAttribute('target', '_blank');
        document.body.appendChild(link);
        link.click();
        link.remove();
    };

    const handleLogout = () => {
        sessionStorage.removeItem('user'); // Changed to sessionStorage
        onLogout();
    };

    const handleAssignTester = async (sectionId, testerId) => {
        if (!testerId) return;
        try {
            await api.put(`/sections/${sectionId}`, {
                tester_id: testerId,
                current_status: 'In Testing'
            });
            alert("Tester assigned successfully.");
            fetchInitialData();
        } catch { alert("Assignment failed."); }
    };

    const handleStatusUpdate = async (id, newStatus) => {
        const isRollback = newStatus === 'Issue Logged';
        const msg = isRollback ? "Rollback section? This will pull it from the live view." : "Push to LIVE?";
        if (!window.confirm(msg)) return;

        try {
            const payload = isRollback
                ? { current_status: newStatus, tester_id: null }
                : { current_status: newStatus };

            await api.put(`/sections/${id}`, payload);
            fetchInitialData();
        } catch {
            alert("Update failed.");
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

    const handleCreateAccount = async (e) => {
        e.preventDefault();
        try {
            await api.post('/accounts', formData);
            setIsModalOpen(false);
            setFormData({ username: '', email: '', password: '', role: 'creator' });
            fetchInitialData();
        } catch { alert("Error creating account."); }
    };

    const handleDeleteAccount = async (id) => {
        if (!window.confirm("Delete this user permanently?")) return;
        try {
            await api.delete(`/accounts/${id}`);
            fetchInitialData();
        } catch { alert("Delete failed."); }
    };

    // --- DATA AGGREGATION ---
    const testers = accounts.filter(acc => acc.role === 'tester');
    const getWorkload = (id) => sections.filter(s => s.tester_id === id && s.current_status === 'In Testing').length;
    
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
        <div className="flex h-screen bg-slate-50 font-sans text-slate-900">
            {/* SIDEBAR */}
            <aside className="w-72 bg-slate-900 text-white flex flex-col shadow-xl shrink-0">
                <div className="p-8 text-2xl font-black italic flex items-center gap-3 border-b border-slate-800">
                    <FaUserShield className="text-blue-400 h-8 w-8" />
                    <span>Admin Panel</span>
                </div>

                <nav className="flex-1 px-4 py-6 space-y-2">
                    {[
                        { id: 'home', label: 'Dashboard', icon: <FaHome /> },
                        { id: 'repository', label: 'Master Repo', icon: <FaFolderOpen /> },
                        { id: 'approval', label: 'Go-Live Review', icon: <FaCheckDouble /> },
                        { id: 'users', label: 'Permissions', icon: <FaUsers /> },
                    ].map(item => (
                        <button key={item.id} onClick={() => setActiveTab(item.id)}
                            className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl font-bold transition-all ${activeTab === item.id ? 'bg-blue-600 shadow-lg text-white' : 'hover:bg-slate-800 text-slate-400'}`}>
                            {item.icon} {item.label}
                        </button>
                    ))}
                </nav>

                <div className="p-4 border-t border-slate-800 bg-slate-900/40">
                    <div className="flex items-center gap-3 px-2 mb-4">
                        <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400 border border-blue-500/30 font-black">
                            {adminUser.username.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex flex-col overflow-hidden">
                            <span className="font-black text-sm truncate uppercase tracking-wider">{adminUser.username}</span>
                            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-tighter">{adminUser.role}</span>
                        </div>
                    </div>
                    <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl font-black text-xs text-rose-400 hover:bg-rose-500/10 transition-all border border-transparent hover:border-rose-500/20 uppercase tracking-widest">
                        <FaSignOutAlt /> LOGOUT SESSION
                    </button>
                </div>
            </aside>

            {/* MAIN CONTENT */}
            <main className="flex-1 overflow-y-auto p-10">
                {loading ? (
                    <div className="h-full flex flex-col items-center justify-center text-center">
                        <FaSpinner className="animate-spin text-4xl text-blue-600 mb-4" />
                        <p className="font-bold text-slate-400 uppercase tracking-tighter">Syncing Core Systems...</p>
                    </div>
                ) : (
                    <>
                        {activeTab === 'home' && (
                            <div className="space-y-10">
                                <h1 className="text-4xl font-black tracking-tight">System Overview</h1>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                    <StatusTile label="In Pipeline" val={pipelineCount} icon={<FaChartLine className="text-blue-400" />} />
                                    <StatusTile label="Avg. Publish" val={calculateAvgTime()} icon={<FaClock className="text-amber-500" />} />
                                    <StatusTile label="Live Sections" val={publishedCount} icon={<FaCheckDouble className="text-emerald-500" />} />
                                    <StatusTile label="Total Users" val={totalUsers} icon={<FaUsers className="text-indigo-600" />} />
                                </div>

                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                    <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
                                        <h3 className="font-black text-xl mb-6 flex items-center gap-2">
                                            <FaHourglassHalf className="text-amber-500" /> Unassigned Queue
                                        </h3>
                                        <div className="space-y-4">
                                            {sections.filter(s => s.current_status === 'In Testing' && !s.tester_id).length > 0 ? (
                                                sections.filter(s => s.current_status === 'In Testing' && !s.tester_id).map(sec => (
                                                    <div key={sec.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                                        <div className="flex flex-col">
                                                            <span className="font-bold">{sec.title}</span>
                                                            <span className="text-[10px] text-amber-600 font-black uppercase tracking-tight">Awaiting Assignment</span>
                                                        </div>
                                                        <select
                                                            onChange={(e) => handleAssignTester(sec.id, e.target.value)}
                                                            className="bg-white border p-2 rounded-lg text-sm font-bold shadow-sm outline-none"
                                                            defaultValue=""
                                                        >
                                                            <option value="" disabled>Assign Tester...</option>
                                                            {testers.map(t => (
                                                                <option key={t.id} value={t.id}>{t.username} (Load: {getWorkload(t.id)})</option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                ))
                                            ) : <p className="text-slate-400 italic text-center py-8">Queue is clear.</p>}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'repository' && (
                            <div className="space-y-6">
                                <h2 className="text-3xl font-black">Master Asset Repository</h2>
                                <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
                                    <table className="w-full text-left">
                                        <thead className="bg-slate-900 text-[10px] uppercase font-black text-slate-400">
                                            <tr>
                                                <th className="px-6 py-4">Asset ID</th>
                                                <th className="px-6 py-4">Title</th>
                                                <th className="px-6 py-4">Status</th>
                                                <th className="px-6 py-4 text-right">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {sections.map(sec => (
                                                <tr key={sec.id} className="hover:bg-slate-50 transition-colors">
                                                    <td className="px-6 py-4 text-xs font-mono text-slate-400 uppercase">SEC-{sec.id}</td>
                                                    <td className="px-6 py-4 font-bold">{sec.title}</td>
                                                    <td className="px-6 py-4">
                                                        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${sec.current_status === 'Published' ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'}`}>
                                                            {sec.current_status}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-right flex justify-end gap-2">
                                                        <button onClick={() => openAssetsViewer(sec)} className="flex items-center gap-2 bg-indigo-50 text-indigo-600 px-3 py-2 rounded-xl font-black text-xs hover:bg-indigo-100 transition-all">
                                                            <FaEye /> VIEW ASSETS
                                                        </button>
                                                        <button onClick={() => handleDownload(sec.id, sec.title)} className="p-3 text-blue-600 hover:bg-blue-50 rounded-xl">
                                                            <FaDownload />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {activeTab === 'approval' && (
                            <div className="space-y-6">
                                <h2 className="text-3xl font-black">Go-Live Module</h2>
                                <div className="grid gap-6">
                                    {sections.filter(sec => ['Ready for Store', 'Published', 'Issue Logged'].includes(sec.current_status)).length > 0 ? (
                                        sections.filter(sec => ['Ready for Store', 'Published', 'Issue Logged'].includes(sec.current_status)).map(sec => (
                                            <div key={sec.id} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex justify-between items-center">
                                                <div>
                                                    <h3 className="text-xl font-black">{sec.title}</h3>
                                                    <p className={`text-xs font-bold uppercase ${sec.current_status === 'Issue Logged' ? 'text-rose-500' : 'text-indigo-500'}`}>
                                                        {sec.current_status}
                                                    </p>
                                                </div>
                                                <div className="flex gap-3">
                                                    {sec.current_status === 'Published' ? (
                                                        <button onClick={() => handleStatusUpdate(sec.id, 'Issue Logged')} className="bg-rose-100 text-rose-600 px-4 py-2 rounded-xl font-bold flex items-center gap-2">
                                                            <FaUndo /> Emergency Rollback
                                                        </button>
                                                    ) : sec.current_status === 'Issue Logged' ? (
                                                        <span className="bg-rose-50 text-rose-500 px-4 py-2 rounded-xl font-black text-xs">ROLLED BACK</span>
                                                    ) : (
                                                        <button onClick={() => handleStatusUpdate(sec.id, 'Published')} className="bg-emerald-600 text-white px-6 py-3 rounded-xl font-black flex items-center gap-2">
                                                            <FaRocket /> Publish to Store
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        ))
                                    ) : <div className="p-20 text-center text-slate-400 bg-white rounded-3xl border-2 border-dashed">No deployments pending.</div>}
                                </div>
                            </div>
                        )}

                        {activeTab === 'users' && (
                            <div className="space-y-6">
                                <div className="flex justify-between items-center">
                                    <h2 className="text-3xl font-black">User & Role Permissions</h2>
                                    <button onClick={() => setIsModalOpen(true)} className="bg-blue-600 text-white px-6 py-3 rounded-2xl font-black flex items-center gap-2"><FaPlus /> Create Member</button>
                                </div>
                                <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
                                    <table className="w-full text-left">
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
                                                    <td className="px-6 py-4 font-black">{acc.username}</td>
                                                    <td className="px-6 py-4 font-black text-[10px] text-indigo-600 uppercase">{acc.role}</td>
                                                    <td className="px-6 py-4 text-right">
                                                        <button onClick={() => handleDeleteAccount(acc.id)} className="text-rose-400 hover:text-rose-600"><FaTrash /></button>
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
            </main>

            {/* ASSETS VIEWER MODAL */}
            {isAssetsModalOpen && selectedSection && (
                <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-50 flex items-center justify-center p-6">
                    <div className="bg-white rounded-[2.5rem] w-full max-w-6xl h-[85vh] flex flex-col shadow-2xl overflow-hidden border border-white/20">
                        <div className="p-8 border-b flex justify-between items-center bg-slate-50">
                            <div>
                                <h3 className="text-3xl font-black text-slate-900">{selectedSection.title}</h3>
                                <p className="text-xs font-black text-blue-600 uppercase tracking-widest mt-1">Design Proofs & Creative Assets</p>
                            </div>
                            <button onClick={() => setIsAssetsModalOpen(false)} className="bg-white border p-4 rounded-full hover:bg-rose-50 transition-all text-slate-400 hover:text-rose-600">
                                <FaTimes />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-10 bg-slate-100/30">
                            {assetsLoading ? (
                                <div className="h-full flex flex-col items-center justify-center">
                                    <FaSpinner className="animate-spin text-3xl text-blue-600" />
                                </div>
                            ) : sectionDesigns.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                                    {sectionDesigns.map((design) => (
                                        <div key={design.id} className="group bg-white p-4 rounded-4xl shadow-sm border border-slate-200 hover:shadow-xl transition-all">
                                            <div className="rounded-3xl overflow-hidden bg-slate-200 relative aspect-square flex items-center justify-center">
                                                <img
                                                    src={design.image_url}
                                                    alt={design.image_type}
                                                    className="max-w-full max-h-full object-contain"
                                                    onError={(e) => { e.target.src = "https://placehold.co/400?text=Design+Not+Found"; }}
                                                />
                                            </div>
                                            <div className="mt-6 flex justify-between items-center px-2">
                                                <div>
                                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">{design.image_type}</p>
                                                    <p className="font-bold text-slate-700">Design #{design.id}</p>
                                                </div>
                                                <button
                                                    onClick={() => downloadDesignImage(design.image_url, design.image_type, design.id)}
                                                    className="bg-slate-900 text-white p-3 rounded-2xl hover:bg-blue-600 transition-all shadow-lg"
                                                >
                                                    <FaDownload />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center text-slate-300">
                                    <FaRegImage className="text-8xl mb-4 opacity-20" />
                                    <p className="font-black uppercase tracking-widest text-sm">No creative assets found</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* CREATE USER MODAL */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden">
                        <div className="p-6 border-b flex justify-between items-center bg-slate-50">
                            <h3 className="text-xl font-black italic text-slate-800">New Member Access</h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600"><FaTimes /></button>
                        </div>
                        <form onSubmit={handleCreateAccount} className="p-8 space-y-4">
                            <input required className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 outline-none focus:ring-2 ring-blue-500 font-bold" placeholder="Username" onChange={(e) => setFormData({ ...formData, username: e.target.value })} />
                            <input type="email" required className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 outline-none focus:ring-2 ring-blue-500 font-bold" placeholder="Email Address" onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
                            <input type="password" required className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 outline-none focus:ring-2 ring-blue-500 font-bold" placeholder="Set Password" onChange={(e) => setFormData({ ...formData, password: e.target.value })} />
                            <select className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-bold" onChange={(e) => setFormData({ ...formData, role: e.target.value })}>
                                <option value="creator">Creator (Dev)</option>
                                <option value="tester">Tester (QA Lab)</option>
                                <option value="designer">Designer (Studio)</option>
                                <option value="admin">Super Admin</option>
                            </select>
                            <button type="submit" className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black shadow-lg shadow-blue-200 mt-4 uppercase tracking-widest">Authorize User</button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

// Internal Helper Component for Stats
function StatusTile({ label, val, icon }) {
    return (
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm transition-transform hover:scale-[1.02]">
            <p className="text-slate-400 text-xs font-black uppercase tracking-wider">{label}</p>
            <div className="flex items-end justify-between mt-1">
                <span className="text-3xl font-black text-slate-900">{val}</span>
                <div className="text-xl mb-1">{icon}</div>
            </div>
        </div>
    );
}