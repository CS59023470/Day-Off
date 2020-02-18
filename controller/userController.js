var GoogleSpreadsheet = require('google-spreadsheet');
var creds = require('../config/client_secret.json');
const { promisify } = require('util');
const sheet_api = require('../config/googlesheet_api');
const custom = require('./customDataController');

//API ค้นหาข้อมูลผู้ใช้ทั้งหมด
async function queryAllUser(req, res) {
    const doc = new GoogleSpreadsheet(sheet_api.sheetId);
    await promisify(doc.useServiceAccountAuth)(creds);
    const info = await promisify(doc.getInfo)();
    const sheet = info.worksheets[sheet_api.indexSheetUser];

    const rowUsers = await promisify(sheet.getRows)({
        offset: 1
    });

    let listUser = rowUsers.map((res) => {
        return {
            userId: res.userid,
            email: res.email,
            name: res.name,
            position: res.position,
            department: res.department,
            statusUser: custom.createStatusUserToString(res.statususer),
            statusWorking: custom.createStatusWorkingToString(res.statusworking),
            statusActive: custom.createStatusActiveToString(res.statusactive),
            manager: res.manager,
            sickday: res.sickdayleft,
            personalday: res.personaldayleft,
            vacationday: res.vacationdayleft,
            specialday: res.specialholiday,
            image: res.image
        }
    });

    return await listUser
}

// GET all user
async function queryAllUsers(req, res) {
    const doc = new GoogleSpreadsheet(sheet_api.sheetId);
    await promisify(doc.useServiceAccountAuth)(creds);
    const info = await promisify(doc.getInfo)();
    const sheet = info.worksheets[sheet_api.indexSheetUser];

    const rowUsers = await promisify(sheet.getRows)({
        offset: 1
    });

    let listUser = rowUsers.map((res) => {
        return {
            userId: res.userid,
            name: res.name,
            email: res.email,
            position: res.position,
            department: res.department,
            statusUser: custom.createStatusUserToString(res.statususer),
            statusWorking: custom.createStatusWorkingToString(res.statusworking),
            statusActive: custom.createStatusActiveToString(res.statusactive),
            manager: res.manager,
            sickday: res.sickdayleft,
            personalday: res.personaldayleft,
            vacationday: res.vacationdayleft,
            specialday: res.specialholiday,
            image:  res.image
        }
    });

    res.send(JSON.stringify(listUser));
}

//API ค้นหาผู้ใช้ ด้วย รหัสผู้ใช้ (userid)
async function queryUserById(userId) {
    const doc = new GoogleSpreadsheet(sheet_api.sheetId);
    await promisify(doc.useServiceAccountAuth)(creds);
    const info = await promisify(doc.getInfo)();
    const sheet = info.worksheets[sheet_api.indexSheetUser];

    const data_manager = await promisify(sheet.getRows)({
        query: 'userid = ' + userId
    });

    let data = data_manager.map((res) => {
        return {
            email: res.email,
            name: res.name
        }
    });

    return await data
}

//API ค้นหาจำนวนการลาคงเหลือของผู้ใช้ ด้วย userid
async function queryDayLeft(req, res) {
    const doc = new GoogleSpreadsheet(sheet_api.sheetId);
    await promisify(doc.useServiceAccountAuth)(creds);
    const info = await promisify(doc.getInfo)();
    const sheet = info.worksheets[sheet_api.indexSheetUser];

    const data_user = await promisify(sheet.getRows)({
        query: 'userid = ' + req.params.id
    });

    let data = data_user.map((res) => {
        let data_day_off = {
            sickdayleft: Number(res.sickdayleft),
            personaldayleft: Number(res.personaldayleft),
            vacationdayleft: Number(res.vacationdayleft),
            specialholiday: 0,
        }
        if (res.specialholiday !== '' && res.specialholiday !== '0') {
            data_day_off.specialholiday = Number(res.specialholiday)
        }
        return data_day_off
    });

    res.send(JSON.stringify(data));
}

//API ค้นหา super admin ทั้งหมด
async function queryAllSuperAdmin() {
    const doc = new GoogleSpreadsheet(sheet_api.sheetId);
    await promisify(doc.useServiceAccountAuth)(creds);
    const info = await promisify(doc.getInfo)();
    const sheet = info.worksheets[sheet_api.indexSheetUser];

    const data = await promisify(sheet.getRows)({
        query: 'statususer = 0 & statusactive = 1'
    });

    let data_superadmin = data.map((res) => {
        return {
            email: res.email,
            name: res.name
        }
    });

    return await data_superadmin
}

