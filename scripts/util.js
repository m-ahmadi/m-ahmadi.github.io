const isNode = typeof process !== 'undefined' && process.versions && process.versions.node;
const jalaali = isNode ? (await import('jalaali-js')).default : globalThis.jalaali;

export let read, write, readdir, readdirfiles, delfile, jread, jwrite, writeLog, store, BlankState;

if (isNode) {
	process.env.TZ = 'Asia/Tehran';
	const {
		readFileSync, writeFileSync, readdirSync, unlinkSync,
		existsSync: exists, mkdirSync: mkdir, statSync: stats,
	} = await import('node:fs');
	const { join } = await import('node:path');
	read = p => readFileSync(p, 'utf8');
	write = (p,c) => writeFileSync(p, c);
	readdir = p => readdirSync(p);
	readdirfiles = p => readdirSync(p).filter(i => !stats(join(p,i)).isDirectory());
	delfile = p => unlinkSync(p);
	jread = p => JSON.parse(readFileSync(p));
	jwrite = (p,c) => writeFileSync(p, JSON.stringify(c));
	const DATA_DIR = '../data';
	const LOGS_DIR = '../logs';
	const __dirname = import.meta.dirname;
	const root = (...a) => join(__dirname, DATA_DIR, ...a);
	const statefile = join(root(), 'state.json');
	store = {
		root:    root(),
		base:    root('base'),
		baseRaw: root('base', 'raw'),
		upd8:    root('update'),
		upd8Raw: root('update', 'raw'),
		logs:    join(__dirname, LOGS_DIR),
		state:   {
			load: () => exists(statefile) ? jread(statefile) : {},
			save: o => write(statefile, JSON.stringify(o,null,2)),
		}
	};
	BlankState = {
		base: {start: '', end: ''},
		update: {start: '', end: ''},
		unupdatable: undefined,
	};
	writeLog = (type='', content) => {
		const now = new Date();
		const [jDate, gDate, time] = [t2j(now/1e3), t2s(now/1e3), d2time(now)];
		const logfile = `${type}__${jDate}_${gDate}_${time}.log`;
		write(join(store.logs, logfile), content);
	};
	
	Object.keys(store).filter(k=>k!=='state').forEach(k => {
		const p = store[k];
		if (!exists(p)) mkdir(p);
	});
}


export function uni(t) {
	const d = new Date(t * 1e3);
	const r = new Date(d.getFullYear(), d.getMonth(), d.getDate());
	r.setHours(0);
	r.setMinutes(0);
	r.setSeconds(0);
	r.setMilliseconds(0);
	return r / 1e3;
}

export function s2t(s='',alt) {
	if (alt) s = s.replaceAll('-', '');
	return new Date(+s.slice(0,4), +s.slice(4,6)-1, +s.slice(6,8)) / 1e3;
}

export function t2s(t,alt) {
	const d = new Date(t*1e3);
	const [y,m,dy] = [d.getFullYear(), d.getMonth()+1, d.getDate()];
	return alt
		? [y,m,dy].map(i=>i<10?'0'+i:i).join('-')
		: y*10000 + m*100 + dy + '';
}

export function t2j(t,sep) {
	//return Intl.DateTimeFormat('fa-IR',{numberingSystem:'latn'}).format(new Date(t*1e3)).split('/').map(i=>i<10?'0'+i:i).join('');
	const d = new Date(t*1e3);
	const [y,m,dy] = [d.getFullYear(), d.getMonth()+1, d.getDate()];
	const {jy,jm,jd} = jalaali.toJalaali(y, m, dy);
	return sep
		? jy +sep+ jm +sep+ jd
		: jy*10000 + jm*100 + jd + '';
}

export function j2g(s='13800101', alt) {
	if (alt) s = s.replaceAll('-', '');
	const [jy,jm,jd] = [+s.slice(0,4), +s.slice(4,6), +s.slice(6,8)];
	const {gy,gm,gd} = jalaali.toGregorian(jy, jm, jd);
	return gy*10000 + gm*100 + gd + '';
}

export function j2d(js) {
	const [jy, jm, jd] = [[0,4],[4,6],[6,8]].map(i => +js.slice(...i));
	const {gy, gm, gd} = jalaali.toGregorian(jy, jm, jd);
	const date = new Date(gy, gm-1, gd);
	['Hours','Minutes','Seconds','Milliseconds'].forEach(k => date['set'+k](0));
	return date;
}

export function g2j(s='20010321', alt) {
	return t2j(s2t(s, alt));
}

