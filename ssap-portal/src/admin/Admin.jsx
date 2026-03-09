import { useState, useEffect } from 'react';
import axios from 'axios';
import {
    FaRocket, FaFolderOpen, FaCheckDouble, FaUsers, FaHome,
    FaHourglassHalf, FaPlus, FaTimes, FaTrash, FaCheck,
    FaDownload, FaSpinner, FaUndo,
    FaDesktop,
    FaMobileAlt,
    FaChartLine, FaTrophy, FaClock,
    FaSignOutAlt, FaUserShield
} from 'react-icons/fa';

const api = axios.create({ baseURL: 'http://localhost:8000/api' });

export function Admin({ onLogout }) {
    const [activeTab, setActiveTab] = useState('home');
    const [accounts, setAccounts] = useState([]);
    const [sections, setSections] = useState([]);
    const [loading, setLoading] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [formData, setFormData] = useState({ username: '', email: '', password: '', role: 'creator' });

    // State for the currently logged in admin
    const [adminName, setAdminName] = useState("Administrator");

    useEffect(() => {
        // Retrieve logged in user from localStorage
        const savedUser = JSON.parse(localStorage.getItem('user'));
        if (savedUser && savedUser.username) {
            setAdminName(savedUser.username);
        }
        fetchInitialData();
    }, []);

    const fetchInitialData = async () => {
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
    };

    // --- Logout Handler ---
    const handleLogout = () => {
        // Confirmation removed - now logs out immediately
        localStorage.removeItem('user');
        onLogout();
    };

    // --- Dashboard Calculations ---
    const pipelineCount = sections.filter(s => s.current_status !== 'Published').length;
    const publishedCount = sections.filter(s => s.current_status === 'Published').length;
    const totalUsers = accounts.length;

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

    {/*const getLeaderboard = () => {
        const creators = accounts.filter(a => a.role === 'creator');
        const board = creators.map(user => {
            const cleanPasses = sections.filter(s =>
                s.user_id === user.id &&
                s.current_status === 'Published' &&
                (!s.rejection_count || s.rejection_count === 0)
            ).length;
            return { username: user.username, count: cleanPasses };
        });
        return board.sort((a, b) => b.count - a.count).slice(0, 5);
    };*/}

    // --- Action Handlers ---
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
        const msg = newStatus === 'Published' ? "Push to LIVE?" : "Rollback section?";
        if (!window.confirm(msg)) return;
        try {
            await api.put(`/sections/${id}`, { current_status: newStatus });
            fetchInitialData();
        } catch { alert("Update failed."); }
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

    const handleDownload = async (fileName) => {
        try {
            const response = await api.get(`/sections`, { responseType: 'blob' });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', fileName || 'asset.zip');
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch { alert("Download failed."); }
    };

    const testers = accounts.filter(acc => acc.role === 'tester');
    const getWorkload = (id) => sections.filter(s => s.tester_id === id && s.current_status === 'In Testing').length;

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

                {/* LOGGED IN USER & LOGOUT */}
                <div className="p-4 border-t border-slate-800 bg-slate-900/40">
                    <div className="flex items-center gap-3 px-2 mb-4">
                        <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400 border border-blue-500/30 font-black">
                            {adminName.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex flex-col overflow-hidden">
                            <span className="font-black text-sm truncate uppercase tracking-wider">{adminName}</span>
                            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-tighter">Super Admin</span>
                        </div>
                    </div>
                    <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl font-black text-xs text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 transition-all border border-transparent hover:border-rose-500/20"
                    >
                        <FaSignOutAlt /> LOGOUT SESSION
                    </button>
                </div>
            </aside>

            {/* MAIN CONTENT */}
            <main className="flex-1 overflow-y-auto p-10">
                {loading ? (
                    <div className="h-full flex flex-col items-center justify-center">
                        <FaSpinner className="animate-spin text-4xl text-blue-600 mb-4" />
                        <p className="font-bold text-slate-400 uppercase tracking-tighter">Syncing Core Systems...</p>
                    </div>
                ) : (
                    <>
                        {/* 1. DASHBOARD */}
                        {activeTab === 'home' && (
                            <div className="space-y-10">
                                <h1 className="text-4xl font-black tracking-tight">System Overview</h1>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                    <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                                        <p className="text-slate-400 text-xs font-black uppercase tracking-wider">In Pipeline</p>
                                        <div className="flex items-end gap-2 mt-1">
                                            <span className="text-3xl font-black text-blue-600">{pipelineCount}</span>
                                            <FaChartLine className="text-blue-400 mb-1" />
                                        </div>
                                    </div>
                                    <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                                        <p className="text-slate-400 text-xs font-black uppercase tracking-wider">Avg. Publish Time</p>
                                        <div className="flex items-end gap-2 mt-1">
                                            <span className="text-3xl font-black text-slate-900">{calculateAvgTime()}</span>
                                            <FaClock className="text-amber-500 mb-1" />
                                        </div>
                                    </div>
                                    <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                                        <p className="text-slate-400 text-xs font-black uppercase tracking-wider">Live Sections</p>
                                        <div className="flex items-end gap-2 mt-1">
                                            <span className="text-3xl font-black text-emerald-500">{publishedCount}</span>
                                            <FaCheckDouble className="text-emerald-500 mb-1" />
                                        </div>
                                    </div>
                                    <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                                        <p className="text-slate-400 text-xs font-black uppercase tracking-wider">Total Users</p>
                                        <div className="flex items-end gap-2 mt-1">
                                            <span className="text-3xl font-black text-indigo-600">{totalUsers}</span>
                                            <FaUsers className="text-indigo-600 mb-1" />
                                        </div>
                                    </div>
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
                                                            className="bg-white border p-2 rounded-lg text-sm font-bold shadow-sm outline-none focus:ring-2 ring-blue-500"
                                                            defaultValue=""
                                                        >
                                                            <option value="" disabled>Assign Tester...</option>
                                                            {testers.map(t => (
                                                                <option key={t.id} value={t.id}>
                                                                    {t.username} ({getWorkload(t.id)} active)
                                                                </option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                ))
                                            ) : <p className="text-slate-400 italic text-center py-8">No pending assignments.</p>}
                                        </div>
                                    </div>
                                    {/*<div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
                                        <h3 className="font-black text-xl mb-6 flex items-center gap-2"><FaTrophy className="text-yellow-500" /> First-Try Masters</h3>
                                        <div className="space-y-4">
                                            {getLeaderboard().map((entry, index) => (
                                                <div key={index} className="flex items-center justify-between p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
                                                    <div className="flex items-center gap-3">
                                                        <span className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-xs ${index === 0 ? 'bg-yellow-400 text-white' : 'bg-slate-200'}`}>{index + 1}</span>
                                                        <span className="font-bold">{entry.username}</span>
                                                    </div>
                                                    <span className="bg-emerald-600 text-white px-3 py-1 rounded-lg text-xs font-black">{entry.count} Clean Passes</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>*/}
                                </div>
                            </div>
                        )}

                        {/* 2. REPOSITORY */}
                        {activeTab === 'repository' && (
                            <div className="space-y-6">
                                <h2 className="text-3xl font-black">Asset Repository</h2>
                                <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
                                    <table className="w-full text-left">
                                        <thead className="bg-slate-900 text-[10px] uppercase font-black text-slate-400">
                                            <tr>
                                                <th className="px-6 py-4">Asset ID</th>
                                                <th className="px-6 py-4">Title</th>
                                                <th className="px-6 py-4">Status</th>
                                                <th className="px-6 py-4 text-right">Download</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {sections.map(sec => (
                                                <tr key={sec.id} className="hover:bg-slate-50 transition-colors">
                                                    <td className="px-6 py-4 text-xs font-mono text-slate-400">SEC-{sec.id}</td>
                                                    <td className="px-6 py-4 font-bold">{sec.title}</td>
                                                    <td className="px-6 py-4">
                                                        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${sec.current_status === 'Published' ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'}`}>
                                                            {sec.current_status}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-right text-blue-600 font-bold">
                                                        <button onClick={() => handleDownload('asset.zip')}><FaDownload /></button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {/* 3. GO-LIVE MODULE */}
                        {activeTab === 'approval' && (
                            <div className="space-y-6">
                                <h2 className="text-3xl font-black">Go-Live Module</h2>
                                <div className="grid gap-6">
                                    {sections.filter(sec => sec.current_status === 'Ready for Store' || sec.current_status === 'Published').length > 0 ? (
                                        sections.filter(sec => sec.current_status === 'Ready for Store' || sec.current_status === 'Published').map(sec => (
                                            <div key={sec.id} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                                                <div className="flex justify-between items-start mb-6">
                                                    <div>
                                                        <h3 className="text-xl font-black">{sec.title}</h3>
                                                        <p className="text-slate-400 text-sm">Deployment: <span className="text-indigo-600 font-bold">{sec.current_status}</span></p>
                                                    </div>
                                                    <div className="flex gap-2">
                                                        {sec.current_status === 'Published' ? (
                                                            <button onClick={() => handleStatusUpdate(sec.id, 'Issue Logged')} className="bg-rose-100 text-rose-600 px-4 py-2 rounded-xl font-bold flex items-center gap-2 hover:bg-rose-200">
                                                                <FaUndo /> Emergency Rollback
                                                            </button>
                                                        ) : (
                                                            <button onClick={() => handleStatusUpdate(sec.id, 'Published')} className="bg-emerald-600 text-white px-6 py-3 rounded-xl font-black flex items-center gap-2 hover:bg-emerald-700 shadow-lg shadow-emerald-200">
                                                                <FaRocket /> Publish to Store
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="grid grid-cols-2 gap-4 border-t border-slate-100 pt-4">
                                                    <div className="bg-slate-50 p-4 rounded-xl flex items-center gap-3">
                                                        <FaDesktop className="text-indigo-600" />
                                                        <span className="text-xs font-bold text-slate-600 uppercase">Previews Ready</span>
                                                    </div>
                                                    <div className="bg-slate-50 p-4 rounded-xl flex items-center gap-3">
                                                        <FaCheck className="text-emerald-600" />
                                                        <span className="text-xs font-bold text-slate-600 uppercase">QA Verification Passed</span>
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="p-20 bg-white rounded-3xl border-2 border-dashed text-center text-slate-400">
                                            No sections are currently awaiting store publication.
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* 4. PERMISSIONS */}
                        {activeTab === 'users' && (
                            <div className="space-y-6">
                                <div className="flex justify-between items-center">
                                    <h2 className="text-3xl font-black">User & Role Permissions</h2>
                                    <button onClick={() => setIsModalOpen(true)} className="bg-blue-600 text-white px-6 py-3 rounded-2xl font-black flex items-center gap-2 shadow-lg shadow-blue-200"><FaPlus /> Create Member</button>
                                </div>
                                <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
                                    <table className="w-full text-left">
                                        <thead className="bg-slate-50 text-[10px] font-black uppercase text-slate-400">
                                            <tr>
                                                <th className="px-6 py-4">User</th>
                                                <th className="px-6 py-4">Access Level</th>
                                                <th className="px-6 py-4 text-right">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {accounts.map(acc => (
                                                <tr key={acc.id} className="hover:bg-slate-50 transition-colors">
                                                    <td className="px-6 py-4 font-black">{acc.username}</td>
                                                    <td className="px-6 py-4">
                                                        <span className="bg-indigo-50 text-indigo-600 px-3 py-1 rounded-lg font-black text-[10px] uppercase border border-indigo-100">
                                                            {acc.role}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <button onClick={() => handleDeleteAccount(acc.id)} className="text-rose-400 hover:text-rose-600 p-2"><FaTrash /></button>
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

            {/* MODAL: CREATE USER */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden">
                        <div className="p-6 border-b flex justify-between items-center bg-slate-50">
                            <h3 className="text-xl font-black italic text-slate-800">New Member Access</h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600"><FaTimes /></button>
                        </div>
                        <form onSubmit={handleCreateAccount} className="p-8 space-y-4">
                            <input required className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 outline-none focus:ring-2 ring-blue-500" placeholder="Username" onChange={(e) => setFormData({ ...formData, username: e.target.value })} />
                            <input type="email" required className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 outline-none focus:ring-2 ring-blue-500" placeholder="Email Address" onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
                            <input type="password" required className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 outline-none focus:ring-2 ring-blue-500" placeholder="Set Password" onChange={(e) => setFormData({ ...formData, password: e.target.value })} />
                            <select className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-bold" onChange={(e) => setFormData({ ...formData, role: e.target.value })}>
                                <option value="creator">Creator (Dev)</option>
                                <option value="tester">Tester (QA Lab)</option>
                                <option value="designer">Designer (Studio)</option>
                                <option value="admin">Super Admin</option>
                            </select>
                            <button type="submit" className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black shadow-lg shadow-blue-200 mt-4">Authorize User</button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}