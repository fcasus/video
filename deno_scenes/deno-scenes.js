// copyright Banana.ch SA 
// All right reserved

// Requires request and request-promise for HTTP requests
// e.g. npm install request request-promise
//const rp = require('request-promise');

// // Requires fs to write synthesized speech to a file
// const fs = require('fs');
// // Requires readline-sync to read command line inputs
// const readline = require('readline-sync');
// // Requires xmlbuilder to build the SSML body
// const xmlbuilder = require('xmlbuilder');
// // Requires to execute ffmpeg
// //const { exec } = require("child_process");
// const execSync = require('child_process').execSync;

//import {ensureDirSync } from "https://deno.land/std/fs/mod.ts";
//import { ensureFileSync } from "https://deno.land/std/fs/mod.ts";
import { existsSync, ensureDirSync } from "https://deno.land/std/fs/mod.ts";
import { exec, execSequence, OutputMode } from "https://deno.land/x/exec/mod.ts";

// Gets an access token.
async function azure_get_accessToken(subscriptionKey) {
    const url = 'https://westeurope.api.cognitive.microsoft.com/sts/v1.0/issueToken';
    const response = await fetch(url,
        {
            method: "POST",
            headers: {
                'Content-type': 'application/x-www-form-urlencoded',
                'Content-Length': '0',
                'Ocp-Apim-Subscription-Key': subscriptionKey
            }
        });
    return response.text();

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

async function azure_create_speech_file(accessToken, project, rowNumber) {

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
    //let contents = Deno.readFileSync(xmlFileName, 'utf8');

    console.log('azure_create_audio_file entered');
    let rows = project.Rows;
    let xmlRequest = '<?xml version="1.0" encoding="UTF-8"?>';
    xmlRequest = '<speak version="1.0" xmlns="https://www.w3.org/2001/10/synthesis" \n';
    xmlRequest += 'xmlns:mstts="https://www.w3.org/2001/mstts" xml:lang="' + project.execParam.CognitiveServicesLang + '">\n';
    xmlRequest += '<voice name="' + project.execParam.CognitiveServicesLang + '-' + project.execParam.CognitiveServicesVoice + '">\n';
    if (rows[rowNumber].Speech === 'Duration') {
        xmlRequest += '<prosody duration="' + Math.round(audioObjects[rowNumber].AdjustedDuration * 1000) + 'ms">';
        xmlRequest += rows[rowNumber].Text;
        xmlRequest += '</prosody>';
    }
    else if (rows[rowNumber].Speech === 'Rfast') {
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

    let baseUrl = 'https://westeurope.tts.speech.microsoft.com/';
    let url = 'cognitiveservices/v1';
    let options = {
        method: 'POST',
        headers: {
            'Authorization': 'Bearer ' + accessToken,
            'cache-control': 'no-cache',
            'User-Agent': 'BAN_TextToSpeech',
            'X-Microsoft-OutputFormat': 'riff-24khz-16bit-mono-pcm',
            'Content-Type': 'application/ssml+xml',
            'Content-Length': (new TextEncoder()).encode(xmlRequest).length
            //'Content-Length': xmlRequest.length
        },
        body: xmlRequest
    }
    console.log('xmlRequest: ' + xmlRequest);

    const fileName = rows[rowNumber].AzureSpeechFileName;
    console.log('Creating audio file: ' + fileName);

    const response = await fetch(baseUrl + url, options);
    Deno.writeFileSync(fileName, new Uint8Array(await response.arrayBuffer()));
    console.log('Azure response: ' + JSON.stringify(response));
    await new Promise(resolve => setTimeout(resolve, 500));

}

// I file audio vengono creati solo se i testi sono diversi
// I testi precedenti sono nel  statisticsObjects
async function create_speech_files(project, projectlastDone) {

    let rows = project.Rows;

    let subscriptionKey = String(Deno.readTextFileSync('../../subscription.key')).trim();
    if (!subscriptionKey) {
        throw new Error('Subscription key not found')
    };

    //console.log("Subscription key : " + subscriptionKey);
    const accessToken = await azure_get_accessToken(subscriptionKey);
    //console.log("access token: " + accessToken);

    azure_set_voices(project);

    for (let i = 1; i <= rows.RowCount; i++) {
        if (rows[i].AddSpeech) {
            let createSpeechFile = false;
            // vedere quando genereare il file audio
            //console.log(projectlastDone.Rows[i].Text + ' / ' + rows[i].Text);
            if (!projectlastDone || !projectlastDone.Rows[i]) {
                createSpeechFile = true;
            }
            else if (projectlastDone.Rows[i].Text !== rows[i].Text) {
                createSpeechFile = true;
            }
            if (!existsSync(rows[i].SpeechFileName) || !existsSync(rows[i].AzureSpeechFileName)) {
                createSpeechFile = true;
            }
            //console.log('create azure audio: ' + rows[i].AzureSpeechFileName + ' ' + createSpeechFile);
            if (!createSpeechFile && rows[i].SpeechFileName) {
                // file non valido 
                rows[i].SpeechFileDuration = await get_file_duration_seconds(project, rows[i].SpeechFileName);
                if (!rows[i].SpeechFileDuration) {
                    createSpeechFile = true;
                }
                rows[i].SpeechFileDuration = Number(rows[i].SpeechFileDuration.toFixed(3));
            }
            if (createSpeechFile) {
                //console.log('create azure speech file: ' + rows[i].AzureSpeechFileName);
                if (existsSync(rows[i].AzureSpeechFileName)) {
                    Deno.removeSync(rows[i].AzureSpeechFileName);
                }
                if (existsSync(rows[i].SpeechFileName)) {
                    Deno.removeSync(rows[i].SpeechFileName);
                }
                await azure_create_speech_file(accessToken, project, i);
            }
            if (createSpeechFile || !existsSync(rows[i].SpeechFileName)) {
                console.log('create  speech file: ' + rows[i].SpeechFileName);
                // alla fine vengono messi 800 millisecondi, ne tagliamo 600
                const audioDuration = await get_file_duration_seconds(project, rows[i].AzureSpeechFileName);
                let commands = [project.execParam.ffmpegExecutable, '-y', '-hide_banner', '-i', rows[i].AzureSpeechFileName];
                commands.push('-t');
                commands.push(String(audioDuration - 0.600));
                commands.push(rows[i].SpeechFileName);
                await executeCommandArray(commands);
                //await new Promise(resolve => setTimeout(resolve, 500));
            }
            if (!rows[i].SpeechFileDuration) {
                // Get file duration
                rows[i].SpeechFileDuration = await get_file_duration_seconds(project, rows[i].SpeechFileName);
                // Audio file has a 800ms empty time at the end
                rows[i].SpeechFileDuration = Number(rows[i].SpeechFileDuration.toFixed(3));
            }
        }
    }
}

async function create_scenes(project) {

    let rows = project.Rows;
    let scene = 0;
    project.Scenes = {};
    let rowCount = 0;
    for (let i = 1; i <= rows.RowCount; i++) {
        let sceneFile = rows[i].SceneFile;
        if (i == 1 && !sceneFile) {
            sceneFile = "#none";
        }
        if (sceneFile.length > 0) {
            scene++;
            project.Scenes[scene] = {};
            project.Scenes[scene].SceneFile = sceneFile;
            if (sceneFile === '#mid-page') {
                sceneFile = '../' + project.execParam.videoMidPage;
            }
            else if (sceneFile === '#start-page') {
                sceneFile = '../' + project.execParam.videoStartPage;
            }
            project.Scenes[scene].InputFile = sceneFile;

            // quello che impostato la duration
            project.Scenes[scene].FileSubtitestSrt = project.execParam.lang + '/scene' + scene + '-subtitles.srt';
            project.Scenes[scene].FileSubtitestAss = project.execParam.lang + '/scene' + scene + '-subtitles.ass';
            //
            project.Scenes[scene].FileVideoGenerated = project.execParam.lang + '/scene' + scene + '-video-generated' + project.execParam.videoFileExtension;
            // mettiamo la durata giusta
            project.Scenes[scene].FileVideoChangedDuration = project.execParam.lang + '/scene' + scene + '-video-changed-duration' + project.execParam.videoFileExtension;
            project.Scenes[scene].FileVideoSpeech = project.execParam.lang + '/scene' + scene + '-video-speech' + project.execParam.videoFileExtension;
            project.Scenes[scene].FileVideoNoSpeech = project.execParam.lang + '/scene' + scene + '-video-no-speech' + project.execParam.videoFileExtension;
            project.Scenes[scene].FileVideoAss = project.execParam.lang + '/scene' + scene + '-video-ass' + project.execParam.videoFileExtension;
            project.Scenes[scene].FileVideoAssSpeech = project.execParam.lang + '/scene' + scene + '-video-ass-speech' + project.execParam.videoFileExtension;
            project.Scenes[scene].FileVideoSrt = project.execParam.lang + '/scene' + scene + '-video-srt' + project.execParam.videoFileExtension;

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

    await create_scenes_calculate_times(project);

    await write_project_last_done(project);

    await create_scenes_generate_video(project);

    await create_scenes_adjust_videoduration(project);

    for (let scene = 1; scene <= project.Scenes.SceneCount; scene++) {

        if (!project.Scenes[scene].InputFile.startsWith('#')) {
            await create_scene_subtitles_srt(project, scene);
            await create_scene_subtitles_ass(project, scene);

            // write_text_times(project);
            // write_text_durations(project);

            await create_scene_add_subtitles_ass(project, scene);
            await create_scene_add_subtitles_srt(project, scene);

            if (project.execParam.createVideo) {
                let inputVideoFile = project.Scenes[scene].FileVideoChangedDuration;
                let outputVideoFile = project.Scenes[scene].FileVideoSpeech;
                await create_scene_add_speech(project, scene, inputVideoFile, outputVideoFile);
                inputVideoFile = project.Scenes[scene].FileVideoAss;
                outputVideoFile = project.Scenes[scene].FileVideoAssSpeech;
                await create_scene_add_speech(project, scene, inputVideoFile, outputVideoFile);

            }

        }
    }
    await create_video_concat_scene(project);

    return true;
}

// Use async and await to get the token before attempting to convert text to speech.
async function create_scene_add_speech(project, scene, inputVideoFile, outputVideoFile) {

    if (!project.Scenes[scene] || !project.Scenes[scene].IncludeScene) {
        return;
    }

    console.log('\nAdd speech to Video Scene : ' + scene);
    if (!existsSync(inputVideoFile)) {
        console.log('Video file does not exists : ' + inputVideoFile);
        return;
    }
    let commands = [project.execParam.ffmpegExecutable, '-y', '-hide_banner', '-i', inputVideoFile];
    let ffcommand = project.execParam.ffmpegExecutable + ' -y -hide_banner -i ' + inputVideoFile + ' ';
    let rows = project.Scenes[scene].Rows;
    let filter1 = '';
    let filter2 = '';
    let countFiles = 0;
    for (let i = 1; i <= rows.RowCount; i++) {
        if (rows[i].AddSpeech) {
            countFiles++;
            ffcommand += '-i ' + rows[i].SpeechFileName + ' ';
            commands.push('-i', rows[i].SpeechFileName);
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
    ffcommand += ' -map 0:v -map [mixout] -c:v copy ' + outputVideoFile;
    console.log(ffcommand);

    commands.push('-filter_complex');
    let filter = filter1 + filter2;
    filter += 'amix=inputs=' + countFiles;
    filter += ':dropout_transition=' + project.Scenes[scene].AdjustedSceneEndTimeSeconds;
    filter += ',volume=' + project.Video.Volume;
    filter += '[mixout]';
    commands.push(filter);
    commands.push('-map', '0:v', '-map', '[mixout]', '-c:v', 'copy', outputVideoFile);
    await executeCommandArray(commands);
}

async function create_scenes_adjust_videoduration(project) {

    project.Scenes.TotalVideoDuration = 0;

    for (let scene = 1; scene <= project.Scenes.SceneCount; scene++) {
        let adijustedDuration = project.Scenes[scene].AdjustedSceneEndTimeSeconds;
        project.Scenes[scene].UsedVideoDuration = 0;
        const inputVideoFile = project.Scenes[scene].FileVideoGenerated;
        const outputVideoFile = project.Scenes[scene].FileVideoChangedDuration;
        if (adijustedDuration > 0 && !project.Scenes[scene].InputFile.startsWith('#')) {
            project.Scenes[scene].InputVideoDuration = await get_file_duration_seconds(project, inputVideoFile);
            project.Scenes[scene].UsedVideoDuration = project.Scenes[scene].InputVideoDuration;
            // speed up ffmpeg -i input.mkv -filter:v "setpts=0.5*PTS" output.mkv
            // slow down ffmpeg -i input.mkv -filter:v "setpts=2.0*PTS" output.mkv
            //let PTS = 1 Number(project.Scenes[scene].InputVideoDuration) / Number(adijustedDuration);
            let PTS = Number(adijustedDuration) / Number(project.Scenes[scene].InputVideoDuration);
            PTS = Number(PTS.toFixed(2));
            project.Scenes[scene].PTS = PTS;
            if (PTS && PTS > 0 && PTS != 1) {
                console.log("\nPTS changed: " + inputVideoFile + ' ' + PTS);
                project.Scenes[scene].UsedVideoDuration = project.Scenes[scene].AdjustedSceneEndTimeSeconds;
                let ffparam = '-y -hide_banner -i ' + inputVideoFile;
                ffparam += ' -filter:v "setpts=' + PTS + '*PTS" ' + project.Scenes[scene].FileVideoChangedDuration;
                let commands = [project.execParam.ffmpegExecutable, '-y', '-hide_banner', '-i'];
                commands.push(inputVideoFile);
                commands.push('-filter:v');
                commands.push('setpts=' + PTS + '*PTS');
                commands.push(outputVideoFile);
                await executeCommandArray(commands);
            }
            else {
                console.log("\nCopy : " + inputVideoFile);
                Deno.copyFileSync(inputVideoFile, outputVideoFile);
            }
        }
    }
}

function create_scenes_calculate_times(project) {
    project.Scenes.AdjustedVideoEndTimeSeconds = 0;
    // Calculate first the time sequence
    for (let scene = 1; scene <= project.Scenes.SceneCount; scene++) {
        project.Scenes[scene].IncludeScene = false;
        let rows = project.Scenes[scene].Rows;
        project.Scenes[scene].AdjustedSceneStartTimeSeconds = 0;
        project.Scenes[scene].AdjustedSceneStartTime = time_SecondsToTime(project.Scenes[scene].AdjustedSceneStartTimeSeconds);
        let lastSceneFinishTimeSeconds = 0;
        //console.log(`rows.RowCount ` + rows.RowCount);
        for (let i = 1; i <= rows.RowCount; i++) {
            if (rows[i].AddSpeech) {
                let adjustedSceneStartTimeSeconds = rows[i].StartTimeSeconds;
                // Set next time if less then previous end
                if (adjustedSceneStartTimeSeconds < lastSceneFinishTimeSeconds) {
                    adjustedSceneStartTimeSeconds = lastSceneFinishTimeSeconds;
                    // add a small pause between seguence
                    adjustedSceneStartTimeSeconds += 0.2;
                }
                rows[i].AdjustedSceneStartTimeSeconds = adjustedSceneStartTimeSeconds;
                lastSceneFinishTimeSeconds = adjustedSceneStartTimeSeconds + rows[i].AdjustedDuration;
                rows[i].AdjustedSceneEndTimeSeconds = lastSceneFinishTimeSeconds;
            }
            else if (rows[i].Pause) {
                // If it is a pause add it
                rows[i].AdjustedSceneStartTimeSeconds = lastSceneFinishTimeSeconds;
                lastSceneFinishTimeSeconds += rows[i].Pause;
                rows[i].AdjustedSceneEndTimeSeconds = lastSceneFinishTimeSeconds;
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
            if (!rows[i].AddSpeech && rows[i].SetDuration === 'MaxSceneTime') {
                rows[i].AdjustedSceneEndTimeSeconds = project.Scenes[scene].AdjustedSceneEndTimeSeconds - rows[i].AdjustedSceneStartTimeSeconds;
                rows[i].AdjustedSceneEndTime = time_SecondsToTime(rows[i].AdjustedSceneEndTimeSeconds);
            }
            if (!rows[i].AddSpeech && rows[i].SetDuration === 'NextRow' && (i + 1) < rows.length) {
                rows[i].AdjustedSceneStartTimeSeconds = rows[i + 1].AdjustedSceneStartTimeSeconds;
                rows[i].AdjustedSceneEndTimeSeconds = rows[i + 1].AdjustedSceneEndTimeSeconds;
            }
            if (!rows[i].AddSpeech && rows[i].SetDuration === 'PrevRow' && i > 0) {
                rows[i].AdjustedSceneStartTimeSeconds = rows[i - 1].AdjustedSceneStartTimeSeconds;
                rows[i].AdjustedSceneEndTimeSeconds = rows[i - 1].AdjustedSceneEndTimeSeconds;
            }
            // Convertiamo il time
            rows[i].AdjustedSceneStartTime = time_SecondsToTime(rows[i].AdjustedSceneStartTimeSeconds);
            rows[i].AdjustedSceneEndTime = time_SecondsToTime(rows[i].AdjustedSceneEndTimeSeconds);
        }
    }
    // Set the time relative to the whole video 
    let lastVideoFinishTimeSeconds = 0;
    for (let scene = 1; scene <= project.Scenes.SceneCount; scene++) {
        let rows = project.Scenes[scene].Rows;
        if (lastVideoFinishTimeSeconds > 0) {
            // add a small pause between scene
            lastVideoFinishTimeSeconds += 0.2;
        }
        let videoStartTimeSeconds = lastVideoFinishTimeSeconds;
        project.Scenes[scene].AdjustedVideoStartTimeSeconds = videoStartTimeSeconds;
        project.Scenes[scene].AdjustedVideoStartTime = time_SecondsToTime(project.Scenes[scene].AdjustedVideoStartTimeSeconds);
        for (let i = 1; i <= rows.RowCount; i++) {
            rows[i].AdjustedVideoStartTimeSeconds = videoStartTimeSeconds + rows[i].AdjustedSceneStartTimeSeconds;
            rows[i].AdjustedVideoStartTime = time_SecondsToTime(rows[i].AdjustedVideoStartTimeSeconds);
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

async function create_scenes_generate_video(project) {

    for (let scene = 1; scene <= project.Scenes.SceneCount; scene++) {
        let inputFile = project.Scenes[scene].InputFile;
        console.log("Input file: " + inputFile);
        if (inputFile.endsWith('.png')) {
            console.log("Generate video from PNG: " + project.Scenes[scene].FileVideoNoSpeech)
            let ffparam = '-hide_banner -loop 1 -i ' + inputFile;
            ffparam += ' -framerate 25 -c:v libx264 -t ' + project.Scenes[scene].AdjustedSceneEndTimeSeconds;
            ffparam += ' -pix_fmt yuv420p -vf scale=1920:1080  ' + project.Scenes[scene].FileVideoNoSpeech;
            //await executeCommand('ffmpeg', ffparam);
            let commands = [project.execParam.ffmpegExecutable, '-y', '-hide_banner', '-loop', '1', '-i', inputFile];
            commands.push('-framerate');
            commands.push('25');
            commands.push('-c:v');
            commands.push('libx264');
            commands.push('-t');
            commands.push(project.Scenes[scene].AdjustedSceneEndTimeSeconds);
            commands.push('-pix_fmt');
            commands.push('yuv420p');
            commands.push('-vf');
            commands.push('scale=1920:1080');
            commands.push(project.Scenes[scene].FileVideoGenerated);
            await executeCommandArray(commands);
        }
        else if (inputFile.endsWith('.mp4')) {
            console.log("Video with fps 25: " + project.Scenes[scene].FileVideoNoSpeech)
            let ffparam = '-i ' + inputFile;
            ffparam += ' -filter:v fps=fps=25 ' + project.Scenes[scene].FileVideoNoSpeech;
            //await executeCommand('ffmpeg', ffparam);
            let commands = [project.execParam.ffmpegExecutable, '-y', '-hide_banner', '-i', inputFile];
            commands.push('-filter:v');
            commands.push('fps=fps=25');
            commands.push(project.Scenes[scene].FileVideoGenerated);
            await executeCommandArray(commands);
        }
    }
}

async function create_scene_subtitles_srt(project, scene) {

    if (!project.execParam.createSubtitlesSrt) {
        return;
    }


    let output = '';
    let rows = project.Scenes[scene].Rows;
    for (let i = 1; i <= rows.RowCount; i++) {
        if (rows[i].AddSpeech) {
            output += i + '\n';
            let startTime = rows[i].AdjustedSceneStartTime;
            startTime = startTime.replace('.', ',');
            let endTime = rows[i].AdjustedSceneEndTime;
            endTime = endTime.replace('.', ',');
            output += startTime + ' --> ' + endTime + '\n';
            output += rows[i].Text + '\n\n';
        }
    }
    Deno.writeTextFileSync(project.Scenes[scene].FileSubtitestSrt, output);
}

async function create_scene_subtitles_ass(project, scene) {
    if (!project.execParam.createSubtitlesAss) {
        return;
    }

    // References
    // see https://fileformats.fandom.com/wiki/SubStation_Alpha
    // see http://docs.aegisub.org/3.1/ASS_Tags/
    // see http://www.perlfu.co.uk/projects/asa/ass-specs.doc
    // ass can also generate from srt 
    //ffparam = 'ffmpeg -y -hide_banner -i subtitles.srt subtitles.ass';


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

    output += 'Style: ControlTimesScene,Source Sans Pro,12,&H9e4835,&H9e4835,&H9e4835,&H9e4835,1,0,0,0,100,100,0,0,0,0,0,8,10,10,80,0\n';
    output += 'Style: ControlTimesRow,Source Sans Pro,12,&H9e4835,&H9e4835,&H9e4835,&H9e4835,1,0,0,0,100,100,0,0,0,0,0,8,10,10,120,0\n';

    output += '\n';
    output += '[Events]\n';
    output += 'Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text\n';

    let rows = project.Scenes[scene].Rows;
    //  Time inforamtion for scene 
    if (project.execParam.addControlTimes) {
        output += 'Dialogue: 0,';
        output += project.Scenes[scene].AdjustedSceneStartTime.substring(1, 11) + ',';
        output += project.Scenes[scene].AdjustedSceneEndTime.substring(1, 11) + ',';
        output += 'ControlTimesScene,,0,0,0,,';
        output += ' Scene: ' + scene + ' ';
        output += project.Scenes[scene].AdjustedVideoStartTime + ' / ' + project.Scenes[scene].AdjustedVideoEndTime;
        output += ' / ' + project.Scenes[scene].UsedVideoDuration;
        output += '\n';
    }

    for (let i = 1; i <= rows.RowCount; i++) {
        //Dialogue: 0,0:00:03.44,0:00:08.28,Default,,0,0,0,,Este breve video te explicará cómo crear un presupuesto familiar utilizando el cash manager
        let style = 'Subtitles';
        if (rows[i].TextStyle.length > 0) {
            style = rows[i].TextStyle;
        }
        // Add the text
        if (rows[i].AddText) {
            output += 'Dialogue: 0,';
            output += rows[i].AdjustedSceneStartTime.substring(1, 11) + ',';
            output += rows[i].AdjustedSceneEndTime.substring(1, 11) + ',';
            output += style;
            output += ',,0,0,0,,';
            output += rows[i].Text + '\n';
        }
        if (project.execParam.addControlTimes && !rows[i].IsComment) {
            // Info Row
            output += 'Dialogue: 0,';
            output += rows[i].AdjustedSceneStartTime.substring(1, 11) + ',';
            output += rows[i].AdjustedSceneEndTime.substring(1, 11) + ',';
            output += 'ControlTimesRow,,0,0,0,,';
            output += ' Row: ' + scene + '/' + i + '/' + rows[i].RowOrigin;
            output += ' Style: ' + rows[i].TextStyle + ' ';
            output += rows[i].AdjustedVideoStartTime + ' / ' + rows[i].AdjustedVideoEndTime;
            output += ' / ' + rows[i].AdjustedDuration;
            if (rows[i].Style === 'None') {
                output += rows[i].Text;
            }
            output += '\n';

        }

    }
    Deno.writeTextFileSync(project.Scenes[scene].FileSubtitestAss, output);
}


async function create_scene_add_subtitles_ass(project, scene) {
    if (!project.execParam.createSubtitlesAss) {
        return;
    }
    if (!project.Scenes[scene].IncludeScene) {
        return;
    }

    let ffcommand = project.execParam.ffmpegExecutable + ' -y -hide_banner -i ' + project.Scenes[scene].FileVideoChangedDuration;
    ffcommand += ' -vf ass=' + project.Scenes[scene].FileSubtitestAss + ' ' + project.Scenes[scene].FileVideoAss;
    console.log('ffcommand subtitiles ass' + ffcommand);

    let commands = [project.execParam.ffmpegExecutable, '-y', '-hide_banner', '-i', project.Scenes[scene].FileVideoChangedDuration];
    commands.push('-vf', 'ass=' + project.Scenes[scene].FileSubtitestAss);
    commands.push(project.Scenes[scene].FileVideoAss);
    await executeCommandArray(commands);

}

async function create_scene_add_subtitles_srt(project, scene) {
    if (!project.execParam.createSubtitlesSrt) {
        return;
    }

    if (!project.Scenes[scene].IncludeScene) {
        return;
    }
    let lang = project.execParam.lang;
    if (lang === 'en') {
        lang = 'eng';
    }
    else if (lang === 'de') {
        lang = 'deu';
    }
    else if (lang === 'fr') {
        lang = 'fra';
    }
    else if (lang === 'es') {
        lang = 'esp';
    }
    else if (lang === 'nl') {
        lang = 'nld';
    }
    else if (lang === 'pt') {
        lang = 'por';
    }
    else if (lang === 'zh') {
        lang = 'zho';
    }
    if (lang.length <= 2) {
        console.log('Error SRT need language 3 chars: ' + lang);
    }


    //let ffcommand = 'ffmpeg -y -hide_banner -i result.mp4 -i subtitles.srt -c copy -c:s mov_text language=esp result-srt.mp4';
    let ffcommand = project.execParam.ffmpegExecutable + ' -y -hide_banner -i ' + project.Scenes[scene].FileVideoChangedDuration;

    ffcommand += ' -i ' + project.Scenes[scene].FileSubtitestSrt;
    ffcommand += ' -c:a copy -c:v copy -c:s mov_text -metadata:s:s:0 language=' + lang + ' ';
    ffcommand += project.Scenes[scene].FileVideoSrt;
    console.log('ffcommand subtitiles srt' + ffcommand);


    let commands = [project.execParam.ffmpegExecutable, '-y', '-hide_banner', '-i', project.Scenes[scene].FileVideoChangedDuration];

    commands.push('-i', project.Scenes[scene].FileSubtitestSrt);
    commands.push('-c:a', 'copy', '-c:v', 'copy', '-c:s', 'mov_text', '-metadata:s:s:0');
    commands.push('language=' + lang);
    commands.push(project.Scenes[scene].FileVideoSrt);
    await executeCommandArray(commands);
}

async function create_video(execParam) {

    // read ac2 export
    const decoder = new TextDecoder('utf-8');
    let contents = Deno.readFileSync('Project.json');
    let project = JSON.parse(decoder.decode(contents));
    project.execParam = execParam;
    let lang = project.execParam.lang;

    // create language dir
    ensureDirSync(lang);

    project.execParam.columnLang = "Lang_" + lang;
    let videoName = project.execParam.projectSubDirectory;
    project.execParam.VideoName = videoName;

    project.Video = {};
    project.Video.FileVideoSpeech = lang + '/' + videoName + '-sppech-' + lang + execParam.videoFileExtension;
    project.Video.FileVideoNoSpeech = lang + '/' + videoName + '-no-speech-' + lang + execParam.videoFileExtension;
    project.Video.FileVideoAss = lang + '/' + videoName + '-ass-' + lang + execParam.videoFileExtension;
    project.Video.FileVideoAssSpeech = lang + '/' + videoName + '-ass-speech-' + lang + execParam.videoFileExtension;
    // Video messo alla fine
    project.Video.FileOutputAssSpeechOnePass = lang + '/' + videoName + '-ass-speech-onepass-' + lang + execParam.videoFileExtension;
    project.Video.FileVideoSrt = lang + '/' + videoName + '-srt-' + lang + execParam.videoFileExtension;
    // durata del file video
    project.Video.Volume = 10;
    project.Video.FileSubtitestSrt = lang + '/subtitles-' + lang + '.srt';
    project.Video.FileSubtitestAss = lang + '/subtitles-' + lang + '.ass';
    project.Video.FileTimes = lang + '/times-' + lang + '.txt';
    project.Video.FileTotalDuration = lang + '/duration-' + lang + '.txt';

    // cancella i file
    await create_video_deletefiles(project);
    let rows = project.Rows;

    // Legge il file con i tempi
    project.settings = {};
    project.settings.FileProjectLastDone = lang + '\\project-last-done-' + lang + '.json';


    // Sceglie quello che è audio 
    for (let i = 1; i <= project.Rows.RowCount; i++) {
        // Row add speech
        project.Rows[i].AddSpeech = false;
        // Speech and pause commands 
        project.Rows[i].IncludeInTimeCount = false;
        project.Rows[i].IsComment = false;
        // Row is for text
        project.Rows[i].AddText = true;
        project.Rows[i].Text = project.Rows[i][project.execParam.columnLang];
        project.Rows[i].TextStyle = project.Rows[i].Style;


        // Comment we do not use 
        if (project.Rows[i].Style.startsWith('//')) {
            project.Rows[i].TextStyle = '';
            project.Rows[i].Text = '';
            project.Rows[i].IsComment = true;
            project.Rows[i].AddText = false;
        }
        else {
            if (rows[i].Speech !== '0' && project.Rows[i].Text) {
                project.Rows[i].AddSpeech = true;
                // Speech and pause commands 
                project.Rows[i].IncludeInTimeCount = true;
            }
            if (project.Rows[i].Style.toLowerCase().startsWith('pause:')) {
                // if pause don't care at text
                project.Rows[i].Text = '';
                project.Rows[i].Pause = parseFloat(project.Rows[i].Style.slice(6));
                project.Rows[i].TextStyle = '';
                project.Rows[i].IncludeInTimeCount = true;
                project.Rows[i].AddText = false;
            }
            if (project.Rows[i].Style.toLowerCase().startsWith('none') || !project.Rows[i].Text) {
                // if pause don't care at text
                project.Rows[i].TextStyle = '';
                project.Rows[i].AddText = false;
            }
        }
        if (!project.Rows[i].AddText) {
            if (!project.Rows[i].Style.trim()) {
                project.Rows[i].TextStyle = 'Subtitles';
            }
        }
        if (!rows[i].IsComment) {
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
            let fileNum = String(i);
            while (fileNum.length < 3) {
                fileNum = '0' + fileNum;
            }
            project.Rows[i].AzureSpeechFileName = lang + '/aa' + fileNum + '.wav';
            project.Rows[i].SpeechFileName = lang + '/a' + fileNum + '.wav';
        }
    }

    // Crea i file audio solo se il testo è cambiato   
    if (execParam.AddSpeech) {
        let projectLast;
        if (existsSync(project.settings.FileProjectLastDone)) {
            const decoder = new TextDecoder('utf-8');
            const lastDone = Deno.readFileSync(project.settings.FileProjectLastDone);
            projectLast = JSON.parse(decoder.decode(lastDone));
        }
        await create_speech_files(project, projectLast);
    }

    // Calcola i tempi
    for (let i = 1; i <= rows.RowCount; i++) {
        // Converti in secondi
        rows[i].StartTimeSeconds = time_parseTimeToSeconds(rows[i].StartTime);
        rows[i].EndTimeSeconds = time_parseTimeToSeconds(rows[i].EndTime);
        rows[i].CalculatedDuration = rows[i].EndTimeSeconds - rows[i].StartTimeSeconds;
        rows[i].AdjustedDuration = rows[i].CalculatedDuration;
        if (rows[i].AddSpeech) {
            if (rows[i].AdjustedDuration < rows[i].SpeechFileDuration) {
                rows[i].AdjustedDuration = rows[i].SpeechFileDuration;
            }
        }
        // Mettiamolo qui perché serve anche per quelli che non hanno audio
        rows[i].AdjustedSceneStartTimeSeconds = rows[i].StartTimeSeconds;
        rows[i].AdjustedSceneStartTime = time_SecondsToTime(rows[i].StartTimeSeconds);
        rows[i].AdjustedSceneEndTimeSeconds = rows[i].StartTimeSeconds + rows[i].AdjustedDuration;
        rows[i].AdjustedSceneEndTime = time_SecondsToTime(rows[i].AdjustedSceneEndTimeSeconds);
    }
    // salviamo una prima volta per evitare di rifare l'audio, nel caso che si blocca dopo
    await write_project_last_done(project);

    await create_scenes(project);

    await create_video_add_speech(project);

    // rifacciamolo con tutti i dati
    await write_project_last_done(project);


    return true;
}

// Add audio in a signle pass to the whole video
async function create_video_add_speech(project) {

    const fileInput = project.Video.FileVideoAss;
    if (!existsSync(fileInput)) {
        console.log('Video file does not exists : ' + fileInput);
        return;
    }
    let ffparam = project.execParam.ffmpegExecutable + ' -y -hide_banner -i ' + fileInput + ' ';
    let countFiles = 0;
    let filter1 = '';
    let filter2 = '';
    let commands = [project.execParam.ffmpegExecutable, '-y', '-hide_banner', '-i', fileInput];
    for (let scene = 1; scene <= project.Scenes.SceneCount; scene++) {
        if (project.Scenes[scene].IncludeScene) {

            console.log('\nAdd audio to Video Scene : ' + scene);
            let rows = project.Scenes[scene].Rows;
            for (let i = 1; i <= rows.RowCount; i++) {
                if (rows[i].AddSpeech) {
                    countFiles++;
                    // aggiunge in input i file audio
                    ffparam += '-i ' + rows[i].SpeechFileName + ' ';
                    commands.push('-i', rows[i].SpeechFileName);
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
    ffparam += '-filter_complex "';
    ffparam += filter1 + filter2;
    ffparam += 'amix=inputs=' + countFiles;
    ffparam += ':dropout_transition=' + Math.ceil(project.Scenes.AdjustedVideoEndTimeSeconds);
    ffparam += ',volume=' + project.Video.Volume;
    ffparam += '[mixout]"';
    ffparam += ' -map 0:v -map [mixout] -c:v copy ' + project.Video.FileOutputAssSpeechOnePass;
    console.log('Video add audio single pass: ', ffparam);

    commands.push('-filter_complex');
    let filter = filter1 + filter2;
    filter += 'amix=inputs=' + countFiles;
    filter += ':dropout_transition=' + Math.ceil(project.Scenes.AdjustedVideoEndTimeSeconds);
    filter += ',volume=' + project.Video.Volume;
    filter += '[mixout]';
    commands.push(filter);
    commands.push('-map', '0:v', '-map', '[mixout]', '-c:v', 'copy', project.Video.FileOutputAssSpeechOnePass);
    await executeCommandArray(commands);

}

async function create_video_concat_scene(project) {

    let outputFiles = [];
    outputFiles.push('FileVideoSpeech');
    outputFiles.push('FileVideoNoSpeech');
    if (project.execParam.createSubtitlesAss) {
        outputFiles.push('FileVideoAss');
        outputFiles.push('FileVideoAssSpeech');
    }
    if (project.execParam.createSubtitlesSrt) {
        outputFiles.push('FileVideoSrt');
    }
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
        Deno.writeTextFileSync(inputFile, output_text);
        console.log('\nLog input.txt: \n' + output_text);
        //let ffparam = 'ffmpeg -f concat -safe 0 -i ' + inputFile + ' -c copy ' + project.Video.FileVideoSpeech;
        let ffparam = '-hide_banner -fflags +genpts -async 1 -f concat -safe 0 -i ' + inputFile + ' ' + project.Video[outputFiles[i]];
        //await executeCommand('ffmpeg', ffparam);
        let commands = [project.execParam.ffmpegExecutable, '-y', '-hide_banner', '-fflags', '+genpts', '-async', '1', '-f', 'concat', '-safe', '0', '-i'];
        commands.push(inputFile);
        commands.push(project.Video[outputFiles[i]]);
        await executeCommandArray(commands);
        //Deno.removeSync(inputFile);
    }
    return true;
}

async function create_video_deletefiles(project) {


    let files = [];
    for await (const dirEntry of Deno.readDir(project.execParam.lang)) {
        //console.log('Dir entry : ' + dirEntry.name);
        if (dirEntry.isFile) {
            if (dirEntry.name.startsWith('scene')) {
                files.push(project.execParam.lang + '/' + dirEntry.name);
            }
        }
    }
    files.push(project.Video.FileSubtitestSrt);
    files.push(project.Video.FileSubtitestAss);
    files.push(project.Video.FileVideoSpeech);
    files.push(project.Video.FileVideoNoSpeech);
    files.push(project.Video.FileVideoAss);
    files.push(project.Video.FileVideoAssSpeech);
    files.push(project.Video.FileOutputAssSpeechOnePass);
    files.push(project.Video.FileVideoSrt);
    files.push(project.Video.FileTimes);
    files.push(project.Video.FileTotalDuration);

    for (let i = 0; i < files.length; i++) {
        //console.log('File to delete: ' + files[i]);
        if (existsSync(files[i])) {
            Deno.removeSync(files[i]);
        }
    }
}


async function executeCommandArray(commands) {
    console.log('\nExecuting command Array: ' + JSON.stringify(commands));
    let cmd = Deno.run({
        cmd: commands,
        //stdout: 'piped',
        //stderr: "piped"
    });
    const output = await cmd.status();
    cmd.close();
}

async function get_file_duration_seconds(project, fileName) {
    if (!existsSync(fileName)) {
        console.log('GetDuration File does not exists : ' + fileName);
        return 0;
    }
    let cmd = Deno.run({
        cmd: [project.execParam.ffprobeExecutable, '-v', 'error', '-show_entries', 'format=duration',
            '-i', fileName,
            '-of', 'default=noprint_wrappers=1:nokey=1'
        ],
        stdout: 'piped',
        //stderr: "piped"
    });
    const output = await cmd.output() // "piped" must be set
    const outStr = new TextDecoder().decode(output);
    let duration = parseFloat(outStr.trim());
    //console.log('duration: ' + fileName + ' ' + duration);
    return duration;
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

function time_SecondsToTime(timeInSeconds) {
    let pad = function (num, size) { return ('000' + num).slice(size * -1); },
        time = parseFloat(timeInSeconds).toFixed(3),
        hours = Math.floor(time / 60 / 60),
        minutes = Math.floor(time / 60) % 60,
        seconds = Math.floor(time - minutes * 60),
        milliseconds = time.slice(-3);
    return pad(hours, 2) + ':' + pad(minutes, 2) + ':' + pad(seconds, 2) + '.' + pad(milliseconds, 3);
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
            duration += Math.round(project.Rows[i].AdjustedDuration * 1000) / 1000;
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
    Deno.writeTextFileSync(project.Video.FileTimes, text);

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
            duration += Math.round(project.Rows[i].AdjustedDuration * 1000) / 1000;
            tmpduration = Number(Math.round(project.Rows[i].adijustedDuration * 1000));
            totalduration += tmpduration;
        }
        text += i + '\t'
        text += duration + '\t';
        text += Math.round(totalduration) / 1000 + '\t';
        text += project.Rows[i].Text + '\t';
        text += '\n';
    }
    text += 'Total duration time: ' + Math.round(totalduration) / 1000;

    Deno.writeFileSync(project.Video.FileTotalDuration, text);
}

async function write_project_last_done(project) {
    if (project) {
        console.log('write_project_last_done');
        Deno.writeTextFileSync(project.settings.FileProjectLastDone, JSON.stringify(project));
    }
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
    // 5. Crea i file speech 
    // 6. Sequenza le scene Json
    //    - calcola durata massima scena
    // 6.1 Crea il file video partendo dalle immagini   
    // 7. Crea i file video per le separazione
    // 7. Adatta durata file scene alla durata speech
    // 8. Aggiunge speech ai file scene  
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
    // Dove c'é un SceneFile inizia una nuova scena

    // Per funzionare i file video devono essere formato mp4
    // Devono avere un framerate di 25. Se non lo si fa le durate non sono corrette
    // Usare il comando qui sotto per settare il framerate a 25
    // ffmpeg -i input.mp4 -filter:v fps=fps=25 output.mp4

    // vedere anche https://www.narakeet.com/


    console.log(`-----------------------------------------`);
    console.log(`------------  START ---------------------`);
    console.log(`-----------------------------------------`);
    const decoder = new TextDecoder('utf-8');
    const paramText = Deno.readFileSync('execParam.json');
    let execParam = JSON.parse(decoder.decode(paramText));

    // available exec params
    // {
    //     "projectSubDirectory": "get_started",
    //     "videoStartPage": "slide_start.png",
    //     "videoMidPage": "slide_empty.png",
    //     "videoFileExtension": ".mp4",
    //     "outputLanguages": "en",
    //     "AddSpeech": true,
    //     "createVideo": true,
    //     "execTest": false,
    //     "createSubtitlesAss": true,
    //     "createSubtitlesSrt": false,
    //     "addControlTimes": false,
    //     "recreateSpeechFiles": false
    // }

    
    // Change directory
    Deno.chdir(execParam.projectSubDirectory);

    let languages = execParam.outputLanguages.split(';');
    for (let i = 0; i < languages.length; i++) {
        execParam.lang = languages[i];
        await create_video(execParam);
    }
    console.log(`-----------------------------------------`);
    console.log(`------------ All Finished ---------------`);
    console.log(`-----------------------------------------`);

}

// Run the application
main();

