/* eslint-disable no-underscore-dangle */
/* eslint-disable camelcase */
import React from 'react';
import _ from 'lodash';

import Element from 'src/models/Element';
import Molecule from 'src/models/Molecule';
import UserStore from 'src/stores/alt/stores/UserStore';
import Container from 'src/models/Container';
import Segment from 'src/models/Segment';
import GasPhaseReactionStore from 'src/stores/alt/stores/GasPhaseReactionStore';
import {
  convertTemperatureToKelvin,
  calculateVolumeForFeedstockOrGas,
  calculateGasMoles,
  updateFeedstockMoles,
  calculateTON,
  calculateTONPerTimeValue,
  determineTONFrequencyValue,
} from 'src/utilities/UnitsConversion';

const prepareRangeBound = (args = {}, field) => {
  const argsNew = args;
  if (args[field] && typeof args[field] === 'string') {
    const bounds = args[field].split(/\.{2,3}/);
    if (!args[`${field}_upperbound`]) {
      argsNew[`${field}_upperbound`] = Number.POSITIVE_INFINITY === Number(bounds[1]) ? null : Number(bounds[1]);
    }
    if (!args[`${field}_lowerbound`]) {
      argsNew[`${field}_lowerbound`] = Number.NEGATIVE_INFINITY === Number(bounds[0]) ? null : Number(bounds[0]);
    }
    if (argsNew[`${field}_upperbound`] == null || argsNew[`${field}_upperbound`] == null) {
      argsNew[`${field}_display`] = (argsNew[`${field}_lowerbound`] || '').toString().trim();
    } else {
      argsNew[`${field}_display`] = ((argsNew[`${field}_lowerbound`] || '')
        .toString().concat(' – ', argsNew[`${field}_upperbound`])).trim();
    }
  }
  return argsNew;
};

export default class Sample extends Element {
  // isMethodRestricted(m) {
  //   return false;
  // }
  
  constructor(args) {
    let argsNew = args;
    argsNew = prepareRangeBound(argsNew, 'boiling_point');
    argsNew = prepareRangeBound(argsNew, 'melting_point');
    super(argsNew);
  }
  
  cleanBoilingMelting() {
    this.boiling_point = null;
    this.melting_point = null;
  }
  
  static copyFromSampleAndCollectionId(
    sample,
    collection_id,
    structure_only = false,
    keepResidueInfo = false,
    keepExternalLabel = true
  ) {
    const newSample = sample.buildCopy();
    newSample.collection_id = collection_id;
    if (sample.name) { newSample.name = sample.name; }
    if (sample.external_label) { newSample.external_label = sample.external_label; }
    if (structure_only) {
      newSample.filterSampleData();
      newSample.filterResidueData(true);
      // reset boiling/melting points for products on reaction copy
      newSample.updateRange('boiling_point', '', '');
      newSample.updateRange('melting_point', '', '');
    } else {
      newSample.filterResidueData(keepResidueInfo);
    }
    
    if (keepExternalLabel == false) {
      newSample.external_label = '';
    }
    
    if (sample.elemental_compositions) {
      newSample.elemental_compositions = sample.elemental_compositions;
    }

    if (sample.gas_type) {
      newSample.gas_type = sample.gas_type;
    }

    if (sample.gas_phase_data) {
      newSample.gas_phase_data = sample.gas_phase_data;
    }

    newSample.filterElementalComposition();
    newSample.segments = Segment.buildCopy(sample.segments);
    return newSample;
  }
  
  filterElementalComposition() {
    const elemComp = (this.elemental_compositions || []).find((item) => {
      if (item.composition_type == 'formula') {
        item.id = null;
        return item;
      }
    });
    this.elemental_compositions = elemComp ? [elemComp] : [];
    this.elemental_compositions.push({
      composition_type: 'found',
      data: {},
      description: 'Experimental'
    });
    return this;
  }
  
  setDefaultResidue() {
    // set default polymer data
    this.residues = [
      {
        residue_type: 'polymer',
        custom_info: {
          formula: 'CH',
          loading: null,
          polymer_type: (this.decoupled ? 'self_defined' : 'polystyrene'),
          loading_type: 'external',
          external_loading: 0.0,
          reaction_product: (this.reaction_product ? true : null),
          cross_linkage: null
        }
      }
    ];
  }
  
