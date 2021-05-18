import { processEntriesAsync } from "./parseEntries";
import fs from 'fs';
import util from 'util';
import http from 'http';
import config from "config";

interface JmaEntries {
	[href: string]: number;
}

const xmlparseAsync = util.promisify(require('xml2js').parseString);
const readFileAsync = util.promisify(fs.readFileSync);
const writeFileAsync = util.promisify(fs.writeFileSync);


export const pollingAsync = async (eqvolURL: string, stateCacheFile: string): Promise<void> => {

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
		const result:any = await getFeedAsync(eqvolURL, lastModified);
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
	await processEntriesAsync(data.feed.entry);
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