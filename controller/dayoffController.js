var GoogleSpreadsheet = require('google-spreadsheet');
var creds = require('../config/client_secret.json');
const { promisify } = require('util');
const sheet_api = require('../config/googlesheet_api');

//API ค้นหาวันหยุดประจำปีทั้งหมด
async function quryAllDayOff(req, res){
    const doc = new GoogleSpreadsheet(sheet_api.sheetId);
    await promisify(doc.useServiceAccountAuth)(creds);
    const info = await promisify(doc.getInfo)();
    const sheet = info.worksheets[sheet_api.indexSheetCompanyDayoff];

    let nowDate = new Date();
    let listDate = [];

    const row = await promisify(sheet.getRows)({
        offset: 1
    });

    row.forEach(data => {
        if(data.enddate !== ""){
            //หยุดติดกันหลายวัน
            let dataEnd = new Date(data.enddate);
            if(nowDate <= dataEnd){
                let dataDayOff1 = {
                    status : 'Many days',
                    startdate : data.startdate,
                    enddate : data.enddate,
                    description : data.description
                }
                listDate.push(dataDayOff1)
            }
        }else{
            //หยุดวันเดียว
            let dateStart = new Date(data.startdate);
            if(nowDate <= dateStart){
                let dataDayOff2 = {
                    status : 'One day',
                    startdate : data.startdate,
                    enddate : data.enddate,
                    description : data.description
                }
                listDate.push(dataDayOff2)
            }
        }
    });
    res.send(JSON.stringify(listDate))
}

//API ค้นหาวันหยุดประจำปีทั้งหมด
async function quryAllDayOffForcalendar(req, res){
    const doc = new GoogleSpreadsheet(sheet_api.sheetId);
    await promisify(doc.useServiceAccountAuth)(creds);
    const info = await promisify(doc.getInfo)();
    const sheet = info.worksheets[sheet_api.indexSheetCompanyDayoff];

    let nowDate = new Date();
    let listDate = [];

    const row = await promisify(sheet.getRows)({
        offset: 1
    });

    row.forEach(data => {
        if(data.enddate !== ""){
            //หยุดติดกันหลายวัน
            let dateStart = new Date(data.startdate)
            let dateEnd = new Date(data.enddate)
            let date2 = new Date(Date.UTC(dateStart.getFullYear(), dateStart.getMonth(), dateStart.getDate(), 0, 0, 0));
            let date3 = new Date(Date.UTC(dateEnd.getFullYear(), dateEnd.getMonth(), dateEnd.getDate(), 23, 59, 59));
            let dataDayOff1 = {
                id : 'HD',
                startdate : date2,
                enddate : date3,
                title : data.description,
                leave : null
            }
            listDate.push(dataDayOff1)
        }else{
            //หยุดวันเดียว
            let date1 = new Date(data.startdate)
            let date2 = new Date(Date.UTC(date1.getFullYear(), date1.getMonth(), date1.getDate(), 0, 0, 0));
            let date3 = new Date(Date.UTC(date1.getFullYear(), date1.getMonth(), date1.getDate(), 23, 59, 59));
            let dataDayOff2 = {
                id : 'HD',
                startdate : date2,
                enddate : date3,
                title : data.description,
                leave : null
            }
            listDate.push(dataDayOff2)
        }
    });
    return listDate
}

module.exports = {
    quryAllDayOff,
    quryAllDayOffForcalendar
};