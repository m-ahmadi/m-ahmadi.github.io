import { join } from 'node:path';
import { jwrite, s2t, t2s, t2j, j2g, writeLog, store } from './util.js';
import schemas from './datasource-schemas.js';
const state = store.state.load();


(async () => {
const writes = [];
const logs = [];

for (const schema of schemas) {
	const {updatable} = schema;
	if (!updatable) continue;
	
	const {hasPartialRequesting, requester, id} = schema;
	const baseEndJDate = state[id].base.end;
	
	const partial = hasPartialRequesting ? {
		startJDate: baseEndJDate,
		endJDate: t2j(new Date()/1e3),
	} : undefined;
	
	const {res, log} = await requester(partial);
	logs.push(log);
	
	const {dependencies, assumptionsValidator} = schema;
	const deps = await Promise.all(dependencies.map(i=>import(i)));
	const validAssumptions = assumptionsValidator(res, deps);
	if (!validAssumptions) throw Error(`Schema ${id}: Assumptions are invalidated.`);
	
	const {dataGrabber, rowTransformer, dataTransformer, rawDataUpdateDetector} = schema;
	
	const alldataRaw = dataGrabber(res, deps);
	const alldataRdy = dataTransformer(alldataRaw, rowTransformer);
	
	const endGDateN = +t2s(s2t(j2g(baseEndJDate)));
	const newdataIdx = alldataRdy.findIndex(([,d]) => +d > endGDateN);
	if (newdataIdx === -1) continue;
	
	const newdataRdy = alldataRdy.slice(newdataIdx);
	const newdataRaw = rawDataUpdateDetector
		? rawDataUpdateDetector(alldataRaw, ''+endGDateN)
		: alldataRaw.slice(newdataIdx);
	
	const [[start], [end]] = [newdataRdy[0], newdataRdy.at(-1)];
	state[id].update = {start, end};
	
	const filename = `${id}.json`;
	const outfile = join(store.upd8, filename);
	const outfileRaw = join(store.upd8Raw, filename);
	
	writes.push([
		[outfile, newdataRdy],
		[outfileRaw, newdataRaw],
	]);
	
}

for (const [[outfile, newdataRdy],[outfileRaw, newdataRaw]] of writes) {
	jwrite(outfile, newdataRdy);
	jwrite(outfileRaw, newdataRaw);
}

store.state.save(state);
writeLog('update', logs.join('\n'));

})();
