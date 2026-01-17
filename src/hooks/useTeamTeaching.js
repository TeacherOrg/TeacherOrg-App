import { useState, useEffect, useCallback } from 'react';
import { TeamTeaching, Class } from '@/api/entities';
import { findUserByEmail } from '@/api/userService';
import pb from '@/api/pb';

/**
 * Hook für Team Teaching Funktionalität
 * Ermöglicht das Teilen von Klassen zwischen Lehrpersonen
 */
export function useTeamTeaching() {
  const [pendingInvitations, setPendingInvitations] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const currentUserId = pb.authStore.model?.id;

  /**
   * Lädt alle Klassen, auf die der User Zugriff hat (eigene + geteilte)
   * @returns {Promise<Array>} Klassen mit Berechtigungs-Info
   */
  const getAccessibleClasses = useCallback(async () => {
    if (!currentUserId) return [];

    try {
      // 1. Eigene Klassen laden
      const ownedClasses = await Class.list({ user_id: currentUserId });

      // 2. Geteilte Klassen laden (nur akzeptierte) - mit expand für Klassendaten
      // Direkter PocketBase-Aufruf um expand-Daten zu behalten (Entity.list() entfernt expand durch normalizeData)
      // WICHTIG: owner_id != currentUserId um Self-Team-Teaching-Records auszuschließen
      const sharedAccess = await pb.collection('team_teachings').getFullList({
        filter: `invited_user_id = '${currentUserId}' && status = 'accepted' && owner_id != '${currentUserId}'`,
        expand: 'class_id,owner_id',
        $autoCancel: false // Verhindert Auto-Cancellation bei parallelen Requests
      });

      // 3. Klassen-Details aus expand-Daten extrahieren (kein separater API-Call nötig)
      const sharedClasses = sharedAccess
        .filter(tt => tt.expand?.class_id)
        .map((tt) => ({
          ...tt.expand.class_id,
          isOwner: false,
          permissionLevel: tt.permission_level,
          teamTeachingId: tt.id,
          ownerEmail: tt.expand?.owner_id?.email || '',
          is_hidden: tt.is_hidden || false
        }));

      // 4. Ergebnisse zusammenführen
      const ownedWithMeta = ownedClasses.map(cls => ({
        ...cls,
        isOwner: true,
        permissionLevel: 'full_access'
      }));

      return [
        ...ownedWithMeta,
        ...sharedClasses.filter(Boolean)
      ];
    } catch (error) {
      console.error('Error loading accessible classes:', error);
      return [];
    }
  }, [currentUserId]);

  /**
   * Lädt ausstehende Einladungen für den aktuellen User
   */
  const loadPendingInvitations = useCallback(async () => {
    if (!currentUserId) return;

    try {
      // Mit expand für Klassendaten - kein separater API-Call nötig
      // Direkter PocketBase-Aufruf um expand-Daten zu behalten (Entity.list() entfernt expand durch normalizeData)
      const invitations = await pb.collection('team_teachings').getFullList({
        filter: `invited_user_id = '${currentUserId}' && status = 'pending'`,
        expand: 'class_id,owner_id',
        $autoCancel: false // Verhindert Auto-Cancellation bei parallelen Requests
      });

      // Klassen-Details extrahieren: Verwende gespeicherten class_name (da expand wegen RLS nicht funktioniert)
      const enrichedInvitations = invitations.map((inv) => ({
        ...inv,
        className: inv.class_name || inv.expand?.class_id?.name || 'Unbekannte Klasse',
        ownerEmail: inv.expand?.owner_id?.email || inv.invited_email || ''
      }));

      setPendingInvitations(enrichedInvitations);
    } catch (error) {
      console.error('Error loading pending invitations:', error);
    }
  }, [currentUserId]);

  /**
   * Lädt Co-Teacher für eine bestimmte Klasse
   * @param {string} classId - Klassen-ID
   * @returns {Promise<Array>} Co-Teacher Liste
   */
  const getCoTeachers = useCallback(async (classId) => {
    if (!classId) return [];

    try {
      const coTeachers = await TeamTeaching.list({
        filter: `class_id = '${classId}' && (status = 'accepted' || status = 'pending')`
      });

      return coTeachers.map(tt => ({
        id: tt.id,
        email: tt.invited_email,
        permissionLevel: tt.permission_level,
        status: tt.status,
        invitedAt: tt.invited_at,
        respondedAt: tt.responded_at
      }));
    } catch (error) {
      console.error('Error loading co-teachers:', error);
      return [];
    }
  }, []);

  /**
   * Prüft die Berechtigung für eine Klasse
   * @param {string} classId - Klassen-ID
   * @returns {Promise<string>} 'owner' | 'full_access' | 'view_only' | null
   */
  const getPermissionLevel = useCallback(async (classId) => {
    if (!currentUserId || !classId) return null;

    try {
      // Prüfe ob Owner
      const classData = await Class.findById(classId);
      if (classData?.user_id === currentUserId) {
        return 'owner';
      }

      // Prüfe Team Teaching Zugang
      const access = await TeamTeaching.findOne({
        filter: `class_id = '${classId}' && invited_user_id = '${currentUserId}' && status = 'accepted'`
      });

      return access?.permission_level || null;
    } catch (error) {
      console.error('Error checking permission:', error);
      return null;
    }
  }, [currentUserId]);

  /**
   * Sendet eine Einladung an einen anderen Lehrer
   * @param {string} classId - Klassen-ID
   * @param {string} email - E-Mail des einzuladenden Lehrers
   * @param {string} permissionLevel - 'view_only' oder 'full_access'
   * @param {string} className - Name der Klasse (wird gespeichert für Anzeige beim Empfänger)
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  const sendInvitation = useCallback(async (classId, email, permissionLevel, className = '') => {
    if (!currentUserId) {
      return { success: false, error: 'Nicht angemeldet' };
    }

    const trimmedEmail = email.trim().toLowerCase();

    // Selbst-Einladung verhindern
    if (trimmedEmail === pb.authStore.model?.email?.toLowerCase()) {
      return { success: false, error: 'Sie können sich nicht selbst einladen' };
    }

    try {
      // User finden
      const recipient = await findUserByEmail(trimmedEmail);
      if (!recipient) {
        return { success: false, error: 'Kein Benutzer mit dieser E-Mail gefunden' };
      }

      // Prüfen ob bereits eingeladen
      const existing = await TeamTeaching.findOne({
        filter: `class_id = '${classId}' && invited_user_id = '${recipient.id}' && (status = 'pending' || status = 'accepted')`
      });

      if (existing) {
        return { success: false, error: 'Dieser Benutzer hat bereits Zugriff oder eine ausstehende Einladung' };
      }

      // Einladung erstellen (class_name wird gespeichert für Anzeige beim Empfänger - umgeht RLS-Problem)
      await TeamTeaching.create({
        class_id: classId,
        owner_id: currentUserId,
        invited_user_id: recipient.id,
        invited_email: trimmedEmail,
        permission_level: permissionLevel,
        status: 'pending',
        invited_at: new Date().toISOString(),
        class_name: className // Klassenname direkt speichern, da Empfänger keinen expand-Zugriff hat
      });

      return { success: true };
    } catch (error) {
      console.error('Error sending invitation:', error);
      return { success: false, error: 'Fehler beim Senden der Einladung' };
    }
  }, [currentUserId]);

  /**
   * Akzeptiert eine Einladung
   * @param {string} invitationId - Team Teaching ID
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  const acceptInvitation = useCallback(async (invitationId) => {
    try {
      await TeamTeaching.update(invitationId, {
        status: 'accepted',
        responded_at: new Date().toISOString()
      });
      await loadPendingInvitations();
      return { success: true };
    } catch (error) {
      console.error('Error accepting invitation:', error);
      return { success: false, error: 'Fehler beim Akzeptieren' };
    }
  }, [loadPendingInvitations]);

  /**
   * Lehnt eine Einladung ab
   * @param {string} invitationId - Team Teaching ID
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  const declineInvitation = useCallback(async (invitationId) => {
    try {
      await TeamTeaching.update(invitationId, {
        status: 'declined',
        responded_at: new Date().toISOString()
      });
      await loadPendingInvitations();
      return { success: true };
    } catch (error) {
      console.error('Error declining invitation:', error);
      return { success: false, error: 'Fehler beim Ablehnen' };
    }
  }, [loadPendingInvitations]);

  /**
   * Entzieht einem Co-Teacher den Zugriff
   * @param {string} teamTeachingId - Team Teaching ID
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  const revokeAccess = useCallback(async (teamTeachingId) => {
    try {
      await TeamTeaching.update(teamTeachingId, {
        status: 'revoked',
        responded_at: new Date().toISOString()
      });
      return { success: true };
    } catch (error) {
      console.error('Error revoking access:', error);
      return { success: false, error: 'Fehler beim Entziehen des Zugriffs' };
    }
  }, []);

  /**
   * Aktualisiert die Berechtigung eines Co-Teachers
   * @param {string} teamTeachingId - Team Teaching ID
   * @param {string} newPermissionLevel - 'view_only' oder 'full_access'
   */
  const updatePermission = useCallback(async (teamTeachingId, newPermissionLevel) => {
    try {
      await TeamTeaching.update(teamTeachingId, {
        permission_level: newPermissionLevel
      });
      return { success: true };
    } catch (error) {
      console.error('Error updating permission:', error);
      return { success: false, error: 'Fehler beim Aktualisieren der Berechtigung' };
    }
  }, []);

  /**
   * Blendet eine geteilte Klasse für den Co-Teacher aus/ein
   * @param {string} teamTeachingId - Team Teaching ID
   * @param {boolean} isHidden - true = ausblenden, false = einblenden
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  const toggleSharedClassVisibility = useCallback(async (teamTeachingId, isHidden) => {
    try {
      await TeamTeaching.update(teamTeachingId, {
        is_hidden: isHidden
      });
      return { success: true };
    } catch (error) {
      console.error('Error toggling shared class visibility:', error);
      return { success: false, error: 'Fehler beim Ändern der Sichtbarkeit' };
    }
  }, []);

  /**
   * Generiert einen zufälligen Token für Einladungslinks
   * @returns {string} - Zufälliger Token (12 Zeichen)
   */
  const generateToken = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let token = '';
    for (let i = 0; i < 12; i++) {
      token += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return token;
  };

  /**
   * Generiert einen Einladungslink für eine Klasse
   * @param {string} classId - Klassen-ID
   * @param {string} permissionLevel - 'view_only' oder 'full_access'
   * @param {string} className - Name der Klasse
   * @returns {Promise<{success: boolean, link?: string, error?: string}>}
   */
  const generateInviteLink = useCallback(async (classId, permissionLevel, className = '') => {
    if (!currentUserId) {
      return { success: false, error: 'Nicht angemeldet' };
    }

    try {
      const token = generateToken();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // 7 Tage gültig

      // Einladung mit Token erstellen (ohne invited_user_id - wird beim Akzeptieren gesetzt)
      await TeamTeaching.create({
        class_id: classId,
        owner_id: currentUserId,
        invited_user_id: null, // Wird beim Akzeptieren gesetzt
        invited_email: '', // Leer, da per Link
        permission_level: permissionLevel,
        status: 'pending',
        invited_at: new Date().toISOString(),
        class_name: className,
        invite_token: token,
        invite_expires_at: expiresAt.toISOString()
      });

      const link = `${window.location.origin}/invite/${token}`;
      return { success: true, link, token };
    } catch (error) {
      console.error('Error generating invite link:', error);
      return { success: false, error: 'Fehler beim Generieren des Links' };
    }
  }, [currentUserId]);

  /**
   * Lädt eine Einladung anhand des Tokens
   * @param {string} token - Einladungstoken
   * @returns {Promise<{success: boolean, invitation?: object, error?: string}>}
   */
  const getInviteByToken = useCallback(async (token) => {
    if (!token) {
      return { success: false, error: 'Kein Token angegeben' };
    }

    try {
      const invitations = await pb.collection('team_teachings').getFullList({
        filter: `invite_token = '${token}'`,
        expand: 'class_id,owner_id',
        $autoCancel: false
      });

      if (invitations.length === 0) {
        return { success: false, error: 'Einladung nicht gefunden' };
      }

      const invitation = invitations[0];

      // Prüfe Ablaufdatum
      if (invitation.invite_expires_at) {
        const expiresAt = new Date(invitation.invite_expires_at);
        if (new Date() > expiresAt) {
          return { success: false, error: 'Einladung ist abgelaufen' };
        }
      }

      // Prüfe Status
      if (invitation.status === 'accepted') {
        return { success: false, error: 'Einladung wurde bereits angenommen' };
      }

      if (invitation.status === 'revoked' || invitation.status === 'declined') {
        return { success: false, error: 'Einladung ist nicht mehr gültig' };
      }

      return {
        success: true,
        invitation: {
          ...invitation,
          className: invitation.class_name || invitation.expand?.class_id?.name || 'Unbekannte Klasse',
          ownerEmail: invitation.expand?.owner_id?.email || '',
          ownerName: invitation.expand?.owner_id?.name || 'Unbekannt'
        }
      };
    } catch (error) {
      console.error('Error loading invitation by token:', error);
      return { success: false, error: 'Fehler beim Laden der Einladung' };
    }
  }, []);

  /**
   * Akzeptiert eine Einladung per Token (für Link-basierte Einladungen)
   * @param {string} token - Einladungstoken
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  const acceptInviteByToken = useCallback(async (token) => {
    if (!currentUserId) {
      return { success: false, error: 'Nicht angemeldet' };
    }

    try {
      // Zuerst die Einladung laden und prüfen
      const result = await getInviteByToken(token);
      if (!result.success) {
        return result;
      }

      const invitation = result.invitation;

      // Prüfe ob User bereits Zugriff auf diese Klasse hat
      const existingAccess = await pb.collection('team_teachings').getFullList({
        filter: `class_id = '${invitation.class_id}' && invited_user_id = '${currentUserId}' && (status = 'accepted' || status = 'pending')`,
        $autoCancel: false
      });

      if (existingAccess.length > 0) {
        return { success: false, error: 'Sie haben bereits Zugriff auf diese Klasse' };
      }

      // Prüfe ob User der Owner ist
      if (invitation.owner_id === currentUserId) {
        return { success: false, error: 'Sie können nicht Ihre eigene Einladung annehmen' };
      }

      // Einladung akzeptieren und User setzen
      await TeamTeaching.update(invitation.id, {
        invited_user_id: currentUserId,
        invited_email: pb.authStore.model?.email || '',
        status: 'accepted',
        responded_at: new Date().toISOString()
      });

      return { success: true };
    } catch (error) {
      console.error('Error accepting invitation by token:', error);
      return { success: false, error: 'Fehler beim Akzeptieren der Einladung' };
    }
  }, [currentUserId, getInviteByToken]);

  // Lade ausstehende Einladungen beim Mount
  useEffect(() => {
    loadPendingInvitations();
  }, [loadPendingInvitations]);

  return {
    // State
    pendingInvitations,
    isLoading,

    // Klassen-Zugriff
    getAccessibleClasses,
    getPermissionLevel,

    // Co-Teacher Management
    getCoTeachers,
    sendInvitation,
    revokeAccess,
    updatePermission,

    // Einladungen (E-Mail basiert)
    loadPendingInvitations,
    acceptInvitation,
    declineInvitation,

    // Einladungen (Link basiert)
    generateInviteLink,
    getInviteByToken,
    acceptInviteByToken,

    // Sichtbarkeit
    toggleSharedClassVisibility
  };
}

export default useTeamTeaching;
