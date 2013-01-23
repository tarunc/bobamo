var PluginApi = require('../../index').PluginApi, util = require('util'), _u = require('underscore'), LocalStrategy = require('passport-local').Strategy, passport = require('passport'), crypto = require('crypto'), Model = require('../../lib/display-model');


var PassportPlugin = function () {
    PluginApi.apply(this, arguments);
    if (!this.options.authModel) {
        throw new Error("authModel option is required");
    }
    this.usernameField = this.options.usernameField || 'username';
    this.passwordField = this.options.passwordField || 'password';

    this.app.use(passport.initialize());
    this.app.use(passport.session());


    passport.use(this.options.strategy || new LocalStrategy(
        function (username, password, done) {
            var obj = {};
            obj[this.usernameField] = username;
            obj[this.passwordField] = password;
            this.options.authModel.findOne(obj, function (err, u) {
                console.log('err', err, 'found', obj, u != null);
                done(err, u);
            });
        }.bind(this)
    ));
    passport.serializeUser(function (user, done) {
        done(null, user._id);
    });

    passport.deserializeUser(function (id, done) {
        this.options.authModel.findOne({_id:id}, function (err, user) {
            done(err, user);
        });
    }.bind(this));
    this.conf = _u.extend({model:this.options.authModel.modelName});
    _u.each(['usernameField', 'passwordField', 'hash', 'digest'], function (k) {
        this.conf[k] = this.options[k]
    }, this)

    this._appModel = {  header:{
        'passport-menu':{
            'passport':{
                label:'Login',
                href:'#/login'

            }
        },
        'admin-menu':{
            'passport':{
                label:'Configure Passport',
                href:'#views/configure/passport'
            }
        }
    }};
}

util.inherits(PassportPlugin, PluginApi);
PassportPlugin.prototype.appModel = function () {
    return  this._appModel;
}
PassportPlugin.prototype.admin = function () {
    return new Model('passport', [
        {
            schema:{
                usernameField:{
                    type:'Text',
                    placeholder:this.usernameField || 'username',
                    help:'The Field in the model to use as the unique identifier'
                },
                passwordField:{
                    type:'Text',
                    placeholder:this.passwordField || 'password',
                    help:'The field to use as a the password'
                },
                hash:{
                    type:'Select',
                    options:['sha1', 'md5', 'sha256', 'sha512', 'none'],
                    help:'Encode the hashed passsword (none) is not recommended'
                },
                encoding:{
                    type:'Select',
                    options:['base64', 'hex'],
                    help:'Encoding of the password base64 works just fine'
                },
                model:{
                    type:'Select',
                    single:true,
                    collection:'views/modeleditor/admin/schema-collection',
                    help:'Which Schema to use as the user model'
                }
            },
            url:this.pluginUrl + '/admin/configure',
            fieldsets:[
                {legend:"Passport Plugin", fields:['usernameField', 'passwordField', 'hash', 'encoding', 'model']}
            ],
            defaults:this.conf, //_u.extend({model:this.options.authModel.modelName}, this.config),
            plural:'Passport',
            title:'Passport Plugin',
            modelName:'passport'
        }
    ]);

}

PassportPlugin.prototype.ensureAuthenticated = function (req, res, next) {
//    next();
//    passport.authorize('local', { failureRedirect: '/check' })(req,res,next)
//    next();
    if (req.isAuthenticated && req.isAuthenticated())
        return  next();
    res.send({status:1, message:'Not Authenticated'})
}
PassportPlugin.prototype.doEncrypt = function (password) {
    var hash = this.options.hash || 'sha1';
    var digest = this.options.digest || 'base64';
    return crypto.createHash(hash).update(password).digest(digest);
}
PassportPlugin.prototype.encryptCredentials = function (req, res, next) {
    var passfield = this.options.passwordField || 'password';
    if (!(passfield in req.body))
        return next();

    req.body[passfield] = this.doEncrypt(req.body[passfield]);
    next();
};
PassportPlugin.prototype.onAuth = function (req, res) {
    res.send({
        status:0,
        payload:req.user
    });
}
PassportPlugin.prototype.logOut = function (req, res, next) {
    req.logOut();
    res.redirect(this.baseUrl);
}

