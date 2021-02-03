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
async function azure_get_accessToken(subscriptionKey) {

    let options = {
        method: 'POST',
        uri: 'https://westeurope.api.cognitive.microsoft.com/sts/v1.0/issueToken',
        headers: {
            'Ocp-Apim-Subscription-Key': subscriptionKey
        }
    }
    return rp(options);
}

function azure_set_voices(project) {
    let lang = project.execParam.lang;
    if (lang === 'es') {
        // female voice 'es-ES-ElviraNeural' Spanish(Spain)
        // NEW male voice 'es-ES-AlvaroNeural' Spanish(Spain)
        project.execParam.CognitiveServicesLang = 'es-ES';
        project.execParam.CognitiveServicesVoice = 'ElviraNeural';
    }
    else if (lang === 'en') {
        // female voice 'en-US-AriaNeural' English (United States)
        // NEW female voice 'en-US-JennyNeural' English (United States)
        project.execParam.CognitiveServicesLang = 'en-US';
        project.execParam.CognitiveServicesVoice = 'AriaNeural';
        project.execParam.CognitiveServicesStyle = 'cheerful';
    }
    else if (lang === 'de') {
        // NEW male voice 'de-DE-ConradNeural' German(Germany)
        // NEW female voice 'de-CH-LeniNeural' German(Switzerland)
        project.execParam.CognitiveServicesLang = 'de-DE';
        project.execParam.CognitiveServicesVoice = 'KatjaNeural';
    }
    else if (lang === 'fr') {
        //NEW female voice 'fr-CH-ArianeNeural' French(Switzerland)
        //NEW male voice 'fr-FR-HenriNeural' French(France)
        project.execParam.CognitiveServicesLang = 'fr-CH';
        project.execParam.CognitiveServicesVoice = 'ArianeNeural';
    }
    else if (lang === 'it') {
        // female voice 'it-IT-ElsaNeural' Italian(Italy)
        // NEW female voice 'it-IT-IsabellaNeural' Italian(Italy)
        // NEW male voice 'it-IT-DiegoNeural' Italian(Italy)
        project.execParam.CognitiveServicesLang = 'it-IT';
        project.execParam.CognitiveServicesVoice = 'DiegoNeural';
    }
    else if (lang === 'nl') {
        // female voice 'nl-NL-HannaRUS' Dutch (Netherlands)
        // NEW female voice 'nl-NL-ColetteNeural' Dutch (Netherlands)
        project.execParam.CognitiveServicesLang = 'nl-NL';
        project.execParam.CognitiveServicesVoice = 'ColetteNeural';
    }
    else if (lang === 'zh') {
        // female voice 'zh-CN-XiaoxiaoNeural' Chinese (Mandarin, Simplified)
        // NEW male voice 'zh-CN-YunyangNeural' Chinese(Mandarin, Simplified)
        project.execParam.CognitiveServicesLang = 'zh-CN';
        project.execParam.CognitiveServicesVoice = 'XiaoxiaoNeural';
    }
    else if (lang === 'pt') {
        // female voice 'pt-BR-FranciscaNeural' Portuguese (Brazil)
        // NEW male voice 'pt-BR-AntonioNeural' Portuguese (Brazil)
        // female voice 'pt-PT-FernandaNeural' Portuguese (Portugal) 
        project.execParam.CognitiveServicesLang = 'pt-BR';
        project.execParam.CognitiveServicesVoice = 'FranciscaNeural';
    }
}

