var Plugin = require('../../lib/plugin-api'), _u = require('underscore');
var AppEditorPlugin = function (options, app, name) {
    Plugin.apply(this, arguments);
    this._appModel = {
        header:{
            'admin-menu':{
                appeditor:{
                    label:'Application Details',
                    href:'#/appeditor/admin/edit'
                }
            }
        }
    };
}
require('util').inherits(AppEditorPlugin, Plugin);

AppEditorPlugin.prototype.appModel = function(){
    return this._appModel;
}
AppEditorPlugin.prototype.configure = function(options){
    _u.extend(this._appModel,options);
}
AppEditorPlugin.prototype.filters = function(){
    this.app.get(this.pluginUrl+'*', function(req,res,next){
        res.locals('pluginManager', this.pluginManager);
        next();
    }.bind(this));
    Plugin.prototype.filters.apply(this, arguments);
}
AppEditorPlugin.prototype.routes = function (options) {

    this.app.get(this.pluginUrl + '/admin/:id', function (req, res, next) {
        var appModel = this._appModel;
        res.send({
            payload:appModel,
            status:1
        })
    }.bind(this));

    this.app.post(this.pluginUrl + '/admin', function (req, res, next) {
        this.save(req.body, function(err, obj){
            res.send({
                status:0,
                payload:obj
            })
        }.bind(this), req);
    }.bind(this));

    this.app.put(this.pluginUrl + '/admin', function (req, res, next) {
        this.save(req.body, function(err, obj){
            res.send({
                status:0,
                payload:obj
            })
        }.bind(this), req);
    }.bind(this));

    Plugin.prototype.routes.apply(this, arguments);
}

module.exports = AppEditorPlugin;
