// SPDX-License-Identifier: AGPL-3.0-only
// No analyzers, policy, configuration or descendant processes in the sink owner.
const output = process.argv[2] === "stderr" ? process.stderr : process.stdout;
let failure;
const failed = (error) => {
  failure = error;
};
output.on("error", failed);
try {
  for await (const chunk of process.stdin) {
    if (failure) throw failure;
    await new Promise((resolve, reject) =>
      output.write(chunk, (error) => (error ? reject(error) : resolve())),
    );
  }
  if (failure) throw failure;
  process.send({ delivered: true });
} catch (error) {
  process.exitCode = 2;
  process.send({ code: error.code ?? "OUTPUT_FAILED" });
  process.stdin.destroy();
} finally {
  process.disconnect();
}
