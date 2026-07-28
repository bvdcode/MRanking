const createRule = (message, create) => ({
  meta: {
    type: "problem",
    docs: { description: message },
    messages: { violation: message },
    schema: [],
  },
  create,
});

function rootVisitors(check) {
  return {
    Program: check,
    StyleSheet: check,
  };
}

const noUnknown = createRule(
  "Use a precise type instead of unknown.",
  (context) => ({
    TSUnknownKeyword(node) {
      context.report({ node, messageId: "violation" });
    },
  }),
);

const noNestedAssertions = createRule(
  "Replace nested type assertions with a type-safe conversion.",
  (context) => ({
    TSAsExpression(node) {
      if (
        node.expression.type === "TSAsExpression" ||
        node.expression.type === "TSTypeAssertion"
      ) {
        context.report({ node, messageId: "violation" });
      }
    },
    TSTypeAssertion(node) {
      if (
        node.expression.type === "TSAsExpression" ||
        node.expression.type === "TSTypeAssertion"
      ) {
        context.report({ node, messageId: "violation" });
      }
    },
  }),
);

const noInlineStyles = createRule(
  "Use the established stylesheet instead of inline styles.",
  (context) => ({
    JSXAttribute(node) {
      if (node.name.name === "style") {
        context.report({ node, messageId: "violation" });
      }
    },
  }),
);

const noViewportSizing = createRule(
  "Use container-relative sizing instead of full viewport units.",
  (context) =>
    rootVisitors((node) => {
      const source = context.sourceCode.getText();
      const match = source.match(/\b100(?:d|l|s)?v(?:h|w)\b/i);
      if (match) {
        context.report({
          node,
          messageId: "violation",
          loc: context.sourceCode.getLocFromIndex(match.index ?? 0),
        });
      }
    }),
);

const maxSourceLines = createRule(
  "Split files that exceed 400 non-blank, non-comment lines.",
  (context) =>
    rootVisitors((node) => {
      const lines = context.sourceCode.lines;
      let inBlockComment = false;
      let count = 0;
      for (const line of lines) {
        let value = line.trim();
        if (inBlockComment) {
          const end = value.indexOf("*/");
          if (end < 0) {
            continue;
          }
          value = value.slice(end + 2).trim();
          inBlockComment = false;
        }
        while (value.startsWith("/*")) {
          const end = value.indexOf("*/", 2);
          if (end < 0) {
            inBlockComment = true;
            value = "";
            break;
          }
          value = value.slice(end + 2).trim();
        }
        if (value && !value.startsWith("//") && !value.startsWith("*")) {
          count += 1;
        }
      }
      if (count > 400) {
        context.report({ node, messageId: "violation" });
      }
    }),
);

const projectRules = {
  rules: {
    "max-source-lines": maxSourceLines,
    "no-inline-styles": noInlineStyles,
    "no-nested-assertions": noNestedAssertions,
    "no-unknown": noUnknown,
    "no-viewport-sizing": noViewportSizing,
  },
};

export default projectRules;
