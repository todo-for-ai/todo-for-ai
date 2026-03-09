---
name: 'v-02c-validate-menu'
description: 'Validate menu structure and append to report'

nextStepFile: './v-02d-validate-structure.md'
validationReport: '{bmb_creations_output_folder}/validation-report-{agent-name}.md'
agentMenuPatterns: ../data/agent-menu-patterns.md
agentFile: '{agent-file-path}'
---

# Validate Step 2c: Validate Menu

## STEP GOAL

Validate the agent's command menu structure against BMAD standards as defined in agentMenuPatterns.md. Append findings to validation report and auto-advance.

## MANDATORY EXECUTION RULES

- 📖 CRITICAL: Read the complete step file before taking any action
- 🔄 CRITICAL: Read validationReport and agentMenuPatterns first
- 🔄 CRITICAL: Load the actual agent file to validate menu
- 🚫 NO MENU - append findings and auto-advance
- ✅ YOU MUST ALWAYS SPEAK OUTPUT In your Agent communication style with the config `{communication_language}`

### Step-Specific Rules:

- 🎯 Validate menu against agentMenuPatterns.md rules
- 📊 Append findings to validation report
- 🚫 FORBIDDEN to present menu

## EXECUTION PROTOCOLS

- 🎯 Load agentMenuPatterns.md reference
- 🎯 Load the actual agent file for validation
- 📊 Validate commands and menu
- 💾 Append findings to validation report
- ➡️ Auto-advance to next validation step

## MANDATORY SEQUENCE

**CRITICAL:** Follow this sequence exactly. Do not skip, reorder, or improvise unless user explicitly requests a change.

### 1. Load References

Read `{agentMenuPatterns}`, `{validationReport}`, and `{agentFile}`.

### 2. Validate Menu

Perform these checks systematically - validate EVERY rule specified in agentMenuPatterns.md:

1. **Menu Structure**
   - [ ] Menu section exists and is properly formatted
   - [ ] At least one menu item defined (unless intentionally tool-less)
   - [ ] Menu items follow proper YAML structure
   - [ ] Each item has required fields (trigger, description, action)

2. **Menu Item Requirements**
   For each menu item:
   - [ ] trigger: Present, follows `XX or fuzzy match on command` format
   - [ ] description: Clear and concise, starts with `[XX]` code
   - [ ] action: Prompt reference (#id) or inline instruction

3. **Trigger Format Validation**
   - [ ] Format: `XX or fuzzy match on command-name` (XX = 2-letter code)
   - [ ] Codes are unique within agent
   - [ ] No reserved codes used: MH, CH, PM, DA

4. **Description Format Validation**
   - [ ] Descriptions start with `[XX]` code
   - [ ] Code in description matches trigger code
   - [ ] Descriptions are clear and descriptive

5. **Action Handler Validation**
   - [ ] If `action: '#prompt-id'`, corresponding prompt exists
   - [ ] If `action: 'inline text'`, instruction is complete and clear

6. **Alignment Checks**
   - [ ] Menu items align with agent's role/purpose
   - [ ] Menu items are appropriate for target users
   - [ ] Menu scope is appropriate (not too sparse/overloaded)

7. **Configuration Specific Menu Handler Validation**
   - [ ] Determine hasSidecar from metadata
   - [ ] For hasSidecar: true:
     - [ ] Menu handlers MAY reference sidecar files using correct path format
     - [ ] Sidecar references use: `{project-root}/_bmad/_memory/{sidecar-folder}/...`
   - [ ] For hasSidecar: false:
     - [ ] Menu handlers MUST NOT have sidecar file links
     - [ ] Menu handlers use only internal references (#) or inline prompts

### 3. Append Findings to Report

Append to `{validationReport}`:

```markdown
### Menu Validation

**Status:** {✅ PASS / ⚠️ WARNING / ❌ FAIL}

**hasSidecar:** {true|false}

**Checks:**
- [ ] Triggers follow `XX or fuzzy match on command` format
- [ ] Descriptions start with `[XX]` code
- [ ] No reserved codes (MH, CH, PM, DA)
- [ ] Action handlers valid (#prompt-id or inline)
- [ ] Configuration appropriate menu links

**Detailed Findings:**

*PASSING:*
{List of passing checks}

*WARNINGS:*
{List of non-blocking issues}

*FAILURES:*
{List of blocking issues that must be fixed}
```

### 4. Auto-Advance

Load and execute `{nextStepFile}` immediately.

---

**Validating YAML structure...**
