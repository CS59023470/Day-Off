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
            statusUser: custom.createStatusUserToString(res.userstatus),
            statusWorking: custom.createStatusWorkingToString(res.workingstatus),
            statusActive: custom.createStatusActiveToString(res.activestatus),
            manager: res.manager,
            sickday: res.sickday,
            businessday: res.businessday,
            vacationday: res.vacationday,
            compensationday: res.compensationday,
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
            statusUser: custom.createStatusUserToString(res.userstatus),
            statusWorking: custom.createStatusWorkingToString(res.workingstatus),
            statusActive: custom.createStatusActiveToString(res.activestatus),
            manager: res.manager,
            sickday: res.sickday,
            businessday: res.businessday,
            vacationday: res.vacationday,
            compensationday: res.compensationday,
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
            sickday: Number(res.sickday),
            businessday: Number(res.businessday),
            vacationday: Number(res.vacationday),
            compensationday: 0,
        }
        if (res.compensationday !== '' && res.compensationday !== '0') {
            data_day_off.compensationday = Number(res.compensationday)
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
        user.compensationday = user.compensationday - holiday_remove
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

    if (modelData.usecompensationday > 0) {
        //Use Special Holiday
        rowUsers[0].compensationday = Number(rowUsers[0].compensationday) - modelData.usecompensationday
    }
    switch (modelData.type) {
        case 'Personal Leave'://personal leave
            rowUsers[0].businessday = Number(rowUsers[0].businessday) - modelData.useDayOff
            break;
        case 'Vacation Leave'://vacation leave
            rowUsers[0].vacationday = Number(rowUsers[0].vacationday) - modelData.useDayOff
            break;
        case 'Sick Leave'://sick leave
            rowUsers[0].sickday = Number(rowUsers[0].sickday) - modelData.useDayOff
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
                    data.businessday = Number(data.businessday) + dataDayleave.usedayoff
                    break;
                case 'Sick Leave':
                    data.sickday = Number(data.sickday) + dataDayleave.usedayoff
                    break;
                case 'Vacation Leave':
                    data.vacationday = Number(data.vacationday) + dataDayleave.usedayoff
                    break;
            }
            if (dataDayleave.usecompensationday !== 0) {
                data.compensationday = Number(data.compensationday) + dataDayleave.usecompensationday
            }
            data.save()
        })
        return true
    } catch (err) {
        return false
    }
}

//API ข้อมูล Filter หน้า Report
async function getDataFilterForReport(req, res) {
    const doc = new GoogleSpreadsheet(sheet_api.sheetId);
    await promisify(doc.useServiceAccountAuth)(creds);
    const info = await promisify(doc.getInfo)();
    const sheet = info.worksheets[sheet_api.indexSheetUser];
    const rowUsers = await promisify(sheet.getRows)({
        offset: 1
    });

    const groupDepartment = new Set();
    rowUsers.forEach((user) => {
        groupDepartment.add(user.department)
    });
    //console.log(groupDepartment)
    const department_position = []
    groupDepartment.forEach(department => {
        let list_user = rowUsers.filter(user => {
            return user.department === department
        })
        let groupPosition = new Set();
        list_user.forEach(dataFilter => {
            groupPosition.add(dataFilter.position)
        })
        let model = {
            department: department,
            position: []
        }
        groupPosition.forEach(position => {
            model.position.push(position)
        })
        department_position.push(model)
    })
    res.send(JSON.stringify(department_position));
    //res.send(true)

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
    queryAllUsers,
    getDataFilterForReport
};