PassportPlugin.prototype.filters = function () {
    var app = this.app;
    var username = this.usernameField;
    app.get(this.baseUrl + '*', function (req, res, next) {
        res.locals('appModel', this.pluginManager.appModel)
        res.locals('user', req.user);
        var u = req.user;
        var obj = (u) ?
            {
                label:u[username],
                iconCls:'icon-user',
                items:[

                    {
                        label:'Edit Profile',
                        href:'#/' + this.options.authModel.modelName + '/edit?id=' + u._id
                    },
                    {
                        label:'Change Password',
                        iconCls:'icon-lock',
                        href:'#/passport/change_password'
                    },
                    {
                        clsNames:'divider'
                    },
                    {
                        label:'Logout',
                        href:'/logout'
                    }
                ]
            }
                :
            {
                label:'Login',
                href:'#/login'
            }
            ;
        this._appModel.header['passport-menu'].passport = obj
//        _u.each(_u.keys(this.passportMenu), function(v){
//              delete this.passportMenu[v];
//        }, this)
//        _u.extend(this.passportMenu, obj);

        next();
    }.bind(this)
    )
    ;

    app.post(this.pluginUrl, this.authenticate.bind(this), this.ensureAuthenticated.bind(this), this.onAuth.bind(this));

    app.get(this.pluginUrl + '/check', this.ensureAuthenticated.bind(this), this.onAuth.bind(this));

    app.get(this.baseUrl + 'logout', this.logOut.bind(this));

    app.post(this.baseUrl + '*', function (req, res, next) {
        if (req.authrequired) {
            return this.authenticate(req, res, next);
        }
        next();
    }.bind(this), function (req, res, next) {
        if (req.authrequired)
            return  this.ensureAuthenticated(req, res, next)
        return next();
    }.bind(this));

//    [this.baseUrl + '/rest/*'].concat(this.options.restrict).forEach(function (v) {
//        if (v)
//            this.app.all(v, this.ensureAuthenticated.bind(this));
//    }, this);
    PluginApi.prototype.filters.apply(this, arguments);
}
var hasLength = function (str) {
    for (var i = 0, l = arguments.length; i < l; i++) {
        if (!(arguments[i] && str.trim().length > 0))
            return false;
    }
    return true;
}
PassportPlugin.prototype.routes = function () {

    // this.app.get(this.baseUrl + 'js/views/header.js', function (req, res, next) {
    //     this.generate(res, 'header.js', {}, next);
    // }.bind(this));
    this.app.post(this.pluginUrl + '/change_password', function (req, res, next) {
        var body = req.body;
        if (!req.user) {
            return res.send({
                status:0,
                payload:{
                    error:'Not Logged In'
                }
            })
        }

        if (hasLength(body.password, body.confirm_password, body.new_password)) {
            if (req.user.password != this.doEncrypt(body.password))
                return res.send({
                    status:0,
                    error:{
                        password:'Incorrect Password'
                    }
                });


            if (body.new_password == body.confirm_password) {
                var body = req.body = { }
                body[this.passwordField] = this.doEncrypt(body.new_password);
                body._id = req.user._id;
                req.url = [this.options.api, this.options.authModel && this.options.authModel.modelName || this.conf.modelName ].join('/')
                console.log("redirecting to ", req.url);
                return next();
            }
            return res.send({
                status:0,
                error:{
                    new_password:'Password does not match'
                }
            });

        }
        return res.send({
            status:0,
            error:{
                new_password:'Password does not valid'
            }
        });

    }.bind(this)
    );
    PluginApi.prototype.routes.apply(this, arguments);
}
PassportPlugin.prototype.authenticate = function (req, res, next) {
    var passfield = this.options.passwordField || 'password';
    var authenticate = passport.authenticate('local', { failureRedirect:this.pluginUrl + '/check' });
    if (req.body[passfield]) {
        this.encryptCredentials(req, res, function (err) {
            if (err) return next(err);
            return authenticate(req, res, next);
        })
    } else {
        next();
    }
}
module.exports = PassportPlugin;
