import * as util from 'util';
import * as http from 'http';
import config from "config";
import { App, LogLevel } from "@slack/bolt";

const settingsInfo: any = config.get("Settings");
const slackInfo: any = config.get("Slack");
const xmlparseAsync = util.promisify(require('xml2js').parseString);

const app = new App({
    token: process.env.SLACK_BOT_TOKEN,
    signingSecret: process.env.SLACK_SIGNING_SECRET,
    logLevel: LogLevel.DEBUG
});

// feedされたエントリを処理
export const processEntriesAsync = async (entries:any) => {
	for(const entry of entries){
		console.log(util.format('%s:%s\nLink:%s', entry.title, entry.content._ , entry.link.$.href));
		await processXmlAsync(entry.link.$.href as string);
	}
}

// XMLを処理する
function processXmlAsync(uri:string){
	return new Promise(async (resolve, reject) => {
		const message:any = await loadXmlAsync(uri);

		if(message){

			try{
				message.token = process.env.SLACK_BOT_TOKEN;
				const result = await app.client.chat.postMessage(message);
				resolve(null);
			}catch(error){
				if(error instanceof Error){
					console.log('http posting error:%s\n%s',error.message,error.stack);
				}else{
					console.log('http posting error:%s',error);
				}
				
				resolve(null);
			}
			
		}else{
			console.log('deprecaetd');
			resolve(null);
		}
		
	});
}

// XMLを読み込んでSlackメッセージオブジェクトを作る
function loadXmlAsync(uri:string){
	return new Promise(async (resolve, reject) => {
		
		let body:any, message:any, xmlobj:any;
		try{
			body = await getEntryAsync(uri);
		}catch(error){
			if(error instanceof Error){
				message = {'text' : util.format('cannot load XML "%s"\nError:%s\nTrace:%s',uri,error.message,error.stack)};
			}else{
				message = {'text' : util.format('cannot load XML "%s"\n%s',uri,error)};
			}
			message.webhook = slackInfo.error.webhook;
			message.channel = slackInfo.error.channel;
			resolve(message);
			return;
		}
		
		try{
			xmlobj = await xmlparseAsync(body, {trim: true, explicitArray: false }) as any;
			message = processObject(xmlobj);
			if(message){
				message.webhook = slackInfo.notify.webhook;
				message.channel = slackInfo.notify.channel;
			}
		}catch(error){
			const dump = util.inspect(xmlobj,{ showHidden: true, depth: null });
			if(error instanceof Error){
				message = {'text' : util.format('cannot parse XML "%s"\nError:%s\nTrace:%s\n%s',uri,error.message,error.stack,dump)};
			}else{
				message = {'text' : util.format('cannot parse XML "%s"\n%s\n%s',uri,error,dump)};
			}
			message.webhook = slackInfo.error.webhook;
			message.channel = slackInfo.error.channel;
		}
		resolve(message);
	});
}

// メッセージ種別に応じた処理を呼ぶ
function processObject(object:any){
	if(object && object.Report && object.Report.Body && object.Report.Body.Intensity && object.Report.Body.Intensity.Observation && object.Report.Body.Intensity.Observation.MaxInt &&
		settingsInfo.AlertIntensityType.includes(object.Report.Body.Intensity.Observation.MaxInt)) {
		const title = object && object.Report && object.Report.Head && object.Report.Head.Title;
		if(settingsInfo.AlertTitleType.includes(title)) {
			switch(title){
				case '震度速報':
					return processSummary(object);
				case '震源に関する情報':
					return processEpicenter(object);
				case '震源・震度情報':
					return processDetail(object);
				default:
					console.log('unknown title:'+title);
					return null;
			}
		}
	} else {
		return null;
	}
}

// Slackメッセージアタッチメントを作成
function makeAttachment(object:any){
	const message:any = {};
	message.footer= object.Report.Control.EditorialOffice;
	
	const reportDate = new Date(object.Report.Head.ReportDateTime);
	message.ts = parseInt(String(reportDate.getTime()/1000));
	
	const targetDate = (object.Report.Body.Earthquake) ?
		new Date(object.Report.Body.Earthquake.OriginTime) : 
		new Date(object.Report.Head.TargetDateTime);
	
	message.fields = [];
	message.fields.push({
		'title' : '発生時刻',
		'value' : targetDate.toString()
	});
	
	message.actions = [{
		'type' : 'button',
		'text' : 'Yahoo!',
		'url'  : util.format('https://typhoon.yahoo.co.jp/weather/jp/earthquake/%s.html',object.Report.Head.EventID)
	},{
		'type' : 'button',
		'text' : 'tenki.jp',
		'url'  : util.format('http://bousai.tenki.jp/bousai/earthquake/detail-%s.html',object.Report.Head.EventID)
	}];
	
	message.image_url = getTenkiJpMapImageURI(object.Report.Head.EventID);
	
	return message;
}

