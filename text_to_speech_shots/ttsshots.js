// Requires request and request-promise for HTTP requests
// e.g. npm install request request-promise
const rp = require('request-promise');
// Requires fs to write synthesized speech to a file
const fs = require('fs');
// Requires readline-sync to read command line inputs
const readline = require('readline-sync');
// Requires xmlbuilder to build the SSML body
const xmlbuilder = require('xmlbuilder');
// Requires to execute ffmpeg
//const { exec } = require("child_process");
const execSync = require('child_process').execSync;

// Gets an access token.
async function get_AzureAccessToken(subscriptionKey) {

    let options = {
        method: 'POST',
        uri: 'https://westeurope.api.cognitive.microsoft.com/sts/v1.0/issueToken',
        headers: {
            'Ocp-Apim-Subscription-Key': subscriptionKey
        }
    }
    return rp(options);
}

function set_AzureVoices(project) {
    var lang = project.execParam.lang;
    if (lang === 'es') {
        // female voice 'es-ES-ElviraNeural' Spanish(Spain)
        // NEW male voice 'es-ES-AlvaroNeural' Spanish(Spain)
        project.execParam.langCognitiveServices = 'es-ES';
        project.execParam.voiceCognitiveServices = 'ElviraNeural';
    }
    else if (lang === 'en') {
        // female voice 'en-US-AriaNeural' English (United States)
        // NEW female voice 'en-US-JennyNeural' English (United States)
        project.execParam.langCognitiveServices = 'en-US';
        project.execParam.voiceCognitiveServices = 'AriaNeural';
    }
    else if (lang === 'de') {
        // NEW male voice 'de-DE-ConradNeural' German(Germany)
        // NEW female voice 'de-CH-LeniNeural' German(Switzerland)
        project.execParam.langCognitiveServices = 'de-DE';
        project.execParam.voiceCognitiveServices = 'KatjaNeural';
    }
    else if (lang === 'fr') {
        //NEW female voice 'fr-CH-ArianeNeural' French(Switzerland)
        //NEW male voice 'fr-FR-HenriNeural' French(France)
        project.execParam.langCognitiveServices = 'fr-CH';
        project.execParam.voiceCognitiveServices = 'ArianeNeural';
    }
    else if (lang === 'it') {
        // female voice 'it-IT-ElsaNeural' Italian(Italy)
        // NEW female voice 'it-IT-IsabellaNeural' Italian(Italy)
        // NEW male voice 'it-IT-DiegoNeural' Italian(Italy)
        project.execParam.langCognitiveServices = 'it-IT';
        project.execParam.voiceCognitiveServices = 'DiegoNeural';
    }
    else if (lang === 'nl') {
        // female voice 'nl-NL-HannaRUS' Dutch (Netherlands)
        // NEW female voice 'nl-NL-ColetteNeural' Dutch (Netherlands)
        project.execParam.langCognitiveServices = 'nl-NL';
        project.execParam.voiceCognitiveServices = 'ColetteNeural';
    }
    else if (lang === 'zh') {
        // female voice 'zh-CN-XiaoxiaoNeural' Chinese (Mandarin, Simplified)
        // NEW male voice 'zh-CN-YunyangNeural' Chinese(Mandarin, Simplified)
        project.execParam.langCognitiveServices = 'zh-CN';
        project.execParam.voiceCognitiveServices = 'XiaoxiaoNeural';
    }
    else if (lang === 'pt') {
        // female voice 'pt-BR-FranciscaNeural' Portuguese (Brazil)
        // NEW male voice 'pt-BR-AntonioNeural' Portuguese (Brazil)
        // female voice 'pt-PT-FernandaNeural' Portuguese (Portugal) 
        project.execParam.langCognitiveServices = 'pt-BR';
        project.execParam.voiceCognitiveServices = 'FranciscaNeural';
    }
}

