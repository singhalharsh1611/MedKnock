import { useAuth } from '@/contexts/AuthContext';
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import {
    LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid,
    BarChart, Bar, Legend, ResponsiveContainer,
} from 'recharts';
import ReactMarkdown from 'react-markdown';

const backendUrl = import.meta.env.VITE_BACKEND_URL;

export default function StatsPage() {
    const { token } = useAuth();
    const [overview, setOverview] = useState(null);
    const [daily, setDaily] = useState([]);
    const [meds, setMeds] = useState([]);
    const [streak, setStreak] = useState(0);
    const [upcoming, setUpcoming] = useState([]);
    const [aiSuggestions, setAiSuggestions] = useState([]);
    const [loadingAI, setLoadingAI] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!token) return;
        setLoading(true);
        const headers = { Authorization: `Bearer ${token}` };

        const fetchData = async () => {
            try {
                const [ovRes, dailyRes, medsRes, streakRes, upcomingRes] = await Promise.all([
                    axios.get(`${backendUrl}/api/v1/stats/overview`, { headers }),
                    axios.get(`${backendUrl}/api/v1/stats/daily`, { headers }),
                    axios.get(`${backendUrl}/api/v1/stats/medications?limit=20`, { headers }),
                    axios.get(`${backendUrl}/api/v1/stats/streak`, { headers }),
                    axios.get(`${backendUrl}/api/v1/stats/upcoming?windowHours=12`, { headers }),
                ]);

                setOverview(ovRes.data);
                setDaily(dailyRes.data.series || []);
                setMeds(medsRes.data.meds || []);
                setStreak(streakRes.data.streakDays || 0);
                setUpcoming(upcomingRes.data.upcoming || []);
            } catch (err) {
                console.error(err);
                setError('Failed to load stats');
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [token]);

    const handleAskAISummary = async () => {
        if (!token) return;
        setLoadingAI(true);
        setAiSuggestions([]);
        try {
            const res = await axios.get(`${backendUrl}/api/v1/stats/ai-suggestions`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            setAiSuggestions(res.data.suggestions || []);
        } catch (err) {
            console.error(err);
            setAiSuggestions([{ text: 'Failed to fetch AI insights. Try again later.' }]);
        } finally {
            setLoadingAI(false);
        }
    };

    if (loading) return <div className="p-6 text-gray-400">Loading stats...</div>;
    if (error) return <div className="p-6 text-red-400">{error}</div>;

    const adherence = overview?.adherence ? `${overview.adherence.toFixed(1)}%` : '—';

    return (
        <div className="p-8 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 min-h-screen text-gray-100 space-y-8">
            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <Card title="Taken" gradient="from-green-400 to-green-600" value={overview?.totals?.taken ?? 0} />
                <Card title="Missed" gradient="from-yellow-400 to-yellow-600" value={overview?.totals?.missed ?? 0} />
                <Card title="Adherence" gradient="from-blue-400 to-indigo-600" value={adherence} />
                <Card title="Streak (days)" gradient="from-teal-400 to-cyan-600" value={streak} />
            </div>

            {/* Daily Graph */}
            <section className="rounded-xl p-6 backdrop-blur-lg bg-white/5 border border-white/10 shadow-xl">
                <h3 className="text-lg font-semibold mb-4 text-gray-100">Daily Taken / Missed</h3>
                <div style={{ width: '100%', height: 400 }}>
                    <ResponsiveContainer>
                        <LineChart data={daily}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                            <XAxis dataKey="date" stroke="#d1d5db" />
                            <YAxis stroke="#d1d5db" />
                            <Tooltip contentStyle={{ backgroundColor: 'rgba(30,30,30,0.9)', border: 'none' }} labelStyle={{ color: '#fff' }} />
                            <Legend />
                            <Line type="monotone" dataKey="taken" name="Taken" stroke="#22c55e" strokeWidth={3} />
                            <Line type="monotone" dataKey="missed" name="Missed" stroke="#facc15" strokeWidth={3} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </section>

            {/* Medication Graph */}
            <section className="rounded-xl p-6 backdrop-blur-lg bg-white/5 border border-white/10 shadow-xl">
                <h3 className="text-lg font-semibold mb-4 text-gray-100">Per Medication (Top 10)</h3>
                <div style={{ width: '100%', height: 400 }}>
                    <ResponsiveContainer>
                        <BarChart data={meds.slice(0, 10)}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                            <XAxis dataKey="_id" stroke="#d1d5db" />
                            <YAxis stroke="#d1d5db" />
                            <Tooltip contentStyle={{ backgroundColor: 'rgba(30,30,30,0.9)', border: 'none' }} labelStyle={{ color: '#fff' }} />
                            <Legend />
                            <Bar dataKey="taken" name="Taken" fill="#22c55e" radius={[6, 6, 0, 0]} />
                            <Bar dataKey="missed" name="Missed" fill="#facc15" radius={[6, 6, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </section>

            {/* Weekly Adherence Graph */}
            <section className="rounded-xl p-6 backdrop-blur-lg bg-white/5 border border-white/10 shadow-xl">
                <h3 className="text-lg font-semibold mb-4 text-gray-100">7-Day Adherence</h3>
                <p className="text-sm text-gray-400 mb-4">
                    Adherence shows how consistently you’ve taken your medicines each day over the past week.
                </p>
                <div style={{ width: '100%', height: 400 }}>
                    <ResponsiveContainer>
                        <LineChart data={daily.map(d => ({
                            date: d.date,
                            adherence: d.taken + d.missed > 0 ? (d.taken / (d.taken + d.missed)) * 100 : 0,
                        }))}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                            <XAxis dataKey="date" stroke="#d1d5db" />
                            <YAxis stroke="#d1d5db" domain={[0, 100]} ticks={[0, 20, 40, 60, 80, 100]} />
                            <Tooltip contentStyle={{ backgroundColor: 'rgba(30,30,30,0.9)', border: 'none' }} labelStyle={{ color: '#fff' }} />
                            <Legend />
                            <Line type="monotone" dataKey="adherence" name="Adherence %" stroke="#38bdf8" strokeWidth={3} dot={{ r: 6, fill: '#38bdf8' }} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </section>

            {/* Ask AI Summary Button & Box */}
            <section className="text-center space-y-4">
                <button
                    onClick={handleAskAISummary}
                    disabled={loadingAI}
                    className="px-6 py-3 bg-gradient-to-r from-violet-500 to-indigo-600 hover:from-violet-600 hover:to-indigo-700 
                               text-white font-medium rounded-xl shadow-lg transition-transform transform hover:scale-105 disabled:opacity-50"
                >
                    {loadingAI ? 'Analyzing your data...' : 'Ask AI Summary'}
                </button>

                {aiSuggestions.length > 0 && (
                    <div className="rounded-xl p-6 mt-4 bg-white/5 border border-white/10 shadow-xl text-left max-w-4xl mx-auto">
                        <h4 className="text-lg font-semibold mb-3 text-violet-300">AI Insights & Suggestions</h4>
                        <ul className="list-decimal list-inside space-y-2 text-gray-200">
                            {aiSuggestions.map((s, i) => (
                                <li key={i} className="bg-white/5 px-3 py-2 rounded-lg border border-white/10 hover:bg-white/10 transition">
                                    <ReactMarkdown>{s.text || s}</ReactMarkdown>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </section>

            {/* Upcoming Table */}
            <section className="rounded-xl p-6 backdrop-blur-lg bg-white/5 border border-white/10 shadow-xl">
                <h3 className="text-lg font-semibold mb-4 text-gray-100">Upcoming Doses (Next 12 Hours)</h3>
                {upcoming.length === 0 ? (
                    <p className="text-gray-400 text-sm">No upcoming doses in the next 12 hours.</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm border border-white/10 rounded-lg">
                            <thead className="bg-white/10 text-gray-200">
                                <tr>
                                    <th className="text-left py-2 px-3 border-b border-white/10">Medicine</th>
                                    <th className="text-left py-2 px-3 border-b border-white/10">Time</th>
                                    <th className="text-left py-2 px-3 border-b border-white/10">Exact Timestamp</th>
                                </tr>
                            </thead>
                            <tbody>
                                {upcoming.map((u, index) => (
                                    <tr key={`${u.scheduleId}-${index}`} className="hover:bg-white/10 transition-colors duration-150">
                                        <td className="py-2 px-3 border-b border-white/10">{u.pillName}</td>
                                        <td className="py-2 px-3 border-b border-white/10">{u.time}</td>
                                        <td className="py-2 px-3 border-b border-white/10 text-gray-400">
                                            {new Date(u.at).toLocaleTimeString()}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>
        </div>
    );
}

function Card({ title, value, gradient }) {
    return (
        <div className={`rounded-xl shadow-lg p-6 text-white bg-gradient-to-br ${gradient} border border-white/10 hover:scale-[1.03] transition-transform duration-300`}>
            <div className="text-sm opacity-90">{title}</div>
            <div className="text-3xl font-bold mt-1">{value}</div>
        </div>
    );
}
