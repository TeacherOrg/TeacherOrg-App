
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { X, Palette, Type, Monitor, Zap, Speaker, LayoutDashboard } from "lucide-react";

export default function CustomizationPanel({ customization, onCustomizationChange, onClose }) {
  const [activeTab, setActiveTab] = useState("appearance");

  const handleFontSizeChange = (element, size) => {
    onCustomizationChange({
      ...customization,
      fontSize: {
        ...customization.fontSize,
        [element]: size
      }
    });
  };

  const handleBackgroundChange = (type, value) => {
    onCustomizationChange({
      ...customization,
      background: { type, value }
    });
  };

  const handleToggleChange = (key, value) => {
    onCustomizationChange({
      ...customization,
      [key]: value
    });
  };

  const handleAudioChange = (key, value) => {
      onCustomizationChange({
          ...customization,
          audio: {
              ...customization.audio,
              [key]: value
          }
      });
  };

  const fontSizeOptions = [
    { value: 'text-sm', label: 'Klein' },
    { value: 'text-base', label: 'Normal' },
    { value: 'text-lg', label: 'Groß' },
    { value: 'text-xl', label: 'Sehr groß' },
    { value: 'text-2xl', label: 'Extra groß' },
    { value: 'text-3xl', label: 'Riesig' },
    { value: 'text-4xl', label: 'Gigantisch' },
    { value: 'text-5xl', label: 'Maximal' }
  ];

  const gradientOptions = [
    { value: 'from-blue-50 to-indigo-100 dark:from-slate-900 dark:to-slate-800', label: 'Blau (Standard)' },
    { value: 'from-green-50 to-emerald-100 dark:from-slate-900 dark:to-green-900', label: 'Grün' },
    { value: 'from-purple-50 to-violet-100 dark:from-slate-900 dark:to-purple-900', label: 'Lila' },
    { value: 'from-orange-50 to-amber-100 dark:from-slate-900 dark:to-orange-900', label: 'Orange' },
    { value: 'from-pink-50 to-rose-100 dark:from-slate-900 dark:to-pink-900', label: 'Rosa' },
    { value: 'from-gray-50 to-slate-100 dark:from-slate-900 dark:to-slate-800', label: 'Grau' }
  ];

  const highContrastOptions = [
      { value: 'from-white to-gray-200 dark:from-black dark:to-gray-900', label: 'Graustufen Hochkontrast' },
      { value: 'from-yellow-200 to-yellow-400 dark:from-black dark:to-blue-900', label: 'Blau/Gelb Hochkontrast' }
  ];

  const backgroundImages = [
    { value: 'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=1920&h=1080&fit=crop', label: 'Klassenzimmer' },
    { value: 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=1920&h=1080&fit=crop', label: 'Bibliothek' },
    { value: 'https://images.unsplash.com/photo-1427504494785-3a9ca7044f45?w=1920&h=1080&fit=crop', label: 'Natur' },
    { value: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1920&h=1080&fit=crop', label: 'Berge' },
    { value: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=1920&h=1080&fit=crop', label: 'Wald' }
  ];

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex justify-between items-center p-6 border-b border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
            <Palette className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200">
              Anzeige anpassen
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Personalisieren Sie die Tagesansicht für Ihr Klassenzimmer
            </p>
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="w-5 h-5" />
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="appearance" className="flex items-center gap-2">
              <Palette className="w-4 h-4" />
              Design
            </TabsTrigger>
            <TabsTrigger value="typography" className="flex items-center gap-2">
              <Type className="w-4 h-4" />
              Schrift
            </TabsTrigger>
            <TabsTrigger value="layout" className="flex items-center gap-2">
              <LayoutDashboard className="w-4 h-4" />
              Layout
            </TabsTrigger>
            <TabsTrigger value="behavior" className="flex items-center gap-2">
              <Zap className="w-4 h-4" />
              Verhalten
            </TabsTrigger>
            <TabsTrigger value="audio" className="flex items-center gap-2">
                <Speaker className="w-4 h-4" />
                Audio
            </TabsTrigger>
          </TabsList>

          <TabsContent value="appearance" className="space-y-6 mt-6">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200">
                Hintergrund
              </h3>
              
              <div className="space-y-4">
                <div>
                  <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    Hintergrund-Typ
                  </Label>
                  <Select
                    value={customization.background.type}
                    onValueChange={(value) => handleBackgroundChange(value, customization.background.value)}
                  >
                    <SelectTrigger className="w-full mt-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="gradient">Verlauf</SelectItem>
                      <SelectItem value="solid">Einfarbig</SelectItem>
                      <SelectItem value="image">Bild</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {customization.background.type === 'gradient' && (
                  <div>
                    <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      Verlauf auswählen
                    </Label>
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      {gradientOptions.map((option) => (
                        <button
                          key={option.value}
                          onClick={() => handleBackgroundChange('gradient', option.value)}
                          className={`p-3 rounded-lg border-2 transition-all ${
                            customization.background.value === option.value
                              ? 'border-blue-500'
                              : 'border-slate-300 hover:border-slate-400'
                          }`}
                        >
                          <div className={`w-full h-8 rounded bg-gradient-to-r ${option.value}`} />
                          <p className="text-xs mt-1 text-slate-600 dark:text-slate-400">
                            {option.label}
                          </p>
                        </button>
                      ))}
                    </div>
                     <Label className="text-sm font-medium text-slate-700 dark:text-slate-300 mt-4">
                      Hochkontrast-Verläufe
                    </Label>
                    <div className="grid grid-cols-2 gap-2 mt-2">
                       {highContrastOptions.map((option) => (
                        <button
                          key={option.value}
                          onClick={() => handleBackgroundChange('gradient', option.value)}
                          className={`p-3 rounded-lg border-2 transition-all ${
                            customization.background.value === option.value
                              ? 'border-blue-500'
                              : 'border-slate-300 hover:border-slate-400'
                          }`}
                        >
                          <div className={`w-full h-8 rounded bg-gradient-to-r ${option.value}`} />
                          <p className="text-xs mt-1 text-slate-600 dark:text-slate-400">
                            {option.label}
                          </p>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {customization.background.type === 'solid' && (
                  <div>
                    <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      Farbe
                    </Label>
                    <Input
                      type="color"
                      value={customization.background.value || '#ffffff'}
                      onChange={(e) => handleBackgroundChange('solid', e.target.value)}
                      className="w-full h-12 mt-2"
                    />
                  </div>
                )}

                {customization.background.type === 'image' && (
                  <div>
                    <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      Hintergrundbild
                    </Label>
                    <div className="grid grid-cols-1 gap-2 mt-2">
                      {backgroundImages.map((option) => (
                        <button
                          key={option.value}
                          onClick={() => handleBackgroundChange('image', option.value)}
                          className={`p-2 rounded-lg border-2 transition-all ${
                            customization.background.value === option.value
                              ? 'border-blue-500'
                              : 'border-slate-300 hover:border-slate-400'
                          }`}
                        >
                          <div 
                            className="w-full h-16 rounded bg-cover bg-center"
                            style={{ backgroundImage: `url(${option.value})` }}
                          />
                          <p className="text-xs mt-1 text-slate-600 dark:text-slate-400">
                            {option.label}
                          </p>
                        </button>
                      ))}
                    </div>
                    <div className="mt-2">
                      <Input
                        placeholder="Oder eigene URL eingeben..."
                        value={customization.background.type === 'image' ? customization.background.value : ''}
                        onChange={(e) => handleBackgroundChange('image', e.target.value)}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="typography" className="space-y-6 mt-6">
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200">
                Schriftgrößen
              </h3>
              
              <div className="space-y-4">
                <div>
                  <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    Titel-Schrift
                  </Label>
                  <Select
                    value={customization.fontSize.title}
                    onValueChange={(value) => handleFontSizeChange('title', value)}
                  >
                    <SelectTrigger className="w-full mt-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {fontSizeOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    Inhalt-Schrift
                  </Label>
                  <Select
                    value={customization.fontSize.content}
                    onValueChange={(value) => handleFontSizeChange('content', value)}
                  >
                    <SelectTrigger className="w-full mt-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {fontSizeOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    Uhr-Schrift
                  </Label>
                  <Select
                    value={customization.fontSize.clock}
                    onValueChange={(value) => handleFontSizeChange('clock', value)}
                  >
                    <SelectTrigger className="w-full mt-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {fontSizeOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="layout" className="space-y-6 mt-6">
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200">
                Sichtbarkeit der Panels
              </h3>
              <div className="space-y-4">
                 <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      Lektions-Übersicht anzeigen
                    </Label>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      Zeigt die linke Spalte mit allen Lektionen des Tages.
                    </p>
                  </div>
                  <Switch
                    checked={customization.showOverview}
                    onCheckedChange={(checked) => handleToggleChange('showOverview', checked)}
                  />
                </div>
                 <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      Lehrer-Notizen anzeigen
                    </Label>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      Zeigt die rechte Spalte für persönliche Notizen an.
                    </p>
                  </div>
                  <Switch
                    checked={customization.showNotes}
                    onCheckedChange={(checked) => handleToggleChange('showNotes', checked)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      Uhrzeit anzeigen
                    </Label>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      Zeigt die Uhr oben rechts an.
                    </p>
                  </div>
                  <Switch
                    checked={customization.showClock}
                    onCheckedChange={(checked) => handleToggleChange('showClock', checked)}
                  />
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="behavior" className="space-y-6 mt-6">
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200">
                Automatisches Verhalten
              </h3>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      Aktuelle Lektion automatisch anzeigen
                    </Label>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      Zeigt automatisch die Details der gerade laufenden Lektion an
                    </p>
                  </div>
                  <Switch
                    checked={customization.autoFocusCurrentLesson}
                    onCheckedChange={(checked) => handleToggleChange('autoFocusCurrentLesson', checked)}
                  />
                </div>

                {/* ENTFERNT: "Pausen anzeigen", da diese nun anders gehandhabt werden */}
                {/* ENTFERNT: "Lehrer-Notizen anzeigen" (moved to Layout tab) */}

                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      Kompakter Modus
                    </Label>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      Reduziert Abstände und Größen für mehr Inhalt auf dem Bildschirm
                    </p>
                  </div>
                  <Switch
                    checked={customization.compactMode}
                    onCheckedChange={(checked) => handleToggleChange('compactMode', checked)}
                  />
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="audio" className="space-y-6 mt-6">
            <div className="space-y-6">
                 <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200">
                    Audio-Benachrichtigungen
                 </h3>
                 <div className="space-y-4">
                     <div className="flex items-center justify-between">
                         <div>
                             <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                 Audio-Signal am Stundenende
                             </Label>
                             <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                 Spielt einen kurzen Ton am Ende jeder Lektion ab
                             </p>
                         </div>
                         <Switch
                            checked={customization.audio?.enabled}
                            onCheckedChange={(checked) => handleAudioChange('enabled', checked)}
                         />
                     </div>
                      <div className="flex items-center justify-between">
                         <div>
                             <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                 Lautstärke
                             </Label>
                         </div>
                         <div className="flex items-center gap-2 w-1/2">
                             <input
                                 type="range"
                                 min="0"
                                 max="1"
                                 step="0.1"
                                 value={customization.audio?.volume || 0.5}
                                 onChange={(e) => handleAudioChange('volume', parseFloat(e.target.value))}
                                 className="w-full"
                                 disabled={!customization.audio?.enabled}
                             />
                             <span>{Math.round((customization.audio?.volume || 0.5) * 100)}%</span>
                         </div>
                     </div>
                 </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Footer */}
      <div className="p-6 border-t border-slate-200 dark:border-slate-700">
        <div className="flex justify-between items-center">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Änderungen werden automatisch gespeichert
          </p>
          <Button onClick={onClose} className="bg-blue-600 hover:bg-blue-700">
            Fertig
          </Button>
        </div>
      </div>
    </div>
  );
}
