var GoogleSpreadsheet = require('google-spreadsheet');
var creds = require('../config/client_secret.json');
const { promisify } = require('util');
const sheet_api = require('../config/googlesheet_api');
const custom = require('./customDataController');
const user_api = require('./userController');
const mail = require('../model/mail');
const holiday = require('./holidayController');
const company_dayoff = require('../controller/dayoffController')

//API เพิ่มรายการลางานไปยัง Google Sheet
async function addLeaveRequest(req, res) {
    const doc = new GoogleSpreadsheet(sheet_api.sheetId);
    await promisify(doc.useServiceAccountAuth)(creds);
    const info = await promisify(doc.getInfo)();
    const sheet = info.worksheets[sheet_api.indexSheetLeave];

    const row = {
        rowid: await custom.createRowId(),
        idemployee: req.body.data.idemployee,
        type: req.body.data.type,
        startdate: req.body.data.startdate,
        starttime: req.body.data.starttime,
        enddate: req.body.data.enddate,
        endtime: req.body.data.endtime,
        detailleave: req.body.data.detailleave,
        status: '',
        totalday: req.body.data.totalDay,
        user: req.body.data.user,
        admin_approve: '',
        use_day_off: 0,
        use_special_holiday: 0
    }

    if (req.body.data.statusHoliday === true) {
        //ใช้วันหยุด
        row.use_day_off = row.totalday - req.body.data.amountHoliday
        row.use_special_holiday = req.body.data.amountHoliday
    } else {
        //ไม่ใช้วันหยุด
        row.use_day_off = row.totalday
    }

    switch (req.body.data.type) {
        case 'PL': row.type = 'Personal Leave'; break;
        case 'SL': row.type = 'Sick Leave'; row.status = 'Approved'; holiday.decreaseAmountDay(row); break;
        case 'VL': row.type = 'Vacation Leave'; break;
        default: break;
    }

    switch (req.body.data.starttime) {
        case 'allday': row.starttime = 'All-Day'; break;
        case 'morning': row.starttime = 'Morning'; break;
        case 'afternoon': row.starttime = 'Afternoon'; break;
        default: break;
    }

    switch (req.body.data.endtime) {
        case 'allday': row.endtime = 'All-Day'; break;
        case 'morning': row.endtime = 'Morning'; break;
        case 'afternoon': row.endtime = 'Afternoon'; break;
        default: break;
    }

    try {
        await promisify(sheet.addRow)(row);
        modifyDayLeftAmount(row);
        let data_user_manager = user_api.queryUserById(row.user.manager);
        data_user_manager.then(re => {
            mail.mailRequestManager(re[0], row);
        })
        let data_super_admin = user_api.queryAllSuperAdmin()
        data_super_admin.then(re => {
            re.forEach(element => {
                if (element.email !== req.body.data.user.email) {
                    mail.mailRequestManager(element, row);
                }
            });
        })
        res.send(true);
    } catch{
        res.send(false);
    }
}

//API  Modify the amount of day left.
async function modifyDayLeftAmount(row) {

    let model = {
        type: row.type,
        userid: row.user.userId,
        useDayOff: Number(row.use_day_off),
        useSpecialHoliday: Number(row.use_special_holiday)
    }
    await user_api.updateDayLeftByUserId(model);
}

//API สำหรับค้นหารายการ ขอลางาน ทั้งหมดที่ยังไม่ได้รับการอนุมัติ สำหรับ Super Admin
async function queryAllLeaveRequestNotApprove(req, res) {
    const doc = new GoogleSpreadsheet(sheet_api.sheetId);
    await promisify(doc.useServiceAccountAuth)(creds);
    const info = await promisify(doc.getInfo)();
    const sheet = info.worksheets[sheet_api.indexSheetLeave];
    const listUser = await user_api.queryAllUser();
    const rowDatas = await promisify(sheet.getRows)({
        query: 'status = "" & idemployee != ' + req.body.data.userid
    });

    let setUser = rowDatas.map((res) => {
        return {
            rowId: res.rowid,
            idUser: res.idemployee,
            type: res.type,
            startDate: new Date(res.startdate),
            starttime: res.starttime,
            endDate: new Date(res.enddate),
            endtime: res.endtime,
            detail: res.detailleave,
            usedayoff: res.usedayoff,
            usespecialholiday: res.usespecialholiday,
            user: listUser.find((datauser) => { return datauser.userId === '' + res.idemployee; }),
        }
    });

    let list_result = []

    setUser.forEach((leave, i) => {
        if (leave.user.statusActive !== 'not_active') {
            list_result.push(leave)
        }
    })

    res.send(JSON.stringify(list_result));
}

