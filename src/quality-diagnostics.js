// SPDX-License-Identifier: AGPL-3.0-only
import { parse } from "./analysis.js";
import { qualityRuleDefaults } from "./preset.js";
import { diagnosticCollector } from "./contracts.js";
import { collectProse, proseValue, isNfc } from "./prose-runs.js";
import {
  htmlFacts,
  htmlPosition,
  meaningfulLabel,
  normalizedLabel,
  placeholderAlternatives,
} from "./html-policy.js";

/** Reviewed exact generic labels, matched case-insensitively after trimming. */
export const genericLinkLabels = Object.freeze(
  new Set([
    "click here",
    "here",
    "read more",
    "more",
    "link",
    "learn more",
    "this link",
    "more info",
    "more information",
    "this page",
  ]),
);
/** Rules owned by this module; link-target rules belong to the local-link checker. */
const ownedRules = [
  "quality/duplicate-sibling-heading",
  "quality/heading-trailing-punctuation",
  "quality/generic-link-text",
  "quality/non-nfc-prose",
  "quality/long-prose-line",
  "quality/placeholder-image-alt",
  "quality/unlabeled-image-link",
  "quality/disallowed-html-construct",
  "quality/missing-html-image-alt",
];

/** Package quality rules with configurable severity; never fixes or accessibility
 * certification. Disabled rules skip their own work; a fully disabled set does not parse.
 */
