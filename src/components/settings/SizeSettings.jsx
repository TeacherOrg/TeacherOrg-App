import React, { useState, useEffect } from 'react';
import { Label } from '@/components/ui/label';

export default function SizeSettings({ settings, setSettings }) {
    if (!settings) return <div>Loading...</div>;

    const handleSettingChange = (key, value) => {
        setSettings(prev => ({ ...prev, [key]: value }));
    };

    // Calculate max cell height based on screen size
    const calculateMaxCellHeight = () => {
        const headerHeight = 280; // Headers, controls, navigation etc.
        const footerSpace = 50; // Bottom margin
        const availableHeight = window.innerHeight - headerHeight - footerSpace;
        const maxPossibleHeight = Math.floor(availableHeight / 8) - 5; // 8 periods, minus margins
        return Math.max(40, Math.min(maxPossibleHeight, 100)); // Between 40px and reasonable max
    };

    const calculateMaxCellWidth = () => {
        const sideWidths = 120 + 250 + 100; // Zeitspalte + Pool + Puffer
        const availableWidth = window.innerWidth - sideWidths;
        return Math.max(80, Math.min(Math.floor(availableWidth / 5), 300));  // Neu: Min 80px statt 100, für kleine Fenster
    };

    const [maxCellWidth, setMaxCellWidth] = useState(calculateMaxCellWidth());
    const [maxCellHeight, setMaxCellHeight] = useState(calculateMaxCellHeight());

    // Hier einfügen: Der erweiterte useEffect für Resize-Handling
    useEffect(() => {
        const handleResize = () => {
            setMaxCellWidth(calculateMaxCellWidth());
            setMaxCellHeight(calculateMaxCellHeight());
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Live update CSS variables for immediate visual feedback
    useEffect(() => {
        document.documentElement.style.setProperty('--cell-width', `${Math.min(settings.cellWidth || 120, maxCellWidth)}px`);
        document.documentElement.style.setProperty('--cell-height', `${Math.min(settings.cellHeight || 80, maxCellHeight)}px`);
    }, [settings.cellWidth, settings.cellHeight, maxCellHeight, maxCellWidth]);

    return (
        <div className="space-y-6 bg-slate-900 text-white">
            <div>
                <h3 className="text-lg font-semibold text-white">Größeneinstellungen</h3>
                <p className="text-sm text-slate-400">Passen Sie die Größe der Stundenplan-Zellen an.</p>
            </div>
            
            <div className="space-y-6">
                <div className="space-y-3">
                    <Label htmlFor="cellWidth" className="text-white">
                        Zellenbreite: {Math.min(settings.cellWidth || 120, maxCellWidth)}px 
                        <span className="text-xs text-slate-400 ml-2">(Max: {maxCellWidth}px für Ihren Bildschirm)</span>
                    </Label>
                    <input
                        id="cellWidth"
                        type="range"
                        min="100"
                        max={maxCellWidth}
                        step="10"
                        value={Math.min(settings.cellWidth || 120, maxCellWidth)}
                        onChange={(e) => handleSettingChange('cellWidth', parseInt(e.target.value))}
                        className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer"
                        style={{
                            background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${((Math.min(settings.cellWidth || 120, maxCellWidth)) - 100) / (maxCellWidth - 100) * 100}%, #475569 ${((Math.min(settings.cellWidth || 120, maxCellWidth)) - 100) / (maxCellWidth - 100) * 100}%, #475569 100%)`
                        }}
                    />
                    <div className="flex justify-between text-xs text-slate-400">
                        <span>100px</span>
                        <span>{maxCellWidth}px</span>
                    </div>
                </div>
                
                <div className="space-y-3">
                    <Label htmlFor="cellHeight" className="text-white">
                        Zellenhöhe: {Math.min(settings.cellHeight || 80, maxCellHeight)}px 
                        <span className="text-xs text-slate-400 ml-2">(Max: {maxCellHeight}px für Ihren Bildschirm)</span>
                    </Label>
                    <input
                        id="cellHeight"
                        type="range"
                        min="40"
                        max={maxCellHeight}
                        step="5"
                        value={Math.min(settings.cellHeight || 80, maxCellHeight)}
                        onChange={(e) => handleSettingChange('cellHeight', parseInt(e.target.value))}
                        className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer"
                        style={{
                            background: `linear-gradient(to right, #10b981 0%, #10b981 ${((Math.min(settings.cellHeight || 80, maxCellHeight)) - 40) / (maxCellHeight - 40) * 100}%, #475569 ${((Math.min(settings.cellHeight || 80, maxCellHeight)) - 40) / (maxCellHeight - 40) * 100}%, #475569 100%)`
                        }}
                    />
                    <div className="flex justify-between text-xs text-slate-400">
                        <span>40px</span>
                        <span>{maxCellHeight}px</span>
                    </div>
                </div>
            </div>
            
            <div className="mt-6 p-4 bg-slate-800 rounded-lg">
                <h4 className="font-semibold text-white mb-2">Vorschau</h4>
                <div 
                    className="border border-slate-600 rounded bg-blue-500 text-white flex items-center justify-center text-sm font-medium"
                    style={{ 
                        width: `${Math.min(settings.cellWidth || 120, maxCellWidth)}px`, 
                        height: `${Math.min(settings.cellHeight || 80, maxCellHeight)}px` 
                    }}
                >
                    Beispiel-Zelle
                </div>
            </div>
        </div>
    );
}