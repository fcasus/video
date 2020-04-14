// Requires request and request-promise for HTTP requests
// e.g. npm install request request-promise
const rp = require('request-promise');
// Requires fs to write synthesized speech to a file
const fs = require('fs');
// Requires readline-sync to read command line inputs
const readline = require('readline-sync');
// Requires xmlbuilder to build the SSML body
const xmlbuilder = require('xmlbuilder');

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


function textToSpeech(accessToken, xmlFileName) {
   
    // Get the SSML file contents.
    var contents = fs.readFileSync(xmlFileName, 'utf8');

    // Convert the XML into a string to send in the TTS request.
    let body = contents.toString();
    //console.log(body);

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
        body: body
    }

    let request = rp(options)
        .on('response', (response) => {
            if (response.statusCode === 200) {
                request.pipe(fs.createWriteStream('TTSOutput.wav'));
                console.log('\nYour file is ready.\n')
            }
        });
    return request;
}

// Use async and await to get the token before attempting to convert text to speech.
async function main() {

    const subscriptionKey = "ENTER KEY CODE HERE";
    if (!subscriptionKey) {
        throw new Error('Environment variable for your subscription key is not set.')
    };

    // Prompts the user to input text.
    const xmlFileName = readline.question('>> XML file name: ');

    try {
        const accessToken = await getAccessToken(subscriptionKey);
        await textToSpeech(accessToken, xmlFileName);
    } catch (err) {
        console.log(`Something went wrong: ${err}`);
    }
}

// Run the application
main()

