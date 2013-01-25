define(['Backbone.Form', 'jquery', 'underscore'], function (Form, $, _) {
    "use strict";
    /*
        Currently, the Object ItemType is not supported.
    */
 
    var Form = Backbone.Form,
        editors = Form.editors;
 
    Form.setTemplates({
        listKeyValueItem: '\
              <li>\
                <button type="button" data-action="remove" class="bbf-remove">&times;</button>\
                <div class="bbf-editor-container bbf-keyvalue-editor">{{editor}}</div>\
              </li>'
    });
 
    editors.KeyValueList = editors.List.extend({
        events: {
          'click [data-action="add"]': function(event) {
            event.preventDefault();
            this.addItem(null, null, true);
          }
        },
    
        initialize: function(options){
            editors.List.prototype.initialize.call(this, options);
            this.schema.listItemTemplate = 'listKeyValueItem';
        },
        
        render: function() {
            var self = this,
                value = this.value || {};
  
            //Create main element
            var $el = $(Form.templates[this.schema.listTemplate]({
                items: '<b class="bbf-tmp"></b>'
            }));
  
            //Store a reference to the list (item container)
            this.$list = $el.find('.bbf-tmp').parent().empty();
  
            //Add existing items
            if (!_.isEmpty(value)) {
                _.each(value, function(itemValue, itemIndex) {
                    self.addItem(itemValue, itemIndex);
                });
            }
  
            //If no existing items create an empty one, unless the editor specifies otherwise
            else {
                if (!this.Editor.isAsync) this.addItem();
            }
  
            this.setElement($el);
            this.$el.attr('id', this.id);
            this.$el.attr('name', this.key);
              
            if (this.hasFocus) this.trigger('blur', this);
        
            return this;
        },
        
         /**
         * Add a new item to the list
         * @param {Mixed} [value]           Value for the new item editor
         * @param {Boolean} [userInitiated] If the item was added by the user clicking 'add'
         */
        addItem: function(value, key, userInitiated) {
            var self = this;
  
            //Create the item
            var item = new editors.List.KeyValueItem({
                list: this,
                schema: this.schema,
                value: value,
                index: key,
                Editor: this.Editor,
                key: this.key + '_' + this.items.length
            }).render();
        
            var _addItem = function() {
                self.items.push(item);
                self.$list.append(item.el);
            
                if (userInitiated || value) {
                    item.addEventTriggered = true;
                }
            
                if (userInitiated) {
                    self.trigger('add', self, item.editor);
                    self.trigger('change', self);
                }
            };
          
            //Check if we need to wait for the item to complete before adding to the list
            if (this.Editor.isAsync) {
                item.editor.on('readyToAdd', _addItem, this);
            }
  
            //Most editors can be added automatically
            else {
                _addItem();
            }
        
            return item;
        },
    
        getValue: function() {
            var values = {};
            _.each(this.items, function(item){
                _.extend(values, item.getValue());
            });
     
            //Filter empty items
            return values;
        }
    });
     
    editors.List.KeyValueItem = editors.List.Item.extend({
   
        /**
         * @param {Object} options
         */
        initialize: function(options) {
            this.list = options.list;
            this.schema = options.schema || this.list.schema;
            this.value = options.value;
            this.index = options.index;
            this.Editor = options.Editor || editors.Text;
            this.key = options.key;
        },
        
        render: function() {
            //Create editors
            this.editorKey = new editors.Text({
                key: this.key,
                schema: this.schema,
                value: this.index,
                list: this.list,
                item: this
            }).render();
        
            this.editorValue = new this.Editor({
                key: this.key + '_value',
                schema: this.schema,
                value: this.value,
                list: this.list,
                item: this
            }).render();
  
            //Create main element
            var $el = $(Form.templates[this.schema.listItemTemplate]({
                editor: '<b class="bbf-tmp-key"></b> : <b class="bbf-tmp-value"></b>'
            }));
  
            $el.find('.bbf-tmp-key').replaceWith(this.editorKey.el);
            $el.find('.bbf-tmp-value').replaceWith(this.editorValue.el);
 
            //Replace the entire element so there isn't a wrapper tag
            this.setElement($el);
          
            return this;
        },
      
        getValue: function() {
            var value = {};
            value[this.editorKey.getValue()] = this.editorValue.getValue();
            return value;
        },
 
        setValue: function(key, value) {
            this.editorKey.setValue(key);
            this.editorValue.setValue(value);
        },
    
        focus: function() {
            this.editorKey.focus();
            this.editorValue.focus();
        },
    
        blur: function() {
            this.editorKey.blur();
            this.editorValue.blur();
        },
 
        remove: function() {
            this.editorKey.remove();
            this.editorValue.remove();
  
            Backbone.View.prototype.remove.call(this);
        }
     
    });
    
    return editors;
});
