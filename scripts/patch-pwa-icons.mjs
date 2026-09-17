import fs from 'node:fs/promises';

const path='index.html';
let html=await fs.readFile(path,'utf8');

const tags='<link rel="apple-touch-icon" sizes="180x180" href="apple-touch-icon-v2.png"><link rel="icon" type="image/png" sizes="192x192" href="icon-192.png?v=20260917b"><link rel="icon" type="image/png" sizes="512x512" href="icon-512.png?v=20260917b"><link rel="manifest" href="manifest.webmanifest?v=20260917b">';

html=html.replace(/<link rel="apple-touch-icon"[^>]*>/g,'')
         .replace(/<link rel="manifest"[^>]*>/g,'');
if(!html.includes('apple-touch-icon-v2.png')) html=html.replace('</head>',tags+'</head>');
await fs.writeFile(path,html);
console.log('PWA/iPhone icon links installed.');