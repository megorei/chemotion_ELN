# frozen_string_literal: true

require 'rails_helper'

# P2 WP 02: the element-grained round trip — export one sample, import it
# as a copy, provenance on both sides, idempotent re-import, version gate.
RSpec.describe 'sample export/import round trip' do # rubocop:disable RSpec/DescribeClass
  let(:user) { create(:person) }
  let(:source_collection) { create(:collection, user: user) }
  let(:target_collection) { create(:collection, user: user, label: 'landing') }
  let(:source_sample) do
    create(:sample, name: 'roundtrip probe', collections: [source_collection], creator: user)
  end

  let(:export_id) { SecureRandom.uuid }
  let(:zip_path) { Rails.public_path.join('zip', "#{export_id}.zip") }

  def export!
    # canonicalize: the factory molecule carries a fake inchikey; content
    # resolution on import always yields the canonical molecule for the
    # molfile — align the source so molecule identity is comparable
    source_sample.update_columns(molecule_id: Molecule.find_or_create_by_molfile(source_sample.molfile).id)
    export = Export::ExportSample.new(export_id, source_sample.id, user.id)
    export.prepare_data
    export.to_file
    zip_path
  end

  def import!(dry_run: false)
    att = instance_double(Attachment, read_file: File.binread(zip_path))
    Import::ImportSample.new(att, user.id, collection_id: target_collection.id,
                                          dry_run: dry_run).execute
  end

  after { FileUtils.rm_f(zip_path) }

  it 'copies the sample rooted, with provenance rows on BOTH sides' do
    export!
    result = import!

    copy = result.sample
    expect(result.already_imported).to be false
    expect(copy).not_to eq(source_sample)
    expect(copy.name).to eq('roundtrip probe')
    expect(copy.collections).to include(target_collection)
    # rooted: the source ancestry never crosses (REQ-ELN-22 import rule);
    # ancestry 4.x materializes a root as "/"
    expect(copy.root?).to be true
    expect(copy.ancestors).to be_empty
    # molecule resolved by CONTENT, globally shared (ADR-006 baseline a)
    expect(copy.molecule_id).to eq(source_sample.molecule_id)
    # containers travelled
    expect(copy.container).to be_present

    origin = copy.provenances.origins.sole
    expect(origin.remote_ref).to include("/Sample/#{source_sample.id}")
    expect(ProvenanceRef.parse(origin.remote_ref).local?).to be true

    back_ref = source_sample.provenances.copies.sole
    expect(back_ref.remote_ref).to include("/Sample/#{copy.id}")
  end

  it 're-import of the same payload is idempotent — no duplicate' do
    export!
    first = import!
    expect do
      second = import!
      expect(second.already_imported).to be true
      expect(second.sample).to eq(first.sample)
    end.not_to change(Sample, :count)
  end

  it 'dry-run validates without writing anything' do
    export!
    expect { import!(dry_run: true) }
      .to not_change(Sample, :count)
      .and not_change(Provenance, :count)
      .and not_change(Attachment, :count)
  end

  it 'rejects a payload with a newer schema_version' do
    export!
    rewrite_meta { |meta| meta.merge('schema_version' => 99) }
    expect { import! }.to raise_error(Import::ImportSample::VersionMismatchError, /schema_version 99/)
  end

  it 'rejects a payload without element meta (collection zips stay collection imports)' do
    export!
    rewrite_meta { |_meta| nil } # removes the key entirely
    expect { import! }.to raise_error(Import::ImportSample::UnsupportedPayloadError, /chemotion_meta/)
  end

  it 'refuses exporting a soft-deleted sample' do
    source_sample.destroy!
    expect { export! }.to raise_error(Export::ExportSample::SoftDeletedSourceError)
  end

  # helper: rewrite chemotion_meta inside the produced zip
  def rewrite_meta
    data = nil
    Zip::File.open(zip_path) do |zip|
      data = JSON.parse(zip.read('export.json'))
      meta = yield(data['chemotion_meta'])
      if meta.nil?
        data.delete('chemotion_meta')
      else
        data['chemotion_meta'] = meta
      end
      zip.get_output_stream('export.json') { |f| f.write(data.to_json) }
    end
  end
end
