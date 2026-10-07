// SPDX-License-Identifier: AGPL-3.0-only
import test from "node:test";
import assert from "node:assert/strict";
import { createDocumentAnalyzerPool } from "../src/document-analysis-pool.js";

function controlledWorkers() {
  const pending = new Map(),
    created = [],
    started = [];
  let active = 0,
    peak = 0;
  function create() {
    const worker = {
      closed: false,
      prepare({ text }) {
        started.push(text);
        active++;
        peak = Math.max(peak, active);
        return new Promise((resolve, reject) => {
          pending.set(text, {
            resolve(value = { output: text }) {
              pending.delete(text);
              active--;
              resolve(value);
            },
            reject(error) {
              pending.delete(text);
              active--;
              reject(error);
            },
            worker,
          });
        });
      },
      close() {
        this.closed = true;
        for (const request of [...pending.values()])
          if (request.worker === this)
            request.reject(
              Object.assign(new Error("stopped"), { code: "ANALYSIS_FAILURE" }),
            );
      },
    };
    created.push(worker);
    return worker;
  }
  return { create, created, started, pending, peak: () => peak };
}
const jobs = (...texts) =>
  texts.map((text) => ({ data: { text }, milliseconds: 30_000 }));
const turn = () => new Promise((resolve) => setImmediate(resolve));

test("pool overlaps preparation, reuses workers and returns input order", async () => {
  const control = controlledWorkers();
  const pool = createDocumentAnalyzerPool(control.create, 2);
  const first = pool.prepareGroup(jobs("a", "b", "c"));
  assert.deepEqual(control.started, ["a", "b"]);
  control.pending.get("b").resolve();
  await turn();
  assert.deepEqual(control.started, ["a", "b", "c"]);
  control.pending.get("c").resolve();
  control.pending.get("a").resolve();
  assert.deepEqual(
    (await first).map((result) => result.formatted.output),
    ["a", "b", "c"],
  );
  assert.equal(control.peak(), 2);
  const second = pool.prepareGroup(jobs("d"));
  control.pending.get("d").resolve();
  await second;
  assert.equal(control.created.length, 2);
  await pool.close();
  assert.ok(control.created.every((worker) => worker.closed));
});

test("later failures stop queued work while retaining earlier outcomes and errors", async () => {
  const control = controlledWorkers();
  const pool = createDocumentAnalyzerPool(control.create, 2);
  const running = pool.prepareGroup(jobs("a", "b", "c", "d"));
  const later = new Error("later failure"),
    earlier = new Error("earlier failure");
  control.pending.get("b").reject(later);
  await turn();
  assert.deepEqual(control.started, ["a", "b"]);
  control.pending.get("a").reject(earlier);
  const results = await running;
  assert.equal(results[0].error, earlier);
  assert.equal(results[1].error, later);
  assert.equal(results[2], undefined);
  await pool.close();
});

test("closing the pool cancels in-flight requests and leaves queued work undispatched", async () => {
  const control = controlledWorkers();
  const pool = createDocumentAnalyzerPool(control.create, 2);
  const running = assert.rejects(pool.prepareGroup(jobs("a", "b", "c")), {
    code: "ANALYSIS_FAILURE",
  });
  await pool.close();
  await running;
  assert.deepEqual(control.started, ["a", "b"]);
  assert.equal(control.pending.size, 0);
  assert.ok(control.created.every((worker) => worker.closed));
  await assert.rejects(pool.prepareGroup(jobs("d")), {
    code: "ANALYSIS_FAILURE",
  });
  await pool.close();
});

test("cleanup attempts every worker even when one close throws", async () => {
  let created = 0;
  const closed = [];
  const pool = createDocumentAnalyzerPool(() => {
    const index = created++;
    return {
      prepare: async () => ({ output: "Alpha.\n" }),
      close() {
        closed.push(index);
        if (index === 0) throw new Error("close failed");
      },
    };
  }, 2);
  await pool.prepareGroup(jobs("a", "b"));
  await assert.rejects(pool.close(), /close failed/u);
  assert.deepEqual(closed, [0, 1]);
});