//API ค้นหาข้อมูลผู้ใช้ทั้งหมด(สำหรับค้นหาข้อมูลประวัติ)
async function queryAllUserforSearch(req, res) {
    const doc = new GoogleSpreadsheet(sheet_api.sheetId);
    await promisify(doc.useServiceAccountAuth)(creds);
    const info = await promisify(doc.getInfo)();
    const sheet = info.worksheets[sheet_api.indexSheetUser];

    const rowUsers = await promisify(sheet.getRows)({
        offset: 1
    });

    let listUser = rowUsers.map((res) => {
        return {
            userId: res.userid,
            name: res.name,
        }
    });

    res.send(JSON.stringify(listUser))
}

//API แก้ไขจำนวนวันลางาน หลังจากขอลางานสำเร็จ
async function updateHolidayUserById(userid, holiday_remove) {
    const doc = new GoogleSpreadsheet(sheet_api.sheetId);
    await promisify(doc.useServiceAccountAuth)(creds);
    const info = await promisify(doc.getInfo)();
    const sheet = info.worksheets[sheet_api.indexSheetUser];

    const rowUsers = await promisify(sheet.getRows)({
        query: 'userid = ' + userid
    });

    rowUsers.forEach(user => {
        user.specialholiday = user.specialholiday - holiday_remove
        user.save()
    });

    return true
}

// API update the amount of day left by userid
//Code By Man
async function updateDayLeftByUserId(modelData) {
    const doc = new GoogleSpreadsheet(sheet_api.sheetId);
    await promisify(doc.useServiceAccountAuth)(creds);
    const info = await promisify(doc.getInfo)();
    const sheet = info.worksheets[sheet_api.indexSheetUser];

    const rowUsers = await promisify(sheet.getRows)({
        query: 'userid = ' + modelData.userid
    });

    if (modelData.useSpecialHoliday > 0) {
        //Use Special Holiday
        rowUsers[0].specialholiday = Number(rowUsers[0].specialholiday) - modelData.useSpecialHoliday
    }
    switch (modelData.type) {
        case 'Personal Leave'://personal leave
            rowUsers[0].personaldayleft = Number(rowUsers[0].personaldayleft) - modelData.useDayOff
            break;
        case 'Vacation Leave'://vacation leave
            rowUsers[0].vacationdayleft = Number(rowUsers[0].vacationdayleft) - modelData.useDayOff
            break;
        case 'Sick Leave'://sick leave
            rowUsers[0].sickdayleft = Number(rowUsers[0].sickdayleft) - modelData.useDayOff
            break;
        default: break;
    }

    try {
        rowUsers.forEach(user => {
            user.save()
        });
        return true
    } catch (err) {
        return false
    }
}

//API เพิ่มจำนวนวันลางานของผู้ใช้ หลังจากการถูก Reject
async function updateDayleaveWhenReject(dataDayleave) {
    const doc = new GoogleSpreadsheet(sheet_api.sheetId);
    await promisify(doc.useServiceAccountAuth)(creds);
    const info = await promisify(doc.getInfo)();
    const sheet = info.worksheets[sheet_api.indexSheetUser];
    const rowUsers = await promisify(sheet.getRows)({
        query: 'userid = ' + dataDayleave.userid
    });
    try {
        rowUsers.forEach(data => {
            switch (dataDayleave.type) {
                case 'Personal Leave':
                    data.personaldayleft = Number(data.personaldayleft) + dataDayleave.usedayoff
                    break;
                case 'Sick Leave':
                    data.sickdayleft = Number(data.sickdayleft) + dataDayleave.usedayoff
                    break;
                case 'Vacation Leave':
                    data.vacationdayleft = Number(data.vacationdayleft) + dataDayleave.usedayoff
                    break;
            }
            if (dataDayleave.usespecialholiday !== 0) {
                data.specialholiday = Number(data.specialholiday) + dataDayleave.usespecialholiday
            }
            data.save()
        })
        return true
    } catch (err) {
        return false
    }
}

module.exports = {
    queryAllUser,
    queryUserById,
    queryDayLeft,
    queryAllSuperAdmin,
    queryAllUserforSearch,
    updateHolidayUserById,
    updateDayleaveWhenReject,
    updateDayLeftByUserId,
    queryAllUsers
};