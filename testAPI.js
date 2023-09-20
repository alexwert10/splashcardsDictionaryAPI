const vocabWords = require('./vocabWords');
const axios = require('axios');

const getDefinition = (word) => {
  return new Promise((resolve, reject) => {
    axios
      .get(
        `https://splashcards-dictionary-api-8297a470c215.herokuapp.com/version1?word=${word
          .toLowerCase()
          .replace(' ', '_')}`,
        {
          method: 'GET',
        }
      )
      .then((response) => {
        if (!!response.data.definitionAsString == false) {
          console.log(response.data);
        }
        resolve(!!response.data.definitionAsString);
      })

      .catch((err) => {
        reject(err);
      });
  });
};

let allPromises = [];
for (word of vocabWords.words) {
  allPromises.push(getDefinition(word));
}

Promise.all(allPromises).then((res) => {
  let overallResult = 'ALL GOOD!';
  for (individualRes of res) {
    if (individualRes != true) {
      console.log(individualRes);
      overallResult = 'NOT GOOD';
    }
  }
  console.log(overallResult);
});
