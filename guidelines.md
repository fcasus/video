# Linee guida per la creazione di video

Quando si creano video e viene registrato quello che succede a schermo in Banana, bisognerebbe tenere in considerazione alcuni accorgimenti per avere una certa coerenza tra un video e l’altro e migliorare il risultato finale:

1. Utilizzare Banana su Windows. La maggior parte degli utenti utilizza Banana per Windows e quindi si è scelto di andare sempre in quella direzione.

2. Utilizzare l’ultima versione utenti di Banana, attivata correttamente con un codice di licenza. Non utilizzare la Free Version o la versione Experimental. Questo per evitare che venga mostrato il limite delle 70 registrazioni e la dicitura Experimental.

![A test image](/images/img002.png)

3. Evitare spazi vuoti/bianchi sulla destra dello schermo quando si mostrano le tabelle. È brutto da vedere. 

![A test image](/images/img003.png)

4. Fare in modo che la tabella in questione occupi tutta la larghezza della finestra. Allargare quindi le varie colonne ed eventualmente aumentare anche lo zoom. Lo zoom sarebbe sempre meglio aumentarlo un po’ (ad es. a 160%) in modo da facilitare poi la visione su tablet e smartphone.

![A test image](/images/img004.png)









# Microsoft Azure TTS

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

A questo punto è tutto installato e pronto per l’utilizzo. Avviare uno degli scripts tts1.js, tts2.js, tts3.js per generare il file audio partendo da un testo.



# Link utili
[Google](https://cloud.google.com/text-to-speech/docs/ssml)
[Microsoft](https://docs.microsoft.com/en-us/cortana/skills/speech-synthesis-markup-language#prosody-element)
