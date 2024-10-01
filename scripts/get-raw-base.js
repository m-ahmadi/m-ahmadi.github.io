import { join } from 'node:path';
import schemas from './datasource-schemas.js';
import { jwrite, jread, ym2ymd, writeLog, store, BlankState } from './util.js';
const [, OFFLINE] = process.argv.slice(1);
const state = store.state.load();

(async () => {
	const writes = [];
	const logs = [];
	
	for (const schema of schemas) {
		const {updatable, id} = schema;
		if (!state[id]) state[id] = structuredClone(BlankState);
		
		if (!updatable) {
			state[id].unupdatable = true;
			continue;
		}
		
		let data;
		
		if (!OFFLINE) {
			const {requester} = schema;
			const {res, log} = await requester();
			logs.push(log);
			
			const {dependencies, assumptionsValidator} = schema;
			const deps = await Promise.all(dependencies.map(i=>import(i)));
			const validAssumptions = assumptionsValidator(res, deps);
			if (!validAssumptions) throw Error(`Schema ${id}: Assumptions are invalidated.`);
			const {dataGrabber} = schema;
			data = dataGrabber(res, deps);
		} else {
			data = jread(join(store.baseRaw, `${id}.json`));
		}
		
		const {rowTransformer, dataTransformer} = schema;
		
		let firstJDate, lastJDate;
		if (rowTransformer) {
			[firstJDate] = rowTransformer(data[0]);
			[lastJDate] = rowTransformer(data.at(-1));
		} else {
			const dataRdy = dataTransformer(data, rowTransformer);
			[firstJDate] = dataRdy[0];
			[lastJDate] = dataRdy.at(-1);
		}
		
		const [start, end] = [firstJDate, lastJDate].map(ym2ymd);
		state[id].base = {start, end};
		
		const filename = `${id}.json`;
		
		writes.push([filename, data]);
	}
	
	for (const [filename, data] of writes) {
		jwrite(join(store.baseRaw, filename), data);
	}

	store.state.save(state);
	writeLog('base', logs.join('\n'));

})();
