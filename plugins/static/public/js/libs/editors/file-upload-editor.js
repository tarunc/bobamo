define(['Backbone.Form', 'jquery', 'underscore'], function (Form, $, _) {
    "use strict";
    /*
        Currently, the Object ItemType is not supported.
    */
 
    var Form = Backbone.Form,
        editors = Form.editors;
        
        editors.Filepicker = editors.Text.extend({
            tagName: 'div',
 
            events: {
                'change input[type=file]': 'uploadFile',
                'click .remove': 'removeFile'
            },
 
            initialize: function(options) {
                _.bindAll(this, 'filepickerSuccess', 'filepickerError', 'filepickerProgress');
                editors.Text.prototype.initialize.call(this, options);
                this.$input = $('<input type="hidden" name="'+this.key+'" />');
                this.$uploadInput = $('<input type="file" multiple="multiple" />');
                this.$loader = $('<p class="upload-status"><span class="loader"></span> Uploading&hellip;</p>');
                this.$error = $('<p class="upload-error error">Error</p>');
                this.$list = $('<ul class="file-list">');
            },
 
            // return an array of file dicts
            getValue: function() {
                var val = this.$input.val();
                return val ? JSON.parse(val) : [];
            },
 
            setValue: function(value) {
                var str, files = value;
                if (_(value).isObject()) {
                    str = JSON.stringify(value);
                } else {
                    files = value ? JSON.parse(value) : [];
                }
                this.$input.val(str);
                this.updateList(files);
            },
 
            render: function(options) {
                editors.Text.prototype.render.apply(this, arguments);
 
                this.$el.append(this.$input);
                this.$el.append(this.$uploadInput);
                this.$el.append(this.$loader.hide());
                this.$el.append(this.$error.hide());
                this.$el.append(this.$list);
                return this;
            },
 
            uploadFile: function() {
                var s3upload = new S3Upload({
                    file_dom_selector: this.$uploadInput,
                    s3_sign_put_url: '/sign_s3_put/',
                    onProgress: this.filepickerProgress,
                    onFinishS3Put: this.filepickerSuccess,
                    onError: this.filepickerError
                });
            },
 
            filepickerSuccess: function(s3Url, file) {
                console.log('File uploaded', s3Url);
                this.$loader.hide();
                this.$error.hide();
                this.$uploadInput.val('');
 
                var newFiles = [{
                    url: s3Url,
                    filename: file.name,
                    size: file.size,
                    content_type: file.type
                }];
 
                console.log('File uploaded (processed)', newFiles);
                this.setValue(this.getValue().concat(newFiles));
            },
 
            filepickerError: function(msg, file) {
                console.debug('Filepicker error', msg);
                this.$loader.hide();
                this.$error.show();
            },
 
            filepickerProgress: function(percent, message, publicUrl, file) {
                //console.log('Filepicker progress', percent, message);
                this.$loader.show();
                this.$error.hide();
            },
 
            updateList: function(files) {
                // this code is currently duplicated as a handlebar helper (I wanted to let this
                // backbone-forms field stand on its own)
                var displayFilesize = function(bytes) {
                    // TODO improve this function
                    return Math.floor(bytes / 1024) + 'K';
                };
 
                this.$list.empty();
                _(files).each(function(file) {
                    var a = $('<a>', {
                        target: '_blank',
                        href: file.url,
                        text: file.filename + ' (' + file.content_type + ') ' + displayFilesize(file.size)
                    });
                    var li = $('<li>').append(a);
                    li.append(a, ' ', $('<a href="#" class="remove"><i class="icon-remove"></i></a>').data('url', file.url));
                    this.$list.append(li);
                }, this);
 
                this.$list[files.length ? 'show' : 'hide']();
            },
 
            removeFile: function(ev) {
                if (ev) ev.preventDefault();
                var url = $(ev.currentTarget).data('url');
                var files = this.getValue();
                this.setValue(_(files).reject(function(one) {
                    return one.url === url;
                }));
            }
 
        });
    
    return editors;
});