async function azure_create_audio_file(accessToken, project, rowNumber) {

    // https://docs.microsoft.com/en-us/azure/cognitive-services/speech-service/rest-text-to-speech
    // https://docs.microsoft.com/en-us/azure/cognitive-services/speech-service/speech-synthesis-markup

    // <speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis"
    //  xmlns:mstts="https://www.w3.org/2001/mstts" xml:lang="en-US">
    //      <voice name="en-US-AriaNeural">
    //          <mstts:express-as style="cheerful">
    //              That'd be just amazing!
    //          </mstts:express-as>
    //      </voice>
    //  </speak> 

    // Get the SSML file contents.
    //let contents = fs.readFileSync(xmlFileName, 'utf8');
    let rows = project.Rows;
    let xmlRequest = '<?xml version="1.0" encoding="UTF-8"?>';
    xmlRequest = '<speak version="1.0" xmlns="https://www.w3.org/2001/10/synthesis" \n';
    xmlRequest += 'xmlns:mstts="https://www.w3.org/2001/mstts" xml:lang="' + project.execParam.CognitiveServicesLang + '">\n';
    xmlRequest += '<voice name="' + project.execParam.CognitiveServicesLang + '-' + project.execParam.CognitiveServicesVoice + '">\n';
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
    else if (project.execParam.CognitiveServicesStyle) {
        xmlRequest += '<mstts:express-as style="' + project.execParam.CognitiveServicesStyle + '">\n';
        xmlRequest += rows[rowNumber].Text;
        xmlRequest += '\n</mstts:express-as>\n';
    }
    else {
        xmlRequest += rows[rowNumber].Text;
    }
    xmlRequest += '\n</voice>\n</speak>\n';

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
    const fileName = rows[rowNumber].AzureAudioFileName;
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

    let rows = project.Rows;

    let subscriptionKey = String(fs.readFileSync('../../subscription.key')).trim();
    if (!subscriptionKey) {
        throw new Error('Subscription key not found')
    };

    const accessToken = await azure_get_accessToken(subscriptionKey);

    azure_set_voices(project);

    for (let i = 1; i <= rows.RowCount; i++) {
        let createAudio = false;
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
            if (fileExists(rows[i].AzureAudioFileName)) {
                fs.unlinkSync(rows[i].AzureAudioFileName);
            }
            if (fileExists(rows[i].AudioFileName)) {
                fs.unlinkSync(rows[i].AudioFileName);
            }
            await azure_create_audio_file(accessToken, project, i);
            // alla fine vengono messi 800 millisecondi, ne tagliamo 600
            const audioDuration = await get_file_duration_seconds(rows[i].AzureAudioFileName);
            let ffcommand = 'ffmpeg -y -hide_banner -i ' + rows[i].AzureAudioFileName + ' -t ' + String(audioDuration - 0.600) + ' ' + rows[i].AudioFileName;
            await executeCommand(ffcommand);

            // try {
            // } catch (err) {
            //     //console.log(`Something went wrong: ${err}`);
            // }
            // perché non crea tutti i file
            await new Promise(resolve => setTimeout(resolve, 500));
        }
        if (rows[i].AudioFileName) {
            rows[i].AudioDuration = await get_file_duration_seconds(rows[i].AudioFileName);
            // Audio file has a 800ms empty time at the end
            rows[i].AudioDuration = Number(rows[i].AudioDuration.toFixed(3));
        }
    }
}

async function create_scene_subtitles_srt_file(project, scene) {

    let output = '';
    let rows = project.Scenes[scene].Rows;
    for (let i = 1; i <= rows.RowCount; i++) {
        if (rows[i].CreateAudio) {
            output += i + '\n';
            let startTime = rows[i].AdjustedSceneStartTime;
            startTime = startTime.replace('.', ',');
            let endTime = rows[i].AdjustedSceneEndTime;
            endTime = endTime.replace('.', ',');
            output += startTime + ' --> ' + endTime + '\n';
            output += rows[i].Text + '\n\n';
        }
    }
    fs.writeFileSync(project.Scenes[scene].FileSubtitestSrt, output);

}

async function create_scene_subtitles_ass_file(project, scene) {

    // References
    // see https://fileformats.fandom.com/wiki/SubStation_Alpha
    // see http://docs.aegisub.org/3.1/ASS_Tags/
    // see http://www.perlfu.co.uk/projects/asa/ass-specs.doc
    // ass can also generate from srt 
    //ffcommand = 'ffmpeg -y -hide_banner -i subtitles.srt subtitles.ass';


    let output = '';

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

    let rows = project.Scenes[scene].Rows;
    for (let i = 1; i <= rows.RowCount; i++) {
        //Dialogue: 0,0:00:03.44,0:00:08.28,Default,,0,0,0,,Este breve video te explicará cómo crear un presupuesto familiar utilizando el cash manager
        let style = 'Subtitles';
        if (rows[i].Style.length > 0) {
            style = rows[i].Style;
        }
        if (rows[i].Text != ''
            && rows[i].Style != 'None'
            // comments
            && rows[i].Style != '//') {
            output += 'Dialogue: 0,';
            output += rows[i].AdjustedSceneStartTime.substring(1, 11) + ',';
            output += rows[i].AdjustedSceneEndTime.substring(1, 11) + ',';
            output += style;
            output += ',,0,0,0,,';
            output += rows[i].Text + '\n';
        }
    }
    fs.writeFileSync(project.Scenes[scene].FileSubtitestAss, output);

}

