# 0002. An Idea owns many Pitches, and the Leaderboard reads only the Ranked Pitch

Status: accepted

## Context

Founders re-pitch after feedback and want to see whether their scores went up. Votes come from the community and should not disappear when a founder improves the text. The brief could be modelled as one record per submission (each re-pitch a new Idea), one record overwritten in place, or an Idea with versioned Pitches.

## Decision

An **Idea** persists and owns up to five **Pitches** (v1 to v5). A Pitch's text is never edited in place, so every change is a re-pitch and old scores stay tied to the text that earned them.

Votes belong to the Idea, not to a Pitch.

The Leaderboard reads only the Idea's **Ranked Pitch**: its newest Complete Pitch that is not Flagged. A Pending Pitch or a Flagged Pitch never replaces a good earlier one. An Idea with no Ranked Pitch is not on the Leaderboard and cannot be voted on.

The Idea's stored `score` is recomputed by one function, `recomputeIdeaScore`, whenever a Pitch completes or an eligible vote changes.

## Why

- The "did my score go up?" feature needs the history of old Pitches intact.
- Votes stay with the Idea, so re-pitching does not reset a founder's progress or create duplicate Leaderboard entries.
- A founder cannot swap a well-scored Pitch for different text and keep the old score, because text is immutable.
- Reading only the Ranked Pitch means a suspicious or unfinished re-pitch cannot damage or inflate the Idea's rank.

## Consequences

- Votes can outlive the text they were cast on. An Idea that is rewritten heavily keeps its votes. This is accepted.
- The five-Pitch cap and the hourly Pitch rate limit bound AI cost and spam.
- Deleting an Idea is a soft delete (`deletedAt`), so its Pitches, Roasts and votes remain stored but disappear from every list.
- Moving to one-record-per-submission later would require merging votes and history, so this is costly to reverse.
