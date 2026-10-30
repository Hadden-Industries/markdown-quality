// SPDX-License-Identifier: AGPL-3.0-only
import { npmCommand } from "./commands.js";
// Include the complete development graph. Recipient/release zero-finding policy
// remains independently enforced by qualify-release-security.js.
npmCommand(["audit", "--audit-level=moderate"], { stdio: "inherit" });
