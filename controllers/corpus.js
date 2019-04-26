var Response = require('../models/response')
var APIStatus = require('../errors/apistatus')
var StatusCode = require('../errors/statuscodes').StatusCode
var fs = require("fs");
var glob = require("glob")
const { exec } = require('child_process');

const python_version = 'python'

const { Translate } = require('@google-cloud/translate');
const projectId = "translate-1552888031121";
const translate = new Translate({
    projectId: projectId,
});
const target = 'eng';

exports.processImage = function (req, res) {
    let imagePath = req.imagePath
    let file_base_name = imagePath.replace('.png', '')
    exec('tesseract ' + imagePath + ' ' + file_base_name + ' -l hin+eng', (err, stdout, stderr) => {
        if (err) {
            let apistatus = new APIStatus(StatusCode.ERR_GLOBAL_SYSTEM, 'app').getRspStatus()
            return res.status(apistatus.http.status).json(apistatus);
        }
        var exec_cmd = python_version + ' separate.py ' + file_base_name + '.txt ' + file_base_name
        exec(exec_cmd, (err, stdout, stderr) => {
            if (err) {
                let apistatus = new APIStatus(StatusCode.ERR_GLOBAL_SYSTEM, 'app').getRspStatus()
                return res.status(apistatus.http.status).json(apistatus);
            }
            fs.readFile(file_base_name + '_hin' + '.txt', 'utf8', function (err, data) {
                if (err) {
                    let apistatus = new APIStatus(StatusCode.ERR_GLOBAL_SYSTEM, 'app').getRspStatus()
                    return res.status(apistatus.http.status).json(apistatus);
                }
                translate
                    .translate(data, target)
                    .then(results => {
                        const translation = results[0];
                        fs.writeFile(file_base_name + '_eng_tran' + '.txt', translation, function (err) {
                            if (err) {
                                let apistatus = new APIStatus(StatusCode.ERR_GLOBAL_SYSTEM, 'app').getRspStatus()
                                return res.status(apistatus.http.status).json(apistatus);
                            }
                            let corpus_cmd = './helpers/bleualign.py -s ' + __dirname + '/../' + file_base_name + '_hin' + '.txt' + ' -t ' + __dirname + '/../' + file_base_name + '_eng' + '.txt' + ' --srctotarget ' + __dirname + '/../' + file_base_name + '_eng_tran' + '.txt' + ' -o ' + __dirname + '/../' + file_base_name + '_output'
                            exec(corpus_cmd, (err, stdout, stderr) => {
                                if (err) {
                                    let apistatus = new APIStatus(StatusCode.ERR_GLOBAL_SYSTEM, 'app').getRspStatus()
                                    return res.status(apistatus.http.status).json(apistatus);
                                }
                                let output_data = {}
                                fs.readFile(file_base_name + '_output-s', 'utf8', function (err, data) {
                                    output_data.hindi = data.split('\n')
                                    fs.readFile(file_base_name + '_output-t', 'utf8', function (err, data) {
                                        output_data.english = data.split('\n')
                                        glob(file_base_name + "*", function (er, files) {
                                            if (files && files.length > 0) {
                                                files.map((fileName) => {
                                                    fs.unlink(fileName, function () { })
                                                })
                                            }
                                        })
                                        let apistatus = new Response(StatusCode.SUCCESS, output_data).getRsp()
                                        return res.status(apistatus.http.status).json(apistatus);
                                    })
                                });
                            })
                        });
                    })
            });
        });
    });

}


