import { processEvolSummary, processEvolEpicenter, processEvolDetail } from "../src/evolAttach";
import xml2js from 'xml2js';
import fs from 'fs';
import util from 'util';


describe('processEvolSummary', (): void => {
    test('processEvolSummary Evol Normal (Summary)', (): void => {
        const testXml = fs.readFileSync('./tests/data/evol_normal_summary.xml','utf-8');
        xml2js.parseString(testXml, {trim: true, explicitArray: false}, (err, result) => {
            if(!err){
                //console.log(util.inspect(result,{ showHidden: true, depth: null }));
                const response: any = processEvolSummary(result);
                console.log(response);
                expect(response).not.toBeNull();
                expect(response.footer === '大阪管区気象台').toBe(true);
                expect(response.ts === 1621797120).toBe(true);
                expect(response.fields.length === 2).toBe(true);
                expect(response.fields[0].title === '発生時刻').toBe(true);
                expect(response.fields[0].value === 'Mon May 24 2021 04:09:00 GMT+0900 (日本標準時)').toBe(true);
                expect(response.fields[1].title === '震度３').toBe(true);
                expect(response.fields[1].value === '茨城県南部').toBe(true);
                expect(response.actions.length === 2).toBe(true);
                expect(response.actions[0].type === 'button').toBe(true);
                expect(response.actions[0].text === 'Yahoo!').toBe(true);
                expect(response.actions[0].url === 'https://typhoon.yahoo.co.jp/weather/jp/earthquake/20210524040927.html').toBe(true);
                expect(response.actions[1].type === 'button').toBe(true);
                expect(response.actions[1].text === 'tenki.jp').toBe(true);
                expect(response.actions[1].url === 'http://bousai.tenki.jp/bousai/earthquake/detail-20210524040927.html').toBe(true);
                expect(response.image_url === 'https://earthquake.tenki.jp/static-images/earthquake/detail/2021/05/24/2021-05-24-04-09-27-large.jpg').toBe(true);
            }
        });
    });
    test('processEvolSummary Evol Normal (EpiCenter)', (): void => {
        const testXml = fs.readFileSync('./tests/data/evol_normal_epicenter.xml','utf-8');
        xml2js.parseString(testXml, {trim: true, explicitArray: false}, (err, result) => {
            if(!err){
                //console.log(util.inspect(result,{ showHidden: true, depth: null }));
                const response: any = processEvolEpicenter(result);
                console.log(response);
                expect(response).not.toBeNull();
                expect(response.footer === '気象庁本庁').toBe(true);
                expect(response.ts === 1621797120).toBe(true);
                expect(response.fields.length === 3).toBe(true);
                expect(response.fields[0].title === '発生時刻').toBe(true);
                expect(response.fields[0].value === 'Mon May 24 2021 04:09:00 GMT+0900 (日本標準時)').toBe(true);
                expect(response.fields[1].title === '震源').toBe(true);
                expect(response.fields[1].value === '茨城県南部\n' + '<https://www.google.com/maps?q=+35.9,+140.1|北緯３５．９度　東経１４０．１度　深さ　６０ｋｍ>').toBe(true);
                expect(response.fields[2].title === 'マグニチュード').toBe(true);
                expect(response.fields[2].value === '4.3').toBe(true);
            }
        });
    });
    test('processEvolSummary Evol Normal (Detail)', (): void => {
        const testXml = fs.readFileSync('./tests/data/evol_normal_detail.xml','utf-8');
        xml2js.parseString(testXml, {trim: true, explicitArray: false}, (err, result) => {
            if(!err){
                //console.log(util.inspect(result,{ showHidden: true, depth: null }));
                const response: any = processEvolDetail(result);
                console.log(response);
                expect(response).not.toBeNull();
                expect(response.footer === '気象庁本庁').toBe(true);
                expect(response.ts === 1621797180).toBe(true);
                expect(response.fields.length === 4).toBe(true);
                expect(response.fields[0].title === '発生時刻').toBe(true);
                expect(response.fields[0].value === 'Mon May 24 2021 04:09:00 GMT+0900 (日本標準時)').toBe(true);
                expect(response.fields[1].title === '震源').toBe(true);
                expect(response.fields[1].value === '茨城県南部\n' + '<https://www.google.com/maps?q=+35.9,+140.1|北緯３５．９度　東経１４０．１度　深さ　６０ｋｍ>').toBe(true);
                expect(response.fields[2].title === 'マグニチュード').toBe(true);
                expect(response.fields[2].value === '4.3').toBe(true);
                expect(response.fields[3].title === '各地の震度').toBe(true);
                expect(response.fields[3].value === '*茨城県*:南部(最大震度 3),北部(最大震度 2)\n' +
                                                    '*栃木県*:北部(最大震度 2),南部(最大震度 2)\n' +
                                                    '*群馬県*:南部(最大震度 2),北部(最大震度 1)\n' +
                                                    '*埼玉県*:北部(最大震度 2),南部(最大震度 2)\n' +
                                                    '*千葉県*:北西部(最大震度 2),北東部(最大震度 1),南部(最大震度 1)\n' +
                                                    '*東京都*:２３区(最大震度 2),多摩東部(最大震度 2),多摩西部(最大震度 1)\n' +
                                                    '*神奈川県*:東部(最大震度 2),西部(最大震度 1)\n' +
                                                    '*福島県*:中通り(最大震度 1)\n' +
                                                    '*山梨県*:中・西部(最大震度 1),東部・富士五湖(最大震度 1)\n' +
                                                    '*静岡県*:伊豆(最大震度 1)').toBe(true);
                expect(response.actions.length === 2).toBe(true);
                expect(response.actions[0].type === 'button').toBe(true);
                expect(response.actions[0].text === 'Yahoo!').toBe(true);
                expect(response.actions[0].url === 'https://typhoon.yahoo.co.jp/weather/jp/earthquake/20210524040927.html').toBe(true);
                expect(response.actions[1].type === 'button').toBe(true);
                expect(response.actions[1].text === 'tenki.jp').toBe(true);
                expect(response.actions[1].url === 'http://bousai.tenki.jp/bousai/earthquake/detail-20210524040927.html').toBe(true);
                expect(response.image_url === 'https://earthquake.tenki.jp/static-images/earthquake/detail/2021/05/24/2021-05-24-04-09-27-large.jpg').toBe(true);
            }
        });
    });
});