  filterResidueData(keepResidueInfo = false) {
    if (this.contains_residues) {
      if (keepResidueInfo) {
        // only reset loading
        this.residues.map((residue) => {
          Object.assign(residue.custom_info, {
            external_loading: 0.0,
            loading: null,
            loading_type: 'external'
          });
        });
      } else {
        // set default polymer data
        this.residues.map((residue) => {
          Object.assign(residue, {
            residue_type: 'polymer',
            custom_info: {
              formula: 'CH',
              loading: (residue.custom_info ? residue.custom_info.loading : null),
              polymer_type: (this.decoupled ? 'self_defined' : 'polystyrene'),
              loading_type: 'external',
              external_loading: 0.0,
              reaction_product: (this.reaction_product ? true : null),
              cross_linkage: null
            }
          });
        });
      }
    }
    return this;
  }
  
  filterSampleData() {
    // reset to default values
    this.target_amount_value = 0;
    this.real_amount_value = 0;
    this.description = '';
    this.purity = 1;
    this.equivalent = 0;
    this.imported_readout = '';
    
    return this;
  }
  
  static buildNewShortLabel() {
    const { currentUser } = UserStore.getState();
    if (!currentUser) { return 'NEW SAMPLE'; }
    return `${currentUser.initials}-${currentUser.samples_count + 1}`;
  }
  
  static defaultStereo() {
    return { abs: 'any', rel: 'any' };
  }
  
  static buildEmpty(collection_id) {
    const sample = new Sample({
      collection_id,
      type: 'sample',
      external_label: '',
      target_amount_value: 0,
      target_amount_unit: 'g',
      molarity_value: 0,
      molarity_unit: 'M',
      metrics: 'mmmm',
      description: '',
      purity: 1,
      density: 0,
      solvent: [],
      location: '',
      molfile: '',
      molecule: { id: '_none_' },
      residues: [],
      elemental_compositions: [{
        composition_type: 'found',
        data: {}
      }],
      imported_readout: '',
      attached_amount_mg: '', // field for polymers calculations
      container: Container.init(),
      can_update: true,
      can_copy: false,
      stereo: Sample.defaultStereo(),
      decoupled: false,
      inventory_sample: false,
      molecular_mass: 0,
      sum_formula: '',
      xref: {},
      gas_type: 'off',
    });
    
    sample.short_label = Sample.buildNewShortLabel();
    return sample;
  }

  getMoleculeId() {
    if (this.decoupled && this.molfile) {
      return `M${this.id}`;
    } else if (this.stereo == null) {
      return `M${this.molecule.id}_any_any`;
    } else {
      return `M${this.molecule.id}_${this.stereo.abs || 'any'}_${this.stereo.rel || 'any'}`;
    }
  }

  isNoStructureSample() {
    return this.molecule?.inchikey === 'DUMMY' && this.molfile == null;
  }

  getChildrenCount() {
    return parseInt(Sample.children_count[this.id] || this.children_count, 10);
  }
  
  buildSplitShortLabel() {
    const children_count = this.getChildrenCount() + 1;
    return `${this.short_label}-${children_count}`;
  }
  
  buildCopy() {
    const sample = super.buildCopy();
    sample.short_label = Sample.buildNewShortLabel();
    sample.container = Container.init();
    sample.can_update = true;
    sample.can_copy = false;
    sample.gas_type = 'off';
    return sample;
  }
  
  static buildNew(sample, collectionId, matGroup = null) {
    const newSample = Sample.buildEmpty(collectionId);
    
    if (matGroup === 'reactants' || matGroup === 'solvents') {
      newSample.short_label = matGroup.slice(0, -1);
    }
    if (sample instanceof Sample) {
      newSample.molecule = sample.molecule;
      newSample.sample_svg_file = sample.sample_svg_file;
    } else {
      newSample.molecule = sample;
    }
    if (sample.stereo) {
      const { abs, rel } = sample.stereo;
      newSample.stereo = { abs, rel };
    }
    newSample.residues = sample.residues || [];
    newSample.contains_residues = sample.contains_residues;
    newSample.filterResidueData(true);
    newSample.density = sample.density;
    newSample.metrics = sample.metrics;
    newSample.molfile = sample.molfile || '';
    newSample.gas_type = 'off';
    return newSample;
  }
  