//API สำหรับค้นหารายการ ขอลางาน ทั้งหมดที่ยังไม่ได้รับการอนุมัติ สำหรับ Admin
async function queryLeaveRequestNotApproveForAdmin(req, res) {
    const doc = new GoogleSpreadsheet(sheet_api.sheetId);
    await promisify(doc.useServiceAccountAuth)(creds);
    const info = await promisify(doc.getInfo)();
    const sheet = info.worksheets[sheet_api.indexSheetLeave];
    const sheet_user = info.worksheets[sheet_api.indexSheetUser];
    const listUser = await user_api.queryAllUser();

    const rowUser = await promisify(sheet_user.getRows)({
        query: 'manager = ' + req.body.data.userid
    });

    let list_under = []
    list_under = rowUser.map(usermap => {
        return {
            underid: usermap.userid
        }
    })

    const rowDatas = await promisify(sheet.getRows)({
        query: 'status = "" & idemployee != ' + req.body.data.userid
    });

    let list_result_return = []

    rowDatas.forEach(leave => {
        list_under.forEach(filteruser => {
            if (filteruser.underid === leave.idemployee) {
                list_result_return.push(leave)
            }
        })
    })

    list_result_return = list_result_return.map((res) => {
        return {
            rowId: res.rowid,
            idUser: res.idemployee,
            type: res.type,
            startDate: new Date(res.startdate),
            starttime: res.starttime,
            endDate: new Date(res.enddate),
            endtime: res.endtime,
            detail: res.detailleave,
            usedayoff: res.usedayoff,
            usespecialholiday: res.usespecialholiday,
            user: listUser.find((datauser) => { return datauser.userId === '' + res.idemployee; }),
        }
    });


    res.send(JSON.stringify(list_result_return));
}

//API สำหรับค้นหารายการ ขอลางาน ทั้งหมดที่ได้รับการอนุมัติ
async function queryAllLeaveRequestApprove(req, res) {
    const doc = new GoogleSpreadsheet(sheet_api.sheetId);
    await promisify(doc.useServiceAccountAuth)(creds);
    const info = await promisify(doc.getInfo)();
    const sheet = info.worksheets[sheet_api.indexSheetLeave];

    const listUser = await user_api.queryAllUser();

    const rowDatas = await promisify(sheet.getRows)({
        query: 'status != ""'
    });

    let setUser = rowDatas.map((res) => {
        return {
            rowId: res.rowid,
            idUser: res.idemployee,
            type: res.type,
            startDate: new Date(res.startdate),
            starttime: res.starttime,
            endDate: new Date(res.enddate),
            endtime: res.endtime,
            detail: res.detailleave,
            usedayoff: res.usedayoff,
            usespecialholiday: res.usespecialholiday,
            user: listUser.find((datauser) => { return datauser.userId === '' + res.idemployee; }),


        }
    });

    let checkActive = setUser.filter((leave, i) => {
        return leave.user.statusActive !== 'not_active'
    })

    let personal_leave = checkActive.filter((list, i) => {
        return list.type === 'Personal Leave'
    })

    let sick_leave = checkActive.filter((list, i) => {
        return list.type === 'Sick Leave'
    })

    let vacation_leave = checkActive.filter((list, i) => {
        return list.type === 'Vacation Leave'
    })

    let resultData = {
        personal_leave: personal_leave,
        sick_leave: sick_leave,
        vacation_leave: vacation_leave
    }

    res.send(JSON.stringify(resultData));
}

