var GoogleSpreadsheet = require('google-spreadsheet');
var creds = require('../config/client_secret.json');
const { promisify } = require('util');
const sheet_api = require('../config/googlesheet_api');
const user_api = require('./userController');
const custom = require('./customDataController');

//API ค้นหาและลบรายการชดเชยวันหยุดที่เลยกำหนดมาแล้ว
async function queryUserSpecialHolidayById(req, res) {
    const doc = new GoogleSpreadsheet(sheet_api.sheetId);
    await promisify(doc.useServiceAccountAuth)(creds);
    const info = await promisify(doc.getInfo)();
    const sheet = info.worksheets[sheet_api.indexSheetCompensationDay];

    const rowDatas = await promisify(sheet.getRows)({
        query: 'userid = ' + req.body.data.userid
    });


    let data_remove = await checkExpDateEnd(rowDatas)
    if (data_remove.length > 0) {
        data_remove.forEach(async (row_remove, i) => {
            await rowDatas[row_remove.index].del();
            if (i === (data_remove.length - 1)) {

                if (data_remove.length <= 10) {
                    setTimeout(async function () {
                        let result = await user_api.updateHolidayUserById(req.body.data.userid, data_remove.length)
                        res.send(JSON.stringify(result))
                    }, 1000);
                } else {
                    setTimeout(async function () {
                        let result = await user_api.updateHolidayUserById(req.body.data.userid, data_remove.length)
                        res.send(JSON.stringify(result))
                    }, 3000);
                }
            }
        })
    } else {
        res.send(JSON.stringify(true))
    }
}

function checkExpDateEnd(rowDatas) {
    //คัดเอาแถวที่ต้องลบ และ index
    let row_remove = []
    rowDatas.forEach((data, i) => {
        if (new Date(data.enddate) < new Date()) {
            let model = {
                index: i,
                data_remove: data
            }
            row_remove.push(model)
        }else if (data.amountday <= 0) {
            let model = {
                index: i,
                data_remove: data
            }
            row_remove.push(model)
        }
    })
    return row_remove
}

//API Decrease the amount when request is approved(or sick leave).
async function decreaseAmountDay(rowDatas) {
   
    const doc = new GoogleSpreadsheet(sheet_api.sheetId);
    await promisify(doc.useServiceAccountAuth)(creds);
    const info = await promisify(doc.getInfo)();
    const sheet = info.worksheets[sheet_api.indexSheetCompensationDay];

    const userid = rowDatas.idemployee;
    let useSpeicalHoliday = rowDatas.usecompensationday;
    // console.log("-----------", rowDatas);
    // console.log("userid", userid);
    const row = await promisify(sheet.getRows)({
        query: 'userid = ' + userid,
        orderby: 'enddate'
    });

    // If the user didn't use special holiday, don't do anything.
    if (useSpeicalHoliday == 0) return;

    // If the user did use special holiday, check the special holiday and decrease amount.
    let total = 0;
    row.forEach(ele => {
        total += Number(ele.amountday);
    });

    let flag = 0;

    for (let i = 0; i < row.length; i++) {
        flag = Number(total) - Number(useSpeicalHoliday)
        if (flag >= 0) {
            if (row[i].amountday >= useSpeicalHoliday) {
                row[i].amountday = row[i].amountday - useSpeicalHoliday;
                row[i].save();
                return;
            } else {
                total = total - row[i].amountday;
                useSpeicalHoliday = useSpeicalHoliday - row[i].amountday;
                row[i].amountday = 0;
                row[i].save();
            }

        } else {
            row[i].amountday = 0
            useSpeicalHoliday = useSpeicalHoliday - row[i].amountday;
            row[i].save();
        }
    }
}

// Add Compensate Day
async function addCompensateDay(req, res) {
    const doc = new GoogleSpreadsheet(sheet_api.sheetId);
    await promisify(doc.useServiceAccountAuth)(creds);
    const info = await promisify(doc.getInfo)();
    const sheet = info.worksheets[sheet_api.indexSheetCompensationDay];
    const sheetUser = info.worksheets[sheet_api.indexSheetUser];
    

    let rowData = {
        rowid: await custom.createRowId(),
        userid: req.body.data.userid,
        startdate: req.body.data.startdate,
        enddate: req.body.data.enddate,
        amountday: req.body.data.amountday
    }

    const rowUser = await promisify(sheetUser.getRows)({
        query: 'userid = ' + rowData.userid
    });

    let amount = rowData.amountday
    let compensationday = rowUser[0].compensationday
    let total = Number(amount) + Number(compensationday)

    if(amount > 1){
        for(let i = 1 ; i <= amount ; i++){
            rowData.amountday = 1
            await promisify(sheet.addRow)(rowData);
            rowUser.forEach(element => {
                try {
                    element.compensationday = total
                    element.save()
                    
                } catch (err) {
                    res.send(false)
                }
            })
        }
    res.send(true)
    } else {
            await promisify(sheet.addRow)(rowData);
            rowUser.forEach(element => {
                try {
                    element.compensationday = total
                    element.save()
                    res.send(true)
                } catch (err) {
                    res.send(false)
                }
            })
    }

}

module.exports = {
    queryUserSpecialHolidayById,
    decreaseAmountDay,
    addCompensateDay
};