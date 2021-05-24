import * as util from 'util';
import config from "config";

const settingsInfo: any = config.get("Settings");

// 気象特別警報・警報・注意報 (警報のみ対象)
export const processWeatherAlert = (object:any) => {
    const attachment_fieild:Array<SlackAttachmentFields> = [];
    const infos:Array<any> = Array.isArray(object.Report.Head.Headline.Information) ?
        object.Report.Head.Headline.Information :
		[object.Report.Head.Headline.Information];
    
    for(let info of infos) {
        try{
            const items:Array<any> = Array.isArray(info?.Item) ? info?.Item : [info?.Item];
            items.forEach((item:any) => {
                const match_kind:Array<string> = [];
                if(item?.Areas !== undefined){
                    if(settingsInfo.AlertWeatherPrefecturesType.includes(item.Areas.Area.Name)){
                        if(item?.Kind !== undefined) {
                            const kinds:Array<any> = Array.isArray(item?.Kind) ? item?.Kind : [item?.Kind];
                            kinds.forEach((kind:any) => {
                                /*
                                http://xml.kishou.go.jp/jmaxml_20210310_code.xls
                                1:記録的短時間大雨情報
                                02:暴風雪警報, 03:大雨警報, 04:洪水警報, 05:暴風警報, 06:大雪警報, 07:波浪警報, 08:高潮警報
                                32:暴風雪特別警報, 33:大雨特別警報, 35:暴風特別警報, 36:大雪特別警報, 37:波浪特別警報, 38:高潮特別警報	
                                */
                                if(kind.Code !== undefined){
                                    if(settingsInfo.AlertWeatherCodeType.includes(kind.Code)){
                                        match_kind.push(kind.Name);
                                    }
                                }
                            });
                        }
                        if(match_kind.length > 0) {
                            attachment_fieild.push({
                                'title' : item.Areas.Area.Name,
                                'value' : match_kind.join()
                            });
                        }
                    }
                }
            });
        }catch(error){
            console.log(error);
            continue;
        };
    };
    if(attachment_fieild.length > 0){
        const attachement:SlackAttachment = makeAttachment(object);

        attachment_fieild.forEach((item:SlackAttachmentFields) => {
            attachement.fields.push(item);
        });

        return attachement;
    }
	return null;
}

// Slackメッセージアタッチメントを作成
function makeAttachment(object:any){
    const fields:Array<SlackAttachmentFields> = new Array();
    const actions:Array<SlackAttachmentAction> = new Array();
	const attachement:SlackAttachment = {
        footer: '',
        ts: 0,
        fields: fields,
        actions: actions,
        image_url: ''
    };
	attachement.footer= object.Report.Control.EditorialOffice as string;
	
	const reportDate = new Date(object.Report.Head.ReportDateTime);
	attachement.ts = parseInt(String(reportDate.getTime()/1000));
	
	//const targetDate = (object.Report.Body.Earthquake) ?
	//	new Date(object.Report.Body.Earthquake.OriginTime) : 
	//	new Date(object.Report.Head.TargetDateTime);
	
    //attachement.fields = [];
	
	return attachement;
}
