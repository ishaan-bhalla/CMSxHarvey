import os
import time
import contextvars
import anthropic
from anthropic import Anthropic
from dotenv import load_dotenv

load_dotenv()

MODEL = os.getenv("CLAUDE_MODEL", "claude-opus-4-6")

# USD per million tokens (input, output). Anthropic list prices, Oct 2026.
PRICES_PER_MTOK = {
    "claude-opus-4-6": (5.00, 25.00),
    "claude-opus-5-5": (4.00, 20.00),
    "claude-sonnet-5-5": (2.00, 10.00),
    "claude-haiku-5-5": (0.10, 0.50),
}

# Retries are done below, so each attempt is timed and logged.
client = Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"), max_retries=0, timeout=90.0)


class UsageMeter:
    """Collects tokens, cost and latency for every Claude call made while it is active."""

    def __init__(self, model: str = MODEL):
        self.model = model
        self.calls = []
        self.failed_calls = 0
        self.started = time.perf_counter()

    def record(self, latency_ms: float, input_tokens: int, output_tokens: int):
        price_in, price_out = PRICES_PER_MTOK.get(self.model, (None, None))
        cost = None
        if price_in is not None:
            cost = (input_tokens * price_in + output_tokens * price_out) / 1_000_000
        self.calls.append({
            "latency_ms": latency_ms,
            "input_tokens": input_tokens,
            "output_tokens": output_tokens,
            "cost_usd": cost,
        })

    def summary(self) -> dict:
        latencies = sorted(c["latency_ms"] for c in self.calls)

        def pct(p):
            if not latencies:
                return None
            return round(latencies[min(len(latencies) - 1, int(p * len(latencies)))])

        costs = [c["cost_usd"] for c in self.calls]
        return {
            "model": self.model,
            "claude_calls": len(self.calls),
            "failed_calls": self.failed_calls,
            "input_tokens": sum(c["input_tokens"] for c in self.calls),
            "output_tokens": sum(c["output_tokens"] for c in self.calls),
            "cost_usd": round(sum(costs), 4) if None not in costs else None,
            "latency_ms_p50": pct(0.5),
            "latency_ms_p95": pct(0.95),
            "wall_seconds": round(time.perf_counter() - self.started, 1),
        }


_current_meter = contextvars.ContextVar("claude_usage_meter", default=None)


def start_meter() -> UsageMeter:
    meter = UsageMeter()
    _current_meter.set(meter)
    return meter


def _retry_wait(error: Exception, attempt: int) -> float:
    if isinstance(error, anthropic.RateLimitError):
        retry_after = error.response.headers.get("retry-after")
        if retry_after:
            try:
                return float(retry_after)
            except ValueError:
                pass
    return 2 ** attempt  # 1s, 2s, 4s


def call_claude(prompt: str, system: str = None, max_tokens: int = 2000, retries: int = 3) -> str:
    """
    Single entry point for all Claude API calls.
    Retries rate limits, server errors and network errors with backoff;
    other rejected requests (4xx) fail at once because a retry can't fix them.
    """
    kwargs = {
        "model": MODEL,
        "max_tokens": max_tokens,
        "messages": [{"role": "user", "content": prompt}],
    }
    if system:
        kwargs["system"] = system

    meter = _current_meter.get()
    last_error = None
    for attempt in range(retries):
        started = time.perf_counter()
        try:
            response = client.messages.create(**kwargs)
        except (anthropic.RateLimitError, anthropic.InternalServerError, anthropic.APIConnectionError) as e:
            last_error = e
            wait = _retry_wait(e, attempt)
            print(f"Claude API attempt {attempt + 1} failed: {e}. Retrying in {wait}s...")
            time.sleep(wait)
            continue
        except anthropic.APIStatusError as e:
            if meter:
                meter.failed_calls += 1
            raise Exception(f"Claude API rejected the request ({e.status_code}): {e.message}") from e

        if meter:
            meter.record(
                latency_ms=(time.perf_counter() - started) * 1000,
                input_tokens=response.usage.input_tokens,
                output_tokens=response.usage.output_tokens,
            )
        return next((b.text for b in response.content if b.type == "text"), "")

    if meter:
        meter.failed_calls += 1
    raise Exception(f"Claude API failed after {retries} attempts: {last_error}")
