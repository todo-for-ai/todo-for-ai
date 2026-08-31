# Organizations Backend Realization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the import shadowing issue so the already-implemented organizations backend (`api/organizations/` package) is actually loaded, then verify and fix any API contract mismatches against the frontend.

**Architecture:** The real implementation lives in `api/organizations/` (routes_organizations.py, routes_members.py, routes_roles.py, routes_events.py, shared.py). A stale stub file `api/organizations.py` is shadowing the package import in some runtime contexts. Remove the stub and validate end-to-end.

**Tech Stack:** Python (Flask), SQLAlchemy

---

## Root Cause

`todo-for-ai-api-server/api/organizations.py` (stub) and `todo-for-ai-api-server/api/organizations/__init__.py` (real package) share the same module name `api.organizations`. When the server is started through certain paths (PM2 / Gunicorn / non-interactive shells), CPython loads the `.py` file before the directory package, causing all organization endpoints to return the stub responses (empty lists, 404, 501).

## File Structure

**Files to Delete:**
- `todo-for-ai-api-server/api/organizations.py` — Conflicting stub module

**Files to Modify (verify/fix only):**
- `todo-for-ai-api-server/app.py` — Ensure it imports from the package
- `todo-for-ai-api-server/api/organizations/__init__.py` — Confirm all route submodules are imported
- `todo-for-ai-api-server/api/organizations/routes_organizations.py` — Add missing `DELETE` endpoint if needed
- `todo-for-ai-api-server/api/organizations/routes_members.py` — Validate role_ids handling aligns with frontend
- `todo-for-ai-api-server/api/organizations/routes_roles.py` — Validate create/update payloads

---

### Task 1: Remove Import-Shadowing Stub

**Files:**
- Delete: `todo-for-ai-api-server/api/organizations.py`

- [ ] **Step 1: Confirm which module is currently loaded by the runtime**

Run:
```bash
cd todo-for-ai-api-server && python -c "import api.organizations; print(api.organizations.__file__)"
```

Expected output: Path ending with `api/organizations/__init__.py` (the package). If it ends with `api/organizations.py`, that confirms shadowing.

- [ ] **Step 2: Delete the stub file**

Run:
```bash
rm todo-for-ai-api-server/api/organizations.py
```

- [ ] **Step 3: Verify import now resolves to the package**

Run:
```bash
cd todo-for-ai-api-server && python -c "import api.organizations; print(api.organizations.__file__); print(list(api.organizations.organizations_bp.deferred_functions))"
```

Expected: `__file__` ends with `api/organizations/__init__.py`, and the blueprint has deferred route registrations.

- [ ] **Step 4: Commit**

```bash
git rm todo-for-ai-api-server/api/organizations.py
git commit -m "fix(organizations): remove stub module shadowing the real organizations package"
```

---

### Task 2: Validate and Align API Contracts

**Files:**
- Read: `todo-for-ai-api-server/api/organizations/routes_organizations.py`
- Read: `todo-for-ai-api-server/api/organizations/routes_members.py`
- Read: `todo-for-ai-api-server/api/organizations/routes_roles.py`
- Read: `todo-for-ai-webpage/src/api/organizations.ts`

- [ ] **Step 1: Compare route definitions with frontend expectations**

Frontend expects:
1. `GET /organizations` — list with pagination
2. `POST /organizations` — create
3. `GET /organizations/:id` — detail
4. `PUT /organizations/:id` — update
5. `GET /organizations/:id/members` — member list
6. `POST /organizations/:id/members/invite` — invite by email
7. `PUT /organizations/:id/members/:user_id` — update member roles/status
8. `DELETE /organizations/:id/members/:user_id` — remove member
9. `GET /organizations/:id/roles` — role list
10. `POST /organizations/:id/roles` — create role
11. `PUT /organizations/:id/roles/:role_id` — update role
12. `DELETE /organizations/:id/roles/:role_id` — delete role

Backend package currently implements 1-11. **Missing 12?** Verify whether `DELETE /<id>/roles/<role_id>` exists in `routes_roles.py`.

Run:
```bash
grep -n "DELETE" todo-for-ai-api-server/api/organizations/routes_roles.py
```

Expected: A route handler for `DELETE` already exists (it does in the package).

- [ ] **Step 2: Check for missing `DELETE /organizations/:id`**

Frontend does not currently call delete organization, but it's good to add if absent for completeness.

Run:
```bash
grep -n "DELETE" todo-for-ai-api-server/api/organizations/routes_organizations.py || echo "No DELETE route"
```

If missing, decide whether to add it now (minimal fix) or leave it. For this plan, **add it** because it makes the CRUD surface complete.

- [ ] **Step 3: Verify `createOrganizationRole` payload compatibility**

Frontend may send `{ name, title, key, description, content }`. Backend already maps `title` or `name` to `role_title`. Confirm this logic is present in `routes_roles.py:68-69`.

- [ ] **Step 4: Verify `inviteOrganizationMember` payload compatibility**