async function create_scene_add_subtitles(project, scene) {

    if (!project.Scenes[scene].IncludeScene) {
        return;
    }
    //let ffcommand = 'ffmpeg -y -hide_banner -i result.mp4 -i subtitles.srt -c copy -c:s mov_text language=esp result-srt.mp4';
    let ffcommand = 'ffmpeg -y -hide_banner -i ' + project.Scenes[scene].FileOutputAudio;

    ffcommand += ' -i ' + project.Scenes[scene].FileSubtitestSrt;
    ffcommand += ' -c:a copy -c:v copy -c:s mov_text -metadata:s:s:0 language=esp ';
    ffcommand += project.Scenes[scene].FileOutputSrt;

    //await executeCommand(ffcommand);

    //ffcommand = 'ffmpeg -y -hide_banner -i subtitles.srt subtitles.ass';
    //await executeCommand(ffcommand);

    ffcommand = 'ffmpeg -y -hide_banner -i ' + project.Scenes[scene].FileOutputAudio;
    ffcommand += ' -vf ass=' + project.Scenes[scene].FileSubtitestAss + ' ' + project.Scenes[scene].FileOutputAss;
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
    let mseconds = 0.0;
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
    let seconds = 0.0;
    if (!timeText) {
        return seconds;
    }
    let negative = false;
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
    let tempfile = 'temp_duration.txt';
    let ffcommand = 'ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 ';
    ffcommand += fileName + ' > ' + tempfile + ' 2>&1';
    await executeCommand(ffcommand);
    //await new Promise(resolve => setTimeout(resolve, 1000));
    let contents = String(fs.readFileSync(tempfile));
    let duration = parseFloat(contents.trim());
    //fs.unlinkSync(tempfile);
    return duration;
}

// Use async and await to get the token before attempting to convert text to speech.
async function create_scene_add_audio(project, scene) {

    if (!project.Scenes[scene].IncludeScene) {
        return;
    }

    console.log('\nAdd audio to Video Scene : ' + scene);
    const inputVideoFile = project.Scenes[scene].FileOutputNoAudio;
    const resultFile = project.Scenes[scene].FileOutputAudio;
    if (!fs.existsSync(inputVideoFile)) {
        console.log('Video file does not exists : ' + inputVideoFile);
        return;
    }
    let ffcommand = 'ffmpeg -y -hide_banner -i ' + inputVideoFile + ' ';
    let rows = project.Scenes[scene].Rows;
    let filter1 = '';
    let filter2 = '';
    let countFiles = 0;
    for (let i = 1; i <= rows.RowCount; i++) {
        if (rows[i].CreateAudio) {
            countFiles++;
            ffcommand = ffcommand + '-i ' + rows[i].AudioFileName + ' ';
            // "[1]adelay=500[s1];[2]adelay=3000[s2];[s1][s2]amix=2[mixout]"
            //let startTime = audioObjects[i].StartTime;
            //let delay = Math.round(audioObjects[i].EffectiveStartTimeSeconds * 1000);
            let delay = Math.round(rows[i].AdjustedSceneStartTimeSeconds * 1000);
            //console.log((i) + ' Delay : ' + delay + ' Duration max:' + duration);
            filter1 += '[' + String(countFiles) + ']adelay=';
            filter1 += Math.round(delay) + '[a' + String(countFiles) + '];'
            filter2 += '[a' + String(countFiles) + ']'
        }
    }
    ffcommand += '-filter_complex "';
    ffcommand += filter1 + filter2;
    ffcommand += 'amix=inputs=' + countFiles;
    // dropout_transition should be the full video lenght
    // If not present volume will increase progressively
    ffcommand += ':dropout_transition=' + project.Scenes[scene].AdjustedSceneEndTimeSeconds;
    ffcommand += ',volume=' + project.Video.Volume;
    ffcommand += '[mixout]"';
    ffcommand += ' -map 0:v -map [mixout] -c:v copy ' + resultFile;
    await executeCommand(ffcommand);
}