//API ลบรายการขอลา จากเว็บไซต์
async function removeLeaveRequest(req, res) {
    const doc = new GoogleSpreadsheet(sheet_api.sheetId);
    await promisify(doc.useServiceAccountAuth)(creds);
    const info = await promisify(doc.getInfo)();
    const model_send = {
        status: null,
        description: ''
    }
    const sheetLeave = info.worksheets[sheet_api.indexSheetLeave];
    const sheetUsers = info.worksheets[sheet_api.indexSheetUser];

    const rowDatas = await promisify(sheetLeave.getRows)({
        query: 'rowid = ' + req.params.id
    });
    
    if(rowDatas.length > 0){
        if(rowDatas[0].status === ""){
            const user = await promisify(sheetUsers.getRows)({
                query: 'userid = ' + rowDatas[0].idemployee
            });
            const manager = await promisify(sheetUsers.getRows)({
                query: 'userid = ' + req.params.idManager
            });
            let u = user[0]
            let m = manager[0]
            try {
                let modelRowLeave = {
                    userid: rowDatas[0].idemployee,
                    type: rowDatas[0].type,
                    usedayoff: Number(rowDatas[0].usedayoff),
                    usespecialholiday: Number(rowDatas[0].usespecialholiday)
                }
                let result_update_user = await user_api.updateDayleaveWhenReject(modelRowLeave)
                if (result_update_user === true) {
                    rowDatas[0].del();
                    mail.mailRejected(rowDatas[0], u, m);
                    model_send.status = true
                    model_send.description = 'successfully'
                    res.send(JSON.stringify(model_send))
                } else {
                    model_send.status = false
                    model_send.description = 'system_error'
                    res.send(JSON.stringify(model_send))
                }
            } catch{
                model_send.status = false
                model_send.description = 'system_error'
                res.send(JSON.stringify(model_send))
            }
        }else{
            model_send.status = false
            model_send.description = 'approved'
            res.send(JSON.stringify(model_send))
        }
    }else{
        model_send.status = false
        model_send.description = 'not_found'
        res.send(JSON.stringify(model_send))
    }
}

//API อนุมัติการขอลา จากเว็บไซต์
async function updateStatusLeaveRequest(req, res) {
    const doc = new GoogleSpreadsheet(sheet_api.sheetId);
    await promisify(doc.useServiceAccountAuth)(creds);
    const info = await promisify(doc.getInfo)();
    const model_send = {
        status: null,
        description: ''
    }
    const sheetLeave = info.worksheets[sheet_api.indexSheetLeave];
    const sheetUsers = info.worksheets[sheet_api.indexSheetUser];

    const rowDatas = await promisify(sheetLeave.getRows)({
        query: 'rowid = ' + req.params.id
    });

    if(rowDatas.length > 0){
        if(rowDatas[0].status === ""){
            const manager = await promisify(sheetUsers.getRows)({
                query: 'userid = ' + req.params.idManager
            });
            const user = await promisify(sheetUsers.getRows)({
                query: 'userid = ' + rowDatas[0].idemployee
            });
            let u = user[0]
            let m = manager[0]
            rowDatas.forEach(element => {
                try {
                    element.status = 'Approved';
                    element.admin_approve = '' + manager[0].userid;
                    element.save();
                    mail.mailApproved(rowDatas[0], u, m);
                    holiday.decreaseAmountDay(rowDatas[0]);
                    model_send.status = true
                    model_send.description = 'successfully'
                    res.send(JSON.stringify(model_send))
                } catch{
                    model_send.status = false
                    model_send.description = 'system_error'
                    res.send(JSON.stringify(model_send))
                }
            });
        }else{
            model_send.status = false
            model_send.description = 'approved'
            res.send(JSON.stringify(model_send))
        }
    }else{
        model_send.status = false
        model_send.description = 'not_found'
        res.send(JSON.stringify(model_send))
    }
}

//API ลบรายการขอลากิจ ที่ไม่ได้รับการอนุมัติ จากอีเมล
async function removeLeaveRequestFormEmail(req, res) {
    const doc = new GoogleSpreadsheet(sheet_api.sheetId);
    await promisify(doc.useServiceAccountAuth)(creds);
    const info = await promisify(doc.getInfo)();
    const sheetLeave = info.worksheets[sheet_api.indexSheetLeave];
    const sheetUsers = info.worksheets[sheet_api.indexSheetUser];

    const rowDatas = await promisify(sheetLeave.getRows)({
        query: 'rowid = ' + req.params.id
    });

    if(rowDatas.length === 0) {
        res.render('datanotfound')

    } else {

        
        

        if(rowDatas[0].status === ""){

            const user = await promisify(sheetUsers.getRows)({
                query: 'userid = ' + rowDatas[0].idemployee
            });
        
            const manager = await promisify(sheetUsers.getRows)({
                query: 'email = "' + req.params.emailManager + '"'
            });
        
            let u = user[0]
            let m = manager[0]

            try {
                let modelRowLeave = {
                    userid: rowDatas[0].idemployee,
                    type: rowDatas[0].type,
                    usedayoff: Number(rowDatas[0].usedayoff),
                    usespecialholiday: Number(rowDatas[0].usespecialholiday)
                }
    
                let result_update_user = await user_api.updateDayleaveWhenReject(modelRowLeave)
                if (result_update_user === true) {
                    rowDatas[0].del();
                    mail.mailRejected(rowDatas[0], u, m);
                    res.render('reject')
                } else {
                    res.render('systemerror')
                }
            } catch{
                res.render('systemerror')
            }   
       
        }else{
            res.render('cannotreject')
        }
    }
}

