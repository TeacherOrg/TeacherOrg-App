import React, { useState, useEffect } from 'react';
import { Announcement } from '@/api/entities';
import { Megaphone } from 'lucide-react';

export default function AnnouncementsTicker() {
    const [announcements, setAnnouncements] = useState([]);

    useEffect(() => {
        const fetchAnnouncements = async () => {
            const today = new Date().toISOString().split('T')[0];
            const activeAnnouncements = await Announcement.filter({ is_active: true });
            
            const relevantAnnouncements = activeAnnouncements.filter(a => {
                const startDate = a.start_date.split('T')[0];
                const endDate = a.end_date ? a.end_date.split('T')[0] : '9999-12-31';
                return today >= startDate && today <= endDate;
            });
            
            setAnnouncements(relevantAnnouncements);
        };

        fetchAnnouncements();
        const interval = setInterval(fetchAnnouncements, 5 * 60 * 1000); // Refresh every 5 minutes
        return () => clearInterval(interval);
    }, []);

    if (announcements.length === 0) {
        return null;
    }

    const announcementText = announcements.map(a => a.text).join('  ***  ');

    return (
        <div className="fixed bottom-0 left-0 right-0 h-10 bg-yellow-400 dark:bg-yellow-600 text-black dark:text-white flex items-center z-50 overflow-hidden shadow-lg">
            <div className="flex-shrink-0 px-4 flex items-center gap-2">
                 <Megaphone className="w-5 h-5" />
                 <span className="font-bold">Info:</span>
            </div>
            <div className="flex-1 overflow-hidden whitespace-nowrap">
                <div className="inline-block animate-marquee">
                    <span>{announcementText}</span>
                </div>
                <div className="inline-block animate-marquee whitespace-nowrap overflow-hidden">
                    <span>{announcementText}</span>
                </div>
            </div>
             <style jsx>{`
                @keyframes marquee {
                    0% { transform: translateX(0%); }
                    100% { transform: translateX(-100%); }
                }
                @keyframes marquee2 {
                    0% { transform: translateX(0%); }
                    100% { transform: translateX(-100%); }
                }
                .animate-marquee {
                    animation: marquee 30s linear infinite;
                    will-change: transform;
                }
                 .animate-marquee2 {
                    animation: marquee2 30s linear infinite;
                    animation-delay: 15s;
                    will-change: transform;
                }
            `}</style>
        </div>
    );
}