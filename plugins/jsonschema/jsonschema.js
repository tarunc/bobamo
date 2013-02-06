var bobamo = require('../../index'),
    swagger = require('./genschema'),

    express = bobamo.expressApi,
    Model = bobamo.DisplayModel,
    path = require('path'),
    fs = require('fs'),
    SwaggerToMarkdown = require('./genmarkdown'),
    generateClient = require('./generate-client'),
    u = require('../../lib/util'), _u = require('underscore'),
    Spec = require('./Spec'),
    Finder = bobamo.FinderModel,
    PluginApi = bobamo.PluginApi, util = require('util');

var JsonSchemaPlugin = function () {
    PluginApi.apply(this, arguments);
    this.conf = {
        url:'http://localhost:3001/',
        scala:process.env['SCALA_HOME'],
        java:process.env['JAVA_HOME'] || '/System/Library/Frameworks/JavaVM.framework/Versions/CurrentJDK/Home',
        java_opts:process.env['JAVA_OPTS'] || ' -XX:MaxPermSize=256M -Xmx1024M -DloggerPath=conf/log4j.properties',
        codegen:process.env['CODEGEN_HOME'],
        pandoc_template:null
    }
}
util.inherits(JsonSchemaPlugin, PluginApi);


JsonSchemaPlugin.prototype.modelToSchema = function (model, depends, models) {
    model = _u.isString(model) ? this.pluginManager.appModel.modelFor(model) : model;
    if (!model) {
        console.log('could not model ' + model);
        return {};
    }
    var modelPaths = this.pluginManager.appModel.modelPaths;
    var ret = swagger.modelToSchema(model, depends, this.pluginManager, models || {}, function (m) {
        return modelPaths && m && m.modelName && modelPaths[m.modelName]
    });

    if (depends) {
        //one day javascript will have add all until then.
        var keys = Object.keys(models);
        depends.splice.apply(depends, [depends.length, keys.length].concat(keys));
    }
    return ret;

}
JsonSchemaPlugin.prototype.appModel = function () {
    return {
        modelPaths:{},
        header:{
            'admin-menu':{
                'jsonschema':{
                    label:'Service API Documentation ',
                    href:'#jsonschema/view/doc'
                },
                'jsonschema-conf':{
                    label:'Service API Configuration ',
                    href:'#views/configure/jsonschema'
                }
            }
        }
    }
}
JsonSchemaPlugin.prototype.admin = function () {
    return new Model('jsonschema', [
        {
            schema:{
                url:{
                    type:'Text',
                    placeholder:this.conf.url,
                    title:'URL',
                    help:'The fully qualified url to this machine'
                },
                codegen:{
                    type:'Text',
                    placeholder:this.conf.codegen,
                    title:'swagger-codegen',
                    help:'The path to swagger codegen'
                },
                scala:{
                    type:'Text',
                    placeholder:this.conf.scala,
                    title:'Scala',
                    help:'Path to scala home scala executable should be in %scala%/bin/scala'
                },
                java:{
                    type:'Text',
                    placeholder:this.conf.java,
                    title:'JAVA_HOME',
                    help:'Path to java home'
                },
                java_opts:{
                    type:'Text',
                    placeholder:this.conf.java_opts,
                    title:'JAVA_OPTS',
                    help:'JAVA_OPTS env value'
                },
                pandoc_template:{
                    type:'Text',
                    title:'Template',
                    help:'Pandoc template directory',
                    placeholder:this.conf.pandoc_template
                }

            },
            url:this.pluginUrl + '/admin/configure',
            fieldsets:[
                {legend:"JsonSchema Plugin", fields:['url', 'pandoc_template', 'codegen', 'scala', 'java_opts', 'java']}
            ],
            plural:'JsonSchema',
            title:'JsonSchema Plugin',
            modelName:'jsonschema'
        }
    ]);
}

var docRe = /^document-(.*)/;
/*<option value='document-native'>native</option>
 <option value='document-json'>json</option>
 <option value='document-html'>html</option>
 <option value='document-html5'>html5</option>
 <option value='document-html+lhs'>html+lhs</option>
 <option value='document-html5+lhs'>html5+lhs</option>
 <option value='document-s5'>s5</option>
 <option value='document-slidy'>slidy</option>
 <option value='document-slideous'>slideous</option>
 <option value='document-dzslides'>dzslides</option>
 <option value='document-docbook'>docbook</option>
 <option value='document-opendocument'>opendocument</option>
 <option value='document-latex'>latex</option>
 <option value='document-latex+lhs'>latex+lhs</option>
 <option value='document-beamer'>beamer</option>
 <option value='document-beamer+lhs'>beamer+lhs</option>
 <option value='document-context'>context</option>
 <option value='document-texinfo'>texinfo</option>
 <option value='document-man'>man</option>
 <option value='document-markdown'>markdown</option>
 <option value='document-markdown+lhs'>markdown+lhs</option>
 <option value='document-plain'>plain</option>
 <option value='document-rst'>rst</option>
 <option value='document-rst+lhs'>rst+lhs</option>
 <option value='document-mediawiki'>mediawiki</option>
 <option value='document-textile'>textile</option>
 <option value='document-rtf'>rtf</option>
 <option value='document-org'>org</option>
 <option value='document-asciidoc'>asciidoc</option>
 <option value='document-odt'>odt</option>
 <option value='document-docx'>docx</option>*/
