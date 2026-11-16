// SPDX-License-Identifier: AGPL-3.0-only
/** Native provider boundary only; production admission, signatures and bytes stay real. */
import { spawnSync as realSpawnSync } from "child_process";
import { readFileSync, writeFileSync, copyFileSync } from "fs";
import { basename, join } from "node:path";

const read = () =>
  JSON.parse(readFileSync(process.env.MQ_RELEASE_PROVIDER_FIXTURE));
const save = (state) =>
  writeFileSync(process.env.MQ_RELEASE_PROVIDER_FIXTURE, JSON.stringify(state));
export function fixtureReadFileSync(path, ...args) {
  if (
    String(path).replaceAll("\\", "/").endsWith("/scripts/release-signers.json")
  )
    return JSON.stringify(read().signerPolicy);
  return readFileSync(path, ...args);
}

export function spawnSync(executable, args, options = {}) {
  const state = read();
  state.calls.push({
    executable: basename(executable),
    args,
    timeout: options.timeout,
  });
  save(state);
  const ok = (value = "") => ({
    status: 0,
    signal: null,
    stdout: typeof value === "string" ? value : JSON.stringify(value),
    stderr: "",
  });
  const name = basename(executable).replace(/\.exe$/u, "");
  if (
    name === "git" &&
    ["archive", "show", "rev-list", "diff"].includes(args[0])
  )
    return realSpawnSync(executable, args, {
      ...options,
      cwd: options.cwd ?? state.repositoryRoot,
    });
  if (name === "ssh-keygen" && args[0] === "-Y" && args[1] === "verify")
    return realSpawnSync(executable, args, options);
  if (
    ["python", "python3"].includes(name) &&
    /(?:pack|extract)-artifact\.py$/u.test(args[0])
  )
    return realSpawnSync(executable, args, options);
  if (
    args[0]
      ?.replaceAll("\\", "/")
      .endsWith("scripts/qualify-public-registry.mjs")
  ) {
    // This test observes the wrapper's native handoff; it does not qualify a consumer.
    state.qualifierHandoff = {
      args,
      timeout: options.timeout,
      candidate: options.env.CANDIDATE_RUN,
    };
    save(state);
    return ok();
  }
  if (args[0] === state.npmCli) {
    const command = args.slice(1);
    if (command[0] === "view") {
      const subject = state.archives.find(
        (item) =>
          item.package === command[1] ||
          `${item.package}@${state.version}` === command[1],
      );
      if (!subject) throw Error("Unexpected fixture npm subject");
      return ok(
        command[2] === "dist.integrity"
          ? JSON.stringify(subject.integrity)
          : state.tags[subject.package],
      );
    }
    if (command[0] === "stage" && command[1] === "publish") {
      const archive = state.archives.find(
        (item) => item.filename === basename(command[2]),
      );
      if (!archive) throw Error("Unexpected fixture stage archive");
      state.requests.push({
        operation: "stage",
        package: archive.package,
        received: true,
        applied: true,
        acknowledged: !state.dropStageAck,
      });
      save(state);
      if (state.dropStageAck)
        return {
          status: 1,
          signal: null,
          stdout: "",
          stderr: "Fixture lost acknowledgment after applying request",
        };
      return ok({
        [archive.package]: {
          name: archive.package,
          version: state.version,
          integrity: archive.integrity,
          stageId: `10000000-0000-4000-8000-${String(state.requests.length).padStart(12, "0")}`,
        },
      });
    }
    throw Error("Unexpected fixture npm command: " + JSON.stringify(command));
  }
  if (name !== "gh")
    throw Error(
      "Unexpected fixture process: " + JSON.stringify([executable, args]),
    );
  if (args[0] === "run" && args[1] === "download") {
    const output = args[args.indexOf("--dir") + 1];
    for (const [file, source] of Object.entries(state.downloads ?? {}))
      copyFileSync(source, join(output, file));
    return ok();
  }
  if (args[0] === "api") {
    const route = args[1].replace(
      "repos/Hadden-Industries/markdown-quality/",
      "",
    );
    if (route === "graphql")
      return ok({
        data: {
          repository: {
            release: state.release
              ? {
                  databaseId: state.release.id,
                  tagName: state.release.tag_name,
                }
              : null,
          },
        },
      });
    if (route === "releases/latest")
      return ok({
        id:
          state.release?.prerelease === false
            ? state.release.id
            : state.priorLatest,
      });
    if (route === "releases/20") return ok(state.release);
    if (route.startsWith("attestations/sha1%3A"))
      return ok({ attestations: [{ bundle: {} }] });
    if (Object.hasOwn(state.routes, route)) return ok(state.routes[route]);
    throw Error("Unexpected fixture GitHub route: " + route);
  }
  if (args[0] === "release") {
    const operation = args[1];
    if (["create", "upload", "edit"].includes(operation)) {
      state.requests.push({
        operation,
        received: true,
        applied: true,
        acknowledged: true,
      });
      if (operation === "create")
        state.release = {
          id: 20,
          tag_name: `v${state.version}`,
          draft: true,
          prerelease: true,
          immutable: false,
          assets: [],
        };
      if (operation === "upload") {
        const asset = state.assets.find(
          (item) => item.name === basename(args[3]),
        );
        if (!asset) throw Error("Unexpected fixture archive upload");
        state.release.assets.push({
          name: asset.name,
          state: "uploaded",
          size: asset.size,
          digest: `sha256:${asset.sha256}`,
        });
      }
      if (operation === "edit") {
        state.release.draft = false;
        state.release.immutable = true;
        if (args.includes("--prerelease=false"))
          state.release.prerelease = false;
      }
      save(state);
      return ok();
    }
    if (operation === "download") {
      const output = args[args.indexOf("--dir") + 1];
      for (const asset of state.assets)
        copyFileSync(join(state.bundle, asset.name), join(output, asset.name));
      return ok();
    }
    // This boundary models GitHub's external native verifier, not its cryptographic implementation.
    if (["verify", "verify-asset"].includes(operation)) {
      if (state.failCrypto)
        return {
          status: 1,
          stdout: "",
          stderr: "Fixture native cryptographic refusal",
        };
      return ok("{}");
    }
  }
  throw Error("Unexpected fixture gh command: " + JSON.stringify(args));
}

