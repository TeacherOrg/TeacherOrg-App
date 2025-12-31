import React, { useState, useEffect } from 'react';
import { Label } from '@/components/ui/label';

export default function SizeSettings({ settings, setSettings }) {
    if (!settings) return <div>Loading...</div>;

    const handleSettingChange = (key, value) => {
        setSettings(prev => ({ ...prev, [key]: value }));
    };

    const handleAutoFitChange = (checked) => {
        setSettings(prev => ({ ...prev, autoFit: checked }));
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

    const densityConfig = {
        compact: { width: 72, height: 48, label: 'Kompakt' },
        standard: { width: 82, height: 68, label: 'Standard' },
        spacious: { width: 92, height: 80, label: 'Großzügig' }
    };

    const currentDensity = settings.yearlyDensity || 'standard';

    return (
        <div className="space-y-6 bg-white dark:bg-slate-900 text-black dark:text-white">
            <div>
                <h3 className="text-lg font-semibold text-black dark:text-white">Größeneinstellungen</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">Passen Sie die Darstellung der verschiedenen Ansichten an.</p>
            </div>

            {/* === KATEGORIE 1: WOCHENSTUNDENPLAN === */}
            <div className="border-b border-slate-200 dark:border-slate-700 pb-6">
                <h4 className="text-md font-semibold text-black dark:text-white mb-4 flex items-center gap-2">
                    <span className="text-blue-600">📅</span> Wochenstundenplan
                </h4>

                <div className="space-y-3">
                    <Label className="text-black dark:text-white flex items-center gap-2">
                        <input
                            type="checkbox"
                            checked={settings.autoFit ?? true}
                            onChange={(e) => handleAutoFitChange(e.target.checked)}
                            className="w-4 h-4"
                        />
                        Automatische Anpassung (Auto-Fit)
                    </Label>
                    <p className="text-xs text-slate-600 dark:text-slate-400">
                        Passt Zellengrößen dynamisch an den Bildschirm an, damit der Plan immer vollständig sichtbar ist.
                    </p>
                </div>

                <div className="space-y-6 mt-4">
                    <div className="space-y-3">
                        <Label htmlFor="cellWidth" className="text-black dark:text-white">
                            Zellenbreite: {Math.min(settings.cellWidth || 120, maxCellWidth)}px
                            <span className="text-xs text-slate-600 dark:text-slate-400 ml-2">(Max: {maxCellWidth}px)</span>
                        </Label>
                        <input
                            id="cellWidth"
                            type="range"
                            min="100"
                            max={maxCellWidth}
                            step="10"
                            value={Math.min(settings.cellWidth || 120, maxCellWidth)}
                            onChange={(e) => handleSettingChange('cellWidth', parseInt(e.target.value))}
                            className="w-full h-2 bg-slate-300 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer"
                            style={{
                                background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${((Math.min(settings.cellWidth || 120, maxCellWidth)) - 100) / (maxCellWidth - 100) * 100}%, #cbd5e1 ${((Math.min(settings.cellWidth || 120, maxCellWidth)) - 100) / (maxCellWidth - 100) * 100}%, #cbd5e1 100%)`
                            }}
                        />
                        <div className="flex justify-between text-xs text-slate-600 dark:text-slate-400">
                            <span>100px</span>
                            <span>{maxCellWidth}px</span>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <Label htmlFor="cellHeight" className="text-black dark:text-white">
                            Zellenhöhe: {Math.min(settings.cellHeight || 80, maxCellHeight)}px
                            <span className="text-xs text-slate-600 dark:text-slate-400 ml-2">(Max: {maxCellHeight}px)</span>
                        </Label>
                        <input
                            id="cellHeight"
                            type="range"
                            min="40"
                            max={maxCellHeight}
                            step="5"
                            value={Math.min(settings.cellHeight || 80, maxCellHeight)}
                            onChange={(e) => handleSettingChange('cellHeight', parseInt(e.target.value))}
                            className="w-full h-2 bg-slate-300 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer"
                            style={{
                                background: `linear-gradient(to right, #10b981 0%, #10b981 ${((Math.min(settings.cellHeight || 80, maxCellHeight)) - 40) / (maxCellHeight - 40) * 100}%, #cbd5e1 ${((Math.min(settings.cellHeight || 80, maxCellHeight)) - 40) / (maxCellHeight - 40) * 100}%, #cbd5e1 100%)`
                            }}
                        />
                        <div className="flex justify-between text-xs text-slate-600 dark:text-slate-400">
                            <span>40px</span>
                            <span>{maxCellHeight}px</span>
                        </div>
                    </div>
                </div>

                <div className="mt-4 p-4 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-300 dark:border-slate-600">
                    <h5 className="font-medium text-black dark:text-white mb-2 text-sm">Vorschau</h5>
                    <div
                        className="border border-slate-300 dark:border-slate-600 rounded bg-blue-500 text-white flex items-center justify-center text-sm font-medium"
                        style={{
                            width: `${Math.min(settings.cellWidth || 120, maxCellWidth)}px`,
                            height: `${Math.min(settings.cellHeight || 80, maxCellHeight)}px`
                        }}
                    >
                        Beispiel
                    </div>
                </div>
            </div>

            {/* === KATEGORIE 2: JAHRESANSICHT === */}
            <div>
                <h4 className="text-md font-semibold text-black dark:text-white mb-4 flex items-center gap-2">
                    <span className="text-green-600">📊</span> Jahresansicht
                </h4>

                <div className="space-y-3">
                    <Label className="text-black dark:text-white">Dichte</Label>
                    <div className="flex gap-2">
                        {['compact', 'standard', 'spacious'].map((mode) => (
                            <button
                                key={mode}
                                onClick={() => handleSettingChange('yearlyDensity', mode)}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                                    currentDensity === mode
                                        ? 'bg-blue-600 text-white shadow-md'
                                        : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-600'
                                }`}
                            >
                                {densityConfig[mode].label}
                            </button>
                        ))}
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-400">
                        Kompakt = kleinere Zellen, Standard = normal, Großzügig = mehr Platz pro Lektion
                    </p>
                </div>

                <div className="mt-4 p-4 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-300 dark:border-slate-600">
                    <h5 className="font-medium text-black dark:text-white mb-2 text-sm">Vorschau</h5>
                    <div className="flex gap-1">
                        {[1, 2, 3].map((i) => (
                            <div
                                key={i}
                                className="bg-green-500 rounded text-white text-xs flex items-center justify-center font-medium transition-all duration-200"
                                style={{
                                    width: `${densityConfig[currentDensity].width}px`,
                                    height: `${densityConfig[currentDensity].height}px`,
                                }}
                            >
                                L{i}
                            </div>
                        ))}
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                        Zellgröße: {densityConfig[currentDensity].width}×{densityConfig[currentDensity].height}px
                    </p>
                </div>
            </div>
        </div>
    );
}