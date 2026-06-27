import { loadCardData } from "../services/dataLoader.js";

const { CARD_IDS } = await loadCardData();

export { CARD_IDS };
