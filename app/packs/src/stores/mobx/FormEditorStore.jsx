import { types } from 'mobx-state-tree';
import { cloneDeep } from 'lodash';

import ElementStructure from '../../apps/mydb/elements/details/ElementStructure';

export const FormEditorStore = types
  .model({
    form_editor_modal_visible: types.optional(types.boolean, false),
    element_type: types.optional(types.string, ''),
    modal_minimized: types.optional(types.boolean, false),
    element_structure: types.optional(types.frozen({}), ElementStructure),
  })
  .actions(self => ({
    showFormEditorModal(type) {
      self.form_editor_modal_visible = true;
      self.element_type = type;
    },
    hideFormEditorModal() {
      self.form_editor_modal_visible = false;
      self.element_type = '';
    },
    toggleModalMinimized() {
      self.modal_minimized = !self.modal_minimized;
    },
    handleCancel() {
      self.hideFormEditorModal();
      // reset selected / unselected form elements
    },
    addFormFields(fields) {
      let values = fields ? fields : [{}];
      self.element_structure = values;
    },
    changeFieldVisibility(selected_field, visibility) {
      let structure = cloneDeep(self.element_structure);

      structure.elements[self.element_type].map((section) => {
        section.rows.map((row) => {
          row.fields.map((field) => {
            if (field.sub_fields) {
              field.sub_fields.map((sub_field) => {
                if (sub_field.key == selected_field.key) {
                  sub_field.visible = visibility;
                }
              });
            } else if (field.key == selected_field.key) {
              field.visible = visibility;
            }
          });
        });
      });
      self.element_structure = structure;
    }
  }))
  .views(self => ({
    get formEditorModalVisible() { return self.form_editor_modal_visible },
    get elementType() { return self.element_type },
    get modalMinimized() { return self.modal_minimized },
    get elementStructure() { return self.element_structure },
  }));
