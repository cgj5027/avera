# Public-release security remediation

## Implemented source controls

- Streaming JSON reader bounds actual body bytes before parsing (including requests
  without Content-Length), caps chunk count, and cancels stalled reads after
  ten seconds. Invalid JSON and non-object payloads receive 400;
  oversized requests receive 413. Small service requests are limited to 16 KB.
- Resume requests require explicit AI-processing consent, canonical base64 and
  sanitized filenames. Decoded files are limited to 5 MB; UTF-8 text to 60 KB.
  PDF header/end markers, Word compound-document markers and DOCX ZIP directory
  structure are checked. DOCX rejects encrypted entries, traversal, duplicate
  names, ZIP64, macros and expanded-size declarations over 20 MB. These checks
  identify basic format errors; they do not certify malware-free documents or
  validate every PDF/OLE/ZIP structure. Provider parsing remains untrusted.
- Text resumes are sent to AI as untrusted text without a file upload. Other
  formats use generated filenames and server-selected private locations.
- ServiceUsage denies all user CRUD. Authenticated handlers claim persisted
  counters through merge-only upsert and conditional updateMany/$inc before
  expensive work; unavailable or malformed quota responses fail closed.
- Ask Avera reads at most 120 recent transaction details, without truncating
  calculation inputs. Full-record reads fail rather than return incomplete
  financial totals above 5,000 records; model prompts above 100 KB are refused.
- Plaid failure logs contain allowlisted error codes only, not upstream messages.
- AI disclosure precedes resume upload and appears before assistant use.
- A locally authored image placeholder replaces the unverified external asset.
- Backend SDK pins match the audited frontend SDK. CI audits, history secret
  scanning, Dependabot and private-reporting guidance are configured in source.

## Request quotas

| Endpoint | Per UTC minute | Per UTC day |
|---|---:|---:|
| askAvera | 6 | 60 |
| parseResume | 2 | 10 |
| searchJobOpportunities | 3 | 30 |
| demoSandboxConnect | 6 | 30 |
| suggestBills / suggestCategories (each) | 6 | 60 |

Counters include all authenticated attempts, including rejected payloads and
failed downstream work. Quotas are checked before reading the request body. A rejected daily claim may still
consume its minute slot; this is deliberate conservative accounting. Limits
use fixed windows and can admit a burst at a window boundary. They bound request
counts, not provider cost or globally concurrent execution. Configure app-wide
credit budgets and platform concurrency/execution-time limits separately.

Deploy ServiceUsage **with** the revised functions. Older schemas cannot support
these controls and calls will fail closed. Verify that upsert keys are unique
under concurrent creation and that conditional updateMany/$inc is atomic in the
hosted platform. Local fixtures cannot establish those platform properties.
Counters store user IDs, endpoint, count and expiry only. Set a platform cleanup
job to delete expired counters after seven days; expires_at is metadata, not an
automatically configured TTL. Do not expose ServiceUsage through MCP tools.

## Still required before real-user release

1. Execute the existing isolated acceptance runbook with two ordinary users.
   Verify foreign-ID CRUD/bulk/upsert, forged ownership, User.role escalation,
   private credential denial, legacy-token denial and MCP authorization. Include
   the new ServiceUsage deny-all schema and concurrent quota requests across
   independent function instances. A valid resumed upload must sign successfully
   as its user even though storage upload uses the service role.
2. Configure platform/global cost budgets, concurrency/time limits, log access,
   analytics exclusions and encrypted/private storage policies. Confirm request
   bodies, resume bytes, questions and financial context never enter analytics.
3. Confirm PDF/Word file cleanup through a supported platform mechanism. The
   current SDK exposes UploadPrivateFile and CreateFileSignedUrl, but no documented
   deletion API. This implementation does not invent one or claim erasure. Uploads
   can remain after successful processing, signing failure or model failure.
   Disable document use with personal data until retention/erasure is configured;
   text processing avoids app file storage but still uses the AI provider.
4. Verify provider retention/training settings and document actual retention,
   account erasure and backup policies. The UI does not promise zero retention.
5. Enable GitHub private vulnerability reporting, supported secret scanning/push
   protection and dependency alerts. Require the workflow checks before merge.
6. Licensing remains undecided at the owner's request. Confirm code/design rights
   and choose publication terms before claiming that reuse is permitted. Removing
   the remote placeholder resolves that specific asset uncertainty only.

These source changes do not change repository visibility or deploy the app.

## Executed validation — October 11, 2026

- Clean `npm ci --ignore-scripts` from the unchanged lockfile succeeded.
- 15 test files / 310 tests passed, including bounded streaming, stalled reads,
  format validation, concurrent quota fixtures, failure denial and safe logs.
- Lint and frontend/backend type checks passed. Production build passed using
  synthetic public app configuration; the existing large-bundle warning remains.
- Browser smoke completed 72 page cases at four widths and both themes, including
  consent controls. No accessibility violations or horizontal overflow were reported.
  Eight focused opportunity cases also passed. The checker waits for finite dialog
  animations before measuring contrast; its accessibility thresholds are unchanged.
- Fresh full and production-only npm audits returned zero known advisories.
- Gitleaks scanned all fetched remote branch history plus the proposed staged changes;
  no credible secrets were found. Two exact historical UI expressions were independently
  confirmed as false positives and documented in `.gitleaksignore`.
- Live isolation and Sandbox harnesses reported blocked prerequisites and made no
  requests: no isolated app ID/disposable user tokens were configured. Local SDK,
  provider and browser fixtures are not proof of hosted enforcement or retention.

## Sandbox and demo exit follow-up

The profile connection now polls the same Item through PRODUCT_NOT_READY and
empty successful syncs, with bounded backoff over 31 seconds. It no longer
interprets initial transaction preparation as a terminal failure. The connection
quota allows six attempts per minute and thirty per day, covering all three
profiles plus retries. Failures remain explicit; sample-data fallback never
claims a successful Plaid import.

A SERVICE_LIMITS_UNAVAILABLE response means the ServiceUsage schema or its
server-only upsert/updateMany capability is unavailable. Deploy the schema and
functions together and verify the persisted counter operations; the app does
not bypass failed quota enforcement. SANDBOX_NOT_CONFIGURED identifies missing
Sandbox credentials. Neither code exposes provider diagnostics or secrets.

Exit confirmation now uses viewport-centered positioning with concise action labels.
After successful scoped cleanup, it navigates directly to /welcome using history
replacement rather than reloading the current financial page. Cleanup failure
keeps the active demo mode and permits retry. Manual entry is the last onboarding
option and is described as starting a personal financial plan today.

Follow-up validation: 318 unit/integration tests, lint, frontend/backend type checks
and production build passed. General browser smoke passed 72 page cases; the demo
suite passed 200 checks, and focused centering/exit checks passed 32 cases. No
accessibility violations were reported. Mobile and desktop confirmation screenshots
were visually reviewed. Provider preparation and native SDK error-format regressions
use fixtures; a hosted Plaid connection cannot be certified without isolated test
credentials and deployed ServiceUsage/functions.
