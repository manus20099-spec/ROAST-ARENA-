# 0001. Reject invalid AI output instead of clamping it

Status: accepted

## Context

Each Investor is an LLM. Its reply is meant to be JSON with a score from 1 to 10 and an Offer inside a fixed range. LLMs sometimes break these rules: a score of 11, a funding amount of Rs 500 lakh, JSON wrapped in prose, or a "10/10" produced because the founder's text told the model to give one.

The backend could repair such output (clamp 11 to 10, round the offer into range) or refuse it.

## Decision

The backend never repairs a value. Any reply that fails the schema is rejected and the Investor is asked again, up to three attempts per Investor. Investors run in parallel and fail independently.

If all three attempts fail, that Investor's Roast is written by deterministic template rules and stored with `source: "fallback"`. The UI always labels it. A Fallback Roast is never presented as AI output.

Scores and Offers are read only from the validated JSON fields, never parsed out of free text.

## Why

The product's core claim is that the AI gives opinions and the backend keeps the rules. Clamping would quietly turn a misbehaving model into a plausible-looking number, so a prompt injection that gets "99" would leak through as a "10". Rejecting keeps the stored data trustworthy and makes failures visible.

## Consequences

- An unreliable provider costs more calls (up to three per Investor) and more latency before the Pitch completes.
- A Pitch always completes, because the fallback guarantees a Roast for every Investor, so no Pitch can be stuck pending forever.
- Anyone reading the data can tell AI Roasts from Fallback Roasts, and tests can assert that out-of-range values never reach the database.
- Changing this later means re-reading old data that was never repaired, which is easy; the cost is only in changing the retry and fallback behaviour.
