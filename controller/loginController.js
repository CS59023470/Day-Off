var GoogleSpreadsheet = require('google-spreadsheet');
var creds = require('../config/client_secret.json');
const { promisify } = require('util');
const sheet_api = require('../config/googlesheet_api');
const custom = require('./customDataController');

//API สำหรับตรวจสอบสถานะผู้เข้าใช้งาน
async function checkUserLogin(req, res){
    const doc = new GoogleSpreadsheet(sheet_api.sheetId);
    await promisify(doc.useServiceAccountAuth)(creds);
    const info = await promisify(doc.getInfo)();
    const sheet = info.worksheets[sheet_api.indexSheetUser];

    let qu = "email = "+'"'+req.params.email+'"'  

    const rowUsers = await promisify(sheet.getRows)({
        query : qu
    });

    if(rowUsers.length > 0){
        let userlogin = rowUsers.map((res) => {
            return {
                userId : res.userid,
                position : res.position,
                statusUser : custom.createStatusUserToString(res.userstatus),
                statusWorking : custom.createStatusWorkingToString(res.workingstatus),
                statusActive : custom.createStatusActiveToString(res.activestatus),
                manager : res.manager
            }
        });

        if(userlogin[0].statusActive !== 'active'){
            //สถานนะเข้าใช้ไม่ได้ชั่วคราว
            res.send('Not_Active');
        }else{
            //เข้าใช้ได้
            res.send(JSON.stringify(userlogin));
        }
    }else{
        res.send('Not_Found');
    }
}

module.exports = {
    checkUserLogin
};