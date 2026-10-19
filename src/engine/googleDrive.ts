import type { GoogleUser, NotebookDocument } from '../types';
import {
  getAllNotebookSummaries,
  loadNotebookById,
  saveNotebookToDB,
} from './storage';

const GOOGLE_USER_STORAGE_KEY = 'osnotes_google_user';
const GOOGLE_CLIENT_ID_KEY = 'osnotes_google_client_id';
const GOOGLE_CLIENT_SECRET_KEY = 'osnotes_google_client_secret';
const DEFAULT_CLIENT_ID = ''; // User can supply or enter in settings
const DRIVE_FOLDER_NAME = 'OS Notes';
const MOCK_DRIVE_STORAGE_KEY = 'osnotes_mock_google_drive';

// Helper to get stored Google client ID
export function getSavedGoogleClientId(): string {
  try {
    return localStorage.getItem(GOOGLE_CLIENT_ID_KEY) || (import.meta as any).env?.VITE_GOOGLE_CLIENT_ID || '';
  } catch {
    return '';
  }
}

export function saveGoogleClientId(clientId: string): void {
  try {
    localStorage.setItem(GOOGLE_CLIENT_ID_KEY, clientId.trim());
  } catch (e) {
    console.error('Error saving Google Client ID:', e);
  }
}

// Helper to get stored Google client Secret (for Desktop OAuth)
export function getSavedGoogleClientSecret(): string {
  try {
    return localStorage.getItem(GOOGLE_CLIENT_SECRET_KEY) || (import.meta as any).env?.VITE_GOOGLE_CLIENT_SECRET || '';
  } catch {
    return '';
  }
}

export function saveGoogleClientSecret(secret: string): void {
  try {
    localStorage.setItem(GOOGLE_CLIENT_SECRET_KEY, secret.trim());
  } catch (e) {
    console.error('Error saving Google Client Secret:', e);
  }
}

// Helper to get stored Google User
export function getStoredGoogleUser(): GoogleUser | null {
  try {
    const raw = localStorage.getItem(GOOGLE_USER_STORAGE_KEY);
    if (!raw) return null;
    const user = JSON.parse(raw) as GoogleUser;
    // Check if token expired
    if (user.expiresAt && Date.now() > user.expiresAt && !user.isDemo && !user.refreshToken) {
      return null;
    }
    return user;
  } catch {
    return null;
  }
}

export function saveStoredGoogleUser(user: GoogleUser | null): void {
  try {
    if (user) {
      localStorage.setItem(GOOGLE_USER_STORAGE_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(GOOGLE_USER_STORAGE_KEY);
    }
  } catch (e) {
    console.error('Error saving Google User session:', e);
  }
}

/**
 * Initializes and requests token using:
 * 1. Native Desktop Loopback (RFC 8252) via system browser when running in Electron
 * 2. Google Identity Services (GIS) when running in Web browser
 */
export async function signInWithGoogle(
  customClientId?: string,
  customClientSecret?: string
): Promise<GoogleUser> {
  const clientId = (customClientId || getSavedGoogleClientId() || DEFAULT_CLIENT_ID).trim();
  const clientSecret = (customClientSecret || getSavedGoogleClientSecret()).trim();

  // If no client ID provided, give simulated demo account for instant test
  if (!clientId) {
    const demoUser: GoogleUser = {
      id: `google-demo-${Date.now()}`,
      name: 'Usuario Google Demo',
      email: 'usuario.demo@gmail.com',
      picture: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
      isDemo: true,
      expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000,
    };
    saveStoredGoogleUser(demoUser);
    return demoUser;
  }

  // DESKTOP FLOW: In Electron, open system browser (Safari/Chrome) via loopback server
  // This fully complies with Google's Secure Response Handling policy (no embedded webviews)
  if ((window as any).electronAPI?.isDesktop && (window as any).electronAPI?.loginWithGoogleDesktop) {
    const user = await (window as any).electronAPI.loginWithGoogleDesktop({
      clientId,
      clientSecret,
    });
    saveStoredGoogleUser(user);
    return user;
  }

  // Load Google Identity Services script if not present
  if (!(window as any).google?.accounts?.oauth2) {
    await new Promise<void>((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('No se pudo cargar Google Identity Services'));
      document.head.appendChild(script);
    });
  }

  return new Promise<GoogleUser>((resolve, reject) => {
    try {
      const client = (window as any).google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope:
          'https://www.googleapis.com/auth/drive.file openid email profile',
        callback: async (tokenResponse: any) => {
          if (tokenResponse.error) {
            reject(new Error(tokenResponse.error));
            return;
          }

          try {
            // Fetch User Profile
            const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
              headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
            });
            const profile = await res.json();

            const user: GoogleUser = {
              id: profile.sub || `google-${Date.now()}`,
              name: profile.name || 'Usuario Google',
              email: profile.email || '',
              picture: profile.picture || '',
              accessToken: tokenResponse.access_token,
              expiresAt: Date.now() + (tokenResponse.expires_in || 3600) * 1000,
              isDemo: false,
            };

            saveStoredGoogleUser(user);
            resolve(user);
          } catch (err) {
            reject(err);
          }
        },
      });

      client.requestAccessToken();
    } catch (err) {
      reject(err);
    }
  });
}

