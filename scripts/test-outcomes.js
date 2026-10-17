// SPDX-License-Identifier: AGPL-3.0-only
import { inspect } from "node:util";
/** Native Node reporter: stream execution progress, outcomes and diagnostics without timing comparisons. */
export default async function* testOutcomes(events) {
  for await (const { type, data } of events) {
    if (type === "test:dequeue") {
      // Outcome events can be buffered behind an earlier test file. Dequeue
      // identifies work that has actually started even if that file hangs.
      yield JSON.stringify({ type, file: data.file ?? null, name: data.name }) +
        "\n";
    } else if (["test:pass", "test:fail"].includes(type)) {
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
      // Preserve native stacks, causes and assertion metadata separately from
      // stable outcome records consumed by affected-test comparisons.
      if (data.details?.error)
        yield JSON.stringify({
          type: "test:diagnostic",
          file: data.file ?? null,
          message: inspect(data.details.error, { colors: false, depth: 5 }),
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
