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

function textToSpeech_SetVoices(audioObjects) {
    if (audioObjects.lang === 'Lang_es' ) {
        audioObjects.langCognitiveServices = 'es-ES';
        audioObjects.voiceCognitiveServices = 'ElviraNeural';
    }
    else if (audioObjects.lang === 'Lang_en' ) {
        audioObjects.langCognitiveServices = 'es-ES';
        audioObjects.voiceCognitiveServices = 'ElviraNeural';
    }

}

function textToSpeech(accessToken, rowNumber, audioObjects) {

    // https://docs.microsoft.com/en-us/azure/cognitive-services/speech-service/rest-text-to-speech

    // Get the SSML file contents.
    //var contents = fs.readFileSync(xmlFileName, 'utf8');

    var xmlRequest = '<?xml version="1.0" encoding="UTF-8"?>';
    xmlRequest = '<speak xmlns="https://www.w3.org/2001/10/synthesis" version="1.0" xml:lang="en-US">';
    //xmlRequest += '<voice name="Microsoft Server Speech Text to Speech Voice (es-ES, ElviraNeural)">';

    xmlRequest += '<voice name="Microsoft Server Speech Text to Speech Voice (';
    xmlRequest += audioObjects.langCognitiveServices + ', ';
    xmlRequest += audioObjects.voiceCognitiveServices + ')">';
    xmlRequest += audioObjects[rowNumber].Text;
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
async function create_audio_files(audioObjects, statisticsObjects) {

    var subscriptionKey = String(fs.readFileSync('../subscription.key')).trim();
    if (!subscriptionKey) {
        throw new Error('Subscription key not found')
    };

    const accessToken = await getAccessToken(subscriptionKey);
    
    textToSpeech_SetVoices(audioObjects);

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
            try {
                await textToSpeech(accessToken, i, audioObjects);
            } catch (err) {
                //console.log(`Something went wrong: ${err}`);
            }
            // perché non crea tutti i file
            //await new Promise(resolve => setTimeout(resolve, 3000));
        }
    }
}

async function create_subtitles_srt(audioObjects) {

    var output = '';
    for (var i = 1; i <= audioObjects.RowCount; i++) {
        if (audioObjects[i].FileName) {
            output += i + '\n';
            var startTime = audioObjects[i].StartTime;
            startTime = startTime.replace('.', ',');
            var endTime = audioObjects[i].EndTime;
            endTime = endTime.replace('.', ',');
            output += startTime + ' --> ' + endTime + '\n';
            output += audioObjects[i].Text + '\n\n';
        }
    }
    fs.writeFileSync('subtitles.srt', output);

}

async function create_subtitles_ass(audioObjects) {

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
            output += audioObjects[i].StartTime.substring(1, 11) + ',';
            output += audioObjects[i].EndTime.substring(1, 11) + ',';
            output += style;
            output += ',,0,0,0,,';
            output += audioObjects[i].Text + '\n';
        }
    }
    fs.writeFileSync('subtitles.ass', output);

}

