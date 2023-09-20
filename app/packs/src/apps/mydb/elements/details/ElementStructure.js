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
                default: '',
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
            fields: [
              {
                column: 'iupac_name', // db feld
                column_size: 'big',
                key: 'iupac_name',
                label: 'Molecule',
                type: 'moleculeSelect', // spezielles select
                visible: true, // für modal zur auswahl, was angezeigt werden soll
                default: '', // default wert im feld
                required: false, // validierung?
                description: '', // mouseover über headline oder icon ...
              },
              {
                column: 'stereo',
                column_size: 'column',
                opt: 'abs', // zusätzliche db Feld Info für jsonb Felder
                key: 'stereo-abs',
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
                key: 'stereo-rel',
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
            fields: [
              {
                column: 'name',
                column_size: 'column',
                key: 'name',
                label: 'Name',
                type: 'text',
                visible: true,
                default: '',
                required: false,
                description: '',
              },
              {
                column: 'external_label',
                column_size: 'column',
                key: 'external-label',
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
                key: 'xref-inventory-label',
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
            cols: 3,
            fields: [
              {
                column: 'target_amount_value',
                column_size: 'big',
                key: 'target-amount-value',
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
                key: 'density-molarity',
                column: 'density-molarity',
                type: 'tab',
                visible: true,
                sub_fields: [ // wird als verschachtelte tabs dargestellt
                  {
                    column: 'density',
                    column_size: 'middle',
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
                    column_size: 'middle',
                    key: 'molarity-value',
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
                column_size: 'middle',
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
            fields: [
              {
                column: 'boiling_point',
                column_size: 'column',
                key: 'boiling-point',
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
                key: 'melting-point',
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
                key: 'xref-flash-point',
                label: 'Flash Point',
                type: 'system-defined', // hat noch berechnungen
                option_layers: 'temperature',
                visible: true,
                default: '',
                required: false,
                description: '',
              },
            ],
          },
          {
            cols: 4,
            fields: [
              {
                column: 'xref',
                column_size: 'column',
                opt: 'refractive_index',
                key: 'xref-refractive-index',
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
                key: 'xref-form',
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
                key: 'xref-color',
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
                key: 'xref-solubility',
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
                default: '',
                required: false,
                description: '',
              },
            ],
          },
          // {
          //   cols: 3,
          //   fields: [
          //     {
          //       column: 'solvent',
          //       opt: 'label',
          //       key: 'solvent-label',
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
          //       key: 'solvent-ratio',
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
                type: 'privat-note', // eigenes component
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
