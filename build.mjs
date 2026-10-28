import fs from 'node:fs';
fs.mkdirSync('dist',{recursive:true});for(const file of ['index.html','styles.css','app.js','hint.js','engine.js','ai.js','data.js','catalogue.js','map.js','help.js','storage.js','sw.js','manifest.webmanifest','icon.svg'])fs.copyFileSync(file,'dist/'+file);fs.cpSync('docs','dist/docs',{recursive:true});console.log('Built Twilight Imperium IV.');
