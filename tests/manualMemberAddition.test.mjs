import test from "node:test";
import assert from "node:assert/strict";
import React from "react";
import renderer, { act } from "react-test-renderer";
import { build } from "esbuild";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const bundle = await build({
  absWorkingDir: root,
  stdin: {
    resolveDir: root,
    loader: "jsx",
    contents: `
      export { default as AddMemberModal } from './src/components/AddMemberModal.jsx';
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
const { AddMemberModal } = compiled.exports;

test("AddMemberModal: fields, validation, duplicate jersey check and submission", async () => {
  const existingMembers = [
    { id: "m1", name: "Nguyễn Văn Toàn", number: 9, role: "Tiền Đạo (ST)" },
    { id: "m2", name: "Đặng Văn Lâm", number: 1, role: "Thủ Môn (GK)" },
  ];

  let addedPayload = null;
  const handleAdd = async (payload) => {
    addedPayload = payload;
  };

  let tree;
  act(() => {
    tree = renderer.create(
      React.createElement(AddMemberModal, {
        isOpen: true,
        onClose: () => {},
        members: existingMembers,
        onAddMember: handleAdd,
      }),
    );
  });

  const rootEl = tree.root;
  const jsonStr = JSON.stringify(tree.toJSON());

  // Check form fields
  assert.ok(jsonStr.includes("Thêm thành viên thủ công"));
  assert.ok(jsonStr.includes("Họ và tên"));
  assert.ok(jsonStr.includes("Số áo thi đấu"));
  assert.ok(jsonStr.includes("Vị trí sở trường"));
  assert.ok(jsonStr.includes("Số điện thoại liên hệ"));

  // Find inputs
  const inputs = rootEl.findAllByType("input");
  const nameInput = inputs.find((i) => i.props.placeholder?.includes("Toàn"));
  const numberInput = inputs.find((i) => i.props.placeholder?.includes("9"));
  const phoneInput = inputs.find((i) => i.props.type === "tel");

  assert.ok(nameInput);
  assert.ok(numberInput);

  // Test duplicate jersey check
  act(() => {
    nameInput.props.onChange({ target: { value: "Trần Văn C" } });
    numberInput.props.onChange({ target: { value: "9" } }); // duplicate with member 9
  });

  // Verify duplicate warning renders
  const updatedJson = JSON.stringify(tree.toJSON());
  assert.ok(updatedJson.includes("đã có thành viên trong đội sử dụng"));

  // Change to unique jersey number
  act(() => {
    numberInput.props.onChange({ target: { value: "11" } });
    phoneInput.props.onChange({ target: { value: "0912345678" } });
  });

  const submitBtn = rootEl.findAllByType("button").find((b) => b.props.type === "submit");
  assert.ok(submitBtn);

  // Submit form
  await act(async () => {
    rootEl.findByType("form").props.onSubmit({ preventDefault: () => {} });
  });

  assert.ok(addedPayload);
  assert.equal(addedPayload.name, "Trần Văn C");
  assert.equal(addedPayload.number, 11);
  assert.equal(addedPayload.phone, "0912345678");
});