// Add all audio file to the finished video
async function create_video_add_audio(project) {

    const fileInput = project.Video.FileOutputAss;
    if (!fs.existsSync(fileInput)) {
        console.log('Video file does not exists : ' + fileInput);
        return;
    }
    let ffcommand = 'ffmpeg -y -hide_banner -i ' + fileInput + ' ';
    let countFiles = 0;
    let filter1 = '';
    let filter2 = '';
    for (let scene = 1; scene <= project.Scenes.SceneCount; scene++) {
        if (project.Scenes[scene].IncludeScene) {

            console.log('\nAdd audio to Video Scene : ' + scene);
            let rows = project.Scenes[scene].Rows;
            for (let i = 1; i <= rows.RowCount; i++) {
                if (rows[i].CreateAudio) {
                    countFiles++;
                    // aggiunge in input i file audio
                    ffcommand = ffcommand + '-i ' + rows[i].AudioFileName + ' ';
                    // "[1]adelay=500[s1];[2]adelay=3000[s2];[s1][s2]amix=2[mixout]"
                    //let startTime = audioObjects[i].StartTime;
                    //let delay = Math.round(audioObjects[i].EffectiveStartTimeSeconds * 1000);
                    let delay = Math.round(rows[i].AdjustedVideoStartTimeSeconds * 1000);
                    //console.log((i) + ' Delay : ' + delay + ' Duration max:' + duration);
                    filter1 += '[' + String(countFiles) + ']adelay=';
                    filter1 += Math.round(delay) + '[a' + String(countFiles) + '];'
                    filter2 += '[a' + String(countFiles) + ']'
                }
            }
        }
    }
    ffcommand += '-filter_complex "';
    ffcommand += filter1 + filter2;
    ffcommand += 'amix=inputs=' + countFiles;
    ffcommand += ':dropout_transition=' + Math.ceil(project.Scenes.AdjustedVideoEndTimeSeconds);
    ffcommand += ',volume=' + project.Video.Volume;
    ffcommand += '[mixout]"';
    ffcommand += ' -map 0:v -map [mixout] -c:v copy ' + project.Video.FileOutputAudio;
    await executeCommand(ffcommand);
}

async function create_video_deletefiles(project) {


    let files = [];
    let dirFiles = fs.readdirSync(project.execParam.lang);
    dirFiles.forEach(file => {
        if (file.startsWith('scene')) {
            files.push(project.execParam.lang + '/' + file);
        }
    });
    files.push(project.Video.FileSubtitestSrt);
    files.push(project.Video.FileSubtitestAss);
    files.push(project.Video.FileOutputAudio);
    files.push(project.Video.FileOutputNoAudio);
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
    let pad = function (num, size) { return ('000' + num).slice(size * -1); },
        time = parseFloat(timeInSeconds).toFixed(3),
        hours = Math.floor(time / 60 / 60),
        minutes = Math.floor(time / 60) % 60,
        seconds = Math.floor(time - minutes * 60),
        milliseconds = time.slice(-3);
    return pad(hours, 2) + ':' + pad(minutes, 2) + ':' + pad(seconds, 2) + '.' + pad(milliseconds, 3);
}

