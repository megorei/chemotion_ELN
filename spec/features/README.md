# Feature specs — known state (2026-09-03)

Not run by CI (`ci-rb.yml` excludes `spec/features/**`). A full run on
this branch (Collector 158d1aa84) is **60 examples, 54 failures** —
pre-existing UI drift predating the multitenancy work, not a regression
from it (this repo's own `guest_context_spec.rb` passes clean).

Triaged into 8 root-cause buckets (id/class renames, a removed nav link,
a relocated icon class, a factory bug, a likely rendering issue behind
~40% of the failures, dead routes, spec-internal bugs) — see the
multitenancy planning repo:
`korrespondenz/2026-09-03-feature-suite-triage.md`. Sanitizing this
suite is its own scoped effort, not attempted piecemeal.

Run: `bash /ci-run.sh spec/features/` on the Xeon CI runner (needs Chrome;
see this repo's root `CLAUDE.md`, section "Xeon-CI-Runner").
