#!/usr/bin/env node
// Usage: node tools/checks/provenance.mjs <lesson-id>
// Parse source without executing chapters. Compare decoded literals to the raw Pack;
// whitespace, punctuation and case are intentionally never normalized.
import { readFileSync, readdirSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const root = fileURLToPath(new URL('../../', import.meta.url));
const contentNames = new Set([
  'text', 'goal', 'ask', 'claim', 'reason', 'hint', 'hints', 'frame', 'frames',
  'wordbank', 'cue', 'saw', 'means', 'name', 'why', 'use', 'page', 'keyideas',
  'brief', 'title', 'feedback', 'say', 'label', 'labels', 'prompt', 'question',
  'term', 'formula', 'reveal', 'see', 'called', 'message', 'caption', 'description',
  'describe', 'rebuttal', 'failuremessage', 'successmessage', 'placeholder',
]);
const metadataNames = new Set([
  'id', 'who', 'kind', 'type', 'view', 'slot', 'answer', 'fn', 'class',
  'classname', 'color', 'style', 'src', 'href',
]);
const normalizeName = (name) => name.replace(/[_-]/g, '').toLowerCase();
const isContentName = (name) => {
  const key = normalizeName(name);
  return contentNames.has(key) || key.startsWith('say') || key.includes('feedback');
};
const nameOf = (node) => {
  if (!node) return '';
  if (ts.isIdentifier(node) || ts.isStringLiteralLike(node)) return node.text;
  if (ts.isComputedPropertyName(node)) return nameOf(node.expression);
  if (ts.isPropertyAccessExpression(node)) return node.name.text;
  if (ts.isElementAccessExpression(node)) return nameOf(node.argumentExpression);
  return '';
};

function sourceFiles(directory) {
  return readdirSync(directory, { withFileTypes: true })
    .sort((a, b) => a.name.localeCompare(b.name))
    .flatMap((entry) => {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) return sourceFiles(path);
      return entry.isFile() && /\.(?:[cm]?[jt]s|[jt]sx)$/.test(entry.name) ? [path] : [];
    });
}

