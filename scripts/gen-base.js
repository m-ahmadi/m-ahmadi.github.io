import { join, parse } from 'node:path';
import { jread, jwrite, readdirfiles, store } from './util.js';
import schemas from './datasource-schemas.js';
const state = store.state.load();

const rawfilesById = new Map(readdirfiles(store.baseRaw).map(i => [parse(i).name, i]));

for (const schema of schemas) {
	const {rowTransformer, dataTransformer, id, updatable} = schema;
	
	const rawfile = rawfilesById.get(id);
	
	const dataRaw = jread(join(store.baseRaw, rawfile));
	const data = dataTransformer(dataRaw, rowTransformer);
	
	if (!updatable) {
		const [[start], [end]] = [data[0], data.at(-1)];
		state[id].base = {start, end};
	}
	
	const filename = `${id}.json`;
	
	jwrite(join(store.base, filename), data);
}

store.state.save(state);
