import Element from 'src/models/Element';
import Container from 'src/models/Container';
import UserStore from 'src/stores/alt/stores/UserStore';
import { convertUnits } from 'src/components/staticDropdownOptions/units';

export default class SequenceBasedMacromoleculeSample extends Element {
  constructor(args) {
    super(args);

    this.default_units = {
      activity: 'U',
      amount_as_used_mol: 'mol',
      amount_as_used_mass: 'g',
      concentration: 'ng/L',
      molarity: 'mol/L',
      activity_per_volume: 'U/L',
      activity_per_mass: 'U/g',
      volume_as_used: 'l',
    };
  }

  calculateValues(type) {
    // if the volume is added, we calculate the activity and the amount based on: 
    //   amount [mol] = Volume [L] * molarity [mol/L] 
    //   activity [U] = Volume [L] * activity_per_liter [U/L] 
    // if the activity is added: 
    //   Volume [L] = Activity [U] / activity_per_liter [U/L] 
    //   amount [mol] = Volume [L] * molarity [mol/L]   
    // if the amount (in mol) is added: 
    //   volume [L] = amount [mol]  / molarity [mol/L] 
    //   activity [U] = Volume [L] * activity_per_liter [U/L] 
    // if the amount (in g) is added: 
    //   Activity [U] = amount [g] * Activity in U/g [mol/L]

    if (!this.function_or_application || this.function_or_application !== 'enzyme') { return null; }

    if (type === 'volume_as_used' && this.base_volume_as_used_value > 0) {
      this.calculateAmountAsUsed();
      this.calculateActivity();
    }

    if (type === 'activity' && this._base_activity_value > 0) {
      this.calculateVolumeByActivity();
      this.calculateAmountAsUsed();
    }

    if (type === 'amount_as_used_mol' && this.base_amount_as_used_mol_value > 0) {
      this.calculateVolumeByAmount();
      this.calculateActivity();
    }

    if (type === 'amount_as_used_mass' && this.base_amount_as_used_mass_value > 0) {
      this.calculateActivityByMass();
    }

    if (type === 'molarity' && this.base_molarity_value > 0) {
      this.calculateAmountAsUsed();
    }

    if (type === 'activity_per_volume' && this.base_activity_per_volume_value > 0) {
      this.calculateActivity();
    }

    if (type === 'activity_per_mass' && this.base_activity_per_mass_value > 0) {
      this.calculateActivityByMass();
    }
  }

  calculateActivity() {
    if (this.base_activity_per_volume_value === 0 || this.base_volume_as_used_value === 0) { return null; }

    this._activity_value = convertUnits(
      parseFloat((this.base_volume_as_used_value * this.base_activity_per_volume_value).toFixed(8)),
      this.default_units.activity,
      this.activity_unit
    );
    this._base_activity_value =
      convertUnits(this._activity_value, this.activity_unit, this.default_units.activity);
  }

  calculateActivityByMass() {
    if (this.base_activity_per_mass_value === 0 || this.base_amount_as_used_mass_value === 0) { return null; }

    this._activity_value = convertUnits(
      parseFloat((this.base_amount_as_used_mass_value * this.base_activity_per_mass_value).toFixed(8)),
      this.default_units.activity,
      this.activity_unit
    );
    this._base_activity_value =
      convertUnits(this._activity_value, this.activity_unit, this.default_units.activity);
  }

  calculateAmountAsUsed() {
    if (this.base_volume_as_used_value === 0 || this.base_molarity_value === 0) { return null; }

    this._amount_as_used_mol_value = convertUnits(
      parseFloat((this.base_volume_as_used_value * this.base_molarity_value).toFixed(8)),
      this.default_units.amount_as_used_mol,
      this.amount_as_used_mol_unit
    );
    this._base_amount_as_used_mol_value =
      convertUnits(this._amount_as_used_mol_value, this.amount_as_used_mol_unit, this.default_units.amount_as_used_mol);
  }

  calculateVolumeByActivity() {
    if (this.base_activity_per_volume_value === 0 || this.base_activity_value === 0) { return null; }

    this._volume_as_used_value = convertUnits(
      parseFloat((this.base_activity_value / this.base_activity_per_volume_value).toFixed(8)),
      this.default_units.volume_as_used,
      this.volume_as_used_unit
    );
    this._base_volume_as_used_value =
      convertUnits(this._volume_as_used_value, this.volume_as_used_unit, this.default_units.volume_as_used);
  }

  calculateVolumeByAmount() {
    if (this.base_molarity_value === 0 || this.base_amount_as_used_mol_value === 0) { return null; }

    this._volume_as_used_value = convertUnits(
      parseFloat((this.base_amount_as_used_mol_value / this.base_molarity_value).toFixed(8)),
      this.default_units.volume_as_used,
      this.volume_as_used_unit
    );
    this._base_volume_as_used_value =
      convertUnits(this._volume_as_used_value, this.volume_as_used_unit, this.default_units.volume_as_used);
  }