async function create_audio_file(accessToken, rowNumber, project) {

    // https://docs.microsoft.com/en-us/azure/cognitive-services/speech-service/rest-text-to-speech
    // https://docs.microsoft.com/en-us/azure/cognitive-services/speech-service/speech-synthesis-markup

    // Get the SSML file contents.
    //var contents = fs.readFileSync(xmlFileName, 'utf8');
    var rows = project.Rows;
    var xmlRequest = '<?xml version="1.0" encoding="UTF-8"?>';
    xmlRequest = '<speak xmlns="https://www.w3.org/2001/10/synthesis" version="1.0" xml:lang="en-US">';
    //xmlRequest += '<voice name="Microsoft Server Speech Text to Speech Voice (es-ES, ElviraNeural)">';

    xmlRequest += '<voice name="Microsoft Server Speech Text to Speech Voice (';
    xmlRequest += project.execParam.langCognitiveServices + ', ';
    xmlRequest += project.execParam.voiceCognitiveServices + ')">';
    if (rows[rowNumber].Audio === 'Duration') {
        xmlRequest += '<prosody duration="' + Math.round(audioObjects[rowNumber].MaxDuration * 1000) + 'ms">';
        xmlRequest += rows[rowNumber].Text;
        xmlRequest += '</prosody>';
    }
    else if (rows[rowNumber].Audio === 'Rfast') {
        xmlRequest += '<prosody rate="+10.00%">';
        xmlRequest += rows[rowNumber].Text;
        xmlRequest += '</prosody>';
    }
    else {
        xmlRequest += rows[rowNumber].Text;
    }
    xmlRequest += '</voice></speak>';

    let options = {
        method: 'POST',
        baseUrl: 'https://westeurope.tts.speech.microsoft.com/',
        url: 'cognitiveservices/v1',
        headers: {
            'Authorization': 'Bearer ' + accessToken,
            'cache-control': 'no-cache',
            'User-Agent': 'BAN_TextToSpeech',
            'X-Microsoft-OutputFormat': 'riff-24khz-16bit-mono-pcm',
            'Content-Type': 'application/ssml+xml'
        },
        body: xmlRequest
    }
    console.log('xmlRequest: ' + xmlRequest);
    var fileName = rows[rowNumber].AudioFileName;
    console.log('Create audio  file: ' + fileName);
    let request = rp(options)
        .on('response', (response) => {
            if (response.statusCode === 200) {
                request.pipe(fs.createWriteStream(fileName));
                console.log('Your file: ' + fileName + ' is ready.\n')
            }
            else {
                console.log('Error status code: ' + response.statusCode + ' \n')
            }
        });
    return request;
}

// I file audio vengono creati solo se i testi sono diversi
// I testi precedenti sono nel  statisticsObjects
async function create_audio_files(project, lastDoneData) {

    var rows = project.Rows;

    var subscriptionKey = String(fs.readFileSync('../../subscription.key')).trim();
    if (!subscriptionKey) {
        throw new Error('Subscription key not found')
    };

    const accessToken = await get_AzureAccessToken(subscriptionKey);

    set_AzureVoices(project);

    for (var i = 1; i <= rows.RowCount; i++) {
        var createAudio = false;
        if (rows[i].CreateAudio) {
            // vedere quando genereare il file audio
            if (!lastDoneData || !lastDoneData.Rows[i]) {
                createAudio = true;
            }
            else if (lastDoneData.Rows[i].Text != rows[i].Text) {
                createAudio = true;
            }
            if (!fileExists(rows[i].AudioFileName)) {
                createAudio = true;
            }
        }
        if (createAudio) {
            await create_audio_file(accessToken, i, project);

            // try {
            // } catch (err) {
            //     //console.log(`Something went wrong: ${err}`);
            // }
            // perché non crea tutti i file
            //await new Promise(resolve => setTimeout(resolve, 3000));
        }
        if (rows[i].AudioFileName) {
            rows[i].AudioDuration = await get_file_duration_seconds(rows[i].AudioFileName);
            // Audio file has a 800ms empty time at the end
            rows[i].AudioDuration = Number(rows[i].AudioDuration) - 0.8;
        }
    }
}

async function create_subtitles_srt_file(project, shot) {

    var output = '';
    var rows = project.Shots[shot].Rows;
    for (var i = 1; i <= rows.RowCount; i++) {
        if (rows[i].CreateAudio) {
            output += i + '\n';
            var startTime = rows[i].AdjustedStartTime;
            startTime = startTime.replace('.', ',');
            var endTime = rows[i].AdjustedEndTime;
            endTime = endTime.replace('.', ',');
            output += startTime + ' --> ' + endTime + '\n';
            output += rows[i].Text + '\n\n';
        }
    }
    fs.writeFileSync(project.Shots[shot].FileSubtitestSrt, output);

}

