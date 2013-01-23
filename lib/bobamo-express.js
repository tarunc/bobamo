var _u = require('underscore'),
    PluginManager = require('./plugin-manager'), path = require('path'),
    cons = require('consolidate');

function bobamo(options) {
    var options = _u.extend(this, options);
    if (options.uri) {
        if (!options.mongoose) {
            options.mongoose = require('mongoose');
            console.warn('using bobamo mongoose, you are better off supplying your own');
        }
        options.mongoose.connect(options.uri);
    }

    if (!options.mongoose)
        throw new Error("no mongoose or mongoose uri defined");

    var pdir = path.join(path.resolve(), 'plugins');
    // console.log('bobamo plugins', pdir)
    return {
        __mounted:function (app) {
            var base = options.basepath || (options.basepath = '');
            
            require('jqtpl').tag.json = {  open:'if($notnull1){__+=JSON.stringify($1)}' }
            // var xpr = require('jqtpl/lib/express');

            app.engine('html', require('jqtpl').__express);
            app.engine('js', require('jqtpl').__express);

            if (!options.baseUrl)
            options.baseUrl = '/';
            if (!options.pluginDir)
                options.pluginDir = pdir;
            this.pluginManager = new PluginManager(options, app)
            // console.log('mounted bobamo on ', base);
        },
        handle:function (req, res, next) {
            next();
        },
        set:function (base, path) {
            options[base] = path;
        },
        emit:function (event, app) {
            if (event == 'mount') {
                this.__mounted(app);
            }
        }
    }
}
;
module.exports = bobamo;
