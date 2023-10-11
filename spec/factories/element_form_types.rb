# frozen_string_literal: true

FactoryBot.define do
  factory :element_form_type do
    name { 'Organic chemistry' }
    description { 'default' }
    enabled { true }
    creator { association(:user) }

    trait :sample_type do
      element_type { 'sample' }
    end

    trait :default_sample_structure do
      structure do
        {
          'columns' => [
            {
              'key' => 'basic',
              'rows' => [
                {
                  'key' => 'name_external_label_xref_inventory_label',
                  'cols' => '4',
                  'fields' => [
                    {
                      'key' => 'name',
                      'type' => 'text',
                      'label' => 'Name',
                      'column' => 'name',
                      'default' => 'Name of sample',
                      'visible' => 'true',
                      'required' => 'false',
                      'column_size' => 'column',
                      'description' => '',
                    },
                    {
                      'key' => 'external_label',
                      'type' => 'text',
                      'label' => 'External Label',
                      'column' => 'external_label',
                      'default' => '',
                      'visible' => 'true',
                      'required' => 'false',
                      'column_size' => 'column',
                      'description' => '',
                    },
                    {
                      'key' => 'xref_inventory_label',
                      'opt' => 'inventory_label',
                      'type' => 'text',
                      'label' => 'Inventory label',
                      'column' => 'xref',
                      'default' => '',
                      'visible' => 'true',
                      'required' => 'false',
                      'column_size' => 'column',
                      'description' => '',
                    },
                    {
                      'key' => 'dry_solvent',
                      'type' => 'checkbox',
                      'label' => 'Dry Solvent',
                      'column' => 'dry_solvent',
                      'default' => '',
                      'visible' => 'true',
                      'required' => 'false',
                      'conditions' => {
                        'can_update' => 'true',
                      },
                      'column_size' => 'column',
                      'description' => '',
                    },
                  ],
                  'visible' => 'true',
                },
              ],
            },
          ],
        }
      end
    end
  end
end