async function create_subtitles_ass_file(project, shot) {

    // References
    // see https://fileformats.fandom.com/wiki/SubStation_Alpha
    // see http://docs.aegisub.org/3.1/ASS_Tags/
    // see http://www.perlfu.co.uk/projects/asa/ass-specs.doc
    // ass can also generate from srt 
    //ffcommand = 'ffmpeg -y -hide_banner -i subtitles.srt subtitles.ass';


    var output = '';

    output += '[Script Info]\n';
    output += '; Script generated by ttsmulti.js\n';
    output += 'ScriptType: v4.00+\n';
    output += 'PlayResX: 384\n';
    output += 'PlayResY: 288\n',
        output += 'ScaledBorderAndShadow: yes\n';
    output += '\n';
    output += '[V4+ Styles]\n';
    output += 'Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding\n';
    // output += 'Style: Default,Arial,16,&Hffffff,&Hffffff,&H0,&H0,0,0,0,0,100,100,0,0,1,1,0,2,30,30,20,0\n';
    // ffmpeg -i input -filter_complex "subtitles=subs.ass:force_style='OutlineColour=&H80000000,BorderStyle=3,Outline=1,Shadow=0,MarginV=20'" output
    // Color specifies the red RGB color 0x000099. Note that the order is 0xBBGGRR.
    // and note that 153 is the value of 0x000099, in base 10.
    // Color &H9e4835 is the 354894 rgb(53,72,148)
    // PrimaryColour: primary fill color.
    // SecondaryColour: secondary fill color. This is only used for pre-highlight in standard karaoke.
    // OutlineColour sets the border color.
    // BackColour sets the shadow color.
    // Color values are expressed in hexadecimal BGR format as &HBBGGRR& or ABGR (with alpha channel) as &HAABBGGRR&. 
    //     Transparency (alpha) can be expressed as &HAA&. Note that in the alpha channel, 00 is opaque and FF is transparent. 
    //
    // Spacing. Extra space between characters. [pixels]
    // Alignment values are based on the numeric keypad. 
    // 1 - bottom left, 2 - bottom center, 3 - bottom right, 4 - center left, 5 - center center, 6 - center right, 
    // 7 - top left, 8 - top center, 9 - top right. 
    // In addition to determining the position of the subtitle, this also determines the alignment of the text itself. 
    //
    // BorderStyle 	1 - Outline with shadow, 3 - Rendered with an opaque box. 
    // Outline 	The width of the text outline, in pixels.
    // Shadow 	The depth of the text shadow, in pixels. 
    //
    // Within text you can use tags
    // \N Hard break
    // "For more information\Nvisit www.banana.ch"
    output += '; Subtitles style\n';
    output += 'Style: Subtitles,Arial,12,&Hffffff,&Hffffff,&H0,&H0,0,0,0,0,100,100,0,0,3,1,0,2,30,30,20,0\n';
    output += 'Style: SubtitlesTop,Arial,12,&Hffffff,&Hffffff,&H0,&H0,0,0,0,0,100,100,0,0,3,1,0,8,30,30,20,0\n';
    output += '; Explanation texts\n';
    output += 'Style: TextMiddle,Source Sans Pro,32,&H9e4835,&H9e4835,&H9e4835,&H9e4835,1,0,0,0,100,100,0,0,0,0,0,5,10,10,0,0\n';
    // Margin 25, Bold
    output += 'Style: TextTop,Source Sans Pro,23,&H9e4835,&H9e4835,&H9e4835,&H9e4835,1,0,0,0,100,100,0,0,0,0,0,8,10,10,20,0\n';
    output += 'Style: TextGratis,Source Sans Pro,10,&H9e4835,&H9e4835,&H3BE4FF,&H3BE4FF,1,0,0,0,100,100,0,0,3,4,0,8,0,0,56,0\n'; //56 margin-top
    output += '\n';
    output += '[Events]\n';
    output += 'Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text\n';

    var rows = project.Shots[shot].Rows;
    for (var i = 1; i <= rows.RowCount; i++) {
        //Dialogue: 0,0:00:03.44,0:00:08.28,Default,,0,0,0,,Este breve video te explicará cómo crear un presupuesto familiar utilizando el cash manager
        var style = 'Subtitles';
        if (rows[i].Style.length > 0) {
            style = rows[i].Style;
        }
        if (rows[i].Text != ''
            && rows[i].Style != 'None'
            // comments
            && rows[i].Style != '//') {
            output += 'Dialogue: 0,';
            output += rows[i].AdjustedStartTime.substring(1, 11) + ',';
            output += rows[i].AdjustedEndTime.substring(1, 11) + ',';
            output += style;
            output += ',,0,0,0,,';
            output += rows[i].Text + '\n';
        }
    }
    fs.writeFileSync(project.Shots[shot].FileSubtitestAss, output);

}

async function add_subtitles_to_video(project, shot) {


    //var ffcommand = 'ffmpeg -y -hide_banner -i result.mp4 -i subtitles.srt -c copy -c:s mov_text language=esp result-srt.mp4';
    var ffcommand = 'ffmpeg -y -hide_banner -i ' + project.Shots[shot].FileOutputBase;

    ffcommand += ' -i ' + project.Shots[shot].FileSubtitestSrt;
    ffcommand += ' -c:a copy -c:v copy -c:s mov_text -metadata:s:s:0 language=esp ';
    ffcommand += project.Shots[shot].FileOutputSrt;

    //await executeCommand(ffcommand);

    //ffcommand = 'ffmpeg -y -hide_banner -i subtitles.srt subtitles.ass';
    //await executeCommand(ffcommand);

    ffcommand = 'ffmpeg -y -hide_banner -i ' + project.Shots[shot].FileOutputBase;
    ffcommand += ' -vf ass=' + project.Shots[shot].FileSubtitestAss + ' ' + project.Shots[shot].FileOutputAss;
    await executeCommand(ffcommand);

}

