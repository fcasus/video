# Conversione testo in file audio con Microsoft Azure TTS
## Installazione
* Installare Visual Studio Code: https://code.visualstudio.com/
* Installare Node.js (versione 8.12.x o successiva): https://nodejs.org/en/
* Installare il pacchetto per Javascript
  * Avviare Visual Studio Code
  * Sulla pagina di Welcome, a destra dovrebbe apparire **Tools and languages: Install support for Javascript, Python,…**
  * Cliccare su Javascript (in blu)
  * Dovrebbe installare e riavviare.
* Installare il paccheto “npm”
  * Avviare Visual Studio Code
  * CTRL+P
  * Inserire il testo **ext install npm script runner e premere ENTER**
  * Dal menu a sinistra selezionare “npm, npm support for VS Code (egamma)” e cliccare sul bottone verde INSTALL
  * Riavviare VS Code
* Installare i moduli necessari per l’applicativo tts
  * Avviare Visual Studio Code
  * Avviare il TERMINALE di VS Code
  * Inserire e lanciare il comando **npm install request request-promise xmlbuilder readline-sync**

A questo punto è tutto installato e pronto per l’utilizzo. Avviare lo script tts.js per generare il file audio partendo da un testo.

## Come si usa
* Creare una cartella nella quale inserire:
  * lo script **tts.js**
  * i files XML che contengono il testo da convertire
* Aprire il terminale in Visual Studio Code
* Spostarsi nella cartella (es. cd Desktop/nomecartella)
* Avviare lo script con il comando **node tts.js**
* Digitare il nome del file XML (es. text_it.xml)
* Aspettare che termini
* Nella cartella verrà generato il file audio.

![A test image](/images/img005.png)


# Link utili
[Google](https://cloud.google.com/text-to-speech/docs/ssml)

[Microsoft](https://docs.microsoft.com/en-us/cortana/skills/speech-synthesis-markup-language#prosody-element)
