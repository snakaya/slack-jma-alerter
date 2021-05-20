import * as util from 'util';


// 震度速報
export const processEvolSummary = (object:any) => {
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
export const processEvolEpicenter = (object:any) => {
	const message = makeAttachment(object);
	
	loadEpicenter(message,object);
	
	return  makeSlackMessage(message,object);
}

// 震源・震度に関する情報
export const processEvolDetail = (object:any) => {
	const attachement = makeAttachment(object);
	//console.log('object:'+util.inspect(object,{ showHidden: true, depth: null }));
	
	loadEpicenter(attachement, object);
	loadIntensity(attachement, object);
	
	return makeSlackMessage(attachement,object);
	//console.log('message:'+util.inspect(msg,{ showHidden: true, depth: null }));
}


// Slackメッセージ概要を作成
function makeSlackMessage(attachement:any, object:any){

	const msgType = object.Report.Control.Status === '通常' ? '[' + object.Report.Head.Title + '] ' : '(' + object.Report.Control.Status + ')';
	return {
		'text'        : msgType + object.Report.Head.Headline.Text,
		'attachments' : Array.isArray(attachement) ? attachement : [attachement] ,
	};
}

// Slackメッセージアタッチメントを作成
function makeAttachment(object:any){
	const attachement:any = {};
	attachement.footer= object.Report.Control.EditorialOffice;
	
	const reportDate = new Date(object.Report.Head.ReportDateTime);
	attachement.ts = parseInt(String(reportDate.getTime()/1000));
	
	const targetDate = (object.Report.Body.Earthquake) ?
		new Date(object.Report.Body.Earthquake.OriginTime) : 
		new Date(object.Report.Head.TargetDateTime);
	
    attachement.fields = [];
	attachement.fields.push({
		'title' : '発生時刻',
		'value' : targetDate.toString()
	});
	
	attachement.actions = [{
		'type' : 'button',
		'text' : 'Yahoo!',
		'url'  : util.format('https://typhoon.yahoo.co.jp/weather/jp/earthquake/%s.html',object.Report.Head.EventID)
	},{
		'type' : 'button',
		'text' : 'tenki.jp',
		'url'  : util.format('http://bousai.tenki.jp/bousai/earthquake/detail-%s.html',object.Report.Head.EventID)
	}];
	
	attachement.image_url = getTenkiJpMapImageURI(object.Report.Head.EventID);
	
	return attachement;
}

// 震源情報の読み込み
function loadEpicenter(attachement:any, object:any)
{
	const info = object.Report.Body.Earthquake;
	
	// 座標はISO6709形式 
	const re= /([+-][\d\.]+?)([+-][\d\.]+?)([+-][\d\.]+?)\//;
	const pos = re.exec(info.Hypocenter.Area['jmx_eb:Coordinate']._);
	const link = util.format('https://www.google.com/maps?q=%s,%s',pos[1],pos[2]);
	
	attachement.fields.push({
		'title' : '震源',
		'value' : util.format('%s\n<%s|%s>',
			info.Hypocenter.Area.Name,
			link,
			info.Hypocenter.Area['jmx_eb:Coordinate'].$.description,
		),
	});

	attachement.fields.push({
		'title' : 'マグニチュード',
		'value' : info['jmx_eb:Magnitude']._,
	});
}

// 震度詳細の読み込み
function loadIntensity(attachement:any, object:any)
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
	
	attachement.fields.push({
		'title' : '各地の震度',
		'value' : intencityInfo.join('\n'),
	});
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