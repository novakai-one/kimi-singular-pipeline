async (page) => {
  await page.setViewportSize({width:390,height:844});
  await page.waitForFunction(() => !!window.__game);
  await page.waitForSelector('#loading', {state:'detached'});
  await page.evaluate(async () => {
    const {buildDot}=await import('/src/game/content/chapters/c04-dot/build.ts');
    const s=window.__game.save(); s.settings.difficulty='commander'; s.code.dot=buildDot.solution; s.flags.buildPassing={dot:true};
    window.finalFixStory=buildDot.solution;
    window.__game.goto('d01-dot',9);
  });
  await page.waitForSelector('.build .code-ta');
  const copy=await page.evaluate(async () => (await import('/src/game/content/chapters/d01-dot/copy.ts')).COPY);
  const result=[];
  const state=() => page.evaluate(() => ({
    ready:document.querySelector('.build')?.dataset.ready,
    status:document.querySelector('.build-status')?.textContent,
    instrument:!!document.querySelector('.d01-player-reading'),
    continueVisible:!![...document.querySelectorAll('.hud-br .primary')].find(e=>!e.hidden&&!e.disabled),
    story:window.__game.save().code.dot===window.finalFixStory,
    source:document.querySelector('.code-ta')?.value,
  }));
  const invalid=async label=>{
    await page.waitForFunction(t=>document.querySelector('.build-status')?.textContent===t,copy.build.tests);
    const s=await state();
    if(s.ready!=='false'||s.instrument||s.continueVisible||!s.story)throw new Error(label+JSON.stringify(s));
    result.push({label,...s});
  };
  const fresh=async label=>{
    await page.locator('.code-ta').fill(copy.build.solution);
    await page.evaluate(async()=>{await(await import('/src/game/game/build.ts')).buildTest.current.run();});
    await page.waitForSelector('.build[data-ready=true]');
    const s=await state();
    if(s.status!==copy.build.success.text||!s.instrument||!s.continueVisible||!s.story)throw new Error(label+JSON.stringify(s));
    result.push({label,...s});
  };
  await fresh('initial confirmed pass');
  await page.locator('.code-ta').fill(copy.build.decoy);
  await invalid('editing a previous pass restores tests');
  await page.screenshot({path:'output/playwright/finalfix-build-edited.png'});
  await fresh('fresh run after editing');
  await page.getByRole('tab',{name:'Fill',exact:true}).click();
  await invalid('mode change after pass restores tests');
  await page.getByRole('tab',{name:'Write',exact:true}).click();
  for(const change of ['edit','mode','start over','same-turn edit']) {
    const slow='import time\ndef dot(v, w):\n    time.sleep(0.006)\n    return v[0]*w[0] + v[1]*w[1]\n';
    await page.locator('.code-ta').fill(slow);
    await page.evaluate(async change=>{
      const b=(await import('/src/game/game/build.ts')).buildTest.current;
      window.finalFixPending=b.run();
      if(change==='same-turn edit'){
        const ta=document.querySelector('.code-ta'); ta.value='def dot(v, w):\n    return sum(a + b for a, b in zip(v, w))'; ta.dispatchEvent(new Event('input',{bubbles:true}));
      }
    },change);
    if(change==='edit') await page.locator('.code-ta').fill(copy.build.decoy);
    if(change==='mode') await page.getByRole('tab',{name:'Fill',exact:true}).click();
    if(change==='start over') await page.getByRole('button',{name:'Start over',exact:true}).click();
    await page.evaluate(()=>window.finalFixPending);
    await invalid('old passing run rejected after '+change);
    if(change==='edit')await page.screenshot({path:'output/playwright/finalfix-build-stale-run.png'});
    if(change==='mode')await page.getByRole('tab',{name:'Write',exact:true}).click();
    await fresh('fresh recovery after '+change);
  }
  for(const mode of ['assemble','fill','write']) {
    const r=await page.evaluate(mode=>window.__game.solveBuild(mode),mode);
    if(!r?.ok)throw new Error('mode solve '+mode);
    await page.waitForSelector('.build[data-ready=true]');
    result.push({label:'source ownership accepts '+mode,...await state()});
  }
  await page.evaluate(()=>window.__game.goto('d01-dot',1));
  await page.waitForFunction(()=>!!window.__game.app.runner.puzzle?.runtime);
  await page.waitForFunction(()=>!!document.querySelector('.readout .v')?.textContent);
  await page.evaluate(async()=>{
    const {COPY}=await import('/src/game/content/chapters/d01-dot/copy.ts');
    window.__game.app.ui.toast(COPY.p1.feedback);window.__game.app.ui.toast(COPY.p1.feedback);
  });
  await page.waitForTimeout(400);
  const rectangles=await page.evaluate(()=>{
    const r=s=>{const b=document.querySelector(s).getBoundingClientRect();return {x:b.x,y:b.y,width:b.width,height:b.height};};
    return {toast:r('.toast'),goal:r('.objective'),readout:r('.readout'),actions:r('.d01-actions'),count:document.querySelectorAll('.toast').length};
  });
  const overlap=(a,b)=>a.x<b.x+b.width&&a.x+a.width>b.x&&a.y<b.y+b.height&&a.y+a.height>b.y;
  if(rectangles.count!==1||['goal','readout','actions'].some(k=>overlap(rectangles.toast,rectangles[k])))throw new Error('toast overlap '+JSON.stringify(rectangles));
  await page.screenshot({path:'output/playwright/finalfix-mobile-toast.png'});
  result.push({label:'mobile ordinary replacement toast avoids goal/readout/actions',...rectangles});
  await page.evaluate(result=>window.finalFixResults=result,result);
  return result;
}
