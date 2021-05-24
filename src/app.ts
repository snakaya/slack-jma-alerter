import { pollingAsync } from "./pollingJma";
import "./utils/env";
import { CronJob } from "cron";
import config from "config";
import os from 'os';
import path from 'path';

const settingsInfo: any = config.get("Settings");
const slackInfo: any = config.get("Slack");
const weatherURL: string = settingsInfo.WeatherURL;
const eqvolURL: string = settingsInfo.EqvolURL;
console.log(path.dirname(settingsInfo.StateWeatherFileName as string));
const stateWeatherCacheFile: string = (path.dirname(settingsInfo.StateWeatherFileName as string) == '.') ? os.tmpdir() + path.sep + settingsInfo.StateWeatherFileName : settingsInfo.StateWeatherFileName;
const stateEvolCacheFile: string = (path.dirname(settingsInfo.StateEvolFileName as string) == '.') ? os.tmpdir() + path.sep + settingsInfo.StateEvolFileName : settingsInfo.StateEvolFileName;

console.log('Slack notify: ' + slackInfo.notify.webhook + ' at ' + slackInfo.notify.channel);
console.log('Slack error : ' + slackInfo.error.webhook + ' at ' + slackInfo.error.channel);
console.log('state Weather file : ' + stateWeatherCacheFile);
console.log('state Evol file    : ' + stateEvolCacheFile);

const evolCronJob = new CronJob('*/1 * * * * *', async () =>{await pollingAsync(eqvolURL, stateEvolCacheFile)});
if (!evolCronJob.running) {
    evolCronJob.start();
}

const weatherCronJob = new CronJob('*/5 * * * *', async () =>{await pollingAsync(weatherURL, stateWeatherCacheFile)});
if (!weatherCronJob.running) {
    weatherCronJob.start();
}