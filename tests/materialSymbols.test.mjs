import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {build} from 'esbuild';
import {menuLabels,systemNoticeTitle,thirdChargeLabel} from '../src/lib/menuLabels.js';
const assets=new URL('../src/assets/material-symbols-rounded/',import.meta.url);
const manifest=JSON.parse(await readFile(new URL('manifest.json',assets),'utf8'));
test('each selected Rounded path and viewport matches its pinned Google SVG with Apache license',async()=>{
  assert.equal(manifest.style,'Material Symbols Rounded');assert.equal(manifest.weight,400);
  for(const [name,variants] of Object.entries(manifest.icons))for(const entry of variants){
    assert.match(entry.source,new RegExp(`^symbols/web/${name}/materialsymbolsrounded/`));
    const raw=await readFile(new URL(entry.file,assets),'utf8');
    assert.equal(createHash('sha256').update(raw).digest('hex'),entry.sha256);
    assert.deepEqual([...raw.matchAll(/<path d="([^"]+)"\s*\/>/g)].map(m=>m[1]),entry.paths);
    assert.equal(raw.match(/viewBox="([^"]+)"/)?.[1]||'0 0 24 24',entry.viewBox);
    assert.doesNotMatch(raw,/<(?:script|foreignObject|image)/);
  }
  assert.match(await readFile(new URL('LICENSE',assets),'utf8'),/Apache License/);
  assert.match(await readFile('public/licenses/material-symbols-rounded/NOTICE','utf8'),/Google LLC/);
});
const bundle=await build({stdin:{loader:'jsx',resolveDir:process.cwd(),contents:"export * from './src/components/icons'; export {quickActionItems} from './src/components/QuickActions';"},bundle:true,platform:'node',format:'cjs',write:false,external:['react','react-dom']});
const mod={exports:{}};new Function('require','module','exports',bundle.outputFiles[0].text)(createRequire(import.meta.url),mod,mod.exports);
test('all symbols render local currentColor SVG, with same size for outline/filled and safe accessible names',()=>{
  for(const alias of Object.keys(manifest.mapping)){
    const Icon=mod.exports[alias];assert.ok(Icon,alias);
    const ordinary=renderToStaticMarkup(React.createElement(Icon,{size:24}));
    const filled=renderToStaticMarkup(React.createElement(Icon,{size:24,filled:true}));
    for(const html of [ordinary,filled]){assert.match(html,/width="24" height="24"/);assert.match(html,/fill="currentColor"/);assert.match(html,/aria-hidden="true"/);assert.doesNotMatch(html,/stroke-width|<text|<use|<image|<link/);}
  }
  const labelled=renderToStaticMarkup(React.createElement(mod.exports.Bell,{'aria-label':'Thông báo'}));
  assert.match(labelled,/role="img"/);assert.doesNotMatch(labelled,/aria-hidden/);
  assert.equal(manifest.mapping.Beer,'sports_bar');assert.equal(manifest.mapping.Swords,'person_search');
});
test('menu rename preserves action IDs and only adapts known historical system labels',()=>{
  assert.deepEqual(mod.exports.quickActionItems.map(i=>i.id),['match','transaction','formation','invite','board','stars','finance','media','settings']);
  assert.equal(mod.exports.quickActionItems.find(i=>i.id==='finance').label,menuLabels.finance);
  assert.equal(systemNoticeTitle('Khoản chia Hiệp 3'),'Khoản chia Sinh Tố Lúa Mạch');
  assert.equal(systemNoticeTitle('Thông báo do đội soạn'),'Thông báo do đội soạn');
  assert.equal(thirdChargeLabel('Hiệp 3','third'),menuLabels.finance);
  assert.equal(thirdChargeLabel('Bill Hiệp 3 do thành viên tự đặt','third'),'Bill Hiệp 3 do thành viên tự đặt');
});
test('runtime has no icon font or old library and original brand assets remain separate',async()=>{
  const pkg=JSON.parse(await readFile('package.json','utf8'));assert.equal(pkg.dependencies['lucide-react'],undefined);
  async function walk(dir){for(const f of await readdir(dir,{withFileTypes:true})){const p=dir+'/'+f.name;if(f.isDirectory()){if(f.name!=='assets')await walk(p);}else if(/\.(jsx|js|css)$/.test(p)){const text=await readFile(p,'utf8');assert.doesNotMatch(text,/from\s*['"]lucide-react|className=['"]material-symbols-|fonts\.googleapis\.com.*Material\+Symbols/,p);}}}
  await walk('src');
  const login=await readFile('src/pages/Login.jsx','utf8');assert.match(login,/fill="#4285F4"/);assert.match(login,/pwa-512x512\.png/);
});
