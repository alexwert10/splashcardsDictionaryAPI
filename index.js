const PORT = process.env.port || 8000;

const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');

const app = express();

app.get('/', async (req, res) => {
  console.log(req.query.word);
  const url = `https://en.wiktionary.org/wiki/${req.query.word}`;
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
        }
      });

      return definition;
    })
    .catch((err) => {
      return err;
    });
  res.json(result);
});

app.listen(PORT, console.log('server running on port: ', PORT));
