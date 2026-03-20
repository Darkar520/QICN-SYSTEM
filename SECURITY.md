# Security Policy

## Secret Handling

- Never commit `.env`, API keys, access tokens, cookies, or platform credentials.
- Keep real secrets in local environment files or in deployment platform environment-variable stores.
- `.env.example` is the only committed environment template and must contain placeholders only.
- If exposure is suspected, rotate the affected credential before any further deployment.

Sensitive variables in this repository include, but are not limited to:

- `GEMINI_API_KEY`
- `OPENAI_API_KEY`
- `IBM_QUANTUM_API_KEY`
- `GITHUB_SELFPATCH_TOKEN`
- `NETLIFY_TOKEN`
- `NETLIFY_ROLLBACK_TOKEN`
- `INTEGRITY_HMAC_SECRET`

## Default Security Posture

- `AUTH_REQUIRED` should remain `true` unless a reviewed change explicitly documents why unauthenticated access is needed.
- `SELF_PATCH_ENABLED`, `SELF_PATCH_LOCAL_APPLY`, and `ALLOW_CLIENT_CODEX_KEY` should remain disabled unless the change set includes a security review and test impact.
- Do not add secrets to client-side code, generated bundles, markdown reports, logs, or test fixtures.

## Reporting Vulnerabilities

- Report vulnerabilities privately to repository maintainers through a private GitHub security advisory or another private maintainer channel.
- Include the affected commit or branch, impact summary, reproduction steps, and any required environment assumptions.
- Do not include raw secrets in the report. Describe the secret class and rotation status instead.

## Scope Limits

This file defines repository handling rules. It does not guarantee that every deployment target, external provider, or third-party asset has been independently audited.
