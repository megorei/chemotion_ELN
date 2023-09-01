import { keys, values } from 'mobx';
import { flow, types, getSnapshot } from 'mobx-state-tree';

import ElementStructure from '../../apps/mydb/elements/details/ElementStructure';

const SubField = types.model({
  column: types.maybeNull(types.string),
  opt: types.maybeNull(types.string),
  key: types.maybeNull(types.string),
  label: types.maybeNull(types.string),
  type: types.maybeNull(types.string),
  option_layers: types.maybeNull(types.string),
  addon: types.maybeNull(types.string),
  default: types.maybeNull(types.string),
  required: types.maybeNull(types.boolean),
  description: types.maybeNull(types.string),
  visible: types.maybeNull(types.boolean),
  conditions: types.maybeNull(types.frozen({})),
});

const Field = types.model({
  column: types.string,
  opt: types.maybeNull(types.string),
  key: types.maybeNull(types.string),
  label: types.maybeNull(types.string),
  type: types.maybeNull(types.string),
  option_layers: types.maybeNull(types.string),
  addon: types.maybeNull(types.string),
  default: types.maybeNull(types.string),
  required: types.maybeNull(types.boolean),
  description: types.maybeNull(types.string),
  visible: types.maybeNull(types.boolean),
  conditions: types.maybeNull(types.frozen({})),
  sub_fields: types.maybeNull(types.array(SubField)),
});

const Row = types.model({
  cols: types.maybeNull(types.number),
  fields: types.array(Field),
});

const Section = types.model({
  label: types.maybeNull(types.string),
  key: types.maybeNull(types.string),
  toggle: types.maybeNull(types.boolean),
  rows: types.maybeNull(types.array(Row)),
});

const Element = types.model({
  elements: types.maybeNull(types.map(types.array(Section))),
});

const dummyStructure = {
  elements: {
    sample: [
      {
        label: '',
        key: 'header',
        rows: [
          {
            cols: 1,
            fields: [
              {
                column: 'xref',
                opt: 'cas',
                key: 'xref-cas',
                label: 'CAS',
                type: 'cas',
                option_layers: '',
                addon: '',
                visible: true,
                default: '',
                required: false,
                description: '',
              },
            ]
          }
        ],
      },
    ],
  }
};

export const FormEditorStore = types
  .model({
    form_editor_modal_visible: types.optional(types.boolean, false),
    element_type: types.optional(types.string, ''),
    modal_minimized: types.optional(types.boolean, false),
    structure: types.optional(types.map(Element), {}),
    element_structure: types.optional(types.array(types.frozen({})), []),
  })
  .actions(self => ({
    showFormEditorModal(type) {
      self.form_editor_modal_visible = true;
      self.element_type = type;
      self.element_structure = ElementStructure.elements[type];
     
      let structure = Element.create(ElementStructure);
      //self.structure.set(structure);
      //self.element_structure.set(Section.create(ElementStructure));
      //console.log(values(structure.elements.get(type)));
      console.log(getSnapshot(structure), getSnapshot(self.structure));
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
    changeFieldVisibility(field, visibility) {
      let index = [];

      self.element_structure.map((section, i) => {
        section.rows.map((row, j) => {
          row.fields.map((f, k) => {
            if (f.key == field.key) {
              index = [i, j, k];
            }
          });
        });
      });
      if (index.length > 1) {
        let field_object = self.element_structure[index[0]].rows[index[1]].fields[index[2]];
        field_object.visible = visibility;
        self.element_structure[index[0]].rows[index[1]].fields[index[2]] = field_object;
      }
    }
  }))
  .views(self => ({
    get formEditorModalVisible() { return self.form_editor_modal_visible },
    get elementType() { return self.element_type },
    get modalMinimized() { return self.modal_minimized },
    get elementStructure() { return self.element_structure },
    get element() { return values(self.structure) },
  }));
