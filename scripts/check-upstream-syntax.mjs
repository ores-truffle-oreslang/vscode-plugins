import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';

const corpus = JSON.parse(readFileSync(new URL('../conformance/oreslang-syntax-v1.json', import.meta.url)));
if (corpus.schema !== 'oreslang.editor-syntax-conformance/v1' ||
    corpus.authority.repo !== 'ores-truffle-oreslang/oreslang-source.java' ||
    !Array.isArray(corpus.authority.files) || corpus.authority.files.length !== 2) {
  throw new Error('untrusted/invalid conformance authority');
}
const allowed = new Set(['docs/grammar.ebnf', 'src/main/java/dev/oreslang/parser/Lexer.java']);
for (const file of corpus.authority.files) {
  if (!allowed.has(file.path) || !/^[a-f0-9]{40}$/.test(file.gitBlobSha)) {
    throw new Error('invalid pinned compiler source: ' + file.path);
  }
}
if (process.argv.includes('--live')) {
  for (const file of corpus.authority.files) {
    const url = 'https://raw.githubusercontent.com/' + corpus.authority.repo +
      '/main/' + file.path;
    const response = await fetch(url, {signal: AbortSignal.timeout(15000)});
    if (!response.ok) throw new Error('unable to fetch compiler grammar: ' + response.status);
    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.length > 1024 * 1024) throw new Error('upstream grammar source exceeds budget');
    const gitBlobSha = createHash('sha1')
      .update(Buffer.from('blob ' + buffer.length + '\0')).update(buffer).digest('hex');
    console.log(file.path + ': pinned=' + file.gitBlobSha + ' current=' + gitBlobSha);
    if (gitBlobSha !== file.gitBlobSha) {
      console.error('Compiler grammar drift detected; review semantics and update all three copied manifests together.');
      process.exitCode = 1;
    }
  }
} else {
  console.log('Pinned compiler syntax manifest validated (offline, not a live drift check).');
}