  buildChild() {
    Sample.counter += 1;
    const splitSample = this.buildChildWithoutCounter();
    splitSample.short_label = splitSample.split_label;
    Sample.children_count[this.id] = this.getChildrenCount() + 1;
    
    return splitSample;
  }
  
  buildChildWithoutCounter() {
    const splitSample = this.clone();
    splitSample.parent_id = this.id;
    splitSample.id = Element.buildID();
    
    if (this.name) { splitSample.name = this.name; }
    if (this.external_label) { splitSample.external_label = this.external_label; }
    if (this.elemental_compositions) {
      splitSample.elemental_compositions = this.elemental_compositions;
    }
    splitSample.created_at = null;
    splitSample.updated_at = null;
    splitSample.target_amount_value = 0;
    splitSample.real_amount_value = null;
    splitSample.is_split = true;
    splitSample.is_new = true;
    splitSample.split_label = splitSample.buildSplitShortLabel();
    // Todo ???
    splitSample.container = Container.init();
    splitSample.gas_type = 'off';
    return splitSample;
  }
  
  get isSplit() {
    return this.is_split;
  }
  
  set isSplit(is_split) {
    this.is_split = is_split;
  }
  
  serialize() {
    const serialized = super.serialize({
      name: this.name,
      external_label: this.external_label,
      target_amount_value: this.target_amount_value,
      target_amount_unit: this.target_amount_unit,
      real_amount_value: this.real_amount_value,
      real_amount_unit: this.real_amount_unit,
      molarity_value: this.molarity_value,
      molarity_unit: this.molarity_unit,
      description: this.description,
      purity: this.purity,
      short_label: this.short_label,
      solvent: this.solvent,
      location: this.location,
      molfile: this.molfile,
      molecule: this.molecule && this.molecule.serialize(),
      molecule_id: this.molecule && (this.molecule.id === '_none_' ? null : this.molecule.id),
      molecule_name_id: this.molecule_name && this.molecule_name.value,
      sample_svg_file: this.sample_svg_file,
      is_top_secret: this.is_top_secret || false,
      dry_solvent: this.dry_solvent,
      parent_id: this.parent_id,
      density: this.density,
      metrics: this.metrics,
      boiling_point_upperbound: this.boiling_point_upperbound,
      boiling_point_lowerbound: this.boiling_point_lowerbound,
      melting_point_upperbound: this.melting_point_upperbound,
      melting_point_lowerbound: this.melting_point_lowerbound,
      residues: this.residues,
      elemental_compositions: this.elemental_compositions,
      is_split: this.is_split || false,
      is_new: this.is_new,
      imported_readout: this.imported_readout,
      container: this.container,
      xref: this.xref,
      stereo: this.stereo,
      user_labels: this.user_labels || [],
      decoupled: this.decoupled,
      molecular_mass: this.molecular_mass,
      sum_formula: this.sum_formula,
      inventory_sample: this.inventory_sample,
      segments: this.segments.map((s) => s.serialize()),
    });
    
    return serialized;
  }
  
  get is_top_secret() {
    return this._is_top_secret;
  }
  
  set is_top_secret(is_top_secret) {
    this._is_top_secret = is_top_secret;
  }
  
  get dry_solvent() {
    return this._dry_solvent;
  }
  
  set dry_solvent(dry_solvent) {
    this._dry_solvent = dry_solvent;
  }
  
  set contains_residues(value) {
    this._contains_residues = value;
    if (value) {
      if (!this.residues.length) {
        this.setDefaultResidue();
      } else {
        this.residues[0]._destroy = undefined;
      }
      
      this.elemental_compositions.map((item) => {
        if (item.composition_type == 'formula') { item._destroy = true; }
      });
    } else {
      // this.sample_svg_file = '';
      if (this.residues.length) { this.residues[0]._destroy = true; } // delete residue info
      
      this.elemental_compositions.map((item) => {
        if (item.composition_type == 'loading') { item._destroy = true; }
      });
    }
  }
  
  get contains_residues() {
    return this._contains_residues;
  }
  
