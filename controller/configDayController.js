var GoogleSpreadsheet = require('google-spreadsheet');
var creds = require('../config/client_secret.json');
const { promisify } = require('util');
const sheet_api = require('../config/googlesheet_api');

//API ค้นหาช่วงเวลาการลาล่วงหน้า
async function queryConfigDay(req, res){
    const doc = new GoogleSpreadsheet(sheet_api.sheetId);
    await promisify(doc.useServiceAccountAuth)(creds);
    const info = await promisify(doc.getInfo)();
    const sheet = info.worksheets[sheet_api.indexSheetConfigDay];
    const rowDatas = await promisify(sheet.getRows)({
        offset : 1
    });

    let listData = rowDatas.map((res) => {
        return {
            day : Number(res.day),
            status : res.description
        }
    });
    res.send(JSON.stringify(listData));
}

module.exports = {
    queryConfigDay
};