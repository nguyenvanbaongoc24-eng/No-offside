import test from 'node:test';
import assert from 'node:assert/strict';
import { copyToClipboard } from '../src/lib/clipboard.js';

test('copyToClipboard: uses navigator.clipboard.writeText when supported and permitted', async () => {
  let copied = '';
  Object.defineProperty(globalThis, 'navigator', {
    configurable: true,
    value: {
      clipboard: {
        writeText: async (t) => {
          copied = t;
        },
      },
    },
  });
  globalThis.window = { isSecureContext: true };

  const res = await copyToClipboard('NODF476');
  assert.equal(res.success, true);
  assert.equal(copied, 'NODF476');
});

test('copyToClipboard: falls back to execCommand when writeText is blocked by user agent', async () => {
  Object.defineProperty(globalThis, 'navigator', {
    configurable: true,
    value: {
      clipboard: {
        writeText: async () => {
          throw new Error('The request is not allowed by the user agent');
        },
      },
    },
  });

  let execCalled = false;
  let textSelected = '';
  const textareaMock = {
    value: '',
    style: {},
    setAttribute: () => {},
    focus: () => {},
    select: () => {
      textSelected = textareaMock.value;
    },
    setSelectionRange: () => {},
  };

  globalThis.document = {
    body: {
      appendChild: () => {},
      removeChild: () => {},
    },
    createElement: () => textareaMock,
    execCommand: (cmd) => {
      if (cmd === 'copy') {
        execCalled = true;
        return true;
      }
      return false;
    },
  };

  const res = await copyToClipboard('NODF476');
  assert.equal(res.success, true);
  assert.equal(execCalled, true);
  assert.equal(textSelected, 'NODF476');
});

test('copyToClipboard: provides clear Vietnamese error message if all copy methods fail', async () => {
  Object.defineProperty(globalThis, 'navigator', {
    configurable: true,
    value: {
      clipboard: {
        writeText: async () => {
          throw new Error('NotAllowedError');
        },
      },
    },
  });
  globalThis.document = {
    body: {
      appendChild: () => {},
      removeChild: () => {},
    },
    createElement: () => ({
      style: {},
      setAttribute: () => {},
      focus: () => {},
      select: () => {},
      setSelectionRange: () => {},
    }),
    execCommand: () => false,
  };

  const res = await copyToClipboard('NODF476');
  assert.equal(res.success, false);
  assert.match(res.message, /Không sao chép được/);
  assert.doesNotMatch(res.message, /NotAllowedError/);
});
