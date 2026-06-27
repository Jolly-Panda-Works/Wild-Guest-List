import { loadCardData } from "./services/dataLoader.js";

const { CARDS } = await loadCardData();

export { CARDS };
