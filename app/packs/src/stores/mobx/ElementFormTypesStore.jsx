import { values } from 'mobx';
import { flow, types } from 'mobx-state-tree';
import { cloneDeep } from 'lodash';

import ElementFormTypesFetcher from 'src/fetchers/ElementFormTypesFetcher';
import MoleculesFetcher from 'src/fetchers/MoleculesFetcher';
import Molecule from 'src/models/Molecule';
import Sample from 'src/models/Sample';
import ElementStructures from 'src/components/elementFormTypes/ElementStructures';

const ElementFormType = types.model({
  id: types.identifierNumber,
  name: types.maybeNull(types.string),
  description: types.maybeNull(types.string),
  element_type: types.maybeNull(types.string),
  structure: types.maybeNull(types.frozen({})),
  enabled: types.maybeNull(types.boolean),
});

const emptyElementFormType = {
  id: '',
  name: '',
  description: '',
  element_type: '',
  structure: {},
  enabled: true,
}

export const ElementFormTypesStore = types
  .model({
    admin_modal_visible: types.optional(types.boolean, false),
    admin_modal_content: types.optional(types.string, 'edit-object'),
    element_form_type: types.optional(types.frozen({}), emptyElementFormType),
    element_form_types: types.map(ElementFormType),
    editor_modal_visible: types.optional(types.boolean, false),
    modal_minimized: types.optional(types.boolean, false),
    element: types.optional(types.frozen({}), {}),
    element_structure: types.optional(types.frozen({}), {}),
    element_type_options: types.optional(types.array(types.frozen({})), []),
    error_message: types.optional(types.string, ''),
    show_success_message: types.optional(types.boolean, false),
    active_units: types.optional(types.array(types.frozen({})), []),
    element_has_focus: types.optional(types.array(types.frozen({})), []),
    solvent_error_message: types.optional(types.string, ''),
  })
  .actions(self => ({
    load: flow(function* loadElementFormTypes() {
      let result = yield ElementFormTypesFetcher.getElementFormTypes();
      self.element_form_types.clear();
      result.forEach(entry => self.element_form_types.set(entry.id, ElementFormType.create({ ...entry })));
    }),
    createElementFormType: flow(function* createElementFormType(elementFormType) {
      let result = yield ElementFormTypesFetcher.createElementFormType(elementFormType);
      if (result.id) {
        let createdElementFormType = ElementFormType.create({ ...result });
        self.element_form_types.set(result.id, createdElementFormType);
        self.show_success_message = true;
      }
    }),
    updateElementFormType: flow(function* updateElementFormType(elementFormType) {
      let result = yield ElementFormTypesFetcher.updateElementFormType(elementFormType);
      if (result.id) {
        let updatedElementFormType = ElementFormType.create({ ...result });
        self.element_form_types.set(result.id, updatedElementFormType);
        self.show_success_message = true;
      }
    }),
    fetchById: flow(function* fetchById(elementFormTypeId) {
      let result = yield ElementFormTypesFetcher.fetchById(elementFormTypeId)
      if (result.id) {
        self.element_form_type = { ...result }
        if (Object.keys(self.element_form_type.structure).length >= 1) {
          self.element_structure = self.element_form_type.structure;
        }
      }
    }),
    fetchByElementType: flow(function* fetchByElementType(elementType) {
      let result = yield ElementFormTypesFetcher.fetchByElementType(elementType);
      self.element_type_options = [];
      result.forEach(entry => self.element_type_options.push({ label: entry.name, value: entry.id }));
    }),
    deleteElementFormType: flow(function* deleteElementFormType(elementFormTypeId) {
      let result = yield ElementFormTypesFetcher.deleteElementFormType(elementFormTypeId)
      if (result.deleted == elementFormTypeId) {
        self.element_form_types.delete(elementFormTypeId)
      }
      return result
    }),
    fetchMoleculeBySmiles: flow(function* fetchMoleculeBySmiles(smiles, solvent) {
      let result = yield MoleculesFetcher.fetchBySmi(smiles);
      if (result) {
        const molecule = new Molecule(result);
        const moleculeDensity = molecule.density;
        const solventDensity = solvent.density || 1;

        molecule.density = (moleculeDensity && moleculeDensity > 0) || solventDensity;
        self.addSolventValues(molecule, '');
      } else {
        self.solvent_error_message = 'Failed to fetch molecule data.'
      }
    }),
    updateMoleculeNames: flow(function* updateMoleculeNames(newMoleculeName) {
      if (!self.element.molecule) { return null; }

      const inchikey = self.element.molecule.inchikey;
      if (!inchikey) { return null; }

      let result = yield MoleculesFetcher.updateNames(inchikey, newMoleculeName)
      if (result) {
        const moleculeName = result.find(r => r.label === newMoleculeName);
        let element = cloneDeep(self.element);

        if (moleculeName) {
          element.molecule_name = { label: moleculeName.label, value: moleculeName.mid }
        }
        element.molecule_names = result
        self.element = element
      }
    }),
    showAdminModal() {
      self.admin_modal_visible = true;
      self.show_success_message = false;
    },
    hideAdminModal() {
      self.admin_modal_visible = false;
    },
    changeAdminModalContent(content, elementFormTypeId) {
      self.admin_modal_content = content;
      if (elementFormTypeId) {
        self.fetchById(elementFormTypeId);
      }
    },
    handleAdminCancel() {
      self.hideAdminModal();
      self.clearElementFormTypeValues();
      self.error_message = '';
    },
    elementFormTypeValues(elementType, elementFormTypeId) {
      if (elementFormTypeId) {
        self.fetchById(elementFormTypeId);
      } else {
        let element = { ...self.element_form_type };
        element.element_type = elementType;
        self.addElementFormTypeValues(element);
      }
    },
    addElementFormTypeValues(values) {
      self.element_form_type = values;
    },
    clearElementFormTypeValues() {
      self.element_form_type = emptyElementFormType;
    },
    changeErrorMessage(message) {
      self.error_message = message;
    },
    showEditorModal(elementType, elementFormTypeId) {
      self.editor_modal_visible = true;
      self.show_success_message = false;
      self.element_structure = ElementStructures[elementType];
      self.elementFormTypeValues(elementType, elementFormTypeId);
    },
    hideEditorModal() {
      self.editor_modal_visible = false;
      self.element_structure = {};
    },
    initFormByElementType(elementType, element) {
      self.element_structure = ElementStructures[elementType];
      self.element = cloneDeep(element);
      self.fetchByElementType(elementType);
      self.updateMoleculeNames('');

      if (element.element_form_type) {
        self.element_structure = element.element_form_type['structure'];
        self.addElementFormTypeValues(element.element_form_type);
      } else {
        self.elementFormTypeValues(elementType);
      }
    },
    changeElementValues(field, value) {
      const element = cloneDeep(self.element);
      if (field.opt) {
        element[field.column][field.opt] = value;
      } else {
        element[`${field.column}`] = value;
      }
      self.element = element;
    },
    changeElementFormType(elementFormTypeId) {
      const element = cloneDeep(self.element);

      self.fetchById(elementFormTypeId);
      element.element_form_type_id = elementFormTypeId;
      self.element = element;
    },
    changeNumericValues(field, value, unit, metric, numericValue) {
      const element = cloneDeep(self.element);
      const values = { unit: field.unit, value: value, metricPrefix: metric };

      if (field.setterNewValue) {
        element[field.setterNewValue](values);
      } else {
        if (field.opt) {
          element[field.column][field.opt] = value;
        } else {
          element[`${field.column}`] = value;
        }
      }

      self.element = element;
      self.changeActiveUnits(field.key, unit, metric, numericValue);
    },
    changeNumRangeValues(field, lower, upper, unit, metric, numericValue) {
      const element = cloneDeep(self.element);
      element.updateRange(field.column, lower, upper);
      self.element = element;

      if (unit && metric) {
        self.changeActiveUnits(field.key, unit, metric, numericValue);
      }      
    },
    changeFlashPointValues(field, value, unit, metric) {
      const element = cloneDeep(self.element);
      const values = { value: value, unit: unit };
      element[field.column][field.opt] = values;
      self.element = element;
      self.changeActiveUnits(field.key, unit, metric, value);
    },
    addSolventValues(molecule, tagGroup) {
      let splitSample;
      let element = cloneDeep(self.element);

      if (molecule instanceof Molecule || false) {
        // Create new Sample with counter
        splitSample = Sample.buildNew(molecule, element.collection_id, tagGroup);
      } else if (molecule instanceof Sample) {
        splitSample = element.buildChild();
      }

      element.addSolvent(splitSample)
      self.element = element
    },
    changeSolventValues(solvent) {
      const element = cloneDeep(self.element);
      element.updateSolvent(solvent);
      self.element = element;
    },
    deleteSolvent(solvent) {
      const element = cloneDeep(self.element);
      element.deleteSolvent(solvent)
      self.element = element;
    },
    toggleModalMinimized() {
      self.modal_minimized = !self.modal_minimized;
    },
    handleCancel() {
      self.hideEditorModal();
    },
    addFormFields(fields) {
      let values = fields ? fields : [{}];
      self.element_structure = values;
    },
    changeFieldVisibility(selected_field, visibility) {
      const structure = cloneDeep(self.element_structure);

      structure.columns.map((section) => {
        section.rows.map((row) => {
          let row_changed = false;
          if (row.key == selected_field.key) {
            row.visible = visibility;
            row_changed = true;
          }
          row.fields.map((field) => {
            if (field.sub_fields) {
              field.sub_fields.map((sub_field) => {
                if (sub_field.key == selected_field.key || row_changed) {
                  sub_field.visible = visibility;
                }
              });
            } else if (field.key == selected_field.key || row_changed) {
              field.visible = visibility;
            }
          });
        });
      });
      self.element_structure = structure;
    },
    saveStructure() {
      let element = { ...self.element_form_type };
      element.structure = self.element_structure;
      self.updateElementFormType(element);
      self.hideEditorModal();
      self.show_success_message = true;
    },
    changeActiveUnits(key, newUnit, metric, value) {
      const index = self.active_units.findIndex((unit) => { return unit.key == key });
      if (index !== -1) {
        self.active_units[index] = { key: key, unit: newUnit, metric: metric, value: value };
      } else {
        self.active_units.push({ key: key, unit: newUnit, metric: metric, value: value });
      }
    },
    changeElementFocus(key, focus) {
      const index = self.element_has_focus.findIndex((e) => { return Object.keys(e).indexOf(key) != -1 });
      if (index !== -1) {
        self.element_has_focus[index] = { [key]: focus };
      } else {
        self.element_has_focus.push({ [key]: focus });
      }
    }
  }))
  .views(self => ({
    get adminModalVisible() { return self.admin_modal_visible },
    get adminModalContent() { return self.admin_modal_content },
    get elementFormType() { return self.element_form_type },
    get elementFormTypes() { return values(self.element_form_types) },
    get editorModalVisible() { return self.editor_modal_visible },
    get elementTypeOptions() { return values(self.element_type_options) },
    get modalMinimized() { return self.modal_minimized },
    get elementStructure() { return self.element_structure },
    get errorMessage() { return self.error_message },
    get showSuccessMessage() { return self.show_success_message },
    get activeUnits() { return values(self.active_units) },
    get ElementHasFocus() { return values(self.element_has_focus) },
    get solventErrorMessage() { return self.solvent_error_message },
  }));
