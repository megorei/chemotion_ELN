class InitMacromoleculeAtProfilesAndUsers < ActiveRecord::Migration[6.1]
  def up
    User.all.each do |user|
      user.counters['macromolecules']="0"
      user.update_column(:counters, user.counters)
    end

    Profile.all.each do |profile|
      next unless profile.data['layout']
      next if profile.data['layout']['macromolecule']

      profile.data['layout']['macromolecule']=-1200
      profile.save
    end
  end

  def down
    User.all.each do |user|
      user.counters.delete('macromolecules')
      user.update_column(:counters, user.counters)
    end

    Profile.all.each do |profile|
      next unless profile.data['layout']
      next unless profile.data['layout']['macromolecule']

      profile.data['layout'].delete('macromolecule')
      profile.save
    end
  end
end
