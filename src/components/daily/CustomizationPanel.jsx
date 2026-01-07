import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { X, Palette, Type, Zap, Speaker, Play } from "lucide-react";
import { SOUND_OPTIONS, previewSound } from "@/utils/audioSounds";

export default function CustomizationPanel({ customization, onCustomizationChange, onClose }) {
  // DEBUG: Log props bei jedem Render
  console.log('[CustomizationPanel] Render mit theme:', customization.theme);

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

  const handleThemeChange = (theme) => {
    console.log('[CustomizationPanel] handleThemeChange:', {
      newTheme: theme,
      currentPropsTheme: customization.theme
    });
    onCustomizationChange({
      ...customization,
      theme
    });
  };

  // Titel und Inhalt: Größere Optionen (text-xl als Normal)
  const titleContentFontSizeOptions = [
    { value: 'text-xl', label: 'Normal' },
    { value: 'text-2xl', label: 'Groß' },
    { value: 'text-3xl', label: 'Sehr groß' },
  ];

  // Steps: Kleinere Optionen
  const stepsFontSizeOptions = [
    { value: 'text-base', label: 'Normal' },
    { value: 'text-lg', label: 'Groß' },
    { value: 'text-xl', label: 'Sehr groß' },
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
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-4">
            <TabsTrigger value="appearance" className="flex items-center gap-2">
              <Palette className="w-4 h-4" />
              Design
            </TabsTrigger>
            <TabsTrigger value="typography" className="flex items-center gap-2">
              <Type className="w-4 h-4" />
              Schrift
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
                Thema auswählen
              </h3>
              <Select
                value={customization.theme || 'default'}
                onValueChange={handleThemeChange}
              >
                <SelectTrigger className="w-full mt-2">
                  <SelectValue placeholder="Thema wählen" />
                </SelectTrigger>
                <SelectContent className="z-[200]">
                  <SelectItem value="default">Standard</SelectItem>
                  <SelectItem value="space">Weltraum</SelectItem>
                </SelectContent>
              </Select>
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
                    <SelectContent className="z-[200]">
                      {titleContentFontSizeOptions.map((option) => (
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
                    <SelectContent className="z-[200]">
                      {titleContentFontSizeOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    Steps-Schrift
                  </Label>
                  <Select
                    value={customization.fontSize.steps || 'text-base'}
                    onValueChange={(value) => handleFontSizeChange('steps', value)}
                  >
                    <SelectTrigger className="w-full mt-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="z-[200]">
                      {stepsFontSizeOptions.map((option) => (
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

          <TabsContent value="behavior" className="space-y-6 mt-6">
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200">
                Automatisches Verhalten
              </h3>
              
              <div className="space-y-4">
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

                     {/* Ton-Auswahl */}
                     <div className="space-y-2">
                         <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                             Ton auswählen
                         </Label>
                         <div className="flex items-center gap-2">
                             <Select
                                 value={customization.audio?.sound || 'chime'}
                                 onValueChange={(value) => handleAudioChange('sound', value)}
                                 disabled={!customization.audio?.enabled}
                             >
                                 <SelectTrigger className="flex-1">
                                     <SelectValue placeholder="Ton wählen" />
                                 </SelectTrigger>
                                 <SelectContent className="z-[200]">
                                     {SOUND_OPTIONS.map((option) => (
                                         <SelectItem key={option.value} value={option.value}>
                                             <div className="flex flex-col">
                                                 <span>{option.label}</span>
                                                 <span className="text-xs text-slate-500">{option.description}</span>
                                             </div>
                                         </SelectItem>
                                     ))}
                                 </SelectContent>
                             </Select>
                             <Button
                                 variant="outline"
                                 size="icon"
                                 onClick={() => previewSound(customization.audio?.sound || 'chime', customization.audio?.volume || 0.5)}
                                 disabled={!customization.audio?.enabled}
                                 title="Ton abspielen"
                             >
                                 <Play className="w-4 h-4" />
                             </Button>
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