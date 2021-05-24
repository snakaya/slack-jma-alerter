import { pollingAsync } from "./pollingJma";
import "./utils/env";
import { CronJob } from "cron";
import config from "config";


const settingsInfo: any = config.get("Settings");
const slackInfo: any = config.get("Slack");
const weatherURL: string = settingsInfo.WeatherURL;
const eqvolURL: string = settingsInfo.EqvolURL;
const stateWeatherCacheFile: string = settingsInfo.StateWeatherFileName;
const stateEvolCacheFile: string = settingsInfo.StateEvolFileName;

console.log('Slack notify: ' + slackInfo.notify.webhook + ' at ' + slackInfo.notify.channel);
console.log('Slack error : ' + slackInfo.error.webhook + ' at ' + slackInfo.error.channel);
console.log('state Weather file : ' + settingsInfo.StateWeatherFileName);
console.log('state Evol file    : ' + settingsInfo.StateEvolFileName);

const evolCronJob = new CronJob('*/1 * * * * *', async () =>{await pollingAsync(eqvolURL, stateEvolCacheFile)});
if (!evolCronJob.running) {
    evolCronJob.start();
}

const weatherCronJob = new CronJob('*/5 * * * *', async () =>{await pollingAsync(weatherURL, stateWeatherCacheFile)});
if (!weatherCronJob.running) {
    weatherCronJob.start();
}