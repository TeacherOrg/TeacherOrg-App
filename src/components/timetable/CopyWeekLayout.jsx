
import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Copy } from 'lucide-react';

export default function CopyWeekLayout({ currentWeek, allLessons, onCopyLayout, isLoading }) {
    const isVisible = useMemo(() => {
        if (currentWeek <= 1) return false;
        
        const previousWeekLessons = allLessons.filter(l => l.week_number === currentWeek - 1);
        const currentWeekLessons = allLessons.filter(l => l.week_number === currentWeek);

        return previousWeekLessons.length > 0 && currentWeekLessons.length === 0;
    }, [currentWeek, allLessons]);

    const handleCopy = () => {
        if (window.confirm(`Möchten Sie die Stundenverteilung von KW ${currentWeek - 1} für die aktuelle Woche übernehmen?`)) {
            onCopyLayout();
        }
    };

    if (!isVisible) {
        return null;
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mb-4 p-4 bg-slate-800 rounded-2xl border border-slate-700 shadow-lg"
        >
            <h4 className="text-sm font-bold text-white mb-2 text-center">Planungshilfe</h4>
            <Button 
                onClick={handleCopy} 
                disabled={isLoading}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 text-xs"
                size="sm"
            >
                <Copy className="w-4 h-4 mr-2" />
                {isLoading ? 'Kopiere...' : `Layout von KW ${currentWeek - 1} übernehmen`}
            </Button>
        </motion.div>
    );
}