function create_scenes_calculate_times(project) {
    project.Scenes.AdjustedVideoEndTimeSeconds = 0;
    for (let scene = 1; scene <= project.Scenes.SceneCount; scene++) {
        project.Scenes[scene].IncludeScene = false;
        let rows = project.Scenes[scene].Rows;
        project.Scenes[scene].AdjustedSceneStartTimeSeconds = 0;
        project.Scenes[scene].AdjustedSceneStartTime = time_SecondsToTime(project.Scenes[scene].AdjustedSceneStartTimeSeconds);
        let lastSceneFinishTimeSeconds = 0;
        //console.log(`rows.RowCount ` + rows.RowCount);
        for (let i = 1; i <= rows.RowCount; i++) {
            if (rows[i].CreateAudio) {
                let adjustedSceneStartTimeSeconds = rows[i].StartTimeSeconds;
                // Calcoliamo l'inizio successivo se minore
                if (adjustedSceneStartTimeSeconds < lastSceneFinishTimeSeconds) {
                    adjustedSceneStartTimeSeconds = lastSceneFinishTimeSeconds;
                    // aggiungiamo un leggero intervallo
                    adjustedSceneStartTimeSeconds += 0.2;
                }
                rows[i].AdjustedSceneStartTimeSeconds = adjustedSceneStartTimeSeconds;
                rows[i].AdjustedSceneStartTime = time_SecondsToTime(adjustedSceneStartTimeSeconds);
                lastSceneFinishTimeSeconds = adjustedSceneStartTimeSeconds + rows[i].MaxDuration;
                rows[i].AdjustedSceneEndTimeSeconds = lastSceneFinishTimeSeconds;
                rows[i].AdjustedSceneEndTime = time_SecondsToTime(lastSceneFinishTimeSeconds);
            }
        }
        // scene arrotonda al secondo
        lastSceneFinishTimeSeconds = Math.ceil(lastSceneFinishTimeSeconds);
        project.Scenes[scene].AdjustedSceneEndTimeSeconds = lastSceneFinishTimeSeconds;
        project.Scenes[scene].AdjustedSceneEndTime = time_SecondsToTime(lastSceneFinishTimeSeconds);
        if (project.Scenes[scene].AdjustedSceneEndTimeSeconds > 0) {
            project.Scenes[scene].IncludeScene = true;
        }
    }
    // Mettiamo durata massima MaxSceneTime
    for (let scene = 1; scene <= project.Scenes.SceneCount; scene++) {
        let rows = project.Scenes[scene].Rows;
        for (let i = 1; i <= rows.RowCount; i++) {
            if (!rows[i].CreateAudio && rows[i].SetDuration === 'MaxSceneTime') {
                rows[i].AdjustedSceneEndTimeSeconds = project.Scenes[scene].AdjustedSceneEndTimeSeconds - rows[i].AdjustedSceneStartTimeSeconds;
                rows[i].AdjustedSceneEndTime = time_SecondsToTime(rows[i].AdjustedSceneEndTimeSeconds);
            }
            if (!rows[i].CreateAudio && rows[i].SetDuration === 'NextRow' && (i + 1) < rows.length) {
                rows[i].AdjustedSceneStartTimeSeconds = rows[i+1].AdjustedSceneStartTimeSeconds;
                rows[i].AdjustedSceneEndTimeSeconds = rows[i+1].AdjustedSceneEndTimeSeconds;
            }
            if (!rows[i].CreateAudio && rows[i].SetDuration === 'PrevRow' && i > 0) {
                rows[i].AdjustedSceneStartTimeSeconds = rows[i-1].AdjustedSceneStartTimeSeconds;
                rows[i].AdjustedSceneEndTimeSeconds = rows[i-1].AdjustedSceneEndTimeSeconds;
            }
            rows[i].AdjustedSceneStartTime = time_SecondsToTime(rows[i].AdjustedSceneStartTimeSeconds);
            rows[i].AdjustedSceneEndTime = time_SecondsToTime(rows[i].AdjustedSceneEndTimeSeconds);
        }
    }
    // Mettiamo la durata relativa al video
    let lastVideoFinishTimeSeconds = 0;
    for (let scene = 1; scene <= project.Scenes.SceneCount; scene++) {
        let rows = project.Scenes[scene].Rows;
        if (lastVideoFinishTimeSeconds > 0) {
            // aggiungiamo un attimo fra le scene
            lastVideoFinishTimeSeconds += 0.2;
        }
        let videoStartTimeSeconds = lastVideoFinishTimeSeconds;
        project.Scenes[scene].AdjustedVideoStartTimeSeconds = videoStartTimeSeconds;
        project.Scenes[scene].AdjustedVideoStartTime = time_SecondsToTime(project.Scenes[scene].AdjustedVideoStartTimeSeconds);
        for (let i = 1; i <= rows.RowCount; i++) {
            rows[i].AdjustedVideoStartTimeSeconds = videoStartTimeSeconds + rows[i].AdjustedSceneStartTimeSeconds;
            rows[i].AdjustedVideoSceneStartTime = time_SecondsToTime(rows[i].AdjustedVideoStartTimeSeconds);
            rows[i].AdjustedVideoEndTimeSeconds = videoStartTimeSeconds + rows[i].AdjustedSceneEndTimeSeconds;;
            rows[i].AdjustedVideoEndTime = time_SecondsToTime(rows[i].AdjustedVideoEndTimeSeconds);
            // la prossima sce
            if (rows[i].AdjustedVideoEndTimeSeconds > lastVideoFinishTimeSeconds) {
                lastVideoFinishTimeSeconds = rows[i].AdjustedVideoEndTimeSeconds;
            }
        }
        project.Scenes[scene].AdjustedVideoEndTimeSeconds = lastVideoFinishTimeSeconds;
        project.Scenes[scene].AdjustedVideoEndTime = time_SecondsToTime(lastVideoFinishTimeSeconds);
    }
    project.Scenes.AdjustedVideoEndTimeSeconds = lastVideoFinishTimeSeconds;
    project.Scenes.AdjustedVideoEndTime = time_SecondsToTime(lastVideoFinishTimeSeconds);

}

