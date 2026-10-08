import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import assert from 'node:assert/strict';
const expression = `async()=>{const r=await import('/src/game/game/registry.ts');const c=r.DEV_CHAPTERS.find(c=>c.id==='d01-dot');r.CHAPTERS.push(c);try{return JSON.stringify(window.__game.texts().filter(x=>x.where.startsWith('d01-dot')));}finally{r.CHAPTERS.splice(r.CHAPTERS.indexOf(c),1);}}`;
const result=spawnSync('/Users/christopherdasca/.codex/skills/playwright/scripts/playwright_cli.sh',['--session','d01-review','eval',expression],{encoding:'utf8',timeout:30000});
assert.equal(result.status,0,result.stdout);
const items=JSON.parse(JSON.parse(result.stdout.match(/### Result\n([\s\S]*?)\n### Ran/)[1]));
assert.ok(items.length>0);
const testSource=readFileSync('tests/game-wording.mjs','utf8');
const rules=new Function('return '+testSource.match(/const RULES = (\[[\s\S]*?\n\]);/)[1])();
const hits=[];
for(const item of items){
  const prose=item.text.replace(/\$[^$]*\$/g,' ').replace(/`[^`]*`/g,' ');
  for(const [rule,re] of rules){re.lastIndex=0;for(const m of prose.matchAll(re))hits.push({where:item.where,rule,match:m[0]});}
}
const name=items.find(x=>x.term==='dot product');
assert.ok(name);
const premature=items.filter(x=>x.order<name.order && /\bdot product\b/i.test(x.text));
assert.deepEqual(hits,[]);
assert.deepEqual(premature,[]);
writeFileSync('reviews/d01-dot-v2/checks/05-wording-dev.json',JSON.stringify(items,null,2)+'\n');
const output=`Developer-chapter fixture: ${items.length} strings checked, ${hits.length} hits\n"dot product" before name-dot: ${premature.length} hits\nThe unmodified wording RULES were applied after temporary registry inclusion for text extraction only.\n`;
writeFileSync('reviews/d01-dot-v2/checks/05-wording-dev.txt',output);
console.log(output);
