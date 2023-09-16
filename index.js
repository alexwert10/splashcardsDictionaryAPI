const PORT = process.env.PORT || 8000;

const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');

const app = express();

const defaultResponse = [
  'Welcome To The Splashcards Dictionary API. To get started add a "word" parameter like https://splashcards-dictionary-api-8297a470c215.herokuapp.com/version1?word=example',
  'For missing words, add them to Wiktionary at https://en.wiktionary.org/wiki/missing-word',
  'For issues and feature requests, add an issue on github (https://github.com/alexwert10/splashcardsDictionaryAPI/issues) or contact us (splashcards.com)',
  'Data will be returned in this format: ',
  {
    license: [
      {
        sourceURL: 'https://en.wiktionary.org/wiki/example',
        licenseName: 'GNU General Public License Version 3',
        licenseText: 'https://www.gnu.org/licenses/fdl-1.3.html#license-text',
      },
    ],
    definition: [
      {
        'Etymology 1': [
          {
            Noun: [
              'Definition 1',
              'Definition 2',
              [
                'Subdefinition 1 for Definition 2',
                'Subdefinition 2 for Definition 2',
              ],
              'Definition 3',
            ],
          },
          {
            Verb: ['Definition 4'],
          },
        ],
        'Etymology 2': [
          {
            Adjective: ['Definition 5'],
          },
          {
            Noun: ['Definition 6'],
          },
        ],
      },
    ],
  },
];
app.get('/', async (req, res) => {
  return res.json(defaultResponse);
});

app.get('/version1', async (req, res) => {
  if (req.query.word) {
    const word = req.query.word.toLowerCase();
    const url = `https://en.wiktionary.org/wiki/${word}`;
    const legalStuff = [
      {
        sourceURL: url,
        licenseName: 'GNU General Public License Version 3',
        licenseText: 'https://www.gnu.org/licenses/fdl-1.3.html#license-text',
      },
    ];
    let result = await axios
      .get(url)
      .then((res) => {
        html = res.data;
        const $ = cheerio.load(html);

        const definition = [];
        startNode = $('span#English', html).parent();
        let currentEtymo = null;
        let currentEtymoIndex = -1;
        let currentPartOfSpeechIndex = -1;
        let currentPartOfSpeech = null;
        // get data from the start of the "English" section to the next H2 (which will be the next language)
        const englishSection = startNode.nextUntil('h2').each(function () {
          if ($('span[id^=Etymology]', this).html()) {
            currentEtymo = $('span[id^=Etymology]', this).text();
            currentEtymoIndex++;
            let currentEtymoObj = {};
            currentEtymoObj[currentEtymo] = [];
            definition.push(currentEtymoObj);
            console.log('new etymo: ', currentEtymo);
            currentPartOfSpeechIndex = -1;
          } else if (
            //noun, pronoun, verb, adjective, adverb, preposition, conjunction, and interjection.

            $(
              'span[id^=Noun], span[id^=Verb], span[id^=Adjective], span[id^=Pronoun], span[id^=Adverb], span[id^=Preposition], span[id^=Conjunction], span[id^=Interjection]',
              this
            ).html()
          ) {
            currentPartOfSpeech = $(
              'span[id^=Noun], span[id^=Verb], span[id^=Adjective], span[id^=Pronoun], span[id^=Adverb], span[id^=Preposition], span[id^=Conjunction], span[id^=Interjection]',
              this
            ).text();
            // console.log('new part of speech: ', currentPartOfSpeech);
            currentPartOfSpeechIndex++;
            let currentPartOfSpeechObj = {};
            currentPartOfSpeechObj[currentPartOfSpeech] = [];
            definition[currentEtymoIndex][currentEtymo].push(
              currentPartOfSpeechObj
            );
            // console.log('part of speech: ', currentPartOfSpeech);

            // obj[currentEtymo][currentPartOfSpeech] = ;
          } else if (
            $('ol[class!=references]', this).html() ||
            $(this)[0].name == 'ol'
          ) {
            // get children <li> elements that are not empty
            $listOfDefinitions = $(this).children(':not(:empty)').clone();
            $listOfDefinitions.find('ul').remove();

            // console.log(definition[currentEtymoIndex][currentEtymo]);
            // console.log(currentPartOfSpeechIndex);

            $listOfDefinitions.each(function () {
              let subDefinitions = [];
              console.log(currentPartOfSpeech);
              let $primaryDefinition = $(this);
              $primaryDefinition.children().each(function () {
                if ($(this)[0].name == 'ol') {
                  let $subDefinitionListParent = $(this);
                  $subDefinitionListParent.children().each(function () {
                    if ($(this)[0].name == 'li' && $(this).text().trim()) {
                      let $subDefinitionLi = $(this);
                      // get the text from those children
                      // put that text into a seperate array
                      // and then remove those children
                      subDefinitions.push($subDefinitionLi.text().trim());
                      // need to remove the children from subDefinitions. but not for the whole thing.
                      $(this).remove();
                    }
                  });
                }
              });

              definition[currentEtymoIndex][currentEtymo][
                currentPartOfSpeechIndex
              ][currentPartOfSpeech].push($(this).text().trim());
              if (subDefinitions.length > 0) {
                definition[currentEtymoIndex][currentEtymo][
                  currentPartOfSpeechIndex
                ][currentPartOfSpeech].push(subDefinitions);
              }
            });
          } else {
            return res.json(defaultResponse);
          }
        });

        return { license: legalStuff, definition: definition };
      })
      .catch((err) => {
        return `${word} does not appear to be a word that is documented in Wiktionary. Check your spelling. If the word exists in wiktionary at ${url}, then submit an issue on github (https://github.com/alexwert10/splashcardsDictionaryAPI/issues) or contact us (splashcards.com). If the word doesn't exist in wiktionary, but it should, then maybe you should add it :).`;
      });
    res.json(result);
  } else {
    res.json(defaultResponse);
  }
});

app.listen(PORT, console.log('server running on port: ', PORT));
