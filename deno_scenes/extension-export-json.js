// @id = export.ffmpeg.text
// @description = Export for audio
// @doctype = *
// @docproperties = ttsmulti
// @task = export.file
// @exportfilename = Project
// @exportfiletype = json
// @inputdatasource = none
// @timeout = -1

function exec(inData) {

    //Check if we are on an opened document
    if (!Banana.document) { return; }
    var exportProject = {};
    addProjectRows(exportProject);
    //addTable(exportObject, 'Texts');
    return JSON.stringify(exportProject);

}

function addProjectRows(exportProject)
{
    //Check if the tables exist: if not, the script's execution will stop
    var tableProject = Banana.document.table("Project")
    if (!tableProject) {
        return;
    }
    var columnNames = tableProject.columnNames;

    exportProject.Rows = {};
    var obj = exportProject.Rows;
    for (var i = 0; i < tableProject.rowCount; i++) {
        var tRow = tableProject.row(i);
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
    obj.RowCount = tableProject.rowCount;
    
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