  get activity_value() {
    return this._activity_value;
  }

  set activity_value(value) {
    this._activity_value = value;
    this._base_activity_value = convertUnits(this.activity_value, this._activity_unit, this.default_units.activity);
    this.calculateValues('activity');
  }

  get base_activity_value() {
    return this._base_activity_value || 0;
  }

  set base_activity_value(value) {
    this._base_activity_value = value;
  }

  get activity_unit() {
    return this._activity_unit || this.default_units.activity;
  }

  set activity_unit(value) {
    this._activity_value = convertUnits(this.activity_value, this.activity_unit, value);
    this._activity_unit = value;
  }

  get amount_as_used_mol_value() {
    return this._amount_as_used_mol_value;
  }

  set amount_as_used_mol_value(value) {
    this._amount_as_used_mol_value = value;
    this._base_amount_as_used_mol_value =
      convertUnits(this.amount_as_used_mol_value, this.amount_as_used_mol_unit, this.default_units.amount_as_used_mol);

    this._amount_as_used_mass_value = '';
    this._base_amount_as_used_mass_value = 0;

    this.calculateValues('amount_as_used_mol');
  }

  get base_amount_as_used_mol_value() {
    return this._base_amount_as_used_mol_value || 0;
  }

  set base_amount_as_used_mol_value(value) {
    this._base_amount_as_used_mol_value = value;
  }

  get amount_as_used_mol_unit() {
    return this._amount_as_used_mol_unit || this.default_units.amount_as_used_mol;
  }

  set amount_as_used_mol_unit(value) {
    this._amount_as_used_mol_value = convertUnits(this.amount_as_used_mol_value, this.amount_as_used_mol_unit, value);
    this._amount_as_used_mol_unit = value;
  }

  get amount_as_used_mass_value() {
    return this._amount_as_used_mass_value;
  }

  set amount_as_used_mass_value(value) {
    this._amount_as_used_mass_value = value;
    this._base_amount_as_used_mass_value =
      convertUnits(this.amount_as_used_mass_value, this.amount_as_used_mass_unit, this.default_units.amount_as_used_mass);

    this._amount_as_used_mol_value = '';
    this._base_amount_as_used_mol_value = 0;

    this.calculateValues('amount_as_used_mass');
  }

  get base_amount_as_used_mass_value() {
    return this._base_amount_as_used_mass_value || 0;
  }

  set base_amount_as_used_mass_value(value) {
    this._base_amount_as_used_mass_value = value;
  }

  get amount_as_used_mass_unit() {
    return this._amount_as_used_mass_unit || this.default_units.amount_as_used_mass;
  }

  set amount_as_used_mass_unit(value) {
    this._amount_as_used_mass_value = convertUnits(this.amount_as_used_mass_value, this.amount_as_used_mass_unit, value);
    this._amount_as_used_mass_unit = value;
  }

  get concentration_value() {
    return this._concentration_value;
  }

  set concentration_value(value) {
    this._concentration_value = value;
  }

  get concentration_unit() {
    return this._concentration_unit || this.default_units.concentration;
  }

  set concentration_unit(value) {
    this._concentration_value = convertUnits(this.concentration_value, this.concentration_unit, value);
    this._concentration_unit = value;
  }

  get function_or_application() {
    return this._function_or_application;
  }

  set function_or_application(value) {
    this._function_or_application = value;
  }

  get molarity_value() {
    return this._molarity_value;
  }

  set molarity_value(value) {
    this._molarity_value = value;
    this._base_molarity_value = convertUnits(this.molarity_value, this.molarity_unit, this.default_units.molarity);
    this.calculateValues('molarity');
  }

  get base_molarity_value() {
    return this._base_molarity_value || 0;
  }

  set base_molarity_value(value) {
    this._base_molarity_value = value;
  }

  get molarity_unit() {
    return this._molarity_unit || this.default_units.molarity;
  }

  set molarity_unit(value) {
    this._molarity_value = convertUnits(this.molarity_value, this.molarity_unit, value);
    this._molarity_unit = value;
  }

  get activity_per_volume_value() {
    return this._activity_per_volume_value;
  }

  set activity_per_volume_value(value) {
    this._activity_per_volume_value = value;
    this._base_activity_per_volume_value =
      convertUnits(this.activity_per_volume_value, this.activity_per_volume_unit, this.default_units.activity_per_volume);
    
    this._activity_per_mass_value = '';
    this._base_activity_per_mass_value = 0;
    
    this.calculateValues('activity_per_volume');
  }

  get base_activity_per_volume_value() {
    return this._base_activity_per_volume_value || 0;
  }

  set base_activity_per_volume_value(value) {
    this._base_activity_per_volume_value = value;
  }

  get activity_per_volume_unit() {
    return this._activity_per_volume_unit || this.default_units.activity_per_volume;
  }

  set activity_per_volume_unit(value) {
    this._activity_per_volume_value = convertUnits(this.activity_per_volume_value, this.activity_per_volume_unit, value);
    this._activity_per_volume_unit = value;
  }

