export const PLAYER_TYPES = {
    HUMAN: 1,
    AI:    2
};

export const AI_DIFFICULTY = {
    EASY:   "easy",
    MEDIUM: "medium",
    HARD:   "hard"
};

export const BOT_AVATARS = {
    easy:   { emoji: "🐥", label: "Easy",   color: "#4ade80" },
    medium: { emoji: "🦊", label: "Medium", color: "#f59e0b" },
    hard:   { emoji: "🐺", label: "Hard",   color: "#ef4444" }
};

// How long a bot "thinks" before playing its card. Randomized per turn
// (see startTurn() in turnManager.js) so bots don't all commit in the
// same first second — stays well inside TURN_TIMER_SECONDS either way.
export const AI_THINKING_DELAY_MIN_MS = 800;
export const AI_THINKING_DELAY_MAX_MS = 2800;
