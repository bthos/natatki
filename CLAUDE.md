# CLAUDE

This file is read by your IDE on every prompt. Add project-specific guidance below the managed block.

<!-- talaka:start -->
<!--
  This block is managed by talaka.
  Do not edit between the start/end markers — re-run `talaka/shared/lifecycle/tools/init.sh` to refresh it,
  or `talaka/shared/lifecycle/tools/teardown.sh` to remove it. Everything outside the markers is yours.
-->

> **Talaka pipeline** — read [`.tlk/PIPELINE.md`](.tlk/PIPELINE.md) before any task.
> It defines the agent roles, the coordinator protocol, and the quality gates used in this project.
> **You are the coordinator.** Agents and skills never invoke each other: each does its task,
> appends a return entry to the feature's `handoff-log.md`, and returns to you. You read that
> log and decide who runs next. Their `Recommend:` line is an input, not a jump.
> Project-specific config: [`.tlk/PROJECT.md`](.tlk/PROJECT.md).

@.tlk/PIPELINE.md
<!-- talaka:end -->


## Natatki project notes

- Notes are stored in the separate repo `bthos/natatki-data` (`notes/*.md`, YAML front matter).
- Never build Android locally: APKs are produced by GitHub Actions (`.github/workflows/android-apk.yml`, see `docs/PLAN.md` §1 and §4).
- Current fix/development plan and known bugs: `docs/PLAN.md`.
- After cloning: `git submodule update --init && talaka/shared/lifecycle/tools/init.sh -n`.