//API อัพเดทสถานะการขอลากิจ ที่ได้รับการอนุมัติ จากอีเมล
async function updateStatusLeaveRequestFromEmail(req, res) {
    const doc = new GoogleSpreadsheet(sheet_api.sheetId);
    await promisify(doc.useServiceAccountAuth)(creds);
    const info = await promisify(doc.getInfo)();
    const sheetLeave = info.worksheets[sheet_api.indexSheetLeave];
    const sheetUsers = info.worksheets[sheet_api.indexSheetUser];

    let datamenager = {}

    const rowDatas = await promisify(sheetLeave.getRows)({
        query: 'rowid = ' + req.params.id
    });

    if(rowDatas.length === 0){
        res.render('cannotapprovewhenreject')

    } else {
        const manager = await promisify(sheetUsers.getRows)({
            query: 'email = "' + req.params.emailManager + '"'
        });
    
        datamenager = manager.map((mng) => {
            return {
                userid: mng.userid
            }
        })
    
        const user = await promisify(sheetUsers.getRows)({
            query: 'userid = ' + rowDatas[0].idemployee
        });

        let u = user[0]
        let m = manager[0]

        rowDatas.forEach(element => {
            if(element.status === "") {
                try {
                element.status = 'Approved';
                element.admin_approve = '' + datamenager[0].userid;
                element.save();
                mail.mailApproved(rowDatas[0], u, m);
                holiday.decreaseAmountDay(rowDatas[0]);
                res.render('approve')
                }catch {
                res.send(false);
                } 
            }else{
                res.render('cannotapprove')
            }
        });
    }
}

//API ค้นหาตามเดือนของทั้งหมด
async function queryHistoryLeaveByMonth(req, res) {
    const doc = new GoogleSpreadsheet(sheet_api.sheetId);
    await promisify(doc.useServiceAccountAuth)(creds);
    const info = await promisify(doc.getInfo)();
    const sheetLeave = info.worksheets[sheet_api.indexSheetLeave];
    const listUser = await user_api.queryAllUser();

    let userid = '' + req.body.data.userid
    let dateStart = new Date(req.body.data.startdate).getTime();
    let dateEnd = new Date(req.body.data.enddate).getTime();

    let list_result = []

    if (userid === "") {
        const rowDatas = await promisify(sheetLeave.getRows)({
            query: 'status != ""'

        });

        let result = rowDatas.map(data => {
            return {
                rowid: data.rowid,
                idemployee: data.idemployee,
                type: data.type,
                startdate: data.startdate,
                starttime: data.starttime,
                enddate: data.enddate,
                endtime: data.endtime,
                detailleave: data.detailleave,
                status: data.status,
                totalday: data.totalday,
                admin_approve: data.admin_approve,
                usedayoff: data.usedayoff,
                usespecialholiday: data.usespecialholiday,
                user: listUser.find((datauser) => { return datauser.userId === '' + data.idemployee; }),
            }
        })

        result.forEach(row => {

            let std = new Date(row.startdate).getTime();
            let ed = new Date(row.enddate).getTime();

            if (
                (std <= dateStart && ed >= dateEnd) ||
                (dateStart <= std && (dateEnd >= std && dateEnd <= ed)) ||
                ((std <= dateStart && ed >= dateStart) && dateEnd >= ed) ||
                (dateStart <= std && dateEnd >= ed)
            ) {
                list_result.push(row)
            }
        })
        res.send(JSON.stringify(list_result))
    } else {
        const rowDatas = await promisify(sheetLeave.getRows)({
            query: 'idemployee = ' + req.body.userid + '& status != ""'
        });

        let result = rowDatas.map(data => {
            return {
                rowid: data.rowid,
                idemployee: data.idemployee,
                type: data.type,
                startdate: data.startdate,
                starttime: data.starttime,
                enddate: data.enddate,
                endtime: data.endtime,
                detailleave: data.detailleave,
                status: data.status,
                totalday: data.totalday,
                admin_approve: data.admin_approve,
                usedayoff: data.usedayoff,
                usespecialholiday: data.usespecialholiday,
                user: listUser.find((datauser) => { return datauser.userId === '' + data.idemployee; }),
            }
        })

        result.forEach(row => {
            let std = new Date(row.startdate).getTime();
            let ed = new Date(row.enddate).getTime();

            if (
                (std <= dateStart && ed >= dateEnd) ||
                (dateStart <= std && (dateEnd >= std && dateEnd <= ed)) ||
                ((std <= dateStart && ed >= dateStart) && dateEnd >= ed) ||
                (dateStart <= std && dateEnd >= ed)
            ) {
                list_result.push(row)
            }
        })
        res.send(JSON.stringify(list_result))
    }
}

