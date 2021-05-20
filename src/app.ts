import { pollingAsync } from "./pollingJma";
import "./utils/env";
import { CronJob } from "cron";
import config from "config";


const settingsInfo: any = config.get("Settings");
const slackInfo: any = config.get("Slack");
const eqvolURL: string = settingsInfo.EqvolURL;
const stateGeneralCacheFile: string = settingsInfo.StateGeneralFileName;
const stateEvolCacheFile: string = settingsInfo.StateEvolFileName;

console.log('Slack notify: ' + slackInfo.notify.webhook + ' at ' + slackInfo.notify.channel);
console.log('Slack error : ' + slackInfo.error.webhook + ' at ' + slackInfo.error.channel);
console.log('state Evol file : ' + settingsInfo.StateEvolFileName);

const cronJob = new CronJob('21 * * * * *', async () =>{await pollingAsync(eqvolURL, stateEvolCacheFile)});
if (!cronJob.running) {
    cronJob.start();
}
