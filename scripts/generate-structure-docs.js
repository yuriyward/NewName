#!/usr/bin/env node

import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const OUTPUT_FILE = './ai/docs/FILE-STRUCTURE.md';
const AI_DOC_FILE = './AI.md';
const TEMP_JSON = './temp-structure.json';
const TREE_START_MARKER = '<!-- AUTO-GENERATED TREE START -->';
const TREE_END_MARKER = '<!-- AUTO-GENERATED TREE END -->';

/**
 * Generate TypeDoc JSON and process it to create structure documentation
 */
async function generateStructureDocs() {
  console.log('🔄 Generating TypeDoc JSON...');

  // Generate TypeDoc JSON
  try {
    execSync('npx typedoc --options typedoc-structure.json', { stdio: 'pipe' });
  } catch (_error) {
    console.warn('TypeDoc generation had warnings, continuing...');
  }

  if (!fs.existsSync(TEMP_JSON)) {
    console.error('❌ TypeDoc JSON not generated');
    process.exit(1);
  }

  console.log('📖 Processing documentation...');

  // Read and parse the TypeDoc JSON
  const jsonData = JSON.parse(fs.readFileSync(TEMP_JSON, 'utf8'));

  // Process the data
  const fileStructure = buildFileStructure(jsonData);
  const fileDetails = buildFileDetails(jsonData);

  // Generate markdown
  const { markdown, tree } = generateMarkdown(fileStructure, fileDetails);

  // Ensure output directory exists
  const outputDir = path.dirname(OUTPUT_FILE);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Write the output
  fs.writeFileSync(OUTPUT_FILE, markdown);

  // Update AI.md with the latest tree overview if available
  if (tree) {
    updateAIDocTree(tree);
  }

  // Clean up temp file
  fs.unlinkSync(TEMP_JSON);

  console.log(`✅ Documentation generated: ${OUTPUT_FILE}`);
}

/**
 * Build file structure tree from TypeDoc data
 */
