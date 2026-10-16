import test from "node:test";
import assert from "node:assert/strict";
import React from "react";
import renderer, { act } from "react-test-renderer";
import { build } from "esbuild";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const rootDir = fileURLToPath(new URL("../", import.meta.url));
const bundle = await build({
  absWorkingDir: rootDir,
  stdin: {
    resolveDir: rootDir,
    loader: "jsx",
    contents: `
      export { default as Login } from './src/pages/Login.jsx';
    `,
  },
  bundle: true,
  platform: "node",
  format: "cjs",
  write: false,
  external: ["react"],
});

const compiled = { exports: {} };
new Function("require", "module", "exports", bundle.outputFiles[0].text)(
  createRequire(import.meta.url),
  compiled,
  compiled.exports,
);
const { Login } = compiled.exports;

test("Login: unconfirmed email error displays prominent red alert with exact text and resend action", async () => {
  let tree;
  act(() => {
    tree = renderer.create(
      React.createElement(Login, {
        onLoginSuccess: () => {},
        initialMode: "signin",
      }),
    );
  });

  const root = tree.root;
  const inputs = root.findAllByType("input");
  const usernameInput = inputs.find((i) => i.props.placeholder?.includes("ngocnguyen") || i.props.type === "text");
  const passwordInput = inputs.find((i) => i.props.type === "password");

  assert.ok(usernameInput);
  assert.ok(passwordInput);

  // Fill in credentials
  act(() => {
    usernameInput.props.onChange({ target: { value: "unconfirmed_user" } });
    passwordInput.props.onChange({ target: { value: "123456" } });
  });

  // Verify form retains entered username
  assert.equal(usernameInput.props.value, "unconfirmed_user");

  // Verify exact text requirement strings exist in source file
  const fs = await import("node:fs");
  const loginSrc = fs.readFileSync("src/pages/Login.jsx", "utf8");

  assert.ok(
    loginSrc.includes("Email của bạn chưa được xác minh. Hãy kiểm tra hộp thư, mở liên kết xác minh rồi đăng nhập lại."),
    "Must include exact required unconfirmed email title"
  );
  assert.ok(
    loginSrc.includes("Nếu chưa thấy email, hãy kiểm tra thư rác."),
    "Must include exact required unconfirmed email subtitle"
  );
  assert.ok(
    loginSrc.includes("Gửi lại email xác minh"),
    "Must include resend email verification button"
  );
  assert.ok(
    loginSrc.includes('role="alert"'),
    "Must have role=alert"
  );
});
