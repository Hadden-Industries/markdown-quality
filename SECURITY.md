# Security policy

Before stable promotion, security support covers only the single candidate designated by npm's `pilot` tag.
After stable promotion, it covers only the latest stable release designated by `latest`, unless an explicit policy accepts another line.
Consumers should pin exact versions and qualify upgrades.
Older releases remaining downloadable does not imply maintenance or backport support.
For published 1.0.3, the supported runtime remains Node 24.21.0 on Windows x64 and Ubuntu 24.04 x64 with glibc 2.39, with the qualified core/native tuple and explicit preset.
Development CI additionally qualifies Node 22/24/26 at the patched minima and latest versions described in the [support policy](docs/support-and-release.md).
That source qualification does not change an existing release's immutable metadata or establish support for an unpublished release.

Report suspected vulnerabilities privately through [GitHub private vulnerability reporting](https://github.com/Hadden-Industries/markdown-quality/security/advisories/new).
If unavailable or unsuitable, use `security@haddenindustries.com`.
Avoid public disclosure in issues or pull requests.
Include affected release, environment, impact, reproduction and possible mitigation, while minimizing credentials, personal data and unrelated document content.

Maksym Shostak / Hadden Industries owns manual report handling and dependency/advisory review.
No unattended monitoring or notification service is assumed.
Maintainer targets, accepted on 2026-10-05, are:

| Stage                                               | Target                                          |
| --------------------------------------------------- | ----------------------------------------------- |
| Acknowledge a private report                        | Five working days from receipt                  |
| Initial severity/reachability triage                | Five further working days after acknowledgement |
| Confirmed critical/high fix or effective mitigation | Five working days from confirmation             |
| Confirmed medium fix or effective mitigation        | 30 calendar days from confirmation              |
| Confirmed low fix or effective mitigation           | 90 calendar days from confirmation              |

These targets are not an SLA or guaranteed resolution.
A missed target requires a responsible owner, interim disposition or mitigation, and dated next review through the private reporting channel.
Upon observation, suspected critical/high issues block affected promotion immediately.
Prioritize active exploitation, exposed credentials, reachability, impact and exploit prerequisites regardless of score; [CVSS v4](https://www.first.org/cvss/v4.0/specification-document) informs documented severity.

Coordinate confirmed issues through private advisories and disclose after a qualified fix or effective mitigation, unless an overriding safety or legal reason is recorded.
Keep embargoed evidence and reporter information restricted.
Security fixes retain component/rights, native parity, corpus, platform, package, registry and consumer qualification requirements.
Containment, credential changes, registry deprecation and external messages require their applicable authorization.

Review dependency/advisory health at every release preparation and monthly while a release is maintained.
Native upgrades require fresh source/component rights, output/parity and platform qualification; no unattended adoption is authorized.
Retain release source, build inputs, notices, recipient delivery/qualification evidence and accepted recovery inputs for the maintained lifetime plus three years after support ends, honoring license obligations requiring more.
The retention period is an operational floor, not a legal interpretation.
Preserve AGPL-3.0-only and provide corresponding source/build materials and third-party notices to recipients.
