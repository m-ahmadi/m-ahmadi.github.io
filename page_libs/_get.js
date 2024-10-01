import {copyFileSync} from 'node:fs';

[
	['jalaali-js/dist', 'jalaali.min.js'],
	['uplot/dist', 'uPlot.esm.js'],
	['uplot/dist', 'uPlot.min.css'],
	['dequal/dist', 'index.mjs', 'dequal.esm.js'],
	['tabulator-tables/dist/js', 'tabulator_esm.min.js'],
	['tabulator-tables/dist/css', 'tabulator.min.css'],
].map(([srcdir, srcfile, newname]) =>
	copyFileSync(`./node_modules/${srcdir}/${srcfile}`, `./page_libs/${newname || srcfile}`)
);
