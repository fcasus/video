// @id = export.ffmpeg.text
// @description = Export for audio
// @doctype = *
// @docproperties = ttsmulti
// @task = export.file
// @exportfilename = Export
// @exportfiletype = json
// @inputdatasource = none
// @timeout = -1

function exec(inData) {

    //Check if we are on an opened document
    if (!Banana.document) { return; }
    var exportObject = {};
    addTable(exportObject, 'Audio');
    //addTable(exportObject, 'Texts');
    return JSON.stringify(exportObject);

}

function addTable(exportObject, tableName)
{
    //Check if the tables exist: if not, the script's execution will stop
    var table = Banana.document.table(tableName)
    if (!table) {
        return;
    }
    var columnNames = table.columnNames;

    exportObject[tableName] = {};
    var obj = exportObject[tableName];
    for (var i = 0; i < table.rowCount; i++) {
        var tRow = table.row(i);
        var line = {};
        line.StartTime = formatTime( tRow.value("StartTime"));
        line.EndTime = formatTime( tRow.value("EndTime"));
        for (var c = 0; c < columnNames.length; c++) {
            var columnName = columnNames[c];
            line[columnName] = tRow.value(columnName);
            if (columnName.startsWith('Adjust_')) {
                line[columnName] = formatTime( tRow.value( columnName));
            }
        }
        obj[i + 1] = line;
    }
    obj.RowCount = table.rowCount;
    
}

function formatTime( time) {
    if (time === '') {
        return '00:00:00.000';
    }
    if (time.length === 8) {
        return time + '.000';
    }
    return time;
}