async function add_subtitles_to_video(allObjects) {


    //var ffcommand = 'ffmpeg -y -hide_banner -i result.mp4 -i subtitles.srt -c copy -c:s mov_text language=esp result-srt.mp4';
    var ffcommand = 'ffmpeg -y -hide_banner -i ' + allObjects.Video.FileOutputBase;
    ffcommand += ' -i subtitles.srt -c:a copy -c:v copy -c:s mov_text -metadata:s:s:0 language=esp ';
    ffcommand += allObjects.Video.FileOutputSrt;

    await executeCommand(ffcommand);

    //ffcommand = 'ffmpeg -y -hide_banner -i subtitles.srt subtitles.ass';
    //await executeCommand(ffcommand);

    ffcommand = 'ffmpeg -y -hide_banner -i ' + allObjects.Video.FileOutputBase;
    ffcommand += ' -vf ass=subtitles.ass ' + allObjects.Video.FileOutputAss;
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
    mseconds += parseFloat(timeText.substring(0, 2)) * 60 * 60 * 1000;
    mseconds += parseFloat(timeText.substring(3, 5)) * 60 * 1000;
    mseconds += parseFloat(timeText.substring(6, 12)) * 1000;
    mseconds = Math.round(mseconds);
    return mseconds;
}
function parseTimeToSeconds(timeText) {
    // parse time "00:00:03.436"
    var seconds = 0.0;
    seconds += parseFloat(timeText.substring(0, 2)) * 60 * 60;
    seconds += parseFloat(timeText.substring(3, 5)) * 60;
    seconds += parseFloat(timeText.substring(6, 12));
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
            var startTime = audioObjects[i].StartTime;
            //var delay = Math.round(audioObjects[i].EffectiveStartTimeSeconds * 1000);
            var delay = Math.round(audioObjects[i].StartTimeSeconds * 1000);
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

function get_audio_filename(nrline) {
    return 'a' + nrline + '.wav';
}
async function init() {

    if (fs.statSync('result.mp4')) {
        fs.unlinkSync('result.mp4');
    }
    if (fs.statSync('result-subtitles.mp4')) {
        fs.unlinkSync('result-subtitles.mp4');
    }
    if (fs.statSync('subtitles.srt')) {
        fs.unlinkSync('subtitles.srt');
    }
}

async function calculate_audio_times(audioObjects) {
    for (var i = 1; i <= audioObjects.RowCount; i++) {
        audioObjects[i].AudioDuration = 0;
        if (audioObjects[i].FileName) {
            audioObjects[i].AudioDuration = await get_audiofile_duration_seconds(audioObjects[i].FileName);
        }
        audioObjects[i].StartTimeSeconds = parseTimeToSeconds(audioObjects[i].StartTime);
        audioObjects[i].EndTimeSeconds = parseTimeToSeconds(audioObjects[i].EndTime);
        // tenendo conto dell'adjustment precedente
        audioObjects[i].EffectiveStartTimeSeconds = audioObjects[i].StartTimeSeconds;
        if (audioObjects[i - 1] && audioObjects[i - 1].AdjustedSeconds < 0) {
            audioObjects[i].EffectiveStartTimeSeconds += audioObjects[i - 1].AdjustedSeconds;
        }
        // Massimo quando inizia il prossimo
        audioObjects[i].MaxTimeSeconds = audioObjects[i].EndTimeSeconds;
        if (audioObjects[i + 1]) {
            audioObjects[i].MaxTimeSeconds = parseTimeToSeconds(audioObjects[i + 1].StartTime);;
        }

        audioObjects[i].MaxDuration = audioObjects[i].MaxTimeSeconds - audioObjects[i].StartTimeSeconds;
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
async function
    main() {
    var contents = fs.readFileSync('Export.json', 'utf8');
    var allObjects = JSON.parse(contents);
    allObjects.Audio.lang = "Lang_es";
    for (var i = 1; i <= allObjects.Audio.RowCount; i++) {
        allObjects.Audio[i].Text = allObjects.Audio[i][allObjects.Audio.lang];
        if (allObjects.Audio[i].Text != ''
            && !allObjects.Audio[i].Style.startsWith('//')) {
            if (allObjects.Audio[i].Audio !== '0') {
                allObjects.Audio[i].FileName = get_audio_filename(i);
            }
        }
    }
    var videoFileInput = 'family-budget';
    var videoFileExtension = '.mp4';

    allObjects.Video = {};
    allObjects.Video.FileInput = videoFileInput + videoFileExtension;
    allObjects.Video.FileOutputBase = videoFileInput + '-' + allObjects.Audio.lang + videoFileExtension;
    allObjects.Video.FileOutputAss = videoFileInput + '-ass-' + allObjects.Audio.lang + videoFileExtension;
    allObjects.Video.FileOutputSrt = videoFileInput + '-srt-' + allObjects.Audio.lang + videoFileExtension;
    allObjects.Video.Duration = await get_audiofile_duration_seconds(allObjects.Video.FileInput);
    allObjects.Video.Volume = 10;

    var createAudio = true;
    var createVideo = true;
    var execTest = true;
    var createSubtitles = true;
    // disable
    //createAudio = false;
    //createVideo = false;
    //createSubtitles = false;
    execTest = false;

    //await init();


    if (createAudio) {
        var statisticsObjects;
        if (fileExists('statistics.json')) {
            var statistics = fs.readFileSync('statistics.json', 'utf8');
            statisticsObjects = JSON.parse(statistics);
        }
        await create_audio_files(allObjects.Audio, statisticsObjects);
    }
    await calculate_audio_times(allObjects.Audio);
    await create_subtitles_srt(allObjects.Audio);
    await create_subtitles_ass(allObjects.Audio);

    if (createVideo) {
        await add_audio_to_video(allObjects);
    }

    if (createSubtitles) {
        await add_subtitles_to_video(allObjects);
    }

    if (execTest) {
        get_audiofile_duration_seconds(get_audio_filename(1));
    }
    fs.writeFileSync('statistics.json', JSON.stringify(allObjects));

    console.log(`-----------------------------------------`);
    console.log(`------------ All Finished ---------------`);
    console.log(`-----------------------------------------`);
}

// Run the application
main();