async function create_scenes_adjust_videoduration(project) {

    project.Scenes.TotalVideoDuration = 0;

    for (let scene = 1; scene <= project.Scenes.SceneCount; scene++) {
        let adijustedDuration = project.Scenes[scene].AdjustedSceneEndTimeSeconds;
        project.Scenes[scene].UsedVideoDuration = 0;
        if (adijustedDuration > 0 && !project.Scenes[scene].InputVideoFile.startsWith('#')) {
            project.Scenes[scene].InputVideoDuration = await get_file_duration_seconds(project.Scenes[scene].FileOutputNoAudio);
            project.Scenes[scene].UsedVideoDuration = project.Scenes[scene].InputVideoDuration;
            // speed up ffmpeg -i input.mkv -filter:v "setpts=0.5*PTS" output.mkv
            // slow down ffmpeg -i input.mkv -filter:v "setpts=2.0*PTS" output.mkv
            //let PTS = 1 Number(project.Scenes[scene].InputVideoDuration) / Number(adijustedDuration);
            let PTS = Number(adijustedDuration) / Number(project.Scenes[scene].InputVideoDuration);
            PTS = Number(PTS.toFixed(2));
            project.Scenes[scene].PTS = PTS;
            if (PTS && PTS > 0 && PTS != 1) {
                console.log("PTS changed: " + PTS);
                project.Scenes[scene].UsedVideoDuration = project.Scenes[scene].AdjustedSceneEndTimeSeconds;
                let ffcommand = 'ffmpeg -y -hide_banner -i ' + project.Scenes[scene].FileOutputNoAudio;
                ffcommand += ' -filter:v "setpts=' + PTS + '*PTS" ' + project.Scenes[scene].FileOutputChangedDuration;
                await executeCommand(ffcommand);
            }
            else {
                fs.copyFileSync(project.Scenes[scene].FileOutputNoAudio, project.Scenes[scene].FileOutputChangedDuration);
            }
        }
    }
}