export async function fixtureFetch(url, options) {
  const state = read();
  if (options?.method && options.method !== "GET")
    throw Error("Unexpected fixture HTTP write");
  const githubPrefix =
    "https://api.github.com/repos/Hadden-Industries/markdown-quality/";
  if (String(url).startsWith(githubPrefix)) {
    const route = String(url).slice(githubPrefix.length);
    if (route === "releases/20") return Response.json(state.release);
    if (route === "releases/latest")
      return Response.json({
        id: state.release?.prerelease === false ? 20 : state.priorLatest,
      });
    if (Object.hasOwn(state.routes, route))
      return Response.json(state.routes[route]);
    throw Error("Unexpected fixture GitHub HTTP route: " + route);
  }
  if (new URL(url).origin !== "https://registry.npmjs.org")
    throw Error("Unexpected fixture egress: " + url);
  for (const archive of state.archives) {
    const tarball = `https://registry.npmjs.org/${archive.package}/-/${archive.package.split("/")[1]}-${state.version}.tgz`;
    if (url === tarball)
      return new Response(
        readFileSync(join(state.archiveDirectory, archive.filename)),
      );
    if (
      url ===
      `https://registry.npmjs.org/${encodeURIComponent(archive.package)}/${state.version}`
    )
      return Response.json({
        name: archive.package,
        version: state.version,
        dist: { integrity: archive.integrity, tarball },
      });
  }
  throw Error("Unexpected fixture registry route: " + url);
}
