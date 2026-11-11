/**
 * Легковесный динамический вызов конфетти без блокировки основного бандла
 */
export async function triggerConfetti(options?: {
  particleCount?: number;
  spread?: number;
  origin?: { x?: number; y?: number };
  colors?: string[];
}) {
  try {
    const confettiModule = await import('canvas-confetti');
    const confetti = confettiModule.default || confettiModule;
    confetti(options);
  } catch (err) {
    console.debug('Confetti animation skipped', err);
  }
}
