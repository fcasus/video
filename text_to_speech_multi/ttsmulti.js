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
function getAccessToken(subscriptionKey) {

    let options = {
        method: 'POST',
        uri: 'https://westeurope.api.cognitive.microsoft.com/sts/v1.0/issueToken',
        headers: {
            'Ocp-Apim-Subscription-Key': subscriptionKey
        }
    }
    return rp(options);
}

function textToSpeech_SetVoices(allObjects) {
    var audioObjects = allObjects.Audio;
    if (audioObjects.lang === 'es') {
        audioObjects.langCognitiveServices = 'es-ES';
        audioObjects.voiceCognitiveServices = 'ElviraNeural';
    }
    else if (audioObjects.lang === 'en') {
        audioObjects.langCognitiveServices = 'en-US';
        audioObjects.voiceCognitiveServices = 'AriaNeural';
    }
    else if (audioObjects.lang === 'de') {
        audioObjects.langCognitiveServices = 'de-DE';
        audioObjects.voiceCognitiveServices = 'KatjaNeural';
    }
    else if (audioObjects.lang === 'fr') {
        audioObjects.langCognitiveServices = 'fr-FR';
        audioObjects.voiceCognitiveServices = 'HortenseRUS';
    }
    else if (audioObjects.lang === 'fr') {
        audioObjects.langCognitiveServices = 'fr-FR';
        audioObjects.voiceCognitiveServices = 'HortenseRUS';
    }
    else if (audioObjects.lang === 'it') {
        audioObjects.langCognitiveServices = 'it-IT';
        audioObjects.voiceCognitiveServices = 'ElsaNeural';
    }
    else if (audioObjects.lang === 'nl') {
        audioObjects.langCognitiveServices = 'nl-NL';
        audioObjects.voiceCognitiveServices = 'HannaRUS';
    }
    else if (audioObjects.lang === 'zh') {
        audioObjects.langCognitiveServices = 'zh-CN';
        audioObjects.voiceCognitiveServices = 'XiaoxiaoNeural';
    }
    else if (audioObjects.lang === 'pt') {
        audioObjects.langCognitiveServices = 'pt-BR';
        audioObjects.voiceCognitiveServices = 'FranciscaNeural';
    }
}

