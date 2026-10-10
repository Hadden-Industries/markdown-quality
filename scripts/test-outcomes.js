// SPDX-License-Identifier: AGPL-3.0-only
/** Native Node reporter: retain per-test file outcomes and diagnostics without timing comparisons. */
export default async function* testOutcomes(events) {
  for await (const { type, data } of events) {
    if (["test:pass", "test:fail"].includes(type)) {
      yield JSON.stringify({
        type,
        file: data.file ?? null,
        name: data.name,
        line: data.line ?? null,
        column: data.column ?? null,
        skip: data.skip ?? false,
        todo: data.todo ?? false,
        failure: data.details?.error?.message ?? null,
      }) + "\n";
    } else if (
      ["test:stdout", "test:stderr", "test:diagnostic"].includes(type)
    ) {
      yield JSON.stringify({
        type,
        file: data.file ?? null,
        message: data.message,
      }) + "\n";
    }
  }
}
