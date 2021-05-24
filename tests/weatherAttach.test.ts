import { processWeatherAlert } from "../src/weatherAttach";
import xml2js from 'xml2js';
import fs from 'fs';
import util from 'util';

describe('processWeatherAlert', (): void => {
    test('processWeatherAlert Weather Normal', (): void => {
        const testXml = fs.readFileSync('./tests/data/weather_normal_test1.xml','utf-8');
        xml2js.parseString(testXml, {trim: true, explicitArray: false}, (err, result) => {
            if(!err){
                //console.log(util.inspect(result,{ showHidden: true, depth: null }));
                const response: any = processWeatherAlert(result);
                console.log(response);
                expect(response).not.toBeNull();
                expect(response.footer === '京都地方気象台').toBe(true);
                expect(response.ts === 1621531980).toBe(true);
                expect(response.fields.length === 1).toBe(true);
                expect(response.fields[0].title === '京都府').toBe(true);
                expect(response.fields[0].value === '大雨警報,洪水警報').toBe(true);
            }
        });
    });
    test('processWeatherAlert Weather Normal(no Code, no Areas, no Area, no AreaName)', (): void => {
        const testXml = fs.readFileSync('./tests/data/weather_normal_test2.xml','utf-8');
        xml2js.parseString(testXml, {trim: true, explicitArray: false}, (err, result) => {
            if(!err){
                //console.log(util.inspect(result,{ showHidden: true, depth: null }));
                const response: any = processWeatherAlert(result);
                console.log(response);
                expect(response).not.toBeNull();
                expect(response.footer === '京都地方気象台').toBe(true);
                expect(response.ts === 1621531980).toBe(true);
                expect(response.fields.length === 1).toBe(true);
                expect(response.fields[0].title === '京都府').toBe(true);
                expect(response.fields[0].value === '大雨警報,洪水警報').toBe(true);
            }
        });
    });
    test('processWeatherAlert Weather notMatch Prefecture', (): void => {
        const testXml = fs.readFileSync('./tests/data/weather_error_no_prefecture.xml','utf-8');
        xml2js.parseString(testXml, {trim: true, explicitArray: false}, (err, result) => {
            if(!err){
                //console.log(util.inspect(result,{ showHidden: true, depth: null }));
                const response = processWeatherAlert(result);
                console.log(response);
                expect(response).toBeNull();
            }
        });
    });
    test('processWeatherAlert Weather notMatch Code', (): void => {
        const testXml = fs.readFileSync('./tests/data/weather_error_no_code.xml','utf-8');
        xml2js.parseString(testXml, {trim: true, explicitArray: false}, (err, result) => {
            if(!err){
                //console.log(util.inspect(result,{ showHidden: true, depth: null }));
                const response = processWeatherAlert(result);
                console.log(response);
                expect(response).toBeNull();
            }
        });
    });
})