//API ค้นหาตามเดือนของทั้งหมดหน้าแรก
async function queryLeaveHistory(req, res) {
    const doc = new GoogleSpreadsheet(sheet_api.sheetId);
    await promisify(doc.useServiceAccountAuth)(creds);
    const info = await promisify(doc.getInfo)();
    const sheetLeave = info.worksheets[sheet_api.indexSheetLeave];
    const listUser = await user_api.queryAllUser();

    let userid = '' + req.body.data.userid
    let dateStart = new Date(req.body.data.startdate).getTime();
    let dateEnd = new Date(req.body.data.enddate).getTime();
    let start_rqe = new Date(req.body.data.startdate);
    let end_rqe = new Date(req.body.data.enddate);

    let list_result = []
    let list_year = new Set();
    let list_send = []
    let send = []
    let name_month = [ 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'Auguest', 'September', 'October', 'November', 'December',]


    if (userid === "") {
        const rowDatas = await promisify(sheetLeave.getRows)({
            query: 'status != ""'

        });

        let result = rowDatas.map(data => {
            return {
                idemployee: data.idemployee,
                startdate: data.startdate,
                starttime: data.starttime,
                enddate: data.enddate,
                endtime: data.endtime,
                user: listUser.find((datauser) => { return datauser.userId === '' + data.idemployee; }),
            }
        })

        result.forEach(row => {

            let startTest = new Date(row.startdate);
            let endTest = new Date(row.enddate);
            let std = new Date(row.startdate).getTime();
            let ed = new Date(row.enddate).getTime();

            if (
                (std <= dateStart && ed >= dateEnd) ||
                (dateStart <= std && (dateEnd >= std && dateEnd <= ed)) ||
                ((std <= dateStart && ed >= dateStart) && dateEnd >= ed) ||
                (dateStart <= std && dateEnd >= ed)
            ) {
                if(startTest.getFullYear() == endTest.getFullYear()){
                    list_year.add(startTest.getFullYear())
                }else{
                    list_year.add(startTest.getFullYear())
                    list_year.add(endTest.getFullYear())
                }
                list_result.push(row)
            }
        })

        list_year.forEach(year => {
            list_send.push(
                {
                    year: year,
                    list_month : null
                }
            )
        })

        list_send.forEach((result,i) => {
            list_send[i].list_month = [ [], [], [], [], [], [], [], [], [], [], [], [] ]
            list_result.forEach((leave,j) => {
                let start = new Date(leave.startdate);
                let end = new Date(leave.enddate);
                if(start.getFullYear() == result.year || end.getFullYear() == result.year){
                    if(start.getFullYear() == end.getFullYear()){
                        let between = end.getMonth() - start.getMonth()
                        if(between == 0){
                            let filter_user = list_send[i].list_month[start.getMonth()].filter(id_filter => {
                                return id_filter.idemployee === leave.idemployee
                            })
                            if(filter_user.length === 0){
                                list_send[i].list_month[start.getMonth()].push(leave)
                            }
                        }else{
                            for(let t = start.getMonth() ; t <= end.getMonth() ; t++){
                                let filter_user = list_send[i].list_month[t].filter(id_filter => {
                                    return id_filter.idemployee === leave.idemployee
                                })
                                if(filter_user.length === 0){
                                    list_send[i].list_month[t].push(leave)
                                }
                            }
                        }
                    }else{
                        if(start.getFullYear() == result.year){
                            for(let t = start.getMonth() ; t <= 11 ; t++){
                                let filter_user = list_send[i].list_month[t].filter(id_filter => {
                                    return id_filter.idemployee === leave.idemployee
                                })
                                if(filter_user.length === 0){
                                    list_send[i].list_month[t].push(leave)
                                }
                            }
                        }else{
                            for(let t = 0 ; t <= end.getMonth() ; t++){
                                let filter_user = list_send[i].list_month[t].filter(id_filter => {
                                    return id_filter.idemployee === leave.idemployee
                                })
                                if(filter_user.length === 0){
                                    list_send[i].list_month[t].push(leave)
                                }
                            }
                        }
                    }
                }
            })
        })

        list_send.forEach(result => {
            if(result.year >= start_rqe.getFullYear() && result.year <= end_rqe.getFullYear()){
                let model = {
                    year: result.year,
                    list_month: []
                }
                result.list_month.forEach((month,i) => {
                    if(month.length !== 0 && i >= start_rqe.getMonth() && i <= end_rqe.getMonth()){
                        model.list_month.push({
                            name: name_month[i],
                            data: month
                        })
                    }
                })
                send.push(model)
            }
        })


        res.send(JSON.stringify(send))

    } else {
        const rowDatas = await promisify(sheetLeave.getRows)({
            query: 'idemployee = ' + req.body.data.userid + '& status != ""'
        });

        let result = rowDatas.map(data => {
            return {
                idemployee: data.idemployee,
                startdate: data.startdate,
                starttime: data.starttime,
                enddate: data.enddate,
                endtime: data.endtime,
                user: listUser.find((datauser) => { return datauser.userId === '' + data.idemployee; }),
            }
        })

        result.forEach(row => {

            let startTest = new Date(row.startdate);
            let endTest = new Date(row.enddate);
            let std = new Date(row.startdate).getTime();
            let ed = new Date(row.enddate).getTime();

            if (
                (std <= dateStart && ed >= dateEnd) ||
                (dateStart <= std && (dateEnd >= std && dateEnd <= ed)) ||
                ((std <= dateStart && ed >= dateStart) && dateEnd >= ed) ||
                (dateStart <= std && dateEnd >= ed)
            ) {
                if(startTest.getFullYear() == endTest.getFullYear()){
                    list_year.add(startTest.getFullYear())
                }else{
                    list_year.add(startTest.getFullYear())
                    list_year.add(endTest.getFullYear())
                }
                list_result.push(row)
            }
        })

        list_year.forEach(year => {
            list_send.push(
                {
                    year: year,
                    list_month : null
                }
            )
        })

        list_send.forEach((result,i) => {
            list_send[i].list_month = [ [], [], [], [], [], [], [], [], [], [], [], [] ]
            list_result.forEach((leave,j) => {
                let start = new Date(leave.startdate);
                let end = new Date(leave.enddate);
                if(start.getFullYear() == result.year || end.getFullYear() == result.year){
                    if(start.getFullYear() == end.getFullYear()){
                        let between = end.getMonth() - start.getMonth()
                        if(between == 0){
                            list_send[i].list_month[start.getMonth()].push(leave)
                        }else{
                            for(let t = start.getMonth() ; t <= end.getMonth() ; t++){
                                list_send[i].list_month[t].push(leave)
                            }
                        }
                    }else{
                        if(start.getFullYear() == result.year){
                            for(let t = start.getMonth() ; t <= 11 ; t++){
                                list_send[i].list_month[t].push(leave)
                            }
                        }else{
                            for(let t = 0 ; t <= end.getMonth() ; t++){
                                list_send[i].list_month[t].push(leave)
                            }
                        }
                    }
                }
            })
        })

        list_send.forEach(result => {
            if(result.year >= start_rqe.getFullYear() && result.year <= end_rqe.getFullYear()){
                let model = {
                    year: result.year,
                    list_month: []
                }
                result.list_month.forEach((month,i) => {
                    if(month.length !== 0 && i >= start_rqe.getMonth() && i <= end_rqe.getMonth()){
                        model.list_month.push({
                            name: name_month[i],
                            data: month
                        })
                    }
                })
                send.push(model)
            }
        })


        res.send(JSON.stringify(send))
    }
}

