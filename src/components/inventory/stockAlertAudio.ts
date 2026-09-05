// Web Audio API synthesized chimes for real-time inventory notifications
// Safe in iframe, lightweight, requires zero external audio files

export const playStockAlertChime = (severity: 'warning' | 'critical' | 'out_of_stock' = 'warning') => {
  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;

    const ctx = new AudioContextClass();
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    const now = ctx.currentTime;
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gainNode = ctx.createGain();

    if (severity === 'out_of_stock') {
      // Urgent, descending triad alert
      osc1.type = 'sawtooth';
      osc2.type = 'triangle';
      osc1.frequency.setValueAtTime(622.25, now); // D#5
      osc1.frequency.setValueAtTime(466.16, now + 0.1); // A#4
      osc1.frequency.setValueAtTime(311.13, now + 0.2); // D#4
      osc2.frequency.setValueAtTime(311.13, now);
      gainNode.gain.setValueAtTime(0.06, now);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 0.42);
      osc2.stop(now + 0.42);
    } else if (severity === 'critical') {
      // Rapid double pulse (A5 to F5)
      osc1.type = 'sine';
      osc2.type = 'triangle';
      osc1.frequency.setValueAtTime(880, now); // A5
      osc1.frequency.setValueAtTime(698.46, now + 0.08); // F5
      osc1.frequency.setValueAtTime(880, now + 0.16); // A5
      osc2.frequency.setValueAtTime(440, now);
      gainNode.gain.setValueAtTime(0.08, now);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 0.38);
      osc2.stop(now + 0.38);
    } else {
      // Pleasant high warning bell (C5 -> E5 -> G5)
      osc1.type = 'sine';
      osc2.type = 'sine';
      osc1.frequency.setValueAtTime(523.25, now); // C5
      osc1.frequency.setValueAtTime(659.25, now + 0.08); // E5
      osc1.frequency.setValueAtTime(783.99, now + 0.16); // G5
      osc2.frequency.setValueAtTime(1046.5, now + 0.16); // C6
      gainNode.gain.setValueAtTime(0.07, now);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 0.48);
      osc2.stop(now + 0.48);
    }

    osc1.connect(gainNode);
    osc2.connect(gainNode);
    gainNode.connect(ctx.destination);
  } catch {
    // Gracefully handle browser policy or audio restrictions
  }
};
