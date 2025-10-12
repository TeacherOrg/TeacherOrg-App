// src/components/grades/hooks/usePreferences.js
import { useState, useEffect, useCallback, useRef } from 'react';
import { UserPreferences, User } from '@/api/entities';
import debounce from "lodash/debounce";
import pb from '@/api/pb';

export const usePreferences = (activeClassId) => {
  const [expandedLeistungenRows, setExpandedLeistungenRows] = useState(new Set());
  const [expandedUeberfachlichHistories, setExpandedUeberfachlichHistories] = useState(new Set());
  const [expandedUeberfachlichCompetencies, setExpandedUeberfachlichCompetencies] = useState(new Set());
  const [tab, setTab] = useState('diagramme'); // Standardwert ist immer 'diagramme'
  const [isLoading, setIsLoading] = useState(true);
  const requestCounter = useRef(0); // Zähler für aktuelle Requests

  const savePreferences = useCallback(
    debounce(async (customData = null) => {
      if (!activeClassId) {
        console.warn('No activeClassId provided, skipping savePreferences');
        return;
      }

      const user = User.current();
      if (!user || !user.id) {
        console.warn('No user found for saving preferences');
        return;
      }

      const requestId = `save-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      requestCounter.current = requestCounter.current + 1;
      const currentRequest = requestCounter.current;

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

        const preference = await UserPreferences.findOne({
          user_id: user.id,
          class_id: activeClassId,
          $cancelKey: requestId
        });

        if (requestCounter.current !== currentRequest) {
          console.log('savePreferences - Request outdated, skipping');
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
        if (!error.message?.includes('autocancelled')) {
          console.error('savePreferences - Error:', error);
        }
      }
    }, 500),
    [activeClassId, expandedLeistungenRows, expandedUeberfachlichHistories, expandedUeberfachlichCompetencies, tab]
  );

  const loadPreferences = useCallback(async () => {
    if (!activeClassId) {
      console.warn('No activeClassId provided, skipping loadPreferences');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    requestCounter.current = requestCounter.current + 1;
    const currentRequest = requestCounter.current;

    console.log('=== LOAD PREFERENCES START ===');
    console.log('Current tab before loading:', tab, 'isLoading:', isLoading, 'activeClassId:', activeClassId);

    try {
      const user = User.current();
      if (!user || !user.id) {
        console.warn('No user found for loading preferences');
        setTab('diagramme');
        setIsLoading(false);
        return;
      }

      console.log('Loading preferences for user:', user.id, 'class:', activeClassId);

      const preference = await UserPreferences.findOne({
        user_id: user.id,
        class_id: activeClassId,
        $cancelKey: `load-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      });

      if (requestCounter.current !== currentRequest) {
        console.log('loadPreferences - Request outdated, skipping');
        setIsLoading(false);
        return;
      }

      // Always force initial tab to 'diagramme'
      const initialTab = 'diagramme';
      console.log('Forcing initial tab to:', initialTab);
      setTab(initialTab);

      if (preference?.preferences) {
        console.log('Found preference:', preference.id, 'Data:', preference.preferences);

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

        // Correct saved tab if not 'diagramme'
        const savedTab = preference.preferences.performanceTab;
        if (savedTab !== initialTab) {
          await UserPreferences.update(preference.id, {
            preferences: {
              expandedLeistungenRows: preference.preferences.expandedLeistungenRows || [],
              expandedUeberfachlichHistories: preference.preferences.expandedUeberfachlichHistories || [],
              expandedUeberfachlichCompetencies: preference.preferences.expandedUeberfachlichCompetencies || [],
              performanceTab: initialTab
            }
          }, { $cancelKey: `force-tab-${Date.now()}-${Math.random().toString(36).substr(2, 9)}` });
          console.log('Preferences saved with corrected tab:', initialTab);
        }
      } else {
        console.log('No preferences found, creating with defaults');
        const defaultPreferences = {
          expandedLeistungenRows: [],
          expandedUeberfachlichHistories: [],
          expandedUeberfachlichCompetencies: [],
          performanceTab: 'diagramme'
        };

        await UserPreferences.create({
          user_id: user.id,
          class_id: activeClassId,
          preferences: defaultPreferences
        }, { $cancelKey: `create-default-${Date.now()}-${Math.random().toString(36).substr(2, 9)}` });

        setTab('diagramme');
        setExpandedLeistungenRows(new Set());
        setExpandedUeberfachlichHistories(new Set());
        setExpandedUeberfachlichCompetencies(new Set());
      }
    } catch (error) {
      if (!error.message?.includes('autocancelled')) {
        console.error('Error loading preferences:', error);
        setTab('diagramme');
        setExpandedLeistungenRows(new Set());
        setExpandedUeberfachlichHistories(new Set());
        setExpandedUeberfachlichCompetencies(new Set());
      }
    } finally {
      setIsLoading(false);
      console.log('=== LOAD PREFERENCES END === - tab now:', tab);
    }
  }, [activeClassId]);

  useEffect(() => {
    if (activeClassId) {
      loadPreferences();
    }
  }, [loadPreferences]);

  useEffect(() => {
    if (!activeClassId) return;
    const user = User.current();
    if (!user || !user.id) return;

    const filter = `user_id = '${user.id}' && class_id = '${activeClassId}'`;
    let lastProcessedRecordId = null;

    const subscription = pb.collection('user_preferences').subscribe('*', async (e) => {
      if (e.record.user_id !== user.id || e.record.class_id !== activeClassId || e.record.id === lastProcessedRecordId) {
        return;
      }

      lastProcessedRecordId = e.record.id;

      const requestId = `realtime-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      requestCounter.current = requestCounter.current + 1;
      const currentRequest = requestCounter.current;

      try {
        const updated = await UserPreferences.findOne({
          user_id: user.id,
          class_id: activeClassId,
          $cancelKey: requestId
        });

        if (requestCounter.current !== currentRequest) {
          console.log('Realtime load - Request outdated, skipping');
          return;
        }

        console.log('Realtime Subscription - Raw preferences:', updated?.preferences);

        if (updated?.preferences) {
          const preferences = {
            expandedLeistungenRows: Array.isArray(updated.preferences.expandedLeistungenRows)
              ? updated.preferences.expandedLeistungenRows
              : [],
            expandedUeberfachlichHistories: Array.isArray(updated.preferences.expandedUeberfachlichHistories)
              ? updated.preferences.expandedUeberfachlichHistories
              : [],
            expandedUeberfachlichCompetencies: Array.isArray(updated.preferences.expandedUeberfachlichCompetencies)
              ? updated.preferences.expandedUeberfachlichCompetencies
              : [],
            performanceTab: updated.preferences.performanceTab && ['diagramme', 'leistungen', 'ueberfachlich'].includes(updated.preferences.performanceTab)
              ? updated.preferences.performanceTab
              : 'diagramme'
          };

          console.log('Realtime Subscription - Processing:', preferences);

          setExpandedLeistungenRows(new Set(preferences.expandedLeistungenRows));
          setExpandedUeberfachlichHistories(new Set(preferences.expandedUeberfachlichHistories));
          setExpandedUeberfachlichCompetencies(new Set(preferences.expandedUeberfachlichCompetencies));

          // Nur Tab aktualisieren, wenn sich der Wert geändert hat
          if (preferences.performanceTab !== tab) {
            setTab(preferences.performanceTab);
            console.log('Realtime Subscription - Updated tab to:', preferences.performanceTab);
          }

          // Korrigiere Tab, wenn ungültig
          if (updated.preferences.performanceTab !== preferences.performanceTab) {
            await UserPreferences.update(updated.id, {
              preferences: preferences
            }, { $cancelKey: `realtime-fix-${Date.now()}-${Math.random().toString(36).substr(2, 9)}` });
            console.log('Realtime: Corrected invalid tab to:', preferences.performanceTab);
          }
        } else {
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
    }, { filter });

    return () => {
      pb.collection('user_preferences').unsubscribe('*');
      console.log('Unsubscribed from user_preferences');
    };
  }, [activeClassId, tab]);

  const setValidTab = useCallback((newTab) => {
    const validTabs = ['diagramme', 'leistungen', 'ueberfachlich'];
    if (validTabs.includes(newTab)) {
      setTab(newTab);
      savePreferences({
        expandedLeistungenRows: Array.from(expandedLeistungenRows),
        expandedUeberfachlichHistories: Array.from(expandedUeberfachlichHistories),
        expandedUeberfachlichCompetencies: Array.from(expandedUeberfachlichCompetencies),
        performanceTab: newTab
      });
    } else {
      console.warn('Invalid tab attempted:', newTab);
      setTab('diagramme');
      savePreferences({
        expandedLeistungenRows: Array.from(expandedLeistungenRows),
        expandedUeberfachlichHistories: Array.from(expandedUeberfachlichHistories),
        expandedUeberfachlichCompetencies: Array.from(expandedUeberfachlichCompetencies),
        performanceTab: 'diagramme'
      });
    }
  }, [savePreferences, expandedLeistungenRows, expandedUeberfachlichHistories, expandedUeberfachlichCompetencies]);

  const resetAllExpansions = useCallback(() => {
    setExpandedLeistungenRows(new Set());
    setExpandedUeberfachlichHistories(new Set());
    setExpandedUeberfachlichCompetencies(new Set());
    savePreferences({
      expandedLeistungenRows: [],
      expandedUeberfachlichHistories: [],
      expandedUeberfachlichCompetencies: [],
      performanceTab: tab
    });
  }, [savePreferences, tab]);

  return {
    tab,
    setTab: setValidTab,
    expandedLeistungenRows,
    setExpandedLeistungenRows,
    expandedUeberfachlichHistories,
    setExpandedUeberfachlichHistories,
    expandedUeberfachlichCompetencies,
    setExpandedUeberfachlichCompetencies,
    savePreferences,
    resetAllExpansions,
    isLoading
  };
};