  title() {
    const { profile } = UserStore.getState();
    const show_external_name = profile ? profile.show_external_name : false;
    const show_sample_name = profile ? profile.show_sample_name : false;
    const { external_label } = this;
    const extLabelClass = 'label--bold';
    const { name } = this;
    const { short_label } = this;
    
    if (show_external_name) {
      return (external_label ? <span className={extLabelClass}>{external_label}</span> : short_label);
    } if (show_sample_name) {
      return (name ? <span className={extLabelClass}>{name}</span> : short_label);
    }
    return short_label;
  }
  
  get molecule_name_label() {
    return this.molecule_name_hash && this.molecule_name_hash.label;
  }
  
  get molecule_name() {
    return this.molecule_name_hash;
  }
  
  set molecule_name(mno) {
    this.molecule_name_hash = mno;
  }
  
  get name() {
    return this._name;
  }
  
  set name(name) {
    this._name = name;
  }
  
  get short_label() {
    return this._short_label;
  }
  
  set short_label(short_label) {
    this._short_label = short_label;
  }
  
  get external_label() {
    return this._external_label;
  }
  
  set external_label(label) {
    this._external_label = label;
  }
  
  get preferred_label() {
    return this._external_label || this.molecule.iupac_name || this.molecule_formula;
  }
  
  set preferred_label(label) {
    this._preferred_label = label;
  }
  
  set segments(segments) {
    this._segments = (segments && segments.map((s) => new Segment(s))) || [];
  }
  
  get segments() {
    return this._segments || [];
  }
  
  showedName() {
    return this.showed_name;
  }
  
  userLabels() {
    return this.user_labels;
  }
  
  iupac_name_tag(length) {
    const iupac_name = this.molecule.iupac_name || '';
    return iupac_name.length > length
      ? `${iupac_name.slice(0, length)}...`
      : iupac_name;
  }
  
  get location() {
    return this._location;
  }
  
  set location(location) {
    this._location = location;
  }
  
  get description() {
    return this._description;
  }
  
  set description(description) {
    this._description = description;
  }
  
  get metrics() {
    return this._metrics || 'mmmm';
  }
  
  set metrics(metrics) {
    this._metrics = metrics;
  }
  
  get molarity_value() {
    return this._molarity_value;
  }
  
  set molarity_value(molarity_value) {
    this._molarity_value = molarity_value;
  }
  
  get molarity_unit() {
    return this._molarity_unit;
  }
  
  set molarity_unit(molarity_unit) {
    this._molarity_unit = molarity_unit;
  }
  
  get imported_readout() {
    return this._imported_readout;
  }
  
  set imported_readout(imported_readout) {
    this._imported_readout = imported_readout;
  }
  
  updateRange(field, lower, upper) {
    this[`${field}_lowerbound`] = lower;
    this[`${field}_upperbound`] = upper;
    if (lower === '' && upper === '') {
      this[`${field}_display`] = lower.toString();
      this[field] = lower.toString();
    } else if (lower === upper) {
      this[`${field}_upperbound`] = '';
      this[`${field}_display`] = lower.toString();
      this[field] = lower.toString().concat('...', Number.POSITIVE_INFINITY);
    } else {
      this[`${field}_display`] = (lower.toString().concat(' – ', upper)).trim();
      this[field] = lower.toString().concat('..', upper);
    }
  }
  
  setAmount(amount) {
    if (amount.unit && !isNaN(amount.value)) {
      this.amount_value = amount.value;
      this.amount_unit = amount.unit;
    }
  }

  setUnitMetrics(unit, metricPrefix) {
    const mp = metricPrefix || 'm';
    if (unit === 'l') {
      this.metrics = (this.metrics && this.metrics.replace(/(.{1}).{1}/, `$1${mp}`)) || 'mmmm';
    } else if (unit === 'mol') {
      this.metrics = (this.metrics && this.metrics.replace(/(.{2}).{1}/, `$1${mp}`)) || 'mmmm';
    } else if (unit === 'mol/l') {
      if (this.metrics && this.metrics.length === 3) {
        this.metrics += mp;
      } else {
        this.metrics = (this.metrics && this.metrics.replace(/(.{3}).{1}/, `$1${mp}`)) || 'mmmm';
      }
    } else {
      this.metrics = (this.metrics && this.metrics.replace(/(.{0}).{1}/, `$1${mp}`)) || 'mmmm';
    }
  }
  