exports.converAndCreateCorpus = function (req, res) {
    let file_base_name = req.file_base_name
    const { Translate } = require('@google-cloud/translate');
    const projectId = "translate-1552888031121";
    const translate = new Translate({
        projectId: projectId,
    });
    const target = 'eng';
    fs.readFile(file_base_name + '_hin' + '.txt', 'utf8', function (err, data) {
        let data_arr = data.split('\n')
        if (err) {
            let apistatus = new APIStatus(StatusCode.ERR_GLOBAL_SYSTEM, 'app').getRspStatus()
            return res.status(apistatus.http.status).json(apistatus);
        }
        if (data_arr.length > 100) {
            let loops = Math.ceil(data_arr.length / 100)
            let translated_text = ''
            transalteBigText(0, loops, data_arr, res, translated_text, file_base_name)
        }
        else {
            translate
                .translate(data.split('\n'), target)
                .then(results => {
                    let translated_text = ''
                    let translations = Array.isArray(results) ? results : [results];
                    translations.forEach((translation, i) => {
                        translated_text += translation + '\n';
                    });
                    fs.writeFile(file_base_name + '_eng_tran' + '.txt', translated_text, function (err) {
                        if (err) {
                            let apistatus = new APIStatus(StatusCode.ERR_GLOBAL_SYSTEM, 'app').getRspStatus()
                            return res.status(apistatus.http.status).json(apistatus);
                        }
                        let corpus_cmd = './helpers/bleualign.py -s ' + __dirname + '/../' + file_base_name + '_hin' + '.txt' + ' -t ' + __dirname + '/../' + file_base_name + '_eng' + '.txt' + ' --srctotarget ' + __dirname + '/../' + file_base_name + '_eng_tran' + '.txt' + ' -o ' + __dirname + '/../' + file_base_name + '_output'
                        exec(corpus_cmd, (err, stdout, stderr) => {
                            if (err) {
                                let apistatus = new APIStatus(StatusCode.ERR_GLOBAL_SYSTEM, 'app').getRspStatus()
                                return res.status(apistatus.http.status).json(apistatus);
                            }
                            let output_data = {}
                            fs.readFile(file_base_name + '_output-s', 'utf8', function (err, data) {
                                output_data.hindi = data.split('\n')
                                fs.readFile(file_base_name + '_output-t', 'utf8', function (err, data) {
                                    output_data.english = data.split('\n')
                                    glob(file_base_name + "*", function (er, files) {
                                        if (files && files.length > 0) {
                                            files.map((fileName) => {
                                                fs.unlink(fileName, function () { })
                                            })
                                        }
                                    })
                                    let apistatus = new Response(StatusCode.SUCCESS, output_data).getRsp()
                                    return res.status(apistatus.http.status).json(apistatus);
                                })
                            });
                        })
                    });
                }).catch((e) => {
                    console.log(e)
                })
        }
    });
}


function transalteBigText(i, loops, data_arr, res, translated_text, file_base_name) {
    let endCount = 100  > data_arr.length ? data_arr.length % 100 : 100
    translate
        .translate(data_arr.splice(0, endCount), target)
        .then(results => {
            let translations = Array.isArray(results[0]) ? results[0] : [results[0]];
            translations.forEach((translation, i) => {
                translated_text += translation + '\n';
            });
            if (i + 1 == loops) {
                fs.writeFile(file_base_name + '_eng_tran' + '.txt', translated_text, function (err) {
                    if (err) {
                        let apistatus = new APIStatus(StatusCode.ERR_GLOBAL_SYSTEM, 'app').getRspStatus()
                        return res.status(apistatus.http.status).json(apistatus);
                    }
                    let corpus_cmd = './helpers/bleualign.py -s ' + __dirname + '/../' + file_base_name + '_hin' + '.txt' + ' -t ' + __dirname + '/../' + file_base_name + '_eng' + '.txt' + ' --srctotarget ' + __dirname + '/../' + file_base_name + '_eng_tran' + '.txt' + ' -o ' + __dirname + '/../' + file_base_name + '_output'
                    exec(corpus_cmd, (err, stdout, stderr) => {
                        if (err) {
                            let apistatus = new APIStatus(StatusCode.ERR_GLOBAL_SYSTEM, 'app').getRspStatus()
                            return res.status(apistatus.http.status).json(apistatus);
                        }
                        let output_data = {}
                        fs.readFile(file_base_name + '_output-s', 'utf8', function (err, data) {
                            output_data.hindi = data.split('\n')
                            fs.readFile(file_base_name + '_output-t', 'utf8', function (err, data) {
                                output_data.english = data.split('\n')
                                glob(file_base_name + "*", function (er, files) {
                                    if (files && files.length > 0) {
                                        files.map((fileName) => {
                                            fs.unlink(fileName, function () { })
                                        })
                                    }
                                })
                                let apistatus = new Response(StatusCode.SUCCESS, output_data).getRsp()
                                return res.status(apistatus.http.status).json(apistatus);
                            })
                        });
                    })
                });
            }
            else {
                i = i + 1;
                transalteBigText(i, loops, data_arr, res, translated_text, file_base_name)
            }
        }).catch((e) => {
            console.log(e)
        })
}



exports.processMultipleImage = function (req, res, output_base_name, cb) {
    let imagePaths = req.imagePaths
    let tesseract_run = 0;
    imagePaths.map((imagePath, index) => {
        let file_base_name = imagePath.replace('.png', '').split('-')[0]
        exec('tesseract ' + imagePath + ' - >> ' + file_base_name + '.txt' + ' -l hin+eng', (err, stdout, stderr) => {
            tesseract_run++;
            if (err) {
                cb(err, null)
            }
            if (tesseract_run == imagePaths.length) {
                var exec_cmd = python_version + ' ' + (req.type === 'hin' ? 'process_paragraph.py' : 'process_paragraph_eng.py') + ' ' + file_base_name + '.txt ' + output_base_name
                exec(exec_cmd, (err, stdout, stderr) => {
                    if (err) {
                        cb(err, null)
                    }
                    cb(null, file_base_name + '.txt')
                })
            }
        });
    })

}