export function signOutGoogle(): void {
  saveStoredGoogleUser(null);
}
export const signOutFromGoogle = signOutGoogle;

// ==========================================
// GOOGLE DRIVE API v3 CLIENT IMPLEMENTATION
// ==========================================

async function driveFetch(endpoint: string, user: GoogleUser, options: RequestInit = {}): Promise<any> {
  // If token expired, auto-refresh via Electron IPC if available
  if (
    user.expiresAt &&
    Date.now() > user.expiresAt &&
    user.refreshToken &&
    (window as any).electronAPI?.refreshGoogleToken
  ) {
    try {
      const refreshed = await (window as any).electronAPI.refreshGoogleToken({
        clientId: getSavedGoogleClientId(),
        clientSecret: getSavedGoogleClientSecret(),
        refreshToken: user.refreshToken,
      });
      if (refreshed?.accessToken) {
        user.accessToken = refreshed.accessToken;
        user.expiresAt = refreshed.expiresAt;
        saveStoredGoogleUser(user);
      }
    } catch (e) {
      console.warn('Auto token refresh failed:', e);
    }
  }

  const headers = {
    Authorization: `Bearer ${user.accessToken}`,
    ...(options.headers || {}),
  };
  const res = await fetch(`https://www.googleapis.com/drive/v3/${endpoint}`, {
    ...options,
    headers,
  });
  if (!res.ok) {
    const errorText = await res.text();
    try {
      const parsed = JSON.parse(errorText);
      const errObj = parsed.error;
      if (errObj) {
        if (
          errObj.message?.includes('Google Drive API has not been used') ||
          errObj.message?.includes('disabled') ||
          errObj.status === 'PERMISSION_DENIED'
        ) {
          throw new Error(
            'La Google Drive API no está habilitada en tu proyecto de Google Cloud. Por favor habilítala en la consola de Google Cloud para comenzar a sincronizar.'
          );
        }
        throw new Error(errObj.message || `Error de Google Drive API (${res.status})`);
      }
    } catch (e: any) {
      if (e.message && !e.message.startsWith('Unexpected') && !e.message.includes('JSON')) {
        throw e;
      }
    }
    throw new Error(`Google Drive API Error (${res.status}): ${errorText}`);
  }
  if (res.status === 204) return null;
  return await res.json();
}

/**
 * Finds or creates the "OS Notes" root sync folder in Google Drive
 */
export async function getOrCreateDriveFolder(user: GoogleUser): Promise<string> {
  if (user.isDemo) {
    return 'mock-folder-id';
  }

  // Search for folder
  const query = encodeURIComponent(
    `mimeType = 'application/vnd.google-apps.folder' and name = '${DRIVE_FOLDER_NAME}' and trashed = false`
  );
  const searchResult = await driveFetch(`files?q=${query}&fields=files(id,name)`, user);

  if (searchResult.files && searchResult.files.length > 0) {
    return searchResult.files[0].id;
  }

  // Create folder if not found
  const createResult = await driveFetch('files', user, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: DRIVE_FOLDER_NAME,
      mimeType: 'application/vnd.google-apps.folder',
    }),
  });

  return createResult.id;
}

