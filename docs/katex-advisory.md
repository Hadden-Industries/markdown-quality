# KaTeX dependency advisory

An npm audit of an installation can report GHSA-238p-pmpm-9mq7 (CVE-2026-103923).
The reviewed dependency path from Markdown Quality is `@eslint/markdown@8.0.3` → `micromark-extension-math@3.1.0` → `katex@0.16.47`.
The math extension accepts the KaTeX `0.16.x` line, and the advisory's first patched version is `0.18.2`.
[KaTeX advisory](https://github.com/advisories/GHSA-238p-pmpm-9mq7) · [Math extension manifest](https://github.com/micromark/micromark-extension-math/blob/3.1.0/package.json)

The advisory affects applications that render math with KaTeX.
It requires a polluted prototype or control over the renderer options prototype.
Markdown Quality loads the KaTeX module through the math extension's exports.
Its CLI and Node.js SDK parse, lint and format Markdown using package-owned ESLint settings.
They leave the plugin's math option off and never invoke the HTML extension that calls KaTeX.
A host that also renders math with KaTeX needs to assess that separate call path.
[ESLint Markdown math option](https://github.com/eslint/markdown/blob/v8.0.3/README.md#enabling-math-latex-in-both-commonmark-and-gfm)

The packed-consumer tests install the package in both a repository root and an isolated tooling project.
They pass harmless inline and display math through CLI checking and formatting and through the public SDK.
A temporary renderer replacement records KaTeX imports and fails on a render call from any process or document worker.
A positive control verifies that a render call would be detected.
[Packed-consumer tests](https://github.com/Hadden-Industries/markdown-quality/blob/main/test/packaging.test.js)

Our release qualification keeps the original audit report and records the approved disposition separately.
The exception covers this advisory and this exact dependency chain for the release archive containing this notice.
Other findings still require disposition.
Consumer audits continue to report the advisory while their lockfile selects an affected version.
Reassess the exception at each release and whenever the dependency chain or rendering behavior changes.
