import { join, parse } from 'node:path';
import { jread, jwrite, write, readdirfiles, avg, store } from './util.js';

const entries = p => readdirfiles(p).map(i => [parse(i).name, i]);
const base = new Map(entries(store.base));
const update = new Map(entries(store.upd8));

const ds = [];

for (const [id, basefile] of base) {
	const updatefile = update.get(id);
	const baseData = jread(join(store.base, basefile));
	const updateData = updatefile ? jread(join(store.upd8, updatefile)) : [];
	const gluedData = [...baseData, ...updateData];
	ds.push(gluedData);
}

const m = new Map();
const allRows = ds.flat().toSorted(([,a],[,b])=>a-b);
for (const row of allRows) {
	const [, d] = row;
	if (!m.get(d)) m.set(d, []);
	m.set(d, [...m.get(d), row]);
};

const priceIdxs = [2,3,4,5];

const constructedData = [...m.values()].map(rows => {
	let finalRow;
	
	if (rows.length > 1) {
		const priceCols = rows.map(row => priceIdxs.map(idx=>row[idx]));
		
		const priceColsT = [...Array(priceIdxs.length)].map((_,i) => priceCols.map(row=>row[i]));
		
		const priceColsTAvg = priceColsT.map(i => {
			const nums = i.filter(i=> typeof i === 'number');
			return nums.length ? +avg(nums).toFixed(1) : 'N/A';
		});
		
		const avgPriceByIdx = new Map(priceIdxs.map((v,i)=>[v,priceColsTAvg[i]]));
		
		const merged = rows[0].map((v,i) => priceIdxs.includes(i) ? avgPriceByIdx.get(i) : v);
		
		finalRow = merged;
	 } else {
		finalRow = rows[0];
	 }
	 
	 const finalRowWithoutIdCol = finalRow.slice(0,-1);
	 
	 return finalRowWithoutIdCol;
});

const headers = ['jdate', 'gdate', 'open', 'high', 'low', 'close'];
const finalData = [headers, ...constructedData];
const finalDataCsv = finalData.map(i=>i.join(',')).join('\n');

jwrite(join(store.root, 'dollar.json'), finalData);
write(join(store.root, 'dollar.csv'), finalDataCsv);