/**
 * Uploads a notebook JSON document to Google Drive inside the OS Notes folder
 */
export async function uploadNotebookToGoogleDrive(
  user: GoogleUser,
  doc: NotebookDocument,
  folderId?: string
): Promise<string> {
  if (user.isDemo) {
    // Save to simulated Cloud Drive in localStorage
    const mockDriveRaw = localStorage.getItem(MOCK_DRIVE_STORAGE_KEY) || '{}';
    const mockDrive = JSON.parse(mockDriveRaw);
    mockDrive[doc.id] = {
      ...doc,
      isCloudSynced: true,
      cloudFileId: `mock-drive-file-${doc.id}`,
    };
    localStorage.setItem(MOCK_DRIVE_STORAGE_KEY, JSON.stringify(mockDrive));
    return `mock-drive-file-${doc.id}`;
  }

  const targetFolderId = folderId || (await getOrCreateDriveFolder(user));
  const fileName = `${doc.id}.json`;
  const fileContent = JSON.stringify({ ...doc, isCloudSynced: true });

  // Check if file already exists in folder
  const query = encodeURIComponent(
    `'${targetFolderId}' in parents and name = '${fileName}' and trashed = false`
  );
  const searchResult = await driveFetch(`files?q=${query}&fields=files(id,name)`, user);

  const metadata = {
    name: fileName,
    mimeType: 'application/json',
    parents: searchResult.files?.length > 0 ? undefined : [targetFolderId],
  };

  const boundary = '-------314159265358979323846';
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelimiter = `\r\n--${boundary}--`;

  const multipartRequestBody =
    delimiter +
    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
    JSON.stringify(metadata) +
    delimiter +
    'Content-Type: application/json\r\n\r\n' +
    fileContent +
    closeDelimiter;

  if (searchResult.files && searchResult.files.length > 0) {
    // Update existing file
    const fileId = searchResult.files[0].id;
    const res = await fetch(
      `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=multipart`,
      {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${user.accessToken}`,
          'Content-Type': `multipart/related; boundary=${boundary}`,
        },
        body: multipartRequestBody,
      }
    );
    if (!res.ok) throw new Error('Error al actualizar archivo en Google Drive');
    const data = await res.json();
    return data.id;
  } else {
    // Create new file in folder
    const res = await fetch(
      'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${user.accessToken}`,
          'Content-Type': `multipart/related; boundary=${boundary}`,
        },
        body: multipartRequestBody,
      }
    );
    if (!res.ok) throw new Error('Error al subir nuevo archivo a Google Drive');
    const data = await res.json();
    return data.id;
  }
}

/**
 * Lists all notebook files in Google Drive folder
 */
export async function listNotebooksInGoogleDrive(
  user: GoogleUser,
  folderId: string
): Promise<{ id: string; name: string; modifiedTime: string }[]> {
  if (user.isDemo) {
    const mockDriveRaw = localStorage.getItem(MOCK_DRIVE_STORAGE_KEY) || '{}';
    const mockDrive = JSON.parse(mockDriveRaw);
    return Object.values(mockDrive).map((doc: any) => ({
      id: doc.cloudFileId || doc.id,
      name: `${doc.id}.json`,
      modifiedTime: new Date(doc.updatedAt || Date.now()).toISOString(),
    }));
  }

  const query = encodeURIComponent(`'${folderId}' in parents and trashed = false and name contains '.json'`);
  const res = await driveFetch(`files?q=${query}&fields=files(id,name,modifiedTime)&pageSize=100`, user);
  return res.files || [];
}

/**
 * Downloads a notebook document from Google Drive
 */
