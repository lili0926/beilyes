import asyncio
import json
from unittest.mock import AsyncMock, patch

import httpx
import pytest

from app.impression import build_impression_prompts, validate_impression, PROMPT_DIR
from app.model_gateway import ModelEndpoint, ModelError, complete, hear_clip, write_impression


def test_prompt_preserves_authored_rules_without_private_identity():
    system, user = build_impression_prompts({"title": "虚构样例"}, {"short_windows": [{"heard_audio": True}]})
    for phrase in ("歌词不能永远让位给声音分析", "不要为了追求简洁只留一个点", "自然中文不是重译到改变原意的理由", "不加标题", "不设配额"):
        assert phrase in system
    assert "{{persona}}" not in system
    assert "听歌伙伴" in system
    assert "optional_authorized_context" in user
    assert "虚构样例" in user


def test_no_acoustic_only_claim_to_have_heard():
    with pytest.raises(ValueError, match="Audible observations"):
        build_impression_prompts({}, {"acoustic_analysis": {"tempo": 90}})


@pytest.mark.parametrize("windows", ["fake", [None], [{"heard_audio": False}], [{}]])
def test_writer_requires_actual_hearing_marker(windows):
    with pytest.raises(ValueError, match="Audible observations"):
        build_impression_prompts({}, {"short_windows": windows})


def test_hearing_rejects_malformed_cues():
    async def exercise():
        raw = {"heard_audio": True, "audible_cues": 42}
        with patch("app.model_gateway.complete", new=AsyncMock(return_value=(json.dumps(raw), "stop"))):
            with pytest.raises(ModelError, match="invalid_json"):
                await hear_clip(b"synthetic", {}, 0, 1000, [], endpoint=ModelEndpoint("https://example.test", "test", "test"))
    asyncio.run(exercise())


@pytest.mark.parametrize("reason", ["length", "max_tokens", "", "content_filter"])
def test_writer_rejects_incomplete(reason):
    with pytest.raises(ValueError):
        validate_impression("一些正文", reason, [])


def test_writer_quote_and_reasoning_boundaries():
    assert validate_impression("『虚构短句』", "stop", ["虚构短句"]) == "『虚构短句』"
    with pytest.raises(ValueError):
        validate_impression("『不能擅自添的歌词』", "stop", [])
    with pytest.raises(ValueError):
        validate_impression("<thinking>not public</thinking>", "stop", [])


def test_configuration_never_requires_music_credentials(monkeypatch):
    monkeypatch.setenv("WRITER_URL", "http://127.0.0.1:9000/chat/completions")
    monkeypatch.setenv("WRITER_KEY", "synthetic-test-key")
    monkeypatch.setenv("WRITER_MODEL", "test-model")
    assert ModelEndpoint.from_env("WRITER").model == "test-model"
    monkeypatch.setenv("WRITER_URL", "http://remote.example/chat/completions")
    with pytest.raises(ModelError):
        ModelEndpoint.from_env("WRITER")


@pytest.mark.parametrize("terminal", [True, False])
def test_stream_completion_contract(terminal):
    async def exercise():
        def respond(request):
            payload = json.loads(request.content)
            assert payload["stream"] is True
            body = 'data: {"choices":[{"delta":{"content":"虚构正文"}}]}\n\n'
            if terminal:
                body += 'data: {"choices":[{"delta":{},"finish_reason":"stop"}]}\n\ndata: [DONE]\n\n'
            return httpx.Response(200, text=body)
        async with httpx.AsyncClient(transport=httpx.MockTransport(respond)) as client:
            call = complete(ModelEndpoint("https://example.test/chat", "test", "test"), [], max_tokens=100, temperature=0, client=client)
            if terminal:
                assert await call == ("虚构正文", "stop")
            else:
                with pytest.raises(ModelError, match="interrupted"):
                    await call
    asyncio.run(exercise())


def test_http_error_does_not_echo_provider_body():
    async def exercise():
        async with httpx.AsyncClient(transport=httpx.MockTransport(lambda _: httpx.Response(401, text="private-echo-marker"))) as client:
            with pytest.raises(ModelError) as caught:
                await complete(ModelEndpoint("https://example.test", "test", "test"), [], max_tokens=1, temperature=0, client=client)
            assert "private-echo-marker" not in str(caught.value)
    asyncio.run(exercise())


def test_hearing_keeps_server_window_and_bounded_fields():
    async def exercise():
        raw = {"heard_audio": True, "before": "虚构起音", "audible_cues": ["声音靠近"], "confidence": "high", "private_extra": "discard"}
        with patch("app.model_gateway.complete", new=AsyncMock(return_value=(json.dumps(raw), "stop"))):
            result = await hear_clip(b"synthetic-not-real-audio", {}, 1000, 5000, [], endpoint=ModelEndpoint("https://example.test", "test", "test"))
        assert result["start_ms"] == 1000
        assert result["confidence"] == "medium"
        assert "private_extra" not in result
    asyncio.run(exercise())


def test_writer_calls_authored_prompt_not_demo_reply():
    async def exercise():
        with patch("app.model_gateway.complete", new=AsyncMock(return_value=("仅用于测试的虚构印象。", "stop"))) as generate:
            answer = await write_impression({}, {"short_windows": [{"heard_audio": True}]}, endpoint=ModelEndpoint("https://example.test", "test", "test"))
        assert answer == "仅用于测试的虚构印象。"
        assert "歌词不能永远让位给声音分析" in generate.call_args.args[1][0]["content"]
    asyncio.run(exercise())
