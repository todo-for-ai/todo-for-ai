---
name: 'v-02d-validate-structure'
description: 'Validate YAML structure and append to report'

nextStepFile: './v-02e-validate-sidecar.md'
validationReport: '{bmb_creations_output_folder}/validation-report-{agent-name}.md'
agentValidation: ../data/agent-validation.md
agentCompilation: ../data/agent-compilation.md
agentFile: '{agent-file-path}'
---

# Validate Step 2d: Validate Structure

## STEP GOAL

Validate the agent's YAML structure and completeness against BMAD standards as defined in agentCompilation.md. Append findings to validation report and auto-advance.

## MANDATORY EXECUTION RULES

- 📖 CRITICAL: Read the complete step file before taking any action
- 🔄 CRITICAL: Read validationReport and agentCompilation first
- 🔄 CRITICAL: Load the actual agent file to validate structure
- 🚫 NO MENU - append findings and auto-advance
- ✅ YOU MUST ALWAYS SPEAK OUTPUT In your Agent communication style with the config `{communication_language}`

### Step-Specific Rules:

- 🎯 Validate structure against agentCompilation.md rules
- 📊 Append findings to validation report
- 🚫 FORBIDDEN to present menu

## EXECUTION PROTOCOLS

- 🎯 Load agentCompilation.md reference
- 🎯 Load the actual agent file for validation
- 📊 Validate YAML structure
- 💾 Append findings to validation report
- ➡️ Auto-advance to next validation step

## MANDATORY SEQUENCE

**CRITICAL:** Follow this sequence exactly. Do not skip, reorder, or improvise unless user explicitly requests a change.

### 1. Load References

Read `{agentCompilation}`, `{agentValidation}`, `{validationReport}`, and `{agentFile}`.

### 2. Validate Structure

Perform these checks systematically - validate EVERY rule specified in agentCompilation.md:

#### A. YAML Syntax Validation
- [ ] Parse YAML without errors
- [ ] Check indentation consistency (2-space standard)
- [ ] Validate proper escaping of special characters
- [ ] Verify no duplicate keys in any section

#### B. Frontmatter Validation
- [ ] All required fields present (name, description, version, etc.)
- [ ] Field values are correct type (string, boolean, array)
- [ ] No empty required fields
- [ ] Proper array formatting with dashes
- [ ] Boolean fields are actual booleans (not strings)

#### C. Section Completeness
- [ ] All required sections present based on hasSidecar value
- [ ] Sections not empty unless explicitly optional
- [ ] Proper markdown heading hierarchy (##, ###)
- [ ] No orphaned content without section headers

#### D. Field-Level Validation
- [ ] Path references exist and are valid
- [ ] Array fields properly formatted
- [ ] No malformed YAML structures
- [ ] File references use correct path format

#### E. Agent Configuration Specific Checks

**For Agents WITHOUT Sidecar (hasSidecar is false):**
- [ ] No sidecar requirements
- [ ] No sidecar-folder path in metadata
- [ ] If critical_actions present, no sidecar file references
- [ ] Menu handlers use only internal references (#) or inline prompts
- [ ] Total size under ~250 lines (unless justified)

**For Agents WITH Sidecar (hasSidecar is true):**
- [ ] hasSidecar flag set correctly in metadata
- [ ] Sidecar folder path specified in metadata
- [ ] critical_actions section present with minimum requirements:
  - [ ] Loads sidecar memories
  - [ ] Loads sidecar instructions
  - [ ] Restricts file access to sidecar folder
- [ ] All critical_actions reference correct `{project-root}/_bmad/_memory/` paths
- [ ] Menu handlers that update sidecar use correct path format

### 3. Append Findings to Report

Append to `{validationReport}`:

```markdown
### Structure Validation

**Status:** {✅ PASS / ⚠️ WARNING / ❌ FAIL}

**Configuration:** Agent {WITH|WITHOUT} sidecar

**hasSidecar:** {true|false}

**Checks:**
- [ ] Valid YAML syntax
- [ ] Required fields present (name, description, persona, menu)
- [ ] Field types correct (arrays, strings, booleans)
- [ ] Consistent 2-space indentation
- [ ] Configuration appropriate structure

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

**Validating sidecar structure...**
