/* Проверка: копии kit.i18n.js и kit.i18n.css в kit/ и portfolio/shared/ побайтно равны. Код 0 равны, 1 расхождение или нет файла. */
'use strict';
var fs = require('fs');
var path = require('path');
var root = path.join(__dirname, '..');
var names = ['kit.i18n.js', 'kit.i18n.css'];
var bad = 0;
names.forEach(function (n) {
  var a = path.join(root, 'kit', n), b = path.join(root, 'portfolio', 'shared', n), x, y;
  try { x = fs.readFileSync(a); y = fs.readFileSync(b); } catch (e) { console.error('Нет файла: ' + e.message); bad = 1; return; }
  if (Buffer.compare(x, y) !== 0) { console.error('Расхождение: kit/' + n + ' и portfolio/shared/' + n); bad = 1; }
  else console.log('Равны: ' + n);
});
process.exit(bad);