async function executeCommand(command) {
    console.log('\nExecuting command : ' + command);
    execSync(command, (error, stdout, stderr) => {
        if (error) {
            console.log(`error: ${error.message}`);
            return;
        }
        if (stderr) {
            console.log(`stderr: ${stderr}`);
            return;
        }
        console.log(`stdout: ${stdout}`);
    });
    //await new Promise(resolve => setTimeout(resolve, 500));
}

function time_parseTimeToMillSeconds(timeText) {
    // parse time "00:00:03.436"
    var mseconds = 0.0;
    if (!timeText) {
        return mseconds;
    }
    if (timeText.startsWith('-')) {
        timeText = timeText.substring(1);
    }
    mseconds += parseFloat(timeText.substring(0, 2)) * 60 * 60 * 1000;
    mseconds += parseFloat(timeText.substring(3, 5)) * 60 * 1000;
    mseconds += parseFloat(timeText.substring(6, 12)) * 1000;
    mseconds = Math.round(mseconds);
    if (negative) {
        mseconds *= (-1);
    }
    return mseconds;
}
function time_parseTimeToSeconds(timeText) {
    // parse time "00:00:03.436"
    // parse time "-00:00:03.436"
    var seconds = 0.0;
    if (!timeText) {
        return seconds;
    }
    var negative = false;
    if (timeText.startsWith('-')) {
        timeText = timeText.substring(1);
    }
    seconds += parseFloat(timeText.substring(0, 2)) * 60 * 60;
    seconds += parseFloat(timeText.substring(3, 5)) * 60;
    seconds += parseFloat(timeText.substring(6, 12));
    if (negative) {
        seconds *= (-1);
    }
    return seconds;
}

// Use async and await to get the token before attempting to convert text to speech.
async function get_file_duration_seconds(fileName) {
    if (!fs.existsSync(fileName)) {
        console.log('File does not exists : ' + fileName);
        return 0;
    }
    var tempfile = 'duration.txt';
    var ffcommand = 'ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 ';
    ffcommand += fileName + ' > ' + tempfile + ' 2>&1';
    await executeCommand(ffcommand);
    //await new Promise(resolve => setTimeout(resolve, 1000));
    var contents = String(fs.readFileSync(tempfile));
    var duration = parseFloat(contents.trim());
    //fs.unlinkSync(tempfile);
    return duration;
}

// Use async and await to get the token before attempting to convert text to speech.
async function add_audio_to_video(project, shot) {

    const resultFile = project.Shots[shot].FileOutputBase;
    const inputVideoFile = project.Shots[shot].InputVideoFile;
    if (!fs.existsSync(inputVideoFile)) {
        console.log('Video file does not exists : ' + inputVideoFile);
        return;
    }
    var ffcommand = 'ffmpeg -y -hide_banner -i ' + inputVideoFile + ' ';
    var rows = project.Shots[shot].Rows;
    var filter1 = '';
    var filter2 = '';
    var countFiles = 0;
    for (var i = 1; i <= rows.RowCount; i++) {
        if (rows[i].CreateAudio) {
            countFiles++;
            ffcommand = ffcommand + '-i ' + rows[i].AudioFileName + ' ';
            // "[1]adelay=500[s1];[2]adelay=3000[s2];[s1][s2]amix=2[mixout]"
            //var startTime = audioObjects[i].StartTime;
            //var delay = Math.round(audioObjects[i].EffectiveStartTimeSeconds * 1000);
            var delay = Math.round(rows[i].AdjustedStartTimeSeconds * 1000);
            //console.log((i) + ' Delay : ' + delay + ' Duration max:' + duration);
            filter1 += '[' + String(countFiles) + ']adelay=';
            filter1 += Math.round(delay) + '[a' + String(countFiles) + '];'
            filter2 += '[a' + String(countFiles) + ']'
        }
    }
    ffcommand += '-filter_complex "';
    ffcommand += filter1 + filter2;
    ffcommand += 'amix=inputs=' + countFiles;
    ffcommand += ':dropout_transition=' + Math.round(project.Shots[shot].AdjustedEndTimeSeconds);
    ffcommand += ',volume=' + project.Video.Volume;
    ffcommand += '[mixout]"';
    ffcommand += ' -map 0:v -map [mixout] -c:v copy ' + resultFile;
    await executeCommand(ffcommand);
}

async function deletefiles(project) {


    var files = [];
    var dirFiles = fs.readdirSync(project.execParam.lang);
    dirFiles.forEach(file => {
        if (file.startsWith('shot')) {
            files.push(project.execParam.lang + '/' + file);
        }
    });
    files.push(project.Video.FileSubtitestSrt);
    files.push(project.Video.FileSubtitestAss);
    files.push(project.Video.FileOutputBase);
    files.push(project.Video.FileOutputAss);
    files.push(project.Video.FileOutputSrt);
    files.push(project.Video.FileTimes);
    files.push(project.Video.FileTotalDuration);

    for (i = 0; i < files.length; i++) {
        if (fs.existsSync(files[i])) {
            fs.unlinkSync(files[i]);
        }
    }
}

