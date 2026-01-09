import React, { useState, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Calendar, LayoutGrid } from 'lucide-react';

const SliderWithPreview = ({
  id, label, value, min, max, step, onChange,
  unit = 'px', color = '#3b82f6', maxLabel = ''
}) => {
  const percentage = ((value - min) / (max - min)) * 100;

  return (
    <div className="space-y-3">
      <Label htmlFor={id} className="text-slate-900 dark:text-white font-medium">
        {label}: <span className="text-blue-600 dark:text-blue-400 font-semibold">{value}{unit}</span>
        {maxLabel && <span className="text-xs text-slate-500 dark:text-slate-400 ml-2">{maxLabel}</span>}
      </Label>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value))}
        className="w-full h-2 bg-slate-300 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer"
        style={{
          background: `linear-gradient(to right, ${color} 0%, ${color} ${percentage}%, #cbd5e1 ${percentage}%, #cbd5e1 100%)`
        }}
      />
      <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400">
        <span>{min}{unit}</span>
        <span>{max}{unit}</span>
      </div>
    </div>
  );
};

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
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">Größeneinstellungen</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">Passen Sie die Darstellung der verschiedenen Ansichten an.</p>
            </div>

            <Separator className="bg-slate-200 dark:bg-slate-700" />

            {/* === WOCHENSTUNDENPLAN CARD === */}
            <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-sm">
                <CardHeader>
                    <CardTitle className="flex items-center gap-3 text-slate-900 dark:text-white">
                        <Calendar className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                        Wochenstundenplan
                    </CardTitle>
                    <CardDescription className="text-slate-600 dark:text-slate-400">
                        Einstellungen für die wöchentliche Stundenplanansicht
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* Auto-Fit Checkbox */}
                    <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                        <Label className="flex items-center gap-3 text-slate-900 dark:text-white cursor-pointer">
                            <input
                                type="checkbox"
                                checked={settings.autoFit ?? true}
                                onChange={(e) => handleAutoFitChange(e.target.checked)}
                                className="w-4 h-4 rounded border-slate-300 dark:border-slate-600"
                            />
                            <div>
                                <div className="font-medium">Automatische Anpassung (Auto-Fit)</div>
                                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                                    Passt Zellengrößen dynamisch an den Bildschirm an
                                </p>
                            </div>
                        </Label>
                    </div>

                    {/* Sliders */}
                    <div className="space-y-6">
                        <SliderWithPreview
                            id="cellWidth"
                            label="Zellenbreite"
                            value={Math.min(settings.cellWidth || 120, maxCellWidth)}
                            min={100}
                            max={maxCellWidth}
                            step={10}
                            onChange={(value) => handleSettingChange('cellWidth', value)}
                            color="#3b82f6"
                            maxLabel={`(Max: ${maxCellWidth}px)`}
                        />

                        <SliderWithPreview
                            id="cellHeight"
                            label="Zellenhöhe"
                            value={Math.min(settings.cellHeight || 80, maxCellHeight)}
                            min={40}
                            max={maxCellHeight}
                            step={5}
                            onChange={(value) => handleSettingChange('cellHeight', value)}
                            color="#10b981"
                            maxLabel={`(Max: ${maxCellHeight}px)`}
                        />
                    </div>

                    {/* Preview */}
                    <div className="p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg border border-slate-200 dark:border-slate-600">
                        <h5 className="font-medium text-slate-900 dark:text-white mb-3 text-sm flex items-center gap-2">
                            <span className="w-2 h-2 bg-blue-600 rounded-full"></span>
                            Vorschau
                        </h5>
                        <div
                            className="border-2 border-slate-300 dark:border-slate-600 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 text-white flex items-center justify-center text-sm font-semibold shadow-md"
                            style={{
                                width: `${Math.min(settings.cellWidth || 120, maxCellWidth)}px`,
                                height: `${Math.min(settings.cellHeight || 80, maxCellHeight)}px`
                            }}
                        >
                            Beispielzelle
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                            {Math.min(settings.cellWidth || 120, maxCellWidth)}px × {Math.min(settings.cellHeight || 80, maxCellHeight)}px
                        </p>
                    </div>
                </CardContent>
            </Card>

            {/* === JAHRESANSICHT CARD === */}
            <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-sm">
                <CardHeader>
                    <CardTitle className="flex items-center gap-3 text-slate-900 dark:text-white">
                        <LayoutGrid className="w-5 h-5 text-green-600 dark:text-green-400" />
                        Jahresansicht
                    </CardTitle>
                    <CardDescription className="text-slate-600 dark:text-slate-400">
                        Einstellungen für die Jahresübersicht
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* Density Controls */}
                    <div className="space-y-3">
                        <Label className="text-slate-900 dark:text-white font-medium">Dichte</Label>
                        <div className="flex gap-3">
                            {['compact', 'standard', 'spacious'].map((mode) => (
                                <button
                                    key={mode}
                                    onClick={() => handleSettingChange('yearlyDensity', mode)}
                                    className={`flex-1 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                                        currentDensity === mode
                                            ? 'bg-green-600 text-white shadow-md ring-2 ring-green-400'
                                            : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-600'
                                    }`}
                                >
                                    {densityConfig[mode].label}
                                </button>
                            ))}
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-400">
                            Kompakt = kleinere Zellen • Standard = ausgeglichen • Großzügig = mehr Platz
                        </p>
                    </div>

                    {/* Preview */}
                    <div className="p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg border border-slate-200 dark:border-slate-600">
                        <h5 className="font-medium text-slate-900 dark:text-white mb-3 text-sm flex items-center gap-2">
                            <span className="w-2 h-2 bg-green-600 rounded-full"></span>
                            Vorschau
                        </h5>
                        <div className="flex gap-2">
                            {[1, 2, 3].map((i) => (
                                <div
                                    key={i}
                                    className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg text-white text-xs flex items-center justify-center font-semibold transition-all duration-200 shadow-md"
                                    style={{
                                        width: `${densityConfig[currentDensity].width}px`,
                                        height: `${densityConfig[currentDensity].height}px`,
                                    }}
                                >
                                    L{i}
                                </div>
                            ))}
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-3">
                            Zellgröße: {densityConfig[currentDensity].width}×{densityConfig[currentDensity].height}px
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