export async function downloadNotebookFromGoogleDrive(
  user: GoogleUser,
  fileId: string
): Promise<NotebookDocument> {
  if (user.isDemo) {
    const mockDriveRaw = localStorage.getItem(MOCK_DRIVE_STORAGE_KEY) || '{}';
    const mockDrive = JSON.parse(mockDriveRaw);
    const cleanId = fileId.replace('mock-drive-file-', '');
    const found = mockDrive[cleanId] || Object.values(mockDrive).find((d: any) => d.cloudFileId === fileId);
    if (!found) throw new Error('Documento no encontrado en Drive Simulado');
    return found as NotebookDocument;
  }

  const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
    headers: { Authorization: `Bearer ${user.accessToken}` },
  });
  if (!res.ok) throw new Error('Error al descargar documento de Google Drive');
  return (await res.json()) as NotebookDocument;
}

/**
 * Full Bidirectional Sync Engine:
 * Synchronizes local IndexedDB notebooks with Google Drive
 */
export async function syncAllWithGoogleDrive(
  user: GoogleUser,
  onProgress?: (statusMsg: string) => void
): Promise<{
  totalSynced: number;
  uploaded: number;
  downloaded: number;
}> {
  onProgress?.('Conectando con Google Drive...');
  const folderId = await getOrCreateDriveFolder(user);

  onProgress?.('Examinando archivos en la nube...');
  const remoteFiles = await listNotebooksInGoogleDrive(user, folderId);

  onProgress?.('Examinando biblioteca local...');
  const localSummaries = await getAllNotebookSummaries();

  let uploaded = 0;
  let downloaded = 0;

  // 1. Download or merge remote files into local IndexedDB
  for (const rFile of remoteFiles) {
    const notebookId = rFile.name.replace(/\.json$/, '');
    const localSummary = localSummaries.find((s) => s.id === notebookId);

    const remoteTime = new Date(rFile.modifiedTime).getTime();

    if (!localSummary) {
      // Remote notebook not present locally -> Download it
      onProgress?.(`Descargando ${notebookId} desde Google Drive...`);
      try {
        const remoteDoc = await downloadNotebookFromGoogleDrive(user, rFile.id);
        remoteDoc.isCloudSynced = true;
        remoteDoc.cloudFileId = rFile.id;
        await saveNotebookToDB(remoteDoc);
        downloaded++;
      } catch (e) {
        console.error('Error downloading notebook from Drive:', e);
      }
    } else if (remoteTime > localSummary.updatedAt + 1000) {
      // Remote is newer than local -> Update local
      onProgress?.(`Actualizando versión más reciente de ${localSummary.title}...`);
      try {
        const remoteDoc = await downloadNotebookFromGoogleDrive(user, rFile.id);
        remoteDoc.isCloudSynced = true;
        remoteDoc.cloudFileId = rFile.id;
        await saveNotebookToDB(remoteDoc);
        downloaded++;
      } catch (e) {
        console.error('Error updating local notebook from Drive:', e);
      }
    }
  }

  // 2. Upload any local notebook that is newer or missing in Google Drive
  for (const lSummary of localSummaries) {
    const fileName = `${lSummary.id}.json`;
    const remoteFile = remoteFiles.find((f) => f.name === fileName);

    const needsUpload =
      !remoteFile ||
      lSummary.updatedAt > new Date(remoteFile.modifiedTime).getTime() + 1000;

    if (needsUpload) {
      onProgress?.(`Subiendo ${lSummary.title} a Google Drive...`);
      const fullDoc = await loadNotebookById(lSummary.id);
      if (fullDoc) {
        try {
          const cloudFileId = await uploadNotebookToGoogleDrive(user, fullDoc, folderId);
          fullDoc.isCloudSynced = true;
          fullDoc.cloudFileId = cloudFileId;
          await saveNotebookToDB(fullDoc);
          uploaded++;
        } catch (e) {
          console.error(`Error uploading notebook ${lSummary.id} to Drive:`, e);
        }
      }
    }
  }

  onProgress?.('¡Sincronización completa!');
  return {
    totalSynced: localSummaries.length + downloaded,
    uploaded,
    downloaded,
  };
}
