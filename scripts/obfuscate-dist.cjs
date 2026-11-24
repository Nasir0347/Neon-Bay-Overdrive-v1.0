'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const DEFAULT_ALLOWED_HOSTS = [
  'localhost',
  '127.0.0.1',
  'crazygames.com',
  'poki.com',
  'poki-gdn.com',
  'neonbayoverdrive.com'
];

function stripCommentsAndCompact(code) {
  const out = [];
  const len = code.length;
  let i = 0;
  let prevSig = ';';

  const regexPrevChars = '=(,[!&|?:;{}~^+-*%<>';
  const regexPrevKeywords = new Set(['return', 'case', 'throw', 'delete', 'void', 'typeof', 'yield', 'await', 'else']);

  const canStartRegex = () => {
    if (regexPrevChars.includes(prevSig)) return true;
    // Check last emitted word if identifier
    let j = out.length - 1;
    let tail = '';
    while (j >= 0 && tail.length < 16) {
      tail = out[j] + tail;
      j -= 1;
    }
    const m = tail.match(/([a-zA-Z_$][a-zA-Z0-9_$]*)\s*$/);
    return !!(m && regexPrevKeywords.has(m[1]));
  };

  while (i < len) {
    const c = code[i];
    const n = code[i + 1];

    // String literals & template literals (preserved verbatim)
    if (c === '\'' || c === '"' || c === '`') {
      const q = c;
      out.push(c);
      i += 1;
      while (i < len) {
        const sc = code[i];
        out.push(sc);
        i += 1;
        if (sc === '\\' && i < len) {
          out.push(code[i]);
          i += 1;
          continue;
        }
        if (sc === q) break;
      }
      prevSig = q;
      continue;
    }

    // Single-line comment
    if (c === '/' && n === '/') {
      i += 2;
      while (i < len && code[i] !== '\n') i += 1;
      continue;
    }

    // Block comment
    if (c === '/' && n === '*') {
      i += 2;
      while (i < len && !(code[i] === '*' && code[i + 1] === '/')) i += 1;
      i += 2;
      out.push(' ');
      continue;
    }

    // Regex literal
    if (c === '/' && canStartRegex()) {
      out.push(c);
      i += 1;
      let inClass = false;
      while (i < len) {
        const rc = code[i];
        out.push(rc);
        i += 1;
        if (rc === '\\' && i < len) {
          out.push(code[i]);
          i += 1;
          continue;
        }
        if (rc === '[' && !inClass) inClass = true;
        else if (rc === ']' && inClass) inClass = false;
        else if (rc === '/' && !inClass) break;
        else if (rc === '\n') break;
      }
      while (i < len && /[gimsuvy]/.test(code[i])) {
        out.push(code[i]);
        i += 1;
      }
      prevSig = '/';
      continue;
    }

    // Whitespace compaction preserving single newline boundaries for ASI safety
    if (c === '\r') {
      i += 1;
      continue;
    }
    if (c === '\n') {
      while (i < len && (code[i] === '\n' || code[i] === '\r' || code[i] === ' ' || code[i] === '\t')) i += 1;
      if (out.length && out[out.length - 1] !== '\n') out.push('\n');
      continue;
    }
    if (c === ' ' || c === '\t') {
      while (i < len && (code[i] === ' ' || code[i] === '\t')) i += 1;
      if (out.length && !' \n\t;'.includes(out[out.length - 1])) out.push(' ');
      continue;
    }

    out.push(c);
    prevSig = c;
    i += 1;
  }

  return out.join('').trim();
}

function encodeHostHex(host) {
  return Buffer.from(host, 'utf8').toString('hex');
}

function buildDomainLockBanner(allowedHosts, strict = false) {
  const encoded = allowedHosts.map(encodeHostHex);
  return `(function(_0x){var _l=typeof location!=='undefined'?location:null;if(!_l)return;var _p=_l.protocol||'';if(!${strict ? 'false' : 'true'}&&(_p==='file:'||_p==='capacitor:'||_p==='ionic:'))return;var _h=(_l.hostname||'').toLowerCase();if(!_h&&(_p==='file:'||_p==='capacitor:'))return;var _ok=_0x.some(function(x){for(var s='',k=0;k<x.length;k+=2)s+=String.fromCharCode(parseInt(x.substr(k,2),16));return _h===s||_h.endsWith('.'+s);});if(!_ok&&_p.indexOf('http')===0){throw new Error('Unauthorized domain: '+_h);}})(${JSON.stringify(encoded)});\n`;
}