// tenki.jpの震源画像URIを生成
function getTenkiJpMapImageURI(eventID:string){

	const year    = eventID.substring(0,4);
	const month   = eventID.substring(4,6);
	const day     = eventID.substring(6,8);
	const hour    = eventID.substring(8,10);
	const minutes = eventID.substring(10,12);
	const seconds = eventID.substring(12,14);
	
	return util.format('https://earthquake.tenki.jp/static-images/earthquake/detail/%s/%s/%s/%s-%s-%s-%s-%s-%s-large.jpg',year,month,day,year,month,day,hour,minutes,seconds);
}

// Slackメッセージ概要を作成
function makeSlackMessage(message:any, object:any){

	const msgType = object.Report.Control.Status === '通常' ? '' : '('+object.Report.Control.Status+')';
	return {
		'username'    : util.format('%s(%s)',object.Report.Head.Title,object.Report.Head.InfoType),
		'text'        : msgType + object.Report.Head.Headline.Text,
		'attachments' : Array.isArray(message) ? message : [message] ,
	};
}

// 震度速報
function processSummary(object:any){
	const message:any = makeAttachment(object);
	
	const items = Array.isArray(object.Report.Head.Headline.Information.Item) ?
		 object.Report.Head.Headline.Information.Item :
		[object.Report.Head.Headline.Information.Item] ;
	
	items.forEach((item:any) => {
		const areas:Array<string> = [];
		const areaList = Array.isArray(item.Areas.Area) ? item.Areas.Area : [item.Areas.Area];
		
		areaList.forEach((area:any) => {
			areas.push(area.Name);
		});
		
		message.fields.push({
			'title' : item.Kind.Name,
			'value' : areas.join()
		});

	});
	
	return makeSlackMessage(message,object);

}

// 震源に関する情報
function processEpicenter(object:any){
	const message = makeAttachment(object);
	
	loadEpicenter(message,object);
	
	return  makeSlackMessage(message,object);
}

// 震源情報の読み込み
function loadEpicenter(message:any, object:any)
{
	const info = object.Report.Body.Earthquake;
	
	// 座標はISO6709形式 
	const re= /([+-][\d\.]+?)([+-][\d\.]+?)([+-][\d\.]+?)\//;
	const pos = re.exec(info.Hypocenter.Area['jmx_eb:Coordinate']._);
	const link = util.format('https://www.google.com/maps?q=%s,%s',pos[1],pos[2]);
	
	message.fields.push({
		'title' : '震源',
		'value' : util.format('%s\n<%s|%s>',
			info.Hypocenter.Area.Name,
			link,
			info.Hypocenter.Area['jmx_eb:Coordinate'].$.description,
		),
	});

	message.fields.push({
		'title' : 'マグニチュード',
		'value' : info['jmx_eb:Magnitude']._,
	});
}

// 震源・震度に関する情報
function processDetail(object:any){
	const message = makeAttachment(object);
	//console.log('object:'+util.inspect(object,{ showHidden: true, depth: null }));
	
	loadEpicenter(message, object);
	loadIntensity(message, object);
	
	return makeSlackMessage(message,object);
	//console.log('message:'+util.inspect(msg,{ showHidden: true, depth: null }));
}

// 5,6の+/-を強弱に入れ替える
function convertIntensityNum(intensity:string)
{
	switch(intensity){
		case '6+':
			return '6強';
		case '6-':
			return '6弱';
		case '5+':
			return '5強';
		case '5-':
			return '5弱';
		default:
			return intensity;
	}
}

// 震度詳細の読み込み
function loadIntensity(message:any, object:any)
{
	const intencityInfo:Array<string> = [];
	
	const prefList = Array.isArray(object.Report.Body.Intensity.Observation.Pref) ?
		 object.Report.Body.Intensity.Observation.Pref :
		[object.Report.Body.Intensity.Observation.Pref];
	
	prefList.forEach( (pref:any) => {
		const areas:Array<string> = [];
		const areaList:Array<string> = Array.isArray(pref.Area) ? pref.Area : [pref.Area];
		
		areaList.forEach((area:any) => {
			const shortName = area.Name === pref.Name ? pref.Name : area.Name.replace(pref.Name,'');
			areas.push(util.format('%s(最大震度 %s)',shortName, convertIntensityNum(area.MaxInt) ));
		});
		
		intencityInfo.push(util.format('*%s*:%s',pref.Name,areas.join()));
	});
	
	message.fields.push({
		'title' : '各地の震度',
		'value' : intencityInfo.join('\n'),
	});
}

function getEntryAsync(uri:string, encoding='utf8')
{
	return new Promise((resolve, reject) => {
		http.get(uri,(res) => {
			if (res.statusCode < 200 || res.statusCode >= 300) {
				reject(new Error('statusCode=' + res.statusCode));
				return;
			}
			
			let body = '';
			//res.setEncoding(encoding);
			res.on('data', (chunk) => {
				body += chunk;
			});
			
			res.on('end', () => {
				resolve(body);
			});
		}).on('error',(error) => {
			reject(error);
		});
	});
}
