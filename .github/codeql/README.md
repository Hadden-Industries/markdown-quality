# Actions approval model

CodeQL 2.27.4's native environment check omits `workflow_dispatch`.
Shared qualification instead uses the protected environment and live approval-history admission described in [the trust contract](../../docs/ci-trust.md).
`actions/QualificationAdmission.qll` models only that exact admission sequence: an immutable producer, matching reviewed input bindings and request summary, an unconditional fail-closed admission command, and subsequent matching checkouts in the same job.
Other events and checkouts retain their native treatment.

The Actions suite retains the complete default stock query inventory.
It replaces one query with the same query identity, metadata and body, adding only the model import.

The original query is from [GitHub CodeQL commit a1575b98a8cc19bcfa7bb6cb41be688cb3dae65c](https://github.com/github/codeql/blob/a1575b98a8cc19bcfa7bb6cb41be688cb3dae65c/actions/ql/src/Security/CWE-349/CachePoisoningViaPoisonableStep.ql); its unchanged MIT license is in `actions/LICENSE-MIT.txt`.
No findings are filtered, dismissed or removed from SARIF.
JavaScript and Python keep the native default configuration, and release qualification still requires zero raw results.

The required **Validate Actions approval model** job compares query identities, stock bodies and pack versions with the installed native bundle, compiles the production query and runs native QL regression fixtures.
Tool updates that change this inventory fail closed until the model is reconciled.

The fixture templates use `.yml.fixture`; deliberately unsafe workflows are generated only under the runner's temporary directory, outside the analyzed checkout.
Frozen expected rows require a real manual caller and include both successful protection and broken approval/input/checkout variants.

For local validation, pass an existing complete CodeQL bundle's executable and an external temporary root to `node scripts/check-codeql-model.js CODEQL TEMPORARY_ROOT`.
The standalone CLI is sufficient for compilation and QL fixtures, but cannot establish native query parity; the required job rejects a cache-only baseline.
The driver removes its fixture workspace after the native run; its package cache remains owned by that temporary root.