// Query Data For Calendar
async function queryForCalendar(req, res) {
    const doc = new GoogleSpreadsheet(sheet_api.sheetId);
    await promisify(doc.useServiceAccountAuth)(creds);
    const info = await promisify(doc.getInfo)();
    const sheetLeave = info.worksheets[sheet_api.indexSheetLeave];
    const listUser = await user_api.queryAllUser();
    const list_return = await company_dayoff.quryAllDayOffForcalendar();

    const rowDatas = await promisify(sheetLeave.getRows)({
        query: 'status != ""'
    });

    let result = rowDatas.map(data => {
        return {
            rowid: data.rowid,
            idemployee: data.idemployee,
            type: data.type,
            startdate: data.startdate,
            starttime: data.starttime,
            enddate: data.enddate,
            endtime: data.endtime,
            detailleave: data.detailleave,
            admin_approve: data.admin_approve,
            status: data.status,
            totalday: data.totalday,
            admin_approve: data.adminapprove,
            usedayoff: data.usedayoff,
            usespecialholiday: data.usespecialholiday,
            user: listUser.find((datauser) => { return datauser.userId === '' + data.idemployee; }),
        }
    })
    result.forEach(re => {
        let admin = listUser.find((datauser) => { return datauser.userId === '' + re.admin_approve; })
        let modelDateStart = new Date(re.startdate)
        let modelDateEnd = new Date(re.enddate)
        let model = {
            id: '',
            startdate: new Date(Date.UTC(modelDateStart.getFullYear(), modelDateStart.getMonth(), modelDateStart.getDate(), 0, 0, 0)),
            enddate: new Date(Date.UTC(modelDateEnd.getFullYear(), modelDateEnd.getMonth(), modelDateEnd.getDate(), 23, 59, 59)),
            title: re.user.name,
            leave: {
                startdate: re.startdate,
                starttime: re.starttime,
                enddate: re.enddate,
                endtime: re.endtime,
                type: re.type,
                detail: re.detailleave,
                email: re.user.email,
                statusWorking: re.user.statusWorking,
                admin_approve: { name: admin ? admin.name : '', }
            }
        }
        if (re.type === 'Personal Leave') {
            model.id = 'PL'
        } else if (re.type === 'Sick Leave') {
            model.id = 'SL'
        } else {
            model.id = 'VL'
        }
        list_return.push(model)
    })


    res.send(JSON.stringify(list_return));
}

