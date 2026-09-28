from typing import Any

from .base import GamePlugin, move_coordinates


class Gomoku(GamePlugin):
    supports_npcs = True
    uses_local_npc_strategy = True
    supports_stakes = True
    game_type = "gomoku"
    display_name = "五子棋"
    category = "board"
    rules_text = (
        "【目标】\n"
        "抢先让自己的棋子形成五子或更多连续一线。\n\n"
        "【行动】\n"
        "双方在 15×15 棋盘的空交叉点轮流落下一子。本规则不设禁手。\n\n"
        "【胜负】\n"
        "任一方在横、竖或任一斜线方向形成连续五子或更多即获胜；棋盘填满且无人达成五连则和棋。"
    )
    move_format = (
        '落子参数使用零起始坐标：{"move":{"row":7,"col":7}}；'
        "row 自上而下为 0–14，col 自左而右为 0–14。"
    )

    def initial_state(self) -> dict[str, Any]:
        return {
            "size": 15,
            "board": [[None for _ in range(15)] for _ in range(15)],
        }

    def validate_move(
        self, state: dict[str, Any], move: dict[str, Any], mark: str
    ) -> None:
        row, col = move_coordinates(move, 15)
        if state["board"][row][col] is not None:
            raise ValueError("该位置已有棋子")

    def apply_move(
        self, state: dict[str, Any], move: dict[str, Any], mark: str
    ) -> dict[str, Any]:
        row, col = move_coordinates(move, 15)
        state["board"][row][col] = mark
        state["last_move"] = {"row": row, "col": col, "mark": mark}
        return state

    def check_winner(self, state: dict[str, Any]) -> str | None:
        board = state["board"]
        size = 15
        for row in range(size):
            for col in range(size):
                mark = board[row][col]
                if mark is None:
                    continue
                for dr, dc in ((0, 1), (1, 0), (1, 1), (1, -1)):
                    end_row = row + 4 * dr
                    end_col = col + 4 * dc
                    if not (0 <= end_row < size and 0 <= end_col < size):
                        continue
                    if all(board[row + i * dr][col + i * dc] == mark for i in range(5)):
                        return mark
        if all(cell is not None for row in board for cell in row):
            return "draw"
        return None

    def npc_legal_actions(self, state, actor, participants):
        del actor, participants
        return [
            {"row": row, "col": col}
            for row, cells in enumerate(state["board"])
            for col, value in enumerate(cells) if value is None
        ]

    def private_state(self, state, viewer, participants):
        del participants
        return {"legal_actions": self.npc_legal_actions(state, None, None)}

    def choose_local_npc_action(self, state, actor, participants):
        legal = self.npc_legal_actions(state, actor, participants)
        if not legal:
            return None
        board = state["board"]
        own = actor["token"]
        others = [p["token"] for p in participants if p["player_id"] != actor["player_id"]]
        foe = others[0] if others else None
        def streak(row, col, mark, dr, dc):
            count = 1
            for sign in (-1, 1):
                r, c = row + sign * dr, col + sign * dc
                while 0 <= r < 15 and 0 <= c < 15 and board[r][c] == mark:
                    count += 1
                    r += sign * dr
                    c += sign * dc
            return count
        def score(move, mark):
            return max(streak(move["row"], move["col"], mark, dr, dc)
                       for dr, dc in ((1, 0), (0, 1), (1, 1), (1, -1)))
        return max(legal, key=lambda move: (
            score(move, own) >= 5,
            foe is not None and score(move, foe) >= 5,
            score(move, own) * 2 + (score(move, foe) if foe else 0),
            -(abs(move["row"] - 7) + abs(move["col"] - 7)),
        ))
