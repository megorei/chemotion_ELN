# frozen_string_literal: true

require 'rails_helper'

describe Chemotion::PublicAPI do
  describe 'GET /api/v1/public/ping' do
    before { get('/api/v1/public/ping', params: '', headers: { 'AUTHORIZATION' => 'Bearer qwerty' }) }

    it 'responds 204' do
      expect(response).to have_http_status :no_content
    end
  end

  describe 'GET /api/v1/public/health' do
    context 'when the database is reachable' do
      before { get('/api/v1/public/health') }

      it 'responds 200' do
        expect(response).to have_http_status :ok
      end

      it 'responds with status ok, db true and the app version' do
        expect(parsed_json_response).to eq(
          'status' => 'ok',
          'db' => true,
          'version' => Chemotion::Application.config.version['version'],
        )
      end
    end

    context 'when the database is not reachable' do
      before do
        allow(Usecases::Public::HealthCheck).to receive(:database_ready?).and_return(false)
        get('/api/v1/public/health')
      end

      it 'responds 503' do
        expect(response).to have_http_status :service_unavailable
      end

      it 'responds with status error and db false' do
        expect(parsed_json_response).to eq('status' => 'error', 'db' => false)
      end
    end
  end

  describe 'GET /api/v1/public/version' do
    before { get('/api/v1/public/version') }

    it 'responds 200' do
      expect(response).to have_http_status :ok
    end

    it 'exposes only version and revision' do
      expect(parsed_json_response.keys).to contain_exactly('version', 'revision')
    end

    it 'responds with the configured app version' do
      expect(parsed_json_response['version']).to eq(Chemotion::Application.config.version['version'])
    end
  end

  describe 'POST /api/v1/public/token' do
    subject(:execute_request) { post('/api/v1/public/token', params: params) }

    let(:build_user) { create(:person) }
    let(:params) do
      {
        username: build_user.name_abbreviation,
        password: 'testtest',
      }
    end

    context 'when use case returns a token' do
      before do
        allow(JsonWebToken).to receive(:encode).and_return('my-token')
        execute_request
      end

      it 'responds 201' do
        expect(response).to have_http_status :created
      end

      it 'responds a hash with a token' do
        expect(parsed_json_response).to eq({ 'token' => 'my-token' })
      end
    end

    context 'when use case returns nil' do
      before do
        allow(Usecases::Public::BuildToken).to receive(:execute!).and_return(nil)
        execute_request
      end

      it 'responds an error' do
        expect(response).to have_http_status :unauthorized
      end
    end
  end

  describe 'GET /api/v1/public/workshop_guide/available' do
    subject(:execute_request) { get('/api/v1/public/workshop_guide/available') }

    let(:home_md) { Rails.public_path.join('workshop', 'home.md') }
    let(:home_md_backup) { Rails.root.join('tmp/home_md_backup.md') }

    around do |example|
      had_home_md = home_md.exist?
      FileUtils.mv(home_md, home_md_backup) if had_home_md
      begin
        example.run
      ensure
        FileUtils.rm_f(home_md)
        FileUtils.mv(home_md_backup, home_md) if had_home_md
      end
    end

    context 'when workshop content has not been synced' do
      before do
        FileUtils.rm_f(home_md)
        execute_request
      end

      it 'responds 200 with available: false' do
        expect(response).to have_http_status :ok
        expect(parsed_json_response).to eq({ 'available' => false })
      end
    end

    context 'when workshop content has been synced' do
      before do
        FileUtils.mkdir_p(home_md.dirname)
        FileUtils.touch(home_md)
        execute_request
      end

      after { FileUtils.rm_f(home_md) }

      it 'responds 200 with available: true' do
        expect(response).to have_http_status :ok
        expect(parsed_json_response).to eq({ 'available' => true })
      end
    end
  end
end
