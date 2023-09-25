export default {
  elements: {
    sample: [
      {
        label: '',
        key: 'header', // wird im oberen Berech des samples dargestellt
        rows: [
          {
            cols: 1,
            fields: [
              {
                column: 'xref',
                column_size: 'column', // wie breit soll die Spalte dargestellt werden?
                opt: 'cas',
                key: 'xref-cas',
                label: 'CAS',
                type: 'cas', // spezial feld mit addon, select
                visible: true,
                default: 'CAS number',
                required: false,
                description: '',
              },
            ]
          }
        ],
      },
      {
        label: '', // headline oder leer
        key: 'basic',
        rows: [
          {
            cols: 4, // felder pro reihe
            visible: true,
            key: 'iupac_name_stereo_decoupled',
            fields: [
              {
                column: 'iupac_name', // db feld
                column_size: 'big',
                key: 'iupac_name',
                label: 'Molecule',
                type: 'moleculeSelect', // spezielles select
                visible: true, // für modal zur auswahl, was angezeigt werden soll
                default: 'Molecule name', // default wert im feld
                required: false, // validierung?
                description: '', // mouseover über headline oder icon ...
              },
              {
                column: 'stereo',
                column_size: 'column',
                opt: 'abs', // zusätzliche db Feld Info für jsonb Felder
                key: 'stereo_abs',
                label: 'Stereo Abs',
                type: 'select',
                option_layers: "stereoAbsOptions", // Options für select / checkboxes etc.
                visible: true,
                default: '',
                required: false,
                description: '',
              },
              {
                column: 'stereo',
                column_size: 'column',
                opt: 'rel',
                key: 'stereo_rel',
                label: 'Stereo Rel',
                type: 'select',
                option_layers: "stereoRelOptions",
                label: 'Stereo Rel',
                visible: true,
                default: '',
                required: false,
                description: '',
              },
              {
                column: 'decoupled',
                column_size: 'small',
                key: 'decoupled',
                label: 'Decoupled',
                type: 'checkbox',
                visible: true,
                default: '',
                required: false,
                description: '',
                conditions: { // darf nur unter bestimmten Bedingungen angezeigt werden
                  can_update: true,
                  enable_decoupled: true, // default wird false an form übergeben
                },
              },
            ],
          },
          {
            cols: 3,
            visible: true,
            key: 'name_external_label_xref_inventory_label',
            fields: [
              {
                column: 'name',
                column_size: 'column',
                key: 'name',
                label: 'Name',
                type: 'text',
                visible: true,
                default: 'Name of sample',
                required: false,
                description: '',
              },
              {
                column: 'external_label',
                column_size: 'column',
                key: 'external_label',
                label: 'External Label',
                type: 'text',
                visible: true,
                default: '',
                required: false,
                description: '',
              },
              {
                column: 'xref',
                column_size: 'column',
                opt: 'inventory_label',
                key: 'xref_inventory_label',
                label: 'Inventory label',
                type: 'text',
                visible: true,
                default: '',
                required: false,
                description: '',
              },
            ],
          },
          {
            cols: 2,
            visible: true,
            key: 'molecular_mass_sum_formular',
            fields: [
              {
                column: 'molecular_mass',
                column_size: 'column',
                key: 'molecular_mass',
                label: 'Molecular mass',
                type: 'textWithAddOn', // value wird angepasst aus 2 wird 2.0000 => numeric field
                addon: 'g/mol',
                visible: true,
                default: '',
                required: false,
                description: '',
              },
              {
                column: 'sum_formula',
                column_size: 'column',
                key: 'sum_formula',
                label: 'Sum formula',
                type: 'text',
                visible: true,
                default: '',
                required: false,
                description: '',
              },
            ],
          },
          {
            cols: 3,
            visible: true,
            key: 'target_amount_value_density_molarity_purity',
            fields: [
              {
                column: 'target_amount_value',
                column_size: 'half',
                key: 'target_amount_value',
                label: 'Amount',
                type: 'amount', // 3 Felder mit Berechnungen und Wechsel der Einheit (textWithAddOn)
                // type: 'system-defined',
                // option_layers: 'mass',
                visible: true,
                default: '',
                required: false,
                description: '',
              },
              {
                label: '',
                key: 'density_molarity',
                column: 'density_molarity',
                type: 'tab',
                visible: true,
                sub_fields: [ // wird als verschachtelte tabs dargestellt
                  {
                    column: 'density',
                    column_size: 'quarter',
                    key: 'density',
                    label: 'Density',
                    type: 'textWithAddOn', // value wird angepasst aus 2 wird 2.0000
                    addon: 'g/ml',
                    visible: true,
                    default: '',
                    required: false,
                    description: '',
                  },
                  {
                    column: 'molarity_value',
                    column_size: 'quarter',
                    key: 'molarity_value',
                    label: 'Molarity',
                    type: 'textWithAddOn', // value wird angepasst aus 2 wird 2.0000
                    addon: 'M',
                    visible: true,
                    default: '',
                    required: false,
                    description: '',
                  },
                ],
              },
              {
                column: 'purity',
                column_size: 'quarter',
                key: 'purity',
                label: 'Purity / Concentration',
                type: 'text', // value wird angepasst aus 2 wird 2.0000
                visible: true,
                default: '',
                required: false,
                description: '',
              },
            ],
          },
        ],
      },
      {
        label: 'Properties',
        key: 'properties',
        toggle: true, // Felder können auf und zu geklappt werden
        rows: [
          {
            cols: 3,
            visible: true,
            key: 'boiling_point_melting_point_xref_flash_point',
            fields: [
              {
                column: 'boiling_point',
                column_size: 'column',
                key: 'boiling_point',
                label: 'Boiling point',
                type: 'textWithAddOn',
                addon: '°C',
                visible: true,
                default: '',
                required: false,
                description: '',
              },
              {
                column: 'melting_point',
                column_size: 'column',
                key: 'melting_point',
                label: 'Melting point',
                type: 'textWithAddOn',
                addon: '°C',
                visible: true,
                default: '',
                required: false,
                description: '',
              },
              {
                column: 'xref',
                column_size: 'column',
                opt: 'flash_point',
                key: 'xref_flash_point',
                label: 'Flash Point',
                type: 'system-defined', // hat noch berechnungen
                option_layers: 'temperature',
                addon: '°C',
                visible: true,
                default: '',
                required: false,
                description: '',
              },
            ],
          },
          {
            cols: 4,
            visible: true,
            key: 'xref_refractive_index_xref_form_xref_color_xref_solubility',
            fields: [
              {
                column: 'xref',
                column_size: 'column',
                opt: 'refractive_index',
                key: 'xref_refractive_index',
                label: 'Refractive Index',
                type: 'text',
                visible: true,
                default: '',
                required: false,
                description: '',
              },
              {
                column: 'xref',
                column_size: 'column',
                opt: 'form',
                key: 'xref_form',
                label: 'Form',
                type: 'text',
                visible: true,
                default: '',
                required: false,
                description: '',
              },
              {
                column: 'xref',
                column_size: 'column',
                opt: 'color',
                key: 'xref_color',
                label: 'Color',
                type: 'text',
                visible: true,
                default: '',
                required: false,
                description: '',
              },
              {
                column: 'xref',
                column_size: 'column',
                opt: 'solubility',
                key: 'xref_solubility',
                label: 'Solubility',
                type: 'text',
                visible: true,
                default: '',
                required: false,
                description: '',
              },
            ],
          },
        ],
      },
      {
        label: 'Solvents',
        key: 'solvents',
        toggle: true,
        rows: [
          {
            cols: 1,
            fields: [
              {
                column: 'solvent',
                column_size: 'full',
                key: 'solvent',
                label: 'Solvent',
                type: 'solventSelect', // spezial select mit molecule dropdown und ausgewählten Feldern darunter
                visible: true,
                default: 'Select solvents or drag-n-drop molecules from the sample list',
                required: false,
                description: '',
              },
            ],
          },
          // {
          //   cols: 3,
          //   visible: true,
          //   key: 'solvent_label_solvent_ration_trash',
          //   fields: [
          //     {
          //       column: 'solvent',
          //       opt: 'label',
          //       key: 'solvent_label',
          //       label: 'Label',
          //       type: 'text', // disabled
          //       visible: true,
          //       default: '',
          //       required: false,
          //       description: '',
          //     },
          //     {
          //       column: 'solvent',
          //       opt: 'ratio',
          //       key: 'solvent_ratio',
          //       label: 'Ratio',
          //       type: 'text', // nur zahlen
          //       visible: true,
          //       default: '',
          //       required: false,
          //       description: '',
          //     },
          //     {
          //       column: 'solvent',
          //       label: '',
          //       type: 'trash', // ausgewähltes Molecule löschen
          //     },
          //   ],
          // },
        ],
      },
      {
        label: '',
        key: 'basic',
        rows: [
          {
            cols: 1,
            fields: [
              {
                column: 'description',
                column_size: 'full',
                key: 'description',
                label: 'Description',
                type: 'textarea',
                rows: 3,
                visible: true,
                default: '',
                required: false,
                description: '',
              },
            ],
          },
          {
            cols: 1,
            fields: [
              {
                column: 'location',
                column_size: 'full',
                key: 'location',
                label: 'Location',
                type: 'text',
                visible: true,
                default: '',
                required: false,
                description: '',
              },
            ],
          },
          {
            cols: 1,
            fields: [
              {
                column: 'content',
                column_size: 'full',
                key: 'private-note-content',
                label: 'Private Note',
                type: 'privat_note', // eigenes component
                rows: 3,
                visible: true,
                default: '',
                required: false,
                description: '',
                conditions: {
                  can_update: true,
                },
              },
            ],
          },
        ],
      },
    ],
  }
}