var extensionMap = JsonSchemaPlugin.prototype.extensionMap = {
    'html5':{
        ext:'html',
        contentType:'text/html'
    },
    'html+lhs':{
        ext:'html',
        contentType:'text/html'
    },
    'html5+lhs':{
        ext:'html',
        contentType:'text/html'
    },
    's5':{
        ext:'html',
        contentType:'text/html'
    },
    'slidy':{
        ext:'html',
        contentType:'text/html'
    },
    'dzslides':{
        ext:'html',
        contentType:'text/html'
    }
}
JsonSchemaPlugin.prototype.filters = function () {
    /**ugly hack to get the print screen to load **/
    this.app.get(this.pluginUrl + '/js/main.js*', function (req, res, next) {
        req.query.app = this.pluginUrl + '/js/print.js';
        req.url = this.baseUrl + 'js/main.js';
        next();
    }.bind(this));

    var exportTo = function (req, res, next) {
        var type = req.params.type || 'Java';
        var appModel = this.pluginManager.appModel;
        //make it safe since we use it to generate files and is potential a security hole.
        type.replace(/[^a-zA-Z0-9-_+]/g, '');
        if (docRe.test(type)) {
            var pdc = require('node-pandoc');
            var docType = type.replace(docRe, "$1");
            // console.log('markdown', md);
            var opts = []
            var conf = _u.extend({title:appModel.title}, this.conf, req.query, req.body);
            if (conf.pandoc_template)
                opts.push('--template=' + conf.pandoc_template);
            if (conf.title)
                opts.push('--variable=title:' + conf.title + '');
            if (conf.toc !== false)
                opts.push('--toc');
            var md = req.body && req.body && req.body.markdown || this.markdown();
            pdc(md, 'markdown', docType, opts, function (err, resp) {
                if (err) {
                    res.cookie('download', type)
                    return next(err);
                }
                var em = extensionMap[docType];
                var ext = docType;
                var fileName = bobamo.inflection.hyphenize((appModel.title + ' ' + appModel.version).replace(/\s*/, '')) + '.' + ext;
                if (em) {
                    ext = em.ext;
                    res.setHeader('Content-Type', em.contentType);
                } else {
                    res.setHeader("Content-Transfer-Encoding", "binary");
                    res.setHeader("Content-Disposition", 'attachment; filename="' + fileName + '"');//fileName);

                }
                res.setHeader("Content-Length", resp.length);

                res.send(resp);

            });
        }
        else {
            generateClient(this, type, function (err, filename) {
                if (err) {
                    console.log(err);
                    return next(err);
                }
                var base = path.basename(filename);
                var stat = fs.statSync(filename);

                res.setHeader('Content-Type', 'application/zip');
                res.setHeader("Content-Transfer-Encoding", "binary");
                res.setHeader("Content-Disposition", 'attachment; filename="' + base + '"');//fileName);
                res.setHeader("Content-Length", stat.size);
                res.cookie('download', type)
                require('util').pump(fs.createReadStream(filename), res);
                console.log('sent ' + base + ' ' + stat.size);
            }.bind(this))
        }
    }.bind(this)
    this.app.get(this.pluginUrl + "/export/:type", exportTo);
    this.app.post(this.pluginUrl + "/export/:type", exportTo);

    ;
// var docs_handler = express.static(__dirname + '/../../../swagger-ui/dist/');
    var re = new RegExp(this.pluginUrl + '/docs(\/.*)?$');

    this.app.get(re, function (req, res, next) {
        if (req.url === this.pluginUrl + '/docs') { // express static barfs on root url w/o trailing slash
            res.writeHead(302, { 'Location':req.url + '/' });
            res.end();
            return;
        }
        // take off leading /docs so that connect locates file correctly
        req.url = this.baseUrl + 'js/' + this.name + '/swagger-ui' + req.params;
        next(req, res, next);
    }.bind(this));

    this.app.get(this.baseUrl + 'images/throbber.gif', function (req, res, next) {
        req.url = this.pluginUrl + '/js/swagger-ui/images/throbber.gif'
        next();
    }.bind(this));
    PluginApi.prototype.filters.call(this);
}
JsonSchemaPlugin.prototype.swaggerUrl = function () {
    var url = this.conf.url.replace(/(\/)?$/, '');
    var swagUrl = url + (this.pluginUrl + '/api');
    return swagUrl;
}
JsonSchemaPlugin.prototype.configure = function (conf) {
    if (conf)
        _u.each(conf, function (v, k) {
            if (!v)
                delete conf[k]
        });
    _u.extend(this.conf, conf);
    this.swaggerUrl();
}
var typeRe =/List\[([^\]]*)\]/;
var builtin_types = 'byte boolean int long float double string Date void'.split(' ');

