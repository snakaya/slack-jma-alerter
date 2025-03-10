import { processEntryAsync } from "./parseEntries";
import fs from 'fs';
import util from 'util';
import http from 'http';
import { App, LogLevel } from "@slack/bolt";

const app = new App({
    token: process.env.SLACK_BOT_TOKEN,
    signingSecret: process.env.SLACK_SIGNING_SECRET,
    logLevel: LogLevel.DEBUG
});

const xmlparseAsync = util.promisify(require('xml2js').parseString);
const readFileAsync = util.promisify(fs.readFileSync);
const writeFileAsync = util.promisify(fs.writeFileSync);


export const pollingAsync = async (feedURL: string, stateCacheFile: string): Promise<void> => {

	let lastModified:Date, currentLastEntries:any;
	
	try{
		const currentStateJSON = fs.readFileSync(stateCacheFile,'utf-8');
		const currentState = await JSON.parse(currentStateJSON);
		
		lastModified = new Date(currentState.lastModified);
		currentLastEntries = currentState.entry;
		
	}catch(e){
		console.log("STATE:" + e);
	}

	let data:any, body:any;
	try{
		const result:any = await getFeedAsync(feedURL, lastModified);
		if(result.data === null){
			// no data.
			return;
		}
		data = result.data;
		body = result.body;
		lastModified = result.lastModified;
	}catch(e){
		console.log("HTTP:" + e);
		return;
	}
	
	console.log((new Date()).toString() + ": FeedLastModified: " + lastModified.toString());
	
	let newLastEntries:JmaEntries;
	try{
		newLastEntries = filterFeedEntries(data, currentLastEntries);
	}catch(e){
		console.error("FEED:" + e);
		fs.writeFileSync("parseError." + Date.now() + ".xml", body);
		return;
	}
	
	const json = JSON.stringify({ "entry": newLastEntries, "lastModified": lastModified});
	
	try{
		fs.writeFileSync(stateCacheFile, json);
	}catch(e){
		console.log(e);
	}
	
	console.log((new Date()).toString() + ": BEGIN");
    for(const entry of data.feed.entry){
	    await processEntryAsync(entry).then((message:any) => {
            console.log('message:' + util.inspect(message,{ showHidden: true, depth: null }));
            if(message){

                try{
                    message.token = process.env.SLACK_BOT_TOKEN;
                    console.log('message:' + util.inspect(message,{ showHidden: true, depth: null }));
                    const result = app.client.chat.postMessage(message);
                }catch(error){
                    if(error instanceof Error){
                        console.log('http posting error:%s\n%s',error.message,error.stack);
                    }else{
                        console.log('http posting error:%s',error);
                    }
                }
                
            }else{
                console.log('deprecaetd');
            }
        }).catch((reason:any) => {
            console.log('postMessage Error:' + reason);
        });
    }
	console.log((new Date()).toString() + ": END");

}

function filterFeedEntries(data:any, currentLastEntries:any) {
	let newLastEntries: JmaEntries = {};
	let filteredEntries = [];
	
	for(let entry of data.feed.entry.reverse()){
		const href = entry.link.$.href;
		
		newLastEntries[href] = 1;
		if(currentLastEntries != null && !(href in currentLastEntries)){
			filteredEntries.push(entry);
		}
	}
	
	data.feed.entry = filteredEntries;
	return newLastEntries;
}

function getFeedAsync(uri:string, ifModifiedSince:Date) {
	return new Promise((resolve, reject) => {
		let req_headers:{[name:string]: string} = {};
		if(ifModifiedSince != null){
			req_headers['if-modified-since'] = ifModifiedSince.toUTCString();
		}
		const options: http.RequestOptions = {
			method: 'GET',
			headers: req_headers
		};
		
		const req = http.request(uri, options,(res) => {

			if(res.statusCode == 304){
				resolve({
					'lastModified' : ifModifiedSince,
					'data' : null,
					'body' : null
				});
				return;
				
			}else if(res.statusCode != 200){
			
				reject(new Error('statusCode=' + res.statusCode));
				return;
				
			}
			
			let body = '';
			res.setEncoding('utf8');
			res.on('data', (chunk) => {
				body += chunk;
			});
			
			res.on('end', async () => {
				try{
					const obj = await xmlparseAsync(body, {trim: true, explicitArray: false} );
					resolve({
						'lastModified' : new Date(res.headers['last-modified']),
						'data' : obj,
						'body': body
					});
				}catch(error){
					try{
						fs.writeFileSync("xmlError." + Date.now() + ".xml", body);
					}catch(e){
						console.log("Cannot save Error XML" + e);
					}
					reject(error);
				}
			});
		}).on('error',(error) => {
			reject(error);
		});
		
		req.end();
	});
}