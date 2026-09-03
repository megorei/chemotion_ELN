# frozen_string_literal: true

# P2 WP 01 (REQ-ELN-22, 21c): provenance rows — where a copied element came
# from (direction: origin, on the copy) and where copies went (direction:
# copy, one per outbound copy, on the source). One polymorphic table instead
# of per-model columns (40+ paranoid models — column sprawl). Deliberately
# NOT paranoid and NOT logidze'd: provenance that can be soft-deleted or
# rewritten is not provenance (same argument as audit_events).
class CreateProvenances < ActiveRecord::Migration[7.2]
  def change
    create_table :provenances do |t|
      t.string :element_type, null: false
      t.bigint :element_id, null: false
      t.string :direction, null: false # origin | copy
      t.string :remote_ref, null: false # chemotion://{instance}/{tenant}/{type}/{id}@{ts}
      t.bigint :actor_id
      t.jsonb :metadata, null: false, default: {}
      t.datetime :created_at, null: false
    end

    add_index :provenances, %i[element_type element_id direction remote_ref],
              unique: true, name: 'index_provenances_uniqueness'
    add_index :provenances, %i[remote_ref direction]
    add_index :provenances, %i[element_type element_id]
  end
end
