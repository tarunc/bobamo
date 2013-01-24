/**
 * Module dependencies.
 */

//require('bobamo/examples/model/User');
require('bobamo/examples/model/Group');
//require('bobamo/examples/model/Employee');

var bobamo    = require('bobamo'), mongoose= bobamo.mongoose;

var app = bobamo.app({ uri:'mongodb://localhost/bobamo_development', plugin:['jsonschema']});
app.get('/', function(req,res){ res.render('redir_index.html', {layout:false})});
app.listen(3001);
console.log('listening on 3001');