// Search history leave by id
async function queryHistoryLeaveByID(req, res) {
    const doc = new GoogleSpreadsheet(sheet_api.sheetId);
    await promisify(doc.useServiceAccountAuth)(creds);
    const info = await promisify(doc.getInfo)();
    const sheetLeave = info.worksheets[sheet_api.indexSheetLeave];
    const listUser = await user_api.queryAllUser();

    let userid = '' + req.params.id

    const rowDatas = await promisify(sheetLeave.getRows)({
        query: 'status != "" & idemployee = ' + userid

    });

    let sick = []
    let personal = []
    let vacation = []
    let all = []
    rowDatas.forEach(data => {
        let admin = listUser.find((datauser) => { return datauser.userId === '' + data.adminapprove; })
        let model = {
            idemployee: data.idemployee,
            type: data.type,
            startdate: data.startdate,
            starttime: data.starttime,
            enddate: data.enddate,
            endtime: data.endtime,
            detailleave: data.detailleave,
            admin_approve: { name: admin ? admin.name : '', }
        }
        all.push(model)

        if (data.type === 'Sick Leave') {//sick leave
            sick.push(model)
        }
        if (data.type === 'Personal Leave') {//personal leave
            personal.push(model)
        }
        if (data.type === 'Vacation Leave') {//vacation leave
            vacation.push(model)
        }
    })

    let listYear = []
    let listAllYear = new Set();

    all.map(each => {
        let array = each.startdate.split('-')
        listAllYear.add(array[0])
    })

    listAllYear.forEach(year => {
        let sickList = getYearList(year, sick)
        let personalList = getYearList(year, personal)
        let vacationList = getYearList(year, vacation)

        let model = {
            year: year,
            totalSickLeave: getTotalInYear(year, sick),
            totalPersonalLeave: getTotalInYear(year, personal),
            totalVacation: getTotalInYear(year, vacation),
            listLeaveFullYear: {
                listSickLeave: sickList,
                listPersonalLeave: personalList,
                listVacationLeave: vacationList
            }
        }

        listYear.push(model)
    })

    res.send(listYear)
}

