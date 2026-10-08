import { spawnSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import assert from 'node:assert/strict';
const code=async(page)=>{
  await page.setViewportSize({width:1440,height:900});
  await page.goto('http://localhost:5173/game/index.html?test&qaDiff=commander');
  await page.waitForFunction(()=>!!window.__game);
  await page.waitForSelector('#loading',{state:'detached'});
  await page.evaluate(async()=>{
    const {buildDot}=await import('/src/game/content/chapters/c04-dot/build.ts');
    const {save}=await import('/src/game/core/save.ts');
    const s=window.__game.save();s.code.dot=buildDot.solution;s.flags.buildPassing={dot:true};save();
    window.d01StorySnapshot={source:s.code.dot,passing:s.flags.buildPassing.dot};
    window.__game.goto('d01-dot',9);
  });
  await page.waitForSelector('.build .code-ta');
  const results=[];
  const verify=async label=>{
    const data=await page.evaluate(async()=>{
      const {pylib}=await import('/src/game/game/build.ts');
      const s=window.__game.save();
      return {sourcePreserved:s.code.dot===window.d01StorySnapshot.source,flagPreserved:s.flags.buildPassing.dot===window.d01StorySnapshot.passing,dot3D:await pylib.call('dot',[0,0,1],[0,0,1]),square3D:await pylib.call('dot',[2,3,6],[2,3,6]),serializedStory:JSON.parse(JSON.stringify(s)).code.dot===window.d01StorySnapshot.source};
    });
    if(!data.sourcePreserved||!data.flagPreserved||!data.serializedStory||data.dot3D!==1||data.square3D!==49) throw new Error('story isolation '+label+': '+JSON.stringify(data));
    results.push({check:label,passed:true,...data});
  };
  await verify('before prototype pass, while editor is mounted');
  for(const mode of ['assemble','fill','write']){
    const result=await page.evaluate(mode=>window.__game.solveBuild(mode),mode);
    if(!result?.ok)throw new Error('prototype mode failed');
    await page.waitForSelector('.build[data-ready=true]');
    await verify('after '+mode+' pass, while prototype is open');
  }
  await page.evaluate(()=>window.__game.goto('c01',2));
  await page.waitForFunction(()=>window.__game.state().chapter==='c01'&&!!window.__game.app.runner.puzzle?.runtime);
  await verify('after leaving prototype for the existing story');
  const chrome=await page.evaluate(()=>({banner:!!document.querySelector('.hud-chapter'),nav:[...document.querySelectorAll('.hud-tr button')].filter(e=>e.getBoundingClientRect().width&&getComputedStyle(e).display!=='none').map(e=>e.textContent),compact:!!document.querySelector('[data-d01-interactive]')}));
  if(!chrome.banner||chrome.compact||chrome.nav.length<5)throw new Error('story chrome did not restore');
  results.push({check:'existing c01 full chrome restored',passed:true,...chrome});
  await page.screenshot({path:'reviews/d01-dot-v2/screenshots/story-c01-scope-check.png'});

  // A discriminating saved player implementation passes the authored integer
  // suite but returns a distinct result on the non-integer discovery heading.
  await page.evaluate(()=>window.__game.goto('d01-dot',9));
  await page.waitForSelector('.build .code-ta');
  await page.evaluate(async()=>{(await import('/src/game/game/build.ts')).buildTest.current.setMode('write');});
  const distinct='def dot(v, w):\n    if any(x != int(x) for x in v + w):\n        return 123.45\n    return v[0]*w[0] + v[1]*w[1]\n';
  await page.locator('.code-ta').fill(distinct);
  await page.evaluate(async()=>{await(await import('/src/game/game/build.ts')).buildTest.current.run();});
  await page.waitForSelector('.build[data-ready=true]');
  await verify('after discriminating player fixture');
  await page.evaluate(()=>window.__game.goto('d01-dot',1));
  await page.waitForFunction(()=>!!window.__game.app.runner.puzzle?.runtime);
  await page.waitForFunction(()=>document.querySelector('.readout .v')?.textContent==='123.45');
  results.push({check:'non-integer p1 instrument uses adopted player source, not reference fallback',passed:true,observed:123.45,reference:8.48528137423857});

  // Start a real slow Python run, leave before it resolves, then prove it did
  // not replace the story function. Continue rejection is unit-covered.
  await page.evaluate(()=>window.__game.goto('d01-dot',9));
  await page.waitForSelector('.build .code-ta');
  await page.locator('.code-ta').fill('def dot(v, w):\n    for _ in range(20000):\n        pass\n    return v[0]*w[0] + v[1]*w[1]\n');
  await page.evaluate(async()=>{const b=(await import('/src/game/game/build.ts')).buildTest.current;window.d01LateRun=b.run();window.__game.goto('c01',4);});
  await page.waitForFunction(()=>window.__game.state().chapter==='c01');
  await page.evaluate(()=>window.d01LateRun);
  await verify('after a real aborted Python run settles');
  await page.evaluate(results=>window.d01IsolationResults=results,results);
};
const wrapper='/Users/christopherdasca/.codex/skills/playwright/scripts/playwright_cli.sh';
let r=spawnSync(wrapper,['--session','d01-review','run-code',String(code)],{encoding:'utf8',timeout:180000,maxBuffer:5e6});
process.stdout.write(r.stdout);process.stderr.write(r.stderr);assert.equal(r.status,0);
r=spawnSync(wrapper,['--session','d01-review','eval','JSON.stringify(window.d01IsolationResults)'],{encoding:'utf8',timeout:30000,maxBuffer:5e6});assert.equal(r.status,0,r.stdout);
const results=JSON.parse(JSON.parse(r.stdout.match(/### Result\n([\s\S]*?)\n### Ran/)[1]));
writeFileSync('reviews/d01-dot-v2/checks/08-isolation.json',JSON.stringify(results,null,2)+'\n');
console.log(results.map(x=>x.check+': passed').join('\n'));
