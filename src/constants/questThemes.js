/** Allowed quest themes (UP Diliman Freshies framework). */
const QUEST_THEMES = Object.freeze([
  'Daily Life',
  'UP Diliman Campus',
  'Degree Programs',
]);

const THEME_SET = new Set(QUEST_THEMES);

function isValidTheme(theme) {
  return typeof theme === 'string' && THEME_SET.has(theme);
}

function themeChoicesForSlash() {
  return QUEST_THEMES.map((t) => ({ name: t, value: t }));
}

module.exports = {
  QUEST_THEMES,
  isValidTheme,
  themeChoicesForSlash,
};
