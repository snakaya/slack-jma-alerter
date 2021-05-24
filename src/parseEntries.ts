import { processWeatherAlert } from "./weatherAttach";
import { processEvolSummary, processEvolEpicenter, processEvolDetail } from "./evolAttach";
import * as util from 'util';
import * as http from 'http';
import config from "config";

const settingsInfo: any = config.get("Settings");
const slackInfo: any = config.get("Slack");
const xmlparseAsync = util.promisify(require('xml2js').parseString);

// feedされたエントリを処理
export const processEntryAsync = async (entry:any) => {
    return new Promise(async (resolve, reject) => {
		const message:SlackMessage = await loadXmlAsync(entry.link.$.href as string);
        //console.log('message:' + util.inspect(message,{ showHidden: true, depth: null }));
        resolve(message);
	});
}

// XMLを読み込んでSlackメッセージオブジェクトを作る
function loadXmlAsync(uri:string):Promise<SlackMessage> {
	return new Promise(async (resolve, reject) => {
		
		let body:any, xmlobj:any;
        let message:SlackMessage = initialSlackMessage();
		try{
			body = await getEntryAsync(uri);
		}catch(error){
			if(error instanceof Error){
				message.text = util.format('cannot load XML "%s"\nError:%s\nTrace:%s',uri,error.message,error.stack);
			}else{
				message.text = util.format('cannot load XML "%s"\n%s',uri,error);
			}
			message.webhook = slackInfo.error.webhook;
			message.channel = slackInfo.error.channel;
			resolve(message);
			return;
		}
		
		try{
			xmlobj = await xmlparseAsync(body, {trim: true, explicitArray: false }) as any;
			let attachment:SlackAttachment = processObject(xmlobj);
			if(attachment){
				message = makeSlackMessage(attachment, xmlobj);
				if(message){
					message.webhook = slackInfo.notify.webhook;
					message.channel = slackInfo.notify.channel;
				}
			}
		}catch(error){
			const dump = util.inspect(xmlobj,{ showHidden: true, depth: null });
			if(error instanceof Error){
                
				//message = {'text' : util.format('cannot parse XML "%s"\nError:%s\nTrace:%s\n%s',uri,error.message,error.stack,dump)};
				message.text = util.format('cannot parse XML "%s"\nError:%s\nTrace:%s\n',uri,error.message,error.stack);
			}else{
				//message = {'text' : util.format('cannot parse XML "%s"\n%s\n%s',uri,error,dump)};
				message.text = util.format('cannot parse XML "%s"\n%s\n',uri,error);
			}
			message.webhook = slackInfo.error.webhook;
			message.channel = slackInfo.error.channel;
		}

		resolve(message);
	});
}

// メッセージ種別に応じた処理を呼ぶ
function processObject(object:any){
	let title = object && object.Report && object.Report.Head && object.Report.Head.Title;
	if(title){
        // TODO: '震源に関する情報'にはMaxIntが無いので震度で判定できず結果出力されない
		if(object && object.Report && object.Report.Body && object.Report.Body.Intensity && object.Report.Body.Intensity.Observation && object.Report.Body.Intensity.Observation.MaxInt &&
			settingsInfo.AlertIntensityType.includes(object.Report.Body.Intensity.Observation.MaxInt)) {
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
				}
			}
		}
		title = object && object.Report && object.Report.Control && object.Report.Control.Title;
		if(settingsInfo.AlertWeatherTitleType.includes(title)) {
			switch(title){
				case '気象特別警報・警報・注意報':
					return processWeatherAlert(object);
				case '記録的短時間大雨情報':
					return processWeatherAlert(object);
				default:
					console.log('unknown weather title:'+title);
					
			}
		}
		return null;
	} else {
		return null;
	}
}

// Slackメッセージ概要を作成
function makeSlackMessage(attachement:any, object:any):SlackMessage {

	const msgType = object.Report.Control.Status === '通常' ? '[' + object.Report.Head.Title + '] ' : '[' + object.Report.Control.Status + ']';
	return {
		'text'        : msgType + object.Report.Head.Headline.Text,
		'attachments' : Array.isArray(attachement) ? attachement : [attachement] ,
        'webhook'     : '',
        'channel'     : ''
	};
}

function initialSlackMessage():SlackMessage  {
    return {
		'text'        : '',
        'webhook'     : '',
        'channel'     : ''
	};
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
