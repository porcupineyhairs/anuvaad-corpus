// Load required packages
var express = require('express');
var helmet = require('helmet')
var bodyParser = require('body-parser');
var methodOverride = require('method-override');

var LOG = require('./logger/logger').logger
var APP_CONFIG = require('./config/config').config
var APIStatus = require('./errors/apistatus')
var Response = require('./models/response')
var daemon = require('./controllers/daemon/daemon');
var KafkaProducer = require('./kafka/producer');
var KafkaConsumer = require('./kafka/consumer');
var mongo = require('./db/mongoose')
var elastic = require('./db/elastic')
var StatusCode = require('./errors/statuscodes').StatusCode
var multer = require('multer');
var upload = multer({ dest: 'upload/' });
var async = require('async')
var _ = require('lodash');
var fs = require("fs");
// Imports the Google Cloud client library
const { Storage } = require('@google-cloud/storage');

// Creates a client
const storage = new Storage();

// Imports the Google Cloud client libraries
const vision = require('@google-cloud/vision').v1;

const automl = require(`@google-cloud/automl`).v1beta1;
const { Translate } = require('@google-cloud/translate');

// Create client for prediction service.
const clientPred = new automl.PredictionServiceClient();

/**
 * TODO(developer): Uncomment the following line before running the sample.
 */
const projectId = "anuvaad";
const computeRegion = "us-central1";
const modelId = "TRL3776294168538164590";
const translationAllowFallback = "False";

const GOOGLE_BUCKET_NAME = 'nlp-nmt'

const LANG_CODES = {
  'Hindi': 'hin',
  'Tamil': 'ta',
  'English': 'eng',
  'Gujarati': 'gu',
}

// Creates a client
const client = new vision.ImageAnnotatorClient();

process.on('SIGINT', function () {
  LOG.info("stopping the application")
  process.exit(0);
});

KafkaConsumer.getInstance().getConsumer((err, consumer) => {
  if (err) {
    LOG.error("Unable to connect to KafkaConsumer");
  } else {
    LOG.info("KafkaConsumer connected")
    consumer.on('message', function (message) {
      LOG.info('Received')
      LOG.info(message.value);
    });
    consumer.on('offsetOutOfRange', function (err) {
      LOG.error(err)
    })
    consumer.on('error', function (err) {
      LOG.error(err)
    })
  }
})

startApp()

daemon.start();
function startApp() {
  var app = express();
  app.set('trust proxy', 1);

  app.use(helmet())
  app.use(bodyParser.json());
  app.use(bodyParser.urlencoded({
    extended: false
  }));
  app.use(methodOverride());
  app.use(upload.any());
  app.use(function (req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    // req.pipe(req.busboy);
    if ('OPTIONS' === req.method) {
      res.sendStatus(200);
    }
    else {
      next();
    };
  });


  var router = express.Router();
  require('./routes/user/user.route')(router);
  require('./routes/corpus/corpus.route')(router);
  require('./routes/benchmark/benchmark.route')(router);
  require('./routes/reports/report.route')(router);
  require('./routes/language/language.route')(router);
  require('./routes/nmt/nmt.route')(router);
  require('./routes/workspace/workspace.route')(router);

  app.get('/test', function (req, res) {
    res.send("Hello world!");
  });

  app.post('/uploadfile', function (req, res) {
    let response = new Response(StatusCode.SUCCESS, { filepath: req.headers['x-file'].split('/')[req.headers['x-file'].split('/').length - 1] }).getRsp()
    return res.status(response.http.status).json(response);
  });

  app.post('/translate', async (req, res) => {
    let text = req.body.text;
    let target_lang = req.body.target_lang;

    let target = 'eng';
    if (LANG_CODES[target_lang]) {
      target = LANG_CODES[target_lang]
    }
    if (target_lang && target_lang.length <= 3) {
      target = target_lang
    }

    try {
      // Instantiates a client
      const translate = new Translate({
        projectId: projectId,
      });

      // The text to translate
      // The target language


      // Translates some text into English
      translate
        .translate(text, target)
        .then(results => {
          const translation = results[0];

          console.log(`Text: ${text}`);
          console.log(`Translation: ${translation}`);
          return res.status(200).json(translation);
        })
        .catch(err => {
          return res.status(200).json(err);
        });
    }
    catch (e) {
      console.log(e)
      return res.status(200).json(e);
    }
  })

  app.post('/hin', async (req, res) => {
    let text = req.body.text;

    try {
      // Instantiates a client
      const translate = new Translate({
        projectId: projectId,
      });

      // The text to translate
      // The target language
      const target = 'eng';

      // Translates some text into English
      translate
        .translate(text, target)
        .then(results => {
          const translation = results[0];

          console.log(`Text: ${text}`);
          console.log(`Translation: ${translation}`);
          return res.status(200).json(translation);
        })
        .catch(err => {
          return res.status(200).json(err);
        });
    }
    catch (e) {
      console.log(e)
      return res.status(200).json(e);
    }
  })

  app.post('/eng', (req, res) => {
    let text = req.body.text;

    try {
      // Instantiates a client
      const translate = new Translate({
        projectId: projectId,
      });

      // The text to translate
      // The target language
      const target = 'hin';

      // Translates some text into English
      translate
        .translate(text, target)
        .then(results => {
          const translation = results[0];

          console.log(`Text: ${text}`);
          console.log(`Translation: ${translation}`);
          return res.status(200).json(translation);
        })
        .catch(err => {
          return res.status(200).json(err);
        });
    }
    catch (e) {
      console.log(e)
      return res.status(200).json(e);
    }
  })

  app.post('/tamil', (req, res) => {
    let text = req.body.text;

    try {
      // Instantiates a client
      const translate = new Translate({
        projectId: projectId,
      });

      // The text to translate
      // The target language
      const target = 'ta';

      // Translates some text into English
      translate
        .translate(text, target)
        .then(results => {
          const translation = results[0];

          console.log(`Text: ${text}`);
          console.log(`Translation: ${translation}`);
          return res.status(200).json(translation);
        })
        .catch(err => {
          return res.status(200).json(err);
        });
    }
    catch (e) {
      console.log(e)
      return res.status(200).json(e);
    }
  })

  // router.route('/')
  //   .get((req, res) => {
  //     let apistatus = new APIStatus(StatusCode.SUCCESS, "app").getRspStatus()
  //     apistatus.message = "Welcome to AI Demo V1.0.0 API"
  //     return res.status(apistatus.http.status).json(apistatus);
  //   })


  app.use('/anuvaad/v1', router);


  app.use(function (err, req, res, next) {
    if (err && !err.ok) {
      console.log(err)
      return res.status(err.http.status).json(err);
    } else {
      let apistatus = new APIStatus(StatusCode.ERR_GLOBAL_SYSTEM, "app").getRspStatus()
      apistatus.message = "We are expriencing issues at our end, kindly try again in sometimes."
      return res.status(apistatus.http.status).json(apistatus);
    }
  });

  var server = app.listen(APP_CONFIG.PORT, function () {
    LOG.info('Listening on port %d', server.address().port);
  });
  server.timeout = 10000000;
}
