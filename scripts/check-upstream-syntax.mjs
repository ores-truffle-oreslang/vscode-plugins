// Offline public editor validation only; do not fetch private compiler source.
import {readFileSync} from 'node:fs';
const corpus = JSON.parse(readFileSync(new URL('../conformance/oreslang-syntax-v1.json', import.meta.url)));
const allowed = new Set(['docs/grammar.ebnf','src/main/java/dev/oreslang/parser/Lexer.java']);
if (corpus.schema !== 'oreslang.editor-syntax-conformance/v1' ||
    corpus.authority.repo !== 'ores-truffle-oreslang/oreslang-source.java' ||
    !Array.isArray(corpus.authority.files) || corpus.authority.files.length !== 2 ||
    corpus.authority.files.some(x=>!allowed.has(x.path)||!/^[a-f0-9]{40}$/.test(x.gitBlobSha)) ||
    !Array.isArray(corpus.cases) || corpus.cases.length !== 50 ||
    new Set(corpus.cases.map(x=>x.id)).size !== 50) {
  throw new Error('invalid editor syntax conformance manifest');
}
console.log('Offline fixture validated; private compiler source was not fetched.');
