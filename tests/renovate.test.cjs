const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const { test } = require("node:test");

const config = JSON.parse(readFileSync(join(__dirname, "../renovate.json"), "utf8"));
const toolRule = config.packageRules.find((rule) => rule.automerge === true);

/** Characterize which updates may automerge and which still require review. */
test("tool and font automerge stays scoped away from review-required updates", () => {
  // Arrange
  const reviewRules = config.packageRules.filter((rule) => rule.automerge === false);

  // Act
  const reviewFiles = reviewRules.flatMap((rule) => rule.matchFileNames);

  // Assert
  assert.deepEqual(toolRule.matchManagers, ["mise", "custom.regex"]);
  assert.deepEqual(toolRule.matchFileNames, [
    "dot_config/mise/config.toml",
    "run_onchange_after_install-fonts.sh",
  ]);
  assert.equal(toolRule.automergeType, "pr");
  assert.equal(toolRule.platformAutomerge, false);
  assert.deepEqual(reviewFiles, [
    "run_onchange_after_install-tools.sh.tmpl",
    "dot_config/opencode/private_opencode.jsonc",
  ]);
  for (const rule of reviewRules) {
    assert.deepEqual(rule.matchManagers, ["custom.regex"]);
    assert.equal(rule.platformAutomerge, false);
  }
});

/** Keep breaking upgrades separate while bundling routine tool and font updates. */
test("tool and font updates share a group without absorbing review-required updates", () => {
  // Arrange
  const expectedGroup = "mise tools and fonts";

  // Act
  const groupedRules = config.packageRules.filter((rule) => rule.groupName);

  // Assert
  assert.equal(toolRule.groupName, expectedGroup);
  assert.equal(toolRule.separateMajorMinor, true);
  assert.deepEqual(groupedRules, [toolRule]);
});
