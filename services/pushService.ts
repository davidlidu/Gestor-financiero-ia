const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

const headers = () => ({
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${localStorage.getItem('lidutech_session_token')}`,
});
const handle = async (res: Response) => {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Error en la petición');
  return data;
};

// La clave VAPID llega en base64url; pushManager.subscribe la necesita como bytes
const urlBase64ToUint8Array = (b64: string) => {
  const pad = '='.repeat((4 - (b64.length % 4)) % 4);
  const raw = atob((b64 + pad).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(raw, c => c.charCodeAt(0));
};

export type PushState =
  | 'unsupported'      // el navegador no tiene push
  | 'needs-install'    // iPhone/iPad: solo funciona abriendo la app desde la pantalla de inicio
  | 'denied'           // el usuario bloqueó las notificaciones
  | 'off'              // disponible pero no activado en este dispositivo
  | 'on';

const isIOS = () => /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const isStandalone = () => window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone === true;

const getRegistration = async () => {
  if (!('serviceWorker' in navigator)) return null;
  return (await navigator.serviceWorker.getRegistration()) || null;
};

export const PushService = {
  isIOS,
  getState: async (): Promise<PushState> => {
    if (isIOS() && !isStandalone()) return 'needs-install';
    if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) return 'unsupported';
    if (Notification.permission === 'denied') return 'denied';
    const reg = await getRegistration();
    const sub = reg ? await reg.pushManager.getSubscription() : null;
    return sub && Notification.permission === 'granted' ? 'on' : 'off';
  },

  // Debe llamarse desde un toque del usuario (iOS solo pide permiso así)
  enable: async (): Promise<void> => {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') throw new Error('No diste permiso para las notificaciones.');
    const reg = await navigator.serviceWorker.ready;
    const { publicKey } = await handle(await fetch(`${API_URL}/push/public-key`, { headers: headers() }));
    let sub = await reg.pushManager.getSubscription();
    if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(publicKey) });
    await handle(await fetch(`${API_URL}/push/subscribe`, { method: 'POST', headers: headers(), body: JSON.stringify({ subscription: sub.toJSON() }) }));
  },

  disable: async (): Promise<void> => {
    const reg = await getRegistration();
    const sub = reg ? await reg.pushManager.getSubscription() : null;
    if (!sub) return;
    await fetch(`${API_URL}/push/unsubscribe`, { method: 'POST', headers: headers(), body: JSON.stringify({ endpoint: sub.endpoint }) }).catch(() => {});
    await sub.unsubscribe();
  },

  test: async (): Promise<{ sent: number }> => handle(await fetch(`${API_URL}/push/test`, { method: 'POST', headers: headers() })),
};
