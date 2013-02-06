var bobamo = require('../../index'), PluginApi = bobamo.PluginApi, u = require('util');

var Markdown = function(){
    PluginApi.apply(this, arguments);
}
u.inherits(Markdown, PluginApi);

Markdown.prototype.routes = function(){
    PluginApi.prototype.routes.apply(this, arguments);
}

Markdown.prototype.editors = function () {
    return [
        {
            types:['String'],
            name:'Markdown',
            schema:{
                variables:{
                    type:'List',
                    subSchema:{
                        name:'Text',
                        value:{
                            type:'Text',
                            help:'value to use as variable context is obj ${...}'
                        }
                    }
                }
            }
        }
    ]
}

Markdown.prototype.admin = function(){
    return new Model('markdown', [
        {
            schema:{
               conversion:{
                   type:'List',
                   subSchema:{
                       template:{
                            type:'File',
                            help:'Optional file for templating'
                       },
                       variables:{
                           type:'List',
                           subSchema:{
                                name:{type:'Text'},
                                value:{
                                   type:'Text',
                                   help:'Variable to subsitute, supports ${} notation with scope of the current object'
                               }
                           }
                       },
                       output:{
                           type:'Select',
                           options:['html','native',
                               'json',
                               'html5',
                               'html+lhs',
                               'html5+lhs',
                               's5',
                               'slidy',
                               'slideous',
                               'dzslides',
                               'docbook',
                               'opendocument',
                               'latex',
                               'latex+lhs',
                               'beamer',
                               'beamer+lhs',
                               'context',
                               'texinfo',
                               'man',
                               'markdown',
                               'markdown+lhs',
                               'plain',
                               'rst',
                               'rst+lhs',
                               'mediawiki',
                               'textile',
                               'rtf',
                               'org',
                               'asciidoc',
                               'odt',
                               'docx']
                       }
                   }
               }
            },
            url:this.pluginUrl + '/admin/configure',
            plural:'Markdown',
            title:'Markdown Plugin',
            modelName:'markdown'
        }
    ]);
}
module.exports = Markdown;