export function d2time(d=new Date()) {
	const [h,m,s] = Intl.DateTimeFormat('en-GB',{timeStyle:'medium'}).format(d).split(':');
	const mm = Math.ceil(m+'.'+s);
	const mmm = mm < 10 ? '0'+mm : ''+mm;
	return h + mmm;
}

export function ym2ymd(jDateN) {
	const s = ''+jDateN;
	let date;
	if (s.length === 4) {
		let year = +s;
		let month = 12;
		let day = jalaali.jalaaliMonthLength(year, month);
		date = [year, month, day];
	} else if (s.length === 6) {
		let [year, month] = [+s.slice(0,4), +s.slice(4,6)];
		let day = jalaali.jalaaliMonthLength(year, month);
		date = [year, month, day];
	} else if (s.length === 8) {
		let [year, month, day] = [+s.slice(0,4), +s.slice(4,6), +s.slice(6,8)];
		date = [year, month, day];
	}
	const jDateS = date.map(i => i<10 ?'0'+i : ''+i).join('');
	return jDateS;
}

export function dateRange(start, end) {
	[start,end] = [start,end].map(a=>(a=[...a],a[1]--,a));
	end = +new Date(...end);
	const d = new Date(...start);
	const r = [d/1e3];
	while (+d < end) {
		d.setDate(d.getDate()+1);
		d.setHours(0);
		d.setMinutes(0);
		d.setSeconds(0);
		d.setMilliseconds(0);
		r.push(d/1e3);
	}
	return r;
}

export function bounds(a,colIdx) {
	a = [...a];
	const [b0, b1] = [a.at(0), a.at(-1)];
	if (colIdx > -1) [b0, b1] = [b0[colIdx], b1[colIdx]];
	return [b0, b1];
}

export function fa2en(s) {
	const enDigs = {'۰':'0', '۱':'1', '۲':'2', '۳':'3', '۴':'4', '۵':'5', '۶':'6', '۷':'7', '۸':'8', '۹':'9', '.':'.'};
	const all = new Set(Object.keys(enDigs));
	return [...s].map(i => all.has(i) ? enDigs[i] : i).join('');
}

export function dash(s='') {
	return [...s].map((v,i)=>i===4||i===6?'-'+v:v).join('');
}

export function sum(a) {
	return a.reduce((r,i)=>r+=i,0);
}

export function avg(a) {
	return sum(a) / a.length;
}

export function round(n=0, dp=0) {
	return +n.toFixed(dp);
}

export function weightedAvg(x=[], w=[]) {
	let [mulSum, wSum] = [0, 0];
	for (let i=0, len=x.length; i<len; i++) {
		const [_x, _w] = [];
		mulSum += x[i] * w[i];
		wSum += w[i];
	}
	return mulSum / wSum;
}

export async function ensureRequest(url='', urlResType='', schemaId='', opts={}) {
	const sleep = ms => new Promise(r => setTimeout(r, ms));
	const m2ms = mins => mins * 60 * 1000;
	const TIMEOUT_BASE = m2ms(1);
	const TIMEOUT_STEP = m2ms(5);
	
	let timeout = TIMEOUT_BASE;
	let trycount = 1;
	let logs = [];
	const end = async () => (await sleep(timeout), timeout += TIMEOUT_STEP, trycount++);
	let respBody;
	let err;
	
	do {
		err = '';
		let resp = await fetch(url, opts).catch(e => err = e);
		let msg = `request(schema=${schemaId}, try=${trycount}) - `;
		
		if (err) {
			logs.push(msg+'X: req not ok:  '+err);
			await end();
			continue;
		}
		
		if (resp.status !== 200) {
			err = 1;
			logs.push(msg+'X: not 200:  '+resp.status);
			await end();
			continue;
		}
		
		err = '';
		respBody = await resp[urlResType]().catch(e => err = e);
		if (err) {
			logs.push(msg+'X: res parse fail:  '+err);
			await end();
			continue;
		}
		
		logs.push(msg+'√: succ');
		
	} while (err)
	
	return {res: respBody, log: logs};
}

export function getManually(urlStr='') {
	return `Grab the data by your two precious hands according to following instructions:
1. Go the the page ${urlStr}.
1. Grab the data manually.
2. Put the data in JSON format of [row,row,...].
3. Name the JSON file like "{id}-{firstJDate}.json" where:
  "id" refers to schema ID, and
	"firstJDate" refers to Jalaali date of first row
4. Place JSON file under "data/base/raw/"
Done.`
}
