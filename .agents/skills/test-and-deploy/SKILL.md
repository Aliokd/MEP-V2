---
name: test-and-deploy
description: "Enforces strict testing protocols and automated pipeline execution before deploying Vaynote updates to production."
---

# Vaynote Test & Deploy Skill

This workspace skill coordinates the testing and deployment workflow. Any agent working on this codebase must follow these procedures before declaring a task complete or executing a deployment.

## Protocols for Code Changes & Updates

1. **Local E2E Validation:**
   Before staging any changes, always run the automated E2E tests to verify functionality:
   ```bash
   npx playwright test
   ```

2. **Cross-Functional Assurance:**
   Verify that interactions between the `Create` canvas, `Learn` curriculum, `Practice` metrics, and the `Connect` feed are completely error-free.

3. **Auto-Fixing Policy:**
   If the E2E tests report any error, you are authorized and expected to:
   - Read the playwright HTML report or console error stack.
   - Edit the relevant components to resolve the bug.
   - Re-run the tests until they pass with **zero errors**.

4. **Production Deployments:**
   To deploy changes to Firebase production, execute the master deployment script:
   ```powershell
   powershell ./scripts/test-and-deploy.ps1
   ```
   This script will compile the code, run linting, execute E2E tests, and deploy only if all checks succeed.
