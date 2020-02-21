var GoogleSpreadsheet = require('google-spreadsheet');
var creds = require('../config/client_secret.json');
const { promisify } = require('util');
const sheet_api = require('../config/googlesheet_api');

//API ค้นหาวันหยุดสุดสัปดาห์ทั้งหมด
async function queryAllWeekend(req, res){
    const doc = new GoogleSpreadsheet(sheet_api.sheetId);
    await promisify(doc.useServiceAccountAuth)(creds);
    const info = await promisify(doc.getInfo)();
    const sheet = info.worksheets[sheet_api.indexSheetWeekend];
    const rowDatas = await promisify(sheet.getRows)({
        offset : 1
    });

    let listData = rowDatas.map((res) => {
        return {
            day : res.day,
            status : res.status,
            weekday : res.weekday,
        }
    });
    res.send(JSON.stringify(listData));
}

module.exports = {
    queryAllWeekend
};