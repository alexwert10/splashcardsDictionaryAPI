const PORT = process.env.PORT || 8000;

const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');

const app = express();

const getDefinitionAsString = (definition) => {
  let definitionAsString = '';
  let entIndex = 0;
  for (entymology of definition) {
    // if (entIndex != 0) {
    //   definitionAsString += '\n';
    // }
    entIndex++;
    partOfSpeechIndex = 0;
    for (partOfSpeech of Object.values(entymology)[0]) {
      partOfSpeechIndex++;
      // if (partOfSpeechIndex != 0) {
      //   definitionAsString += '\n';
      // }
      definitionAsString += Object.keys(partOfSpeech)[0];
      definitionAsString += '\\n';

      let index = 1;
      for (meaning of Object.values(partOfSpeech)[0]) {
        if (typeof meaning == 'object') {
          for (subDefinition of meaning) {
            definitionAsString += '\\t\\t--';
            definitionAsString += subDefinition;
            definitionAsString += '\\n';
          }
        } else {
          definitionAsString += '\\t';
          definitionAsString += `${index}. ${meaning}\\n`;
          index++;
        }
      }
    }
  }
  return definitionAsString;
};

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
    definitionAsString: 'Etymology 1\\nNoun\\n etc.',
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
            currentEtymo = $('span[id^=Etymology]', this).text().trim();
            currentEtymoIndex++;
            let currentEtymoObj = {};
            currentEtymoObj[currentEtymo] = [];
            definition.push(currentEtymoObj);
            currentPartOfSpeechIndex = -1;
          } else if (
            //noun, pronoun, verb, adjective, adverb, preposition, conjunction, and interjection.

            $(
              'span[id^=Noun], span[id^=Verb], span[id^=Adjective], span[id^=Pronoun], span[id^=Adverb], span[id^=Preposition], span[id^=Conjunction], span[id^=Interjection], span[id^=Proverb], span[id^=Phrase]',
              this
            ).html()
          ) {
            currentPartOfSpeech = $(
              'span[id^=Noun], span[id^=Verb], span[id^=Adjective], span[id^=Pronoun], span[id^=Adverb], span[id^=Preposition], span[id^=Conjunction], span[id^=Interjection], span[id^=Proverb], span[id^=Phrase]',
              this
            )
              .text()
              .trim();
            currentPartOfSpeechIndex++;
            let currentPartOfSpeechObj = {};
            currentPartOfSpeechObj[currentPartOfSpeech] = [];
            // This if statement covers the case where there is an undefined etymology. See the Wiktionary entry of "run up" as an example
            if (!!definition[currentEtymoIndex] == false) {
              currentEtymo = 'undefined etymology';
              currentEtymoIndex++;
              let currentEtymoObj = {};
              currentEtymoObj[currentEtymo] = [];
              definition.push(currentEtymoObj);
            }

            definition[currentEtymoIndex][currentEtymo].push(
              currentPartOfSpeechObj
            );

            // obj[currentEtymo][currentPartOfSpeech] = ;
          } else if (
            $('ol[class!=references]', this).html() ||
            $(this)[0].name == 'ol'
          ) {
            // get children <li> elements that are not empty
            $listOfDefinitions = $(this).children(':not(:empty)').clone();
            $listOfDefinitions.find('ul').remove();

            $listOfDefinitions.each(function () {
              let subDefinitions = [];
              let $primaryDefinition = $(this);
              // get any examples under the main definition and add a tab and the text Example:
              $('<p>\\tExample: </p>').prependTo(
                $primaryDefinition.find('div[class^=h-usage-example]')
              );

              // remove the text of any reference. Those look like this: [1]
              $primaryDefinition.find('sup[class^=reference]').remove();
              $primaryDefinition.find('span[class^=maintenance-line]').remove();

              $primaryDefinition.children().each(function () {
                if ($(this)[0].name == 'ol') {
                  let $subDefinitionListParent = $(this);
                  $subDefinitionListParent.children().each(function () {
                    if ($(this)[0].name == 'li' && $(this).text().trim()) {
                      let $subDefinitionLi = $(this);

                      // get the text from those children
                      // put that text into a seperate array
                      // and then remove those children

                      // if ($subDefinitionLi.text().trim().includes('\n')) {
                      // }
                      subDefinitions.push(
                        $subDefinitionLi.text().trim()
                        // .replaceAll('\n', '\n\t\tExample: ')
                      );

                      // need to remove the children from subDefinitions. but not for the whole thing.
                      $(this).remove();
                    }
                  });
                }
              });
              // This if statement handles cases where there is no part of speech. See "apt" for an exmaple where in etymology 2 it references the use of "apt" as an abreviation for apartment
              if (currentPartOfSpeechIndex == -1) {
                currentPartOfSpeech = 'Other';
                currentPartOfSpeechIndex++;
                let currentPartOfSpeechObj = {};
                currentPartOfSpeechObj[currentPartOfSpeech] = [];

                definition[currentEtymoIndex][currentEtymo].push(
                  currentPartOfSpeechObj
                );
              }

              definition[currentEtymoIndex][currentEtymo][
                currentPartOfSpeechIndex
              ][currentPartOfSpeech].push($(this).text().trim());
              if (subDefinitions.length > 0) {
                definition[currentEtymoIndex][currentEtymo][
                  currentPartOfSpeechIndex
                ][currentPartOfSpeech].push(subDefinitions);
              }
            });
          }
        });

        return {
          license: legalStuff,
          definition: definition,
          definitionAsString: getDefinitionAsString(definition),
        };
      })
      .catch((err) => {
        console.log(err);
        return `${word} does not appear to be a word that is documented in Wiktionary. Check your spelling. If the word exists in wiktionary at ${url}, then submit an issue on github (https://github.com/alexwert10/splashcardsDictionaryAPI/issues) or contact us (splashcards.com). If the word doesn't exist in wiktionary, but it should, then maybe you should add it :)`;
      });
    res.json(result);
  } else {
    res.json(defaultResponse);
  }
});

app.listen(PORT, console.log('server running on port: ', PORT));
