var LOG = require('../logger/logger').logger
var mongoose = require("../db/mongoose");

var Basemodel = {}

Basemodel.saveData = function (schema, data, cb) {
    schema.collection.insertMany(data, function (err, docs) {
        if (err) {
            return cb(err, null);
        } else {
            LOG.debug('%s data was successfully stored.', JSON.stringify(docs));
            return cb(null, docs);
        }
    })
}

Basemodel.updateData = function (schema, data, id, cb) {
    schema.collection.findOneAndUpdate({ _id: mongoose.Types.ObjectId(id) }, { $set: data }, { upsert: false }, function (err, doc) {
        if (err) {
            LOG.error(err)
            cb(err, null)
        }
        LOG.debug(doc)
        cb(null, doc)
    });
}

Basemodel.findByCondition = function (schema, condition, pagesize, pageno, cb) {
    schema.find(condition, {}, (pagesize && pageno ? { skip: (pageno - 1) * pagesize, limit: parseInt(pagesize), sort: { '_id': -1 } } : { sort: { '_id': -1 } }), function (err, data) {
        if (err) {
            LOG.error("Unable to find data due to [%s]", JSON.stringify(err));
            return cb(err, null);
        }
        return cb(null, data);
    })
}


module.exports = Basemodel;