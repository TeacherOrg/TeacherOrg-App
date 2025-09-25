// src/components/grades/hooks/usePreferences.js
import { useState, useEffect, useCallback, useRef } from 'react';
import { UserPreferences, User } from '@/api/entities';
import debounce from "lodash/debounce"; // Use lodash/debounce
import pb from '@/api/pb';

export const usePreferences = (activeClassId) => {
  // ✅ FIX 1: Initial State korrigiert - NIE 'loading'
  const [expandedLeistungenRows, setExpandedLeistungenRows] = useState(new Set());
  const [expandedUeberfachlichHistories, setExpandedUeberfachlichHistories] = useState(new Set());
  const [expandedUeberfachlichCompetencies, setExpandedUeberfachlichCompetencies] = useState(new Set());
  const [tab, setTab] = useState('diagramme'); // Fix: Direkt 'diagramme' statt 'loading'
  const [isLoading, setIsLoading] = useState(true);

  // ✅ FIX 3: Request-ID für besseres Autocancellation-Handling
  const requestRef = useRef(null);

  const savePreferences = useCallback(
    debounce(async (customData = null) => {
      if (!activeClassId) return;
      const user = User.current();
      if (!user) return;

      // ✅ FIX 3: Unique Request-ID für jeden Save-Call
      const requestId = `save-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      requestRef.current = requestId;

      try {
        const currentPreferences = {
          expandedLeistungenRows: Array.from(expandedLeistungenRows),
          expandedUeberfachlichHistories: Array.from(expandedUeberfachlichHistories),
          expandedUeberfachlichCompetencies: Array.from(expandedUeberfachlichCompetencies),
          performanceTab: tab
        };

        const preferencesToSave = customData || currentPreferences;

        if (process.env.NODE_ENV === 'development') {
          console.log('savePreferences - Saving:', preferencesToSave);
        }

        // ✅ FIX 3: Unique $cancelKey für jeden Request
        const preference = await UserPreferences.findOne({
          user_id: user.id,
          class_id: activeClassId,
          $cancelKey: requestId
        });

        // Prüfe, ob dies immer noch der aktuelle Request ist
        if (requestRef.current !== requestId) {
          if (process.env.NODE_ENV === 'development') {
            console.log('savePreferences - Request outdated, skipping');
          }
          return;
        }

        if (preference) {
          await UserPreferences.update(preference.id, {
            preferences: preferencesToSave
          }, { $cancelKey: requestId });
        } else {
          await UserPreferences.create({
            user_id: user.id,
            class_id: activeClassId,
            preferences: preferencesToSave
          }, { $cancelKey: requestId });
        }

        if (process.env.NODE_ENV === 'development') {
          console.log('savePreferences - Success');
        }
      } catch (error) {
        // ✅ FIX 3: Bessere Autocancellation-Behandlung
        if (error.message?.includes('autocancelled')) {
          if (process.env.NODE_ENV === 'development') {
            console.log('savePreferences - Request was autocancelled (normal)');
          }
        } else {
          console.error('savePreferences - Error:', error);
        }
      }
    }, 500),
    [activeClassId, expandedLeistungenRows, expandedUeberfachlichHistories, expandedUeberfachlichCompetencies, tab]
  );

  // Load Preferences - KOMPLETT KORRIGIERT
  useEffect(() => {
    const loadPreferences = async () => {
      console.log('=== LOAD PREFERENCES START ===');
      console.log('Current tab before loading:', tab, 'isLoading:', isLoading, 'activeClassId:', activeClassId);

      // ✅ Nur laden, wenn activeClassId vorhanden
      if (!activeClassId) {
        console.log('No activeClassId - skipping load');
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        const user = User.current();
        if (!user) {
          console.log('No user - setting defaults');
          setTab('diagramme');  
          setIsLoading(false);
          return;
        }

        console.log('Loading preferences for user:', user.id, 'class:', activeClassId);

        // ✅ FIX 3: Unique Request-ID für Load
        const loadRequestId = `load-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        requestRef.current = loadRequestId;

        const preference = await UserPreferences.findOne({
          user_id: user.id,
          class_id: activeClassId,
          $cancelKey: loadRequestId
        });

        // Prüfe, ob dies immer noch der aktuelle Request ist
        if (requestRef.current !== loadRequestId) {
          console.log('loadPreferences - Request outdated, skipping');
          setIsLoading(false);
          return;
        }

        console.log('Found preference:', !!preference, 'Data:', preference?.preferences);

        if (preference?.preferences) {
          // ✅ FIX 2: Korrekte Expansion-States setzen
          setExpandedLeistungenRows(new Set(
            Array.isArray(preference.preferences.expandedLeistungenRows)
              ? preference.preferences.expandedLeistungenRows
              : []
          ));
          setExpandedUeberfachlichHistories(new Set(
            Array.isArray(preference.preferences.expandedUeberfachlichHistories)
              ? preference.preferences.expandedUeberfachlichHistories
              : []
          ));
          setExpandedUeberfachlichCompetencies(new Set(
            Array.isArray(preference.preferences.expandedUeberfachlichCompetencies)
              ? preference.preferences.expandedUeberfachlichCompetencies
              : []
          ));

          // ✅ FIX: Immer 'diagramme' priorisieren beim Initial-Load
          const savedTab = preference.preferences.performanceTab;
          const initialTab = ['diagramme', 'leistungen', 'ueberfachlich'].includes(savedTab) ? savedTab : 'diagramme';
          console.log('Setting initial tab from preferences:', initialTab);
          setTab(initialTab);

          // ✅ Speichere mit korrigiertem Tab (nur wenn nötig)
          const forcedPreferences = {
            expandedLeistungenRows: preference.preferences.expandedLeistungenRows || [],
            expandedUeberfachlichHistories: preference.preferences.expandedUeberfachlichHistories || [],
            expandedUeberfachlichCompetencies: preference.preferences.expandedUeberfachlichCompetencies || [],
            // ✅ Force 'diagramme' wenn invalid oder loading
            performanceTab: initialTab === 'loading' ? 'diagramme' : initialTab
          };

          // Nur speichern, wenn Tab korrigiert werden musste
          if (savedTab !== forcedPreferences.performanceTab) {
            try {
              await UserPreferences.update(preference.id, {
                preferences: forcedPreferences
              }, { $cancelKey: `force-tab-${Date.now()}-${Math.random().toString(36).substr(2, 9)}` });
              console.log('Preferences saved with corrected tab:', forcedPreferences.performanceTab);
            } catch (saveError) {
              if (!saveError.message?.includes('autocancelled')) {
                console.error('Error saving corrected preferences:', saveError);
              }
            }
          }
        } else {
          console.log('No preference found - creating with defaults');
          const defaultPreferences = {
            expandedLeistungenRows: [],
            expandedUeberfachlichHistories: [],
            expandedUeberfachlichCompetencies: [],
            performanceTab: 'diagramme' // ← Immer 'diagramme'
          };

          try {
            await UserPreferences.create({
              user_id: user.id,
              class_id: activeClassId,
              preferences: defaultPreferences
            }, { $cancelKey: `create-default-${Date.now()}-${Math.random().toString(36).substr(2, 9)}` });
            console.log('Default preferences created successfully');
          } catch (createError) {
            if (!createError.message?.includes('autocancelled')) {
              console.error('Error creating default preferences:', createError);
            }
          }

          // ✅ Explizit Defaults setzen
          setTab('diagramme');
          setExpandedLeistungenRows(new Set());
          setExpandedUeberfachlichHistories(new Set());
          setExpandedUeberfachlichCompetencies(new Set());
        }
      } catch (error) {
        if (!error.message?.includes('autocancelled')) {
          console.error('Error loading preferences:', error);
          // ✅ Fallback zu Defaults bei Fehler
          setTab('diagramme');
          setExpandedLeistungenRows(new Set());
          setExpandedUeberfachlichHistories(new Set());
          setExpandedUeberfachlichCompetencies(new Set());
        }
      } finally {
        console.log('=== LOAD PREFERENCES END === - tab now:', tab);
        setIsLoading(false);
      }
    };

    // ✅ FIX: Lade IMMER, wenn activeClassId vorhanden ist (nicht nur wenn !isLoading)
    if (activeClassId) {
      loadPreferences();
    }

    // Cleanup
    return () => {
      if (requestRef.current) {
        requestRef.current = null;
      }
    };
  }, [activeClassId]); // ← Entferne isLoading aus Dependencies

  // Realtime Subscription - KORRIGIERT
  useEffect(() => {
    if (!activeClassId) return;
    const user = User.current();
    if (!user) return;

    let lastProcessedRecordId = null;
    let isUnsubscribed = false;
    let subscriptionRequestId = `sub-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const subscription = pb.collection('user_preferences').subscribe('*', async (e) => {
      if (isUnsubscribed) return;

      // ✅ Nur für den aktuellen User und die aktuelle Klasse
      if (
        e.record.user_id === user.id &&
        e.record.class_id === activeClassId &&
        e.record.id !== lastProcessedRecordId &&
        e.action !== 'delete'
      ) {
        try {
          lastProcessedRecordId = e.record.id;

          // ✅ FIX 3: Unique Request-ID für Realtime-Load
          const realtimeRequestId = `realtime-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
          requestRef.current = realtimeRequestId;

          const updated = await UserPreferences.findOne({
            user_id: user.id,
            class_id: activeClassId,
            $cancelKey: realtimeRequestId
          });

          // Prüfe, ob Request noch aktuell ist
          if (requestRef.current !== realtimeRequestId) {
            console.log('Realtime load - Request outdated, skipping');
            return;
          }

          console.log('Realtime Subscription - Raw preferences:', updated?.preferences);

          if (updated?.preferences) {
            const forcedRealtimePreferences = {
              expandedLeistungenRows: updated.preferences.expandedLeistungenRows || [],
              expandedUeberfachlichHistories: updated.preferences.expandedUeberfachlichHistories || [],
              expandedUeberfachlichCompetencies: updated.preferences.expandedUeberfachlichCompetencies || [],
              // ✅ FIX 2: Immer gültigen Tab erzwingen
              performanceTab: updated.preferences.performanceTab && 
                             ['diagramme', 'leistungen', 'ueberfachlich'].includes(updated.preferences.performanceTab)
                ? updated.preferences.performanceTab
                : 'diagramme'
            };

            console.log('Realtime Subscription - Processing:', forcedRealtimePreferences);

            // ✅ Nur gültige Expansion-Arrays setzen
            setExpandedLeistungenRows(new Set(
              Array.isArray(forcedRealtimePreferences.expandedLeistungenRows)
                ? forcedRealtimePreferences.expandedLeistungenRows
                : []
            ));
            setExpandedUeberfachlichHistories(new Set(
              Array.isArray(forcedRealtimePreferences.expandedUeberfachlichHistories)
                ? forcedRealtimePreferences.expandedUeberfachlichHistories
                : []
            ));
            setExpandedUeberfachlichCompetencies(new Set(
              Array.isArray(forcedRealtimePreferences.expandedUeberfachlichCompetencies)
                ? forcedRealtimePreferences.expandedUeberfachlichCompetencies
                : []
            ));

            // ✅ Tab nur setzen, wenn gültig
            const realtimeTab = forcedRealtimePreferences.performanceTab;
            if (['diagramme', 'leistungen', 'ueberfachlich'].includes(realtimeTab)) {
              setTab(realtimeTab);
            }

            // ✅ Zurückschreiben, falls Tab korrigiert wurde
            if (updated.preferences.performanceTab !== forcedRealtimePreferences.performanceTab) {
              try {
                await UserPreferences.update(updated.id, {
                  preferences: forcedRealtimePreferences
                }, { $cancelKey: `realtime-fix-${Date.now()}-${Math.random().toString(36).substr(2, 9)}` });
                console.log('Realtime: Corrected invalid tab to:', forcedRealtimePreferences.performanceTab);
              } catch (updateError) {
                if (!updateError.message?.includes('autocancelled')) {
                  console.error('Realtime: Error correcting tab:', updateError);
                }
              }
            }
          } else {
            // ✅ Fallback zu Defaults bei ungültigen Preferences
            console.log('Realtime: Invalid preferences, setting defaults');
            setExpandedLeistungenRows(new Set());
            setExpandedUeberfachlichHistories(new Set());
            setExpandedUeberfachlichCompetencies(new Set());
            setTab('diagramme');
          }
        } catch (error) {
          if (!error.message?.includes('autocancelled')) {
            console.error('Realtime Subscription - Error:', error);
          }
        }
      }
    });

    return () => {
      isUnsubscribed = true;
      pb.collection('user_preferences').unsubscribe('*');
      requestRef.current = null;
    };
  }, [activeClassId]);

  // ✅ Hilfsfunktion: Tab-Setter mit Validierung
  const setValidTab = useCallback((newTab) => {
    const validTabs = ['diagramme', 'leistungen', 'ueberfachlich'];
    if (validTabs.includes(newTab)) {
      setTab(newTab);
      // Automatisch speichern
      savePreferences({
        performanceTab: newTab
      });
    } else {
      console.warn('Invalid tab attempted:', newTab);
    }
  }, [savePreferences]);

  // ✅ Hilfsfunktion: Alle Expansion-States zurücksetzen
  const resetAllExpansions = useCallback(() => {
    setExpandedLeistungenRows(new Set());
    setExpandedUeberfachlichHistories(new Set());
    setExpandedUeberfachlichCompetencies(new Set());
  }, []);

  return {
    // States
    tab,
    setTab: setValidTab, // ← Validierte Version
    expandedLeistungenRows,
    setExpandedLeistungenRows,
    expandedUeberfachlichHistories,
    setExpandedUeberfachlichHistories,
    expandedUeberfachlichCompetencies,
    setExpandedUeberfachlichCompetencies,
    
    // Actions
    savePreferences,
    resetAllExpansions,
    
    // Status
    isLoading
  };
};