  setAmountAndNormalizeToGram(amount) {
    this.amount_value = this.convertToGram(amount.value, amount.unit);
    this.amount_unit = 'g';
  }
  
  setMetrics(metrics) {
    this.metrics = metrics.value;
  }
  
  setDensity(density) {
    this.density = density.value;
    this.molarity_value = 0;
  }
  
  setMolecularMass(mass) {
    this.molecular_mass = mass.value;
  }
  
  setUserLabels(userLabels) {
    this.user_labels = userLabels;
  }
  
  setMolarity(molarity) {
    this.molarity_value = molarity.value;
    this.molarity_unit = molarity.unit;
    this.density = 0;
  }
  
  get amountType() {
    return this._current_amount_type || this.defaultAmountType();
  }
  
  set amountType(amount_type) {
    this._current_amount_type = amount_type;
  }
  
  defaultAmountType() {
    return (this.real_amount_value ? 'real' : 'target');
  }
  
  get defined_part_amount() {
    const mw = this.molecule_molecular_weight;
    return this.amount_mol * mw / 1000.0;
  }
  
  // amount proxy
  
  get amount() {
    return ({
      value: this.amount_value,
      unit: this.amount_unit
    });
  }
  
  get amount_value() {
    return this.amountType === 'real' ? this.real_amount_value : this.target_amount_value;
  }
  
  set amount_value(amount_value) {
    if (this.amountType === 'real') {
      this.real_amount_value = amount_value;
    } else {
      this.target_amount_value = amount_value;
    }
  }
  
  get amount_unit() {
    return (this.amountType === 'real' ? this.real_amount_unit : this.target_amount_unit) || 'g';
  }
  
  set amount_unit(amount_unit) {
    if (this.amountType === 'real') {
      this.real_amount_unit = amount_unit;
    } else {
      this.target_amount_unit = amount_unit;
    }
  }
  
  get has_molarity() {
    return this.molarity_value > 0 && this.density === 0;
  }
  
  get has_density() {
    return this.density > 0 && this.molarity_value === 0;
  }
  
  // target amount
  
  get target_amount_value() {
    return this._target_amount_value;
  }
  
  set target_amount_value(amount_value) {
    this._target_amount_value = amount_value;
  }
  
  get target_amount_unit() {
    return this._target_amount_unit || 'g';
  }
  
  set target_amount_unit(amount_unit) {
    this._target_amount_unit = amount_unit;
  }
  
  // real amount
  
  get real_amount_value() {
    return this._real_amount_value;
  }
  
  set real_amount_value(amount_value) {
    this._real_amount_value = amount_value;
  }
  
  get real_amount_unit() {
    return this._real_amount_unit || 'g';
  }
  
  set real_amount_unit(amount_unit) {
    this._real_amount_unit = amount_unit;
  }

  get amount_g() {
    return this.convertToGram(this.amount_value, this.amount_unit);
  }

  get amount_l() {
    if (this.amount_unit === 'l') return this.amount_value;
    return this.convertGramToUnit(this.amount_g, 'l');
  }

  get amount_mol() {
    if (this.amount_unit === 'mol' && (this.gas_type === 'gas'
    || this.gas_type === 'feedstock')) return this.amount_value;
    return this.convertGramToUnit(this.amount_g, 'mol');
  }

  calculateFeedstockOrGasMoles(purity, gasType, amountLiter = null) {
    // number of moles for feedstock = Purity*1*Volume/(0.0821*294) & pressure = 1
    // number of moles for gas =  ppm*1*V/(0.0821*temp_in_K*1000000) & pressure = 1
    if (gasType === 'gas') {
      const vesselSize = this.fetchReactionVesselSizeFromStore();
      return this.updateGasMoles(vesselSize);
    }
    return updateFeedstockMoles(purity, amountLiter, this.amount_l);
  }

  // eslint-disable-next-line class-methods-use-this
  fetchReactionVesselSizeFromStore() {
    const gasPhaseStore = GasPhaseReactionStore.getState();
    return gasPhaseStore.reactionVesselSizeValue;
  }

