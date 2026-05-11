import { useState, useEffect } from 'react';
import api from '../api/axios';
import Skeleton from '../components/Skeleton';
import { useAuth } from '../context/AuthContext';

export default function LeaderboardPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user: currentUser } = useAuth();

  useEffect(() => {
    api.get('/stats/leaderboard').then(({ data }) => {
      setUsers(data.leaderboard);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  return (
    <div className="container py-8 max-w-4xl mx-auto">
      <div className="text-center mb-10">
        <h1 className="text-4xl font-black text-slate-800 tracking-tight dark:text-white">🏆 City Heroes Leaderboard</h1>
        <p className="text-slate-500 mt-2 text-lg dark:text-slate-400">Top citizens who are actively improving the community.</p>
      </div>

      <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden dark:bg-card dark:border-border dark:shadow-none">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 dark:bg-slate-800/50 dark:border-slate-700">
                <th className="p-4 text-sm font-semibold text-slate-600 dark:text-slate-300">Rank</th>
                <th className="p-4 text-sm font-semibold text-slate-600 dark:text-slate-300">Citizen</th>
                <th className="p-4 text-sm font-semibold text-slate-600 dark:text-slate-300">Ward</th>
                <th className="p-4 text-sm font-semibold text-slate-600 text-right dark:text-slate-300">Points</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array(5).fill(0).map((_, i) => (
                  <tr key={i} className="border-b border-slate-50 dark:border-slate-800/50">
                    <td className="p-4"><Skeleton width="30px" /></td>
                    <td className="p-4"><Skeleton width="150px" /></td>
                    <td className="p-4"><Skeleton width="100px" /></td>
                    <td className="p-4"><Skeleton width="50px" /></td>
                  </tr>
                ))
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan="4" className="p-8 text-center text-slate-500 dark:text-slate-400">No data available.</td>
                </tr>
              ) : (
                users.map((u, i) => {
                  const isMe = currentUser && currentUser._id === u._id;
                  return (
                    <tr 
                      key={u._id} 
                      className={`border-b border-slate-50 hover:bg-slate-50/50 transition-colors dark:border-slate-800/50 dark:hover:bg-slate-800/30 ${isMe ? 'bg-blue-50/50 dark:bg-blue-900/20' : ''}`}
                    >
                      <td className="p-4">
                        {i === 0 ? <span className="text-2xl" title="1st Place">🥇</span> : 
                         i === 1 ? <span className="text-2xl" title="2nd Place">🥈</span> : 
                         i === 2 ? <span className="text-2xl" title="3rd Place">🥉</span> : 
                         <span className="font-semibold text-slate-500 w-8 inline-block text-center">{i + 1}</span>}
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-500 to-indigo-500 text-white flex items-center justify-center font-bold text-sm shadow-md">
                            {u.name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0,2)}
                          </div>
                          <div>
                            <p className="font-bold text-slate-800 dark:text-slate-200">
                              {u.name} {isMe && <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full ml-1 dark:bg-blue-900/50 dark:text-blue-300">You</span>}
                            </p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">{u.badges?.join(', ')}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4 text-sm font-medium text-slate-600 dark:text-slate-400">
                        {u.ward || '—'}
                      </td>
                      <td className="p-4 text-right">
                        <span className="inline-flex items-center gap-1.5 font-bold text-lg text-amber-500 bg-amber-50 px-3 py-1 rounded-lg dark:bg-amber-900/20 dark:text-amber-400">
                          ⭐ {u.points}
                        </span>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