function obfuscateDist({
  rootDir = path.resolve(__dirname, '..'),
  wwwDir = path.join(rootDir, 'www'),
  distDir = path.join(rootDir, 'dist'),
  allowedHosts = DEFAULT_ALLOWED_HOSTS,
  strictDomainLock = process.env.NEON_DOMAIN_LOCK === 'strict'
} = {}) {
  if (path.resolve(distDir) !== path.join(path.resolve(rootDir), 'dist')) throw new Error('Unsafe dist path');
  fs.rmSync(distDir, { recursive: true, force: true });
  fs.mkdirSync(distDir, { recursive: true });

  const lockBanner = buildDomainLockBanner(allowedHosts, strictDomainLock);
  let obfuscatedCount = 0;
  let totalBytes = 0;
  const auditedFiles = [];

  function walkAndEmit(relDir = '') {
    const curWww = path.join(wwwDir, relDir);
    const entries = fs.readdirSync(curWww, { withFileTypes: true });
    for (const ent of entries) {
      const relPath = relDir ? `${relDir}/${ent.name}` : ent.name;
      const srcFile = path.join(wwwDir, relPath);
      const dstFile = path.join(distDir, relPath);

      if (ent.isDirectory()) {
        fs.mkdirSync(dstFile, { recursive: true });
        walkAndEmit(relPath);
        continue;
      }

      // Skip unbundled ES module sources (src/ui/hud.css is still kept because index.html links it!)
      if (relPath.startsWith('src/') && relPath.endsWith('.js')) {
        continue;
      }

      fs.mkdirSync(path.dirname(dstFile), { recursive: true });

      if (relPath.endsWith('.js')) {
        let code = fs.readFileSync(srcFile, 'utf8');
        if (!relPath.startsWith('vendor/')) {
          const compact = stripCommentsAndCompact(code);
          const withLock = relPath === 'neon-app-bundle.js' || relPath === 'game.js'
            ? lockBanner + compact
            : compact;
          // Mandatory syntax verification on every obfuscated script
          new vm.Script(withLock, { filename: relPath });
          fs.writeFileSync(dstFile, withLock, 'utf8');
          obfuscatedCount += 1;
        } else {
          new vm.Script(code, { filename: relPath });
          fs.writeFileSync(dstFile, code, 'utf8');
        }
      } else {
        fs.copyFileSync(srcFile, dstFile);
      }

      const sz = fs.statSync(dstFile).size;
      totalBytes += sz;
      auditedFiles.push({ file: relPath, bytes: sz });
    }
  }

  walkAndEmit('');

  const distAudit = {
    budgetMB: 15,
    totalBytes,
    totalMB: Math.round((totalBytes / 1048576) * 1000) / 1000,
    withinBudget: totalBytes < 15 * 1048576,
    obfuscatedCount,
    syntaxVerified: true,
    domainLock: {
      enabled: true,
      strict: strictDomainLock,
      allowedHosts
    },
    fileCount: auditedFiles.length
  };

  fs.writeFileSync(path.join(distDir, 'dist-audit.json'), JSON.stringify(distAudit, null, 2));
  if (!distAudit.withinBudget) {
    throw new Error(`dist/ bundle exceeded 15 MB limit: ${distAudit.totalMB} MB`);
  }
  return distAudit;
}

if (require.main === module) {
  const res = obfuscateDist();
  console.log(`Obfuscated & domain-locked dist/ (${res.fileCount} files, ${res.obfuscatedCount} obfuscated JS, ${res.totalMB} MB < 15 MB, syntaxVerified=${res.syntaxVerified}).`);
}

module.exports = { stripCommentsAndCompact, buildDomainLockBanner, obfuscateDist };
