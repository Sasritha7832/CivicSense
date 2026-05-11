import { useState, useEffect } from 'react';
import api from '../api/axios';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';

export default function AnnouncementBanner() {
  const [announcements, setAnnouncements] = useState([]);
  const { socket } = useSocket();
  const { user } = useAuth();
  const [dismissed, setDismissed] = useState(() => {
    const saved = localStorage.getItem('dismissedAnnouncements');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    api.get('/announcements').then(({ data }) => {
      setAnnouncements(data.announcements || []);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!socket) return;
    
    socket.on('announcement:new', (announcement) => {
      setAnnouncements(prev => [announcement, ...prev]);
    });

    socket.on('announcement:deleted', (id) => {
      setAnnouncements(prev => (prev || []).filter(a => a._id !== id));
    });

    return () => {
      socket.off('announcement:new');
      socket.off('announcement:deleted');
    };
  }, [socket]);

  const dismiss = (id) => {
    const newDismissed = [...dismissed, id];
    setDismissed(newDismissed);
    localStorage.setItem('dismissedAnnouncements', JSON.stringify(newDismissed));
  };

  const activeAnnouncements = (announcements || []).filter(a => 
    !dismissed.includes(a._id) && 
    (!a.ward || !user || a.ward === user.ward)
  );

  if (activeAnnouncements.length === 0) return null;

  return (
    <div className="w-full">
      {activeAnnouncements.map((a) => (
        <div key={a._id} className="bg-amber-100 border-b border-amber-200 text-amber-900 px-4 py-3 flex items-start gap-3 shadow-sm dark:bg-amber-900/40 dark:border-amber-700/50 dark:text-amber-100 relative">
          <span className="text-xl">📢</span>
          <div className="flex-1 pr-6">
            <h4 className="font-bold text-sm mb-0.5">{a.title} {a.ward && <span className="text-xs font-medium bg-amber-200/50 px-2 py-0.5 rounded ml-2 dark:bg-amber-800/50">{a.ward} Only</span>}</h4>
            <p className="text-sm m-0 leading-snug">{a.message}</p>
          </div>
          <button 
            onClick={() => dismiss(a._id)}
            className="absolute top-3 right-3 w-6 h-6 rounded-full hover:bg-amber-200/50 flex items-center justify-center text-amber-700 dark:hover:bg-amber-800/50 dark:text-amber-300 transition-colors"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}