function buildFileStructure(data) {
  const structure = new Map();

  if (data.children) {
    data.children.forEach((module) => {
      if (module.sources?.[0]) {
        const filePath = module.sources[0].fileName;
        const cleanPath = filePath.replace(/^entrypoints\//, '');

        // Get brief description from module comment or exports
        const description = getFileDescription(module);

        structure.set(cleanPath, {
          description,
          exportCount: module.children ? module.children.length : 0,
        });
      }
    });
  }

  return structure;
}

/**
 * Build detailed file information from TypeDoc data
 */
function buildFileDetails(data) {
  const details = new Map();

  if (data.children) {
    data.children.forEach((module) => {
      if (module.sources?.[0]) {
        const filePath = module.sources[0].fileName;
        const cleanPath = filePath.replace(/^entrypoints\//, '');

        const fileDetail = {
          path: cleanPath,
          purpose: getFileDescription(module),
          exports: [],
        };

        if (module.children) {
          module.children.forEach((child) => {
            const exportInfo = {
              name: child.name,
              kind: child.kindString || 'export',
              signature: getSignature(child),
              description: getDescription(child),
              methods: [],
            };

            // Get methods/properties for classes and interfaces
            if (child.children) {
              child.children.forEach((member) => {
                if (
                  member.kindString === 'Method' ||
                  member.kindString === 'Property'
                ) {
                  exportInfo.methods.push({
                    name: member.name,
                    kind: member.kindString,
                    signature: getSignature(member),
                    description: getDescription(member),
                  });
                }
              });
            }

            fileDetail.exports.push(exportInfo);
          });
        }

        details.set(cleanPath, fileDetail);
      }
    });
  }

  return details;
}

/**
 * Get file description from module
 */
function getFileDescription(module) {
  if (module.comment?.summary) {
    return module.comment.summary
      .map((s) => s.text)
      .join('')
      .trim();
  }

  // Try to read file-level comment directly from source file
  if (module.sources?.[0]) {
    const filePath = module.sources[0].fileName;
    try {
      const sourcePath = path.isAbsolute(filePath)
        ? filePath
        : path.resolve(filePath);
      const fileContent = fs.readFileSync(sourcePath, 'utf8');
      const fileCommentMatch = fileContent.match(/^\/\*\*([\s\S]*?)\*\//);
      if (fileCommentMatch) {
        const lines = fileCommentMatch[1]
          .split('\n')
          .map((line) => line.replace(/^\s*\*\s?/, '').trim())
          .filter(Boolean);
        if (lines.length > 0) {
          return lines.join(' ').trim();
        }
      }
    } catch (_error) {
      // Ignore file read errors
    }
  }

  // Generate description based on exports
  if (module.children && module.children.length > 0) {
    const classes = module.children
      .filter((c) => c.kindString === 'Class')
      .map((c) => c.name);
    const interfaces = module.children
      .filter((c) => c.kindString === 'Interface')
      .map((c) => c.name);
    const functions = module.children
      .filter((c) => c.kindString === 'Function')
      .map((c) => c.name);
    const enums = module.children
      .filter((c) => c.kindString === 'Enumeration')
      .map((c) => c.name);

    const parts = [];
    if (classes.length > 0)
      parts.push(
        `${classes.slice(0, 2).join(', ')} class${classes.length > 1 ? 'es' : ''}`,
      );
    if (interfaces.length > 0)
      parts.push(
        `${interfaces.slice(0, 2).join(', ')} interface${interfaces.length > 1 ? 's' : ''}`,
      );
    if (functions.length > 0)
      parts.push(
        `${functions.slice(0, 2).join(', ')} function${functions.length > 1 ? 's' : ''}`,
      );
    if (enums.length > 0)
      parts.push(
        `${enums.slice(0, 2).join(', ')} enum${enums.length > 1 ? 's' : ''}`,
      );

    if (parts.length > 0) {
      return parts.join(', ');
    }

    // Fallback to count-based description
    const totalExports = module.children.length;
    return `${totalExports} export${totalExports > 1 ? 's' : ''}`;
  }

  return 'Module exports';
}

/**
 * Get description from TypeDoc node
 */
function getDescription(node) {
  // Try TypeDoc comment first - check both node and first signature
  let comment = node.comment;
  if (!comment && node.signatures?.[0]) {
    comment = node.signatures[0].comment;
  }

  if (comment?.summary) {
    const text = comment.summary
      .map((s) => s.text)
      .join('')
      .trim();
    if (text) {
      // Return first sentence or first 60 characters
      const firstSentence = text.split('.')[0];
      return firstSentence.length > 60
        ? `${text.substring(0, 57)}...`
        : firstSentence;
    }
  }

  // Try to read JSDoc comment directly from source if available
  if (node.sources?.[0]) {
    try {
      const filePath = node.sources[0].fileName;
      const lineNumber = node.sources[0].line;
      const sourcePath = path.isAbsolute(filePath)
        ? filePath
        : path.resolve(filePath);
      const fileContent = fs.readFileSync(sourcePath, 'utf8');
      const lines = fileContent.split('\n');

      // Look for JSDoc comment before the function/export
      for (
        let i = Math.max(0, lineNumber - 10);
        i < Math.min(lines.length, lineNumber);
        i++
      ) {
        const line = lines[i].trim();
        if (line.startsWith('/**')) {
          // Found start of JSDoc comment, extract the description
          let j = i + 1;
          while (j < lines.length && !lines[j].includes('*/')) {
            const commentLine = lines[j].trim();
            if (commentLine.startsWith('*') && !commentLine.startsWith('* @')) {
              const desc = commentLine.replace(/^\*\s*/, '').trim();
              if (desc && !desc.startsWith('@')) {
                return desc.length > 60 ? `${desc.substring(0, 57)}...` : desc;
              }
            }
            j++;
          }
          break;
        }
      }
    } catch (_error) {
      // Ignore file read errors
    }
  }

  // Improved fallback descriptions based on function names and kinds
  if (node.kindString === 'Function' && node.name) {
    const name = node.name;
    // Generate more meaningful descriptions based on common patterns
    if (name.startsWith('build'))
      return `Builds ${name
        .replace('build', '')
        .replace(/([A-Z])/g, ' $1')
        .toLowerCase()
        .trim()} command`;
    if (name.startsWith('find'))
      return `Finds ${name
        .replace('find', '')
        .replace(/([A-Z])/g, ' $1')
        .toLowerCase()
        .trim()}`;
    if (name.startsWith('wait'))
      return `Waits for ${name
        .replace('wait', '')
        .replace(/([A-Z])/g, ' $1')
        .toLowerCase()
        .trim()}`;
    if (name.startsWith('enable'))
      return `Enables ${name
        .replace('enable', '')
        .replace(/([A-Z])/g, ' $1')
        .toLowerCase()
        .trim()}`;
    if (name.startsWith('disable'))
      return `Disables ${name
        .replace('disable', '')
        .replace(/([A-Z])/g, ' $1')
        .toLowerCase()
        .trim()}`;
    if (name.startsWith('get'))
      return `Gets ${name
        .replace('get', '')
        .replace(/([A-Z])/g, ' $1')
        .toLowerCase()
        .trim()}`;
    if (name.startsWith('set'))
      return `Sets ${name
        .replace('set', '')
        .replace(/([A-Z])/g, ' $1')
        .toLowerCase()
        .trim()}`;
    if (name.startsWith('create'))
      return `Creates ${name
        .replace('create', '')
        .replace(/([A-Z])/g, ' $1')
        .toLowerCase()
        .trim()}`;
    if (name.startsWith('parse'))
      return `Parses ${name
        .replace('parse', '')
        .replace(/([A-Z])/g, ' $1')
        .toLowerCase()
        .trim()}`;
    if (name.startsWith('validate'))
      return `Validates ${name
        .replace('validate', '')
        .replace(/([A-Z])/g, ' $1')
        .toLowerCase()
        .trim()}`;
    if (name.startsWith('is'))
      return `Checks if ${name
        .replace('is', '')
        .replace(/([A-Z])/g, ' $1')
        .toLowerCase()
        .trim()}`;
    return `${name
      .replace(/([A-Z])/g, ' $1')
      .toLowerCase()
      .trim()} function`;
  }

  // Generate basic description based on kind and name
  const kind = node.kindString?.toLowerCase() || 'item';
  return `${kind} implementation`;
}

/**
 * Get signature from TypeDoc node
 */
function getSignature(node) {
  if (node.signatures?.[0]) {
    const sig = node.signatures[0];
    const params = sig.parameters
      ? sig.parameters.map((p) => p.name).join(', ')
      : '';
    return `${node.name}(${params})`;
  }

  if (node.type) {
    return `${node.name}: ${getTypeString(node.type)}`;
  }

  return node.name;
}

/**
 * Get type string from TypeDoc type
 */
function getTypeString(type) {
  if (!type) return 'unknown';

  if (type.type === 'intrinsic') return type.name;
  if (type.type === 'reference') return type.name;
  if (type.type === 'array') return `${getTypeString(type.elementType)}[]`;
  if (type.type === 'union') {
    return type.types.map((t) => getTypeString(t)).join(' | ');
  }

  return type.type || 'unknown';
}

/**
 * Generate the final markdown document
 */
function generateMarkdown(fileStructure, fileDetails) {
  let markdown = `# Project File Structure

*Generated automatically from TypeScript source code*

## Tree Overview

`;

  // Build tree structure
  const sortedFiles = Array.from(fileStructure.entries()).sort();
  const tree = buildTreeFromPaths(sortedFiles);
  const renderedTree = renderTree(tree, '');
  markdown += renderedTree;

  markdown += `\n## File Details\n\n`;

  // Add file details
  const sortedDetails = Array.from(fileDetails.entries()).sort();
  for (const [filePath, detail] of sortedDetails) {
    markdown += `### ${filePath}\n`;
    markdown += `**Purpose**: ${detail.purpose}\n\n`;

    if (detail.exports.length > 0) {
      markdown += `**Exports**:\n`;

      for (const exp of detail.exports) {
        markdown += `- \`${exp.kind.toLowerCase()} ${exp.name}\` - ${exp.description}\n`;

        // Add methods for classes/interfaces
        if (exp.methods.length > 0) {
          const publicMethods = exp.methods.filter(
            (m) => !m.name.startsWith('_'),
          );
          if (publicMethods.length > 0) {
            for (const method of publicMethods.slice(0, 8)) {
              // Limit to 8 methods
              markdown += `  - \`${method.signature}\` - ${method.description}\n`;
            }
            if (publicMethods.length > 8) {
              markdown += `  - *...and ${publicMethods.length - 8} more methods*\n`;
            }
          }
        }
      }
    } else {
      markdown += `*No exports found*\n`;
    }

    markdown += `\n`;
  }

  return { markdown, tree: renderedTree };
}

/**
 * Build tree structure from file paths
 */
function buildTreeFromPaths(files) {
  const tree = {};

  for (const [filePath, info] of files) {
    const parts = filePath.split('/');
    let current = tree;

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const isFile = i === parts.length - 1;

      if (!current[part]) {
        current[part] = isFile
          ? {
              __file: true,
              description: info.description,
              exportCount: info.exportCount,
            }
          : { __dir: true };
      }

      if (!isFile) {
        current = current[part];
      }
    }
  }

  return tree;
}

/**
 * Render tree structure as text
 */
function renderTree(tree, prefix = '', parentPrefix = '', depth = 0) {
  let output = '';
  const entries = Object.entries(tree).sort(([a], [b]) => {
    // Directories first, then files
    const aIsFile = tree[a].__file;
    const bIsFile = tree[b].__file;
    if (aIsFile !== bIsFile) return aIsFile ? 1 : -1;
    return a.localeCompare(b);
  });

  entries.forEach(([name, node], index) => {
    const isLast = index === entries.length - 1;

    // For top level (depth 0), no connector prefix
    const connector = depth === 0 ? '' : isLast ? '└─ ' : '├─ ';
    const nextPrefix =
      depth === 0 ? '  ' : parentPrefix + (isLast ? '  ' : '│ ');

    if (node.__file) {
      // File
      const comment = node.description ? ` # ${node.description}` : '';
      output += `${prefix}${connector}${name}${comment}\n`;
    } else if (node.__dir) {
      // Directory - count files and subdirectories separately
      const children = Object.keys(node).filter((k) => !k.startsWith('__'));
      const fileCount = children.filter(
        (childName) => node[childName].__file,
      ).length;
      const dirCount = children.filter(
        (childName) => node[childName].__dir,
      ).length;

      let comment = '';
      if (fileCount > 0 && dirCount > 0) {
        comment = ` # ${fileCount} files, ${dirCount} directories`;
      } else if (fileCount > 0) {
        comment = ` # ${fileCount} file${fileCount === 1 ? '' : 's'}`;
      } else if (dirCount > 0) {
        comment = ` # ${dirCount} director${dirCount === 1 ? 'y' : 'ies'}`;
      }

      output += `${prefix}${connector}${name}/${comment}\n`;

      // Recurse for subdirectories
      const subtree = { ...node };
      delete subtree.__dir;
      output += renderTree(subtree, nextPrefix, nextPrefix, depth + 1);
    }
  });

  return output;
}

/**
 * Update AI.md with the latest tree overview
 */
function updateAIDocTree(tree) {
  if (!fs.existsSync(AI_DOC_FILE)) {
    console.warn('⚠️ AI.md not found, skipping tree update');
    return;
  }

  const content = fs.readFileSync(AI_DOC_FILE, 'utf8');
  const trimmedTree = tree.trimEnd();
  const treeBlock = `${TREE_START_MARKER}\n\n\`\`\`\n${trimmedTree}\n\`\`\`\n\n${TREE_END_MARKER}`;

  if (
    content.includes(TREE_START_MARKER) &&
    content.includes(TREE_END_MARKER)
  ) {
    const startIndex = content.indexOf(TREE_START_MARKER);
    const endIndex = content.indexOf(TREE_END_MARKER) + TREE_END_MARKER.length;
    const before = content.slice(0, startIndex);
    const after = content.slice(endIndex);
    const updated = `${before}${treeBlock}${after}`;
    fs.writeFileSync(AI_DOC_FILE, updated);
    console.log('✅ Updated AI.md tree section');
    return;
  }

  const appended = `${content.trimEnd()}\n\n## Project File Tree\n\n${treeBlock}\n`;
  fs.writeFileSync(AI_DOC_FILE, appended);
  console.log('ℹ️ Added tree section to AI.md');
}

// Run the script
if (import.meta.url === `file://${process.argv[1]}`) {
  generateStructureDocs().catch(console.error);
}

export { generateStructureDocs };
