async (page) => {
  await page.evaluate(()=>window.__game.goto('d01-dot',9));
  await page.waitForSelector('.build .code-ta');
  const copy=await page.evaluate(async ()=>(await import('/src/game/content/chapters/d01-dot/copy.ts')).COPY);
  const decoy='def dot(v, w):\n'+copy.build.decoy;
  const results=[];
  const slow='import time\ndef dot(v, w):\n    time.sleep(0.006)\n    return v[0]*w[0] + v[1]*w[1]\n';
  for(const change of ['edit','mode','start over','same-turn edit']) {
    await page.locator('.code-ta').fill(slow);
    const adoptedBefore=await page.evaluate(()=>window.__game.save().flags['d01-dot-build'].adoptedSource);
    await page.evaluate(async({change,decoy})=>{
      const b=(await import('/src/game/game/build.ts')).buildTest.current;
      window.finalFixSettled=false;
      window.finalFixPending=b.run().finally(()=>window.finalFixSettled=true);
      if(change==='same-turn edit'){
        const ta=document.querySelector('.code-ta'); ta.value=decoy; ta.dispatchEvent(new Event('input',{bubbles:true}));
      }
    },{change,decoy});
    if(change==='edit') await page.locator('.code-ta').fill(decoy);
    if(change==='mode') await page.getByRole('tab',{name:'Fill',exact:true}).click();
    if(change==='start over')await page.getByRole('button',{name:'Start over',exact:true}).click();
    const wasPending=await page.evaluate(()=>!window.finalFixSettled);
    if(!wasPending)throw new Error('fixture edited too late '+change);
    await page.evaluate(()=>window.finalFixPending);
    const observed=await page.evaluate(async()=>({
      ok:document.querySelectorAll('.test-results .test.ok').length,
      fail:document.querySelectorAll('.test-results .test.fail').length,
      sharedPassed:(await import('/src/game/game/build.ts')).buildTest.current.passed(),
      ready:document.querySelector('.build').dataset.ready,
      status:document.querySelector('.build-status').textContent,
      readout:!!document.querySelector('.d01-player-reading'),
      continueVisible:!![...document.querySelectorAll('.hud-br .primary')].find(e=>!e.hidden&&!e.disabled),
      source:window.__game.save().flags['d01-dot-build'].source,
      adopted:window.__game.save().flags['d01-dot-build'].adoptedSource,
      story:window.__game.save().code.dot===window.finalFixStory,
    }));
    if(observed.ok!==200||observed.fail!==0||!observed.sharedPassed||observed.source!==slow||observed.adopted!==adoptedBefore||observed.ready!=='false'||observed.status!==copy.build.tests||observed.readout||observed.continueVisible||!observed.story)throw new Error('stale passing run '+change+' '+JSON.stringify(observed));
    results.push({change,wasPending,...observed});
    if(change==='edit')await page.screenshot({path:'output/playwright/finalfix-build-stale-run.png'});
    if(change==='mode')await page.getByRole('tab',{name:'Write',exact:true}).click();
    await page.locator('.code-ta').fill(copy.build.solution);
    await page.evaluate(async()=>await(await import('/src/game/game/build.ts')).buildTest.current.run());
    await page.waitForSelector('.build[data-ready=true]');
  }
  // A fresh wrong run still displays its authored mismatch, not the tests placeholder.
  await page.locator('.code-ta').fill(decoy);
  await page.evaluate(async()=>await(await import('/src/game/game/build.ts')).buildTest.current.run());
  const mismatch=await page.locator('.build-status').textContent();
  if(mismatch===copy.build.tests||mismatch===copy.build.success.text)throw new Error('fresh failure feedback lost');
  results.push({check:'fresh failure feedback preserved',mismatch});
  // Start over can clear status, then the beat can exit while the old run lives.
  await page.locator('.code-ta').fill(slow);
  const detached=await page.evaluate(async()=>{
    const b=(await import('/src/game/game/build.ts')).buildTest.current;
    window.finalFixOldStatus=document.querySelector('.build-status');
    window.finalFixPending=b.run();
    return Object.hasOwn(window.finalFixOldStatus,'textContent');
  });
  await page.getByRole('button',{name:'Start over',exact:true}).click();
  await page.evaluate(()=>window.__game.goto('c01',4));
  await page.evaluate(()=>window.finalFixPending);
  const after=await page.evaluate(async()=>{
    const {pylib}=await import('/src/game/game/build.ts');
    return {chapter:window.__game.state().chapter,accessorReleased:!Object.hasOwn(window.finalFixOldStatus,'textContent')&&!Object.hasOwn(window.finalFixOldStatus,'innerHTML'),story:window.__game.save().code.dot===window.finalFixStory,dot3D:await pylib.call('dot',[0,0,1],[0,0,1])};
  });
  if(!detached||!after.accessorReleased||!after.story||after.dot3D!==1||after.chapter!=='c01')throw new Error('late cleanup '+JSON.stringify(after));
  results.push({check:'cleared running status and abort retain isolation until settlement',...after});
  await page.evaluate(results=>window.finalFixExtra=results,results);
  return results;
}