  updateGasMoles(volume) {
    const { part_per_million, temperature } = this.gas_phase_data;
    const temperatureInKelvin = convertTemperatureToKelvin(temperature);

    if (!temperatureInKelvin || temperatureInKelvin === 0 || !part_per_million || part_per_million === 0
      || !volume) {
      this.updateTONValue(null);
      return null;
    }

    const moles = calculateGasMoles(volume, part_per_million, temperatureInKelvin);
    this.updateTONValue(moles);
    return moles;
  }

  updateTONPerTimeValue(tonValue, gasPhaseTime) {
    const { value, unit } = gasPhaseTime;
    const tonFrequencyUnit = this.gas_phase_data.turnover_frequency.unit;

    const timeValues = calculateTONPerTimeValue(value, unit);

    this.gas_phase_data.turnover_frequency.value = determineTONFrequencyValue(
      tonValue,
      tonFrequencyUnit,
      timeValues,
      value
    );
  }

  // eslint-disable-next-line class-methods-use-this
  fetchCatalystMoleFromStore() {
    const gasPhaseStore = GasPhaseReactionStore.getState();
    return gasPhaseStore.catalystReferenceMolValue;
  }

  updateTONValue(moles) {
    if (this.gas_phase_data) {
      const moleOfCatalystReference = this.fetchCatalystMoleFromStore();
      const value = calculateTON(moles, moleOfCatalystReference);
      this.gas_phase_data.turnover_number = value;
      const gasPhaseTime = this.gas_phase_data.time;
      this.updateTONPerTimeValue(value, gasPhaseTime);
    }
  }
  // Menge in mmol = Menge (mg) * Reinheit  / Molmasse (g/mol)
  // Volumen (ml) = Menge (mg) / Dichte (g/ml) / 1000
  // Menge (mg)  = Volumen (ml) * Dichte (g/ml) * 1000
  // Menge (mg) = Menge (mmol)  * Molmasse (g/mol) / Reinheit

  convertGramToUnit(amount_g = 0, unit) {
    const purity = this.purity || 1.0;
    const molecularWeight = this.molecule_molecular_weight;
    if (this.contains_residues) {
      const { loading } = this.residues[0].custom_info;
      switch (unit) {
        case 'g':
          return amount_g;
        case 'mol':
          return (loading * amount_g) / 1000.0; // loading is always in mmol/g
        default:
          return amount_g;
      }
    } else {
      switch (unit) {
        case 'g':
          return amount_g;
        case 'l': {
          if (this.gas_type && this.gas_type !== 'off' && this.gas_type !== 'catalyst') {
            return calculateVolumeForFeedstockOrGas(
              amount_g,
              molecularWeight,
              purity,
              this.gas_type,
              this.gas_phase_data
            );
          }
          if (this.has_molarity) {
            const molarity = this.molarity_value;
            return (amount_g * purity) / (molarity * molecularWeight);
          } if (this.has_density) {
            const { density } = this;
            return amount_g / (density * 1000);
          }
          return 0;
        }
        case 'mol': {
          if (this.gas_type && this.gas_type !== 'off' && this.gas_type !== 'catalyst') {
            return this.calculateFeedstockOrGasMoles(purity, this.gas_type);
          }
          if (this.has_molarity) {
            return this.amount_l * this.molarity_value;
          }
          return (amount_g * purity) / molecularWeight;
        }
        default:
          return amount_g;
      }
    }
  }
      
  convertToGram(amount_value, amount_unit) {
    if (this.contains_residues) {
      const amountValue = amount_value;
      switch (amount_unit) {
        case 'g':
          return amountValue;
        case 'mg':
          return amountValue / 1000.0;
        case 'mol': {
          const { loading } = this.residues[0].custom_info;
          if (!loading) return 0.0;
              
          return (amountValue / loading) * 1000.0;
        }
        default:
          return amountValue;
      }
    } else {
      switch (amount_unit) {
        case 'g':
          return amount_value;
        case 'mg':
          return amount_value / 1000.0;
        case 'l': {
          // amount in  gram for feedstock gas material is calculated according to equation of molecular weight x moles
          if (this.gas_type && this.gas_type !== 'off' && this.gas_type !== 'catalyst') {
            const molecularWeight = this.molecule_molecular_weight;
            const purity = this.purity || 1.0;
            const moles = this.calculateFeedstockOrGasMoles(purity, this.gas_type, amount_value);
            return moles * molecularWeight;
          }
          if (this.has_molarity) {
            const molecularWeight = this.molecule_molecular_weight;
            return amount_value * this.molarity_value * molecularWeight;
          } if (this.has_density) {
            return amount_value * (this.density || 1.0) * 1000;
          }
          return 0;
        }
        case 'mol': {
          const molecularWeight = this.molecule_molecular_weight;
          return (amount_value / (this.purity || 1.0)) * molecularWeight;
        }
        default:
          return amount_value;
      }
    }
  }
      
