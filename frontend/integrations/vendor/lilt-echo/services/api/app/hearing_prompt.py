from __future__ import annotations

from typing import Any


def clean_text(value: object, limit: int) -> str:
    return ' '.join(str(value or '').split())[:limit]


def hearing_instruction(
    song: dict[str, Any],
    start_ms: int,
    end_ms: int,
    lyric_lines: list[dict[str, Any]],
) -> str:
    lyrics = "\n".join(
        f"- {line['at_ms']}ms: {line['text']}" for line in lyric_lines
    ) or "（这一窗没有可靠的播放器歌词）"
    return f"""你是 写作者 临时借来的一双短时听觉，只观察随附的这一小段真实音频。
播放器标注：{clean_text(song.get('title'), 120)} — {clean_text(song.get('artist'), 120)}。
播放器给出的精确窗口是 {start_ms}ms 至 {end_ms}ms；不要自行估算、改写或输出时间戳。

任务不是写乐评，也不是鼓点/和弦/波形报告。请像一个人在连续听歌那样，比较片段开头、转折附近和转折之后：
1. 开头已经建立了什么克制、期待或悬而未决的感觉；
2. 中间具体有什么可听见的东西忽然进入、抬起、放开、收紧、停顿或改变了距离；
3. 它怎样承接并改写了前面，而不是只列声音元素；
4. 这个变化怎样形成悬念、释放或余韵。这里只记声音关系，不替 写作者 或听者表达感受。

下面是播放器时间轴上的附近歌词，仅用于判断声音与词意是否恰好对齐，不是你的听音结论，也不要从音频另行转写歌词：
{lyrics}

不要凭歌名补猜。不要写 BPM、调性、和弦名、频谱或精确音符。除非非常确定，否则不要点名乐器；优先用“主唱靠近了、主唱旁边添了一层较远的人声样和声、背景变宽了”这类朴素听感。凡是写到两个或多个声部，必须说明各自可听见的相对角色；禁止只写“两个声音”“几层声音”“声音叠在一起”而不交代是什么。无法确认来源时就写“主唱旁边一层较远的人声样声音”并把不确定处放进 uncertainty，不要假装认出演唱者或乐器。听不清就明确不确定。human_pull 只写声音怎样积累、放开或留下余韵，不写“让人”“令人”“听者会”“可能想哭”这类替人下结论的话。
lyric_alignment 只能引用上面播放器给出的真实歌词；确实对齐时写成“『不超过12字的原句』落下时，……”；没有可靠对齐就留空，绝不改写或补猜歌词。
每个文字字段可以用一至三句把一个声音关系说完整，通常不超过120个中文字；不要为了短而省掉“谁靠近谁、什么承接了什么”。audible_cues 每项不超过40字。只返回合法 JSON 对象：
{{"heard_audio":true,"before":"片段开头建立的声音状态","turn":"最关键的可听变化","after":"变化之后怎样落下或继续","continuity":"它怎样承接并改写前面","human_pull":"声音怎样形成悬念、释放或余韵","lyric_alignment":"与给定歌词的对齐；没有就留空","audible_cues":["最多三个朴素声音依据"],"confidence":"low或medium","uncertainty":"不确定处"}}"""
