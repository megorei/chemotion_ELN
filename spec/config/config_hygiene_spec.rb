# frozen_string_literal: true

require 'rails_helper'

# REQ-ELN-29 (WP 02): custom config ymls must not contain ERB — anything
# deployment-variable moves to ENV; YAML stays static and diffable.
RSpec.describe 'config yml hygiene' do # rubocop:disable RSpec/DescribeClass
  # Framework files that legitimately read ENV through ERB.
  def framework_allowlist
    %w[
      config/cable.yml
      config/shakapacker.yml
    ]
  end

  def tracked_config_ymls
    Dir.chdir(Rails.root) do
      `git ls-files -- 'config/*.yml' 'config/*.yml.example' 'config/*.yml.ci'`.split("\n")
        # Locale files are Rails-managed translations, not deployment config —
        # the framework's standard en.yml header even demonstrates `<%= t(...) %>`
        # in a comment. (git pathspec `config/*.yml` matches across slashes.)
        .reject { |file| file.start_with?('config/locales/') }
    end
  end

  it 'contains no ERB in non-framework config ymls (REQ-ELN-29)' do
    offenders = (tracked_config_ymls - framework_allowlist).select do |file|
      Rails.root.join(file).read.include?('<%')
    end
    expect(offenders).to be_empty, "ERB found in: #{offenders.join(', ')} (REQ-ELN-29 bans ERB in config ymls)"
  end

  it 'keeps app_config.yml structure-only for URL/secret keys (REQ-ELN-30)' do
    app_config = YAML.safe_load_file(Rails.root.join('config/app_config.yml'))
    # spot-check: no environment-specific service endpoints or secrets baked in
    %w[converter radar scifinder_n inference indigo_service ketcher_service].each do |section|
      values = app_config.fetch(section).values.flat_map { |v| v.is_a?(Hash) ? v.values : [v] }
      urls = values.compact.select { |v| v.to_s.match?(%r{\Ahttps?://}) }
      expect(urls).to be_empty, "#{section} carries environment-specific URLs: #{urls.inspect}"
    end
    expect(app_config.dig('converter', 'secret_key')).to be_nil
    expect(app_config.dig('radar', 'client_secret')).to be_nil
  end
end
