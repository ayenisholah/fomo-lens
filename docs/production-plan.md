> Approved free-access plan (2026-09-13): no application request/credit caps. Current-key public launch is authorized after engineering checks. Historical billing restrictions below are superseded; preserve the private ledger and acceptance ceiling, and do not run paid acceptance automatically.

# Production and GitHub automation plan

Assessment: 2026-09-13. Target: https://fomo-lens.sholaayeni.xyz. Repository: ayenisholah/fomo-lens, public, default branch main.

## Verified state

The application implements email authentication, sessions, owner restrictions, public synthetic research, eight research actions, graph/list exploration, pagination, comparison, history, shared selections, accounting reservations and explicit recovery. Production acceptance remains incomplete.

Saved unit evidence shows 91 passes. Fresh Node 24 isolated integration evidence shows 17 passes, including actual SIGKILL interruption and original-identity recovery. Clean lockfile installation succeeded with zero reported audit vulnerabilities. Encrypted restore/deletion/failure rehearsals passed. User confirmed email delivery and template approval.

Browser evidence is incomplete. The clean production build and approved retry both failed on local process/port permissions; no build pass is established. Source changes remain uncommitted, including intentional Docker removals. Earlier README/checkpoint restrictions are stale and must be replaced with current evidence before publishing.

DNS points to 45.67.128.88. Node 24.21.0, PostgreSQL, Nginx and Certbot are available. Nginx validation succeeds; certificate renewal timer is active. Port 3001 is currently free. No current Fomo Lens release or dedicated certificate exists. VPS free space is approximately 4.8 GB. Backup timer exists; maintenance is not installed.

## Ordered implementation

1. Finish build and source/artifact scans; complete desktop/mobile browser tests, fix failures and verify stale selection/recovery behavior. Run final formatting, lint, typechecking and affected tests. Preserve synthetic CI fixtures and prevent paid requests in automated tests.
2. Complete isolated restart, readiness outage, code rollback and deployment interruption rehearsals. Restore the off-VPS encrypted copy and verify fixtures. Finish maintenance/timer and alert failure evidence. Preserve unrelated applications and production data.
3. Add CI on pull requests and pushes to main using GitHub-hosted Linux runners, Node 24 and npm ci. Run format, lint, types, unit tests, source scans, PostgreSQL 16 integration tests in isolated databases, desktop/mobile Playwright, production build and artifact scans. Retain sanitized reports; restrict failure artifacts that may contain sessions. Give CI no runtime API keys. Pin actions to reviewed immutable commits.
4. Add deployment after successful CI on main, with a manual dispatch path for a reviewed revision. Use a GitHub production environment, minimal token permissions and deployment concurrency that does not cancel an active switch. Keep production activation disabled until first-launch gates are resolved. Enable automatic deployments thereafter. Require CI checks before merging to main.
5. Generate a dedicated SSH deployment key and configure pinned host verification through existing access. Store its private half in a GitHub environment secret. Use a narrowly scoped server deployment entry point; do not put the supplied SSH password in workflow files. Build a credential-free release on GitHub, bind it to the tested commit SHA and verify the artifact on the VPS. Adapt the existing server build script for verified artifact installation, preserving backup, migrations, atomic switch, health checks and rollback.
6. Synchronize supplied runtime keys into protected server configuration; generate/verify separate application signing secrets and dedicated database credentials. Verify sender configuration without repeating already confirmed email delivery unnecessarily. Runtime credentials must remain outside release artifacts.
7. Deploy an immutable release under /opt/fomo-lens/releases using the unprivileged fomo-lens service account. Take an encrypted pre-migration backup and apply only reviewed migrations. Preserve current/previous releases and at least 1.5 GB free disk. Bind the app to 127.0.0.1:3001, rechecking availability immediately before activation; use 3002 upward if needed and update service, Nginx and readiness URLs together.
8. Create a dedicated Nginx configuration using the server's existing IP-specific listeners and actual include layout. Serve the ACME webroot, obtain the domain certificate, enable HTTPS proxying, validate Nginx and reload. Check unrelated hosted applications after reload and perform a renewal dry run.
9. Verify public HTTPS, assets, real sign-in/session persistence, owner restrictions, readiness and application logs. Demonstrate code-only rollback and return to the verified release. Install maintenance and backup timers. Record deployed SHA, workflow run, restoration instructions and actual remaining limits.

## Inputs and launch conditions

Repository/server access, DNS and API keys have been supplied. No additional access credentials are currently needed. Dedicated automation credentials can be provisioned using existing access.

The user's earlier instruction deferred billing until a future credit increase. A new API key alone does not establish that the increase is active. Preserve the private ledger's 14 confirmed plus 100 unresolved reserved credits; do not silently discard its history or make more paid requests. Live following, followers and successful reverse-wallet acceptance remain unverified. Before paid acceptance/public stored-mode launch, establish current provider entitlement and explicitly resolve or supersede the existing spending/launch constraint with the user.

An encrypted off-VPS copy and separately protected key exist locally. Automated off-server backup retention is not configured. A durable owner-selected backup destination is a follow-up operational decision; do not describe the manual copy as continuous disaster recovery.

## References

- [GitHub workflow triggers](https://docs.github.com/en/actions/how-tos/write-workflows/choose-when-workflows-run/trigger-a-workflow)
- [GitHub deployment environments and concurrency](https://docs.github.com/en/actions/how-tos/deploy/configure-and-manage-deployments/control-deployments)
- [GitHub Actions secrets](https://docs.github.com/en/actions/concepts/security/secrets)
