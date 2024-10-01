import {uni,s2t,t2s,t2j,j2g,ym2ymd,dash,ensureRequest,getManually} from './util.js';

const na = 'N/A';

export default [
	{
		id: '1',
		updatable: false,
		hasPartialRequesting: false,
		dependencies: ['node-html-parser'],
		requester: async () =>
			await ensureRequest(new URL('https://alanchand.com/currencies-price/archive/usd'), 'text', '1'),
		dataGrabber: function (responseText, deps) {
			const document = deps[0].parse(responseText);
			const script = [...document.querySelectorAll('script')][1].textContent;
			const window = {};
			eval(script);
			const rows = window.__NUXT__.data[0].history.map(i => [i.d, i.h, i.l, i.p, i.r]); // date,high,low,price,unknown
			const data = rows.toReversed();
			return data;
		},
		assumptionsValidator: (responseText, deps) => {
			if (typeof responseText !== 'string') return 0;
			if (responseText.length < 200_000) return 0; 
			const document = deps[0].parse(responseText);
			const scripts = [...document.querySelectorAll('script')].map(i=>i.textContent);
			if (scripts.length === 0) return 0;
			const targetScript = scripts[1];
			if (targetScript.length < 100_000) return 0;
			return 1;
		},
		rowTransformer: ([d,h,l,p]) => [t2j(s2t(d,true)), d.replaceAll('-',''), -1, h, l, p, '1'].map(i=>i===-1?na:i),
		dataTransformer: (data, rowTransformer) => data.map(rowTransformer),
		rawDataUpdateDetector: undefined,
		rawDataConcatter: undefined,
	},
	
	{
		id: '2',
		updatable: false,
		hasPartialRequesting: true,
		dependencies: [],
		requester: async (partial) => {
			const url = new URL('https://api.navasan.tech/ohlcSearch/');
			let start = '1397-11-27';
			let end = dash(t2j(new Date()/1e3));
			if (partial) {
				const {startJDate, endJDate} = partial;
				[start, end] = [startJDate, endJDate].map(dash);
			}
			url.search = new URLSearchParams({api_key: 'freeouYxi4N9OMLVWs4Ckn4xldwDltNS', item: 'usd_buy', start, end});
			const res = await ensureRequest(url, 'json', '2');
			return res;
		},
		dataGrabber: function (responseJson) {
			return responseJson;
		},
		assumptionsValidator: (responseJson, deps) => {
			if (!Array.isArray(responseJson)) return 0;
			if (responseJson.length > 0) {
				const expectedKeys = ['timestamp', 'date', 'open', 'high', 'low', 'close'];
				const expectedTypes = ['number', 'string', 'number', 'number', 'number', 'number'];
				const item = responseJson[0];
				const itemIsObj = Object.prototype.toString.call(item) === '[object Object]';
				if (!itemIsObj) return 0;
				const itemKeys = Object.keys(item);
				if (itemKeys.length !== expectedKeys.length) return 0;
				const keyChanged = itemKeys.some((k,i) => k !== expectedKeys[i]);
				const typeChanged = itemKeys.some((k,i) => typeof item[k] !== expectedTypes[i]);
				if (keyChanged || typeChanged) return 0;
			}
			return 1;
		},
		//rowTransformer: i => [t2j(uni(i.timestamp)), t2s(uni(i.timestamp)), i.open, i.high, i.low, i.close, '2'], // timestamps of the data are wrong (they're 1 day ahead)
		rowTransformer: i => [i.date.replaceAll('-',''), j2g(i.date,true), i.open, i.high, i.low, i.close, '2'],
		dataTransformer: (data, rowTransformer) => data.map(rowTransformer),
		rawDataUpdateDetector: undefined,
		rawDataConcatter: undefined,
	},
	
	{
		id: '3',
		updatable: true,
		hasPartialRequesting: false,
		dependencies: [],
		requester: async () =>
			await ensureRequest(new URL('https://platform.tgju.org/fa/tvdata/history?symbol=PRICE_DOLLAR_RL&resolution=1D'), 'json', '3'),
		dataGrabber: responseJson => responseJson,
		assumptionsValidator: (responseJson, deps) => {
			const resIsObj = Object.prototype.toString.call(responseJson) === '[object Object]';
			if (!resIsObj) return 0;
			const expectedKeys = ['t', 'c', 'o', 'h', 'l', 'v', 's'];
			const expectedTypes = ['Array', 'Array', 'Array', 'Array', 'Array', 'Array', 'String'];
			const resKeys = Object.keys(responseJson);
			const resTypes = resKeys.map(k => Object.prototype.toString.call(responseJson[k]).split(' ')[1].slice(0,-1));
			const keyChanged = resKeys.some((key,i) => key !== expectedKeys[i]);
			const typeChanged = resTypes.some((type,i) => type !== expectedTypes[i]);
			if (keyChanged || typeChanged) return 0;
			return 1;
		},
		rowTransformer: undefined,
		dataTransformer: data => Object.keys(data).length ? data.t.map((v,i) => [ t2j(uni(v)), t2s(uni(v)), ...['o','h','l','c'].map(k=>data[k][i] / 10), '3' ]) : [],
		rawDataUpdateDetector: (data, endGDate) => {
			const endTimestamp = s2t(endGDate);
			const newdataIdx = data.t.findIndex(i => i >= endTimestamp);
			if (newdataIdx === -1) return;
			const keys = Object.keys(data);
			const newdata = {};
			for (const key of keys) {
				let prop = data[key];
				if (Array.isArray(prop)) prop = prop.slice(newdataIdx);
				newdata[key] = prop;
			}
			return newdata;
		},
		rawDataConcatter: (oldData, newData) => {
			const keys = Object.keys(oldData);
			const glued = {};
			for (const key of keys) {
				const oldProp = oldData[key];
				const newProp = newData[key] || [];
				let gluedProp; 
				if (Array.isArray(oldProp)) {
					gluedProp = [...oldProp, ...newProp];
				} else {
					gluedProp = oldProp;
				}
				glued[key] = gluedProp;
			}
			return glued;
		},
	},
	
	{
		id: '4',
		updatable: false,
		hasPartialRequesting: false,
		dependencies: [],
		requester: () => getManually('https://www.asriran.com/fa/news/198282/جدول-قیمت-دلار-در-۳۳-سال-گذشته'),
		dataGrabber: undefined,
		assumptionsValidator: undefined,
		rowTransformer: ([jd,p]) => [jd, j2g(jd), na, na, na, p, '4'],
		dataTransformer: (data, rowTransformer) => data.map(([d,p])=>[ym2ymd(d),p]).map(rowTransformer),
		rawDataUpdateDetector: undefined,
		rawDataConcatter: undefined,
	},
	
	{
		id: '5',
		updatable: false,
		hasPartialRequesting: false,
		dependencies: [],
		requester: getManually('https://sarafializadeh.com/جدول-قیمت-دلار-در-40-سال-گذشته/'),
		dataGrabber: undefined,
		assumptionsValidator: undefined,
		rowTransformer: ([jd,p]) => [jd, j2g(jd), na, na, na, p, '5'],
		dataTransformer: (data, rowTransformer) =>
			data.map(i=>i.length === 2 ? [i[0], i.at(-1)] : i).map(([d,p])=>[ym2ymd(d),p]).map(rowTransformer),
		rawDataUpdateDetector: undefined,
		rawDataConcatter: undefined,
	},
	
];