function time_SecondsToTime(timeInSeconds) {
    var pad = function (num, size) { return ('000' + num).slice(size * -1); },
        time = parseFloat(timeInSeconds).toFixed(3),
        hours = Math.floor(time / 60 / 60),
        minutes = Math.floor(time / 60) % 60,
        seconds = Math.floor(time - minutes * 60),
        milliseconds = time.slice(-3);
    return pad(hours, 2) + ':' + pad(minutes, 2) + ':' + pad(seconds, 2) + '.' + pad(milliseconds, 3);
}

function calculate_shots_times(project) {

    for (var shot = 1; shot <= project.Shots.ShotCount; shot++) {
        var rows = project.Shots[shot].Rows;
        //var colAdjust = 'Adjust_' + rows.lang;
        var totalAudioDuration = 0;
        var nextStartTimeSeconds = 0;
        var lastFinishTimeSeconds = 0;
        console.log(`rows.RowCount ` + rows.RowCount);
        for (var i = 1; i <= rows.RowCount; i++) {
            if (rows[i].CreateAudio) {
                adjustedStartTimeSeconds = rows[i].StartTimeSeconds;
                // Calcoliamo l'inizio successivo se minore
                if (adjustedStartTimeSeconds < lastFinishTimeSeconds) {
                    adjustedStartTimeSeconds = lastFinishTimeSeconds;
                    // aggiungiamo un leggero intervallo
                    adjustedStartTimeSeconds += 0.2;
                }
                rows[i].AdjustedStartTimeSeconds = adjustedStartTimeSeconds;
                rows[i].AdjustedStartTime = time_SecondsToTime(adjustedStartTimeSeconds);
                lastFinishTimeSeconds = adjustedStartTimeSeconds + rows[i].MaxDuration;
                rows[i].AdjustedEndTimeSeconds = lastFinishTimeSeconds;
                rows[i].AdjustedEndTime = time_SecondsToTime(lastFinishTimeSeconds);
            }
        }
        project.Shots[shot].AdjustedEndTimeSeconds = Math.ceil(lastFinishTimeSeconds);
        project.Shots[shot].AdjustedEndTime = time_SecondsToTime(lastFinishTimeSeconds);
    }
}

async function create_shots_videoduration(project) {

    project.Shots.TotalVideoDuration = 0;

    for (var shot = 1; shot <= project.Shots.ShotCount; shot++) {
        if (!project.Shots[shot].InputVideoFile.startsWith('#')) {
            project.Shots[shot].InputVideoDuration = await get_file_duration_seconds(project.Shots[shot].InputVideoFile);
            project.Shots[shot].UsedVideoDuration = project.Shots[shot].InputVideoDuration;
            var expandDuration = false;
            var cutDuration = false;
            if (Math.ceil(project.Shots[shot].AdjustedEndTimeSeconds) > Math.ceil(project.Shots[shot].InputVideoDuration)) {
                expandDuration = true;
            }
            // dobbiamo mettere il tempo
            if (!expandDuration && project.Shots[shot].VideoFile.startsWith('#')) {
                if (project.Shots[shot].AdjustedEndTimeSeconds < project.Shots[shot].InputVideoDuration) {
                    var cutDuration = true;
                }
            }
            if (expandDuration) {
                project.Shots[shot].AdjustedVideoDuration = project.Shots[shot].AdjustedEndTimeSeconds;
                project.Shots[shot].UsedVideoDuration = project.Shots[shot].AdjustedVideoDuration;
                var newInputVideoFile = project.execParam.lang + '/shot' + shot + '-videoinput' + project.execParam.videoFileExtension;
                // usa solo centesimi 
                var ffcommand = 'ffmpeg -y -i ' + project.Shots[shot].InputVideoFile;
                ffcommand += ' -t ' + time_SecondsToTime(project.Shots[shot].AdjustedEndTimeSeconds).slice(0, -1);
                ffcommand += ' -c copy  ' + newInputVideoFile;
                project.Shots[shot].InputVideoFile = newInputVideoFile;
                await executeCommand(ffcommand);
            }
            if (cutDuration) {
                project.Shots[shot].AdjustedVideoDuration = project.Shots[shot].AdjustedEndTimeSeconds;
                project.Shots[shot].UsedVideoDuration = project.Shots[shot].AdjustedVideoDuration;
                var newInputVideoFile = project.execParam.lang + '/shot' + shot + '-videoinput' + project.execParam.videoFileExtension;
                // usa solo centesimi 
                var ffcommand = 'ffmpeg -y -ss 00:00:00 -i ' + project.Shots[shot].InputVideoFile;
                ffcommand += ' -to ' + time_SecondsToTime(project.Shots[shot].AdjustedEndTimeSeconds).slice(0, -1);
                ffcommand += ' -c copy  ' + newInputVideoFile;
                project.Shots[shot].InputVideoFile = newInputVideoFile;
                await executeCommand(ffcommand);
            }
            project.Shots.TotalVideoDuration += project.Shots[shot].UsedVideoDuration;
        }
    }
}

