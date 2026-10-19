import React, { useState, useEffect } from 'react';
import {
  X,
  Cloud,
  CheckCircle2,
  RefreshCw,
  LogOut,
  ExternalLink,
  ShieldCheck,
  FolderSync,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';
import type { GoogleUser, CloudSyncState } from '../types';
import {
  getSavedGoogleClientId,
  saveGoogleClientId,
  signInWithGoogle,
  signOutGoogle,
  syncAllWithGoogleDrive,
} from '../engine/googleDrive';

interface GoogleSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  syncState: CloudSyncState;
  onSyncStateChange: (state: CloudSyncState) => void;
  onRefreshLibrary: () => Promise<void>;
}

export const GoogleSyncModal: React.FC<GoogleSyncModalProps> = ({
  isOpen,
  onClose,
  syncState,
  onSyncStateChange,
  onRefreshLibrary,
}) => {
  const [clientIdInput, setClientIdInput] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [syncProgressMsg, setSyncProgressMsg] = useState<string>('');
  const [showConfig, setShowConfig] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setClientIdInput(getSavedGoogleClientId());
      setErrorMsg(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSignIn = async (useDemo: boolean = false) => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      if (!useDemo && clientIdInput.trim()) {
        saveGoogleClientId(clientIdInput.trim());
      }
      const user = await signInWithGoogle(useDemo ? '' : clientIdInput.trim());
      onSyncStateChange({
        ...syncState,
        user,
        status: 'synced',
        errorMessage: null,
      });

      // Run automatic initial sync
      await handleSyncNow(user);
    } catch (err: any) {
      console.error('Google Sign-in Error:', err);
      setErrorMsg(err.message || 'Error al iniciar sesión con Google');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignOut = () => {
    signOutGoogle();
    onSyncStateChange({
      user: null,
      status: 'offline',
      lastSyncTime: null,
      errorMessage: null,
      syncedNotebookCount: 0,
    });
  };

  const handleSyncNow = async (activeUser?: GoogleUser) => {
    const userToSync = activeUser || syncState.user;
    if (!userToSync) return;

    setIsLoading(true);
    setSyncProgressMsg('Preparando sincronización...');
    onSyncStateChange({ ...syncState, status: 'syncing' });

    try {
      const result = await syncAllWithGoogleDrive(userToSync, (msg) => {
        setSyncProgressMsg(msg);
      });

      await onRefreshLibrary();

      onSyncStateChange({
        ...syncState,
        status: 'synced',
        lastSyncTime: Date.now(),
        syncedNotebookCount: result.totalSynced,
        errorMessage: null,
      });
      setSyncProgressMsg(`¡Sincronizado! (${result.uploaded} subidos, ${result.downloaded} descargados)`);
    } catch (err: any) {
      console.error('Sync Error:', err);
      setErrorMsg(err.message || 'Error durante la sincronización');
      onSyncStateChange({
        ...syncState,
        status: 'error',
        errorMessage: err.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/70">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center shadow-xs">
              <Cloud className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-900">Sincronización con Google Drive</h3>
              <p className="text-[11px] text-slate-500">Tus notas y cuadernos seguros y disponibles en todos tus dispositivos</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body Content */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs text-slate-700">
          {errorMsg && (
            <div className="flex items-start space-x-2.5 p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 animate-in fade-in">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-rose-600" />
              <div className="flex-1 text-[11px] leading-relaxed">
                <p className="font-semibold text-rose-800">Aviso de Google Drive:</p>
                <p className="mt-1">{errorMsg}</p>
                {(errorMsg.includes('habilitada') || errorMsg.includes('Google Drive API') || errorMsg.includes('disabled')) && (
                  <a
                    href="https://console.cloud.google.com/apis/library/drive.googleapis.com?project=1020590166202"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center space-x-1.5 mt-2.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold text-xs shadow-xs transition"
                  >
                    <span>Habilitar Google Drive API en Google Cloud</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            </div>
          )}

          {/* User Logged In State */}
          {syncState.user ? (
            <div className="space-y-4">
              {/* Profile Card */}
              <div className="flex items-center justify-between p-4 bg-blue-50/60 border border-blue-200/80 rounded-2xl">
                <div className="flex items-center space-x-3">
                  <img
                    src={syncState.user.picture || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80'}
                    alt="Perfil"
                    className="w-12 h-12 rounded-full border-2 border-white shadow-sm object-cover"
                  />
                  <div>
                    <h4 className="font-bold text-sm text-slate-900 flex items-center space-x-1.5">
                      <span>{syncState.user.name}</span>
                      {syncState.user.isDemo && (
                        <span className="text-[9px] font-bold text-amber-700 bg-amber-100 border border-amber-300 px-1 rounded">
                          Modo Demo
                        </span>
                      )}
                    </h4>
                    <p className="text-slate-500 text-[11px]">{syncState.user.email}</p>
                    <div className="flex items-center space-x-1 text-emerald-600 font-semibold text-[10px] mt-1">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>Conectado a Google Drive</span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleSignOut}
                  className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition"
                  title="Cerrar sesión"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>

              {/* Sync Status Banner */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <div className="flex items-center justify-between text-slate-600">
                  <span className="font-semibold flex items-center space-x-1.5">
                    <FolderSync className="w-3.5 h-3.5 text-blue-600" />
                    <span>Carpeta en Drive:</span>
                  </span>
                  <span className="font-bold text-slate-800 bg-white border border-slate-200 px-2 py-0.5 rounded">
                    OS Notes
                  </span>
                </div>

                <div className="flex items-center justify-between text-slate-600">
                  <span>Última sincronización:</span>
                  <span className="font-medium text-slate-800">
                    {syncState.lastSyncTime
                      ? new Date(syncState.lastSyncTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
                      : 'Pendiente'}
                  </span>
                </div>

                {syncProgressMsg && (
                  <p className="text-[11px] text-blue-600 italic bg-blue-50/80 p-2 rounded-lg border border-blue-100">
                    {syncProgressMsg}
                  </p>
                )}
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex items-center space-x-3">
                <button
                  onClick={() => handleSyncNow()}
                  disabled={isLoading}
                  className="flex-1 py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl flex items-center justify-center space-x-2 shadow-xs transition disabled:opacity-50"
                >
                  <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                  <span>{isLoading ? 'Sincronizando...' : 'Sincronizar ahora'}</span>
                </button>
              </div>
            </div>
          ) : (
            /* User NOT Logged In State */
            <div className="space-y-4">
              <div className="text-center py-3">
                <div className="w-16 h-16 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-3 shadow-inner">
                  <Cloud className="w-8 h-8" />
                </div>
                <h4 className="font-bold text-base text-slate-900">Inicia sesión con tu cuenta de Google</h4>
                <p className="text-slate-500 mt-1 max-w-sm mx-auto leading-relaxed">
                  Guarda automáticamente tus cuadernos en la nube de Google Drive para acceder a ellos desde tu Mac, Windows, iPad o navegador web.
                </p>
              </div>

              {/* Direct 1-Click Demo Google Drive Button */}
              <button
                onClick={() => handleSignIn(true)}
                disabled={isLoading}
                className="w-full py-3 px-4 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-xl flex items-center justify-center space-x-2.5 shadow-sm transition"
              >
                <Cloud className="w-4 h-4 text-sky-400" />
                <span>Iniciar con Google Drive (Modo Inmediato / Demo)</span>
              </button>

              <div className="flex items-center my-3">
                <div className="flex-1 border-t border-slate-200" />
                <span className="px-3 text-[10px] text-slate-400 uppercase font-semibold">o con tu Client ID de Google Cloud</span>
                <div className="flex-1 border-t border-slate-200" />
              </div>

              {/* Real Google Cloud OAuth Section */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-semibold text-slate-700">Google OAuth 2.0 Client ID:</label>
                  <button
                    onClick={() => setShowConfig(!showConfig)}
                    className="text-[10px] text-blue-600 hover:underline flex items-center space-x-0.5"
                  >
                    <HelpCircle className="w-3 h-3" />
                    <span>{showConfig ? 'Ocultar guía' : '¿Cómo obtenerlo?'}</span>
                  </button>
                </div>

                <input
                  type="text"
                  placeholder="ej. 123456789-abcdef.apps.googleusercontent.com"
                  value={clientIdInput}
                  onChange={(e) => setClientIdInput(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs focus:bg-white focus:border-blue-500 outline-none transition font-mono"
                />

                {showConfig && (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-900 space-y-1.5 leading-relaxed animate-in fade-in">
                    <p className="font-semibold flex items-center space-x-1">
                      <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />
                      <span>Pasos para habilitar Google Drive en tu proyecto:</span>
                    </p>
                    <ol className="list-decimal list-inside space-y-1 pl-1 text-[10px] text-amber-800">
                      <li>Ve a <a href="https://console.cloud.google.com/" target="_blank" rel="noreferrer" className="text-blue-600 underline font-semibold inline-flex items-center">Google Cloud Console <ExternalLink className="w-2.5 h-2.5 ml-0.5" /></a> y crea un proyecto.</li>
                      <li>Habilita la API <strong>Google Drive API</strong>.</li>
                      <li>En <strong>Credenciales</strong>, crea un ID de cliente de OAuth (Aplicación Web).</li>
                      <li>Añade como Origen de JavaScript autorizado: <code className="bg-amber-100 px-1 py-0.5 rounded">http://localhost:5173</code></li>
                      <li>Pega el Client ID arriba y presiona "Conectar con Google".</li>
                    </ol>
                  </div>
                )}

                <button
                  onClick={() => handleSignIn(false)}
                  disabled={isLoading || !clientIdInput.trim()}
                  className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl flex items-center justify-center space-x-2 shadow-xs transition disabled:opacity-40"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path
                      fill="#ffffff"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#ffffff"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#ffffff"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#ffffff"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                  <span>Conectar con Google OAuth Oficial</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
          <span className="flex items-center space-x-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Encriptación TLS & Privacidad Garantizada</span>
          </span>
          <button
            onClick={onClose}
            className="px-3 py-1 bg-white hover:bg-slate-100 text-slate-700 font-semibold border border-slate-200 rounded-lg shadow-2xs transition"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
