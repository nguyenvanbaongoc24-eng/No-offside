// Local-only interactive demo. No credentials, requests or production data.
import {build} from 'esbuild';
import {mkdir,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
await mkdir(root+'.ui-review',{recursive:true});
await build({absWorkingDir:root,stdin:{resolveDir:root,loader:'jsx',contents:`
import React from 'react';import {createRoot} from 'react-dom/client';import {MotionConfig} from 'framer-motion';import App from './src/App.jsx';import './src/styles/index.css';import './src/styles/refinement.css';import './src/styles/soft-ui.css';
localStorage.setItem('no_offside_demo_session','true');
createRoot(document.getElementById('root')).render(<MotionConfig reducedMotion="user"><App/></MotionConfig>);
`},bundle:true,platform:'browser',format:'esm',outfile:root+'.ui-review/interaction.js',plugins:[{name:'offline-demo',setup(b){b.onResolve({filter:/lib\/supabase$/},()=>({path:'offline',namespace:'offline'}));b.onLoad({filter:/.*/,namespace:'offline'},()=>({contents:'export const supabase = null;',loader:'js'}));}}]});
// Use Vite's Tailwind processed stylesheet; esbuild's CSS is not Tailwind processed.
await writeFile(root+'.ui-review/interaction.html','<!doctype html><html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@400;500;600;700&display=swap"><title>No Offside — Local interactive demo</title><link rel="stylesheet" href="/src/styles/index.css"><link rel="stylesheet" href="/src/styles/refinement.css"><link rel="stylesheet" href="/src/styles/soft-ui.css"></head><body><div id="root"></div><script type="module" src="./interaction.js"></script></body></html>');
console.log('Local offline demo: /.ui-review/interaction.html');
