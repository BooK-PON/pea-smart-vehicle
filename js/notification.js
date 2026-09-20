/**
 * PEA Smart Vehicle Notification System
 * Web Push API, In-App Interactive Toast & Web Audio Chimes
 * การแจ้งเตือนตามบทบาทงาน (Role-based Notification Dispatcher)
 */

class PEANotificationSystem {
    constructor() {
        this.toastContainer = null;
        this.audioCtx = null;
        this.init();
    }

    init() {
        // Create toast container if not exists
        if (!document.getElementById('pea-toast-container')) {
            const container = document.createElement('div');
            container.id = 'pea-toast-container';
            container.className = 'fixed bottom-4 right-4 z-50 flex flex-col space-y-2 max-w-sm w-full pointer-events-none';
            document.body.appendChild(container);
            this.toastContainer = container;
        } else {
            this.toastContainer = document.getElementById('pea-toast-container');
        }

        // Request browser notification permission if supported
        if ('Notification' in window && Notification.permission === 'default') {
            // Can be requested on user interaction
        }
    }

    requestPermission() {
        if ('Notification' in window) {
            Notification.requestPermission().then(permission => {
                if (permission === 'granted') {
                    this.showToast('เปิดการแจ้งเตือนสำเร็จ', 'ระบบจะส่งสัญญาณเตือนเมื่อมีใบแจ้งซ่อมหรือการอนุมัติ', 'SUCCESS');
                }
            });
        }
    }

    // Play offline sound chime using Web Audio API
    playChime(type = 'ALERT') {
        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (!AudioContext) return;
            if (!this.audioCtx) this.audioCtx = new AudioContext();
            if (this.audioCtx.state === 'suspended') this.audioCtx.resume();

            const osc = this.audioCtx.createOscillator();
            const gain = this.audioCtx.createGain();
            osc.connect(gain);
            gain.connect(this.audioCtx.destination);

            const now = this.audioCtx.currentTime;
            if (type === 'CRITICAL') {
                // Beep-Beep urgent high alert
                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(880, now);
                osc.frequency.setValueAtTime(440, now + 0.15);
                gain.gain.setValueAtTime(0.3, now);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);
                osc.start(now);
                osc.stop(now + 0.35);
            } else if (type === 'SUCCESS') {
                // Upward pleasant chord
                osc.type = 'sine';
                osc.frequency.setValueAtTime(523.25, now); // C5
                osc.frequency.setValueAtTime(659.25, now + 0.1); // E5
                osc.frequency.setValueAtTime(783.99, now + 0.2); // G5
                gain.gain.setValueAtTime(0.2, now);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.45);
                osc.start(now);
                osc.stop(now + 0.45);
            } else {
                // Normal chime
                osc.type = 'sine';
                osc.frequency.setValueAtTime(600, now);
                osc.frequency.setValueAtTime(900, now + 0.1);
                gain.gain.setValueAtTime(0.2, now);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
                osc.start(now);
                osc.stop(now + 0.3);
            }
        } catch (e) {
            console.warn('Audio chime note:', e);
        }
    }

    // Role-specific broadcast
    broadcastAlert({ targetRoles = ['DRIVER', 'MECHANIC', 'CHIEF'], title, message, type = 'INFO', icon = 'fa-bell' }) {
        // 1. Play sound
        this.playChime(type === 'CRITICAL' ? 'CRITICAL' : (type === 'SUCCESS' ? 'SUCCESS' : 'ALERT'));

        // 2. Browser native push notification
        if ('Notification' in window && Notification.permission === 'granted') {
            try {
                new Notification(`[PEA Smart Fleet] ${title}`, {
                    body: message,
                    icon: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="45" fill="%23581c87"/><text x="50" y="62" font-size="36" text-anchor="middle" fill="%23f59e0b">PEA</text></svg>'
                });
            } catch (e) {
                console.warn('Push notification error:', e);
            }
        }

        // 3. In-App Interactive Toast
        this.showToast(title, message, type, icon);
    }

    showToast(title, message, type = 'INFO', customIcon = null) {
        if (!this.toastContainer) this.init();

        const toast = document.createElement('div');
        toast.className = 'pointer-events-auto flex items-start p-3.5 rounded-xl shadow-2xl transition-all duration-300 transform translate-y-4 opacity-0 border backdrop-blur-md ';

        let iconClass = customIcon || 'fa-info-circle';
        let bgStyle = '';

        if (type === 'CRITICAL') {
            bgStyle = 'bg-red-950/95 border-red-500/80 text-white shadow-red-900/50';
            iconClass = customIcon || 'fa-triangle-exclamation text-red-400';
        } else if (type === 'WARNING') {
            bgStyle = 'bg-amber-950/95 border-amber-500/80 text-white shadow-amber-900/50';
            iconClass = customIcon || 'fa-triangle-exclamation text-amber-400';
        } else if (type === 'SUCCESS') {
            bgStyle = 'bg-emerald-950/95 border-emerald-500/80 text-white shadow-emerald-900/50';
            iconClass = customIcon || 'fa-circle-check text-emerald-400';
        } else {
            bgStyle = 'bg-purple-950/95 border-purple-500/80 text-white shadow-purple-900/50';
            iconClass = customIcon || 'fa-bolt text-pea-gold';
        }

        toast.className += bgStyle;

        toast.innerHTML = `
            <div class="text-lg mr-3 mt-0.5"><i class="fa-solid ${iconClass}"></i></div>
            <div class="flex-1 pr-2">
                <div class="text-xs font-black uppercase tracking-wider text-amber-400">${title}</div>
                <div class="text-xs text-slate-200 mt-0.5 leading-snug">${message}</div>
            </div>
            <button class="text-slate-400 hover:text-white transition p-1" onclick="this.parentElement.remove()">
                <i class="fa-solid fa-xmark text-xs"></i>
            </button>
        `;

        this.toastContainer.appendChild(toast);

        // Animate in
        requestAnimationFrame(() => {
            toast.classList.remove('translate-y-4', 'opacity-0');
            toast.classList.add('translate-y-0', 'opacity-100');
        });

        // Auto dismiss after 5.5s
        setTimeout(() => {
            toast.classList.add('opacity-0', 'translate-x-full');
            setTimeout(() => toast.remove(), 300);
        }, 5500);
    }
}

const notifier = new PEANotificationSystem();