function write_text_times(project) {
    var text = '';
    text += project.execParam.lang + '\n';
    text += 'Line\tRemain\t\Starts\tDuration\tText\n';
    for (var i = 1; i <= project.Rows.RowCount; i++) {
        var duration = '';
        var remaining = '';
        var starts = '';
        if (project.Rows[i].Rows !== '0') {
            duration += Math.round(project.Rows[i].AudioDuration * 1000) / 1000;
            remaining += Math.round(project.Rows[i].SecondsRemaining * 1000) / 1000;
            starts += Math.round(project.Rows[i].AdjustedStartTimeSeconds * 1000) / 1000;
        }

        text += i + '\t'
        if (!remaining.startsWith('-')) {
            text += ' ';
        }
        text += remaining + '\t';
        text += starts + '\t';
        text += duration + '\t';
        text += project.Rows[i].Text + '\t';
        text += '\n';
    }
    fs.writeFileSync(project.Video.FileTimes, text);

}

function write_text_durations(project) {
    var totalduration = Number(0);
    var text = '';
    text += project.ExecParam.lang + '\n';
    text += 'Line\tDuration\tTotDuration\tText\n';
    for (var i = 1; i <= project.Rows.RowCount; i++) {
        var duration = '';
        var tmpduration = Number(0);
        if (project.Rows[i].Rows !== '0') {
            duration += Math.round(project.Rows[i].AudioDuration * 1000) / 1000;
            tmpduration = Number(Math.round(project.Rows[i].AudioDuration * 1000));
            totalduration += tmpduration;
        }
        text += i + '\t'
        text += duration + '\t';
        text += Math.round(totalduration) / 1000 + '\t';
        text += project.Rows[i].Text + '\t';
        text += '\n';
    }
    text += 'Total duration time: ' + Math.round(totalduration) / 1000;

    fs.writeFileSync(project.Video.FileTotalDuration, text);
}


async function dirCreate(dir) {

    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir);
    }
}

function fileExists(fileName) {
    if (!fileName) {
        return false;
    }
    try {
        fs.statSync(fileName);
        return true;
    }
    catch (e) {
        return false;
    }
}

async function create_video_language(execParam) {

    // read ac2 export
    var contents = fs.readFileSync('Project.json', 'utf8');
    var project = JSON.parse(contents);
    project.execParam = execParam;
    var lang = project.execParam.lang;

    // create language dir
    dirCreate(lang);


    project.execParam.columnLang = "Lang_" + lang;

    project.Video = {};
    project.Video.FileInput = execParam.videoFileInput + execParam.videoFileExtension;
    project.Video.FileOutputBase = lang + '/' + execParam.videoFileInput + '-' + lang + execParam.videoFileExtension;
    project.Video.FileOutputAss = lang + '/' + execParam.videoFileInput + '-ass-' + lang + execParam.videoFileExtension;
    project.Video.FileOutputSrt = lang + '/' + execParam.videoFileInput + '-srt-' + lang + execParam.videoFileExtension;
    // durata del file video
    project.Video.Duration = await get_file_duration_seconds(project.Video.FileInput);
    project.Video.Volume = 10;
    project.Video.FileSubtitestSrt = lang + '/subtitles-' + lang + '.srt';
    project.Video.FileSubtitestAss = lang + '/subtitles-' + lang + '.ass';
    project.Video.FileTimes = lang + '/times-' + lang + '.txt';
    project.Video.FileTotalDuration = lang + '/duration-' + lang + '.txt';

    // cancella i file
    await deletefiles(project);

    for (var i = 1; i <= project.Rows.RowCount; i++) {
        project.Rows[i].CreateAudio = false;
        project.Rows[i].Text = project.Rows[i][project.execParam.columnLang];
        if (project.Rows[i].Text != ''
            && !project.Rows[i].Style.startsWith('//')) {
            if (project.Rows[i].Audio !== '0') {
                project.Rows[i].CreateAudio = true;
                project.Rows[i].AudioFileName = lang + '/a' + i + '.wav';
            }
        }
    }


    // Legge il file con i tempi
    project.settings = {};
    project.settings.lastDoneFile = lang + '\\last-done-' + lang + '.json';
    // Crea i file audio solo se il testo è cambiato
    if (execParam.createAudio) {
        var lastDoneData;
        if (fileExists(project.settings.lastDoneFile)) {
            var statistics = fs.readFileSync(project.settings.lastDoneFile, 'utf8');
            lastDoneData = JSON.parse(statistics);
        }
        await create_audio_files(project, lastDoneData);
    }
    // Calcola i tempi
    rows = project.Rows;
    for (var i = 1; i <= rows.RowCount; i++) {
        // Converti in secondi
        rows[i].StartTimeSeconds = time_parseTimeToSeconds(rows[i].StartTime);
        rows[i].EndTimeSeconds = time_parseTimeToSeconds(rows[i].EndTime);
        rows[i].ExpectedDuration = rows[i].EndTimeSeconds - rows[i].StartTimeSeconds;
        rows[i].MaxDuration = rows[i].ExpectedDuration;
        if (rows[i].CreateAudio) {
            if (rows[i].MaxDuration < rows[i].AudioDuration) {
                rows[i].MaxDuration = rows[i].AudioDuration;
            }
        }
        // Mettiamolo qui perché serve anche per quelli che non hanno audio
        rows[i].AdjustedStartTimeSeconds = rows[i].StartTimeSeconds;
        rows[i].AdjustedStartTime = time_SecondsToTime(rows[i].StartTimeSeconds);
        rows[i].AdjustedEndTimeSeconds = rows[i].StartTimeSeconds + rows[i].MaxDuration;
        rows[i].AdjustedEndTime = time_SecondsToTime(rows[i].AdjustedEndTimeSeconds);
    }
    // salviamo una prima volta per evitare di rifare l'audio, nel caso che si blocca dopo
    fs.writeFileSync(project.settings.lastDoneFile, JSON.stringify(project));

    await create_shots(project);

    // rifacciamolo con tutti i dati
    fs.writeFileSync(project.settings.lastDoneFile, JSON.stringify(project));


    return true;
}
async function create_video_fromimages(project) {

    for (var shot = 1; shot <= project.Shots.ShotCount; shot++) {
        var inputVideo = project.Shots[shot].InputVideoFile;
        if (inputVideo.endsWith('.png')) {
            var outputVideo = project.execParam.lang + '/shot' + shot + '-inputvideo.mp4';
            var ffcommand = 'ffmpeg -loop 1 -i ' + inputVideo;
            ffcommand += ' -framerate 25 -c:v libx264 -t ' + Math.ceil(project.Shots[shot].AdjustedEndTimeSeconds);
            ffcommand += ' -pix_fmt yuv420p -vf scale=1920:1080  ' + outputVideo;
            await executeCommand(ffcommand);
            project.Shots[shot].InputVideoFile = outputVideo;
        }
    }
}

