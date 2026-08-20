# frozen_string_literal: true

# First-class role grants (WP 06 / REQ-ELN-11+13): roles move out of the JSONB
# profile.data into an enforceable table. A row is a grant of `name`, optionally
# scoped by (scope_type, scope_id); `granted_by` records the granting user.
#
# Deliberately NOT paranoid (no deleted_at): a revoked role is deleted — the
# who/when/what of grant and revoke is audited separately via structured
# role-audit log lines (see UserRole), plus granted_by/created_at on the live row.
class CreateUserRoles < ActiveRecord::Migration[6.1]
  def change
    create_table :user_roles do |t|
      t.references :user, null: false, foreign_key: true, index: true
      t.string :name, null: false
      t.string :scope_type
      t.bigint :scope_id
      t.bigint :granted_by
      t.timestamps
    end

    add_foreign_key :user_roles, :users, column: :granted_by

    add_index :user_roles, %i[user_id name scope_type scope_id],
              unique: true, name: 'index_user_roles_uniqueness'
    # Postgres unique indexes do not consider NULLs equal — cover the NULL-scope
    # shapes with partial unique indexes so the DB enforces uniqueness there too.
    add_index :user_roles, %i[user_id name],
              unique: true, where: 'scope_type IS NULL AND scope_id IS NULL',
              name: 'index_user_roles_unscoped_uniqueness'
    add_index :user_roles, %i[user_id name scope_type],
              unique: true, where: 'scope_type IS NOT NULL AND scope_id IS NULL',
              name: 'index_user_roles_type_scoped_uniqueness'
  end
end
