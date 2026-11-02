<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

- Do not run production builds or start Dev server on each prompt change.
<!-- END:nextjs-agent-rules -->

# Verification policy

- Run tests only against local fixtures and local services. Do not use deployed Web/Admin URLs or remote Supabase projects as test targets.
- Never load credentials for remote services into local test processes.
- The user accepted the final live checks and confirmed Web/Admin redeployment on 2026-10-28. Preserve that as user confirmation, distinct from tests actually performed by the agent.
- Dashboard development is closed; trash activation, audit retention/Cron and a full restore rehearsal remain separately documented manual operations.