  get activity_per_mass_value() {
    return this._activity_per_mass_value;
  }

  set activity_per_mass_value(value) {
    this._activity_per_mass_value = value;
    this._base_activity_per_mass_value =
      convertUnits(this.activity_per_mass_value, this.activity_per_mass_unit, this.default_units.activity_per_mass);
    
    this._activity_per_volume_value = '';
    this._base_activity_per_volume_value = 0;

    this.calculateValues('activity_per_mass');
  }

  get base_activity_per_mass_value() {
    return this._base_activity_per_mass_value || 0;
  }

  set base_activity_per_mass_value(value) {
    this._base_sactivity_per_mass_value = value;
  }

  get activity_per_mass_unit() {
    return this._activity_per_mass_unit || this.default_units.activity_per_mass;
  }

  set activity_per_mass_unit(value) {
    this._activity_per_mass_value = convertUnits(this.activity_per_mass_value, this.activity_per_mass_unit, value);
    this._activity_per_mass_unit = value;
  }

  get volume_as_used_value() {
    return this._volume_as_used_value;
  }

  set volume_as_used_value(value) {
    this._volume_as_used_value = value;
    this._base_volume_as_used_value =
      convertUnits(this.volume_as_used_value, this.volume_as_used_unit, this.default_units.volume_as_used);
    this.calculateValues('volume_as_used');
  }

  get base_volume_as_used_value() {
    return this._base_volume_as_used_value || 0;
  }

  set base_volume_as_used_value(value) {
    this._base_volume_as_used_value = value;
  }

  get volume_as_used_unit() {
    return this._volume_as_used_unit || this.default_units.volume_as_used;
  }

  set volume_as_used_unit(value) {
    this._volume_as_used_value = convertUnits(this.volume_as_used_value, this.volume_as_used_unit, value);
    this._volume_as_used_unit = value;
  }

  static buildEmpty(collectionID) {
    return new SequenceBasedMacromoleculeSample({
      collection_id: collectionID,
      type: 'sequence_based_macromolecule_sample',
      name: 'New sequence based macromolecule',
      short_label: '',
      isNew: true,
      changed: false,
      updated: false,
      can_copy: false,
      container: Container.init(),
      attachments: [],
      segments: [],
      reference: {},
      post_translational_modifications: {},
    });
  }

  serialize() {
    const serialized = super.serialize({
      activity_value: this.activity_value,
      activity_unit: this.activity_unit,
      amount_as_used_mol_value: this.amount_as_used_mol_value,
      amount_as_used_mol_unit: this.amount_as_used_mol_unit,
      amount_as_used_mass_value: this.amount_as_used_mass_value,
      amount_as_used_mass_unit: this.amount_as_used_mass_unit,
      concentration_value: this.concentration_value,
      concentration_unit: this.concentration_unit,
      function_or_application: this.function_or_application,
      molarity_value: this.molarity_value,
      molarity_unit: this.molarity_unit,
      activity_per_mass_value: this.activity_per_mass_value,
      activity_per_mass_unit: this.activity_per_mass_unit,
      activity_per_volume_value: this.activity_per_volume_value,
      activity_per_volume_unit: this.activity_per_volume_unit,
      volume_as_used_value: this.volume_as_used_value,
      volume_as_used_unit: this.volume_as_used_unit,
    });
    return serialized;
  }

  static buildNewShortLabel() {
    const { currentUser } = UserStore.getState();
    if (!currentUser) { return 'NEW SEQUENCE BASED MACROMOLECULE'; }
    return `${currentUser.initials}-SBMM${currentUser.macromolecules_count + 1}`;
  }

  // static copyFromSequenceBasedMacromoleculeAndCollectionId(sequence_based_macromolecule, collection_id) {
  //   const newSequenceBasedMacromolecule = sequence_based_macromolecule.buildCopy();
  //   newSequenceBasedMacromolecule.collection_id = collection_id;
  //   if (sequence_based_macromolecule.name) { newSequenceBasedMacromolecule.name = sequence_based_macromolecule.name; }

  //   return new SequenceBasedMacromoleculeSample;
  // }

  title() {
    const short_label = this.short_label ? this.short_label : '';
    return this.name ? `${short_label} ${this.name}` : short_label;
  }

  get attachmentCount() {
    if (this.attachments) { return this.attachments.length; }
    return this.attachment_count;
  }

  getAttachmentByIdentifier(identifier) {
    return this.attachments
      .filter((attachment) => attachment.identifier === identifier)[0];
  }

  // buildCopy() {
  //   const sequenceBasedMacromolecule = super.buildCopy();
  //   sequenceBasedMacromolecule.short_label = SequenceBasedMacromolecule.buildNewShortLabel();
  //   sequenceBasedMacromolecule.container = Container.init();
  //   sequenceBasedMacromolecule.can_copy = false;
  //   sequenceBasedMacromolecule.attachments = []
  //   return sequenceBasedMacromolecule;
  // }
}
