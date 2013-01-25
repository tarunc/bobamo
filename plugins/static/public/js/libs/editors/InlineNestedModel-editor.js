define(['Backbone.Form', 'jquery', 'underscore'], function (Form, $, _) {
    "use strict";
    var Form = Backbone.Form,
        editors = Form.editors;
      
    // we don't want our nested form to have a (nested) <form> tag
    // (currently bbf includes form tags: https://github.com/powmedia/backbone-forms/issues/8)
    // aside from being strange html to have nested form tags, it causes submission-upon-enter
    Form.setTemplates({
      nestedForm: '<div class="bbf-nested-form">{{fieldsets}}</div>'
    });
 
    editors.List.InlineNestedModel = editors.List.NestedModel.extend({
  
      events: {},
 
      /**
       * @param {Object} options
       */
      initialize: function(options) {
        editors.Base.prototype.initialize.call(this, options);
 
        // Reverse the effect of the "feature" of pressing enter adding new item
        // https://github.com/powmedia/backbone-forms/commit/6201a6f44984087b71c216dd637b280dab9b757d
        delete this.options.item.events['keydown input[type=text]'];
 
        var schema = this.schema;
        if (!schema.model) throw 'Missing required option "schema.model"';
 
        this.nestedSchema = schema.model.prototype.schema;
        if (_.isFunction(this.nestedSchema)) this.nestedSchema = this.nestedSchema();
 
        var list = options.list;
        list.on('add', this.onUserAdd, this);
      },
    
      /**
       * Render the list item representation
       */
      render: function() {
        var self = this;
 
        this.$el.html(this.getFormEl());
 
        setTimeout(function() {
          self.trigger('readyToAdd');
        }, 0);
 
        return this;
      },
 
      getFormEl: function() {
        var schema = this.schema,
            value = this.getValue();
 
        // when adding a new item, need to instantiate a new empty model
        // TODO is this the best place for this?
        if (!value) { value = new schema.model(); }
 
        this.form = new Form({
          /*
          schema: this.nestedSchema,
          data: this.value
          */
          template: 'nestedForm',
          model: value
        });
      
        return this.form.render().el;
      },
 
      getValue: function() {
        if (this.form) {
          this.value = this.form.getValue();
          //console.log('nested form value', this.value);
          // see https://github.com/powmedia/backbone-forms/issues/81
        }
        return this.value;
      },
 
      onUserAdd: function() {
        this.form.$('input, textarea, select').first().focus();
      }
 
    });
    
    return editors;
});