JsonSchemaPlugin.prototype.resourceMap = function(arr){
    var doc = {
        apiVersion:this.pluginManager.appModel.version,
        swaggerVersion:"1.1",
        basePath:swagUrl+"/api-docs/",
        apis:[]
    }
    doc.apis = _u.map(this.pluginManager.appModel.modelPaths, function (v, k) {
        return {
            path: k,
            description:v.description || v.help || ''
        }
    });
}
JsonSchemaPlugin.prototype.resource = function (modelName) {
    var swagUrl = this.swaggerUrl();
    var doc = {
        apiVersion:this.pluginManager.appModel.version,
        swaggerVersion:"1.1",
        basePath:swagUrl+"/api-docs/",
        apis:[]
    }
    if (!modelName) {
        doc.apis = _u.map(this.pluginManager.appModel.modelPaths, function (v, k) {
            return {
                path:"/"+ k,
                description:v.description || v.help || ''
            }
        });
    } else {
        var model = this.pluginManager.appModel.modelPaths[modelName];
        if (!model) {
            console.log('modelPaths', this.pluginManager.appModel.modelPaths)
            return res.send({status:1, message:'Could not locate model ' + modelName})

        }
        var self = this;
        var ops = {};
        doc.models = {};
        _u.each(_u.flatten([
            swagger.all(model, modelName),
            swagger.one(model, modelName),
            swagger.post(model, modelName),
            swagger.put(model, modelName),
            swagger.del(model, modelName),
            swagger.finders(model, modelName)

        ]), function forEachOperation(ret) {
            _u.extend({
                httpMethod:'GET'
            }, ret)
            var restPath = ['/', modelName, (ret.path ? '/' + ret.path : '')].join('');
            _u.each(ret.parameters, function (v) {
                if (v.paramType == 'path') {
                    restPath += '/{' + v.name + '}'
                }else if (v.paramType == 'body'){
                    var pType = v.dataType && v.dataType.replace(typeRe, "$1");
                    if (!~builtin_types.indexOf(pType) ){
                        if (!doc.models[pType]){
                            doc.models[pType] = self.modelToSchema(v.dataTypeModel, [], doc.models);
                            delete v.dataTypeModel;
                        }
                    }
                }
            });
            var rName = ret.responseClass.replace(typeRe, "$1");

            if (!~builtin_types.indexOf(rName)) {
                if (!doc.models[rName]) {
                    doc.models[rName] = self.modelToSchema(ret.responseModel || rName, [], doc.models);
                    doc.models[rName].id = rName;
                }
            }
            function resolve(){
               Object.keys(doc.models).filter(function(v){ return !doc.models[v]}).forEach(function(k){
                    doc.models[k] = self.modelToSchema(k, [], doc.models);
                   doc.models[k].id = k;
                   resolve();
               });
            }
            resolve();

            (ops[restPath] || (ops[restPath] = [])).push(_u.omit(ret, 'responseModel'));

        });

        doc.apis = _u.map(ops, function (v, k) {
            return {
                path:k,
                operations:v,
                description:'Operations about ' + modelName
            };
        });

        doc.resourcePath = '/' + modelName;
    }
//        res.send(doc);
    return doc;
}
JsonSchemaPlugin.prototype.markdown = function () {
    return new SwaggerToMarkdown({
        apiname:this.pluginManager.appModel.title,
        basePath:this.swaggerUrl(),
        resourcefile:this.resource(),
        authors:this.pluginManager.appModel.authors,
        modified:this.pluginManager.appModel.modified? new Date(this.pluginManager.appModel.modified) : new Date(),
        specifications:Object.keys(this.pluginManager.appModel.modelPaths).map(this.resource, this)
    }).print();
}
JsonSchemaPlugin.prototype.routes = function () {


    var resource = function (req, res, next) {
        res.send(this.resource(req.params.type));
    }.bind(this);
    this.app.get(this.pluginUrl + '/markdown', function (req, res, next) {
        res.setHeader('Content-Type', 'application/markdown');
        res.send(this.markdown());
    }.bind(this));
    this.app.get(this.pluginUrl + '/api/resources.:format', resource);
    this.app.get(this.pluginUrl + '/api-docs.:format?/:type?', resource);
    this.app.get(this.pluginUrl + '/api/api-docs.:format?/:type?', resource);
    this.app.all(this.pluginUrl + '/api/*', function (req, res, next) {
        req.url = req.url.replace(this.pluginUrl + '/api', this.baseUrl + 'rest');
        console.log('rest', req.url);
        next();
    }.bind(this));
//    this.app.get(this.pluginUrl + '/doc/:type', function (req, res, next) {
//        var type = req.params.type;
//        var jsonSchema = this.modelToSchema(type);
//        this.generate(res, 'view/model.html', {jsonSchema:jsonSchema, model:this.pluginManager.modelPaths[type]});
//    }.bind(this));
    PluginApi.prototype.routes.apply(this, arguments);
}
;
Finder.prototype.__defineGetter__('spec', function () {
    return new Spec([this.display.spec], this)
});

module.exports = JsonSchemaPlugin;
