// Inlines CSS + JS into one page. Writes index.html (standalone) and, if given, an artifact fragment.
const fs = require('fs'), path = require('path');
const dir = __dirname;
const js = ['gfx', 'font', 'avatar', 'cat', 'scene', 'main'].map(n => fs.readFileSync(path.join(dir, 'src/js', n + '.js'), 'utf8')).join('\n');
const css = fs.readFileSync(path.join(dir, 'src/style.css'), 'utf8');
const frag = fs.readFileSync(path.join(dir, 'src/page.html'), 'utf8').replace('{{CSS}}', () => css).replace('{{JS}}', () => js);
const full = `<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n${frag.split('<style>')[0]}<style>\n${css}\n</style>\n</head>\n<body>\n${frag.split('</style>')[1]}\n</body>\n</html>\n`;
fs.writeFileSync(path.join(dir, 'index.html'), full);
if (process.argv[2]) fs.writeFileSync(process.argv[2], frag);
console.log('built', full.length, 'bytes');
