// Selectable avatars for the human player (p1), shown on the
// "Choose Bot Difficulty" screen next to the player's own row.
// Bots already have their own avatar per difficulty (see BOT_AVATARS
// in playerTypes.js) — this is the equivalent for the human seat.
export const PLAYER_AVATARS = [
    { id: "girl", src: "assets/img/avatars/girl.png", labelKey: "avatarGirl" },
    { id: "boy",  src: "assets/img/avatars/boy.png",  labelKey: "avatarBoy"  },
];

export const DEFAULT_PLAYER_AVATAR_ID = "girl";