async function create_shots(project) {

    var rows = project.Rows;
    var shot = 0;
    project.Shots = {};
    var rowCount = 0;
    for (var i = 1; i <= rows.RowCount; i++) {
        var inputVideoFile = rows[i].VideoFile;
        if (i == 1 && !inputVideoFile) {
            inputVideoFile = "#none";
        }
        if (inputVideoFile.length > 0) {
            shot++;
            project.Shots[shot] = {};
            project.Shots[shot].VideoFile = inputVideoFile;
            if (inputVideoFile === '#mid-page') {
                inputVideoFile = '../' + project.execParam.videoMidPage;
            }
            else if (inputVideoFile === '#start-page') {
                inputVideoFile = '../' + project.execParam.videoStartPage;
            }
            project.Shots[shot].InputVideoFile = inputVideoFile;

            // quello che impostato la duration
            project.Shots[shot].FileSubtitestSrt = project.execParam.lang + '/shot' + shot + '-subtitles.srt';
            project.Shots[shot].FileSubtitestAss = project.execParam.lang + '/shot' + shot + '-subtitles.ass';
            project.Shots[shot].FileOutputBase = project.execParam.lang + '/shot' + shot + '-video-base' + project.execParam.videoFileExtension;
            project.Shots[shot].FileOutputAss = project.execParam.lang + '/shot' + shot + '-video-ass' + project.execParam.videoFileExtension;
            project.Shots[shot].FileOutputSrt = project.execParam.lang + '/shot' + shot + '-video-srt' + project.execParam.videoFileExtension;

            project.Shots[shot].Rows = {};
            rowCount = 1;
            project.Shots[shot].Rows.RowCount = 1;
        }
        project.Shots[shot].Rows.RowCount = rowCount;
        project.Shots[shot].Rows[rowCount] = rows[i];
        project.Shots[shot].Rows[rowCount].RowOrigin = i;
        rowCount++;
    }
    project.Shots.ShotCount = shot;

    calculate_shots_times(project);

    create_video_fromimages(project);

    await create_shots_videoduration(project);

    for (var shot = 1; shot <= project.Shots.ShotCount; shot++) {

        if (!project.Shots[shot].InputVideoFile.startsWith('#')) {
            //await create_subtitles_srt_file(project, shot);
            await create_subtitles_ass_file(project, shot);

            // write_text_times(project);
            // write_text_durations(project);

            if (project.execParam.createVideo) {
                await add_audio_to_video(project, shot);
            }

            if (project.execParam.createSubtitles) {
                await add_subtitles_to_video(project, shot);
            }
        }
    }
    await create_shots_concatenate(project);
    return true;
}

