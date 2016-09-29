const express = require('express');
const router = express.Router();
const indexController = require('../controllers/index');
const playerController = require('../controllers/player');
const isLoggedIn = require('../auth/init').isLoggedIn;
const beatDetector = require('../controllers/bpm-detector');
const bcrypt = require('bcryptjs');
const googleSpeech = require('../controllers/recognize');
const path = require('path');
const knex = require('../db/knex');
const sentiment = require('sentiment');


router.get('/', function (req, res, next) {
  const searchYoutube = playerController.searchYoutube;
  const renderObject = {};
  if (req.session.user) {
    renderObject.message = 'Welcome to Moody, ' + req.session.user.first_name;
    renderObject.loggedIn = true;
  } else {
    renderObject.message = 'Welcome to Moody, Stranger';
    renderObject.loggedIn = false;
  }
  // renderObject.user = req.session.user.username
  searchYoutube('hello vevo')
  .then(function(id) {
    renderObject.youtube_id = id;
    // renderObject.song_id = change this;
    console.log(renderObject.youtube_id);
    res.render('index', renderObject);
  })
  .catch(function(err) {
    res.send(err);
  });
});

//route will return one song within 1 from the string of the analysis text
router.get('/string/:string', (req, res, next) => {
  const string = req.params.string;
  const renderObject = {};
  renderObject.score = returnSentimentAverage(string);

  console.log(renderObject.score);

  //the greater than sign needs to be changed to a less than before we go live
  renderObject.data = knex.raw(`select * from songs where abs(songs.sentiment_rating - ${renderObject.score}) < 1 limit 1`)
  .then((results) => {
    console.log(results.rows);
    res.send(results.rows);
  })
  .catch((err) => {
    res.send (err);
  });
});

router.post('/getText', function (req, res, next) {
  const googleAudioToText = googleSpeech.main;

  const filePath = req.body.recordingAddress

  // const filePath = path.join(__dirname,"..", "test_audio", "audio.flac");
  googleAudioToText(filePath, function(err, result) {
    if (err) {
      throw err;
    }
    var textJSONResponse = result["results"][0]["alternatives"][0]["transcript"];
    // use textJSONResponse for sentiment analysis below
    res.json(textJSONResponse);
  });
});

function returnSentimentAverage(string) {
  let sentInput = sentiment(string);
  let len = string.split(" ");
  let numOfWords = len.length;
  const adjScore = sentInput.score/numOfWords + 5;
  return adjScore;
};

module.exports = router;