function check(lesson) {
  if (!lesson || process.argv.length !== 3 || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(lesson)) {
    throw new Error('Usage: node tools/checks/provenance.mjs <lesson-id>');
  }
  const packsDir = join(root, 'pipeline/packs');
  const packs = readdirSync(packsDir)
    .map((name) => ({ name, match: name.match(new RegExp(`^${lesson}-v([0-9]+)\\.md$`)) }))
    .filter(({ match }) => match)
    .sort((a, b) => {
      const av = BigInt(a.match[1]), bv = BigInt(b.match[1]);
      return av < bv ? 1 : av > bv ? -1 : a.name.localeCompare(b.name);
    });
  if (!packs.length) throw new Error(`No Lesson Pack found for ${lesson}.`);
  const pack = readFileSync(join(packsDir, packs[0].name), 'utf8');
  const files = sourceFiles(join(root, 'site/src/game/content/chapters', lesson));
  if (!files.length) throw new Error(`No chapter source files found for ${lesson}.`);

  // The checker resolves constants, shorthand properties and local imports used
  // by content fields. Restrict traversal to this chapter, never shared modules.
  const program = ts.createProgram(files, {
    allowJs: true, checkJs: true, noLib: true, noResolve: true, noEmit: true,
    target: ts.ScriptTarget.Latest, module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
  });
  const checker = program.getTypeChecker();
  const chapterFiles = new Set(files);
  const visited = new Set();
  const literals = new Map();

  function collect(node) {
    if (!node || visited.has(node) || !chapterFiles.has(node.getSourceFile().fileName)) return;
    visited.add(node);
    if (ts.isTypeNode(node)) return;
    if (ts.isStringLiteralLike(node) || ts.isTemplateHead(node)
        || ts.isTemplateMiddle(node) || ts.isTemplateTail(node)) {
      if (node.text) literals.set(node, node.text);
      return;
    }
    if (ts.isPropertyAssignment(node) || ts.isPropertyDeclaration(node)) {
      if (!metadataNames.has(normalizeName(nameOf(node.name)))) collect(node.initializer);
      return;
    }
    if (ts.isVariableDeclaration(node) || ts.isParameter(node)) {
      collect(node.initializer);
      return;
    }
    if (ts.isShorthandPropertyAssignment(node)) {
      if (!metadataNames.has(normalizeName(nameOf(node.name)))) {
        const symbol = checker.getShorthandAssignmentValueSymbol(node);
        follow(symbol);
      }
      return;
    }
    if (ts.isIdentifier(node) || ts.isPropertyAccessExpression(node)
        || ts.isElementAccessExpression(node)) {
      let symbol = checker.getSymbolAtLocation(ts.isPropertyAccessExpression(node) ? node.name : node);
      if (symbol && (symbol.flags & ts.SymbolFlags.Alias)) symbol = checker.getAliasedSymbol(symbol);
      follow(symbol);
      return;
    }
    if (ts.isFunctionLike(node)) {
      collect(node.body);
      return;
    }
    ts.forEachChild(node, collect);
  }

  function follow(symbol) {
    for (const declaration of symbol?.declarations ?? []) {
      // A value displayed through an alias is content even if its original
      // property was named `id`, `who`, etc.
      if (ts.isPropertyAssignment(declaration) || ts.isPropertyDeclaration(declaration)) {
        collect(declaration.initializer);
      } else collect(declaration);
    }
  }

  function visit(node) {
    if (ts.isTypeNode(node) || ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) return;
    if ((ts.isPropertyAssignment(node) || ts.isPropertyDeclaration(node)
        || ts.isVariableDeclaration(node)) && isContentName(nameOf(node.name))) {
      collect(node.initializer);
    } else if (ts.isShorthandPropertyAssignment(node) && isContentName(nameOf(node.name))) {
      collect(node);
    } else if (ts.isFunctionLike(node) && isContentName(nameOf(node.name))) {
      collect(node.body);
    } else if (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.EqualsToken
        && isContentName(nameOf(node.left))) {
      collect(node.right);
    } else if (ts.isCallExpression(node)) {
      const name = nameOf(node.expression);
      // These display APIs take identifiers/speaker IDs before the visible text.
      if (name === 'bark' || name === 'row') collect(node.arguments[1]);
      else if (name === 'readout') collect(node.arguments[0]);
      else if (name === 'h') node.arguments.slice(2).forEach(collect);
      else if (isContentName(name)) node.arguments.forEach(collect);
    } else if (ts.isNewExpression(node) && nameOf(node.expression) === 'Label') {
      collect(node.arguments?.[0]);
    }
    ts.forEachChild(node, visit);
  }

  for (const file of files) {
    const source = program.getSourceFile(file);
    const diagnostics = program.getSyntacticDiagnostics(source);
    if (diagnostics.length) {
      throw new Error(ts.formatDiagnostics(diagnostics, {
        getCanonicalFileName: (name) => name,
        getCurrentDirectory: () => root,
        getNewLine: () => '\n',
      }).trim());
    }
    visit(source);
  }
  const missing = [...literals].filter(([, value]) => !pack.includes(value));
  missing.sort(([a], [b]) => a.getSourceFile().fileName.localeCompare(b.getSourceFile().fileName) || a.pos - b.pos);
  for (const [node, value] of missing) {
    const source = node.getSourceFile();
    const { line, character } = source.getLineAndCharacterOfPosition(node.getStart());
    console.error(`${relative(root, source.fileName)}:${line + 1}:${character + 1}: absent from ${relative(root, join(packsDir, packs[0].name))}: ${JSON.stringify(value)}`);
  }
  if (missing.length) process.exitCode = 1;
}

try {
  check(process.argv[2]);
} catch (error) {
  console.error(`provenance: ${error.message}`);
  process.exitCode = 1;
}
