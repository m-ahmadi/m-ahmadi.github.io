import { execSync } from 'node:child_process';
import { join, parse } from 'node:path';
import { readdirfiles, jread, jwrite, delfile, writeLog, store } from './util.js';
import schemas from './datasource-schemas.js';
const state = store.state.load();

const schemasById = new Map(schemas.map(i=>[i.id, i]));
const rawBaseFiles = new Set(readdirfiles(store.baseRaw));
const rawUpd8Files = new Set(readdirfiles(store.upd8Raw));

const logs = [];

for (const file of rawBaseFiles) {
	const id = parse(file).name;
	
	const schema = schemasById.get(id);
	if (!schema) continue;
	
	const hasNoUpdate = !rawUpd8Files.has(file);
	
	if (hasNoUpdate) {
		logs.push(`schema=${id}:  no updates available`);
		continue;
	};
	
	const rawBaseFile = join(store.baseRaw, file);
	const rawUpd8File = join(store.upd8Raw, file);
	const baseFile = join(store.base, file);
	const upd8File = join(store.upd8, file);
	
	const {rawDataConcatter} = schema;
	
	const rawBaseData = jread(rawBaseFile);
	const rawUpd8Data = jread(rawUpd8File);
	
	const gluedRawData = rawDataConcatter
		? rawDataConcatter(rawBaseData, rawUpd8Data)
		: [...rawBaseData, ...rawUpd8Data];
	
	state[id].base.end = state[id].update.end;
	state[id].update = {start: '', end: ''};
	
	jwrite(rawBaseFile, gluedRawData);
	[baseFile, rawUpd8File, upd8File].forEach(delfile);
	
	logs.push(`schema=${id}:  rebased`);
}

store.state.save(state);
execSync('node ' + join(import.meta.dirname, 'gen-base.js'));
writeLog('rebase', logs.join('\n'));
