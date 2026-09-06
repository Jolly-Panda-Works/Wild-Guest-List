// Shared rank-medal icon keys (see data/config.json → icons), 0-indexed
// by standings position (0 = 1st place). Used by js/game/scoreManager.js
// so every surface that shows a player's rank — the Match Standings /
// Leaderboard popup (js/ui/leaderboard-ui.js) and the Opponent rank
// badges on the gameplay board (js/ui/game-ui.js) — reads the same list.
export const RANK_ICONS = ["rankGold", "rankSilver", "rankBronze", "rankFourth"];
