let _cache = null;

export async function loadCardData() {

    if (_cache) return _cache;

    const res = await fetch("./data/cardInfo.json");
    const cardInfo = await res.json();

    const CARDS = Object.fromEntries(
        cardInfo.map(card => [
            card.power,
            {
                id:           card.power,
                name:         card.name,
                animal:       card.emoji,
                image:        card.image || "",
                power:        card.power,
                translations: card.translations || {},
            }
        ])
    );

    const CARD_IDS = Object.fromEntries(
        cardInfo.map(card => [
            card.name.toUpperCase().replace(/ /g, "_"),
            card.power
        ])
    );

    _cache = { CARDS, CARD_IDS, CARD_INFO: cardInfo };

    return _cache;

}