function textToSpeech(accessToken, rowNumber, audioObjects) {

    // https://docs.microsoft.com/en-us/azure/cognitive-services/speech-service/rest-text-to-speech
    // https://docs.microsoft.com/en-us/azure/cognitive-services/speech-service/speech-synthesis-markup

    // Get the SSML file contents.
    //var contents = fs.readFileSync(xmlFileName, 'utf8');

    var xmlRequest = '<?xml version="1.0" encoding="UTF-8"?>';
    xmlRequest = '<speak xmlns="https://www.w3.org/2001/10/synthesis" version="1.0" xml:lang="en-US">';
    //xmlRequest += '<voice name="Microsoft Server Speech Text to Speech Voice (es-ES, ElviraNeural)">';

    xmlRequest += '<voice name="Microsoft Server Speech Text to Speech Voice (';
    xmlRequest += audioObjects.langCognitiveServices + ', ';
    xmlRequest += audioObjects.voiceCognitiveServices + ')">';
    if (audioObjects[rowNumber].Audio === 'Duration') {
        xmlRequest += '<prosody duration="' + Math.round(audioObjects[rowNumber].MaxDuration * 1000) + 'ms">';
        xmlRequest += audioObjects[rowNumber].Text;
        xmlRequest += '</prosody>';
    }
    else if (audioObjects[rowNumber].Audio === 'Rfast') {
        xmlRequest += '<prosody rate="+10.00%">';
        xmlRequest += audioObjects[rowNumber].Text;
        xmlRequest += '</prosody>';
    }
    else {
        xmlRequest += audioObjects[rowNumber].Text;
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
    var fileName = audioObjects[rowNumber].FileName;
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

// Use async and await to get the token before attempting to convert text to speech.
async function create_audio_files(allObjects, statisticsObjects) {

    var audioObjects = allObjects.Audio;

    var subscriptionKey = String(fs.readFileSync('../../subscription.key')).trim();
    if (!subscriptionKey) {
        throw new Error('Subscription key not found')
    };

    const accessToken = await getAccessToken(subscriptionKey);

    textToSpeech_SetVoices(allObjects);

    for (var i = 1; i <= audioObjects.RowCount; i++) {
        var createAudio = false;
        if (audioObjects[i].FileName) {
            if (!statisticsObjects || !statisticsObjects.Audio[i]) {
                createAudio = true;
            }
            else if (statisticsObjects.Audio[i].Text != audioObjects[i].Text) {
                createAudio = true;
            }
            if (!fileExists(audioObjects[i].FileName)) {
                createAudio = true;
            }
        }
        if (createAudio) {
            await textToSpeech(accessToken, i, audioObjects);

            // try {
            // } catch (err) {
            //     //console.log(`Something went wrong: ${err}`);
            // }
            // perché non crea tutti i file
            //await new Promise(resolve => setTimeout(resolve, 3000));
        }
    }
}

async function create_subtitles_srt(allObjects) {

    var output = '';
    for (var i = 1; i <= allObjects.Audio.RowCount; i++) {
        if (allObjects.Audio[i].FileName) {
            output += i + '\n';
            var startTime = allObjects.Audio[i].AdjustedStartTime;
            startTime = startTime.replace('.', ',');
            var endTime = allObjects.Audio[i].AdjustedEndTime;
            endTime = endTime.replace('.', ',');
            output += startTime + ' --> ' + endTime + '\n';
            output += allObjects.Audio[i].Text + '\n\n';
        }
    }
    fs.writeFileSync(allObjects.Video.FileSubtitestSrt, output);

}

async function create_subtitles_ass(allObjects) {

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
    output += '\n';
    output += '[Events]\n';
    output += 'Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text\n';

    var audioObjects = allObjects.Audio;
    for (var i = 1; i <= audioObjects.RowCount; i++) {
        //Dialogue: 0,0:00:03.44,0:00:08.28,Default,,0,0,0,,Este breve video te explicará cómo crear un presupuesto familiar utilizando el cash manager
        var style = 'Subtitles';
        if (audioObjects[i].Style.length > 0) {
            style = audioObjects[i].Style;
        }
        if (audioObjects[i].Text != ''
            && audioObjects[i].Style != 'None'
            // comments
            && audioObjects[i].Style != '//') {
            output += 'Dialogue: 0,';
            output += audioObjects[i].AdjustedStartTime.substring(1, 11) + ',';
            output += audioObjects[i].AdjustedEndTime.substring(1, 11) + ',';
            output += style;
            output += ',,0,0,0,,';
            output += audioObjects[i].Text + '\n';
        }
    }
    fs.writeFileSync(allObjects.Video.FileSubtitestAss, output);

}

async function add_subtitles_to_video(allObjects) {


    //var ffcommand = 'ffmpeg -y -hide_banner -i result.mp4 -i subtitles.srt -c copy -c:s mov_text language=esp result-srt.mp4';
    var ffcommand = 'ffmpeg -y -hide_banner -i ' + allObjects.Video.FileOutputBase;

    ffcommand += ' -i ' + allObjects.Video.FileSubtitestSrt;
    ffcommand += ' -c:a copy -c:v copy -c:s mov_text -metadata:s:s:0 language=esp ';
    ffcommand += allObjects.Video.FileOutputSrt;

    await executeCommand(ffcommand);

    //ffcommand = 'ffmpeg -y -hide_banner -i subtitles.srt subtitles.ass';
    //await executeCommand(ffcommand);

    ffcommand = 'ffmpeg -y -hide_banner -i ' + allObjects.Video.FileOutputBase;
    ffcommand += ' -vf ass=' + allObjects.Video.FileSubtitestAss + ' ' + allObjects.Video.FileOutputAss;
    await executeCommand(ffcommand);

}

async function executeCommand(command) {
    console.log('Log: ' + command);
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
    //await new Promise(resolve => setTimeout(resolve, 2000));
}

function parseTimeToMillSeconds(timeText) {
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
function parseTimeToSeconds(timeText) {
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
async function get_audiofile_duration_seconds(fileName) {
    var tempfile = 'duration.txt';
    var ffcommand = 'ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 ';
    ffcommand += fileName + ' > ' + tempfile + ' 2>&1';
    await executeCommand(ffcommand);
    var contents = String(fs.readFileSync(tempfile));
    var duration = parseFloat(contents.trim());
    fs.unlinkSync(tempfile);
    return duration;
}

// Use async and await to get the token before attempting to convert text to speech.
async function add_audio_to_video(allObjects) {

    const resultFile = allObjects.Video.FileOutputBase;
    var ffcommand = 'ffmpeg -y -hide_banner -i ' + allObjects.Video.FileInput + ' ';
    var audioObjects = allObjects.Audio;
    var filter1 = '';
    var filter2 = '';
    var countFiles = 0;
    for (var i = 1; i <= audioObjects.RowCount; i++) {
        if (audioObjects[i].FileName) {
            countFiles++;
            ffcommand = ffcommand + '-i ' + audioObjects[i].FileName + ' ';
            // "[1]adelay=500[s1];[2]adelay=3000[s2];[s1][s2]amix=2[mixout]"
            //var startTime = audioObjects[i].StartTime;
            //var delay = Math.round(audioObjects[i].EffectiveStartTimeSeconds * 1000);
            var delay = Math.round(audioObjects[i].AdjustedStartTimeSeconds * 1000);
            //console.log((i) + ' Delay : ' + delay + ' Duration max:' + duration);
            filter1 += '[' + String(countFiles) + ']adelay=';
            filter1 += Math.round(delay) + '[a' + String(countFiles) + '];'
            filter2 += '[a' + String(countFiles) + ']'
        }
    }
    ffcommand += '-filter_complex "';
    ffcommand += filter1 + filter2;
    ffcommand += 'amix=inputs=' + countFiles;
    ffcommand += ':dropout_transition=' + Math.round(allObjects.Video.Duration);
    ffcommand += ',volume=' + allObjects.Video.Volume;
    ffcommand += '[mixout]"';
    ffcommand += ' -map 0:v -map [mixout] -c:v copy ' + resultFile;
    await executeCommand(ffcommand);
}

function get_audio_filename(lang, nrline) {
    return lang + '/a' + nrline + '.wav';
}
async function init(allObjects) {

    

    if (fs.existsSync(allObjects.Video.FileSubtitestSrt)) {
        fs.unlinkSync(allObjects.Video.FileSubtitestSrt);
    }
    if (fs.existsSync(allObjects.Video.FileSubtitestAss)) {
        fs.unlinkSync(allObjects.Video.FileSubtitestAss);
    }
    if (fs.existsSync(allObjects.Video.FileOutputBase)) {
        fs.unlinkSync(allObjects.Video.FileOutputBase);
    }
    if (fs.existsSync(allObjects.Video.FileOutputAss)) {
        fs.unlinkSync(allObjects.Video.FileOutputAss);
    }
    if (fs.existsSync(allObjects.Video.FileOutputSrt)) {
        fs.unlinkSync(allObjects.Video.FileOutputSrt);
    }
    if (fs.existsSync(allObjects.Video.FileTimes)) {
        fs.unlinkSync(allObjects.Video.FileTimes);
    }
    
}

function secondsToTime(timeInSeconds) {
    var pad = function (num, size) { return ('000' + num).slice(size * -1); },
        time = parseFloat(timeInSeconds).toFixed(3),
        hours = Math.floor(time / 60 / 60),
        minutes = Math.floor(time / 60) % 60,
        seconds = Math.floor(time - minutes * 60),
        milliseconds = time.slice(-3);
    return pad(hours, 2) + ':' + pad(minutes, 2) + ':' + pad(seconds, 2) + '.' + pad(milliseconds, 3);
}

async function calculate_times_begin(allObjects) {
    var audioObjects = allObjects.Audio;
    var colAdjust = 'Adjust_' + audioObjects.lang;
    for (var i = 1; i <= audioObjects.RowCount; i++) {
        audioObjects[i].AudioDuration = 0;
        audioObjects[i].StartTimeSeconds = parseTimeToSeconds(audioObjects[i].StartTime);
        audioObjects[i].EndTimeSeconds = parseTimeToSeconds(audioObjects[i].EndTime);
        audioObjects[i].AdjustSeconds = 0;
        if (audioObjects[i][colAdjust]) {
            audioObjects[i].AdjustSeconds = parseTimeToSeconds(audioObjects[i][colAdjust]);
        }
        // Time inizio dopo 
        audioObjects[i].AdjustedStartTimeSeconds = audioObjects[i].StartTimeSeconds + audioObjects[i].AdjustSeconds;
        audioObjects[i].AdjustedStartTime = secondsToTime(audioObjects[i].AdjustedStartTimeSeconds);
        audioObjects[i].AdjustedEndTimeSeconds = audioObjects[i].EndTimeSeconds + audioObjects[i].AdjustSeconds;
        audioObjects[i].AdjustedEndTime = secondsToTime(audioObjects[i].AdjustedEndTimeSeconds);
        // Massimo quando inizia il prossimo
        audioObjects[i].MaxTimeSeconds = audioObjects[i].EndTimeSeconds;
        if (audioObjects[i + 1]) {
            audioObjects[i].MaxTimeSeconds = parseTimeToSeconds(audioObjects[i + 1].StartTime);;
        }
        audioObjects[i].MaxDuration = audioObjects[i].MaxTimeSeconds - audioObjects[i].StartTimeSeconds;
    }
}

async function calculate_times_end(allObjects) {
    var audioObjects = allObjects.Audio;
    for (var i = 1; i <= audioObjects.RowCount; i++) {
        audioObjects[i].AudioDuration = 0;
        if (audioObjects[i].FileName) {
            audioObjects[i].AudioDuration = await get_audiofile_duration_seconds(audioObjects[i].FileName);
            // Audio file has a 800ms empty time at the end
            audioObjects[i].AudioDuration = Number(audioObjects[i].AudioDuration) - 0.8;
        }
        // tenendo conto dell'adjustment precedente
        audioObjects[i].EffectiveStartTimeSeconds = audioObjects[i].StartTimeSeconds;
        if (audioObjects[i - 1] && audioObjects[i - 1].AdjustedSeconds < 0) {
            audioObjects[i].EffectiveStartTimeSeconds += audioObjects[i - 1].AdjustedSeconds;
        }
        audioObjects[i].SecondsRemaining = audioObjects[i].MaxDuration - audioObjects[i].AudioDuration;
        audioObjects[i].EffectiveMaxDuration = audioObjects[i].MaxTimeSeconds - audioObjects[i].EffectiveStartTimeSeconds;
        audioObjects[i].EffectiveSecondsRemaining = audioObjects[i].EffectiveMaxDuration - audioObjects[i].AudioDuration;
        // l'aggiustamento in negativo per anticipare l'avvio
        audioObjects[i].AdjustedSeconds = 0;
        if (audioObjects[i - 1] && audioObjects[i - 1].EffectiveSecondsRemaining > 0
            && audioObjects[i].SecondsRemaining < 0) {
            // se c'e spazio prima
            if (Math.abs(audioObjects[i].SecondsRemaining) > audioObjects[i - 1].EffectiveSecondsRemaining) {
                audioObjects[i].AdjustedSeconds = -audioObjects[i - 1].EffectiveSecondsRemaining;
            } else {
                audioObjects[i].AdjustedSeconds = audioObjects[i].SecondsRemaining;
            }
            audioObjects[i].EffectiveSecondsRemaining = audioObjects[i].SecondsRemaining - audioObjects[i].AdjustedSeconds;
        }

    }
}

function write_text_times(allObjects) {
    var text = '';
    text += allObjects.Audio.lang + '\n';
    text += 'Line\tRemain\t\Starts\tDuration\tText\n';
    for (var i = 1; i <= allObjects.Audio.RowCount; i++) {
        var duration = '';
        var remaining = '';
        var starts = '';
        if (allObjects.Audio[i].Audio !== '0') {
            duration += Math.round(allObjects.Audio[i].AudioDuration * 1000) / 1000;
            remaining += Math.round(allObjects.Audio[i].SecondsRemaining * 1000) / 1000;
            starts += Math.round(allObjects.Audio[i].AdjustedStartTimeSeconds * 1000) / 1000;
        }

        text += i + '\t'
        if (!remaining.startsWith('-')) {
            text += ' ';
        }
        text += remaining + '\t';
        text += starts + '\t';
        text += duration + '\t';
        text += allObjects.Audio[i].Text + '\t';
        text += '\n';
    }
    fs.writeFileSync(allObjects.Video.FileTimes, text);

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

async function create_language(param) {
    // create language dir
    dirCreate(param.outputLang);

    // read ac2 export
    var contents = fs.readFileSync('Export.json', 'utf8');
    var allObjects = JSON.parse(contents);

    allObjects.Audio.lang = param.outputLang;
    allObjects.Audio.columnLang = "Lang_" + allObjects.Audio.lang;

    allObjects.Video = {};
    allObjects.Video.FileInput = param.videoFileInput + param.videoFileExtension;
    allObjects.Video.FileOutputBase = allObjects.Audio.lang + '/' + param.videoFileInput + '-' + allObjects.Audio.lang + param.videoFileExtension;
    allObjects.Video.FileOutputAss = allObjects.Audio.lang + '/' + param.videoFileInput + '-ass-' + allObjects.Audio.lang + param.videoFileExtension;
    allObjects.Video.FileOutputSrt = allObjects.Audio.lang + '/' + param.videoFileInput + '-srt-' + allObjects.Audio.lang + param.videoFileExtension;
    allObjects.Video.Duration = await get_audiofile_duration_seconds(allObjects.Video.FileInput);
    allObjects.Video.Volume = 10;
    allObjects.Video.FileSubtitestSrt = allObjects.Audio.lang + '/subtitles-' + allObjects.Audio.lang + '.srt';
    allObjects.Video.FileSubtitestAss = allObjects.Audio.lang + '/subtitles-' + allObjects.Audio.lang + '.ass';
    allObjects.Video.FileTimes = allObjects.Audio.lang + '\\times-' + allObjects.Audio.lang + '.txt';

    for (var i = 1; i <= allObjects.Audio.RowCount; i++) {
        allObjects.Audio[i].Text = allObjects.Audio[i][allObjects.Audio.columnLang];
        if (allObjects.Audio[i].Text != ''
            && !allObjects.Audio[i].Style.startsWith('//')) {
            if (allObjects.Audio[i].Audio !== '0') {
                allObjects.Audio[i].FileName = get_audio_filename(allObjects.Audio.lang, i);
            }
        }
    }


    calculate_times_begin(allObjects);



    await init(allObjects);

    var statFile = allObjects.Audio.lang + '\\statistics-' + allObjects.Audio.lang + '.json';
    if (param.createAudio) {
        var statisticsObjects;
        if (fileExists(statFile)) {
            var statistics = fs.readFileSync(statFile, 'utf8');
            statisticsObjects = JSON.parse(statistics);
        }
        await create_audio_files(allObjects, statisticsObjects);
    }
    await calculate_times_end(allObjects);
    await create_subtitles_srt(allObjects);
    await create_subtitles_ass(allObjects);

    fs.writeFileSync(statFile, JSON.stringify(allObjects));
    write_text_times(allObjects);


    if (param.createVideo) {
        await add_audio_to_video(allObjects);
    }

    if (param.createSubtitles) {
        await add_subtitles_to_video(allObjects);
    }

    console.log(`-----------------------------------------`);
    console.log(`------------ All Finished ---------------`);
    console.log(`-----------------------------------------`);
    return true;
}

async function main() {

    var paramText = fs.readFileSync('param.json', 'utf8');
    var param = JSON.parse(paramText);
    //INSERIRE QUI LE VARIABILI
    //param.projectSubDirectory = 'budget';
    //param.videoFileInput = 'family-budget';
    //param.videoFileExtension = '.mp4';
    // Insert the language code
    //param.outputLanguages = 'en';
    // multiple languages separated by ';'
    //param.outputLanguages = 'en;es';

    // creation parameters
    param.createAudio = true;
    param.createVideo = true;
    param.execTest = true;
    param.createSubtitles = true;
    // disable
    //param.createAudio = false;
    //param.createVideo = false;
    //param.createSubtitles = false;
    param.execTest = false;
    
    // Change directory
    process.chdir(param.projectSubDirectory);

    var languages = param.outputLanguages.split(';');
    for (let i = 0; i < languages.length; i++) {
        param.outputLang = languages[i];
        await create_language(param);
    }
}

// Run the application
main();

