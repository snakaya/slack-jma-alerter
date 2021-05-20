import { processEvolSummary, processEvolEpicenter, processEvolDetail } from "./evolAttach";
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
				console.log('message:' + util.inspect(message,{ showHidden: true, depth: null }));
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
		if(settingsInfo.AlertEvolTitleType.includes(title)) {
			switch(title){
				case '震度速報':
					return processEvolSummary(object);
				case '震源に関する情報':
					return processEvolEpicenter(object);
				case '震源・震度情報':
					return processEvolDetail(object);
				default:
					console.log('unknown evol title:'+title);
					return null;
			}
		}
	} else {
		return null;
	}
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