Frontend sends `{ email, role?, role_ids? }`. Backend in `routes_members.py:invite_organization_member` already handles this via `_resolve_role_ids_from_payload`. Confirm `_resolve_role_ids_from_payload` is imported and called.

Run:
```bash
grep -n "_resolve_role_ids_from_payload" todo-for-ai-api-server/api/organizations/routes_members.py
```

Expected: Line 91 shows the call.

- [ ] **Step 5: Commit alignment verification notes**

No code changes yet if everything matches. Document findings in a temporary checklist `docs/REMINDERS_ORG_CONTRACT_ALIGNMENT.md`.

---

### Task 3: Add Missing DELETE Organization Endpoint

**Files:**
- Modify: `todo-for-ai-api-server/api/organizations/routes_organizations.py`

- [ ] **Step 1: Write a test for the DELETE endpoint**

Create test file `todo-for-ai-api-server/tests/api/test_organizations_delete.py`:

```python
import pytest
from tests.factories import OrganizationFactory, UserFactory

@pytest.mark.usefixtures('client', 'auth_headers', 'db_session')
class TestDeleteOrganization:
    def test_owner_can_delete_organization(self, client, auth_headers, db_session):
        owner = UserFactory()
        org = OrganizationFactory(owner=owner)
        db_session.commit()

        response = client.delete(
            f'/todo-for-ai/api/v1/organizations/{org.id}',
            headers=auth_headers(owner)
        )
        assert response.status_code == 200
        assert response.get_json()['code'] == 200
```

Note: If `tests.factories` does not exist, adapt using the project's existing test helpers.

- [ ] **Step 2: Run the test and confirm it fails**

Run:
```bash
cd todo-for-ai-api-server && pytest tests/api/test_organizations_delete.py -v
```

Expected: 404 or test error because the DELETE route does not exist yet.

- [ ] **Step 3: Implement DELETE route**

Append to `todo-for-ai-api-server/api/organizations/routes_organizations.py`:

```python
@organizations_bp.route('/<int:organization_id>', methods=['DELETE'])
@unified_auth_required
def delete_organization(organization_id):
    try:
        current_user = get_current_user()
        organization = Organization.query.get(organization_id)
        if not organization:
            return ApiResponse.not_found("Organization not found").to_response()
        if organization.owner_id != current_user.id:
            return ApiResponse.forbidden("Only organization owner can delete").to_response()

        record_organization_event(
            organization_id=organization.id,
            event_type='org.deleted',
            actor_type='user',
            actor_id=current_user.id,
            actor_name=current_user.full_name or current_user.nickname or current_user.username or current_user.email,
            target_type='organization',
            target_id=organization.id,
            message=f"Organization deleted: {organization.name}",
            payload={'organization_name': organization.name},
            created_by=current_user.email,
        )

        db.session.delete(organization)
        db.session.commit()
        _invalidate_org_users(organization_id)
        return ApiResponse.success(None, "Organization deleted successfully").to_response()
    except Exception as e:
        db.session.rollback()
        return ApiResponse.error(f"Failed to delete organization: {str(e)}", 500).to_response()
```

- [ ] **Step 4: Run the test again and confirm it passes**

Run:
```bash
cd todo-for-ai-api-server && pytest tests/api/test_organizations_delete.py -v
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add todo-for-ai-api-server/
git commit -m "feat(organizations): add DELETE /organizations/:id endpoint"
```

---

### Task 4: End-to-End Smoke Test

**Files:**
- None (verification only)

- [ ] **Step 1: Start backend and frontend locally**

Run:
```bash
pm2 restart ecosystem.config.js
# or individually:
pm2 restart todo-for-ai-backend
pm2 restart todo-for-ai-frontend
```

- [ ] **Step 2: Run the existing Playwright or API smoke test against organizations**

Option A (Python API test):
```bash
cd todo-for-ai-api-server && pytest tests/api/test_organizations.py -v -k "list or create or member or role"
```

Option B (Playwright):
```bash
cd todo-for-ai-webpage && npx playwright test --grep "organization" || echo "No org-specific Playwright tests yet"
```

Option C (manual curl):
```bash
curl -s http://127.0.0.1:50110/todo-for-ai/api/v1/organizations | python -m json.tool | head -20
```

Expected: Real organization data (or empty list if none created yet), not stub responses like `501 Not Implemented`.

- [ ] **Step 3: Fix any runtime import errors**

If the server fails to start with import errors, investigate whether `api/__init__.py` or `app.py` still holds a stale reference to the deleted stub file. Fix and commit.

- [ ] **Step 4: Clean up temporary checklist**

```bash
rm -f docs/REMINDERS_ORG_CONTRACT_ALIGNMENT.md
git add docs/
git commit --allow-empty -m "chore(organizations): finalize contract alignment verification"
```

---

## Execution Selection (Inline Preferred)

**Auto-selecting: Inline Execution**

This is primarily a deletion + verification task. The heavy backend logic is already written inside `api/organizations/`. Inline execution is efficient because:
- The primary fix is removing one conflicting file
- Remaining work is alignment verification and adding one missing DELETE route
- Context pollution risk is low

**Proceeding to execute with superpowers:executing-plans if requested.**
