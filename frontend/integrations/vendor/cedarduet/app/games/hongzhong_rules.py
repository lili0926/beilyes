"""Eden adaptation: exact Hongzhong wildcard hand decomposition, no MCR engine."""
from collections import Counter
from functools import lru_cache

SUITED = tuple(f'{s}{n}' for s in 'WBT' for n in range(1, 10))
CODES = SUITED + ('J1',)

@lru_cache(maxsize=32768)
def _melds(counts: tuple[int, ...], jokers: int) -> bool:
    if not any(counts):
        return jokers % 3 == 0
    i = next(i for i, n in enumerate(counts) if n)
    # Enumerate natural/joker allocations; a joker may preserve a natural tile
    # for another group. Sequences may begin before the lowest natural tile.
    for natural in range(1, min(3, counts[i]) + 1):
        need = 3 - natural
        if need <= jokers:
            rest = list(counts); rest[i] -= natural
            if _melds(tuple(rest), jokers - need):
                return True
    suit_start = i // 9 * 9
    for start in range(max(suit_start, i - 2), min(i, suit_start + 6) + 1):
        rest = list(counts); need = 0
        for j in range(start, start + 3):
            if rest[j]: rest[j] -= 1
            else: need += 1
        if need <= jokers and _melds(tuple(rest), jokers - need):
            return True
    return False

def winning_shape(hand: list[str], open_melds: int = 0) -> str | None:
    if not 0 <= open_melds <= 4 or len(hand) != 14 - 3 * open_melds:
        return None
    c = Counter(hand)
    if any(k not in CODES or n > 4 for k, n in c.items()):
        return None
    jokers = c['J1']; counts = tuple(c[t] for t in SUITED)
    if not open_melds:
        missing = sum(n % 2 for n in counts)
        if missing <= jokers and (jokers - missing) % 2 == 0:
            return '红中七对'
    if jokers >= 2 and _melds(counts, jokers - 2):
        return '红中自摸'
    for i, n in enumerate(counts):
        for natural in range(1, min(2, n) + 1):
            need = 2 - natural
            if need <= jokers:
                rest = list(counts); rest[i] -= natural
                if _melds(tuple(rest), jokers - need):
                    return '红中自摸'
    return None

def waiting_tiles(hand: list[str], open_melds: int = 0) -> list[str]:
    if len(hand) != 13 - 3 * open_melds:
        return []
    return [t for t in CODES if hand.count(t) < 4 and winning_shape(hand + [t], open_melds)]

def discard_score(hand: list[str], tile: str) -> float:
    """Low score discards isolated tiles, retaining wildcards, pairs and runs."""
    if tile == 'J1': return 100
    c = Counter(hand); i = SUITED.index(tile)
    score = (c[tile] - 1) * 4
    for distance, weight in ((1, 2), (2, 1)):
        for j in (i - distance, i + distance):
            if 0 <= j < 27 and j // 9 == i // 9:
                score += min(1, c[SUITED[j]]) * weight
    return score