function write_text_times(project) {
    let text = '';
    text += project.execParam.lang + '\n';
    text += 'Line\tRemain\t\Starts\tDuration\tText\n';
    for (let i = 1; i <= project.Rows.RowCount; i++) {
        let duration = '';
        let remaining = '';
        let starts = '';
        if (project.Rows[i].Rows !== '0') {
            duration += Math.round(project.Rows[i].AudioDuration * 1000) / 1000;
            remaining += Math.round(project.Rows[i].SecondsRemaining * 1000) / 1000;
            starts += Math.round(project.Rows[i].AdjustedSceneStartTimeSeconds * 1000) / 1000;
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
    let totalduration = Number(0);
    let text = '';
    text += project.ExecParam.lang + '\n';
    text += 'Line\tDuration\tTotDuration\tText\n';
    for (let i = 1; i <= project.Rows.RowCount; i++) {
        let duration = '';
        let tmpduration = Number(0);
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
    let contents = fs.readFileSync('Project.json', 'utf8');
    let project = JSON.parse(contents);
    project.execParam = execParam;
    let lang = project.execParam.lang;

    // create language dir
    if (!fs.existsSync(lang)) {
        fs.mkdirSync(lang);
    }


    project.execParam.columnLang = "Lang_" + lang;

    project.Video = {};
    project.Video.FileInput = execParam.videoFileInput + execParam.videoFileExtension;
    project.Video.FileOutputAudio = lang + '/' + execParam.videoFileInput + '-audio-' + lang + execParam.videoFileExtension;
    project.Video.FileOutputNoAudio = lang + '/' + execParam.videoFileInput + '-no-audio-' + lang + execParam.videoFileExtension;
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
    await create_video_deletefiles(project);
    rows = project.Rows;

    // Legge il file con i tempi
    project.settings = {};
    project.settings.lastDoneFile = lang + '\\project-last-done-' + lang + '.json';


    // Sceglie quello che è audio 
    for (let i = 1; i <= project.Rows.RowCount; i++) {
        project.Rows[i].CreateAudio = false;
        project.Rows[i].RowExclude = false;
        project.Rows[i].Text = project.Rows[i][project.execParam.columnLang];
        if (project.Rows[i].Text === ''
            || project.Rows[i].Style.startsWith('//')) {
            project.Rows[i].RowExclude = true;
        }
        else if (rows[i].Audio === '0') {
            if (rows[i].EndTime == '24:00:00') {
                rows[i].EndTime = '';
                rows[i].EndTimeSeconds = 0;
                rows[i].SetDuration = 'MaxSceneTime';
            }
            else if (rows[i].EndTime == '23:00:00') {
                rows[i].EndTime = '';
                rows[i].EndTimeSeconds = 0;
                rows[i].SetDuration = 'NextRow';
            }
            else if (rows[i].EndTime == '22:00:00') {
                rows[i].EndTime = '';
                rows[i].EndTimeSeconds = 0;
                rows[i].SetDuration = 'PrevRow';
            }
        }
        else {
            project.Rows[i].CreateAudio = true;
            project.Rows[i].AzureAudioFileName = lang + '/aa' + i + '.wav';
            project.Rows[i].AudioFileName = lang + '/a' + i + '.wav';
        }
    }

    // Crea i file audio solo se il testo è cambiato   
    if (execParam.createAudio) {
        let lastDoneData;
        if (fileExists(project.settings.lastDoneFile)) {
            let statistics = fs.readFileSync(project.settings.lastDoneFile, 'utf8');
            lastDoneData = JSON.parse(statistics);
        }
        await create_audio_files(project, lastDoneData);
    }
    // Calcola i tempi
    for (let i = 1; i <= rows.RowCount; i++) {
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
        rows[i].AdjustedSceneStartTimeSeconds = rows[i].StartTimeSeconds;
        rows[i].AdjustedSceneStartTime = time_SecondsToTime(rows[i].StartTimeSeconds);
        rows[i].AdjustedSceneEndTimeSeconds = rows[i].StartTimeSeconds + rows[i].MaxDuration;
        rows[i].AdjustedSceneEndTime = time_SecondsToTime(rows[i].AdjustedSceneEndTimeSeconds);
    }
    // salviamo una prima volta per evitare di rifare l'audio, nel caso che si blocca dopo
    fs.writeFileSync(project.settings.lastDoneFile, JSON.stringify(project));

    await create_scenes(project);

    // rifacciamolo con tutti i dati
    fs.writeFileSync(project.settings.lastDoneFile, JSON.stringify(project));


    return true;
}
async function create_scenes_video(project) {

    for (let scene = 1; scene <= project.Scenes.SceneCount; scene++) {
        let inputVideo = project.Scenes[scene].InputVideoFile;
        if (inputVideo.endsWith('.png')) {
            let ffcommand = 'ffmpeg -hide_banner -loop 1 -i ' + inputVideo;
            ffcommand += ' -framerate 25 -c:v libx264 -t ' + project.Scenes[scene].AdjustedSceneEndTimeSeconds;
            ffcommand += ' -pix_fmt yuv420p -vf scale=1920:1080  ' + project.Scenes[scene].FileOutputNoAudio;
            await executeCommand(ffcommand);
        }
        else if (inputVideo.endsWith('.mp4')) {
            let ffcommand = 'ffmpeg -i ' + inputVideo;
            ffcommand += ' -filter:v fps=fps=25 ' + project.Scenes[scene].FileOutputNoAudio;
            await executeCommand(ffcommand);
        }
    }
}

async function create_scenes(project) {

    let rows = project.Rows;
    let scene = 0;
    project.Scenes = {};
    let rowCount = 0;
    for (let i = 1; i <= rows.RowCount; i++) {
        let inputVideoFile = rows[i].VideoFile;
        if (i == 1 && !inputVideoFile) {
            inputVideoFile = "#none";
        }
        if (inputVideoFile.length > 0) {
            scene++;
            project.Scenes[scene] = {};
            project.Scenes[scene].VideoFile = inputVideoFile;
            if (inputVideoFile === '#mid-page') {
                inputVideoFile = '../' + project.execParam.videoMidPage;
            }
            else if (inputVideoFile === '#start-page') {
                inputVideoFile = '../' + project.execParam.videoStartPage;
            }
            project.Scenes[scene].InputVideoFile = inputVideoFile;

            // quello che impostato la duration
            project.Scenes[scene].FileSubtitestSrt = project.execParam.lang + '/scene' + scene + '-subtitles.srt';
            project.Scenes[scene].FileSubtitestAss = project.execParam.lang + '/scene' + scene + '-subtitles.ass';
            project.Scenes[scene].FileOutputAudio = project.execParam.lang + '/scene' + scene + '-video-audio' + project.execParam.videoFileExtension;
            project.Scenes[scene].FileOutputNoAudio = project.execParam.lang + '/scene' + scene + '-video-no-audio' + project.execParam.videoFileExtension;
            project.Scenes[scene].FileOutputChangedDuration = project.execParam.lang + '/scene' + scene + '-video-changed-duration' + project.execParam.videoFileExtension;
            project.Scenes[scene].FileOutputAss = project.execParam.lang + '/scene' + scene + '-video-ass' + project.execParam.videoFileExtension;
            project.Scenes[scene].FileOutputSrt = project.execParam.lang + '/scene' + scene + '-video-srt' + project.execParam.videoFileExtension;

            project.Scenes[scene].Rows = {};
            rowCount = 1;
            project.Scenes[scene].Rows.RowCount = 1;
        }
        project.Scenes[scene].Rows.RowCount = rowCount;
        project.Scenes[scene].Rows[rowCount] = rows[i];
        project.Scenes[scene].Rows[rowCount].RowOrigin = i;
        rowCount++;
    }
    project.Scenes.SceneCount = scene;

    create_scenes_calculate_times(project);

    fs.writeFileSync(project.settings.lastDoneFile, JSON.stringify(project));

    create_scenes_video(project);

    await create_scenes_adjust_videoduration(project);

    for (let scene = 1; scene <= project.Scenes.SceneCount; scene++) {

        if (!project.Scenes[scene].InputVideoFile.startsWith('#')) {
            //await create_subtitles_srt_file(project, scene);
            await create_scene_subtitles_ass_file(project, scene);

            // write_text_times(project);
            // write_text_durations(project);

            if (project.execParam.createVideo) {
                await create_scene_add_audio(project, scene);
            }

            if (project.execParam.createSubtitles) {
                await create_scene_add_subtitles(project, scene);
            }
        }
    }
    await create_video_concat_scene(project);
    //await add_audio_to_video(project);
    return true;
}

async function create_video_concat_scene(project) {

    let outputFiles = [];
    outputFiles.push('FileOutputAudio');
    outputFiles.push('FileOutputNoAudio');
    //outputFiles.push('FileOutputSrt');
    outputFiles.push('FileOutputAss');
    // creiamo nel directory corrente perché la lingua è già nel file 
    // e prende relativi al file di input
    for (let i = 0; i < outputFiles.length; i++) {
        let inputFile = 'temp_concat.txt';
        let output_text = '';
        for (let scene = 1; scene <= project.Scenes.SceneCount; scene++) {
            if (project.Scenes[scene].IncludeScene) {
                output_text += 'file ' + "'" + project.Scenes[scene][outputFiles[i]] + "'" + '\n';
            }
        }
        //ffmpeg -safe 0 -f concat -segment_time_metadata 1 -i file.txt -vf select=concatdec_select -af aselect=concatdec_select,aresample=async=1 out.mp4
        fs.writeFileSync(inputFile, output_text);
        console.log('\nLog input.txt: \n' + output_text);
        //let ffcommand = 'ffmpeg -f concat -safe 0 -i ' + inputFile + ' -c copy ' + project.Video.FileOutputAudio;
        let ffcommand = 'ffmpeg -hide_banner -fflags +genpts -async 1 -f concat -safe 0 -i ' + inputFile + ' ' + project.Video[outputFiles[i]];
        await executeCommand(ffcommand);
        //fs.unlinkSync(inputFile);
    }
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
    // 2. Avvia la sequenza per creare l'audio specifico alla lingua
    //    create_lang_video(lang)
    // 3. Legge il file Project.json
    // 4. Crea la struttura project
    // 5. Crea i file audio (speech)
    // 6. Sequenza le scene Json
    //    - calcola durata massima scena
    // 6.1 Crea il file video partendo dalle immagini   
    // 7. Crea i file video per le separazione
    // 7. Adatta durata file scene alla durata audio
    // 8. Aggiunge audio ai file scene  
    // 9. Aggiunge sottotitoli alle scene
    // 10. Monta assieme tutte le scene e crea file video finale

    // Informazioni per l'AC2
   
    // Nel file ac2 se è una riga non audio 
    // - se si mette EndTime 24:00:00  mette il tempo della scena 
    //   Serve per le righe di titolo iniziale che devono restare per tutta la scena
    // - se si mette EndTime 23:00:00  mette il tempo della prossima riga
    //   Serve per mettere un testo diverso per audio e  sottotitoli
    //   dove però il sottotitolo appare per lo stesso tempo dell'audio
    //   l'altra riga deve avere lo stile "None"
    // - se si mette EndTime 22:00:00  mette il tempo della riga precedente 
    //   Vedi spiegazioni 23:00:00

    // videoFile #mid-page sostiusce file con slide_empty.png

    // Scene, numerico iniziona da 1 
    // Se non c'é nulla all'inizio mette #none scena 1
    // Dove c'é un VideoFile inizia una nuova scena

    // Per funzionare i file video devono essere formato mp4
    // Devono avere un framerate di 25. Se non lo si fa le durate non sono corrette
    // Usare il comando qui sotto per settare il framerate a 25
    // ffmpeg -i input.mp4 -filter:v fps=fps=25 output.mp4


    console.log(`-----------------------------------------`);
    console.log(`------------  START ---------------------`);
    console.log(`-----------------------------------------`);
    let paramText = fs.readFileSync('execParam.json', 'utf8');
    let execParam = JSON.parse(paramText);
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

    let languages = execParam.outputLanguages.split(';');
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

