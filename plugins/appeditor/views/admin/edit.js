define([
    'underscore',
    'Backbone',
    'libs/bobamo/edit',
    'text!${pluginUrl}/templates/admin/edit.html',
    'libs/editors/multi-editor'
], function (_, Backbone, EditView, template) {
    "use strict";

    var schema = {
        title:{help:'Application Title'},
        version:{help:'Version of application'},
        description:{},
        models:{
            type:'MultiEditor',
            help:'Which Models to allow users to view',
            options:{{json Object.keys(appModel.modelPaths)}}
        },
        plugins:{
            type:'List',
            help:'The order in which to process plugins'
        }
    }
    var Model = Backbone.Model.extend({
        schema:schema,
        url:'${pluginUrl}/admin',
        parse:function (resp) {
            console.log('response', resp);
            return resp.payload;
        },
        idAttribute:'app',
        get:function (key) {
            if (key && key.indexOf('.') > -1) {
                var split = key.split('.');
                var val = this.attributes;
                while (split.length && val)
                    val = val[split.shift()];

                return val;
            }
            return Backbone.Model.prototype.get.call(this, key);
        }

    });
    return EditView.extend({
        fieldsets:[
            {legend:'Application', fields:['title', 'version', 'description']},
            {'legend':'Models', fields:['models']},
            {'legend': 'Plugins', fields:['plugins']}
        ],
        template:_.template(template),
        model:Model,
        isWizard:true,
        config:{
            title:'App',
            plural:'App',
            modelName:'app'
        },
        createModel:function () {
            return new Model({
                title:'${appModel.title}',
                description:'${appModel.description}',
                version:'${appModel.version}',
<<<<<<< HEAD
                models:{{html JSON.stringify(Object.keys(appModel.modelPaths))}},
                plugins:{{html pluginManager.pluginNames(true)}}
=======
                build:'${appModel.build}',
                models:{{json Object.keys(appModel.modelPaths) }},
                plugins:{{json pluginManager.pluginNames()}}
>>>>>>> 015354febcd2141c0d5401b40147c5d4b7ffcdf9
            });
        }
    });
});
