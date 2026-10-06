// SPDX-License-Identifier: AGPL-3.0-only
import { parentPort, workerData } from "node:worker_threads";
import { formatDocument } from "./formatting.js";
import { createLinter, lintDocument, checkLinks } from "./analysis.js";
import { diagnosticBudget, OperationError } from "./contracts.js";
import { checkTrailingWhitespace } from "./whitespace.js";
const { context, tool } = workerData;
const linter = createLinter(context);
parentPort.on("message", async ({ text, file, mode }) => {
  try {
    const formatted = await formatDocument(text, context, tool);
    const proposed = mode === "format" ? formatted.output : text;
    const diagnostics = [
      ...checkTrailingWhitespace(proposed),
      ...formatted.diagnostics,
      ...(await lintDocument(linter, proposed, file)),
      ...checkLinks(context, proposed, file),
    ];
    diagnosticBudget(diagnostics);
    parentPort.postMessage({ output: formatted.output, diagnostics });
  } catch (error) {
    parentPort.postMessage({
      error: {
        code: error instanceof OperationError ? error.code : "ANALYSIS_FAILURE",
        message:
          error instanceof OperationError
            ? error.message
            : "Document analysis failed.",
      },
    });
  }
});
