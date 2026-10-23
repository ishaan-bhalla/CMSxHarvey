import os
import time
import contextvars
import anthropic
import requests
from anthropic import Anthropic
from dotenv import load_dotenv

load_dotenv()

# anthropic (default) | groq | ollama. Groq and Ollama run open-weight models
# through their OpenAI-compatible chat endpoints.
PROVIDER = os.getenv("LLM_PROVIDER", "anthropic")
OPEN_MODEL_DEFAULTS = {"groq": "openai/gpt-oss-120b", "ollama": "gpt-oss:20b"}
OPEN_MODEL_URLS = {
    "groq": "https://api.groq.com/openai/v1/chat/completions",
    "ollama": os.getenv("OLLAMA_URL", "http://localhost:11434") + "/v1/chat/completions",
}
if PROVIDER == "anthropic":
    MODEL = os.getenv("CLAUDE_MODEL", "claude-opus-4-6")
else:
    MODEL = os.getenv("OPEN_MODEL", OPEN_MODEL_DEFAULTS[PROVIDER])

# USD per million tokens (input, output). Anthropic list prices, Oct 2026.
# Groq's free tier and local Ollama cost nothing.
PRICES_PER_MTOK = {
    "claude-opus-4-6": (5.00, 25.00),
    "claude-opus-5-5": (4.00, 20.00),
    "claude-sonnet-5-5": (2.00, 10.00),
    "claude-haiku-5-5": (0.10, 0.50),
}
if PROVIDER != "anthropic":
    PRICES_PER_MTOK[MODEL] = (0.0, 0.0)

# Retries are done below, so each attempt is timed and logged.
client = Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"), max_retries=0, timeout=90.0)


class RetryableError(Exception):
    def __init__(self, message: str, wait: float = None):
        super().__init__(message)
        self.wait = wait


def _call_open_model(kwargs: dict):
    """One chat call to Groq or Ollama. Returns (text, input_tokens, output_tokens)."""
    messages = []
    if kwargs.get("system"):
        messages.append({"role": "system", "content": kwargs["system"]})
    messages += kwargs["messages"]
    payload = {
        "model": MODEL,
        "messages": messages,
        # gpt-oss reasons before answering; leave room so the answer isn't cut off
        "max_tokens": max(kwargs["max_tokens"], 4000),
        # Greedy decoding: at the providers' default temperature the same check flipped
        # between a verdict and "not addressed" across runs. (Claude's API no longer
        # accepts temperature; use CHECK_VOTES there instead.)
        "temperature": float(os.getenv("LLM_TEMPERATURE", "0")),
    }
    if MODEL.startswith("openai/gpt-oss") or MODEL.startswith("gpt-oss"):
        payload["reasoning_effort"] = "low"
    headers = {"Content-Type": "application/json"}
    if PROVIDER == "groq":
        headers["Authorization"] = f"Bearer {os.getenv('GROQ_API_KEY')}"
    try:
        response = requests.post(OPEN_MODEL_URLS[PROVIDER], headers=headers, json=payload, timeout=300)
    except requests.RequestException as e:
        raise RetryableError(f"{PROVIDER} connection error: {e}")
    if response.status_code == 429 or response.status_code >= 500:
        retry_after = response.headers.get("retry-after")
        raise RetryableError(
            f"{PROVIDER} returned {response.status_code}: {response.text[:200]}",
            wait=float(retry_after) if retry_after and retry_after.replace(".", "", 1).isdigit() else None,
        )
    if response.status_code >= 400:
        raise Exception(f"{PROVIDER} rejected the request ({response.status_code}): {response.text[:300]}")
    data = response.json()
    usage = data.get("usage", {})
    return (
        data["choices"][0]["message"].get("content") or "",
        usage.get("prompt_tokens", 0),
        usage.get("completion_tokens", 0),
    )


class UsageMeter:
    """Collects tokens, cost and latency for every LLM call made while it is active."""

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
            "provider": PROVIDER,
            "model": self.model,
            "llm_calls": len(self.calls),
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
    if isinstance(error, RetryableError) and error.wait:
        return error.wait
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
    Single entry point for all LLM calls (Claude by default; see LLM_PROVIDER).
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
    if PROVIDER != "anthropic":
        retries = max(retries, 6)  # free tiers rate-limit often

    meter = _current_meter.get()
    last_error = None
    for attempt in range(retries):
        started = time.perf_counter()
        try:
            if PROVIDER == "anthropic":
                response = client.messages.create(**kwargs)
                text = next((b.text for b in response.content if b.type == "text"), "")
                tokens_in, tokens_out = response.usage.input_tokens, response.usage.output_tokens
            else:
                text, tokens_in, tokens_out = _call_open_model(kwargs)
        except (anthropic.RateLimitError, anthropic.InternalServerError, anthropic.APIConnectionError, RetryableError) as e:
            last_error = e
            wait = _retry_wait(e, attempt)
            print(f"{PROVIDER} attempt {attempt + 1} failed: {e}. Retrying in {wait}s...")
            time.sleep(wait)
            continue
        except anthropic.APIStatusError as e:
            if meter:
                meter.failed_calls += 1
            raise Exception(f"Claude API rejected the request ({e.status_code}): {e.message}") from e
        except Exception:
            if meter:
                meter.failed_calls += 1
            raise

        if meter:
            meter.record(
                latency_ms=(time.perf_counter() - started) * 1000,
                input_tokens=tokens_in,
                output_tokens=tokens_out,
            )
        return text

    if meter:
        meter.failed_calls += 1
    raise Exception(f"{PROVIDER} failed after {retries} attempts: {last_error}")
