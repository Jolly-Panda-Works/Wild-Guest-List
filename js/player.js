import { AI_DIFFICULTY } from "./constants/playerTypes.js";

export class Player {

    constructor(id, name, type = "human", difficulty = AI_DIFFICULTY.EASY, nameKey = null) {

        this.id         = id;
        this.name       = name;   // custom name (human) or fallback
        this.nameKey    = nameKey; // i18n key for bots / default "you"
        this.type       = type;
        this.difficulty = difficulty;

        this.deck  = [];
        this.hand  = [];
        this.party = [];
    }
}
