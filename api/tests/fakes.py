"""A stand-in for the Anthropic client, replaced at the dependency boundary."""

from collections.abc import AsyncIterator
from types import SimpleNamespace, TracebackType
from typing import Any


class _Stream:
    def __init__(self, chunks: list[str], fail_after: int | None) -> None:
        self._chunks = chunks
        self._fail_after = fail_after

    async def __aenter__(self) -> "_Stream":
        return self

    async def __aexit__(
        self,
        exc_type: type[BaseException] | None,
        exc: BaseException | None,
        tb: TracebackType | None,
    ) -> None:
        return None

    @property
    async def text_stream(self) -> AsyncIterator[str]:
        for i, chunk in enumerate(self._chunks):
            if self._fail_after is not None and i >= self._fail_after:
                raise RuntimeError("upstream connection reset")
            yield chunk

    async def get_final_message(self) -> SimpleNamespace:
        return SimpleNamespace(usage=SimpleNamespace(input_tokens=12, output_tokens=34))


class _Messages:
    def __init__(self, fake: "FakeAnthropic") -> None:
        self._fake = fake

    def stream(self, **kwargs: Any) -> _Stream:
        self._fake.calls.append(kwargs)
        return _Stream(self._fake.chunks, self._fake.fail_after)

    async def create(self, **kwargs: Any) -> Any:
        self._fake.calls.append(kwargs)
        if self._fake.error is not None:
            raise self._fake.error
        return SimpleNamespace(
            content=[SimpleNamespace(type="text", text=self._fake.text)],
            usage=SimpleNamespace(input_tokens=5, output_tokens=7),
        )


class FakeAnthropic:
    """Records each request; streams `chunks` or returns `text` as the reply.

    `fail_after=n` raises mid-stream after n chunks; `error` is raised by
    `messages.create`.
    """

    def __init__(
        self,
        chunks: list[str] | None = None,
        text: str = "",
        fail_after: int | None = None,
        error: Exception | None = None,
    ) -> None:
        self.chunks = chunks or []
        self.text = text
        self.fail_after = fail_after
        self.error = error
        self.calls: list[dict[str, Any]] = []
        self.messages = _Messages(self)