export function checkQualityRules(text, config, memo) {
  const severity = (rule) => config.lint[rule] ?? qualityRuleDefaults[rule];
  const enabled = (rule) => severity(rule) !== "off";
  const duplicateHeadingsEnabled = enabled("quality/duplicate-sibling-heading"),
    headingPunctuationEnabled = enabled("quality/heading-trailing-punctuation"),
    genericLinksEnabled = enabled("quality/generic-link-text"),
    nfcEnabled = enabled("quality/non-nfc-prose"),
    longLinesEnabled = enabled("quality/long-prose-line"),
    placeholderEnabled = enabled("quality/placeholder-image-alt"),
    unlabeledEnabled = enabled("quality/unlabeled-image-link"),
    // The upstream require-alt-text rule also reports absent HTML alt attributes;
    // the parser-based package rule takes over only when that rule is disabled,
    // so one missing alternative never yields two findings.
    missingHtmlAltEnabled =
      enabled("quality/missing-html-image-alt") &&
      (config.lint["markdown/require-alt-text"] ?? "error") === "off",
    htmlEnabled =
      enabled("quality/disallowed-html-construct") ||
      missingHtmlAltEnabled ||
      unlabeledEnabled;
  if (!ownedRules.some(enabled)) return [];
  const collector = diagnosticCollector(config.analyzerLimits);
  const lines = longLinesEnabled ? text.split(/\r\n|\r|\n/u) : undefined;
  const lineOffsets = longLinesEnabled ? [0] : undefined;
  if (longLinesEnabled)
    for (const match of text.matchAll(/\r\n|\r|\n/gu))
      lineOffsets.push(match.index + match[0].length);
  function report(rule, node, message, position = node.position.start) {
    const selected = severity(rule);
    if (selected === "off") return;
    collector.push({
      source: "quality",
      rule,
      severity: selected === "warn" ? "warning" : selected,
      line: position.line,
      column: position.column,
      message,
    });
  }
  function label(node) {
    return node.value ?? (node.children ?? []).map(label).join("");
  }
  // Static accessible label of a Markdown link: meaningful text plus image alternatives.
  function accessibleLabel(node) {
    if (["image", "imageReference"].includes(node.type)) return node.alt ?? "";
    if (node.type === "html") return "";
    return node.value ?? (node.children ?? []).map(accessibleLabel).join("");
  }
  const images = (node) =>
    ["image", "imageReference"].includes(node.type)
      ? [node]
      : (node.children ?? []).flatMap(images);
  const tree = memo ? memo.parse(text) : parse(text);
  const unlabeledHtml = new Set();
  function reportUnlabeledHtml(node, item) {
    const at = htmlPosition(node, item);
    const key = at.line + ":" + at.column;
    if (unlabeledHtml.has(key)) return;
    unlabeledHtml.add(key);
    report(
      "quality/unlabeled-image-link",
      node,
      "Image-only HTML link has no meaningful static label.",
      at,
    );
  }
  if (nfcEnabled)
    for (const unit of collectProse(tree))
      if (!isNfc(proseValue(unit)))
        report(
          "quality/non-nfc-prose",
          unit.kind === "alt" ? unit.node : unit.parts[0],
          "Prose contains non-NFC Unicode; run normalize to repair eligible prose.",
        );
  function visit(node) {
    if (node.type === "html") {
      if (!htmlEnabled) return;
      const facts = htmlFacts(node.value);
      for (const item of facts.disallowed)
        report(
          "quality/disallowed-html-construct",
          node,
          `Raw HTML uses the disallowed ${item.construct}; this static policy is not a sanitizer.`,
          htmlPosition(node, item),
        );
      if (missingHtmlAltEnabled)
        for (const item of facts.missingAlt)
          report(
            "quality/missing-html-image-alt",
            node,
            'HTML image lacks an alt attribute; use alt="" only for decorative images.',
            htmlPosition(node, item),
          );
      for (const item of facts.unlabeledLinks) reportUnlabeledHtml(node, item);
      return;
    }
    if (["code", "inlineCode", "yaml", "toml", "json"].includes(node.type))
      return;
    if (node.children && unlabeledEnabled) {
      // Supported model extension: adjacent inline HTML nodes separated only by
      // whitespace form one fragment, so <a ...><img ...></a> is assessed whole.
      let run = [];
      const flush = () => {
        if (run.length > 1) {
          const first = run[0];
          const source = text.slice(
            first.position.start.offset,
            run.at(-1).position.end.offset,
          );
          for (const item of htmlFacts(source).unlabeledLinks)
            reportUnlabeledHtml(first, item);
        }
        run = [];
      };
      for (const child of node.children)
        if (child.type === "html") run.push(child);
        else if (!(child.type === "text" && !child.value.trim() && run.length))
          flush();
      flush();
    }
    if (node.children) {
      // Lesser-depth headings own sections; containers have independent scopes.
      const ancestors = duplicateHeadingsEnabled ? [] : undefined,
        scopes = duplicateHeadingsEnabled ? new Map() : undefined;
      for (const child of node.children) {
        if (duplicateHeadingsEnabled && child.type === "heading") {
          while (ancestors.length && ancestors.at(-1).depth >= child.depth)
            ancestors.pop();
          const owner = ancestors.at(-1) ?? node;
          let seen = scopes.get(owner);
          if (!seen) scopes.set(owner, (seen = new Set()));
          const key = `${child.depth}:${label(child).trim().toLocaleLowerCase("en")}`;
          if (seen.has(key))
            report(
              "quality/duplicate-sibling-heading",
              child,
              "Duplicate heading in the same parent section.",
            );
          seen.add(key);
          ancestors.push(child);
        }
        visit(child);
      }
    }
    if (
      headingPunctuationEnabled &&
      node.type === "heading" &&
      /[.!,:;]$/u.test(label(node).trim())
    )
      report(
        "quality/heading-trailing-punctuation",
        node,
        "Consider omitting trailing heading punctuation; questions are allowed.",
      );
    if (
      genericLinksEnabled &&
      ["link", "linkReference"].includes(node.type) &&
      genericLinkLabels.has(normalizedLabel(label(node)))
    )
      report(
        "quality/generic-link-text",
        node,
        "Use descriptive link text instead of a generic label.",
      );
    if (
      placeholderEnabled &&
      ["image", "imageReference"].includes(node.type) &&
      placeholderAlternatives.has(normalizedLabel(node.alt ?? ""))
    )
      report(
        "quality/placeholder-image-alt",
        node,
        "Image alternative text is a placeholder; describe the image or use decorative HTML.",
      );
    if (
      unlabeledEnabled &&
      ["link", "linkReference"].includes(node.type) &&
      images(node).length &&
      !meaningfulLabel(accessibleLabel(node)) &&
      // An empty Markdown alternative is already the missing-alt error's finding.
      images(node).some((image) => normalizedLabel(image.alt ?? "") !== "")
    )
      report(
        "quality/unlabeled-image-link",
        node,
        "Image link has no meaningful static label from its text or image alternatives.",
      );
    if (longLinesEnabled && node.type === "paragraph") {
      const exempt = [];
      function exclusions(child) {
        if (
          [
            "inlineCode",
            "html",
            "link",
            "image",
            "linkReference",
            "imageReference",
          ].includes(child.type)
        ) {
          exempt.push([child.position.start.offset, child.position.end.offset]);
          return;
        }
        for (const descendant of child.children ?? []) exclusions(descendant);
      }
      exclusions(node);
      // Source-order traversal yields disjoint, ordered exempt spans. Advance
      // once through them rather than rescanning all links for every character.
      let exemptIndex = 0;
      for (
        let line = node.position.start.line;
        line <= node.position.end.line;
        line++
      ) {
        let length = 0;
        for (let column = 0; column < lines[line - 1].length;) {
          const offset = lineOffsets[line - 1] + column;
          while (
            exemptIndex < exempt.length &&
            exempt[exemptIndex][1] <= offset
          )
            exemptIndex++;
          if (exemptIndex < exempt.length && exempt[exemptIndex][0] <= offset) {
            column = Math.min(
              lines[line - 1].length,
              exempt[exemptIndex][1] - lineOffsets[line - 1],
            );
            continue;
          }
          const codePoint = lines[line - 1].codePointAt(column);
          length++;
          if (length === 121) {
            report(
              "quality/long-prose-line",
              node,
              "Prose line exceeds the 120-character threshold.",
              { line, column: column + 1 },
            );
            break;
          }
          column += codePoint > 0xffff ? 2 : 1;
        }
      }
    }
  }
  visit(tree);
  return collector.diagnostics;
}
