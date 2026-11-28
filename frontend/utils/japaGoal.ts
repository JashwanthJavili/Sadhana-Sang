/**
 * The devotee's own daily japa goal. Off (0) by default so newcomers are never
 * measured against a fixed number — they just see the rounds they chanted.
 * Set on the Japa page (Settings → Daily goal).
 */
export const JAPA_SETTINGS_KEY = 'ss_japa_settings';

export const getJapaGoal = (): number => {
  try {
    const goal = Number(JSON.parse(localStorage.getItem(JAPA_SETTINGS_KEY) || '{}').goal);
    return goal > 0 ? goal : 0;
  } catch {
    return 0;
  }
};
