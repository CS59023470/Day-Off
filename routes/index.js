var express = require('express');
var router = express.Router();

var sheet_login = require('../controller/loginController');
var sheet_user = require('../controller/userController');
var sheet_leave = require('../controller/leaveController');
var sheet_holiday = require('../controller/holidayController');
var sheet_day_off = require('../controller/dayoffController');
var sheet_weekend = require('../controller/weekendController');
var sheet_config = require('../controller/configDayController');

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
});

//-- Login Controller
router.get('/userLogin/:email',sheet_login.checkUserLogin)

//-- User Controller
router.get('/queryAllUser',sheet_user.queryAllUser)
router.get('/queryDayLeft/:id',sheet_user.queryDayLeft)
router.get('/queryAllUserforSearch/',sheet_user.queryAllUserforSearch)
router.get('/queryUsers',sheet_user.queryAllUsers)

//-- Day Off Controller
router.get('/queryAllDayOff',sheet_day_off.quryAllDayOff)

//-- Leave Controller
router.post('/addLeaveRequest',sheet_leave.addLeaveRequest)
router.get('/allLeaveRequestApprove',sheet_leave.queryAllLeaveRequestApprove)
router.get('/updateLeaveRequest/:id/:idManager',sheet_leave.updateStatusLeaveRequest)
router.get('/removeLeaveRequest/:id/:idManager',sheet_leave.removeLeaveRequest)
router.post('/historyallbymonth',sheet_leave.queryHistoryLeaveByMonth)
router.post('/allLeaveRequestNotApprove',sheet_leave.queryAllLeaveRequestNotApprove)
router.post('/leaveRequestForAdmin',sheet_leave.queryLeaveRequestNotApproveForAdmin)
router.get('/historyallbyid/:id',sheet_leave.queryHistoryLeaveByID)
router.get('/queryforcalendar',sheet_leave.queryForCalendar)
router.post('/historyall',sheet_leave.queryLeaveHistory)
router.get('/allLeaveForReport',sheet_leave.queryAllLeaveForReport)
router.post('/querydaybyid',sheet_leave.querydayByidforCarlendar)
//queryAllLeaveForReport

//-- Email Controller
router.get('/updateLeaveRequestFromEmail/:id/:emailManager',sheet_leave.updateStatusLeaveRequestFromEmail)
router.get('/removeLeaveRequestFromEmail/:id/:emailManager',sheet_leave.removeLeaveRequestFormEmail)

//-- Weekend Controller
router.get('/allWeekend',sheet_weekend.queryAllWeekend)

//-- Holiday Controller
router.post('/specialHolidayById',sheet_holiday.queryUserSpecialHolidayById)

//-- Config Day Controller
router.get('/configday',sheet_config.queryConfigDay)

module.exports = router;
