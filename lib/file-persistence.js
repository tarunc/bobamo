var fs = require('fs'), path = require('path'), crypto = require('crypto'), nop = function () {};


var FilePersistence = function (file) {

    this.filename = file || path.join(process.cwd, 'conf', 'bobamo.json');
    this.cache = {};

}
module.exports = FilePersistence;

FilePersistence.prototype.save = function (key, data, callback) {
    var conf = this.read(this.filename);
    var now = Date.now();
    if (conf) {
        fs.renameSync(this.filename, this.filename + '.' + now);
    } else {
        conf = {};
        var dir = path.dirname(this.filename);
        if (!path.existsSync(dir)) {
            fs.mkdirSync(dir);
        }
    }
    (conf.plugins || (conf.plugins = {}))[key] = data;
    var conf_str = JSON.stringify(conf);
    var sha = crypto.createHash('sha1').update(conf_str).digest('base64');

    fs.writeFile(this.filename, conf_str, 'utf-8', function(err, stuff){
        if (err){
            fs.renameSync(this.filename+'.'+now, this.filename);
        }
        callback(err, {_id:sha, timestamp:now});
    }.bind(this));
}
FilePersistence.prototype.list = function(callback){
    fs.readdir(path.dirname(this.filename), callback);
}

FilePersistence.prototype.read = function (filename, req, callback) {
    filename = filename + '';
    
    if (fs.existsSync(filename)) {
        var content = fs.readFileSync(filename);
        return JSON.parse(content);
    }
    
    // if (this.cache[filename]) {
    //   return this.cache[filename];
    // }
    // 
    // var self = this;
    // callback = callback || nop;
    // 
    // return fs.exists(filename, function (exists) {
    //   if (!exists) {
    //     return;
    //   }
    //   
    //   return fs.readFile(filename, function (err, content) {
    //     self.cache[filename] = content && JSON.parse(content);
    //     
    //     return callback(err, (self.cache[filename] || {}));
    //   });
    // });
}
