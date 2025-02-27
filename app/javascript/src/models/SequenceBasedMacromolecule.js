import Element from 'src/models/Element';
import Container from 'src/models/Container';
import UserStore from 'src/stores/alt/stores/UserStore';
import { convertUnits } from 'src/components/staticDropdownOptions/units';

export default class SequenceBasedMacromolecule extends Element {
  constructor(args) {
    super(args);

    this.default_units = {
      activity: 'U',
      amount_as_used: 'mol',
      amount_as_used_weight: 'g',
      concentration: 'ng/L',
      molarity: 'mol/L',
      stock_activity_ul: 'U/L',
      stock_activity_ug: 'U/g',
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

    if (type === 'volume_as_used' && this.base_volume_as_used > 0) {
      this.calculateAmountAsUsed();
      this.calculateActivity();
    }

    if (type === 'activity' && this._base_activity > 0) {
      this.calculateVolumeByActivity();
      this.calculateAmountAsUsed();
    }

    if (type === 'amount_as_used' && this.base_amount_as_used > 0) {
      this.calculateVolumeByAmount();
      this.calculateActivity();
    }

    if (type === 'amount_as_used_weight' && this.base_amount_as_used_weight > 0) {
      this.calculateActivityByWeight();
    }

    if (type === 'molarity' && this.base_molarity > 0) {
      this.calculateAmountAsUsed();
    }

    if (type === 'stock_activity_ul' && this.base_stock_activity_ul > 0) {
      this.calculateActivity();
    }

    if (type === 'stock_activity_ug' && this.base_stock_activity_ug > 0) {
      this.calculateActivityByWeight();
    }
  }

  calculateActivity() {
    if (this.base_stock_activity_ul === 0 || this.base_volume_as_used === 0) { return null; }

    this._activity = convertUnits(
      parseFloat((this.base_volume_as_used * this.base_stock_activity_ul).toFixed(8)),
      this.default_units.activity,
      this.activity_unit
    );
    this._base_activity =
      convertUnits(this._activity, this.activity_unit, this.default_units.activity);
  }

  calculateActivityByWeight() {
    if (this.base_stock_activity_ug === 0 || this.base_amount_as_used_weight === 0) { return null; }

    this._activity = convertUnits(
      parseFloat((this.base_amount_as_used_weight * this.base_stock_activity_ug).toFixed(8)),
      this.default_units.activity,
      this.activity_unit
    );
    this._base_activity =
      convertUnits(this._activity, this.activity_unit, this.default_units.activity);
  }

  calculateAmountAsUsed() {
    if (this.base_volume_as_used === 0 || this.base_molarity === 0) { return null; }

    this._amount_as_used = convertUnits(
      parseFloat((this.base_volume_as_used * this.base_molarity).toFixed(8)),
      this.default_units.amount_as_used,
      this.amount_as_used_unit
    );
    this._base_amount_as_used =
      convertUnits(this._amount_as_used, this.amount_as_used_unit, this.default_units.amount_as_used);
  }

  calculateVolumeByActivity() {
    if (this.base_stock_activity_ul === 0 || this.base_activity === 0) { return null; }

    this._volume_as_used = convertUnits(
      parseFloat((this.base_activity / this.base_stock_activity_ul).toFixed(8)),
      this.default_units.volume_as_used,
      this.volume_as_used_unit
    );
    this._base_volume_as_used =
      convertUnits(this._volume_as_used, this.volume_as_used_unit, this.default_units.volume_as_used);
  }

  calculateVolumeByAmount() {
    if (this.base_molarity === 0 || this.base_amount_as_used === 0) { return null; }

    this._volume_as_used = convertUnits(
      parseFloat((this.base_amount_as_used / this.base_molarity).toFixed(8)),
      this.default_units.volume_as_used,
      this.volume_as_used_unit
    );
    this._base_volume_as_used =
      convertUnits(this._volume_as_used, this.volume_as_used_unit, this.default_units.volume_as_used);
  }

  get activity() {
    return this._activity;
  }

  set activity(value) {
    this._activity = value;
    this._base_activity = convertUnits(this.activity, this._activity_unit, this.default_units.activity);
    this.calculateValues('activity');
  }

  get base_activity() {
    return this._base_activity || 0;
  }

  set base_activity(value) {
    this._base_activity = value;
  }

  get activity_unit() {
    return this._activity_unit || this.default_units.activity;
  }

  set activity_unit(value) {
    this._activity = convertUnits(this.activity, this.activity_unit, value);
    this._activity_unit = value;
  }

  get amount_as_used() {
    return this._amount_as_used;
  }

  set amount_as_used(value) {
    this._amount_as_used = value;
    this._base_amount_as_used =
      convertUnits(this.amount_as_used, this.amount_as_used_unit, this.default_units.amount_as_used);

    this._amount_as_used_weight = '';
    this._base_amount_as_used_weight = 0;

    this.calculateValues('amount_as_used');
  }

  get base_amount_as_used() {
    return this._base_amount_as_used || 0;
  }

  set base_amount_as_used(value) {
    this._base_amount_as_used = value;
  }

  get amount_as_used_unit() {
    return this._amount_as_used_unit || this.default_units.amount_as_used;
  }

  set amount_as_used_unit(value) {
    this._amount_as_used = convertUnits(this.amount_as_used, this.amount_as_used_unit, value);
    this._amount_as_used_unit = value;
  }

  get amount_as_used_weight() {
    return this._amount_as_used_weight;
  }

  set amount_as_used_weight(value) {
    this._amount_as_used_weight = value;
    this._base_amount_as_used_weight =
      convertUnits(this.amount_as_used_weight, this.amount_as_used_weight_unit, this.default_units.amount_as_used_weight);

    this._amount_as_used = '';
    this._base_amount_as_used = 0;

    this.calculateValues('amount_as_used_weight');
  }

  get base_amount_as_used_weight() {
    return this._base_amount_as_used_weight || 0;
  }

  set base_amount_as_used_weight(value) {
    this._base_amount_as_used_weight = value;
  }

  get amount_as_used_weight_unit() {
    return this._amount_as_used_weight_unit || this.default_units.amount_as_used_weight;
  }

  set amount_as_used_weight_unit(value) {
    this._amount_as_used_weight = convertUnits(this.amount_as_used_weight, this.amount_as_used_weight_unit, value);
    this._amount_as_used_weight_unit = value;
  }

  get concentration() {
    return this._concentration;
  }

  set concentration(value) {
    this._concentration = value;
  }

  get concentration_unit() {
    return this._concentration_unit || this.default_units.concentration;
  }

  set concentration_unit(value) {
    this._concentration = convertUnits(this.concentration, this.concentration_unit, value);
    this._concentration_unit = value;
  }

  get function_or_application() {
    return this._function_or_application;
  }

  set function_or_application(value) {
    this._function_or_application = value;
  }

  get molarity() {
    return this._molarity;
  }

  set molarity(value) {
    this._molarity = value;
    this._base_molarity = convertUnits(this.molarity, this.molarity_unit, this.default_units.molarity);
    this.calculateValues('molarity');
  }

  get base_molarity() {
    return this._base_molarity || 0;
  }

  set base_molarity(value) {
    this._base_molarity = value;
  }

  get molarity_unit() {
    return this._molarity_unit || this.default_units.molarity;
  }

  set molarity_unit(value) {
    this._molarity = convertUnits(this.molarity, this.molarity_unit, value);
    this._molarity_unit = value;
  }

  get stock_activity_ul() {
    return this._stock_activity_ul;
  }

  set stock_activity_ul(value) {
    this._stock_activity_ul = value;
    this._base_stock_activity_ul =
      convertUnits(this.stock_activity_ul, this.stock_activity_ul_unit, this.default_units.stock_activity_ul);
    
    this._stock_activity_ug = '';
    this._base_stock_activity_ug = 0;
    
    this.calculateValues('stock_activity_ul');
  }

  get base_stock_activity_ul() {
    return this._base_stock_activity_ul || 0;
  }

  set base_stock_activity_ul(value) {
    this._base_stock_activity_ul = value;
  }

  get stock_activity_ul_unit() {
    return this._stock_activity_ul_unit || this.default_units.stock_activity_ul;
  }

  set stock_activity_ul_unit(value) {
    this._stock_activity_ul = convertUnits(this.stock_activity_ul, this.stock_activity_ul_unit, value);
    this._stock_activity_ul_unit = value;
  }

  get stock_activity_ug() {
    return this._stock_activity_ug;
  }

  set stock_activity_ug(value) {
    this._stock_activity_ug = value;
    this._base_stock_activity_ug =
      convertUnits(this.stock_activity_ug, this.stock_activity_ug_unit, this.default_units.stock_activity_ug);
    
    this._stock_activity_ul = '';
    this._base_stock_activity_ul = 0;

    this.calculateValues('stock_activity_ug');
  }

  get base_stock_activity_ug() {
    return this._base_stock_activity_ug || 0;
  }

  set base_stock_activity_ug(value) {
    this._base_stock_activity_ug = value;
  }

  get stock_activity_ug_unit() {
    return this._stock_activity_ug_unit || this.default_units.stock_activity_ug;
  }

  set stock_activity_ug_unit(value) {
    this._stock_activity_ug = convertUnits(this.stock_activity_ug, this.stock_activity_ug_unit, value);
    this._stock_activity_ug_unit = value;
  }

  get volume_as_used() {
    return this._volume_as_used;
  }

  set volume_as_used(value) {
    this._volume_as_used = value;
    this._base_volume_as_used =
      convertUnits(this.volume_as_used, this.volume_as_used_unit, this.default_units.volume_as_used);
    this.calculateValues('volume_as_used');
  }

  get base_volume_as_used() {
    return this._base_volume_as_used || 0;
  }

  set base_volume_as_used(value) {
    this._base_volume_as_used = value;
  }

  get volume_as_used_unit() {
    return this._volume_as_used_unit || this.default_units.volume_as_used;
  }

  set volume_as_used_unit(value) {
    this._volume_as_used = convertUnits(this.volume_as_used, this.volume_as_used_unit, value);
    this._volume_as_used_unit = value;
  }

  static buildEmpty(collectionID) {
    return new SequenceBasedMacromolecule({
      collection_id: collectionID,
      type: 'sequence_based_macromolecule',
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
      activity: this.activity,
      activity_unit: this.activity_unit,
      amount_as_used: this.amount_as_used,
      amount_as_used_unit: this.amount_as_used_unit,
      amount_as_used_weight: this.amount_as_used_weight,
      amount_as_used_weight_unit: this.amount_as_used_weight_unit,
      concentration: this.concentration,
      concentration_unit: this.concentration_unit,
      function_or_application: this.function_or_application,
      molarity: this.molarity,
      molarity_unit: this.molarity_unit,
      stock_activity_ug: this.stock_activity_ug,
      stock_activity_ug_unit: this.stock_activity_ug_unit,
      stock_activity_ul: this.stock_activity_ul,
      stock_activity_ul_unit: this.stock_activity_ul_unit,
      volume_as_used: this.volume_as_used,
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

  //   return new SequenceBasedMacromolecule;
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
