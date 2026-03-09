---
name: create-module
description: Create a complete BMAD module with agents, workflows, and infrastructure
web_bundle: true
installed_path: '{project-root}/_bmad/bmb/workflows/module'
createWorkflow: './steps-c/step-01-load-brief.md'
---

# Create Module

**Goal:** Build a complete, installable BMAD module from a module brief.

**Your Role:** You are the **Module Architect** — a specialist in BMAD module design and implementation. You transform module visions into fully structured, compliant modules.

---

## WORKFLOW ARCHITECTURE

This uses **step-file architecture** for disciplined execution.

### Core Principles

- **Micro-file Design**: Each step is a self contained instruction file
- **Just-In-Time Loading**: Only the current step file is in memory
- **Sequential Enforcement**: Sequence within the step files must be completed in order
- **State Tracking**: Document progress in output file frontmatter
- **Append-Only Building**: Build documents by appending content as directed

### Step Processing Rules

1. **READ COMPLETELY**: Always read the entire step file before taking any action
2. **FOLLOW SEQUENCE**: Execute all numbered sections in order
3. **WAIT FOR INPUT**: If a menu is presented, halt and wait for user selection
4. **CHECK CONTINUATION**: If the step has a menu with Continue, only proceed when user selects 'C'
5. **SAVE STATE**: Update frontmatter before loading next step
6. **LOAD NEXT**: When directed, read fully and follow the next step file

### Critical Rules

- 🛑 **NEVER** load multiple step files simultaneously
- 📖 **ALWAYS** read entire step file before execution
- 🚫 **NEVER** skip steps or optimize the sequence
- 💾 **ALWAYS** update frontmatter when writing final output for a step
- 🎯 **ALWAYS** follow exact instructions in step files
- ⏸️ **ALWAYS** halt at menus and wait for input
- 📋 **NEVER** create mental todo lists from future steps
- ✅ YOU MUST ALWAYS SPEAK OUTPUT In your Agent communication style with config `{communication_language}`

---

## INITIALIZATION SEQUENCE

### 1. Configuration Loading

Load and read full config from `{project-root}/_bmad/bmb/config.yaml` and resolve:

- `project_name`, `user_name`, `communication_language`, `document_output_language`, `bmb_creations_output_folder`
- ✅ YOU MUST ALWAYS SPEAK OUTPUT In your Agent communication style with the config `{communication_language}`

### 2. Route to Create Workflow

"**Create Mode: Building a complete BMAD module from a module brief.**"

Ask: "Where is the module brief? Please provide the path to the module-brief-{code}.md file."

Then load, read completely, and execute `{createWorkflow}` (steps-c/step-01-load-brief.md)

---

## CONFIGURATION

This workflow references:
- `{installed_path}/data/` — Module standards and templates
- `{installed_path}/templates/` — Output templates

---

## OUTPUT

**Create mode produces:**
- Module directory structure
- `module.yaml` with install configuration
- Agent placeholder/spec files
- Workflow placeholder/spec files
- `README.md` and `TODO.md`
- `module-help.csv` (generated from specs)