async function create_shots_concatenate(project) {

    var output_base = '';
    var output_srt = '';
    var output_ass = '';
    // creiamo nel directory corrente perché la lingua è già nel file 
    // e prende relativi al file di input
    var inputFile = 'input.txt';
    for (var shot = 1; shot <= project.Shots.ShotCount; shot++) {

        if (!project.Shots[shot].InputVideoFile.startsWith('#')) {
            output_base += 'file ' + "'" + project.Shots[shot].FileOutputBase + "'" + '\n';
            output_srt += 'file ' + "'" + project.Shots[shot].FileOutputSrt + "'" + '\n';
            output_ass += 'file ' + "'" + project.Shots[shot].FileOutputAss + "'" + '\n';
        }
    }
    //ffmpeg -safe 0 -f concat -segment_time_metadata 1 -i file.txt -vf select=concatdec_select -af aselect=concatdec_select,aresample=async=1 out.mp4
    fs.writeFileSync(inputFile, output_base);
    console.log('\nLog input.txt: \n' + output_base);
    //var ffcommand = 'ffmpeg -f concat -safe 0 -i ' + inputFile + ' -c copy ' + project.Video.FileOutputBase;
    var ffcommand = 'ffmpeg -f concat -safe 0 -i ' + inputFile + ' ' + project.Video.FileOutputBase;
    //await executeCommand(ffcommand);
    //fs.unlinkSync(inputFile);

    fs.writeFileSync(inputFile, output_srt);
    //console.log('\nLog input.txt: \n' + output_base);    
    var ffcommand = 'ffmpeg -f concat -safe 0 -i  ' + inputFile + ' -framerate 25 -c copy ' + project.Video.FileOutputSrt;
    //await executeCommand(ffcommand);
    //fs.unlinkSync(inputFile);

    fs.writeFileSync(inputFile, output_ass);
    console.log('\nLog input.txt: \n' + output_ass);
    //var ffcommand = 'ffmpeg -f concat -safe 0 -i  ' + inputFile + ' -framerate 25 -c copy ' + project.Video.FileOutputAss;
    var ffcommand = 'ffmpeg -f concat -safe 0 -i  ' + inputFile + ' -r 25 ' + project.Video.FileOutputAss;

    await executeCommand(ffcommand);
    //fs.unlinkSync(inputFile);

    return true;
}
async function main() {
    // A. Utente ha creato questi file nel 
    //   aa. Directory progetto
    //       - video files
    //       - Project.jsons (file del progetto esportato dal Banana)
    //   bb. Directory principarel i execParam
    // - export.jsons
    // 1. Legge i parametri di esecuzione dal file
    //   - Si sposta nelle directory progetto video
    //   - Crea le directory della lingua
    // 2. Avvia la sequenza per creare il video specifico alla lingua
    //    create_lang_video(lang)
    // 3. Legge il file Project.json
    // 4. Crea la struttura project
    // 5. Crea i file audio (speech)
    // 6. Sequenza le scene Json
    //    - calcola durata massima scena
    // 7. Crea i file video per le separazione
    // 7. Adatta durata file scene
    // 8. Aggiunge audio ai file scene  
    // 9. Aggiunge sottotitoli alle scene
    // 10. Monta assieme tutte le scene e crea file video finale

    // Per funzionare i file video devono essere formato mp4
    // Devono avere un framerate di 25. Se non lo si fa le durate non sono corrette
    // Usare il comando qui sotto per settare il framerate a 25
    // ffmpeg -i input.mp4 -filter:v fps=fps=25 output.mp4


    console.log(`-----------------------------------------`);
    console.log(`------------  START ---------------------`);
    console.log(`-----------------------------------------`);
    var paramText = fs.readFileSync('execParam.json', 'utf8');
    var execParam = JSON.parse(paramText);
    //execParam.projectSubDirectory = 'budget';
    //execParam.videoFileInput = 'family-budget';
    //execParam.videoFileExtension = '.mp4';
    // Insert the language code
    //execParam.outputLanguages = 'en';
    // multiple languages separated by ';'
    //execParam.outputLanguages = 'en;es';

    // creation parameters
    execParam.createAudio = true;
    execParam.createVideo = true;
    execParam.execTest = true;
    execParam.createSubtitles = true;
    // disable
    //execParam.createAudio = false;
    //execParam.createVideo = false;
    //execParam.createSubtitles = false;
    execParam.execTest = false;

    // Change directory
    process.chdir(execParam.projectSubDirectory);

    var languages = execParam.outputLanguages.split(';');
    for (let i = 0; i < languages.length; i++) {
        execParam.lang = languages[i];
        await create_video_language(execParam);
    }
    console.log(`-----------------------------------------`);
    console.log(`------------ All Finished ---------------`);
    console.log(`-----------------------------------------`);

}

// Run the application
main();

