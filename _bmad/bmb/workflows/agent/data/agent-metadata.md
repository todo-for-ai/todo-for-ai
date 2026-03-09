# Agent Metadata Properties

| Property | Format | Rules |
|----------|--------|-------|
| `id` | `_bmad/agents/{agent-name}/{agent-name}.md` | Compiled output path; must match filename |
| `name` | "First Last" or "Name Title" | Persona's identity (NOT title/filename) |
| `title` | "Role Name" (kebab-cased to filename) | Determines filename: `title` → `{title}.agent.yaml` |
| `icon` | Single emoji only | One emoji exactly |
| `module` | `stand-alone`, `bmm`, `cis`, `bmgd`, or custom | Lowercase, hyphenated for `stand-alone` |
| `hasSidecar` | `true` or `false` | `true` = expects `{agent-name}-sidecar/` folder |

---

## Field Rules

### `id`
```yaml
id: _bmad/agents/commit-poet/commit-poet.md
```
- Unique identifier for future lookup
- Conventionally matches filename pattern

### `name`
```yaml
# ✅ CORRECT
name: 'Inkwell Von Comitizen'
name: 'Dr. Demento'
name: 'Clarity'

# ❌ WRONG
name: 'commit-poet'        # That's the filename
name: 'Code Review Specialist'  # That's the title
```

### `title`
```yaml
# ✅ CORRECT
title: 'Commit Message Artisan'
title: 'Strategic Business Analyst'
title: 'Code Review Specialist'

# ❌ WRONG
title: 'Inkwell Von Comitizen'  # That's the name
title: 'Writes git commits'     # Full sentence, not functional title
```
- Derives filename via kebab-case
- `role` field (separate) expands on what agent does in 1-2 sentences

### `icon`
```yaml
# ✅ CORRECT
icon: '🔧'
icon: '🧙‍♂️'
icon: '📜'

# ❌ WRONG
icon: '🔧📜'    # Multiple emojis
icon: 'wrench'  # Text, not emoji
icon: ''        # Empty
```

### `module`
| Value | Meaning |
|-------|---------|
| `stand-alone` | Independent agent |
| `bmm` | Business Management Module |
| `cis` | Continuous Innovation System |
| `bmgd` | BMAD Game Development |
| `{custom}` | Any custom module code |

```yaml
# ✅ CORRECT
module: stand-alone
module: bmm

# ❌ WRONG
module: standalone   # Missing hyphen
module: 'BMM'        # Uppercase
```

### `hasSidecar`
```yaml
# Simple Agent
hasSidecar: false

# Expert Agent (has sidecar folder)
hasSidecar: true
```
- If `true`: compiler expects `{agent-name}-sidecar/` folder

---

## Name Confusion Prevention

| Question | Answer |
|----------|--------|
| What's the file called? | Derived from `title`: `"Commit Message Artisan"` → `commit-message-artisan.agent.yaml` |
| What's the persona called? | `name` — "Inkwell Von Comitizen" |
| What's their job title? | `title` — "Commit Message Artisan" |
| What do they do? | `role` — 1-2 sentences expanding on title |
| What's the unique key? | `id` — `_bmad/agents/{name}/{name}.md` |

---

## Common Anti-Patterns

```yaml
# ❌ name = title (duplicate)
name: 'Commit Message Artisan'
title: 'Commit Message Artisan'

# ✅ Fix: separate identity from role
name: 'Inkwell Von Comitizen'
title: 'Commit Message Artisan'
```

```yaml
# ❌ id path mismatch
# File: my-agent.agent.yaml
id: _bmad/agents/different-agent/different-agent.md

# ✅ Fix: match filename
id: _bmad/agents/my-agent/my-agent.md
```

```yaml
# ❌ Wrong module format
module: Standalone
module: STAND_ALONE

# ✅ Fix: lowercase, hyphenated
module: stand-alone
```
