
function getToday() {
    var start = new Date(
        new Date(new Date().toLocaleDateString()).getTime()
    ); // 当天0点
    return start
}

function getLastDay() {
    var start = new Date( // 当天23:59
        new Date(new Date().toLocaleDateString()).getTime() -
        24 * 60 * 60 * 1000
    );
    return start
}

// console.log( getToday()  )
// console.log( getLastDay()  )