  get molecule_iupac_name() {
    return this.molecule_name_hash && this.molecule_name_hash.label
        || this.molecule && this.molecule.iupac_name;
  }
      
  set molecule_iupac_name(iupac_name) {
    this.molecule.iupac_name = iupac_name;
  }
      
  get molecule_molecular_weight() {
    if (this.decoupled) {
      return this.molecular_mass;
    }
        
    return this.molecule && this.molecule.molecular_weight;
  }
      
  get molecule_exact_molecular_weight() {
    return !this.decoupled && this.molecule && this.molecule.exact_molecular_weight;
  }
      
  get molecule_formula() {
    if (this.decoupled) {
      return (this.sum_formula && this.sum_formula.length) ? this.sum_formula : '';
    }
        
    return this.molecule && this.molecule.sum_formular;
  }
      
  get molecule_inchistring() {
    return this.molecule && this.molecule.inchistring;
  }
      
  get molecule_inchikey() {
    return this.molecule && this.molecule.inchikey;
  }
      
  get molecule_cano_smiles() {
    return this.molecule && this.molecule.cano_smiles;
  }
      
  get purity() {
    return this._purity;
  }
      
  set purity(purity) {
    this._purity = purity;
  }
      
  get molecule() {
    return this._molecule;
  }
      
  set molecule(molecule) {
    this._molecule = new Molecule(molecule);
    if (molecule.temp_svg) { this.sample_svg_file = molecule.temp_svg; }
  }
      
  get polymer_formula() {
    return this.contains_residues && this.residues[0].custom_info.formula.toString();
  }
      
  get concat_formula() {
    if (!this.molecule_formula) {
      return '';
    }
        
    if (this.contains_residues) {
      return this.molecule_formula + this.polymer_formula;
    }
        
    return this.molecule_formula;
  }
      
  get polymer_type() {
    if (this.contains_residues) {
      const info = this.residues[0].custom_info;
      return (info.polymer_type ? info.polymer_type : info.surface_type).toString();
    }
    return false;
  }
      
  get loading() {
    if (this.contains_residues) {
      return this.residues[0].custom_info.loading;
    }
    return false;
  }
      
  set loading(loading) {
    if (this.contains_residues) { this.residues[0].custom_info.loading = loading; }
  }
      
  get external_loading() {
    if (this.contains_residues) {
      return this.residues[0].custom_info.external_loading;
    }
    return false;
  }
      
  set external_loading(loading) {
    if (this.contains_residues) {
      this.residues[0].custom_info.external_loading = loading;
    }
  }
      
  get error_loading() {
    // TODO: temporary disabled
    // return this.contains_residues && !this.loading && !this.reaction_product;
    return false;
  }
      
  get isValid() {
    return (this && ((this.molfile && !this.decoupled) || this.decoupled)
        && !this.error_loading && !this.error_polymer_type);
  }
      
  get svgPath() {
    if (this.show_label) {
      return `svg_text/${this.labelText}`;
    }
        
    if (this.sample_svg_file) {
      if (this.sample_svg_file === '***') {
        return '/images/wild_card/no_image_180.svg';
      }
      return `/images/samples/${this.sample_svg_file}`;
    }
    return this.molecule && this.molecule.molecule_svg_file
      ? `/images/molecules/${this.molecule.molecule_svg_file}` : '';
  }
  // todo: have a dedicated Material Sample subclass
      
  get labelText() {
    return this.name || this.molecule_formula || this.molecule.iupac_name;
  }
      
  set equivalent(equivalent) {
    this._equivalent = equivalent;
  }
      
  get equivalent() {
    return this._equivalent;
  }
      
  set conc(conc) {
    this._conc = conc;
  }
      
  get conc() {
    return this._conc;
  }
      
  set maxAmount(maxAmount) {
    this._maxAmount = maxAmount;
  }
      
