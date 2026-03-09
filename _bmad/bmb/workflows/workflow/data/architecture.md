# Workflow Architecture

**Purpose:** Core structural patterns for BMAD workflows.

---

## Structure

```
workflow-folder/
├── workflow.md              # Entry point, configuration
├── steps-c/                 # Create flow steps
│   ├── step-01-init.md
│   ├── step-02-[name].md
│   └── step-N-[name].md
├── steps-e/                 # Edit flow (if needed)
├── steps-v/                 # Validate flow (if needed)
├── data/                    # Shared reference files
└── templates/               # Output templates (if needed)
```

---

## workflow.md Standards

**CRITICAL:** workflow.md MUST be lean — entry point only.

**❌ PROHIBITED:**
- Listing all steps (defeats progressive disclosure)
- Detailed step descriptions (steps are self-documenting)
- Validation checklists (belong in steps-v/)
- Implementation details (belong in step files)

**✅ REQUIRED:**
- Frontmatter: name, description, web_bundle
- Goal: What the workflow accomplishes
- Role: Who the AI embodies
- Meta-context: Architecture background (if pattern demo)
- Core principles (step-file design, JIT loading, etc.)
- Initialization/routing: How to start, which step first

**Progressive Disclosure:** Users ONLY know about current step. workflow.md routes to first step, each step routes to next. No step lists in workflow.md!

---

## Core Principles

### 1. Micro-File Design
- Each step: ~80-200 lines, focused
- One concept per step
- Self-contained instructions

### 2. Just-In-Time Loading
- Only current step in memory
- Never load future steps until 'C' selected
- Progressive disclosure = LLM focus

### 3. Sequential Enforcement
- Steps execute in order
- No skipping, no optimization
- Each step completes before next loads

### 4. State Tracking
For continuable workflows:
```yaml
stepsCompleted: ['step-01-init', 'step-02-gather', 'step-03-design']
lastStep: 'step-03-design'
lastContinued: '2025-01-02'
```
Each step appends its name to `stepsCompleted` before loading next.

---

## Execution Flow

**Fresh Start:**
```
workflow.md → step-01-init.md → step-02-[name].md → ... → step-N-final.md
```

**Continuation:**
```
workflow.md → step-01-init.md (detects existing) → step-01b-continue.md → [next step]
```

---

## Frontmatter Variables

### Standard
```yaml
workflow_path: '{project-root}/_bmad/[module]/workflows/[name]'
thisStepFile: './step-[N]-[name].md'
nextStepFile: './step-[N+1]-[name].md'
outputFile: '{output_folder}/[output].md'
```

### Module-Specific
```yaml
bmb_creations_output_folder: '{project-root}/_bmad/bmb-creations'
```

### Rules
- ONLY variables used in step body go in frontmatter
- All file references use `{variable}` format
- Paths within workflow folder are relative

---

## Menu Pattern

```markdown
### N. Present MENU OPTIONS

Display: "**Select:** [A] [action] [P] [action] [C] Continue"

#### Menu Handling Logic:
- IF A: Execute {task}, then redisplay menu
- IF P: Execute {task}, then redisplay menu
- IF C: Save to {outputFile}, update frontmatter, then load {nextStepFile}
- IF Any other: help user, then redisplay menu

#### EXECUTION RULES:
- ALWAYS halt and wait for user input
- ONLY proceed to next step when user selects 'C'
```

**A/P not needed in:** Step 1 (init), validation sequences, simple data gathering

---

## Output Pattern

Every step writes BEFORE loading next:

1. **Plan-then-build:** Steps append to plan.md → build step consumes plan
2. **Direct-to-final:** Steps append directly to final document

See: `output-format-standards.md`

---

## Critical Rules

- 🛑 NEVER load multiple step files simultaneously
- 📖 ALWAYS read entire step file before execution
- 🚫 NEVER skip steps or optimize the sequence
- 💾 ALWAYS update frontmatter when step completes
- ⏸️ ALWAYS halt at menus and wait for input
- 📋 NEVER create mental todos from future steps
