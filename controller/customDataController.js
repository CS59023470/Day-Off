
//-- For User Data
function createStatusUserToString(status){
    switch(status){
        case '0' || 0 : return 'super_admin';
        case '1' || 1 : return 'admin';
        case '2' || 2 : return 'employee';
        default : return undefined;
    }
}

function createStatusWorkingToString(status){
    switch(status){
        case '0' || 0 : return 'full_time';
        case '1' || 1 : return 'internship';
        case '2' || 2 : return 'part_time';
        default : return undefined;
    }
}

function createStatusActiveToString(status){
    switch(status){
        case '0' || 0 : return 'not_active';
        case '1' || 1 : return 'active';
        default : return undefined;
    }
}

//function คำนวณผลรวมวันลางาน
function calculatedTotalDay(data){

    let string_check_full_day = 'All-Day';
    let typeDay = data.typeday;  // 0 คือ <= ลา 1 วัน , 1 คือ > ลาหลายวัน

    let startDate = new Date(""+data.startdate); 
    let startTime = ""+data.starttime;

    let endDate = new Date(""+data.enddate); 
    let endTime = ""+data.endtime;
    
    if(typeDay === 0 || typeDay === '0'){
        //ลา <= 1 วัน  (เช้า,บ่าย,เต็มวัน)
        if(startTime === string_check_full_day){
            return 1;
        }else{
            return 0.5;
        }
    }else{
        let string_start_date = `${(startDate.getMonth() + 1)}/${startDate.getDate()}/${startDate.getFullYear()}`;
        let string_end_date = `${(endDate.getMonth() + 1)}/${endDate.getDate()}/${endDate.getFullYear()}`
        let total_day = checkBetweenDate(string_start_date,string_end_date) + 1;

        if(startTime !== string_check_full_day){
            total_day = total_day - 0.5;
        }

        if(endTime !== string_check_full_day){
            total_day = total_day - 0.5;
        }

        return total_day
    }
}

function checkBetweenDate(startDate , endDate){
    let start = new Date(startDate); 
    let end = new Date(endDate); 
    let Difference_In_Time = end.getTime() - start.getTime(); 
  
    return Difference_In_Time / (1000 * 3600 * 24);
}

function createRowId(){
    let date = new Date();
    let rowId = `${date.getDate()}${date.getMonth()+1}${date.getFullYear()}${date.getHours()}${date.getMinutes()}${date.getMilliseconds()}`;
    return rowId;
}

//Format Date To String
function createDateToString(data){
    let date = new Date(data);

    return `${date.getDate()}/${date.getMonth()+1}/${date.getFullYear()}`;
}

//Format defult Date To String
function createDateToStringFormatDefult(data){
    let date = new Date(data);
    let stringYear = date.getFullYear()+''
    let stringMonth = ''
    let stringDay = ''
    
    if((date.getMonth()+1) < 10){
        stringMonth = '0'+(date.getMonth()+1)
    }else{
        stringMonth = ''+(date.getMonth()+1)
    }
    if(date.getDate() < 10){
        stringDay = '0'+date.getDate()
    }else{
        stringDay = ''+date.getDate()
    }
    return `${stringYear}-${stringMonth}-${stringDay}`
}

//Format Date To String And Name Month
function createDateToStringforEmail(data){
    let month = ['January','February','March','April','May','June','July','August','September','October','November','December',]
    let date = new Date(data);

    return `${date.getDate()} ${month[date.getMonth()]} ${date.getFullYear()}`;
}

module.exports = {
    createStatusUserToString,
    createStatusWorkingToString,
    createStatusActiveToString,
    calculatedTotalDay,
    createRowId,
    createDateToString,
    createDateToStringforEmail,
    checkBetweenDate,
    createDateToStringFormatDefult
};