  get maxAmount() {
    return this._maxAmount;
  }
      
  serializeMaterial() {
    const params = this.serialize();
    const extra_params = {
      equivalent: this.equivalent,
      position: this.position,
      reference: this.reference || false,
      show_label: (this.decoupled && !this.molfile) ? true : (this.show_label || false),
      waste: this.waste,
      coefficient: this.coefficient,
      gas_type: this.gas_type || false,
      gas_phase_data: this.gas_phase_data,
      conversion_rate: this.conversion_rate,
    };
    _.merge(params, extra_params);
    return params;
  }
      
  // Container & Analyses routines
  addAnalysis(analysis) {
    this.container.children.filter(
      (element) => ~element.container_type.indexOf('analyses')
    )[0].children.push(analysis);
  }
      
  attachments() {
    let target = [];
    this.datasetContainers().forEach((dt) => {
      const atts = dt.attachments;
      target = [...target, ...atts];
    });
    return target;
  }
      
  calculateMaxAmount(referenceSample) {
    const refAmount = referenceSample.amount_mol;
    const sampleCoeff = this.coefficient || 1.0;
    const refCoeff = (referenceSample.coefficient || 1.0);
    const coeffQuotient = sampleCoeff / refCoeff;
        
    this.maxAmount = refAmount * coeffQuotient * this.molecule_molecular_weight;
  }
      
  get solvent() {
    try {
      // handle the old solvent data
      const jsonSolvent = JSON.parse(this._solvent);
      const solv = [];
      if (jsonSolvent) {
        solv.push(jsonSolvent);
      }
      return solv;
    } catch (e) {
      return this._solvent;
    }
  }
      
  set solvent(solvent) {
    this._solvent = solvent;
  }

  set gas_phase_data(gas_phase_data) {
    let initializeGasPhaseData;
    if (gas_phase_data === null || gas_phase_data === undefined) {
      initializeGasPhaseData = {
        time: { unit: 'h', value: null },
        temperature: { unit: 'K', value: null },
        turnover_number: null,
        part_per_million: null,
        turnover_frequency: { unit: 'TON/h', value: null }
      };
    }
    this._gas_phase_data = gas_phase_data || initializeGasPhaseData;
  }

  get gas_phase_data() {
    return this._gas_phase_data;
  }

  get inventory_label() {
    return this.xref.inventory_label;
  }

  set inventory_label(inventory_label) {
    this.xref.inventory_label = inventory_label;
  }

  addSolvent(newSolvent) {
    const { molecule } = newSolvent;
    if (molecule) {
      const tmpSolvents = [];
      if (this.solvent) {
        Object.assign(tmpSolvents, this.solvent);
      }
      const solventData = {
        label: molecule.iupac_name, smiles: molecule.cano_smiles, inchikey: molecule.inchikey, ratio: 1
      };
      const filtered = tmpSolvents.find((solv) => (solv && solv.label === solventData.label
            && solv.smiles === solventData.smiles
            && solv.inchikey && solventData.inchikey));
      if (!filtered) {
        tmpSolvents.push(solventData);
      }
      this.solvent = tmpSolvents;
    }
  }
        
  deleteSolvent(solventToDelete) {
    const tmpSolvents = [];
    if (this.solvent) {
      Object.assign(tmpSolvents, this.solvent);
    }
          
    const filteredIndex = tmpSolvents.findIndex((solv) => (solv.label === solventToDelete.label
            && solv.smiles === solventToDelete.smiles
            && solv.inchikey === solventToDelete.inchikey));
    if (filteredIndex >= 0) {
      tmpSolvents.splice(filteredIndex, 1);
    }
    this.solvent = tmpSolvents;
  }
          
  updateSolvent(solventToUpdate) {
    const tmpSolvents = [];
    if (this.solvent) {
      Object.assign(tmpSolvents, this.solvent);
    }
            
    const filteredIndex = tmpSolvents.findIndex((solv) => (solv.smiles === solventToUpdate.smiles
              && solv.inchikey && solventToUpdate.inchikey));
    if (filteredIndex >= 0) {
      tmpSolvents[filteredIndex] = solventToUpdate;
    }
    this.solvent = tmpSolvents;
  }
}
          
Sample.counter = 0;
Sample.children_count = {};
          