function getTotalInYear(year, list) {
    let rs = 0
    list.forEach(ele => {
        if (ele.startdate.split('-')[0] === '' + year) {
            rs = rs + 1
        }
    })
    return rs
}

function getYearList(year, list) {
    let rs = []
    list.map(ele => {
        if (ele.startdate.split('-')[0] == '' + year) {
            rs.push(ele);
        }
    })
    return getMonthList(rs)

}

function getMonthList(list) {
    let result = [
        { nameMonth: 'January', listLeave: [] },
        { nameMonth: 'February', listLeave: [] },
        { nameMonth: 'March', listLeave: [] },
        { nameMonth: 'April', listLeave: [] },
        { nameMonth: 'May', listLeave: [] },
        { nameMonth: 'June', listLeave: [] },
        { nameMonth: 'July', listLeave: [] },
        { nameMonth: 'Auguest', listLeave: [] },
        { nameMonth: 'September', listLeave: [] },
        { nameMonth: 'October', listLeave: [] },
        { nameMonth: 'November', listLeave: [] },
        { nameMonth: 'December', listLeave: [] },
    ]

    list.map(ele => {
        switch (ele.startdate.split('-')[1]) {
            case '01':
                result[0].listLeave.push(ele)
                break;
            case '02':
                result[1].listLeave.push(ele)
                break;
            case '03':
                result[2].listLeave.push(ele)
                break;
            case '04':
                result[3].listLeave.push(ele)
                break;
            case '05':
                result[4].listLeave.push(ele)
                break;
            case '06':
                result[5].listLeave.push(ele)
                break;
            case '07':
                result[6].listLeave.push(ele)
                break;
            case '08':
                result[7].listLeave.push(ele)
                break;
            case '09':
                result[8].listLeave.push(ele)
                break;
            case '10':
                result[9].listLeave.push(ele)
                break;
            case '11':
                result[10].listLeave.push(ele)
                break;
            case '12':
                result[11].listLeave.push(ele)
                break;
        }
    })

    let rs = []
    result.forEach(ele => {
        if (ele.listLeave.length != 0) {
            rs.push(ele)
        }
    })

    return rs;
}

async function querydayByidforCarlendar(req, res) {
    const doc = new GoogleSpreadsheet(sheet_api.sheetId);
    await promisify(doc.useServiceAccountAuth)(creds);
    const info = await promisify(doc.getInfo)();
    const sheetLeave = info.worksheets[sheet_api.indexSheetLeave];

    const rowDatas = await promisify(sheetLeave.getRows)({
        query: 'idemployee = ' + req.body.data.userid
    });
    
    let list_one_day = []
    let list_group_manyday = []
    rowDatas.forEach(data => {
        if(data.startdate === data.enddate){
            let oneday = {
                startdate : data.startdate,
                enddate : data.enddate,
                description: data.detailleave
            }
            list_one_day.push(oneday)
        }else{
            let manyday = {
                startdate : data.startdate,
                enddate : data.enddate,
                description: data.detailleave
            }
            list_group_manyday.push(manyday)
        }
    });
    let result_return = createDateForCalendarForm(list_one_day,list_group_manyday)

    res.send(JSON.stringify(result_return))
    
}

function createDateForCalendarForm(list_one_day,list_group_manyday) {
    let result = list_one_day
    list_group_manyday.forEach(group_day => {
        
        let between = custom.checkBetweenDate(group_day.startdate,group_day.enddate)+1
        for(let i = 0 ; i < between ; i++){
            let date = new Date(group_day.startdate)
            date.setDate(date.getDate()+i)
            let string_date = custom.createDateToStringFormatDefult(date)
            let oneday = {
                startdate : string_date,
                enddate : string_date,
                description: group_day.description
            }
            result.push(oneday)
        }
    })

    return result

}

module.exports = {
    addLeaveRequest,
    removeLeaveRequest,
    updateStatusLeaveRequest,
    queryHistoryLeaveByMonth,
    queryAllLeaveRequestNotApprove,
    queryLeaveRequestNotApproveForAdmin,
    queryAllLeaveRequestApprove,
    queryHistoryLeaveByID,
    queryForCalendar,
    updateStatusLeaveRequestFromEmail,
    removeLeaveRequestFormEmail,
    queryLeaveHistory,
    querydayByidforCarlendar

};